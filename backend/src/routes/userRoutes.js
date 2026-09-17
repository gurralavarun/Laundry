const express = require('express');
const {
    registerUser,
    loginUser,
    getClothingOptions,
    getUserById,
    updateUserProfile,
    addAddress,
    getUserAddresses,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    createUserOrder
} = require('../services/userService');
const {
    createOrder,
    getUserOrders,
    getOrderById,
    trackOrder
} = require('../services/orderService');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile, addresses, authentication, and order access endpoints
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or missing fields
 *       409:
 *         description: Duplicate email conflict
 */
router.post('/register', async (req, res, next) => {
    try {
        const user = await registerUser(req.body);
        res.status(201).json({
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Authenticate user and get JWT
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', async (req, res, next) => {
    try {
        const result = await loginUser(req.body);
        res.status(200).json({
            message: 'Login successful',
            token: result.token,
            user: result.user
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/clothing-options:
 *   get:
 *     summary: Retrieve available clothing categories for men, women, and unisex
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Available clothing options
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClothingOptionsResponse'
 */
router.get('/clothing-options', async (req, res, next) => {
    try {
        const options = await getClothingOptions();
        res.status(200).json(options);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get profile of currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const user = await getUserById(req.auth.id);
        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update profile of currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/me', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const user = await updateUserProfile(req.auth.id, req.body);
        res.status(200).json({
            message: 'User profile updated successfully',
            user
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/addresses:
 *   get:
 *     summary: List all saved addresses of current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 */
router.get('/me/addresses', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const addresses = await getUserAddresses(req.auth.id);
        res.status(200).json({ addresses });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/addresses:
 *   post:
 *     summary: Add a new address to user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       201:
 *         description: Address added
 */
router.post('/me/addresses', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const addresses = await addAddress(req.auth.id, req.body);
        res.status(201).json({
            message: 'Address added successfully',
            addresses
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/addresses/{addressId}:
 *   patch:
 *     summary: Update an existing address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       200:
 *         description: Address updated
 */
router.patch('/me/addresses/:addressId', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const addresses = await updateAddress(req.auth.id, req.params.addressId, req.body);
        res.status(200).json({
            message: 'Address updated successfully',
            addresses
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/addresses/{addressId}:
 *   delete:
 *     summary: Delete a saved address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted
 */
router.delete('/me/addresses/:addressId', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const addresses = await deleteAddress(req.auth.id, req.params.addressId);
        res.status(200).json({
            message: 'Address deleted successfully',
            addresses
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/addresses/{addressId}/default:
 *   patch:
 *     summary: Set an address as default
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default address updated
 */
router.patch('/me/addresses/:addressId/default', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const addresses = await setDefaultAddress(req.auth.id, req.params.addressId);
        res.status(200).json({
            message: 'Default address updated successfully',
            addresses
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/orders:
 *   get:
 *     summary: Retrieve order history for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User orders
 */
router.get('/me/orders', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const orders = await getUserOrders(req.auth.id);
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
 * /api/users/me/orders:
 *   post:
 *     summary: Create a new laundry order for the authenticated user
 *     tags: [Users]
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
 *         description: Order created successfully and sent to store for review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error or store closed
 *       404:
 *         description: Store or user not found
 */
router.post('/me/orders', verifyToken, requireRole('user'), async (req, res, next) => {
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
 * /api/users/orders:
 *   post:
 *     summary: Create a new laundry order for the authenticated user (alias)
 *     tags: [Users]
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
 *         description: Order created successfully and sent to store for review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error or store closed
 *       404:
 *         description: Store or user not found
 */
router.post('/orders', verifyToken, requireRole('user'), async (req, res, next) => {
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
 * /api/users/me/orders/{orderId}:
 *   get:
 *     summary: Retrieve single order details for current user
 *     tags: [Users]
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
 *       403:
 *         description: Access forbidden
 *       404:
 *         description: Order not found
 */
router.get('/me/orders/:orderId', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const order = await getOrderById(req.params.orderId, req.auth);
        res.status(200).json({ order });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/users/me/orders/{orderId}/track:
 *   get:
 *     summary: Track order status for current user
 *     tags: [Users]
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
router.get('/me/orders/:orderId/track', verifyToken, requireRole('user'), async (req, res, next) => {
    try {
        const tracking = await trackOrder(req.params.orderId, req.auth);
        res.status(200).json({ tracking });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
