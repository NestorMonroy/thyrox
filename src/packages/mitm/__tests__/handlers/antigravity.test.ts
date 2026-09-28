// Porte de omniroute: tests/unit/mitm-handler-antigravity.test.ts (MIT).
import { afterEach, test } from "bun:test";
import assert from "node:assert/strict";

import { PRODUCT_NAME } from "@thyrox/config/product";

import {
  AntigravityHandler,
  convertGeminiToOpenAI,
  mergeAntigravityCatalog,
  proxyCatalogModels,
} from "../../src/handlers/antigravity.ts";
import { setAgentBridgeHook, type CompletionData } from "../../src/handlers/base.ts";
import { ANTIGRAVITY_TARGET } from "../../src/targets/antigravity.ts";
import { runHandler } from "./_runHandler.ts";

const savedPort = process.env.THYROX_PROXY_PORT;
const savedKeys = process.env.THYROX_PROXY_API_KEYS;
afterEach(() => {
  setAgentBridgeHook(null);
  if (savedPort === undefined) delete process.env.THYROX_PROXY_PORT;
  else process.env.THYROX_PROXY_PORT = savedPort;
  if (savedKeys === undefined) delete process.env.THYROX_PROXY_API_KEYS;
  else process.env.THYROX_PROXY_API_KEYS = savedKeys;
});

test("antigravity handler — forwards to the local proxy and pipes SSE", async () => {
  const r = await runHandler(
    new AntigravityHandler([]),
    { model: "gpt-4o", messages: [{ role: "user", content: "hi" }] },
    "claude-3.5-sonnet",
    { upstreamBody: "data: hello\n\ndata: world\n\n" }
  );
  assert.ok(r.fetchCalled);
  assert.ok(r.fetchUrl?.endsWith("/v1/chat/completions"));
  assert.equal(r.status, 200);
  assert.ok(r.responseChunks.join("").includes("hello"));
});

test("antigravity handler — propagates upstream failure as 500", async () => {
  const r = await runHandler(new AntigravityHandler([]), { model: "gpt-4o" }, "claude-3.5-sonnet", {
    upstreamStatus: 500,
    upstreamBody: "boom",
  });
  assert.equal(r.status, 500);
  assert.ok(!r.responseChunks.join("").includes("at /"));
});

test("convertGeminiToOpenAI — maps Gemini fields to OpenAI chat body", () => {
  const out = convertGeminiToOpenAI(
    {
      systemInstruction: { parts: [{ text: "be brief" }] },
      contents: [
        { role: "user", parts: [{ text: "hello" }] },
        { role: "model", parts: [{ text: "hi there" }] },
      ],
      generationConfig: { maxOutputTokens: 256, temperature: 0.4, topP: 0.9, stopSequences: ["STOP"] },
      thinkingConfig: { thinkingBudget: 1024 },
    },
    "claude-opus-4-6-thinking",
    true
  );
  assert.equal(out.model, "claude-opus-4-6-thinking");
  assert.equal(out.stream, true);
  assert.deepEqual(out.messages, [
    { role: "system", content: "be brief" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there" },
  ]);
  assert.equal(out.max_tokens, 256);
  assert.equal(out.temperature, 0.4);
  assert.equal(out.top_p, 0.9);
  assert.deepEqual(out.stop, ["STOP"]);
  const loose = out as unknown as Record<string, unknown>;
  assert.equal(loose.contents, undefined);
  assert.equal(loose.generationConfig, undefined);
  assert.equal(loose.thinkingConfig, undefined);
});

test("antigravity handler — converts raw Gemini body before forwarding", async () => {
  const r = await runHandler(
    new AntigravityHandler([]),
    {
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 64 },
      thinkingConfig: { thinkingBudget: 512 },
    },
    "ag-claude-opus-4-6-thinking",
    { upstreamBody: "data: pong\n\n", url: "/v1beta/models/gemini:streamGenerateContent" }
  );
  const forwarded = JSON.parse(r.fetchBody);
  assert.equal(forwarded.model, "ag-claude-opus-4-6-thinking");
  assert.equal(forwarded.stream, true);
  assert.deepEqual(forwarded.messages, [{ role: "user", content: "ping" }]);
  assert.equal(forwarded.max_tokens, 64);
  assert.equal(forwarded.contents, undefined);
  assert.equal(forwarded.generationConfig, undefined);
  assert.equal(forwarded.thinkingConfig, undefined);
});

