/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  AUTH MIDDLEWARE                              ║
 * ║  JWT verification & role-based access control                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Exports
 * ───────
 *  authenticate   – verifies the Bearer token and attaches the
 *                   decoded user payload to `req.user`
 *  authorizeAdmin – gate that allows only users with role "admin"
 *
 * Token format expected in the Authorization header:
 *    Authorization: Bearer <jwt_token>
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * authenticate
 * ─────────────
 * 1. Extract token from `Authorization: Bearer <token>`
 * 2. Verify signature & expiry using JWT_SECRET
 * 3. Look up the user in the database
 * 4. Attach user document to `req.user` for downstream handlers
 */
const authenticate = async (req, res, next) => {
    try {
        // ── Step 1: Extract token ────────────────────────────────
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        // ── Step 2: Verify token ─────────────────────────────────
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ── Step 3: Find user by decoded id ──────────────────────
        const user = await User.findOne({ userId: decoded.userId });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User associated with this token no longer exists.',
            });
        }

        // ── Step 4: Attach user to request ───────────────────────
        req.user = user;
        next();
    } catch (error) {
        logger.error(`Auth middleware error: ${error.message}`);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please log in again.',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed.',
        });
    }
};

/**
 * authorizeAdmin
 * ──────────────
 * Must be used AFTER `authenticate` middleware.
 * Checks that the authenticated user has the "admin" role.
 */
const authorizeAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }
    next();
};

module.exports = { authenticate, authorizeAdmin };
