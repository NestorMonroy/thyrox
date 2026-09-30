# Fuente de verdad — TASK-THYROX-0682: corpus semántico durable

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-008-semantic-search-store-sobre-postgresql-y-pgvector.rst`
v1.2.0, sección «Corpus durable» (commits `1227f675e` y `dd08ac1f3`, aprobada por el ejecutor). Léela completa antes de
escribir.

## Lo que existe (P0 de esta tarea, medido)

`src/packages/semantic-search/` (commit `02d99b4da`): una tabla `embeddings`
con `id`, `embedding`, `metadata JSONB`, `updated_at`; `migrateVectorSchema`
con la comprobación de pgvector en tres estados (no se toca: EXISTS_AND_REUSE);
`upsertEmbedding`, `getEmbedding`, `searchBinaryCandidates`, `searchNearest`
con reranking exacto (`rerank.ts`, se reutiliza). Ningún paquete fuera de
`semantic-search` lo importa (`git grep` = 0), así que la superficie puede
cambiar sin migrar consumidores. El ledger de migraciones es el de
`@thyrox/store`; la migración nueva es una versión más, no un esquema paralelo.

Falta (MISSING): el texto, el documento, el hash, el modelo del vector y la
separación entre contenido durable y representación derivada.

## El contrato

1. **Tablas**, en el esquema del store:
   - `documents`: `document_id`, `scope`, `source_identity` (texto libre:
     repo@commit:ruta, URL, …; NUNCA se lee como ruta para recuperar
     contenido), `version` (entero creciente por documento), `content_hash`
     (sha256 del contenido canónico), `metadata JSONB`, `ingested_at`.
   - `document_chunks`: `chunk_id`, `document_id`, `version`, `position`,
     `text`, `content_hash`.
   - `embedding_spaces`: `space_id`, `model`, `dimensions`, `representation`
     (`vector`/`halfvec`), `state` (`building`, `active`, `retired`),
     `created_at`. A lo sumo un espacio `active`.
   - una tabla de embeddings por espacio (`chunk_id`, `embedding`) con su
     índice HNSW sobre la cuantización binaria, que es la que ya construye
     `vectorSql.ts` parametrizada por dimensión y representación.
2. **Ingesta idempotente por hash**: `ingestDocument({ scope, sourceIdentity,
   metadata, chunks: string[] })`. Mismo `sourceIdentity` y mismo hash →
   no escribe nada y lo dice (`unchanged`). Hash distinto → versión nueva,
   chunks nuevos; los embeddings de la versión anterior dejan de ser
   buscables. En una sola transacción.
3. **Espacios y re-embedding sin la fuente**: `createEmbeddingSpace`,
   `chunksWithoutEmbedding(spaceId, limit)` (devuelve texto persistido),
   `putEmbeddings(spaceId, [{chunkId, embedding}])` (valida la dimensión del
   espacio), `activateSpace(spaceId)` (atómico: el activo anterior pasa a
   `retired`), `dropSpace(spaceId)` sólo si está `retired`.
4. **Búsqueda sin filesystem**: `searchNearest` sobre el espacio activo
   devuelve `chunkId`, `text`, `documentId`, `sourceIdentity`, `version` y
   similitud, sólo de la versión vigente de cada documento. Sin espacio
   activo rehúsa con un error que lo nombra, nunca devuelve vacío.
5. **Pruebas contra PostgreSQL real** (`THYROX_TEST_POSTGRES_URL`), incluidas:
   - la fuente desaparece: se ingiere desde un directorio temporal, se borra
     el directorio, y la búsqueda devuelve el texto;
   - re-embedding: modelo A (dim 4) → modelo B (dim 6) desde los chunks
     persistidos, sin volver a leer ningún archivo; la búsqueda en B funciona
     y A queda `retired`;
   - reingesta del mismo contenido: `unchanged`, 0 filas nuevas;
   - cambio de contenido: versión nueva, la vieja no aparece en la búsqueda;
   - cerrar el store y abrir otro sobre la misma URL conserva todo (el worker
     que muere);
   - controles de anulación: sin la comparación de hash la reingesta escribe
     filas (cae exactamente ese caso); sin el filtro de versión vigente la
     versión vieja aparece (cae exactamente ese caso).
6. **Qué no decide** (ADR-008 1.2.0, del ejecutor): qué fuentes se ingieren y
   la retención del contenido privado. El store no borra por caducidad.

## Precisiones aprobadas (ADR-008 1.2.0, commit `dd08ac1f3`)

7. **«Canónico» es para la recuperación.** El snapshot ingerido es la fuente
   autosuficiente de semantic search, no la fuente de verdad del dominio. El
   store no ofrece edición de chunks: una corrección llega por reingesta.
8. **Resultados persistidos, no sólo reproducibles.** Tabla `analysis_runs`:
   `analysis_id`, `input` (la consulta), `space_id`, las versiones del corpus
   usadas, candidatos (`chunk_id` + versión), scores, `reranker` (opcional:
   lo pasa quien llama, el store no reordena por modelo), `output` (JSONB que
   aporta quien llama) y `created_at`. API: `recordAnalysisRun(...)` y
   `getAnalysisRun(id)`. Un chunk citado por un `analysis_run` no se borra:
   una versión nueva lo deja fuera de la búsqueda pero no del registro, y
   `dropSpace` no borra `analysis_runs` ni chunks. Un análisis leído después
   de reingerir y de retirar su espacio devuelve el mismo texto de sus
   candidatos que cuando se hizo.

## Invariantes que la suite prueba explícitamente

| Invariante | Caso |
|---|---|
| ingerir → borrar la fuente → la búsqueda devuelve el texto | fuente desaparece |
| mismo contenido otra vez → sin versión, chunks ni embeddings nuevos | reingesta idempotente |
| contenido distinto → versión nueva, la vieja no aparece | cambio de contenido |
| otro modelo/dimensión → espacio nuevo, re-embebido desde `document_chunks`, sin leer archivos | re-embedding |
| activar el espacio nuevo → las búsquedas nuevas lo usan | activación |
| retirar/borrar el espacio anterior → documentos, chunks y `analysis_runs` intactos | retiro |
| cerrar y abrir otro store sobre la URL → todo permanece | worker recreado |
| un `analysis_run` sobrevive a reingesta y a retiro del espacio con su texto | análisis persistido |

D5 sigue abierta sólo para qué fuentes se ingieren, su scope y la retención.

## Corrección posterior a este ítem (ADR-008 1.5.0, commit `851eeeea2`)

Llegó con el ítem ya en vuelo, y el buzón no entrega mensajes a un `-p`
(TASK-THYROX-0674), así que se aplica en un ítem de seguimiento sobre lo que
éste entregue, no en éste:

- la identidad del documento es `domain` + `domain_id` (único), y el
  `content_hash` sólo es la versión; `source_identity` pasa a ser procedencia
  (`source_ref`, `source_revision`) y deja de decidir nada;
- «sin cambios» es mismo `domain` + `domain_id` + mismo hash; dos documentos
  con texto idéntico y distinto `domain_id` son dos identidades;
- prueba de convergencia: el mismo `domain_id` ingerido desde dos rutas
  distintas da una sola identidad y una sola versión.

## La transición: 0682 no se cierra al integrarse

Lo que entregue este ítem es una implementación intermedia. El contrato del
corpus durable no se da por satisfecho, y TASK-THYROX-0684 no se lanza, hasta
este orden:

1. integrar lo verificado;
2. reemplazar la identidad por fuente/ruta por `domain` + `domain_id`
   (+ `scope` si el dominio lo exige); `content_hash` es la versión;
   `source_ref`/`source_revision` sólo procedencia;
3. migrar o reconciliar las filas escritas con la identidad antigua: mapear a
   la identidad de dominio, converger versiones, sin dejar colgada ninguna
   referencia de `analysis_runs`;
4. correr las seis pruebas de abajo contra PostgreSQL real.

| # | Caso | Esperado |
|---|---|---|
| 1 | mismo `domain_id` y mismo contenido desde dos rutas de clon | un documento, una versión |
| 2 | mismo `domain_id`, contenido cambiado | un documento, dos versiones |
| 3 | distinto `domain_id`, contenido idéntico | dos documentos |
| 4 | cambia `source_ref` | la identidad no cambia |
| 5 | cambia `source_revision` sin cambiar el contenido | sin versión nueva |
| 6 | filas con la identidad antigua | convergen a la identidad de dominio; ningún `analysis_run` citado queda colgado |
