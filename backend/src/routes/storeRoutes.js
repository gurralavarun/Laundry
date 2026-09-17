const express = require('express');
const {
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
} = require('../services/storeService');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stores
 *   description: Store business operations, authentication, order handling, inventory, pricing, and reports
 */

/**
 * @swagger
 * /api/stores/register:
 *   post:
 *     summary: Register a new laundry store
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreRegister'
 *     responses:
 *       201:
 *         description: Store registered successfully
 */
router.post('/register', async (req, res, next) => {
    try {
        const store = await registerStore(req.body);
        res.status(201).json({
            message: 'Store registered successfully',
            store
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/login:
 *   post:
 *     summary: Authenticate store and obtain JWT
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreLogin'
 *     responses:
 *       200:
 *         description: Store authenticated successfully
 */
router.post('/login', async (req, res, next) => {
    try {
        const result = await loginStore(req.body);
        res.status(200).json({
            message: 'Login successful',
            token: result.token,
            store: result.store
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/available:
 *   get:
 *     summary: Retrieve public list of available (open) stores for users
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: List of available stores
 */
router.get('/available', async (req, res, next) => {
    try {
        const stores = await getAvailableStores();
        res.status(200).json({
            count: stores.length,
            stores
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me:
 *   get:
 *     summary: Get profile of currently authenticated store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Store profile details
 */
router.get('/me', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const store = await getStoreProfile(req.auth.id);
        res.status(200).json({ store });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me:
 *   patch:
 *     summary: Update profile of currently authenticated store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreProfileUpdate'
 *     responses:
 *       200:
 *         description: Store profile updated successfully
 */
router.patch('/me', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const store = await updateStoreProfile(req.auth.id, req.body);
        res.status(200).json({
            message: 'Store profile updated successfully',
            store
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/status:
 *   patch:
 *     summary: Update store availability status (open/closed)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreStatusUpdate'
 *     responses:
 *       200:
 *         description: Store status updated successfully
 */
router.patch('/me/status', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const store = await updateStoreStatus(req.auth.id, req.body);
        res.status(200).json({
            message: 'Store status updated successfully',
            store
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/delivery:
 *   patch:
 *     summary: Update store delivery facility (in-house vs external partner)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreDeliveryUpdate'
 *     responses:
 *       200:
 *         description: Store delivery facility updated successfully
 */
router.patch('/me/delivery', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const store = await updateStoreDelivery(req.auth.id, req.body);
        res.status(200).json({
            message: 'Store delivery facility updated successfully',
            store
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/orders:
 *   get:
 *     summary: View incoming/all orders for this store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orderStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of store orders
 */
router.get('/me/orders', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const orders = await getStoreOrders(req.auth.id, req.query);
        res.status(200).json({
            count: orders.length,
            orders
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/orders/{orderId}/accept:
 *   patch:
 *     summary: Accept incoming customer laundry order
 *     tags: [Stores]
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
 *         description: Order accepted successfully
 */
router.patch('/me/orders/:orderId/accept', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const order = await acceptStoreOrder(req.auth.id, req.params.orderId);
        res.status(200).json({
            message: 'Order accepted successfully. Payment has been unlocked for the customer.',
            order
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/orders/{orderId}/reject:
 *   patch:
 *     summary: Reject incoming customer laundry order
 *     tags: [Stores]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order rejected
 */
router.patch('/me/orders/:orderId/reject', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const order = await rejectStoreOrder(req.auth.id, req.params.orderId, req.body.reason);
        res.status(200).json({
            message: 'Order rejected. Customer has been notified to request another store.',
            order
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status (processing, ready, completed, cancelled)
 *     tags: [Stores]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [processing, ready, completed, cancelled]
 *               deliveryStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch('/me/orders/:orderId/status', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const { status, deliveryStatus } = req.body;
        const order = await updateStoreOrderStatus(req.auth.id, req.params.orderId, status, deliveryStatus);
        res.status(200).json({
            message: `Order status updated to ${status}`,
            order
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/services:
 *   get:
 *     summary: View store services and pricing catalog
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Store services list
 */
router.get('/me/services', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const services = await getStoreServices(req.auth.id);
        res.status(200).json({ count: services.length, services });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/services:
 *   post:
 *     summary: Add or update pricing for a clothing service
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceInput'
 *     responses:
 *       200:
 *         description: Service price saved
 */
router.post('/me/services', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const service = await createOrUpdateStoreService(req.auth.id, req.body);
        res.status(200).json({
            message: 'Service pricing saved successfully',
            service
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/services/{serviceId}:
 *   delete:
 *     summary: Delete a store service price
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service price removed
 */
router.delete('/me/services/:serviceId', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const result = await deleteStoreService(req.auth.id, req.params.serviceId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/inventory:
 *   get:
 *     summary: View store supplies and inventory
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory list
 */
router.get('/me/inventory', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const inventory = await getStoreInventory(req.auth.id);
        res.status(200).json({ count: inventory.length, inventory });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/inventory:
 *   post:
 *     summary: Add a stock item to store inventory
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryInput'
 *     responses:
 *       201:
 *         description: Inventory item added
 */
router.post('/me/inventory', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const item = await addInventoryItem(req.auth.id, req.body);
        res.status(201).json({
            message: 'Inventory item updated/created successfully',
            item
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/inventory/{itemId}:
 *   patch:
 *     summary: Update inventory stock quantity
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               lowStockThreshold:
 *                 type: number
 *     responses:
 *       200:
 *         description: Inventory item updated
 */
router.patch('/me/inventory/:itemId', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const item = await updateInventoryItem(req.auth.id, req.params.itemId, req.body);
        res.status(200).json({
            message: 'Inventory item updated successfully',
            item
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/inventory/{itemId}:
 *   delete:
 *     summary: Remove inventory item
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory item deleted
 */
router.delete('/me/inventory/:itemId', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const result = await deleteInventoryItem(req.auth.id, req.params.itemId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/stores/me/reports:
 *   get:
 *     summary: View analytics, order metrics, and revenue report for store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Store performance reports
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreReport'
 */
router.get('/me/reports', verifyToken, requireRole('store'), async (req, res, next) => {
    try {
        const report = await getStoreReports(req.auth.id);
        res.status(200).json({ report });
    } catch (error) {
        next(error);
    }
});

module.exports = router;