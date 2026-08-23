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
import { districtOptions } from '../lib/areas';
import { asStatus } from '../lib/validate';
import { currentAdmin, currentScope, isSuperadmin, requireAdmin, requireSuperadmin } from '../middleware/auth';
import { requireCsrf, csrfToken } from '../middleware/csrf';
import { clientIp, noIndex } from '../middleware/security';
import { changePassword, createLeader, listAccounts, setAccountActive } from '../services/admins';
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
  cell: string;
  village: string;
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
    // One scope, computed once and passed to every query. A superadmin gets
    // null (everything); a leader gets their own cell.
    const scope = currentScope(req);
    const [stats, hotspots, rows] = await Promise.all([
      adminStats(scope),
      topLocations(3, scope),
      allReportsForAdmin(scope),
    ]);

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
        cell: row.cell === null || row.cell === '' ? 'Unspecified' : row.cell,
        village: row.village === null || row.village === '' ? '' : row.village,
        details: row.details === null || row.details === '' ? 'No additional description.' : row.details,
        search: [reference, location, sector, row.cell ?? '', row.village ?? '', reporterName, categoryKey, row.details ?? '']
          .join(' ')
          .toLowerCase(),
      };
    });

    res.render('admin', {
      csrfToken: csrfToken(req),
      admin: currentAdmin(req),
      isSuper: isSuperadmin(req),
      scopeLabel: scope === null ? null : scope.cell,
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
    const changed = await updateReportStatus(id, status, currentScope(req));
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
 * Accounts — superadmin only
 *
 * requireSuperadmin sits on every one of these, immediately after
 * requireAdmin, rather than being checked once inside a handler. A leader
 * reaching any of them gets 403 and never touches the query underneath.
 * ---------------------------------------------------------------------- */

/** Render the accounts page, optionally with the outcome of an action. */
async function renderAccounts(
  req: import('express').Request,
  res: import('express').Response,
  options: { error?: string | undefined; notice?: string | undefined; status?: number },
): Promise<void> {
  const accounts = await listAccounts();
  if (options.status !== undefined) res.status(options.status);
  res.render('accounts', {
    csrfToken: csrfToken(req),
    admin: currentAdmin(req),
    adminId: req.session.adminId ?? 0,
    accounts,
    districts: districtOptions(),
    error: options.error ?? null,
    notice: options.notice ?? null,
    portalHref: `/${DEFAULT_LOCALE}`,
  });
}

adminRouter.get('/admin/accounts', noIndex, requireAdmin(false), requireSuperadmin(false), async (req, res, next) => {
  try {
    await renderAccounts(req, res, {});
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/admin/accounts',
  noIndex,
  requireAdmin(false),
  requireSuperadmin(false),
  requireCsrf(false),
  async (req, res, next) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await createLeader(
        {
          username: body['username'],
          password: body['password'],
          district: body['district'],
          sector: body['sector'],
          cell: body['cell'],
        },
        currentAdmin(req),
        clientIp(req),
      );

      await renderAccounts(req, res, {
        error: result.ok ? undefined : result.message,
        notice: result.ok ? result.message : undefined,
        status: result.ok ? 200 : 400,
      });
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.post(
  '/admin/accounts/active',
  noIndex,
  requireAdmin(false),
  requireSuperadmin(false),
  requireCsrf(false),
  async (req, res, next) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const targetId = Number.parseInt(String(body['id'] ?? ''), 10);
      const active = body['active'] === '1';

      if (!Number.isInteger(targetId) || targetId <= 0) {
        await renderAccounts(req, res, { error: 'Invalid request.', status: 400 });
        return;
      }

      const result = await setAccountActive(
        targetId,
        active,
        req.session.adminId ?? 0,
        currentAdmin(req),
        clientIp(req),
      );

      await renderAccounts(req, res, {
        error: result.ok ? undefined : result.message,
        notice: result.ok ? result.message : undefined,
        status: result.ok ? 200 : 400,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* -------------------------------------------------------------------------
 * Delete
 * ---------------------------------------------------------------------- */

// Deletion destroys the record a resident's report and the audit trail point
// at, so it stays with the superadmin. requireSuperadmin runs after
// requireAdmin, so a leader gets 403 rather than being bounced to sign-in.
adminRouter.post(
  '/admin/delete',
  noIndex,
  requireAdmin(true),
  requireSuperadmin(true),
  requireCsrf(true),
  async (req, res) => {
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
  },
);
