# TASK-THYROX-0309 — retiro de sustitutos por paquete, contrastado con 2.1.283

Alcance: `memory`, `daemon`, `ide`, `provider`, `local-observability`, `bridge`
(los seis pendientes). Condición de cierre: `python3 tests/verify/test_stand_ins_cleared.py`
con 11 paquetes en `CLEARED` y 0 importables en todo el árbol.

## Estado medido

| Momento | Paquetes limpios | Importables en el árbol |
|---|---|---|
| partida | 5 | 104 |
| tras `memory` | 6 | 99 |
| tras `daemon` | 7 | 93 |
| tras `ide` | 8 | 83 |
| tras `provider` | 9 | 72 |
| tras `local-observability` | 10 | 52 |
| tras `bridge` | 11 | 0 |

*Métrica:* salida de `tests/verify/test_stand_ins_cleared.py` (cuenta de
`shadowed()` sin ciclo) en cada paso.
*Ciega a:* símbolos con original bajo OTRO nombre, y a si dos cuerpos
homónimos hacen lo mismo — eso se midió a mano, abajo.

## Lo consultado en el binario (`_references/claude-code-bin/2.1.283`, sólo lectura)

| Símbolo / literal | Chunk : línea | Qué hace | Decisión |
|---|---|---|---|
| `exceeds maximum allowed size` → `dit`, `T9`, `HB`, `jB`, `$Pt` | `chunk-5t3x93y6.js:25` | `readFileInRange`: entrada, ruta rápida, ruta streaming, `FileTooLargeError`, `SelectedRangeTooLargeError` | La copia de `memory` es idéntica en lógica al original de `@thyrox/repl/readFileInRange.ts` (diff: sólo comentarios). Se importa el original y se escribe su prueba de fidelidad (`repl/src/__tests__/readFileInRange.test.ts`, 9 casos). **Divergencia declarada, no corregida** (archivo fuera de los que me pertenecen): 2.1.283 añade `maxSelectedBytes`/`SelectedRangeTooLargeError`, la opción `handle`, un tope duro de 128 MB (`$B`) para ficheros no regulares, `StringDecoder` en streaming, `EISDIR` con `code/errno/syscall`, y `truncatedByBytes:false` siempre presente. |
| `x("tengu_passport_quail",!1)`, `x("tengu_coral_fern",!1)`, `x("tengu_moth_copse",!1)`, `x("tengu_slate_thimble",!1)`, `x("tengu_bramble_lintel",null)` | `chunk-94ehjmjk.js:18`, `chunk-t6pwageh.js:61` | Lectura de banderas con fallback del llamador | El sustituto de `memory` fijaba `tengu_passport_quail: true` y `tengu_coral_fern: true` en una tabla local que el binario no tiene: sin GrowthBook el valor es el fallback (`false`). El original de `@thyrox/config/feature-flags` (tabla vacía, override por `THYROX_FEATURE_FLAGS`) es el fiel; tiene prueba (`config/__tests__/featureFlags.test.ts`). |
| `ua(n){if(n<=1)return!1;try{return process.kill(n,0),!0}catch{return!1}}` y `gz(e){try{return process.kill(e,0),!0}catch(n){return v(n)==="EPERM"}}` | `chunk-j2p7jgmc.js:11`, `chunk-xd0xb4g7.js:25`, `chunk-5t3x93y6.js:164`, `chunk-crqh6ka8.js:12` | Dos formas de «pid vivo»: con guarda `<=1` y sin EPERM, o sin guarda y con EPERM | El `isPidAlive` del sustituto de `daemon` mezclaba las dos y **no lo importaba nadie** (`workerVm.ts` lo toma de `bgWorkerRegistry.js`): se borra como código muerto. `workerSocketClient.ts` conserva su duplicado local declarado. |
| `function L(e){return e instanceof Error?e.message:String(e)}` | `chunk-rbjwg9yh.js:30`, `chunk-ern0s5ks.js:11`, `chunk-nwpc1c89.js:11` | `errorMessage` | Idéntico en `@thyrox/local-observability/errorHelpers.ts:119`; `daemon` y `bridge` lo importan de ahí. |
| `QPt = x4`, `x4(e){return yBn(are(e).toLowerCase())}`; `g_(e)` con `antigravity:"Antigravity"` | `chunk-5t3x93y6.js` (offsets 575880, 579254) | El nombre visible del IDE capitaliza con la `capitalize` de lodash: baja el resto a minúsculas | `@thyrox/output/utils/stringUtils.capitalize` **no** baja el resto (`charAt(0).toUpperCase() + slice(1)`): homónimo declarado en `ide`, no importado. Divergencia anotada, no tocada: el binario mapea `windsurf` a «Devin Desktop» y `ide.ts` a «Windsurf». |
| `DISABLE_NONESSENTIAL_TRAFFIC` (presente en `chunk-csayct82.js:186`, `chunk-fmsbxtrp.js:16`); `ESSENTIAL_TRAFFIC_ONLY` (0 chunks) | — | Variable que gobierna el modo de tráfico esencial | El sustituto de `provider` leía una variable inventada (`THYROX_CODE_ESSENTIAL_TRAFFIC_ONLY`); el original de `@thyrox/config/env/privacy-level` lee `THYROX_CODE_DISABLE_NONESSENTIAL_TRAFFIC` y tiene prueba (`privacyLevel.test.ts`). |
| `logVanished`, `checkPid` | `chunk-ygx717jg.js:19` | Worker VM del daemon | Sólo para localizar la clase; no se portó nada nuevo. |

