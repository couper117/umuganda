/**
 * config.ts — central configuration.
 *
 * Port of config.php. Values come from the environment (via .env in
 * development) so production credentials never live in source control.
 * Everything is resolved and frozen once at startup, so a typo in an env var
 * fails immediately rather than at the first request that happens to need it.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';

function str(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function int(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got "${raw}"`);
  }
  return parsed;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

const nodeEnv = str('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

/**
 * The session secret is the one value with no safe default. In production a
 * missing secret is fatal; in development we generate an ephemeral one, which
 * means restarting the dev server signs everyone out. That is the correct
 * trade — it is never silently weak.
 */
function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv !== undefined && fromEnv !== '') {
    if (fromEnv.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters.');
    }
    return fromEnv;
  }
  if (isProduction) {
    throw new Error(
      'SESSION_SECRET is required when NODE_ENV=production. Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return crypto.randomBytes(32).toString('hex');
}

export const config = {
  env: nodeEnv,
  isProduction,
  port: int('PORT', 3000),

  db: {
    host: str('DB_HOST', 'localhost'),
    port: int('DB_PORT', 3306),
    user: str('DB_USER', 'root'),
    password: str('DB_PASS', ''),
    database: str('DB_NAME', 'umuganda'),
    connectionLimit: int('DB_POOL_SIZE', 10),
  },

  paths: {
    root: path.resolve(__dirname, '..'),
    views: path.resolve(__dirname, '..', 'views'),
    public: path.resolve(__dirname, '..', 'public'),
    logs: str('LOG_DIR', path.resolve(__dirname, '..', 'logs')),
  },

  session: {
    name: 'CK_ADMIN_SESSION',
    secret: sessionSecret(),
    /** 30 minutes of inactivity ends the session. */
    idleTimeoutMs: 30 * 60 * 1000,
    /** 12 hour hard cap regardless of activity. */
    absoluteTimeoutMs: 12 * 60 * 60 * 1000,
    /** Only set Secure over HTTPS, or the cookie is dropped on http://localhost. */
    forceSecureCookie: bool('FORCE_SECURE_COOKIE', false),
  },

  trustProxy: bool('TRUST_PROXY', false),

  /** Public report submissions per IP. */
  rateSubmit: { max: 5, windowSeconds: 60 * 60 },
  /** Tracker lookups per IP — this is what stops sequential CK-1, CK-2 scraping. */
  rateTrack: { max: 30, windowSeconds: 10 * 60 },
  /** Login attempts per IP, on top of the per-account lockout. */
  rateLogin: { max: 15, windowSeconds: 15 * 60 },

  /** Failed logins before the account itself is locked. */
  login: { maxAttempts: 5, lockoutSeconds: 15 * 60 },

  /**
   * /setup only works while zero admin accounts exist. On a public deployment
   * set a token as well, so the page is unreachable before your first visit.
   */
  setupToken: str('SETUP_TOKEN', ''),

  /** Mirrors the column widths, so input is rejected with a clear message
   *  rather than silently truncated by MySQL. */
  limits: {
    location: 100,
    district: 50,
    sector: 50,
    cell: 50,
    village: 50,
    details: 2000,
    name: 50,
    contact: 50,
    username: 50,
  },
} as const;

/** Anything not on these lists is rejected outright. */
export const VALID_CATEGORIES = ['full-bin', 'blocked-drain', 'illegal-dumping', 'litter', 'other'] as const;
export const VALID_URGENCIES = ['low', 'medium', 'high'] as const;
export const VALID_STATUSES = ['pending', 'notdone', 'done'] as const;

export type Category = (typeof VALID_CATEGORIES)[number];
export type Urgency = (typeof VALID_URGENCIES)[number];
export type Status = (typeof VALID_STATUSES)[number];
