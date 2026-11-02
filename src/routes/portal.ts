/**
 * routes/portal.ts — the public portal.
 *
 * The portal used to be a single page carrying the hero, statistics, tracker,
 * submission form and feed all at once. It is four pages now:
 *
 *   GET  /                       → redirect to the negotiated locale
 *   GET  /:locale                → home: hero, statistics, how it works, recent
 *   GET  /:locale/report         → the submission form
 *   POST /:locale/report         → submit a report
 *   GET  /:locale/track          → the tracker page
 *   GET  /:locale/track/lookup   → JSON status lookup (called by the browser)
 *   POST /:locale/track/feedback → the reporter confirms or disputes a closure
 *   GET  /:locale/stats.json     → live counters for the home page
 *   GET  /:locale/reports        → the full public feed
 *   GET  /media/:name            → a report photo, by its unguessable name
 *
 * The form still posts to a real path rather than to a script, so submission
 * works with JavaScript disabled — the property the three PHP pages had and
 * which is worth keeping.
 *
 * Note the JSON lookup moved from `/:locale/track` to `/:locale/track/lookup`,
 * because `/:locale/track` is now an HTML page. src/client/app.ts calls the new
 * path.
 */

import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { VALID_CATEGORIES, VALID_URGENCIES, config, type Status } from '../config';
import { logError } from '../db';
import { asLocale, languageOptions, negotiateLocale, strings, type Locale } from '../i18n';
import { districtOptions } from '../lib/areas';
import { formatDate, formatDateTime } from '../lib/format';
import { formatReference, parseReference, referenceMatches } from '../lib/reference';
import { cleanText, validateReport } from '../lib/validate';
import { feedbackOptions, isOpen } from '../lib/workflow';
import { csrfToken, csrfVerify } from '../middleware/csrf';
import { rateCheck, rateRecord } from '../middleware/rateLimit';
import { clientIp, noIndex } from '../middleware/security';
import { isMediaName, mediaPath, mediaUrl, removePhoto, savePhoto } from '../services/media';
import {
  createReport,
  findTrackedReport,
  normaliseStatus,
  portalStats,
  publicEvents,
  recentReports,
  residentFeedback,
} from '../services/reports';
import type { FeedbackResponse, PublicReport, TrackEvent, TrackPayload, TrackResponse, TrackedReport } from '../types';

export const portalRouter = Router();

/** How many reports the home page previews before linking to the full feed. */
const HOME_FEED_LIMIT = 6;

/** How many the feed page itself shows. */
const FEED_LIMIT = 40;

/** A feed row shaped for the templates. */
interface FeedRow {
  location: string;
  sector: string | null;
  categoryKey: string;
  categoryLabel: string;
  urgencyKey: string;
  urgencyLabel: string;
  statusKey: Status;
  statusLabel: string;
  dateLabel: string;
  /** Still needs work, for the feed's Open / Resolved filter. */
  isOpen: boolean;
  /** Lowercased haystack for the client-side search on the feed page. */
  search: string;
}

function toFeedRow(report: PublicReport, locale: Locale): FeedRow {
  const t = strings(locale);
  const statusKey = normaliseStatus(report.status);

  // Fall back to a known key so an unexpected column value still renders a
  // valid icon and label rather than an undefined lookup.
  const categoryKey = (VALID_CATEGORIES as readonly string[]).includes(report.category ?? '')
    ? (report.category as string)
    : 'other';
  const urgencyKey = (VALID_URGENCIES as readonly string[]).includes(report.urgency ?? '')
    ? (report.urgency as string)
    : 'low';

  const location = report.location ?? '';
  const sector = report.sector;

  return {
    location,
    sector,
    categoryKey,
    categoryLabel: t.categories[categoryKey as keyof typeof t.categories],
    urgencyKey,
    urgencyLabel: t.urgencies[urgencyKey as keyof typeof t.urgencies],
    statusKey,
    statusLabel: t.statuses[statusKey],
    dateLabel: formatDate(report.time),
    isOpen: isOpen(statusKey),
    search: [location, sector ?? '', t.categories[categoryKey as keyof typeof t.categories]].join(' ').toLowerCase(),
  };
}

/**
 * Everything every page needs: strings, the language switcher, the CSRF token
 * and which nav item to mark current.
 */
function baseView(locale: Locale, csrf: string, current: string): Record<string, unknown> {
  const t = strings(locale);
  return {
    t,
    locale,
    languages: languageOptions(),
    csrfToken: csrf,
    current,
    year: new Date().getFullYear(),
    // Stringified here rather than in the template so the template does not
    // need to know it is JSON. EJS escapes it into the attribute.
    clientStrings: JSON.stringify(t.client),
  };
}

