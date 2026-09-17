const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Service = require('../models/Service');
const Inventory = require('../models/Inventory');
const DeliveryJob = require('../models/DeliveryJob');
const { createNotification } = require('./notificationService');

const SALT_ROUNDS = 10;

/**
 * Register a new store
 * @param {Object} storeData
 * @returns {Promise<Object>} Safe store document without password
 */
const registerStore = async (storeData) => {
    const { name, email, gstNumber, phone, password, address, acceptsDelivery, isOpen } = storeData;

    if (!password) {
        const error = new Error('Password is required');
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const store = await Store.create({
        name,
        email,
        gstNumber,
        phone,
        password: hashedPassword,
        address,
        acceptsDelivery: acceptsDelivery !== undefined ? acceptsDelivery : false,
        isOpen: isOpen !== undefined ? isOpen : true
    });

    const storeObj = store.toObject();
    delete storeObj.password;
    return storeObj;
};

/**
 * Authenticate store and issue JWT
 * @param {Object} credentials { email, password }
 * @returns {Promise<Object>} { store, token }
 */
const loginStore = async ({ email, password }) => {
    if (!email || !password) {
        const error = new Error('Please provide both email and password');
        error.statusCode = 400;
        throw error;
    }

    const store = await Store.findOne({ email: email.toLowerCase().trim() });
    if (!store) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, store.password);
    if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const secret = process.env.JWT_SECRET || 'laundry_jwt_super_secret_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
        {
            id: store._id,
            role: 'store'
        },
        secret,
        { expiresIn }
    );

    const storeObj = store.toObject();
    delete storeObj.password;

    return {
        store: storeObj,
        token
    };
};

/**
 * Retrieve available stores for users (only open stores)
 * Returns safe public store information only
 * @returns {Promise<Array>} List of open stores
 */
const getAvailableStores = async () => {
    const stores = await Store.find({ isOpen: true })
        .select('name address phone email acceptsDelivery isOpen')
        .sort({ createdAt: -1 });

    return stores;
};

/**
 * Get profile of the authenticated store
 * @param {string} storeId
 * @returns {Promise<Object>} Store profile without password
 */
const getStoreProfile = async (storeId) => {
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        const error = new Error('Invalid store ID format');
        error.statusCode = 400;
        throw error;
    }

    const store = await Store.findById(storeId).select('-password');
    if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
    }

    return store;
};

/**
 * Update profile of the authenticated store
 * @param {string} storeId
 * @param {Object} updateData
 * @returns {Promise<Object>} Updated store profile
 */
const updateStoreProfile = async (storeId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        const error = new Error('Invalid store ID format');
        error.statusCode = 400;
        throw error;
    }

    const updates = { ...updateData };
    delete updates._id;
    delete updates.email;
    delete updates.gstNumber;

    if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const store = await Store.findByIdAndUpdate(storeId, updates, {
        new: true,
        runValidators: true
    }).select('-password');

    if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
    }

    return store;
};

/**
 * Update store open/closed status
 * @param {string} storeId
 * @param {Object} statusData { isOpen }
 * @returns {Promise<Object>} Updated store
 */
const updateStoreStatus = async (storeId, { isOpen }) => {
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        const error = new Error('Invalid store ID format');
        error.statusCode = 400;
        throw error;
    }

    if (isOpen === undefined) {
        const error = new Error('Please specify isOpen boolean value');
        error.statusCode = 400;
        throw error;
    }

    const store = await Store.findByIdAndUpdate(
        storeId,
        { isOpen: Boolean(isOpen) },
        { new: true }
    ).select('-password');

    if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
    }

    return store;
};

/**
 * Update store delivery facility (acceptsDelivery)
 * @param {string} storeId
 * @param {Object} deliveryData { acceptsDelivery }
 * @returns {Promise<Object>} Updated store
 */
const updateStoreDelivery = async (storeId, { acceptsDelivery }) => {
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        const error = new Error('Invalid store ID format');
        error.statusCode = 400;
        throw error;
    }

    if (acceptsDelivery === undefined) {
        const error = new Error('Please specify acceptsDelivery boolean value');
        error.statusCode = 400;
        throw error;
    }

    const store = await Store.findByIdAndUpdate(
        storeId,
        { acceptsDelivery: Boolean(acceptsDelivery) },
        { new: true }
    ).select('-password');

    if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
    }

    return store;
};

/**
 * Get orders assigned or requested for this store
 * @param {string} storeId
 * @param {Object} queryFilters
 * @returns {Promise<Array>} List of orders
 */
const getStoreOrders = async (storeId, queryFilters = {}) => {
    const filter = { store: storeId };
    if (queryFilters.orderStatus) {
        filter.orderStatus = queryFilters.orderStatus;
    }
    if (queryFilters.paymentStatus) {
        filter.paymentStatus = queryFilters.paymentStatus;
    }

    const orders = await Order.find(filter)
        .populate('user', 'name phone email address')
        .populate('deliveryPartner', 'name phone vehicleType vehicleNumber')
        .sort({ createdAt: -1 });

    return orders;
};

