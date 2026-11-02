/**
 * routes/admin.ts — the dashboard.
 *
 * Ports admin.php.
 *
 *   GET  /admin                → the queue, counters and hotspots
 *   GET  /admin/live           → current counters and newest report (AJAX, JSON)
 *   GET  /admin/insights       → trends, service targets and busiest cells
 *   GET  /admin/export.csv     → every report in scope, as a spreadsheet
 *   POST /admin/status         → change status and/or post a note (AJAX, JSON)
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
import { VALID_CATEGORIES, VALID_URGENCIES, config, type Status, type Urgency } from '../config';
import { logError } from '../db';
import { DEFAULT_LOCALE, strings } from '../i18n';
import { districtOptions } from '../lib/areas';
import { toCsv } from '../lib/csv';
import { formatDateTime } from '../lib/format';
import { mapLink } from '../lib/geo';
import { chartModel, fillDays, formatDuration, median, percent } from '../lib/insights';
import { formatReference } from '../lib/reference';
import { asStatus, cleanText } from '../lib/validate';
import { describeDue, isOpen, nextStatuses, priorityScore, slaState, type SlaState } from '../lib/workflow';
import { currentAdmin, currentScope, isSuperadmin, requireAdmin, requireSuperadmin } from '../middleware/auth';
import { requireCsrf, csrfToken } from '../middleware/csrf';
import { clientIp, noIndex } from '../middleware/security';
import { changePassword, createLeader, listAccounts, setAccountActive } from '../services/admins';
import { audit } from '../services/audit';
import { mediaUrl, removePhoto } from '../services/media';
import {
  CLOSED_IN_QUEUE,
  adminStats,
  deleteReport,
  eventsFor,
  insightData,
  newestReportId,
  normaliseStatus,
  queueForAdmin,
  reportsForExport,
  topLocations,
  updateReportStatus,
  type QueueReport,
} from '../services/reports';
import type { ReportEventRow } from '../types';

export const adminRouter = Router();

/** The dashboard is English-only, as admin.php was. */
const t = strings('en');

/** One line of a report's history, as the dashboard shows it. */
interface TimelineEntry {
  time: string;
  title: string;
  note: string | null;
  actor: string;
  /** Internal: the resident cannot see this on the tracker. */
  internal: boolean;
}

/** A report shaped for the dashboard template. */
interface AdminCard {
  id: number;
  reference: string;
  categoryKey: string;
  categoryLabel: string;
  urgencyKey: string;
  urgencyLabel: string;
  statusKey: Status;
  statusLabel: string;
  isOpen: boolean;
  /** Statuses this report can move to from here. */
  allowed: readonly Status[];
  time: string;
  location: string;
  sector: string;
  reporterName: string;
  contact: string;
  ip: string;
  cell: string;
  village: string;
  details: string;
  score: number;
  slaState: SlaState;
  slaLabel: string;
  photoUrl: string | null;
  mapUrl: string | null;
  accuracy: number | null;
  duplicateOfId: number | null;
  duplicateOfRef: string | null;
  linkedCount: number;
  confirmed: boolean;
  timeline: TimelineEntry[];
  /** Lowercased haystack for the client-side search. */
  search: string;
}

function safeKey(value: string | null, allowed: readonly string[], fallback: string): string {
  return value !== null && allowed.includes(value) ? value : fallback;
}

function timelineEntry(event: ReportEventRow): TimelineEntry {
  const titles: Record<ReportEventRow['kind'], string> = {
    status: `Moved to ${t.statuses[normaliseStatus(event.status_to)]}`,
    note: 'Note',
    confirmed: 'Reporter confirmed the fix',
    reopened: 'Reporter reopened this report',
    duplicate: 'Linked report',
  };
  return {
    time: formatDateTime(event.occurred_at),
    title: titles[event.kind],
    note: event.note,
    actor: event.actor ?? '',
    internal: event.is_public === 0,
  };
}

/** "Due in 5h", "3d overdue", "Closed on target": what the row shows. */
function slaLabel(state: SlaState, due: Date | null, now: Date): string {
  switch (state) {
    case 'on_track':
    case 'at_risk':
    case 'overdue':
      return due === null ? '' : describeDue(due, now).replace(/^due/, 'Due');
    case 'met':
      return 'Closed on target';
    case 'missed':
      return 'Closed late';
    case 'unknown':
      return '';
  }
}

