```yml
type: Historial de Cambios
category: Proyecto
version: 1.0.0
purpose: Registro de cambios notables del proyecto
updated_at: 2026-04-07 02:22:27
```

# CHANGELOG — THYROX

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado con [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.0] - 2026-04-08

### Added — Skill Architecture Review: arquitectura de 5 capas para pm-thyrox (WP skill-architecture-review / FASE 21)

- `context/decisions/adr-015.md` (nuevo) — ADR de la arquitectura de 5 capas: 5 hallazgos externos (triggering probabilístico, PTC ortogonal, truncación de descripciones, SKILLs como prompt injection, CLAUDE.md alternativa), 4 opciones consideradas, 9 decisiones D-01..D-09, tabla de 5 capas, cláusula PTC, estado actual vs objetivo
- `scripts/session-start.sh` — añade `COMMANDS_SYNCED=false` y función `_phase_to_command()`; muestra Opción A (SKILL, calidad alta HOY) y Opción B (/workflow_* con `[outdated]` mientras TD-008 pendiente)
- `CLAUDE.md` — sección `## Multi-skill orchestration`: máx 2-3 skills simultáneos, cuándo secuenciar, section owners disjuntos, naming `now-{skill-name}-{wp-id}.md`
- `SKILL.md` — sección `## Limitaciones conocidas y arquitectura objetivo` (≤10 líneas) antes de "Las 7 Fases": triggering probabilístico compensado, arquitectura objetivo post-TD-008, referencia a ADR-015
- `references/skill-vs-agent.md` — 3 secciones nuevas: tabla de 5 capas + 3 rutas, 5 hallazgos externos con evidencia (H1..H5), tabla de decisión SKILL vs /workflow_* vs agente vs CLAUDE.md
- `references/conventions.md` — sección `## State files — naming conventions`: tabla 3 tipos (now.md / now-{agent-name}.md / now-{skill-name}-{wp-id}.md), regla de section owner
- `context/technical-debt.md` — TD-006 corregido (3 errores de framing del análisis FASE 20); TD-008 (sync /workflow_* commands, severidad alta, prerequisito para D-02); TD-009 (patrón now-{agent-name}.md en agentes); TD-010 (benchmark empírico); TD-011 (atomicidad de tareas en Phase 5)

### Fixed

- `context/work/…/skill-vs-agent-analysis.md` — sección "Corrección 2026-04-08 (FASE 21)": 3 conclusiones incorrectas corregidas con evidencia y referencia a ADR-015

### Lessons Learned

- Lecciones L-082..L-086 documentadas (análisis sin tabla de alternativas; spec sin cobertura; atomicidad tardía; context overflow; corrección en artefacto fuente)

---

## [1.7.0] - 2026-04-08

### Added — Context Hygiene: sincronización automática de archivos de estado (WP context-hygiene / FASE 20)

- `references/state-management.md` (nuevo) — tabla de triggers: archivo × evento (crear WP, cambiar Phase, cerrar WP, añadir agente) con contenido mínimo por evento
- `scripts/update-state.sh` (nuevo) — regenera `project-state.md` desde estado real del repo: agentes de `.claude/agents/`, versión de `CHANGELOG.md`, FASEs de `ROADMAP.md`; soporta `--dry-run`
- `SKILL.md` Phase 1 step 2 — instrucción REQUERIDA: al crear WP, actualizar `now.md::current_work` y `now.md::phase: Phase 1`
- `SKILL.md` gates de fase — cada ⏸ GATE HUMANO agrega: "Al recibir aprobación: actualizar `now.md::phase` a Phase N" (transiciones 1→2, 2→3, 4→5, 5→6)
- `SKILL.md` Phase 7 — tabla REQUERIDA al cerrar WP: `now.md` (null), `focus.md` (FASE completada + próximo paso), `project-state.md` (ejecutar `update-state.sh`)
- `CLAUDE.md` — sección Glosario: FASE/Phase/WP/SP-NNN con ejemplos concretos y regla mnemotécnica
- `SKILL.md` — nota de nomenclatura FASE vs Phase con enlace al glosario
- Lecciones L-075..L-081 documentadas

---

## [1.6.0] - 2026-04-08

### Added — Async Gates: gates para agentes en background (WP async-gates / FASE 19)

