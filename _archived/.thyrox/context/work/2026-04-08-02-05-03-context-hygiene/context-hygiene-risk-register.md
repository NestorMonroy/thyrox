```yml
type: Registro de Riesgos
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: Activo
phase: Phase 1 — ANALYZE
```

# Risk Register: context-hygiene

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|------------|
| R-01 | project-state.md se vuelve a desfasar en futuras FASEs si Phase 7 no lo actualiza | Alta | Medio | Instrucción explícita en SKILL.md Phase 7 |
| R-02 | La distinción FASE vs Phase no queda clara después de documentarla | Media | Bajo | Añadir nota en CLAUDE.md y SKILL.md |
| R-03 | validate-session-close.sh sigue sin bloquear (solo avisa) | Baja | Bajo | Fuera de scope — script ya tiene la lógica, ajustar severidad es deuda técnica |
