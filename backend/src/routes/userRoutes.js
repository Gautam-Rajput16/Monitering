/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     USER ROUTES                              ║
 * ║  GET    /api/users              (admin)                      ║
 * ║  GET    /api/users/:userId      (admin)                      ║
 * ║  PUT    /api/users/:userId      (admin)                      ║
 * ║  DELETE /api/users/:userId      (admin)                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

// All user-management routes require admin privileges
router.use(authenticate, authorizeAdmin);

router.get('/', userController.getAllUsers);
router.get('/online', userController.getOnlineUsers);
router.get('/:userId', userController.getUserById);
router.put('/:userId', userController.updateUser);
router.delete('/:userId', userController.deleteUser);

module.exports = router;
