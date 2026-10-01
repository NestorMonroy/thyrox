# Fuente de verdad — TASK-THYROX-0682, corrección de identidad

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-008-semantic-search-store-sobre-postgresql-y-pgvector.rst`
v1.5.0 (commits `851eeeea2`, `c28ac269c`). Parte de lo integrado en
`d86c0cd9a` (implementación intermedia): léelo completo — `corpus.ts`,
`corpusSql.ts`, `analysisRuns.ts`, `spaces.ts`, `store.ts` y sus pruebas.

## Qué está mal hoy, medido

`documents` es `UNIQUE (scope, source_identity)`, y `source_identity` se
describe como `repo@commit:ruta`: la identidad lleva una ruta, y dos clones
del mismo documento serían dos documentos. `ingestDocument` decide
`unchanged` por `scope` + `sourceIdentity` + hash.

## El contrato

1. **Identidad** = `domain` + `scope` + `domain_id`, única. `scope` es la
   cadena vacía para dominios cuyos ids son únicos en todo el dominio
   (findings: `H-<PREFIJO>-NNN`). **Versión** = hash del contenido canónico.
   `source_ref` y `source_revision` son procedencia: se guardan, no deciden
   nada.
2. **Migración v3** del ledger de `@thyrox/store` (v2 ya está commiteada: no
   se reescribe): añade `domain`, `domain_id`, `source_ref`,
   `source_revision`; la unicidad pasa a la identidad de dominio; las filas
   escritas con la identidad vieja quedan marcadas como **sin mapear** hasta
   reconciliarlas.
3. **Reconciliación de lo viejo**: `reconcileLegacyIdentities(resolve)`, donde
   `resolve(scope, sourceIdentity)` devuelve `{ domain, scope, domainId }` o
   `null`. Lo que no se mapea sigue sin mapear, se cuenta y nunca cuenta como
   ingerido. Si varios documentos viejos mapean a la misma identidad,
   convergen en uno: versiones distintas por hash quedan como versiones de ese
   documento, en orden de `ingested_at`, y las iguales por hash colapsan en una.
   Los `chunk_id` no cambian, así que ningún `analysis_candidates` pierde su
   chunk; si cambian números de versión, `analysis_runs.corpus_versions` se
   actualiza en la misma transacción.
4. **API**: `ingestDocument({ domain, scope?, domainId, sourceRef,
   sourceRevision, metadata, chunks })`. `unchanged` = misma identidad y mismo
   hash, aunque cambien `sourceRef` o `sourceRevision` (se actualiza la
   procedencia, sin versión nueva). Consultas que 0684 necesitará:
   `findDocument({ domain, scope, domainId })` con su versión y hash vigentes.
   La búsqueda devuelve `domain`, `domainId`, `sourceRef`, `sourceRevision`.

## Pruebas obligatorias, contra PostgreSQL real

| # | Caso | Esperado |
|---|---|---|
| 1 | mismo `domain_id` y mismo contenido desde dos rutas de clon | un documento, una versión |
| 2 | mismo `domain_id`, contenido cambiado | un documento, dos versiones |
| 3 | distinto `domain_id`, contenido idéntico | dos documentos |
| 4 | cambia `source_ref` | la identidad no cambia |
| 5 | cambia `source_revision` sin cambiar el contenido | sin versión nueva |
| 6 | filas escritas con la identidad vieja (migración v2 → v3 sobre datos reales de v2) | convergen a la identidad de dominio; ningún `analysis_run` citado queda colgado: el texto de sus candidatos es idéntico antes y después |
| 7 | fila vieja que el resolver no mapea | queda sin mapear y `findDocument` no la devuelve como ingerida |
| 8 | mismo `domain_id` en dos scopes de un dominio con scope | dos documentos |

Controles de anulación: sin `domain_id` en la unicidad caen 1 y 3; sin
comparar el hash en `unchanged` cae 5; sin actualizar `corpus_versions` en la
convergencia cae 6. Dilo con números. Las 46 pruebas actuales siguen en verde,
adaptadas a la API nueva.
