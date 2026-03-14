/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  SIGNALING HANDLER                           ║
 * ║  WebRTC signaling relay between mobile devices & admin       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Optimizations applied:
 *  • O(1) online check via isUserOnline() instead of O(n) array scan
 *  • Session-scoped signaling rooms (signal:<sessionId>)
 *  • ICE candidate batching — 50ms window collapsing rapid candidates
 *  • Payload type validation on all signaling events
 *  • Named listeners for cleanup on disconnect
 *  • Session ownership on stream-stop
 */

const streamService = require('../services/streamService');
const logger = require('../utils/logger');

// Import O(1) presence check (lazy — eventHandler exports it)
let isUserOnline;

const signalingHandler = (io, socket) => {
    const { userId, role } = socket.user;

    // Lazy-load to avoid circular dependency
    if (!isUserOnline) {
        isUserOnline = require('./eventHandler').isUserOnline;
    }
    const { getConnectedUsers } = require('./eventHandler');

    const getTargetInfo = (targetId) => {
        if (targetId === 'admin') {
            const adminsOnline = getConnectedUsers().some(u => u.role === 'admin');
            return { isOnline: adminsOnline, room: 'admins' };
        }
        return { isOnline: isUserOnline(targetId), room: `user:${targetId}` };
    };

    // ─── Per-socket ICE candidate batch buffer ──────────────────
    // Collects ICE candidates per target user for 50ms, then sends
    // them all in one emit instead of many individual emits.
    const iceBatchBuffers = new Map(); // targetUserId → { candidates: [], timer, sessionId }

    const flushICEBatch = (targetUserId) => {
        const batch = iceBatchBuffers.get(targetUserId);
        if (!batch || batch.candidates.length === 0) return;

        const { room } = getTargetInfo(targetUserId);

        io.to(room).emit('ice-candidates-batch', {
            fromUserId: userId,
            candidates: batch.candidates,
            sessionId: batch.sessionId,
        });

        // Also emit individual events for backward compatibility
        for (const candidate of batch.candidates) {
            io.to(room).emit('ice-candidate', {
                fromUserId: userId,
                candidate,
                sessionId: batch.sessionId,
            });
        }

        iceBatchBuffers.delete(targetUserId);
    };

    // ═══════════════════════════════════════════════════════════
    //  STREAM LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    const onStreamStart = async (data, callback) => {
        try {
            const { streamType } = data || {};

            if (!streamType || !['camera', 'screen', 'audio'].includes(streamType)) {
                return callback?.({ success: false, message: 'Invalid stream type' });
            }

            const session = await streamService.createSession({ userId, streamType });

            // Join a signaling room scoped to this session
            socket.join(`signal:${session.sessionId}`);

            logger.stream(`Stream started: ${streamType}`, {
                userId,
                sessionId: session.sessionId,
            });

            io.to('admins').emit('stream-started', {
                userId,
                sessionId: session.sessionId,
                streamType,
                startTime: session.startTime,
            });

            callback?.({ success: true, sessionId: session.sessionId });
        } catch (err) {
            logger.error(`stream-start error: ${err.message}`, { userId });
            callback?.({ success: false, message: err.message });
        }
    };

    const onStreamStop = async (data, callback) => {
        try {
            const { sessionId } = data || {};

            if (!sessionId || typeof sessionId !== 'string') {
                return callback?.({ success: false, message: 'Valid session ID required' });
            }

            // Ownership check
            const existing = await streamService.getSessionById(sessionId);
            if (existing.userId !== userId && role !== 'admin') {
                return callback?.({ success: false, message: 'Access denied. You do not own this session.' });
            }

            const session = await streamService.endSession(sessionId);

            // Leave the signaling room
            socket.leave(`signal:${sessionId}`);

            logger.stream(`Stream stopped: ${session.streamType}`, {
                userId,
                sessionId,
            });

            io.to('admins').emit('stream-stopped', {
                userId,
                sessionId,
                streamType: session.streamType,
                endTime: session.endTime,
            });

            callback?.({ success: true });
        } catch (err) {
            logger.error(`stream-stop error: ${err.message}`, { userId });
            callback?.({ success: false, message: err.message });
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  WEBRTC SIGNALING RELAY
    // ═══════════════════════════════════════════════════════════

    const onWebRTCOffer = (data) => {
        const { targetUserId, offer, streamType, sessionId } = data || {};

        if (!targetUserId || typeof targetUserId !== 'string') {
            return socket.emit('signaling-error', { message: 'targetUserId is required and must be a string' });
        }
        if (!offer || typeof offer !== 'object') {
            return socket.emit('signaling-error', { message: 'offer is required and must be an object' });
        }

        // O(1) online check — replaces the O(n) array scan
        const { isOnline, room } = getTargetInfo(targetUserId);

        if (!isOnline) {
            return socket.emit('signaling-error', { message: 'Target user is not online', errorCode: 'TARGET_OFFLINE' });
        }

        logger.stream(`Offer: ${userId} → ${targetUserId}`, { streamType, sessionId });

        io.to(room).emit('webrtc-offer', {
            fromUserId: userId,
            offer,
            streamType,
            sessionId,
        });
    };

    const onWebRTCAnswer = (data) => {
        const { targetUserId, answer, sessionId } = data || {};

        if (!targetUserId || typeof targetUserId !== 'string') {
            return socket.emit('signaling-error', { message: 'targetUserId is required' });
        }
        if (!answer || typeof answer !== 'object') {
            return socket.emit('signaling-error', { message: 'answer is required and must be an object' });
        }

        const { isOnline, room } = getTargetInfo(targetUserId);

        if (!isOnline) {
            return socket.emit('signaling-error', { message: 'Target user is not online', errorCode: 'TARGET_OFFLINE' });
        }

        logger.stream(`Answer: ${userId} → ${targetUserId}`, { sessionId });

        io.to(room).emit('webrtc-answer', {
            fromUserId: userId,
            answer,
            sessionId,
        });
    };

    const onICECandidate = (data) => {
        const { targetUserId, candidate, sessionId } = data || {};

        if (!targetUserId || typeof targetUserId !== 'string') {
            return socket.emit('signaling-error', { message: 'targetUserId is required' });
        }
        if (!candidate || typeof candidate !== 'object') {
            return socket.emit('signaling-error', { message: 'candidate is required and must be an object' });
        }

        // ─── ICE candidate batching ─────────────────────────────
        // Buffer candidates for 50ms before flushing to reduce emit count
        let batch = iceBatchBuffers.get(targetUserId);

        if (!batch) {
            batch = { candidates: [], timer: null, sessionId };
            iceBatchBuffers.set(targetUserId, batch);
        }

        batch.candidates.push(candidate);
        batch.sessionId = sessionId; // update to latest sessionId

        // Reset the 50ms flush timer
        if (batch.timer) clearTimeout(batch.timer);
        batch.timer = setTimeout(() => flushICEBatch(targetUserId), 50);
    };

    // ── Listener cleanup on disconnect ───────────────────────
    const onDisconnect = () => {
        // Flush any pending ICE batches
        for (const [targetUserId] of iceBatchBuffers) {
            flushICEBatch(targetUserId);
        }
        iceBatchBuffers.clear();

        socket.removeAllListeners('stream-start');
        socket.removeAllListeners('stream-stop');
        socket.removeAllListeners('webrtc-offer');
        socket.removeAllListeners('webrtc-answer');
        socket.removeAllListeners('ice-candidate');
    };

    // ── Register event listeners ─────────────────────────────
    socket.on('stream-start', onStreamStart);
    socket.on('stream-stop', onStreamStop);
    socket.on('webrtc-offer', onWebRTCOffer);
    socket.on('webrtc-answer', onWebRTCAnswer);
    socket.on('ice-candidate', onICECandidate);
    socket.on('disconnect', onDisconnect);
};

module.exports = signalingHandler;
