/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    STREAM ROUTES                             ║
 * ║  POST /api/streams/start               (protected)           ║
 * ║  POST /api/streams/stop                (protected)           ║
 * ║  GET  /api/streams/active              (admin)               ║
 * ║  GET  /api/streams/history/:userId     (protected)           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

// All stream routes require authentication
router.use(authenticate);

router.post('/start', streamController.startStream);
router.post('/stop', streamController.stopStream);

// Active sessions – admin only
router.get('/active', authorizeAdmin, streamController.getActiveSessions);

// History – admin or the user themselves (checked in controller)
router.get('/history/:userId', streamController.getSessionHistory);

module.exports = router;