## Decisiones por paquete

- **memory** (5): `getFeatureValue_CACHED_MAY_BE_STALE` → `@thyrox/config/feature-flags`; `getConfigHomeDir` → `@thyrox/config/env/configHome`; `readFileInRange`, `FileTooLargeError`, `ReadFileRangeResult` → `@thyrox/repl/readFileInRange.js`. Quedan por ciclo: `parseFrontmatter` y tipos, `getInitialSettings`/`getSettingsForSource`, `getSessionMemoryPath`.
- **daemon** (6): `logEvent` → `@thyrox/local-observability` (las dos pruebas capturan con `installLocalObservability`, el precedente de `shell`); `errorMessage` → `errorHelpers.js`; `asSystemPrompt` → `@thyrox/provider/systemPromptType.js`; `OAuthTokens` → tipo de `@thyrox/provider/oauth/types.js` (el sustituto tenía todos los campos opcionales; el real los exige); `isPidAlive` y `setLogEventFn` borrados (muertos).
- **ide** (10): `callIdeRpc` → `@thyrox/mcp-runtime/client`; `envDynamic`, `getConfigHomeDir`, `getGlobalConfig`/`saveGlobalConfig`, `lt`, `lazySchema`, `isBareMode` → `@thyrox/config`; `isEnvDefinedFalsy` borrado (muerto); `capitalize` homónimo. `envDynamic.terminal` es `unknown` en el original (`buildEnvDynamic(): Record<string, unknown>`), de ahí las dos conversiones en `ide.ts`, mismo patrón que su línea 308.
- **provider** (11): `sleep`, `createSignal`, `isRunningOnHomespace`, `hasNodeOption`, `isEssentialTrafficOnly` → `@thyrox/config`; `clearToolSchemaCache` → `@thyrox/tool-registry/toolSchemaCache.js` (antes no-op; ahora limpia la caché real); `getLocalISODate`, `registerCleanup`, `getConfigHomeDir`, `isBareMode`, `isEnvDefinedFalsy` sin consumidor: borrados (el último se importa de `config` para uso interno).
- **local-observability** (20): `getFsImplementation`/`FsOperations` → `@thyrox/storage/fsOperations`; `getProjectsDir` → `sessionStoragePortable.js`; `lock`/`unlock` → `lockfile.js`; `envDynamic`, `getOrCreateUserID`, `getConfigHomeDir` → `@thyrox/config`; 12 símbolos sin consumidor borrados (`djb2Hash`, `getErrnoCode`, `SHELL_TOOL_NAMES`, `stripDisplayTags*`, `writeToStderr`, `registerCleanup`, `isEssentialTrafficOnly`, `NodeFsOperations`, `setFsImplementation`, `isEnvDefinedFalsy`, `checkLock`); `setGetSettingsFn` homónimo (setter DI del `getSettings` que sigue por ciclo).
- **bridge** (52): 36 importados de `config`, `local-observability`, `output`, `storage`, `headless-sdk`, `app-host`, `agent`, `permission`, `mcp-runtime`; 8 borrados sin consumidor (`formatDuration`, `stringWidth`, `getGraphemeSegmenter`, `BRIDGE_*`, `logEventAsync`, `shutdownEventLoggers`); 8 homónimos declarados (`feature`, `jsonParse`, `getSessionId` y su setter, `getOauthAccountInfo` y su setter, `setLogForDiagnosticsNoPIIFn`, `SecureStorage`). La prueba `trustedDevice.test.ts` pasa de un setter local a `setGrowthBookConfigOverride`/`clearGrowthBookConfigOverrides` de `config`.

## Controles de anulación

| Control | Resultado |
|---|---|
| retirar las 4 líneas `line = line.slice(0, -1)` de `repl/readFileInRange.ts` | caen exactamente 2 de 9 casos de la prueba de fidelidad (los dos de CRLF) |
| reinsertar una copia de `getConfigHomeDir` en el sustituto de `memory` | el ratchet pasa a 1 ofensor: `memory: getConfigHomeDir` |
| vaciar la razón del homónimo `capitalize` en `ide` | el ratchet pasa a 1 ofensor: `ide: capitalize` |
| vaciar la razón del homónimo `jsonParse` en `bridge` | el ratchet pasa a 1 ofensor: `bridge: jsonParse` |

## Lo que queda fuera de mis archivos (reportado, no tocado)

- `src/packages/repl/src/readFileInRange.ts`: divergencias con 2.1.283 listadas arriba.
- `src/packages/tool-registry/src/__tests__/taskAndConfigHome.test.ts`, caso 9: afirma que los sustitutos de `provider` y `local-observability` reexportan `getConfigHomeDir`; ese reexport cuenta como sustituto para el detector y se retiró. En este worktree el caso sigue verde porque `@thyrox/*` resuelve por los `node_modules` del árbol principal (medido: la traza de un fallo apuntaba a `/home/user/thyrox/src/packages/local-observability/src/core.ts`), así que quedará rojo al integrar.
- `src/packages/config/env/dynamic.ts`: `envDynamic` tipado como `Record<string, unknown>`; la fuente lo tipa.
- `src/packages/ide/src/ide.ts` línea `windsurf: 'Windsurf'` frente a «Devin Desktop» en 2.1.283.

*Ciega a:* la resolución de `@thyrox/*` en `bun test` y en el typecheck usa las
copias del árbol principal, no las de este worktree; los originales que importo
no los modifiqué, así que el veredicto vale mientras no diverjan.