- `SKILL.md` Phase 1 paso 9 — Stopping Point Manifest obligatorio en cada WP: tabla `ID | Fase | Tipo | Evento | Acción requerida` con tipos `gate-fase | async-completion | gate-operacion | gate-decision`
- `SKILL.md` Phase 3 — nota metodológica: Phase 2 define el cómo (estrategia), Phase 3 define el qué (scope). Phase 2 orienta pero no declara scope formalmente
- `SKILL.md` Phase 6 pre-flight paso 5 — registro obligatorio de SP-NNN en el manifest por cada agente background antes de lanzarlo; commit del manifest antes del primer agente
- `SKILL.md` Phase 6 — instrucción explícita para `<task-notification>`: 6 pasos (identificar SP → presentar resultado → ⏸ STOP → esperar → marcar ✓ → continuar o crear ERR)
- `SKILL.md` Phase 6 — tabla de calibración de gates async: reversibilidad × tipo de agente → niveles fuerte/estándar/ligero; ausencia de respuesta ≠ aprobación
- `context/work/2026-04-07-19-03-31-async-gates/analysis/async-gates-analysis.md` — primer ejemplo canónico de Stopping Point Manifest
- `context/technical-debt.md` — TD-004 (SKILL.md tamaño ~700 líneas), TD-005 (arquitectura monolítica → evaluar orquestador + agentes por fase)
- Lecciones L-068..L-073 documentadas

---

## [1.1.0] - 2026-04-07

### Added — Convenciones para ejecución paralela de agentes (WP parallel-agent-conventions)

- `references/conventions.md` — sección "Parallel Agent Execution": estado `[~]` con claim protocol, patrón `now-{agent-id}.md`, ROADMAP readonly durante sesión paralela, namespacing ADRs por capa, handoff y recovery de claims abandonados
- `assets/tasks.md.template` — estado `[~]` (in-progress) con formato `@agent-id (claimed: timestamp)` y protocolo de recovery
- `SKILL.md` — notas de ejecución paralela en Phase 5-6 con section owner markers
- `scripts/project-status.sh` — ahora lee glob `now-*.md` con retrocompatibilidad a `now.md`
- `CLAUDE.md` — guidance de namespacing ADRs por capa en comentario de `adr_path`
- `.claude/agents/task-executor.md` — claim protocol: `[~]` antes de ejecutar, commit antes de empezar
- `.claude/agents/task-planner.md` — awareness de claims: solo sugiere tareas en `[ ]`
- `context/decisions/adr-014.md` — scope coordination entre WP-1 y WP-2

### Added — Spec formal de agentes nativos (WP agent-format-spec)

- `references/agent-spec.md` — spec formal de campos: REQUERIDOS (`name`, `description`, `tools`), PROHIBIDOS (`model`, `category`, `skill_template`, `system_prompt`), 3 patrones de naming
- `scripts/lint-agents.py` — linter Python para `.claude/agents/*.md`: detecta campos faltantes, prohibidos y descriptions vacías. Exit code 0/1. Resultado: 6 archivos, 0 errores
- `references/skill-vs-agent.md` — distinción formal: qué es, dónde vive, cómo se activa, cuándo usar cada uno

### Fixed — Agentes corregidos

- `.claude/agents/nodejs-expert.md` — description vacía corregida, campo `model` eliminado
- `.claude/agents/react-expert.md` — description vacía corregida, campo `model` eliminado
- `.claude/agents/skill-generator.md` — instrucción explícita de no propagar `model` al output nativo

### Meta — Dogfooding

Ambos WPs ejecutados en paralelo como experimento del problema que resuelven. 5 instancias de fricción detectadas independientemente por ambos agentes en Phase 1. T-012 (recovery de claims por timeout/crash) emergió del experimento — no estaba planificada.

---

## [1.0.0] - 2026-04-07

### Changed — Estandarización de keys de metadata YAML (WP metadata-keys-standardization)

**Estándar adoptado:** Keys en inglés snake_case, valores en español, timestamps ISO 8601.

```yaml
# Antes (legacy):
Tipo: Análisis
Fecha creación: 2026-04-07
Versión: 1.0

# Ahora (estándar):
type: Análisis
created_at: 2026-04-07 02:22:27
version: 1.0
```