/** Colour tokens per status, and the conic-gradient that draws them as a ring.
 *  Built from counts and fixed names only, so nothing typed by a resident can
 *  reach the style attribute. */
function statusDonut(counts: ReadonlyMap<Status, number>): {
  gradient: string;
  total: number;
  slices: Array<{ key: Status; label: string; count: number; pct: number }>;
} {
  const keys = Object.keys(t.statuses) as Status[];
  const total = keys.reduce((sum, key) => sum + (counts.get(key) ?? 0), 0);
  let at = 0;
  const stops: string[] = [];
  const slices = keys.map((key) => {
    const count = counts.get(key) ?? 0;
    const pct = total === 0 ? 0 : (count / total) * 100;
    if (pct > 0) stops.push(`var(--st-${key}) ${at.toFixed(2)}% ${(at + pct).toFixed(2)}%`);
    at += pct;
    return { key, label: t.statuses[key], count, pct: Math.round(pct) };
  });
  return { gradient: stops.length === 0 ? 'var(--line) 0 100%' : stops.join(', '), total, slices };
}

function hoursBetween(from: Date | null, to: Date): number {
  return from === null ? 0 : (to.getTime() - from.getTime()) / (60 * 60 * 1000);
}

function toCard(
  row: QueueReport,
  events: readonly ReportEventRow[],
  references: ReadonlyMap<number, string>,
  now: Date,
): AdminCard {
  const categoryKey = safeKey(row.category, VALID_CATEGORIES, 'other');
  const urgencyKey = safeKey(row.urgency, VALID_URGENCIES, 'low');
  const statusKey = normaliseStatus(row.status);
  const location = row.location ?? '';
  const sector = row.sector === null || row.sector === '' ? 'Unspecified' : row.sector;
  const reporterName = row.name === null || row.name === '' ? 'Anonymous' : row.name;
  const reference = formatReference(row.id, row.public_token);
  const sla = slaState(statusKey, row.time, row.due_at, row.resolved_at, now);

  return {
    id: row.id,
    reference,
    categoryKey,
    categoryLabel: t.categories[categoryKey as keyof typeof t.categories],
    urgencyKey,
    urgencyLabel: t.urgencies[urgencyKey as keyof typeof t.urgencies],
    statusKey,
    statusLabel: t.statuses[statusKey],
    isOpen: isOpen(statusKey),
    allowed: nextStatuses(statusKey, 'staff'),
    time: formatDateTime(row.time),
    location,
    sector,
    reporterName,
    contact: row.contact === null || row.contact === '' ? 'None' : row.contact,
    ip: row.ip ?? '',
    cell: row.cell === null || row.cell === '' ? 'Unspecified' : row.cell,
    village: row.village === null || row.village === '' ? '' : row.village,
    details: row.details === null || row.details === '' ? 'No additional description.' : row.details,
    score: priorityScore({
      status: statusKey,
      urgency: urgencyKey as Urgency,
      sla,
      linkedReports: row.linkedCount,
      reopened: statusKey === 'reopened',
      ageHours: hoursBetween(row.time, now),
    }),
    slaState: sla,
    slaLabel: slaLabel(sla, row.due_at, now),
    photoUrl: mediaUrl(row.photo),
    mapUrl: row.latitude === null || row.longitude === null ? null : mapLink(Number(row.latitude), Number(row.longitude)),
    accuracy: row.location_accuracy,
    duplicateOfId: row.duplicate_of,
    duplicateOfRef: row.duplicate_of === null ? null : (references.get(row.duplicate_of) ?? `CK-${row.duplicate_of}`),
    linkedCount: row.linkedCount,
    confirmed: row.confirmed_at !== null,
    timeline: events.map(timelineEntry),
    search: [reference, location, sector, row.cell ?? '', row.village ?? '', reporterName, categoryKey, row.details ?? '']
      .join(' ')
      .toLowerCase(),
  };
}

/* -------------------------------------------------------------------------
 * Dashboard
 * ---------------------------------------------------------------------- */

