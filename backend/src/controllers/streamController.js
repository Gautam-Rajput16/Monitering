/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  STREAM CONTROLLER                           ║
 * ║  REST endpoints for WebRTC stream session management         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const streamService = require('../services/streamService');
const { validateStreamSession } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * POST /api/streams/start
 * Body: { streamType: "camera" | "screen" | "audio" }
 * Protected – userId taken from JWT
 */
const startStream = async (req, res, next) => {
    try {
        const { valid, errors } = validateStreamSession(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const session = await streamService.createSession({
            userId: req.user.userId,
            streamType: req.body.streamType,
        });

        res.status(201).json({
            success: true,
            message: 'Stream session started',
            data: { session },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/streams/stop
 * Body: { sessionId }
 * Protected
 */
const stopStream = async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required',
            });
        }

        // 🔒 Ownership check: verify the user owns this session (or is admin)
        const existing = await streamService.getSessionById(sessionId);
        if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not own this session.',
            });
        }

        const session = await streamService.endSession(sessionId);

        res.status(200).json({
            success: true,
            message: 'Stream session stopped',
            data: { session },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/streams/active
 * Query: ?streamType=camera
 * Admin only
 */
const getActiveSessions = async (req, res, next) => {
    try {
        const { streamType } = req.query;
        const sessions = await streamService.getActiveSessions({ streamType });

        res.status(200).json({
            success: true,
            data: { sessions, count: sessions.length },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/streams/history/:userId
 * Query: ?page=1&limit=20&status=active
 * Admin or the user themselves
 */
const getSessionHistory = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (req.user.role !== 'admin' && req.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied.',
            });
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const { status } = req.query;
        const result = await streamService.getSessionsByUser(userId, {
            page,
            limit,
            status,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { startStream, stopStream, getActiveSessions, getSessionHistory };