/* -------------------------------------------------------------------------
 * Root
 * ---------------------------------------------------------------------- */

portalRouter.get('/', (req, res) => {
  res.redirect(302, `/${negotiateLocale(req.get('Accept-Language'))}`);
});

/* -------------------------------------------------------------------------
 * Tracker lookup (JSON)
 *
 * A reference is CK-<id>-<token>, and the token is what makes it unguessable:
 * walking CK-1, CK-2, CK-3 finds nothing for any report that has one. Reports
 * filed before tokens existed still answer to their bare CK-<id>, and the rate
 * limit below is what keeps those from being scraped. A wrong token and a
 * missing report give the same answer, so a guess cannot confirm that an id
 * exists.
 *
 * The response never carries reporter name, contact or IP: the query does not
 * select them. Declared before the page routes so 'track' is never read as
 * something else.
 * ---------------------------------------------------------------------- */

/** Look a report up by what the visitor typed. Undefined means "no such report". */
async function resolveReference(value: unknown): Promise<{ report: TrackedReport; token: string | null } | undefined> {
  const parsed = parseReference(value);
  if (parsed === null) return undefined;

  const report = await findTrackedReport(parsed.id);
  if (report === undefined || !referenceMatches(report.public_token, parsed.token)) return undefined;

  return { report, token: parsed.token };
}

/** Everything the tracker shows for a report the visitor has unlocked. */
async function trackPayload(report: TrackedReport, locale: Locale, now: Date = new Date()): Promise<TrackPayload> {
  const t = strings(locale);
  const status = normaliseStatus(report.status);
  const open = isOpen(status);

  const events: TrackEvent[] = [{ kind: 'created', time: formatDateTime(report.time), status: null, note: null }];
  for (const event of await publicEvents(report.id)) {
    events.push({
      kind: event.kind,
      time: formatDateTime(event.occurred_at),
      status: event.status_to === null ? null : normaliseStatus(event.status_to),
      note: event.note,
    });
  }

  // Feedback needs the token: a legacy reference is a guessable number, and a
  // guessable number should not be able to reopen somebody's report.
  const hasToken = report.public_token !== null && report.public_token !== '';
  const options = hasToken
    ? feedbackOptions(status, report.resolved_at, report.confirmed_at, now)
    : { canConfirm: false, canReopen: false };

  return {
    id: formatReference(report.id, report.public_token),
    time: formatDateTime(report.time),
    category: report.category,
    urgency: report.urgency,
    location: report.location,
    sector: report.sector === null || report.sector === '' ? t.feed.defaultSector : report.sector,
    details: report.details === null || report.details === '' ? t.tracker.noDetails : report.details,
    status,
    dueBy: open && report.due_at !== null ? formatDate(report.due_at) : null,
    overdue: open && report.due_at !== null && report.due_at.getTime() < now.getTime(),
    photoUrl: mediaUrl(report.photo),
    events,
    canConfirm: options.canConfirm,
    canReopen: options.canReopen,
    confirmed: report.confirmed_at !== null,
  };
}

portalRouter.get('/:locale/track/lookup', async (req, res) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    res.status(404).json({ success: false, message: 'Unknown language.' } satisfies TrackResponse);
    return;
  }

  const t = strings(locale);
  const ip = clientIp(req);

  try {
    if (!(await rateCheck('track', ip, config.rateTrack.max, config.rateTrack.windowSeconds))) {
      res.status(429).json({ success: false, message: t.errors.trackLimited } satisfies TrackResponse);
      return;
    }
    await rateRecord('track', ip);

    const found = await resolveReference(req.query.reference);
    if (found === undefined) {
      res.json({ success: false, message: t.errors.unknownRef } satisfies TrackResponse);
      return;
    }

    res.json({ success: true, data: await trackPayload(found.report, locale) } satisfies TrackResponse);
  } catch (err) {
    logError('Tracker lookup failed', err);
    res.status(500).json({ success: false, message: t.errors.submitError } satisfies TrackResponse);
  }
});

/* -------------------------------------------------------------------------
 * Reporter feedback
 *
 * The person who reported a problem is the only one who can say whether it was
 * really fixed, so they get a say. It takes the full reference: holding the
 * token is what shows this is the reporter, and it shares the tracker's rate
 * limit so it cannot be used to probe for tokens any faster than a lookup.
 * ---------------------------------------------------------------------- */

