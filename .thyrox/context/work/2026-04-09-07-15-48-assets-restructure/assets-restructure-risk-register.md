```yml
type: Risk Register
work_package: 2026-04-09-07-15-48-assets-restructure
fase: FASE 25
phase: Phase 1 — ANALYZE
created_at: 2026-04-09 07:15:48
```

# Risk Register — assets-restructure

| ID | Riesgo | Prob | Impacto | Mitigación |
|----|--------|------|---------|-----------|
| R-01 | `categorization-plan.md.template` tiene 2 owners (workflow-decompose Y workflow-track) | Alta | Bajo | Decidir propietario antes del primer commit: Opción B (workflow-decompose) + 1 update en incremental-correction.md |
| R-02 | `setup-template.sh` no escaneado por detect_broken_references.py (solo escanea .md/.json) | Alta | Bajo | Grep manual de `pm-thyrox/assets` en archivos .sh al final de cada batch |
| R-03 | Referencias pre-existing rotas en `references/conventions.md` y `references/examples.md` (FASE 24 side-effect) | Certeza | Bajo | Fix incluido en el batch de actualizaciones externas |
| R-04 | pm-thyrox/SKILL.md artefacts table con 14 paths distintos — propenso a error de paths | Alta | Medio | Verificar cada path con ls antes del commit |
| R-05 | adr.md.template en workflow-analyze pero workflow-strategy/SKILL.md lo referencia | Media | Bajo | workflow-strategy/SKILL.md ya usa `assets/adr.md.template` relativo — funcionará si adr.md va a workflow-analyze (refs cruzadas no aplica aquí) |
