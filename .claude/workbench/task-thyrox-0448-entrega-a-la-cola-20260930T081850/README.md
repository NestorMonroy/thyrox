# TASK-THYROX-0448 — entrega de un `user` de un par a la cola de la sesión

Cómo resuelve 2.1.283 lo que este ítem cablea, medido sobre
`/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/` con `rg -n -o`
(sólo lectura), y qué se portó o se declaró divergencia en
`src/packages/local-observability/src/uds/{inboxServer,inboxDelivery}.ts`.

## Símbolos consultados

| Símbolo | Chunk:línea | Qué hace | Decisión |
|---|---|---|---|
| `be(e,n,i,r,d)` | `chunk-yg53q7yp.js:11` | enruta por `type`; `user` → `await ze(e,n,i,r,d)` sin inyección | igual: `handleInboxMessage` llama `deps.deliverUserMessage`, y el default es `ze` |
| `ze(e,n,i,r,d)` | `chunk-yg53q7yp.js:11` | valida, `C7e`/`nSe`/`kJr`, `Aot`, adjuntos con `nlt()`, `ce`, `zce`, arma `D={mode:"prompt",agentId:qe(),…,skipAttachments:!0}`, `fbt(D)!=="accept"` corta, `gE(D)` | ya portado (`deliverPeerUserMessage`); aquí se le dan sus deps reales |
| `import{E2e,gE,Cgo,Aot}from"…chunk-csayct82.js"` | `chunk-yg53q7yp.js:11` | de dónde sale `gE` | — |
| `gE=(...e)=>Eh().enqueue(...e)` | `chunk-csayct82.js:178` | delegación perezosa a `enqueue` del módulo de la cola | portado: `enqueue` de `@thyrox/agent/messageQueueManager.ts`, import estático (ver divergencia 3) |
| `function Eh(){return PYe().queue}` | `chunk-csayct82.js:178` | el módulo de la cola, cargado al llamar | — |
| `Pwr=(...e)=>Eh().enqueueReportingAdmission(...e)` | `chunk-csayct82.js:178` | la admisión (`admitForDelivery`) | fuera de alcance: `messageQueueManager.ts` no tiene `enqueueReportingAdmission` (`git grep` → 0); sigue inyectada en `InboundGateDeps` |
| `qe()` | `chunk-nvht7ckf.js:11` | `p()?.sessionId` → `go(id)`; si no, `identity.mainAgentId(id)`: el id del agente actual | divergencia 1 (abajo) |
| `fbt(e)` | `chunk-dv9ctjss.js:11` | `v(e,P(b(e)))`: veredicto de par + admitir/retener | portado ya como `gatePeerMessage`; aquí se cablea como `accept` |
| `WOt=1048576` | `chunk-qcy58j4w.js:11` | tope de línea | ya portado (`LINE_LIMIT_CHARS`), no se toca |
| `fj="cross-session-message"` | `chunk-fmsbxtrp.js:16` | el tag del sobre | ya portado (`ENVELOPE_TAG`), no se toca |

*Métrica:* primera línea del chunk donde `rg -n -o` casa el patrón literal.
*Ciega a:* los chunks son minificados de pocas líneas (11, 16, 178), así que
la línea no localiza dentro de la línea; el offset de byte no se registró.

## Lo que el prompt afirmaba y resultó distinto al medir

1. **`QueuedCommand` sí tiene `agentId`, `origin` e `isMeta`**
   (`src/packages/repl/src/textInputTypes.ts:369-423`: `origin?: MessageOrigin`,
   `isMeta?: boolean`, `agentId?: AgentId`). El prompt decía que no. Lo que no
   tiene es `skipAttachments`, y `uuid` es `UUID` de `crypto`, no `string`.
   *Métrica:* `sed -n 364,423p` del archivo. *Ciega a:* nada; es el tipo.
2. **El hilo principal en esta cola es `agentId === undefined`**, no un id:
   `agent/runtime/queueProcessor.ts:61`, `agent/query.ts:1699`,
   `cli/src/headless/sdk/session/run-streaming.ts:1302`. Portar `qe()` como
   un id de texto dejaría el mensaje sin drenar por el hilo principal.
   *Métrica:* `git grep -n 'agentId === undefined'` en esos tres archivos.
   *Ciega a:* un drenaje que filtre por otro campo.
