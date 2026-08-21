/**
 * middleware/auth.ts — the access gate for the dashboard.
 *
 * Port of ck_is_logged_in / ck_current_admin / ck_require_admin. Browsers are
 * redirected to the sign-in form with the originally requested path preserved;
 * AJAX callers get 401 JSON so the dashboard's fetch handler can bounce them
 * rather than leaving an admin clicking buttons that silently do nothing.
 */

import type { Request, RequestHandler } from 'express';

/** True when the current session belongs to a signed-in admin. */
export function isLoggedIn(req: Request): boolean {
  return req.session.adminId !== undefined && req.session.adminUsername !== undefined;
}

/** Username of the signed-in admin, or 'system' when unauthenticated. */
export function currentAdmin(req: Request): string {
  return req.session.adminUsername ?? 'system';
}

/**
 * Gate a route behind authentication.
 *
 * `asJson` must be true for the endpoints the dashboard calls with fetch, so a
 * lapsed session produces a JSON 401 instead of an HTML redirect body.
 */
export function requireAdmin(asJson: boolean): RequestHandler {
  return (req, res, next) => {
    if (isLoggedIn(req)) {
      next();
      return;
    }

    if (asJson) {
      res.status(401).json({ success: false, message: 'Your session expired. Please sign in again.' });
      return;
    }

    // originalUrl is server-side, but it still goes through the same-origin
    // check below: only a path on this app is ever echoed back into the
    // redirect, so ?next= cannot be turned into an open redirect.
    const target = safeReturnPath(req.originalUrl);
    res.redirect(`/login?next=${encodeURIComponent(target)}`);
  };
}

/**
 * Reduce an arbitrary value to a same-origin path, or fall back to the
 * dashboard. Rejects anything with a scheme, a host, or a protocol-relative
 * prefix, which is what an open-redirect attempt looks like.
 */
export function safeReturnPath(value: unknown): string {
  const fallback = '/admin';
  if (typeof value !== 'string' || value === '') return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  return value;
}

/** Expose the signed-in state to every template. */
export const exposeAuthState: RequestHandler = (req, res, next) => {
  res.locals.isLoggedIn = isLoggedIn(req);
  res.locals.currentAdmin = currentAdmin(req);
  next();
};
