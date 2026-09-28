// Portado de omniroute: tests/unit/mitm-handler-codex.test.ts (MIT), sobre bun:test.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { CodexHandler } from "../../src/handlers/codex.ts";
import { runHandler } from "./_mitmHandlerHarness.ts";

test("codex handler — forwards Chat Completions payload via OmniRoute", async () => {
  const r = await runHandler(
    new CodexHandler(),
    { model: "gpt-4.1", messages: [] },
    "gpt-4o-mini"
  );
  assert.ok(r.fetchCalled);
  assert.equal(r.status, 200);
  assert.ok(r.fetchUrl?.endsWith("/v1/chat/completions"));
  const sent = JSON.parse(r.fetchBody);
  assert.equal(sent.model, "gpt-4o-mini");
});
