```yml
Tipo: Índice de Decisiones Arquitectónicas
Categoría: Referencia
Versión: 1.0
Propósito: Índice navegable de todos los ADRs del proyecto THYROX
Fecha creación: 2026-04-17
```

# DECISIONS — Índice de ADRs

Índice de todas las decisiones arquitectónicas registradas en `.thyrox/context/decisions/`.
Los ADRs son inmutables una vez aprobados — registran el POR QUÉ de cada decisión, no el CÓMO.

Para convenciones de ADRs ver [CLAUDE.md](.claude/CLAUDE.md#skill-vs-adr--regla-de-uso).

---

## Tabla de ADRs

| ADR | Título | Estado | Work Package / ÉPICA | Link |
|-----|--------|--------|----------------------|------|
| ADR-001 | Markdown para Documentación | — | Fundacional | [↗](.thyrox/context/decisions/adr-markdown-documentacion.md) |
| ADR-002 | ROADMAP.md como Single Source of Truth | — | Fundacional | [↗](.thyrox/context/decisions/adr-roadmap-source-of-truth.md) |
| ADR-003 | Conventional Commits | — | Fundacional | [↗](.thyrox/context/decisions/adr-conventional-commits.md) |
| ADR-004 | Separación de Sub-proyectos | — | Fundacional | [↗](.thyrox/context/decisions/adr-separacion-subproyectos.md) |
| ADR-005 | Claude Code como Development Agent | — | Fundacional | [↗](.thyrox/context/decisions/adr-claude-code-development-agent.md) |
| ADR-006 | YAML para Configuración | — | Fundacional | [↗](.thyrox/context/decisions/adr-yaml-configuracion.md) |
| ADR-007 | PostgreSQL como Base de Datos | — | Fundacional | [↗](.thyrox/context/decisions/adr-postgresql.md) |
| ADR-008 | Docker para Containerización | — | Fundacional | [↗](.thyrox/context/decisions/adr-docker-containerizacion.md) |
| ADR-009 | GitHub Actions para CI/CD | — | Fundacional | [↗](.thyrox/context/decisions/adr-github-actions-cicd.md) |
| ADR-010 | ANALYZE primero, siempre | Aprobado | Fundacional | [↗](.thyrox/context/decisions/adr-analyze-first.md) |
| ADR-011 | Anatomía oficial de Anthropic para el skill | Aprobado | Fundacional | [↗](.thyrox/context/decisions/adr-anatomia-oficial-skill.md) |
| ADR-012 | Management Skill + N Tech Skills | — | Fundacional | [↗](.thyrox/context/decisions/adr-management-skill-n-tech-skills.md) |
| ADR-013 | docs/ como documentación canónica | — | Fundacional | [↗](.thyrox/context/decisions/adr-docs-documentacion-canonica.md) |
| ADR-014 | Separación de Scope entre WPs agent-format + parallel-agent | Aprobado | ÉPICA ~20 | [↗](.thyrox/context/decisions/adr-separacion-scope-wp.md) |
| ADR-015 | Arquitectura de 5 Capas para thyrox | Accepted | skill-architecture-review | [↗](.thyrox/context/decisions/adr-arquitectura-orquestacion-thyrox.md) |
| ADR-016 | Migración `/workflow_*` commands → skills hidden | Accepted | framework-evolution | [↗](.thyrox/context/decisions/adr-workflow-commands-a-skills.md) |
| ADR-017 | Restructuración de referencias y scripts a 3 niveles | Accepted | skill-references-restructure | [↗](.thyrox/context/decisions/adr-referencias-scripts-tres-niveles.md) |
| ADR-018 | Distribución de templates a workflow-*/assets/ | Accepted | assets-restructure | [↗](.thyrox/context/decisions/adr-templates-workflow-assets.md) |
| ADR-019 | Namespace /thyrox:* mediante Claude Code Plugin | Accepted | thyrox-commands-namespace | [↗](.thyrox/context/decisions/adr-plugin-namespace-thyrox.md) |
| ADR-bound | bound-detector — PreToolUse hook sobre Agent tool | Aprobado | Ver ADR | [↗](.thyrox/context/decisions/adr-bound-detector-preToolUse.md) |
| ADR-meta | Meta-framework Orchestration Architecture | Accepted | Ver ADR | [↗](.thyrox/context/decisions/adr-meta-framework-orchestration.md) |
| ADR-terminology | Terminología THYROX — Épica, Stage, desambiguación | Aprobado | ÉPICA 39 | [↗](.thyrox/context/decisions/adr-thyrox-terminology-epic-stage.md) |

---

## Leyenda de estados

| Estado | Significado |
|--------|-------------|
| `Aprobado` / `Accepted` | Decisión tomada, en vigor |
| `Propuesto` | Pendiente de aprobación |
| `Deprecado` | Reemplazado por ADR posterior |
| `—` | Estado no declarado (ADR antiguo) |

---

## ADRs por área

### Framework core
ADR-001 (Markdown) · ADR-002 (ROADMAP) · ADR-003 (Commits) · ADR-008 (Git persistence) · ADR-010 (DISCOVER first) · ADR-terminology

### Skill architecture
ADR-004 (Single skill) · ADR-011 (Anatomía) · ADR-012 (Management+Tech) · ADR-015 (5 capas) · ADR-016 (workflow skills) · ADR-017 (referencias 3 niveles) · ADR-018 (templates)

### Plugin y distribución
ADR-019 (namespace /thyrox:*) · ADR-meta

### Infraestructura del proyecto
ADR-005 (Claude Code agent) · ADR-006 (YAML) · ADR-007 (PostgreSQL) · ADR-009 (CI/CD) · ADR-013 (docs/)

### Gestión de WPs
ADR-014 (separación scope) · ADR-bound
