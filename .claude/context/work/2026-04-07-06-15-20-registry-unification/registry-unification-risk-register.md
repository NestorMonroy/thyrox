```yml
type: Registro de Riesgos
work_package: 2026-04-07-06-15-20-registry-unification
created_at: 2026-04-07 06:15:20
status: Activo
phase: Phase 1 — ANALYZE
open_risks: 2
```

# Registro de Riesgos: registry-unification

| ID | Severidad | Riesgo | Mitigación |
|----|-----------|--------|-----------|
| R-001 | Media | Deprecar `.claude/registry/` rompe `_generator.sh` que puede estar referenciado en docs | Buscar referencias antes de deprecar; actualizar docs que lo mencionen |
| R-002 | Baja | El índice de WPs queda desincronizado si no se actualiza en cada Phase 7 | Agregar al cierre de sesión (validate-session-close.sh o convención) |
