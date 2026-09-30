# App-host / REPL — registrar la sesión de `bin/cli` al arrancar (TASK-THYROX-0503)

Trabajas en un worktree de thyrox. Identificadores en inglés; comentarios y
docstrings en español. No toques `.claude/` ni ningún `package.json` salvo
para añadir un `exports` o una dependencia `@thyrox/*` que el cableado exija.

## El defecto

2.1.283 (`chunk-bdv29443.js`, acción principal) hace, al arrancar la sesión:

```js
HH().restoreSetAsideName=(s,k)=>{sae(s,E,{autoOnly:k==="auto",source:k,yieldToLaterRestore:!0})},
(OA()?Promise.resolve(!1):KNt(E)).then((s)=>{ if(!s)return; let k=Y();
  Gkr({sessionNameArg:Xt, ...}); xut(E).then((T)=>{ if(T>=2) i("tengu_concurrent_sessions",{num_sessions:T}) }) })
```

En thyrox las piezas están portadas y tienen **cero llamadores de producción**:

- `registerAtLaunch(deps)` — `src/packages/local-observability/src/uds/launchRegistration.ts`
  (compone restoreSetAsideName, OA, KNt, Gkr y xut en el orden de la referencia).
- `startSessionRegistration(storage, deps)` / `processRegistrationDeps(parts)` —
  `src/packages/local-observability/src/uds/sessionRegistration.ts`. Con
  `storage === undefined` escribe `<config home>/sessions/<pid>.json` y lo
  retira en `process.on('exit')`. El config home sale de `THYROX_CONFIG_DIR`.

Así que ninguna sesión de `bin/cli` publica su registro: otra sesión no la ve.

## El papel que esto cumple (App-host)

App-host es el runtime de UNA sesión (REPL o headless). Es quien publica y
mantiene su entrada en el registro de sesiones; lo durable vive fuera
(`sessions/<pid>.json`). REPL (`--chat`) y headless (`-p`) comparten este
arranque: sólo cambia la entrada.

## Qué hacer

1. Crea UN módulo de arranque compartido (sugerencia:
   `src/packages/app-host/src/runtime/sessionRegistryAtLaunch.ts`, o donde el
   grafo de paquetes lo permita sin ciclos — compruébalo) que construya las
   dependencias REALES de `registerAtLaunch` a partir de las ya portadas
   (`processRegistrationDeps`, `startSessionRegistration`, el nombre derivado
   `xs`, `runStartupNaming`/`Gkr`, `restoreSessionName`/`sae`,
   `writeRegisteredName`/`eF`, `countLiveSessions`/`xut`, `onSessionSwitch`,
   `onOriginalCwdChange`, `registerCleanup`). Busca cada una con `rg` en
   `src/packages/local-observability/src/uds/` y en `@thyrox/app-host`
   antes de escribir nada; no inventes nombres. Si una pieza no existe,
   declara la divergencia en el docstring con su razón.
2. Llámalo al arrancar en los DOS caminos de `bin/cli`:
   `src/packages/cli/src/entry/runLoop.ts` (`runLoop`) y
   `src/packages/cli/src/entry/print.ts` (`runPrint`). `--name <nombre>`
   (si la CLI lo admite; si no, `THYROX_CODE_SESSION_NAME`) llega como
   `sessionNameArg`.
3. Identidad de la sesión: el registro publica `getSessionId()` de
   `@thyrox/app-host/bootstrap/state.js`, pero el bucle
   (`@thyrox/agent/loop`, `session.ts:38`) usa `opts.resume ?? randomUUID()`.
   Resuelve la divergencia de forma que el `sessionId` del registro sea el
   del transcript: o pasando el id de app-host al bucle como sesión nueva,
   o llamando `switchSession(id, <motivo>)` al recibir el evento
   `session_start` (con `'resume'` si hubo `--resume`). Elige una, justifícala
   en un comentario, y que la prueba la mida.
4. Prueba de extremo a extremo (TDD, rojo primero), en
   `src/packages/cli/__tests__/` o `tests/cli/`: lanza un proceso REAL de
   `bin/cli` con `--provider recorded --grabacion <json>` (mira
   `runLoop.ts` líneas 55-65 y las pruebas existentes para el formato) y
   `THYROX_CONFIG_DIR=<temporal>`, con `--chat` alimentado por un stdin que
   el test controla. Mientras el proceso vive, `sessions/<pid>.json` existe
   y su `sessionId` es el del `session_start`/transcript; al cerrar stdin y
   salir el proceso, el archivo ya no está. Otro caso igual con `-p`.
   No uses la credencial del anfitrión ni la red.
5. Control de anulación: retira temporalmente la llamada en `runLoop` y
   comprueba que caen EXACTAMENTE sus aserciones (no las de `-p`); igual al
   revés. Restaura.
6. Corre tus pruebas nuevas y las de
   `src/packages/local-observability/__tests__/udsLaunchRegistration.test.ts`,
   `udsSessionRegistration*` y `src/packages/cli/__tests__/cliEntry.test.ts`.

Reporta al final: archivos tocados, rojo inicial, anulación y verde final.
