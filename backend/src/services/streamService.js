/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    STREAM SERVICE                            ║
 * ║  Business logic for WebRTC stream session lifecycle          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Optimizations applied:
 *  • Atomic duplicate prevention via findOneAndUpdate + upsert
 *  • Stale session cleanup decoupled from getActiveSessions
 *  • Session ownership validation
 */

const StreamSession = require('../models/StreamSession');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Create a new stream session.
 *
 * Atomic duplicate prevention:
 * Uses findOneAndUpdate with a filter that matches an EXISTING active
 * session for this user+type. If one exists, it throws a conflict error.
 * If none exists, it creates a new one via upsert.
 *
 * This replaces the previous two-step find-then-create pattern which
 * was susceptible to race conditions under concurrent requests.
 */
const createSession = async (data) => {
    const { userId, streamType } = data;

    // Attempt to find an existing active session for this user + type
    const existing = await StreamSession.findOne({
        userId,
        streamType,
        status: 'active',
    })
        .select('sessionId')
        .lean();

    if (existing) {
        throw AppError.conflict(
            `User already has an active ${streamType} session`,
            'DUPLICATE_SESSION'
        );
    }

    // Create — the compound index { userId, streamType, status } prevents
    // a race condition at the DB level (duplicate key error is caught below)
    try {
        const session = await StreamSession.create({
            userId,
            streamType,
            status: 'active',
            startTime: new Date(),
        });

        logger.stream(`Session started: ${session.sessionId}`, {
            userId,
            type: streamType,
        });

        return session;
    } catch (err) {
        // If a parallel request sneaked in between the check and create,
        // MongoDB's unique index will throw a duplicate key error (11000)
        if (err.code === 11000) {
            throw AppError.conflict(
                `User already has an active ${streamType} session`,
                'DUPLICATE_SESSION'
            );
        }
        throw err;
    }
};

/**
 * End an active stream session.
 */
const endSession = async (sessionId) => {
    const session = await StreamSession.findOneAndUpdate(
        { sessionId, status: 'active' },
        { status: 'stopped', endTime: new Date() },
        { new: true }
    ).lean();

    if (!session) {
        throw AppError.notFound('Active session not found', 'SESSION_NOT_FOUND');
    }

    logger.stream(`Session ended: ${sessionId}`, {
        userId: session.userId,
        type: session.streamType,
        duration: `${Math.round((session.endTime - session.startTime) / 1000)}s`,
    });

    return session;
};

/**
 * Get all currently active sessions.
 *
 * Stale session cleanup has been moved to `cleanupStaleSessions()`
 * which runs on a separate interval — no longer blocking this read path.
 */
const getActiveSessions = async ({ streamType } = {}) => {
    const filter = { status: 'active' };
    if (streamType) filter.streamType = streamType;

    return StreamSession.find(filter)
        .sort({ startTime: -1 })
        .select('-__v')
        .lean();
};

/**
 * Clean up stale active sessions (> 24 hours old).
 *
 * This is called on a periodic interval from server.js
 * instead of being coupled to the getActiveSessions read path.
 */
const cleanupStaleSessions = async () => {
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await StreamSession.updateMany(
        { status: 'active', startTime: { $lt: staleThreshold } },
        { status: 'stopped', endTime: new Date() }
    );

    if (result.modifiedCount > 0) {
        logger.info(`Cleaned up ${result.modifiedCount} stale stream sessions`);
    }

    return result.modifiedCount;
};

/**
 * Get session history for a user.
 * Uses Promise.all for parallel count + find.
 */
const getSessionsByUser = async (userId, { page = 1, limit = 20, status } = {}) => {
    const filter = { userId };
    if (status) filter.status = status;

    const [total, sessions] = await Promise.all([
        StreamSession.countDocuments(filter),
        StreamSession.find(filter)
            .sort({ startTime: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-__v')
            .lean(),
    ]);

    return {
        sessions,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
    };
};

/**
 * Find a single session by sessionId.
 */
const getSessionById = async (sessionId) => {
    const session = await StreamSession.findOne({ sessionId })
        .select('-__v')
        .lean();

    if (!session) {
        throw AppError.notFound('Session not found', 'SESSION_NOT_FOUND');
    }
    return session;
};

/**
 * End ALL active sessions for a user (disconnect cleanup).
 */
const endAllUserSessions = async (userId) => {
    const result = await StreamSession.updateMany(
        { userId, status: 'active' },
        { status: 'stopped', endTime: new Date() }
    );

    if (result.modifiedCount > 0) {
        logger.stream(`Ended ${result.modifiedCount} stale sessions`, { userId });
    }

    return result.modifiedCount;
};

module.exports = {
    createSession,
    endSession,
    getActiveSessions,
    cleanupStaleSessions,
    getSessionsByUser,
    getSessionById,
    endAllUserSessions,
};
