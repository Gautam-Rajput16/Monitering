/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     DEVICE MODEL                             ║
 * ║  Tracks registered mobile devices linked to user accounts    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fields
 * ──────
 *  deviceId   – unique device identifier (from mobile client)
 *  userId     – owner's userId (foreign key)
 *  deviceName – human-readable name (e.g. "Pixel 8 Pro")
 *  osType     – operating system (android / ios)
 *  lastActive – last heartbeat timestamp
 */

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
    {
        deviceId: {
            type: String,
            required: [true, 'Device ID is required'],
            unique: true,
            index: true,
        },
        userId: {
            type: String,
            required: [true, 'User ID is required'],
            index: true,
        },
        deviceName: {
            type: String,
            default: 'Unknown Device',
            trim: true,
        },
        osType: {
            type: String,
            enum: ['android', 'ios', 'other'],
            default: 'other',
        },
        lastActive: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Compound index for fast lookups by user ────────────────────
deviceSchema.index({ userId: 1, deviceId: 1 });

module.exports = mongoose.model('Device', deviceSchema);
