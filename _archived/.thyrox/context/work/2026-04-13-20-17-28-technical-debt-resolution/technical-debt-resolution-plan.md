```yml
created_at: 2026-04-13 20:50:00
wp: 2026-04-13-20-17-28-technical-debt-resolution
fase: FASE 34
phase: 3 — PLAN
status: Pendiente aprobación
```

# Plan — technical-debt-resolution (FASE 34)

## Scope Statement

**Problema:** El registro `technical-debt.md` tiene 7 TDs activos con soluciones concretas identificadas que nunca se implementaron porque quedaron diferidos en FASEs anteriores. Cada TD agrega fricción operacional o inconsistencia en el framework.

**Usuarios:** Claude (como agente operativo del framework THYROX) y el usuario que trabaja con él. Un framework con deuda no resuelta genera comportamiento inconsistente entre sesiones.

**Criterios de éxito:**
- 7 TDs marcados `[x]` en `technical-debt.md` con fecha 2026-04-13
- `validate-session-close.sh` detecta timestamps incompletos automáticamente
- `workflow-strategy/SKILL.md` incluye tabla de re-evaluación de tamaño de WP
- `thyrox/SKILL.md` tiene tabla completa de categorías de archivo con criterio auto-write/gate
- `settings.json` incluye `Write(/.claude/references/**)` en el allow list
- `project-status.sh` alerta si archivo vivo supera 25,000 bytes
- `agent-spec.md`, `task-executor.md` y `task-planner.md` documentan `state_file`

---

## In-Scope

| TD | Trabajo concreto | Archivos afectados |
|----|-----------------|-------------------|
| **TD-001** | Agregar detección de `created_at: YYYY-MM-DD$` (sin hora) en `validate-session-close.sh` | `.claude/scripts/validate-session-close.sh` |
| **TD-003** | Auditar 6 templates huérfanos: mapear `ad-hoc-tasks.md.template` a Phase 6, mover 4 a `assets/legacy/`, evaluar `refactors.md.template` | `.claude/skills/workflow-*/assets/` |
| **TD-009** | Agregar campo `state_file` en `agent-spec.md` + instrucción `now-{agent-name}.md` en `task-executor.md` y `task-planner.md` | `.claude/references/agent-spec.md`, `.claude/agents/task-executor.md`, `.claude/agents/task-planner.md` |
| **TD-018** | Corregir `created_at` en `framework-evolution-execution-log.md` a formato `YYYY-MM-DD HH:MM:SS` | `.claude/context/work/2026-04-08-*/framework-evolution-execution-log.md` |
| **TD-027** | Completar tabla de categorías en `thyrox/SKILL.md` (faltan: References, ADRs, Scripts operacionales) + agregar `Write(/.claude/references/**)` en `settings.json` | `.claude/skills/thyrox/SKILL.md`, `.claude/settings.json` |
| **TD-028** | Agregar sección `## Re-evaluación de tamaño post-estrategia` en `workflow-strategy/SKILL.md` con tabla de decisión | `.claude/skills/workflow-strategy/SKILL.md` |
| **TD-035** | Agregar bloque de validación de tamaño en `project-status.sh` para 4 archivos vivos (ROADMAP, CHANGELOG, technical-debt, conventions) | `.claude/scripts/project-status.sh` |

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| TD-010 (benchmark empírico) | Trigger no activado — requiere caso de uso real que justifique el tiempo |
| Corrección retroactiva de WPs históricos cerrados (excepto TD-018) | ADR-008: Git as persistence. Solo se corrige el execution-log activo de TD-018 |
| Nuevas validaciones más allá de las especificadas en cada TD | Sin scope creep — implementar exactamente lo que cada TD describe |
| Cambios arquitectónicos en Stopping Point Manifest | Sin nueva arquitectura |
| Agregar nuevos TDs detectados durante la ejecución | Registrar como candidatos para FASE 35 |

---

## Dependencias entre TDs

```
TD-027 (settings.json)  → ejecutar antes que TD-035 (project-status usa references)
TD-009 (agent-spec.md)  → independiente
TD-028 (workflow-strategy) → independiente
TD-001 (validate-session-close.sh) → independiente
TD-003 (templates) → independiente
TD-018 (execution-log fix) → independiente
```

Orden de ejecución sugerido (por commit):
```
C1: TD-027 — thyrox/SKILL.md + settings.json   [requiere Prompt ask → primero]
C2: TD-028 — workflow-strategy/SKILL.md         [requiere Prompt ask → inmediato después]
C3: TD-009 — agent-spec + task-executor + task-planner
C4: TD-001 — validate-session-close.sh
C5: TD-003 — templates audit (mapear/legacy)
C6: TD-018 — execution-log timestamp fix
C7: TD-035 — project-status.sh alerta de tamaño
C8: cierre — technical-debt.md 7 TDs marcados [x]
```

---

## Commits planificados

| Commit | TDs | Descripción |
|--------|-----|-------------|
| C1 | TD-027 | `fix(framework): completar tabla auto-write en SKILL.md + allow references en settings.json` |
| C2 | TD-028 | `fix(workflow): agregar re-evaluación de tamaño WP en workflow-strategy/SKILL.md` |
| C3 | TD-009 | `fix(agents): agregar state_file en agent-spec + now-{agent-name} en task-executor y task-planner` |
| C4 | TD-001 | `fix(scripts): detectar timestamps incompletos en validate-session-close.sh` |
| C5 | TD-003 | `fix(templates): mapear ad-hoc-tasks a Phase 6 + mover 4 templates huérfanos a legacy/` |
| C6 | TD-018 | `fix(artefactos): corregir timestamps en framework-evolution-execution-log.md` |
| C7 | TD-035 | `fix(scripts): agregar alerta REGLA-LONGEV-001 en project-status.sh` |
| C8 | cierre | `chore(technical-debt): marcar 7 TDs resueltos [x] en technical-debt.md` |

---

## Fases omitidas

- **Phase 2 SOLUTION_STRATEGY:** cada TD tiene solución ya identificada en análisis. Sin alternativas arquitectónicas que evaluar.
- **Phase 4 STRUCTURE:** cambios quirúrgicos en archivos existentes. El plan describe el trabajo con suficiente granularidad. Sin spec formal requerida.

Ambas omisiones aprobadas en Gate SP-01.

---

## Riesgos activos

| Riesgo | Mitigación |
|--------|-----------|
| `thyrox/SKILL.md` y `settings.json` requieren Prompt (ask) | Ejecutar secuencialmente, una aprobación por archivo |
| `project-status.sh` alerta puede tener false positives | Agregar `[ -f archivo ]` antes de `wc -c` |
| TD-003: decisión incorrecta sobre templates puede eliminar algo útil | Mover a `legacy/` (no eliminar) como primera acción |
