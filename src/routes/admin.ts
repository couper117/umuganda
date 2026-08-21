/**
 * routes/admin.ts — the dashboard.
 *
 * Ports admin.php.
 *
 *   GET  /admin                → the queue, counters and hotspots
 *   POST /admin/status         → change a report's status  (AJAX, JSON)
 *   POST /admin/delete         → delete a report           (AJAX, JSON)
 *
 * The PHP version dispatched all three from one file by sniffing POST keys.
 * Splitting them into real routes means requireAdmin and requireCsrf are
 * declared per endpoint rather than guarded by an `if` at the top, so an
 * endpoint cannot be added later that silently skips them.
 *
 * Every endpoint here is behind requireAdmin. The two JSON ones pass `true` so a
 * lapsed session yields 401 JSON, which admin.js turns into a redirect, instead
 * of an HTML login page arriving where JSON was expected.
 */

import { Router } from 'express';
import { VALID_CATEGORIES, VALID_URGENCIES } from '../config';
import { logError } from '../db';
import { DEFAULT_LOCALE, strings } from '../i18n';
import { formatDateTime, referenceCode } from '../lib/format';
import { asStatus } from '../lib/validate';
import { currentAdmin, requireAdmin } from '../middleware/auth';
import { requireCsrf, csrfToken } from '../middleware/csrf';
import { clientIp, noIndex } from '../middleware/security';
import { changePassword } from '../services/admins';
import { audit } from '../services/audit';
import {
  adminStats,
  allReportsForAdmin,
  deleteReport,
  normaliseStatus,
  topLocations,
  updateReportStatus,
} from '../services/reports';

export const adminRouter = Router();

/** The dashboard is English-only, as admin.php was. */
const t = strings('en');

/** A report shaped for the dashboard template. */
interface AdminCard {
  id: number;
  reference: string;
  categoryKey: string;
  categoryLabel: string;
  urgencyKey: string;
  urgencyLabel: string;
  statusKey: 'pending' | 'done' | 'notdone';
  statusLabel: string;
  time: string;
  location: string;
  sector: string;
  reporterName: string;
  contact: string;
  ip: string;
  details: string;
  /** Lowercased haystack for the client-side search. */
  search: string;
}

function safeKey(value: string | null, allowed: readonly string[], fallback: string): string {
  return value !== null && allowed.includes(value) ? value : fallback;
}

/* -------------------------------------------------------------------------
 * Dashboard
 * ---------------------------------------------------------------------- */

adminRouter.get('/admin', noIndex, requireAdmin(false), async (req, res, next) => {
  try {
    const [stats, hotspots, rows] = await Promise.all([adminStats(), topLocations(3), allReportsForAdmin()]);

    const cards: AdminCard[] = rows.map((row) => {
      const categoryKey = safeKey(row.category, VALID_CATEGORIES, 'other');
      const urgencyKey = safeKey(row.urgency, VALID_URGENCIES, 'low');
      const statusKey = normaliseStatus(row.status);
      const location = row.location ?? '';
      const sector = row.sector === null || row.sector === '' ? 'Unspecified' : row.sector;
      const reporterName = row.name === null || row.name === '' ? 'Anonymous' : row.name;
      const reference = referenceCode(row.id);

      return {
        id: row.id,
        reference,
        categoryKey,
        categoryLabel: t.categories[categoryKey as keyof typeof t.categories],
        urgencyKey,
        urgencyLabel: t.urgencies[urgencyKey as keyof typeof t.urgencies],
        statusKey,
        statusLabel: t.statuses[statusKey],
        time: formatDateTime(row.time),
        location,
        sector,
        reporterName,
        contact: row.contact === null || row.contact === '' ? 'None' : row.contact,
        ip: row.ip ?? '',
        details: row.details === null || row.details === '' ? 'No additional description.' : row.details,
        search: [reference, location, sector, reporterName, categoryKey, row.details ?? '']
          .join(' ')
          .toLowerCase(),
      };
    });

    res.render('admin', {
      csrfToken: csrfToken(req),
      admin: currentAdmin(req),
      stats,
      hotspots,
      cards,
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Status change
 * ---------------------------------------------------------------------- */

adminRouter.post('/admin/status', noIndex, requireAdmin(true), requireCsrf(true), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const id = Number.parseInt(String(body['id'] ?? ''), 10);
  const status = asStatus(body['status']);

  if (!Number.isInteger(id) || id <= 0 || status === null) {
    res.status(400).json({ success: false, message: 'Invalid request.' });
    return;
  }

  try {
    const changed = await updateReportStatus(id, status);
    if (!changed) {
      res.status(404).json({ success: false, message: 'That report no longer exists.' });
      return;
    }

    await audit(currentAdmin(req), 'status_change', {
      targetId: id,
      detail: `Set to ${status}`,
      ip: clientIp(req),
    });

    res.json({ success: true, status, label: t.statuses[status] });
  } catch (err) {
    logError(`Status update failed for report ${id}`, err);
    res.status(500).json({ success: false, message: 'Could not update the report. Please try again.' });
  }
});

/* -------------------------------------------------------------------------
 * Change your own password
 *
 * A page post rather than one of the AJAX endpoints: it rotates the session,
 * and a full page load is the clearest way to land the visitor back on a page
 * that is definitely using the new one.
 * ---------------------------------------------------------------------- */

adminRouter.get('/admin/password', noIndex, requireAdmin(false), (req, res) => {
  res.render('password', {
    csrfToken: csrfToken(req),
    admin: currentAdmin(req),
    error: null,
    changed: false,
    portalHref: `/${DEFAULT_LOCALE}`,
  });
});

adminRouter.post('/admin/password', noIndex, requireAdmin(false), requireCsrf(false), async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const result = await changePassword(
      req,
      body['current_password'],
      body['new_password'],
      body['confirm_password'],
      clientIp(req),
    );

    // csrfToken() is read after the call, not before: a successful change
    // regenerates the session, which issues a fresh token.
    res.status(result.ok ? 200 : 400).render('password', {
      csrfToken: csrfToken(req),
      admin: currentAdmin(req),
      error: result.ok ? null : result.message,
      changed: result.ok,
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Delete
 * ---------------------------------------------------------------------- */

adminRouter.post('/admin/delete', noIndex, requireAdmin(true), requireCsrf(true), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const id = Number.parseInt(String(body['id'] ?? ''), 10);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: 'Invalid request.' });
    return;
  }

  try {
    const removed = await deleteReport(id);
    if (!removed) {
      res.status(404).json({ success: false, message: 'That report no longer exists.' });
      return;
    }

    await audit(currentAdmin(req), 'report_deleted', { targetId: id, ip: clientIp(req) });

    res.json({ success: true });
  } catch (err) {
    logError(`Delete failed for report ${id}`, err);
    res.status(500).json({ success: false, message: 'Could not delete the report. Please try again.' });
  }
});
