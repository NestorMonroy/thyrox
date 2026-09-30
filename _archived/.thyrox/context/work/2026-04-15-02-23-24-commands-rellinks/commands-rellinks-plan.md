```yml
type: Phase 3 Plan
created_at: 2026-04-15 02:23:24
wp: commands-rellinks
fase: FASE 38
```

# Plan — commands-rellinks (FASE 38)

## Scope statement

Mover 11 commands de `/commands/` a `.claude/commands/`, actualizar sus paths internos, y convertir referencias de texto plano a Markdown links relativos en el top 5 de `.claude/references/` con mayor densidad de referencias navegables.

## In scope

### Task A: Mover commands (11 archivos)

| Archivo | Acción adicional al mover |
|---------|--------------------------|
| `analyze.md` | `` `.claude/skills/workflow-analyze/SKILL.md` `` → `[…](../skills/workflow-analyze/SKILL.md)` |
| `decompose.md` | `` `.claude/skills/workflow-decompose/SKILL.md` `` → `[…](../skills/workflow-decompose/SKILL.md)` |
| `execute.md` | `` `.claude/skills/workflow-execute/SKILL.md` `` → `[…](../skills/workflow-execute/SKILL.md)` |
| `plan.md` | `` `.claude/skills/workflow-plan/SKILL.md` `` → `[…](../skills/workflow-plan/SKILL.md)` |
| `strategy.md` | `` `.claude/skills/workflow-strategy/SKILL.md` `` → `[…](../skills/workflow-strategy/SKILL.md)` |
| `structure.md` | `` `.claude/skills/workflow-structure/SKILL.md` `` → `[…](../skills/workflow-structure/SKILL.md)` |
| `track.md` | `` `.claude/skills/workflow-track/SKILL.md` `` → `[…](../skills/workflow-track/SKILL.md)` |
| `init.md` | `.claude/commands/workflow_init.md` → `workflow_init.md` |
| `deep-review.md` | mención `.claude/references/` → `../references/` |
| `spec-driven.md` | `[sdd.md](.claude/references/sdd.md)` → `[sdd.md](../references/sdd.md)` |
| `test-driven-development.md` | `[sdd.md](.claude/references/sdd.md)` → `[sdd.md](../references/sdd.md)` |

### Task B: Relative links en top 5 de `.claude/references/`

| Archivo | Refs a convertir (~) | Patrón dominante |
|---------|---------------------|-----------------|
| `claude-authoring.md` | ~57 | `CLAUDE.md` en prosa y tablas |
| `conventions.md` | ~51 | `ROADMAP.md`, `CHANGELOG.md`, `ARCHITECTURE.md` |
| `skill-authoring.md` | ~42 | `SKILL.md` en prosa |
| `examples.md` | ~28 | `ROADMAP.md` en narrativa |
| `memory-hierarchy.md` | ~28 | `CLAUDE.md` en tablas y listas |

**Regla de conversión:**
- ✅ Convertir: prosa, tablas, secciones "Ver también" / "Referencias relacionadas"
- ❌ NO convertir: dentro de ` ``` ` code blocks, diagramas ASCII (`├──`), frontmatter YAML, wildcards `*-analysis.md`

### Validación

Correr `python3 .claude/scripts/detect_broken_references.py .claude/references/` después de Task B.

## Out of scope

- Los 38 archivos restantes de `.claude/references/` (diferidos para FASE 39 si el patrón valida)
- `docs/` — documentación del proyecto, no commands ni references del framework
- Refactoring de contenido de los commands (solo mover + fix paths)

## Criterios de éxito

- 11 commands en `.claude/commands/`, cero en `/commands/`
- `detect_broken_references.py` sin referencias rotas en los 5 archivos procesados
- Links relativos correctos desde la nueva ubicación de cada archivo
- Commits atómicos por tarea
