const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} userData
 * @returns {Promise<Object>} Safe user document without password
 */
const registerUser = async (userData) => {
    const { name, email, phone, password, address, addresses } = userData;

    if (!password) {
        const error = new Error('Password is required');
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const initialAddresses = [];
    if (Array.isArray(addresses) && addresses.length > 0) {
        initialAddresses.push(...addresses);
    } else if (address) {
        initialAddresses.push({
            street: address,
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500081',
            isDefault: true
        });
    }

    const user = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,
        address: address || (initialAddresses[0] ? `${initialAddresses[0].street}, ${initialAddresses[0].city}` : ''),
        addresses: initialAddresses
    });

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
};

/**
 * Authenticate user and issue JWT
 * @param {Object} credentials { email, password }
 * @returns {Promise<Object>} { user, token }
 */
const loginUser = async ({ email, password }) => {
    if (!email || !password) {
        const error = new Error('Please provide both email and password');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const secret = process.env.JWT_SECRET || 'laundry_jwt_super_secret_key_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
        {
            id: user._id,
            role: 'user'
        },
        secret,
        { expiresIn }
    );

    const userObj = user.toObject();
    delete userObj.password;

    return {
        user: userObj,
        token
    };
};

/**
 * Retrieve available clothing options by category
 * @returns {Object} Clothing categories for men and women
 */
const getClothingOptions = async () => {
    return {
        men: ['casual', 'formal', 'traditional'],
        women: ['casual', 'formal', 'saree', 'traditional'],
        commonItems: {
            men: ['Shirt', 'T-Shirt', 'Trouser', 'Jeans', 'Suit', 'Kurta Pajama'],
            women: ['Saree', 'Salwar Kameez', 'Kurti', 'Jeans', 'Top', 'Dress', 'Suit'],
            unisex: ['Bedsheet', 'Blanket', 'Towel', 'Curtain']
        }
    };
};

/**
 * Retrieve user by ID (safe)
 * @param {string} id
 * @returns {Promise<Object>}
 */
const getUserById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error('Invalid user ID format');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
const updateUserProfile = async (userId, updateData) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error('Invalid user ID format');
        error.statusCode = 400;
        throw error;
    }

    const updates = { ...updateData };
    delete updates._id;
    delete updates.email; // Email should not be changed via regular update

    if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
        new: true,
        runValidators: true
    }).select('-password');

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

/**
 * Add address to user profile
 * @param {string} userId
 * @param {Object} addressData { street, city, state, pincode, isDefault }
 * @returns {Promise<Array>} Updated addresses list
 */
const addAddress = async (userId, addressData) => {
    const { street, city, state, pincode, isDefault } = addressData;
    if (!street || !city || !state || !pincode) {
        const error = new Error('Street, city, state, and pincode are required for an address');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    if (isDefault || user.addresses.length === 0) {
        user.addresses.forEach((addr) => {
            addr.isDefault = false;
        });
    }

    user.addresses.push({
        street,
        city,
        state,
        pincode,
        isDefault: isDefault || user.addresses.length === 0
    });

    if (isDefault || user.addresses.length === 1) {
        user.address = `${street}, ${city}, ${state} - ${pincode}`;
    }

    await user.save();
    return user.addresses;
};

/**
 * Get user addresses
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getUserAddresses = async (userId) => {
    const user = await User.findById(userId).select('addresses');
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    return user.addresses || [];
};

/**
 * Update an existing user address
 * @param {string} userId
 * @param {string} addressId
 * @param {Object} addressData
 * @returns {Promise<Array>}
 */
const updateAddress = async (userId, addressId, addressData) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const addr = user.addresses.id(addressId);
    if (!addr) {
        const error = new Error('Address not found');
        error.statusCode = 404;
        throw error;
    }

    if (addressData.street !== undefined) addr.street = addressData.street;
    if (addressData.city !== undefined) addr.city = addressData.city;
    if (addressData.state !== undefined) addr.state = addressData.state;
    if (addressData.pincode !== undefined) addr.pincode = addressData.pincode;

    if (addressData.isDefault) {
        user.addresses.forEach((a) => {
            a.isDefault = false;
        });
        addr.isDefault = true;
        user.address = `${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}`;
    }

    await user.save();
    return user.addresses;
};

/**
 * Delete a user address
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<Array>}
 */
const deleteAddress = async (userId, addressId) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const addr = user.addresses.id(addressId);
    if (!addr) {
        const error = new Error('Address not found');
        error.statusCode = 404;
        throw error;
    }

    const wasDefault = addr.isDefault;
    user.addresses.pull(addressId);

    if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
        user.address = `${user.addresses[0].street}, ${user.addresses[0].city}, ${user.addresses[0].state} - ${user.addresses[0].pincode}`;
    }

    await user.save();
    return user.addresses;
};

/**
 * Set an address as default
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<Array>}
 */
const setDefaultAddress = async (userId, addressId) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const targetAddr = user.addresses.id(addressId);
    if (!targetAddr) {
        const error = new Error('Address not found');
        error.statusCode = 404;
        throw error;
    }

    user.addresses.forEach((addr) => {
        addr.isDefault = addr._id.toString() === addressId;
    });

    user.address = `${targetAddr.street}, ${targetAddr.city}, ${targetAddr.state} - ${targetAddr.pincode}`;
    await user.save();

    return user.addresses;
};

/**
 * Place/create a new laundry order for the user
 * @param {string} userId
 * @param {Object} orderData
 * @returns {Promise<Object>} Created order
 */
const createUserOrder = async (userId, orderData) => {
    // Lazy-require to prevent circular dependency if any
    const { createOrder } = require('./orderService');
    return await createOrder(userId, orderData);
};

module.exports = {
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
    createUserOrder,
    createOrder: createUserOrder
};
