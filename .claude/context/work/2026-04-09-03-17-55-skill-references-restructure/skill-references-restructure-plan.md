```yml
created_at: 2026-04-09 06:15:00
wp: 2026-04-09-03-17-55-skill-references-restructure
phase: 3 - PLAN
status: Pendiente aprobación
```

# Plan — FASE 24: skill-references-restructure

## Scope Statement

**Problema:** Los 7 `workflow-*` skills no son autocontenidos. 24 references y 20 scripts viven
centralizados en `pm-thyrox/references/` y `pm-thyrox/scripts/` sin distinguir qué skill los
posee. Adicionalmente, 9 referencias son documentación de plataforma Claude Code (global), no
artefactos del framework pm-thyrox.

**Usuarios:**
- **Framework maintainer**: structure coherente — cada skill como unidad independiente
- **Claude invocando skills**: al activar `/workflow-analyze`, solo necesita `workflow-analyze/references/`; no carga los otros 23 archivos innecesariamente
- **Claude al crear/modificar componentes**: `.claude/references/` disponible globalmente para consultar cómo se escriben skills, agentes, convenciones

**Criterios de éxito:**
1. Cada `workflow-*/references/` existe con sus archivos propios — sin apuntar a pm-thyrox
2. `.claude/references/` existe con 9 archivos globales de plataforma
3. `.claude/scripts/` existe con 13 scripts de infraestructura Claude Code
4. `settings.json` apunta a `.claude/scripts/` (no a `pm-thyrox/scripts/`)
5. `pm-thyrox/references/` eliminado — verificado vacío (24/24 destinos confirmados)
6. Zero broken references — `detect_broken_references.py` pasa sin errores
7. CLAUDE.md `## Estructura` refleja los 9 directorios reales de `.claude/` (incluyendo los 4 no documentados + los 2 nuevos)
8. ADR-017 creado documentando los 3 niveles de artefactos
9. TD-020 cerrado — `.claude/commands/` documentado en CLAUDE.md

---

## In-Scope

### Batch A — 15 references de fase → workflow-*/references/

Crear los 5 nuevos directorios `references/` en los skills de fase que los necesitan:

| Destino | Archivos |
|---------|---------|
| `workflow-analyze/references/` (nuevo dir, 9 archivos) | basic-usage, constraints, context, introduction, quality-goals, requirements-analysis, scalability, stakeholders, use-cases |
| `workflow-execute/references/` (nuevo dir, 2 archivos) | commit-convention, commit-helper |
| `workflow-strategy/references/` (nuevo dir, 1 archivo) | solution-strategy |
| `workflow-structure/references/` (nuevo dir, 1 archivo) | spec-driven-development |
| `workflow-track/references/` (nuevo dir, 2 archivos) | reference-validation, incremental-correction |

Actualización de links en cada commit de batch: `pm-thyrox/SKILL.md` + `workflow-*/SKILL.md` que referencien estos archivos.

### Batch B — 9 references globales → .claude/references/

Crear `.claude/references/` (nuevo dir, 9 archivos): agent-spec, claude-code-components,
conventions, examples, long-context-tips, prompting-tips, skill-authoring, skill-vs-agent, state-management.

Actualización de links: `pm-thyrox/SKILL.md` (sección `## References por dominio`) — paths
relativos cambian de `references/X.md` a `../../references/X.md`.

### Eliminar pm-thyrox/references/

Solo después de verificar que los 24/24 archivos existen en sus destinos.
`git rm -r .claude/skills/pm-thyrox/references/`

### Batch C — 2 scripts → workflow-track/scripts/

Crear `workflow-track/scripts/` (nuevo dir):
- `validate-phase-readiness.sh` → `workflow-track/scripts/`
- `validate-session-close.sh` → `workflow-track/scripts/`

Actualización de links: `workflow-track/SKILL.md` ×2; paths en tests si aplica.

### Batch D — 13 scripts → .claude/scripts/ + settings.json

