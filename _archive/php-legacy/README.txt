The PHP application, retired 2026-08-17 when the project was ported to
TypeScript (Express + EJS + mysql2 on Node).

Nothing here is served any more. Apache is no longer part of the stack: the app
listens on its own port (see .env / PORT) and only files under public/ are
reachable over HTTP. These files are kept for reference and are safe to delete
once you are satisfied the port is complete.

Where each file went
--------------------
index.php         -> GET /rw   ) all three are now one template, views/portal.ejs,
indexe.php        -> GET /en   ) plus a string table per language in src/i18n/.
indexf.php        -> GET /fr   ) Submissions POST to the same path.
                     The tracker endpoint is GET /:locale/track.

admin.php         -> GET /admin           (src/routes/admin.ts, views/admin.ejs)
                     plus POST /admin/status and POST /admin/delete. The PHP
                     version dispatched all three from one file by inspecting
                     POST keys; they are separate routes now so the auth and
                     CSRF guards are declared per endpoint.

login.php         -> GET/POST /login      (src/routes/auth.ts, views/login.ejs)
logout.php        -> POST /logout
setup_admin.php   -> GET/POST /setup      (views/setup.ejs)

config.php        -> src/config.ts        (env first, resolved once at startup)
db_connection.php -> src/db.ts            (mysql2 pool, same schema bootstrap)

lib/security.php  -> src/middleware/session.ts   (sessions)
                     src/middleware/csrf.ts      (CSRF)
                     src/middleware/rateLimit.ts (rate limiting)
                     src/middleware/security.ts  (headers, client IP)
                     src/lib/validate.ts         (validation)
                     Output escaping is no longer a function to remember to
                     call: EJS escapes every interpolation by default, which is
                     what replaced e().

lib/auth.php      -> src/services/admins.ts (bcrypt, lockout, session rotation)
                     src/middleware/auth.ts   (the access gate)
lib/portal.php    -> src/routes/portal.ts + src/services/reports.ts

app.js            -> src/client/app.ts   -> public/js/app.js
admin.js          -> src/client/admin.ts -> public/js/admin.js

Two notes
---------
1. The .htaccess in the project root was left in place deliberately, at the
   owner's request. It has no effect on the Node app. What it used to do —
   blocking config*.php, lib/, logs/ and .sql/.md/.docx files, plus the CSP and
   security headers — now lives in src/middleware/security.ts, and the file
   blocking is structural: only public/ is on a served path.

2. These pages carry an unfinished UI redesign (the "2a" step: masthead, nav,
   hero, statistics and footer were reworked; the form, tracker and feed were
   not). The finished design lives in the EJS templates. Do not use these files
   as a styling reference.
