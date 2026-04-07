```yml
Tipo: Plan Maestro
Categoría: Gestión de Proyecto
Versión: 0.2.0
Propósito: Plan maestro de trabajo y tracking de progreso
Objetivo: Documentar fases, epics, y estado actual del proyecto
Fecha actualización: 2026-03-27
```

# ROADMAP - THYROX

## Propósito

Plan maestro del proyecto THYROX. Fuente única de verdad para el estado del trabajo.

---

## Convenciones

- `[ ]` = Pendiente
- `[-]` = En Progreso
- `[x]` = Completado (YYYY-MM-DD)

---

## FASE 1: Framework Base (v0.1.0)

### Estructura del proyecto

- [x] Crear estructura de directorios (2026-03-25)
- [x] Inicializar repositorio Git (2026-03-25)
- [x] Crear README.md, ROADMAP.md, CHANGELOG.md (2026-03-25)
- [x] Crear ARCHITECTURE.md, CONTRIBUTING.md (2026-03-25)
- [x] Crear docs/API.md, docs/BUILD.md (2026-03-25)
- [x] Crear api/README.md, build/README.md (2026-03-25)

### Skill pm-thyrox

- [x] SKILL.md con 7 fases SDLC (2026-03-25)
- [x] 20 references de documentación por fase (2026-03-25)
- [x] 30 assets/templates para output (2026-03-25)
- [x] ADRs iniciales (9 decisiones documentadas) (2026-03-25)

---

## FASE 2: Consolidación y Coherencia (v0.2.0) — Sesión 2026-03-27

### Limpieza de contenido

- [x] Eliminar referencias arc42 — 85 ocurrencias en 16 archivos (2026-03-27)
- [x] Convertir backtick refs a markdown links — 37 refs en 8 archivos (2026-03-27)
- [x] Limpiar .md del texto visible de links — 63 links en 19 archivos (2026-03-27)

### Unificación de fases

- [x] Análisis de coherencia del proyecto completo (2026-03-27)
- [x] Análisis detallado de 20 references (2026-03-27)
- [x] Unificar orden de fases: ANALYZE primero en todos los archivos (2026-03-27)
- [x] Corregir numeración en SKILL.md tabla, exit conditions, project-state.md (2026-03-27)
- [x] Corregir phase headers en solution-strategy, spec-driven-dev, incremental-correction, context (2026-03-27)
- [x] Eliminar residuos de renombrado (requirements.md, requirements.md.template) (2026-03-27)

### Integración y flujo

- [x] Integrar use-cases.md al flujo de Phase 1 (8 subsecciones) (2026-03-27)
- [x] Actualizar metadata genéricos Anthropic: ADT → THYROX (2026-03-27)
- [x] Conectar CLAUDE.md y README.md al SKILL (jerarquía SKILL > CLAUDE > README) (2026-03-27)
- [x] Corregir links rotos en decisions.md y docs/BUILD.md (2026-03-27)

### Reorganización según anatomía oficial

- [x] templates/ → assets/ (30 archivos) (2026-03-27)
- [x] Crear scripts/ en pm-thyrox (mover scripts desde raíz y utils) (2026-03-27)
- [x] tracking/ → assets/ (AD_HOC_TASKS, REFACTORS como .template) (2026-03-27)
- [x] Mover epic example y templates sueltos a assets/ (2026-03-27)
- [x] Eliminar utils/ (reportes obsoletos), START-HERE.md (2026-03-27)
- [x] Mover validation guide a references/reference-validation.md (2026-03-27)

### Scripts con responsabilidad única

- [x] detect/convert/validate para md-links (3 scripts Bash) (2026-03-27)
- [x] detect/convert/validate para broken-references (3 scripts Python) (2026-03-27)

### Estructura context/

- [x] Crear context/analysis/ y mover análisis existentes (2026-03-27)
- [x] Crear context/epics/ para trabajo planificado (2026-03-27)
- [x] Documentar "Where Outputs Live" por fase en SKILL.md (2026-03-27)
- [x] Agregar `<br>` consistentes en metadata blocks (2026-03-27)

### Documentación Phase 1-2

