# continuation-dag-frontier

TASK-THYROX-0754. Sucesora de la corrección del ejecutor sobre TASK-THYROX-0743.

## El encargo

<!-- verbatim, sin parafrasear (extracto) -->

> Lo que implementaste hasta ahora es un continuation controller serial para una
> tarea, no un ejecutor de N tareas. […] Sustituye conceptualmente
> `next_item(plan, log) -> PlanItem | None` por
> `runnable_items(plan, state) -> list[PlanItem]` […] Usa el fan-out que Thyrox
> YA tiene […] `headless-pool` + GNU Parallel […] No implementes
> `asyncio.gather`, una worker queue propia ni otro pool. […] La invariante final
> que quiero es: `Batch -> runnable DAG frontier -> headless-pool/GNU Parallel ->
> ExecutionAuthorization per item -> PodmanExecutionPrimitive -> N
> ExecutionUnits`.

## La premisa, si se corrigio al primer comando

- **Correcta**: `next_item` devolvía `next(...)`, el primer ítem sin asentar, y
  su test (`j` bloqueado → `k`) probaba exactamente esa serialidad.
- **Desviación declarada — no se usa `headless-pool`**: sus ítems corren
  `thyrox -p` directamente en el anfitrión (`src/session/headless-pool.sh`, la
  función de ítem: `exec setsid … "$HP_RUNNER" -p …`, sin unidad), y llevarlos a
  Podman sigue abierto en el board (#27). Usarlo rompería «ningún payload en el
  host». Se usa la otra pieza de fan-out que ya existe y que es GNU Parallel:
  `bin/parallel_map` con `:::: -`. Ningún planificador nuevo: el controlador
  sólo calcula el conjunto y lo escribe en la entrada de Parallel.
- **Medido antes de diseñar**: GNU Parallel arranca un ítem en cuanto llega su
  línea, sin esperar al EOF (`a` a +0.9 s, `b` a +3.0 s, EOF a +6 s). Por eso la
  frontera puede crecer mientras otros ítems corren.
- **`pool_integrate` no se reusa**: depende del ciclo de vida de headless-pool
  (`pool_lifecycle is-closed/verify`) y trunca su registro (board #8). La
  integración por ítem usa su mismo criterio (`git apply --check`, conflicto =
  no se aplica) bajo un candado propio.

## Las piezas

| archivo | que hace |
|---|---|
| `src/session/continuation_frontier.py` | `item_states`, `runnable_items`, `doomed_items`, `conflicts` — puras |
| `src/session/task_continuation.py` | `run_frontier` (Parallel por `:::: -`), `run-one`, worktree + `integrate_worktree` bajo `integration_lock` |
| `src/session/bg.sh` | pasa `--cpus/--memory-mib/--pids` a la primitiva |
| `tests/session/test_continuation_frontier.py` | 23 aserciones puras |
| `tests/session/test-continuation-frontier-e2e.sh` | e2e real: Podman, Parallel, worktrees, integración; anulaciones `cursor` y `first` |

## Los resultados

`outputs/green/` — e2e completo, 31 OK, 0 FALLAN (`outputs/full-run.verdicts.txt`).
`outputs/green/timeline.txt`, dag (segundos desde el primer despacho):

```
T1  despachado 0.0   trabajo 7.8..10.8   aceptado 20.9
T2  despachado 0.0   trabajo 8.9..58.9   aceptado 71.6
T3  despachado 22.0  trabajo 28.8..31.8  aceptado 41.0
T4  despachado 0.0   trabajo 7.9..57.9   aceptado 67.9
```

T1, T2 y T4 en tres unidades a la vez; T3 se despacha 1.1 s después de aceptar
T1 y corre mientras T2 y T4 siguen. 4 contenedores, 4 cgroups, 4 dueños, todo
payload con `/run/.containerenv` y cgroup `libpod`, 4 trabajos en el `--joblog`
de Parallel, 4 commits integrados y remoto == local. Lote: A1, B1 y C1 de tres
tareas distintas (dueños `task-batcha-0001`, `-b-`, `-c-`) a la vez; A2 tras A1.

Anulaciones:

- `outputs/annul-cursor/` — el cursor de antes: caen exactamente las 6
  aserciones de concurrencia (`max_active=1`); integración, aislamiento,
  Parallel y orden de dependencias sobreviven.
- `outputs/annul-first/` — recortar la frontera a su primer ítem **no
  serializa**: cae 1 aserción. Con la frontera recalculada cada 2 s, un ítem en
  curso deja de ser despachable y el siguiente sale en la vuelta siguiente. La
  concurrencia no depende sólo del tamaño de cada frontera.
- `outputs/pure-annulments.txt` — en la suite pura, recortar a uno tumba las 7
  aserciones de conjunto; `conflicts=False` tumba las 4 de exclusión.

*Metrica:* intervalos que cada trabajador escribe desde dentro de su unidad
(`date` al empezar y al terminar), contenedor leído de su cgroup, etiquetas de
dueño muestreadas cada 0.5 s con `podman ps`, `--joblog` de Parallel y el
registro del controlador.
*Ciega a:* trabajadores reales (`thyrox -p`): el doble duerme y escribe un
archivo; la frontera es la misma, pero no se midió con un modelo. Ciega también
a la admisión de RAM de `parallel_map` bajo presión (sin historial no reserva) y
a ítems que muten el mismo checkout en paralelo, que la exclusión impide por
construcción y por eso no se ejercitan.

## Lo que queda abierto

- El plan de TASK-THYROX-0743 no declara `dependsOn`: sigue siendo una
  secuencia, por diseño. continuation6 corre el código anterior hasta que salga.
- Un ítem real aislado en worktree corre `bin/cli` del checkout (con su
  `node_modules`) sobre el worktree; una verificación que necesite
  `node_modules` dentro del worktree no está cubierta.
