/**
 * services/reports.ts — every query that touches the `reports` table.
 *
 * Ported from lib/portal.php and admin.php. Three rules:
 *
 *  1. Public reads select only non-identifying columns. Reporter name, contact,
 *     IP, GPS, photo and token never leave the server on the open feed, so a
 *     mistake in a template cannot leak them — they are not in the result set.
 *  2. Statistics are real counts. The original fell back to hardcoded figures
 *     (124/92/32 and a fixed 94.3%) when the table was empty, showing visitors
 *     numbers that were not true. An empty table now reports zero and an em
 *     dash.
 *  3. A read that decides a write happens inside the same transaction, under a
 *     row lock. The rules themselves live in lib/workflow.ts and are pure; this
 *     file only enforces their answer.
 */

import type { RowDataPacket } from 'mysql2';
import { config, VALID_STATUSES, type Status, type Urgency } from '../config';
import { query, queryOne, withTransaction, type SqlValue, type Tx } from '../db';
import { chooseOriginal, type DuplicateCandidate } from '../lib/duplicates';
import { generateToken } from '../lib/reference';
import { canTransition, dueAt, feedbackOptions } from '../lib/workflow';
import type {
  AdminStats,
  EventKind,
  Hotspot,
  PortalStats,
  PublicReport,
  ReportEventRow,
  ReportRow,
  TrackedReport,
  ValidatedReport,
} from '../types';

interface StatsRow extends RowDataPacket {
  total: number;
  resolved: number;
  pending: number;
}

interface AdminStatsRow extends RowDataPacket {
  total: number;
  received: number;
  in_progress: number;
  reopened: number;
  done: number;
  overdue: number;
  high: number;
}

interface PublicReportRow extends RowDataPacket, PublicReport {}
interface TrackedReportRow extends RowDataPacket, TrackedReport {}
interface FullReportRow extends RowDataPacket, ReportRow {}
interface QueueRow extends FullReportRow {
  linked_count: number;
}
interface HotspotRow extends RowDataPacket, Hotspot {}
interface EventRow extends RowDataPacket, ReportEventRow {}

/** Columns the open feed may see. */
const PUBLIC_COLUMNS = 'id, time, category, urgency, location, district, sector, cell, village, details, status';

/** SQL for "still needs work". Older rows may hold '' or NULL, meaning pending. */
const IS_OPEN = "(status NOT IN ('done', 'notdone') OR status IS NULL)";

/** Normalise the status column, which older rows may hold as '' or NULL. */
export function normaliseStatus(value: string | null | undefined): Status {
  return (VALID_STATUSES as readonly string[]).includes(value ?? '') ? (value as Status) : 'pending';
}

/* -------------------------------------------------------------------------
 * Creating a report
 * ---------------------------------------------------------------------- */

export interface CreatedReport {
  id: number;
  token: string;
  /** The open report this one was linked to, if it looks like the same problem. */
  duplicateOf: number | null;
}

interface CandidateRow extends RowDataPacket {
  id: number;
  category: string | null;
  status: string;
  cell: string | null;
  time: Date | null;
  latitude: string | null;
  longitude: string | null;
  duplicate_of: number | null;
}

/** Recent open reports of this category: the pool for duplicate matching. */
async function duplicateCandidates(tx: Tx, report: ValidatedReport, now: Date): Promise<DuplicateCandidate[]> {
  const since = new Date(now.getTime() - config.duplicates.windowDays * 24 * 60 * 60 * 1000);
  const rows = await tx.query<CandidateRow>(
    `SELECT id, category, status, cell, time, latitude, longitude, duplicate_of
       FROM reports
      WHERE category = ? AND time >= ? AND ${IS_OPEN}
      ORDER BY time ASC
      LIMIT 200`,
    [report.category, since],
  );
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    status: normaliseStatus(r.status),
    cell: r.cell,
    time: r.time,
    latitude: r.latitude === null ? null : Number(r.latitude),
    longitude: r.longitude === null ? null : Number(r.longitude),
    duplicateOf: r.duplicate_of,
  }));
}

/**
 * Insert a validated report: assign its deadline and token, and link it to an
 * existing report when it looks like the same problem. The resident gets their
 * own reference either way; a link never swallows a report.
 */
