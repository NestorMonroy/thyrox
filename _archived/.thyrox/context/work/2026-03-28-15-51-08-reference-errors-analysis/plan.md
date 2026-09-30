```yml
Fecha: 2026-03-28
Tipo: Phase 3+5 (PLAN + DECOMPOSE)
```

# Plan: Resolver 6 Riesgos Activos (4 con acción)

## Scope

**In:**
- Extender stop-hook con validaciones de sesión
- Mejorar formato de errores con campo "Prevención"
- Documentar convención de handoff humano
- Crear script project-status.sh

**Out:**
- Migrar 28 errores existentes al nuevo formato (gradual, cuando se toquen)
- Pre-commit hooks de git (FASE 4)
- CI/CD (FASE 4)
- Separar capas de SKILL.md (decisión: no hacer nada)

---

## Tareas

### Bloque 1: Enforcement ejecutable (AP-01 + AP-09)

- [x] [T-001] Crear script `scripts/validate-session-close.sh` que verifique: focus.md actualizado hoy, now.md tiene phase, work package activo tiene commits recientes (R-AP01)
- [x] [T-002] Documentar en SKILL.md Phase 7 cómo usar `validate-phase-readiness.sh` como gate soft antes de avanzar de fase (R-AP09)

### Bloque 2: Error-to-prevention feedback loop (AP-06)

- [x] [T-003] Crear template `assets/error-report.md.template` con campos: Qué pasó / Por qué / Prevención / Insight (R-AP06)
- [x] [T-004] Actualizar `references/conventions.md` con convención de error tracking mejorada (R-AP06)

### Bloque 3: Handoff humano persistente (AP-04)

- [x] [T-005] Documentar convención en `references/conventions.md`: usar `blockers:` en now.md para sesión actual + sección "Decisiones pendientes" en focus.md para cross-sesión (R-AP04)

### Bloque 4: Token efficiency (AP-10)

- [x] [T-006] Crear `scripts/project-status.sh` que lea focus.md + now.md + último work package y genere resumen <50 líneas (R-AP10)

### Bloque 5: Tracking

- [x] [T-007] Actualizar ROADMAP.md con checkboxes completadas (R-TRACK)
- [x] [T-008] Actualizar focus.md + now.md para cierre (R-TRACK)

---

## Orden de ejecución

T-001 → T-002 (enforcement primero, más impacto)
T-003 → T-004 → T-005 [P] (pueden ir en paralelo con T-006)
T-006 [P]
T-007 → T-008 (al final)

## Estimación

8 tareas, todas pequeñas (<20 líneas cada una). Trabajo <2h.
