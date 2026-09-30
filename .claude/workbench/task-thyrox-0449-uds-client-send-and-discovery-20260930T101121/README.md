# TASK-THYROX-0449 — cliente UDS: envío con clave publicada y descubrimiento (ListAgents)

Cómo resuelve 2.1.283 lo que este ítem cierra, medido sobre
`/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/` con `rg -o -n`
(sólo lectura), y qué se portó, qué ya estaba portado y qué se declara divergencia.
El censo (`prompt.md`) daba la tarea como *parcial* por tres huecos; los tres se midieron
de nuevo antes de escribir.

## Símbolos consultados

| Símbolo | Chunk:línea | Qué hace | Decisión |
|---|---|---|---|
| `deliver` de SendMessage, rama `S.scheme==="uds"` | `chunk-zzjp4jq7.js:53` | `ySe` (auto-envío) → rechazo; `import.meta.require(chunk-p4b2d9hd).sendToUdsSocket`; `is(...)` (mensaje vacío/notify); `_bt` (nota de un solo sentido); `B(S.target, K, r.storageV5, j, void 0, EFe(...), A, {fromPlugin})`; `e.summary||fo(e.message,50)` como preview; `success: X!==void 0 \|\| Q?.ok` | ya portado en `SendMessageTool.ts:568-586` con `sendToUdsSocket(addr.target, input.message)` y `input.summary \|\| truncate(message, 50)`. Sin prueba hasta hoy → `udsRoute.test.ts` |
| `validateInput`: `if(lh(e.to).scheme==="uds"&&typeof e.message==="string")return{result:!0}` | `chunk-zzjp4jq7.js:53` | texto plano a `uds:` pasa sin exigir summary; un estructurado cae al rechazo `structured messages cannot be sent cross-session` | ya portado (`SendMessageTool.ts:445-453` y `:478-485`); ahora con aserción en las dos ramas de la bandera |
| `(w==="uds"\|\|w==="bridge")&&!Ws()` → `$Mt` | `chunk-zzjp4jq7.js:53` | compuerta de mensajería cross-session apagada | **divergencia declarada**: `SendMessageTool.ts` no la porta (`git grep isSessionMessagingEnabled -- SendMessageTool/` → 0). No es de este alcance (`SendMessageTool.ts` no está en los archivos que me pertenecen); la prueba lo nombra en `Ciega a` |
| `ySe(S.target)` → `XK` (rechazo de auto-envío) | `chunk-zzjp4jq7.js:53` | rehúsa mandarse a su propio socket | no portado en `SendMessageTool.ts`; misma razón, misma declaración |
| `export{… VOt as sendToUdsSocket, kee as sendControlToUdsSocket, iat as sendStampedControlToUdsSocket, D3 as listAllLiveSessions …}` | `chunk-p4b2d9hd.js:11` | el nombre público de `VOt` es `sendToUdsSocket` (7 args + opciones) | el árbol lo porta como `sendPeerUserMessage` (misma firma) y expone `sendToUdsSocket(target, message)` como envoltorio de dos args para `SendMessageTool`/`conversationRecovery`; divergencia ya declarada en la cabecera de `udsClient.ts:548-551` |
| `VOt(e,n,r,i,s,m,g,{trackReceipts,expectPeerPid,expectPeerProcStart,fromPlugin})` | `chunk-qcy58j4w.js:11` | sobre, ritmo de salida, recibo y `Pe` | ya portado (`sendPeerUserMessage`, `udsClient.ts:463`) |
| `Pe(e,n,r,{noFollowSymlink,expectPeerPid,expectPeerProcStart,preflightedJson})` | `chunk-qcy58j4w.js:11` | `d=ofn()`; `o=await QDo(e,r,{requireLiveOwner:d})`; `c=o.kind==="token"?o.token:void 0`; `E=c!==void 0?zFr(c):""`; `h=E+l+"\n"` | ya portado (`sendRawMessage`, `udsClient.ts:351-372`): `readPeerToken(target,{requireLiveOwner,storage})` → `authFrameLine(token)` → `payload = authLine + json + "\n"`. **Sin aserción directa hasta hoy** → dos casos nuevos en `udsClient.test.ts` |
| `ofn(){return O()==="windows"}` | `chunk-5mcqvwzx.js:14` | auth exigida por defecto sólo en Windows | ya portado (`authRequiredByDefault`, `inboxAuth.ts:24`). Consecuencia medida: en Linux `requireLiveOwner=false`, así que el token se usa **si la clave existe** y se omite si no, sin rechazar. Eso es lo que las dos pruebas (con clave / sin clave) miden |
| `zFr(e){return b({type:X,token:e})+"\n"}` | `chunk-5mcqvwzx.js:14` | el marco de auth es una línea JSON `{type:"auth",token}` | ya portado (`authFrameLine`, `inboxAuth.ts:34`); la prueba compara byte a byte contra él |
| `QDo`/`XDo` (leer/publicar clave) | `chunk-5mcqvwzx.js` | clave en `<sessions>/<pid>.<sha256(addr)>.key` | ya portados (`readPeerToken`, `publishInboxKey`, `inboxKeys.ts:313/269`); la prueba nueva publica con `publishInboxKey` y deja que `sendToUdsSocket` la lea por el camino real (sin `deps` inyectadas) |
| `getListPeersTool` / ListAgents | `chunk-8xzbdmg9.js` + `chunk-3pfj38s1.js` | herramienta de descubrimiento | **ya cerrado por TASK-THYROX-0600 en `b1ae180d3`**: `BuiltInToolsProvider.ts:145-146` y `:255` lo registran sin compuerta; `ListAgentsTool.test.ts:149` lo asegura. El censo (`getListPeersTool = () => null`, `:143`) era anterior a ese commit |

