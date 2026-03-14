/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                 LOCATION CONTROLLER                          ║
 * ║  REST endpoints for GPS location updates and history         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const locationService = require('../services/locationService');
const { validateLocation } = require('../utils/validators');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * POST /api/location/update
 * Body: { latitude, longitude, accuracy? }
 * Protected – userId taken from JWT (req.user)
 */
const updateLocation = async (req, res, next) => {
    try {
        const { valid, errors } = validateLocation(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const location = await locationService.saveLocation({
            userId: req.user.userId,
            ...req.body,
        });

        // 📡 Broadcast to admin dashboards in real-time
        try {
            const io = getIO();
            io.to('admins').emit('location-update', {
                userId: req.user.userId,
                email: req.user.email,
                latitude: req.body.latitude,
                longitude: req.body.longitude,
                accuracy: req.body.accuracy,
                timestamp: location.timestamp,
            });
        } catch (_) {
            // Socket.io may not be initialized during isolated testing
        }

        res.status(201).json({
            success: true,
            message: 'Location updated',
            data: { location },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/location/latest/:userId
 * Protected – admin or the user themselves
 */
const getLatestLocation = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Allow the user to access their own data, or admins to access any
        if (req.user.role !== 'admin' && req.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own location.',
            });
        }

        const location = await locationService.getLatestLocation(userId);

        res.status(200).json({
            success: true,
            data: { location },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/location/history/:userId
 * Query: ?page=1&limit=50&startDate=...&endDate=...
 * Protected – admin or the user themselves
 */
const getLocationHistory = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (req.user.role !== 'admin' && req.user.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own location history.',
            });
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const { startDate, endDate } = req.query;
        const result = await locationService.getLocationHistory(userId, {
            page,
            limit,
            startDate,
            endDate,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { updateLocation, getLatestLocation, getLocationHistory };
