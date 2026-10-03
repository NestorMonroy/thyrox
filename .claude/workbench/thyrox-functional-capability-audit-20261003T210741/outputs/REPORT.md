# Auditoría funcional de Thyrox — vista consolidada

> **Vista derivada**, generada 2026-10-03T23:29:56Z por `probes/assemble_report.py`. No es la fuente de verdad:
> cada afirmación apunta a su registro (capability, finding, experiment, decision, evidence).
> La cronología vive en `manifest.jsonl` y en `snapshots/`; no hace falta `git log` para reconstruirla.

## Executive summary

- La fotografía de medición está cerrada; las conclusiones de dominio están en `capabilities/` y `decisions/`.
- `AUTONOMOUS_LOCAL_SELF_IMPLEMENTATION = NOT_ACCEPTED_YET`: ninguna identidad probada aprobó `repo-code-change@1` ([H-THYROX-470](../findings/H-THYROX-470.md), clasificación provisional MIXED).
- Las mediciones que limitaron esos experimentos no representaban el hardware ([H-THYROX-471](../findings/H-THYROX-471.md)): rama A del DAG.
- `controller.implementation` sigue en `bootstrap-exception`.

## Capability matrix (current_state)

| dominio | capability | current_state | gap | historia |
|---|---|---|---|---|
| execution | ejecución en unidad gestionada | REAL_VERIFIED | imagen por defecto :dev ausente; funciona sólo con THYROX_EXEC_IMAGE al digest publicado (H-THYROX-469) | [capabilities/execution.md](../capabilities/execution.md) |
| execution | worktree aislado + verify + integración | REAL_VERIFIED | huérfanos: item_worktree sweep-orphans con rescate (usado hoy, outputs/salvaged/) | [capabilities/execution.md](../capabilities/execution.md) |
| execution | localidad (thyrox-* nunca own) | REAL_VERIFIED | — | [capabilities/execution.md](../capabilities/execution.md) |
| execution | fallback de selección y local→local | IMPLEMENTED | ningún salto real ejercido | [capabilities/execution.md](../capabilities/execution.md) |
| podman | autoridad de materialización | INTEGRATED | 5 excepciones pendientes (0746, 0759×3) — src/verify/podman_*_pending.txt | [capabilities/podman.md](../capabilities/podman.md) |
| podman | observación (observe) | PARTIAL | sin logs/stats/health (#20) | [capabilities/podman.md](../capabilities/podman.md) |
| podman | volumen durable perdido | INTEGRATED | no ejercido en real | [capabilities/podman.md](../capabilities/podman.md) |
| podman | ciclo de vida de imágenes | PARTIAL | catálogo declara 1 imagen; defaults :dev (H-THYROX-469) | [capabilities/podman.md](../capabilities/podman.md) |
| model-control-plane | convergencia tras reciclado | REAL_VERIFIED | — | [capabilities/model-control-plane.md](../capabilities/model-control-plane.md) |
| model-control-plane | catálogo / import / validación | REAL_VERIFIED | defaults inservibles aquí (H-THYROX-469) | [capabilities/model-control-plane.md](../capabilities/model-control-plane.md) |
| model-control-plane | materialización en la unidad | REAL_VERIFIED | dos copias por modelo (H-THYROX-471) | [capabilities/model-control-plane.md](../capabilities/model-control-plane.md) |
| model-control-plane | selección de modelo | INTEGRATED (dos activas + una desconectada) | #12 | [capabilities/model-control-plane.md](../capabilities/model-control-plane.md) |
| qualification | cualificación con perfil de runtime | REAL_VERIFIED | — | [capabilities/qualification.md](../capabilities/qualification.md) |
| qualification | cualificación de flujo repo-code-change@1 | REAL_VERIFIED | ninguna identidad aprobada (H-THYROX-470); tres cualificaciones distintas (H-THYROX-472) | [capabilities/qualification.md](../capabilities/qualification.md) |
| transformers-ml | TransformersRuntimeAdapter | INTEGRATED | H-THYROX-465 | [capabilities/transformers-ml.md](../capabilities/transformers-ml.md) |
| transformers-ml | embeddings | IMPLEMENTED (orquestación); modelo/cualificación/producción ABSENT | 0904 (#27), H-THYROX-466 | [capabilities/transformers-ml.md](../capabilities/transformers-ml.md) |
| transformers-ml | SentenceTransformer / CrossEncoder / reward-value | ABSENT | — | [capabilities/transformers-ml.md](../capabilities/transformers-ml.md) |
| transformers-ml | traducción por Transformers | IMPLEMENTED | — | [capabilities/transformers-ml.md](../capabilities/transformers-ml.md) |
| semantic-search | SemanticSearch store | IMPLEMENTED | 0 consumidores; sin productor de vectores | [capabilities/semantic-search.md](../capabilities/semantic-search.md) |
| semantic-search | RAG | ABSENT | — | [capabilities/semantic-search.md](../capabilities/semantic-search.md) |
| persistence | PostgreSQL + pgvector | REAL_VERIFIED como servicio; no consumible | corpus perdido (H-THYROX-464) | [capabilities/persistence.md](../capabilities/persistence.md) |
| redis | Redis en producción | INTEGRATED parcial | claves sin prefijo (H-THYROX-463); #21 | [capabilities/redis.md](../capabilities/redis.md) |
| resource-admission | admisión RAM | REAL_VERIFIED, mide el cgroup equivocado | H-THYROX-471 | [capabilities/resource-admission.md](../capabilities/resource-admission.md) |
| resource-admission | admisión CPU | INTEGRATED | — | [capabilities/resource-admission.md](../capabilities/resource-admission.md) |
| resource-admission | admisión disco | REAL_VERIFIED | — | [capabilities/resource-admission.md](../capabilities/resource-admission.md) |
| process-monitoring | trabajos y procesos | REAL_VERIFIED | 2 trabajos A6 SIN-RECOGER (outputs/dims/04-images-jobs.txt) | [capabilities/process-monitoring.md](../capabilities/process-monitoring.md) |
| process-monitoring | vigilante del ítem | REAL_VERIFIED (pruebas host y unidad) | no disparó en una corrida real | [capabilities/process-monitoring.md](../capabilities/process-monitoring.md) |
| identity-migration | identidad kaupamex-ai | AUDITED (nada migrado) | #24, #25; H-THYROX-461/462/463 | [capabilities/identity-migration.md](../capabilities/identity-migration.md) |
| self-implementation | AUTONOMOUS_LOCAL_SELF_IMPLEMENTATION | NOT_ACCEPTED_YET | H-THYROX-470 (MIXED provisional) | [capabilities/self-implementation.md](../capabilities/self-implementation.md) |
| self-implementation | Search Existing | DESIGNED_ONLY | 0 archivos; parche rescatado de 0919 (outputs/salvaged/) | [capabilities/self-implementation.md](../capabilities/self-implementation.md) |
| self-implementation | specialist routing | ABSENT | — | [capabilities/self-implementation.md](../capabilities/self-implementation.md) |

## Current findings

| finding | severidad | evaluación vigente | registro |
|---|---|---|---|
| H-THYROX-452 | ALTA | El respaldo de la referencia ya estaba portado a medias y no llega a la ruta local; la política lo reducía a un booleano | [findings/H-THYROX-452.md](../findings/H-THYROX-452.md) |
| H-THYROX-453 | ALTA | TASK-THYROX-0920 extendió la vía de selección que TASK-THYROX-0750 iba a migrar, por una búsqueda acotada a 'fallback' | [findings/H-THYROX-453.md](../findings/H-THYROX-453.md) |
| H-THYROX-454 | ALTA | Tras reciclar la VM, Podman declara running cuatro contenedores cuyos pids no existen; dos guiones ignoran --help y ejecutan | [findings/H-THYROX-454.md](../findings/H-THYROX-454.md) |
| H-THYROX-455 | ALTA | thyrox -p elige la ruta por la credencial, no por la localidad del modelo: un trabajo local puede salir del anfitrión | [findings/H-THYROX-455.md](../findings/H-THYROX-455.md) |
| H-THYROX-456 | MEDIA | makeRoom admite sin objeción si falta el medidor de RAM o el plan no trae memoryBytes | [findings/H-THYROX-456.md](../findings/H-THYROX-456.md) |
| H-THYROX-457 | ALTA | El mismo GGUF de 2.4 GB vive tres veces y hay 14 imágenes sin tag, con 4 GiB libres | [findings/H-THYROX-457.md](../findings/H-THYROX-457.md) |
| H-THYROX-458 | ALTA | La cualificación no representa el perfil de ejecución y mecanica sustituye capacidades que no prueba | [findings/H-THYROX-458.md](../findings/H-THYROX-458.md) |
| H-THYROX-459 | BAJA | check_podman_access_ownership no ve un verbo de Podman invocado por variable | [findings/H-THYROX-459.md](../findings/H-THYROX-459.md) |
| H-THYROX-460 | ALTA | El prompt del worker local mide 26 085 tokens en su primer turno: 8K no alcanza sin presupuesto de sistema | [findings/H-THYROX-460.md](../findings/H-THYROX-460.md) |
| H-THYROX-461 | ALTA | La pertenencia al ecosistema se decide por el prefijo kaupamex-: un clon kaupamex-ai se contaría como consumidor | [findings/H-THYROX-461.md](../findings/H-THYROX-461.md) |
| H-THYROX-462 | MEDIA | El esquema de labels de identidad no tiene autoridad única: cuatro módulos y dos prefijos (io.thyrox.* y thyrox.*) | [findings/H-THYROX-462.md](../findings/H-THYROX-462.md) |
| H-THYROX-463 | MEDIA | Redis no lleva namespace de componente: keyPrefix vale '' por defecto en shared-state y en la coordinación de modelos | [findings/H-THYROX-463.md](../findings/H-THYROX-463.md) |
| H-THYROX-464 | CRITICA | El volumen durable del corpus desapareció y la reconciliación creó uno vacío sin avisar; preserved no mide contenido | [findings/H-THYROX-464.md](../findings/H-THYROX-464.md) |
| H-THYROX-465 | MEDIA | El runtime de Transformers está integrado en el coordinador pero su imagen nunca se construyó y no está en el catálogo de imágenes | [findings/H-THYROX-465.md](../findings/H-THYROX-465.md) |
| H-THYROX-466 | MEDIA | admittedEmbed existe y nada lo conecta al corpus: la orquestación de embeddings sólo la consume la cualificación | [findings/H-THYROX-466.md](../findings/H-THYROX-466.md) |
| H-THYROX-467 | ALTA | La salida de un ítem en unidad llega sólo al terminar: el vigilante no veía nada y su plazo sin progreso habría matado ítems sanos | [findings/H-THYROX-467.md](../findings/H-THYROX-467.md) |
| H-THYROX-468 | ALTA | qwen3-4b no cualifica para cambiar un repositorio: la infraestructura completa funciona y el fallo es del modelo | [findings/H-THYROX-468.md](../findings/H-THYROX-468.md) |
| H-THYROX-469 | MEDIA | Las imágenes por defecto se nombran por tags :dev fuera del catálogo declarado: laboratorio de import y runner de ejecución; además el import pide 8 GiB que la admisión no concede | [findings/H-THYROX-469.md](../findings/H-THYROX-469.md) |
| H-THYROX-470 | ALTA | CURRENT_LOCAL_MODELS_FAIL_REPO_CODE_CHANGE_ACCEPTANCE: las identidades probadas fallan repo-code-change@1 bajo el perfil actual (BLOCKED_FOR_CURRENT_ACCEPTANCE_PROFILE) | [findings/H-THYROX-470.md](../findings/H-THYROX-470.md) |
| H-THYROX-471 | ALTA | La admisión de RAM mide el cgroup de la sesión y cuenta su caché de páginas, pero las unidades corren en libpod_parent; y cada modelo se guarda dos veces por materialización | [findings/H-THYROX-471.md](../findings/H-THYROX-471.md) |
| H-THYROX-472 | ALTA | tool-calling@1 y mecanica aprobadas no implican repo-code-change@1: son tres cualificaciones distintas | [findings/H-THYROX-472.md](../findings/H-THYROX-472.md) |
| H-THYROX-473 | ALTA | agregar-hallazgo --force sobrescribe la fila sin conservar la versión anterior: el store no guarda la historia de un hallazgo | [findings/H-THYROX-473.md](../findings/H-THYROX-473.md) |

## Local model qualification (experimentos inmutables)

| experimento | modelo | suite | casos | tok/s | veredicto del pool | registro |
|---|---|---|---|---|---|---|
| mecanica-qwen25-7b-instruct-8k-r1 | `thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95` | batch-worker-mecanica@1 | 4/4 | 1.98 | — | [experiments/mecanica-qwen25-7b-instruct-8k-r1](../experiments/mecanica-qwen25-7b-instruct-8k-r1) |
| mecanica-qwen3-4b-8k-r1 | `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` | batch-worker-mecanica@1 | 4/4 | 4.55 | — | [experiments/mecanica-qwen3-4b-8k-r1](../experiments/mecanica-qwen3-4b-8k-r1) |
| repo-code-change-qwen25-7b-instruct-r1 | `thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95` | repo-code-change@1 | 0/1 | 1.52 | sin-cambios | [experiments/repo-code-change-qwen25-7b-instruct-r1](../experiments/repo-code-change-qwen25-7b-instruct-r1) |
| repo-code-change-qwen25-7b-instruct-r2 | `thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95` | repo-code-change@1 | 0/1 | 1.91 | rechazado | [experiments/repo-code-change-qwen25-7b-instruct-r2](../experiments/repo-code-change-qwen25-7b-instruct-r2) |
| repo-code-change-qwen3-4b-8k-b2048-t600 | `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` | repo-code-change@1 | 0/1 | 0.00 | no-local | [experiments/repo-code-change-qwen3-4b-8k-b2048-t600](../experiments/repo-code-change-qwen3-4b-8k-b2048-t600) |
| repo-code-change-qwen3-4b-8k-nobudget-r0 | `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` | repo-code-change@1 | 0/1 | — | fallido | [experiments/repo-code-change-qwen3-4b-8k-nobudget-r0](../experiments/repo-code-change-qwen3-4b-8k-nobudget-r0) |
| repo-code-change-qwen3-4b-r1 | `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` | repo-code-change@1 | 0/1 | 1.02 | rechazado | [experiments/repo-code-change-qwen3-4b-r1](../experiments/repo-code-change-qwen3-4b-r1) |
| tool-calling-qwen25-7b-instruct-8k-r1 | `thyrox-qwen--qwen2.5-7b-instruct-gguf:q4_k_m-hf-bb5d59e06d95` | tool-calling@1 | 6/6 | 2.65 | — | [experiments/tool-calling-qwen25-7b-instruct-8k-r1](../experiments/tool-calling-qwen25-7b-instruct-8k-r1) |
| tool-calling-qwen25-coder-7b-8k-r1 | `thyrox-qwen--qwen2.5-coder-7b-instruct-gguf:q4_k_m-hf-13fb94bfda8c` | tool-calling@1 | 2/6 | 2.39 | — | [experiments/tool-calling-qwen25-coder-7b-8k-r1](../experiments/tool-calling-qwen25-coder-7b-8k-r1) |
| tool-calling-qwen3-4b-8k-r1 | `thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e` | tool-calling@1 | 6/6 | 4.61 | — | [experiments/tool-calling-qwen3-4b-8k-r1](../experiments/tool-calling-qwen3-4b-8k-r1) |

## Identity migration

Inventario: [`outputs/identity-surface-inventory.tsv`](identity-surface-inventory.tsv); análisis textual: [`evidence/snapshot-sections/identity-migration.md`](../evidence/snapshot-sections/identity-migration.md); evaluación: [`capabilities/identity-migration.md`](../capabilities/identity-migration.md).

## Transformers / ML

Análisis textual: [`evidence/snapshot-sections/transformers-ml.md`](../evidence/snapshot-sections/transformers-ml.md); evaluación: [`capabilities/transformers-ml.md`](../capabilities/transformers-ml.md).

## Authority map, duplication y disconnected

[`decisions/final-dag.md`](../decisions/final-dag.md) (vigente) · [`decisions/initial-plan.md`](../decisions/initial-plan.md) (inicial).

## Dependency graph

Vigente en [`decisions/final-dag.md`](../decisions/final-dag.md) («Final dependency graph»).

## Recommended next execution

Rama A: A1 admisión de RAM sobre la frontera real de las unidades; A2 materialización sin copia duplicada inexplicada. Después, repetir la línea base de `repo-code-change@1` y los experimentos uno por uno.

## Evidence index

| snapshot | commit | sha256 |
|---|---|---|
| [`snapshots/report-20261003T232604Z-pre-structured-audit.md`](../snapshots/report-20261003T232604Z-pre-structured-audit.md) | d5502b7b6558 | 75a113337c2d367b… |
| [`snapshots/report-20261003T211141Z-eb9d035f2.md`](../snapshots/report-20261003T211141Z-eb9d035f2.md) | eb9d035f270a | 7a196e87f57a481c… |
| [`snapshots/report-20261003T215227Z-69769edd7.md`](../snapshots/report-20261003T215227Z-69769edd7.md) | 69769edd73c9 | 226f8bbf6a94b5b3… |
| [`snapshots/report-20261003T221146Z-92e9437fa.md`](../snapshots/report-20261003T221146Z-92e9437fa.md) | 92e9437faed3 | b362f7ba2cb5d112… |
| [`snapshots/report-20261003T222000Z-9420979bc.md`](../snapshots/report-20261003T222000Z-9420979bc.md) | 9420979bc659 | c9f56eb386d091df… |
| [`snapshots/report-20261003T224054Z-ea9277469.md`](../snapshots/report-20261003T224054Z-ea9277469.md) | ea92774691b0 | dd806333ee77fe2b… |
| [`snapshots/report-20261003T231152Z-fd3d113ce.md`](../snapshots/report-20261003T231152Z-fd3d113ce.md) | fd3d113ceb9f | 2b40256636ed3358… |
| [`snapshots/report-20261003T231847Z-6f011826c.md`](../snapshots/report-20261003T231847Z-6f011826c.md) | 6f011826c6ce | 6f4d518837d24572… |
| [`snapshots/report-20261003T232116Z-d5502b7b6.md`](../snapshots/report-20261003T232116Z-d5502b7b6.md) | d5502b7b6558 | 75a113337c2d367b… |

Otros: `outputs/` (salidas de sondas, rojos y anulaciones), `evidence/store-revisions/` (versiones del store recuperadas), `evidence/snapshot-sections/`, `decisions/`, `manifest.jsonl`.
