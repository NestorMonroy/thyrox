/**
 * Destino MITM de OpenCode.
 *
 * Host: `opencode.ai`. Formato: Chat Completions compatible con OpenAI en
 * `/v1/chat/completions`.
 *
 * Porte de `omniroute: src/mitm/targets/openCode.ts` (MIT).
 */
import { OpenCodeHandler } from "../handlers/openCode.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const OPEN_CODE_TARGET: MitmTarget = {
  id: "open-code",
  name: "OpenCode",
  icon: "code",
  color: "#22D3EE",
  hosts: ["opencode.ai"],
  port: 443,
  endpointPatterns: ["/v1/chat/completions"],
  defaultModels: [
    { id: "gpt-4o", name: "GPT-4o", alias: "gpt-4o" },
    { id: "claude-3.5-sonnet", name: "claude-3.5-sonnet", alias: "claude-3.5-sonnet" },
  ],
  setupTutorial: {
    steps: [
      "Install the OpenCode CLI/IDE",
      `Install ${PRODUCT_NAME}'s root certificate`,
      "Enable DNS routing for OpenCode",
      "Restart OpenCode",
      `Done — OpenCode traffic now routes through ${PRODUCT_NAME}`,
    ],
    detection: { command: "which opencode", platform: "all" },
  },
  handler: () => Promise.resolve({ default: OpenCodeHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};
