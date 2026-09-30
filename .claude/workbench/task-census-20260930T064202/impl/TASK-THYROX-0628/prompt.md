# TASK-THYROX-0628

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p10-task-finding-identity.md`

## La tarea

## [351] TASK-THYROX-0628 — Publish the 79 findings that exist only as store rows

Status on board: pending

TASK-THYROX-0628. Executor decision 2026-09-29. (1) Explicit historical backfill, separate from DocumentationPublisher (0624 only governs future publication of closing pool items): render the 78 H-* rows + L-032 without .rst via bin/finding rst + bin/finding index and drop their baseline lines. (2) Invariant, enforced PRIMARILY at clean session close: SESSION_CLOSED ⇒ no durable finding of that session exists only in findings_history. On close: PENDING_RST findings are reconciled/published; if unresolved, REJECT the clean close. The grace window applies only while the producing session is alive; it never survives a clean close. A crash is not a clean close: it leaves recoverable state. (3) SECONDARY defence: thyrox pre-push runs the same gate (check_finding_id_unique half A, --strict) and rejects any persistent gap. (4) Only after gap = 0 AND the close gate is live may findings_history be reclassified as a rebuildable index that stops travelling between sessions. List: .claude/workbench/datos-d4-inventario-20260929T221846/findings-rebuildable.txt.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- Herramientas del backfill (bin/finding rst|index|publish): src/packages/finding/bin/finding.ts:59-78, commit 10c31c591 — `git log --oneline -- src/packages/finding/bin/finding.ts`
- Backfill NO ejecutado: 79 ids de la lista, 0 con .rst en kaupamex-docs (el único match fue sol-032, falso positivo de L-032) — `for id in $IDS; do find /home/user/kaupamex-docs/source -name "hallazgo-${id}-*.rst"; done` → con .rst: 0 de 79
- Hoy siguen 79 filas sólo en store (1664 filas, 1595 .rst), las mismas 79 de la lista — consulta ro a findings_history + rglob de hallazgo-H-*.rst en kaupamex-docs
- Baseline no vaciado: /home/user/kaupamex-docs/.claude/baselines/finding_id_unique_baseline.txt 84 líneas, H-THYROX-137 presente=1; el gate reporta '81 en baseline heredado' — `cd kaupamex-docs && check_finding_id_unique.py --strict` → exit 0, 0 huérfanas
- Pieza (2) alcance por sesión: check_finding_id_unique.py --session y pending_findings_for_session, commit 9899d0913 (Refs TASK-THYROX-0629) — `git log --oneline -- src/verify/check_finding_id_unique.py`
- Pieza (2) cierre limpio NO cableado: `git grep -n 'PENDING_RST\|SESSION_CLOSED\|pending_findings_for_session' -- src bin` → 0 hits fuera del gate y su test; `grep -n finding src/verify/validate-session-close.sh` → 0; `git grep -ln check_finding_id_unique -- src/hooks src/session` → 0
- Pieza (3) pre-push hecha: .githooks/pre-push corre bin/check_finding_id_unique --strict desde el consumidor y no bloquea si no puede medir, commit 9899d0913; `git config core.hooksPath` → .githooks
- Pieza (4) NO hecha: findings_history sigue clasificada para merge/viaje en src/agents/store_field_classes.py:71 y sin reclasificación — `grep -n findings_history src/agents/store_field_classes.py`
- L-032 no es cubierta por el renderer: src/packages/finding/index.ts:212,234 sólo escribe/busca hallazgo-<id>-*.rst; L-032 está en el store como fila (initiative verificar-hogares-de-sesion-thyrox) pero es lección, no hallazgo — consulta ro al store
- H-API-390 y H-SERVER-16 llevan session_id NULL en el store — consulta ro; el alcance --session no los ve

## Lo que falta — tu alcance

- (1) Renderizar los 78 H-* de findings-rebuildable.txt con `bin/finding rst <ID>` (con --body: la fila trae summary/content; validar que cada render cae en la iniciativa/submódulo correctos: docs, api, thyrox) y añadirlos al índice con `bin/finding index`, en kaupamex-docs
- (1) Publicar L-032 como lección en source/gestion/pm/thyrox/lecciones-aprendidas/ (bin/finding rst no genera esa forma; hace falta camino manual o extender el renderer)
- (1) Quitar las 79 entradas de /home/user/kaupamex-docs/.claude/baselines/finding_id_unique_baseline.txt y verificar que `check_finding_id_unique.py --strict` sigue en 0 huérfanas desde kaupamex-docs
- (2) Cablear pending_findings_for_session en el evento de cierre limpio y RECHAZAR el cierre si queda algo pendiente — bloqueado hasta que TASK-THYROX-0630 decida cuál es ese evento
- (2) Definir qué pasa con filas con session_id NULL (H-API-390, H-SERVER-16): el alcance --session no las ve; sólo el pre-push las cubre
- (4) Reclasificar findings_history como índice reconstruible en store_field_classes.py / merge_sqlite_union.py sólo tras gap=0 y gate de cierre vivo

## Archivos que te pertenecen

- /home/user/kaupamex-docs/source/gestion/pm/**/hallazgos/hallazgo-H-*.rst (78 nuevos) y sus índices de iniciativa
- /home/user/kaupamex-docs/source/gestion/pm/thyrox/lecciones-aprendidas/ (L-032)
- /home/user/kaupamex-docs/.claude/baselines/finding_id_unique_baseline.txt
- src/verify/validate-session-close.sh (o el evento que 0630 decida)
- src/packages/finding/index.ts (si se extiende a lecciones)
- src/agents/store_field_classes.py, src/agents/merge_sqlite_union.py (pieza 4)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- python3 tests/verify/test_finding_id_unique.py — 19 aprobadas · 0 fallidas (con PYTHONPATH absoluto; con PYTHONPATH relativo caen 10 por ModuleNotFoundError en el subproceso, artefacto de invocación)
- bash tests/verify/test_pre_push_finding_gate.sh — 9 de 9 aserciones en verde
- bun test __tests__/finding.test.ts (src/packages/finding) — 14 pass · 0 fail · 39 expect
- Por escribir: prueba de que el cierre limpio rechaza con una fila PENDING_RST de su sesión y acepta sin ella (anulación: retirar el cableado y que caiga sólo ese caso); prueba de backfill que mida 0 sólo-fila tras vaciar el baseline

## Dependencias

- TASK-THYROX-0630 (evento de cierre limpio y forma de rechazo) para la pieza 2
- TASK-THYROX-0629 ya aportó --session y el pre-push (commit 9899d0913)
