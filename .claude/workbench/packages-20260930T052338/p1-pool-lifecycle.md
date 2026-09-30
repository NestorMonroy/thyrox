# p1-pool-lifecycle

## [362] TASK-THYROX-0639 — Pool exit must not orphan live items nor sweep their worktrees

Status on board: pending

H-THYROX-283: groups 7 and 8 exited at 03:58:34 with live items; the pool swept .thyrox/pool-worktrees/<key> while thyrox -p items 1 and 3 kept writing until 04:00:48, and joblog.tsv stayed header-only. Fix with TDD: on pool exit (any signal), drain/terminate each item's process tree before sweeping, and never sweep the worktree of an item that is not CLOSED/published (leave it for pool_lifecycle reconcile). Reproduce both candidate causes (SIGTERM to the pool with a live item; disk full) and record which leaves the same trace. Nullification control for each guard.

## [363] TASK-THYROX-0640 — Isolate the pool lifecycle suite from the host's free disk

Status on board: pending

test-headless-pool-lifecycle.sh inherits the item worktree disk admission: with 989 MB free on the host, each case waits up to THYROX_ITEM_WORKTREE_DISK_WAIT_SECONDS (600 s) in item_worktree prepare (measured 2026-09-30 04:14-04:18, runtime6). test-item-worktree-sparse.sh already sets THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0. Declare the admission variables inside the suite, with a case that proves the result no longer depends on host disk, and a nullification control.

## [303] TASK-THYROX-0546 — Pool: ningún proceso de un ítem sobrevive al ítem (contención de procesos)

Status on board: in_progress

Separado de #302 (aislamiento de rutas del verify). Hallazgos: H-THYROX-255 (el runner sobrevive a wait-jobs kill por el grupo de proceso de timeout) y H-THYROX-257 (dos ítems medidos cuyos trabajos en segundo plano escribieron 4-5 s después del veredicto, pese a que la plantilla lo prohibía). Contrato: al publicar el veredicto (1) no queda ningún proceso descendiente del ítem; (2) ningún output del ítem sigue cambiando; (3) lo que quede en segundo plano se recoge o se termina antes del veredicto, sin depender del agente; (4) un ítem no cierra con trabajo pendiente de una notificación futura. Prueba obligatoria: ítem falso que deja un proceso escribiendo tras el comando principal; el pool lo recoge o lo termina y el output queda congelado al veredicto; control de anulación. Insumo medido (#309, 23a75680): en este anfitrión Podman 4.9.3 sobre cgroups v1 hace efectivos run, --pids-limit, --memory y la limpieza tras rm -f. La alternativa unshare + cgroup pids sigue sin medir; el mecanismo se elige con ambas medidas, vía pool.

## [322] TASK-THYROX-0601 — Pool: un ítem vivo escribe fuera del árbol; su salida entra al banco al terminar

Status on board: pending

Mientras un ítem de headless-pool corre, su stream, .err, .time y ledger crecen dentro de .claude/workbench/<banco>/outputs/ (versionado): el Stop hook exige árbol limpio en cada turno y cualquier snapshot queda atrasado. Opción A del ejecutor: el pool escribe en un directorio de trabajo fuera del árbol mientras el ítem vive y al terminar mueve todo al banco junto con el veredicto, en un solo commit. check_bench_untracked sigue midiendo lo mismo. Prueba: con un ítem en marcha, git status del árbol principal vacío; al terminar, el banco completo. Control de anulación: escribiendo directo al banco cae exactamente la aserción del árbol limpio. Se lanza por el pool después de integrar #198.

## [255] TASK-THYROX-0506 — Que headless-pool ejecute una copia fija de sí mismo (H-THYROX-242)

Status on board: in_progress

Editar src/session/headless-pool.sh mientras un pool corre lo mata a mitad (bash lee el guion por partes). Al arrancar, el pool debe re-ejecutarse desde una copia inmutable, o avisar al editar un guion que un proceso vivo ejecuta. TDD con un pool cuyo guion se modifica en vuelo.

## [347] TASK-THYROX-0624 — DocumentationPublisher — publish closed pool items to kaupamex-docs

Status on board: pending

