```yml
type: Historial de Cambios
category: Proyecto
version: 1.0.0
purpose: Registro de cambios notables del proyecto
updated_at: 2026-04-09 22:30:00
```

# CHANGELOG — THYROX

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado con [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] - 2026-04-09

### Added — Auto-operations: sincronización determinista de now.md via hooks reactivos (WP auto-operations / FASE 28)

- `.claude/scripts/set-session-phase.sh` — reemplaza `phase:` in-place con `sed -i`, fix Bug 1 (echo append fuera de YAML)
- `.claude/scripts/sync-wp-state.sh` — PostToolUse Write hook, sincroniza `now.md::current_work` al WP activo, fix Bug 2
- `.claude/scripts/close-wp.sh` — cierra WP seteando `phase: null` y `current_work: null`, fix Bug 4
- `settings.json` `hooks.PostToolUse`: Write → `sync-wp-state.sh` (con fallback jq→python3)

### Fixed

- Bug 1: `echo 'phase: N' >> now.md` duplicaba campo YAML → `set-session-phase.sh` reemplaza in-place
- Bug 2: `now.md::current_work` nunca sincronizado → PostToolUse Write hook activo en nueva sesión
- Bug 4: cierre de WP en Phase 7 LLM-dependiente → `workflow-track/SKILL.md` instruye `bash close-wp.sh` explícitamente
- 7 × `workflow-*/SKILL.md`: hook `echo >>` → `bash set-session-phase.sh 'Phase N'` + `updated_at` actualizado

### Technical Debt Registered

- TD-028: Sin mecanismo para detectar reclasificación de tamaño de WP mid-flight
- TD-029: Sin doble validación al transitar entre fases (diagrama Mermaid incluido)
- TD-030: Análisis de impacto de renombrar Phase N → nomenclatura workflow-*
- TD-031: workflow-*/SKILL.md sin instrucción de deep review pre-gate
- TD-032: GAPs Phase 6 no prevenidos — propuesta Plano A (instrucciones) + Plano B (hooks)

### Known Limitation

- PostToolUse hook (Bug 2 fix) requiere nueva sesión para activarse — no validable en sesión de creación

---

## [2.3.0] - 2026-04-09

### Added — Write Gates: modelo de permisos de herramienta (WP write-gates / FASE 26)

- `settings.json`: `defaultMode: acceptEdits` — auto-acepta Edit/Write en artefactos WP y archivos de proyecto
- `settings.json` `permissions.allow`: bash scripts del framework, git add/commit/push/status/log/diff/fetch/branch, date/mkdir/ls/echo
- `settings.json` `permissions.ask`: Edit en CLAUDE.md, SKILL.md, scripts/*.sh, settings.json — prompt forzado para configuracion del framework
- `settings.json` `permissions.deny`: git push --force, git push --force-with-lease, git reset --hard, rm -rf
- `pm-thyrox/SKILL.md`: seccion "Modelo de permisos" — tabla de comportamiento por categoria + distincion Plano A (gates de decision) vs Plano B (permisos de herramienta)

### Fixed

- Phase 7 normal: 7 prompts de tool permissions → 0 prompts post-gate Phase 6→7
- git push incluido en allow — consecuencia del gate, no nueva decision

### Lessons Learned

- L-106..L-109 documentadas (ver WP write-gates-lessons-learned.md)
- TD-027 cerrado

---

## [2.2.0] - 2026-04-09

### Added — Assets Restructure: templates distribuidos a workflow-*/assets/ (WP assets-restructure / FASE 25)

**Batch A — 14 templates → workflow-analyze/assets/:**
- introduction, risk-register, exit-conditions, constitution, requirements-analysis, use-cases, quality-goals, stakeholders, basic-usage, constraints, context, end-user-context, project.json, adr

**Batch B — 7 templates → workflow-strategy/plan/structure/assets/:**
- workflow-strategy: solution-strategy
- workflow-plan: plan, epic
- workflow-structure: requirements-specification, design, spec-quality-checklist, document

**Batch C — 11 templates → workflow-decompose/execute/assets/:**
- workflow-decompose: tasks, categorization-plan
- workflow-execute: execution-log, commit-message-main, feature, bugfix, refactor, documentation, ad-hoc-tasks, multiple-files, task-completion

