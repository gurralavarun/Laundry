const mongoose = require('mongoose');
const Order = require('../models/Order');
const Store = require('../models/Store');
const User = require('../models/User');
const Service = require('../models/Service');
const { createNotification } = require('./notificationService');

/**
 * Baseline fallback pricing per item when not explicitly defined in store/platform services
 */
const DEFAULT_PRICING = {
    casual: 50,
    formal: 80,
    saree: 150,
    suit: 250,
    traditional: 120,
    default: 60
};

/**
 * Resolve price per unit from database service catalog
 * @param {ObjectId} storeId
 * @param {string} gender
 * @param {string} category
 * @param {string} itemType
 * @returns {Promise<number>}
 */
const resolveItemPrice = async (storeId, gender, category, itemType) => {
    // 1. Check store-specific custom price
    if (storeId) {
        const storeService = await Service.findOne({
            store: storeId,
            gender: new RegExp(`^${gender}$`, 'i'),
            category: new RegExp(`^${category}$`, 'i'),
            itemType: new RegExp(`^${itemType}$`, 'i'),
            isActive: true
        });
        if (storeService && storeService.price > 0) {
            return storeService.price;
        }
    }

    // 2. Check global platform default catalog
    const globalService = await Service.findOne({
        store: null,
        gender: new RegExp(`^${gender}$`, 'i'),
        category: new RegExp(`^${category}$`, 'i'),
        itemType: new RegExp(`^${itemType}$`, 'i'),
        isActive: true
    });
    if (globalService && globalService.price > 0) {
        return globalService.price;
    }

    // 3. Category fallback
    const catKey = category.toLowerCase();
    const itemKey = itemType.toLowerCase();

    if (itemKey.includes('saree')) return DEFAULT_PRICING.saree;
    if (itemKey.includes('suit')) return DEFAULT_PRICING.suit;
    if (DEFAULT_PRICING[catKey]) return DEFAULT_PRICING[catKey];

    return DEFAULT_PRICING.default;
};

/**
 * Normalize gender string to Order schema enum values ('Men', 'Women', 'Unisex', 'Kids')
 * @param {string} g
 * @returns {string}
 */
