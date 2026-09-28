// Portado de omniroute: tests/unit/mitm-handler-openCode.test.ts (MIT), sobre bun:test.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { OpenCodeHandler } from "../../src/handlers/openCode.ts";
import { runHandler } from "./_runHandler.ts";

test("open-code handler — happy path forwards Chat Completions payload", async () => {
  const r = await runHandler(
    new OpenCodeHandler(),
    { model: "gpt-4o", messages: [] },
    "claude-3.5-sonnet"
  );
  assert.ok(r.fetchCalled);
  assert.equal(r.status, 200);
  const sent = JSON.parse(r.fetchBody);
  assert.equal(sent.model, "claude-3.5-sonnet");
});
