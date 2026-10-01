/**
 * Destino MITM de la CLI Codex de OpenAI.
 *
 * Porte de `omniroute: src/mitm/targets/codex.ts` (MIT).
 */
import { CodexHandler } from "../handlers/codex.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const CODEX_TARGET: MitmTarget = {
  id: "codex",
  name: "OpenAI Codex",
  icon: "smart_toy",
  color: "#F59E0B",
  hosts: ["chatgpt.com"],
  port: 443,
  endpointPatterns: ["/backend-api/codex/chat/completions", "/v1/chat/completions"],
  defaultModels: [
    { id: "gpt-4.1", name: "GPT-4.1", alias: "gpt-4.1" },
    { id: "gpt-4o-mini", name: "GPT-4o mini", alias: "gpt-4o-mini" },
  ],
  setupTutorial: {
    steps: [
      "Install the OpenAI Codex CLI",
      "Authenticate with your ChatGPT/Plus credentials",
      "Enable DNS routing for this agent",
      `Run \`codex\` — requests are now proxied via ${PRODUCT_NAME}`,
    ],
    detection: { command: "which codex", platform: "all" },
  },
  handler: () => Promise.resolve({ default: CodexHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};
