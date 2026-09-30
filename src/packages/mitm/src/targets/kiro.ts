/**
 * Destino MITM del IDE Kiro.
 *
 * Kiro ya no deja configurar la URL base ni la clave, así que su tráfico de
 * estilo Anthropic se intercepta por MITM.
 *  - `KIRO_TARGET`: el `MitmTarget` del registro.
 *  - `KIRO_MITM_PROFILE`: el perfil anterior al registro, que en la
 *    referencia lee su ruta de ajustes del MITM.
 *
 * Porte de `omniroute: src/mitm/targets/kiro.ts` (MIT).
 */
import { KiroHandler } from "../handlers/kiro.ts";
import { PRODUCT_NAME } from "@thyrox/config/product";
import type { MitmTarget } from "../types.ts";

const HOSTS = ["api.anthropic.com"];
const ENDPOINTS = ["/v1/messages"];
const INSTRUCTIONS = [
  `1. Install ${PRODUCT_NAME}'s root certificate (Dashboard → AgentBridge → Cert)`,
  "2. Start the MITM proxy: `omniroute mitm start --target kiro`",
  "3. Set your system HTTP proxy to 127.0.0.1:20130 (or use transparent MITM via DNS override)",
  `4. Open Kiro IDE — API calls will be automatically routed through ${PRODUCT_NAME}.`,
  `5. Verify: check the Proxy Logs in ${PRODUCT_NAME} dashboard and look for provider=anthropic source=mitm`,
];

export const KIRO_TARGET: MitmTarget = {
  id: "kiro",
  name: "Kiro IDE",
  icon: "code_blocks",
  color: "#8B5CF6",
  hosts: HOSTS,
  port: 443,
  endpointPatterns: ENDPOINTS,
  defaultModels: [],
  setupTutorial: {
    steps: INSTRUCTIONS,
    detection: { command: "which kiro", platform: "all" },
  },
  handler: () => Promise.resolve({ default: KiroHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};

export const KIRO_MITM_PROFILE: MitmTarget & {
  description: string;
  targetHost: string;
  targetPort: number;
  localPort: number;
  userAgentPattern: string | null;
  apiEndpoints: string[];
  authHeader: string;
  instructions: string[];
  referenceIde: string;
} = {
  ...KIRO_TARGET,
  description:
    `Intercepts Kiro IDE requests to api.anthropic.com and routes them through ${PRODUCT_NAME}.`,
  targetHost: HOSTS[0],
  targetPort: 443,
  localPort: 20130,
  userAgentPattern: null,
  apiEndpoints: ENDPOINTS,
  authHeader: "x-api-key",
  instructions: INSTRUCTIONS,
  referenceIde: "antigravity",
};
