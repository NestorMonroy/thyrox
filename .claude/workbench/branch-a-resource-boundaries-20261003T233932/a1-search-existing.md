# A1 — Search Existing y decisión

| Candidato | Comportamiento | Decisión |
|---|---|---|
| `src/session/resource_admission.py` `CgroupView` / `cgroup_headroom_bytes` | mide el límite más restrictivo de una cadena de cgroups; la cadena salía SIEMPRE de `/proc/self/cgroup` | **EXTEND**: `CgroupView.placement` y `--target-cgroup`; working set (uso − inactive_file) por nivel |
| `src/session/container_measure.py` `inspect_cgroup` | lee el cgroup de un contenedor ya existente para medir su uso | REUSE indirecto (ya lo usa `ledger_usage`); no sirve para la frontera de una unidad que aún no existe |
| `podman-execution/containerRun.ts` `inspectContainerState` | `State.Pid` y `CgroupPath` de UN contenedor | descartado como fuente: uno a uno, por nombre |
| `podman-execution/podmanObservation.ts` `listContainers`/`containerOf` | la observación de la primitiva; no exponía `CgroupPath` | **EXTEND**: `ObservedContainer.cgroup` |
| `ExecutionUnit.cgroup` (`executionAuthorization.ts`) | el cgroup de una unidad ya autorizada | descartado: posterior a la admisión |
| `local-models/resourceAdmission.ts` `ResourceAdmissionCli` | el adaptador TS de la admisión (coordinador y laboratorios) | **EXTEND**: `placement` → `--target-cgroup`; sin derivación, no mide (no cae a la sesión) |
| `--cgroup-parent` en la primitiva | grep: 0 usos en `src/` | no existe; no se añade (cambiaría la ubicación de las unidades) |

## Medición en vivo (2026-10-03T23:39Z)

- unidades: `/libpod_parent/libpod-<id>` (límite propio 8 GiB), padre `/libpod_parent` sin límite;
- sesión: `/process_api/<id>/claude-code-bash`, límite 14 345 035 776 B;
- `observedUnitPlacement` sobre el runtime real → `/libpod_parent` (derivado, no escrito);
- `headroom-ram` (sesión) 7 767 304 kB; `headroom-ram --target-cgroup /libpod_parent` 7 758 484 kB; MemAvailable 9 854 704 kB; piso 2 GiB intacto.

Hoy las dos cifras coinciden porque las acota el anfitrión: la sesión usa 0.97 GB de 14.3. La divergencia —la sesión acercándose a su límite por caché de página, o un límite en el padre de las unidades— se prueba con árboles dobles (casos 28-29 de `tests/session/test_resource_admission.py`).

*Métrica:* kB de holgura publicados por `headroom-ram` en cada frontera.
*Ciega a:* un límite en el padre de una unidad cuando no hay ningún contenedor vivo que observar (se mide la raíz) y un `--cgroup-parent` distinto para la unidad que se crea.

## Anulaciones

| Retirado | Cae | Sobrevive |
|---|---|---|
| `view.placement or own` → `own` | 6 aserciones del caso 28 | caso 29 y anteriores |
| resta de `reclaimable_bytes` | 3 aserciones del caso 29 | caso 28 y anteriores |
| `...target` en `headroom-ram` (TS) | 2 tests de frontera | 8 |
| preferencia por unidades de modelo en `unitPlacementOf` | 1 test | 4 |

Errores de tipos preexistentes, no tocados: `quantizationSteps.ts:173`, `executionCommand.ts:370,376`.