- [x] Phase 1: ANALYZE — 8 documentos completos (2026-03-27)
- [x] Phase 2: SOLUTION_STRATEGY — solution-strategy.md (2026-03-27)
- [x] Phase 3: PLAN — ROADMAP.md reescrito (2026-03-27)

---

## FASE 3: Completar documentación del framework

### SKILL.md optimización

- [x] Reducir SKILL.md a <500 líneas — 1084 → 246 (2026-03-27)
- [x] Mover contenido extenso a references/scalability.md (2026-03-27)

### Documentación pública

- [x] Reescribir ARCHITECTURE.md reflejando estado real (2026-03-27)
- [x] Reescribir CONTRIBUTING.md con flujo actualizado (2026-03-27)
- [x] Actualizar CHANGELOG.md con trabajo real v0.1.0 y v0.2.0 (2026-03-27)

### Covariancia — Consistencia entre archivos

- [x] Análisis de covariancia: 5 leyes verificadas en 9 archivos (2026-03-28)
- [x] Solution strategy: fuente canónica + referencia (2026-03-28)
- [x] LAW 4: Jerarquía — Level 1/2/3 en SKILL, CLAUDE, README (2026-03-28)
- [x] LAW 2: Estructura — scripts/ en SKILL.md, prds/ eliminado de CLAUDE.md (2026-03-28)
- [x] LAW 3: Naming — convenciones explícitas en SKILL.md (2026-03-28)
- [x] LAW 2: conventions.md — estructura actualizada (2026-03-28)
- [x] Verificación: 5 leyes invariantes confirmadas por grep (2026-03-28)

### Validación final

- [x] Ejecutar detect_broken_references.py — 0 links rotos en core (422 son menciones textuales/documentales) (2026-03-28)
- [x] Ejecutar validate-missing-md-links.sh — 134 backtick refs en análisis, core files OK (2026-03-28)
- [x] Verificar covariancia: 5 leyes, 1 gap corregido (assets/ en SKILL.md) (2026-03-28)

### Tracking de errores

- [x] ERR-001: Análisis no documentado en context/analysis/ (2026-03-28)
- [x] ERR-002: Clasificación incorrecta de tamaño del proyecto (2026-03-28)
- [x] ERR-006: Saltar fases de nuevo — reincidencia de ERR-002 (2026-03-28)

---

## FASE 3b: Adopción de conceptos spec-kit

**Epic:** context/analysis/spec-kit-adoption-solution-strategy.md

### Nuevos templates

- [x] Crear `assets/spec-quality-checklist.md.template` (ERR-003) (2026-03-28)
- [x] Crear `assets/constitution.md.template` (ERR-004) (2026-03-28)

### Mejorar artefactos existentes

- [x] `assets/EXIT_CONDITIONS.md.template` — gates mandatorios + constitution check (ERR-008) (2026-03-28)
- [x] `references/solution-strategy.md` — Research Step explícito (ERR-006) (2026-03-28)
- [x] `references/conventions.md` — convención ROADMAP → epic link (ERR-007) (2026-03-28)
- [x] `SKILL.md` — constitution y checklist en flujo de fases (ERR-003, ERR-004) (2026-03-28)

### Enriquecer fases con pasos ejecutables

- [x] Phase 3 (PLAN): pasos numerados en SKILL.md (ERR-005) (2026-03-28)
- [x] Phase 5 (DECOMPOSE): pasos numerados en SKILL.md (ERR-005) (2026-03-28)
- [x] Phase 6 (EXECUTE): pasos numerados en SKILL.md (ERR-005) (2026-03-28)

### Tracking de errores (spec-kit adoption)

- [x] ERR-003: Sin validación de specs → checklist template creado (2026-03-28)
- [x] ERR-004: Sin constitution → constitution template creado (2026-03-28)
- [x] ERR-005: Fases no ejecutables → pasos numerados en SKILL.md (2026-03-28)
- [x] ERR-006: Saltar fases de nuevo → documentado como reincidencia (2026-03-28)
- [x] ERR-007: ROADMAP sin links a epics → convención agregada (2026-03-28)
- [x] ERR-008: Exit conditions informativas → gates mandatorios (2026-03-28)

