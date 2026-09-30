# TASK-THYROX-0600

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p2-uds-messaging.md`

## La tarea

## [321] TASK-THYROX-0600 — UDS F5b — ListAgents de 2.1.283 (ListPeers alias): chunk-8xzbdmg9 + chunk-mk0qbzxv + Ws de chunk-fhcnpt13

Status on board: in_progress

getListPeersTool devuelve null (BuiltInToolsProvider.ts:144). Portar la herramienta ListAgents (alias ListPeers, chunk-8xzbdmg9.js), su núcleo listAllPeers/formatForModel/formatForUser/buildSubagentExtras (chunk-mk0qbzxv.js, reexportado por chunk-1csd5fav.js) y la compuerta Ws/Vee/$Mt (chunk-fhcnpt13.js) con THYROX_CODE_HARBOR_KITE. Dependencias sin puerto (chunk-neeyxbak remoto/bridge, 0rzp9bzr IY/eC, a84ya7ak iy) se inyectan y se declaran. Prueba: dos procesos bin/cli reales, uno lista al otro.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- getListPeersTool sigue devolviendo null: src/packages/tool-registry/src/tools/registry/providers/BuiltInToolsProvider.ts:143 — `git grep -n getListPeersTool -- src`; el stub lo trajo e7af23b91 — `git log --oneline -S'getListPeersTool' -- <archivo>`
- formatForModel (oKo) y formatForUser (Aor) portados: src/packages/local-observability/src/uds/listAgentsFormat.ts:717 y :760 (811 líneas) — `grep -n '^export' listAgentsFormat.ts`; commit 0776aff15 'Port the ListAgents peer-ref table and formatter' cita TASK-THYROX-0600 — `git log --oneline --grep='THYROX-0600'`
- tabla de refs de pares (tj/M6/oBo) portada: src/packages/local-observability/src/uds/peerRefTable.ts (575 líneas) — `git show --stat 0776aff15`
- localSubagents/localTeammates (partes de buildSubagentExtras) portadas: listAgentsFormat.ts:332 y :375 — `grep -n '^export' listAgentsFormat.ts`; su cabecera (líneas 30-40) declara NO portados el orquestador `clr`/`dlr` (= listAllPeers/kor) ni `U` (self)
- compuerta Ws portada como isSessionMessagingEnabled con THYROX_CODE_HARBOR_KITE: src/packages/local-observability/src/uds/peerFiles.ts:390 — `git grep -n HARBOR_KITE -- src`; probada en __tests__/udsPeerFiles.test.ts:227
- listado de sesiones UDS vivas (qRr, dependencia de listAllPeers) existe: liveSessionRegistry.ts:368 listAllLiveSessions — `grep -n '^export async function' liveSessionRegistry.ts`
- herramienta ListAgents (chunk-8xzbdmg9: $t({name:Dl, aliases:[MTo], isEnabled(){return Ws()}, call → listAllPeers+buildSubagentExtras+formatForModel})) NO existe: `ls src/packages/tool-registry/src/tools/ | grep -i 'peer\|agents'` → 0; `git grep -ln 'ListPeersTool\|ListAgentsTool' -- src` → sólo el stub de BuiltInToolsProvider
- listAllPeers (kor, chunk-mk0qbzxv) y buildSubagentExtras (Tor) NO existen: `git grep -n 'listAllPeers\|buildSubagentExtras' -- src` → 0
- Vee (tengu_cuddly_willow) y $Mt de chunk-fhcnpt13 NO portados: `git grep -n cuddly_willow -- src` → 0
- descripción/prompt de la herramienta (Wxr, 'list agents you can SendMessage to', 'Formatted list of reachable agents') NO portados: `git grep -n 'list agents you can SendMessage\|Formatted list of reachable agents' -- src` → 0
- prueba con dos procesos bin/cli reales NO existe: `git grep -ln bin/cli -- tests src/packages/local-observability` → sólo suites de headless-pool/skills
- corpus 2.1.283 presente: _references/claude-code-bin/2.1.283/bunfs-root/{chunk-8xzbdmg9,chunk-mk0qbzxv,chunk-fhcnpt13,chunk-1csd5fav}.js — `find … -name <chunk>.js`; chunk-1csd5fav reexporta {Tor as buildSubagentExtras, oKo as formatForModel, Aor as formatForUser, kor as listAllPeers}

## Lo que falta — tu alcance

- Portar listAllPeers (kor de chunk-mk0qbzxv): componer peers uds (listAllLiveSessions → {transport:'uds', address:`uds:${sock}`}) + cloud/bridge/did con las dependencias remotas inyectadas y declaradas (cKe/Ftn/pDe/Fkr/JIt/Btn/QIt/Dst de chunk-neeyxbak, IY de 0rzp9bzr, KOt/VRr/qRr de qcy58j4w), devolviendo peers + banderas (bridgeWalkFailed, cloudListFailed, localListFailed, ownEndpointShadowed, messagingDisabled, listTruncated)
- Portar buildSubagentExtras (Tor) incluido U(self) (info de sesión propia) e iy (lectura del team file, chunk-a84ya7ak) inyectados
- Portar Vee (tengu_cuddly_willow con flagsSettled) y $Mt de chunk-fhcnpt13 junto a isSessionMessagingEnabled
- Crear src/packages/tool-registry/src/tools/ListAgentsTool/ (ListAgentsTool.ts + prompt.ts con Wxr): name ListAgents, aliases [ListPeers], isEnabled → isSessionMessagingEnabled, inputSchema {channel?, q?} max 256, outputSchema {listing}, maxResultSizeChars 1e4, isReadOnly/isConcurrencySafe true, call → Promise.all([listAllPeers, buildSubagentExtras]) → formatForModel
- Reemplazar getListPeersTool = () => null en BuiltInToolsProvider.ts:143 por el require de ListAgentsTool (patrón de getSnipTool)
- Escribir la prueba de integración: dos procesos bin/cli reales con THYROX_CODE_HARBOR_KITE=1, uno lista al otro y el listing contiene uds:<socket> del par

## Archivos que te pertenecen

- src/packages/local-observability/src/uds/listAgentsFormat.ts (o nuevo listAllPeers.ts junto a él)
- src/packages/local-observability/src/uds/peerFiles.ts
- src/packages/tool-registry/src/tools/ListAgentsTool/ListAgentsTool.ts
- src/packages/tool-registry/src/tools/ListAgentsTool/prompt.ts
- src/packages/tool-registry/src/tools/registry/providers/BuiltInToolsProvider.ts
- src/packages/tool-registry/src/tools/ListAgentsTool/__tests__/ListAgentsTool.test.ts
- tests/session/test-list-agents-two-cli.sh

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- medido: `cd src/packages/local-observability && bun test src/uds/__tests__/listAgentsFormat.test.ts src/uds/__tests__/peerRefTable.test.ts` → 34 pass, 0 fail, 54 expect() en 2 archivos
- por escribir: suite de ListAgentsTool (isEnabled bajo HARBOR_KITE 0/1, alias ListPeers, call compone listing) y la prueba de dos bin/cli reales que la tarea exige

## Dependencias

- TASK-THYROX-0449 (udsClient/descubrimiento de pares: hoy udsClient.ts tiene 554 líneas de envío/recibos, sin función de descubrimiento; listAllPeers puede apoyarse en listAllLiveSessions ya portada, así que no bloquea)
- TASK-THYROX-0507 (D3/listado de sesiones vivas): ya satisfecha por liveSessionRegistry.ts:368
