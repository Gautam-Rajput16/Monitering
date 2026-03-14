/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    DEVICE SERVICE                            ║
 * ║  Business logic for mobile device registration & management  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const Device = require('../models/Device');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Register a new device or update if deviceId already exists.
 */
const registerDevice = async (data) => {
    const { deviceId, userId, deviceName, osType } = data;

    const device = await Device.findOneAndUpdate(
        { deviceId },
        { userId, deviceName, osType, lastActive: new Date() },
        { new: true, upsert: true, runValidators: true }
    ).lean();

    logger.info('Device registered', { deviceId, userId });
    return device;
};

/**
 * Get all devices belonging to a user.
 */
const getDevicesByUser = async (userId) => {
    return Device.find({ userId })
        .sort({ lastActive: -1 })
        .select('-__v')
        .lean();
};

/**
 * Fetch a single device by its deviceId.
 */
const getDeviceById = async (deviceId) => {
    const device = await Device.findOne({ deviceId })
        .select('-__v')
        .lean();

    if (!device) {
        throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
    }
    return device;
};

/**
 * Partially update device fields.
 */
const updateDevice = async (deviceId, updates) => {
    const allowed = ['deviceName', 'osType'];
    const sanitized = { lastActive: new Date() };
    for (const key of allowed) {
        if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    const device = await Device.findOneAndUpdate({ deviceId }, sanitized, {
        new: true,
        runValidators: true,
        select: '-__v',
    }).lean();

    if (!device) {
        throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
    }
    return device;
};

/**
 * Delete a device record.
 */
const deleteDevice = async (deviceId) => {
    const device = await Device.findOneAndDelete({ deviceId }).lean();
    if (!device) {
        throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
    }
    logger.info('Device deleted', { deviceId, userId: device.userId });
    return device;
};

module.exports = {
    registerDevice,
    getDevicesByUser,
    getDeviceById,
    updateDevice,
    deleteDevice,
};
