/**
 * Destino MITM del IDE Antigravity.
 *
 *  - `ANTIGRAVITY_TARGET`: el `MitmTarget` del registro.
 *  - `ANTIGRAVITY_MITM_PROFILE`: el perfil con los campos anteriores al
 *    registro (`targetHost`, `additionalHosts`, `targetPort`, `localPort`,
 *    `apiEndpoints`, `authHeader`, `instructions`), que en la referencia lee
 *    su ruta de ajustes del MITM.
 *
 * Porte de `omniroute: src/mitm/targets/antigravity.ts` (MIT).
 */
import { PRODUCT_NAME } from "@thyrox/config/product";
import { AntigravityHandler } from "../handlers/antigravity.ts";
import type { MitmTarget } from "../types.ts";

const HOSTS = [
  "daily-cloudcode-pa.googleapis.com",
  "cloudcode-pa.googleapis.com",
  "daily-cloudcode-pa.sandbox.googleapis.com",
  "autopush-cloudcode-pa.sandbox.googleapis.com",
];

const ENDPOINTS = [
  "/v1internal:generateContent",
  "/v1internal:streamGenerateContent",
  "/v1internal:loadCodeAssist",
  "/v1internal:onboardUser",
  "/v1internal:fetchAvailableModels",
];

const INSTRUCTIONS = [
  `1. Install ${PRODUCT_NAME}'s root certificate`,
  "2. Start the MITM proxy via Dashboard or CLI",
  "3. Configure model mappings in Dashboard → AgentBridge → Antigravity",
  `4. Open Antigravity IDE — API calls will be routed through ${PRODUCT_NAME}`,
];

export const ANTIGRAVITY_TARGET: MitmTarget = {
  id: "antigravity",
  name: "Antigravity IDE",
  icon: "rocket_launch",
  color: "#4F46E5",
  hosts: HOSTS,
  port: 443,
  endpointPatterns: ENDPOINTS,
  defaultModels: [],
  setupTutorial: {
    steps: INSTRUCTIONS,
    detection: { command: "which antigravity", platform: "all" },
  },
  handler: () => Promise.resolve({ default: AntigravityHandler }),
  riskNoticeKey: "providers.riskNotice.oauth",
};

/**
 * La forma del perfil anterior al registro. Va como intersección de tipos
 * porque el esquema de `MitmTarget` no declara estos campos: sobre este objeto
 * no se corre `MitmTargetSchema.parse()`, que es para destinos cargados en
 * tiempo de ejecución.
 */
export const ANTIGRAVITY_MITM_PROFILE: MitmTarget & {
  description: string;
  targetHost: string;
  targetPort: number;
  localPort: number;
  userAgentPattern: string | null;
  apiEndpoints: string[];
  authHeader: string;
  additionalHosts: string[];
  instructions: string[];
} = {
  ...ANTIGRAVITY_TARGET,
  description:
    `Intercepts Antigravity IDE requests to cloudcode-pa.googleapis.com and routes them through ${PRODUCT_NAME}.`,
  targetHost: HOSTS[0],
  targetPort: 443,
  localPort: 443,
  userAgentPattern: null,
  apiEndpoints: ENDPOINTS,
  authHeader: "authorization",
  additionalHosts: HOSTS.slice(1),
  instructions: INSTRUCTIONS,
};
