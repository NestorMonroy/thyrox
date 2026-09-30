# pool-lifecycle-messaging

## El encargo

> «porque solo SendMessage|ListAgents, le falta Pool lifecycle» — ejecutor,
> 2026-09-30, tras preguntar si thyrox ya implementa `SendMessage` entre
> sesiones.

## La premisa, si se corrigio al primer comando

La respuesta anterior midió la mensajería entre sesiones interactivas y dejó
fuera al consumidor principal de este árbol: los ítems del pool, que son
sesiones `thyrox -p` sin nadie delante. Medido (`outputs/measure_ties.out`):
**ninguna** de las tres piezas de mensajería llega al pool.

| Pieza | Qué hace | ¿Llega al pool? |
|---|---|---|
| `SendMessage` `uds:`/`bridge:` | mensaje en vivo entre sesiones | no: `UDS_INBOX` apagada en `bin/cli` (0) y el registro de `thyrox -p` no la expone (0) |
| buzón UDS (`local-observability/uds`) | socket por sesión, registro de pares | no: exige las dos sesiones vivas y la bandera |
| `bin/inbox` (`src/peer_mailbox`) | buzón durable, un archivo por destinatario, `post/pending/wait/ack` | no: 0 menciones en `pool_lifecycle.py`, `headless-pool.sh` y `pool_integrate.sh` |

## El costo medido hoy

El pool `disk-admission-pool-20260930T191147` se mató y se relanzó
(`…191601`) porque la especificación cambió a mitad de la ejecución y no había
forma de hacérsela llegar al ítem vivo. Y en la otra dirección, el
orquestador sólo sabe de un ítem cuando el pool entero termina
(`wait-jobs`): una tarea bloqueada «se dice y se pasa a la siguiente» en un
`.json` que nadie lee hasta el final.

## Qué transporte, y por qué el durable

El ítem es una sesión sin interfaz que puede sobrevivir al turno del
orquestador; el orquestador puede no estar vivo cuando el ítem escribe. El
buzón UDS exige a los dos vivos y una bandera apagada. `bin/inbox` es durable,
sólo añade, deduplica por `request_id` y ya separa leer de acusar: es el que
encaja. El ítem sólo tiene `Bash`, y con eso le basta para `bin/inbox`.

## Lo que se construye (TASK-THYROX-0672)

1. Cada ejecución del pool tiene su buzón en su runtime; el pool lo exporta a
   cada ítem (`THYROX_MAILBOX_DIR`) junto con su identidad (`item-<n>`).
2. `pool_lifecycle` deja un sobre al destinatario `orchestrator` en cada
   cambio de ciclo de vida: alta, transición, `claim`, publicación y cierre de
   la ejecución, con `request_id` estable para que un reintento no duplique.
3. El orquestador escribe a un ítem vivo (`bin/inbox post --to item-<n>`), y
   el ítem lee sus pendientes entre pasos y los acusa: la corrección en vuelo.
4. El ítem puede escribir al orquestador una pregunta o un bloqueo, en vez de
   dejarlo sólo en su salida final.

*Metrica:* conteos de `rg` sobre los archivos del pool, el registro de
`thyrox -p` y `bin/cli`, y las variables que el pool exporta al ítem.
*Ciega a:* si un ítem LEERÍA los mensajes a tiempo: eso depende de la
instrucción que reciba y de su disciplina entre pasos, y sólo lo mide una
corrida real con un mensaje enviado a mitad.

## Segunda pregunta: ¿`SendMessage` entre sesiones está hecho?

> «Yes, partly [...] off by default and the model in thyrox -p can't call it.
> ? analizalo bien e implementalo si hace falta» — ejecutor.

Medido contra la referencia 2.1.285 (`_references/claude-code-bin/2.1.285`,
con `bin/binary literal|references` y `rg` sobre `claude_strings.txt`):

| Pregunta | Referencia 2.1.285 | thyrox | Veredicto |
|---|---|---|---|
| ¿El buzón UDS está compilado? | sí: `SendMessage` anuncia `uds:<socket>` / `bridge:<session id>` y el registro de sesión lleva `messagingSocketPath` | `feature('UDS_INBOX')` es macro de compilación y `bin/cli` no la pasa (`generate_bin.py`) | **divergencia** |
| ¿Cuándo arranca? | `chunk-0z58d2n7.js`: si no es `--bare`/`CLAUDE_CODE_SIMPLE` (`fo()`, `chunk-v34cw0y6.js`) y `Gs()` = `CLAUDE_CODE_HARBOR_KITE` o el flag `tengu_harbor_kite` con **default `true`** (`chunk-fetypca3.js`); si la compuerta está cerrada, hace *late bind* al abrirse | la misma compuerta en tiempo de ejecución (`THYROX_CODE_HARBOR_KITE`), detrás de la bandera apagada | fiel en la compuerta, apagado por la compilación |
| ¿Excluye `-p`? | no: la condición sólo mira `--bare` y la compuerta | `print.ts` cierra el buzón al salir: el arranque en `-p` está portado | fiel |
| ¿El modelo de `-p` puede llamar `SendMessage`/`ListAgents`? | la misma colección de herramientas que la sesión interactiva | `runLoop.ts:187` arma `CORE_TOOLS` (6: Bash, Read, Write, Edit, Glob, Grep) + tareas + `Agent` + `Skill`; `SendMessage` y `ListAgents` viven en `tool-registry`'s `BuiltInToolsProvider`, que `-p` no usa | **divergencia** |
| ¿Hay prueba de envío y recepción entre dos procesos? | — | la tarea 207 («UDS F6») está `completed` y su descripción promete «dos procesos thyrox se envían un mensaje por el buzón»; esa suite **no existe**: `messagingInboxAtLaunch.e2e.test.ts` prueba que UN proceso publica su buzón, y `test-list-agents-two-cli.sh` (10/10) prueba el descubrimiento, no el envío | **cierre sin su prueba** — hallazgo |

Lo que sí pasa hoy: `udsRoute.test.ts` 2/2 sin la bandera y 5/5 con
`--feature=UDS_INBOX` (un socket real recibe el marco).

## Lo que se construye (TASK-THYROX-0673)

1. `bin/cli` compila con `UDS_INBOX`, como la referencia; la compuerta de
   tiempo de ejecución (`THYROX_CODE_HARBOR_KITE`, `--bare`) sigue decidiendo.
2. El bucle de `-p` expone `SendMessage` y `ListAgents` cuando el buzón está
   activo, cableados en `runLoop.ts` como `Agent` y `Skill`, sobre las
   implementaciones de `tool-registry` (sin duplicarlas).
3. La suite que faltaba: dos `bin/cli` reales; A envía texto a `uds:<socket
   de B>`, B lo recibe en su turno y lo ve el modelo grabado de B.
