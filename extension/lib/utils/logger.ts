type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = 'info'; // Only info+ in extension production

function log(level: LogLevel, context: string, message: string, data?: unknown) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;
  const prefix = `[${level.toUpperCase()}] [${context}]`;
  if (level === 'error') console.error(prefix, message, data ?? '');
  else if (level === 'warn') console.warn(prefix, message, data ?? '');
  else console.log(prefix, message, data ?? '');
}

export const logger = {
  debug: (ctx: string, msg: string, data?: unknown) => log('debug', ctx, msg, data),
  info: (ctx: string, msg: string, data?: unknown) => log('info', ctx, msg, data),
  warn: (ctx: string, msg: string, data?: unknown) => log('warn', ctx, msg, data),
  error: (ctx: string, msg: string, data?: unknown) => log('error', ctx, msg, data),
};
