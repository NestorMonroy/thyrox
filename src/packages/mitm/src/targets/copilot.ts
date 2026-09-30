/**
 * Destino MITM de GitHub Copilot.
 *
 * Porte de `omniroute: src/mitm/targets/copilot.ts` (MIT).
 */
import { CopilotHandler } from "../handlers/copilot.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const COPILOT_TARGET: MitmTarget = {
  id: "copilot",
  name: "GitHub Copilot",
  icon: "code",
  color: "#10B981",
  hosts: ["api.githubcopilot.com", "copilot-proxy.githubusercontent.com"],
  port: 443,
  endpointPatterns: ["/chat/completions", "/v1/chat/completions"],
  defaultModels: [
    { id: "gpt-4o", name: "GPT-4o", alias: "gpt-4o" },
    { id: "claude-3.5-sonnet", name: "claude-3.5-sonnet", alias: "claude-3.5-sonnet" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", alias: "gemini-2.0-flash" },
  ],
  setupTutorial: {
    steps: [
      "Install GitHub Copilot extension in VS Code",
      "Sign in to GitHub with a Copilot-enabled account",
      "Enable DNS routing for this agent",
      "Restart VS Code",
      `Done — Copilot now routes via ${PRODUCT_NAME}`,
    ],
    detection: { command: "code --list-extensions", platform: "all" },
  },
  handler: () => Promise.resolve({ default: CopilotHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};
