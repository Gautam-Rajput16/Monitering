/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    WINSTON LOGGER                            ║
 * ║  Structured logging with file + console transports           ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Production  → JSON format, file transports (error.log + combined.log)
 * Development → Colorized, human-readable console output
 *
 * Custom levels: error, warn, info, http, debug, socket, stream
 */

const winston = require('winston');
const path = require('path');

// ─── Custom levels (extends default syslog-style) ───────────────
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        socket: 4,
        stream: 5,
        debug: 6,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'cyan',
        socket: 'magenta',
        stream: 'blue',
        debug: 'gray',
    },
};

winston.addColors(customLevels.colors);

// ─── Format helpers ─────────────────────────────────────────────
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: false }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 && meta.stack === undefined
            ? ` ${JSON.stringify(meta)}`
            : '';
        const stackStr = meta.stack ? `\n${meta.stack}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}${stackStr}`;
    })
);

// ─── Determine log level from environment ───────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// ─── Log directory ──────────────────────────────────────────────
const logDir = path.join(process.cwd(), 'logs');

// ─── Transports ─────────────────────────────────────────────────
const transports = [
    new winston.transports.Console({
        format: isProduction ? jsonFormat : consoleFormat,
    }),
];

// File transports only in production (avoid polluting dev)
if (isProduction) {
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 5,
            format: jsonFormat,
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
            format: jsonFormat,
        })
    );
}

// ─── Create logger instance ─────────────────────────────────────
const logger = winston.createLogger({
    levels: customLevels.levels,
    level: logLevel,
    transports,
    // Prevent unhandled exceptions from crashing without a log
    exceptionHandlers: [
        new winston.transports.Console({ format: consoleFormat }),
    ],
    rejectionHandlers: [
        new winston.transports.Console({ format: consoleFormat }),
    ],
});

module.exports = logger;
