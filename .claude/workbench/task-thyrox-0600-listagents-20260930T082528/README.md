# TASK-THYROX-0600 — ListAgents (alias ListPeers) de 2.1.283

Banco del ítem: qué se leyó en el ejecutable, qué se portó y qué se declaró
como divergencia, y las mediciones que decidieron la prueba de dos `bin/cli`.

Corpus: `_references/claude-code-bin/2.1.283/bunfs-root/` (sólo lectura,
`rg`/`sed -n`/`grep -o`). Todos los chunks tienen la carga en la línea 11.

## Símbolos consultados

| Símbolo | Chunk | Qué hace | Decisión |
|---|---|---|---|
| `x` (ListAgentsTool) | chunk-8xzbdmg9.js:11 | `$t({name:Dl, aliases:[MTo], searchHint, backgrounding:"never", maxResultSizeChars:1e4, isEnabled(){return Ws()}, inputSchema {channel?,q?} max 256, outputSchema {listing}, isConcurrencySafe/isReadOnly true, call → Promise.all([listAllPeers, buildSubagentExtras]) → formatForModel})` | Portado como `ListAgentsTool.ts`. `backgrounding` no existe en `ToolDef`; `renderToolUseMessage → null` es el default de `buildTool`. |
| `d`, `S`, `p` | chunk-8xzbdmg9.js:11 | esquemas (`Ze` = objeto estricto, `o().max(256)`) y tope 1e4 | Portados: `z.strictObject`, `MAX_FILTER_LENGTH`, `MAX_RESULT_SIZE_CHARS`. |
| `eC` | chunk-0rzp9bzr.js | `e.teammateContext!==void 0 \|\| (e.agentContext && Tq(e.agentContext))`; `Tq` (chunk-t6pwageh) = `agentType==="subagent" && !isMainSession` | Divergencia: `ToolUseContext` no tiene `teammateContext` ni `agentContext`; `agentId !== undefined` (sólo se fija en subagentes). |
| `Dl`, `MTo`, `Wxr`/`s`/`e` | chunk-g3tnnx4p.js:11 | `"ListAgents"`, `"ListPeers"`, descripción `s + e()` con `e()` → `""` | Portados en `prompt.ts`; `Claude` → `PRODUCT_NAME`; `lo` → `SEND_MESSAGE_TOOL_NAME`. |
| `kor` (listAllPeers) | chunk-mk0qbzxv.js:11 | uds (`qRr`, `KOt` → localListFailed) + nube (`pDe`, filtrada por `rFt`/`IY`) + puente (`Ftn`/`Fkr`/`Utn`) + did (constante vacío); `VRr` sólo con `Nq()`; banderas de salida | Portado en `listAllPeers.ts`; remotos inyectados (`RemotePeerSources`), did no portado. |
| `U` (self) | chunk-mk0qbzxv.js:11 | `DV()` + `tFt(kv()?.name)`; `token` con `wFe("session", KFr(sock))`, `socketToken` con el socket; `nameIsUserChosen = jkr() !== undefined` | `ownSessionInfo`; `KFr` = `Nq() ? sid:<Y()> : sock` (`Z="sid:"` medido). |
| `Tor` (buildSubagentExtras) | chunk-mk0qbzxv.js:11 | `appState`, `teamFile` vía `iy` si `da(teamContext)`, `callerTeammateId` desde `teammateContext`, `self = U(n)` | `buildSubagentExtras`; `da`/`iy` inyectados desde `@thyrox/swarm` (`getTeamName`, `readTeamFileAsync`); `callerTeammateId` siempre `undefined`. |
| `rFt`, `KFr`, `wFe`, `tFt`, `nLo`, `upt`, `Z` | chunk-5mcqvwzx.js:11 | `rFt`: alguna sesión uds con `pr(bridgeSessionId)===pr(id)`; `wFe` = `T(kind,addr).slice(0,M)` = `ownSessionRef`; `tFt` = `ownDisplayName`; `nLo` = `shouldUseOwnSocketRef` | `rFt` portado (`hasLocalSessionForBridge`); los demás ya existían. |
| `Ve` | — | el id del candidato `main` | **No localizado** en chunk-5mcqvwzx ni en sus importaciones (`grep -c 'function Ve('` → 0). Divergencia: `getAgentId() ?? getSessionId()`. |
| `Ws`, `Vee`, `$Mt` | chunk-fhcnpt13.js:11 | `Ws` ya portado (`isSessionMessagingEnabled`); `Vee(e)`: `flagsSettled===false && aa("tengu_cuddly_willow",true).source==="fallback" → false`, si no `x(...)`; `$Mt` = `"Cross-session messaging is not available in this session."` | `isProjectsHumanOriginEnabled` (nombre del barrel chunk-gn4b6awf.js: `Vee as isProjectsHumanOriginEnabled`, `$Mt as CROSS_SESSION_MESSAGING_DISABLED_MESSAGE`), `CROSS_SESSION_MESSAGING_UNAVAILABLE_MESSAGE`. `source==="fallback"` → `!(name in getAllGrowthBookFeatures())`. |
| barrel | chunk-1csd5fav.js:11 | `export{Tor as buildSubagentExtras, oKo as formatForModel, Aor as formatForUser, kor as listAllPeers}` | En thyrox el barrel exportable no existe: ver «Bloqueo». |
| registro del tool | chunk-3pfj38s1.js | `Ir=import.meta.require("chunk-8xzbdmg9.js").ListAgentsTool` **sin compuerta de feature** | `BuiltInToolsProvider` lo empuja siempre; `isEnabled` decide. |