---

## FASE 3c: Adopción profunda de spec-kit (mecanismos de calidad)

**Epic:** context/analysis/spec-kit-deep-adoption-strategy.md

### Script nuevo

- [x] Crear `scripts/validate-phase-readiness.sh` — verifica artefactos por fase (D4) (2026-03-28)

### Mejorar templates existentes

- [x] `assets/tasks.md.template` — traceability T-NNN → R-N (D3) (2026-03-28)
- [x] `assets/spec-quality-checklist.md.template` — [NEEDS CLARIFICATION] check + [Spec §] refs (D1, D3) (2026-03-28)
- [x] `assets/EXIT_CONDITIONS.md.template` — double constitution check + markers gate (D2) (2026-03-28)

### Mejorar references

- [x] `references/conventions.md` — priority mapping + traceability IDs table (D5) (2026-03-28)

### SKILL.md updates

- [x] Phase 2: double constitution check pre + post design (D2) (2026-03-28)
- [x] Phase 4: zero [NEEDS CLARIFICATION] markers gate (D1) (2026-03-28)
- [x] Phase 5: task traceability T-NNN → R-N (D3) (2026-03-28)

### Tracking de errores (deep analysis)

- [x] ERR-012: No hay cadena input/output entre fases → validate-phase-readiness.sh (2026-03-28)
- [x] ERR-013: No hay [NEEDS CLARIFICATION] mechanism → checklist + convención (2026-03-28)
- [x] ERR-016: No hay double constitution check → pre + post design (2026-03-28)
- [x] ERR-017: No hay priority→phase mapping → convención documentada (2026-03-28)
- [x] ERR-018: No hay trazabilidad req→task→checklist → IDs en templates (2026-03-28)

---

## FASE 3d: Resolver riesgos de referencia (anti-patterns de 14 proyectos)

**Work package:** context/work/2026-03-28-15-51-08-reference-errors-analysis/
**Análisis:** 12 anti-patterns identificados, 6 riesgos activos, 4 requieren acción

### Enforcement ejecutable (AP-01 + AP-09)

- [x] Crear validate-session-close.sh (hard gate) (2026-03-28)
- [x] Documentar en SKILL.md cómo usar validate-phase-readiness.sh como gate soft (2026-03-28)

### Error-to-prevention feedback loop (AP-06)

- [x] Crear template ERR mejorado con campo "Prevención" obligatorio (2026-03-28)
- [x] Actualizar convenciones de error tracking en conventions.md (2026-03-28)

### Handoff humano persistente (AP-04)

- [x] Documentar convención: blockers en now.md + sección en focus.md (2026-03-28)

### Token efficiency (AP-10)

- [x] Crear scripts/project-status.sh — resumen <50 líneas del estado (2026-03-28)

### No requiere acción

- [x] AP-05: SKILL.md mezcla capas — 191 líneas es manejable, no separar (2026-03-28)

---

## FASE 4: Template listo para reutilización

### Generalización

- [x] Análisis de contenido THYROX-específico vs genérico (85-90% genérico) (2026-03-28)
- [x] Crear setup-template.sh — script interactivo de personalización (2026-03-28)
- [x] Actualizar README.md con Quick Start usando setup-template.sh (2026-03-28)
- [x] Testear copiando repo a directorio limpio y ejecutando script (2026-03-28)

### CI/CD

- [x] GitHub Actions workflow validate.yml (skill integrity + conventional commits) (2026-03-28)
- [x] Pre-commit hook commit-msg-hook.sh para conventional commits (2026-03-28)
- [x] Documentar setup de hooks en CONTRIBUTING.md (2026-03-28)
- [x] Automatización de changelog — excluido del template: depende del tipo de proyecto destino (2026-03-28)

---

## FASE 5: Compatibilidad multi-modelo (Haiku + activación automática)

**Work package:** context/work/2026-04-01-18-39-56-skill-activation-failure/

### Activación automática del SKILL (D1)

