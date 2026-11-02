/**
 * services/media.ts — report photos on disk.
 *
 * Files live outside public/ and reach the browser only through GET /media/:name,
 * which accepts names matching exactly what this file generates. The name is 128
 * random bits, so it works as a capability: it is only ever given to staff and to
 * whoever holds the report's full reference, and cannot be guessed or enumerated.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { logError } from '../db';
import { sanitiseImage } from '../lib/image';

const NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png)$/;

export function isMediaName(name: unknown): name is string {
  return typeof name === 'string' && NAME_PATTERN.test(name);
}

export function mediaPath(name: string): string {
  return path.join(config.paths.uploads, name);
}

export function mediaUrl(name: string | null): string | null {
  return name === null || !isMediaName(name) ? null : `/media/${name}`;
}

/**
 * Validate, strip and store an uploaded photo. Returns the stored name, or null
 * when the bytes are not an acceptable image.
 */
export async function savePhoto(upload: Buffer): Promise<string | null> {
  const clean = sanitiseImage(upload);
  if (clean === null) return null;

  await fs.mkdir(config.paths.uploads, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${clean.kind === 'jpeg' ? 'jpg' : 'png'}`;
  // wx: never overwrite, even in the astronomically unlikely case of a collision.
  await fs.writeFile(mediaPath(name), clean.data, { flag: 'wx', mode: 0o640 });
  return name;
}

/** Best effort: a leftover file is a tidiness problem, not a reason to fail. */
export async function removePhoto(name: string | null): Promise<void> {
  if (name === null || !isMediaName(name)) return;
  try {
    await fs.unlink(mediaPath(name));
  } catch (err) {
    logError(`Could not remove photo ${name}`, err);
  }
}
