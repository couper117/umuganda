# Clean Kigali — Project Summary

A web service for reporting and managing public sanitation problems in Kigali.
Residents submit a report from a public page in one of three languages, get a
reference code back, and can look its status up later. City staff sign in to a
dashboard to triage, resolve, or delete reports.

**Stack:** Node 20+ / TypeScript (strict) · Express 4 · EJS · MySQL/MariaDB via
mysql2 · bcryptjs · helmet · express-session. No front-end framework and no
bundler — the two browser scripts are TypeScript compiled straight to
`public/js/`.

Roughly 8,000 lines: ~2,500 TypeScript, ~900 EJS, ~2,700 CSS, the rest string
tables and config.

---

## History — the port

The project began as PHP 8 on Apache/XAMPP and was ported to TypeScript on
**2026-08-17**. The old application is preserved under `_archive/php-legacy/`
with a file-by-file map of where everything went; nothing in it is served.

Apache is out of the stack entirely. The app listens on its own port and only
`public/` is on a served path, which is what replaced the `.htaccess` deny
rules — file blocking is now structural rather than configured. (The root
`.htaccess` was left in place at the owner's request but has no effect.)

Three things the port genuinely improved, rather than just translated:

1. **Three pages became one.** `index.php` / `indexe.php` / `indexf.php` were
   near-identical 350-line copies that had already drifted apart. There is now
   one `views/portal.ejs` plus a string table per language, and because each
   table must satisfy the `Strings` interface, a missing string is a compile
   error instead of a blank spot on a page nobody checked.
2. **Escaping stopped being a thing you remember to do.** EJS escapes every
   `<%= %>` by default, replacing the hand-called `e()` helper. On the client,
   the tracker result is built with `createElement`/`textContent` instead of an
   `innerHTML` template, so that XSS surface is removed rather than guarded.
3. **Guards are per-endpoint.** `admin.php` dispatched the dashboard, status
   changes and deletes from one file by sniffing POST keys, behind a single
   `if` at the top. They are three routes now, each declaring `requireAdmin`
   and `requireCsrf` in its own signature.

---

## What it does

### Public portal — `src/routes/portal.ts`

| Route | Purpose |
|-------|---------|
| `GET /` | Redirect to a locale negotiated from `Accept-Language` |
| `GET /:locale` | The portal page (`rw` \| `en` \| `fr`) |
| `POST /:locale` | Submit a report — posts to itself, so it works without JS |
| `GET /:locale/track` | JSON status lookup |

One page carrying a hero, live statistics, the tracker, the submission form and
a public feed. The form collects:

| Field | Required | Cap |
|-------|----------|-----|
| Category | yes | `full-bin`, `blocked-drain`, `illegal-dumping`, `litter`, `other` |
| Urgency | yes | `low`, `medium`, `high` |
| Location | yes | 100 chars |
| Sector | no | 50 chars |
| Details | no | 2000 chars |
| Name | no | 50 chars |
| Contact | no | 50 chars |

On success the visitor gets a reference code, `CK-<id>`.

**Tracking** returns status and non-identifying details only — reporter name,
contact and IP are not in the SELECT, so a template mistake cannot leak them.

**Statistics** are real counts. The PHP original fell back to hardcoded figures
(124/92/32, a fixed 94.3%) on an empty table, showing visitors numbers that were
not true; an empty table now reports zero and an em dash.

**Languages:** Kinyarwanda (default), English, French — `src/i18n/`.

### Admin — `src/routes/admin.ts`, `src/routes/auth.ts`

| Route | Purpose |
|-------|---------|
| `GET /admin` | Counters, top-3 hotspots, every report (high urgency first, then newest) |
| `POST /admin/status` | Change status — `pending` / `notdone` / `done` (AJAX, JSON) |
| `POST /admin/delete` | Delete a report (AJAX, JSON) |
| `GET`/`POST /login` | Sign in — per-IP rate limit plus per-account lockout |
| `POST /logout` | POST + CSRF, so an external page cannot force a sign-out |
| `GET`/`POST /setup` | First-run account creation; disables itself once one account exists |
| `GET /healthz` | Liveness check |

Dashboard rows show reporter name and contact, so the page is served
`noindex` + `no-store`. Client-side search and keyboard-reachable filter
checkboxes narrow the list; deletion goes through a real focus-trapping modal
rather than `window.confirm()`.

---

## Interface

**Design system.** `public/style.css` holds the tokens and public components, and
`public/admin.css` the staff app. The palette is Kigali at dawn, with full light and
dark themes defined as tokens. The pattern and the logo come from imigongo, the
geometric art of Rwanda. Headings use Bricolage Grotesque and text uses Figtree, both
self-hosted under the SIL Open Font License, because the CSP allows no font hosts.

**Navigation.** The public site has a floating bar on wide screens and a bottom tab
bar on phones. Staff get a side rail that folds to icons, then a top bar and tabs on
a phone.

**App behaviour.** The report form is a four-step flow. Staff work in a slide-over
panel on each report, with `/` to search and `j`, `k`, Enter and Escape to move. The
home page and dashboard refresh themselves (`/:locale/stats.json`, `/admin/live`), and
the tracker remembers references on the device. Pages cross-fade with view transitions
where the browser supports them.

**Without JavaScript.** Everything still works: the form shows all its steps at once,
and menus and the staff panel are native `<details>` elements. All motion respects
`prefers-reduced-motion`.

---

## Workflow and features added in the modernisation pass

**Report lifecycle.** Five statuses: `pending` (Received), `in_progress`, `done`,
`notdone` and `reopened`. Allowed moves live in `src/lib/workflow.ts` and are
enforced under a row lock in `src/services/reports.ts`. Only a reporter can set
`reopened`. Every change is written to `report_events`, which drives the history
on the tracker and the dashboard. Staff notes are internal unless marked public.

**Service targets.** High 24 hours, medium 3 days, low 7 days, set in
`src/config.ts`. Open reports are on track, due soon or overdue. A reopened report
gets a fresh deadline.

**Priority queue.** The dashboard sorts by a score combining urgency, deadline,
linked reports, disputes and age. It lists every open report plus the 200 most
recently closed; the CSV export holds the full archive.

**References.** New reports get `CK-<id>-<token>`, and a lookup must present the
token. Older reports with no token still answer to `CK-<id>`, but cannot give
feedback.

**Reporter feedback.** On a closed report the reference holder can confirm the fix
or dispute it within 14 days (`POST /:locale/track/feedback`).

**Duplicate detection.** A new report is linked, never merged, to an open report of
the same category from the last 7 days: within 150 m when both have GPS, otherwise
in the same cell (`src/lib/duplicates.ts`).

**Photos and GPS.** One optional photo per report, re-encoded in the browser and
stripped of metadata again on the server (`src/lib/image.ts`), stored in `uploads/`
and served from `/media/:name` under an unguessable name. GPS is optional and kept
only when plausible for Kigali. Neither appears on the public feed.

**Insights and export.** `/admin/insights` shows trends and targets as server-rendered
SVG. `/admin/export.csv` is scoped to the viewer, audited, guarded against spreadsheet
formulas, and leaves out IP addresses.

**Installable site.** A manifest and service worker (`public/sw.js`) cache static
assets and show an offline notice. Report drafts stay on the device, without name or
contact details.

**Tests.** `npm test` runs the unit tests in `test/` against the pure logic. There
is no automated browser or database test suite in the repository yet.

---

## Structure

```
Clean/
├── src/
│   ├── server.ts              Bootstrap; middleware order is documented and deliberate
│   ├── config.ts              Env-driven settings, limits, controlled vocabularies
│   ├── db.ts                  Pool, schema bootstrap, error logging
│   ├── types.ts               Shared row and response shapes
│   ├── middleware/
│   │   ├── security.ts        Helmet, CSP, Permissions-Policy, client IP  <- was .htaccess
│   │   ├── session.ts         Hardened sessions, idle + absolute timeouts
│   │   ├── csrf.ts            Hand-rolled token issue/verify (csurf is unmaintained)
│   │   ├── auth.ts            Access gate, open-redirect guard
│   │   └── rateLimit.ts       DB-backed per-IP sliding windows
│   ├── routes/                portal · auth · admin
│   ├── services/              reports · admins · audit
│   ├── lib/                   validate · format
│   ├── i18n/                  rw · en · fr, each typed against one interface
│   └── client/                app.ts, admin.ts -> compiled to public/js/
├── views/                     EJS templates — never web-served
├── public/                    The only web-served directory (CSS + compiled JS)
├── logs/app-error.log         Server-side errors, gitignored
├── _archive/php-legacy/       The retired PHP app + a map of where each file went
├── .env / .env.example        Config; .env gitignored
└── SECURITY.md                Controls, verification notes, go-live checklist
```

### Commands

```bash
npm run dev        # tsx watch src/server.ts
npm run build      # server -> dist/, client -> public/js/
npm start          # node dist/server.js
npm run typecheck  # server, client and tests, no output
npm test           # unit tests for the pure logic in src/lib
```

`tsconfig.json` is strict throughout, including `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` — the stated point being that the port loses its
value if those are relaxed. **`npm run typecheck` currently passes clean.**

### Database — `umuganda`

Created on startup by `src/db.ts`; there is no migration step to run. It fails
loudly at boot rather than on the first request that needs it.

| Table | Purpose |
|-------|---------|
| `reports` | Submissions, plus `status` and submitter IP. Indexed on status, urgency, time. |
| `admin_users` | Dashboard accounts: bcrypt hash, last login, failure counter, lockout expiry. |
| `rate_limits` | Sliding-window event log; old rows swept opportunistically (~2% of writes). |
| `audit_log` | Who did what, when, from where — status changes, notes, exports, deletions, logins, lockouts. |
| `report_events` | Each report's history: status moves, notes (public or internal), reporter confirmations and disputes, linked reports. |
| `sessions` | Session store, created by express-mysql-session; expired rows swept every 15 min. |

Sessions live in MySQL, not in process memory, so a restart does not sign every
admin out and a second process would see the same sessions.

---

## Security posture

`SECURITY.md` is the authority; in brief:

- **Authentication** — bcrypt hashes; 5 failures locks the account for 15
  minutes; a wrong password and an unknown username give the same message *and*
  pay the same hash cost, so the form cannot be used to enumerate accounts by
  response or by timing; session id regenerated on success.
- **Sessions** — HttpOnly, SameSite=Lax, Secure over HTTPS, 30-minute idle and
  12-hour absolute timeouts enforced server-side as well as via cookie maxAge.
- **CSRF** — per-session token, constant-time compare, accepted from the form
  body or an `X-CSRF-Token` header.
- **Input validation** — enums checked against fixed lists; free text trimmed,
  stripped of control characters and capped in *code points* so MySQL never
  silently truncates; references parsed with a strict `CK-<digits>` pattern.
- **Rate limiting** — 5 submissions/hour, 30 tracker lookups/10 min, 15 login
  attempts/15 min, per IP. An attempt is only *recorded* once the action
  succeeds, so a mistyped form does not burn the visitor's quota. A limiter that
  has itself broken logs and allows the request through rather than locking
  people out of a public service.
- **Proxy trust** — `X-Forwarded-For` is honoured only when `TRUST_PROXY=true`,
  because that value gates the limiter.
- **Disclosure** — SQL errors go to `logs/app-error.log`, never to the response;
  `x-powered-by` disabled; public queries select only non-identifying columns.

---

## Current state (verified 2026-08-21)

- **Typecheck passes** on both the server and client projects.
- **The entire port is uncommitted.** Last commit is `6bdd875`, the PHP-era
  security hardening. `src/`, `views/`, `package.json`, the tsconfigs and
  `.env.example` are all untracked; the PHP -> `_archive/` moves are staged.
  This is the single biggest risk right now — a large body of finished work
  exists only in the working tree.
- **MySQL is not currently running**, so live row counts could not be checked.
- **No build output.** `dist/` does not exist; `public/js/` holds compiled
  scripts from 2026-08-17. Run `npm run build` before `npm start`.

### Before going live

**Required**

1. **Stop connecting as `root` with an empty password** (the XAMPP default).
   Create a dedicated user with only `SELECT, INSERT, UPDATE, DELETE` on
   `umuganda`.
2. **Set `SESSION_SECRET`** — production refuses to start without it.
3. **Serve over HTTPS**, then set `FORCE_SECURE_COOKIE=true`.
4. **Set `NODE_ENV=production`** so error detail stops reaching responses.
5. **Set `SETUP_TOKEN`** before deploying, or remove the `/setup` route.
6. **Set `TRUST_PROXY=true` only if** a reverse proxy is genuinely in front.

**Recommended**

7. **Older references stay guessable.** New reports carry a token, but reports
   filed before tokens existed still answer to a bare `CK-<id>`, behind the rate
   limit, so that references already handed out keep working.
8. **No retention policy.** Reporter contact details and IPs are kept
   indefinitely. If Rwanda's data protection law applies, this needs a written
   policy — the short notice beside the contact fields is not one.
9. **Paginate the dashboard.** It loads every open report plus the 200 most recently
   closed, so a very large open backlog would still be one long page.
10. **Drop `'unsafe-inline'` from `style-src`** once confirmed against every page.
11. **Back up the database and `uploads/`** on a schedule, and test a restore.
