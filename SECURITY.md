# Clean Kigali — Security Notes

Stack: Node + Express + EJS + mysql2 (TypeScript). Ported from PHP on
2026-08-17; the original hardening pass was 2026-08-09.

This file describes the controls that are in place, how they were verified, and
what is still outstanding before this should face the public.

---

## First run

```bash
cp .env.example .env          # then edit it
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
                              # paste into SESSION_SECRET
npm install
npm run build                 # compiles the browser scripts into public/js/
npm run dev                   # or: npm start, after a build
```

1. Visit `/setup` and create your administrator account.
   Username 3–50 chars; password 12+ chars with letters and numbers.
2. Confirm you can sign in at `/login`.
3. Set `SETUP_TOKEN` in `.env`, or remove the `/setup` route. It disables itself
   once an account exists, but closing it off entirely is one less thing to
   reason about.

On a public deployment, set `SETUP_TOKEN` **before** deploying, so nobody can
reach the setup page in the gap between deploy and your first visit. Then visit
`/setup?token=YOUR_TOKEN`.

---

## Controls in place

Each item below was exercised against the running app, not just written.

### Authentication — `src/services/admins.ts`, `src/middleware/auth.ts`

- The dashboard is gated by `requireAdmin` declared **per route**. The PHP
  version dispatched three operations out of one file behind a single `if`; the
  routes are separate now, so an endpoint cannot be added later that skips the
  guard by accident.
- Passwords are bcrypt digests (cost 12), never plaintext.
- 5 failed attempts locks the account for 15 minutes. Verified: attempts 1–5
  return the generic message, the 6th returns `Too many failed attempts. Try
  again in 15 minute(s).` and `locked_until` is set.
- Login attempts are **also** rate limited per IP (15 per 15 minutes), on top of
  the per-account lockout. Both layers were observed firing independently.
- A wrong password and an unknown username return the identical message
  (`Incorrect username or password.`), and an unknown username still pays the
  bcrypt comparison cost against a dummy hash. Measured: 879 ms vs 918 ms
  average over three runs each — no usable timing signal.
- `?next=` is reduced to a same-origin path. Verified: `https://evil.example.com/x`
  and `//evil.example.com` both rewrite to `/admin`.

### Sessions — `src/middleware/session.ts`

- `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` when
  `FORCE_SECURE_COOKIE=true`. Verified on a live `Set-Cookie`.
- The session id is **regenerated on login**, which blocks session fixation.
  Verified: the cookie value differs before and after signing in.
- 30 minutes idle, 12 hours absolute. Both bounds are enforced server-side
  against timestamps in the session, not only by cookie expiry.
- Sessions live in MySQL (`sessions` table), not process memory. Express's
  default `MemoryStore` is explicitly not for production, and an in-memory store
  would also sign everyone out on every deploy.

### CSRF — `src/middleware/csrf.ts`

- Every state-changing request requires a token, compared with
  `crypto.timingSafeEqual`. Accepted from the form body or the `X-CSRF-Token`
  header.
- Written by hand rather than taken from a package: `csurf`, the usual choice,
  has been deprecated and unmaintained since 2022.
- Verified: submitting a report, changing a status and deleting a report all
  return **419** without a token. Sign-out is a POST and carries one too.

### Cross-site scripting

- EJS escapes every `<%= %>` interpolation by default. This replaces the `e()`
  helper the PHP templates had to remember to call at each site.
- The tracker result is built with `createElement` / `textContent` rather than an
  `innerHTML` template. The PHP version funnelled values through an
  `escapeHtml()` helper — which worked, but left the whole class of bug one
  forgotten call away.
- Verified end to end: a report submitted with
  `<img src=x onerror=alert(1)><script>alert(2)</script>` as its location renders
  as escaped entities server-side, and in Chrome (with `alert` instrumented)
  produced **0 dialogs, 0 injected `<img>`, 0 injected `<script>`** — the payload
  appears as literal text.
- Dashboard toasts use `textContent`.

### Input validation — `src/lib/validate.ts`

- `category`, `urgency` and `status` are checked against fixed lists in
  `src/config.ts`. Verified: `category=not-a-real-category` → 400,
  `status=bogus` → 400.
- Free text is trimmed, stripped of control characters, and capped in code
  points to the column width, so MySQL never silently truncates. Verified: a
  250-character location and sector store as exactly 100 and 50.
