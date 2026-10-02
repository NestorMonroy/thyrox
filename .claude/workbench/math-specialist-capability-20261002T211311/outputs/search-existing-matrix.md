# Search Existing Thyrox Mechanisms — mathematical reasoning (TASK-THYROX-0911)

Medido 2026-10-02 con `rg` sobre `src/packages` (sin `node_modules`, `dist`);
consumidores y tests = archivos que nombran el símbolo fuera y dentro de
`__tests__`. Corrige la clasificación previa (`search-existing.md`): allí se
proponía añadir el valor a `ModelCapability`; la autoridad lo impide.

| capability | existing authority | file | class/function/signature | consumers | tests | decision | next action |
|---|---|---|---|---|---|---|---|
| capacidad DECLARADA del modelo | `ModelCapability` = completion, tools, embeddings | `model-artifacts/modelCatalog.ts:65,332` | `requireCapabilities(root)`; sale del GGUF, «nunca del nombre» (`modelQualification.ts:236`) | catálogo, resolver | sí | REUSE sin cambios | `mathematical-reasoning` NO entra aquí: no es metadata del GGUF, sólo se mide |
| capacidad MEDIDA | `QualificationKind` = protocol, task, embedding | `model-artifacts/modelQualification.ts:27,80` | `qualifiedEmbeddingModels(entries, qualifications)` filtra por la medición vigente aprobada | 2 | 2 | EXTEND | añadir la clase de medición `mathematical-reasoning` con el mismo patrón que `embedding`, y su función de elegibilidad hermana |
| requisito de la tarea | `ModelExecutionRequest.requiredCapabilities` | `model-artifacts/modelResolver.ts:25-31,126-136` | `resolveModel(request, entries): ResolvedModel` | 9 | 5 | REUSE para lo declarado | un requisito MEDIDO no se expresa ahí; la elegibilidad medida la decide la cualificación |
| clase de tarea | `TASK_KINDS` mecanica/analisis/adversarial/frontera | `provider/src/cost/policy.ts:163` | `recommend(kind, profile)` | — | sí | REUSE sin cambios | no se crea `taskClass=mathematics` |
| selección local | `recommendExecution(kind, profile, local, policy?)` | `provider/src/cost/policy.ts:419` | usa `qualifiedModels(...)` por `task:<clase>` | 2 | 1 | EXTEND, después de la cualificación | una variante por capacidad medida consume `qualifiedEmbeddingModels`-like; sin routing por texto del prompt |
| artefacto desde Hugging Face | `importExternalArtifact(request, deps): ImportOutcome` | `local-models/externalArtifact.ts:128`; CLI `bin/local-models-import run --repository --revision --file --sha256` | revisión y sha256 fijados, GGUF validado | 2 | 1 | REUSE | importar el Q4_K_M de cada candidato con revisión y digest |
| publicación OCI | `createOciArtifactRegistry(options): ArtifactRegistry` (Docker Hub es un adaptador) | `artifact-registry/ociArtifactRegistry.ts:45` | `ArtifactRegistry` | 5 | 7 | REUSE | publicar el artefacto verificado |
| admisión de disco | `createDiskAdmission(options): DiskAdmission` | `artifact-registry/diskAdmission.ts:39` | piso de disco | 2 | 1 | REUSE | ningún artefacto entra sin admisión (2.9 GB libres medidos) |
| ensure / Ollama gestionado | `ensureModel(name, deps): EnsureOutcome` | `local-models/ensureModel.ts:69`; `bin/local-models-ensure` | caché verificada → Ollama gestionado | 6 | 1 | REUSE | igual que qwen3-4b |
| cualificación (CLI) | `runQualifyCommand`, `--suite` (tarea) y `--embedding-suite` | `local-models/qualifyCommand.ts:41,46` | despacho por tipo de suite | — | sí | EXTEND | una opción de suite para la capacidad medida, en la misma orden |
| almacén | `loadQualifications`, `appendQualification(path, q)` | `local-models/qualificationStore.ts:22,33` | sólo añade | 2 | 1 | REUSE | el esquema ya tiene model, suite, casesPassed/Total, passed, contextTokens, tokensPerSecond, measurementCondition, measuredAt |
| suite matemática | — (sólo `tool-calling-1.json`, `batch-worker-mecanica-1.json`) | `local-models/suites/` | — | — | — | MISSING | crear la suite bajo la autoridad de suites; casos con identificadores en inglés |
| subtareas / delegación | pool items, `ExecutionGrant` por petición | `headless-pool`, `model-scheduling` | — | — | — | fase posterior | primero la selección directa del especialista |

## Orden de ejecución

1. EXTEND `QualificationKind` + elegibilidad hermana (RED → GREEN → anulación).
2. Suite `mathematical-reasoning@1` (MISSING) y su opción en `local-models-qualify`.
3. Por candidato, uno a uno: `local-models-import` → admisión de disco → publicación → `local-models-ensure` → cualificación. Primero OpenReasoning-Nemotron-1.5B Q4_K_M; qwen3-4b como control con la misma suite.
4. EXTEND de la selección por capacidad medida; problema independiente de la suite.

Los pasos 1, 2 y 4 son código: los hace un worker local gestionado cuando rija
`managed-only`. El paso 3 es operación sobre autoridades existentes.