export async function createReport(
  report: ValidatedReport,
  ip: string,
  photo: string | null,
  now: Date = new Date(),
): Promise<CreatedReport> {
  return withTransaction(async (tx) => {
    const candidates = await duplicateCandidates(tx, report, now);
    const duplicateOf = chooseOriginal(report, candidates, now);
    const token = generateToken();

    const result = await tx.execute(
      `INSERT INTO reports
         (time, category, urgency, location, district, sector, cell, village, details, name, contact, ip, status,
          public_token, due_at, updated_at, latitude, longitude, location_accuracy, photo, duplicate_of)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        now,
        report.category,
        report.urgency,
        report.location,
        report.district,
        report.sector,
        report.cell,
        report.village,
        report.details,
        report.name,
        report.contact,
        ip,
        token,
        dueAt(now, report.urgency),
        now,
        report.latitude,
        report.longitude,
        report.locationAccuracy,
        photo,
        duplicateOf,
      ],
    );

    if (duplicateOf !== null) {
      await addEvent(tx, duplicateOf, 'duplicate', {
        note: `Another report of this problem was filed (CK-${result.insertId}).`,
        isPublic: false,
        actor: 'system',
        now,
      });
    }

    return { id: result.insertId, token, duplicateOf };
  });
}

/* -------------------------------------------------------------------------
 * Events
 * ---------------------------------------------------------------------- */

async function addEvent(
  tx: Tx,
  reportId: number,
  kind: EventKind,
  options: {
    from?: Status | undefined;
    to?: Status | undefined;
    note?: string | null | undefined;
    isPublic: boolean;
    actor: string;
    now: Date;
  },
): Promise<void> {
  await tx.execute(
    `INSERT INTO report_events (report_id, occurred_at, kind, status_from, status_to, note, is_public, actor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reportId,
      options.now,
      kind,
      options.from ?? null,
      options.to ?? null,
      options.note ?? null,
      options.isPublic ? 1 : 0,
      options.actor,
    ],
  );
}

/** A report's history for its reference holder: public events only. */
export async function publicEvents(reportId: number): Promise<ReportEventRow[]> {
  return query<EventRow>(
    'SELECT * FROM report_events WHERE report_id = ? AND is_public = 1 ORDER BY occurred_at ASC, id ASC',
    [reportId],
  );
}

/** Full history for a set of reports, grouped by report. Dashboard only. */
export async function eventsFor(ids: readonly number[]): Promise<Map<number, ReportEventRow[]>> {
  const grouped = new Map<number, ReportEventRow[]>();
  if (ids.length === 0) return grouped;

  const placeholders = ids.map(() => '?').join(',');
  const rows = await query<EventRow>(
    `SELECT * FROM report_events WHERE report_id IN (${placeholders}) ORDER BY occurred_at ASC, id ASC`,
    ids,
  );
  for (const row of rows) {
    const list = grouped.get(row.report_id);
    if (list === undefined) grouped.set(row.report_id, [row]);
    else list.push(row);
  }
  return grouped;
}

/* -------------------------------------------------------------------------
 * Public reads
 * ---------------------------------------------------------------------- */

/**
 * One report for the tracker. The caller must check the token with
 * referenceMatches() before showing anything. The column list is the security
 * boundary: name, contact and ip are absent by construction.
 */
export async function findTrackedReport(id: number): Promise<TrackedReport | undefined> {
  return queryOne<TrackedReportRow>(
    `SELECT ${PUBLIC_COLUMNS}, public_token, due_at, resolved_at, confirmed_at, photo FROM reports WHERE id = ?`,
    [id],
  );
}

/** Public counters for the portal pages. */
export async function portalStats(noDataLabel: string): Promise<PortalStats> {
  const row = await queryOne<StatsRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS resolved,
       SUM(CASE WHEN ${IS_OPEN} THEN 1 ELSE 0 END) AS pending
     FROM reports`,
  );

  const total = Number(row?.total ?? 0);
  const resolved = Number(row?.resolved ?? 0);
  const pending = Number(row?.pending ?? 0);

  return {
    total,
    resolved,
    pending,
    // An em dash, not a placeholder percentage, when there is nothing to divide.
    resolutionRate: total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : noDataLabel,
  };
}

/** The public feed: the most recent reports, non-identifying columns only. */
export async function recentReports(limit = 8): Promise<PublicReport[]> {
  // The limit is a caller-controlled integer, but it is still clamped and
  // inlined as a number rather than a placeholder, because MySQL will not take
  // a prepared parameter in LIMIT on all versions.
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  return query<PublicReportRow>(`SELECT ${PUBLIC_COLUMNS} FROM reports ORDER BY time DESC LIMIT ${safeLimit}`);
}

/* -------------------------------------------------------------------------
 * Scope
 * ---------------------------------------------------------------------- */

/**
 * How much of the queue an account may see.
 *
 * `null` means everything, which is what a superadmin gets. A cell leader gets
 * their own cell and nothing else.
 *
 * Every dashboard query takes this and turns it into a WHERE clause here, in
 * the service layer, rather than filtering in a route or a template. That is
 * deliberate: a filter applied at the edge is one forgotten call away from
 * leaking, whereas a report outside the scope is never in the result set to
 * begin with — the same rule the public queries follow for reporter details.
 */
export type Scope = { cell: string } | null;

/** A condition for the scope, always safe to AND with others. */
function scopeCondition(scope: Scope, column = 'cell'): { sql: string; params: string[] } {
  if (scope === null) return { sql: '1 = 1', params: [] };
  return { sql: `${column} = ?`, params: [scope.cell] };
}

/* -------------------------------------------------------------------------
 * Dashboard reads
 * ---------------------------------------------------------------------- */

/** Dashboard counters, within the caller's scope. */
export async function adminStats(scope: Scope = null, now: Date = new Date()): Promise<AdminStats> {
  const { sql, params } = scopeCondition(scope);
  const row = await queryOne<AdminStatsRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'pending' OR status = '' OR status IS NULL THEN 1 ELSE 0 END) AS received,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status = 'reopened' THEN 1 ELSE 0 END) AS reopened,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
       SUM(CASE WHEN ${IS_OPEN} AND due_at IS NOT NULL AND due_at < ? THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN urgency = 'high' AND ${IS_OPEN} THEN 1 ELSE 0 END) AS high
     FROM reports WHERE ${sql}`,
    [now, ...params],
  );

  const received = Number(row?.received ?? 0);
  const inProgress = Number(row?.in_progress ?? 0);
  const reopened = Number(row?.reopened ?? 0);

  return {
    total: Number(row?.total ?? 0),
    received,
    inProgress,
    reopened,
    open: received + inProgress + reopened,
    done: Number(row?.done ?? 0),
    overdue: Number(row?.overdue ?? 0),
    high: Number(row?.high ?? 0),
  };
}

/** Most-reported locations among open reports, within the caller's scope. */
export async function topLocations(limit = 3, scope: Scope = null): Promise<Hotspot[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const { sql, params } = scopeCondition(scope);
  return query<HotspotRow>(
    `SELECT location, COUNT(*) AS count
     FROM reports WHERE ${sql} AND ${IS_OPEN}
     GROUP BY location
     ORDER BY count DESC
     LIMIT ${safeLimit}`,
    params,
  );
}

interface MaxIdRow extends RowDataPacket {
  id: number | null;
}

/** The newest report in scope, so an open dashboard can notice new arrivals. */
export async function newestReportId(scope: Scope = null): Promise<number> {
  const { sql, params } = scopeCondition(scope);
  const row = await queryOne<MaxIdRow>(`SELECT MAX(id) AS id FROM reports WHERE ${sql}`, params);
  return Number(row?.id ?? 0);
}

/** How many closed reports the dashboard lists after the open ones. */
export const CLOSED_IN_QUEUE = 200;

export interface QueueReport extends ReportRow {
  linkedCount: number;
}

/**
 * Reports for the dashboard: every open report, plus the most recent closed
 * ones. Open work is never hidden however long the list gets, and the archive
 * stays available through the CSV export.
 *
 * This is the full row including reporter details — it is only ever called
 * behind requireAdmin(), and only ever for the caller's own scope. Ordering by
 * priority happens in the route, from lib/workflow.
 */
export async function queueForAdmin(scope: Scope = null): Promise<QueueReport[]> {
  const { sql, params } = scopeCondition(scope, 'r.cell');
  const select = `SELECT r.*, (SELECT COUNT(*) FROM reports d WHERE d.duplicate_of = r.id) AS linked_count FROM reports r`;
  const isOpenR = IS_OPEN.replace(/status/g, 'r.status');

  const [open, closed] = await Promise.all([
    query<QueueRow>(`${select} WHERE ${sql} AND ${isOpenR}`, params),
    query<QueueRow>(
      `${select} WHERE ${sql} AND NOT ${isOpenR}
       ORDER BY COALESCE(r.resolved_at, r.time) DESC LIMIT ${CLOSED_IN_QUEUE}`,
      params,
    ),
  ]);

  return [...open, ...closed].map((row) => ({ ...row, linkedCount: Number(row.linked_count) }));
}

/** Every report in scope for the CSV export, newest first. */
export async function reportsForExport(scope: Scope = null): Promise<ReportRow[]> {
  const { sql, params } = scopeCondition(scope);
  return query<FullReportRow>(`SELECT * FROM reports WHERE ${sql} ORDER BY time DESC`, params);
}

/* -------------------------------------------------------------------------
 * Staff updates
 * ---------------------------------------------------------------------- */

export type StatusUpdateResult =
  | {
      ok: true;
      changed: boolean;
      status: Status;
      createdAt: Date | null;
      dueAt: Date | null;
      resolvedAt: Date | null;
    }
  | { ok: false; reason: 'not_found' | 'invalid_transition' | 'nothing_to_do'; from?: Status };

interface LockedReportRow extends RowDataPacket {
  id: number;
  status: string;
  time: Date | null;
  due_at: Date | null;
  resolved_at: Date | null;
  confirmed_at: Date | null;
  urgency: string | null;
  public_token: string | null;
}

async function lockReport(tx: Tx, id: number, scope: Scope): Promise<LockedReportRow | undefined> {
  const { sql, params } = scopeCondition(scope);
  const rows = await tx.query<LockedReportRow>(
    `SELECT id, status, time, due_at, resolved_at, confirmed_at, urgency, public_token
       FROM reports WHERE id = ? AND ${sql} FOR UPDATE`,
    [id, ...params],
  );
  return rows[0];
}


/**
 * Change a report's status and/or attach a note, within the caller's scope.
 *
 * The scope is part of the WHERE clause rather than a separate check, so a
 * leader posting another cell's report id simply matches no row and gets the
 * same "no longer exists" answer as a deleted report. There is no branch that
 * could be reordered into a leak, and the response does not confirm whether
 * the id exists elsewhere.
 *
 * Passing the current status with a note records the note and leaves the
 * status alone, so an officer can post an update without moving anything.
 */
export async function updateReportStatus(
  id: number,
  to: Status,
  scope: Scope,
  options: { actor: string; note: string | null; isPublic: boolean; now?: Date },
): Promise<StatusUpdateResult> {
  const now = options.now ?? new Date();

  return withTransaction<StatusUpdateResult>(async (tx) => {
    const row = await lockReport(tx, id, scope);
    if (row === undefined) return { ok: false, reason: 'not_found' };

    const from = normaliseStatus(row.status);

    if (from === to) {
      if (options.note === null) return { ok: false, reason: 'nothing_to_do', from };
      await addEvent(tx, id, 'note', { note: options.note, isPublic: options.isPublic, actor: options.actor, now });
      await tx.execute('UPDATE reports SET updated_at = ? WHERE id = ?', [now, id]);
      return {
        ok: true,
        changed: false,
        status: from,
        createdAt: row.time,
        dueAt: row.due_at,
        resolvedAt: row.resolved_at,
      };
    }

    if (!canTransition(from, to, 'staff')) return { ok: false, reason: 'invalid_transition', from };

    // Closing stamps the closure; going back to work clears it, along with any
    // confirmation of a fix that turned out not to hold.
    const closing = to === 'done' || to === 'notdone';
    const resolvedAt = closing ? now : null;

    await tx.execute(
      `UPDATE reports SET status = ?, resolved_at = ?, updated_at = ?, confirmed_at = ${closing ? 'confirmed_at' : 'NULL'}
        WHERE id = ?`,
      [to, resolvedAt, now, id],
    );

    // The move itself is always public: it is what the tracker shows. Only the
    // note can be held back, so a private note becomes its own internal event
    // rather than taking the status change out of the resident's view with it.
    const publicNote = options.isPublic ? options.note : null;
    await addEvent(tx, id, 'status', { from, to, note: publicNote, isPublic: true, actor: options.actor, now });
    if (options.note !== null && !options.isPublic) {
      await addEvent(tx, id, 'note', { note: options.note, isPublic: false, actor: options.actor, now });
    }

    return {
      ok: true,
      changed: true,
      status: to,
      createdAt: row.time,
      dueAt: row.due_at,
      resolvedAt,
    };
  });
}

/* -------------------------------------------------------------------------
 * The reporter's say
 * ---------------------------------------------------------------------- */

export type FeedbackResult = { ok: true; status: Status } | { ok: false; reason: 'not_found' | 'not_allowed' };

/**
 * The reporter confirms a fix or disputes a closure.
 *
 * The caller has already checked the token. Reopening gives the report a fresh
 * deadline: the clock that ran out was for the first attempt, and a disputed
 * report that lands overdue from the first second would just train officers to
 * ignore the flag. It still jumps the queue, through its priority score.
 */
export async function residentFeedback(
  id: number,
  action: 'confirm' | 'reopen',
  note: string | null,
  now: Date = new Date(),
): Promise<FeedbackResult> {
  return withTransaction<FeedbackResult>(async (tx) => {
    const row = await lockReport(tx, id, null);
    if (row === undefined) return { ok: false, reason: 'not_found' };

    const status = normaliseStatus(row.status);
    const options = feedbackOptions(status, row.resolved_at, row.confirmed_at, now);

    if (action === 'confirm') {
      if (!options.canConfirm) return { ok: false, reason: 'not_allowed' };
      await tx.execute('UPDATE reports SET confirmed_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
      await addEvent(tx, id, 'confirmed', { note, isPublic: true, actor: 'reporter', now });
      return { ok: true, status };
    }

    if (!options.canReopen) return { ok: false, reason: 'not_allowed' };

    const urgency = (row.urgency === 'high' || row.urgency === 'medium' ? row.urgency : 'low') as Urgency;
    await tx.execute(
      "UPDATE reports SET status = 'reopened', resolved_at = NULL, due_at = ?, updated_at = ? WHERE id = ?",
      [dueAt(now, urgency), now, id],
    );
    await addEvent(tx, id, 'reopened', { from: status, to: 'reopened', note, isPublic: true, actor: 'reporter', now });
    return { ok: true, status: 'reopened' };
  });
}

/* -------------------------------------------------------------------------
 * Deleting
 * ---------------------------------------------------------------------- */

interface PhotoRow extends RowDataPacket {
  photo: string | null;
}

/**
 * Delete a report and everything hanging off it. Returns null when no row
 * matched, otherwise the photo file the caller should now remove from disk.
 */
export async function deleteReport(id: number): Promise<{ photo: string | null } | null> {
  return withTransaction(async (tx) => {
    const rows = await tx.query<PhotoRow>('SELECT photo FROM reports WHERE id = ? FOR UPDATE', [id]);
    const row = rows[0];
    if (row === undefined) return null;

    await tx.execute('DELETE FROM report_events WHERE report_id = ?', [id]);
    // Reports linked to this one stand on their own again.
    await tx.execute('UPDATE reports SET duplicate_of = NULL WHERE duplicate_of = ?', [id]);
    await tx.execute('DELETE FROM reports WHERE id = ?', [id]);
    return { photo: row.photo };
  });
}

/* -------------------------------------------------------------------------
 * Insights
 * ---------------------------------------------------------------------- */

export interface DayCount {
  day: string;
  count: number;
}
export interface NamedCount {
  name: string;
  count: number;
}
export interface CellRow {
  cell: string;
  total: number;
  open: number;
  overdue: number;
}
export interface InsightData {
  stats: AdminStats;
  created: DayCount[];
  resolved: DayCount[];
  byCategory: NamedCount[];
  byStatus: NamedCount[];
  cells: CellRow[];
  resolutionMinutes: number[];
  metTarget: number;
  closedWithTarget: number;
  confirmed: number;
  disputed: number;
}

interface DayRow extends RowDataPacket {
  day: string;
  count: number;
}
interface NameRow extends RowDataPacket {
  name: string | null;
  count: number;
}
interface CellSqlRow extends RowDataPacket {
  cell: string | null;
  total: number;
  open_count: number;
  overdue: number;
}
interface MinutesRow extends RowDataPacket {
  minutes: number;
}
interface TargetRow extends RowDataPacket {
  met: number | null;
  closed: number;
  confirmed: number | null;
}
interface CountRow extends RowDataPacket {
  c: number;
}

/** Everything the insights page shows, within the caller's scope. */
export async function insightData(scope: Scope, days: number, now: Date = new Date()): Promise<InsightData> {
  const { sql, params } = scopeCondition(scope);
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const p = (...extra: SqlValue[]): SqlValue[] => [...extra, ...params];

  const [stats, created, resolved, byCategory, byStatus, cells, minutes, target, disputed] = await Promise.all([
    adminStats(scope, now),
    query<DayRow>(
      `SELECT DATE_FORMAT(time, '%Y-%m-%d') AS day, COUNT(*) AS count
         FROM reports WHERE time >= ? AND ${sql} GROUP BY day ORDER BY day`,
      p(since),
    ),
    query<DayRow>(
      `SELECT DATE_FORMAT(resolved_at, '%Y-%m-%d') AS day, COUNT(*) AS count
         FROM reports WHERE status = 'done' AND resolved_at >= ? AND ${sql} GROUP BY day ORDER BY day`,
      p(since),
    ),
    query<NameRow>(
      `SELECT category AS name, COUNT(*) AS count FROM reports WHERE ${sql} GROUP BY category ORDER BY count DESC`,
      params,
    ),
    query<NameRow>(`SELECT status AS name, COUNT(*) AS count FROM reports WHERE ${sql} GROUP BY status`, params),
    query<CellSqlRow>(
      `SELECT cell, COUNT(*) AS total,
              SUM(CASE WHEN ${IS_OPEN} THEN 1 ELSE 0 END) AS open_count,
              SUM(CASE WHEN ${IS_OPEN} AND due_at < ? THEN 1 ELSE 0 END) AS overdue
         FROM reports WHERE cell IS NOT NULL AND ${sql}
        GROUP BY cell ORDER BY open_count DESC, total DESC LIMIT 8`,
      p(now),
    ),
    query<MinutesRow>(
      `SELECT TIMESTAMPDIFF(MINUTE, time, resolved_at) AS minutes
         FROM reports
        WHERE status = 'done' AND resolved_at IS NOT NULL AND time IS NOT NULL AND ${sql}
        ORDER BY resolved_at DESC LIMIT 2000`,
      params,
    ),
    queryOne<TargetRow>(
      `SELECT SUM(CASE WHEN resolved_at <= due_at THEN 1 ELSE 0 END) AS met,
              COUNT(*) AS closed,
              SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END) AS confirmed
         FROM reports WHERE status = 'done' AND resolved_at IS NOT NULL AND due_at IS NOT NULL AND ${sql}`,
      params,
    ),
    queryOne<CountRow>(
      `SELECT COUNT(*) AS c FROM report_events e JOIN reports r ON r.id = e.report_id
        WHERE e.kind = 'reopened' AND ${scopeCondition(scope, 'r.cell').sql}`,
      params,
    ),
  ]);

  const toDay = (r: DayRow): DayCount => ({ day: r.day, count: Number(r.count) });
  const toNamed = (r: NameRow): NamedCount => ({ name: r.name ?? '', count: Number(r.count) });

  return {
    stats,
    created: created.map(toDay),
    resolved: resolved.map(toDay),
    byCategory: byCategory.map(toNamed),
    byStatus: byStatus.map(toNamed),
    cells: cells.map((c) => ({
      cell: c.cell ?? '',
      total: Number(c.total),
      open: Number(c.open_count),
      overdue: Number(c.overdue),
    })),
    resolutionMinutes: minutes.map((m) => Number(m.minutes)),
    metTarget: Number(target?.met ?? 0),
    closedWithTarget: Number(target?.closed ?? 0),
    confirmed: Number(target?.confirmed ?? 0),
    disputed: Number(disputed?.c ?? 0),
  };
}