portalRouter.post('/:locale/track/feedback', async (req, res) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    res.status(404).json({ success: false, message: 'Unknown language.' } satisfies FeedbackResponse);
    return;
  }

  const t = strings(locale);
  const ip = clientIp(req);

  try {
    if (!csrfVerify(req)) {
      res.status(419).json({ success: false, message: t.errors.sessionExpired } satisfies FeedbackResponse);
      return;
    }

    if (!(await rateCheck('track', ip, config.rateTrack.max, config.rateTrack.windowSeconds))) {
      res.status(429).json({ success: false, message: t.errors.trackLimited } satisfies FeedbackResponse);
      return;
    }
    await rateRecord('track', ip);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = body['action'];
    const parsed = parseReference(body['reference']);

    if ((action !== 'confirm' && action !== 'reopen') || parsed === null || parsed.token === null) {
      res.status(400).json({ success: false, message: t.errors.feedbackNotAllowed } satisfies FeedbackResponse);
      return;
    }

    const found = await resolveReference(body['reference']);
    if (found === undefined) {
      res.status(404).json({ success: false, message: t.errors.unknownRef } satisfies FeedbackResponse);
      return;
    }

    const note = cleanText(body['note'], config.limits.note);
    const result = await residentFeedback(found.report.id, action, note);
    if (!result.ok) {
      res.status(409).json({ success: false, message: t.errors.feedbackNotAllowed } satisfies FeedbackResponse);
      return;
    }

    const fresh = await findTrackedReport(found.report.id);
    if (fresh === undefined) {
      res.status(404).json({ success: false, message: t.errors.unknownRef } satisfies FeedbackResponse);
      return;
    }

    res.json({
      success: true,
      data: await trackPayload(fresh, locale),
      message: action === 'confirm' ? t.client.feedbackConfirmed : t.client.feedbackReopened,
    } satisfies FeedbackResponse);
  } catch (err) {
    logError('Reporter feedback failed', err);
    res.status(500).json({ success: false, message: t.errors.submitError } satisfies FeedbackResponse);
  }
});

/* -------------------------------------------------------------------------
 * Report photos
 *
 * The name is checked against exactly the shape services/media.ts generates
 * before it goes near the filesystem, so a path cannot be smuggled in. Marked
 * private: these are pictures of real streets, sometimes with people in them,
 * and have no business in a shared cache or a search index.
 * ---------------------------------------------------------------------- */

portalRouter.get('/media/:name', noIndex, (req, res, next) => {
  const name = req.params.name;
  if (!isMediaName(name)) {
    next();
    return;
  }
  res.sendFile(mediaPath(name), { headers: { 'Cache-Control': 'private, max-age=3600' } }, (err) => {
    if (err !== undefined && !res.headersSent) next();
  });
});

/* -------------------------------------------------------------------------
 * Live counters
 *
 * Polled by every open home page, so the answer is shared for a few seconds.
 * However many visitors are watching, this costs one COUNT per window.
 * ---------------------------------------------------------------------- */

const STATS_TTL_MS = 15_000;
const statsCache = new Map<Locale, { at: number; value: Awaited<ReturnType<typeof portalStats>> }>();

portalRouter.get('/:locale/stats.json', async (req, res, next) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }
  try {
    const cached = statsCache.get(locale);
    const now = Date.now();
    const value =
      cached !== undefined && now - cached.at < STATS_TTL_MS ? cached.value : await portalStats(strings(locale).stats.noData);
    if (cached === undefined || cached.value !== value) statsCache.set(locale, { at: now, value });
    res.setHeader('Cache-Control', 'no-store');
    res.json(value);
  } catch (err) {
    logError('Live stats failed', err);
    res.status(503).json({ error: 'unavailable' });
  }
});

/* -------------------------------------------------------------------------
 * Tracker page
 * ---------------------------------------------------------------------- */

portalRouter.get('/:locale/track', (req, res, next) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }

  const t = strings(locale);
  res.render('track', {
    ...baseView(locale, csrfToken(req), 'track'),
    meta: t.pages.track,
    // Lets someone arrive from the success page with the box pre-filled.
    prefill: typeof req.query.ref === 'string' ? req.query.ref.slice(0, 24) : '',
  });
});

/* -------------------------------------------------------------------------
 * Feed page
 * ---------------------------------------------------------------------- */

