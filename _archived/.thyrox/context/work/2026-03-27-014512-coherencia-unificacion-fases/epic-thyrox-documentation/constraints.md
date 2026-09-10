---
Tipo: Phase 1 - ANALYZE
Documento: Constraints Analysis
Proyecto: THYROX
Fecha: 2026-03-27
Estado: Completado
---

# Constraints Analysis - THYROX

## Technical Constraints

| Constraint | Reason | Impact |
|-----------|--------|--------|
| Markdown only | Universal format, git-friendly, AI-readable | No databases, no proprietary formats |
| Git as version control | Standard, no external dependencies | No backup files in repo (use git history) |
| Bash + Python scripts | Available in most environments | No compiled languages, no npm dependencies |
| SKILL.md < 500 lines | Anthropic best practice, context window efficiency | Must use progressive disclosure with references |

## Platform Constraints

| Constraint | Reason | Impact |
|-----------|--------|--------|
| Claude Code compatible | Primary runtime environment | Must follow skill anatomy (SKILL.md + scripts/ + references/ + assets/) |
| Works offline (except AI) | Git-based, no external services required | No cloud dependencies for project management |
| Cross-platform paths | Must work on Linux/macOS/Windows | Use relative paths, no hardcoded absolute paths |

## Organizational Constraints

| Constraint | Reason | Impact |
|-----------|--------|--------|
| Single skill (pm-thyrox) | Consolidation over fragmentation | All methodology in one place, not 15 separate skills |
| No external tools required | Self-contained template | No GitHub Issues, no Jira, no Notion |

## Business Constraints

| Constraint | Reason | Impact |
|-----------|--------|--------|
| Open source | Template for community use | MIT license, no proprietary components |
| Zero cost infrastructure | Accessible to solo developers | Only git + text editor + Claude Code needed |

## How Constraints Guide Solution Strategy

These constraints collectively shape the solution strategy in several important ways:

1. **File-based architecture**: Since we are limited to Markdown and Git, the entire project management state must live in plain text files. This means directories become our "database tables" and filenames become our "primary keys."

2. **Progressive disclosure pattern**: The SKILL.md size limit forces a layered information architecture. The main skill file provides the workflow overview, while `references/` contains detailed guides that are loaded on demand. This is both a constraint and an advantage -- it prevents context window bloat.

3. **Self-contained template**: The "no external tools" constraint means THYROX must provide everything a developer needs out of the box. Templates in `assets/`, validation in `scripts/`, methodology in `references/`. Cloning the repo gives you the complete system.

4. **Script portability**: Limiting to Bash + Python ensures scripts run anywhere Claude Code runs. No build steps, no package managers, no version conflicts. A `detect-phase.sh` script must work on a fresh Linux VM as well as a macOS laptop.

5. **Skill anatomy compliance**: Claude Code expects a specific structure (SKILL.md + supporting directories). This is non-negotiable -- deviating means the skill won't load. The constraint actually simplifies decisions: there is one correct way to organize the code.

6. **Community accessibility**: Open source + zero cost means every design decision must favor simplicity. A solo developer with only Git and Claude Code should be productive within 5 minutes of cloning.

---

**Siguiente Paso** → [context.md](context.md)