Crear `.claude/scripts/` (nuevo dir, 13 scripts):
session-start.sh, session-resume.sh, stop-hook-git-check.sh, commit-msg-hook.sh, lint-agents.py,
update-state.sh, project-status.sh, detect_broken_references.py, validate-broken-references.py,
convert-broken-references.py, validate-missing-md-links.sh, detect-missing-md-links.sh,
convert-missing-md-links.sh

Actualizaciones en el mismo commit:
- `settings.json` → 3 paths de hooks a `.claude/scripts/`
- `workflow-track/SKILL.md` → paths de update-state.sh, project-status.sh
- `agent-spec.md` → path de lint-agents.py (ya en `.claude/references/` por Batch B)
- `reference-validation.md` → paths de los 6 scripts de validación (ya en `.claude/skills/workflow-track/references/` por Batch A)
- `state-management.md` → paths de update-state.sh y validate-session-close.sh (ya en `.claude/references/` por Batch B)

### Commit final — CLAUDE.md + pm-thyrox/SKILL.md + ADR-017

- `CLAUDE.md`: actualizar `## Estructura` con los 9 directorios reales de `.claude/`
  (incluyendo `commands/`, `guidelines/`, `memory/`, `registry/`, `references/` nuevo, `scripts/` nuevo)
- `pm-thyrox/SKILL.md`: actualizar sección de anatomía si referencia `references/`
- `ADR-017`: documentar los 3 niveles de artefactos (`.claude/references/`, `.claude/scripts/`, `workflow-*/references/`)
- TD-020 cerrado: `.claude/commands/` documentado con descripción en CLAUDE.md

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Migrar `workflow_init.md` a skill | TD-020 reclasificado: `.claude/commands/` es el mecanismo correcto para bootstrapping one-time |
| `compress-session.py` (ccomp) | Nueva funcionalidad — candidato FASE 25 (depende de `.claude/scripts/`) |
| `detect_broken_references.py --changed` flag | Mejora incremental — futura (FASE 26+) |
| Modificar `pm-thyrox/scripts/` | evals (`run-*.sh`), legacy (`migrate-*.py`, `verify-*.sh`), tests permanecen |
| Crear `.claude/docs/` | No aplica — THYROX ya tiene `.claude/guidelines/` para el mismo rol |
| Modificar metodología en SKILL.md | Solo se actualizan paths, no contenido metodológico |
| Modificar archivos fuera de `.claude/` | Migraciones son internas al proyecto Claude Code |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| Batch A — 15 referencias de fase (5 dirs nuevos) | 2 tareas (crear dirs + git mv + links) |
| Batch B — 9 referencias globales (1 dir nuevo) | 2 tareas (crear dir + git mv + links) |
| Eliminar pm-thyrox/references/ | 1 tarea |
| Batch C — 2 scripts workflow-track (1 dir nuevo) | 1 tarea |
| Batch D — 13 scripts .claude/scripts/ (1 dir nuevo) | 2 tareas (git mv + multi-file link updates) |
| Validación post-batch (detect_broken_references.py) | 1 tarea (×4 batches inline) |
| CLAUDE.md + pm-thyrox/SKILL.md + ADR-017 | 2 tareas |
| **Total** | **~11 tareas atómicas** |

Clasificación: **mediano** (refactoring multi-archivo, 44 archivos afectados, 5 commits)
Fases activas: 1-ANALYZE ✓ · 2-SOLUTION_STRATEGY ✓ · 3-PLAN (esta) · 6-EXECUTE · 7-TRACK
Fases omitidas: 4-STRUCTURE (no hay requisitos formales), 5-DECOMPOSE (escala no lo requiere)

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 24](../../../../../ROADMAP.md#fase-24-skill-references-restructure--redistribuci%C3%B3n-arquitect%C3%B3nica-de-referencias-y-scripts-2026-04-09)

---

## Estado de aprobación

- [ ] Scope aprobado por usuario — PENDIENTE
