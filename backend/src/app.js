/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                     EXPRESS APP                              ║
 * ║  Assembles middleware, routes, security, and error handling   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Middleware order (optimized):
 *  1. Request ID generation
 *  2. Security (helmet, hpp, cors)
 *  3. Rate limiting
 *  4. Body parsing + sanitization
 *  5. Compression
 *  6. HTTP logging
 *  7. Routes
 *  8. Error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// ─── Route modules ──────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const locationRoutes = require('./routes/locationRoutes');
const streamRoutes = require('./routes/streamRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

// ─── Middleware ──────────────────────────────────────────────────
const { errorMiddleware, notFound } = require('./middlewares/errorMiddleware');
const requestId = require('./middlewares/requestId');
const logger = require('./utils/logger');

// ─── Create Express app ─────────────────────────────────────────
const app = express();

// ═══════════════════════════════════════════════════════════════
//  1. REQUEST ID (must be first — everything else logs it)
// ═══════════════════════════════════════════════════════════════
app.use(requestId);

// ═══════════════════════════════════════════════════════════════
//  2. SECURITY
// ═══════════════════════════════════════════════════════════════

// Helmet: security headers
app.use(helmet());

// HPP: prevent HTTP parameter pollution (?sort=asc&sort=desc)
app.use(hpp());

// CORS: cross-origin from dashboard & mobile app
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        credentials: true,
    })
);

// ═══════════════════════════════════════════════════════════════
//  3. RATE LIMITING
// ═══════════════════════════════════════════════════════════════

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again after 15 minutes.',
        errorCode: 'RATE_LIMITED',
    },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        errorCode: 'RATE_LIMITED',
    },
});
app.use('/api/auth', authLimiter);

// ═══════════════════════════════════════════════════════════════
//  4. BODY PARSING + SANITIZATION
// ═══════════════════════════════════════════════════════════════

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL injection protection — strips `$` and `.` from req.body/params/query
app.use(mongoSanitize());

// ═══════════════════════════════════════════════════════════════
//  5. COMPRESSION (gzip responses > 1 KB)
// ═══════════════════════════════════════════════════════════════

app.use(compression({
    threshold: 1024,                    // only compress > 1 KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
}));

// ═══════════════════════════════════════════════════════════════
//  6. HTTP LOGGING
// ═══════════════════════════════════════════════════════════════

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (msg) => logger.http(msg.trim()),
    },
}));

// ═══════════════════════════════════════════════════════════════
//  7. ROOT & HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SPY API is live',
        documentation: 'https://github.com/Gautam-Rajput16/Monitering',
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SPY Backend is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        requestId: req.id,
    });
});

// ═══════════════════════════════════════════════════════════════
//  8. API ROUTES
// ═══════════════════════════════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/devices', deviceRoutes);

// ═══════════════════════════════════════════════════════════════
//  9. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;
