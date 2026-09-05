```yml
type: Registro de Riesgos
work_package: 2026-04-07-05-41-41-flow-corrections
created_at: 2026-04-07 05:41:41
status: Activo
phase: Phase 1 — ANALYZE
open_risks: 2
```

# Registro de Riesgos: flow-corrections

| ID | Severidad | Riesgo | Mitigación |
|----|-----------|--------|-----------|
| R-001 | Media | SKILL.md es largo — agregar secciones puede hacerlo menos legible | Usar section markers y referencias a conventions.md en lugar de texto inline |
| R-002 | Baja | Las correcciones al SKILL.md pueden romper el flujo single-agent (el caso más común) | Cada corrección debe ser condicional: "En ejecución paralela: ..." — no afecta el flujo normal |
