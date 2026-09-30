# TASK-THYROX-0284 — el manejador del stream al contrato de 2.1.281/2.1.283

Referencia leída (sólo lectura): `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/`.
Cada símbolo se localizó con `grep -o`/`rg -o` sobre el chunk y la línea que se citan.

## Símbolos consultados

| Símbolo | Chunk:línea | Qué hace | Decisión |
|---|---|---|---|
| `hwr(e,n,r)` | chunk-csayct82.js:3563 | El manejador del stream: (item, opciones, contexto). Sólo items del stream; `message_start`/`message_stop`/bloques/deltas/`message_delta`. | Portado como `handleMessageFromStream(item, options, context)`. |
| `KVe(e,n)` | chunk-csayct82.js:3563 (justo antes de `hwr`) | El despachador de quien llama: lápida, `tool_use_summary`, notificaciones…, `assistant` → `onStreamingThinking` y `displayTransform.entryLanded`, `onStreamingText(null)`, `onMessage`; si es del stream (`rnt`), delega en `hwr`. | Su parte de mensajes completos vive en el llamador (`REPLView.deliverCompleteMessage`); `rnt` ≙ `isStreamItem`. Los `onNotification`/`onExpandedView`/… no existen en thyrox: divergencia declarada. |
| `aKe(e)` + `Fon=new Set(Hpe)`, `Hpe=["compact_progress","sdk_status","stream_mode"]` | chunk-csayct82.js:3563 | Un evento de compactación va a `onCompactEvent`. | Portado: `CompactEvent`, `COMPACT_EVENT_TYPES`. |
| `$ie(e)` | chunk-csayct82.js:3563 | `ping` se ignora. | Portado (`isPingEvent`). |
| `qnr=32768` | chunk-csayct82.js | Tope del JSON del bloque `tool_use` en curso. | `MAX_TOOL_USE_BLOCK_JSON_CHARS`. |
| `znr=256` | chunk-csayct82.js | Tope de tool uses en curso. | `MAX_STREAMING_TOOL_USES`. |
| `I3t=1e6` | chunk-csayct82.js | Tope del texto parcial; se recorta el delta. | `MAX_STREAMING_TEXT_CHARS`. |
| `gwr(e)=ceil(e.length/4)` | chunk-csayct82.js | Estimador de tokens del thinking por texto. | `estimateTokensFromChars(charCount)` + `CHARS_PER_ESTIMATED_TOKEN=4`. |
| `kZt(e)=round(e*0.75)` | chunk-csayct82.js | Caracteres de la firma que cuentan como pensamiento. | `SIGNATURE_CHARS_RATIO=0.75`. |
| `Gnr(e)=e.usage?.output_tokens??null` | chunk-csayct82.js | Tokens de salida de `message_delta`; si faltan, `tengu_message_delta_usage_missing` con `is_subagent`. | Portado con el `context.isSubagent`. |
| `Ee.with(xe,Ie)` / `Ee.length>=znr?Ee:[...Ee,Ie]` | chunk-csayct82.js:3563 | Sustitución por índice o alta acotada. | `withStreamingToolUse`. |
| `YB=new w3t` (`load()`/`loaded()`) → chunk-0b726pf4.js: `U as onToolUseStart`, `W as onInputJsonDelta`, `G as onToolUseStop`, `N as resetAuthoringProgress` | chunk-csayct82.js + chunk-0b726pf4.js | La superficie L0 de autoría (workshop): módulo cargado perezosamente cuando `authoringProgressSurface===true`; acumula el JSON parcial por índice de bloque y pinta el spinner. | **Divergencia**: thyrox no tiene el módulo de workshop. La opción `authoringProgressSurface` lleva la interfaz (`AuthoringProgressSurface`) en vez de un booleano que dispare una carga global; el manejador la llama en los mismos cuatro puntos. |
| `displayTransform: begin/delta/finalize/entryLanded` (`u3r`, chunk-et1gk3fs.js:36; cableado en chunk-de3xpxbw.js:206) | | Cola de transformación de lo que se muestra. | Tipo `DisplayTransform` y llamadas en `message_start`/`text_delta`/`message_stop`. **Divergencia**: el productor (`u3r`) no está portado; `REPLView` no lo declara. |
| `{type:"response_length",op:"reset"|"add",delta}` (chunk-edhc0km7.js:11, chunk-csayct82.js:1835 `goe`) | | Evento propio del largo de la respuesta, emitido por la compactación y por `goe`. | Tipo `ResponseLengthEvent` + `onResponseLength`. **Divergencia**: en thyrox nadie lo emite aún (`git grep response_length -- src` → 0 antes de este cambio); el contrato lo acepta. |
| `runAgent` (chunk-qrmg14b4.js:92: `ur={onSetStreamMode,onUpdateLength:(w)=>{Xt+=w/4},onApiMetrics:…}`, `hwr(w,ur,pr)`) | | Cómo un consumidor convierte las métricas tipadas: `thinking_progress` suma tokens; `thinking_signature` suma `ceil(chars/4)-Rt` si excede la cuenta del bloque; `content_block_start` la reinicia. | Portado en `REPLView.recordApiMetric` (con `×4` a caracteres, que es la unidad de `setResponseLength`). |
| execAgentHook (chunk-csayct82.js:1881: `KVe(In,{onMessage:()=>{},onUpdateLength:()=>{},…})`) | | En 2.1.283 el hook agente ya no mueve el largo de la respuesta. | **Divergencia deliberada por el prompt**: thyrox sigue sumando `onUpdateLength` numérico a `setResponseLength`. |
| `prt(w)=!!w.thinking?.trim()&&Foe(w)` en `KVe` | chunk-csayct82.js:3563 | Decide si el thinking aterrizado se muestra o se vacía. | `Foe` no medido; se conserva la conducta previa de thyrox (`thinkingAfterLanding` siempre lo conserva). Pendiente si alguien lo necesita. |
| `case"fallback":return` / `advisor_tool_result` | chunk-csayct82.js:3563 | `fallback` no mueve el spinner; `advisor_tool_result` es bloque del servidor. | Portados. La rama `CONNECTOR_TEXT` de thyrox (ccnmt 2.1.88) se conserva: no está en 2.1.283 pero su bandera sigue viva en `provider`. |

