/**
 * server.ts — application bootstrap.
 *
 * Middleware order matters and is deliberate:
 *   1. trust proxy      — decided before anything reads req.ip
 *   2. security headers — applied to every response, including errors
 *   3. static files     — only ever from public/, so nothing server-side leaks
 *   4. body parsers     — before CSRF, which needs to read the token field
 *   5. session          — before CSRF and auth, which both read it
 *   6. timeouts         — before anything trusts the session
 *   7. locals           — csrf token and auth state for the templates
 *   8. routes
 *   9. 404, then the error handler last
 */

import express from 'express';
import path from 'node:path';
import { config } from './config';
import { closeDatabase, initDatabase, logError } from './db';
import { exposeAuthState } from './middleware/auth';
import { exposeCsrfToken } from './middleware/csrf';
import { securityHeaders } from './middleware/security';
import { enforceSessionTimeouts, sessionMiddleware } from './middleware/session';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { portalRouter } from './routes/portal';

export function createApp(): express.Express {
  const app = express();

  // Do not advertise the framework. Replaces `Header always unset X-Powered-By`.
  app.disable('x-powered-by');

  // Only honour X-Forwarded-For when we are actually behind a proxy. The rate
  // limiter keys on the client IP, so trusting this by default would make the
  // limiter trivially bypassable.
  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.set('view engine', 'ejs');
  app.set('views', config.paths.views);

  app.use(securityHeaders());

  // Static assets. Everything outside public/ — src/, views/, logs/, .env, the
  // old PHP files — is simply not on a served path, which is what replaces the
  // .htaccess deny rules. No directory listing exists to disable.
  app.use(
    express.static(config.paths.public, {
      index: false,
      dotfiles: 'ignore',
      redirect: false,
      maxAge: config.isProduction ? '1h' : 0,
    }),
  );

  // Forms only. There is no JSON API surface that accepts a body, so no JSON
  // parser is mounted — one fewer thing to reason about.
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));

  app.use(sessionMiddleware());
  app.use(enforceSessionTimeouts);
  app.use(exposeCsrfToken);
  app.use(exposeAuthState);

  app.get('/healthz', (_req, res) => {
    res.type('text/plain').send('ok');
  });

  // Admin and auth routes are mounted before the portal, so /login, /setup and
  // /admin are matched as themselves and never fall through to the portal's
  // /:locale pattern.
  app.use(authRouter);
  app.use(adminRouter);
  app.use(portalRouter);

  app.use((_req, res) => {
    res.status(404).type('text/plain').send('Not found.');
  });

  // Error handler. Detail goes to the log; the visitor gets a generic message,
  // exactly as ck_fail() behaved.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logError('Unhandled request error', err);
    if (res.headersSent) return;
    res.status(500);
    if (config.isProduction) {
      res.type('text/plain').send('The service is temporarily unavailable. Please try again shortly.');
    } else {
      res.type('text/plain').send(`[dev] ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }
  });

  return app;
}

async function main(): Promise<void> {
  await initDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    process.stdout.write(
      `Clean Kigali listening on http://localhost:${config.port} (${config.env})\n` +
        `  views:  ${path.relative(config.paths.root, config.paths.views)}\n` +
        `  static: ${path.relative(config.paths.root, config.paths.public)}\n`,
    );
  });

  const shutdown = (signal: string): void => {
    process.stdout.write(`\n${signal} received, shutting down.\n`);
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  main().catch((err: unknown) => {
    logError('Fatal startup error', err);
    process.stderr.write(`\nFailed to start: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
