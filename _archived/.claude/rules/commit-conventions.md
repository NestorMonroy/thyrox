# Commit Conventions

> Cargado automáticamente. Aplica a TODOS los commits en este repositorio.

## Formato obligatorio

```
type(scope): description
```

**Tipos válidos:**

| Tipo | Cuándo usar |
|------|------------|
| `feat` | Nueva funcionalidad o skill |
| `fix` | Corrección de bug o error de contenido |
| `refactor` | Reorganización sin cambio de comportamiento |
| `docs` | Documentación, artefactos WP, análisis |
| `chore` | Mantenimiento, actualización de config, scripts |
| `test` | Tests, validaciones, evals de skills |
| `perf` | Mejoras de performance |

**Scopes comunes:**

| Scope | Qué representa |
|-------|---------------|
| `thyrox` | Framework core, SKILL.md principal |
| `workflow-{fase}` | Skill de fase específico |
| `{nombre-wp}` | Work package activo |
| `settings` | settings.json, hooks |
| `rules` | .claude/rules/ |
| `commands` | .claude/commands/ |
| `guidelines` | .thyrox/guidelines/ |

## Ejemplos correctos

```
feat(workflow-measure): create Phase 2 MEASURE skill
feat(workflow-constraints): create Phase 4 CONSTRAINTS skill
feat(workflow-pilot): create Phase 9 PILOT/VALIDATE skill
feat(workflow-standardize): create Phase 12 STANDARDIZE skill
refactor(workflow-analyze): rename to workflow-discover for Phase 1
docs(plugin-distribution): add thyrox-phases-restructuring analysis
chore(settings): add effortLevel and CLAUDE_CODE_EFFORT_LEVEL
```

## Reglas adicionales

- Máximo 72 caracteres en la línea del subject
- Sin punto final en el subject
- Body opcional: separado por línea en blanco, explica EL POR QUÉ no el QUÉ
- NO usar: "WIP", "update", "fix stuff", "changes", mensajes vacíos

## Commits de cierre de WP

```
chore(standardize): cierre FASE 39 — plugin-distribution
```

Incluir siempre el número de FASE y el nombre del WP.