test("convertGeminiToOpenAI — unwraps the cloudcode-pa `.request` envelope", () => {
  const out = convertGeminiToOpenAI(
    {
      project: "projects/123",
      model: "gemini-3-pro",
      userAgent: "Antigravity",
      requestType: "GENERATE",
      request: {
        systemInstruction: { parts: [{ text: "be brief" }] },
        contents: [
          { role: "user", parts: [{ text: "hello" }] },
          { role: "model", parts: [{ text: "hi there" }] },
        ],
        generationConfig: { maxOutputTokens: 256, temperature: 0.4 },
      },
    },
    "ag-claude-opus-4-6-thinking",
    true
  );
  assert.deepEqual(out.messages, [
    { role: "system", content: "be brief" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there" },
  ]);
  assert.equal(out.max_tokens, 256);
  assert.equal(out.temperature, 0.4);
});

test("antigravity handler — forwards a cloudcode envelope request with real messages", async () => {
  const r = await runHandler(
    new AntigravityHandler([]),
    {
      project: "projects/123",
      model: "gemini-3-pro",
      request: { contents: [{ role: "user", parts: [{ text: "ping" }] }], generationConfig: { maxOutputTokens: 64 } },
    },
    "ag-claude-opus-4-6-thinking",
    { upstreamBody: "data: pong\n\n", url: "/v1internal:streamGenerateContent" }
  );
  const forwarded = JSON.parse(r.fetchBody);
  assert.equal(forwarded.stream, true);
  assert.deepEqual(forwarded.messages, [{ role: "user", content: "ping" }]);
  assert.equal(forwarded.max_tokens, 64);
  assert.equal(forwarded.request, undefined);
  assert.equal(forwarded.project, undefined);
});

test("antigravity handler — non-streaming URL yields stream:false", async () => {
  const r = await runHandler(
    new AntigravityHandler([]),
    { contents: [{ role: "user", parts: [{ text: "hi" }] }] },
    "gpt-4o",
    { url: "/v1beta/models/gemini:generateContent" }
  );
  assert.equal(JSON.parse(r.fetchBody).stream, false);
});

test("antigravity handler — the inspector copy names the tools as the CLI does", async () => {
  let recorded: CompletionData | null = null;
  setAgentBridgeHook({ recordRequestComplete: (_entry, data) => (recorded = data) });
  const r = await runHandler(
    new AntigravityHandler([]),
    { contents: [{ role: "user", parts: [{ text: "hi" }] }] },
    "gpt-4o",
    { upstreamBody: 'data: {"name": "bash"}\n\ndata: {"name":"askuserquestion"}\n\n' }
  );
  assert.equal(recorded!.responseBody, 'data: {"name":"Bash"}\n\ndata: {"name":"AskUserQuestion"}\n\n');
  // Al agente le llega la respuesta tal cual.
  assert.ok(r.responseChunks.join("").includes('"name": "bash"'));
});

test("ANTIGRAVITY_TARGET — includes fetchAvailableModels and resolves its handler", async () => {
  assert.ok(ANTIGRAVITY_TARGET.endpointPatterns.includes("/v1internal:fetchAvailableModels"));
  const loaded = await ANTIGRAVITY_TARGET.handler();
  assert.equal(loaded.default, AntigravityHandler);
});

test("mergeAntigravityCatalog — merges dynamic models and prepends to agentModelSorts", () => {
  const merged = mergeAntigravityCatalog(
    {
      models: {
        "claude-sonnet-4-6": {
          displayName: "Sonnet 4.6",
          quotaInfo: { remainingFraction: 1.0, resetTime: "2026-09-18T00:00:00Z" },
        },
        "gemini-2.5-pro": { displayName: "Gemini 2.5 Pro" },
      },
      agentModelSorts: [{ groups: [{ modelIds: ["gemini-2.5-pro", "claude-sonnet-4-6"] }] }],
    },
    [
      { id: "coding-titans", displayName: "Coding Titans", description: "Deep Architecture & Complex Logic" },
      { id: "speed-demons", displayName: "Speed Demons", description: "Sub-second Daily Coding" },
    ]
  );
  const models = merged.models as Record<string, Record<string, unknown>>;
  assert.equal(models["coding-titans"]!.displayName, "Coding Titans");
  assert.equal(models["coding-titans"]!.descriptionText, "Deep Architecture & Complex Logic");
  assert.deepEqual(models["coding-titans"]!.quotaInfo, { remainingFraction: 1.0, resetTime: "2026-09-18T00:00:00Z" });
  assert.equal(models["speed-demons"]!.displayName, "Speed Demons");
  assert.ok(models["claude-sonnet-4-6"]);
  assert.ok(models["gemini-2.5-pro"]);
  const sorts = merged.agentModelSorts as Array<{ groups: Array<{ modelIds: string[] }> }>;
  assert.deepEqual(sorts[0]!.groups[0]!.modelIds, ["coding-titans", "speed-demons", "gemini-2.5-pro", "claude-sonnet-4-6"]);
});

test("mergeAntigravityCatalog — an array catalog clones its first model and skips existing ids", () => {
  const merged = mergeAntigravityCatalog(
    { models: [{ id: "gemini-2.5-pro", name: "gemini-2.5-pro", tier: "pro" }] },
    [{ id: "gemini-2.5-pro" }, { id: "combo-a" }]
  );
  assert.deepEqual(merged.models, [
    { id: "gemini-2.5-pro", name: "gemini-2.5-pro", tier: "pro" },
    { id: "combo-a", name: "combo-a", tier: "pro", displayName: "combo-a", descriptionText: `${PRODUCT_NAME} dynamic model (combo-a)` },
  ]);
});

test("mergeAntigravityCatalog — handles empty dynamicModels by returning catalog untouched", () => {
  const catalog = { models: { "gemini-2.5-flash": { displayName: "Gemini 2.5 Flash" } } };
  assert.equal(mergeAntigravityCatalog(catalog, []), catalog);
});

test("mergeAntigravityCatalog — handles missing agentModelSorts gracefully", () => {
  const merged = mergeAntigravityCatalog(
    { models: { "gemini-2.5-flash": { displayName: "Gemini 2.5 Flash" } } },
    [{ id: "custom-combo", displayName: "Custom Combo" }]
  );
  const sorts = merged.agentModelSorts as Array<{ groups: Array<{ modelIds: string[] }> }>;
  assert.deepEqual(sorts[0]!.groups[0]!.modelIds, ["custom-combo"]);
});

test("mergeAntigravityCatalog — preserves native model metadata when a dynamic id collides", () => {
  const merged = mergeAntigravityCatalog(
    {
      models: { "gemini-2.5-pro": { displayName: "Native Gemini 2.5 Pro", descriptionText: "Google Official", isNative: true } },
      agentModelSorts: [{ groups: [{ modelIds: ["gemini-2.5-pro"] }] }],
    },
    [
      { id: "gemini-2.5-pro", displayName: "Overwriting Combo" },
      { id: "coding-titans", displayName: "Coding Titans" },
    ]
  );
  const models = merged.models as Record<string, Record<string, unknown>>;
  assert.equal(models["gemini-2.5-pro"]!.displayName, "Native Gemini 2.5 Pro");
  assert.equal(models["gemini-2.5-pro"]!.isNative, true);
  assert.equal(models["coding-titans"]!.displayName, "Coding Titans");
});

test("antigravity handler — intercepts fetchAvailableModels and returns merged catalog", async () => {
  const upstreamCatalog = {
    models: { "claude-sonnet-4-6": { displayName: "Sonnet 4.6" }, "gemini-2.5-pro": { displayName: "Gemini 2.5 Pro" } },
    agentModelSorts: [{ groups: [{ modelIds: ["claude-sonnet-4-6", "gemini-2.5-pro"] }] }],
  };
  const r = await runHandler(
    new AntigravityHandler([{ id: "coding-titans", displayName: "Coding Titans" }]),
    {},
    "ag-claude-opus-4-6-thinking",
    { url: "/v1internal:fetchAvailableModels", upstreamBody: JSON.stringify(upstreamCatalog) }
  );
  assert.equal(r.status, 200);
  assert.equal(r.fetchUrl, "https://api.example.com/v1internal:fetchAvailableModels");
  const response = JSON.parse(r.responseChunks.join(""));
  assert.equal(response.models["coding-titans"].displayName, "Coding Titans");
  assert.ok(response.models["claude-sonnet-4-6"]);
  assert.equal(response.agentModelSorts[0].groups[0].modelIds[0], "coding-titans");
});

test("antigravity handler — propagates upstream error on fetchAvailableModels", async () => {
  const r = await runHandler(new AntigravityHandler([]), {}, "m", {
    url: "/v1internal:fetchAvailableModels",
    upstreamStatus: 502,
    upstreamBody: JSON.stringify({ error: "bad gateway" }),
  });
  assert.equal(r.status, 500);
  const body = r.responseChunks.join("");
  assert.ok(body.includes("mitm_error"));
  assert.ok(!body.includes("at /"));
});

test("the dynamic catalog is the model list the local proxy serves", async () => {
  let auth: string | null = null;
  const proxy = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: request => {
      auth = request.headers.get("authorization");
      return new URL(request.url).pathname === "/v1/models"
        ? Response.json({
            data: [
              { type: "model", id: "coding-titans", display_name: "Coding Titans", description: "Deep" },
              { type: "model", id: "claude-opus-5", display_name: "claude-opus-5" },
            ],
          })
        : new Response("not found", { status: 404 });
    },
  });
  try {
    process.env.THYROX_PROXY_PORT = String(proxy.port);
    process.env.THYROX_PROXY_API_KEYS = "local-key";
    assert.deepEqual(await new AntigravityHandler().getDynamicCatalogModels(), [
      { id: "coding-titans", displayName: "Coding Titans", description: "Deep" },
      { id: "claude-opus-5", displayName: "claude-opus-5" },
    ]);
    assert.equal(auth, "Bearer local-key");
  } finally {
    proxy.stop(true);
  }
});

test("an unreachable proxy yields an empty dynamic catalog", async () => {
  process.env.THYROX_PROXY_PORT = "9";
  assert.deepEqual(await proxyCatalogModels(), []);
});
