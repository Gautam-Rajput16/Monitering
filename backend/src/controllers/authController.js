/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   AUTH CONTROLLER                            ║
 * ║  Handles registration, login, and profile retrieval          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const userService = require('../services/userService');
const { validateRegistration, validateLogin } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * POST /api/auth/register
 * Body: { email, password, role? }
 */
const register = async (req, res, next) => {
    try {
        // ── Validate input ───────────────────────────────────────
        const { valid, errors } = validateRegistration(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        // 🔒 Security: strip `role` from public registration.
        // Admins must be created via seed script or admin-invite endpoint.
        const { role, ...safeBody } = req.body;
        const { user, token } = await userService.registerUser(safeBody);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
    try {
        const { valid, errors } = validateLogin(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const { email, password } = req.body;
        const { user, token } = await userService.loginUser(email, password);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/profile
 * Protected – requires valid JWT (req.user set by authMiddleware)
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.userId);

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, getProfile };