**Batch D — 5 templates → workflow-track/assets/ + pm-thyrox/assets/ reducido:**
- workflow-track: lessons-learned, changelog, final-report, refactors, analysis-phase
- pm-thyrox/assets/: solo error-report.md.template queda (cross-phase)

**Commit final — Documentacion + ADR:**
- Links actualizados: pm-thyrox/SKILL.md (14 paths), workflow-strategy/SKILL.md (adr cross-ref), references/conventions.md, references/examples.md, incremental-correction.md, reference-validation.md, setup-template.sh, docs/architecture/decisions/README.md
- ADR-018: documenta distribucion de templates a 3 niveles, caso especial error-report cross-phase

### Changed — Emoji/icon removal: 49 archivos limpiados

- Todos los scripts `.sh`: simbolos ASCII para estados ([OK], [ERROR], [WARN], [FAIL])
- Todos los archivos `.md`: tablas con texto plano (si/-, HACER/EVITAR)
- `.py` scripts: [OK]/[FAIL] en lugar de unicode
- ROADMAP.md, CHANGELOG.md: sin emojis/iconos decorativos

### Fixed

- `references/conventions.md` y `references/examples.md`: paths `../assets/X.md` rotos desde FASE 24 (apuntaban a `.claude/assets/` inexistente) — corregidos
- `update-state.sh`: PROJECT_ROOT corregido de `../../..` + cd (4 niveles) a `../..` (2 niveles desde `.claude/scripts/`)
- `context/decisions.md` (x3): adr.md.template path actualizado tras move a workflow-analyze

### Lessons Learned

- L-102..L-105 documentadas (ver WP assets-restructure-lessons-learned.md)

---

## [2.1.0] - 2026-04-09

### Added — References Restructure: 3-level architecture for references & scripts (WP skill-references-restructure / FASE 24)

**Batch A — 15 phase-specific refs → workflow-*/references/:**
- `.claude/skills/workflow-analyze/references/`: scalability.md (migrado desde pm-thyrox/references/)
- `.claude/skills/workflow-strategy/references/`: solution-strategy.md
- `.claude/skills/workflow-structure/references/`: spec-driven-development.md
- `.claude/skills/workflow-execute/references/`: commit-convention.md, commit-helper.md
- `.claude/skills/workflow-track/references/`: incremental-correction.md, reference-validation.md
- (workflow-analyze también recibió: analysis-frameworks.md, business-context.md, context-boundaries.md, quality-goals.md, requirements-categories.md, risk-register-guide.md, stakeholders.md, use-cases.md)

**Batch B — 9 global refs → .claude/references/ (nuevo directorio):**
- `.claude/references/`: agent-spec.md, claude-code-components.md, conventions.md, examples.md, long-context-tips.md, prompting-tips.md, skill-authoring.md, skill-vs-agent.md, state-management.md
- `pm-thyrox/references/` eliminado (todos los 24 archivos migrados a sus destinos correctos)

**Batch C — Scripts de fase → workflow-track/scripts/:**
- `.claude/skills/workflow-track/scripts/`: validate-phase-readiness.sh, validate-session-close.sh
- `.claude/skills/workflow-track/scripts/tests/`: test-phase-readiness.sh (split de run-all-tests.sh)

**Batch D — 13 scripts de infraestructura → .claude/scripts/ (nuevo directorio):**
- `.claude/scripts/`: session-start.sh, session-resume.sh, stop-hook-git-check.sh, project-status.sh, update-state.sh, commit-msg-hook.sh, detect_broken_references.py, lint-agents.py, bootstrap.py, check-phase-readiness.sh, run-bootstrap.sh, + otros
- `.claude/settings.json` — 3 hook paths actualizados: `pm-thyrox/scripts/` → `.claude/scripts/`

**Commit final — Documentación arquitectónica:**
- `CLAUDE.md` `## Estructura` — expandido de 3 a 9 dirs: agents/, commands/, context/, guidelines/, memory/, references/, registry/, scripts/, skills/. TD-020 resuelto.
- `context/decisions/adr-017.md` — documenta los 3 niveles arquitectónicos con criterios de inclusión y alternativas consideradas

### Fixed

