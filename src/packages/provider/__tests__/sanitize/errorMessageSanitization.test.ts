// Portado de omniroute: tests/unit/error-message-sanitization.test.ts (MIT), sólo
// los casos del saneador; el resto de ese archivo prueba rutas y la base de datos.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { sanitizeErrorMessage } from "../../src/sanitize/errorSanitization.ts";

test("sanitizeErrorMessage strips multi-line stack traces", () => {
  const input =
    "Cannot read property 'foo' of undefined\n    at handler (/srv/app/src/lib/x.ts:42:11)\n    at next (internal)";
  const out = sanitizeErrorMessage(input);
  assert.equal(out, "Cannot read property 'foo' of undefined");
  assert.ok(!out.includes("at handler"));
});

test("sanitizeErrorMessage replaces absolute paths with <path>", () => {
  const out1 = sanitizeErrorMessage("Failed to open /home/user/secret-project/src/config.ts:10");
  assert.ok(!out1.includes("/home/user/secret-project"));
  assert.ok(out1.includes("<path>"));

  const out2 = sanitizeErrorMessage("Module not found: C:\\Users\\admin\\app\\index.js:1:1");
  assert.ok(!out2.includes("C:\\Users\\admin"));
  assert.ok(out2.includes("<path>"));
});

test("sanitizeErrorMessage does not swallow a shielded route hint that follows an earlier redacted path (#6457)", () => {
  // Regression: an unshielded route-looking span ("on /v1/chat/completions")
  // followed by ambiguous prose ("Use POST") used to make the unquoted-path
  // scanner fail closed all the way to the end of the string, deleting a
  // second, legitimately-shielded route reference ("POST /v1/images/...")
  // and everything after it instead of just redacting the first span.
  const input =
    "Model 'x' is an image-generation model and cannot be used on /v1/chat/completions. Use POST /v1/images/generations instead.";
  const out = sanitizeErrorMessage(input);
  assert.match(out, /\/v1\/images\/generations/, "shielded route hint must survive");
  assert.match(out, /instead\.$/, "text after the shielded route hint must not be dropped");
  assert.ok(out.includes("<path>"), "the earlier unshielded route span is still redacted");
});

test("sanitizeErrorMessage handles non-string inputs safely", () => {
  assert.equal(sanitizeErrorMessage(undefined), "");
  assert.equal(sanitizeErrorMessage(null), "");
  assert.equal(sanitizeErrorMessage(42), "42");
  assert.equal(sanitizeErrorMessage(new Error("boom")), "Error: boom");
});