New task, separate from TASK-THYROX-0601 and not part of the pool lifecycle. No technical dependency on the periodic-snapshot task: it needs a valid <n>.closed, a valid generation and a stable final result.

Flow: <n>.closed → DocumentationPublisher → kaupamex-docs. Verifies CLOSED and generation; resolves the consumer; reads a DocumentIntent produced by the item (consumer, initiative, document_kind, target under pm/<root>/iniciativas/<slug>/, expected_blob, source_run, source_item, source_generation, source_snapshot); takes a lock on the target file; creates a temporary kaupamex-docs worktree; checks the expected blob; writes the RST; runs the existing gates; makes its own commit; publishes its result.

Constraints (executor, 2026-09-29):
- consume only items with a valid <n>.closed; validate generation;
- outside the Daemon;
- resolve kaupamex-docs through src/paths/reach.py (THYROX_CONSUMER / THYROX_REACH_ROOT(S)); do NOT introduce THYROX_DOCS_ROOT;
- generate/modify RST following the real kaupamex-docs structure, never Markdown;
- temporary kaupamex-docs worktree;
- lock per target file;
- optimistic concurrency by the expected blob of the target file, not the repository HEAD (another file changing is not a conflict; the target changing is);
- reuse initiative placement, check_rst_sintaxis, check_vocabulario_prosa, check-artefactos-minimos and the pre-commit; do not duplicate any of them;
- a failure of the publisher never reopens or invalidates an item already CLOSED.

English identifiers (files, classes, functions, signatures); Spanish comments without colloquialisms, technical terms in English; clean-code. TDD with nullification controls.

## [346] TASK-GEN-0661 — DocumentationPublisher — publish closed items to kaupamex-docs (independent of 0601)

Status on board: pending

Separate consumer of closed pool items; NOT part of the pool lifecycle and not part of 0601. Starts after 0601c, 0601d and the conformity record.

Flow: <n>.closed → DocumentationPublisher → kaupamex-docs. Verifies CLOSED and generation; resolves the consumer; reads a DocumentIntent produced by the item (consumer, initiative, document_kind, target under pm/<root>/iniciativas/<slug>/, expected_blob, source_run, source_item, source_generation, source_snapshot); takes a lock on the target file; creates a temporary kaupamex-docs worktree; checks expected blob; writes the RST; runs the existing gates; commits; publishes its result.

Design constraints (from the executor, 2026-09-29):
- consume only items with a valid <n>.closed;
- outside the Daemon;
- RST output that follows the real kaupamex-docs structure;
- resolve kaupamex-docs through src/paths/reach.py (THYROX_CONSUMER / THYROX_REACH_ROOT(S)); do NOT introduce THYROX_DOCS_ROOT;
- lock per target file;
- optimistic concurrency by expected blob of the target file, not by the repository HEAD;
- temporary kaupamex-docs worktree;
- reuse kaupamex-docs gates (initiative placement, check_rst_sintaxis, check_vocabulario_prosa, check-artefactos-minimos, pre-commit); do not duplicate any of them.

Existing pieces to build on, not replace: bin/finding (rst/index/publish renders a finding from its store row). Known defect found 2026-09-29: `finding index` writes 3-cell rows into an index whose list-table has 4 columns; the pre-commit refused it.

## [345] TASK-THYROX-0623 — Record TASK-THYROX-0601 conformity in kaupamex-docs

Status on board: in_progress

Update the progreso of implementar-ciclo-de-vida-del-pool-thyrox with the conformity state against the architecture, each point with its measured evidence:
- I3 closure (publication refused with a live writer; the old control that expected publication with a writing child was invalid by the new contract, rewritten; nullification control).
- snapshot preservation (single final snapshot → periodic, once 0601d lands).
- generation takeover on recovery (0601c).
- salida.log already in the runtime: thyrox-bg writes .thyrox/runtime/jobs/<run>/salida.log while running and publishes it to outputs at the end (bg.sh:209, tests/session/test-bg-live-log.sh) — closed, no task.
- owner_pid of an item recorded from a subshell, which made reconcile declare live items abandoned; fixed in thyrox@c0739631.
Blocked by 0601c and 0601d.
