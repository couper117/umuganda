/**
 * services/admins.ts — dashboard accounts.
 *
 * Port of lib/auth.php. The properties worth preserving, all of which the PHP
 * version got right:
 *
 *  - Passwords are bcrypt digests, never plaintext.
 *  - A wrong password and an unknown username produce the *same* message, and
 *    an unknown username still pays the hash-comparison cost, so the form
 *    cannot be used to enumerate valid accounts by response or by timing.
 *  - Repeated failures lock the account for a cooldown window.
 *  - The session id is regenerated on success, which blocks session fixation.
 */

import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2';
import { config } from '../config';
import { execute, logError, queryOne } from '../db';
import { passwordProblem, cleanText, validUsername } from '../lib/validate';
import type { AdminUserRow } from '../types';
import { audit } from './audit';

interface AdminRow extends RowDataPacket, AdminUserRow {}
interface CountRow extends RowDataPacket {
  c: number;
}

/** Cost factor. 12 is the current sensible default for bcrypt. */
const BCRYPT_ROUNDS = 12;

/**
 * A valid bcrypt digest of a throwaway value, used to spend comparable time on
 * an unknown username. Without this, "no such user" returns measurably faster
 * than "wrong password" and the form becomes an account oracle.
 */
const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-value', BCRYPT_ROUNDS);

export interface AuthResult {
  ok: boolean;
  message: string;
}

/** True when at least one admin account exists. */
export async function adminExists(): Promise<boolean> {
  const row = await queryOne<CountRow>('SELECT COUNT(*) AS c FROM admin_users');
  return Number(row?.c ?? 0) > 0;
}

/**
 * Create an admin account.
 *
 * Only reachable from the setup route, which itself only runs while zero
 * accounts exist.
 */
export async function createAdmin(
  rawUsername: unknown,
  password: unknown,
  ip: string,
): Promise<AuthResult> {
  const username = cleanText(rawUsername, config.limits.username);
  if (username === null || !validUsername(username)) {
    return {
      ok: false,
      message: 'Username must be 3–50 characters, using letters, numbers, dot, underscore or hyphen only.',
    };
  }

  const weak = passwordProblem(password);
  if (weak !== null) {
    return { ok: false, message: weak };
  }

  const hash = await bcrypt.hash(password as string, BCRYPT_ROUNDS);

  try {
    await execute('INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)', [
      username,
      hash,
      new Date(),
    ]);
  } catch (err) {
    const duplicate = typeof err === 'object' && err !== null && (err as { errno?: number }).errno === 1062;
    if (duplicate) {
      return { ok: false, message: 'That username is already taken.' };
    }
    logError('Admin account creation failed', err);
    return { ok: false, message: 'Could not create the account. Please try again.' };
  }

  await audit(username, 'admin_created', { detail: 'New dashboard account', ip });
  return { ok: true, message: 'Account created.' };
}

/**
 * Attempt a sign-in. On success the session is regenerated and populated.
 */
export async function login(
  req: Request,
  rawUsername: unknown,
  password: unknown,
  ip: string,
): Promise<AuthResult> {
  // One message for every failure mode that could reveal whether an account
  // exists.
  const generic: AuthResult = { ok: false, message: 'Incorrect username or password.' };

  const username = cleanText(rawUsername, config.limits.username);
  if (username === null || typeof password !== 'string' || password === '') {
    return generic;
  }

  const user = await queryOne<AdminRow>(
    'SELECT id, username, password_hash, created_at, last_login, failed_attempts, locked_until FROM admin_users WHERE username = ?',
    [username],
  );

  if (user === undefined) {
    // Spend comparable time so response timing does not reveal the absence.
    await bcrypt.compare(password, DUMMY_HASH);
    return generic;
  }

  // Honour an active lockout.
  if (user.locked_until !== null) {
    const until = new Date(user.locked_until).getTime();
    if (until > Date.now()) {
      const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60_000));
      return { ok: false, message: `Too many failed attempts. Try again in ${minutes} minute(s).` };
    }
  }

  if (!(await bcrypt.compare(password, user.password_hash))) {
    await registerFailedLogin(user, ip);
    return generic;
  }

  // Success. Reset counters, refresh the hash if the cost factor has moved on.
  if (needsRehash(user.password_hash)) {
    try {
      const fresh = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await execute('UPDATE admin_users SET password_hash = ? WHERE id = ?', [fresh, user.id]);
    } catch (err) {
      // A failed rehash must not block a valid sign-in.
      logError('Password rehash failed', err);
    }
  }

  await execute('UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?', [
    new Date(),
    user.id,
  ]);

  await regenerateSession(req);
  req.session.adminId = user.id;
  req.session.adminUsername = user.username;
  req.session.createdAt = Date.now();
  req.session.lastActivity = Date.now();
  // Issue a fresh CSRF token for the new session.
  delete req.session.csrfToken;

  await audit(user.username, 'login_success', { ip });
  return { ok: true, message: 'Signed in.' };
}

