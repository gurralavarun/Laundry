const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Validates JWT from Authorization Bearer header and attaches auth payload to req.auth
 */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const error = new Error('Authentication required. Bearer token missing.');
            error.statusCode = 401;
            throw error;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            const error = new Error('Authentication required. Token not provided.');
            error.statusCode = 401;
            throw error;
        }

        const secret = process.env.JWT_SECRET || 'laundry_jwt_super_secret_key_2026';
        const decoded = jwt.verify(token, secret);

        req.auth = {
            id: decoded.id,
            role: decoded.role
        };
        req.user = req.auth;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            error.statusCode = 401;
            error.message = 'Invalid authentication token';
        } else if (error.name === 'TokenExpiredError') {
            error.statusCode = 401;
            error.message = 'Authentication token expired';
        }
        next(error);
    }
};

/**
 * Role-based Authorization Middleware
 * Enforces role restrictions (e.g., 'user', 'store')
 * @param  {...string} roles Allowed roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            const error = new Error('Access forbidden. Insufficient permissions.');
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
};

module.exports = {
    verifyToken,
    requireRole
};
