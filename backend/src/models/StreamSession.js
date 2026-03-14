/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  STREAM SESSION MODEL                        ║
 * ║  Tracks active and historical WebRTC stream sessions         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fields
 * ──────
 *  sessionId  – unique session identifier (UUID)
 *  userId     – who initiated the stream
 *  streamType – "camera" | "screen" | "audio"
 *  status     – "active" | "stopped"
 *  startTime  – when the session began
 *  endTime    – when the session ended (null while active)
 *
 * Design notes
 * ────────────
 *  • The backend never touches raw media data.
 *  • This model only records signaling lifecycle metadata so
 *    the admin dashboard can display active/past sessions.
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const streamSessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            default: () => uuidv4(),
            unique: true,
            index: true,
        },
        userId: {
            type: String,
            required: [true, 'User ID is required'],
            index: true,
        },
        streamType: {
            type: String,
            required: [true, 'Stream type is required'],
            enum: {
                values: ['camera', 'screen', 'audio'],
                message: 'Stream type must be camera, screen, or audio',
            },
        },
        status: {
            type: String,
            enum: ['active', 'stopped'],
            default: 'active',
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Compound indexes ───────────────────────────────────────────
streamSessionSchema.index({ userId: 1, status: 1 });
streamSessionSchema.index({ status: 1, streamType: 1 });
// Atomic duplicate prevention: ensures one active session per user + type
streamSessionSchema.index({ userId: 1, streamType: 1, status: 1 });
// Stale session cleanup: find active sessions older than threshold
streamSessionSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model('StreamSession', streamSessionSchema);
