/**
 * Centralized Error Handling Middleware
 * Handles Mongoose validation errors, duplicate keys, cast errors, JWT errors, and operational errors
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose validation error (missing required fields, enum failure, etc.)
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const messages = Object.values(err.errors).map((val) => val.message);
        message = messages.join(', ');
    }

    // Mongoose duplicate key error (code 11000)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
        message = `${field} already exists`;
    }

    // Mongoose CastError (invalid ObjectId format)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ID format: ${err.value}`;
    }

    // JWT verification errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token expired';
    }

    res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = errorHandler;
