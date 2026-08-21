import assert from "node:assert/strict";
import test from "node:test";

import { cleanText, inspectJsonRequest } from "../lib/http-security.ts";

test("JSON request guard accepts a bounded same-origin request", () => {
  const request = new Request("https://example.test/api/care-guidance", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-length": "128",
      origin: "https://example.test",
      "sec-fetch-site": "same-origin",
    },
    body: "{}",
  });
  assert.equal(inspectJsonRequest(request), null);
});

test("JSON request guard rejects cross-site, oversized, and wrong-type writes", () => {
  assert.equal(inspectJsonRequest(new Request("https://example.test/api", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }))?.status, 415);
  assert.equal(inspectJsonRequest(new Request("https://example.test/api", { method: "POST", headers: { "content-type": "application/json", "content-length": "99999" }, body: "{}" }))?.status, 413);
  assert.equal(inspectJsonRequest(new Request("https://example.test/api", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.test" }, body: "{}" }))?.status, 403);
});

test("free text is bounded and control characters are removed", () => {
  assert.equal(cleanText("  cough\u0000\nfever  ", 40), "cough  fever");
  assert.equal(cleanText("abcdefgh", 4), "abcd");
  assert.equal(cleanText(42, 4), "");
});
