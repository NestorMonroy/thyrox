# App-host — el buzón de la sesión al arrancar `bin/cli`, retomado (TASK-THYROX-0450)

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo y firmas en inglés;
comentarios en español técnico, sin coloquialismos, con los términos técnicos en inglés. No
toques `_references/` ni `agent-results/`. Operaciones de archivo por Bash.

## Reglas de este ítem, sin excepción

- **Prohibido `git stash`** en cualquier forma. El intento anterior guardó todo su trabajo con
  `git stash push -u` para medir una línea base y el pool recogió un parche vacío.
- **Nada en segundo plano, y nunca termines el turno para esperar algo.** Corres sin sesión
  interactiva: si cierras el turno, el ítem termina. Corre las pruebas en primer plano y acota
  cada comando con `timeout`. Para comparar contra la base usa `git diff` o
  `git show HEAD:<ruta>`; no vacíes el árbol.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

## Punto de partida: el trabajo del intento anterior ya existe

Está guardado en dos parches que se aplican limpios sobre este HEAD:

    git apply /home/user/thyrox/.claude/workbench/session-inbox-at-launch-20260929T134728/outputs/recovered-tracked.patch
    git apply /home/user/thyrox/.claude/workbench/session-inbox-at-launch-20260929T134728/outputs/recovered-untracked.patch

Aplícalos primero. Traen `udsMessaging.ts` con `getUdsMessagingSocketPath` y `setOnEnqueue`,
`app-host/src/runtime/messagingInboxAtLaunch.ts`, el cableado en `runLoop.ts` y `print.ts`, el
export en `app-host/package.json` y cinco pruebas. No supongas que están completos ni correctos:
el intento se cortó mientras medía su base. Léelos, compáralos con el contrato de abajo y corrige
lo que falte.

## Defecto de aislamiento que tumba el verify: arréglalo

`src/packages/agent/__tests__/resetTaskList.test.ts` fija `process.env.THYROX_CONFIG_DIR` a un
directorio dentro de `.claude/cache` del repositorio y en `afterAll` lo borra, pero no restaura
la variable. Bun corre varios archivos en un mismo proceso: las pruebas siguientes (las e2e del
registro de sesiones) escriben `sessions/<pid>.json` ahí y recrean el directorio, y el verify
rechaza el ítem porque toca `.claude/`. Corrígelo: el directorio va bajo `os.tmpdir()` y
`afterAll` restaura el valor previo de la variable. Comprueba después que
`git status --porcelain` no lista nada bajo `.claude/` tras correr las pruebas del verify.

## Contrato (el mismo del intento anterior)

## Papel (decisión del ejecutor)

App-host es el runtime de UNA sesión. Arranca y usa el Session Inbox; lo
durable (`sessions/<pid>.json`, `sessions/*.key`) vive fuera. REPL y
headless comparten App-host; sólo cambia la entrada.

## Estado de partida (medido)

1. `src/packages/local-observability/src/uds/udsMessaging.ts` sólo exporta
   `getDefaultUdsSocketPath` y `startUdsMessaging`, pero tiene dos
   consumidores que importan funciones que NO existen:
   - `src/packages/agent/messages/systemInit.ts:91` →
     `getUdsMessagingSocketPath()`;
   - `src/packages/cli/src/headless/sdk/session/run-streaming.ts:2066` →
     `setOnEnqueue(cb)`.
   Ambos detrás de `feature('UDS_INBOX')`, así que hoy fallarían en cuanto
   la bandera se active.
2. El arranque del buzón vive en `src/packages/cli/src/setup/setup.ts:88-103`
   (el `setup` portado del REPL), pero `bin/cli` (`src/packages/cli/src/entry/runLoop.ts`
   y `print.ts`) no pasa por `setup.ts`: registra la sesión con
   `registerSessionAtLaunch`
   (`src/packages/app-host/src/runtime/sessionRegistryAtLaunch.ts`) y nunca
   levanta el buzón. `startMessagingInbox` (`inboxServer.ts`, `mn`) y la
   publicación de la ruta en el pid file (`publishMessagingSocketPath`,
   `pidFileRecord.ts`) están portados.

## Qué hacer

1. **Mide la referencia** (`_references/claude-code-bin/2.1.283/bunfs-root/`):
   qué exporta el módulo equivalente de `udsMessaging` (el getter de la ruta,
   el `setOnEnqueue`/oyente de encolado, y cualquier otro que usen los
   consumidores), el orden exacto en el arranque (el socket se liga y
   `THYROX_CODE_MESSAGING_SOCKET` — en la referencia su nombre `CLAUDE_*` —
   se exporta ANTES de los hooks de SessionStart), qué pasa en `--bare` y
   con `--messaging-socket-path`, y cuándo se publica la ruta en el pid
   file. Cita chunk y fragmento en los docstrings.
2. Completa `udsMessaging.ts` con lo que la referencia expone y los
   consumidores usan (sin inventar nombres: los consumidores ya dicen cuáles).
3. Arranca el buzón desde el módulo de arranque compartido de `bin/cli`
   (`sessionRegistryAtLaunch.ts` o un hermano en `app-host/src/runtime/`),
   en el orden de la referencia respecto del registro, respetando
   `feature('UDS_INBOX')` como hace `setup.ts`. Si la bandera está apagada
   por defecto en `bin/cli`, la prueba la enciende con el mecanismo que el
   árbol ya use para `feature()` (búscalo; no inventes una variable nueva
   salvo que haga falta, y si la añades lleva prueba y línea en `.env.example`).
   `--messaging-socket-path` debe llegar desde `bin/cli` si la CLI lo admite.
4. Pruebas (TDD, rojo primero):
   - unidad: los dos consumidores (`systemInit`, `setOnEnqueue`) resuelven
     sus funciones;
   - extremo a extremo, proceso REAL `bin/cli --chat` con
     `--provider recorded` y `THYROX_CONFIG_DIR` temporal (forma de
     `src/packages/cli/__tests__/sessionRegistryAtLaunch.e2e.test.ts`):
     mientras vive, el socket existe (modo 0600 en directorio 0700) y
     `sessions/<pid>.json` publica `messagingSocketPath` con esa ruta; al
     salir, el socket ya no existe.
5. Control de anulación: retira el arranque del buzón → caen exactamente
   las aserciones del socket; retira un export → cae exactamente su
   consumidor.
6. Corre tus pruebas, `src/packages/local-observability/__tests__/` (`uds*`)
   y las dos e2e existentes de `src/packages/cli/__tests__/`.

Reporta: lo medido en la referencia, archivos tocados, rojo, anulaciones y verde.
