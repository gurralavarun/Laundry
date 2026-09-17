const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryJob = require('../models/DeliveryJob');
const Order = require('../models/Order');
const { createNotification } = require('./notificationService');

const SALT_ROUNDS = 10;

/**
 * Register a new delivery partner
 * @param {Object} partnerData
 * @returns {Promise<Object>} Safe delivery partner document
 */
const registerDeliveryPartner = async (partnerData) => {
    const { name, email, phone, password, vehicleType, vehicleNumber, currentLocation } = partnerData;

    if (!password) {
        const error = new Error('Password is required');
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const partner = await DeliveryPartner.create({
        name,
        email,
        phone,
        password: hashedPassword,
        vehicleType: vehicleType || 'Bike',
        vehicleNumber: vehicleNumber || '',
        currentLocation: currentLocation || 'Madhapur, Hyderabad',
        isAvailable: true,
        isActive: true
    });

    const partnerObj = partner.toObject();
    delete partnerObj.password;
    return partnerObj;
};

/**
 * Authenticate delivery partner and issue JWT
 * @param {Object} credentials { email, password }
 * @returns {Promise<Object>} { partner, token }
 */
const loginDeliveryPartner = async ({ email, password }) => {
    if (!email || !password) {
        const error = new Error('Please provide both email and password');
        error.statusCode = 400;
        throw error;
    }

    const partner = await DeliveryPartner.findOne({ email: email.toLowerCase().trim() });
    if (!partner) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const secret = process.env.JWT_SECRET || 'laundry_jwt_super_secret_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
        {
            id: partner._id,
            role: 'delivery'
        },
        secret,
        { expiresIn }
    );

    const partnerObj = partner.toObject();
    delete partnerObj.password;

    return {
        partner: partnerObj,
        token
    };
};

/**
 * Get delivery partner profile
 * @param {string} partnerId
 * @returns {Promise<Object>}
 */
const getDeliveryProfile = async (partnerId) => {
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        const error = new Error('Invalid partner ID format');
        error.statusCode = 400;
        throw error;
    }

    const partner = await DeliveryPartner.findById(partnerId).select('-password');
    if (!partner) {
        const error = new Error('Delivery partner not found');
        error.statusCode = 404;
        throw error;
    }

    return partner;
};

/**
 * Update delivery partner profile
 * @param {string} partnerId
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
const updateDeliveryProfile = async (partnerId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        const error = new Error('Invalid partner ID format');
        error.statusCode = 400;
        throw error;
    }

    const updates = { ...updateData };
    delete updates._id;
    delete updates.email;

    if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const partner = await DeliveryPartner.findByIdAndUpdate(partnerId, updates, {
        new: true,
        runValidators: true
    }).select('-password');

    if (!partner) {
        const error = new Error('Delivery partner not found');
        error.statusCode = 404;
        throw error;
    }

    return partner;
};

/**
 * Update availability / online status
 * @param {string} partnerId
 * @param {boolean} isAvailable
 * @returns {Promise<Object>}
 */
const updateDeliveryStatus = async (partnerId, isAvailable) => {
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        const error = new Error('Invalid partner ID format');
        error.statusCode = 400;
        throw error;
    }

    if (isAvailable === undefined) {
        const error = new Error('Please specify isAvailable boolean value');
        error.statusCode = 400;
        throw error;
    }

    const partner = await DeliveryPartner.findByIdAndUpdate(
        partnerId,
        { isAvailable: Boolean(isAvailable) },
        { new: true }
    ).select('-password');

    if (!partner) {
        const error = new Error('Delivery partner not found');
        error.statusCode = 404;
        throw error;
    }

    return partner;
};

/**
 * Retrieve jobs currently assigned to this delivery partner
 * @param {string} partnerId
 * @returns {Promise<Array>}
 */
const getAssignedJobs = async (partnerId) => {
    const jobs = await DeliveryJob.find({
        deliveryPartner: partnerId,
        status: { $ne: 'delivered' }
    })
        .populate({
            path: 'order',
            populate: { path: 'user', select: 'name phone address' }
        })
        .populate('store', 'name phone address')
        .sort({ createdAt: -1 });

    return jobs;
};

/**
 * Retrieve unassigned delivery jobs available for any partner to claim
 * @returns {Promise<Array>}
 */
