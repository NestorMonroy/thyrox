# P2 — Una sola frontera de ejecución gestionada

Tarea: TASK-THYROX-0743. Pasos 1 (resto) y deuda de arranque de `template.md`.

## Objetivo

Todo trabajo gestionado llega a Podman por `ExecutionAuthorization -> PodmanExecutionPrimitive
(runExecution | materializeExecution | ensureResource) -> ExecutionUnit`. Ningún caller de dominio
alcanza las funciones por spec, y no queda ninguna entrada pública paralela.

## Estado inicial medido

`outputs/p1-initial-map.txt`. Se re-mide al abrir p2 en `outputs/p2-initial-callers.txt` (cada
llamada, no sólo cada archivo). Callers de las funciones por spec (`runJobWithOutput`,
`materializeContainer`) fuera de `podman-execution`:

| Caller | Clasificación provisional (se confirma en p2-initial-callers) |
|---|---|
| `artifact-registry/podmanJobVerifier.ts` | caller de dominio que salta la autorización → migrar |
| `local-models/ollamaModelInstaller.ts` | caller de dominio → migrar |
| `local-models/podmanArtifactFetcher.ts` | caller de dominio → migrar |
| `local-models/quantizationLab.ts` | caller de dominio → migrar |
| `daemon/src/podman/podmanWorkerManager.ts` | caller de dominio (worker de sesión, dueño `daemon`) → migrar |
| `podman-execution/{containerRun,executionAuthorization,executionCommand}.ts` | implementación interna de la primitiva → permitido |

La clasificación no se asume: cada fila se decide leyendo qué materializa (clase de ejecución,
referencia que la autoriza) y se escribe con su razón en `outputs/p2-caller-classification.md`.

Entradas: `bin/podman-execution-execute` (deuda de arranque) y `src/lib/managed_execution.sh` (la
indirección de los orquestadores, `THYROX_MANAGED_EXECUTION_RUNNER`).

## Archivos que puede modificar

`src/packages/podman-execution/**` (superficie pública: sólo las funciones por autorización);
los cinco callers de dominio; `src/lib/managed_execution.sh`; `src/session/control_plane_entries.tsv`;
`src/verify/check_podman_materialization.py` y su prueba; `bin/` sólo por `generate_bin.py`.

## Mecanismos que reutiliza

`ExecutionAuthorization` + `EXECUTION_KINDS` + la unión `reference`; `materializeExecution`,
`runExecution`, `ensureResource`; `ContainerOwner` (kind e id separados); el gate
`check_podman_materialization.py` (autoridad por módulo, pendientes que caducan con su tarea);
`managed_execution.sh` y `control_plane_entries.tsv`; `thyrox-bg` (ya migrado, `9429f0984`).

## Invariantes

1. Fuera de `podman-execution`, ningún módulo productivo importa `runJobWithOutput`,
   `materializeContainer` ni `WorkerContainerSpec` para crear contenedores.
2. Toda ejecución lleva clase, referencia (tarea | grant | infraestructura) y dueño `{kind, id}`.
3. Ninguna envoltura de `bin/` alcanza `podman-execution/bin/execute.ts`; el único módulo que lo
   invoca es `managed_execution.sh`, y sólo los orquestadores declarados en
   `control_plane_entries.tsv` invocan `managed_execution.sh`.
4. Ningún código productivo fija `THYROX_MANAGED_EXECUTION_RUNNER` ni `THYROX_CONTROL_PLANE_ENTRIES`
   (sólo suites).
5. `managed task construction => PodmanExecutionPrimitive`: prueba arquitectónica por módulos, no
   por nombre de comando.

## Secuencia (la deuda de arranque se retira la última)

1. Crear la entrada canónica: los orquestadores sobre `managed_execution.sh`; para esta sesión,
   `thyrox-bg start --task T --kind K -- argv` y su espera.
2. Probarla: una unidad lanzada por ella deja su línea en `manifest.jsonl` con contenedor propio.
3. Migrar este banco: desde ese punto, todo paso de p2..p5 se lanza por ella; la línea del manifest
   declara la entrada usada.
4. Demostrar que p3/p4/p5 pueden lanzar unidades por ella (una unidad por clase usada).
5. Retirar `bin/podman-execution-execute`: `execute.ts` sale de `bin/` (sin shebang), lo invoca sólo
   `managed_execution.sh`; `generate_bin.py --check` limpio.
6. Gate: falla si reaparece una entrada pública o un caller de dominio por spec.

## Prueba RED

`outputs/p2-red.log`: el gate ampliado marca los cinco callers y la envoltura de `bin/`; una suite de
arquitectura falla si un módulo fuera de la lista declarada invoca `managed_execution.sh` o
`execute.ts`, o si producción fija las variables de dobles.

## Implementación mínima

Por caller: componer su `ExecutionAuthorization` (clase y referencia que ya tiene: grant, tarea o
infraestructura) y llamar a `runExecution`/`materializeExecution`; las funciones por spec dejan de
exportarse fuera del paquete. Luego la secuencia 1–6.

## Prueba GREEN

`outputs/p2-green.log`: suites de los paquetes tocados contra `outputs/p1-baseline.log`; gate en 0
fuera, 0 pendientes vencidos; `generate_bin.py --check` limpio; la unidad de prueba de la entrada
canónica con su línea de manifest.

## Control de anulación

`outputs/p2-annulment.log`: a) reponer una importación por spec en un caller → el gate cae
exactamente en ese caller; b) reponer la envoltura en `bin/` → cae exactamente la prueba de entrada
pública; c) fijar el runner en un archivo productivo → cae exactamente esa aserción.

## Evidencia que guarda

`outputs/p2-initial-callers.txt`, `p2-caller-classification.md`, `p2-red.log`, `p2-green.log`,
`p2-annulment.log`, `p2-typecheck.txt`, `p2-diff.txt`, y las líneas de manifest de la secuencia.

## Criterio de cierre

Los seis pasos hechos en orden, cada uno con su línea de manifest; gate y prueba de arquitectura en
verde con su anulación; ninguna unidad posterior lanzada por `bin/podman-execution-execute`
(verificable en `manifest.jsonl`, campo de entrada).

## Qué NO pertenece a p2

headless-pool (p3), run-task-pool / parallel_map / wait-jobs / tsc_cycle (p4), el e2e (p5), la
política de modelos y Claude (después de p5).
