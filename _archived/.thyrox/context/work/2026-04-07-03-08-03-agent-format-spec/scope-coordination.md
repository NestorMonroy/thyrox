```yml
type: Nota de Coordinación
created_at: 2026-04-07 03:08:03
related_adr: ADR-014
status: Activo
```

# Coordinación de Scope — WP agent-format-spec

Ver decisión completa en: `.claude/context/decisions/adr-014.md`

## Qué es exclusivo de este WP

- Spec formal de campos de agentes (`references/agent-spec.md`)
- Linter script (`scripts/lint-agents.py`)
- Reference SKILL vs Agente (`references/skill-vs-agent.md`)
- Corrección de `nodejs-expert.md` y `react-expert.md`
- Actualización de `skill-generator.md` (quitar campo `model` del output)
- Convención de naming de agentes
- Documentar en `conventions.md` (sección "Agent Format")
- Documentar en `SKILL.md` (secciones Phase 1-2 — guidance de cuándo crear agente vs SKILL)

## Qué NO toca este WP

- Convenciones de ejecución paralela (eso es WP-1)
- Estado `[~]` en task-plan (eso es WP-1)
- Protocolo de `now-{agent-id}.md` (eso es WP-1)
- Namespacing de ADRs (eso es WP-1)

## Gate que este WP desbloquea

Cuando la spec formal esté aprobada por el usuario, WP-1 (`parallel-agent-conventions`) puede modificar `.claude/agents/task-executor.md` y `.claude/agents/task-planner.md`.

## Ownership en archivos compartidos

Al editar `SKILL.md` o `conventions.md`, usar marcadores:
```markdown
<!-- SECTION OWNER: agent-format-spec -->
...
<!-- END SECTION: agent-format-spec -->
```
