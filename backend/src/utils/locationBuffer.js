/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  LOCATION WRITE BUFFER                       ║
 * ║  Batches high-frequency GPS writes into periodic insertMany  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Why?
 * ────
 *  Mobile devices can emit location updates every 1-3 seconds.
 *  Writing each one individually via `LocationLog.create()` hammers
 *  MongoDB with thousands of small writes per minute.
 *
 *  This buffer collects updates in-memory and flushes them to the
 *  database in a single `insertMany()` call every FLUSH_INTERVAL_MS.
 *
 *  For the same user, only the LATEST location is kept in the buffer
 *  (de-duplication), so rapid events from one device don't bloat
 *  the write batch.
 *
 * Lifecycle
 * ─────────
 *  1. `add(data)` → called by locationService.saveLocation()
 *  2. `startFlushing()` → starts the periodic timer (call at boot)
 *  3. `flushNow()` → immediate flush (call on graceful shutdown)
 *  4. `stopFlushing()` → clears the timer
 */

const LocationLog = require('../models/LocationLog');
const logger = require('./logger');

// ─── Configuration ──────────────────────────────────────────────
const FLUSH_INTERVAL_MS = 5000; // flush every 5 seconds

// ─── Buffer state ───────────────────────────────────────────────
const buffer = new Map(); // userId → { userId, latitude, longitude, accuracy, timestamp }
let flushTimer = null;

/**
 * Add a location entry to the buffer.
 * Overwrites any previous buffered entry for the same userId
 * (only the latest position matters for the next flush).
 */
const add = (data) => {
    const { userId, latitude, longitude, accuracy, timestamp } = data;

    buffer.set(userId, {
        userId,
        latitude,
        longitude,
        accuracy: accuracy || 0,
        timestamp: timestamp || new Date(),
    });
};

/**
 * Flush all buffered entries to MongoDB via insertMany.
 * Returns the number of documents written.
 */
const flushNow = async () => {
    if (buffer.size === 0) return 0;

    // Snapshot and clear the buffer atomically
    const entries = Array.from(buffer.values());
    buffer.clear();

    try {
        await LocationLog.insertMany(entries, { ordered: false });
        logger.debug(`Location buffer flushed: ${entries.length} entries`);
        return entries.length;
    } catch (err) {
        // On failure, push entries back into the buffer so they aren't lost
        for (const entry of entries) {
            if (!buffer.has(entry.userId)) {
                buffer.set(entry.userId, entry);
            }
        }
        logger.error(`Location buffer flush failed: ${err.message}`);
        return 0;
    }
};

/**
 * Start the periodic flush timer.
 */
const startFlushing = () => {
    if (flushTimer) return; // already running

    flushTimer = setInterval(async () => {
        try {
            await flushNow();
        } catch (err) {
            logger.error(`Location buffer interval error: ${err.message}`);
        }
    }, FLUSH_INTERVAL_MS);

    // Don't block process shutdown
    flushTimer.unref();

    logger.info(`Location buffer started (flush every ${FLUSH_INTERVAL_MS / 1000}s)`);
};

/**
 * Stop the periodic flush timer.
 */
const stopFlushing = () => {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
};

/**
 * Get the current number of buffered entries (for monitoring).
 */
const getBufferSize = () => buffer.size;

module.exports = {
    add,
    flushNow,
    startFlushing,
    stopFlushing,
    getBufferSize,
};