portalRouter.get('/:locale/reports', async (req, res, next) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }

  try {
    const t = strings(locale);
    const recent = await recentReports(FEED_LIMIT);
    res.render('feed', {
      ...baseView(locale, csrfToken(req), 'reports'),
      meta: t.pages.feed,
      reports: recent.map((r) => toFeedRow(r, locale)),
      categories: VALID_CATEGORIES,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Report form
 * ---------------------------------------------------------------------- */

/** The form page, optionally showing an error or the success panel. */
function renderReport(
  res: import('express').Response,
  locale: Locale,
  csrf: string,
  options: { reference?: string | undefined; linked?: boolean; error?: string | undefined; status?: number },
): void {
  const t = strings(locale);
  if (options.status !== undefined) res.status(options.status);
  res.render('report', {
    ...baseView(locale, csrf, 'report'),
    meta: t.pages.report,
    categories: VALID_CATEGORIES,
    urgencies: VALID_URGENCIES,
    districts: districtOptions(),
    reference: options.reference ?? null,
    linked: options.linked ?? false,
    error: options.error ?? null,
  });
}

portalRouter.get('/:locale/report', (req, res, next) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }
  renderReport(res, locale, csrfToken(req), {});
});

/**
 * Parses the multipart form, holding the photo in memory only long enough to
 * validate it. Limits are enforced while parsing, so an oversized body is cut
 * off rather than read in full first.
 */
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxBytes, files: 1, fields: 30, fieldSize: 16 * 1024, parts: 40 },
}).single('photo');

/**
 * Run the upload parser and turn its errors into the page they belong on. The
 * page render needs a CSRF token from the session, which is already loaded by
 * the time this runs, so a too-large photo costs the visitor a message rather
 * than an error page.
 */
function parseUpload(req: Request, res: Response, next: NextFunction): void {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }
  photoUpload(req, res, (err: unknown) => {
    if (err === undefined || err === null) {
      next();
      return;
    }
    const t = strings(locale);
    const tooLarge = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
    if (!(err instanceof multer.MulterError)) logError('Upload parsing failed', err);
    renderReport(res, locale, csrfToken(req), {
      error: tooLarge ? t.errors.photoTooLarge : t.errors.photoRejected,
      status: tooLarge ? 413 : 400,
    });
  });
}

/**
 * Submit a report.
 *
 * Order matters and is carried over from the PHP: CSRF first, then the rate
 * limit, then validation. The rate limiter only *records* an attempt once the
 * insert has succeeded, so a visitor who mistypes a field does not burn their
 * hourly quota on validation errors.
 *
 * The photo is written after validation and removed again if the insert fails,
 * so a rejected report never leaves a file behind.
 */
portalRouter.post('/:locale/report', parseUpload, async (req, res, next) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }

  const t = strings(locale);
  const ip = clientIp(req);

  try {
    if (!csrfVerify(req)) {
      renderReport(res, locale, csrfToken(req), { error: t.errors.sessionExpired, status: 419 });
      return;
    }

    if (!(await rateCheck('submit', ip, config.rateSubmit.max, config.rateSubmit.windowSeconds))) {
      renderReport(res, locale, csrfToken(req), { error: t.errors.submitLimited, status: 429 });
      return;
    }

    const validated = validateReport((req.body ?? {}) as Record<string, unknown>);
    if (!validated.ok) {
      renderReport(res, locale, csrfToken(req), { error: t.errors.invalidInput, status: 400 });
      return;
    }

    let photo: string | null = null;
    if (req.file !== undefined && req.file.size > 0) {
      photo = await savePhoto(req.file.buffer);
      if (photo === null) {
        renderReport(res, locale, csrfToken(req), { error: t.errors.photoRejected, status: 400 });
        return;
      }
    }

    let created;
    try {
      created = await createReport(validated.data, ip, photo);
    } catch (err) {
      // Detail to the log, generic message to the visitor.
      logError('Report insert failed', err);
      await removePhoto(photo);
      renderReport(res, locale, csrfToken(req), { error: t.errors.submitError, status: 500 });
      return;
    }

    await rateRecord('submit', ip);

    renderReport(res, locale, csrfToken(req), {
      reference: formatReference(created.id, created.token),
      linked: created.duplicateOf !== null,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Home
 *
 * Last of the /:locale routes, so the more specific paths above are matched
 * as themselves first.
 * ---------------------------------------------------------------------- */

portalRouter.get('/:locale', async (req, res, next) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    next();
    return;
  }

  try {
    const t = strings(locale);
    const [stats, recent] = await Promise.all([portalStats(t.stats.noData), recentReports(HOME_FEED_LIMIT)]);

    res.render('home', {
      ...baseView(locale, csrfToken(req), 'home'),
      meta: t.pages.home,
      stats,
      reports: recent.map((r) => toFeedRow(r, locale)),
    });
  } catch (err) {
    next(err);
  }
});
