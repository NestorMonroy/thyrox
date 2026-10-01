# p10-task-finding-identity

## [298] TASK-THYROX-0541 — Task identity — reconcile this session's 28 stored rows to their board ordinals, then assign IDs to the 274 pending cards

Status on board: pending

PROCESO, no pool: lee /root/.claude/tasks/<session> (fuera del repo) y escribe agent_store.sqlite3 (binario, resuelto por THYROX_ROOT). Determinista: link-board-ordinal + ingest-board vía thyrox-bg en el árbol principal, con medición antes/después.

## [299] TASK-THYROX-0542 — Task identity — replace board ordinals in this session's bench files with their durable citations

Status on board: pending

Vía pool, un ítem por banco (disjuntos por archivo; juicio por #N: tarjeta del board, PR u otro). Necesita el mapa ordinal→TASK-THYROX-NNNN de #298. Riesgo: .claude/workbench es ruta sensible para el runner.

## [351] TASK-THYROX-0628 — Publish the 79 findings that exist only as store rows

Status on board: pending

TASK-THYROX-0628. Executor decision 2026-09-29. (1) Explicit historical backfill, separate from DocumentationPublisher (0624 only governs future publication of closing pool items): render the 78 H-* rows + L-032 without .rst via bin/finding rst + bin/finding index and drop their baseline lines. (2) Invariant, enforced PRIMARILY at clean session close: SESSION_CLOSED ⇒ no durable finding of that session exists only in findings_history. On close: PENDING_RST findings are reconciled/published; if unresolved, REJECT the clean close. The grace window applies only while the producing session is alive; it never survives a clean close. A crash is not a clean close: it leaves recoverable state. (3) SECONDARY defence: thyrox pre-push runs the same gate (check_finding_id_unique half A, --strict) and rejects any persistent gap. (4) Only after gap = 0 AND the close gate is live may findings_history be reclassified as a rebuildable index that stops travelling between sessions. List: .claude/workbench/datos-d4-inventario-20260929T221846/findings-rebuildable.txt.

## [353] TASK-THYROX-0630 — Decide and wire the clean session-close event for the finding invariant

Status on board: pending

Executor decision 2026-09-29: the primary enforcement of 'SESSION_CLOSED => no durable finding of the session only in findings_history' is a clean session close that can be rejected. Measured: no such event exists in thyrox today — the Stop hook fires at every turn end and validate-session-close.sh only warns. Decide which event is the clean close (and how a rejection is surfaced), then wire the session-scoped gate from the sibling task into it. Crash is not a clean close.
