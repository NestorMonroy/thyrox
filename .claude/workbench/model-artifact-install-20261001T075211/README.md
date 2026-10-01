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

| paso | resultado | evidencia |
|---|---|---|
| pool 1 | 3 ítems, 3 `verificado`; `pool_integrate`: 3 aplicados, 0 conflictos | `.claude/jobs/pool-model-install-20261001T075357/` |
| suites derivadas | model-artifacts 203 · local-models 158 · artifact-registry 59 · podman-execution 101 pass; `test_ensure_homes` 37/37; typecheck 0 | `.claude/jobs/verify-integrated-2-20261001T080645/` |
| primera verificación | local-models no importaba `@thyrox/artifact-registry`: faltaba en `bun.lock` y no había enlace de workspace | `.claude/jobs/verify-integrated-20261001T080341/` |
| `locate --publication` | Q4_K_M ubicado: `sha256 b8d6f5cb…` en `docker.io/th3rox/thyrox-quantization-lab-artifacts@sha256:5fc24150…` | salida del comando |
| materialización real (sin Ollama) | `fetched` 10 951 ms → `cached` 1 791 ms; 1 descarga en total; sha256 recalculado = catálogo en las dos | `outputs/materialize-real.json`, `probes/materialize_real.ts` |
| E2E 1 · arranque en frío | **bloqueada**: `infrastructure_ensure` rehúsa `thyrox-ollama` con exit 3 (locks asignados 3, referenciados 4) | `.claude/jobs/e2e-cold-start-20261001T081113/` |
| E2E 2 · idempotencia | **bloqueada** en la mitad Ollama; la mitad de caché da 0 descargas en la segunda llamada (fila anterior) | — |
| E2E 3 · reconstrucción | **bloqueada**: exige recrear el volumen de modelos de un Ollama que no arranca | — |

El bloqueo es TASK-THYROX-0730, fuera del alcance de esta tarea por directiva del ejecutor.
Las tres E2E se corren con `bin/local-models-ensure <nombre>` en cuanto `thyrox-ollama` arranque.

*Métrica:* veredicto por ítem, pruebas derivadas tras integrar, y las tres E2E de cierre.
*Ciega a:* el modo Podman de los ítems, que no existe todavía (TASK-THYROX-0667).
