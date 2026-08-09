# Clean Kigali — Security Notes

Hardening pass completed 2026-08-09. This file covers what changed, how to
deploy it safely, and what is still outstanding.

---

## First run

1. Visit `setup_admin.php` and create your administrator account.
   Username: 3–50 chars. Password: 12+ chars with letters and numbers.
2. Confirm you can sign in at `login.php`.
3. **Delete `setup_admin.php` from the server.** It disables itself once an
   account exists, but removing it is one less thing to reason about.

On a public deployment, set a setup token *before* uploading the code, so
nobody can reach the setup page in the gap between deploy and your first
visit. Create `config.local.php`:

```php
<?php return [
    'CK_SETUP_TOKEN' => 'some-long-random-string',
    'DB_PASS'        => 'your-real-mysql-password',
    'APP_ENV'        => 'production',
];
```

Then visit `setup_admin.php?token=some-long-random-string`.

---

## What changed

### Authentication (was: none)
`admin.php` was publicly reachable. Anyone could read reporter names, phone
numbers, email addresses and IP addresses, and delete any report.

- `admin.php` now calls `ck_require_admin()` before anything else. Browsers are
  redirected to `login.php`; AJAX callers get `401`.
- Passwords are stored with `password_hash()` (bcrypt), never plaintext.
- 5 failed attempts locks the account for 15 minutes; login attempts are also
  rate-limited per IP.
- Login responses are identical for a wrong password and an unknown username,
  and unknown users still pay the hash-comparison cost, so the form cannot be
  used to discover valid usernames.
- Sessions are HttpOnly, SameSite=Lax, Secure over HTTPS, with strict mode on.
  The session id is regenerated on login (blocks session fixation). Sessions
  expire after 30 minutes idle or 12 hours absolute.

### CSRF (was: none)
The status-update and delete endpoints accepted any POST. A signed-in admin
visiting a hostile page could be made to delete reports silently.

- All state-changing requests require a token, checked with `hash_equals()`.
- `admin.js` sends it as both a form field and an `X-CSRF-Token` header.
- The public report form and sign-out both carry tokens too.

### Cross-site scripting
Two live paths, both fixed:

- `app.js` rendered tracker results into `innerHTML` with raw database values.
  A report submitted with `<img src=x onerror=...>` as its location executed
  for anyone who tracked that reference. All interpolated values now go
  through `escapeHtml()`.
- `admin.js` rendered toast messages via `innerHTML`, and those messages
  carried server text. Now uses `textContent`.
- All PHP output uses `e()`, which applies `ENT_QUOTES` — the previous
  `htmlspecialchars()` calls left single quotes unescaped on PHP < 8.1.

### Input validation (was: none server-side)
- `category`, `urgency` and `status` are checked against fixed lists in
  `config.php`. A crafted POST can no longer write arbitrary values — the
  status field previously accepted anything.
- Free-text fields are trimmed, stripped of control characters, and capped to
  their column widths, so MySQL never silently truncates.
- Tracker references are parsed with a strict `CK-<digits>` pattern.

### Information disclosure
- Removed `Admin Access Credentials: root DB` from the public footer of all
  three language pages.
- MySQL errors no longer reach the browser. They go to `logs/app-error.log`;
  users see a generic message. This applies to connection failures, insert
  failures, and both admin endpoints.
- Public pages link to `login.php` rather than `admin.php`, marked `nofollow`,
  and admin pages carry `noindex, nofollow`.
- The public feed and tracker API select only non-identifying columns —
  reporter name, contact and IP never leave the server.

### Rate limiting (was: none)
References are sequential, so `CK-1`, `CK-2`, `CK-3`… was a complete database
scrape. Limits are enforced per IP in the `rate_limits` table:

| Action           | Limit                |
|------------------|----------------------|
| Tracker lookups  | 30 per 10 minutes    |
| Report submits   | 5 per hour           |
| Login attempts   | 15 per 15 minutes    |

`X-Forwarded-For` is only trusted from a known proxy — otherwise the header is
spoofable and the limiter becomes useless.

### Credentials and configuration
- Credentials moved out of `db_connection.php` into `config.php`, which reads
  environment variables first, then `config.local.php`, then defaults.
- `config.local.php` is blocked by `.htaccess` and listed in `.gitignore`.

### Server configuration
- `.htaccess` blocks `config*.php`, `lib/`, `logs/`, `_archive/`, dotfiles,
  and `.sql`/`.log`/`.docx`/`.bak` files; disables directory listing; and sets
  CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and
  `Permissions-Policy`.
- `lib/portal.php` also refuses direct requests in code, so the protection
  holds even where `AllowOverride` is off.

### Audit trail
Status changes, deletions, logins, failed logins and lockouts are recorded in
`audit_log` with actor, timestamp and IP.

### Also fixed along the way
- Public statistics were partly fabricated: the page fell back to hard-coded
  figures (124 total / 92 resolved / 32 pending) whenever the query returned
  nothing, and the "resolution rate" was a fixed `94.3%` that was never
  computed. Both now reflect real counts; the rate shows `—` with no data.
- `save_report.php` was broken and unsafe — it included a nonexistent file
  (`dbconnection.php`) and inserted into a column that is not in the schema.
  Moved to `_archive/`.
- Added indexes on `reports.status`, `reports.urgency` and `reports.time`.

---

## Before going live

**Required:**

1. **Set a MySQL password.** The app still connects as `root` with an empty
   password, which is the XAMPP default. Create a dedicated user with only
   `SELECT, INSERT, UPDATE, DELETE` on the `umuganda` database and put its
   credentials in `config.local.php`. No application should run as `root`.
2. **Serve over HTTPS.** Session cookies only get the `Secure` flag over TLS,
   and without it credentials cross the network in the clear. Then uncomment
   the HSTS line in `.htaccess`.
3. **Delete `setup_admin.php`** once your account exists.
4. **Confirm `AllowOverride All`** is set for the document root, or the
   `.htaccess` rules are silently ignored.
5. **Set `display_errors = Off`** in the production `php.ini`.

**Recommended:**

6. **Sequential references still leak information.** Rate limiting makes bulk
   scraping impractical but does not stop a targeted guess — `CK-42` is a valid
   reference someone can simply try. Adding a random token column and tracking
   on `CK-<id>-<token>` would close this properly.
7. **Reporter contact details are stored indefinitely** alongside IP addresses.
   Decide on a retention period and delete beyond it. If Rwanda's data
   protection law applies to this deployment, this likely needs a documented
   policy and a privacy notice on the form.
8. **Add pagination to the dashboard.** It currently loads every report in one
   query; that degrades as the table grows.
9. **Back up the database** on a schedule, and test a restore.

---

## Reference

| File | Purpose |
|------|---------|
| `config.php` | Settings, limits, controlled vocabularies |
| `config.local.php` | Your credentials (create it; never commit it) |
| `lib/security.php` | Sessions, CSRF, rate limiting, validation, escaping |
| `lib/auth.php` | Login, lockout, password hashing, access gate |
| `lib/portal.php` | Shared logic for the three public language pages |
| `logs/app-error.log` | Server-side error log |
| `_archive/` | Retired files, with notes on why each was removed |

The three language pages previously held three copies of the same PHP logic,
which had already drifted apart. Shared behaviour now lives in
`lib/portal.php`, so a fix applies to all three at once; each page defines only
its own strings.
