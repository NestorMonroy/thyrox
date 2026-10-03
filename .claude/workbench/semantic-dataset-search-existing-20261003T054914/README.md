# semantic-dataset-search-existing

## El encargo

> «¿Qué información ya decidió Thyrox que merece persistirse, cuál es su
> autoridad, qué parte pertenece al dataset canónico, qué parte pertenece sólo
> a PostgreSQL, y qué parte es derivada y no debe entrar al dataset?» — el
> ejecutor, 2026-10-03. Sólo especificación con evidencia: sin tablas, schemas,
> scripts, ingesters, embeddings, borrados ni producto. Claude, API remota y
> respaldo de proveedor: DENY.

Marcas: **PROVEN** (medido en este banco o citado de código/archivo leído),
**EXISTING_DECISION** (decidido en una ADR, regla o hallazgo), **INFERRED**,
**PROPOSED**, **SEARCH_INCOMPLETE**.

## La premisa, si se corrigio al primer comando

1. **La ADR que cita el código no está publicada.** `corpusSql.ts:2` y
   `store.ts:2` citan «ADR-THYROX-008 1.6.0»; en kaupamex-docs la rama
   `develop` tiene la 1.0.0 y la rama de trabajo la 1.5.0
   (`inputs/adr-008-1.5.0.rst`). PROVEN.
2. **El instrumento canónico de Search Existing no existe** (TASK-THYROX-0769,
   `hard_block`). La búsqueda se hizo a mano, con las consultas guardadas abajo.
