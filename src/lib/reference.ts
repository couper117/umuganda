/**
 * lib/reference.ts — the codes residents are given.
 *
 * References used to be CK-<id>, which anyone could walk: CK-1, CK-2, CK-3.
 * The rate limiter made that slow, not impossible. New reports carry a short
 * random token as well, CK-<id>-<token>, and a lookup must present it.
 *
 * Reports filed before tokens existed keep working with the bare CK-<id> the
 * resident was given — breaking every reference already written on a scrap of
 * paper would be worse than the leak — but only while their token column is
 * empty. Once a row has a token, the bare form no longer finds it.
 */

import crypto from 'node:crypto';

/** No 0/O, 1/I/L: these get read out over the phone and copied by hand. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const TOKEN_LENGTH = 6;

/** ~29.7 bits per token, on top of the id, behind a rate limit. */
export function generateToken(): string {
  const bytes = crypto.randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i += 1) {
    // 256 is not a multiple of 31, so reject the top of the range to keep the
    // distribution even rather than biasing toward the first characters.
    let b = bytes[i] as number;
    while (b >= 248) b = crypto.randomBytes(1)[0] as number;
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

export function formatReference(id: number, token: string | null): string {
  return token === null || token === '' ? `CK-${id}` : `CK-${id}-${token}`;
}

export interface ParsedReference {
  id: number;
  token: string | null;
}

/**
 * Accepts CK-12, CK12, ck-12-7kq4mz and stray spaces. Case is folded; nothing
 * else is guessed at. Anything malformed is null.
 */
export function parseReference(value: unknown): ParsedReference | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  const match = /^CK-?(\d{1,9})(?:-([2-9A-HJKMNP-Z]{6}))?$/.exec(cleaned);
  if (match === null) return null;
  const id = Number.parseInt(match[1] as string, 10);
  if (!(id > 0)) return null;
  return { id, token: match[2] ?? null };
}

/**
 * Does a presented reference unlock this row?
 *
 *   row has a token   → the reference must carry the same token
 *   row has no token  → legacy report; the bare id is enough
 *
 * Compared in constant time, though at 6 characters behind a rate limit the
 * timing channel is academic. It costs nothing to close.
 */
export function referenceMatches(stored: string | null, presented: string | null): boolean {
  if (stored === null || stored === '') return true;
  if (presented === null) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(presented);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