- Tracker references are parsed with a strict `CK-<digits>` pattern.
- Types carry the guarantee onward: the compiler will not let an unvalidated
  string reach a query that expects a `Category`.

### References and reporter feedback — `src/lib/reference.ts`

- New references carry a random token, and a wrong token gets the same answer as a
  report that does not exist, so a guess cannot confirm that an id is real.
- Reports filed before tokens existed still open with a bare `CK-<id>`, but they
  cannot confirm or reopen anything: that needs the token and a CSRF token.
- Staff usernames and internal notes are never sent to the tracker.

### Photos — `src/lib/image.ts`, `src/services/media.ts`

- Accepted by their bytes, JPEG and PNG only, never by filename or declared type.
  An SVG sent as `image/jpeg` is refused.
- EXIF, XMP and comment blocks are stripped on the server even though the browser
  already re-encodes, because a request can skip the browser.
- Stored outside `public/` under a random 128-bit name. `/media/:name` accepts only
  that exact shape, so a path cannot be smuggled in, and the response is `noindex`
  and privately cached.
- Limited to 6 MB while parsing. Uploads are held in memory until validated, so also
  cap request bodies at the reverse proxy in production.

### Geolocation

- `Permissions-Policy` allows `geolocation` for this origin only, and the browser
  asks only when the visitor presses the button.
- Coordinates are shown to staff, never on the public feed or tracker.

### Live updates — `src/middleware/session.ts`

- `/admin/live` and `/:locale/stats.json` are polled on a timer, so they do not count
  as activity. Otherwise a dashboard left open would never reach the 30-minute idle
  sign-out. Expiry is still enforced on those requests.
- `/admin/live` is scoped like the rest of the dashboard, and returns 401 once signed
  out, at which point the page stops polling. The public counters are shared for 15
  seconds, so any number of open pages costs one query per window.

### CSV export — `src/lib/csv.ts`

- Cells starting with a formula character are neutralised, so a report cannot run a
  formula when an officer opens the file.
- Scoped to the viewer's cell, never cached, audited, and leaves out IP addresses.

### Rate limiting — `src/middleware/rateLimit.ts`

| Action            | Limit             |
|-------------------|-------------------|
| Tracker lookups   | 30 per 10 minutes |
| Report submits    | 5 per hour        |
| Login attempts    | 15 per 15 minutes |

- Still database-backed on the existing `rate_limits` table, so counters survive
  a restart and are shared between processes. An in-memory limiter resets on
  every deploy, which is exactly when abuse is easiest.
- An attempt is only **recorded** once the action succeeds, so a visitor who
  mistypes a field does not burn their hourly quota on validation errors.
  Verified: four POSTs (three rejected, one valid) left exactly one `submit` row.
- `X-Forwarded-For` is only honoured when `TRUST_PROXY=true`. Verified with
  `TRUST_PROXY=false`: seven submissions carrying seven different spoofed
  `X-Forwarded-For` values all keyed on the real address, and the 6th and 7th
  were refused with 429.

### Information disclosure

- Public reads select only non-identifying columns — reporter name, contact and
  IP are absent from the result set by construction, not filtered out in a
  template. Verified against the tracker JSON.
- MySQL and runtime errors go to `logs/app-error.log`; the visitor gets a
  generic message. Production hides stack traces entirely.
- Public pages link to `/login` with `rel="nofollow"`, never to `/admin`.
  Verified: 0 direct `/admin` links in public output.
- No credentials in public output. Verified: 0 occurrences of `root`,
  `umuganda`, `DB_PASS`, `password` or `mysql`.
- The dashboard and auth pages send `X-Robots-Tag: noindex, nofollow` and
  `Cache-Control: no-store` — the latter is new, because those pages render
  names, phone numbers and IPs that should not sit in a shared or browser cache.
- `X-Powered-By` is disabled.

### Server configuration — `src/middleware/security.ts`

This file is what replaced `.htaccess`. Headers verified on a live response,
including on static assets:

`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, plus the extras helmet adds
(`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
`X-Permitted-Cross-Domain-Policies`, `Origin-Agent-Cluster`).

HSTS is sent only when `FORCE_SECURE_COOKIE=true`; asserting it over plain http
is meaningless.

