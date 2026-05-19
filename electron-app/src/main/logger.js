/**
 * File logger - mirrors console.log/info/warn/error to userData/logs/star-commander.log
 * Keeps the previous session as star-commander.log.1
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logStream = null;
let logFilePath = null;

function init() {
    if (logStream) return logFilePath;

    const logsDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    logFilePath = path.join(logsDir, 'star-commander.log');
    const previous = logFilePath + '.1';

    try {
        if (fs.existsSync(logFilePath)) {
            if (fs.existsSync(previous)) fs.unlinkSync(previous);
            fs.renameSync(logFilePath, previous);
        }
    } catch (e) {
        // Non-fatal: continue with append
    }

    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    const origLog = console.log.bind(console);
    const origInfo = console.info.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    // Belt-and-suspenders redactor: even if some code path accidentally
    // logs a Discord bot token, voice session token, SRTP secret_key,
    // or webhook URL, scrub it before it hits the file.
    const redact = (s) => {
        if (typeof s !== 'string') return s;
        return s
            .replace(/("token"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/("secret_key"\s*:\s*)\[[^\]]+\]/g, '$1[REDACTED]')
            .replace(/("secret_key"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/("emitter"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/("receiver\d"\s*:\s*")[^"]+(")/g, '$1[REDACTED]$2')
            .replace(/(https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/)[\w-]+/g, '$1[REDACTED]')
            // Discord bot tokens: 24+ chars base64url . 6+ . 27+
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
        try { logStream.write(line); } catch { /* ignore */ }
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
