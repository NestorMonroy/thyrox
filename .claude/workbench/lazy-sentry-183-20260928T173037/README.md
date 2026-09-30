# #183 — cerrar Sentry al apagar sin cargar Sentry

`gracefulShutdown` importaba `closeSentry` de `sentry.ts`, y con él
`@sentry/node`, en todo arranque aunque `SENTRY_DSN` no esté. El cierre vive
ahora en `local-observability/src/sentryShutdown.ts`, sin dependencias;
`initSentry` le registra su cierre.

- `red.txt` — el módulo no existía.
- `green.txt` — 4/4: importar el cierre no carga `@sentry/node`, sin registro
  no hace nada, el cierre registrado recibe el plazo, y un fallo no rompe.
- Anulación: con `import '@sentry/node'` en `sentryShutdown.ts` cae
  exactamente el primer caso (3 pass, 1 fail).
- `emit.txt` — declaraciones de `local-observability` regeneradas, 0 errores.
- `typecheck.txt` — 2 errores TS2742 en `app-host/src/runtime/toolRegistryRuntime.ts`,
  archivo que este cambio no toca (tipo inferido desde `tool-registry/dist`).

Pendiente de decisión del ejecutor: si Sentry pertenece a thyrox. El README de
`local-observability` dice «no external sinks», y Sentry es uno.
