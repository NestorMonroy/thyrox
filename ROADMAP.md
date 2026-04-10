```yml
Tipo: Plan Maestro
Categoría: Gestión de Proyecto
Versión: 0.2.0
Propósito: Plan maestro de trabajo y tracking de progreso — FASEs activas (27+)
Objetivo: Documentar fases, epics, y estado actual del proyecto
Fecha actualización: 2026-04-10
```

# ROADMAP - THYROX

## Propósito

Plan maestro del proyecto THYROX. Fuente única de verdad para el estado del trabajo.

> **FASEs 1-26 archivadas** en [ROADMAP-history.md](ROADMAP-history.md) por REGLA-LONGEV-001 (archivo superó 25,000 bytes — FASE 29).

---

## Convenciones

- `[ ]` = Pendiente
- `[-]` = En Progreso
- `[x]` = Completado (YYYY-MM-DD)

---

## FASE 27: agentic-loop — Mecanismo de ejecución continua con /loop (2026-04-09)

**WP:** `.claude/context/work/2026-04-09-17-22-48-agentic-loop/`
**Causa raíz:** Sin mecanismo para ejecutar workflows de forma repetitiva sin intervención manual.

- [ ] Phase 1 ANALYZE — completado, gate 1→2 pendiente aprobación usuario

---

## FASE 28: auto-operations — Sincronización determinista de now.md via hooks reactivos (2026-04-09)

**WP:** `.claude/context/work/2026-04-09-17-28-34-auto-operations/`
**Causa raíz:** 3 bugs de sincronización de estado (Bug 1: echo append YAML, Bug 2: current_work sin hook, Bug 4: cierre WP LLM-dependiente).

### Fase A — Scripts nuevos

- [x] T-001: Crear `set-session-phase.sh` — reemplaza `phase:` in-place via sed — 2026-04-09
- [x] T-002: Crear `sync-wp-state.sh` — PostToolUse hook para `current_work` — 2026-04-09
- [x] T-003: Crear `close-wp.sh` — cierra WP seteando null — 2026-04-09
- [x] T-004: chmod +x en los 3 scripts — 2026-04-09
- [x] T-018: Commit Fase A — 2026-04-09

### Fase B — Edición de configuración

- [x] T-005: settings.json — agregar PostToolUse Write hook → sync-wp-state.sh — 2026-04-09
- [x] T-006..T-012: 7 workflow-*/SKILL.md — echo→set-session-phase + updated_at — 2026-04-09
- [x] T-013: workflow-track/SKILL.md cuerpo — fila now.md → bash close-wp.sh — 2026-04-09
- [x] T-019: Commit Fase B — 2026-04-09

### Fase C — Validación

- [x] T-014: Test set-session-phase.sh — PASS — 2026-04-09
- [x] T-015: Test sync-wp-state.sh — PASS — 2026-04-09
- [x] T-016: Test close-wp.sh — PASS — 2026-04-09
- [x] T-017: Test integración — Step 1+3 PASS / Step 2 requiere nueva sesión — 2026-04-09

### Fase D — Cierre

- [x] T-020: git push — 2026-04-09

---

## FASE 29: technical-debt-resolution — Resolución de Deuda Técnica del Framework (2026-04-09)

**WP:** `.claude/context/work/2026-04-09-22-47-58-technical-debt-resolution/`
**Causa raíz:** 35 TDs acumulados durante FASEs 1–28; 3 archivos críticos superan límite Read tool; skill orquestador con nombre incorrecto; workflows sin validaciones pre-gate.

### Grupo 1 — Renombrado pm-thyrox → thyrox

- [x] Mover directorio `.claude/skills/pm-thyrox/` → `.claude/skills/thyrox/` — 2026-04-10
- [x] Actualizar referencias en CLAUDE.md (6), scripts (5), workflow-*/SKILL.md (3), references/*.md (~10) — 2026-04-10
- [x] Actualizar Locked Decision #5 addendum en CLAUDE.md — 2026-04-10

### Grupo 2 — Validaciones pre-gate en 7 workflow-*/SKILL.md

- [x] Step 0 END USER CONTEXT en workflow-analyze/SKILL.md (TD-007) — 2026-04-10
- [x] Validación pre-gate en los 7 SKILL.md (TD-029, TD-031, TD-033) — 2026-04-10
- [x] Re-evaluación tamaño WP en workflow-strategy/SKILL.md (TD-028) — 2026-04-10
- [x] Criterio auto-write + pre-flight checklist en workflow-execute/SKILL.md (TD-027 A, TD-032) — 2026-04-10

### Grupo 3 — Mejoras a scripts existentes

- [x] project-status.sh: alerta ROADMAP entry faltante (B-08) — 2026-04-10
- [x] session-start.sh: alerta execution-log faltante en Phase 6 (B-09) — 2026-04-10

### Grupo 4 — Nuevos artefactos Phase 7

- [x] Crear wp-changelog.md.template + technical-debt-resolved.md.template — 2026-04-10
- [x] Actualizar workflow-track/SKILL.md + thyrox/SKILL.md con nuevos artefactos — 2026-04-10

### Grupo 5 — Reglas de longevidad y timestamps

- [x] REGLA-LONGEV-001 en conventions.md (TD-035) — 2026-04-10
- [x] Timestamps en artefactos: conventions.md (TD-001) + validate-session-close.sh (TD-018) — 2026-04-10

### Grupo 6 — Splits de archivos sobredimensionados

- [x] ROADMAP.md → ROADMAP-history.md (FASEs 1–26) — 2026-04-10
- [ ] CHANGELOG.md → CHANGELOG-archive.md (versiones históricas)
- [ ] technical-debt.md: mover TDs resueltos al WP correspondiente

### Grupo 7 — Cerrar TDs ya implementados

- [ ] Marcar [x] TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 en technical-debt.md
