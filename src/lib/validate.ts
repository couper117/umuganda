/**
 * lib/validate.ts — input validation.
 *
 * Port of the validation half of lib/security.php. Nothing reaches SQL that has
 * not been through here: the three controlled vocabularies are checked against
 * fixed lists, free text is trimmed and capped to the column width so MySQL
 * never has to silently truncate a resident's description, and references are
 * parsed with a strict pattern.
 *
 * Output escaping is not in this file. EJS escapes every `<%= %>` interpolation
 * by default, which replaces the `e()` helper the PHP templates called by hand.
 */

import { VALID_CATEGORIES, VALID_STATUSES, VALID_URGENCIES, config } from '../config';
import type { Category, Status, Urgency } from '../config';
import type { ValidationResult } from '../types';

/** C0 and C1 control characters, except tab (\x09) and newline (\x0A). */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Trim, strip control characters, and cap length. Returns null when the field
 * is empty after cleaning, which is how the schema stores "not provided".
 *
 * Length is counted in code points rather than UTF-16 units so a cap of 50 is
 * 50 characters as a reader would count them.
 */
export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const stripped = value.replace(CONTROL_CHARS, '').trim();
  if (stripped === '') return null;

  const points = Array.from(stripped);
  return points.length <= maxLength ? stripped : points.slice(0, maxLength).join('');
}

/** Return the value only if it appears in the allow-list, otherwise null. */
export function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export const asCategory = (value: unknown): Category | null => asEnum(value, VALID_CATEGORIES);
export const asUrgency = (value: unknown): Urgency | null => asEnum(value, VALID_URGENCIES);
export const asStatus = (value: unknown): Status | null => asEnum(value, VALID_STATUSES);

/**
 * Validate a full report submission.
 *
 * Category, urgency and location are required; everything else is cleaned and
 * capped but never rejected, so an optional field with odd content costs the
 * visitor nothing.
 */
export function validateReport(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const category = asCategory(body['category']);
  if (category === null) errors.push('category');

  const urgency = asUrgency(body['urgency']);
  if (urgency === null) errors.push('urgency');

  const location = cleanText(body['location'], config.limits.location);
  if (location === null) errors.push('location');

  const sector = cleanText(body['sector'], config.limits.sector);
  const details = cleanText(body['details'], config.limits.details);
  const name = cleanText(body['name'], config.limits.name);
  const contact = cleanText(body['contact'], config.limits.contact);

  if (errors.length > 0 || category === null || urgency === null || location === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { category, urgency, location, sector, details, name, contact },
  };
}

/**
 * Parse a CK-#### reference into a positive integer id, or null if malformed.
 * Accepts an optional hyphen and any case, matching the PHP original.
 */
export function parseReference(reference: unknown): number | null {
  if (typeof reference !== 'string') return null;

  const match = /^CK-?(\d{1,9})$/.exec(reference.trim().toUpperCase());
  if (match === null) return null;

  const id = Number.parseInt(match[1] as string, 10);
  return id > 0 ? id : null;
}

/**
 * Reject weak passwords. Returns an explanation, or null when acceptable.
 * Same rules as ck_password_problem().
 */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 12) {
    return 'Password must be at least 12 characters long.';
  }
  if (password.length > 200) {
    return 'Password must be 200 characters or fewer.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and numbers.';
  }
  return null;
}

/** Usernames are 3–50 characters of letters, numbers, dot, underscore, hyphen. */
export function validUsername(username: string): boolean {
  return /^[A-Za-z0-9._-]{3,50}$/.test(username);
}
