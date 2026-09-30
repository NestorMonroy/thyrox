# TASK-THYROX-0673 — Make cross-session SendMessage work from thyrox -p, with its two-process test

Análisis y medición contra la referencia 2.1.285: `README.md` de este banco,
sección «Segunda pregunta». Hallazgo H-THYROX-292 (kaupamex-docs,
`source/gestion/pm/thyrox/iniciativas/construir-harness-propio/hallazgos/`).

## Qué se pide (TDD), en este orden

1. **`bin/cli` compila el buzón UDS, como la referencia.** `bin/cli` lo genera
   `src/session/generate_bin.py` (no se edita a mano): el lanzador de `cli`
   pasa `--feature=UDS_INBOX` a `bun`, declarado como una constante con nombre
   (la lista de banderas de la compilación de entrega, con su cita a la
   referencia en un comentario). Regenera `bin/cli` con el generador y
   comprueba `python3 src/session/generate_bin.py --check`. La compuerta de
   tiempo de ejecución no cambia: `THYROX_CODE_HARBOR_KITE` y `--bare`
   siguen decidiendo si el buzón arranca.
2. **El modelo de `-p` ve `SendMessage` y `ListAgents` cuando el buzón está
   activo.** `src/packages/cli/src/entry/runLoop.ts` arma las herramientas en
   `allTools` (línea ~187): añade allí, como ya se hace con `Agent` y `Skill`,
   dos adaptadores en un módulo nuevo `src/packages/cli/src/entry/peerMessagingTools.ts`
   sobre las implementaciones existentes de `@thyrox/tool-registry`
   (`SendMessageTool` para `uds:`/`bridge:` y `listAllPeers`/`ListAgentsTool`).
   No reimplementes el envío: reutiliza `sendToUdsSocket` y `parseAddress`.
   Sólo se añaden si el buzón de esta sesión arrancó (hay
   `THYROX_CODE_MESSAGING_SOCKET`); si no, `allTools` queda igual que hoy.
   Sólo texto plano entre sesiones, como la referencia.
3. **La suite que faltaba:** `tests/session/test-send-message-two-cli.sh`,
   en la forma de `tests/session/test-list-agents-two-cli.sh` (léela
   completa: dos `bin/cli` reales con `--provider recorded`, homes aislados).
   A envía texto a `uds:<socket de B>` por la herramienta `SendMessage`, y
   se comprueba que B lo recibe (el mensaje entra a su cola de entrada y
   aparece en el turno de B). Control positivo y de anulación: sin el
   adaptador en `runLoop.ts`, cae exactamente la aserción de envío.

Si la recepción en `-p` no entrega el mensaje al turno de B (por ejemplo,
porque `print.ts` no drena la cola del buzón), eso se mide, se dice con la
causa y se porta desde la referencia; no se declara hecho sin la recepción.
