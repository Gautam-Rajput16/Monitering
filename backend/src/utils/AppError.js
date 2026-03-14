/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                       APP ERROR                              ║
 * ║  Structured, operational error class for the whole backend   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:  throw new AppError('Not found', 404, 'RESOURCE_NOT_FOUND');
 *
 * Properties
 * ──────────
 *  statusCode    – HTTP status code
 *  errorCode     – machine-readable error type (e.g. VALIDATION_ERROR)
 *  isOperational – true = expected error, false = programming bug
 */

class AppError extends Error {
    /**
     * @param {string} message     – human-readable message
     * @param {number} statusCode  – HTTP status code (default 500)
     * @param {string} errorCode   – machine-readable code (default INTERNAL_ERROR)
     */
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // distinguishes expected errors from bugs

        // Capture stack trace, excluding the constructor call
        Error.captureStackTrace(this, this.constructor);
    }
}

// ─── Common factory helpers ─────────────────────────────────────
AppError.badRequest = (message = 'Bad request', errorCode = 'BAD_REQUEST') =>
    new AppError(message, 400, errorCode);

AppError.unauthorized = (message = 'Unauthorized', errorCode = 'AUTH_FAILED') =>
    new AppError(message, 401, errorCode);

AppError.forbidden = (message = 'Access denied', errorCode = 'FORBIDDEN') =>
    new AppError(message, 403, errorCode);

AppError.notFound = (message = 'Resource not found', errorCode = 'NOT_FOUND') =>
    new AppError(message, 404, errorCode);

AppError.conflict = (message = 'Conflict', errorCode = 'CONFLICT') =>
    new AppError(message, 409, errorCode);

AppError.tooMany = (message = 'Too many requests', errorCode = 'RATE_LIMITED') =>
    new AppError(message, 429, errorCode);

module.exports = AppError;