/**
 * Store accepts an incoming laundry order
 * @param {string} storeId
 * @param {string} orderId
 * @returns {Promise<Object>} Updated order
 */
const acceptStoreOrder = async (storeId, orderId) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }

    const store = await Store.findById(storeId);
    if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, store: storeId });
    if (!order) {
        const error = new Error('Order not found or not assigned to this store');
        error.statusCode = 404;
        throw error;
    }

    if (order.orderStatus !== 'pending') {
        const error = new Error(`Cannot accept order with status '${order.orderStatus}'`);
        error.statusCode = 400;
        throw error;
    }

    order.orderStatus = 'accepted';
    // Decide delivery mode based on store's acceptsDelivery capability
    order.deliveryMode = store.acceptsDelivery ? 'store' : 'external';
    order.deliveryStatus = 'pending';

    await order.save();

    // If external delivery partner required, create DeliveryJob
    if (order.deliveryMode === 'external') {
        await DeliveryJob.create({
            order: order._id,
            store: store._id,
            status: 'pending',
            pickupAddress: order.pickupAddress,
            deliveryAddress: order.deliveryAddress,
            notes: 'External delivery job created after store acceptance'
        });
    }

    // Notify user that store accepted order and payment is now open
    await createNotification({
        recipientType: 'user',
        recipientId: order.user,
        title: 'Order Accepted!',
        message: `${store.name} accepted your order #${order._id}. Please complete payment of ₹${order.totalAmount} to begin processing.`,
        orderId: order._id
    });

    return order;
};

/**
 * Store rejects an incoming laundry order
 * @param {string} storeId
 * @param {string} orderId
 * @param {string} reason
 * @returns {Promise<Object>} Updated order
 */
const rejectStoreOrder = async (storeId, orderId, reason = '') => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }

    const store = await Store.findById(storeId);
    if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, store: storeId });
    if (!order) {
        const error = new Error('Order not found or not assigned to this store');
        error.statusCode = 404;
        throw error;
    }

    if (order.orderStatus !== 'pending') {
        const error = new Error(`Cannot reject order with current status '${order.orderStatus}'`);
        error.statusCode = 400;
        throw error;
    }

    order.orderStatus = 'rejected';
    order.rejectedStores.push(store._id);
    order.store = null; // Detach store so user can re-request another store

    await order.save();

    // Notify user about rejection and option to pick another store
    await createNotification({
        recipientType: 'user',
        recipientId: order.user,
        title: 'Order Declined by Store',
        message: `${store.name} was unable to accept your order #${order._id}${reason ? ` (${reason})` : ''}. You can select and request another store.`,
        orderId: order._id
    });

    return order;
};

/**
 * Update order status by store (processing, ready, completed, cancelled)
 * @param {string} storeId
 * @param {string} orderId
 * @param {string} status
 * @param {string} deliveryStatus (optional, if store handles delivery)
 * @returns {Promise<Object>} Updated order
 */
const updateStoreOrderStatus = async (storeId, orderId, status, deliveryStatus = null) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }

    const validStatuses = ['processing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        const error = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, store: storeId });
    if (!order) {
        const error = new Error('Order not found or not assigned to this store');
        error.statusCode = 404;
        throw error;
    }

    // Business rule: Payment must be completed before processing can start!
    if (status === 'processing' && order.paymentStatus !== 'paid') {
        const error = new Error('Cannot start processing before payment is completed by user');
        error.statusCode = 400;
        throw error;
    }

    order.orderStatus = status;

    // If store handles delivery itself and provided a deliveryStatus update
    if (order.deliveryMode === 'store' && deliveryStatus) {
        order.deliveryStatus = deliveryStatus;
    }

    // If status is completed and store is handling delivery, mark delivered
    if (status === 'completed' && order.deliveryMode === 'store') {
        order.deliveryStatus = 'delivered';
    }

    await order.save();

    // Notify user of order progress
    await createNotification({
        recipientType: 'user',
        recipientId: order.user,
        title: `Order Status Update: ${status.toUpperCase()}`,
        message: `Your order #${order._id} status is now '${status}'.`,
        orderId: order._id
    });

    return order;
};

/**
 * Get store inventory items
 * @param {string} storeId
 * @returns {Promise<Array>}
 */
const getStoreInventory = async (storeId) => {
    return await Inventory.find({ store: storeId }).sort({ itemName: 1 });
};

/**
 * Add an inventory item for store
 * @param {string} storeId
 * @param {Object} itemData { itemName, category, quantity, unit, lowStockThreshold }
 * @returns {Promise<Object>}
 */
const addInventoryItem = async (storeId, itemData) => {
    const { itemName, category, quantity, unit, lowStockThreshold } = itemData;

    if (!itemName) {
        const error = new Error('Item name is required');
        error.statusCode = 400;
        throw error;
    }

    const existing = await Inventory.findOne({ store: storeId, itemName: itemName.trim() });
    if (existing) {
        existing.quantity += Number(quantity) || 0;
        if (category) existing.category = category;
        if (unit) existing.unit = unit;
        if (lowStockThreshold !== undefined) existing.lowStockThreshold = lowStockThreshold;
        await existing.save();
        return existing;
    }

    const newItem = await Inventory.create({
        store: storeId,
        itemName: itemName.trim(),
        category: category || 'General Supplies',
        quantity: Number(quantity) || 0,
        unit: unit || 'units',
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5
    });

    return newItem;
};

