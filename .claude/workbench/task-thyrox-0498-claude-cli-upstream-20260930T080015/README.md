# TASK-THYROX-0498 — upstream `claude-cli` del proxy local, con `tool_use` de ida y vuelta

Pregunta: ¿cómo atiende el proxy local `/v1/messages` lanzando `claude -p`,
cuando `claude` ejecuta sus propias herramientas y no devuelve `tool_use` al
cliente? Y ¿cómo resuelve la referencia cada pieza que hay que portar?

Corpus: `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root`
(sólo lectura: `bin/binary literal|symbol` y `rg`). El binario vivo es
2.1.285 (`claude --version`); sólo se le pidió `--help`.

## Lo medido en la referencia

| Consulta | Chunk / símbolo | Qué hace | Decisión |
|---|---|---|---|
| `mcp__` | `chunk-6a8rfcp6.js` `k` [3581,3611), `F` [3739,3768); `chunk-s31bcshf.js` `mcp__${vn(e.name)}__${S.name}` | el nombre de una tool MCP es `mcp__<servidor>__<tool>` | se porta: el puente se llama `thyrox_bridge` y cada tool del cliente se expone como `mcp__thyrox_bridge__<tool>`; al volver se le quita el prefijo |
| `vn` | `chunk-831var66.js` [653,790) | sanea el nombre del servidor: `[^a-zA-Z0-9_-]` → `_` | el nombre del puente ya cumple la forma; no hay que sanear |
| `--session-id <uuid>` | `chunk-fa2jy0nf.js` (`.option`) | fija el id de sesión de la conversación; tiene que ser UUID | una conversación = un `--session-id` (UUID v4) |
| `--resume` | `chunk-fa2jy0nf.js`, `--help` vivo | continúa una sesión existente | una conversación conocida sin proceso vivo se reanuda con `--resume <id>` |
| `--mcp-config <configs...>` + `--strict-mcp-config` | `chunk-fa2jy0nf.js` | carga servidores MCP de JSON (archivo o cadena) y sólo ésos | el puente se declara como cadena JSON `{type:"http",url}`; `--strict-mcp-config` deja fuera los MCP del usuario |
| `type==="http"` | `chunk-csayct82.js` (`(ge.type==="sse"\|\|ge.type==="http"\|\|ge.type==="ws")&&"url"in ge`) | un servidor MCP puede ser HTTP con `url` | el puente es un endpoint HTTP del propio proxy: no hay segundo proceso |
| `StreamableHTTPClientTransport` | `chunk-6ex11db3.js`, `chunk-tc5mq6jk.js` | el cliente MCP HTTP del SDK | el puente responde JSON-RPC por `application/json`; sin `Mcp-Session-Id` |
| `Or` / `mo` / `Fg` | `chunk-cfm9hr15.js` [40692,40830); `mo=1e8`; `chunk-379zyrv7.js` `Fg=2147483647` | plazo de una llamada a tool MCP: `timeout` del servidor, o `MCP_TOOL_TIMEOUT`, o 1e8 ms | **incompleto — corregido por TASK-THYROX-0646:** `Or` no es el único plazo. Un MCP `http` tiene además el de cada PETICIÓN, `Hr(e)=max(Ur(e),Gl())`, con `Ur` = `timeout` del servidor (≥1000) o `MCP_TOOL_TIMEOUT` con piso `mr=60000`, y sin ninguno 60 000 ms. Medido en el pool D: «tool "Bash" timed out after 60s». El puente declara ahora `timeout` = `pendingResultTtlMs` |
| `--tools <tools...>` | `chunk-fa2jy0nf.js` (`Use "" to disable all tools`) | acota las tools nativas | `--tools ""`: claude no ejecuta nada propio; sólo ve el puente |
| `--allowedTools` | `chunk-fa2jy0nf.js` | lista de tools permitidas sin preguntar | cada `mcp__thyrox_bridge__<tool>` va en `--allowedTools` |
| `--output-format stream-json` exige `--verbose` | `chunk-ycnq45th.js` (`requires --verbose`) | el modo `-p` rehúsa sin `--verbose` | la línea lleva `--verbose` |
| `--input-format stream-json` | `chunk-n94xvwy3.js` `ie` [14291,15650): `[...S.prefixArgs,"--attach-serve",id,"--input-format","stream-json","--output-format","stream-json"]`, con `stdio: pipe` y `a.stdin.write(...)` | la propia referencia lanza un hijo con `cmd` + `prefixArgs` y le escribe el mensaje por stdin | se porta la forma: `command: { executable, prefixArgs }`, el mensaje de usuario va por stdin como `{"type":"user","message":{...}}` |
| `type:"stream_event"` | `chunk-csayct82.js` | con `--include-partial-messages`, cada evento crudo del API sale como `stream_event` | C5d: se relee cada `stream_event` y se reescribe como SSE al cliente (pendiente de medir en vivo) |
| `system/init`, `result` | ya portados en `src/packages/cli/src/entry/print.ts` (2.1.282) | las líneas de salida de `-p` | el parser (`streamJson.ts`) lee `system`, `assistant`, `user`, `result`, `stream_event` |
| `--bare` | `--help` vivo, `chunk-bdv29443.js` | modo mínimo: sin hooks, sin plugins, sin memoria | NO se usa: medido en vivo (abajo), con `--bare` la línea responde «Authentication error» y sin él autentica |

