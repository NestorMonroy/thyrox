# P5 — Prueba de extremo a extremo desde el scaffold

Tarea: TASK-THYROX-0743. Pasos 4 y 5 de `template.md`.

## Objetivo

Una ejecución nueva demuestra que toda la construcción de una tarea ocurre en unidades:
`Task -> unidad -> manifest scaffold -> banco -> pN -> lectura del árbol -> mutación -> RED ->
implementación -> GREEN -> anulación -> evidencia -> commit -> push -> finalize`, y si muta código,
`worktree -> cambio -> verify -> integración`.

## Estado inicial medido

`outputs/p5-initial.txt`: la prueba anterior (`managedExecution.real.test.ts`) empieza con la unidad
ya creada y no cubre scaffold, git ni push; el banco recuperado
`managed-execution-boundary-20261001T155453` se creó después del trabajo.

## Archivos que puede modificar

`src/packages/podman-execution/__tests__/managedExecution.real.test.ts` o una suite e2e nueva en el
mismo paquete; `task-runner-image/Containerfile` (añadir `strace` y `redis-server`, medidos ausentes).

## Mecanismos que reutiliza

Las entradas canónicas de p2..p4, `bin/manifest scaffold`, `probes/unit_identity.sh` y
`tests/test_manifest_identity.py` de este banco, el muestreador de PID/cgroup sin forks y la
exclusión estricta por `PF_EXITING` de la prueba real existente.

## Invariantes

1. Cada paso de la lista corre en una unidad y deja su identidad mientras corre.
2. Todo PID que participe —incluidos los hijos— está en `libpod-<containerId>` de su unidad; un
   proceso en salida (`PF_EXITING`) es la única exclusión, y se cuenta.
3. Ningún proceso del payload aparece en el cgroup del host durante la ejecución.

## Prueba RED

`outputs/p5-red.log`: la prueba e2e falla mientras algún paso corra fuera de unidad (un paso
lanzado a propósito en el host debe hacerla caer).

## Implementación mínima

La suite e2e, con un repositorio y un remoto desechables (`git init --bare`) para el push, y los
pasos lanzados por las entradas canónicas.

## Prueba GREEN

`outputs/p5-green.log` con la tabla paso → contenedor → PIDs → cgroups.

## Control de anulación

`outputs/p5-annulment.log`: correr un paso en el host → cae exactamente la aserción de ese paso;
quitar la exclusión de `PF_EXITING` → caen sólo las muestras de procesos en salida.

## Evidencia que guarda

`outputs/p5-initial.txt`, `p5-red.log`, `p5-green.log`, `p5-annulment.log`, `p5-process-table.tsv`.

## Criterio de cierre

GREEN y anulación; `tests/test_manifest_identity.py` en verde sobre el banco de la ejecución e2e; el
ADR-007 enmendado (TASK-THYROX-0744) cita la prueba.

## Qué NO pertenece a p5

G3/G4 (política provider-neutral, `claude disabled -> 0 ejecuciones de Claude`) y G5
(`search-existing`).
