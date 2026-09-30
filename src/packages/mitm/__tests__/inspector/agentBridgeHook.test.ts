/**
 * El gancho del inspector: los tres casos de la referencia
 * (`omniroute: tests/unit/inspector-agent-bridge-hook.test.ts`, MIT) sobre
 * una base en memoria, más la finalización, el error y su instalación en los
 * handlers.
 */
import { afterEach, beforeEach, test } from "bun:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Database } from "bun:sqlite";

import { createAgentBridgeHook, installAgentBridgeHook } from "../../src/inspector/agentBridgeHook.ts";
import { TrafficBuffer, globalTrafficBuffer } from "../../src/inspector/buffer.ts";
import { setAgentBridgeHook } from "../../src/handlers/base.ts";
import { CodexHandler } from "../../src/handlers/codex.ts";
import { ensureAgentBridgeSchema } from "../../src/state/schema.ts";
import { addCustomHost, isCustomHost, toggleCustomHost } from "../../src/state/inspectorCustomHosts.ts";
import { runHandler } from "../handlers/_runHandler.ts";

let db: Database;
let buffer: TrafficBuffer;

beforeEach(() => {
  db = new Database(":memory:");
  ensureAgentBridgeSchema(db);
  buffer = new TrafficBuffer();
});
afterEach(() => {
  setAgentBridgeHook(null);
  db.close();
});

function hook() {
  return createAgentBridgeHook({ isCustomHost: (host) => isCustomHost(db, host), buffer });
}

function makeFakeReq(host: string): IncomingMessage {
  return {
    method: "POST",
    url: "/v1/chat/completions",
    headers: { host, "content-type": "application/json", authorization: "Bearer sk-secret-value-123456" },
  } as unknown as IncomingMessage;
}

const start = (host: string) =>
  hook().recordRequestStart({ req: makeFakeReq(host), body: Buffer.from("{}"), agentId: "codex", mappedModel: "gpt-4o" });

test("recordRequestStart: custom-host entry → source=custom-host, agent=undefined", async () => {
  addCustomHost(db, "my-app.example.com", "app", "My App");
  const entry = await start("my-app.example.com");
  assert.equal(entry.source, "custom-host");
  assert.equal(entry.agent, undefined);
  assert.equal(entry.host, "my-app.example.com");
});

test("recordRequestStart: non-custom host → source=agent-bridge, agent=agentId", async () => {
  const entry = await start("api.openai.com");
  assert.equal(entry.source, "agent-bridge");
  assert.equal(entry.agent, "codex");
});

test("recordRequestStart: disabled custom-host → source=agent-bridge (not matched)", async () => {
  addCustomHost(db, "disabled-app.example.com");
  toggleCustomHost(db, "disabled-app.example.com", false);
  const entry = await start("disabled-app.example.com");
  assert.equal(entry.source, "agent-bridge");
  assert.equal(entry.agent, "codex");
});

test("recordRequestStart: pushes an in-flight entry with sanitized request headers", async () => {
  const entry = await start("api.openai.com");
  const stored = buffer.get(entry.id);
  assert.equal(stored?.status, "in-flight");
  assert.equal(stored?.mappedModel, "gpt-4o");
  assert.ok(!JSON.stringify(stored?.requestHeaders).includes("sk-secret-value-123456"));
});

test("recordRequestComplete: masks the response and sums the latencies", async () => {
  const entry = await start("api.openai.com");
  hook().recordRequestComplete(entry, {
    status: 200,
    responseHeaders: { "set-cookie": "session=abcdef123456789" },
    responseBody: "token sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH",
    responseSize: 42,
    proxyLatencyMs: 5,
    upstreamLatencyMs: 20,
  });
  const stored = buffer.get(entry.id)!;
  assert.equal(stored.status, 200);
  assert.equal(stored.totalLatencyMs, 25);
  assert.ok(!JSON.stringify(stored.responseHeaders).includes("abcdef123456789"));
  assert.ok(!stored.responseBody!.includes("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH"));
});

test("recordRequestError: stores a sanitized error", async () => {
  const entry = await start("api.openai.com");
  hook().recordRequestError(entry, new Error("failed at /srv/app/src/secret.ts:10:2"));
  const stored = buffer.get(entry.id)!;
  assert.equal(stored.status, "error");
  assert.ok(!stored.error!.includes("/srv/app"));
});

test("installAgentBridgeHook: a handler run lands in the process buffer", async () => {
  installAgentBridgeHook(db);
  const before = globalTrafficBuffer.size();
  await runHandler(new CodexHandler(), { model: "gpt-5", messages: [] }, "mapped-model");
  const entries = globalTrafficBuffer.list();
  assert.equal(globalTrafficBuffer.size(), before + 1);
  const last = entries.find((e) => e.mappedModel === "mapped-model");
  assert.ok(last, "the handler must have recorded its request");
  assert.equal(last.status, 200);
});
