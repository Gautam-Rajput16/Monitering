/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              CENTRALIZED ERROR MIDDLEWARE                     ║
 * ║  Catches all errors and returns structured JSON responses    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Response shape
 * ──────────────
 *  {
 *    success:   false,
 *    message:   "<human-readable summary>",
 *    errorCode: "VALIDATION_ERROR",          // machine-readable
 *    errors:    ["detail", ...]              // only when applicable
 *    requestId: "uuid",                      // for log correlation
 *    stack:     "<stack trace>"              // only in development
 *  }
 */

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
    // Start from AppError defaults or generic 500
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorCode = err.errorCode || 'INTERNAL_ERROR';
    let errors = [];

    // ── Mongoose Validation Error ──────────────────────────────
    if (err.name === 'ValidationError' && err.errors) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation failed';
        errors = Object.values(err.errors).map((e) => e.message);
    }

    // ── Mongoose Cast Error (invalid ObjectId, etc.) ───────────
    if (err.name === 'CastError') {
        statusCode = 400;
        errorCode = 'INVALID_VALUE';
        message = `Invalid value for ${err.path}: ${err.value}`;
    }

    // ── MongoDB Duplicate Key ──────────────────────────────────
    if (err.code === 11000) {
        statusCode = 409;
        errorCode = 'DUPLICATE_KEY';
        const field = Object.keys(err.keyValue || {}).join(', ');
        message = `Duplicate value for field(s): ${field}`;
    }

    // ── JWT Errors ─────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Token has expired';
    }

    // ── Network / Timeout Errors ───────────────────────────────
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
        message = 'Service temporarily unavailable';
    }

    // ── Log the error ──────────────────────────────────────────
    const logMeta = {
        errorCode,
        statusCode,
        path: req.originalUrl,
        method: req.method,
        requestId: req.id,
        userId: req.user?.userId,
        ...(errors.length > 0 && { errors }),
    };

    if (statusCode >= 500) {
        logger.error(message, { ...logMeta, stack: err.stack });
    } else {
        logger.warn(message, logMeta);
    }

    // ── Send response ─────────────────────────────────────────
    const response = {
        success: false,
        message,
        errorCode,
        ...(errors.length > 0 && { errors }),
        ...(req.id && { requestId: req.id }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    res.status(statusCode).json(response);
};

/**
 * notFound — catch-all for undefined routes.
 */
const notFound = (req, res, next) => {
    const error = new AppError(
        `Route not found: ${req.originalUrl}`,
        404,
        'ROUTE_NOT_FOUND'
    );
    next(error);
};

module.exports = { errorMiddleware, notFound };
