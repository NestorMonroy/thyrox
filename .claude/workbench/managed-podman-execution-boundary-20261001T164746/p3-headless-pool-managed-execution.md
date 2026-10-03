# P3 — headless-pool: payload del ítem dentro de una unidad (G1, G2)

Tarea: TASK-THYROX-0743. Pasos 2 y 3 de `template.md`.

## Objetivo

Cada ítem del pool corre `thyrox -p` dentro de una `ExecutionUnit` cuyo dueño es el pool. GNU
Parallel, concurrencia, lifecycle/generaciones, `run.lock`, snapshots/recovery, `<n>.closed` e
integración siguen en el plano de control, alrededor de la invocación.

## Estado inicial medido

`outputs/p3-initial.txt` (se mide al abrir): hoy el ítem hace
`exec setsid [time] timeout "$HP_RUNNER" -p ...` en el host (`src/session/headless-pool.sh`,
lanzamiento del ítem); los ítems llegan sólo por stdin; la reserva sólo por entorno.

## Archivos que puede modificar

`src/session/headless-pool.sh` y sus suites (`tests/session/test-headless-pool*.sh`);
`src/packages/podman-execution/executionCommand.ts` sólo si la entrada canónica de p2 necesita el
dueño `pool`.

## Mecanismos que reutiliza

`managed_execution.sh` (p2), `ContainerOwner {kind: 'pool', id}`, `pool_lifecycle` (begin,
transition --generation, publish, reconcile), `ProcessOwnership`, `WriterInspector`, `SnapshotStore`,
`RecoveryController`, `pool_integrate`, el doble `HEADLESS_POOL_RUNNER`.

## Invariantes

1. El argv de `thyrox -p` sólo existe dentro de la petición de unidad; nada del payload del ítem
   (runner, scripts, probes, tests, mutaciones) corre en el host.
2. `owner.kind = pool`, `owner.id = <run>-<ítem>`; nunca `kind = "pool:<id>"`.
3. Montajes, red y sockets de la unidad no los decide el pool: llegan declarados en el perfil de
   ejecución que acompaña al candidato (M8). Sin perfil declarado, red `none` y sólo el árbol del ítem.
4. El lifecycle no cambia: un consumidor sólo lee `<n>.closed`; una generación vieja no publica.

## Prueba RED

`outputs/p3-red.log`: con el doble del runner de unidades, el argv del ítem debe llegar envuelto en
`run --task --kind workbench --owner-kind pool --owner-id ...`; el doble que ejecuta en el host sin
esa envoltura no se invoca; un pool sin entrada de unidades rehúsa con exit 2.

## Implementación mínima

Envolver la invocación del ítem con `managed_execution.sh`; pasar el dueño `pool` con id separado;
el resto del ítem (setsid, time, timeout, publish) queda en el plano de control.

## Prueba GREEN

`outputs/p3-green.log`: `test-headless-pool*.sh`, las suites de `pool_lifecycle`, recovery, snapshots
y `pool_integrate`, cada una con su código de salida; `check_podman_materialization` verde.

## Control de anulación

`outputs/p3-annulment.log`: quitar la envoltura → caen exactamente las aserciones de «payload en
unidad» y «dueño pool»; las de lifecycle siguen verdes.

## Evidencia que guarda

`outputs/p3-initial.txt`, `p3-red.log`, `p3-green.log`, `p3-annulment.log`, `p3-diff.txt`, y una
ejecución real de dos ítems con el doble de `thyrox -p` dentro de unidades: PID y cgroup de cada
ítem y de sus hijos (`outputs/p3-real-units.txt`).

## Criterio de cierre

GREEN y anulación; la ejecución real muestra cada PID del ítem en `libpod-<containerId>` con dueño
`pool`; ningún proceso del payload en el cgroup del host.

## Qué NO pertenece a p3

Qué modelo o proveedor elige el ítem (después de p5); `--items FILE` / `--memfree-reserve` para
tsc_cycle (p4); el e2e (p5).

## Invariantes que verifica el plano de control (ejecutor 2026-10-02)

Una unidad no ve el socket de Podman: ni el trabajador ni la verificación del controlador, que
corren en unidades, pueden materializar unidades. Por eso estas invariantes las prueba el plano de
control lanzando `headless-pool` (entrada declarada) con el doble de `thyrox -p`, y observando con
`podman-execution-execute observe`; el payload sigue en unidades. P3 se acepta sólo con esta prueba
en verde (ver `bootstrap.md`).

| Invariante | Cómo se mide |
|---|---|
| `owner.kind = pool`, `owner.id = <run>-<ítem>` | etiquetas `thyrox.owner-kind`/`thyrox.owner-id` de la unidad observadas mientras corre, y la atestación de la primitiva |
| worktree del ítem ≠ checkout principal | `pwd` del payload desde dentro frente a la raíz del clon |
| PID y cgroup del payload pertenecen a la unidad | `/proc/self/cgroup` del payload y de sus hijos contiene `libpod-<containerId>` |
| `.env` del anfitrión ausente en la unidad | `test -s <raíz>/.env` desde dentro: vacío o ausente |
| sólo los montajes declarados | `/proc/self/mountinfo` desde dentro frente al perfil declarado |
| `network=none` cuando el perfil lo declara | interfaces del payload: sólo `lo` |
| no se publica `CLOSED` con escritores vivos | suite `test_pool_lifecycle.py` y `test-headless-pool-item-drain.sh` |
| `<n>.closed` se escribe el último | `test_pool_lifecycle.py` (I2, I5) |
| `pool_integrate` sólo consume ítems cerrados y verificados | `test-headless-pool-lifecycle.sh`, `test-headless-pool-worktree.sh` |
| crash/restart conserva `reconcile`/`recover`/`prune` | `test_snapshot_recovery.py`, `test-headless-pool-exit-live-items.sh` |

La atestación de la primitiva hoy no lleva el dueño; P3 la amplía (es suya:
`src/packages/podman-execution`), y `headless-pool.sh` no gana política de Podman, secretos, GPU,
cgroups ni proveedores: sólo pasa el dueño y el perfil declarados a la entrada canónica.
