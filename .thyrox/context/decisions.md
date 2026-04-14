```yml
type: Contexto de Proyecto
category: Decisiones Arquitectónicas
version: 2.0
purpose: Índice de decisiones arquitectónicas del proyecto THYROX
updated_at: 2026-04-14 22:23:22
```

# Decisiones de Arquitectura

Registro de todas las ADRs del proyecto. Cada archivo documenta el razonamiento
detrás de una decisión permanente. Ver [knowledge-base.md](knowledge-base.md)
para el sistema de conocimiento completo.

---

## Índice de ADRs

### Fundamentos del Proyecto

| Archivo | Decisión | Status | Fecha |
|---------|----------|--------|-------|
| [adr-markdown-documentacion](decisions/adr-markdown-documentacion.md) | Markdown como formato estándar de documentación | Aprobado | 2025-03-24 |
| [adr-roadmap-source-of-truth](decisions/adr-roadmap-source-of-truth.md) | ROADMAP.md como single source of truth para tracking | Aprobado | 2025-03-24 |
| [adr-conventional-commits](decisions/adr-conventional-commits.md) | Conventional Commits como estándar de mensajes | Aprobado | 2025-03-24 |
| [adr-yaml-configuracion](decisions/adr-yaml-configuracion.md) | YAML para archivos de configuración | Pendiente Fase 2 | 2025-03-24 |

### Arquitectura del Sistema

| Archivo | Decisión | Status | Fecha |
|---------|----------|--------|-------|
| [adr-separacion-subproyectos](decisions/adr-separacion-subproyectos.md) | API y Build como sub-proyectos independientes | Aprobado | 2025-03-24 |
| [adr-postgresql](decisions/adr-postgresql.md) | PostgreSQL como motor de base de datos principal | Aprobado | 2025-03-24 |
| [adr-docker-containerizacion](decisions/adr-docker-containerizacion.md) | Docker para containerización y deployment | Aprobado Fase 2 | 2025-03-24 |
| [adr-github-actions-cicd](decisions/adr-github-actions-cicd.md) | GitHub Actions para CI/CD | Aprobado Fase 2 | 2025-03-24 |
| [adr-docs-documentacion-canonica](decisions/adr-docs-documentacion-canonica.md) | docs/ como directorio de documentación canónica | Aprobado | 2026-03-28 |

### Framework THYROX — Metodología

| Archivo | Decisión | Status | Fecha |
|---------|----------|--------|-------|
| [adr-claude-code-development-agent](decisions/adr-claude-code-development-agent.md) | Claude Code como agente principal de desarrollo | Aprobado | 2025-03-24 |
| [adr-analyze-first](decisions/adr-analyze-first.md) | Phase 1 es siempre ANALYZE — orden canónico fijo | Aprobado | 2026-03-27 |
| [adr-anatomia-oficial-skill](decisions/adr-anatomia-oficial-skill.md) | Anatomía oficial del skill: SKILL.md + scripts/ + references/ + assets/ | Aprobado | 2026-03-27 |
| [adr-management-skill-n-tech-skills](decisions/adr-management-skill-n-tech-skills.md) | Refinamiento ADR-004 — Management Skill + N Tech Skills | Aprobado | 2026-03-28 |
| [adr-separacion-scope-wp](decisions/adr-separacion-scope-wp.md) | Separación de scope y dependencia entre WPs agent-format-spec y parallel-agent-conventions | Aprobado | 2026-03-30 |

### Framework THYROX — Hooks y Automatización

| Archivo | Decisión | Status | Fecha |
|---------|----------|--------|-------|
| [adr-bound-detector-preToolUse](decisions/adr-bound-detector-preToolUse.md) | PreToolUse hook sobre Agent para detectar instrucciones sin bound | Aprobado | 2026-04-14 |

### Framework THYROX — Arquitectura de Skills

| Archivo | Decisión | Status | Fecha |
|---------|----------|--------|-------|
| [adr-arquitectura-orquestacion-thyrox](decisions/adr-arquitectura-orquestacion-thyrox.md) | Arquitectura de 5 capas — mecanismo de orquestación SKILL vs CLAUDE.md | Aprobado | 2026-04-07 |
| [adr-workflow-commands-a-skills](decisions/adr-workflow-commands-a-skills.md) | Migración /workflow_* commands → workflow-* skills hidden | Aprobado | 2026-04-08 |
| [adr-referencias-scripts-tres-niveles](decisions/adr-referencias-scripts-tres-niveles.md) | Referencias y scripts en 3 niveles arquitectónicos | Aprobado | 2026-04-09 |
| [adr-templates-workflow-assets](decisions/adr-templates-workflow-assets.md) | Templates distribuidos en workflow-*/assets/ — assets autocontenidos por fase | Aprobado | 2026-04-09 |
| [adr-plugin-namespace-thyrox](decisions/adr-plugin-namespace-thyrox.md) | Namespace /thyrox:* mediante Claude Code Plugin (Opción D) | Aprobado | 2026-04-10 |

---

## Cómo Crear una Nueva ADR

1. Usar template: [adr.md.template](../skills/workflow-analyze/assets/adr.md.template)
2. Nombre del archivo: `adr-{tema-descriptivo}.md` — sin números, kebab-case
3. Guardar en `decisions/`
4. Agregar fila en la tabla del índice correspondiente de este archivo
5. Commit: `docs(adr): add adr-{tema} — [título breve]`

---

**Total ADRs:** 20 · **Aprobadas:** 17 · **Pendientes:** 2 · **Deprecadas:** 0
**Ubicación:** `.thyrox/context/decisions/`
