type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, message: string, meta?: unknown): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta } : {}),
  };

  if (process.env.NODE_ENV === 'production') {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = `[${entry.ts}] [${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, message, meta ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, message, meta ?? '');
    } else {
      console.log(prefix, message, meta ?? '');
    }
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};