**Archivos migrados:**
- Capa 1: 35 templates en `assets/` — ~85 keys únicos mapeados
- Capa 2: 20 references en `references/` (2 con encoding corrupto → sed)
- Capa 3: `SKILL.md` + `conventions.md` — nueva sección `## Metadata Keys` con mapa completo
- Capa 4: `focus.md`, `now.md`, `project-state.md`, `technical-debt.md`, `decisions.md`
- Capa 5: 13 ADRs en `context/decisions/`
- Capa 6: 28 error reports en `context/errors/`
- Capa 7: WP activo `thyrox-capabilities-integration` — 12 artefactos
- `CLAUDE.md` frontmatter propio
- `scripts/project-status.sh` — patrones sed actualizados

**Nuevo script:** `scripts/migrate-metadata-keys.py`
- `--dry-run`, `--layer N`, `--all`, `--verify-only`
- KEY_MAP con ~85 entries ordenados por longitud descendente
- Verificación integrada post-apply

**Formato de timestamps — dos comandos distintos:**
- Directorios: `date +%Y-%m-%d-%H-%M-%S` → `2026-04-07-02-22-27`
- Metadata values: `date '+%Y-%m-%d %H:%M:%S'` → `2026-04-07 02:22:27`

**Nota legacy:** Artefactos en `context/work/` anteriores a 2026-04-07 mantienen
keys en español. No se migran.

---

## [0.9.0] - 2026-04-06

### Added — Integración de Capacidades MCP + Native Agents (WP thyrox-capabilities-integration)

**MCP Infrastructure — SPEC-001..SPEC-004:**
- `registry/mcp/thyrox_core.py`: dataclasses `ExecResult`/`MemoryResult`, memoria semántica FAISS
  con `sentence-transformers` (store/retrieve por similitud), `exec_cmd` con blocklist de comandos
  destructivos, `exec_python` con subprocess controlado
- `registry/mcp/memory_server.py`: MCP server stdio con tools `store` y `retrieve`; inicializa
  índice FAISS en `.claude/memory/thyrox.faiss`
- `registry/mcp/executor_server.py`: MCP server stdio con tools `exec_cmd` y `exec_python`;
  valida blocklist antes de ejecutar (bloquea `rm -rf /`, `mkfs`, fork bombs, etc.)
- `requirements.txt`: `mcp>=1.0.0`, `faiss-cpu>=1.7.4`, `sentence-transformers>=2.7.0`,
  `pydantic>=2.0.0`, `numpy>=1.24.0`
- `.mcp.json`: entradas `thyrox-memory` y `thyrox-executor` con paths y env vars

**Registry YAML — SPEC-009:**
- `registry/agents/task-planner.yml`: 5 criterios de atomicidad, formato T-NNN, tools de planificación
- `registry/agents/task-executor.yml`: reglas de ejecución, tools nativas + MCP exec_cmd/exec_python
- `registry/agents/tech-detector.yml`: tabla de señales de detección por tecnología, lógica de skip
- `registry/agents/skill-generator.yml`: idempotencia (skip si existe sin --force), output format
- `registry/agents/react-expert.yml`: convenciones React/hooks/Vitest
- `registry/agents/nodejs-expert.yml`: convenciones Express/ESM/async-await
- `registry/agents/postgresql-expert.yml`: convenciones SQL/migrations/indexes

**Tech Skill Templates — SPEC-010:**
- `registry/frontend/react.skill.template.md`: componentes funcionales TS, hooks, Vitest+RTL,
  patrones a evitar; placeholder `{{PROJECT_NAME}}`
- `registry/backend/nodejs.skill.template.md`: ESM, async/await, estructura Express, Zod en límites
- `registry/database/postgresql.skill.template.md`: naming conventions, schema template, migrations
  YYYYMMDDHHMMSS, índices, transacciones, comandos psql

**Native Agents — SPEC-005..SPEC-008:**
- `.claude/agents/task-planner.md`: gate de atomicidad — 5 criterios hardcoded, NUNCA ejecuta
- `.claude/agents/task-executor.md`: usa herramientas nativas para file ops, exec_cmd para shell,
  crea ERR-NNN si falla, almacena lección instructiva con mcp__thyrox-memory__store
- `.claude/agents/tech-detector.md`: tabla de señales (React, Node.js, PostgreSQL, Python, Docker...),
  skip si ya existe skill, output format con ✓/✗
- `.claude/agents/skill-generator.md`: idempotente, sustituye `{{PROJECT_NAME}}`, reporta techs
  no soportadas

