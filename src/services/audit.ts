/**
 * services/audit.ts — the audit trail.
 *
 * Port of ck_audit(). Records privileged actions so destructive changes are
 * attributable: status changes, deletions, logins, failed logins and lockouts.
 *
 * A failure to write an audit row is logged but never propagated — the action
 * it describes has already happened, and throwing here would turn a successful
 * delete into a 500 that misleads the operator about what took place.
 */

import { execute, logError } from '../db';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_locked'
  | 'logout'
  | 'admin_created'
  | 'password_changed'
  | 'status_change'
  | 'report_deleted';

export async function audit(
  actor: string,
  action: AuditAction,
  options: { targetId?: number | undefined; detail?: string | undefined; ip: string },
): Promise<void> {
  try {
    await execute(
      'INSERT INTO audit_log (occurred_at, actor, action, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [new Date(), actor, action, options.targetId ?? null, options.detail ?? null, options.ip],
    );
  } catch (err) {
    logError(`Failed to write audit row for ${action}`, err);
  }
}
