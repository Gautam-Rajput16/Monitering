/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   LOCATION ROUTES                            ║
 * ║  POST /api/location/update              (protected)          ║
 * ║  GET  /api/location/latest/:userId      (protected)          ║
 * ║  GET  /api/location/history/:userId     (protected)          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middlewares/authMiddleware');

// All location routes require authentication
router.use(authenticate);

router.post('/update', locationController.updateLocation);
router.get('/latest/:userId', locationController.getLatestLocation);
router.get('/history/:userId', locationController.getLocationHistory);

module.exports = router;