/**
 * Change the signed-in administrator's own password.
 *
 * Deliberate choices, all of them the reason this is a service function rather
 * than a couple of lines in the route:
 *
 *  - The current password is required. A session alone is not enough: an
 *    unattended browser would otherwise be a permanent account takeover, and
 *    re-authenticating is the standard defence against that.
 *  - A wrong current password counts towards the same lockout as a failed
 *    sign-in, so this form cannot be used as an unthrottled password oracle
 *    against an account whose session someone has borrowed.
 *  - The new password goes through the same passwordProblem() rules as the
 *    setup form, so nothing weaker can enter by this door.
 *  - On success every other session for this account is invalidated and the
 *    current one is regenerated. Changing a password is what you do when you
 *    think someone else has it, and it would be worthless if their session
 *    kept working.
 */
export async function changePassword(
  req: Request,
  currentPassword: unknown,
  newPassword: unknown,
  confirmPassword: unknown,
  ip: string,
): Promise<AuthResult> {
  const adminId = req.session.adminId;
  const actor = req.session.adminUsername;
  if (adminId === undefined || actor === undefined) {
    return { ok: false, message: 'Your session expired. Please sign in again.' };
  }

  if (typeof currentPassword !== 'string' || currentPassword === '') {
    return { ok: false, message: 'Enter your current password.' };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, message: 'The two new passwords do not match.' };
  }

  const weak = passwordProblem(newPassword);
  if (weak !== null) {
    return { ok: false, message: weak };
  }

  const user = await queryOne<AdminRow>(
    'SELECT id, username, password_hash, created_at, last_login, failed_attempts, locked_until FROM admin_users WHERE id = ?',
    [adminId],
  );

  if (user === undefined) {
    // The account was deleted while the session was open.
    return { ok: false, message: 'Your account no longer exists. Please sign in again.' };
  }

  if (user.locked_until !== null) {
    const until = new Date(user.locked_until).getTime();
    if (until > Date.now()) {
      const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60_000));
      return { ok: false, message: `Too many failed attempts. Try again in ${minutes} minute(s).` };
    }
  }

  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    await registerFailedLogin(user, ip);
    return { ok: false, message: 'Your current password is not correct.' };
  }

  if (currentPassword === newPassword) {
    return { ok: false, message: 'The new password must be different from your current one.' };
  }

  const hash = await bcrypt.hash(newPassword as string, BCRYPT_ROUNDS);

  try {
    await execute(
      'UPDATE admin_users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [hash, user.id],
    );
  } catch (err) {
    logError('Password change failed', err);
    return { ok: false, message: 'Could not change the password. Please try again.' };
  }

  await invalidateOtherSessions(req, user.id);

  // Rotate this session too, so the id that existed under the old password is
  // no longer valid anywhere.
  await regenerateSession(req);
  req.session.adminId = user.id;
  req.session.adminUsername = user.username;
  req.session.createdAt = Date.now();
  req.session.lastActivity = Date.now();
  delete req.session.csrfToken;

  await audit(user.username, 'password_changed', { targetId: user.id, ip });
  return { ok: true, message: 'Your password has been changed.' };
}

/**
 * Drop every stored session belonging to this admin except the current one.
 *
 * express-mysql-session keeps the serialised session in a JSON `data` column,
 * so the rows are matched on the adminId inside it. This is best effort: if the
 * sweep fails the password has still been changed, which is the part that
 * matters, so it logs rather than failing the request.
 */
async function invalidateOtherSessions(req: Request, adminId: number): Promise<void> {
  try {
    await execute('DELETE FROM sessions WHERE session_id <> ? AND JSON_EXTRACT(data, ?) = ?', [
      req.sessionID,
      '$.adminId',
      adminId,
    ]);
  } catch (err) {
    logError('Could not invalidate other sessions after a password change', err);
  }
}

/** True when the stored digest was made with a weaker cost factor. */
function needsRehash(hash: string): boolean {
  const parts = hash.split('$');
  const rounds = Number.parseInt(parts[2] ?? '', 10);
  return Number.isNaN(rounds) || rounds < BCRYPT_ROUNDS;
}

/** Increment the failure counter, locking the account at the threshold. */
async function registerFailedLogin(user: AdminUserRow, ip: string): Promise<void> {
  const attempts = Number(user.failed_attempts) + 1;

  if (attempts >= config.login.maxAttempts) {
    const until = new Date(Date.now() + config.login.lockoutSeconds * 1000);
    await execute('UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [
      attempts,
      until,
      user.id,
    ]);
    await audit(user.username, 'login_locked', { detail: `Locked after ${attempts} failed attempts`, ip });
    return;
  }

  await execute('UPDATE admin_users SET failed_attempts = ? WHERE id = ?', [attempts, user.id]);
  await audit(user.username, 'login_failed', { detail: `Attempt ${attempts}`, ip });
}

/** Sign out, destroying the session and its cookie. */
export async function logout(req: Request, ip: string): Promise<void> {
  const actor = req.session.adminUsername;
  if (actor !== undefined) {
    await audit(actor, 'logout', { ip });
  }
  await destroySession(req);
}

/** Promise wrapper around the callback-style session API. */
function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve) => {
    req.session.destroy((err) => {
      if (err) logError('Session destroy failed', err);
      // Resolve either way: the caller is about to redirect, and a failed
      // destroy is logged rather than shown.
      resolve();
    });
  });
}