## Mediciones que decidieron el diseño

1. **`@thyrox/local-observability` no exporta `listAgentsFormat.js` ni
   `peerRefTable.js`** (ni podría exportar `listAllPeers.js`): desde
   tool-registry, `import('@thyrox/local-observability/uds/listAgentsFormat.js')`
   → `Cannot find module`; `liveSessionRegistry.js`, `peerFiles.js`,
   `sessionRegistryState.js`, `sessionRename.js` sí resuelven. `package.json`
   de ese paquete no es de este ítem. Primer intento: import relativo entre
   paquetes desde la herramienta → `bunx tsc --noEmit -p tsconfig.build.json`
   de tool-registry da **50 errores, todos TS6059** (`rootDir: src`). Forma
   final: `peerFiles.ts` (exportado y del ítem) reexporta el núcleo —el papel
   del barrel `chunk-1csd5fav.js`— y herramienta y suite importan
   `@thyrox/local-observability/uds/peerFiles.js`. Con eso: local-observability
   0 errores (emit incluido), tool-registry 0 errores.
   *Métrica:* resolución de bun por subpath (6 subpaths) y conteo de
   `error TS` de tsc por paquete. *Ciega a:* el gate
   `bin/check_package_typecheck --strict`, que reconstruye los 30+ providers
   del árbol y superó los 10 min sin veredicto; se detuvo y se midió con tsc
   directo sobre el mismo `tsconfig.build.json` que ese gate usa.
2. **`thyrox -p` arma sus herramientas con `@thyrox/tools/registry`**
   (`runLoop.ts::loopSetup` → `CORE_TOOLS` + tasks + agent + skill), no con
   `BuiltInToolsProvider`. Un `tool_use` grabado de `ListAgents` no llegaría
   a la herramienta. La prueba de dos `bin/cli` la invoca desde el hijo Bash
   de B, con el entorno de B. Tocar `runLoop.ts`/`tools/src/registry.ts`
   queda fuera de la lista del ítem.
3. **`feature('UDS_INBOX')` es falso al correr desde fuente**: un `bin/cli -p`
   aislado registra `sessions/<pid>.json` **sin** `messagingSocketPath`
   (medido: pid 6902, registro con `name`, `kind`, sin socket), y `qRr`
   filtra `record.sock`. Con `BUN_OPTIONS=--feature=UDS_INBOX` (bun 1.3.11)
   el registro trae `messagingSocketPath=/tmp/cc-socks/<pid>.sock`, el
   socket existe y `liveNonSpareSessions()` desde otro proceso lo devuelve
   en 0.56 s. *Métrica:* contenido del registro y `test -S`. *Ciega a:* el
   binario compilado, donde la feature va fijada.
4. **La referencia no imprime la dirección** en el listing (`V`: nombre,
   `[ref]`, kind, status, edad): `uds:<socket>` se afirma sobre
   `listAllPeers().peers[].address`, y el nombre del par sobre el listing.
5. **`$!` de `f &` no es el pid de bun**: la función corre en un subshell y
   `env → bash → bun` es su hijo; el registro es `sessions/<pid de bun>.json`.
   Primera corrida: 3 fallos por eso; con `exec` en la función, 10/10.
