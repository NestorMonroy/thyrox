# F7g — las pruebas de la referencia que ninguna prueba de thyrox citaba

Fecha: 2026-09-28. Referencia: `/home/user/nestormonroy/omniroute` (MIT).

Universo: `uncited-before.txt` — 41 de las 60 pruebas de
`../mitm-reference-audit-20260928T060043/reference-tests-not-ported.txt` seguían
sin cita tras cerrar F7e (las otras 19 las citan ya las pruebas de tproxy y del
nativo). Cada una se leyó caso por caso contra las pruebas de thyrox antes de
portarla: la auditoría declaraba que una cita ausente no prueba una prueba
ausente.

*Métrica:* casos (`test(`) de cada prueba de la referencia, comparados uno a uno
con los de `@thyrox/mitm`. *Ciega a:* un caso cubierto por conducta con otra
entrada; por eso cada «cubierto» nombra el archivo que lo cubre.

## Shims `_internal`

- `rootCaShim.cjs` — gemelo CommonJS de `cert/rootCa.ts` y
  `tproxy/dynamicCert.ts` para un servidor que no podía importar TypeScript. El
  servidor de thyrox importa `loadOrCreateMitmCa` y `DynamicCertStore`
  directamente (`src/server/mitmServer.ts`): no hay gemelo que mantener.
- `standaloneRouting.cjs` — `AGENT_ROUTE_CONFIG`, `getAgentRouteConfig`,
  `resolveForwardTargetForAgent`, `resolveMappedOverride`: portados en
  `src/server/forwardTarget.ts`, probados en `forwardTarget.test.ts`. La lectura
  de respaldo de un `db.json` heredado no se porta: el estado vive en el store
  (F0).

## Las 41, por destino

**Portadas en esta fase (casos que faltaban):**

| Referencia | Prueba de thyrox |
|---|---|
| db-agent-bridge-bypass, db-agent-bridge-mappings, db-inspector-custom-hosts, agent-bridge-mappings-sync-8656 | `state/referenceEdgeCases.test.ts` |
| mitm-server-connect (enrutado) | `server/bypassRouting.test.ts` |
| mitm-root-ca-leaf-issuance-6684 | `tproxy/toolHostLeaves.test.ts` |
| inspector-types (petición interceptada) | `inspector/interceptedRequestSchema.test.ts` |
| mitm-upstream-ca-wiring (casos del gestor) | `manager/upstreamCaWiring.test.ts` — nuevo `resolveUpstreamCaPath`/`applyUpstreamCa` exportados |

**Ya cubiertas sin cita:** db-agent-bridge-state (`state/agentBridgeStore.test.ts`),
mitm-hosts-cleanup-on-exit (`manager/exitCleanup.test.ts`),
mitm-manager-cleanup-symmetry (`repairSteps.test.ts`),
mitm-passthrough-real-host-10479 (`server/mitmServer.test.ts`: el paso directo
reenvía al host real, `hostOf(req)`), agent-bridge-repair-sudo-gate en sus casos
de módulo (`system/sudoGate.test.ts`), MitmTargetSchema (`types.test.ts`), y las
cinco aserciones de texto de mitm-server-connect, que en thyrox se prueban por
conducta (cabeceras `x-thyrox-*`, error saneado, CONNECT). La guarda de doble
conteo no aplica: el servidor no reemite el socket.

**Rutas de API → F7h (#119):** agent-bridge-cert-route-validation,
-cert-trust-sudo-gate, -detected-models-8656, -dns-params-7271,
-dns-route-validation, -dns-sudo-gate, -dns-toggle-method-7157,
-repair-route-validation, los casos de ruta de -repair-sudo-gate, -reset-route,
-server-route-dynamic-import, -state-full-payload-8656, -state-normalize-3318,
agentbridge-mitm-router-key-6403, mitm-ingest-route-sanitize, tproxy-route,
traffic-inspector-beginner-header, traffic-inspector-ws-subscriber-leak-13152 y
los tres casos `POST upstream-ca` de mitm-upstream-ca-wiring.

**Bibliotecas → F7i (#120):** agent-bridge-config-portability,
agent-bridge-maintenance-api, inspector-har-export, db-inspector-sessions,
tproxy-capture-api, cli-mitm-schema.

**Handler antigravity → F2b (#105):** mitm-handler-antigravity,
antigravity-mitm-model-resolution.

**Degradación sin MITM en el empaquetado → P3/P6:** mitm-manager-stub,
mitm-stub-alias-6344.

**Fuera del MITM:** combo-scoring-inspector — el inspector de puntuación de
combos del proxy (`open-sse/services/combo*`), casa por la palabra
«inspector»; su dominio es el de los combos del proxy local.

## Anulaciones

`annul.sh` → `results.txt`: la precedencia variable > ruta guardada y el
try/catch que deja arrancar sin CA; cada una tumba exactamente su caso.

## Un hecho de Bun

`X509Certificate.checkIssued` devuelve el certificado emisor en Bun 1.3.11, no
el booleano de Node; la prueba lo afirma por verdad y además compara el
`issuer` de la hoja con el `subject` de la CA.
