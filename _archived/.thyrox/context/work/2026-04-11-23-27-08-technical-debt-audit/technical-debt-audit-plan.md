```yml
created_at: 2026-04-11 23:27:08
wp: 2026-04-11-23-27-08-technical-debt-audit
phase: 3 - PLAN
status: Aprobado — 2026-04-11
```

# Plan — technical-debt-audit (FASE 32)

## Scope Statement

**Problema:** `technical-debt.md` tiene 70,360 bytes con 24 TDs activos: algunos ya implementados con status desactualizado, otros con alta prioridad sin implementar que degradan la confiabilidad de cada nuevo WP. El archivo excede REGLA-LONGEV-001 y no puede leerse en una sola llamada.

**Usuarios:** Nestor Monroy (framework author) y futuras sesiones de Claude que dependen de `workflow-*/SKILL.md` para gestionar WPs con THYROX correctamente.

**Criterios de éxito:**
- `technical-debt.md` < 25,000 bytes (solo entradas `[ ]` activas)
- TDs confirmados como implementados (TD-006, TD-007, TD-008) marcados `[x]` y distribuidos al resolved file de FASE 32
- 6 TDs de Grupo B implementados y verificables en los archivos correspondientes
- `settings.json` sin las 3 reglas `Edit(...)` redundantes
- `workflow-plan/SKILL.md` tiene sección `## Gate humano`

---

## In-Scope

### Grupo A — Cerrar TDs con status desactualizado

| TD | Acción | Archivo destino |
|----|--------|----------------|
| TD-007 | Marcar `[x]` en `technical-debt.md` | FASE 32 WP resolved file |
| TD-008 | Marcar `[x]` en `technical-debt.md` | FASE 32 WP resolved file |
| TD-006 | Marcar `[x]` en `technical-debt.md` | FASE 32 WP resolved file |
| TD-039 | Completar: añadir `async_suitable` a 2 agentes (`deep-review`, `task-planner`) | `agents/deep-review.md`, `agents/task-planner.md` → FASE 32 resolved |

### Grupo B — Implementar TDs de alta prioridad

| TD | Archivos afectados (verificados existentes) |
|----|---------------------------------------------|
| TD-038 | `.claude/settings.json` + `.claude/references/tool-execution-model.md` |
| TD-040 | `.claude/skills/workflow-plan/SKILL.md` (Gate humano) + 5 `workflow-*/SKILL.md` gates |
| TD-029+031+033 | 7 `workflow-*/SKILL.md` — sección unificada "Validaciones pre-gate" |
| TD-032 | `.claude/skills/workflow-execute/SKILL.md` — pre-flight checklist Phase 6→7 |

### REGLA-LONGEV-001 — Limpieza de technical-debt.md

Eliminar las entradas `[x]` ya distribuidas a sus WP resolved files:

| TDs a eliminar | Ya en WP resolved de... |
|----------------|------------------------|
| TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 | FASE 29 WP (verificado) |
| TD-036, TD-037 | FASE 31 WP (verificado) |
| TD-006, TD-007, TD-008, TD-039 + Grupo B | FASE 32 WP (este WP) |

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| TD-028: Re-evaluación tamaño WP post-Phase 2 | Media prioridad — FASE 33 |
| TD-034: CHANGELOG.md split | Alta severidad pero gran scope — WP propio FASE 33 |
| TD-035: REGLA-LONGEV-001 en conventions.md | Incluir en FASE 33 junto a TD-034 |
| TD-026: ROADMAP.md split | Media prioridad — FASE 33 |
| TD-001: Timestamps incompletos en artefactos | Media prioridad — FASE 33 |
| TD-018: execution-log timestamp | Baja prioridad — FASE 33 |
| TD-025: skill-authoring.md desactualizado | Baja prioridad — FASE 33 |
| TD-005: Arquitectura orquestador+agentes | Requiere WP estratégico propio |
| TD-009: now-{agent-name}.md en agentes | Requiere WP de agentes |
| TD-010: Benchmark empírico | Trigger = caso de uso real |
| TD-022: Limitaciones triggering en workflow-* | Baja; diferir |
| TD-030: Renombrar Phase N | Baja relevancia post-FASE 31 |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|------------|-----------------|
| Grupo A — status updates (4 TDs) | 3 |
| TD-038 — settings.json limpieza | 2 |
| TD-040 — gates (workflow-plan + 5 SKILLs) | 6 |
| TD-029+031+033 — validaciones pre-gate (7 SKILLs) | 7 |
| TD-032 — pre-flight Phase 6→7 | 1 |
| Distribución a resolved files + REGLA-LONGEV-001 cleanup | 5 |
| **Total** | **~24 tareas** |

Clasificación: mediano
Fases activas: 1, 2, 3, 4, 5, 6, 7

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 32](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-11
