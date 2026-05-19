/**
 * File logger - mirrors console.log/info/warn/error to userData/logs/star-commander.log
 * - On startup, rotates star-commander.log → star-commander.log.1
 * - During the session, rotates again whenever the active log exceeds MAX_LOG_BYTES
 * - Defensively scrubs Discord tokens / SRTP keys / webhook URLs before writing
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_LOG_BYTES = 25 * 1024 * 1024; // 25 MB per log; with .1 rotation that caps disk usage around 50 MB.
const SIZE_CHECK_INTERVAL_BYTES = 64 * 1024; // Re-stat after this many bytes written to avoid stat per line.

let logStream = null;
let logFilePath = null;
let bytesSinceCheck = 0;
let warnedOnce = false;

function rotate() {
    // Close the current stream if there is one (mid-session rotation).
    if (logStream) {
        try { logStream.end(); } catch { /* ignore */ }
    }
    const previous = logFilePath + '.1';
    try {
        if (fs.existsSync(previous)) fs.unlinkSync(previous);
        if (fs.existsSync(logFilePath)) fs.renameSync(logFilePath, previous);
    } catch (e) {
        // Best-effort: if rotation fails we just keep appending to current.
    }
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    bytesSinceCheck = 0;
}

function init() {
    if (logStream) return logFilePath;

    const logsDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    logFilePath = path.join(logsDir, 'star-commander.log');
    rotate(); // initial rotation on startup so each session starts fresh

    const origLog = console.log.bind(console);
    const origInfo = console.info.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    const redact = (s) => {
        if (typeof s !== 'string') return s;
        return s
            .replace(/("token"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/("secret_key"\s*:\s*)\[[^\]]+\]/g, '$1[REDACTED]')
            .replace(/("secret_key"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/("emitter"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/("receiver\d"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/(https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/)[\w-]+/g, '$1[REDACTED]')
            .replace(/\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/g, '[REDACTED_TOKEN]');
    };

    const write = (level, args) => {
        const line = `[${new Date().toISOString()}] [${level}] ` +
            args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch { return String(a); }
                }
                return String(a);
            }).map(redact).join(' ') + '\n';
        try {
            logStream.write(line);
        } catch (e) {
            // Disk full / permission error / etc. — surface to stderr once
            // so the user has a fighting chance of diagnosing it.
            if (!warnedOnce) {
                warnedOnce = true;
                try { process.stderr.write(`[Logger] write failed: ${e.message}\n`); } catch {}
            }
            return;
        }
        bytesSinceCheck += line.length;
        if (bytesSinceCheck >= SIZE_CHECK_INTERVAL_BYTES) {
            bytesSinceCheck = 0;
            try {
                const stat = fs.statSync(logFilePath);
                if (stat.size >= MAX_LOG_BYTES) rotate();
            } catch { /* ignore */ }
        }
    };

    console.log = (...args) => { write('LOG', args); origLog(...args); };
    console.info = (...args) => { write('INFO', args); origInfo(...args); };
    console.warn = (...args) => { write('WARN', args); origWarn(...args); };
    console.error = (...args) => { write('ERROR', args); origError(...args); };

    process.on('uncaughtException', (err) => {
        write('FATAL', ['uncaughtException:', err]);
    });
    process.on('unhandledRejection', (reason) => {
        write('FATAL', ['unhandledRejection:', reason]);
    });

    console.log('[Logger] Started — writing to', logFilePath);
    return logFilePath;
}

function getLogPath() {
    return logFilePath;
}

function getPreviousLogPath() {
    return logFilePath ? logFilePath + '.1' : null;
}

module.exports = { init, getLogPath, getPreviousLogPath };
