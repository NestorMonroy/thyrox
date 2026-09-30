```yml
created_at: 2026-04-11 22:30:00
feature: thyrox-commands-namespace
wp: 2026-04-11-10-52-25-thyrox-commands-namespace
fase: FASE 31
commits: 20
```

# WP Changelog — thyrox-commands-namespace (FASE 31)

> Registro de cambios producidos por FASE 31.
> Tipos: `Added` (nuevo), `Changed` (modificado), `Fixed` (corregido), `Removed` (eliminado).

---

## Cambios producidos

### Added

- Plugin manifest `.claude-plugin/plugin.json` — namespace `/thyrox:*` para Claude Code (`3ab8528`)
- 8 command files `commands/{analyze,strategy,plan,structure,decompose,execute,track,init}.md` — thin wrappers sobre `workflow-*` skills (`3ab8528`)
- Agente nativo `deep-review` — análisis de cobertura cross-phase pre-gate (`e855f92`)
- Comando `/thyrox:deep-review` — entry point para el agente (`e855f92`)
- 6 archivos de referencia de plataforma Claude Code: `hook-output-control.md`, `subagent-patterns.md`, `scheduled-tasks.md`, `memory-hierarchy.md`, `mcp-integration.md`, `tool-execution-model.md`, `command-execution-model.md`, `sdd.md` (`338cef2`, `682f548`, `5c9ea22`)
- Comandos `/thyrox:spec-driven` (SDD — TDD+DbC) y `/thyrox:test-driven-development` (TDD puro) (`11f3c08`)
- Artefactos del WP: analysis, solution-strategy, plan, requirements-spec, spec-checklist, task-plan, execution-log, risk-register, exit-conditions (`múltiples commits`)
- TD-038, TD-039, TD-040 registrados en `technical-debt.md`

### Changed

- `session-start.sh` — 5 cambios: `_phase_to_command()` retorna `/thyrox:*`, rama COMMANDS_SYNCED=false eliminada, `/thyrox:init` en tech skills line, comentarios actualizados (`3ab8528`)
- `thyrox/SKILL.md` — tabla de fases columna Skill: `/workflow-*` → `/thyrox:*` (líneas 40-46) (`3ab8528`)
- `adr-019.md` — `status: Draft` → `Accepted`, `accepted_at: 2026-04-11` (`8fbf952`)
- `adr-016.md` — Addendum FASE 31: plugin como interfaz pública sobre `workflow-*` (`8fbf952`)
- `CLAUDE.md` — Locked Decision #5 Addendum FASE 31: `/thyrox:*` como interfaz pública, ADR-019 (`8fbf952`)
- `technical-debt.md` — TD-036 cerrado, addendums FASE 31 en TD-008/021/030 (`8fbf952`)
- `skill-vs-agent.md` — tablas actualizadas: Capa 3, Rutas, Decisión, Naturaleza → `/thyrox:*` (`8fbf952`)
- `workflow_init.md` — línea 108: `/workflow-analyze` → `/thyrox:analyze` (`3ab8528`)
- `subagent-patterns.md` — Patrón 4+5 reescritos: distingue `background:true` (frontmatter) de `run_in_background:true` (tool call); documenta output del sistema, reglas de operación (`5d83866`)
- `settings.json` — reglas de permisos refinadas (`8d7d8ef`, `e60ebcd`)
- `plan.md` y `solution-strategy.md` — `status: Aprobado — 2026-04-11` (retroactivo) (`5752329`)

### Fixed

- `workflow-analyze/SKILL.md` — Paso 1.5 ⏸ STOP pre-creación WP: gate antes de crear directorios (TD-036) (`3ab8528`)
- `commands/init.md` — description limpiada (sin `/workflow_init`); path corregido a `.claude/commands/workflow_init.md` (`b566aa2`)
- Task-plan checkboxes: T-001..T-013, T-019, T-020 marcadas `[x]`; tabla cobertura SPEC actualizada (`b566aa2`)
- Exit-conditions Phase 6: grep criterion clarificado (29 path-refs esperadas, 0 cmds usuario) (`b566aa2`)
- `plan.md` — `created_at` con hora (`18:05:14`) (`5752329`)
- Múltiples gaps detectados por deep-review Phase 4→5 (`3cc5d8e`) y Phase 6 pre-gate (`b566aa2`)
- TD-037 cerrado — solución arquitectónica: subagentes para múltiples edits (`4fd6329`)

---

## Commits de este WP

| Hash | Tipo | Descripción |
|------|------|-------------|
| `5752329` | fix | corregir status artefactos WP + TD-040 gate-artefact gap |
| `5d83866` | docs | subagent-patterns Patrón 4+5 — documentar async invocación dos planos |
| `f78bf0b` | docs | TD-039 — async invocación subagentes (run_in_background vs background: true) |
| `b566aa2` | fix | deep-review Phase 6 — 3 gaps corregidos pre-gate SP-06 |
| `8fbf952` | docs | Phase 6 Grupo 3 — documentación ADRs y referencias |
| `3ab8528` | feat | Phase 6 Grupos 1+2 — plugin namespace /thyrox:* operativo |
| `1150be1` | chore | SP-05 aprobado — Phase 5→6 + TD-038 registrado |
| `3cc5d8e` | fix | corregir task-plan tras deep-review Phase 4→5 (4 gaps) |
| `3a5743f` | docs | Phase 5 DECOMPOSE — task-plan 20 tareas con DAG y trazabilidad |
| `11f3c08` | feat | add spec-driven and test-driven-development commands |
| `5c9ea22` | docs | add command-execution-model + sdd; redefine /thyrox:spec |
| `e855f92` | feat | add deep-review agent + command, spec v1.2 con SPEC-011 |
| `682f548` | docs | add tool-execution-model.md — Edit/Write flows y permission model |
| `0ab48b1` | docs | Phase 4 STRUCTURE v1.1 — deep-review corrige 5 gaps vs Phase 3 |
| `aacbe81` | docs | Phase 4 STRUCTURE — requirements-spec y spec-checklist |
| `0059314` | chore | advance to Phase 4 in now.md |
| `8d7d8ef` | fix | allow edits on now.md, focus.md, and WP artifacts without prompt |
| `e60ebcd` | chore | auto-accept edits on SKILL.md and CLAUDE.md |
| `338cef2` | docs | add 6 new platform reference files from claude-howto deep-review |
| `4fd6329` | docs | cerrar TD-037 — solución es subagentes (aislamiento de contexto) |

---

## Notas de release

> FASE 31 no genera bump de versión en `CHANGELOG.md` raíz. El framework sigue en v2.5.0.
> La funcionalidad `/thyrox:*` es una capa de interfaz sobre `workflow-*` existentes — no hay breaking changes ni API nueva que justifique versión.
> Próximo release cuando se complete TD-038 (settings.json cleanup) o se implementen los meta-comandos UC-003 (FASE 32+).
