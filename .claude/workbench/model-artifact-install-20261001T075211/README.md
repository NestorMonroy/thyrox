# model-artifact-install

## El encargo

> «Implementa TASK-THYROX-0729 ahora … ModelArtifactResolver, materialización/cache verificada,
> installer port, Ollama installer adapter, ensure(model) reconciler, verificación READY por digest»
> y «la implementación tiene que ser vía podman-execution-primitive» — directiva del ejecutor,
> 2026-10-01. Procedimiento: `kaupamex-docs: source/thyrox/arquitectura/operacion-repository-job.rst`.

## La premisa, si se corrigió al primer comando

`headless-pool` no tiene aún el modo Podman de los ítems (ADR-007 1.5.0, TASK-THYROX-0667): los ítems
corren como procesos en worktrees aislados. Lo que sí va por la primitiva es lo que el código ENTREGA:
bajar del registry y subir a Ollama son trabajos de `@thyrox/podman-execution`.

## Las piezas

| archivo | qué hace |
|---|---|
| `p1-ollama-installer.md` | fuente del ítem I1: adapter instalador de Ollama |
| `p2-oci-layer-fetcher.md` | fuente del ítem I2: fetcher de una capa OCI |
| `p3-ensure-reconciler.md` | fuente del ítem I3: `ensureModel`, hogares, `locate` |
| `items.txt`, `template.md`, `launch.sh`, `probes/verify-item.sh` | el pool 1 |

Base ya commiteada antes del pool: `thyrox@8d9d02498` (resolver, caché verificada, puerto instalador).

## Los resultados

Pendiente.

*Métrica:* veredicto por ítem, pruebas derivadas tras integrar, y las tres E2E de cierre.
*Ciega a:* el modo Podman de los ítems, que no existe todavía (TASK-THYROX-0667).
