```yml
type: Estado Operacional
version: 1.0
updated_at: 2026-04-10 04:30:00
```

# Focus

FASE 29 completada. Framework v2.5.0 — renombrado thyrox, validaciones pre-gate en 7 SKILL.md, REGLA-LONGEV-001, templates Phase 7 (D2 wp-changelog, D3 td-resolved).

## Completado (2026-04-09)

- FASE 19: async-gates — Stopping Point Manifest, task-notification gate, calibración fuerte/estándar/ligero
- FASE 20: context-hygiene — state-management.md (trigger map), update-state.sh (script), gates de fase actualizan now.md, Phase 7 obliga cerrar estado, glosario FASE vs Phase
- FASE 21: skill-architecture-review — ADR-015 (5 capas), session-start.sh dual-route, CLAUDE.md multi-skill, TD-006 corregido, TD-008/009/010/011 registrados, lecciones L-082..L-086
- FASE 22: framework-evolution — hooks Stop/PostCompact (R-05 cerrado), atomicidad Phase 5, ADR-015 addendum + ADR-016, TD-008 completo (7 workflow_* → skills hidden), Step 0 END USER CONTEXT, lecciones L-087..L-093
- FASE 23: workflow-restructure — 7 workflow-*/SKILL.md (kebab hyphens), SKILL.md 148 líneas, TD-019..024 cerrados, lecciones L-094..L-097
- FASE 24: skill-references-restructure — 3 niveles arquitectónicos, pm-thyrox/references/ eliminado, CLAUDE.md ## Estructura expandida, ADR-017, lecciones L-098..L-101
- FASE 25: assets-restructure — 37/38 templates distribuidos a workflow-*/assets/, ADR-018, limpieza emojis 49 archivos, lecciones L-102..L-105
- FASE 26: write-gates — settings.json con defaultMode:acceptEdits + permissions allow/ask/deny, SKILL.md modelo de permisos, 7→0 prompts en Phase 7, lecciones L-106..L-109
- FASE 28: auto-operations — set-session-phase.sh, sync-wp-state.sh, close-wp.sh, PostToolUse hook, 7 SKILL.md corregidos, TD-028..032, lecciones L-110..L-117
- FASE 29: technical-debt-resolution — thyrox rename, 7 SKILL.md validaciones pre-gate, REGLA-LONGEV-001, templates Phase 7, 6 TDs cerrados, lecciones L-118..L-122

## Estado del framework

- 9 agentes nativos en `.claude/agents/`
- Versión: v2.5.0
- Lecciones: L-001..L-122 (L-118..L-122 = FASE 29)
- TDs activos alta prioridad: TD-006, TD-008, TD-022

## Sin WP activo

FASE 29 cerrada. FASE 27 (agentic-loop) en Phase 1, gate 1→2 pendiente.

## Próximos pasos (ROADMAP)

1. **FASE 27 (agentic-loop):** Retomar Phase 1 → gate 1→2 → Phase 2
2. **TD-006 (media):** thyrox thin orchestrator — trigger cuando SKILL.md acerque 200 líneas
3. **TD-022 (baja):** Limitaciones conocidas en workflow-* skills