const normalizeGender = (g) => {
    if (!g) return 'Men';
    const lower = g.trim().toLowerCase();
    if (lower === 'men' || lower === 'man' || lower === 'male') return 'Men';
    if (lower === 'women' || lower === 'woman' || lower === 'female') return 'Women';
    if (lower === 'unisex') return 'Unisex';
    if (lower === 'kids' || lower === 'kid' || lower === 'children') return 'Kids';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

/**
 * Create a new laundry order with backend-enforced price calculation
 * @param {string} userId
 * @param {Object} orderData
 * @returns {Promise<Object>} Created order
 */
const createOrder = async (userId, orderData) => {
    const {
        storeId,
        items,
        pickupAddress,
        deliveryAddress,
        pickupAddressId,
        deliveryAddressId,
        addressId,
        pickupDate,
        pickupTime,
        notes
    } = orderData;

    if (!items || !Array.isArray(items) || items.length === 0) {
        const error = new Error('At least one clothing item must be selected');
        error.statusCode = 400;
        throw error;
    }

    if (!pickupDate || !pickupTime) {
        const error = new Error('Pickup date and pickup time slot are required');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // Resolve store if selected
    let selectedStore = null;
    if (storeId) {
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            const error = new Error('Invalid store ID format');
            error.statusCode = 400;
            throw error;
        }
        selectedStore = await Store.findById(storeId);
        if (!selectedStore) {
            const error = new Error('Selected store not found');
            error.statusCode = 404;
            throw error;
        }
        if (!selectedStore.isOpen) {
            const error = new Error('Selected store is currently closed. Please select another store.');
            error.statusCode = 400;
            throw error;
        }
    }

    // Resolve addresses supporting explicit objects, address IDs, and user defaults
    const resolveAddress = (addrInput, addrIdInput) => {
        const targetId = addrIdInput || (typeof addrInput === 'string' && mongoose.Types.ObjectId.isValid(addrInput) ? addrInput : null);
        if (targetId && user.addresses) {
            const matched = user.addresses.id(targetId);
            if (matched) {
                return {
                    street: matched.street,
                    city: matched.city,
                    state: matched.state,
                    pincode: matched.pincode
                };
            }
        }

        if (addrInput && typeof addrInput === 'object' && addrInput.street) {
            return {
                street: addrInput.street,
                city: addrInput.city || 'Hyderabad',
                state: addrInput.state || 'Telangana',
                pincode: addrInput.pincode || '500081'
            };
        }

        if (typeof addrInput === 'string' && addrInput.trim().length > 0 && !mongoose.Types.ObjectId.isValid(addrInput)) {
            return {
                street: addrInput.trim(),
                city: 'Hyderabad',
                state: 'Telangana',
                pincode: '500081'
            };
        }

        return null;
    };

    let finalPickupAddress = resolveAddress(pickupAddress, pickupAddressId || addressId);

    if (!finalPickupAddress) {
        const defaultAddr = (user.addresses && user.addresses.find((a) => a.isDefault)) || (user.addresses && user.addresses[0]);
        if (defaultAddr) {
            finalPickupAddress = {
                street: defaultAddr.street,
                city: defaultAddr.city,
                state: defaultAddr.state,
                pincode: defaultAddr.pincode
            };
        } else if (user.address) {
            finalPickupAddress = {
                street: user.address,
                city: 'Hyderabad',
                state: 'Telangana',
                pincode: '500081'
            };
        } else {
            const error = new Error('Pickup address is required');
            error.statusCode = 400;
            throw error;
        }
    }

    let finalDeliveryAddress = resolveAddress(deliveryAddress, deliveryAddressId) || finalPickupAddress;

    // Calculate items and prices strictly on the backend
    let calculatedTotal = 0;
    const processedItems = [];

    for (const rawItem of items) {
        const gender = normalizeGender(rawItem.gender);
        const category = (rawItem.category || 'Casual').trim();
        const itemType = (rawItem.itemType || 'Clothing').trim();
        const quantity = Math.max(1, parseInt(rawItem.quantity || rawItem.pairs || 1, 10));

        const pricePerUnit = await resolveItemPrice(
            selectedStore ? selectedStore._id : null,
            gender,
            category,
            itemType
        );

        const totalItemPrice = pricePerUnit * quantity;
        calculatedTotal += totalItemPrice;

        processedItems.push({
            gender,
            category,
            itemType,
            quantity,
            pricePerUnit,
            totalItemPrice
        });
    }

    const order = await Order.create({
        user: user._id,
        store: selectedStore ? selectedStore._id : null,
        items: processedItems,
        totalAmount: Math.round(calculatedTotal * 100) / 100,
        pickupAddress: finalPickupAddress,
        deliveryAddress: finalDeliveryAddress,
        pickupDate: new Date(pickupDate),
        pickupTime,
        orderStatus: 'pending',
        deliveryMode: selectedStore && selectedStore.acceptsDelivery ? 'store' : 'external',
        deliveryStatus: 'pending',
        paymentStatus: 'pending',
        notes: notes || ''
    });

    // Notify store if assigned
    if (selectedStore) {
        await createNotification({
            recipientType: 'store',
            recipientId: selectedStore._id,
            title: 'New Laundry Order Received',
            message: `You have received a new order #${order._id} for ${processedItems.length} items (Total: ₹${order.totalAmount}). Please accept or reject.`,
            orderId: order._id
        });
    }

    return order;
};

/**
 * Fetch an order by ID with role-based access boundary check
 * @param {string} orderId
 * @param {Object} auth { id, role }
 * @returns {Promise<Object>}
 */
const getOrderById = async (orderId, auth) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findById(orderId)
        .populate('user', 'name email phone address')
        .populate('store', 'name email phone address acceptsDelivery isOpen')
        .populate('deliveryPartner', 'name phone vehicleType vehicleNumber');

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    // Role-based boundary enforcement
    if (auth.role === 'user') {
        const orderUserId = order.user._id ? order.user._id.toString() : order.user.toString();
        if (orderUserId !== auth.id) {
            const error = new Error('Access forbidden. You can only view your own orders.');
            error.statusCode = 403;
            throw error;
        }
    } else if (auth.role === 'store') {
        const orderStoreId = order.store ? (order.store._id ? order.store._id.toString() : order.store.toString()) : null;
        if (orderStoreId !== auth.id) {
            const error = new Error('Access forbidden. You can only view orders assigned to your store.');
            error.statusCode = 403;
            throw error;
        }
    } else if (auth.role === 'delivery') {
        const partnerId = order.deliveryPartner ? (order.deliveryPartner._id ? order.deliveryPartner._id.toString() : order.deliveryPartner.toString()) : null;
        if (partnerId !== auth.id && order.deliveryStatus !== 'pending') {
            const error = new Error('Access forbidden. This order is not assigned to you.');
            error.statusCode = 403;
            throw error;
        }
    }

    return order;
};

