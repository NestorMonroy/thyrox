# semantic-schema-name — TASK-THYROX-0914

## El encargo

> «No existe una razón arquitectónica por la que el schema de PostgreSQL
> "deba" llamarse `semantic_search` […] schema name → bounded context /
> data ownership; no: implementation technology, current consumer,
> particular algorithm […] Si todavía no existe un schema público
> establecido que haga costoso cambiarlo: `semantic` sería mi elección. Y
> mantendría `SemanticSearchStore` por ahora como port/API.»

## Search Existing

| Pasada | Medido | Decisión |
|---|---|---|
| Comportamiento | el nombre ya es configuración: `openSemanticSearchStore({ schema: { name } })`, validado por `validateSchemaConfig` (`config.ts:89`); `migrate()` hace `CREATE SCHEMA IF NOT EXISTS ${config.name}` (`store.ts:186`) | REUSE — no hace falta mecanismo nuevo |
| Autoridad | ADR-008 1.0.0 (`inputs/adr-008.rst`, kaupamex-docs `develop`) **no fija** nombre de esquema: las 5 apariciones de `semantic_search` son del worker `semantic_search_worker` (líneas 19, 53, 84, 161, 178), ninguna del namespace; habla de «esquema de embeddings», no del namespace | el nombre sólo lo fija un default de código |
| Consumidores / tests / CLI | `DEFAULT_SEMANTIC_SEARCH_SCHEMA = 'semantic_search'` (`ingestCommand.ts:24`), sobreescribible por `THYROX_SEMANTIC_SEARCH_SCHEMA` (ausente del `.env`); las suites crean esquemas propios por caso; las sondas del banco de reclaim v1 llevan el literal como default (histórico, no se edita) | EXTEND — cambiar el default |
| Evidencia durable | la base viva tiene 1675 documentos y 9981 chunks en `semantic_search`, 0 espacios de embedding (R0 de reclaim v2) | un `ALTER SCHEMA … RENAME` es atómico y conserva datos; tiene que ir junto al cambio de default o la próxima ingesta crea un `semantic` vacío |

## Decisión

- Esquema: **`semantic`** (posee el corpus; no nombra tecnología, consumidor ni algoritmo).
- Port: **`SemanticSearchStore` se conserva**; un rename a `SemanticCorpusStore` exige su propio Search Existing.
- Variables `THYROX_SEMANTIC_SEARCH_*`: configuran el port, se conservan.
- Fuera de alcance, anotado: la tabla `semantic_search_migrations` (`corpusSql.ts:22`) repite el nombre viejo dentro del esquema; renombrarla es otra migración de datos vivos y se decide aparte.

## Bloqueo de rama (no global)

Producto → lo implementa un worker. Un worktree completo cuesta 2 073 MB
versionados; `src`+`tests`+`bin` son 91 MB; libre: 2 334 MB. Ninguna ruta de
worker (`headless-pool --isolation worktree`, `task_continuation`) admite
checkout disperso (0 hits de `sparse` en `src/session`). Se desbloquea con
headroom (P0) o con checkout disperso en la ruta del worker.

## Estado: SEARCH_INCOMPLETE (2026-10-03)

La tabla de arriba buscó el literal `semantic_search`; no es un Search Existing
completo (`.claude/rules/search-existing-antes-de-construir.md`). Antes de que
un worker escriba producto faltan: todos los consumidores SQL del esquema
(`corpusSql.ts`, `spaces.ts`, `analysisRuns.ts`, `vectorSql.ts`, las sondas que
lo nombran), las migraciones y su tabla, la configuración por entorno, las
pruebas, y los ADR y hallazgos del corpus. La corrección de H-THYROX-435 ya
consta: la ruta de pool sí admite checkout disperso.
