import type { Coordinates, LocationState } from "./types.ts";

/**
 * Geospatial + location-consent helpers for Nearby Care.
 *
 * Pure, testable, browser-agnostic logic. The UI layer handles the actual
 * `navigator.geolocation` calls; this module classifies readings, validates
 * coordinates, and converts between units. We never call browser location
 * "exact" and never use a poor-accuracy fix as if it were precise.
 */

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (haversine) distance in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Validate a WGS84 coordinate. Rejects out-of-range or non-finite values. */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Maximum GPS accuracy (metres) we treat as "accurate" for referral purposes. */
export const ACCURATE_THRESHOLD_M = 50;
/** Above this accuracy (metres) we require confirmation before routing. */
export const POOR_ACCURACY_M = 500;
/** A reading older than this (minutes) is "stale". */
export const STALE_AFTER_MIN = 30;

/**
 * Classify a location reading into one of the UX states.
 * Never returns "exact"; worst case is "accurate" (within threshold).
 */
export function classifyLocation(
  pos: Coordinates,
): LocationState {
  if (pos.source === "manual") return "approximate";
  if (typeof pos.accuracyMeters !== "number") return "approximate";
  if (pos.accuracyMeters <= ACCURATE_THRESHOLD_M) return "accurate";
  if (pos.accuracyMeters <= POOR_ACCURACY_M) return "approximate";
  // Poor accuracy — still usable only with confirmation upstream.
  return "approximate";
}

/** True if the reading is older than STALE_AFTER_MIN. */
export function isStale(pos: Coordinates, now: Date = new Date()): boolean {
  if (!pos.capturedAt) return false;
  const ageMin = (now.getTime() - new Date(pos.capturedAt).getTime()) / 60000;
  return ageMin > STALE_AFTER_MIN;
}

/**
 * Format a distance for display with local units. Returns "X.X km" or, for very
 * short distances, "Y m".
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Format an ETA in minutes as a friendly string. */
export function formatEta(min: number): string {
  if (min < 1) return "<1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Minimum confirmed referral snapshot — the only location we persist, and only
 * after explicit consent. Continuous history is never retained by default.
 */
export interface ConsentSnapshot {
  lat: number;
  lng: number;
  accuracyMeters: number;
  capturedAt: string;
  source: Coordinates["source"];
  purpose: string;
  consentGivenAt: string;
  retentionUntil: string;
}

export function buildConsentSnapshot(
  pos: Coordinates,
  purpose: string,
  retentionDays = 30,
  now: Date = new Date(),
): ConsentSnapshot {
  const until = new Date(now.getTime() + retentionDays * 86400000);
  return {
    lat: pos.lat,
    lng: pos.lng,
    accuracyMeters: pos.accuracyMeters ?? 0,
    capturedAt: pos.capturedAt ?? now.toISOString(),
    source: pos.source ?? "gps",
    purpose,
    consentGivenAt: now.toISOString(),
    retentionUntil: until.toISOString(),
  };
}

/** Redact coordinates for logs/analytics: keep a coarse grid cell only. */
export function coarseGrid(pos: Coordinates, cellDegrees = 0.05): string {
  const lat = Math.floor(pos.lat / cellDegrees) * cellDegrees;
  const lng = Math.floor(pos.lng / cellDegrees) * cellDegrees;
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}