The CSP no longer grants `fonts.googleapis.com` or `fonts.gstatic.com`: the
redesign dropped web fonts for the system stack.

**File protection is now structural rather than a deny list.** Only `public/` is
on a served path, so there is no equivalent of "someone requests config.php".
Verified 404 for `/.env`, `/src/config.ts`, `/src/server.ts`, `/package.json`,
`/views/layout.ejs`, `/logs/app-error.log`, `/reports.sql`, `/SECURITY.md`,
`/config.php`, `/lib/auth.php`, `/index.php`, and a `../` traversal attempt.

### Audit trail — `src/services/audit.ts`

Status changes, deletions, logins, failed logins, lockouts and account creation
are recorded in `audit_log` with actor, timestamp, target and IP. Verified after
each destructive action in testing.

### Accessibility fixes that were also security-adjacent

The category and urgency radios were `display: none` with selection driven by a
JS class, which made them unreachable by keyboard **and** meant `required` fired
native validation against an unfocusable field, stalling the form. They are real
radios now, visually hidden but focusable, with selection signalled by a
checkmark, a border-weight change and a fill — never colour alone.

---

## Before going live

**Required:**

1. **Set a MySQL password.** The app still connects as `root` with an empty
   password, the XAMPP default. Create a dedicated user with only
   `SELECT, INSERT, UPDATE, DELETE` on `umuganda` and put its credentials in
   `.env`. No application should run as `root`.
2. **Set `SESSION_SECRET`.** The server refuses to start without it when
   `NODE_ENV=production`. In development an ephemeral one is generated, so a
   restart signs everyone out — deliberate, so it is never silently weak.
3. **Serve over HTTPS**, then set `FORCE_SECURE_COOKIE=true` so the session
   cookie gets `Secure` and HSTS is sent. Without TLS, credentials cross the
   network in the clear.
4. **Set `NODE_ENV=production`**, which stops error detail reaching responses.
5. **Set `SETUP_TOKEN`** or remove the `/setup` route.
6. **If you put this behind a reverse proxy**, set `TRUST_PROXY=true` — otherwise
   every request appears to come from the proxy and the rate limiter keys on one
   address for the whole internet. Only set it when a proxy is genuinely in
   front, or the limiter becomes trivially bypassable.

**Recommended:**

7. **Sequential references still leak information.** Rate limiting makes bulk
   scraping impractical but does not stop a targeted guess — `CK-42` is a
   reference someone can simply try. A random token column, tracked as
   `CK-<id>-<token>`, would close this properly.
8. **Reporter contact details are stored indefinitely** alongside IP addresses.
   Decide a retention period and delete beyond it. If Rwanda's data protection
   law applies here, this likely needs a documented policy and a privacy notice
   on the form. (A short notice now sits beside the contact fields; that is not
   the same as a policy.)
9. **Add pagination to the dashboard.** It still loads every report in one query.
10. **Drop `'unsafe-inline'` from `style-src`.** It is no longer needed by the
    portal templates — no inline `style` attributes remain — but is kept until
    the setting has been confirmed against every page.
11. **Back up the database** on a schedule, and test a restore.

---

## Reference

| Path | Purpose |
|------|---------|
| `.env` | Your configuration. Gitignored; never commit it. |
| `src/config.ts` | Settings, limits, controlled vocabularies |
| `src/db.ts` | Pool, schema bootstrap, error logging |
| `src/middleware/security.ts` | Headers, CSP, client IP — replaces `.htaccess` |
| `src/middleware/session.ts` | Hardened sessions |
| `src/middleware/csrf.ts` | Token issue and verification |
| `src/middleware/rateLimit.ts` | Per-IP sliding windows |
| `src/middleware/auth.ts` | Access gate, open-redirect guard |
| `src/lib/validate.ts` | All input validation |
| `src/services/` | Queries: reports, admins, audit |
| `src/routes/` | portal, auth, admin |
| `src/i18n/` | The three language string tables |
| `views/` | EJS templates (never web-served) |
| `public/` | The only web-served directory |
| `logs/app-error.log` | Server-side error log |
| `_archive/php-legacy/` | The retired PHP app, with a mapping of what went where |

The three language pages were previously three near-identical copies that had
already drifted apart. There is now one template plus three string tables, and
because each table must satisfy the `Strings` interface, a missing string is a
compile error rather than a blank spot on a page nobody checked.
