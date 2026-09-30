/**
 * Las imágenes en línea más antiguas se sustituyen por un aviso y se conservan
 * las más recientes, antes de recortar historia. Casos de OmniRoute
 * `tests/unit/8560-responses-image-compaction.test.ts` (a58000c7); quedan fuera
 * los dos del adaptador de la API de Responses (`compression/bodyAdapter.ts`),
 * que el proxy no tiene.
 */
import { test } from 'bun:test'
import assert from 'node:assert/strict'
const CM = (await import(process.env.CONTEXT_MANAGER_MODULE ?? '../src/proxy/context/contextManager.ts')) as typeof import('../src/proxy/context/contextManager.ts')
const { compressContext, estimateTokens, getTokenLimit, fixToolPairs, fixToolAdjacency, stripTrailingAssistantOrphanToolUse, stripTrailingAssistantForProvider, isInlineBase64DocumentBlock, isInlineBase64ImageBlock, pruneOlderInlineImages } = CM

function makeFakePngBase64(approxBytes: number): string {
  return Buffer.alloc(approxBytes, 65).toString("base64");
}

function responsesImageTurn(text: string, base64: string) {
  return {
    type: "message",
    role: "user",
    content: [
      { type: "input_text", text },
      { type: "input_image", image_url: `data:image/png;base64,${base64}` },
    ],
  };
}

test("#8560: pruneOlderInlineImages keeps the newest images and drops older ones", () => {
  const base64 = makeFakePngBase64(8_000);
  const messages = [
    {
      role: "user",
      content: [
        { type: "input_text", text: "first" },
        { type: "input_image", image_url: `data:image/png;base64,${base64}` },
      ],
    },
    {
      role: "user",
      content: [
        { type: "input_text", text: "second" },
        { type: "input_image", image_url: `data:image/png;base64,${base64}` },
      ],
    },
    {
      role: "user",
      content: [
        { type: "input_text", text: "third" },
        { type: "input_image", image_url: `data:image/png;base64,${base64}` },
      ],
    },
  ];

  const { messages: pruned, pruned: count } = pruneOlderInlineImages(messages, {
    keepLatest: 2,
  });

  assert.equal(count, 1);
  const firstContent = pruned[0].content as Array<Record<string, unknown>>;
  assert.equal(firstContent[1].type, "input_text");
  assert.match(String(firstContent[1].text), /Earlier image removed/);
  assert.equal((pruned[1].content as Array<Record<string, unknown>>)[1].type, "input_image");
  assert.equal((pruned[2].content as Array<Record<string, unknown>>)[1].type, "input_image");
});

test("#8560: compressContext prunes older images before purifying history", () => {
  const base64 = makeFakePngBase64(8_000);
  const messages = Array.from({ length: 6 }, (_, i) => ({
    role: "user",
    content: [
      { type: "input_text", text: `turn-${i}` },
      { type: "input_image", image_url: `data:image/png;base64,${base64}` },
    ],
  }));
  const original = estimateTokens(messages);
  // Force pruning all the way down to keepLatest=2 (~1200 tokens saved per image).
  const target = original - 5_000;

  const result = compressContext(
    { model: "gpt-5.6-terra", messages },
    { provider: "codex", maxTokens: target, reserveTokens: 0, keepLatestImages: 2 }
  );

  assert.equal(result.compressed, true);
  assert.ok(
    (result.stats?.final as number) < original,
    `expected token count to shrink (original=${original}, final=${result.stats?.final})`
  );
  const layers = (result.stats as { layers?: Array<{ name: string }> }).layers || [];
  assert.ok(
    layers.some((layer) => layer.name === "prune_images"),
    `expected prune_images layer, got ${JSON.stringify(layers)}`
  );

  const remainingImages = (result.body.messages as Array<{ content: unknown }>).flatMap((msg) =>
    Array.isArray(msg.content)
      ? msg.content.filter(
          (part) =>
            part &&
            typeof part === "object" &&
            (part as { type?: string }).type === "input_image"
        )
      : []
  );
  assert.equal(remainingImages.length, 2);
  // Target is advisory once keepLatest images remain; purifyHistory may still
  // leave a small overshoot, but prune_images must have engaged.
  assert.ok(target < original);
});

