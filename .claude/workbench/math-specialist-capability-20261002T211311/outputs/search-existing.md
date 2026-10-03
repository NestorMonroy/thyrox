# Search Existing — capacidad matemática (TASK-THYROX-0911)

Instrumento: `rg -i -w` de math|mathematic*|stem|algebra|calculus|probability
sobre model-artifacts, local-models y provider/src/cost; y lectura de la
autoridad de capacidades. Medido 2026-10-02T21:13Z.

| Pieza | Autoridad existente | Decisión |
|---|---|---|
| capacidad del modelo | `ModelCapability` = completion, tools, embeddings (`model-artifacts/modelCatalog.ts:65`, validada en `:332`) | EXTEND: añadir `mathematical-reasoning` al conjunto canónico |
| requisito de la tarea | `modelResolver.ts:135` filtra por capacidades requeridas | REUSE |
| clase de tarea | `TASK_KINDS` mecanica/analisis/adversarial/frontera (`provider/src/cost/policy.ts:163`) | no se toca: matemáticas es capacidad, no clase |
| cualificación | `QualificationKind` protocol/task/embedding (`modelQualification.ts`); la de embeddings es por capacidad y su elegibilidad filtra por `capabilities.includes('embeddings')` (`:243`) | EXTEND con el mismo patrón para `mathematical-reasoning` |
| suite | sólo `tool-calling-1.json` y `batch-worker-mecanica-1.json`; ninguna matemática | MISSING: suite propia, independiente de la tarea final |
| modelo | ninguno matemático en el catálogo | candidatos en orden: qwen2-math:1.5b-instruct, deepscaler 1.5B, qwen3-4b (ya materializado), mathstral:7b sólo con admisión de disco |

Coincidencias de `Math.` en el código son de la API de JS, no de la capacidad.

## Quién lo implementa

Los EXTEND son código. Bajo el protocolo de cierre del bootstrap los hace un
worker local gestionado una vez vigente `managed-only`; el controlador sólo
cataloga, despacha, verifica e integra. No se descarga ningún modelo fuera de
`local-models-ensure` y su admisión de disco (2.9 GB libres medidos al escribir
esto; qwen2-math:1.5b ≈ 935 MB).

## Candidatos revisados (directiva del ejecutor 2026-10-02)

Orden de medición, uno a la vez y cada uno bajo admisión de disco y RAM:

| Orden | Modelo | Capacidad que se cualifica | GGUF Q4_K_M | Nota |
|---|---|---|---|---|
| 1 | OpenReasoning-Nemotron-1.5B | mathematical-reasoning, más código y ciencia | ≈ 986 MB | especialista de razonamiento |
| 2 | OpenMath-Nemotron-1.5B | mathematical-reasoning | ≈ 986 MB | especialista matemático puro |
| 3 | DeepScaleR-1.5B-Preview | mathematical-reasoning (difícil, varios pasos) | ≈ 1.12 GB | |
| control | Qwen2.5-Math-1.5B-Instruct | mathematical-reasoning | cuantizaciones GGUF | mide lo que aporta el post-training de OpenMath |
| control | qwen3-4b (ya materializado) | mathematical-reasoning | — | el generalista también se cualifica; no se le supone |
| sólo con margen | mathstral:7b | mathematical-reasoning | ≈ 4.1 GB | |
| no base | AceMath-1.5B-Instruct | — | ≈ 1 GB | licencia CC-BY-NC-4.0 |

Los benchmarks publicados (AIME, LiveCodeBench) ordenan la medición, no la
deciden: decide `modelo × capacidad → cualificación` sobre la suite local, y la
prueba final es un problema que no forma parte de esa suite. Cada artefacto
entra por catálogo con revisión y digest fijados (`huggingFaceSource.ts`,
`importCommand.ts`), nunca por `ollama run hf.co/...` fuera de Thyrox.
