/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    DEVICE ROUTES                             ║
 * ║  POST   /api/devices/register           (protected)          ║
 * ║  GET    /api/devices                    (protected)          ║
 * ║  GET    /api/devices/:deviceId          (protected)          ║
 * ║  PUT    /api/devices/:deviceId          (protected)          ║
 * ║  DELETE /api/devices/:deviceId          (admin)              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');

// All device routes require authentication
router.use(authenticate);

router.post('/register', deviceController.registerDevice);
router.get('/', deviceController.getDevices);
router.get('/:deviceId', deviceController.getDeviceById);
router.put('/:deviceId', deviceController.updateDevice);
router.delete('/:deviceId', authorizeAdmin, deviceController.deleteDevice);

module.exports = router;
