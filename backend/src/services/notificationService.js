const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/**
 * Dispatch an internal notification
 * @param {Object} params { recipientType, recipientId, title, message, orderId }
 * @returns {Promise<Object>} Created notification document
 */
const createNotification = async ({ recipientType, recipientId, title, message, orderId = null }) => {
    try {
        const notification = await Notification.create({
            recipientType,
            recipientId,
            title,
            message,
            orderId
        });
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error.message);
        return null;
    }
};

/**
 * Retrieve notifications for an actor
 * @param {string} recipientType 'user' | 'store' | 'delivery'
 * @param {string} recipientId
 * @returns {Promise<Array>}
 */
const getNotifications = async (recipientType, recipientId) => {
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        const error = new Error('Invalid recipient ID format');
        error.statusCode = 400;
        throw error;
    }

    const notifications = await Notification.find({
        recipientType,
        recipientId
    }).sort({ createdAt: -1 }).limit(50);

    return notifications;
};

/**
 * Mark a single notification as read
 * @param {string} notificationId
 * @param {string} recipientId
 * @returns {Promise<Object>}
 */
const markNotificationAsRead = async (notificationId, recipientId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        const error = new Error('Invalid notification ID format');
        error.statusCode = 400;
        throw error;
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipientId },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }

    return notification;
};

/**
 * Mark all notifications as read for an actor
 * @param {string} recipientType
 * @param {string} recipientId
 */
const markAllAsRead = async (recipientType, recipientId) => {
    await Notification.updateMany(
        { recipientType, recipientId, isRead: false },
        { isRead: true }
    );
    return { success: true, message: 'All notifications marked as read' };
};

module.exports = {
    createNotification,
    getNotifications,
    markNotificationAsRead,
    markAllAsRead
};
