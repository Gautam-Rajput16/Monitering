/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      USER MODEL                              ║
 * ║  Represents an authenticated user (admin or mobile device)   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fields
 * ──────
 *  userId     – unique identifier (auto-generated UUID)
 *  email      – unique login credential
 *  password   – bcrypt-hashed
 *  role       – "admin" | "user"
 *  deviceId   – reference to the user's registered device (nullable)
 *  status     – "online" | "offline"
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            default: () => uuidv4(),
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // excluded from queries by default
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            default: 'user',
        },
        deviceId: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['online', 'offline'],
            default: 'offline',
        },
        lastLocation: {
            latitude: Number,
            longitude: Number,
            accuracy: Number,
            timestamp: Date,
        },
    },
    {
        timestamps: true, // createdAt & updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Pre-save Hook: Hash password before persisting ─────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ─── Instance Method: Compare candidate password with hash ──────
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
