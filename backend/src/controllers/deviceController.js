/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  DEVICE CONTROLLER                           ║
 * ║  REST endpoints for mobile device registration & management  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const deviceService = require('../services/deviceService');
const { validateDevice } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * POST /api/devices/register
 * Body: { deviceId, deviceName?, osType? }
 * Protected – userId taken from JWT
 */
const registerDevice = async (req, res, next) => {
    try {
        const { valid, errors } = validateDevice(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const device = await deviceService.registerDevice({
            ...req.body,
            userId: req.user.userId,
        });

        res.status(201).json({
            success: true,
            message: 'Device registered successfully',
            data: { device },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/devices
 * Protected – returns the authenticated user's devices (or all for admin)
 */
const getDevices = async (req, res, next) => {
    try {
        const userId = req.user.role === 'admin' && req.query.userId
            ? req.query.userId
            : req.user.userId;

        const devices = await deviceService.getDevicesByUser(userId);

        res.status(200).json({
            success: true,
            data: { devices, count: devices.length },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/devices/:deviceId
 * Protected – owner or admin
 */
const getDeviceById = async (req, res, next) => {
    try {
        const device = await deviceService.getDeviceById(req.params.deviceId);

        // Ownership check
        if (req.user.role !== 'admin' && device.userId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied.',
            });
        }

        res.status(200).json({
            success: true,
            data: { device },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/devices/:deviceId
 * Body: { deviceName?, osType? }
 * Protected – owner or admin
 */
const updateDevice = async (req, res, next) => {
    try {
        // Verify ownership first
        const existing = await deviceService.getDeviceById(req.params.deviceId);
        if (req.user.role !== 'admin' && existing.userId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied.',
            });
        }

        const device = await deviceService.updateDevice(req.params.deviceId, req.body);

        res.status(200).json({
            success: true,
            message: 'Device updated successfully',
            data: { device },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/devices/:deviceId
 * Protected – admin only
 */
const deleteDevice = async (req, res, next) => {
    try {
        await deviceService.deleteDevice(req.params.deviceId);

        res.status(200).json({
            success: true,
            message: 'Device deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { registerDevice, getDevices, getDeviceById, updateDevice, deleteDevice };