*Métrica:* primera línea del chunk donde `rg -o -n` casa el patrón; chunks minificados
(líneas 11, 14, 53), así que la línea no localiza dentro de la línea.
*Ciega a:* símbolos que `rg -o` recortó por longitud (`{0,N}`); no se leyó el chunk entero.

## Lo que el censo afirmaba y resultó distinto al medir

1. **«getListPeersTool devuelve null (BuiltInToolsProvider.ts:143)»** — en `HEAD`
   (`330d7f051`) la línea 143 es un comentario y `:145-146` define `getListAgentsTool`
   con `require('../../ListAgentsTool/ListAgentsTool.js')`, empujado en `:255`.
   *Métrica:* `cat -n BuiltInToolsProvider.ts`. *Ciega a:* nada; es el archivo.
   Consecuencia: **`BuiltInToolsProvider.ts` no se toca** aunque me pertenezca — el hueco
   ya está cerrado y reescribirlo sería duplicar TASK-THYROX-0600.
2. **`feature('UDS_INBOX')` bajo `bun test`** — sin bandera es `false` (`INLINE= off`),
   con `bun test --feature=UDS_INBOX` es `true` en el archivo de prueba **y en los módulos
   que importa** (`IMPORTED= on`); `mock.module('bun:bundle', …)` **no** lo cambia
   (`MOCK INLINE= off`). Medido con tres sondas `zz_probe_*.test.ts`, borradas después.
   *Métrica:* `console.log` de la sonda bajo las tres formas. *Ciega a:* el binario
   compilado (`bin/cli`), donde la macro se resuelve al construir.
   Consecuencia: la prueba del ramal sigue el idioma de
   `messagingInboxAtLaunch.test.ts` — un `if (!feature('UDS_INBOX'))` que elige la rama
   de aserciones — y se corre dos veces.
3. **`sendToUdsSocket` a un socket sin oyente NO lanza**: `call` atrapa y devuelve
   `success:false, "Failed to send to uds:<ruta>: connect ENOENT …"`. Sale de la
   prueba `un socket sin oyente…`; el censo no lo decía ni lo negaba.

