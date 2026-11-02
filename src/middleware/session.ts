/**
 * middleware/session.ts — hardened sessions.
 *
 * Port of ck_session_start(). Same guarantees as the PHP version: HttpOnly,
 * SameSite=Lax, Secure over HTTPS, plus an idle timeout and an absolute
 * timeout so a stolen session cannot be kept alive indefinitely.
 *
 * Sessions are stored in MySQL rather than in process memory, so a restart
 * does not sign every admin out and a second process would see the same
 * sessions. express-session's default MemoryStore is explicitly not for
 * production use.
 */

import type { RequestHandler } from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { config } from '../config';
import { logError } from '../db';

export function sessionMiddleware(): RequestHandler {
  const MySQLStore = MySQLStoreFactory(session as never);

  const store = new MySQLStore({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    // Table is created on first use, in keeping with the rest of the schema
    // bootstrap. Expired rows are swept every 15 minutes.
    createDatabaseTable: true,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: config.session.absoluteTimeoutMs,
    schema: {
      tableName: 'sessions',
      columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
    },
  });

  store.on('error', (err: unknown) => {
    logError('Session store error', err);
  });

  return session({
    name: config.session.name,
    secret: config.session.secret,
    store: store as unknown as session.Store,
    resave: false,
    // Do not persist a session row for every anonymous visitor who only ever
    // reads a page; one is written when something is actually stored in it.
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.session.forceSecureCookie,
      path: '/',
      maxAge: config.session.idleTimeoutMs,
    },
  });
}

/**
 * Requests a page makes by itself, on a timer. They must not count as activity:
 * a dashboard left open on an unattended desk polls for ever, and if each poll
 * reset the clock the 30-minute idle sign-out would never fire. Expiry is still
 * enforced on them, which is what signs that desk out.
 */
export function isBackgroundPoll(path: string): boolean {
  return path === '/admin/live' || /^\/[a-z]{2}\/stats\.json$/.test(path);
}

/**
 * Enforce the idle and absolute timeouts.
 *
 * The cookie maxAge covers idle expiry on the client side, but a client is not
 * to be trusted with it, so both bounds are also checked server-side against
 * timestamps held in the session itself.
 */
export const enforceSessionTimeouts: RequestHandler = (req, _res, next) => {
  const now = Date.now();
  const background = isBackgroundPoll(req.path);
  const { createdAt, lastActivity } = req.session;

  const idleExpired = lastActivity !== undefined && now - lastActivity > config.session.idleTimeoutMs;
  const absoluteExpired = createdAt !== undefined && now - createdAt > config.session.absoluteTimeoutMs;

  if (idleExpired || absoluteExpired) {
    req.session.regenerate((err) => {
      if (err) {
        logError('Failed to regenerate an expired session', err);
        next(err);
        return;
      }
      req.session.createdAt = now;
      req.session.lastActivity = now;
      next();
    });
    return;
  }

  if (createdAt === undefined) req.session.createdAt = now;
  if (!background) req.session.lastActivity = now;
  next();
};
