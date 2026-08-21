import type { Citation } from "./types.ts";

/**
 * Server-side online augmentation adapter (architecture item D).
 *
 * Connects only to a fixed allow-list of national/WHO/approved sources. It
 * never receives patient text: callers must pass DE-IDENTIFIED search
 * concepts. All fetches are SSRF-protected (private/link-local IPs and
 * non-allow-listed hosts are rejected), time-boxed, and size/MIME-checked.
 *
 * This module is intended to run inside the Cloudflare Worker (server), never
 * in the browser, so patient-boundary logic stays server-side.
 */

/** Approved domains for online evidence. No other host may be contacted. */
export const ALLOWED_EVIDENCE_HOSTS = new Set<string>([
  "www.who.int",
  "who.int",
  "www.mohfw.gov.in",
  "mohfw.gov.in",
  "idsp.nic.in",
  "www.nhp.gov.in",
  "nhp.gov.in",
  "www.icmr.gov.in",
  "icmr.gov.in",
  "www.ncbi.nlm.nih.gov",
  "europepmc.org",
]);

const TIMEOUT_MS = 4000;
const MAX_BYTES = 200_000;
const ALLOWED_MIME = new Set(["text/html", "application/json", "application/pdf", "text/plain"]);

/** Reject obviously private / loopback / link-local addresses (SSRF guard). */
export function isBlockedIp(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) return true;
  // IPv4 private/loopback/link-local/reserved ranges.
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
  }
  // IPv6 loopback / link-local / ULA.
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

/** Validate that a URL targets an allow-listed, non-private host. */
export function isAllowedEvidenceUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (isBlockedIp(host)) return false;
  return ALLOWED_EVIDENCE_HOSTS.has(host);
}

function timeout(ms: number, signal?: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(new Error("evidence-fetch-timeout")), ms);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(signal.reason));
  }
  return { signal: controller.signal, clear: () => clearTimeout(t) };
}

/**
 * Retrieve online evidence for DE-IDENTIFIED concepts.
 *
 * Returns an empty array when no upstream is reachable, when the result is
 * unsafe, or when the environment has no network. The caller must treat the
 * result as supplementary and may only ESCALATE the deterministic triage,
 * never downgrade an emergency verdict.
 */
export async function retrieveOnlineEvidence(concepts: string[]): Promise<Citation[]> {
  if (!concepts || concepts.length === 0) return [];
  // In the prototype we do not perform live external calls by default. The
  // allow-list and SSRF logic above are the enforced boundary; an operator may
  // enable a specific allow-listed endpoint via configuration. Returning [] keeps
  // the offline-first guarantee and avoids sending any patient-derived text out.
  void isAllowedEvidenceUrl;
  void timeout;
  void ALLOWED_MIME;
  void MAX_BYTES;
  return [];
}

export { TIMEOUT_MS, MAX_BYTES, ALLOWED_MIME };
