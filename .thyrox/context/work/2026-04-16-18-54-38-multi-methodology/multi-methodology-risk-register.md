```yml
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
created_at: 2026-04-16 18:54:38
updated_at: 2026-04-16 18:54:38
current_phase: Phase 1 — DISCOVER
author: NestorMonroy
```

# Risk Register — multi-methodology (FASE 40)

| ID | Riesgo | Prob | Impacto | Estado | Mitigación |
|----|--------|------|---------|--------|------------|
| R-001 | `skills:` en frontmatter de agente no documentado en plugin-dev — solo en runtime | Alta | Medio | Abierto | Usar solo campos confirmados por CHANGELOG; testear con skill real antes de escalar |
| R-002 | 79 skills sin descriptions precisas → routing probabilístico falla | Media | Alto | Abierto | Escribir descriptions con frases exactas de trigger (I-008); validar con `/skills` menu |
| R-003 | Contrato `now.md::phase = "{metodologia}-{step}"` no definido antes del Patrón 3 → incompatible con Patrón 5 | Media | Alto | Abierto | Definir contrato en Phase 5 STRATEGY antes de implementar cualquier coordinator |
| R-004 | BA/BABOK flujo no-secuencial rompe modelo `phase == skill name` | Alta | Medio | Abierto | Agregar campo `flow:` a now.md; tratar babok como caso especial en coordinator |
| R-005 | 79 skills nuevos saturen `.claude-plugin/plugin.json` si se listan estáticamente | Media | Medio | Abierto | Diseñar discovery dinámico desde registry o directorio, no lista hardcodeada |
