```yml
Tipo: Historial de Cambios
Categoría: Proyecto
Versión: 0.5.0
Propósito: Registro de cambios notables del proyecto
Fecha actualización: 2026-04-04
```

# CHANGELOG — THYROX

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado con [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-04-04

### Added

**Meta-Framework Generativo — WP voltfactory-adaptation**

- `.claude/registry/` — estructura de directorios `frontend/`, `backend/`, `db/` con README de convenciones
- `.claude/registry/_generator.sh` — script bash para instanciar templates en project skills; soporta `--force`, `--dry-run`; extracción con `awk`, reemplazo de placeholders con `sed`
- `.claude/registry/frontend/react.template.md` — template React con guía phase-by-phase + 6 reglas INSTRUCTIONS con ejemplos buenos/malos
- `.claude/registry/backend/nodejs.template.md` — template Node.js con 6 reglas de arquitectura, async/await, validación, config
- `.claude/registry/db/postgresql.template.md` — template PostgreSQL con 6 reglas: snake_case, migraciones, índices, anti-N+1, transacciones
- `.claude/skills/frontend-react/` — skill generado desde registry (SKILL.md + guidelines)
- `.claude/skills/backend-nodejs/` — skill generado desde registry (SKILL.md + guidelines)
- `.claude/skills/db-postgresql/` — skill generado desde registry (SKILL.md + guidelines)
- `.claude/guidelines/frontend-react.instructions.md` — reglas always-on para proyectos React
- `.claude/guidelines/backend-nodejs.instructions.md` — reglas always-on para proyectos Node.js
- `.claude/guidelines/db-postgresql.instructions.md` — reglas always-on para proyectos PostgreSQL
- `.claude/commands/workflow_init.md` — bootstrap command: detecta stack, instancia skills, hace commit
- `.claude/commands/workflow_analyze.md` — Phase 1 entry point con contexto pre-cargado
- `.claude/commands/workflow_strategy.md` — Phase 2 entry point
- `.claude/commands/workflow_plan.md` — Phase 3 entry point con gate anti-ERR-030
- `.claude/commands/workflow_structure.md` — Phase 4 entry point (Mermaid requerido)
- `.claude/commands/workflow_decompose.md` — Phase 5 entry point
- `.claude/commands/workflow_execute.md` — Phase 6 entry point con next task automático
- `.claude/commands/workflow_track.md` — Phase 7 entry point con validate-phase-readiness
- `.claude/skills/pm-thyrox/assets/plan.md.template` — template Phase 3: scope statement, in/out-of-scope, aprobación
- `context/decisions/adr-012.md` — refinamiento ADR-004: management skill + N tech skills como ejes ortogonales
- `context/technical-debt.md` — registro de deuda técnica TD-001, TD-002, TD-003
- `context/errors/ERR-030-phase3-complete-without-scope-approval.md`

### Changed

- `session-start.sh` — detecta y muestra tech skills activos en `.claude/skills/` al inicio de sesión
- `SKILL.md` — Phase 3 REQUERIDO crear `{nombre-wp}-plan.md`; gate explícito anti-ERR-030; diagrama Mermaid 7-phase con shortcuts micro/pequeño
- `SKILL.md` — tabla de artefactos actualizada: Phase 3 → `plan.md.template`; naming `{tipo}` incluye `plan` y `spec-checklist`
- `voltfactory-adaptation-design.md` — todos los flujos ASCII reemplazados por Mermaid (graph TB, sequenceDiagram x2, flowchart LR)

### Fixed

- Timestamps en artefactos WP estandarizados a `YYYY-MM-DD-HH-MM-SS` (TD-001)
- `_generator.sh` — overrides explícitos para títulos especiales: DB, Node.js, PostgreSQL (L-007)
- Workflow commands renombrados sin números: `/workflow_analyze` (no `/workflow_01_analyze`)

---

## [0.4.0] - 2026-04-02

### Added
- 3 templates nuevos desde perspectiva PM: `lessons-learned.md.template`, `changelog.md.template`, `risk-register.md.template`
- `session-start.sh` — SessionStart hook con detección de WP activo y fase actual
- `.claude/settings.json` — configuración de hook SessionStart
- Sección Naming en SKILL.md: patrón `{nombre-wp}-{tipo}.md` con Reveal Intent

### Changed
- CLAUDE.md: flujo de sesión reescrito como OBLIGATORIO con triple-layer activation
- SKILL.md: contrato fase→template→output para las 7 fases (19 referencias validadas)
- SKILL.md: output filenames con Reveal Intent — patrón `{nombre-wp}-{tipo}.md`
- SKILL.md: detección de fases via glob `*-{tipo}.md` (compatible con naming por WP)
- SKILL.md: escalabilidad con tabla explícita micro/pequeño/mediano/grande
- Todos los templates (19 archivos): timestamps estandarizados a `YYYY-MM-DD-HH-MM-SS`

### Fixed
- SKILL.md Phase 1–6: gates con lenguaje Baja Libertad (REQUERIDO/NO avanzar/SIEMPRE)
- SKILL.md Phase 6: numeración de pasos sin duplicados, fuente de tareas explícita
- WPs históricos: documentados como legacy — no requieren migración

---

## [0.2.0] - 2026-03-27

### Added
- Phase 1: ANALYZE — 8 documentos de análisis del proyecto
- Phase 2: SOLUTION_STRATEGY — estrategia arquitectónica
- Phase 3: PLAN — ROADMAP reescrito con estado real
- Phase 4: STRUCTURE — PRD para completar documentación
- Phase 5: DECOMPOSE — 9 tasks atómicas
- Patrón detect/convert/validate para md-links (3 scripts Bash)
- Patrón detect/convert/validate para broken-references (3 scripts Python)
- context/analysis/ y context/epics/ para outputs del framework
- references/scalability.md (escalabilidad, sub-agents, metrics)
- references/reference-validation.md (guía de validación)
- "Where Outputs Live" table en SKILL.md

### Changed
- SKILL.md optimizado: 1084 → 246 líneas (progressive disclosure)
- ROADMAP.md reescrito reflejando estado real del proyecto
- ARCHITECTURE.md reescrito con decisiones reales (no aspiracionales)
- CONTRIBUTING.md reescrito con flujo THYROX real
- CLAUDE.md conectado a SKILL con 7 fases y jerarquía
- README.md con sección Metodología y tabla de jerarquía
- templates/ → assets/ (anatomía oficial de Anthropic)
- tracking/ → assets/ (AD_HOC_TASKS, REFACTORS como .template)
- Orden de fases unificado: ANALYZE primero en todos los archivos
- use-cases.md integrado como 3ra subsección de Phase 1
- Metadata "Proyecto ADT" → "THYROX" en 3 archivos genéricos
- EXIT_CONDITIONS.md.template y project.json.template corregidos

### Removed
- 85 ocurrencias de "arc42" reemplazadas por "architecture docs"
- requirements.md y requirements.md.template (residuos de renombrado)
- .claude/utils/ completo (reportes obsoletos)
- .claude/START-HERE.md (era navegador de utils)
- .claude/context/changes/ (templates movidos a assets/)
- .claude/skills/pm-thyrox/epics/ (epic template movido a assets/)
- Root scripts/ (consolidado en pm-thyrox/scripts/)
- detect-arc42.sh (propósito cumplido)

### Fixed
- 6 errores de numeración de fases en references
- 7 links rotos por paths relativos incorrectos
- `<br>` tags inconsistentes en metadata blocks
- Backtick refs convertidos a markdown links (63+ conversiones)
- .md removido del texto visible de links

---

## [0.1.0] - 2026-03-25

### Added
- Estructura base del proyecto THYROX
- SKILL.md con metodología de 7 fases SDLC
- 20 references de documentación por fase
- 28 assets/templates para documentos
- 9 ADRs (Architecture Decision Records)
- README.md, ROADMAP.md, CHANGELOG.md
- ARCHITECTURE.md, CONTRIBUTING.md
- docs/API.md, docs/BUILD.md
- api/README.md, build/README.md
- project-state.md, decisions.md
- Conventional Commits integrado

---

**Generado desde:** `git log --oneline`
