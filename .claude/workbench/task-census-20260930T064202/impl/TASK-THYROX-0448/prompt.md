# TASK-THYROX-0448

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p2-uds-messaging.md`

## La tarea

## [196] TASK-THYROX-0448 — UDS F4 — protocolo y entrega: marcos de mensaje (en), cola de entrada de la sesión y sobre cross-session-message

Status on board: in_progress

Lectura por línea, validación, entrega al turno como <cross-session-message from=...>.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- marcos de mensaje `en` (lectura por línea, auth, tope): src/packages/local-observability/src/uds/inboxConnection.ts:1-9,20,76 — `sed -n 1,40p`; commit 5d48ec750 — `git log --oneline -- src/packages/local-observability/src/uds/inboxConnection.ts`
- `WOt`=1048576 del binario coincide con LINE_LIMIT_CHARS: inboxConnection.ts:20 — `grep -o 'WOt=[0-9]*' _references/claude-code-bin/2.1.283/bunfs-root/chunk-qcy58j4w.js` → WOt=1048576
- `function en(e)` y `async function ze(e,n,i,r,d)` existen en el corpus — `grep -o 'function en([^)]*)' bunfs-root/chunk-yg53q7yp.js`; `ze` llama `gE(D)` importado de chunk-csayct82.js — `grep -o 'import{[^}]*\bgE\b[^}]*}from"[^"]*"'`
- sobre cross-session-message (parse/format/hop chain, `fj`): src/packages/local-observability/src/uds/peerEnvelope.ts:25,111,131 — `grep -nE '^export '`; commit abce89961 — `git log --oneline -- .../peerEnvelope.ts`; `fj="cross-session-message"` en bunfs-root/chunk-fmsbxtrp.js
- entrega `ze` a la cola (validación, política, session.receive, adjuntos, sobre neutralizado): src/packages/local-observability/src/uds/inboxDelivery.ts:133,202-205 — commit 75bdb3b46 `Deliver a peer's user message to the session queue`
- cableado real de la conexión → enrutado: inboxServer.ts:369,376 (`processConnectionDeps`, `handleInboxConnection`) — `git grep -n handleInboxConnection -- src/packages`
- la entrega al turno NO está cableada: inboxServer.ts:131-133 `deliverUserMessage` por defecto registra 'no está cableado todavía (F6); mensaje descartado'; los dos llamadores reales (src/packages/cli/src/setup/setup.ts:99 y src/packages/app-host/src/runtime/messagingInboxAtLaunch.ts:74) no pasan `deps` — `git grep -n 'startUdsMessaging('`
- ningún productor pasa `enqueue` fuera de tests: `git grep -n 'enqueue:' -- src/packages ':!*__tests__*'` → sólo la declaración del tipo en inboxDelivery.ts:108
- el único commit que cita el id (3a73190ac) nombra constantes de direcciones/swarm, no la entrega — `git log --oneline --grep=THYROX-0448`
- suites: `bun test __tests__/udsInboxConnection.test.ts` 17 pass 0 fail; `udsInboxDelivery.test.ts` 17 pass; `udsPeerEnvelope.test.ts` 16 pass; `udsF2Server.test.ts` 6 pass (desde src/packages/local-observability)

## Lo que falta — tu alcance

- Cablear `deliverUserMessage` en `processMessagingStartDeps` (o en `udsMessaging.ts`) a `deliverPeerUserMessage` con sus `PeerDeliveryDeps` reales: `enqueue` → `enqueue` de src/packages/agent/messageQueueManager.ts:128 (adaptando `QueuedPrompt` a `QueuedCommand` de src/packages/repl/src/textInputTypes.ts:364, que no tiene `agentId`/`origin`/`isMeta`), `sessionId`, `receive` (sessionReceive.ts), adjuntos (peerFiles.ts) y compuerta (inboundGate.ts)
- Prueba de extremo a extremo: un marco `user` escrito en el socket del buzón aterriza en la cola de comandos como `<cross-session-message from="uds:…">` con `skipSlashCommands`, y con el stub retirado la aserción cae (anulación)
- Retirar el mensaje 'no está cableado todavía (F6)' de inboxServer.ts:131-133 una vez cableado

## Archivos que te pertenecen

- src/packages/local-observability/src/uds/inboxServer.ts
- src/packages/local-observability/src/uds/udsMessaging.ts
- src/packages/local-observability/src/uds/inboxDelivery.ts
- src/packages/agent/messageQueueManager.ts
- src/packages/local-observability/__tests__/udsMessaging.test.ts

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- src/packages/local-observability/__tests__/udsInboxConnection.test.ts — 17 pass / 0 fail (medido)
- src/packages/local-observability/__tests__/udsInboxDelivery.test.ts — 17 pass / 0 fail (medido)
- src/packages/local-observability/__tests__/udsPeerEnvelope.test.ts — 16 pass / 0 fail (medido)
- src/packages/local-observability/__tests__/udsF2Server.test.ts — 6 pass / 0 fail (medido)
- por escribir: caso en udsMessaging.test.ts que envíe un marco `user` por el socket arrancado con `startUdsMessaging` sin `deps` y afirme que llega a `getCommandQueue()` envuelto en cross-session-message

## Dependencias

- F6 (cableado de `gE`, la cola de la sesión, chunk-csayct82.js) — la propia cabecera de inboxDelivery.ts:18 e inboxServer.ts:20-24 lo declaran como fase aparte; no hay id de tarea medido para F6
- TASK-THYROX-0463 (F4d: compuerta, recibo y aceptación que `deliverPeerUserMessage` recibe como deps)
