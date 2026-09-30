# Fuente de verdad — TASK-THYROX-0682: corpus semántico durable

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-008-semantic-search-store-sobre-postgresql-y-pgvector.rst`
v1.2.0, sección «Corpus durable» (commit `1227f675e`). Léela completa antes de
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
