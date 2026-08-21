/**
 * services/reports.ts — every query that touches the `reports` table.
 *
 * Ported from lib/portal.php and admin.php. Two rules the PHP established and
 * this keeps:
 *
 *  1. Public reads select only non-identifying columns. Reporter name, contact
 *     and IP never leave the server on a public route, so a mistake in a
 *     template cannot leak them — they are not in the result set to begin with.
 *  2. Statistics are real counts. The original fell back to hardcoded figures
 *     (124/92/32 and a fixed 94.3%) when the table was empty, showing visitors
 *     numbers that were not true. An empty table now reports zero and an em
 *     dash.
 */

import type { RowDataPacket } from 'mysql2';
import type { Status } from '../config';
import { execute, query, queryOne } from '../db';
import type { AdminStats, Hotspot, PortalStats, PublicReport, ReportRow, ValidatedReport } from '../types';

interface StatsRow extends RowDataPacket {
  total: number;
  resolved: number;
  pending: number;
}

interface AdminStatsRow extends RowDataPacket {
  total: number;
  pending: number;
  done: number;
  high: number;
}

interface PublicReportRow extends RowDataPacket, PublicReport {}
interface FullReportRow extends RowDataPacket, ReportRow {}
interface HotspotRow extends RowDataPacket, Hotspot {}

/**
 * Insert a validated report and return its reference id.
 */
export async function createReport(report: ValidatedReport, ip: string): Promise<number> {
  const result = await execute(
    `INSERT INTO reports (time, category, urgency, location, sector, details, name, contact, ip, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      new Date(),
      report.category,
      report.urgency,
      report.location,
      report.sector,
      report.details,
      report.name,
      report.contact,
      ip,
    ],
  );
  return result.insertId;
}

/**
 * One report for the public tracker.
 *
 * The column list is the security boundary: name, contact and ip are absent by
 * construction.
 */
export async function findPublicReport(id: number): Promise<PublicReport | undefined> {
  return queryOne<PublicReportRow>(
    'SELECT id, time, category, urgency, location, sector, details, status FROM reports WHERE id = ?',
    [id],
  );
}

/** Public counters for the portal pages. */
export async function portalStats(noDataLabel: string): Promise<PortalStats> {
  const row = await queryOne<StatsRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS resolved,
       SUM(CASE WHEN status <> 'done' OR status IS NULL THEN 1 ELSE 0 END) AS pending
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
  return query<PublicReportRow>(
    `SELECT id, time, category, urgency, location, sector, details, status
     FROM reports
     ORDER BY time DESC
     LIMIT ${safeLimit}`,
  );
}

/** Dashboard counters. */
export async function adminStats(): Promise<AdminStats> {
  const row = await queryOne<AdminStatsRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'pending' OR status = '' OR status IS NULL OR status = 'notdone' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
       SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) AS high
     FROM reports`,
  );

  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    done: Number(row?.done ?? 0),
    high: Number(row?.high ?? 0),
  };
}

/** Most-reported locations, for the dashboard hotspots panel. */
export async function topLocations(limit = 3): Promise<Hotspot[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  return query<HotspotRow>(
    `SELECT location, COUNT(*) AS count
     FROM reports
     GROUP BY location
     ORDER BY count DESC
     LIMIT ${safeLimit}`,
  );
}

/**
 * Every report for the dashboard, high urgency first then newest.
 *
 * This is the full row including reporter details — it is only ever called
 * behind requireAdmin().
 */
export async function allReportsForAdmin(): Promise<ReportRow[]> {
  return query<FullReportRow>(
    `SELECT * FROM reports
     ORDER BY
       CASE urgency
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
         ELSE 4
       END,
       time DESC`,
  );
}

/** Set a report's status. Returns false when no row matched. */
export async function updateReportStatus(id: number, status: Status): Promise<boolean> {
  const result = await execute('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows > 0;
}

/** Delete a report. Returns false when no row matched. */
export async function deleteReport(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM reports WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/** Normalise the status column, which older rows may hold as '' or NULL. */
export function normaliseStatus(value: string | null | undefined): Status {
  if (value === 'done') return 'done';
  if (value === 'notdone') return 'notdone';
  return 'pending';
}
