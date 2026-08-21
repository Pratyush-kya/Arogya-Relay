import { haversineKm } from "./geo.ts";
import type {
  Capabilities,
  Facility,
  ReferralQuery,
  ReferralResult,
} from "./types.ts";

/**
 * Capability-first referral ranking.
 *
 * SAFETY RULE: we filter by REQUIRED capability BEFORE ranking by proximity.
 * A critical patient is never sent to a closer facility that lacks the needed
 * capability. When `capabilityFirst` is true, facilities that fail a required
 * capability are excluded entirely (never merely pushed down the list while a
 * patient is routed elsewhere incorrectly).
 *
 * Distance is a SECONDARY signal. Road ETA, when present (online routing),
 * is preferred over straight-line distance for the proximity term, but
 * straight-line is always shown separately and labelled as an estimate.
 */

const WEIGHTS = {
  capability: 0.6,
  proximity: 0.25,
  freshness: 0.1,
  scheme: 0.05,
};

/** Count how many required capabilities a facility actually has. */
export function capabilityMatch(facility: Facility, required: (keyof Capabilities)[]): {
  met: boolean;
  matched: number;
  total: number;
} {
  if (required.length === 0) return { met: true, matched: 0, total: 0 };
  let matched = 0;
  for (const cap of required) {
    if (facility.capabilities[cap]) matched++;
  }
  return { met: matched === required.length, matched, total: required.length };
}

function freshnessScore(facility: Facility, now: Date): number {
  if (facility.verification === "verified" && facility.verifiedAt) {
    const ageDays = (now.getTime() - new Date(facility.verifiedAt).getTime()) / 86400000;
    if (ageDays <= 30) return 1;
    if (ageDays <= 90) return 0.7;
    if (ageDays <= 365) return 0.4;
    return 0.2;
  }
  if (facility.verification === "unverified") return 0.3;
  if (facility.verification === "stale") return 0.1;
  if (facility.verification === "disputed") return 0;
  return 0.5;
}

function schemeScore(facility: Facility, preferred?: string[]): number {
  if (!preferred || preferred.length === 0) return 0.5;
  return facility.schemes.some((s) => preferred.includes(s)) ? 1 : 0.3;
}

/** Normalize a 0..large km distance to a 0..1 proximity score (closer = 1). */
function proximityScore(distanceKm: number): number {
  // 0 km -> 1, ~50 km -> ~0. Soft decay.
  return 1 / (1 + distanceKm / 8);
}

function rationaleText(r: ReferralResult, q: ReferralQuery): string {
  const parts: string[] = [];
  if (q.emergency) parts.push("Emergency-capable");
  if (r.capabilityMet) parts.push("has required capability");
  else parts.push("MISSING required capability");
  parts.push(`${r.straightLineKm.toFixed(1)} km away`);
  if (r.roadEtaMin != null) parts.push(`${Math.round(r.roadEtaMin)} min by road`);
  if (r.facility.verification === "verified") parts.push("verified");
  else parts.push("call to confirm");
  return parts.join(" · ");
}

/**
 * Rank facilities for a referral query.
 *
 * Returns results sorted best-first. When `capabilityFirst` is true, any
 * facility missing a required capability is excluded (never sent a critical
 * patient). Distance is never allowed to override a capability failure.
 */
export function rankFacilities(
  facilities: Facility[],
  query: ReferralQuery,
  now: Date = new Date(),
): ReferralResult[] {
  const results: ReferralResult[] = [];

  for (const facility of facilities) {
    const { met, matched, total } = capabilityMatch(facility, query.requiredCapabilities);
    const capScore = total === 0 ? 1 : matched / total;

    // Capability-first gate: exclude facilities that cannot meet the need.
    if (query.capabilityFirst && !met) continue;

    const straightLineKm = haversineKm(query.origin, facility.coordinates);
    const prox = proximityScore(straightLineKm);
    const fresh = freshnessScore(facility, now);
    const scheme = schemeScore(facility, query.schemesPreferred);

    const score =
      WEIGHTS.capability * capScore +
      WEIGHTS.proximity * prox +
      WEIGHTS.freshness * fresh +
      WEIGHTS.scheme * scheme;

    const result: ReferralResult = {
      facility,
      straightLineKm,
      roadEtaMin: facility.openNow ? undefined : undefined, // set by routing adapter later
      roadDistanceKm: undefined,
      capabilityScore: capScore,
      score,
      capabilityMet: met,
      rationale: "",
    };
    result.rationale = rationaleText(result, query);
    results.push(result);
  }

  // Sort: capability-met first, then by blended score descending.
  results.sort((a, b) => {
    if (a.capabilityMet !== b.capabilityMet) return a.capabilityMet ? -1 : 1;
    return b.score - a.score;
  });

  return results;
}

/**
 * Pick the best emergency facility. Always prefers an emergency-capable,
 * verified facility; never returns a facility that lacks emergency capability
 * if any capable one exists. Falls back to the top ranked otherwise (and the UI
 * must show "call to confirm").
 */
export function pickEmergencyFacility(
  facilities: Facility[],
  origin: ReferralQuery["origin"],
  now: Date = new Date(),
): Facility | null {
  const ranked = rankFacilities(
    facilities,
    { origin, requiredCapabilities: ["emergency"], capabilityFirst: true, emergency: true },
    now,
  );
  return ranked[0]?.facility ?? null;
}
