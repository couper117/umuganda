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
 *   GET  /:locale/reports        → the full public feed
 *
 * The form still posts to a real path rather than to a script, so submission
 * works with JavaScript disabled — the property the three PHP pages had and
 * which is worth keeping.
 *
 * Note the JSON lookup moved from `/:locale/track` to `/:locale/track/lookup`,
 * because `/:locale/track` is now an HTML page. src/client/app.ts calls the new
 * path.
 */

import { Router } from 'express';
import { VALID_CATEGORIES, VALID_URGENCIES, config } from '../config';
import { logError } from '../db';
import { asLocale, languageOptions, negotiateLocale, strings, type Locale } from '../i18n';
import { formatDate, formatDateTime, referenceCode } from '../lib/format';
import { parseReference, validateReport } from '../lib/validate';
import { csrfToken, csrfVerify } from '../middleware/csrf';
import { rateCheck, rateRecord } from '../middleware/rateLimit';
import { clientIp } from '../middleware/security';
import { createReport, findPublicReport, normaliseStatus, portalStats, recentReports } from '../services/reports';
import type { PublicReport, TrackResponse } from '../types';

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
  statusKey: 'pending' | 'done' | 'notdone';
  statusLabel: string;
  dateLabel: string;
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
 * References are sequential, so this endpoint is the obvious target for a
 * CK-1, CK-2, CK-3… scrape. The rate limit is what makes that impractical, and
 * the response deliberately omits reporter name, contact and IP — the query
 * does not select them.
 *
 * Declared before the page routes so 'track' is never read as something else.
 * ---------------------------------------------------------------------- */

portalRouter.get('/:locale/track/lookup', async (req, res) => {
  const locale = asLocale(req.params.locale);
  if (locale === undefined) {
    res.status(404).json({ success: false, message: 'Unknown language.' } satisfies TrackResponse);
    return;
  }

  const t = strings(locale);
  const ip = clientIp(req);

  if (!(await rateCheck('track', ip, config.rateTrack.max, config.rateTrack.windowSeconds))) {
    res.status(429).json({ success: false, message: t.errors.trackLimited } satisfies TrackResponse);
    return;
  }
  await rateRecord('track', ip);

  const id = parseReference(req.query.reference);
  if (id === null) {
    res.json({ success: false, message: t.errors.unknownRef } satisfies TrackResponse);
    return;
  }

  const report = await findPublicReport(id);
  if (report === undefined) {
    res.json({ success: false, message: t.errors.unknownRef } satisfies TrackResponse);
    return;
  }

  res.json({
    success: true,
    data: {
      id: referenceCode(report.id),
      time: formatDateTime(report.time),
      category: report.category,
      urgency: report.urgency,
      location: report.location,
      sector: report.sector === null || report.sector === '' ? t.feed.defaultSector : report.sector,
      details: report.details === null || report.details === '' ? t.tracker.noDetails : report.details,
      status: normaliseStatus(report.status),
    },
  } satisfies TrackResponse);
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
    prefill: typeof req.query.ref === 'string' ? req.query.ref.slice(0, 20) : '',
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
  options: { reference?: string | undefined; error?: string | undefined; status?: number },
): void {
  const t = strings(locale);
  if (options.status !== undefined) res.status(options.status);
  res.render('report', {
    ...baseView(locale, csrf, 'report'),
    meta: t.pages.report,
    categories: VALID_CATEGORIES,
    urgencies: VALID_URGENCIES,
    reference: options.reference ?? null,
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
 * Submit a report.
 *
 * Order matters and is carried over from the PHP: CSRF first, then the rate
 * limit, then validation. The rate limiter only *records* an attempt once the
 * insert has succeeded, so a visitor who mistypes a field does not burn their
 * hourly quota on validation errors.
 */
portalRouter.post('/:locale/report', async (req, res, next) => {
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

    let insertedId: number;
    try {
      insertedId = await createReport(validated.data, ip);
    } catch (err) {
      // Detail to the log, generic message to the visitor.
      logError('Report insert failed', err);
      renderReport(res, locale, csrfToken(req), { error: t.errors.submitError, status: 500 });
      return;
    }

    await rateRecord('submit', ip);

    renderReport(res, locale, csrfToken(req), { reference: referenceCode(insertedId) });
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