## Casos cubiertos

| Caso | Prueba |
|---|---|
| sin bandera: `to: uds:<sock>` texto plano pasa `validateInput` y deriva `summary` como un nombre cualquiera | `udsRoute.test.ts` › sin feature › `validateInput no toma el atajo uds:` |
| sin bandera: estructurado a `uds:` no se rechaza como cross-session (el ramal no existe) | `udsRoute.test.ts` › sin feature › `un mensaje estructurado a uds: no se rechaza…` |
| con bandera: texto plano a `uds:` pasa sin exigir ni derivar `summary` | `udsRoute.test.ts` › con feature › `validateInput acepta texto plano sin summary y no lo deriva` |
| con bandera: estructurado a `uds:` → `structured messages cannot be sent cross-session` | `udsRoute.test.ts` › con feature › `validateInput rechaza un mensaje estructurado a uds:` |
| con bandera: `call` → `sendToUdsSocket` → el servidor recibe 1 línea `type:user` con el texto y `msg_id`; resultado `“hola par” → uds:<sock>` | `udsRoute.test.ts` › con feature › `call llega a sendToUdsSocket…` |
| con bandera: `summary` explícito es el preview | `udsRoute.test.ts` › con feature › `call con summary explícito…` |
| con bandera: socket sin oyente → `success:false`, `Failed to send to …`, 0 líneas recibidas | `udsRoute.test.ts` › con feature › `un socket sin oyente…` |
| clave publicada con `publishInboxKey` → la primera línea recibida es exactamente `authFrameLine(peerToken)`, la segunda el `user` | `udsClient.test.ts` › `envío con clave publicada` › `con la clave del par publicada…` |
| clave retirada con `removeInboxKey` → 1 sola línea, `type:user`, sin marco de auth | `udsClient.test.ts` › `envío con clave publicada` › `retirada la clave… (control de anulación)` |

## Controles de anulación (copia con `mktemp`, `sed -i`, medir, restaurar; `git diff --quiet` → limpio)

| Rama retirada | Cómo | Caen | Sobreviven |
|---|---|---|---|
| `authLine` en `sendRawMessage` (`udsClient.ts:375` → `const authLine = ''`) | `sed -i` | **1/23**: `con la clave del par publicada…` | 22, incluido el control `retirada la clave…` (que no depende del token) |
| ramal `uds` de `call` (`SendMessageTool.ts:568` → `'never-uds'`) | `sed -i`, con `--feature=UDS_INBOX` | **3/5**: `call llega…`, `summary explícito…`, `socket sin oyente…` | 2: las dos de `validateInput` |
| atajo `uds` de `validateInput` (`SendMessageTool.ts:447` → `'never-uds'`) | `sed -i`, con `--feature=UDS_INBOX` | **1/5**: `validateInput acepta texto plano sin summary y no lo deriva` | 4 |

Cada rama tumba exactamente los casos que dependen de ella y ninguno más.

## Resultados

- `bun test src/uds/__tests__/udsClient.test.ts` (local-observability): 21 → **23 pass, 0 fail, 41 → 48 expect**.
- `bun test src/tools/SendMessageTool/__tests__/udsRoute.test.ts` (tool-registry): **2 pass / 3 expect** sin bandera; **5 pass / 15 expect** con `--feature=UDS_INBOX`.
- `bun test src/tools/SendMessageTool/__tests__/` (las dos suites previas, ambas banderas): 21 pass, 0 fail, sin cambio.

## Archivos

- `src/packages/tool-registry/src/tools/SendMessageTool/__tests__/udsRoute.test.ts` (nuevo)
- `src/packages/local-observability/src/uds/__tests__/udsClient.test.ts` (+2 imports, +1 `describe`)
- `src/packages/tool-registry/src/tools/registry/providers/BuiltInToolsProvider.ts`: **sin cambios** (hallazgo 1)
