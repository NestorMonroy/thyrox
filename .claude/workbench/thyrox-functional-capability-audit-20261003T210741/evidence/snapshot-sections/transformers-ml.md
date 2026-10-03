<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

## Transformers / ML runtime capability audit — 2026-10-03

Directiva del ejecutor, añadida a la auditoría en curso. **Nada se construyó,
descargó ni instaló.** Evidencia: `ml/` (Search Existing, conteos del corpus,
`observe images|volumes` por la entrada canónica `podman-execution-execute`).
Se midió con la cualificación de flujo corriendo en CPU: sólo lecturas cortas.

Estados: IMPLEMENTED (código + pruebas) · INTEGRATED (cableado en una
autoridad viva) · REAL_VERIFIED (corrió de verdad, con evidencia) · CONSUMABLE
(un consumidor de producto puede usarlo hoy) · ACTIVE_NOW (corriendo/residente).

### Capability matrix — ML

| Capability | State | Authority | Code | Consumer | Qualification | Real proof | Consumable today | Active now | Identity impact | Blocking gap |
|---|---|---|---|---|---|---|---|---|---|---|
| TransformersRuntimeAdapter | IMPLEMENTED + INTEGRATED | `hostCoordinatorComposition.ts` (adapters por runtime) | `local-models/transformersRuntimeAdapter.ts` (+ API cliente) | HostCoordinator | — | ninguna (sólo dobles HTTP en tests) | no | no | `thyrox-transformers-runtime` | imagen inexistente; ningún modelo safetensors en catálogo |
| Transformers runtime image | DEFINED, NEVER BUILT | `hostCoordinatorComposition.ts:50` `TRANSFORMERS_RUNTIME_IMAGE`; **fuera** del catálogo de `image-registry` | `transformers-runtime/Containerfile` + `transformers_runtime_server.py` | unidades transformers | — | único build (`.claude/jobs/build-transformers-runtime-20261002T030337`) **EXIT=1** al commitear capa; `observe images`: ausente | no | no | candidata a identidad lógica `role=transformers-runtime` | no está declarada en el catálogo de imágenes: nada la reconstruye |
| safetensors runtime resolution | IMPLEMENTED + INTEGRATED | `RUNTIME_BY_FORMAT` en `hostCoordinatorComposition.ts:80` (gguf/ollama-registry→ollama, safetensors→transformers), usado por `cpuPlacementOf` | ídem | coordinator placement | — | sólo GGUF real | sí (para GGUF) | GGUF sí | — | la autoridad existe: **no crear otro selector** |
| embedding orchestration / admittedEmbed | IMPLEMENTED + INTEGRATED (sólo Ollama) | ticket de admisión (ADR-007 M8) | `local-models/admittedEmbed.ts` → `/api/embed` de la unidad Ollama | **sólo** `qualifyModel.runEmbeddingQualification` | — | ninguna: el único rastro (`method-matrix-probe`) es una matriz de códigos HTTP, no un vector | no | no | — | ningún consumidor de producto; el runtime transformers no tiene endpoint de embeddings |
| embedding model availability | ABSENT | catálogo `.thyrox/models/catalog.json` | — | — | — | catálogo = 1 modelo (qwen3-4b GGUF, `completion`) | no | no | nombres contractuales `thyrox-…` | ningún modelo con capacidad `embeddings` declarado |
| embedding qualification | IMPLEMENTED, NEVER RUN | `modelQualification.ts` (`kind: embedding`, `qualifiedEmbeddingModels`) | `embeddingSuite.ts`, `embeddingSuiteFromCorpus.ts`, `qualify --embedding-suite` | recomendador de embeddings | **0** cualificaciones `embedding` en el store | — | no | no | — | sin suite versionada en `suites/`; sin modelo |
| embedding production | NOT VERIFIED / NOT WIRED | — | no hay código que lleve vectores de `admittedEmbed` a `putEmbedding` | — | — | — | no | no | — | **pieza ausente**: ningún paquete depende de `@thyrox/semantic-search` |
| embedding spaces | IMPLEMENTED (persistencia), EMPTY | `semantic-search/spaces.ts` (create/activate, índice único de `active`) | `store.ts`, `vectorSql.ts` | — | — | tests postgres (disposable) | no | **ninguno**: no hay corpus | — | `embedding_spaces` no guarda runtime/revisión/normalización (0904) |
| semantic_search_worker | DECLARATION/PROFILE ONLY | `daemon/podman/specializedWorkerProfile.ts` | mecanismo de build y límites | **ninguno** fuera de su test | — | — | no | no | nombre de perfil | su cabecera excluye modelo y dimensiones «hasta D5» |
| SentenceTransformer embeddings | ABSENT | — | 0 hits en `src`; sólo `_archived/requirements.txt` | — | — | — | no | no | — | — |
| CrossEncoder reranking | ABSENT | (frontera: el rerank por modelo es del worker) | 0 hits | — | — | — | no | no | — | — |
| database rerank (cosine exacto) | IMPLEMENTED | `semantic-search/rerank.ts` («el reranking por modelo no es del store») | `rerank.ts` + tests | `analysisRuns` | — | tests | sí, sin vectores no hay qué ordenar | no | — | frontera respetada |
| translation via Transformers | IMPLEMENTED (código), NOT REAL_VERIFIED | `admittedSeq2seq.ts` + `/v1/seq2seq` (`AutoModelForSeq2SeqLM`, MADLAD-400/T5) | servidor + adapter + tests | ninguno de producto | ninguna suite de traducción | ninguna (imagen nunca construida, sin modelo) | no | no | — | imagen, modelo MADLAD, suite, consumidor; la ruta viva de traducción es Qwen/Ollama (tarea) |
| Rust candle seq2seq | EXPERIMENTAL | bench `candle-seq2seq-runtime-20261002T070810` | `probes/candle-worker` | — | — | bench | no | no | — | no es producto |
| ExecutionOutcomeClassifier | INTERFACE ONLY | `task_continuation.learned_classifier_from_environment` | orden externa `THYROX_OUTCOME_CLASSIFIER_COMMAND` (vacía en `.env.example`); sólo casos ambiguos, nunca sobre una regla | `task_continuation` | — | — (sin modelo, sin implementación de inferencia) | no | no | variable `THYROX_*` | sin modelo/tokenizer/runtime: DESIGNED_ONLY detrás de una interfaz real |
| reward/value model | ABSENT | — | los 4 hits de «value model» son ajenos (schema, alias de proveedor, protocolo del coordinador) | — | — | — | no | no | — | — |
| ML runtime dependency stack | IMAGE-SCOPED | `transformers-runtime/Containerfile` y `model-artifacts/quantizer-image/Containerfile` | torch 2.11.0 CPU, transformers 4.57.6, tokenizers 0.22.2, safetensors 0.8.0, sentencepiece, numpy 2.2.6, huggingface_hub (HF_HUB_OFFLINE=1) | sólo dentro de esas imágenes | — | quantizer sí corrió; transformers-runtime no | — | — | imágenes `thyrox-*` | `pyproject.toml`/`uv.lock` no traen ninguna dependencia de ML: el anfitrión no las tiene, y está bien |

