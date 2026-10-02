# Contrato — rutas de embedding y modelos locales como workers del lote

TASK-THYROX-0904 (T008 del reclaim), TASK-THYROX-0906 (Qwen como workers) y la
parte disjunta de TASK-THYROX-0905. Directiva del ejecutor 2026-10-02: lote
continuo y transaccional por unidades —implementar, verificar, aceptar,
commit, push, analítica, limpieza, siguiente— sin pedir confirmación entre
unidades.

## 1. Mecanismos existentes (medido antes de construir)

| Responsabilidad | Autoridad existente | Uso aquí |
|---|---|---|
| catálogo de modelos | `model-artifacts/modelCatalog.ts`, `.thyrox/models/catalog.json` | REUSE |
| capacidad declarada | `model-artifacts/catalogEntry.ts:25` `ModelCapability = completion \| tools \| embeddings` | REUSE |
| importación exacta (HF, revisión + sha256) | `bin/local-models-import` → `local-models/externalArtifact.ts` | EXTEND: hoy escribe `capabilities: ['completion']` fijo (`:308`) |
| materializar en Ollama | `bin/local-models-ensure <nombre>` vía coordinador | REUSE |
| admisión de modelos | coordinador del daemon, socket `/root/.claude/model-scheduling/coordinator.sock` | arrancado en esta sesión (daemon `bg run`, transitorio, 0 unidades barridas) |
| calificación | `local-models/qualifyModel.ts` (`runQualification`, `runTaskQualification`), suites en `local-models/suites/` | REUSE para Qwen; `embedding@1` no existe |
| store de calificaciones de producto | `.thyrox/models/qualifications.json` (`qualificationStore.ts`) | **no se escribe** desde este lote |
| espacios de embedding (perfil) | `semantic-search` `embedding_spaces`, `EmbeddingDimensionError` | REUSE/EXTEND en T008 |
| selección de candidato del lote | `task_continuation.py` `choose_candidate` | sin cambios en este lote |
| registro de ejecución | `executions.jsonl` (atestación), `units.jsonl`, `local-observability`, `pool_history` | base de 0905 |

## 2. Ruptura del ciclo P0 ↔ A4/A7

P0 exige T008; registrar `embedding@1` como calificación de producto exige la
identidad y el eje de A4/A7, que esperan a P0. Se rompe sin cambiar
arquitectura: **T008 elige ruta con evidencia de evaluación del lote**, en
`outputs/` de este banco, igual que la calificación de los Qwen como workers.
Ninguna de las dos escribe en `.thyrox/models/qualifications.json`. Cuando A7
aterrice, `embedding` se califica como capacidad de producto con su suite.

## 3. Hechos que acotan

- Ruta C: sin endpoint en este entorno (`THYROX_OPENAI_COMPAT_BASE_URL`
  ausente; `reclaim/outputs/T008-api-models.json`). No disponible, no descartada.
- Qwen en disco: el catálogo declara 0.5B (397 807 712 B), Coder 1.5B
  (986 048 672 B) y Coder 7B (4 683 073 536 B). Ninguno está cargado en
  `thyrox-ollama`. El 7B no cabe: 4.68 GB > 4.35 GB libres; queda fuera hasta
  que la admisión de disco lo admita.
- Ownership: los archivos de A1–A7 (`modelQualification.ts`, `catalogEntry.ts`,
  `declareInstalledModel.ts`, `executionPolicy.ts`, `provider/src/cost/policy.ts`)
  no se tocan aquí. P2d (`bg.sh`, `managed_execution.sh`) tampoco.

## 4. Unidades

| Id | Entrega | Archivos propios | Depende |
|---|---|---|---|
| U1 | la importación declara la capacidad desde el GGUF (`embeddings` para un modelo de embeddings) en vez de `completion` fijo | `local-models/externalArtifact.ts` y su prueba | — |
| U2 | `embedding@1`: suite de evaluación de recuperación sobre `semantic_content` (pares consulta→documento esperados, recall@k) y su ejecutor contra un proveedor por la interfaz del coordinador | `local-models/embeddingEvaluation.ts` (nuevo, sólo si nada existente lo cubre) y su prueba; datos en este banco | U1 |
| U3 | importar `nomic-embed-text-v1.5` GGUF exacto y evaluarlo (ruta B); evaluar ruta A con el mismo conjunto si cabe; elegir ruta por evaluación + disco + disponibilidad + política | datos y evidencia en este banco | U2 |
| W1 | evaluación de Qwen 0.5B y Coder 1.5B como workers por capacidad, con suites existentes y casos de ítems del lote; resultado sólo en este banco | evidencia en este banco | — |
| X1 | 0905, parte disjunta: el registro estructurado de ejecución que hoy queda en `executions.jsonl`/`units.jsonl` se persiste en PostgreSQL; la retirada de residuo exige el registro durable | por medir; nunca archivos de P2d | — |

Paralelismo: U1–U3 y W1 no comparten archivos de código (W1 sólo produce
evidencia); X1 se mide antes de abrirlo.
