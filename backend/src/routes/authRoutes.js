/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     AUTH ROUTES                              ║
 * ║  POST /api/auth/register                                     ║
 * ║  POST /api/auth/login                                        ║
 * ║  GET  /api/auth/profile   (protected)                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

// ─── Public routes ──────────────────────────────────────────────
router.post('/register', authController.register);
router.post('/login', authController.login);

// ─── Protected routes ───────────────────────────────────────────
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