*Métrica:* declaraciones de nivel superior que contienen cada literal
(`bin/binary literal`) y el cuerpo de cada símbolo (`bin/binary symbol`), más
`rg -F` sobre los chunks para las banderas con `--`, que `literal` rechaza como
opción.
*Ciega a:* el cuerpo de las funciones de `-p` que consumen esas banderas (sólo
se leyó su declaración), y la versión viva (2.1.285), de la que sólo se leyó
`--help`.

## La restricción medida antes de esta tarea

`.claude/workbench/claude-p-from-shell-20260928T234121/`: `claude -p`
autentica solo desde el shell (2.1.284) y un hijo hereda el `session_id` de
quien lo lanza si no se le da otro. De ahí el `--session-id` propio por
conversación.

## Lo que se portó, y dónde

| Pieza | Archivo | Qué hace |
|---|---|---|
| parser de la salida | `src/packages/provider/src/proxy/claudeCli/streamJson.ts` | una línea → evento, blanco o malformada (no se descarta en silencio) |
| traducción de la petición | `…/claudeCli/requestTranslation.ts` | nombres `mcp__thyrox_bridge__<tool>`, `--system-prompt`, la línea `stream-json` de stdin, la clave de prefijo de la historia (SHA-256 de los turnos canónicos) y la línea de comando |
| traducción de la respuesta | `…/claudeCli/responseTranslation.ts` | el mensaje del asistente con los nombres del cliente, y su SSE sintetizado |
| puente MCP | `…/claudeCli/bridge.ts` | JSON-RPC 2.0 por HTTP: `initialize`, `ping`, `tools/list`, `tools/call` suspendido hasta `deliver`; registro por token |
| proceso hijo | `…/claudeCli/claudeProcess.ts` | `Bun.spawn` con `command: { executable, prefixArgs }` (la forma de `ie`), stdin cerrado tras el mensaje, cola de stderr |
| turno | `…/claudeCli/turn.ts` | corre hasta SUSPENDER (una `tools/call`) o TERMINAR (`result`/salida); casa cada llamada con su bloque `tool_use` por nombre y argumentos |
| conversaciones | `…/claudeCli/conversations.ts` | `SessionCache` (alias `tool_use:<id>` y `prefix:<clave>` → sesión) y los turnos retenidos con plazo |
| upstream | `…/claudeCli/forwarder.ts` | reparte por nombre de upstream (como `cloudForwarder.ts`); localiza la conversación (viva / reanudar / nueva / caducada) |
| enrutado | `src/packages/provider/src/proxy/server.ts` | `POST /claude-cli/bridge/<token>` antes del control de acceso: el token es la credencial del hijo |
| arranque | `src/packages/provider/src/proxy/startServer.ts` | `claudeCli.upstreams`: sin endpoint, credencial sintética `claude-cli:<name>`, envoltura del reenviador, URL del puente tras `Bun.serve`, parada |

