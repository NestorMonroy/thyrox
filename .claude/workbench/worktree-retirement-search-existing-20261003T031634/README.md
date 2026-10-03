# worktree-retirement-search-existing

## El encargo

> «¿Qué mecanismo canónico de Thyrox posee la retirada de execution/worktrees
> terminados, incluidos accepted paths que no pasan por `integrate_worktree`?
> No asumas todavía que la respuesta es `task_continuation.py:integrate_worktree`
> sólo porque sea el primer sitio encontrado que hace `git worktree remove
> --force`.» — el ejecutor, 2026-10-03. Hasta cerrarlo: *orphan content safety =
> PROVEN; deletion authority = SEARCH_INCOMPLETE*; no hay `rm -rf`.

## La premisa, si se corrigio al primer comando

El instrumento canónico de Search Existing **no existe todavía**: TASK-THYROX-0769
(`bin/search_existing_mechanisms` + registro `src/verify/mechanisms.tsv`, T001; y el
gate de banco `check_mechanism_search_evidence`, T002) terminó en `hard_block`
(T001: 6 fallos de proveedor y 2 juzgados) y T002 quedó bloqueado por dependencia
(`mechanism-registry-20261002T061646/outputs/continuation.jsonl`). Esta búsqueda se
hizo a mano, con el método que 0769 iba a encapsular.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/synonym-hits.txt` | `rg -i -c` de los sinónimos sobre `src bin tests .githooks .claude/rules` (1 899 archivos con alguno) |
| `outputs/worktree-and-retire.txt` | archivos de producto que nombran `worktree` **y** un verbo de retirada (108) |
| `inputs/adr-002.rst` | ADR-002 del pool, leído: no regula worktrees |

## Los resultados

*Métrica:* candidatos por comportamiento y sinónimo, leídos en su autoridad,
consumidores, pruebas y contexto durable.
*Ciega a:* mecanismos que no usan ninguno de los sinónimos; ADRs de
kaupamex-docs fuera de `source/thyrox/adr/` con nombre sin esas palabras.

| Candidato | Comportamiento | Consumidores | Pruebas | Veredicto |
|---|---|---|---|---|
| `src/session/item_worktree.sh` | ciclo del worktree de un ítem delegado: `prepare` (admisión de disco, checkout disperso opcional por `THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE`, enlaces compartidos), `finalize`, `sweep`, `sweep-orphans` (candado + cwd vivo → `salvage` a parche → `git worktree remove --force` → `prune`) | `headless-pool.sh` (`--isolation worktree`), SessionStart (`user_wiring.py:269`), `item_git_guard/git`, `detect_controller_mutation.py`; usa `pool_lifecycle is-closed` como guard de `sweep` | `tests/session/test-item-worktree-orphans.sh`, `test_user_wiring.py` | **autoridad** del ciclo de worktree de ejecución; su raíz es `.thyrox/pool-worktrees/<run>/` |
| `src/session/task_continuation.py` | `prepare_worktree` + `integrate_worktree` propios bajo `.thyrox/runtime/continuation/worktrees/`; retira sólo al integrar | el controlador de continuación | `test_task_continuation.py`, `test_continuation_frontier.py`, `test-continuation-frontier-e2e.sh` | **duplicado** de la autoridad: nació sin reutilizarla (0 menciones de `item_worktree` en su módulo y en sus bancos) y no tiene barrido, salvamento, disperso ni admisión |
| `src/roster/worktree_state.py` | veredicto de retirada del worktree de un **agente del cliente** (entregó / fusionado / sucio) | roster | sí | otro dominio |
| `src/session/recovery_controller.py` | recuperación de un ítem de pool desde su foto; `prune` del runtime | pool | sí | otro recurso (runtime, no worktree) |
| `src/verify/measure_worktree.py` | árbol de medición de tsc (`prepare`/`sync`/`release`) | `tsc_cycle.py` | sí | otro propósito |
| `src/packages/agent/workflow/workflowWorktree.ts`, `swarm/src/worktree/*` | worktrees `.claude/worktrees/<slug>` del aislamiento de agentes interactivos (puerto del cliente) | REPL / AgentTool | sí | otro dominio |
| `src/packages/storage/src/projectPurge.ts`, `daemon/src/workerRegistry.ts` | purga de proyecto del cliente; arranque de workers del daemon | CLI / daemon | — | sin relación |

Contexto durable: H-THYROX-283 (dos pools retiraron worktrees con ítems vivos: por
eso existen el candado y el guard de `sweep`); tareas pendientes #21 «Retire
superseded abandoned pool runs from the runtime», #45 «Decide the home and ignore
policy of agent worktrees», #46 «Ingest pool and agent-worktree evidence».

## Decisión: EXTEND `item_worktree.sh`

`item_worktree.sh` posee la responsabilidad: su cabecera la declara («el worktree
de un ítem … al terminar … el worktree se retira»), y un ítem de continuación con
`isolation: worktree` es el mismo objeto que un ítem de `headless-pool --isolation
worktree`. `task_continuation` la duplicó. La forma del arreglo:

1. `task_continuation` consume `item_worktree` (`prepare`/`finalize`) en vez de
   su `prepare_worktree`/`git worktree remove` propios;
2. todo estado terminal aceptado —integrado, o aceptado fuera del flujo como
   L0 (H-THYROX-407)— retira por la misma autoridad;
3. el barrido de huérfanos cubre también los árboles de continuación (hoy
   `sweep-orphans` sólo mira `.thyrox/pool-worktrees/<12 hex>/`).

**No es REUSE para el huérfano de hoy:** `sweep-orphans` no lo ve (otra raíz,
otro nombre). Su retirada espera ese EXTEND; no se borra a mano.

## Lo que esta búsqueda corrige

- **H-THYROX-435** decía que ninguna ruta de worker admite checkout disperso:
  falso, `item_worktree.sh` lo admite (opt-in). Lo que falta es que la ruta de
  continuación lo use.
- **H-THYROX-437** atribuía la retirada a `integrate_worktree` como «único paso»:
  es el único de `task_continuation`, no la autoridad canónica.
- `run_dir_in_use` de `sweep-orphans` mide sólo el cwd de procesos, la misma
  superficie estrecha que el ejecutor objetó; el EXTEND debería ampliarla (fds,
  montajes de contenedores, ledger).
