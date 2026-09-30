# F7i — bibliotecas del inspector

Porte de `omniroute: src/lib/inspector/{matchesTrafficFilter,harExport,
configPortability,tproxyCaptureApi,agentBridgeMaintenanceApi}.ts`,
`src/lib/db/inspectorSessions.ts` (+ migración 082), `src/shared/schemas/
{agentBridge,inspector}.ts` y `cliMitmStartSchema`/`resolveApiKey` (MIT).

| Referencia | thyrox | Prueba |
|---|---|---|
| matchesTrafficFilter | `src/inspector/matchesTrafficFilter.ts` | traffic-filter-live |
| harExport | `src/inspector/harExport.ts` | inspector-har-export |
| configPortability | `src/inspector/configPortability.ts` | agent-bridge-config-portability |
| inspectorSessions + 082 | `src/state/inspectorSessions.ts`, `schema.ts` | db-inspector-sessions |
| shared/schemas | `src/schemas/{agentBridge,inspector}.ts` | shared-schemas |
| cliMitmStartSchema + resolveApiKey | `src/schemas/cli.ts` | cli-mitm-schema |
| tproxyCaptureApi + maintenanceApi | `src/client/*` sobre `localApi.ts` | tproxy-capture-api, agent-bridge-maintenance-api |

Divergencias declaradas:

- el estado recibe la base (`db`) como parámetro, igual que el resto de `src/state`;
- HAR: el id de la captura va en `_captureId`, no `_omniRouteId`; el creador
  es `${PRODUCT_NAME} traffic inspector` con la versión del `package.json`;
- `deleteSession` borra las peticiones explícitamente: la referencia confía en
  `ON DELETE CASCADE`, que SQLite sólo aplica con `PRAGMA foreign_keys = ON`;
- sin clave de arranque, `null` en vez del marcador `sk_omniroute`;
- los clientes reciben `fetch` y la base inyectados (la CLI es el cliente) y
  comparten `requestJson`/`errorMessage`, que la referencia duplicaba.

## Anulaciones (`annul.sh` → `results.txt`)

Cinco de seis tumban exactamente su caso. La quinta —la contraseña de sudo
siempre en el cuerpo— **no discrimina**: `JSON.stringify` omite una clave
`undefined`, así que la rama `sudoPassword ? {…} : {}` de la referencia es
muerta. Se simplificó a `jsonBody({ sudoPassword })`; la prueba que fija `{}`
sin contraseña se queda.
