/**
 * Security headers applied to every response leaving the Worker.
 *
 * These protect visitors of Arogya Relay against clickjacking, MIME-type
 * confusion, referrer leakage, protocol downgrade, and injected-script
 * (XSS) attacks. They are deliberately written as a single reviewed list so
 * that a future change is visible in code review.
 *
 * Reference: OWASP Secure Headers Project, MDN HTTP headers documentation.
 */

/** Content types that are HTML documents and therefore need CSP + framing rules. */
const HTML_CONTENT_TYPE = "text/html";

/**
 * Content Security Policy.
 *
 * Notes on the specific relaxations, so they are not widened by accident:
 * - `'unsafe-inline'` for style-src is required because React/Next.js emits
 *   inline `style` attributes (for example the chart bar heights and the
 *   battery progress width in the dashboard).
 * - `'unsafe-inline'` for script-src is required by the Next.js App Router
 *   bootstrap and RSC flight data. Removing it needs per-request nonces.
 * - Google Fonts is allowed because `next/font/google` (Geist, Geist Mono)
 *   loads stylesheets from fonts.googleapis.com and files from
 *   fonts.gstatic.com.
 * - `object-src 'none'` and `base-uri 'self'` block plugin and base-tag
 *   injection. `frame-ancestors 'none'` stops the site being framed.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Permissions-Policy. Arogya Relay is a screening dashboard; it needs none of
 * these powerful browser features, so they are switched off explicitly.
 */
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

/** Headers that are safe and useful on every response, including assets. */
const BASE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": PERMISSIONS_POLICY,
};

/** Headers that only make sense on an HTML document response. */
const DOCUMENT_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
};

/**
 * Returns a copy of `response` carrying the security headers.
 *
 * A new Response is constructed rather than mutating `response.headers`,
 * because responses returned from `env.ASSETS.fetch()` and from the app-router
 * handler can have immutable header guards.
 */
export function withSecurityHeaders(response: Response): Response {
  // 101/204/304 responses must not be rewritten: constructing a Response with
  // a null body status and a body throws, and 304 must keep its exact headers.
  if (response.status === 101 || response.status === 204 || response.status === 304) {
    return response;
  }

  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(BASE_HEADERS)) {
    headers.set(name, value);
  }

  const contentType = headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes(HTML_CONTENT_TYPE)) {
    for (const [name, value] of Object.entries(DOCUMENT_HEADERS)) {
      // Do not clobber a CSP the framework already set deliberately.
      if (!headers.has(name)) headers.set(name, value);
    }
  }

  // Never advertise the server implementation.
  headers.delete("x-powered-by");
  headers.delete("server");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const SECURITY_HEADERS_FOR_TESTS = {
  base: BASE_HEADERS,
  document: DOCUMENT_HEADERS,
  csp: CONTENT_SECURITY_POLICY,
};