- [x] [T-001] CLAUDE.md — flujo de sesión obligatorio + Skill tool + fallback inline — 2026-04-01
- [x] [T-002] Crear session-start.sh — startup hook de sesión — 2026-04-01
- [x] [T-003] Configurar SessionStart hook en settings.json — 2026-04-01

### SKILL.md — gates Baja Libertad por fase (D2)

- [x] [T-004] Phase 1: 8 aspectos + decisión arquitectónica + REQUERIDO template + exit criteria — 2026-04-01
- [x] [T-005] Phase 2: PASO 0 REQUERIDO solution-strategy + Key Ideas desde analysis/ — 2026-04-01
- [x] [T-006] Phase 3: verificación WP explícita — 2026-04-01
- [x] [T-007] Phase 4: checklist REQUERIDO + exit criteria verificable — 2026-04-01
- [x] [T-008] Phase 5: WP activo = más reciente en context/work/ — 2026-04-01
- [x] [T-009] Phase 6: fuente de tareas + ERR-NNN con template + renumerar pasos — 2026-04-01
- [x] [T-010] Escalabilidad: tabla explícita tamaño → fases activas — 2026-04-01

### Verificación (no degradación)

- [x] [T-011] Re-ejecutar evals — 14/14 (100%) — 2026-04-01

### Deuda técnica

- [ ] [T-DT-001] examples.md — actualizar nomenclatura de fases (fuera de scope FASE 5)

---

## FASE 6: Integración de templates por fase (Reveal Intent + contrato fase→template→output)

**Work package:** context/work/2026-04-01-22-15-43-template-phase-integration/

### Templates faltantes (PM perspective)

- [x] lessons-learned.md.template — Phase 7 — 2026-04-01
- [x] changelog.md.template — Phase 7 — 2026-04-01
- [x] risk-register.md.template — Phase 1 — 2026-04-01

### SKILL.md — contrato fase→template→output

- [x] Referenciar templates existentes por fase (Phase 2, 4, 5, 6, 7) — 2026-04-01
- [x] Reveal Intent en output filenames: patrón {nombre-wp}-{tipo}.md — 2026-04-01
- [x] Detección de fases via glob *-{tipo}.md — 2026-04-01

### Templates — estandarización

- [x] Timestamps YYYY-MM-DD-HH-MM-SS en todos los templates (19 archivos) — 2026-04-01

### Formalización del patrón (D3 + D4)

- [x] [T-001] SKILL.md sección Naming — regla explícita del patrón {nombre-wp}-{tipo}.md (D3) — 2026-04-02
- [x] [T-002] SKILL.md — nota de compatibilidad WPs históricos (D4) — 2026-04-02

---

## FASE 7: Meta-Framework Generativo (tech skills auto-generados)

**Work package:** context/work/2026-04-03-00-49-34-voltfactory-adaptation/

Inspirado en el análisis de Volt Factory. Objetivo: pm-thyrox como orquestador de gestión +
N tech skills auto-generados desde un registry centralizado, persistentes como artefactos git.

### Registry base

- [x] Crear estructura `.claude/registry/` con README (2026-04-04)
- [x] Crear `_generator.sh` — instancia templates en project skills (2026-04-04)
- [x] Template `frontend/react.template.md` (SKILL.md + instructions.md) (2026-04-04)
- [x] Template `backend/nodejs.template.md` (SKILL.md + instructions.md) (2026-04-04)
- [x] Template `db/postgresql.template.md` (SKILL.md + instructions.md) (2026-04-04)

### Bootstrap command

- [x] Crear `/workflow_init` — detecta stack, instancia skills desde registry, git commit (2026-04-04)
- [x] Tech detector integrado en `/workflow_init` (scan package.json, requirements.txt, etc.) (2026-04-04)
- [x] Modo manual override para proyectos polyglot o sin config estándar (2026-04-04)

### Workflow commands (Phase entry points)