3. **La entrega ya encolaba, pero fallaba en el árbol de pruebas por
   `ConfigHostBindingsError`**: `processInboundPolicyReaders` lee settings por
   `@thyrox/config`, que exige los bindings que el bootstrap instala. Medido
   con una sonda y `DEBUG=1 --debug-to-stderr`: `Failed to process message:
   ConfigHostBindingsError`. La prueba instala `InMemoryConfig().bindings`,
   como `tests/unit/utils/messages.test.ts:41`.
4. **Sin el lector del modo de permisos, todo mensaje de un par se
   retiene** (`mode-unknown`): `wireCurrentModeGetter` tiene 0 llamadores de
   producción (`git grep -n 'wireCurrentModeGetter(' -- src/packages
   ':!*__tests__*'` → sólo su definición). La entrega queda cableada; que
   llegue al turno depende de que el consumidor cablee ese lector. La prueba
   segunda mide exactamente ese límite: cola vacía, `held` con el marco.

## Divergencias declaradas en el porte

1. **`qe()` → `MAIN_THREAD_AGENT_ID = ''` y `toQueuedCommand` omite
   `agentId` para el hilo principal** (razón: hallazgo 2). Un subagente
   conserva el suyo con `asAgentId`. El valor vacío es el que
   `defaultInboundGateDeps` (`bind.ts:73`) ya devuelve; `bind.ts` no está en
   este alcance, así que no se le hizo importar la constante.
2. **`skipAttachments` se omite** en `toQueuedCommand`: no es campo de
   `QueuedCommand` (`git grep skipAttachments -- src/packages` → sólo
   `processUserInput.ts` y `handlePromptSubmit.tsx`, como opción).
3. **`gE` es un import estático**, no `import.meta.require` al llamar. Se
   midió que resuelve desde este paquete (`bun -e` con
   `@thyrox/agent/messageQueueManager.js` → `enqueue function`) y que el ciclo
   agent ↔ local-observability no rompe la carga (las 7 suites del paquete y
   `systemInitUdsInbox.test.ts` de agent pasan).
4. **`session.receive` corre contra `NO_MODULE_RUNTIME`** por defecto: el
   runtime de módulos (`Ml`/`Vp`/`Xot`, serie MOD) no está portado
   (`runSessionReceive` tiene 0 llamadores de producción). `hookSite` lo
   inyecta cuando exista.
5. **Los adjuntos sólo con `peerFileDeps` inyectadas**: el predicado `Mur`
   vive en `@thyrox/permission`, que depende de este paquete
   (`permission/package.json:308`); importarlo aquí sería un ciclo declarado
   como prohibido en la cabecera de `peerFiles.ts`.
6. **`Pwr`/`admitForDelivery` no se porta** (tabla de arriba).

## Cifras de la sesión

| Qué | Antes | Después |
|---|---|---|
| suites citadas por el prompt (5 archivos) | 61 pass / 0 fail | 65 pass / 0 fail (4 casos nuevos en `udsMessaging.test.ts`) |
| 7 suites UDS del paquete + `systemInitUdsInbox` (agent) | — | 124 + 2 pass / 0 fail |
| anulación A: `userMessageDelivery` devuelve un stub | — | caen exactamente 2 (las dos de extremo a extremo; las dos pasan por la entrega) |
| anulación B: `agentId` siempre presente | — | caen exactamente 2 (las dos aserciones de `agentId` ausente) |
| `check_package_typecheck --strict --no-rebuild local-observability` | — | 0 propios |
| `check_identifier_language` (3 archivos) | — | OK |
| `package_boundary --strict`, `check_product_word --strict` | — | 0 |

*Métrica:* salida de `bun test` por archivo; conteo de `(fail)` bajo cada
anulación con el archivo copiado por `mktemp`, revertido con
`bin/replace_literal`, medido y restaurado (`cmp` confirmó la restauración).
*Ciega a:* `check_package_typecheck --strict` CON rebuild de proveedores no
terminó en 590 s dos veces (exit 143); el 0 es del modo `--no-rebuild`.