const getAvailableJobs = async () => {
    const jobs = await DeliveryJob.find({
        status: 'pending',
        deliveryPartner: null
    })
        .populate({
            path: 'order',
            populate: { path: 'user', select: 'name phone address' }
        })
        .populate('store', 'name phone address')
        .sort({ createdAt: -1 });

    return jobs;
};

/**
 * Accept a delivery assignment
 * @param {string} partnerId
 * @param {string} jobId
 * @returns {Promise<Object>} Updated job
 */
const acceptDeliveryJob = async (partnerId, jobId) => {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        const error = new Error('Invalid job ID format');
        error.statusCode = 400;
        throw error;
    }

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
        const error = new Error('Delivery partner not found');
        error.statusCode = 404;
        throw error;
    }

    const job = await DeliveryJob.findById(jobId);
    if (!job) {
        const error = new Error('Delivery job not found');
        error.statusCode = 404;
        throw error;
    }

    if (job.deliveryPartner && job.deliveryPartner.toString() !== partnerId) {
        const error = new Error('This delivery job is already assigned to another partner');
        error.statusCode = 409;
        throw error;
    }

    job.deliveryPartner = partner._id;
    job.status = 'accepted';
    await job.save();

    // Sync with order
    const order = await Order.findById(job.order);
    if (order) {
        order.deliveryPartner = partner._id;
        order.deliveryStatus = 'accepted';
        await order.save();

        // Notify user
        await createNotification({
            recipientType: 'user',
            recipientId: order.user,
            title: 'Delivery Partner Assigned',
            message: `${partner.name} (${partner.phone}) has been assigned to pick up/deliver your laundry.`,
            orderId: order._id
        });
    }

    return job;
};

/**
 * Update delivery job status and location
 * Supports stages: picked_from_user, at_store, picked_from_store, out_for_delivery, delivered
 * @param {string} partnerId
 * @param {string} jobId
 * @param {Object} updateData { status, currentLocation, notes }
 * @returns {Promise<Object>} Updated job
 */
const updateDeliveryJobStatus = async (partnerId, jobId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        const error = new Error('Invalid job ID format');
        error.statusCode = 400;
        throw error;
    }

    const validStatuses = [
        'accepted',
        'picked_from_user',
        'at_store',
        'picked_from_store',
        'out_for_delivery',
        'delivered'
    ];

    const { status, currentLocation, notes } = updateData;
    if (!status || !validStatuses.includes(status)) {
        const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const job = await DeliveryJob.findOne({ _id: jobId, deliveryPartner: partnerId });
    if (!job) {
        const error = new Error('Delivery job not found or not assigned to you');
        error.statusCode = 404;
        throw error;
    }

    job.status = status;
    if (currentLocation) job.currentLocation = currentLocation;
    if (notes) job.notes = notes;
    await job.save();

    // Sync order deliveryStatus
    const order = await Order.findById(job.order);
    if (order) {
        order.deliveryStatus = status;
        if (status === 'delivered') {
            order.orderStatus = 'completed';
        }
        await order.save();

        // Notify user
        const statusFriendly = status.replace(/_/g, ' ');
        await createNotification({
            recipientType: 'user',
            recipientId: order.user,
            title: `Delivery Update: ${statusFriendly.toUpperCase()}`,
            message: `Your laundry order #${order._id} is now '${statusFriendly}'.${currentLocation ? ` Current location: ${currentLocation}` : ''}`,
            orderId: order._id
        });
    }

    return job;
};

/**
 * Get delivery history for completed jobs
 * @param {string} partnerId
 * @returns {Promise<Array>}
 */
const getDeliveryHistory = async (partnerId) => {
    const history = await DeliveryJob.find({
        deliveryPartner: partnerId,
        status: 'delivered'
    })
        .populate('order')
        .populate('store', 'name phone address')
        .sort({ updatedAt: -1 });

    return history;
};

module.exports = {
    registerDeliveryPartner,
    loginDeliveryPartner,
    getDeliveryProfile,
    updateDeliveryProfile,
    updateDeliveryStatus,
    getAssignedJobs,
    getAvailableJobs,
    acceptDeliveryJob,
    updateDeliveryJobStatus,
    getDeliveryHistory
};