- [x] `/workflow_analyze` — Phase 1: ANALYZE con context pre-cargado (2026-04-04)
- [x] `/workflow_strategy` — Phase 2: SOLUTION_STRATEGY (2026-04-04)
- [x] `/workflow_plan` — Phase 3: PLAN con ROADMAP check (2026-04-04)
- [x] `/workflow_structure` — Phase 4: STRUCTURE con spec template (2026-04-04)
- [x] `/workflow_decompose` — Phase 5: DECOMPOSE con task template (2026-04-04)
- [x] `/workflow_execute` — Phase 6: EXECUTE con next task automático (2026-04-04)
- [x] `/workflow_track` — Phase 7: TRACK con validate-phase-readiness (2026-04-04)

### session-start.sh actualizado

- [x] Detectar tech skills activos en `.claude/skills/` (2026-04-04)
- [x] Mostrar lista de tech skills activos en startup display (2026-04-04)

### ADR-012

- [x] Crear `context/decisions/adr-012.md` — refinamiento de ADR-004 (management vs tech skills) (2026-04-04)

---

## FASE 8: Resolución de Deuda Técnica (2026-04-04)

**WP:** `.claude/context/work/2026-04-04-04-16-29-technical-debt-resolution/`

### Templates huérfanos — mapeo completo (SPEC-001)

- [x] Headers `Fase:` en 6 templates: ad-hoc-tasks, analysis-phase, categorization-plan, document, project.json, refactors (2026-04-04)
- [x] SKILL.md tabla artefactos — 6 rows nuevas con condición de activación (2026-04-04)
- [x] SKILL.md Phase 1 — links a analysis-phase.md.template y project.json.template (2026-04-04)
- [x] SKILL.md Phase 4/5/6/7 — links a document, categorization-plan, ad-hoc-tasks, refactors (2026-04-04)

### D-001: examples.md nomenclatura (SPEC-002)

- [x] 8 headers de fase corregidos (Phase 1-5 → Phase 3-7) (2026-04-04)
- [x] Nota con los 7 nombres oficiales: ANALYZE → SOLUTION_STRATEGY → ... → TRACK (2026-04-04)

### D-002: scalability.md referencias (SPEC-003)

- [x] project.json → opcional con threshold >50 issues (2026-04-04)
- [x] exit_conditions.md → exit-conditions.md (2026-04-04)

### TD-001: Timestamp conventions y validación (SPEC-004)

- [x] references/conventions.md — sección "Timestamp Format" con YYYY-MM-DD-HH-MM-SS (2026-04-04)
- [x] scripts/validate-session-close.sh — check de placeholders sin resolver (2026-04-04)

### TD-002: validate-phase-readiness.sh Phase 3 (SPEC-005)

- [x] Phase 3 case verifica existencia de *-plan.md y scope aprobado [x] (2026-04-04)

### Cierre formal de WPs históricos (SPEC-006)

- [x] 2026-03-27-coherencia-unificacion-fases — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-28-covariancia — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-28-spec-kit-adoption — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-28-spec-kit-deep-adoption — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-28-multi-interaction-evals — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-28-cicd-setup — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-28-skill-flow-analysis — 0 checkboxes abiertos (2026-04-04)
- [x] 2026-03-31-skill-consistency — 0 checkboxes abiertos (2026-04-04)

---

## FASE 9: Boundary SKILL vs ADR — compatibilidad multi-modelo (2026-04-04)

**WP:** `.claude/context/work/2026-04-04-07-17-37-skill-adr-boundary/`

### Capa 1 — CLAUDE.md

- [x] Nueva seccion `## SKILL vs ADR — Regla de uso` con tabla 4 filas (2026-04-04)

### Capa 2 — SKILL.md

- [x] Step 8 Phase 1 reemplazado con lista SI/NO (7 items, sin texto vago) (2026-04-04)

### Capa 3 — adr.md.template

- [x] Campo `Uso:` en frontmatter YAML con restriccion de uso explicita (2026-04-04)

### Correcciones de proceso Phase 3 (reapertura WP)

- [x] SKILL.md Phase 3 — paso 5: tabla trazabilidad RC→tarea condicional (SPEC-001) (2026-04-04)
- [x] SKILL.md Phase 3 — Nota DECOMPOSE: no saltable si hay RC con prioridades distintas (SPEC-002) (2026-04-04)
- [x] SKILL.md Phase 3 — exit criteria: gate de cobertura RC integrado (SPEC-003) (2026-04-04)
- [x] plan.md.template — sección condicional trazabilidad RC→tarea (SPEC-004) (2026-04-04)
- [x] process-error-analysis.md eliminado de raíz WP (SPEC-005) (2026-04-04)

