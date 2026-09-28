/**
 * Destino MITM del editor Zed.
 *
 * Host: `api.zed.dev`. Formato: Chat Completions compatible con OpenAI en
 * `/v1/chat/completions`.
 *
 * Porte de `omniroute: src/mitm/targets/zed.ts` (MIT).
 */
import { ZedHandler } from "../handlers/zed.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const ZED_TARGET: MitmTarget = {
  id: "zed",
  name: "Zed",
  icon: "bolt",
  color: "#EF4444",
  hosts: ["api.zed.dev"],
  port: 443,
  endpointPatterns: ["/v1/chat/completions"],
  defaultModels: [
    { id: "claude-3.5-sonnet", name: "claude-3.5-sonnet", alias: "claude-3.5-sonnet" },
    { id: "gpt-4o", name: "GPT-4o", alias: "gpt-4o" },
  ],
  setupTutorial: {
    steps: [
      `Install ${PRODUCT_NAME}'s root certificate`,
      "Enable DNS routing for Zed",
      "Restart Zed",
      `Done — Zed traffic now routes through ${PRODUCT_NAME}`,
    ],
    detection: { command: "which zed", platform: "all" },
  },
  handler: () => Promise.resolve({ default: ZedHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};
