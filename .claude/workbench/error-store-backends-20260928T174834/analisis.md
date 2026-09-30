# Base de errores sobre SQLite y PostgreSQL (+pgvector): análisis de referencias

Sentry queda fuera como modelo: ninguna de las dos referencias lo usa. Se
analizan OmniRoute (`/home/user/nestormonroy/omniroute@a58000c7`) y
CLIProxyAPI (`_references/cliproxyapi`), la única de las dos con PostgreSQL.

## OmniRoute

- **Motor.** Sólo SQLite. Cuatro controladores intercambiables detrás de un
  adaptador síncrono (`src/lib/db/adapters/types.ts`: `prepare`, `run` →
  `lastInsertRowid`, `exec`, `pragma`, `transaction`, `backup`), elegidos por
  `driverFactory.ts`. El contrato es SQLite por construcción (`pragma`,
  `checkpoint`, `lastInsertRowid`): no se extiende a PostgreSQL.
- **Dónde vive un error.** No hay tabla de errores. El error es una propiedad
  de la actividad que lo produjo: `call_logs` (`migrations/001_initial_schema.sql`)
  lleva `status`, `error_summary`, y por migraciones posteriores `error_type`
  (clasificado por `open-sse/services/errorClassifier.ts`, guardado con
  `toStoredErrorType` en `src/lib/usage/callLogs.ts:654`), `correlation_id`,
  `session_tag` y `resilience_actions`. Lo mismo `proxy_logs`,
  `middleware_logs`, `request_detail_logs` y los `*_audit_log`.
- **Cuerpos fuera de la fila.** `artifact_relpath`, `artifact_size_bytes`,
  `artifact_sha256`, `detail_state`: el payload va a un archivo aparte.
- **Esquema.** 190 migraciones SQL versionadas, aplicadas por
  `migrationRunner.ts` en transacción y registradas en `_omniroute_migrations`.
- **Retención.** `cleanup.ts` borra `call_logs` más viejos que los días
  configurados; `cleanup/usagePurge.ts` borra también sus artefactos.

## CLIProxyAPI

- **Motor.** Almacenes enchufables: archivo, git, **PostgreSQL** (`pgx/v5`) y
  object store. Se elige por el entorno (`cmd/server/main.go:277`:
  `PGSTORE_DSN`, `PGSTORE_SCHEMA`, `PGSTORE_LOCAL_PATH`).
- **Esquema en PostgreSQL** (`internal/store/postgresstore.go:123-158`):
  `CREATE SCHEMA IF NOT EXISTS` con esquema configurable, tablas idempotentes
  al abrir, `JSONB` para el contenido y `TIMESTAMPTZ` para los tiempos.
- **Errores.** No van a la base: el registro de peticiones y errores escribe
  archivos (`internal/logging/request_logger_*.go`).

## Lo que se adopta, y de quién

| Decisión | Fuente |
|---|---|
| Un contrato asíncrono, una implementación sobre `Bun.SQL` para `sqlite://` y `postgres://` | propia: ninguna referencia tiene un contrato multi-motor; el de OmniRoute es SQLite-only y síncrono |
| El motor se elige por URL en el entorno (`THYROX_OBSERVABILITY_DATABASE_URL`) y el esquema de PostgreSQL es configurable | CLIProxyAPI (`PGSTORE_DSN`, `PGSTORE_SCHEMA`) |
| `JSONB` y `TIMESTAMPTZ` en PostgreSQL; `TEXT` en SQLite | CLIProxyAPI |
| Migraciones versionadas por motor, registradas en una tabla, una transacción cada una | OmniRoute (`migrationRunner.ts`, `_omniroute_migrations`) |
| El error lleva un tipo clasificado (`error_type`) además de nombre y mensaje | OmniRoute (`errorClassifier.ts`, `call_logs.error_type`) |
| Correlación con la sesión (`session_id`) | OmniRoute (`session_tag`, `correlation_id`) |
| Retención por días, que borra el error y sus acciones | OmniRoute (`cleanup.ts`) |
| Las acciones previas en tabla hija | propia: OmniRoute guarda `resilience_actions` como columna; aquí son filas, para poder consultarlas |

## Lo que no se adopta

- **La tabla de errores sigue existiendo.** OmniRoute cuelga el error de la
  actividad porque su actividad es una llamada HTTP con fila propia; los
  errores de thyrox (un `logError`, un componente que falla) no tienen una
  fila de actividad de la que colgar.
- **Cuerpos como artefactos.** Hoy el contexto es pequeño (url, estado,
  mensaje del servidor, pila de componentes); no hay payload que sacar.

## pgvector: sin referencia

Ninguna de las dos lo usa. Queda fuera del contrato común: SQLite no lo
tiene, y el contrato tiene que valer en los dos. Lo que exige antes de
construirlo —declarado, no supuesto—:

1. qué se vectoriza (mensaje + pila del error, para encontrar errores
   parecidos) y con qué modelo de embeddings;
2. la extensión instalada: en este contenedor, PostgreSQL 16 está y
   `postgresql-16-pgvector` no (medido: sin `vector.control` en
   `/usr/share/postgresql/16/extension/`).

## Medido en este contenedor

- Bun 1.3.11: `new SQL('sqlite://:memory:')` crea, inserta con `RETURNING id`
  y abre transacción con `begin`.
- PostgreSQL 16, cluster `16/main` detenido.