/**
 * Fetch all orders for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getUserOrders = async (userId) => {
    return await Order.find({ user: userId })
        .populate('store', 'name email phone address')
        .populate('deliveryPartner', 'name phone vehicleType vehicleNumber')
        .sort({ createdAt: -1 });
};

/**
 * Re-request order to another store when rejected
 * @param {string} userId
 * @param {string} orderId
 * @param {string} newStoreId
 * @returns {Promise<Object>} Updated order
 */
const reRequestStore = async (userId, orderId, newStoreId) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(newStoreId)) {
        const error = new Error('Invalid new store ID format');
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        const error = new Error('Order not found or does not belong to user');
        error.statusCode = 404;
        throw error;
    }

    if (order.orderStatus !== 'rejected' && order.orderStatus !== 'pending') {
        const error = new Error(`Cannot re-request a store for an order that is already '${order.orderStatus}'`);
        error.statusCode = 400;
        throw error;
    }

    const newStore = await Store.findById(newStoreId);
    if (!newStore) {
        const error = new Error('Target store not found');
        error.statusCode = 404;
        throw error;
    }

    if (!newStore.isOpen) {
        const error = new Error('Target store is currently closed');
        error.statusCode = 400;
        throw error;
    }

    // Update store and reset status to pending
    order.store = newStore._id;
    order.orderStatus = 'pending';
    order.deliveryMode = newStore.acceptsDelivery ? 'store' : 'external';
    order.deliveryStatus = 'pending';

    await order.save();

    // Notify new store
    await createNotification({
        recipientType: 'store',
        recipientId: newStore._id,
        title: 'New Laundry Order Request',
        message: `Order #${order._id} has been requested to your store. Please review and accept.`,
        orderId: order._id
    });

    return order;
};

/**
 * Track an order's complete status timeline
 * @param {string} orderId
 * @param {Object} auth
 * @returns {Promise<Object>} Tracking details
 */
const trackOrder = async (orderId, auth) => {
    const order = await getOrderById(orderId, auth);

    return {
        orderId: order._id,
        orderStatus: order.orderStatus,
        deliveryStatus: order.deliveryStatus,
        paymentStatus: order.paymentStatus,
        deliveryMode: order.deliveryMode,
        totalAmount: order.totalAmount,
        store: order.store ? {
            id: order.store._id,
            name: order.store.name,
            phone: order.store.phone,
            address: order.store.address
        } : null,
        deliveryPartner: order.deliveryPartner ? {
            id: order.deliveryPartner._id,
            name: order.deliveryPartner.name,
            phone: order.deliveryPartner.phone,
            vehicleType: order.deliveryPartner.vehicleType
        } : null,
        pickupDate: order.pickupDate,
        pickupTime: order.pickupTime,
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    };
};

module.exports = {
    createOrder,
    getOrderById,
    getUserOrders,
    reRequestStore,
    trackOrder,
    resolveItemPrice
};
