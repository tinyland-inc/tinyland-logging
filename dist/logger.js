import { getLoggingConfig } from './config.js';
let logBuffer = [];
let flushTimer = null;
function getLokiUrl() {
    return getLoggingConfig().lokiUrl ?? 'http://localhost:3100';
}
function isLokiEnabled() {
    const config = getLoggingConfig();
    if (config.lokiEnabled !== undefined) {
        return config.lokiEnabled;
    }
    return config.lokiUrl !== undefined && config.lokiUrl !== '';
}
function getNodeEnv() {
    return getLoggingConfig().nodeEnv ?? 'development';
}
export async function flushLogs() {
    if (logBuffer.length === 0)
        return;
    const logsToSend = [...logBuffer];
    logBuffer = [];
    try {
        const streams = [
            {
                stream: {
                    job: 'sveltekit',
                    container: 'stonewall-sveltekit',
                    environment: getNodeEnv(),
                    compose_service: 'sveltekit',
                },
                values: logsToSend.map((log) => [
                    (new Date(log.timestamp).getTime() * 1000000).toString(),
                    JSON.stringify({
                        level: log.level,
                        msg: log.message,
                        ...log.labels,
                    }),
                ]),
            },
        ];
        await fetch(`${getLokiUrl()}/loki/api/v1/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ streams }),
        });
    }
    catch (err) {
        console.error('Failed to send logs to Loki:', err);
    }
}
function scheduleFlush() {
    if (flushTimer)
        return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushLogs();
    }, 1000);
}
export function log(level, message, labels = {}) {
    const entry = {
        level: level.toUpperCase(),
        message,
        timestamp: new Date().toISOString(),
        labels,
    };
    console.log(`[${entry.timestamp}] [${entry.level}] ${entry.message}`, labels);
    if (isLokiEnabled()) {
        logBuffer.push(entry);
        scheduleFlush();
    }
}
export const lokiLogger = {
    debug: (message, labels) => log('DEBUG', message, labels),
    info: (message, labels) => log('INFO', message, labels),
    warn: (message, labels) => log('WARN', message, labels),
    error: (message, labels) => log('ERROR', message, labels),
};
export function _getBufferLength() {
    return logBuffer.length;
}
export function _resetBuffer() {
    logBuffer = [];
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
}
export function _getFlushTimer() {
    return flushTimer;
}
if (typeof process !== 'undefined') {
    process.on('exit', () => {
        flushLogs();
    });
}
