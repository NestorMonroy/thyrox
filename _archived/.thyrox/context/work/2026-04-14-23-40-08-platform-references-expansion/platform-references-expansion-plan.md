```yml
type: Phase 3 Plan
created_at: 2026-04-15 01:38:42
wp: platform-references-expansion
fase: FASE 37
```

# Plan — platform-references-expansion (FASE 37)

## Scope statement

Crear 7 nuevos reference files y actualizar 3 existentes en `.claude/references/`, cubriendo los gaps de impacto alto identificados en el deep-review de `claude-code-ultimate-guide` y `claude-howto`.

## In scope

### Nuevos archivos (7)

| # | Archivo | Fuente principal |
|---|---------|-----------------|
| 1 | `context-engineering.md` | `guide/core/context-engineering.md` |
| 2 | `security-hardening.md` | `guide/security/security-hardening.md` + `data-privacy.md` + `sandbox-isolation.md` |
| 3 | `production-safety.md` | `guide/security/production-safety.md` |
| 4 | `multi-instance-workflows.md` | `guide/workflows/agent-teams.md` + `dual-instance-planning.md` |
| 5 | `development-methodologies.md` | `guide/core/methodologies.md` |
| 6 | `github-actions.md` | `guide/workflows/github-actions.md` |
| 7 | `known-issues.md` | `guide/core/known-issues.md` |

### Actualizaciones (3)

| # | Archivo existente | Qué agregar |
|---|------------------|-----------| 
| 8 | `memory-hierarchy.md` | Sección Auto Memory + `claudeMdExcludes` |
| 9 | `skill-authoring.md` | Sección `` !`command` `` dynamic context injection |
| 10 | `subagent-patterns.md` | Sección `isolation: worktree` |

## Out of scope (FASE 37)

Los 17 gaps de impacto medio identificados en el deep-review se registran como TDs para FASE 38:
enterprise-governance, session-observability, devops-sre, team-metrics, adoption-approaches, context-optimization-tools, event-driven-automation, settings-reference, agent-evaluation, code-quality-rules, refactoring-patterns, mcp-integration-updates, plugins-updates, advanced-features-updates, long-context-tips-updates, agent-teams (experimental, diferido).

## Criterios de éxito

- 7 archivos nuevos en `.claude/references/` con citas fuente archivo:línea
- 3 archivos existentes actualizados sin romper contenido previo
- Formato consistente con referencias existentes del proyecto
- Todos los items commiteados atómicamente (1 commit por reference)
- TDs medios registrados en `technical-debt.md`
