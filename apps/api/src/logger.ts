import { pino } from 'pino';

export type Logger = pino.Logger;

// JSON logs on stdout, read by Dokploy. Never log request bodies: they hold personal data.
export function createLogger(level: string): Logger {
  return pino({
    level,
    base: { service: 'cran-api' },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  });
}
