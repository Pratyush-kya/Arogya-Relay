/** Shared request guards for JSON API routes. */

export interface RequestGuardIssue {
  status: 403 | 413 | 415;
  error: string;
}
export const API_RESPONSE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
} as const;

/**
 * Reject cross-site browser writes, unexpected content types, and bodies whose
 * declared size exceeds the route's processing ceiling. Authentication and
 * schema validation remain separate required layers.
 */
export function inspectJsonRequest(request: Request, maxBytes = 16_384): RequestGuardIssue | null {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return { status: 415, error: "Content-Type must be application/json." };
  }

  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      return { status: 413, error: "Request body is too large." };
    }
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return { status: 403, error: "Cross-site request rejected." };
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return { status: 403, error: "Request origin rejected." };
      }
    } catch {
      return { status: 403, error: "Request origin rejected." };
    }
  }

  return null;
}

export function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength)
    : "";
}

/**
 * Constant-time string comparison (timing-attack resistant).
 *
 * Used by the authorization helper to compare bearer tokens. A naive
 * `===` short-circuits on the first mismatched byte, leaking timing signal
 * that an attacker could use to guess a secret token byte-by-byte. This
 * compares every byte regardless of where the first difference occurs and
 * runs even when the lengths differ, so the comparison cost does not depend
 * on the shared prefix.
 *
 * Implemented with only `TextEncoder` so it runs identically in the Cloudflare
 * Workers runtime and in Node's test runner (no `node:crypto` dependency).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  const length = Math.max(ab.length, bb.length);
  const padA = new Uint8Array(length);
  const padB = new Uint8Array(length);
  padA.set(ab);
  padB.set(bb);

  let difference = ab.length ^ bb.length;
  for (let i = 0; i < length; i++) {
    difference |= padA[i] ^ padB[i];
  }
  return difference === 0;
}
