```yml
type: Estado Operacional
version: 1.0
updated_at: 2026-04-08 07:00:00
```

# Focus

FASE 21 completada. Framework v1.8.0 — arquitectura de 5 capas documentada en ADR-015.

## Completado (2026-04-08)

- FASE 19: async-gates — Stopping Point Manifest, task-notification gate, calibración fuerte/estándar/ligero
- FASE 20: context-hygiene — state-management.md (trigger map), update-state.sh (script), gates de fase actualizan now.md, Phase 7 obliga cerrar estado, glosario FASE vs Phase
- FASE 21: skill-architecture-review — ADR-015 (5 capas), session-start.sh dual-route, CLAUDE.md multi-skill, TD-006 corregido, TD-008/009/010/011 registrados, lecciones L-082..L-086

## Estado del framework

- 9 agentes nativos en `.claude/agents/`
- Versión: v1.8.0
- Lecciones: L-001..L-086
- Deuda técnica: TD-001..TD-011

## Sin WP activo

## Próximos pasos (ROADMAP)

1. **TD-008 (alta):** Sync /workflow_* commands con lógica actual de SKILL.md — prerequisito para reducir pm-thyrox SKILL a catálogo ~40 líneas (ADR-015 D-02)
2. **TD-011 (alta):** Añadir checklist de atomicidad en SKILL.md Phase 5 DECOMPOSE
3. **TD-007 (media):** Phase 1 Step 0 — END USER CONTEXT antes del análisis técnico
