/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    INPUT VALIDATORS                          ║
 * ║  Reusable validation helpers for request payloads            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Each validator returns { valid: boolean, errors: string[] }
 * Controllers call these before touching the database.
 */

/**
 * Validate user registration payload.
 * Required: email, password (min 6 chars)
 */
const validateRegistration = ({ email, password }) => {
    const errors = [];

    if (!email || typeof email !== 'string') {
        errors.push('Email is required');
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push('Invalid email format');
    }

    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Validate login payload.
 * Required: email, password
 */
const validateLogin = ({ email, password }) => {
    const errors = [];

    if (!email || typeof email !== 'string') {
        errors.push('Email is required');
    }

    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Validate location update payload.
 * Required: latitude (-90..90), longitude (-180..180)
 * Optional: accuracy (≥ 0)
 */
const validateLocation = ({ latitude, longitude, accuracy }) => {
    const errors = [];

    if (latitude === undefined || latitude === null) {
        errors.push('Latitude is required');
    } else if (typeof latitude !== 'number' || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
        errors.push('Latitude must be a number between -90 and 90');
    }

    if (longitude === undefined || longitude === null) {
        errors.push('Longitude is required');
    } else if (typeof longitude !== 'number' || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
        errors.push('Longitude must be a number between -180 and 180');
    }

    if (accuracy !== undefined && (typeof accuracy !== 'number' || accuracy < 0)) {
        errors.push('Accuracy must be a non-negative number');
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Validate stream session payload.
 * Required: streamType (camera | screen | audio)
 */
const validateStreamSession = ({ streamType }) => {
    const errors = [];
    const validTypes = ['camera', 'screen', 'audio'];

    if (!streamType || typeof streamType !== 'string') {
        errors.push('Stream type is required');
    } else if (!validTypes.includes(streamType)) {
        errors.push(`Stream type must be one of: ${validTypes.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Validate device registration payload.
 * Required: deviceId
 * Optional: deviceName, osType
 */
const validateDevice = ({ deviceId, osType }) => {
    const errors = [];

    if (!deviceId || typeof deviceId !== 'string') {
        errors.push('Device ID is required');
    }

    if (osType && !['android', 'ios', 'other'].includes(osType)) {
        errors.push('OS type must be android, ios, or other');
    }

    return { valid: errors.length === 0, errors };
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateLocation,
    validateStreamSession,
    validateDevice,
};
