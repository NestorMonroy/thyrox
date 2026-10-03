# p4-repl-runtime-ports

## [5] TASK-THYROX-0273 — Resolver el resto de exportaciones ausentes en TypeScript

Status on board: in_progress

diff.ts, messages.ts, tokenEstimation.ts, config getOrCreateUserID, settings hasSkipDangerousModePermissionPrompt, filesystem normalizePatternsToPath, swarm startInProcessTeammate, módulos faltantes. Iterar hasta 0 fallos.

## [21] TASK-THYROX-0284 — Migrar el manejo de stream del REPL al contrato de 2.1.281

Status on board: pending

En 2.1.281 `bcr` (≙handleMessageFromStream, chunk-4n4g22z6.js) recibe (evento, opciones, contexto): solo procesa eventos de stream (los mensajes completos los despacha quien llama), StreamingToolUse ya no lleva unparsedToolInput (el JSON parcial va a L0 authoring progress: onToolUseStart/onInputJsonDelta/onToolUseStop), las métricas son eventos tipados (start, thinking_progress, thinking_signature, end), `response_length` es tipo propio, hay displayTransform (begin/delta/finalize), tope de tool uses (X4o) y de texto (c8t). Los 9 consumidores de thyrox (REPLView, useRemoteSession, execAgentHook, Messages) usan el contrato posicional de ccnmt v2.1.88.

## [27] TASK-THYROX-0252 — Portar getAttachments de attachments.ts, partido por productor

Status on board: in_progress

Faltan getAttachments y 30 de sus 33 productores (fuente: kaupamex-docs .claude/eventos/recibir-nestor-monroy-tools-*/…/packages/agent/attachments.ts, 3824 líneas). Un único ítem de pool agotó 31 turnos (paso 130). Partir en un ítem por productor con anclas propias en attachments.ts para que las ediciones no choquen; más Attachment (497-792) y getQueuedCommandAttachments (1127-1165). Cierra 4 errores de la ruta de módulos.

## [53] TASK-THYROX-0309 — Reemplazar cada sustituto por la implementación original, paquete por paquete

Status on board: in_progress

Un sustituto es una copia local, en internal/pendingCrossPackageDeps.ts de un paquete, de un símbolo que otro paquete @thyrox ya implementa. Donde importar el original no cierra un ciclo de módulos, la copia sobra: se importa el original y se borra la copia. Antes de importar, el original se contrasta con la fuente (binario de referencia) y se corrige si diverge; si el original tiene prueba de fidelidad se reutiliza, si no se escribe. Lo que cerraría un ciclo se queda como sustituto declarado. Ratchet: tests/verify/test_stand_ins_cleared.py (CLEARED). Pendientes: daemon, memory, ide, provider, local-observability, bridge.

## [67] TASK-THYROX-0319 — Reemplazar «Claude» por thyrox en repl/src y en todo thyrox (TDD)

Status on board: in_progress

Censo de ocurrencias por clase (producto visible, identificador, comentario, legítimo: model id / API / ruta ~/.claude del cliente ajeno). Corregir, no borrar. Gate que impida reintroducirlo. Binario con bin/binary.

## [223] TASK-THYROX-0474 — MOD — runtime de módulos con manejadores $ de 2.1.283 (chunk-7g2tbnrf.js, chunk-cnp2ghvr.js, chunk-ss489drq.js): Ml, EH, cB, E5, Z9e, yre, Vp, Xot, dt().loadedModules

Status on board: pending

Unos 215 KB y ~30 señales (tool.call, prompt.submit, session.receive, turn.start…). Primero medir y partir en fases MOD-1..n: registro de módulos cargados y matchers, sitios y núcleos, cadena EH con presupuesto y corte, constructores de evento, telemetría. session.receive (F4c-2d) ya consume su interfaz HookSite.

## [359] TASK-THYROX-0636 — Swarm panes run the placeholder command like 2.1.283

Status on board: pending

TmuxBackend creates the swarm session/window without `-- cat`; 2.1.283 (chunk-rc3494v9.js Vjo, chunk-rggb24sh.js ue) passes vFe after `--` in new-session/new-window, with useCwd and toolCgroupClass:"agent" on session creation. Wire SWARM_PANE_PLACEHOLDER_COMMAND into TmuxBackend with TDD.
