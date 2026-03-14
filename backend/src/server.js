/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      SERVER ENTRY                            ║
 * ║  HTTP server + Socket.io + MongoDB bootstrap                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Boot sequence
 * ─────────────
 *  1. Load environment variables (dotenv)
 *  2. Connect to MongoDB
 *  3. Create HTTP server from the Express app
 *  4. Attach Socket.io (signaling + events)
 *  5. Start listening on the configured port
 *  6. Register graceful shutdown handlers
 */

// ── 1. Environment ──────────────────────────────────────────────
require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initializeSocket } = require('./config/socket');
const logger = require('./utils/logger');
const locationBuffer = require('./utils/locationBuffer');
const streamService = require('./services/streamService');

// ─── Configuration ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Main bootstrap function.
 * Separated so we can `await` the async DB connection before
 * opening the HTTP port.
 */
const startServer = async () => {
    try {
        // ── 2. Database ───────────────────────────────────────────
        await connectDB();

        // ── 3. HTTP server ────────────────────────────────────────
        const server = http.createServer(app);

        // ── 4. Socket.io ──────────────────────────────────────────
        const io = initializeSocket(server);

        // ── 5. Listen ─────────────────────────────────────────────
        server.listen(PORT, () => {
            logger.info('═══════════════════════════════════════════════');
            logger.info(`  SPY Backend Server`);
            logger.info(`  Environment : ${NODE_ENV}`);
            logger.info(`  Port        : ${PORT}`);
            logger.info(`  API Health  : http://localhost:${PORT}/api/health`);
            logger.info('═══════════════════════════════════════════════');
        });

        // ── 5b. Start location write buffer ───────────────────────
        locationBuffer.startFlushing();

        // ── 5c. Stale session cleanup (every 30 min) ─────────────
        const staleCleanupTimer = setInterval(async () => {
            try {
                await streamService.cleanupStaleSessions();
            } catch (err) {
                logger.error(`Stale session cleanup error: ${err.message}`);
            }
        }, 30 * 60 * 1000);
        staleCleanupTimer.unref();

        // ── 6. Graceful shutdown ──────────────────────────────────
        const shutdown = async (signal) => {
            logger.warn(`${signal} received — shutting down gracefully...`);

            // Flush any remaining buffered location data
            try {
                locationBuffer.stopFlushing();
                const flushed = await locationBuffer.flushNow();
                if (flushed > 0) {
                    logger.info(`Flushed ${flushed} buffered locations before shutdown`);
                }
            } catch (err) {
                logger.error(`Location buffer final flush failed: ${err.message}`);
            }

            // Stop stale cleanup
            clearInterval(staleCleanupTimer);

            // Stop accepting new connections
            server.close(() => {
                logger.info('HTTP server closed');
            });

            // Close Socket.io
            io.close(() => {
                logger.info('Socket.io server closed');
            });

            // Mongoose connection is closed via its own SIGINT handler
            // in config/database.js, but we add a safety net here.
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        // ─── Unhandled rejections & exceptions ────────────────────
        process.on('unhandledRejection', (reason) => {
            logger.error(`Unhandled Rejection: ${reason}`);
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err.message}`);
            // Exit with failure after logging
            process.exit(1);
        });
    } catch (error) {
        logger.error(`Server startup failed: ${error.message}`);
        process.exit(1);
    }
};

// ─── Start ──────────────────────────────────────────────────────
startServer();