## Divergencias declaradas (y dónde están escritas)

- `count_tokens` → 501: `claude -p` no cuenta tokens (`forwarder.ts`).
- Una conversación NUEVA con historia pliega los turnos previos como texto
  delante del último mensaje: `claude -p` no admite inyectar turnos de
  asistente (`requestTranslation.ts`, `foldedUserInput`).
- Un `tool_result` de una conversación que el proxy no retiene → 400 que
  nombra el `tool_use`; a claude no hay cómo entregárselo (`forwarder.ts`).
- Abandonar un turno suspendido MATA el proceso antes de responder al puente:
  si claude recibiera el error como resultado, seguiría gastando turnos sobre
  él (`forwarder.ts`, `abandon`). Medido en la primera versión: responder
  antes de matar dejaba al doble sin recibir la respuesta (el kill ganaba la
  carrera) y no aportaba nada al caso real.
- El hijo nunca hereda `ANTHROPIC_BASE_URL`, `ANTHROPIC_UNIX_SOCKET` ni
  `CLAUDE_CODE_SESSION_ID`, vengan del proceso o de la configuración
  (`forwarder.ts`, `STRIPPED_CHILD_ENV`).
- El `model` de la respuesta es el que claude reporta en su mensaje, no el
  alias del cliente: es lo mismo que hace el reenviador HTTP, que devuelve la
  respuesta del upstream tal cual (`responseTranslation.ts`).
- La causa de un hijo que muere queda en el cuerpo 502 del reenviador; el
  servidor (`Bv`) descarta el cuerpo de un 5xx al conmutar y responde el
  502 genérico que `proxyServer.test.ts` fija. No se cambió ese contrato.
- C5d: el SSE se sintetiza del mensaje completo, no token a token
  (`responseTranslation.ts`). Relevar `stream_event` con
  `--include-partial-messages` queda como fase siguiente.
- `max_tokens`, `temperature`, `stop_sequences`: sin bandera en `claude -p`;
  no se traducen.

## Controles de anulación

Cada control retira UNA rama de `forwarder.ts` o `server.ts` sobre una copia
(`mktemp`), corre `claudeCliUpstream.test.ts` (8 casos) y restaura el archivo.
Guion: `annul.sh` de este banco (copiado del scratchpad).

| Control | Rama retirada | Cae | Sobreviven |
|---|---|---|---|
| A | el descarte de `ANTHROPIC_BASE_URL` del entorno del hijo | 1: C5a «el hijo recibe la línea medida» | 7 |
| B | el abandono al vencer el plazo del turno suspendido | 1: «el proceso suspendido termina y el tool_result tardío es 400» | 7 |
| C | localizar la conversación por el id del `tool_use` | 1: «la segunda entrega el resultado al mismo proceso» | 7 |
| D | registrar la clave de prefijo de la historia al terminar | 1: la misma prueba, en «la tercera reanuda por --resume» | 7 |
| F | servir el puente antes del control de acceso | 2: las dos que pasan por el puente | 6 |

Ni un caso más cae en ninguno. Tras restaurar: 8/8.

*Métrica:* `(fail)` que imprime `bun test` por control, sobre la misma suite.
*Ciega a:* las ramas de `turn.ts` que la suite no ejercita —la espera al
mensaje de asistente cuando la salida llega tarde, las llamadas hermanas de
un mismo mensaje y el bloque sintetizado— y a la carrera con el binario real,
que la sonda de abajo mide aparte.

## Cifras de las suites

| Suite | Resultado |
|---|---|
| `claudeCliTranslation.test.ts` + `claudeCliBridge.test.ts` | 23 pass, 0 fail, 69 expect |
| `claudeCliUpstream.test.ts` | 8 pass, 0 fail, 47 expect |
| 16 pruebas derivadas existentes + las 3 nuevas (18 archivos) | 181 pass, 0 fail, 404 expect |

