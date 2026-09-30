# App-host — latido, sesión de reserva y barrido del registro en el ciclo de vida (TASK-THYROX-0504)

Trabajas en un worktree de thyrox. Identificadores en inglés; comentarios y
docstrings en español. No toques `.claude/` ni ningún `package.json` salvo
para añadir un `exports` que el cableado exija.

## Estado de partida (medido)

Desde TASK-THYROX-0503 (`thyrox@7ae1b1db`) las dos entradas de `bin/cli`
(`src/packages/cli/src/entry/runLoop.ts` y `print.ts`) registran la sesión al
arrancar con `registerSessionAtLaunch`
(`src/packages/app-host/src/runtime/sessionRegistryAtLaunch.ts`). Lo que
sigue sin llamador de producción, portado en
`src/packages/local-observability/src/uds/`:

- el latido — `touchHeartbeat` / `removeHeartbeat` (`fleetHeartbeat.ts`),
  `ld`, `Ms`, `jNr`, `WNr`, `$y`, `VNt`, `qNt` en 2.1.283
  (`sessionRegistration.ts` y `fleetHeartbeat.ts` citan su chunk);
- la sesión de reserva — `startSpareClaimPoll`, `releaseSpare`, `jy`/`iD`/`sD`
  (`spareSession.ts`, `pidFileRecord.ts`);
- el barrido — `sweepRegistry` / `sweepDeadPidKeys` (`registrySweep.ts`).

## Qué hacer

1. **Mide primero la referencia, no la supongas.** En
   `_references/claude-code-bin/2.1.283/bunfs-root/` localiza DÓNDE y CUÁNDO
   la sesión arranca el latido, lo repite (intervalo), lo retira al salir, y
   cuándo corre el barrido (al arrancar, periódico, o al listar). Cita
   chunk y el fragmento en un comentario del módulo. No escribas en
   `_references`.
2. Cablea en el MISMO módulo de arranque
   (`sessionRegistryAtLaunch.ts`), para que REPL y `-p` lo hereden sin
   tocar sus entradas otra vez: el latido tras un registro exitoso, con su
   intervalo real de la referencia y `unref()` para no retener el proceso;
   su retiro en la limpieza de salida; y el barrido donde la referencia lo
   corra. La reserva (`spare`) sólo si la referencia la arranca en este
   camino; si no, déjalo declarado en el docstring con la razón.
3. Pruebas (TDD, rojo primero), en
   `src/packages/cli/__tests__/sessionRegistryAtLaunch.e2e.test.ts` (existe;
   añade casos) o en un archivo hermano, con `THYROX_CONFIG_DIR` temporal:
   - una sesión `--chat` viva deja su archivo de latido y lo refresca (su
     mtime avanza) si el intervalo es corto — declara una variable
     `THYROX_*` para acortarlo en pruebas SOLO si la referencia tiene un
     equivalente; si la añades, pruébala y declárala en `.env.example`;
   - al salir, el latido desaparece;
   - un registro `sessions/<pid>.json` de un pid muerto sembrado antes de
     arrancar desaparece tras el barrido.
4. Control de anulación: retira el arranque del latido → caen exactamente
   sus aserciones; retira el barrido → cae exactamente la del pid muerto.
5. Corre tus pruebas y
   `src/packages/local-observability/__tests__/` (las de `uds*`).

Reporta: qué midió la referencia (chunk y fragmento), archivos tocados, rojo
inicial, anulaciones y verde final.
