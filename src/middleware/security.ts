/**
 * middleware/security.ts — response headers and client identity.
 *
 * This file carries what .htaccess used to do. Retiring Apache means the
 * Content Security Policy, the security headers and the "do not serve
 * server-side files" rules all have to exist here instead. The upside is that
 * they are now testable and cannot be silently disabled by an AllowOverride
 * setting on the host.
 *
 * Parity with the .htaccess it replaces:
 *   Options -Indexes ................ express.static has no directory listing
 *   deny config*.php, lib/, logs/ ... nothing outside public/ is ever served
 *   deny .sql .log .md .docx ........ same: not reachable, they are not static
 *   X-Content-Type-Options .......... helmet.noSniff
 *   X-Frame-Options: DENY ........... helmet.frameguard + frame-ancestors
 *   Referrer-Policy ................. helmet.referrerPolicy
 *   Permissions-Policy .............. set manually below (helmet has no helper)
 *   Content-Security-Policy ......... helmet.contentSecurityPolicy
 *   unset X-Powered-By .............. app.disable('x-powered-by') in server.ts
 *   HSTS (commented out) ............ sent only when the connection is secure
 */

import type { RequestHandler } from 'express';
import helmet from 'helmet';
import net from 'node:net';
import { config } from '../config';

/**
 * Header stack applied to every response.
 */
export function securityHeaders(): RequestHandler[] {
  return [
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // 'unsafe-inline' is still required by the inline style attributes
          // left in the tracker and feed markup. It comes out once step 2c
          // moves those into the stylesheet.
          styleSrc: ["'self'", "'unsafe-inline'"],
          // No external font hosts: the redesign dropped web fonts for the
          // system stack, so fonts.googleapis.com and fonts.gstatic.com are no
          // longer granted.
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          ...(config.session.forceSecureCookie ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      // Sent only over HTTPS. Over plain http it is ignored by browsers
      // anyway, and asserting it during local development is misleading.
      strictTransportSecurity: config.session.forceSecureCookie
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
      // Not applicable: this app serves no cross-origin isolated content, and
      // enabling these would block the gov.rw partner links opened in new tabs.
      crossOriginEmbedderPolicy: false,
    }),

    (_req, res, next) => {
      // helmet has no Permissions-Policy helper.
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      next();
    },
  ];
}

/**
 * Mark a response as private: not for indexing, and not for storing.
 *
 * Applied to the dashboard and the auth pages. The noindex half replaces the
 * <meta name="robots"> tag the PHP pages carried.
 *
 * The no-store half is new. The dashboard renders reporter names, phone numbers
 * and IP addresses, and neither the PHP version nor a default Express response
 * says anything about caching — so that page could sit in a shared proxy cache
 * or be recovered from the browser's back/forward cache after sign-out. This is
 * beyond parity rather than a regression being fixed, but it is one header.
 */
export const noIndex: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  next();
};

/**
 * Best-effort client IP.
 *
 * X-Forwarded-For is only honoured when TRUST_PROXY is on, because the header
 * is trivially spoofed otherwise — and this value gates the rate limiter, so
 * trusting it blindly would make the limiter useless. Express already parses
 * the header into req.ip when 'trust proxy' is set, which is why the setting
 * and this function are driven by the same flag.
 */
export function clientIp(req: { ip?: string | undefined; socket: { remoteAddress?: string | undefined } }): string {
  const candidate = (config.trustProxy ? req.ip : req.socket.remoteAddress) ?? '';
  const cleaned = normaliseIp(candidate);
  return cleaned ?? '0.0.0.0';
}

/**
 * Strip the IPv4-mapped IPv6 prefix Node reports on dual-stack sockets
 * (::ffff:127.0.0.1) and reject anything that is not a valid address, so the
 * value is always safe for a VARCHAR(45) column.
 */
function normaliseIp(value: string): string | undefined {
  if (value === '') return undefined;
  const unmapped = value.startsWith('::ffff:') ? value.slice(7) : value;
  return net.isIP(unmapped) === 0 ? undefined : unmapped;
}