3. **El inventario T005b no decide la admisión al corpus.** Clasifica por
   sufijo (`.md/.rst/.txt` → `semantic_content`, `t005b_inventory.py:123`);
   ADR-008 1.4.0 dice «lo que entra al corpus lo define un dominio, no un
   directorio». Sus clases sirven para **excluir**, no para incluir. PROVEN.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/decision-matrix.tsv` | la matriz pedida: 20 tipos de información × 21 columnas |
| `outputs/findings-hits.txt`, `outputs/task-hits.txt` | `agent_store buscar-hallazgos/buscar-tareas` con las consultas corpus, semántic, embedding, dataset, held-out, RAG, ingest, retrieval, distill |
| `outputs/kaupamex-docs-tree.txt` | árbol de kaupamex-docs (rama de trabajo) para contar tipos de documento |
| `inputs/adr-008-1.5.0.rst` | la ADR vigente más reciente |

Superficies leídas: `src/packages/semantic-search/**` (corpusSql, corpus,
corpusPolicy, contentHash, findingIngestion, rstDocument, legacyIdentity,
analysisRuns, ingestCommand), `artifact-registry`, `local-models/suites`,
`local-observability/errorStore`, `.claude/rules/persistencia-y-procesos.md`,
los bancos de reclaim v1 y v2, el store de hallazgos y tareas, y ADR-008.
*Ciega a:* ADR de kaupamex-docs fuera de `source/thyrox/adr/`, y lo que
PostgreSQL guarda por dominio (no se consultó la base: el reparto 1621+54 es
aritmético).

## A. Lo que ya está decidido o probado

1. **Tres capas con durabilidad distinta** (ADR-008 1.2.0, EXISTING_DECISION):
   fuente original (Git, worktree…: puede desaparecer) → snapshot canónico
   ingerido (`documents` + `document_chunks`, durable) → representación
   derivada (`embedding_spaces` + `embeddings_<space>`, regenerable). Es la
   separación A/B/C del encargo con otro nombre: **el snapshot es canónico
   para la recuperación, no para el dominio**; la fuente de verdad sigue en su
   sistema propietario.
2. **Identidad ≠ versión** (1.5.0, EXISTING_DECISION; código PROVEN):
   identidad = `domain` · `scope` · `domain_id` (· `owner` desde la migración
   4); versión = hash del contenido canónico (`contentHash.ts`, sobre la lista
   de chunks; la metadata no entra). La ruta local y `source_revision` son
   procedencia, nunca identidad.
3. **Invariantes D5-I1 y D5-I2** (EXISTING_DECISION): ingerido ⇒ la
   recuperación no depende del filesystem; un chunk persistido se re-embebe
   sin reabrir la fuente.
4. **Lo que entra lo define un dominio** (1.4.0), y **hoy sólo findings y
   errors** (1.5.0: «hasta decidirlas, nada fuera de findings y errors se
   ingiere»). EXISTING_DECISION.
5. **El corpus vivo** (PROVEN, R0 de reclaim v2): 1675 documentos, 9981
   chunks, 0 espacios de embedding, 0 análisis. T002 ingirió 1621 findings de
   kaupamex-docs; el árbol tiene 54 `error-ERR-*.rst`; 1621+54=1675
   (INFERRED).
6. **No hay tabla `document_versions`** (PROVEN, `corpusSql.ts`): la versión
   es una columna de `documents` y las versiones viejas viven como filas de
   `document_chunks` con su número; los chunks citados por un análisis no se
   borran (clave foránea).
7. **Retención** (1.5.0, EXISTING_DECISION): se retiene lo citado por un
   `analysis_run` y la ingesta vigente; una versión reemplazada y no citada es
   candidata a recolección; nada se borra por caducidad mientras D5 siga
   abierta.
8. **«Desechable» es prueba positiva** (1.5.0): el veredicto DISPOSABLE de
   TASK-THYROX-0684 y su lista de condiciones; NOT_PROVEN ante la duda.
9. **Exclusiones ya medidas** (T005b, PROVEN): secretos (ni texto ni hash),
   binarios, cachés, estado de ejecución, duplicados (y H-THYROX-433: los
   duplicados se cuentan por inodo).
10. **Destinos de persistencia** (ADR-006 1.3.0 vía
    `persistencia-y-procesos.md`, EXISTING_DECISION): tareas y sesiones →
    PostgreSQL D4-B; corpus → PostgreSQL + pgvector; nunca SQLite para el
    corpus.

## B. Contenido candidato al dataset

Detalle por fila en `outputs/decision-matrix.tsv`.

| Tipo | dataset_candidate | Por qué |
|---|---|---|
| finding | **YES** | dominio decidido, ingester probado, identidad única vigilada, fuente en Git |
| error | **YES** | dominio decidido e ingerido; **la fuente autoritativa está en duda** (ver D) |
| adr, technical-doc, runbook | MAYBE | el código los admite, la ADR no: conflicto (ver D) |
| evidence (bancos) | MAYBE | declarado sin reconocedor; muy desigual en valor |
| lecciones / decisiones de kaupamex-docs | MAYBE | 57 y 137 `.rst`; ningún análisis previo |
| image / build provenance | MAYBE, sólo metadata | las capas nunca; la identidad OCI vive en ImageRegistry |
| task outcome / execution record | SEARCH_INCOMPLETE | su autoridad no tiene escritor (H-THYROX-404) |
| analysis_runs | MAYBE como registro | es resultado guardado, no fuente |

**Qué conservaría el dataset para findings y errors**, campo por campo:

| Campo | Estado |
|---|---|
| identidad `domain` · `scope` · `domain_id` | EXISTING (`documents`) |
| texto original completo del `.rst` | REQUIRED-BY-EXISTING-CONTRACT a medias: el corpus guarda el cuerpo por chunks y la meta en `metadata`; **el archivo original no se guarda tal cual** (INFERRED de `rstDocument.ts`) |
| chunks y su corte | EXISTING; derivados del texto, pero su corte entra en el hash de versión |
| `content_hash` | EXISTING (versión) |
| `source_ref`, `source_revision` (repo, ruta relativa, commit) | EXISTING |
| metadata (`.. meta::`) | EXISTING |
| `ingested_at` | EXISTING; no es contenido |
| visibilidad / dueño | EXISTING (migración 4) |
| identidad de release del dataset, manifiesto, firma | PROPOSED (no existe nada: 0 usos de «dataset» en producto fuera de 3 archivos del cliente) |

## C. Exclusiones explícitas

| Qué | Destino | Base |
|---|---|---|
| embeddings, índices pgvector | se regeneran desde los chunks; fuera del dataset | ADR-008 1.2.0, D5-I2 |
| estado de runtime, PIDs, locks, `.time` | fuera por completo | T005b `execution_state` |
| cachés regenerables, `node_modules`, cachés de paquetes | fuera; su gestor es la autoridad | T005b `reconstructible_cache` |
| capas OCI | fuera; ImageRegistry guarda los bytes, el dataset a lo sumo la procedencia | directiva 2026-10-03 |
| pesos de modelo | fuera; ArtifactRegistry | ADR-007, catálogo de modelos |
| secretos, valores del `.env`, credenciales | fuera, ni texto ni hash | T005b `secret_sensitive`; `env_sensitivity.tsv` |
| transcripts y salidas del pool | fuera por defecto (ADR-008 1.4.0 corrigió a la 1.3.0) | además riesgo de exposición (TASK #125/#126) |
| duplicados y copias generadas | fuera; manda el original | T005b `duplicate`, H-THYROX-433 |
| código fuente y configuración | fuera del dataset: Git ya es su autoridad durable | INFERRED |
| estado de tareas | fuera; autoridad PostgreSQL D4-B | ADR-006 1.3.0 |
| cualificaciones de modelo | fuera; su registro y sus suites son la autoridad | `qualifications.json`, `local-models/suites` |

## D. Huecos (decisiones que no existen)

1. **Conflicto de autoridad en los dominios** (PROVEN): `INITIAL_CORPUS_POLICY`
   declara `adr`, `technical-doc`, `runbook` y `evidence` además de finding y
   error, y lo prueba `corpusPolicy.test.ts:17`; ADR-008 1.5.0 los deja
   abiertos. Ninguno de los cuatro tiene reconocedor, así que hoy no se
   ingieren. La ADR 1.6.0 que el código cita podría resolverlo, pero no está
   publicada.
2. **La fuente autoritativa de errors** (SEARCH_INCOMPLETE): la ADR nombra el
   dominio de errores de `@thyrox/local-observability` (`errorStore`); el
   ingester lee `error-ERR-NNN-*.rst`; y el `agent_store` también guarda filas
   `ERR-NNN`. Tres sitios, una sola identidad.
3. **Qué otros dominios, su scope y la retención de lo privado**: abiertos por
   la ADR (D5, «son del ejecutor»). TASK #212 «Datos D5 — qué vectorizar y
   modelo de embeddings» sigue pendiente.
4. **Forma durable de un volcado** (TASK #1219, pendiente: «partición por
   reconstruibilidad y volcado de texto»). Es la pregunta más cercana a un
   dataset publicable que ya existe como tarea.
5. **El texto original**: el corpus guarda chunks y metadata; si el dataset
   debe guardar el `.rst` íntegro (y no sólo su forma troceada) no está
   decidido.
6. **Release del dataset**: no existe identidad de release, manifiesto ni
   firma (MISSING).
7. **Splits y contaminación**: no existe ninguna decisión sobre held-out,
   entrenamiento ni contaminación entre corpus de RAG y casos de evaluación
   (0 apariciones en código y reglas; TASK #142 y #143 pendientes).
8. **Resultados de tareas**: la autoridad de registros de ejecución no tiene
   escritor (H-THYROX-404); sin ella no hay «task outcome» que exportar.
9. **El nombre del esquema** (TASK-THYROX-0914, SEARCH_INCOMPLETE).

## Identidad y procedencia: REUSE / EXTEND / MISSING

| Concepto | Autoridad | Decisión |
|---|---|---|
| identidad estable del registro | `documents` (`domain` · `scope` · `domain_id` · `owner`) | **REUSE**: un registro del dataset es una identidad de documento; no hace falta un `DatasetIdentity` |
| versión por hash | `contentHash.ts` | **REUSE** |
| revisión y referencia de la fuente | `source_revision`, `source_ref` | **REUSE** |
| id de finding / error / tarea | `hallazgo_ids` + `check_finding_id_unique.py`; ERR-NNN; `task_ids` | **REUSE**; ERR-NNN queda SEARCH_INCOMPLETE por el hueco 2 |
| commit | `source_revision` (HEAD del repo de origen) | **REUSE** |
| identidad de artefacto | ArtifactRegistry (artefacto OCI con `artifactType`) | **EXTEND** (INFERRED): un release de dataset sería un `artifactType` nuevo; hoy sólo se usa el de modelo |
| digest OCI | ImageRegistry `PinnedImageReference` | **REUSE** para la procedencia de imágenes |
| release / manifiesto del dataset | — | **MISSING** |

## El ciclo dataset → PostgreSQL

| Paso | Hoy |
|---|---|
| release canónico del dataset | MISSING |
| importador determinista | **REUSE parcial**: `ingestDocument` es idempotente por hash y no lee rutas (D5-I1); falta la entrada «desde un release» (EXTEND de `semantic-search-ingest`) |
| SemanticSearchStore → PostgreSQL → chunks | EXISTING |
| embedding local → pgvector | API existente (`createEmbeddingSpace`, `putEmbeddings`, `activateSpace`); **productor MISSING** (EXTEND, TASK-THYROX-0904) |
| registro del dataset ↔ documento | **posible sin nada nuevo** (INFERRED): la identidad de dominio es la misma en los dos lados, y `content_hash` prueba qué versión produjo qué chunks. `document_id` (UUID) es local a cada base y no debe entrar al dataset |

## RAG, calificación y entrenamiento

| Tipo | RAG | Calificación | Held-out | Entrenamiento futuro |
|---|---|---|---|---|
| finding / error | sí (el uso para el que existe el corpus) | sólo como contexto recuperado | no decidido | no decidido |
| suites de calificación | **no** | sí (son la autoridad) | sí | **no**: entrenarlas contamina la calificación |
| evidence, task outcomes | tal vez | fuente de casos | candidatos | candidatos |

Riesgo de contaminación (INFERRED): un caso de calificación o de evaluación
held-out que también esté en el corpus de RAG mide recuperación, no
capacidad. Hoy no hay ninguna regla que lo impida.

## E. Recomendación de arquitectura (PROPOSED)

```
fuente propietaria (Git: kaupamex-docs, …)
        │  reconocimiento por dominio (findingIngestion: REUSE)
        ▼
DatasetArtifact = release inmutable de registros
   registro = identidad de dominio + content_hash + texto + metadata + procedencia
   publicado como artefacto OCI (ArtifactRegistry: EXTEND con un artifactType)
        │  importador = semantic-search-ingest desde un release (EXTEND)
        ▼
SemanticSearchStore → PostgreSQL (documents, document_chunks)
        │  productor de embeddings local (EXTEND, TASK-THYROX-0904)
        ▼
embedding_spaces / embeddings_<space> (pgvector) — nunca en el dataset
```

Antes de construir nada hacen falta las decisiones del ejecutor sobre los
huecos 1, 2, 3 y 7. Sin el 1 y el 2, «Thyrox Semantic Dataset v1» sólo puede
contener **findings y errors**, que es lo que la ADR vigente ya autoriza.
