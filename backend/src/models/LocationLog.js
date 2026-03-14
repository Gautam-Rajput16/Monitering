/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   LOCATION LOG MODEL                         ║
 * ║  Stores GPS location snapshots sent by mobile devices        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fields
 * ──────
 *  userId    – who sent the location
 *  latitude  – GPS latitude  (-90 to 90)
 *  longitude – GPS longitude (-180 to 180)
 *  accuracy  – reported accuracy in metres
 *  timestamp – when the reading was taken on the device
 *
 * Indexes
 * ───────
 *  Compound (userId + timestamp DESC) for efficient history queries
 *  TTL index is NOT set so logs are retained indefinitely –
 *  add one later if you need automatic log rotation.
 */

const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, 'User ID is required'],
            index: true,
        },
        latitude: {
            type: Number,
            required: [true, 'Latitude is required'],
            min: [-90, 'Latitude must be ≥ -90'],
            max: [90, 'Latitude must be ≤ 90'],
        },
        longitude: {
            type: Number,
            required: [true, 'Longitude is required'],
            min: [-180, 'Longitude must be ≥ -180'],
            max: [180, 'Longitude must be ≤ 180'],
        },
        accuracy: {
            type: Number,
            default: 0,
            min: [0, 'Accuracy cannot be negative'],
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true, // adds createdAt / updatedAt for auditing
    }
);

// ─── Compound index: fetch a user's location history, newest first ──
locationLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('LocationLog', locationLogSchema);