---

## FASE 10: Separación .claude/ vs docs/ — adr_path configurable (2026-04-04)

**WP:** `.claude/context/work/2026-04-04-08-46-36-doc-structure/`

- [x] CLAUDE.md — sección `## Configuración del Proyecto` con campo `adr_path` (2026-04-04)
- [x] CLAUDE.md — limpiar referencias a IDs de ADRs en "Locked Decisions" (2026-04-04)
- [x] SKILL.md Phase 1 Step 8 — regla SI/NO para `adr_path` (2026-04-04)
- [x] [README](docs/architecture/decisions/README.md) — estructura mínima (2026-04-04)
- [x] [SKILL](.claude/skills/sphinx/SKILL.md) — stub tech skill (2026-04-04)
- [x] ADR-013: docs/ como documentación canónica del proyecto (2026-04-04)

---

## Métricas de Progreso

```
FASE 1: Framework Base           — 100% ✓
FASE 2: Consolidación            — 100% ✓
FASE 3: Completar docs           — 100% ✓
FASE 3b: spec-kit adoption       — 100% ✓
FASE 3c: spec-kit deep           — 100% ✓
FASE 3d: Riesgos referencia      — 100% ✓
FASE 4: Template reutilizable    — 100% ✓
FASE 5: Compatibilidad multi-modelo — 100% ✓
FASE 6: Template phase integration  — 100% ✓
FASE 7: Meta-framework generativo   — 100% ✓
FASE 8: Resolución de deuda técnica — 100% ✓
FASE 9: Boundary SKILL vs ADR + correcciones proceso Phase 3 — 100% ✓
FASE 10: Separación .claude/ vs docs/ — adr_path configurable  — 100% ✓
FASE 11: Integración de Capacidades — MCP + Native Agents        — 100% ✓
FASE 12: Estandarización de Keys de Metadata YAML                 — 100% ✓
FASE 13: Convenciones para Ejecución Paralela de Agentes          — 100% ✓
FASE 14: Correcciones al flujo — post-mortem FASE 13              — 100% ✓
FASE 15: Unificación de Registry                                  — 100% ✓
FASE 16: Separación semántica del Registry + docs públicos        — 100% ✓

Sesión 2026-03-27: ~30 cambios implementados, 20+ commits
Sesión 2026-03-28 (s2): SKILL.md rewrite + 54 evals + corrections
Sesión 2026-03-28 (s3): 5 corrections + reference errors analysis
Sesión 2026-04-03: voltfactory analysis + solution strategy + tests (55/55)
Sesión 2026-04-04: boundary SKILL vs ADR — 3 capas, mermaid flows, compatibilidad Haiku
Sesión 2026-04-07: parallel agents dogfooding + flow corrections + registry unification
```

---

## FASE 11: Integración de Capacidades — MCP + Native Agents (2026-04-05)

**WP:** `.claude/context/work/2026-04-05-01-09-22-thyrox-capabilities-integration/`
**Decisiones:** D-1..D-10 (solution-strategy v3.1)
**Brechas cerradas:** BRECHA-1 (ejecución), BRECHA-2 (memoria), BRECHA-3 (agentes)

### MCP Infrastructure

- [x] `registry/mcp/thyrox_core.py` — ExecResult/MemoryResult, FAISS memory, exec_cmd blocklist (2026-04-06)
- [x] `registry/mcp/memory_server.py` — MCP server: store + retrieve (FAISS) (2026-04-06)
- [x] `registry/mcp/executor_server.py` — MCP server: exec_cmd + exec_python (2026-04-06)
- [x] `.mcp.json` mcpServers + `requirements.txt` (2026-04-06)

### Native Agents — Core

