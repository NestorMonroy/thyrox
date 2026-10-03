# math-specialist-search-existing

## El encargo

Reconciliar el trabajo de imágenes con `Especialista matemático local - 1.0.0`
(`inputs/`): Search Existing repo-wide antes de declarar, materializar o
cualificar un especialista. Dueño: **TASK-THYROX-0911** (existe, pendiente;
su descripción todavía nombra `qwen2-math`).

## La premisa, corregida

- TASK-THYROX-0912 es infraestructura, no avance del especialista.
- El documento refinó el orden: **OpenReasoning-Nemotron-1.5B** →
  **OpenMath-Nemotron-1.5B** → **DeepScaleR-1.5B**, Q4_K_M; `qwen3-4b`
  sigue de generalista y línea base. `qwen2-math` deja de ser el primero.
- Los tres publican GGUF Q4_K_M: **no hace falta cuantizar** para el primer
  especialista.

## Matriz (MEASURED salvo marca)

| Pieza | Autoridad encontrada | Decisión |
|---|---|---|
| requirement/capability `mathematical-reasoning` | `ModelCapability` (`model-artifacts/catalogEntry.ts:25`) es de runtime: `completion | tools | embeddings`. `ModelQualification` (`modelQualification.ts`) se indexa por `taskClass` ∈ `mecanica | analisis | adversarial | frontera`. `RouteRequirement`: 0 apariciones en código. GEN-0818: «name that capability by responsibility (not taskClass) … after A7 lands RouteRequirement». | **EXTEND** `ModelQualification` con un eje de capacidad; **bloqueado** por A7 (`RouteRequirement`). No crear `taskClass=matematica`. |
| capability evidence | `ModelQualification` ya registra model, suite, casesPassed/Total, contextTokens, tokensPerSecond, measurementCondition, measuredAt — exactamente los campos del documento | **REUSE** el registro; EXTEND sólo la clave |
| qualification suite | `local-models/suites/` (`tool-calling@1`, `batch-worker-mecanica-1`); runner `bin/local-models-qualify` | runner **REUSE**; suite `mathematical-reasoning@1` **MISSING** (datos + TDD) |
| artifact declaration/acquisition | `externalArtifact.ts` (TASK-THYROX-0720): GGUF publicado, sha256 fijado antes de descargar, admisión de disco, validación, catálogo; `huggingFaceSource.ts` por revisión completa; `bin/local-models-import` | **REUSE** — la ruta del primer candidato; sin cuantizador |
| validación del import | `importCommand.ts:74` corre la validación (y la fusión de shards) en la imagen de laboratorio `DEFAULT_LAB_IMAGE = localhost/thyrox-model-quantizer:dev` | el cuantizador sí es dependencia, **como herramienta de validación**; localmente existe (censo H-THYROX-422, PROVISIONAL); su publicación importa para una instalación nueva, no para el primer especialista aquí |
| ensure/materialization | `bin/local-models-ensure` + catálogo + Ollama gestionado | **REUSE** |
| ruta bajo E0 de import/ensure | `importCommand.ts:73` y `bin/ensure.ts:55` usan `createPodmanExecutor()`; ninguno es entrada declarada (0 filas en `control_plane_entries.tsv`) | **MISSING** — en el anfitrión es payload no gestionado, y una unidad no ve Podman: la misma clase de hueco que 0912. Código → **BLOCKED_BY_BOOTSTRAP** |
| cualificación vía Ollama gestionado | `qualifyCommand.ts` habla con `ModelCoordinatorClient` (socket del coordinador; `model_coordinator` es entrada declarada) | **REUSE** |
| selección | `recommendExecution(kind: TaskKind…)` (`provider/src/cost/policy.ts:419`) elige el local más rápido aprobado para la **clase**; no hay selector por capacidad | **EXTEND** con el eje de capacidad (TASK-THYROX-0750, GEN-0818) |
| ExecutionGrant | `hostCoordinator` emite tickets de admisión; `ModelScheduler`/`ExecutionGrant` en TASK-THYROX-0699 **pendiente** | ticket **REUSE**; grant pendiente de 0699 |
| UNSCHEDULABLE sin cualificado | `recommendExecution` con `policy.fallback.enabled=false` devuelve `runtime: 'blocked'` con la causa | **REUSE** |

## Ruta crítica derivada

1. Ruta declarada para `local-models-import`/`ensure` bajo E0 (excepción
   estrecha nueva, como 0912) — sin ella no entra ningún modelo.
2. Import de OpenReasoning-Nemotron-1.5B Q4_K_M por `externalArtifact`
   (revisión y sha256 fijados) → ensure → Ollama gestionado.
3. Suite `mathematical-reasoning@1` (8 categorías del documento) y su
   cualificación por el coordinador; `qwen3-4b` como línea base.
4. Eje de capacidad en `ModelQualification` y en la selección — depende de
   A7 (`RouteRequirement`) y de 0699.
5. Tarea held-out por requisito, sin Claude, sin API y sin `--model`.

El cuantizador y su publicación **no** están en esta ruta salvo como imagen
de validación ya presente.

*Métrica:* lectura de código y del store de tareas; `grep` de
`RouteRequirement` y de entradas `local-models` en la lista.
*Ciega a:* si el import funciona hoy de extremo a extremo (no se ejecutó), el
contenido real de la imagen `:dev`, y el estado de A7 fuera de este clon.
