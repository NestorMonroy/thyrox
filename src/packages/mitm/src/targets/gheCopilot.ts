/**
 * Destino MITM de Copilot en GitHub Enterprise (GHE).
 *
 * Porte de `omniroute: src/mitm/targets/ghe-copilot.ts` (MIT).
 */
import { CopilotHandler } from "../handlers/copilot.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const GHE_COPILOT_TARGET: MitmTarget = {
  id: "ghe-copilot",
  name: "GitHub Enterprise Copilot",
  icon: "code",
  color: "#10B981",
  // Sin hosts fijos: el dominio es el `gheUrl` de cada conexión, y la capa
  // MITM los toma de la configuración del proveedor.
  hosts: [],
  port: 443,
  endpointPatterns: ["/chat/completions", "/v1/chat/completions", "/responses"],
  defaultModels: [
    { id: "gpt-4o", name: "GPT-4o", alias: "gpt-4o" },
    { id: "claude-3.5-sonnet", name: "claude-3.5-sonnet", alias: "claude-3.5-sonnet" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", alias: "gemini-2.0-flash" },
  ],
  setupTutorial: {
    steps: [
      `Configure your GHE Copilot endpoint URL in ${PRODUCT_NAME} provider settings`,
      "Ensure your GHE instance has Copilot enabled",
      "Sign in to GitHub Enterprise with a Copilot-enabled account",
      "Enable DNS routing for this agent",
      "Restart your IDE (VS Code, JetBrains, etc.)",
      `Done — GHE Copilot now routes via ${PRODUCT_NAME}`,
    ],
    detection: { command: "code --list-extensions", platform: "all" },
  },
  handler: () => Promise.resolve({ default: CopilotHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};