### Embedding decompuesto (la contradicción resuelta)

«SemanticSearchStore implementado / productor ausente» y «admittedEmbed es la
ruta local» son ciertas a la vez, porque miden piezas distintas:

| pieza | estado |
|---|---|
| Embedding API (persistencia: spaces, `putEmbedding`, activación) | IMPLEMENTED |
| Embedding orchestration (`admittedEmbed` con ticket) | IMPLEMENTED + INTEGRATED, sólo contra Ollama |
| Embedding runtime | Ollama `/api/embed`: disponible; Transformers: sin endpoint |
| Embedding model | ABSENT (catálogo sin modelo de embeddings; nomic-embed-text v1.5 sólo en tests/comentarios/benches) |
| Embedding qualification | IMPLEMENTED, nunca ejecutada (0 registros) |
| Embedding execution | NOT VERIFIED (ningún vector real en la evidencia) |
| Embedding persistence | IMPLEMENTED; corpus actual **vacío** |
| Embedding-space activation | IMPLEMENTED; ninguna activa |
| Embedding consumer (orquestación → store) | **ABSENT**: nada conecta `admittedEmbed` con `semantic-search` |

RAG sigue siendo otra capability: sin retrieval real no hay contexto que montar.

### Model inventory (estado ACTUAL)

| modelo | formato | runtime | instalado | cualificado | residente | consumidor |
|---|---|---|---|---|---|---|
| qwen3-4b `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` (`7485fe6f…`) | GGUF | Ollama | sí | protocolo 6/6 y mecanica 4/4 a 8K con perfil; flujo suspendido | sí | pool / worker |
| nomic-embed-text v1.5 | — | — | **no** (no está en catálogo ni en el volumen de Ollama) | no | no | — |
| MADLAD-400 / T5 | — | — | no | no | no | — |

