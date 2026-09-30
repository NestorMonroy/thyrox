# TASK-THYROX-0449

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p2-uds-messaging.md`

## La tarea

## [197] TASK-THYROX-0449 — UDS F5 — cliente (udsClient.ts): enviar a un par uds:<ruta> con su clave, y descubrimiento de pares (ListAgents)

Status on board: pending

Sustituye el stub udsClient.ts; SendMessage con to: uds:...; lectura de claves publicadas.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- stub udsClient.ts sustituido: src/packages/local-observability/src/uds/udsClient.ts pasa de 3 líneas ('// Auto-generated stub') en 16c31d165 a 554 líneas en 8d2d70ab7 — `git show 16c31d165:<F> | wc -l` (3) vs `wc -l <F>` (554); `git log --oneline -- <F>` → 8d2d70ab7, 16c31d165, 6c0c5c932
- envío a par uds:<ruta>: sendPeerUserMessage (udsClient.ts:463), sendControlMessageWithReceipt (:525), sendToUdsSocket (:552) — `grep -n '^export' udsClient.ts`
- SendMessage con to: uds:… rutea al cliente: SendMessageTool.ts:568-586 (`addr.scheme === 'uds'` → require udsClient.js → sendToUdsSocket); validación del caso uds en :445-453 — `sed -n 550,620p`; el ramal existe desde el commit más antiguo del archivo (0c098f9be, `git log --oneline -S"scheme === 'uds'" -- SendMessageTool.ts`)
- lectura de claves publicadas: sendRawMessage (udsClient.ts:351-372) llama readPeerToken (inboxKeys.ts:313) y compone authFrameLine con el token; publishInboxKey en inboxKeys.ts:269, portado en 4ffe2a5ce — `git log --oneline -- inboxKeys.ts | tail -1`
- descubrimiento de pares (núcleo): listAllLiveSessions (liveSessionRegistry.ts:368) reexportado por udsClient.ts:106-119 y consumido por repl/conversationRecovery.tsx:510 — `git grep -n listAllLiveSessions`; formateador ListAgents en listAgentsFormat.ts (0776aff15)
- descubrimiento de pares (herramienta): getListPeersTool devuelve null — BuiltInToolsProvider.ts:143 (`const getListPeersTool = () => null`), comentario :141-142 'src/ shim never replaced'; ningún archivo ListPeersTool/ListAgentsTool en `git ls-files | grep -iE 'ListPeers|ListAgents'` (sólo listAgentsFormat.ts y su test)
- gate de compilación: feature('UDS_INBOX') es macro de bun:bundle (messagingInboxAtLaunch.ts:49-54), 'defaults false in this build' (BuiltInToolsProvider.ts:142); `git grep -n 'feature=UDS_INBOX' -- package.json scripts tests` → 0 hits
- job del pool que escribió el cliente: /home/user/thyrox/.claude/workbench/uds-client-20260929T050627/outputs/1.verdict = verificado; 1.files lista udsClient.ts, liveSessionRegistry.ts, peerLoopGuard.ts y sus tres tests

## Lo que falta — tu alcance

- Herramienta ListAgents/ListPeers registrada en BuiltInToolsProvider.ts (hoy `getListPeersTool = () => null`, :143): la pieza «descubrimiento de pares (ListAgents)» del título sólo tiene núcleo (listAllLiveSessions + listAgentsFormat.ts), no la herramienta que el modelo invoca — es el alcance de TASK-THYROX-0600
- Prueba del ramal uds: de SendMessageTool.ts: `git grep -n 'uds:' -- src/packages/tool-registry/**/__tests__` sólo da peerAddress.test.ts (parseo) y rootModules.test.ts; ninguna aserción ejercita SendMessage → sendToUdsSocket
- Prueba del envío CON clave publicada: udsClient.test.ts:211 envía sin token porque authRequiredByDefault(platform) sólo es true en windows (inboxAuth.ts:24-26); `grep -n 'readPeerToken|publishInboxKey' udsClient.test.ts` → 0 hits. El camino readPeerToken→authFrameLine del cliente queda sin aserción directa (publishInboxKey/readPeerToken sí se prueban aislados en udsInboxKeys.test.ts)

## Archivos que te pertenecen

- src/packages/tool-registry/src/tools/registry/providers/BuiltInToolsProvider.ts
- src/packages/tool-registry/src/tools/SendMessageTool/__tests__/ (test nuevo del ramal uds:)
- src/packages/local-observability/src/uds/__tests__/udsClient.test.ts

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- bun test src/uds/__tests__/udsClient.test.ts (desde src/packages/local-observability): 21 pass, 0 fail, 41 expect
- bun test __tests__/udsInboxKeys.test.ts: 37 pass, 0 fail, 66 expect
- bun test src/uds/__tests__/udsLiveSessionRegistry.test.ts: 19 pass, 0 fail, 27 expect
- por escribir: caso en udsClient.test.ts que publique una clave con publishInboxKey y verifique que la primera línea recibida por el servidor es el marco de auth (authFrameLine); caso de SendMessageTool con to:'uds:<sock>' que llegue a sendToUdsSocket

## Dependencias

- TASK-THYROX-0600 (herramienta ListAgents/ListPeers: chunk-8xzbdmg9 + chunk-mk0qbzxv + compuerta Ws) — cubre la pieza de descubrimiento que a esta tarea le falta
- TASK-THYROX-0489 (chunk-qcy58j4w.js completo) — su cabecera en udsClient.ts declara el porte de los 41 exports; el veredicto de 0489 confirma o no que el cliente está entero
