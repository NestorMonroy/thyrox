```yml
type: Nota de Coordinación
created_at: 2026-04-07 03:08:03
related_adr: ADR-014
status: Activo
```

# Coordinación de Scope — WP parallel-agent-conventions

Ver decisión completa en: `.claude/context/decisions/adr-014.md`

## Qué puede hacer este WP sin esperar a nadie

- Definir patrón `now-{agent-id}.md`
- Definir estado `[~]` en task-plan + template
- Definir protocolo ROADMAP.md con múltiples agentes
- Definir namespacing de ADRs por capa
- Definir protocolo de handoff de sesión
- Definir solución para colisión de timestamps en IDs de WP
- Documentar en `conventions.md` (sección "Parallel Execution" — ver ownership abajo)
- Documentar en `SKILL.md` (secciones Phase 5-6 — ver ownership abajo)

## Qué DEBE esperar a WP-2 (agent-format-spec)

- Modificar `.claude/agents/task-executor.md`
- Modificar `.claude/agents/task-planner.md`
- Cualquier archivo en `.claude/agents/*.md`

**Gate:** WP-2 debe tener spec formal aprobada por el usuario antes de que este WP toque agentes.

## Ownership en archivos compartidos

Al editar `SKILL.md` o `conventions.md`, usar marcadores:
```markdown
<!-- SECTION OWNER: parallel-agent-conventions -->
...
<!-- END SECTION: parallel-agent-conventions -->
```