### TASK-THYROX-0904 (embeddings por proveedor cualificado) — sigue `pending`

| subcapacidad | decisión |
|---|---|
| `embedding@1` qualification | REUSE (suite, loader, `kind: embedding`, `qualifiedEmbeddingModels`); falta la suite versionada |
| perfil de embedding por `embedding_space` | EXTEND `embedding_spaces` (hoy: model, dimensions, representation, state) |
| routing local-only / api-only / local-preferred / api-preferred | MISSING (0 hits) — y debe REUSAR la política de ejecución, no crear selector |
| comparación ONNX / Ollama / API | MISSING (sin onnxruntime en ninguna imagen) |

### Corpus real (medido hoy, sólo lectura)

`thyrox` en `thyrox-postgres`: **ningún esquema con `documents`**; la única tabla
es `public.thyrox_p0_sentinel`; pgvector 0.8.0 instalado.
documents = versions = chunks = embedding_spaces = embeddings = analysis_runs = **0**.
Histórico: 1675 / 9981 / 0 espacios el 2026-10-02
(`postgres-corpus-disk-reclaim-20261002T023317/outputs/T003-snapshot-after.json`).

**Por qué desapareció (medido):** `stat` del clúster: `PG_VERSION` nacido
2026-10-03 10:04:32; `observe volumes`: `thyrox-postgres-data` creado
10:04:25; y `local-control-plane-ready-full-20261003T100423` registró
`thyrox-postgres action=created … volumes=thyrox-postgres-data:created`. El
volumen durable ya no existía y la reconciliación **creó uno vacío sin avisar**.
Mi convergencia de las 21:13 (0928) dice `preserved` de un volumen ya vacío:
«preserved» mide el enganche, no el contenido (H-THYROX-464).

### Caches y disco ML

`~/.cache/huggingface`, `~/.cache/torch`, `~/.cache/transformers`: ausentes. ONNX:
ninguno. Snapshots safetensors en la caché de artefactos: ninguno
(`.thyrox/models/artifacts` = 2.4 G, sólo el GGUF `7485fe6f…`, CACHE con copia
canónica en `docker.io/th3rox/…@sha256:6775c008…`). Imagen transformers: ausente,
0 bytes. Nada de esto es la única copia de un artefacto.

### Runtime image ≠ model artifact

Se respeta: la imagen corre `HF_HUB_OFFLINE=1`, no trae pesos y monta el
snapshot concedido de sólo lectura en `/model`; la identidad del modelo sale del
grant (artefacto), no de la imagen. Coincide con la frontera que ya midió
TASK-THYROX-0917 (`identity-migration-analysis-20261003T072106`): carril A
`image-registry`, carril B `artifact-registry`/`model-artifacts`.

### Prior work que esta auditoría de identidad no citó (corrección)

`identity-migration-analysis-20261003T072106` (TASK-THYROX-0917) ya hizo un
censo de identidad y un plan OCI de primera publicación, con `observe` canónico.
Mi inventario de esta tarde no lo encontró por buscar en `src/` y no en los
benches: es Search Existing incompleto sobre la propia auditoría. Ambos se
leen juntos; el plan de fases debe partir de los dos.
