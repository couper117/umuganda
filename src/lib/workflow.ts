/**
 * lib/workflow.ts — the rules of a report's life.
 *
 * Everything here is a pure function of its arguments, including "now", so
 * the whole lifecycle is unit-testable without a database or a clock. The
 * service layer calls these and enforces the answer inside a transaction.
 */

import { config, type Status, type Urgency } from '../config';

/** Who is asking to move a report. */
export type Actor = 'staff' | 'resident';

/** Still needs work. Counted as outstanding everywhere. */
export const OPEN_STATUSES: readonly Status[] = ['pending', 'in_progress', 'reopened'];

export function isOpen(status: Status): boolean {
  return OPEN_STATUSES.includes(status);
}

/**
 * Allowed moves, by actor.
 *
 * Staff can move an open report anywhere a member of staff may set, and can
 * reopen a closed one by putting it back to in_progress — a leader who closed
 * something by mistake should not need the reporter to undo it. They cannot
 * set 'reopened', which records that the *reporter* disputed a fix.
 *
 * A resident can do exactly one thing: dispute a closed report.
 */
const STAFF_MOVES: Readonly<Record<Status, readonly Status[]>> = {
  pending: ['in_progress', 'done', 'notdone'],
  in_progress: ['pending', 'done', 'notdone'],
  reopened: ['in_progress', 'done', 'notdone'],
  done: ['in_progress'],
  notdone: ['in_progress'],
};

const RESIDENT_MOVES: Readonly<Record<Status, readonly Status[]>> = {
  pending: [],
  in_progress: [],
  reopened: [],
  done: ['reopened'],
  notdone: ['reopened'],
};

export function canTransition(from: Status, to: Status, actor: Actor): boolean {
  const table = actor === 'staff' ? STAFF_MOVES : RESIDENT_MOVES;
  return table[from].includes(to);
}

/** The moves available from a status, for rendering only the valid buttons. */
export function nextStatuses(from: Status, actor: Actor): readonly Status[] {
  return (actor === 'staff' ? STAFF_MOVES : RESIDENT_MOVES)[from];
}

/* -------------------------------------------------------------------------
 * Service targets
 * ---------------------------------------------------------------------- */

const HOUR = 60 * 60 * 1000;

/** When a report of this urgency should be dealt with by. */
export function dueAt(createdAt: Date, urgency: Urgency): Date {
  return new Date(createdAt.getTime() + config.sla.hours[urgency] * HOUR);
}

/**
 * Where a report stands against its target.
 *
 *   met        closed on or before the deadline
 *   missed     closed after it
 *   on_track   open, with most of its window left
 *   at_risk    open, in the last quarter of the window
 *   overdue    open, past the deadline
 *   unknown    no deadline recorded (rows older than this feature)
 */
export type SlaState = 'met' | 'missed' | 'on_track' | 'at_risk' | 'overdue' | 'unknown';

export function slaState(
  status: Status,
  createdAt: Date | null,
  due: Date | null,
  resolvedAt: Date | null,
  now: Date,
): SlaState {
  if (due === null || createdAt === null) return 'unknown';

  if (!isOpen(status)) {
    if (resolvedAt === null) return 'unknown';
    return resolvedAt.getTime() <= due.getTime() ? 'met' : 'missed';
  }

  const remaining = due.getTime() - now.getTime();
  if (remaining < 0) return 'overdue';

  const window = due.getTime() - createdAt.getTime();
  const elapsedFraction = window <= 0 ? 1 : 1 - remaining / window;
  return elapsedFraction >= config.sla.atRiskFraction ? 'at_risk' : 'on_track';
}

/**
 * "in 5h", "2d overdue" — compact, language-neutral enough for the English
 * dashboard. Rounds toward the less alarming unit only when it is exact.
 */
export function describeDue(due: Date, now: Date): string {
  const diff = due.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.round(abs / HOUR);
  const span = hours < 48 ? `${Math.max(hours, 1)}h` : `${Math.round(hours / 24)}d`;
  return diff >= 0 ? `due in ${span}` : `${span} overdue`;
}

/* -------------------------------------------------------------------------
 * The reporter's say
 * ---------------------------------------------------------------------- */

/**
 * What the reporter may do with a closed report.
 *
 * Confirming only applies to a fix. Disputing applies to any closure, within a
 * window: a report closed last year is a new problem, not a reopened one. Once
 * someone has confirmed a fix there is nothing left to dispute — if the same
 * bin overflows again, that is a new report.
 */
export function feedbackOptions(
  status: Status,
  resolvedAt: Date | null,
  confirmedAt: Date | null,
  now: Date,
): { canConfirm: boolean; canReopen: boolean } {
  if (resolvedAt === null || confirmedAt !== null) return { canConfirm: false, canReopen: false };

  const windowMs = config.reopenWindowDays * 24 * HOUR;
  const withinWindow = now.getTime() - resolvedAt.getTime() <= windowMs;

  return {
    canConfirm: status === 'done',
    canReopen: withinWindow && canTransition(status, 'reopened', 'resident'),
  };
}

/* -------------------------------------------------------------------------
 * Priority
 *
 * The queue used to be ordered by urgency then age, which buries a medium
 * report that is two days late under a fresh high one, and gives no weight to
 * five residents reporting the same overflowing bin. The score below folds in
 * all of that. It is deliberately simple and explainable — an officer should
 * be able to say why something is at the top.
 * ---------------------------------------------------------------------- */

export interface PriorityInput {
  status: Status;
  urgency: Urgency;
  sla: SlaState;
  /** Other reports linked to this one as likely duplicates. */
  linkedReports: number;
  /** True when the reporter disputed a fix. */
  reopened: boolean;
  ageHours: number;
}

const URGENCY_WEIGHT: Readonly<Record<Urgency, number>> = { high: 50, medium: 30, low: 10 };
const SLA_WEIGHT: Readonly<Record<SlaState, number>> = {
  overdue: 40,
  at_risk: 20,
  on_track: 0,
  unknown: 0,
  met: 0,
  missed: 0,
};

/** Higher is more pressing. Closed reports always score 0 and sink. */
export function priorityScore(input: PriorityInput): number {
  if (!isOpen(input.status)) return 0;

  const corroboration = Math.min(input.linkedReports, 5) * 8;
  const disputed = input.reopened ? 25 : 0;
  // A slow creep so nothing open sits still forever; capped at two weeks.
  const age = Math.min(Math.max(input.ageHours, 0), 14 * 24) / 24;

  return Math.round(URGENCY_WEIGHT[input.urgency] + SLA_WEIGHT[input.sla] + corroboration + disputed + age);
}