6. **En un worktree del pool `@thyrox/*` resuelve por `node_modules` del
   árbol principal** (`readlink -f` → `/home/user/thyrox/src/packages/…`), así
   que un import por paquete no ve los archivos del worktree. Para verificar
   aquí se creó `node_modules/@thyrox/local-observability →
   ../../src/packages/local-observability` en el worktree (`node_modules/`
   está en `.gitignore`: 0 entradas en `git status`). Medido con ese enlace:
   bun dedupe el symlink y la ruta real (`SessionRecordsUnreadableError` es
   la misma clase por las dos vías), y `peerFiles.js` expone `Vee`.
7. **`renderToolUseMessage` es obligatorio en `ToolDef`** (TS2345 «missing
   … but required»), no un valor por omisión de `buildTool`: se porta el
   `return null` de la referencia.

## Resultados

| Suite | Resultado |
|---|---|
| `bun test src/tools/ListAgentsTool/__tests__/ListAgentsTool.test.ts` (tool-registry) | 22 pass, 0 fail, 79 expect |
| `bash tests/session/test-list-agents-two-cli.sh` | 10 aserciones, 0 fallos, 25.9 s |
| existentes: `listAgentsFormat`, `peerRefTable`, `udsPeerFiles` (local-observability) | 52 pass, 0 fail (igual que la línea base) |
| existentes: `BuiltInToolsProvider*.test.ts` | 7 pass, 0 fail |
| `shellcheck` sobre el `.sh` (venv del árbol principal; el worktree no tiene entorno) | 0 hallazgos (1 SC2034 corregido) |
| `bunx tsc -p tsconfig.build.json` (local-observability, con emit) | 0 errores |
| `bunx tsc --noEmit -p tsconfig.build.json` (tool-registry) | 0 errores (tras portar `renderToolUseMessage`) |
| `bash tests/session/test-list-agents-two-cli.sh`, segunda y tercera corrida | 10/10 en 25.9 s y 18.4 s |

## Controles de anulación (suite de la herramienta, base 22/0)

| Rama retirada | Caídas | Cuál |
|---|---|---|
| A1 `kor`: listar aunque la mensajería esté apagada | 2 | «mensajería apagada no consulta…»; «call … bajo HARBOR_KITE=0 devuelve el aviso» |
| A2 `kor`: sin capturar `KOt` | 1 | «registro ilegible marca localListFailed» |
| A3 `kor`: sin filtrar la nube (`rFt`/`IY`) | 1 | «sesiones en la nube entran salvo…» |
| A4 `Dst`: cualquier indisponibilidad cuenta | 1 | «cloudListFailed sólo con timeout o fetch_failed» |
| A5 `VRr`: sin exigir dirección estable | 1 | «ownEndpointShadowed se mide sólo…» |
| B1 `KFr`: siempre el socket | 1 | «el token lleva el ref de la dirección estable» |
| B2 `jkr`: sin comparar lo tecleado | 1 | «nameIsUserChosen» |
| B3 `U`: sin exigir socket propio | 1 | «sin socket propio o con nombre reservado…» |
| C1 `Tor`: leer el equipo aunque no haya | 1 | «lee el archivo de equipo sólo cuando hay nombre» |
| D1 `Vee`: sin el corte por banderas sin asentar | 1 | «con las banderas sin asentar y sin declaración, no» |
| E1 tool: `isEnabled` constante | 1 | «isEnabled es la compuerta Ws» |
| F1 provider: sin registrar ListAgents | 1 | «BuiltInToolsProvider lo registra siempre» |

Cada anulación se aplicó con `bin/replace_literal` sobre una copia
`mktemp` y se restauró; `git status` al final sólo lista los archivos del
ítem. La prueba de shell lleva su propio control (paso 3: `HARBOR_KITE=0` →
0 pares y el aviso de apagado).

## Bloqueo declarado

`src/packages/local-observability/package.json` no exporta
`./uds/listAllPeers.js` (ni `listAgentsFormat.js`/`peerRefTable.js`) y no es
de este ítem. La entrega no lo necesita: el núcleo llega por el subpath
exportado `uds/peerFiles.js`, que hace de barrel. Cuando ese `exports` entre,
el bloque de reexportación de `peerFiles.ts` se retira y la herramienta y la
suite importan `uds/listAllPeers.js`: una línea en cada archivo.

Fuera de alcance y declarado: `runLoop.ts`/`@thyrox/tools/registry.ts` (para
que `thyrox -p` ofrezca `ListAgents` al modelo) y `package.json`.
