# TASK-THYROX-0284

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p4-repl-runtime-ports.md`

## La tarea

## [21] TASK-THYROX-0284 — Migrar el manejo de stream del REPL al contrato de 2.1.281

Status on board: pending

En 2.1.281 `bcr` (≙handleMessageFromStream, chunk-4n4g22z6.js) recibe (evento, opciones, contexto): solo procesa eventos de stream (los mensajes completos los despacha quien llama), StreamingToolUse ya no lleva unparsedToolInput (el JSON parcial va a L0 authoring progress: onToolUseStart/onInputJsonDelta/onToolUseStop), las métricas son eventos tipados (start, thinking_progress, thinking_signature, end), `response_length` es tipo propio, hay displayTransform (begin/delta/finalize), tope de tool uses (X4o) y de texto (c8t). Los 9 consumidores de thyrox (REPLView, useRemoteSession, execAgentHook, Messages) usan el contrato posicional de ccnmt v2.1.88.

## Estado medido por el censo: pendiente

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- handleMessageFromStream sigue con el contrato posicional de ccnmt v2.1.88 (item, onMessage, onUpdateLength, onSetStreamMode, onStreamingToolUses, onTombstone?, onStreamingThinking?, onApiMetrics?, onStreamingText?): src/packages/agent/messages.ts:2297-2308 — sed -n 2297,2308p src/packages/agent/messages.ts
- Su docstring declara la migración como tarea aparte («En 2.1.281 la funcion (bcr) solo recibe eventos de stream y trae su propio contrato; la migracion es una tarea aparte»): src/packages/agent/messages.ts:2290-2295 — sed -n 2286,2296p
- Sigue despachando mensajes completos dentro del handler (deliverMessage): src/packages/agent/messages.ts:2321,2325 — sed -n 2300,2345p
- StreamingToolUse aún lleva unparsedToolInput y el handler lo acumula: src/packages/agent/messages.ts:2233-2237,2385,2403 — git grep -c unparsedToolInput -- src → messages.ts:3 (único archivo)
- onApiMetrics sigue siendo { ttftMs } sin eventos tipados; message_start es el único disparo: src/packages/agent/messages.ts:2273,2349 — git grep -n 'thinking_progress\|thinking_signature\|response_length\|displayTransform\|onInputJsonDelta\|onToolUseStart\|onToolUseStop' -- src → 0 hits fuera de provider (rejectionKind/errors, otro concepto)
- Sin tope de tool uses ni de texto: git grep -n 'length>=\|MAX_STREAMING' -- src/packages/agent/messages.ts → 0 hits en el handler; applyContentDelta concatena sin cota (messages.ts:2396-2406)
- Consumidores en contrato posicional: REPLView.tsx:2674, useRemoteSession.ts:319, execAgentHook.ts:198 — git grep -n 'handleMessageFromStream(' -- src; Messages.tsx:45,262 y REPLView.tsx:269,818 consumen el tipo StreamingToolUse con unparsedToolInput
- Commit que trajo el handler actual: 52cddcd00 «Port the stream handler and real stream message shapes» — git log --oneline -S'handleMessageFromStream' -- src/packages/agent/messages.ts; ningún commit posterior toca el contrato (git log --oneline -5 -- messages.ts: sólo renombres/comentarios)
- Sin suite propia: git grep -ln 'handleMessageFromStream\|StreamingToolUse' -- 'src/**/__tests__/**' '*.test.ts' '*.test.tsx' tests → 0 archivos
- Referencia 2.1.283 localizada: función hwr(e,n,r) en _references/claude-code-bin/2.1.283/bunfs-root/chunk-csayct82.js:3563, con onResponseLength, onCompactEvent, displayTransform.begin/delta/finalize, authoringProgressSurface → onToolUseStart/onInputJsonDelta, métricas {type:'start'|'content_block_start'|'thinking_progress'|'thinking_signature'}, topes qnr (JSON del bloque), znr (tool uses), I3t (texto) — sed -n 3563p | grep -o 'function [A-Za-z0-9_$]*(e,n,[a-z]*){let{onMessage…'

## Lo que falta — tu alcance

- Reescribir handleMessageFromStream a (event, options, context): sólo stream_request_start, response_length, compact event y stream_event; sacar deliverMessage al llamador (REPLView, useRemoteSession, execAgentHook)
- Quitar unparsedToolInput de StreamingToolUse; reemplazar por índice+contentBlock con sustitución por índice (Array.with) y tope de tool uses (znr) y de tamaño del bloque (qnr)
- Añadir el tipo de evento response_length y el callback onResponseLength, más onCompactEvent
- Tipar onApiMetrics como unión: start {ttftMs, messageId}, content_block_start, thinking_progress {estimatedTokensDelta}, thinking_signature {chars}, con el estimador de tokens (gwr) y el redondeo (kZt)
- Añadir displayTransform {begin(messageId), delta(text), finalize(), entryLanded(e)} y llamarlo en message_start / text_delta / message_stop
- Añadir la superficie L0 authoring progress (onToolUseStart/onInputJsonDelta/onToolUseStop, resetAuthoringProgress) bajo authoringProgressSurface
- Tope de texto en onStreamingText (I3t): recortar el delta al llegar al tope en vez de concatenar sin límite
- onUpdateLength pasa a recibir una longitud numérica, no la cadena; ajustar setResponseLength en execAgentHook y tokens.ts
- Migrar los 4 sitios de llamada al objeto de opciones y ajustar Messages.tsx/REPLView.tsx al StreamingToolUse sin unparsedToolInput
- Escribir la suite del handler (hoy inexistente) con control de anulación por pieza

## Archivos que te pertenecen

- src/packages/agent/messages.ts
- src/packages/agent/hooks/execAgentHook.ts
- src/packages/agent/tokens.ts
- src/packages/repl/src/screens/REPLView.tsx
- src/packages/repl/src/hooks/useRemoteSession.ts
- src/packages/repl/src/components/Messages.tsx
- src/packages/agent/__tests__/handleMessageFromStream.test.ts (nuevo)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- Ninguna suite existente nombra handleMessageFromStream ni StreamingToolUse (git grep sobre __tests__/*.test.ts* y tests/ → 0); no se corrió nada
- A escribir: src/packages/agent/__tests__/handleMessageFromStream.test.ts — un caso por evento (stream_request_start, response_length, message_start con métricas, content_block_start tool_use con tope znr y qnr, text_delta con tope I3t y displayTransform.delta, input_json_delta → onInputJsonDelta, thinking_delta → thinking_progress, signature_delta → thinking_signature, message_stop → finalize) y que un mensaje completo NO se entrega desde el handler

## Dependencias

- (ninguno)
