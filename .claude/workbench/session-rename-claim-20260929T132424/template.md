# App-host / REPL — `/rename` y `claim_session` sobre el registro (TASK-THYROX-0505)

Trabajas en un worktree de thyrox. Identificadores en inglés; comentarios y
docstrings en español. No toques `.claude/` ni `_references/`, ni ningún
`package.json` salvo para añadir un `exports` que el cableado exija.

## Estado de partida (medido)

- Desde TASK-THYROX-0503/0504 (`thyrox@7ae1b1db`, `thyrox@6a4eb13e`) cada
  sesión de `bin/cli` se registra al arrancar (`sessions/<pid>.json`), con
  nombre derivado o `--name`, y el barrido corre tras el alta. El módulo es
  `src/packages/app-host/src/runtime/sessionRegistryAtLaunch.ts`.
- Portados en `src/packages/local-observability/src/uds/`: los flujos de
  renombre (`sessionRename.ts`: `tPt`, `Gkr`, `Vtn`, `VFn`, `sae`, `jkr`),
  el aviso a los correspondientes (`renameNotice.ts`, `zkr`) y el estado de
  nombres (`sessionNameState.ts`). `renameNotice` no lo importa ningún
  módulo de producción; el renombre por el usuario no tiene llamador en
  `bin/cli`.

## Qué hacer

1. **Mide la referencia primero.** En
   `_references/claude-code-bin/2.1.283/bunfs-root/` localiza: el comando
   `/rename` (qué función llama, con qué fuente de nombre, y qué avisa a los
   correspondientes), y qué es `claim_session` (quién lo emite, qué hace con
   el registro: reclamar una sesión de reserva, adoptar un nombre, u otro).
   Cita chunk y fragmento en los docstrings. Si `claim_session` resulta ser
   parte del protocolo de la reserva del daemon (spare pool) y no de
   `bin/cli`, dilo y deja esa mitad declarada con su razón medida.
2. Cablea lo que la referencia haga en el camino de `bin/cli`:
   - en el chat (`src/packages/cli/src/entry/runLoop.ts`), una entrada
     `/rename <nombre>` (junto a `/salir`/`/exit`, que ya existen) que llama
     al flujo portado de renombre sobre el registro de ESTA sesión y al
     aviso a correspondientes; y `/rename` sin argumento con la conducta que
     la referencia tenga (derivar o mostrar el actual).
   - pon la composición de dependencias en `sessionRegistryAtLaunch.ts` (o
     un hermano en `app-host/src/runtime/`) para que el REPL y otros
     llamadores la compartan.
3. Pruebas (TDD, rojo primero), extremo a extremo con proceso REAL de
   `bin/cli --chat` y `--provider recorded`, `THYROX_CONFIG_DIR` temporal
   (copia la forma de `src/packages/cli/__tests__/sessionRegistryAtLaunch.e2e.test.ts`):
   `/rename foo` deja `name: "foo"` (y la fuente que la referencia use) en
   `sessions/<pid>.json`; un nombre inválido o en colisión se comporta como
   la referencia (medido, no supuesto).
4. Control de anulación: retira la rama `/rename` del chat → caen
   exactamente sus aserciones.
5. Corre tus pruebas y las de `src/packages/local-observability/__tests__/`
   (`uds*`) y `src/packages/cli/__tests__/sessionRegistryAtLaunch.e2e.test.ts`.

Reporta: qué midió la referencia (chunk y fragmento) para `/rename` y para
`claim_session`, archivos tocados, rojo inicial, anulación y verde final.