Derivación de las existentes:
`grep -rlE "startProxyServer|createProxyHandler|proxy/server|proxy/startServer" --include=*.ts src/packages/provider/__tests__ src/packages/provider/src`.

## Sonda en vivo (binario 2.1.285, este contenedor)

`probes/live-claude-cli.ts` levanta el proxy con un upstream `claude-cli`
que lanza el `claude` del PATH y hace la ida y vuelta de un `tool_use`.

**Primer intento: 502 en 2.9 s** (`probes/first.json`, la versión con
`--bare`). El servidor conmuta y no muestra la causa, así que se midió la
línea compuesta a mano (`probes/manual-*.txt|jsonl`): exit 1, stderr vacío,
un asistente `<synthetic>` con «Authentication error» y `result` con
`is_error: true`. Con la línea de la sonda anterior
(`claude -p 'di hola' --max-turns 1 --output-format json`,
`probes/baseline-*`): exit 0, `¡Hola!`. La causa está en las banderas.

Bisección, cuatro variantes en paralelo (`probes/v-*.jsonl|err`):

| Variante | `--bare` | `env -u` | Resultado |
|---|---|---|---|
| keep-env | sí | nada | `is_error: true`, «Authentication error» |
| strip-session-only | sí | `CLAUDE_CODE_SESSION_ID` | `is_error: true`, «Authentication error» |
| strip-base-url | no | `ANTHROPIC_BASE_URL` | `is_error: false`, «Hola.» |
| no-bare-no-strip | no | nada | `is_error: false`, «Hola.» |

Conclusión: **`--bare` es la única causa**; descartar `ANTHROPIC_BASE_URL`
no rompe la autenticación de claude en este entorno. `--bare` se retiró de
`claudeArgv` y el descarte del entorno se conserva. Los nombres de las
variables `ANTHROPIC*`/`CLAUDE*` presentes están en `probes/env-names.txt`
(sólo nombres; ningún valor se leyó ni se copió).

También medido en `probes/manual-stdout.jsonl`: la salida real de 2.1.285
trae eventos que la referencia 2.1.283 no documenta en `-p`
(`active_goal`, `autocompact_state`) antes de `system/init`; el parser los
acepta como eventos de tipo desconocido y el turno los ignora.

*Métrica:* exit, `is_error` y `result` de cada variante; una ejecución por
variante.
*Ciega a:* por qué `--bare` deja a claude sin credencial (no se leyó la
configuración de este entorno), y a si el mismo `--bare` fallaría con una
`ANTHROPIC_API_KEY` en el entorno.

**Segundo intento, sin `--bare`: la ida y vuelta completa con el binario real**
(`probes/first.json`, `probes/second.json`):

| Petición | Estado | Pared | `stop_reason` | Contenido | Uso |
|---|---|---|---|---|---|
| 1: `tools:[list_dir]`, «usa list_dir sobre .» | 200 | 12 379 ms | `tool_use` | un `tool_use` con el id real de claude (`toolu_01U6…`), nombre `list_dir` (ya sin `mcp__thyrox_bridge__`), `input {path:"."}` | 28 188 tokens escritos en caché |
| 2: + asistente + `tool_result` «a.txt\nb.txt\nc.txt» | 200 | 3 935 ms | `end_turn` | «Hay 3 archivos en el directorio actual: a.txt, b.txt y c.txt.» | 28 188 tokens LEÍDOS de caché |

La lectura de caché de la segunda petición prueba que fue el MISMO proceso
el que siguió: el puente respondió su `tools/call` suspendida y claude
continuó la conversación sin relanzarse. El `model` de la respuesta es el
que claude reporta (`claude-sonnet-4-5-20250929`), y el bloque `tool_use`
trae un campo `caller: {type:"direct"}` que 2.1.285 añade y que se deja
pasar (la clave de prefijo no lo cuenta).

*Métrica:* estado, pared y cuerpo de las dos respuestas del proxy; una
ejecución.
*Ciega a:* varios `tool_use` en un mismo mensaje del binario real, y al
`--resume` con el binario real (sólo medido con el doble).
