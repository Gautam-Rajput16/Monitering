/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      USER SERVICE                            ║
 * ║  Business logic for user registration, login, and CRUD       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ─── Helper: sign a JWT for a given user ────────────────────────
const signToken = (user) => {
    return jwt.sign(
        { userId: user.userId, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Register a new user.
 */
const registerUser = async (data) => {
    const { email, password, deviceId } = data;

    const existingUser = await User.findOne({ email: email.toLowerCase() })
        .select('_id')
        .lean();

    if (existingUser) {
        throw AppError.conflict('Email already registered', 'EMAIL_EXISTS');
    }

    const user = await User.create({
        email,
        password,
        role: 'user',
        deviceId: deviceId || null,
    });

    const token = signToken(user);

    const userObj = user.toObject();
    delete userObj.password;

    logger.info('User registered', { userId: user.userId, email: user.email });

    return { user: userObj, token };
};

/**
 * Authenticate user and return a JWT.
 */
const loginUser = async (email, password) => {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
        throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    user.status = 'online';
    await user.save();

    const token = signToken(user);

    const userObj = user.toObject();
    delete userObj.password;

    logger.info('User logged in', { userId: user.userId });

    return { user: userObj, token };
};

/**
 * Find a user by userId. Uses .lean() for read-only performance.
 */
const getUserById = async (userId) => {
    const user = await User.findOne({ userId })
        .select('-__v')
        .lean();

    if (!user) {
        throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }
    return user;
};

/**
 * Get all users with pagination.
 * Uses Promise.all to run count + find in parallel.
 */
const getAllUsers = async ({ page = 1, limit = 20, status } = {}) => {
    const filter = {};
    if (status) filter.status = status;

    const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);

    return {
        users,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
    };
};

/**
 * Update a user's online/offline status.
 */
const updateUserStatus = async (userId, status) => {
    const user = await User.findOneAndUpdate(
        { userId },
        { status },
        { new: true, select: '-password -__v' }
    ).lean();

    if (!user) {
        throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }
    logger.info(`User status → ${status}`, { userId });
    return user;
};

/**
 * Partially update user fields.
 */
const updateUser = async (userId, updates) => {
    const allowed = ['deviceId', 'status', 'role'];
    const sanitized = {};
    for (const key of allowed) {
        if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    const user = await User.findOneAndUpdate({ userId }, sanitized, {
        new: true,
        runValidators: true,
        select: '-password -__v',
    }).lean();

    if (!user) {
        throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }
    return user;
};

/**
 * Delete a user and their associated devices.
 */
const deleteUser = async (userId) => {
    const user = await User.findOneAndDelete({ userId }).lean();
    if (!user) {
        throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    await Device.deleteMany({ userId });

    logger.info('User deleted', { userId });
    return user;
};

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    getAllUsers,
    updateUserStatus,
    updateUser,
    deleteUser,
};
