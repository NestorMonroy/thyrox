# execution-vocabulary

## El encargo

<!-- verbatim, sin parafrasear -->

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|

## Los resultados

*Metrica:*
*Ciega a:*

## Medición de responsabilidades (2026-10-01)

| Concepto | Paquete | Responsabilidad |
|---|---|---|
| `ExecutionGrant` | model-artifacts | decisión de dominio de ejecutar un modelo: artefacto, runtime, placement, residencia, VRAM, contexto, caducidad. Sin imagen, montajes ni comando |
| `ModelExecutionPrimitive` | model-scheduling | materializa un grant en un contenedor de runtime; destroy; units |
| `ExecutionUnit` | model-scheduling | identidad de la unidad de un grant: endpoint, containerId, cgroup, hostPids |
| `check_model_execution_grant` | src/verify | ninguna inferencia local sin grant + unidad (estático) |
| `WorkerContainerSpec`, `DesiredResource`, `runJobWithOutput`, `ensureResource` | podman-execution | contrato neutral del contenedor |
| `ExecutionAuthorization` (nuevo) | podman-execution | autorización a nivel de contenedor de un trabajo |

Segundas autoridades de materialización medidas (`git grep` de `run(['start'` fuera de podman-execution):
`daemon/src/podman/podmanWorkerManager.ts:250`, `model-scheduling/podmanModelExecutionPrimitive.ts:338`.

Referencias: `ExecutionGrant` 64 en 17 archivos; `ExecutionUnit` 53 en 15.

## Decisión de vocabulario

- El grant COMPONE, no hereda: podman-execution es neutral (`packageBoundary.test.ts`),
  así que model-scheduling traduce `ExecutionGrant` a una `ExecutionAuthorization`
  `kind: 'model-runtime'` con referencia al grant.
- `ExecutionAuthorization.reference`: tarea | grant | infraestructura.
- `ExecutionUnit` sigue siendo el concepto de model-scheduling; el contenedor de un
  trabajo se llama «contenedor de ejecución» (`executionContainerSpec`).
- Una sola autoridad: `materializeContainer`, `runExecution`, `ensureResource` en
  podman-execution; ningún otro módulo compone create/start/run/exec/build.

Métrica: referencias por nombre exacto (`git grep -w`) y llamadas `run(['<verbo>'` en TS productivo.
Ciega a: una invocación de Podman que no pase por `PodmanExecutor.run` con un literal de verbo, y a los guiones de shell, que se miden aparte.
