/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   SOCKET CONFIGURATION                       ║
 * ║  Socket.io server factory with JWT auth & handler wiring     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const signalingHandler = require('../sockets/signalingHandler');
const eventHandler = require('../sockets/eventHandler');

let io = null;

// ─── Connection rate limiting (per IP) ──────────────────────────
const connectionAttempts = new Map(); // ip → { count, resetAt }
const MAX_CONN_PER_MIN = 20;

const isConnectionAllowed = (ip) => {
    const now = Date.now();
    const record = connectionAttempts.get(ip);

    if (!record || now > record.resetAt) {
        connectionAttempts.set(ip, { count: 1, resetAt: now + 60000 });
        return true;
    }

    record.count += 1;
    return record.count <= MAX_CONN_PER_MIN;
};

// Periodically clean up stale entries (every 5 min)
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of connectionAttempts) {
        if (now > record.resetAt) connectionAttempts.delete(ip);
    }
}, 5 * 60 * 1000).unref(); // .unref() so it doesn't block shutdown

/**
 * Create the Socket.io server.
 */
const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 120000,               // 120s — generous for flaky mobile networks
        pingInterval: 30000,               // 30s heartbeat
        maxHttpBufferSize: 1e6,            // 1 MB payload limit
        transports: ['websocket', 'polling'],
        perMessageDeflate: false,          // disable WS compression (CPU cost > benefit for small payloads)
        // Session recovery: Socket.io v4.6+ reconnects get their rooms & missed events back
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // recover sessions within 2 min
            skipMiddlewares: false,                   // still require JWT auth on recovery
        },
    });

    // ── JWT Authentication Middleware ─────────────────────────
    io.use((socket, next) => {
        try {
            // Connection rate limiting
            const ip = socket.handshake.address;
            if (!isConnectionAllowed(ip)) {
                logger.warn(`Socket rate limit hit for IP: ${ip}`);
                return next(new Error('Too many connections. Please try again later.'));
            }

            const token =
                socket.handshake.auth?.token ||
                socket.handshake.query?.token;

            if (!token) {
                return next(new Error('Authentication error: token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            logger.error(`Socket auth failed: ${err.message}`);
            next(new Error('Authentication error: invalid token'));
        }
    });

    // ── Connection handler ────────────────────────────────────
    io.on('connection', (socket) => {
        const { userId, email, role } = socket.user;

        logger.socket(`Connected: ${email} (${role})`, { userId, socketId: socket.id });

        // Join rooms
        socket.join(`user:${userId}`);

        if (role === 'admin') {
            socket.join('admins');
            logger.socket(`Admin joined "admins" room`, { userId });
        }

        // Wire up handlers (they manage their own listener cleanup)
        eventHandler(io, socket);
        signalingHandler(io, socket);

        // Socket-level error handler
        socket.on('error', (err) => {
            logger.error(`Socket error for ${email}: ${err.message}`, { userId });
        });
    });

    logger.info('Socket.io server initialized');
    return io;
};

/**
 * Retrieve the live Socket.io instance.
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized. Call initializeSocket first.');
    }
    return io;
};

module.exports = { initializeSocket, getIO };
