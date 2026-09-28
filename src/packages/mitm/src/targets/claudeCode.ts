/**
 * Destino MITM del agente `claude-code` (la CLI de Anthropic).
 *
 * Host: `api.anthropic.com`. Formato: API Messages en `/v1/messages`.
 *
 * Comparte `api.anthropic.com` con el destino de Kiro, así que redirigir su
 * DNS es una decisión explícita del usuario. Su nombre visible es el id: el
 * nombre de producto no se escribe en el código de este árbol.
 *
 * Porte de `omniroute: src/mitm/targets/claudeCode.ts` (MIT).
 */
import { AnthropicCliHandler } from "../handlers/claudeCode.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const CLAUDE_CODE_TARGET: MitmTarget = {
  id: "claude-code",
  name: "claude-code",
  icon: "terminal",
  color: "#D97706",
  hosts: ["api.anthropic.com"],
  port: 443,
  endpointPatterns: ["/v1/messages"],
  defaultModels: [
    { id: "claude-sonnet-4.5", name: "claude-sonnet-4.5", alias: "claude-sonnet-4.5" },
    { id: "claude-opus-4.5", name: "claude-opus-4.5", alias: "claude-opus-4.5" },
  ],
  setupTutorial: {
    steps: [
      "Install the claude-code agent (Anthropic CLI)",
      `Install ${PRODUCT_NAME}'s root certificate`,
      "Enable DNS routing for claude-code",
      `Run \`claude\` — requests are now proxied via ${PRODUCT_NAME}`,
    ],
    detection: { command: "which claude", platform: "all" },
  },
  handler: () => Promise.resolve({ default: AnthropicCliHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};
