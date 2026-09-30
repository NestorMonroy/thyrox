```yml
created_at: 2026-04-17 22:37:43
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Análisis de Remediación — goto-problem-fix (ÉPICA 41)

> Síntesis de todos los hallazgos del ciclo audit + análisis de esta ÉPICA.
> Fuente de verdad para el plan de remediación (B8/B9).

---

## Origen de los hallazgos

| Fuente | Archivo | Hallazgos |
|--------|---------|-----------|
| Audit report | `track/goto-problem-fix-audit-report.md` | P1 (crítico), P2 (T-023 resuelto), T-020, P3 (T-009), P4 (PAT-004) |
| Templates audit | `analyze/templates/skill-templates-phase-fields-audit.md` | 3 templates legacy con phase: obsoleto |
| PAT-004 timing | `analyze/process/task-plan-sync-root-cause.md` | 3 fixes de framework (session-start, workflow-implement, TD-042) |
| Setup-template | `analyze/readme/setup-template-deprecation-analysis.md` | Eliminar Opción A del README |
| Catalog placement | `analyze/framework/audit-command-catalog-placement.md` | Agregar /thyrox:audit a SKILL.md |

---

## Inventario consolidado de pendientes

### Grupo A — Correcciones de auditoría (cerrar hallazgos del audit report)

| ID | Hallazgo | Estado original | Análisis actualizado | Acción |
|----|---------|-----------------|----------------------|--------|
| A-1 | Task plan: 25 T-NNN sin `[x]` (PAT-004 sistémico) | ❌ FAIL sistémico | Implementación verificada — solo falta sincronizar checkboxes | Commit retroactivo |
| A-2 | T-009: README setup-template.sh en Opción A | ⚠️ PARTIAL | Análisis completo en `readme/` — decisión: eliminar Opción A | Fix puntual |
| A-3 | T-017: grep setup-template → 3 matches | ⚠️ PARTIAL | Consecuencia de A-2 — se resuelve al mismo tiempo | — |
| A-4 | T-020: ROADMAP Stage 11 marcado [x] con WP abierto | ⚠️ PARTIAL | **Revisado:** ROADMAP es por milestones/releases (confirmado en `interview-answers.md`). Stage 11 en ROADMAP registra el milestone, no el estado de sesión. `now.md` es el estado de sesión. | Cerrar como SKIP — política confirmada |
| A-5 | T-023: documento auditoría templates faltante | ❌ FAIL | **Resuelto:** `analyze/templates/skill-templates-phase-fields-audit.md` creado | Marcar como PASS en audit report |

### Grupo B — Templates legacy (continuación B7)

| ID | Template | Hallazgo | Análisis actualizado | Acción |
|----|----------|---------|----------------------|--------|
| B-1 | `workflow-decompose/assets/legacy/categorization-plan.md.template` | `phase: 5 - DECOMPOSE` | En `legacy/` — archivado, no en uso activo. Sin referencias en SKILL.md ni en ningún workflow activo. | **SKIP** — legacy no requiere corrección de formato |
| B-2 | `workflow-structure/assets/legacy/document.md.template` | `phase: 4 - STRUCTURE` | En `legacy/` — archivado. Template base genérico reemplazado por templates específicos. | **SKIP** — legacy no requiere corrección |
| B-3 | `workflow-track/assets/legacy/analysis-phase.md.template` | `phase: 1 - ANALYZE` | En `legacy/` — archivado. Sin campo `phase:` en su metadata principal (usa otro formato). | **SKIP** — legacy no requiere corrección |

**Implicación:** B7 estaba COMPLETO para templates activos. Los 3 "pendientes" eran falsos positivos — el audit los detectó sin distinguir `legacy/` de templates activos. El documento `skill-templates-phase-fields-audit.md` debe actualizarse para marcarlos como SKIP.

### Grupo C — Mejoras al framework

| ID | Item | Fuente | Impacto | Tipo |
|----|------|--------|---------|------|
| C-1 | Agregar `/thyrox:audit` a `thyrox/SKILL.md` | `framework/audit-command-catalog-placement.md` | Alta visibilidad del nuevo skill | Feat |
| C-2 | PAT-004 prominence en `workflow-implement/SKILL.md` | `process/task-plan-sync-root-cause.md` Fix 1 | Previene recurrencia sistémica | Fix proceso |
| C-3 | `session-start.sh` maxdepth 1→2 | `process/task-plan-sync-root-cause.md` Fix 2 | Task plan en `plan-execution/` se vuelve visible | Fix script |
| C-4 | TD-042 en `technical-debt.md` | `process/task-plan-sync-root-cause.md` Fix 3 | Registrar validate-session-close PAT-004 check | TD backlog |

**C-1 decisión:** Opción B + C confirmada por el ejecutor:
- Modificar entrada Phase 11 en catálogo: agregar referencia a `/thyrox:audit`
- Agregar sección "Herramientas de calidad" después del catálogo

**C-2 análisis:** `workflow-implement/SKILL.md` ya tiene PAT-004 en línea 84 (`Actualizar checkbox en *-task-plan.md`), pero está enterrado en una lista de 8 pasos sin destacar. El fix es agregar un bloque visual `**PAT-004 — OBLIGATORIO:**` antes del paso, similar al tratamiento de `**PAT-004 — Checkbox-at-commit**` en `workflow-track/SKILL.md`.

**C-3 análisis:** `session-start.sh` línea 61: `find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md"` → no encuentra `plan-execution/*-task-plan.md`. El fix es cambiar a `maxdepth 2`. Riesgo bajo — solo afecta el display de la próxima tarea pendiente en el output del hook, no la ejecución.

