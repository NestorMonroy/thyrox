// Portado de omniroute: tests/unit/mitm-antigravity-reasoning-effort-override.test.ts (MIT),
// la parte de aliasConfig. La del traductor antigravity→openai va con el handler antigravity.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { hasInvalidReasoningEffort, normalizeAliasEntry, normalizeAliasMappings } from "../src/aliasConfig.ts";
test("normalizeAliasEntry upgrades a legacy plain-string mapping to { model }", () => {
  assert.deepEqual(normalizeAliasEntry(" cx/gpt-5.6-sol "), { model: "cx/gpt-5.6-sol" });
});

test("normalizeAliasEntry drops an empty legacy string", () => {
  assert.equal(normalizeAliasEntry("   "), null);
});

test("normalizeAliasEntry keeps a reasoning-only override and canonicalizes its casing", () => {
  assert.deepEqual(normalizeAliasEntry({ reasoningEffort: " HIGH " }), {
    reasoningEffort: "high",
  });
});

test("normalizeAliasEntry keeps canonical max and maps extra onto xhigh", () => {
  assert.deepEqual(normalizeAliasEntry({ model: "p/m", reasoningEffort: "max" }), {
    model: "p/m",
    reasoningEffort: "max",
  });
  assert.deepEqual(normalizeAliasEntry({ model: "p/m", reasoningEffort: "extra" }), {
    model: "p/m",
    reasoningEffort: "xhigh",
  });
});

test("normalizeAliasEntry drops an unrecognized reasoning effort while keeping the model", () => {
  assert.deepEqual(normalizeAliasEntry({ model: "p/m", reasoningEffort: "extreme" }), {
    model: "p/m",
  });
});

test("normalizeAliasEntry returns null for an entry with neither model nor reasoning effort", () => {
  assert.equal(normalizeAliasEntry({ reasoningEffort: "" }), null);
  assert.equal(normalizeAliasEntry({}), null);
  assert.equal(normalizeAliasEntry(null), null);
  assert.equal(normalizeAliasEntry(42), null);
});

test("normalizeAliasMappings upgrades a whole legacy record without a migration", () => {
  assert.deepEqual(
    normalizeAliasMappings({
      "gemini-3-flash-agent": "provider/model-id",
      "gemini-3-pro-agent": { reasoningEffort: "low" },
      empty: "",
    }),
    {
      "gemini-3-flash-agent": { model: "provider/model-id" },
      "gemini-3-pro-agent": { reasoningEffort: "low" },
    }
  );
});

test("normalizeAliasMappings tolerates malformed input", () => {
  assert.deepEqual(normalizeAliasMappings(null), {});
  assert.deepEqual(normalizeAliasMappings([1, 2, 3]), {});
});

test("hasInvalidReasoningEffort flags an unrecognized tier and accepts canonical ones", () => {
  assert.equal(
    hasInvalidReasoningEffort({ flash: { model: "p/m", reasoningEffort: "extreme" } }),
    true
  );
  assert.equal(
    hasInvalidReasoningEffort({ flash: { model: "p/m", reasoningEffort: "xhigh" } }),
    false
  );
  assert.equal(hasInvalidReasoningEffort({ flash: "provider/model-id" }), false);
  assert.equal(hasInvalidReasoningEffort({ flash: { model: "p/m" } }), false);
});

// -- Override-resolution: model + requested effort -> effective reasoning_effort ---------
