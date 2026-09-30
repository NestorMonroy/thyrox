# Retirar Sentry de thyrox

`local-observability` declara que todo se escribe en local («no external
sinks») y traía Sentry del porte de `ccnmt`: con `SENTRY_DSN` puesto, los
errores salían de la máquina. Se retira por decisión del ejecutor.

Qué recibía Sentry, medido antes de retirarlo:

| Llamada | Quién | Datos |
|---|---|---|
| `captureException` | `error-log-sink.ts::logErrorImpl` (todo `logError`) | el error; de un error HTTP, url/status/cuerpo |
| `captureException` | `SentryErrorBoundary` (REPL) | el error, el nombre del límite y la pila de componentes |
| `setTag`, `setUser` | nadie (0 llamadores) | — |
| breadcrumbs automáticos | la integración por defecto | las últimas 20 acciones (`maxBreadcrumbs: 20`) |

- `red.txt` — `tests/package/no_external_error_sink.test.ts`: `sentry.ts` importa
  `@sentry/node` y `local-observability/package.json` lo declara.
- `green.txt` — 4/4 tras retirarlo; los casos negativos son las líneas reales.
- `lock-sentry-count.txt` — 0 entradas `@sentry` en `bun.lock`.
- `typecheck.txt` — `local-observability` y `repl` limpios; `app-host` conserva
  los 2 TS2742 de `toolRegistryRuntime.ts`, anteriores y ajenos.

`SentryErrorBoundary` pasa a `ErrorBoundary`: conserva su función (retirar el
componente que falla en vez de tumbar el REPL) y registra el error en local.
Lo que Sentry recibía pasa a una base SQLite local — siguiente paso (#189).