/**
 * Update inventory stock quantity
 * @param {string} storeId
 * @param {string} itemId
 * @param {Object} updateData { quantity, lowStockThreshold, category, unit }
 * @returns {Promise<Object>}
 */
const updateInventoryItem = async (storeId, itemId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        const error = new Error('Invalid inventory item ID format');
        error.statusCode = 400;
        throw error;
    }

    const item = await Inventory.findOne({ _id: itemId, store: storeId });
    if (!item) {
        const error = new Error('Inventory item not found');
        error.statusCode = 404;
        throw error;
    }

    if (updateData.quantity !== undefined) item.quantity = Number(updateData.quantity);
    if (updateData.category) item.category = updateData.category;
    if (updateData.unit) item.unit = updateData.unit;
    if (updateData.lowStockThreshold !== undefined) item.lowStockThreshold = Number(updateData.lowStockThreshold);

    await item.save();
    return item;
};

/**
 * Delete an inventory item
 * @param {string} storeId
 * @param {string} itemId
 * @returns {Promise<Object>}
 */
const deleteInventoryItem = async (storeId, itemId) => {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        const error = new Error('Invalid inventory item ID format');
        error.statusCode = 400;
        throw error;
    }

    const item = await Inventory.findOneAndDelete({ _id: itemId, store: storeId });
    if (!item) {
        const error = new Error('Inventory item not found');
        error.statusCode = 404;
        throw error;
    }

    return { message: 'Inventory item removed successfully' };
};

/**
 * Get pricing and services defined by the store
 * @param {string} storeId
 * @returns {Promise<Array>}
 */
const getStoreServices = async (storeId) => {
    const services = await Service.find({ store: storeId, isActive: true }).sort({ gender: 1, category: 1, itemType: 1 });
    return services;
};

/**
 * Add or update a service price for the store
 * @param {string} storeId
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
const createOrUpdateStoreService = async (storeId, serviceData) => {
    const { gender, category, itemType, serviceType = 'Wash & Iron', price } = serviceData;

    if (!gender || !category || !itemType || price === undefined) {
        const error = new Error('gender, category, itemType, and price are required');
        error.statusCode = 400;
        throw error;
    }

    const service = await Service.findOneAndUpdate(
        {
            store: storeId,
            gender,
            category: category.trim(),
            itemType: itemType.trim(),
            serviceType
        },
        {
            store: storeId,
            gender,
            category: category.trim(),
            itemType: itemType.trim(),
            serviceType,
            price: Number(price),
            isActive: true
        },
        { new: true, upsert: true, runValidators: true }
    );

    return service;
};

/**
 * Delete a store service
 * @param {string} storeId
 * @param {string} serviceId
 * @returns {Promise<Object>}
 */
const deleteStoreService = async (storeId, serviceId) => {
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        const error = new Error('Invalid service ID format');
        error.statusCode = 400;
        throw error;
    }

    const service = await Service.findOneAndDelete({ _id: serviceId, store: storeId });
    if (!service) {
        const error = new Error('Service not found');
        error.statusCode = 404;
        throw error;
    }

    return { message: 'Service removed successfully' };
};

/**
 * Generate store reports from existing orders & payments
 * @param {string} storeId
 * @returns {Promise<Object>} Store reporting analytics
 */
const getStoreReports = async (storeId) => {
    const orders = await Order.find({ store: storeId });

    let totalOrders = orders.length;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let rejectedOrders = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let readyOrders = 0;
    let acceptedOrders = 0;
    let totalRevenue = 0;

    const ordersByStatus = {};

    orders.forEach((ord) => {
        ordersByStatus[ord.orderStatus] = (ordersByStatus[ord.orderStatus] || 0) + 1;

        if (ord.orderStatus === 'completed') completedOrders++;
        else if (ord.orderStatus === 'cancelled') cancelledOrders++;
        else if (ord.orderStatus === 'rejected') rejectedOrders++;
        else if (ord.orderStatus === 'pending') pendingOrders++;
        else if (ord.orderStatus === 'processing') processingOrders++;
        else if (ord.orderStatus === 'ready') readyOrders++;
        else if (ord.orderStatus === 'accepted') acceptedOrders++;

        if (ord.paymentStatus === 'paid') {
            totalRevenue += ord.totalAmount;
        }
    });

    return {
        totalOrders,
        completedOrders,
        pendingOrders,
        acceptedOrders,
        processingOrders,
        readyOrders,
        cancelledOrders,
        rejectedOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        ordersByStatus
    };
};

module.exports = {
    registerStore,
    loginStore,
    getAvailableStores,
    getStoreProfile,
    updateStoreProfile,
    updateStoreStatus,
    updateStoreDelivery,
    getStoreOrders,
    acceptStoreOrder,
    rejectStoreOrder,
    updateStoreOrderStatus,
    getStoreInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getStoreServices,
    createOrUpdateStoreService,
    deleteStoreService,
    getStoreReports
};