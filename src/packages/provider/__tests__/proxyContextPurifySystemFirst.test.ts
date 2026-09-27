/**
 * El aviso de historia recortada va dentro del primer mensaje de sistema, o
 * como un único mensaje de sistema al principio: varias pasarelas rechazan un
 * mensaje de sistema que no esté en la posición 0. Casos de OmniRoute
 * `tests/unit/context-manager-purify-system-first.test.ts` (a58000c7).
 */
import { test } from 'bun:test'
import assert from 'node:assert/strict'
const CM = (await import(process.env.CONTEXT_MANAGER_MODULE ?? '../src/proxy/context/contextManager.ts')) as typeof import('../src/proxy/context/contextManager.ts')
const { compressContext, estimateTokens, getTokenLimit, fixToolPairs, fixToolAdjacency, stripTrailingAssistantOrphanToolUse, stripTrailingAssistantForProvider, isInlineBase64DocumentBlock, isInlineBase64ImageBlock, pruneOlderInlineImages } = CM

function bigTurn(n: number) {
  return { role: "user", content: `turn ${n}: ${"x".repeat(4_000)}` };
}

function run(body: Record<string, unknown>) {
  // ~30k tokens of history vs a small target forces Layer-3 purify_history.
  return compressContext(body, { maxTokens: 5_000, reserveTokens: 0 });
}

function systemIndices(messages: Array<{ role: string }>) {
  return messages.map((m, i) => (m.role === "system" ? i : -1)).filter((i) => i >= 0);
}

test("purify_history merges dropped-notice into existing leading system message", () => {
  const body = {
    model: "any-model",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      ...Array.from({ length: 12 }, (_, i) => bigTurn(i)),
    ],
  };
  const result = run(body);
  assert.equal(result.compressed, true);
  const messages = (result.body as { messages: Array<Record<string, unknown>> }).messages;
  assert.deepEqual(systemIndices(messages as Array<{ role: string }>).slice(1), []);
  const first = messages[0];
  assert.equal(first.role, "system");
  const text = String(first.content);
  assert.match(text, /Context compressed: earlier messages removed/);
  assert.match(text, /You are a helpful assistant\./);
});

test("purify_history prepends a single system notice when no system message exists", () => {
  const body = {
    model: "any-model",
    messages: Array.from({ length: 12 }, (_, i) => bigTurn(i)),
  };
  const result = run(body);
  assert.equal(result.compressed, true);
  const messages = (result.body as { messages: Array<Record<string, unknown>> }).messages;
  assert.deepEqual(systemIndices(messages as Array<{ role: string }>), [0]);
  assert.match(String(messages[0].content), /Context compressed: earlier messages removed/);
});

test("purify_history merges into leading developer message without adding a second one", () => {
  const body = {
    model: "any-model",
    messages: [
      { role: "developer", content: "dev instructions" },
      ...Array.from({ length: 12 }, (_, i) => bigTurn(i)),
    ],
  };
  const result = run(body);
  assert.equal(result.compressed, true);
  const messages = (result.body as { messages: Array<Record<string, unknown>> }).messages;
  assert.deepEqual(
    messages.filter((m) => m.role === "developer").length,
    1,
    "exactly one developer message"
  );
  assert.match(String(messages[0].content), /Context compressed: earlier messages removed/);
  assert.match(String(messages[0].content), /dev instructions/);
});

test("no compression means no notice and untouched history", () => {
  const body = {
    model: "any-model",
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
    ],
  };
  const result = run(body);
  assert.equal(result.compressed, false);
  const messages = (result.body as { messages: unknown[] }).messages;
  assert.equal(messages.length, 2);
});
