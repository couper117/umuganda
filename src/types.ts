/**
 * types.ts — shared row and view-model shapes.
 *
 * The database columns are nullable exactly as the schema declares them, so
 * the compiler forces every read site to deal with a missing sector or
 * contact rather than assuming a string is present.
 */

import type { Category, Status, Urgency } from './config';

/** A row of the `reports` table. */
export interface ReportRow {
  id: number;
  time: Date | null;
  category: string | null;
  urgency: string | null;
  location: string | null;
  sector: string | null;
  details: string | null;
  name: string | null;
  contact: string | null;
  ip: string | null;
  status: string;
  district: string | null;
  cell: string | null;
  village: string | null;
  public_token: string | null;
  due_at: Date | null;
  updated_at: Date | null;
  resolved_at: Date | null;
  confirmed_at: Date | null;
  /** DECIMAL columns arrive from the driver as strings. */
  latitude: string | null;
  longitude: string | null;
  location_accuracy: number | null;
  photo: string | null;
  duplicate_of: number | null;
}

/** The subset of a report that is safe to show the public: no reporter name,
 *  no contact details, no IP address, no token, no coordinates and no photo.
 *  This is what the open feed shows, to anyone. */
export interface PublicReport {
  id: number;
  time: Date | null;
  category: string | null;
  urgency: string | null;
  location: string | null;
  sector: string | null;
  details: string | null;
  status: string;
  district: string | null;
  cell: string | null;
  village: string | null;
}

/**
 * What the holder of a report's reference may see. Adds the deadline, the
 * closure details and the photo to the public shape; still no reporter details.
 * `public_token` is here to be checked and is never sent to the browser.
 */
export interface TrackedReport extends PublicReport {
  public_token: string | null;
  due_at: Date | null;
  resolved_at: Date | null;
  confirmed_at: Date | null;
  photo: string | null;
}

/** A row of the `report_events` table. */
export interface ReportEventRow {
  id: number;
  report_id: number;
  occurred_at: Date;
  kind: EventKind;
  status_from: string | null;
  status_to: string | null;
  note: string | null;
  is_public: number;
  actor: string | null;
}

export type EventKind = 'status' | 'note' | 'confirmed' | 'reopened' | 'duplicate';

/** A row of the `admin_users` table. */
export interface AdminUserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
  last_login: Date | null;
  failed_attempts: number;
  locked_until: Date | null;
  role: string;
  district: string | null;
  sector: string | null;
  cell: string | null;
  is_active: number;
}

/** A validated submission, ready to insert. Optional fields are null when the
 *  visitor left them blank. */
export interface ValidatedReport {
  category: Category;
  urgency: Urgency;
  location: string;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  details: string | null;
  name: string | null;
  contact: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
}

/** Public counters shown on every portal page. */
export interface PortalStats {
  total: number;
  pending: number;
  resolved: number;
  /** Formatted percentage, or an em dash when there is no data to compute it
   *  from. Never a placeholder figure. */
  resolutionRate: string;
}

/** Dashboard counters. */
export interface AdminStats {
  total: number;
  /** Received, nobody has started: status = pending. */
  received: number;
  inProgress: number;
  reopened: number;
  /** Everything still needing work: the three above. */
  open: number;
  done: number;
  overdue: number;
  high: number;
}

export interface Hotspot {
  location: string | null;
  count: number;
}

/** Result of validating a submission: either the clean data or the list of
 *  field names that failed. */
export type ValidationResult =
  | { ok: true; data: ValidatedReport }
  | { ok: false; errors: string[] };

/** What the tracker endpoint returns. */
export type TrackResponse =
  | { success: true; data: TrackPayload }
  | { success: false; message: string };

export interface TrackEvent {
  kind: EventKind | 'created';
  time: string;
  /** Set when the event moved the report to a new status. */
  status: Status | null;
  note: string | null;
}

export interface TrackPayload {
  id: string;
  time: string | null;
  category: string | null;
  urgency: string | null;
  location: string | null;
  sector: string;
  details: string;
  status: Status;
  /** Target date while the report is open; null once closed or if unknown. */
  dueBy: string | null;
  overdue: boolean;
  photoUrl: string | null;
  events: TrackEvent[];
  canConfirm: boolean;
  canReopen: boolean;
  confirmed: boolean;
}

/** What POST /:locale/track/feedback returns. */
export type FeedbackResponse =
  | { success: true; data: TrackPayload; message: string }
  | { success: false; message: string };

/** What an account is allowed to do. */
export type Role = 'superadmin' | 'leader';

/** Fields the session carries once an admin signs in. */
declare module 'express-session' {
  interface SessionData {
    adminId?: number;
    adminUsername?: string;
    /** 'superadmin' or 'leader'. Set at sign-in from the database row. */
    adminRole?: string;
    /** The leader's cell. Undefined for a superadmin, who is not scoped. */
    adminCell?: string;
    csrfToken?: string;
    createdAt?: number;
    lastActivity?: number;
  }
}
