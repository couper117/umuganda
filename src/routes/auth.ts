/**
 * routes/auth.ts — sign in, sign out, first-run setup.
 *
 * Ports login.php and setup_admin.php.
 *
 *   GET  /login   → the form (redirects to /admin if already signed in,
 *                   or to /setup while no account exists)
 *   POST /login   → attempt sign-in
 *   POST /logout  → sign out (POST + CSRF, so an external page cannot force it)
 *   GET  /setup   → first-run account creation
 *   POST /setup   → create the first account
 */

import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config';
import { DEFAULT_LOCALE } from '../i18n';
import { csrfToken } from '../middleware/csrf';
import { requireCsrf } from '../middleware/csrf';
import { isLoggedIn, safeReturnPath } from '../middleware/auth';
import { clientIp, noIndex } from '../middleware/security';
import { rateCheck, rateRecord } from '../middleware/rateLimit';
import { adminExists, createAdmin, login, logout } from '../services/admins';

export const authRouter = Router();

/**
 * noIndex is attached per route, NOT via authRouter.use().
 *
 * This router is mounted at the root, so a bare .use() would run for every
 * request that passes through on its way to the portal — which would put
 * `noindex` and `no-store` on the public pages and quietly deindex the whole
 * public service.
 */

/* -------------------------------------------------------------------------
 * Sign in
 * ---------------------------------------------------------------------- */

authRouter.get('/login', noIndex, async (req, res, next) => {
  try {
    if (isLoggedIn(req)) {
      res.redirect('/admin');
      return;
    }
    if (!(await adminExists())) {
      res.redirect('/setup');
      return;
    }

    res.render('login', {
      csrfToken: csrfToken(req),
      error: null,
      next: safeReturnPath(req.query.next),
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', noIndex, requireCsrf(false), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const target = safeReturnPath(body['next']);
    const ip = clientIp(req);

    // Throttle attempts per IP, on top of the per-account lockout.
    if (!(await rateCheck('login', ip, config.rateLogin.max, config.rateLogin.windowSeconds))) {
      res.status(429).render('login', {
        csrfToken: csrfToken(req),
        error: 'Too many sign-in attempts from this network. Please wait a few minutes.',
        next: target,
        portalHref: `/${DEFAULT_LOCALE}`,
      });
      return;
    }

    const result = await login(req, body['username'], body['password'], ip);
    if (result.ok) {
      res.redirect(target);
      return;
    }

    // Only a failed attempt consumes quota.
    await rateRecord('login', ip);

    res.status(401).render('login', {
      csrfToken: csrfToken(req),
      error: result.message,
      next: target,
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Sign out
 * ---------------------------------------------------------------------- */

authRouter.post('/logout', noIndex, requireCsrf(false), async (req, res, next) => {
  try {
    await logout(req, clientIp(req));
    res.clearCookie(config.session.name, { path: '/' });
    res.redirect(`/${DEFAULT_LOCALE}`);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * First-run setup
 * ---------------------------------------------------------------------- */

/**
 * Why this page is allowed to exist at all: it refuses to run once any account
 * exists, so it cannot be used to add accounts later. Setting SETUP_TOKEN also
 * closes the window between deploying and the operator's first visit.
 */
async function setupLock(suppliedToken: unknown): Promise<string | null> {
  if (await adminExists()) {
    return 'An administrator account already exists. This setup page is disabled — sign in instead.';
  }

  if (config.setupToken !== '') {
    const supplied = typeof suppliedToken === 'string' ? suppliedToken : '';
    const a = Buffer.from(config.setupToken, 'utf8');
    const b = Buffer.from(supplied, 'utf8');
    const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!matches) {
      return 'A valid setup token is required to use this page.';
    }
  }

  return null;
}

authRouter.get('/setup', noIndex, async (req, res, next) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    res.render('setup', {
      csrfToken: csrfToken(req),
      lockedReason: await setupLock(token),
      created: false,
      error: null,
      token,
      tokenRequired: config.setupToken !== '',
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/setup', noIndex, requireCsrf(false), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const token = typeof body['token'] === 'string' ? body['token'] : '';

    const view = {
      csrfToken: csrfToken(req),
      created: false,
      token,
      tokenRequired: config.setupToken !== '',
      portalHref: `/${DEFAULT_LOCALE}`,
    };

    const locked = await setupLock(token);
    if (locked !== null) {
      res.status(403).render('setup', { ...view, lockedReason: locked, error: null });
      return;
    }

    const password = body['password'];
    if (password !== body['confirm_password']) {
      res.status(400).render('setup', { ...view, lockedReason: null, error: 'The two passwords do not match.' });
      return;
    }

    const result = await createAdmin(body['username'], password, clientIp(req));
    if (!result.ok) {
      res.status(400).render('setup', { ...view, lockedReason: null, error: result.message });
      return;
    }

    res.render('setup', { ...view, created: true, lockedReason: null, error: null });
  } catch (err) {
    next(err);
  }
});