**C-4 análisis:** TD-042 es un item de mejora a largo plazo (validate-session-close.sh con verificación PAT-004). No bloquea nada — va al backlog.

---

## Decisiones de scope

### ¿Qué entra al plan?

| Item | ¿Entra? | Razón |
|------|---------|-------|
| A-1 Sync checkboxes | ✅ Sí | Rápido, cierra FAIL crítico del audit |
| A-2/A-3 README Opción A | ✅ Sí | Riesgo bajo, documentación analizada |
| A-4 T-020 ROADMAP | ✅ Sí | Cerrar el PARTIAL — solo actualizar el audit report |
| A-5 T-023 | ✅ Sí | Actualizar audit report + templates audit (marcar legacy como SKIP) |
| B-1/B-2/B-3 templates legacy | ❌ No | SKIP — no son templates activos |
| C-1 SKILL.md catalog | ✅ Sí | Decisión aprobada, implementación clara |
| C-2 workflow-implement PAT-004 | ✅ Sí | Fix puntual, alta prevención |
| C-3 session-start.sh maxdepth | ✅ Sí | Fix puntual, causa raíz confirmada |
| C-4 TD-042 | ✅ Sí | Solo agregar entrada al backlog |

### ¿Qué queda fuera de scope?

- validate-session-close.sh PAT-004 check (complejo, va como TD-042)
- Reescritura completa de templates legacy (no activos)
- Otros TDs del backlog (TD-037..041)

---

## Agrupación en batches

**B8 — Correcciones de auditoría + README** (4 tareas, bajo riesgo)
- Sync checkboxes task plan original (A-1)
- Fix README Opción A (A-2/A-3)
- Actualizar audit report: T-020→SKIP, T-023→PASS (A-4/A-5)
- Actualizar templates audit: marcar legacy como SKIP (A-5 complemento)

**B9 — Mejoras al framework** (4 tareas, modifican SKILL.md)
- C-1: thyrox/SKILL.md — Phase 11 note + sección Herramientas de calidad
- C-2: workflow-implement/SKILL.md — PAT-004 prominence
- C-3: session-start.sh maxdepth 1→2
- C-4: technical-debt.md TD-042

**Cierre** (3 tareas)
- Actualizar now.md, focus.md
- Commit cierre + push
- Verificación final

---

## Dependencias

```
B8 (correcciones audit) — independiente
B9 (framework) — independiente, puede ejecutarse en paralelo con B8
Cierre — después de B8 + B9
```

B9-C1 (SKILL.md thyrox) y B9-C2 (workflow-implement/SKILL.md) tocan archivos distintos → pueden ejecutarse en un solo commit si se desea.

---

## Score proyectado post-remediación

| Dimensión | Score actual | Score proyectado |
|-----------|-------------|-----------------|
| Task Plan | 94% | 100% (todos los [x] sincronizados) |
| Artifacts | 96% | 100% (audit report actualizado) |
| Commits | 100% | 100% |
| Scripts | 100% | 100% (session-start.sh fix) |
| State | 83% | 100% (T-020 cerrado como SKIP) |
| **TOTAL** | **94%** | **~99%** (T-009 resuelto definitivamente) |
