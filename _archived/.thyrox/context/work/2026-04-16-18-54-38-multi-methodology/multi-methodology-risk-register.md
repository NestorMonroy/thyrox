```yml
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
created_at: 2026-04-16 18:54:38
updated_at: 2026-04-17 16:47:19
current_phase: Stage 12 — STANDARDIZE
author: NestorMonroy
```

# Risk Register — multi-methodology (ÉPICA 40)

| ID | Riesgo | Prob | Impacto | Estado | Mitigación | Resultado real |
|----|--------|------|---------|--------|------------|----------------|
| R-001 | `skills:` en frontmatter de agente no documentado en plugin-dev — solo en runtime | Alta | Medio | **Cerrado** | Usar solo campos confirmados por CHANGELOG; testear con skill real antes de escalar | No se materializó — se usaron solo campos documentados |
| R-002 | 79 skills sin descriptions precisas → routing probabilístico falla | Media | Alto | **Cerrado** | Escribir descriptions con frases exactas de trigger (I-008); validar con `/skills` menu | Mitigado con `metadata.triggers` (Cambio A) — 20 skills actualizados con 3-5 keywords específicos |
| R-003 | Contrato `now.md::phase = "{metodologia}-{step}"` no definido antes del Patrón 3 → incompatible con Patrón 5 | Media | Alto | **Cerrado** | Definir contrato en Phase 5 STRATEGY antes de implementar cualquier coordinator | Contrato definido: `methodology_step: {flow}:{step}`, campo `flow:` separado |
| R-004 | BA/BABOK flujo no-secuencial rompe modelo `phase == skill name` | Alta | Medio | **Cerrado** | Agregar campo `flow:` a now.md; tratar babok como caso especial en coordinator | Resuelto con `flow: ba` + `ba_ka:` en now.md; coordinator lee áreas dinámicamente |
| R-005 | 79 skills nuevos saturen `.claude-plugin/plugin.json` si se listan estáticamente | Media | Medio | **Cerrado** | Diseñar discovery dinámico desde registry o directorio, no lista hardcodeada | No se materializó — plugin.json usa discovery dinámico desde ÉPICA 39 |
