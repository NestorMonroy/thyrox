# TASK-THYROX-0630

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p10-task-finding-identity.md`

## La tarea

## [353] TASK-THYROX-0630 — Decide and wire the clean session-close event for the finding invariant

Status on board: pending

Executor decision 2026-09-29: the primary enforcement of 'SESSION_CLOSED => no durable finding of the session only in findings_history' is a clean session close that can be rejected. Measured: no such event exists in thyrox today — the Stop hook fires at every turn end and validate-session-close.sh only warns. Decide which event is the clean close (and how a rejection is surfaced), then wire the session-scoped gate from the sibling task into it. Crash is not a clean close.

## Estado medido por el censo: pendiente

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- session-scoped gate (sibling TASK-THYROX-0629) exists: src/verify/check_finding_id_unique.py:157 `pending_findings_for_session` + `--session` — `git log --oneline -S'pending_findings_for_session' -- src/verify/check_finding_id_unique.py` → 9899d0913
- sibling commit declares the close event undecided: commit 9899d0913 body «The primary one is the clean session close, whose event is still undecided (TASK-THYROX-0630)» — `git show --format=%b 9899d0913`
- the gate function does not wire any event: src/verify/check_finding_id_unique.py:164-165 «Esta función sólo expone el resultado; no cablea ningún evento de cierre» — `sed -n 140,170p src/verify/check_finding_id_unique.py`
- no caller of the session-scoped read outside the gate and its test: only tests/verify/test_finding_id_unique.py:257,261 — `git grep -n pending_findings_for_session -- src tests bin .githooks`
- no clean-close vocabulary in the tree: `git grep -n -i 'clean.\?close\|SESSION_CLOSED\|session_closed' -- src tests bin` → only the docstring above and unrelated bridge/proxy comments
- validate-session-close.sh does not consult the finding gate: `git grep -n -i 'finding\|hallazgo' -- src/verify/validate-session-close.sh` → 0 hits; it exits 2 only on its own BLOCK_COUNT (line 163)
- Stop wiring declared by the provider runs only sync_local_settings: src/session/sync_local_settings.py:221-230 — `sed -n 205,245p src/session/sync_local_settings.py`
- SessionEnd is dispatched by the agent loop (src/packages/agent/loop/hooks.ts:25) but nothing in src/session or src/hooks listens to it: `git grep -n SessionEnd -- src/session src/hooks` → 0 hits
- no later commit touches the task: `git log --oneline --grep='0630\|clean close\|cierre limpio\|session close' 9899d0913..HEAD` → 0 of 98 commits
- the referenced contract «README de D4-A, §8» is not in this tree: `rg -l 'D4-A' --hidden -g '!.git' .` → only files that cite it, no README
- secondary defence in place and green: .githooks/pre-push:56 runs the gate `--strict` — `bash tests/verify/test_pre_push_finding_gate.sh` → 9 de 9 aserciones en verde
- gate suite green: `python3 tests/verify/test_finding_id_unique.py` → 19 aprobada(s) · 0 fallida(s)

## Lo que falta — tu alcance

- Decide which event is the clean session close (candidates measured: Stop fires every turn end; SessionEnd exists in the agent loop but has no provider listener; validate-session-close.sh runs under Stop and only warns) and record the decision with its rejection surface (exit 2 + stderr under Stop, or a SessionEnd handler that cannot veto)
- Wire `pending_findings_for_session(session_id)` / `bin/check_finding_id_unique --session <id> --strict` into that event so a non-empty result rejects the close and names the pending H-<PREFIJO>-N ids
- Declare crash ≠ clean close in the wiring (no gate on abnormal termination) and expose the wiring through `declared_wiring()` so `tests/session/test_user_wiring.py` sees it
- Write the contract text the code already cites (README D4-A §8) or repoint the docstrings to where the decision lives

## Archivos que te pertenecen

- src/session/user_wiring.py
- src/session/sync_local_settings.py
- src/hooks/stop_gate.py
- src/verify/validate-session-close.sh
- src/verify/check_finding_id_unique.py
- .claude/rules/trabajo-en-segundo-plano.md or a new rule for the clean-close event

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- tests/verify/test_finding_id_unique.py — 19 aprobadas / 0 fallidas (measured)
- tests/verify/test_pre_push_finding_gate.sh — 9 de 9 (measured)
- to write: tests/session/test_session_close_finding_gate.(py|sh) — a session with a store-only finding is rejected at the chosen event with the id named; a session with its .rst passes; a crash path does not invoke the gate; annulment of the wiring drops exactly the rejection case
- to extend: tests/session/test_user_wiring.py — the close event appears in declared_wiring()

## Dependencias

- TASK-THYROX-0629 (done in 9899d0913)
- executor decision on which event is the clean close and how rejection is surfaced