- Cross-references corregidas en: `commit-helper.md`, `workflow-decompose/SKILL.md`, `decisions.md`, `adr-003.md`, `registry/agents/README.md`, `CONTRIBUTING.md`, `setup-template.sh` (13 paths)
- `settings.json` hooks: paths `pm-thyrox/scripts/` → `.claude/scripts/` (hooks de sesión ahora en ubicación semánticamente correcta)

### Lessons Learned

- L-098..L-101 documentadas (ver WP skill-references-restructure-lessons-learned.md)

---

## [2.0.0] - 2026-04-09

### Added — Workflow Restructure: migración a workflow-*/SKILL.md + reducción SKILL.md (WP workflow-restructure / FASE 23)

**Bloque M — Migración de skills:**
- `.claude/skills/workflow-analyze/SKILL.md` (nuevo) — `name: workflow-analyze`, description actualizado, `## Escalabilidad` section con tabla de tamaños. `/workflow_analyze.md` eliminado.
- `.claude/skills/workflow-strategy/SKILL.md` (nuevo) — `name: workflow-strategy`, description actualizado. `/workflow_strategy.md` eliminado.
- `.claude/skills/workflow-plan/SKILL.md` (nuevo) — `name: workflow-plan`, description actualizado. `/workflow_plan.md` eliminado.
- `.claude/skills/workflow-structure/SKILL.md` (nuevo) — `name: workflow-structure`, description actualizado. `/workflow_structure.md` eliminado.
- `.claude/skills/workflow-decompose/SKILL.md` (nuevo) — `name: workflow-decompose`, description actualizado. `/workflow_decompose.md` eliminado.
- `.claude/skills/workflow-execute/SKILL.md` (nuevo) — `name: workflow-execute`, description actualizado, `/loop` section refs actualizados. `/workflow_execute.md` eliminado.
- `.claude/skills/workflow-track/SKILL.md` (nuevo) — `name: workflow-track`, description actualizado. `/workflow_track.md` eliminado.

**Bloque R — Referencias actualizadas:**
- `scripts/session-start.sh` — `_phase_to_command()` (8 refs), línea 82 y comentarios: `/workflow_*` → `/workflow-*`
- `CLAUDE.md` — Locked Decision #5 Addendum FASE 23: nomenclatura resuelta a kebab-case hyphens, TD-019 cerrado
- `commands/workflow_init.md` — línea 108: `/workflow_analyze` → `/workflow-analyze`
- `context/decisions/adr-016.md` — Addendum FASE 23: cambio de nomenclatura documentado, justificación `name:` field solo acepta `a-z 0-9 -`

**Bloque TD — Deuda técnica resuelta:**
- `references/agent-spec.md` — campos `model` y `tools` corregidos: ambos `Opcional` (no prohibido/requerido). Nota de corrección añadida. TD-024 resuelto.
- `references/*.md` (24 archivos) — campo `owner:` añadido al frontmatter de todos los archivos en references/. TD-023 resuelto.
- `workflow-analyze/SKILL.md` — sección `## Escalabilidad` con tabla micro/pequeño/mediano/grande. TD-020 resuelto.

**Bloque S — Reducción SKILL.md:**
- `skills/pm-thyrox/SKILL.md` — reducido de ~471 a 148 líneas. Eliminadas: "Limitaciones conocidas" y "Las 7 Fases" (lógica detallada migrada a `workflow-*/SKILL.md`). Añadida: tabla `## Catálogo de fases` con links a 7 `/workflow-*` skills. TD-022 resuelto.

### Removed

- `.claude/skills/workflow_analyze.md`, `workflow_strategy.md`, `workflow_plan.md`, `workflow_structure.md`, `workflow_decompose.md`, `workflow_execute.md`, `workflow_track.md` — reemplazados por `workflow-*/SKILL.md` subdirectorios

### Fixed

- TD-019 resuelto: naming inconsistente (`_` vs `-`) — todos los workflow skills usan kebab-case hyphens
- TD-020..TD-023 resueltos: contenido faltante en workflow skills, owner: en references/, agent-spec correcciones

### Lessons Learned

- Lecciones L-094..L-097 documentadas (UTF-8 encoding en Python, validación T-numbers en DAG, verificación line count antes de commit, ADRs son inmutables — usar addendum)

---

> **Versiones v0.x y v1.x archivadas** en [CHANGELOG-archive.md](CHANGELOG-archive.md) por REGLA-LONGEV-001 (FASE 29).
