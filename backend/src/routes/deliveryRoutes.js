const express = require('express');
const {
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
} = require('../services/deliveryService');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Delivery partner authentication, job assignments, pickup, tracking, and delivery workflow
 */

/**
 * @swagger
 * /api/delivery/register:
 *   post:
 *     summary: Register a new delivery partner
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryPartnerRegister'
 *     responses:
 *       201:
 *         description: Delivery partner registered
 */
router.post('/register', async (req, res, next) => {
    try {
        const partner = await registerDeliveryPartner(req.body);
        res.status(201).json({
            message: 'Delivery partner registered successfully',
            partner
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/login:
 *   post:
 *     summary: Authenticate delivery partner and obtain JWT
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryPartnerLogin'
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', async (req, res, next) => {
    try {
        const result = await loginDeliveryPartner(req.body);
        res.status(200).json({
            message: 'Login successful',
            token: result.token,
            partner: result.partner
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me:
 *   get:
 *     summary: Get profile of authenticated delivery partner
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delivery partner profile
 */
router.get('/me', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const partner = await getDeliveryProfile(req.auth.id);
        res.status(200).json({ partner });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me:
 *   patch:
 *     summary: Update profile of authenticated delivery partner
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               vehicleType:
 *                 type: string
 *               vehicleNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/me', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const partner = await updateDeliveryProfile(req.auth.id, req.body);
        res.status(200).json({
            message: 'Delivery partner profile updated successfully',
            partner
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me/status:
 *   patch:
 *     summary: Toggle online/available status for delivery partner
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isAvailable]
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.patch('/me/status', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const partner = await updateDeliveryStatus(req.auth.id, req.body.isAvailable);
        res.status(200).json({
            message: `Delivery partner availability set to ${partner.isAvailable}`,
            partner
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/available-jobs:
 *   get:
 *     summary: View unassigned delivery jobs ready for claiming
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available delivery jobs
 */
router.get('/available-jobs', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const jobs = await getAvailableJobs();
        res.status(200).json({ count: jobs.length, jobs });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me/jobs:
 *   get:
 *     summary: View all deliveries assigned to authenticated partner
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned delivery jobs
 */
router.get('/me/jobs', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const jobs = await getAssignedJobs(req.auth.id);
        res.status(200).json({ count: jobs.length, jobs });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me/jobs/{jobId}/accept:
 *   patch:
 *     summary: Accept a delivery assignment
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery job accepted
 */
router.patch('/me/jobs/:jobId/accept', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const job = await acceptDeliveryJob(req.auth.id, req.params.jobId);
        res.status(200).json({
            message: 'Delivery job accepted successfully',
            job
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me/jobs/{jobId}/status:
 *   patch:
 *     summary: Update delivery status and current location
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, picked_from_user, at_store, picked_from_store, out_for_delivery, delivered]
 *                 example: picked_from_user
 *               currentLocation:
 *                 type: string
 *                 example: Hitech City, Hyderabad
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Delivery status updated
 */
router.patch('/me/jobs/:jobId/status', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const job = await updateDeliveryJobStatus(req.auth.id, req.params.jobId, req.body);
        res.status(200).json({
            message: `Delivery status updated to ${job.status}`,
            job
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/delivery/me/history:
 *   get:
 *     summary: View history of delivered jobs
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Completed deliveries history
 */
router.get('/me/history', verifyToken, requireRole('delivery'), async (req, res, next) => {
    try {
        const history = await getDeliveryHistory(req.auth.id);
        res.status(200).json({ count: history.length, history });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
