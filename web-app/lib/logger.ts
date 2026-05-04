type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';

function log(level: LogLevel, context: string, message: string, data?: unknown) {
  if (level === 'debug' && !isDev) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
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
