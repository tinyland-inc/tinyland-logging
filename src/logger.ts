














import { getLoggingConfig } from './config.js';
import type { LokiLogEntry } from './types.js';


let logBuffer: LokiLogEntry[] = [];


let flushTimer: ReturnType<typeof setTimeout> | null = null;




function getLokiUrl(): string {
	return getLoggingConfig().lokiUrl ?? 'http://localhost:3100';
}




function isLokiEnabled(): boolean {
	const config = getLoggingConfig();
	if (config.lokiEnabled !== undefined) {
		return config.lokiEnabled;
	}
	return config.lokiUrl !== undefined && config.lokiUrl !== '';
}




function getNodeEnv(): string {
	return getLoggingConfig().nodeEnv ?? 'development';
}




export async function flushLogs(): Promise<void> {
	if (logBuffer.length === 0) return;

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
	} catch (err) {
		
		console.error('Failed to send logs to Loki:', err);
	}
}




function scheduleFlush(): void {
	if (flushTimer) return;
	flushTimer = setTimeout(() => {
		flushTimer = null;
		flushLogs();
	}, 1000); 
}








export function log(level: string, message: string, labels: Record<string, string> = {}): void {
	const entry: LokiLogEntry = {
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
	debug: (message: string, labels?: Record<string, string>) => log('DEBUG', message, labels),
	info: (message: string, labels?: Record<string, string>) => log('INFO', message, labels),
	warn: (message: string, labels?: Record<string, string>) => log('WARN', message, labels),
	error: (message: string, labels?: Record<string, string>) => log('ERROR', message, labels),
};





export function _getBufferLength(): number {
	return logBuffer.length;
}





export function _resetBuffer(): void {
	logBuffer = [];
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}
}





export function _getFlushTimer(): ReturnType<typeof setTimeout> | null {
	return flushTimer;
}


if (typeof process !== 'undefined') {
	process.on('exit', () => {
		flushLogs();
	});
}
