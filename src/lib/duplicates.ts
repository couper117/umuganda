/**
 * lib/duplicates.ts — is this the same problem someone already reported?
 *
 * Five residents reporting one overflowing bin should be one job with five
 * voices behind it, not five rows an officer has to recognise as the same.
 * A new report is linked to an existing one rather than merged or rejected:
 * the resident still gets their own reference, the officer sees the link and
 * the shared count raises the original's priority.
 *
 * The rule, with every input explicit so it can be tested:
 *
 *   - same category
 *   - the candidate is still open
 *   - filed within the window
 *   - and either both carry GPS and are within the radius,
 *     or (when either lacks GPS) they name the same cell
 *
 * GPS wins over the cell when both have it: two bins at either end of a large
 * cell are not the same bin, and one bin on a cell boundary is.
 */

import { config, type Category, type Status } from '../config';
import { distanceMeters } from './geo';
import { isOpen } from './workflow';

export interface DuplicateCandidate {
  id: number;
  category: Category | string | null;
  status: Status;
  cell: string | null;
  time: Date | null;
  latitude: number | null;
  longitude: number | null;
  /** If the candidate is itself a duplicate, link to its original instead. */
  duplicateOf: number | null;
}

export interface NewReportShape {
  category: Category;
  cell: string | null;
  latitude: number | null;
  longitude: number | null;
}

function sameCell(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase() && a.trim() !== '';
}

export function isLikelyDuplicate(report: NewReportShape, candidate: DuplicateCandidate, now: Date): boolean {
  if (candidate.category !== report.category) return false;
  if (!isOpen(candidate.status)) return false;
  if (candidate.time === null) return false;

  const ageMs = now.getTime() - candidate.time.getTime();
  if (ageMs < 0 || ageMs > config.duplicates.windowDays * 24 * 60 * 60 * 1000) return false;

  const bothHaveGps =
    report.latitude !== null && report.longitude !== null && candidate.latitude !== null && candidate.longitude !== null;

  if (bothHaveGps) {
    const d = distanceMeters(
      { latitude: report.latitude as number, longitude: report.longitude as number },
      { latitude: candidate.latitude as number, longitude: candidate.longitude as number },
    );
    return d <= config.duplicates.radiusMeters;
  }

  return sameCell(report.cell, candidate.cell);
}

/**
 * Pick the report to link to: the closest match by GPS when available,
 * otherwise the oldest, so every duplicate points at the first report of the
 * problem. A match that is itself a duplicate is followed to its original, so
 * links never chain.
 */
export function chooseOriginal(report: NewReportShape, candidates: readonly DuplicateCandidate[], now: Date): number | null {
  const matches = candidates.filter((c) => isLikelyDuplicate(report, c, now));
  if (matches.length === 0) return null;

  const hasGps = report.latitude !== null && report.longitude !== null;
  const ranked = [...matches].sort((a, b) => {
    if (hasGps && a.latitude !== null && b.latitude !== null && a.longitude !== null && b.longitude !== null) {
      const here = { latitude: report.latitude as number, longitude: report.longitude as number };
      return (
        distanceMeters(here, { latitude: a.latitude, longitude: a.longitude }) -
        distanceMeters(here, { latitude: b.latitude, longitude: b.longitude })
      );
    }
    return (a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0);
  });

  const best = ranked[0] as DuplicateCandidate;
  return best.duplicateOf ?? best.id;
}
