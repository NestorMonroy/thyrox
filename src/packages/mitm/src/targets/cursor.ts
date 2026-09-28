/**
 * Destino MITM del IDE Cursor.
 *
 * Host: `api2.cursor.sh` (el servidor del chat). Formato: Chat Completions
 * compatible con OpenAI en `/v1/chat/completions`.
 *
 * Porte de `omniroute: src/mitm/targets/cursor.ts` (MIT).
 */
import { CursorHandler } from "../handlers/cursor.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

export const CURSOR_TARGET: MitmTarget = {
  id: "cursor",
  name: "Cursor IDE",
  icon: "edit_note",
  color: "#0EA5E9",
  hosts: ["api2.cursor.sh"],
  port: 443,
  endpointPatterns: ["/v1/chat/completions"],
  defaultModels: [
    { id: "claude-sonnet-4.5", name: "claude-sonnet-4.5", alias: "claude-sonnet-4.5" },
    { id: "gpt-4o", name: "GPT-4o", alias: "gpt-4o" },
  ],
  setupTutorial: {
    steps: [
      `Install ${PRODUCT_NAME}'s root certificate`,
      "Enable DNS routing for Cursor",
      "Restart Cursor IDE",
      `Done — Cursor traffic now routes through ${PRODUCT_NAME}`,
    ],
    detection: { command: "which cursor", platform: "all" },
  },
  handler: () => Promise.resolve({ default: CursorHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};
