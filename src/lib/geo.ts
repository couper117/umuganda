/**
 * lib/geo.ts — coordinates from the reporter's phone.
 *
 * GPS is optional and treated as a hint, never as the routing key: the cell
 * still decides whose queue a report lands in. Coordinates are kept only when
 * they are plausible for Kigali, so a phone that reports 0,0 or a location in
 * another country does not plant a pin in the middle of the ocean.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Metres, as reported by the browser. Null when it did not say. */
  accuracy: number | null;
}

/** A generous box around the City of Kigali, with some margin. */
export const KIGALI_BOUNDS = { minLat: -2.15, maxLat: -1.8, minLng: 29.95, maxLng: 30.35 } as const;

/** Worse than this is not a location, it is a neighbourhood. */
export const MAX_ACCURACY_METERS = 2000;

function num(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function inKigali(lat: number, lng: number): boolean {
  return (
    lat >= KIGALI_BOUNDS.minLat && lat <= KIGALI_BOUNDS.maxLat && lng >= KIGALI_BOUNDS.minLng && lng <= KIGALI_BOUNDS.maxLng
  );
}

/**
 * Parse the hidden form fields. Returns null for anything missing, malformed,
 * outside Kigali or too imprecise to be useful — the report is still accepted,
 * just without a pin.
 */
export function parseCoordinates(lat: unknown, lng: unknown, accuracy: unknown): Coordinates | null {
  const latitude = num(lat);
  const longitude = num(lng);
  if (latitude === null || longitude === null) return null;
  if (!inKigali(latitude, longitude)) return null;

  const acc = num(accuracy);
  if (acc !== null && (acc < 0 || acc > MAX_ACCURACY_METERS)) return null;

  return {
    // Six decimal places is ~11 cm, which is already beyond what a phone knows.
    latitude: Math.round(latitude * 1e6) / 1e6,
    longitude: Math.round(longitude * 1e6) / 1e6,
    accuracy: acc === null ? null : Math.round(acc),
  };
}

/** Great-circle distance in metres. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000;
  const rad = (d: number): number => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A link an officer can open on their phone. OpenStreetMap needs no key. */
export function mapLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}
