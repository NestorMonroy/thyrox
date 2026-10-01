# #189 — errores y acciones en una base local (primera versión, SQLite)

Lo que Sentry recibía pasa a `local-observability/src/errorStore/`:

- `errors` — cada error: momento, sesión, versión, origen (`log_error` |
  `component_boundary`), nombre, mensaje, pila y contexto JSON (url/status/body
  de un error HTTP; nombre y pila de componentes de un límite del REPL).
- `error_actions` — las 20 acciones previas (`logEvent`), el equivalente de
  los breadcrumbs (`maxBreadcrumbs: 20`).
- Redacta `authorization`, `x-api-key`, `cookie`, `set-cookie` a cualquier
  profundidad, como el `beforeSend` de Sentry.
- Hogar: `<config>/observability/errors.sqlite3`, o `THYROX_OBSERVABILITY_DATA_DIR`.
  Se abre al primer error; sólo el arranque habilita el registro.

Evidencia: `red.txt`/`wiring-red.txt` (rojo), `green.txt` 16/16,
`boundary.txt` 1/1, `package-suite.txt` 251/0, `typecheck.txt` (local-observability
y repl limpios; app-host conserva 2 TS2742 y 2 TS2554 ajenos), `env-contract.txt`
0 sin declarar. Anulaciones: sin `recordError` en `logError` caen 2 de 3; sin
`recordAction` en `logEvent` cae 1; sin registro en el límite cae 1.

Esta versión ata el store a `bun:sqlite`. La siguiente lo lleva a un puerto
asíncrono sobre `Bun.SQL`, para admitir PostgreSQL (+pgvector).
