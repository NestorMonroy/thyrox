/**
 * Destino MITM de Trae, provisional.
 *
 * Su viabilidad sigue en investigación. El host `trae.invalid` no se puede
 * enrutar a propósito: el destino queda registrado sin coincidir nunca con
 * tráfico real, hasta que se confirme la superficie de su API.
 *
 * Porte de `omniroute: src/mitm/targets/trae.ts` (MIT).
 */
import { TraeHandler } from "../handlers/trae.ts";
import type { MitmTarget } from "../types.ts";

export const TRAE_TARGET: MitmTarget = {
  id: "trae",
  name: "Trae",
  icon: "construction",
  color: "#94A3B8",
  hosts: ["trae.invalid"],
  port: 443,
  endpointPatterns: [],
  defaultModels: [],
  setupTutorial: {
    steps: [
      "Trae integration is under investigation",
      "Setup steps will be published once the upstream API is confirmed",
    ],
    detection: { command: "which trae", platform: "all" },
  },
  handler: () => Promise.resolve({ default: TraeHandler }),
  riskNoticeKey: "providers.riskNotice.investigating",
  viability: "investigating",
};
