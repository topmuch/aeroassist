import winston from 'winston';
import path from 'path';

// ── PII Patterns to Redact ───────────────────────────────────────
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(\+?\d[\d\s\-(){}/]{6,}\d)/g, replacement: '[PHONE_REDACTED]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, replacement: '[EMAIL_REDACTED]' },
  { pattern: /\b\d{1,2}\s+\w+\s+\d{4}\b/g, replacement: '[DATE_REDACTED]' },
  { pattern: /\b(?:AF|EK|BA|LH|DL|UA|AA|FR|IB|TK|QR|EK|SK|AY|RO|SN|AZ|EI|EI|LO|OS|LX|TP|JK|SU|AC)\s*\d{2,4}\b/gi, replacement: '[FLIGHT_REDACTED]' },
  { pattern: /(?:pass(?:port|por)|passeport)\s*[:\s]*[A-Z0-9]{6,9}\b/gi, replacement: 'passport: [REDACTED]' },
  { pattern: /(?:nom|name|prénom|prenom|surname)\s*[:\s]*([A-ZÀÂÉÈÊËÏÎÔÙÛÜÇ][a-zàâéèêëïîôùûüç]+(?:\s+[A-ZÀÂÉÈÊËÏÎÔÙÛÜÇ][a-zàâéèêëïîôùûüç]+)*)/gi, replacement: '[NAME_REDACTED]' },
];

function redactPII(message: string): string {
  let sanitized = message;
  for (const { pattern, replacement } of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

// ── Custom Format ────────────────────────────────────────────────
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    if (info.message && typeof info.message === 'string') {
      info.message = redactPII(info.message);
    }
    // Recursively redact PII in all metadata fields while preserving structure
    const redactObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          result[key] = redactPII(value);
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = redactObject(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
          result[key] = value.map(item =>
            typeof item === 'string' ? redactPII(item) : item
          );
        } else {
          result[key] = value;
        }
      }
      return result;
    };
    // Redact PII in all top-level string fields
    const keysToRedact = Object.keys(info).filter(k => k !== 'level' && k !== 'timestamp' && k !== 'message');
    for (const key of keysToRedact) {
      if (typeof info[key] === 'string') {
        (info as Record<string, unknown>)[key] = redactPII(info[key] as string);
      } else if (info[key] !== null && typeof info[key] === 'object' && !Array.isArray(info[key])) {
        (info as Record<string, unknown>)[key] = redactObject(info[key] as Record<string, unknown>);
      }
    }
    return info;
  })(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// ── Logger Instance ──────────────────────────────────────────────
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'aeroassist',
    version: process.env.npm_package_version || '0.2.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
    // Combined log file with daily rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 30,
      tailable: true,
    }),
    // Error-only log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 14,
      tailable: true,
    }),
    // Webhook-specific log for WhatsApp audit trail
    new winston.transports.File({
      filename: path.join(logsDir, 'webhook.log'),
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30,
      tailable: true,
    }),
  ],
  exitOnError: false,
});

// ── Helper Functions ─────────────────────────────────────────────

export function logWebhookEvent(direction: string, data: Record<string, unknown>) {
  logger.info(`whatsapp.webhook.${direction}`, {
    event: `whatsapp_${direction}`,
    ...data,
  });
}

export function logSecurityEvent(event: string, details: Record<string, unknown>) {
  logger.warn(`security.${event}`, {
    event: `security_${event}`,
    ...details,
  });
}

export function logAIEvent(event: string, data: Record<string, unknown>) {
  logger.info(`ai.${event}`, {
    event: `ai_${event}`,
    ...data,
  });
}

export function createRequestLogger(endpoint: string) {
  return {
    incoming: (method: string, ip?: string) =>
      logger.info(`${endpoint} request`, { method, endpoint, ip: ip ? redactPII(ip) : undefined }),
    success: (statusCode: number, durationMs: number) =>
      logger.info(`${endpoint} response`, { endpoint, statusCode, durationMs }),
    error: (statusCode: number, error: string) =>
      logger.error(`${endpoint} error`, { endpoint, statusCode, error: redactPII(error) }),
  };
}

export { logger };
export default logger;
