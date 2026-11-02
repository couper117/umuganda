import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chooseOriginal, isLikelyDuplicate, type DuplicateCandidate } from '../src/lib/duplicates';
import { distanceMeters, parseCoordinates } from '../src/lib/geo';

const now = new Date('2026-10-10T12:00:00Z');
const daysAgo = (d: number): Date => new Date(now.getTime() - d * 86_400_000);

// Two points ~100 m apart near Kimironko market, and one ~1.1 km away.
const A = { latitude: -1.9497, longitude: 30.1263 };
const NEAR = { latitude: -1.9506, longitude: 30.1263 };
const FAR = { latitude: -1.9597, longitude: 30.1263 };

function candidate(over: Partial<DuplicateCandidate>): DuplicateCandidate {
  return {
    id: 1,
    category: 'full-bin',
    status: 'pending',
    cell: 'Bibare',
    time: daysAgo(1),
    latitude: null,
    longitude: null,
    duplicateOf: null,
    ...over,
  };
}

describe('coordinates', () => {
  it('keeps plausible Kigali coordinates and rounds them', () => {
    assert.deepEqual(parseCoordinates('-1.94970049', '30.12630001', '12.4'), {
      latitude: -1.9497,
      longitude: 30.1263,
      accuracy: 12,
    });
  });

  it('drops coordinates outside Kigali, malformed, or too imprecise', () => {
    assert.equal(parseCoordinates('0', '0', '5'), null);
    assert.equal(parseCoordinates('-1.95', 'abc', ''), null);
    assert.equal(parseCoordinates('-1.95', '30.1', '5000'), null);
    assert.equal(parseCoordinates('', '', ''), null);
  });

  it('measures distance sensibly', () => {
    const d = distanceMeters(A, NEAR);
    assert.ok(d > 90 && d < 110, String(d));
    assert.ok(distanceMeters(A, FAR) > 1000);
  });
});

describe('duplicate detection', () => {
  const report = { category: 'full-bin' as const, cell: 'bibare ', latitude: null, longitude: null };

  it('links same category, same cell, open, recent — ignoring case and spaces', () => {
    assert.ok(isLikelyDuplicate(report, candidate({}), now));
  });

  it('does not link across categories, closed reports or old reports', () => {
    assert.equal(isLikelyDuplicate(report, candidate({ category: 'litter' }), now), false);
    assert.equal(isLikelyDuplicate(report, candidate({ status: 'done' }), now), false);
    assert.equal(isLikelyDuplicate(report, candidate({ time: daysAgo(30) }), now), false);
  });

  it('lets GPS override the cell when both reports have it', () => {
    const gps = { ...report, ...A };
    assert.ok(isLikelyDuplicate(gps, candidate({ ...NEAR, cell: 'Somewhere else' }), now));
    assert.equal(isLikelyDuplicate(gps, candidate({ ...FAR }), now), false);
  });

  it('links to the first report of the problem, never to another duplicate', () => {
    const chosen = chooseOriginal(
      report,
      [candidate({ id: 9, time: daysAgo(1), duplicateOf: 4 }), candidate({ id: 5, time: daysAgo(2) })],
      now,
    );
    assert.equal(chosen, 5);
    assert.equal(chooseOriginal(report, [candidate({ id: 9, duplicateOf: 4 })], now), 4);
  });

  it('prefers the nearest match by GPS', () => {
    const gps = { ...report, ...A };
    const chosen = chooseOriginal(
      gps,
      [candidate({ id: 2, latitude: -1.9504, longitude: 30.1263, time: daysAgo(3) }), candidate({ id: 3, ...A })],
      now,
    );
    assert.equal(chosen, 3);
  });

  it('returns null when nothing matches', () => {
    assert.equal(chooseOriginal(report, [candidate({ category: 'other' })], now), null);
  });
});
