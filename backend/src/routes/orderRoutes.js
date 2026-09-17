const express = require('express');
const {
    createOrder,
    getOrderById,
    reRequestStore,
    trackOrder
} = require('../services/orderService');
const {
    processOrderPayment,
    getOrderPayment
} = require('../services/paymentService');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order lifecycle, store selection, re-requesting, tracking, and payments
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new laundry order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderCreate'
 *     responses:
 *       201:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid input or missing fields
 */
router.post('/', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const order = await createOrder(req.auth.id, req.body);
        res.status(201).json({
            message: 'Order created successfully and sent to store for review',
            order
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Retrieve single order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.get('/:orderId', verifyToken, async (req, res, next) => {
    try {
        const order = await getOrderById(req.params.orderId, req.auth);
        res.status(200).json({ order });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/orders/{orderId}/track:
 *   get:
 *     summary: Track order status and delivery updates
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order tracking details
 */
router.get('/:orderId/track', verifyToken, async (req, res, next) => {
    try {
        const tracking = await trackOrder(req.params.orderId, req.auth);
        res.status(200).json({ tracking });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/orders/{orderId}/request-store:
 *   patch:
 *     summary: Re-request order to another store after rejection
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId]
 *             properties:
 *               storeId:
 *                 type: string
 *                 example: 65f2c41893cfa328b9c2a1e4
 *     responses:
 *       200:
 *         description: Order re-requested to new store
 */
router.patch('/:orderId/request-store', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const order = await reRequestStore(req.auth.id, req.params.orderId, req.body.storeId);
        res.status(200).json({
            message: 'Order re-requested successfully to new store',
            order
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/orders/{orderId}/payment:
 *   post:
 *     summary: Pay for accepted order (Enforces payment-after-acceptance rule)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, upi, netbanking, cash_on_delivery]
 *                 example: upi
 *     responses:
 *       200:
 *         description: Payment successful
 *       400:
 *         description: Store has not accepted yet or order already paid
 */
router.post('/:orderId/payment', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const result = await processOrderPayment(req.auth.id, req.params.orderId, req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/orders/{orderId}/payment:
 *   get:
 *     summary: Get payment receipt for an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/:orderId/payment', verifyToken, async (req, res, next) => {
    try {
        const payment = await getOrderPayment(req.params.orderId, req.auth);
        res.status(200).json({ payment });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
