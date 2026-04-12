```yml
created_at: 2026-04-12 00:00:00
feature: technical-debt-audit
wp: 2026-04-11-23-27-08-technical-debt-audit
fase: FASE 32
tds_resueltos: 10
```

# TDs Resueltos — technical-debt-audit

> Registro de deudas técnicas cerradas durante FASE 32.
> Fuente: `.claude/context/technical-debt.md` — entradas auditadas o implementadas en este WP.

---

## Grupo A — TDs auditados (ya implementados en FASEs anteriores)

> `[x]` = status desactualizado — auditado en FASE 32 y confirmado implementado.

| TD | Descripción | Implementado en | Evidencia |
|----|-------------|-----------------|-----------|
| TD-006 | thyrox debe ser thin orchestrator | FASE 23/29/31 | `thyrox/SKILL.md` = 209 líneas catálogo, lógica en `workflow-*/SKILL.md`. Arquitectura lograda. |
| TD-007 | Phase 1 carece de Step 0 END USER CONTEXT | FASE 28 | `workflow-analyze/SKILL.md` líneas 46-53: sección "Step 0 — Contexto del usuario final (TD-007)" |
| TD-008 | /workflow_* commands desactualizados | FASE 23/29/31 | `workflow-*/SKILL.md` con lógica completa. `COMMANDS_SYNCED=true` en `session-start.sh` |
| TD-029 | Sin doble validación al transitar entre fases | FASE 28+ | Todos los 7 `workflow-*/SKILL.md` tienen sección "Validaciones pre-gate" con criterios TD-029 |
| TD-031 | workflow-*/SKILL.md no incluyen deep review pre-gate | FASE 28+ | Todos los 7 `workflow-*/SKILL.md` tienen "TD-031 deep review" en sus validaciones pre-gate |
| TD-032 | GAPs de Phase 6 no prevenidos | FASE 28+ | `workflow-execute/SKILL.md` líneas 92-103: "Validaciones pre-gate 6→7" con checklist completo |
| TD-033 | now.md no se incluye en commits automáticamente | FASE 28+ | Todos los 7 `workflow-*/SKILL.md` tienen "TD-033 now.md: git add antes de commits y gates" |

---

## Grupo B — TDs implementados en FASE 32

> `[x]` = implementado en este WP.

| TD | Descripción | Implementación | Fecha |
|----|-------------|----------------|-------|
| TD-038 | Reglas `Edit(...)` redundantes en settings.json | Eliminadas 3 reglas `Edit(/.claude/context/*)` de `allow`. `tool-execution-model.md` ejemplo actualizado. | 2026-04-12 |
| TD-039 | subagent-patterns.md no documenta async_suitable | `async_suitable: true` añadido a `agents/deep-review.md` y `agents/task-planner.md` frontmatter | 2026-04-12 |
| TD-040 | Gates de fase no instruyen actualizar artefacto principal | Gate humano añadido a `workflow-plan/SKILL.md`. Artefact update step añadido a `workflow-strategy` y `workflow-structure` gates. Campo `status` añadido a `requirements-specification.md.template` | 2026-04-12 |

---

## Notas

- TD-006/007/008/029/031/032/033: status actualizado en `technical-debt.md` con fecha de auditoría `2026-04-11` (fecha del descubrimiento, no de ejecución).
- TD-038/039/040: implementados y verificados en Phase 6 EXECUTE de FASE 32.
- REGLA-LONGEV-001: tras crear este archivo, se eliminaron de `technical-debt.md` todas las entradas `[x]` de FASE 29, FASE 31 y FASE 32 (22 entradas en total).
