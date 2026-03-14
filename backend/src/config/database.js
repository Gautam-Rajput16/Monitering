/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  DATABASE CONFIGURATION                      ║
 * ║  Mongoose connection with retry logic, pooling & lifecycle   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with automatic retry and connection pooling.
 */
const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        // ── Connection pool tuning ───────────────────
        maxPoolSize: 10,              // max concurrent connections
        minPoolSize: 2,               // keep at least 2 warm connections
        // ── Timeouts ─────────────────────────────────
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,       // close sockets after 45s inactivity
        connectTimeoutMS: 10000,
        // ── Heartbeat ────────────────────────────────
        heartbeatFrequencyMS: 10000,
      });

      logger.info(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries += 1;
      logger.error(`MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`);

      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached. Exiting process.');
        process.exit(1);
      }

      const delay = Math.pow(2, retries) * 1000;
      logger.info(`Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ─── Mongoose Connection Event Listeners ────────────────────────
mongoose.connection.on('connected', () => {
  logger.info('Mongoose default connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose default connection disconnected');
});

// Graceful shutdown — close connection only (server.js orchestrates exit)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('Mongoose connection closed (app termination)');
});

module.exports = connectDB;