**Bootstrap — SPEC-011:**
- `registry/bootstrap.py`: CLI con `--stack` (CSV), `--model` (default: claude), `--force`;
  lee YAML del registry, renderiza `.claude/agents/*.md`, actualiza `.mcp.json`; idempotente
  (skip sin --force); reporta "modelo openai no soportado en v3" si `--model openai`

**Validación E2E — SPEC-012:**
- Bootstrap con `--stack react,nodejs` genera 6 agentes en `.claude/agents/`
- Idempotencia verificada: segunda ejecución reporta skip para todos los agentes existentes
- Blocklist verificado: `rm -rf /` devuelve error bloqueado desde executor_server.py

---

## [0.8.0] - 2026-04-04

### Added — Separación .claude/ vs docs/ con adr_path configurable (WP doc-structure)

**SPEC-001 — Campo `adr_path` en CLAUDE.md:**
- `CLAUDE.md`: sección `## Configuración del Proyecto` con `adr_path: .claude/context/decisions/`
- Retrocompatibilidad explícita para THYROX; nuevos proyectos usan `docs/architecture/decisions/`

**SPEC-002 — Locked Decisions portables:**
- `CLAUDE.md`: eliminadas referencias a IDs de ADR en sección Locked Decisions
- Reglas de framework ahora desacopladas de ADRs del proyecto

**SPEC-003 — SKILL.md Phase 1 Step 8 con regla `adr_path`:**
- Instrucción SI/NO: SI CLAUDE.md tiene `adr_path:` → usarla. SI NO → `docs/architecture/decisions/`
- Formato binario para compatibilidad con modelos de menor capacidad (Haiku)

**SPEC-004 — [README](docs/architecture/decisions/README.md):**
- Nuevo directorio canónico para ADRs en proyectos nuevos
- README con propósito, estructura y convenciones de naming

**SPEC-005 — [SKILL](.claude/skills/sphinx/SKILL.md) stub:**
- Tech skill para documentación Sphinx/RST registrado en el framework
- Secciones marcadas `[PENDIENTE]` para desarrollo futuro

**SPEC-006 — ADR-013: docs/ como documentación canónica:**
- Decisión arquitectónica registrada en [adr-013](.claude/context/decisions/adr-013.md)
- Establece `docs/` como directorio canónico para documentación permanente del proyecto

---

## [0.7.1] - 2026-04-04

### Fixed — Correcciones de proceso Phase 3 (WP skill-adr-boundary, reapertura)

**SPEC-001 — Gate de trazabilidad RC→tarea:**
- `SKILL.md` Phase 3 paso 5: SI hay RC formales → REQUERIDO tabla RC→tarea antes de presentar plan

**SPEC-002 — Nota DECOMPOSE condicional:**
- `SKILL.md` Phase 3: SI hay RC con prioridades distintas → DECOMPOSE no puede saltarse

**SPEC-003 — Exit criteria con cobertura:**
- `SKILL.md` Phase 3 Salir cuando: SI hay RC formales, tabla debe existir y estar completa

**SPEC-004 — Template plan.md:**
- `plan.md.template`: sección condicional trazabilidad RC→tarea con gate

**SPEC-005 — Limpieza artefacto mal ubicado:**
- Eliminado `process-error-analysis.md` de raíz WP (versión correcta en `analysis/`)

---

## [0.7.0] - 2026-04-04

### Added — Boundary SKILL vs ADR para compatibilidad multi-modelo (WP skill-adr-boundary)

**Capa 1 — CLAUDE.md:**
- Nueva seccion `## SKILL vs ADR — Regla de uso` con tabla comparativa (que es, quien lo escribe, cuando modificar, duracion)
- Regla explicita: "Cambia COMO se trabaja -> SKILL.md / Registra POR QUE se eligio algo -> ADR"

**Capa 2 — SKILL.md Phase 1 Step 8:**
- Reemplazado texto vago "Si hay decision arquitectonica..." por lista SI/NO con 7 items concretos
- Ejemplos explicitos de cuando SI crear ADR (stack, patron arquitectonico, componente principal) y cuando NO (naming, template, decision de WP)

**Capa 3 — adr.md.template:**
- Campo `Uso:` en frontmatter YAML con restriccion de uso en tres lineas

---

## [0.6.0] - 2026-04-04

### Fixed — Resolución de Deuda Técnica (WP technical-debt-resolution)

