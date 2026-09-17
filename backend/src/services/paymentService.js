const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { createNotification } = require('./notificationService');

/**
 * Process order payment
 * STRICT BUSINESS RULE: Payment is ONLY permitted after the store has accepted the order!
 * @param {string} userId
 * @param {string} orderId
 * @param {Object} paymentData { paymentMethod }
 * @returns {Promise<Object>} { payment, order }
 */
const processOrderPayment = async (userId, orderId, paymentData = {}) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        const error = new Error('Order not found or does not belong to user');
        error.statusCode = 404;
        throw error;
    }

    // Business Rule Check 1: Store Acceptance
    if (order.orderStatus === 'pending') {
        const error = new Error('Payment is not available yet. The store must accept your order before payment can be completed.');
        error.statusCode = 400;
        throw error;
    }

    if (order.orderStatus === 'rejected') {
        const error = new Error('Cannot process payment for an order that was rejected by the store. Please request another store.');
        error.statusCode = 400;
        throw error;
    }

    if (order.orderStatus === 'cancelled') {
        const error = new Error('Cannot process payment for a cancelled order');
        error.statusCode = 400;
        throw error;
    }

    // Business Rule Check 2: Payment state
    if (order.paymentStatus === 'paid') {
        const error = new Error('Payment has already been completed for this order');
        error.statusCode = 400;
        throw error;
    }

    const { paymentMethod = 'card' } = paymentData;
    const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.create({
        order: order._id,
        user: userId,
        store: order.store,
        amount: order.totalAmount,
        paymentMethod,
        transactionId,
        status: 'paid',
        paymentDate: new Date()
    });

    order.paymentStatus = 'paid';
    await order.save();

    // Notify store
    if (order.store) {
        await createNotification({
            recipientType: 'store',
            recipientId: order.store,
            title: 'Payment Received',
            message: `User has completed payment of ₹${order.totalAmount} for order #${order._id} (Txn: ${transactionId}). Processing can now begin.`,
            orderId: order._id
        });
    }

    // Notify user
    await createNotification({
        recipientType: 'user',
        recipientId: order.user,
        title: 'Payment Successful',
        message: `Your payment of ₹${order.totalAmount} for order #${order._id} was successful (Txn: ${transactionId}).`,
        orderId: order._id
    });

    return {
        message: 'Payment completed successfully',
        payment,
        order
    };
};

/**
 * Get payment receipt / details for an order
 * @param {string} orderId
 * @param {Object} auth
 * @returns {Promise<Object>} Payment record
 */
const getOrderPayment = async (orderId, auth) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error('Invalid order ID format');
        error.statusCode = 400;
        throw error;
    }

    const payment = await Payment.findOne({ order: orderId })
        .populate('user', 'name email phone')
        .populate('store', 'name phone address');

    if (!payment) {
        const error = new Error('Payment record not found for this order');
        error.statusCode = 404;
        throw error;
    }

    // Access authorization check
    if (auth.role === 'user' && payment.user._id.toString() !== auth.id) {
        const error = new Error('Access forbidden. You can only view payments for your own orders.');
        error.statusCode = 403;
        throw error;
    }
    if (auth.role === 'store' && payment.store._id.toString() !== auth.id) {
        const error = new Error('Access forbidden. You can only view payments for your own store.');
        error.statusCode = 403;
        throw error;
    }

    return payment;
};

module.exports = {
    processOrderPayment,
    getOrderPayment
};
