const express = require('express');
const {
    getNotifications,
    markNotificationAsRead,
    markAllAsRead
} = require('../services/notificationService');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification alerts for users, stores, and delivery partners
 */

/**
 * @swagger
 * /api/notifications/me:
 *   get:
 *     summary: Retrieve notifications for currently authenticated actor
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/me', verifyToken, async (req, res, next) => {
    try {
        const notifications = await getNotifications(req.auth.role, req.auth.id);
        res.status(200).json({ count: notifications.length, notifications });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', verifyToken, async (req, res, next) => {
    try {
        const notification = await markNotificationAsRead(req.params.id, req.auth.id);
        res.status(200).json({ message: 'Marked as read', notification });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read for currently authenticated actor
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', verifyToken, async (req, res, next) => {
    try {
        const result = await markAllAsRead(req.auth.role, req.auth.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