**SPEC-001 — Templates huérfanos mapeados al flujo:**
- `assets/ad-hoc-tasks.md.template` — header `Fase: 5/6`, condición de activación
- `assets/analysis-phase.md.template` — header `Fase: 1`, condición >20 issues
- `assets/categorization-plan.md.template` — header `Fase: 5`, condición >50 issues
- `assets/document.md.template` — header `Fase: 4`, para docs sin template específico
- `assets/project.json.template` — comentario `Fase: 1`, condición >50 issues
- `assets/refactors.md.template` — header `Fase: 5/6`, condición para deuda técnica
- `SKILL.md` — tabla de artefactos: 6 rows nuevas con condiciones de activación
- `SKILL.md` — Phase 1/4/5/6/7: links a los 6 templates con condiciones explícitas

**SPEC-002 — examples.md nomenclatura corregida:**
- 8 headers de fase actualizados (Phase 1→3, Phase 2→4, Phase 3→5, Phase 4→6, Phase 5→7)
- Nota con 7 fases oficiales: ANALYZE → SOLUTION_STRATEGY → PLAN → STRUCTURE → DECOMPOSE → EXECUTE → TRACK

**SPEC-003 — scalability.md referencias:**
- `project.json` cambiado de requerido a opcional con threshold >50 issues
- `exit_conditions.md` → `exit-conditions.md` (nombre correcto con guión)

**SPEC-004 — Timestamp conventions:**
- `references/conventions.md` — sección "Timestamp Format" con YYYY-MM-DD-HH-MM-SS
- `scripts/validate-session-close.sh` — check #3 detecta placeholders sin resolver

**SPEC-005 — validate-phase-readiness.sh Phase 3:**
- Phase 3 case verifica `*-plan.md` existe y tiene scope aprobado `[x]`

**SPEC-006 — WPs históricos cerrados:**
- 8 WPs con checkboxes abiertos cerrados: coherencia-unificacion-fases, covariancia, spec-kit-adoption, spec-kit-deep-adoption, multi-interaction-evals, cicd-setup, skill-flow-analysis, skill-consistency

---

## [0.5.0] - 2026-04-04

### Added

**Meta-Framework Generativo — WP voltfactory-adaptation**

- `.claude/registry/` — estructura de directorios `frontend/`, `backend/`, `db/` con README de convenciones
- `.claude/registry/_generator.sh` — script bash para instanciar templates en project skills; soporta `--force`, `--dry-run`; extracción con `awk`, reemplazo de placeholders con `sed`
- [react.template](.claude/registry/frontend/react.template.md) — template React con guía phase-by-phase + 6 reglas INSTRUCTIONS con ejemplos buenos/malos
- [nodejs.template](.claude/registry/backend/nodejs.template.md) — template Node.js con 6 reglas de arquitectura, async/await, validación, config
- [postgresql.template](.claude/registry/db/postgresql.template.md) — template PostgreSQL con 6 reglas: snake_case, migraciones, índices, anti-N+1, transacciones
- `.claude/skills/frontend-react/` — skill generado desde registry (SKILL.md + guidelines)
- `.claude/skills/backend-nodejs/` — skill generado desde registry (SKILL.md + guidelines)
- `.claude/skills/db-postgresql/` — skill generado desde registry (SKILL.md + guidelines)
- [frontend-react.instructions](.claude/guidelines/frontend-react.instructions.md) — reglas always-on para proyectos React
- [backend-nodejs.instructions](.claude/guidelines/backend-nodejs.instructions.md) — reglas always-on para proyectos Node.js
- [db-postgresql.instructions](.claude/guidelines/db-postgresql.instructions.md) — reglas always-on para proyectos PostgreSQL
- [workflow_init](.claude/commands/workflow_init.md) — bootstrap command: detecta stack, instancia skills, hace commit
- [workflow_analyze](.claude/commands/workflow_analyze.md) — Phase 1 entry point con contexto pre-cargado
- [workflow_strategy](.claude/commands/workflow_strategy.md) — Phase 2 entry point
- [workflow_plan](.claude/commands/workflow_plan.md) — Phase 3 entry point con gate anti-ERR-030
- [workflow_structure](.claude/commands/workflow_structure.md) — Phase 4 entry point (Mermaid requerido)
- [workflow_decompose](.claude/commands/workflow_decompose.md) — Phase 5 entry point
- [workflow_execute](.claude/commands/workflow_execute.md) — Phase 6 entry point con next task automático
- [workflow_track](.claude/commands/workflow_track.md) — Phase 7 entry point con validate-phase-readiness
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
