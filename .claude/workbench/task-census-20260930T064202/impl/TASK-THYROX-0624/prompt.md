# TASK-THYROX-0624

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p1-pool-lifecycle.md`

## La tarea

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

## Estado medido por el censo: pendiente

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- DocumentationPublisher / DocumentIntent / documentation_publisher / document_intent: 0 hits in source (only agent-results/agent_store.sqlite3 task rows) — git grep -n -i -E 'DocumentationPublisher|documentation_publisher|DocumentIntent|document_intent' -- .
- expected_blob / expectedBlob: 0 hits in source — git grep -n -E 'expected_blob|expectedBlob' -- .
- commits mentioning the publisher touch only the task registry and a D4 bench README, no code: e0eb93706 (agent_store.sqlite3 only), 16621e1b3 (.claude/workbench/datos-d4-inventario-*/README.md, updated-at-resolution.txt) — git log --oneline -i --grep=0624 --grep=DocumentationPublisher --grep=publisher; git show --stat
- board row 347 status pending, layer_citation_id TASK-THYROX-0624, sibling row 346 TASK-GEN-0661 pending — python3 sqlite3 read-only query on agent-results/agent_store.sqlite3
- input <n>.closed manifest with generation and sha256 exists: src/session/pool_lifecycle.py:91 CLOSED_SUFFIX, :253 read_closed, :257 closed_generation, :384 publish, :490 manifest — grep -n in pool_lifecycle.py
- prerequisite suite green: 55 de 55 aserciones — PYTHONDONTWRITEBYTECODE=1 python3 tests/session/test_pool_lifecycle.py
- reach resolver present, THYROX_DOCS_ROOT not introduced: src/paths/reach.py:107 REACH_ROOTS_VAR, :560 invoking_consumer, :644 reach_roots; 0 hits for THYROX_DOCS_ROOT in src/bin/tests — git grep -n -E 'THYROX_CONSUMER|THYROX_REACH_ROOT|THYROX_DOCS_ROOT' -- src bin tests
- gates to reuse exist as thyrox wrappers: bin/check_rst_sintaxis:27 -> src/verify/check_rst_sintaxis.py, bin/check_vocabulario_prosa:27 -> src/verify/check_vocabulario_prosa.py, bin/check-artefactos-minimos:6 -> src/verify/check-artefactos-minimos.sh — git grep -n -E 'check_rst_sintaxis|check_vocabulario_prosa|check-artefactos-minimos' -- src bin tests
- initiative placement exists: src/docs/scaffold_initiative.py (pm/<submodulo>/iniciativas/<slug>/ via reach.root) — sed -n 1,30p
- lock primitive exists: src/session/shared_lock.py (mkdir <archivo>.lock, owner json) — sed -n 1,25p
- worktree helper exists for pool items, not for kaupamex-docs: src/session/item_worktree.sh:130 — git grep -n 'git worktree add|ls-tree' -- src/session
- kaupamex-docs reachable on host as git tree with .githooks, Makefile, source/gestion/pm/{api,db,docs,server,ui,...} — git -C /home/user/kaupamex-docs rev-parse --is-inside-work-tree; ls
- no DocumentIntent artefact is produced by items: 0 hits for 'intent'/'.intent' as artefact in src/session (only Spanish verb 'intentó') — git grep -n -i -E '\bintent\b|\.intent' -- src/session

## Lo que falta — tu alcance

- DocumentIntent schema and reader: consumer, initiative, document_kind, target under pm/<root>/iniciativas/<slug>/, expected_blob, source_run, source_item, source_generation, source_snapshot; produced by the item and read only when <n>.closed is valid and its generation matches (pool_lifecycle.read_closed / closed_generation)
- DocumentationPublisher module (English identifiers, outside the Daemon) that resolves kaupamex-docs through src/paths/reach.py, creates a temporary kaupamex-docs worktree, takes a shared_lock on the target file, compares the target file's current blob (git hash-object / ls-tree) against expected_blob and refuses on mismatch, writes RST via scaffold_initiative placement, runs check_rst_sintaxis, check_vocabulario_prosa, check-artefactos-minimos and the kaupamex-docs .githooks pre-commit, commits by pathspec, and publishes its result without touching the item's <n>.closed
- bin/ wrapper for the publisher (generate_bin.py --check must stay green)
- Test suite with nullification controls: invalid/missing <n>.closed refused, stale generation refused, expected_blob mismatch refused while an unrelated file change is accepted, publisher failure leaves <n>.closed intact, gates invoked not duplicated

## Archivos que te pertenecen

- src/session/documentation_publisher.py (new)
- src/session/document_intent.py or a section of the publisher module (new)
- bin/documentation_publisher (new, via src/session/generate_bin.py)
- tests/session/test_documentation_publisher.py (new)
- src/session/headless-pool.sh (only if the item must be told where to write its DocumentIntent)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- tests/session/test_pool_lifecycle.py: 55 de 55 aserciones en verde (prerequisite, measured)
- tests/session/test_documentation_publisher.py: to be written (closed/generation validation, blob-based optimistic concurrency, lock, gates reuse, no reopening of CLOSED items, each with its nullification control)

## Dependencias

- <n>.closed manifest with generation and sha256 from pool_lifecycle.py (present, suite green)
- TASK-THYROX-0623 (conformity record) is listed by the board as a sequencing predecessor in TASK-GEN-0661; no technical dependency measured