- [x] `.claude/agents/task-planner.md` — gate de atomicidad (T-NNN + deps) (2026-04-06)
- [x] `.claude/agents/task-executor.md` — ejecuta T-NNN (nativas + exec_cmd) (2026-04-06)
- [x] `.claude/agents/tech-detector.md` — detecta stack (pure-native: Glob/Read) (2026-04-06)
- [x] `.claude/agents/skill-generator.md` — genera SKILL.md + agent desde YAML (2026-04-06)

### Registry

- [x] `registry/agents/*.yml` — 7 definiciones YAML (4 core + 3 tech-experts) (2026-04-06)
- [x] `registry/{frontend,backend,database}/*.skill.template.md` — 3 tech stacks (2026-04-06)
- [x] `registry/bootstrap.py` — `--stack --model --force`, idempotente (2026-04-06)

### Validación

- [x] Test end-to-end: bootstrap → agents generados → idempotencia → blocklist (2026-04-06)

---

---

## FASE 12: Estandarización de Keys de Metadata YAML (2026-04-07)

**WP:** `.claude/context/work/2026-04-07-01-41-49-metadata-keys-standardization/`
**Decisiones:** D-01..D-05 (solution-strategy)
**Objetivo:** Keys en inglés snake_case, valores en español, formato ISO 8601 para fechas

### Script de migración

- [x] `scripts/migrate-metadata-keys.py` — dry-run + --layer N + verificación integrada (2026-04-07)

### Migración por capas

- [x] Capa 1: 35 templates en `assets/` (2026-04-07)
- [x] Capa 2: 20 references en `skills/pm-thyrox/references/` (2026-04-07)
- [x] Capa 3: `SKILL.md` + `conventions.md` — mapa completo + nota legacy + comandos date (2026-04-07)
- [x] Capa 4: context/ activo — 5 archivos (2026-04-07)
- [x] Capa 5: 13 ADRs en `context/decisions/` (2026-04-07)
- [x] Capa 6: 28 error reports en `context/errors/` (2026-04-07)
- [x] Capa 7: WP activo `thyrox-capabilities-integration` — 12 artefactos (2026-04-07)
- [x] `scripts/project-status.sh` — patrones sed actualizados (2026-04-07)
- [x] `CLAUDE.md` — frontmatter propio (2026-04-07)

### Verificación final

- [x] VERIFY OK: cero keys españoles en todas las capas (2026-04-07)

---

---

## FASE 13: Convenciones para Ejecución Paralela de Agentes (2026-04-07)

**WP-1:** `.claude/context/work/2026-04-07-03-08-03-parallel-agent-conventions/`
**WP-2:** `.claude/context/work/2026-04-07-03-08-03-agent-format-spec/`
**ADR:** ADR-014 — scope coordination entre ambos WPs
**Dogfooding:** ambos WPs ejecutados en paralelo como experimento del problema que resuelven

### WP-2: agent-format-spec

- [x] `references/agent-spec.md` — spec formal de campos (obligatorio/opcional/prohibido) (2026-04-07)
- [x] `scripts/lint-agents.py` — linter Python: 0 errores en 6 agentes (2026-04-07)
- [x] `references/skill-vs-agent.md` — distinción formal SKILL vs Agente (2026-04-07)
- [x] `.claude/agents/nodejs-expert.md` — corregido: description + quitar model (2026-04-07)
- [x] `.claude/agents/react-expert.md` — corregido: description + quitar model (2026-04-07)
- [x] `.claude/agents/skill-generator.md` — no propaga model al output nativo (2026-04-07)

### WP-1: parallel-agent-conventions

- [x] `assets/tasks.md.template` — estado `[~]` con claim protocol y recovery (2026-04-07)
- [x] `references/conventions.md` — sección "Parallel Agent Execution": now-{agent-id}.md, ROADMAP readonly, ADR namespacing, handoff, recovery de claims (2026-04-07)
- [x] `SKILL.md` — Phase 5-6 con notas de ejecución paralela (section owner markers) (2026-04-07)
- [x] `scripts/project-status.sh` — lee glob now-*.md con retrocompatibilidad (2026-04-07)
- [x] `CLAUDE.md` — adr_path con guidance de namespacing por capa (2026-04-07)
- [x] `.claude/agents/task-executor.md` — claim protocol para ejecución paralela (2026-04-07)
- [x] `.claude/agents/task-planner.md` — awareness de claims activos (2026-04-07)

