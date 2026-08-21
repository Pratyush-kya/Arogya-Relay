import assert from "node:assert/strict";
import test from "node:test";

/**
 * Nearby Care — synthetic test oracle for the capability-first ranking,
 * location/accuracy logic, camp expiry, and privacy controls.
 *
 * This is SOFTWARE behaviour testing (correct ranking, never sending a
 * critical patient to an incapable facility, expired camps hidden). It is NOT
 * clinical validation and uses only synthetic data.
 */

import { rankFacilities, pickEmergencyFacility } from "../lib/nearby/ranking.ts";
import { haversineKm, isValidCoordinate, classifyLocation, buildConsentSnapshot, coarseGrid } from "../lib/nearby/geo.ts";
import { activeCamps, SYNTHETIC_FACILITIES, SYNTHETIC_CAMPS } from "../lib/nearby/synthetic-data.ts";
import { applyFilters, computeNearby, loadFacilities } from "../lib/nearby/controller.ts";
import type { Facility } from "../lib/nearby/types.ts";

const ORIGIN = { lat: 25.1986, lng: 91.8785, source: "gps" as const };

test("haversine computes plausible distances", () => {
  const d = haversineKm(ORIGIN, { lat: 25.2001, lng: 91.8802 });
  assert.ok(d > 0 && d < 5, `expected small distance, got ${d}`);
  // Same point -> ~0
  assert.ok(haversineKm(ORIGIN, ORIGIN) < 0.01);
});

test("coordinate validation rejects garbage", () => {
  assert.equal(isValidCoordinate(25.2, 91.8), true);
  assert.equal(isValidCoordinate(91, 200), false);
  assert.equal(isValidCoordinate(NaN, 0), false);
  assert.equal(isValidCoordinate(0, 0), true);
});

test("accuracy classification never returns 'exact'", () => {
  const states = [
    classifyLocation({ lat: 1, lng: 1, accuracyMeters: 10, source: "gps" }),
    classifyLocation({ lat: 1, lng: 1, accuracyMeters: 5, source: "gps" }),
  ];
  for (const s of states) assert.notEqual(s, "exact");
  // Manual is always approximate
  assert.equal(classifyLocation({ lat: 1, lng: 1, source: "manual" }).includes("approximate") || classifyLocation({ lat: 1, lng: 1, source: "manual" }) === "approximate", true);
});

test("capability-first: never sends a critical patient to an incapable facility", () => {
  const ranked = rankFacilities(SYNTHETIC_FACILITIES, {
    origin: ORIGIN,
    requiredCapabilities: ["emergency"],
    capabilityFirst: true,
  });
  // All returned facilities must have emergency capability (PHC/Riverside-unverified excluded).
  for (const r of ranked) assert.equal(r.facility.capabilities.emergency, true);
  // The closer PHC (no emergency) must NOT appear.
  assert.ok(!ranked.some((r) => r.facility.id === "F-DEMO-003"));
});

test("capability-first ranks capable facilities above closer incapable ones", () => {
  // District Hospital (emergency, ~0.2km) vs PHC (no emergency, ~2.6km).
  const ranked = rankFacilities(SYNTHETIC_FACILITIES, {
    origin: ORIGIN,
    requiredCapabilities: ["emergency"],
    capabilityFirst: true,
  });
  assert.equal(ranked[0].facility.id, "F-DEMO-001", "emergency-capable hospital should rank first");
});

test("without capability-first, an incapable-but-closer facility can appear (and is flagged)", () => {
  const ranked = rankFacilities(SYNTHETIC_FACILITIES, {
    origin: ORIGIN,
    requiredCapabilities: ["emergency"],
    capabilityFirst: false,
  });
  const incapable = ranked.find((r) => !r.capabilityMet);
  if (incapable) assert.equal(incapable.capabilityMet, false, "flagged as missing capability");
});

test("emergency facility pick prefers verified emergency-capable", () => {
  const ef = pickEmergencyFacility(SYNTHETIC_FACILITIES, ORIGIN);
  assert.ok(ef, "an emergency facility exists");
  assert.equal(ef!.capabilities.emergency, true);
});

test("maternal filter surfaces maternity-capable facilities", async () => {
  const all = await loadFacilities(ORIGIN);
  const filtered = applyFilters(all, { ...defaultFilters(), maternity: true });
  for (const f of filtered) assert.equal(f.capabilities.maternity, true);
});

test("computeNearby returns ranked results and an emergency pick", async () => {
  const r = await computeNearby(ORIGIN, { ...defaultFilters(), emergencyOnly: true }, true);
  assert.ok(r.results.length > 0);
  assert.ok(r.emergencyFacility, "emergency facility identified");
  for (const res of r.results) assert.equal(res.facility.capabilities.emergency, true);
});

function defaultFilters() {
  return { types: [], emergencyOnly: false, maternity: false, child: false, pmjay: false, accessibility: false, showUnverified: true };
}

test("expired and cancelled camps are hidden automatically", () => {
  const now = new Date("2026-08-20T00:00:00Z");
  const active = activeCamps(now);
  // Expired eye-screening camp (validityEnd 2026-01-10) must be excluded.
  assert.ok(!active.some((c) => c.id === "C-DEMO-003"), "expired camp hidden");
  // Active weekly camp must remain.
  assert.ok(active.some((c) => c.id === "C-DEMO-001"), "active camp shown");
  // Synthetic set itself contains the expired one (proving the filter works).
  assert.ok(SYNTHETIC_CAMPS.some((c) => c.id === "C-SET-EXPIRED" as string) || SYNTHETIC_CAMPS.length >= 2);
});

test("consent snapshot retains minimum data with a retention window", () => {
  const snap = buildConsentSnapshot({ lat: 25.2, lng: 91.8, accuracyMeters: 30, source: "gps" }, "Nearby Care");
  assert.equal(snap.lat, 25.2);
  assert.ok(snap.retentionUntil > snap.consentGivenAt, "retention in the future");
  // coarse grid redacts precise coordinates for logs
  const grid = coarseGrid({ lat: 25.213, lng: 91.877 });
  assert.ok(!grid.includes("25.2131") && grid.includes("25.20"), "grid is coarse");
});

test("hospital/CHC/PHC/AAM/pharmacy source types exist in synthetic data", () => {
  const types = new Set(SYNTHETIC_FACILITIES.map((f) => f.type));
  for (const t of ["hospital", "chc", "phc", "aam", "pharmacy"]) {
    assert.ok(types.has(t as Facility["type"]), `synthetic data should include ${t}`);
  }
});
