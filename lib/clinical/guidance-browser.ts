/**
 * Browser-safe entry for the Care Guidance assembly.
 *
 * Re-exports the deterministic, offline-first guidance builder without any
 * Node-only or server-only modules (the audit/persistence layer and the D1
 * database import are intentionally excluded so they never reach the client
 * bundle). The rules engine and curated knowledge pack are pure and run fully
 * offline with no API key.
 */
export { assembleGuidance, URGENCY_PLAIN } from "./guidance.ts";