### Lecciones clave (L-039..L-049)

- [x] 5 gaps de fricción detectados independientemente por ambos agentes en Phase 1 (2026-04-07)
- [x] T-012 (recovery de claims) emergió por dogfooding — no estaba en el plan original (2026-04-07)
- [x] Prompts cortos = sin timeout; prompts largos = timeouts en ejecución paralela (2026-04-07)

---

---

## FASE 14: Correcciones al flujo — post-mortem FASE 13 (2026-04-07)

**WP:** `.claude/context/work/2026-04-07-05-41-41-flow-corrections/`
**Origen:** 8 gaps detectados durante dogfooding de ejecución paralela

- [x] `SKILL.md` Phase 6: rol coordinador + pre-flight scope check + claim `[~]` obligatorio (2026-04-07)
- [x] `SKILL.md` Phase 7: single-agent por diseño en ejecución paralela (2026-04-07)
- [x] `conventions.md`: límite 800 palabras para prompts de agentes (2026-04-07)
- [x] `conventions.md`: sufijo -a/-b para WPs creados en el mismo segundo (2026-04-07)
- [x] `conventions.md`: protocolo Write bloqueado — agente reporta contenido, coordinador crea archivo (2026-04-07)

---

---

## FASE 15: Unificación de Registry (2026-04-07)

**WP:** `.claude/context/work/2026-04-07-06-15-20-registry-unification/`
**Decisión:** `.claude/registry/` como único registry canónico — `registry/` raíz eliminado

### Migración

- [x] `registry/agents/*.yml` (7 archivos) → `.claude/registry/agents/` (2026-04-07)
- [x] `registry/mcp/*.py` (3 archivos) → `.claude/registry/mcp/` (2026-04-07)
- [x] `registry/bootstrap.py` → `.claude/registry/bootstrap.py` + PROJECT_ROOT fix (2026-04-07)
- [x] `.mcp.json` — 2 paths actualizados a `.claude/registry/mcp/` (2026-04-07)
- [x] `registry/` (raíz) — eliminado tras migración (2026-04-07)
- [x] 3 YMLs `skill_template:` — paths rotos corregidos tras migración (2026-04-07)
- [x] `context/work/INDEX.md` — índice de WPs por FASE (T-007) (2026-04-07)

### Conceptual

- [x] Distinción `agents/*.yml` (agente spawnable) vs `backend/*.template.md` (SKILL de metodología) documentada — L-055 (2026-04-07)

---

---

## FASE 16: Separación semántica del Registry + Documentación pública (2026-04-07)

**WP:** `.claude/context/work/2026-04-07-06-30-37-registry-separation/`
**Referencia:** mise (jdx/mise) — principio datos/comportamiento
**Objetivo:** Documentar los 3 flujos del registry y crear referencia pública en `/docs`

- [x] `.claude/registry/README.md` — reescrito: 3 flujos (Agents/Skills/MCP) con lenguaje datos/comportamiento (2026-04-07)
- [x] `.claude/registry/agents/README.md` — creado: campos YML, agentes disponibles, cómo agregar uno (2026-04-07)
- [x] `.claude/registry/mcp/README.md` — creado: servidores, herramientas expuestas, setup, extensión (2026-04-07)
- [x] `docs/registry.md` — creado: referencia pública de los 3 flujos, bootstrap completo (2026-04-07)
- [x] `docs/architecture/registry-design.md` — creado: decisión arquitectónica con paralelo mise (2026-04-07)

### Lecciones clave (L-057..L-060)

- [x] Referencia externa (mise) enriqueció el scope antes de ejecutar — esperar análisis fue correcto (2026-04-07)
- [x] Principio datos/comportamiento: templates = datos, agents = comportamiento, MCP = runtime (2026-04-07)
- [x] Futuro FASE 17: `skill.toml` + JSON Schema + `thyrox doctor` (documentado en registry-design.md) (2026-04-07)

---

**Última actualización:** 2026-04-07 (FASE 16 completada — registry documentado, referencia pública en /docs v1.3.0)
