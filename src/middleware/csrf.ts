/**
 * middleware/csrf.ts — cross-site request forgery protection.
 *
 * Port of ck_csrf_token / ck_csrf_verify / ck_csrf_require.
 *
 * Written by hand rather than pulled from a package: csurf, the usual choice,
 * has been deprecated and unmaintained since 2022, and the whole mechanism is
 * thirty lines. Same shape as the PHP version — a per-session token compared
 * in constant time, accepted from either the form body or the X-CSRF-Token
 * header, which is what the dashboard's fetch calls send.
 */

import crypto from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';

/** Methods that cannot change state, so they need no token. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The session's token, generated on first use. */
export function csrfToken(req: Request): string {
  if (req.session.csrfToken === undefined) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

/** Make the token available to every template as `csrfToken`. */
export const exposeCsrfToken: RequestHandler = (req, res, next) => {
  res.locals.csrfToken = csrfToken(req);
  next();
};

/** Constant-time comparison of a submitted token against the session's. */
export function csrfVerify(req: Request): boolean {
  const expected = req.session.csrfToken;
  if (expected === undefined || expected === '') return false;

  const submitted = submittedToken(req);
  if (submitted === undefined || submitted === '') return false;

  // timingSafeEqual throws on a length mismatch, so guard first. Comparing
  // lengths is not a leak: the token length is fixed and public.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(submitted, 'utf8');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function submittedToken(req: Request): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body?.['csrf_token'];
  if (typeof fromBody === 'string') return fromBody;

  const fromHeader = req.get('X-CSRF-Token');
  return fromHeader ?? undefined;
}

/**
 * Reject an unverified state-changing request with 419.
 *
 * `asJson` decides the response shape, matching the PHP original: the AJAX
 * endpoints get a JSON body the client can show in a toast, page posts get
 * plain text.
 */
export function requireCsrf(asJson: boolean): RequestHandler {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || csrfVerify(req)) {
      next();
      return;
    }
    respondExpired(res, asJson);
  };
}

function respondExpired(res: Response, asJson: boolean): void {
  res.status(419);
  if (asJson) {
    res.json({ success: false, message: 'Your session expired. Please reload the page.' });
  } else {
    res.type('text/plain').send('Your session expired. Please go back, reload the page and try again.');
  }
}
