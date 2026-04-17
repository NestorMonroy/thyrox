```yml
created_at: 2026-04-17 22:15:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Templates Audit — goto-problem-fix (B7 Retrospectivo)

> Artefacto de T-023. Registra el análisis de todos los templates `assets/*.md.template`
> en skills `workflow-*` y `thyrox`, ejecutado para ÉPICA 41 Batch 7.

---

## Scope del audit

**Criterios de búsqueda:**
- Campo `phase:` con formato incorrecto (no sigue `Phase N — PHASE_NAME`)
- Referencias a "cajón" (terminología deprecada → "stage directory")
- Ejemplos de naming invertido (`{type}-{content}.md`)

**Total templates auditados:** 46
**Templates con hallazgos:** 8

---

## Hallazgos y estado

| # | Skill | Template | Hallazgo | Tipo | Prioridad | Estado |
|---|-------|----------|---------|------|-----------|--------|
| 1 | `thyrox` | `error-report.md.template` | `phase: Phase N (PHASE_NAME)` → formato con paréntesis en lugar de em-dash | Formato `phase:` | Alta | ✅ Corregido en B7 |
| 2 | `workflow-discover` | `end-user-context.md.template` | `phase: Phase 1 — ANALYZE (Step 0)` → Stage renombrado + texto body | Nombre Stage obsoleto | Alta | ✅ Corregido en B7 |
| 3 | `workflow-scope` | `plan.md.template` | `phase: 3 - PLAN` → formato antiguo sin "Phase" y número de Stage incorrecto | Formato `phase:` + Stage incorrecto | Alta | ✅ Corregido en B7 |
| 4 | `workflow-implement` | `ad-hoc-tasks.md.template` | `phase: 5 - DECOMPOSE / 6 - EXECUTE` → formato antiguo con múltiples Stages | Formato `phase:` obsoleto | Alta | ✅ Corregido en B7 |
| 5 | `workflow-track` | `refactors.md.template` | `phase: 5 - DECOMPOSE / 6 - EXECUTE` → formato antiguo con múltiples Stages | Formato `phase:` obsoleto | Alta | ✅ Corregido en B7 |
| 6 | `workflow-decompose` | `categorization-plan.md.template` | `phase: 5 - DECOMPOSE` → formato antiguo | Formato `phase:` obsoleto | Alta | ❌ **Pendiente** |
| 7 | `workflow-structure` | `document.md.template` | `phase: 4 - STRUCTURE` → formato antiguo | Formato `phase:` obsoleto | Alta | ❌ **Pendiente** |
| 8 | `workflow-track` | `analysis-phase.md.template` | `phase: 1 - ANALYZE` → Stage renombrado (ANALYZE → DISCOVER para Stage 1) | Nombre Stage obsoleto | Alta | ❌ **Pendiente** |

**Sin hallazgos de:** cajón/cajon (0 en todos), naming invertido (0), campos `phase:` vacíos sin valor (aceptable — campo opcional si no hay fase fija).

---

## Templates sin campo `phase:` (no aplica corrección)

Los siguientes templates no tienen campo `phase:` porque son multi-stage, reutilizables, o son artefactos de cierre sin fase fija. **No son hallazgos** — es comportamiento correcto.

| Template | Razón de ausencia |
|----------|------------------|
| `risk-register.md.template` | Vive Phase 1→6 — se actualiza a lo largo del WP |
| `exit-conditions.md.template` | Se crea en Phase 1 pero aplica a todas las fases |
| `lessons-learned.md.template` | Artefacto de cierre, fase ya implícita en el stage directory |
| `wp-changelog.md.template` | Ídem |
| `tasks.md.template` (workflow-decompose) | Template legacy; `plan-execution.md.template` es el canónico |
| Templates de sub-análisis (stakeholders, use-cases, etc.) | Su fase viene del stage directory que los contiene |

---

## Causa raíz de los hallazgos

**Raíz común:** Todos los templates afectados fueron creados entre FASE 1-28 cuando el framework usaba nomenclatura `N - NOMBRE` (e.g., `5 - DECOMPOSE`). La migración a `Phase N — PHASE_NAME` (ÉPICA 39) actualizó el SKILL.md y los documentos principales pero no propagó los fixes a todos los templates de assets.

**Pattern:** Los templates de `workflow-*` que tienen campo `phase:` hardcodeado son los más vulnerables a este drift — cada renaming del framework los deja desactualizados.

**Mitigación propuesta (TD para framework):** Agregar en `_generator.sh` o en un script de validación la verificación `grep "phase:" assets/*.md.template | grep -v "Phase [0-9]"` para detectar formatos no-canónicos automáticamente.

---

## Templates pendientes de corrección

Los 3 templates con ❌ deben corregirse en una tarea de seguimiento:

```bash
# workflow-decompose/assets/categorization-plan.md.template
# Cambiar: phase: 5 - DECOMPOSE
# Por:     phase: Stage 8 — PLAN EXECUTION
# (categorization-plan es artefacto de Phase 8, no Phase 5 del SDLC viejo)

# workflow-structure/assets/document.md.template
# Cambiar: phase: 4 - STRUCTURE
# Por:     phase: Phase 7 — DESIGN/SPECIFY

# workflow-track/assets/analysis-phase.md.template
# Cambiar: phase: 1 - ANALYZE
# Por:     phase: Phase 3 — ANALYZE  (Stage 3 DIAGNOSE en terminología THYROX)
#          O: phase: Phase 1 — DISCOVER  (si el template aplica a Stage 1)
#          → Revisar el contenido del template para determinar cuál aplica
```

---

## Commit de referencia (B7)

```
cbc261f — docs(goto-problem-fix): align skill templates with stage-directory naming convention E-1
Fecha: 2026-04-17 21:33:23
Archivos: 5 templates corregidos
```

Estado: **5/8 corregidos**. 3 pendientes (hallados post-commit — no estaban en scope inicial de B7).