Métrica: presencia literal de cada símbolo en el chunk citado (`grep -o` sobre la línea).
Ciega a: el binario 2.1.281 que nombra la tarea (no está en `_references/`; se leyó 2.1.283, y las diferencias entre los dos no se midieron).

## Estado previo medido en este worktree

- `git grep -c unparsedToolInput -- src` → `messages.ts:3` antes; **0** después.
- `git grep -n 'handleMessageFromStream(' -- src` → 4 sitios (definición + 3 llamadores), todos migrados al objeto de opciones.
- Ninguna suite nombraba el handler (`git grep -ln 'handleMessageFromStream\|StreamingToolUse' -- '**/__tests__/**'` → 0); ahora `src/packages/agent/__tests__/handleMessageFromStream.test.ts`.

## Controles de anulación (cada uno: copia con `mktemp`, `sed` sobre la rama, `bun test`, restaurar y `cmp`)

| Rama retirada | Cae | De 30 |
|---|---|---|
| a. tope de tool uses (`hasRoom = true`) | «al tope de tool uses no se anade» | 1 |
| b. sustitución por índice (sin `current.with`) | «mismo indice sustituye en su posicion» | 1 |
| c. tope de JSON del bloque | «JSON supera el tope se descarta» | 1 |
| d. tope de texto (sin `isFull` ni `slice`) | «recorta el delta al tope de texto» | 1 |
| e. salto del `ping` | «un ping no toca ningun callback» | 1 |
| f. guarda de `ttftMs` | «sin ttftMs no emite la metrica start» | 1 |
| g. estimador de thinking por texto (`null`) | «thinking_delta con texto estima ceil(chars/4)» | 1 |
| h. identidad al vaciar en `message_start` | «conservando la identidad cuando ya estaban vacios» | 1 |
| i. guarda de nombre de cadena | «tool_use sin nombre de cadena se descarta» | 1 |
| j. reset de autoría en `message_stop` | «message_stop … reinicia la autoria» | 1 |

Métrica: `(fail)` de `bun test` con la rama retirada, 29 pass / 1 fail en las diez; `cmp` contra la copia da idéntico al final.
Ciega a: ramas que dos casos cubran a la vez (ninguna anulación tumbó más de uno, así que no se observó), y a los consumidores (`REPLView`, `useRemoteSession`, `execAgentHook`), que sólo el typecheck mide.

## Typecheck y suites

- `bun test __tests__/handleMessageFromStream.test.ts __tests__/contentTextHelpers.test.ts __tests__/createMessageHelpers.test.ts` (desde `src/packages/agent`): **78 pass, 0 fail** (30 nuevos + 48 existentes).
- `bash bin/check_package_typecheck --strict --no-rebuild agent repl`: `agent: 0 propio(s)` (baseline 0). `repl: 28 propio(s) <- sube desde 0`.
- **Los 28 de `repl` son del entorno del worktree, no del código, y está medido:** este worktree no tiene `node_modules` (`ls node_modules/@thyrox/` → no existe), así que `@thyrox/agent/messages.js` resuelve por `/home/user/thyrox/node_modules/@thyrox/agent -> /home/user/thyrox/src/packages/agent` — el árbol PRINCIPAL, cuyo `dist/messages.d.ts` (07:27, 0 ocurrencias de `isStreamItem`/`StreamHandlerOptions`, `handleMessageFromStream` posicional en su línea 669) no trae este cambio. Los 28 son exactamente eso: 8×TS2305 (los exports nuevos), 2×TS2554 («Expected 5-9 arguments») y 18 en cascada de `never` por `QueryEvent` sin resolver.
- **Atribución:** con `bash bin/emit_declarations agent` (0 errores, `dist/messages.d.ts` de este worktree con los 4 símbolos) y un `tsconfig` temporal de `repl` que extiende `tsconfig.build.json` con `paths["@thyrox/agent/messages.js"] = ["../agent/dist/messages.d.ts"]`, `bunx tsc` da **0 errores en `src/` de `repl`** (temporal borrado después). Al integrar en el árbol principal y re-emitir `agent`, el gate de `repl` vuelve a su baseline sin tocar nada más.
- `bin/check_lint_zero`: no aplica — no se tocó ningún `.py` ni `.sh`.

Métrica: conteo de `error TS` por archivo en la salida de tsc, con y sin la ruta al `dist/` de este worktree.
Ciega a: errores de `repl` que dependan de OTRO módulo de `agent` cambiado (sólo `messages.js` se redirigió; `tokens.ts` y `execAgentHook.ts` no exportan nada que `repl` importe de forma distinta).
