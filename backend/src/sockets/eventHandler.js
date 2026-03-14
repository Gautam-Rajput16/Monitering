/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    EVENT HANDLER                             ║
 * ║  Real-time presence tracking & location broadcasting         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Optimizations applied:
 *  • Per-user location throttle (3s min interval)
 *  • Reconnect-aware — skips redundant DB writes on reconnect
 *  • Listener cleanup on disconnect (prevents memory leaks)
 *  • NaN coordinate validation
 *  • O(1) presence lookup export for signaling handler
 */

const userService = require('../services/userService');
const locationService = require('../services/locationService');
const streamService = require('../services/streamService');
const { validateLocation } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * In-memory map of online users.
 * Key: userId → Value: { socketId, email, role, connectedAt }
 */
const connectedUsers = new Map();

/**
 * Per-user location throttle tracker.
 * Key: userId → Value: timestamp (ms) of last accepted location update
 */
const lastLocationTime = new Map();

// Minimum interval between location updates per user (milliseconds)
const LOCATION_THROTTLE_MS = 3000;

/**
 * Get the current list of online users (array format).
 */
const getConnectedUsers = () => {
    return Array.from(connectedUsers.entries()).map(([userId, info]) => ({
        userId,
        ...info,
    }));
};

/**
 * O(1) check whether a specific user is currently online.
 * Used by signalingHandler to avoid O(n) array scans.
 */
const isUserOnline = (userId) => connectedUsers.has(userId);

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
const eventHandler = (io, socket) => {
    const { userId, email, role } = socket.user;

    // ═══════════════════════════════════════════════════════════
    //  USER PRESENCE
    // ═══════════════════════════════════════════════════════════

    const onUserConnected = async (data, callback) => {
        try {
            const existing = connectedUsers.get(userId);

            // Reconnect detected — update socketId but skip redundant DB call
            if (existing) {
                logger.socket(`Reconnect: ${email}`, {
                    userId,
                    oldSocketId: existing.socketId,
                    newSocketId: socket.id,
                });

                connectedUsers.set(userId, {
                    ...existing,
                    socketId: socket.id,
                });
            } else {
                // Fresh connect — update both map and DB
                connectedUsers.set(userId, {
                    socketId: socket.id,
                    email,
                    role,
                    connectedAt: new Date(),
                });

                await userService.updateUserStatus(userId, 'online');
            }

            io.to('admins').emit('user-connected', {
                userId,
                email,
                role,
                connectedAt: connectedUsers.get(userId).connectedAt,
                onlineCount: connectedUsers.size,
            });

            logger.socket(`User ready: ${email}`, { userId, onlineCount: connectedUsers.size });
            callback?.({ success: true });
        } catch (err) {
            logger.error(`user-connected error: ${err.message}`, { userId });
            callback?.({ success: false, message: err.message });
        }
    };

    const onUserDisconnected = async (data, callback) => {
        try {
            await handleDisconnect();
            callback?.({ success: true });
        } catch (err) {
            logger.error(`user-disconnected error: ${err.message}`, { userId });
            callback?.({ success: false, message: err.message });
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  LOCATION UPDATES (with per-user throttle)
    // ═══════════════════════════════════════════════════════════

    const onLocationUpdate = async (data, callback) => {
        try {
            // ── Throttle check: reject if less than LOCATION_THROTTLE_MS since last update
            const now = Date.now();
            const lastTime = lastLocationTime.get(userId) || 0;

            if (now - lastTime < LOCATION_THROTTLE_MS) {
                return callback?.({
                    success: false,
                    message: `Location updates throttled. Min interval: ${LOCATION_THROTTLE_MS / 1000}s`,
                    errorCode: 'THROTTLED',
                });
            }

            // ── Validate coordinates
            const { valid, errors } = validateLocation(data);
            if (!valid) {
                return callback?.({ success: false, message: 'Validation failed', errors });
            }

            if (Number.isNaN(data.latitude) || Number.isNaN(data.longitude)) {
                return callback?.({ success: false, message: 'Invalid coordinates: NaN' });
            }

            // ── Accept the update and record the timestamp
            lastLocationTime.set(userId, now);

            const location = await locationService.saveLocation({
                userId,
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: data.accuracy,
                timestamp: data.timestamp,
            });

            // Broadcast to admins room
            io.to('admins').emit('location-update', {
                userId,
                email,
                latitude: data.latitude,
                longitude: data.longitude,
                accuracy: data.accuracy,
                timestamp: location.timestamp,
            });

            callback?.({ success: true });
        } catch (err) {
            logger.error(`location-update error: ${err.message}`, { userId });
            callback?.({ success: false, message: err.message });
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  DISCONNECT CLEANUP
    // ═══════════════════════════════════════════════════════════

    const handleDisconnect = async () => {
        connectedUsers.delete(userId);
        lastLocationTime.delete(userId);

        // Use try-catch for each async op so one failure doesn't block others
        try {
            await userService.updateUserStatus(userId, 'offline');
        } catch (err) {
            logger.error(`Failed to update user status on disconnect: ${err.message}`, { userId });
        }

        try {
            await streamService.endAllUserSessions(userId);
        } catch (err) {
            logger.error(`Failed to end sessions on disconnect: ${err.message}`, { userId });
        }

        io.to('admins').emit('user-disconnected', {
            userId,
            email,
            role,
            onlineCount: connectedUsers.size,
        });

        logger.socket(`User gone: ${email}`, { userId, onlineCount: connectedUsers.size });
    };

    const onDisconnect = async () => {
        try {
            await handleDisconnect();
        } catch (err) {
            logger.error(`disconnect cleanup error: ${err.message}`, { userId });
        }

        // ── Listener cleanup to prevent memory leaks ─────────
        socket.removeAllListeners('user-connected');
        socket.removeAllListeners('user-disconnected');
        socket.removeAllListeners('location-update');
    };

    // ── Register event listeners ─────────────────────────────
    socket.on('user-connected', onUserConnected);
    socket.on('user-disconnected', onUserDisconnected);
    socket.on('location-update', onLocationUpdate);
    socket.on('disconnect', onDisconnect);
};

// ─── Exported helpers ───────────────────────────────────────────
eventHandler.getConnectedUsers = getConnectedUsers;
eventHandler.isUserOnline = isUserOnline;

module.exports = eventHandler;
