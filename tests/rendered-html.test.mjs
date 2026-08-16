import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Arogya Relay dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Arogya Relay — Offline-First Disease Monitoring for Field Health Workers<\/title>/i);
  assert.match(html, /Good morning, Sara\./);
  assert.match(html, /Screenings today/);
  assert.match(html, /Symptoms are rising in North Ridge\./);
  assert.match(html, /New screening/);
  assert.match(html, /Offline capture is active\./);
});

test("keeps the key dashboard workflows interactive and responsive", async () => {
  const [page, css, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /setActiveTab\("cases"\)/);
  assert.match(page, /openScreening/);
  assert.match(page, /function syncReports\(\)/);
  assert.match(page, /function saveScreening\(/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /Screening support only\./);

  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(readme, /frontend-only/i);
  assert.match(readme, /not a\s*>?\s*certified medical device/i);
});


/** Renders the site through the worker with an arbitrary request. */
async function fetchWorker(request) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    request,
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("sends the security headers that protect visitors", async () => {
  const response = await render();
  const header = (name) => response.headers.get(name) ?? "";

  assert.equal(header("x-content-type-options"), "nosniff");
  assert.equal(header("x-frame-options"), "DENY");
  assert.equal(header("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(header("strict-transport-security"), /max-age=31536000/);
  assert.equal(header("cross-origin-opener-policy"), "same-origin");
  assert.match(header("permissions-policy"), /camera=\(\)/);
  assert.match(header("permissions-policy"), /geolocation=\(\)/);

  // The implementation must never advertise the server stack.
  assert.equal(response.headers.get("x-powered-by"), null);

  const csp = header("content-security-policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
});

test("rejects HTTP methods the site does not serve", async () => {
  // Note: Node's Request constructor forbids TRACE/TRACK/CONNECT outright, so
  // they cannot be exercised here. The worker's allow-list still covers them.
  for (const method of ["PUT", "DELETE", "PATCH"]) {
    const response = await fetchWorker(new Request("http://localhost/", { method }));
    assert.equal(response.status, 405, `${method} should be rejected`);
    assert.match(response.headers.get("allow") ?? "", /GET/);
    // Even the rejection carries the security headers.
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});

test("never leaks local filesystem paths into the built output", async () => {
  const serverBundle = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  assert.ok(
    !/\/home\/[a-z0-9_-]+\//i.test(serverBundle),
    "built server bundle must not contain absolute local filesystem paths",
  );

  const html = await (await render()).text();
  assert.ok(!/\/home\/[a-z0-9_-]+\//i.test(html), "rendered HTML must not leak local paths");
});

test("provides the required application state and SEO routes", async () => {
  const [errorPage, notFound, loading, robots, sitemap] = await Promise.all([
    readFile(new URL("../app/error.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/not-found.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/loading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);

  assert.match(errorPage, /"use client"/);
  assert.match(errorPage, /reset\(\)/);
  assert.match(notFound, /404/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(robots, /sitemap/);
  assert.match(sitemap, /changeFrequency/);
});

test("keeps the dashboard reachable and operable by keyboard", async () => {
  const [layout, page, css] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  // Skip link and its target must both exist.
  assert.match(layout, /href="#main-content"/);
  assert.match(page, /id="main-content"/);
  assert.match(css, /\.skip-link/);

  // Zoom must not be locked (WCAG 2.2, 1.4.4).
  assert.match(layout, /maximumScale: 5/);

  // Escape closes the screening dialog and focus is restored.
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /openerRef\.current\?\.focus\(\)/);

  // Every button must declare an explicit type so none implicitly submits.
  const buttons = page.match(/<button[^>]*>/g) ?? [];
  const untyped = buttons.filter((tag) => !tag.includes("type="));
  assert.deepEqual(untyped, [], `buttons missing an explicit type: ${untyped.join(" | ")}`);

  // The pending sync timer must be cleaned up on unmount.
  assert.match(page, /clearTimeout\(syncTimer\.current\)/);
});
