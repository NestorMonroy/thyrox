```yml
Fecha: 2026-03-31
Tipo: Phase 3+5 (PLAN + DECOMPOSE)
```

# Plan: 3 Correcciones de Consistencia

## Tareas

### Bloque 1: Renombrar assets UPPERCASE (P-01)

- [x] [T-001] Renombrar AD_HOC_TASKS.md.template → ad-hoc-tasks.md.template (R-P01)
- [x] [T-002] Renombrar EXIT_CONDITIONS.md.template → exit-conditions.md.template (R-P01)
- [x] [T-003] Renombrar REFACTORS.md.template → refactors.md.template (R-P01)
- [x] [T-004] Actualizar refs en examples.md, reference-validation.md, scalability.md, trigger-evals.json (R-P01)

### Bloque 2: setup-template.sh limpia decisions/ (P-02)

- [x] [T-005] Agregar limpieza de context/decisions/ en setup-template.sh (R-P02)

### Bloque 3: SKILL unavoidable en flujo de sesión (P-03)

- [x] [T-006] Reescribir flujo de sesión en CLAUDE.md: "Todo trabajo pasa por el SKILL" (R-P03)

### Bloque 4: Track

- [x] [T-007] Actualizar focus.md + now.md (R-TRACK)

## Orden

T-001 + T-002 + T-003 → T-004 → T-005 [P] T-006 → T-007
