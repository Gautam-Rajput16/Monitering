/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   LOCATION SERVICE                           ║
 * ║  Business logic for GPS location storage & retrieval         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const LocationLog = require('../models/LocationLog');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const locationBuffer = require('../utils/locationBuffer');

/**
 * Save a location snapshot for a user.
 *
 * Performance: Instead of writing directly to MongoDB on every call,
 * the data is pushed into an in-memory buffer that flushes to the
 * database in batches every 5 seconds via `insertMany`.
 * This reduces MongoDB IOPS dramatically under high-frequency updates.
 */
const saveLocation = async (data) => {
    const { userId, latitude, longitude, accuracy, timestamp } = data;

    // Edge case: reject NaN coordinates
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw AppError.badRequest('Invalid coordinates: NaN detected', 'INVALID_COORDINATES');
    }

    const locationData = {
        userId,
        latitude,
        longitude,
        accuracy: accuracy || 0,
        timestamp: timestamp || new Date(),
    };

    // Buffer the write — actual DB insert happens in the next flush cycle
    locationBuffer.add(locationData);

    logger.debug('Location buffered', { userId, lat: latitude, lng: longitude });

    return locationData;
};

/**
 * Get the most recent location for a user.
 */
const getLatestLocation = async (userId) => {
    const location = await LocationLog.findOne({ userId })
        .sort({ timestamp: -1 })
        .select('-__v')
        .lean();

    if (!location) {
        throw AppError.notFound('No location data found for this user', 'LOCATION_NOT_FOUND');
    }

    return location;
};

/**
 * Get paginated location history.
 * Uses Promise.all for parallel count + find.
 */
const getLocationHistory = async (userId, { page = 1, limit = 50, startDate, endDate } = {}) => {
    const filter = { userId };

    if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [total, locations] = await Promise.all([
        LocationLog.countDocuments(filter),
        LocationLog.find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-__v')
            .lean(),
    ]);

    return {
        locations,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
    };
};

module.exports = {
    saveLocation,
    getLatestLocation,
    getLocationHistory,
};
