```yml
type: Estado Operacional
version: 1.0
updated_at: 2026-04-09 22:30:00
```

# Focus

FASE 28 completada. Framework v2.4.0 — sincronización determinista de `now.md` via hooks reactivos. Bug 1 (echo append), Bug 2 (current_work sin hook), Bug 4 (cierre WP LLM-dependiente) corregidos.

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

## Estado del framework

- 9 agentes nativos en `.claude/agents/`
- Versión: v2.4.0
- Lecciones: L-001..L-117 (L-110..L-117 = FASE 28)
- Deuda técnica activa (alta): TD-029, TD-031, TD-032

## Sin WP activo

FASE 28 cerrada. FASE 27 (agentic-loop) en Phase 1, gate 1→2 pendiente.

## Próximos pasos (ROADMAP)

1. **TD-032 (alta):** Prevenir GAPs Phase 6 — instrucciones reforzadas en workflow-execute/SKILL.md + guard en project-status.sh
2. **TD-031 (alta):** Agregar deep review pre-gate en 7 workflow-*/SKILL.md
3. **TD-029 (alta):** Doble validación formal en transiciones de phase
4. **FASE 27 (agentic-loop):** Retomar Phase 1 → gate 1→2 → Phase 2