adminRouter.get('/admin', noIndex, requireAdmin(false), async (req, res, next) => {
  try {
    // One scope, computed once and passed to every query. A superadmin gets
    // null (everything); a leader gets their own cell.
    const scope = currentScope(req);
    const now = new Date();
    const [stats, hotspots, rows] = await Promise.all([adminStats(scope, now), topLocations(3, scope), queueForAdmin(scope)]);

    const events = await eventsFor(rows.map((r) => r.id));
    const references = new Map(rows.map((r) => [r.id, formatReference(r.id, r.public_token)]));

    // Most pressing first. Ties break newest first, so a score of 0 (everything
    // closed) reads as a plain archive.
    const cards = rows
      .map((row) => toCard(row, events.get(row.id) ?? [], references, now))
      .sort((a, b) => b.score - a.score || b.id - a.id);

    res.render('admin', {
      csrfToken: csrfToken(req),
      admin: currentAdmin(req),
      isSuper: isSuperadmin(req),
      scopeLabel: scope === null ? null : scope.cell,
      stats,
      hotspots,
      cards,
      closedLimit: CLOSED_IN_QUEUE,
      statusLabels: t.statuses,
      noteLimit: config.limits.note,
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Live updates
 *
 * Polled by an open dashboard, so an officer learns a report arrived without
 * reloading and losing their place. Scoped like everything else.
 * ---------------------------------------------------------------------- */

adminRouter.get('/admin/live', noIndex, requireAdmin(true), async (req, res) => {
  try {
    const scope = currentScope(req);
    const [stats, newestId] = await Promise.all([adminStats(scope), newestReportId(scope)]);
    res.json({ success: true, stats, newestId });
  } catch (err) {
    logError('Dashboard live update failed', err);
    res.status(503).json({ success: false });
  }
});

/* -------------------------------------------------------------------------
 * Insights
 * ---------------------------------------------------------------------- */

/** How far back the trend chart looks. */
const INSIGHT_DAYS = 30;

adminRouter.get('/admin/insights', noIndex, requireAdmin(false), async (req, res, next) => {
  try {
    const scope = currentScope(req);
    const now = new Date();
    const data = await insightData(scope, INSIGHT_DAYS, now);

    const days = fillDays(data.created, data.resolved, INSIGHT_DAYS, now);

    const barsOf = (rows: ReadonlyArray<{ label: string; count: number }>): Array<{ label: string; count: number; pct: number }> => {
      const top = Math.max(1, ...rows.map((r) => r.count));
      return rows.map((r) => ({ ...r, pct: Math.round((r.count / top) * 100) }));
    };

    // Older rows may hold '' or NULL for status; merge them into 'pending'
    // rather than showing a blank row.
    const statusCounts = new Map<Status, number>();
    for (const row of data.byStatus) {
      const key = normaliseStatus(row.name);
      statusCounts.set(key, (statusCounts.get(key) ?? 0) + row.count);
    }

    res.render('insights', {
      csrfToken: csrfToken(req),
      admin: currentAdmin(req),
      isSuper: isSuperadmin(req),
      scopeLabel: scope === null ? null : scope.cell,
      days: INSIGHT_DAYS,
      stats: data.stats,
      chart: chartModel(days),
      totals: {
        created: days.reduce((sum, d) => sum + d.created, 0),
        resolved: days.reduce((sum, d) => sum + d.resolved, 0),
      },
      medianResolution: formatDuration(median(data.resolutionMinutes)),
      targetRate: percent(data.metTarget, data.closedWithTarget),
      closedWithTarget: data.closedWithTarget,
      confirmed: data.confirmed,
      disputed: data.disputed,
      resolvedRate: percent(data.stats.done, data.stats.total),
      categories: barsOf(
        data.byCategory.map((r) => ({
          label: t.categories[safeKey(r.name, VALID_CATEGORIES, 'other') as keyof typeof t.categories],
          count: r.count,
        })),
      ),
      statuses: barsOf(
        (Object.keys(t.statuses) as Status[]).map((key) => ({
          label: t.statuses[key],
          count: statusCounts.get(key) ?? 0,
        })),
      ),
      donut: statusDonut(statusCounts),
      cells: data.cells,
      slaHours: config.sla.hours,
      portalHref: `/${DEFAULT_LOCALE}`,
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Export
 *
 * Contains reporter names and contact details, so it is scoped like everything
 * else on the dashboard, never cached, and leaves a line in the audit log. The
 * submitter's IP is left out: nobody working a spreadsheet needs it, and
 * spreadsheets get forwarded.
 * ---------------------------------------------------------------------- */

adminRouter.get('/admin/export.csv', noIndex, requireAdmin(false), async (req, res, next) => {
  try {
    const scope = currentScope(req);
    const rows = await reportsForExport(scope);

    const csv = toCsv(
      [
        'Reference', 'Reported', 'Status', 'Urgency', 'Category', 'District', 'Sector', 'Cell', 'Village', 'Location',
        'Details', 'Reporter', 'Contact', 'Latitude', 'Longitude', 'Due', 'Closed', 'Confirmed by reporter', 'Linked to',
      ],
      rows.map((r) => [
        formatReference(r.id, r.public_token),
        formatDateTime(r.time),
        t.statuses[normaliseStatus(r.status)],
        r.urgency,
        r.category,
        r.district,
        r.sector,
        r.cell,
        r.village,
        r.location,
        r.details,
        r.name,
        r.contact,
        r.latitude,
        r.longitude,
        formatDateTime(r.due_at),
        formatDateTime(r.resolved_at),
        formatDateTime(r.confirmed_at),
        r.duplicate_of === null ? '' : `CK-${r.duplicate_of}`,
      ]),
    );

    await audit(currentAdmin(req), 'reports_exported', {
      detail: `${rows.length} report(s)${scope === null ? '' : ` in ${scope.cell}`}`,
      ip: clientIp(req),
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clean-kigali-reports-${stamp}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * Status change and notes
 *
 * One endpoint for both: an officer moving a report, posting an update, or
 * doing both at once. Which moves are legal is decided by lib/workflow.ts, under
 * a row lock in the service, so two officers acting at once cannot both apply a
 * move that was only valid from the old state.
 * ---------------------------------------------------------------------- */

adminRouter.post('/admin/status', noIndex, requireAdmin(true), requireCsrf(true), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const id = Number.parseInt(String(body['id'] ?? ''), 10);
  const status = asStatus(body['status']);
  const note = cleanText(body['note'], config.limits.note);
  // Private by default: a note reaches the public only if someone chose that.
  const isPublic = body['note_public'] === '1';

  if (!Number.isInteger(id) || id <= 0 || status === null) {
    res.status(400).json({ success: false, message: 'Invalid request.' });
    return;
  }

  try {
    const actor = currentAdmin(req);
    const result = await updateReportStatus(id, status, currentScope(req), { actor, note, isPublic });

    if (!result.ok) {
      if (result.reason === 'not_found') {
        res.status(404).json({ success: false, message: 'That report no longer exists.' });
      } else if (result.reason === 'nothing_to_do') {
        res.status(400).json({ success: false, message: 'The report already has that status. Add a note to post an update.' });
      } else {
        const from = result.from === undefined ? 'its current status' : t.statuses[result.from];
        res.status(409).json({ success: false, message: `A report cannot move from ${from} to ${t.statuses[status]}.` });
      }
      return;
    }

    await audit(actor, result.changed ? 'status_change' : 'report_note', {
      targetId: id,
      detail: result.changed ? `Set to ${status}` : isPublic ? 'Public note' : 'Internal note',
      ip: clientIp(req),
    });

    const now = new Date();
    const events = await eventsFor([id]);
    const sla = slaState(result.status, result.createdAt, result.dueAt, result.resolvedAt, now);

    res.json({
      success: true,
      status: result.status,
      label: t.statuses[result.status],
      changed: result.changed,
      isOpen: isOpen(result.status),
      allowed: nextStatuses(result.status, 'staff'),
      slaState: sla,
      slaLabel: slaLabel(sla, result.dueAt, now),
      timeline: (events.get(id) ?? []).map(timelineEntry),
    });
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
      if (removed === null) {
        res.status(404).json({ success: false, message: 'That report no longer exists.' });
        return;
      }

      await removePhoto(removed.photo);
      await audit(currentAdmin(req), 'report_deleted', { targetId: id, ip: clientIp(req) });

      res.json({ success: true });
    } catch (err) {
      logError(`Delete failed for report ${id}`, err);
      res.status(500).json({ success: false, message: 'Could not delete the report. Please try again.' });
    }
  },
);
