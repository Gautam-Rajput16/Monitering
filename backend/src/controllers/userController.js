/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   USER CONTROLLER                            ║
 * ║  Admin-level user management (CRUD)                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const userService = require('../services/userService');
const eventHandler = require('../sockets/eventHandler');
const logger = require('../utils/logger');

/**
 * GET /api/users
 * Query: ?page=1&limit=20&status=online
 * Admin only
 */
const getAllUsers = async (req, res, next) => {
    try {
        const { status } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await userService.getAllUsers({ page, limit, status });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/:userId
 * Admin only
 */
const getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.userId);

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/users/:userId
 * Body: { deviceId?, status?, role? }
 * Admin only
 */
const updateUser = async (req, res, next) => {
    try {
        const user = await userService.updateUser(req.params.userId, req.body);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/users/:userId
 * Admin only – cascading delete (user + devices)
 */
const deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.params.userId);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/users/online
 * Admin only — returns in-memory connected users list
 */
const getOnlineUsers = async (req, res, next) => {
    try {
        const users = eventHandler.getConnectedUsers();

        res.status(200).json({
            success: true,
            data: { users, count: users.length },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, getOnlineUsers };
