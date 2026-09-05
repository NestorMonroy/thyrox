```yml
created_at: 2026-04-20 02:56:34
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Cluster G — Workflow Skill Anatomy: Gaps de Completitud

## Resumen ejecutivo

Los 12 workflow-* skills existen físicamente. Todos cumplen I-007 (allowed-tools presente) y I-008 (patrón "Use when..."). Los gaps materiales son de tres tipos: (1) inconsistencias internas entre el nombre de fase declarado en el body vs. el frontmatter, (2) rutas de artefactos contradictorias dentro del mismo SKILL.md, y (3) assets referenciados en el cuerpo del skill que no existen en el directorio assets/. Ningún skill está completamente vacío ("shell vacío"), pero varios tienen gaps de baja a media severidad que pueden generar confusión en ejecución.

**Score global:** 10/12 skills con anatomía completa. 2 skills con gaps de assets (workflow-structure, workflow-decompose). 1 skill con inconsistencia de fase crítica interna (workflow-strategy). 1 skill con inconsistencia de rutas (workflow-structure).

---

## Inventario por skill

| Skill | SKILL.md | references/ | assets/ | scripts/ | I-007 | I-008 | Score |
|-------|----------|-------------|---------|----------|-------|-------|-------|
| workflow-discover | OK | OK (9 archivos) | OK (15 templates) | — | PASS | PASS | 5/5 |
| workflow-baseline | OK | OK (1 archivo) | OK (2 templates) | — | PASS | PASS | 5/5 |
| workflow-diagnose | OK | OK (1 archivo) | OK (1 template) | — | PASS | PASS | 5/5 |
| workflow-constraints | OK | OK (1 archivo) | OK (1 template) | — | PASS | PASS | 5/5 |
| workflow-strategy | OK | OK (1 archivo) | OK (1 template) | — | PASS | PASS | 4/5 — GAP-001 |
| workflow-scope | OK | OK (1 archivo) | OK (2 templates) | — | PASS | PASS | 5/5 |
| workflow-structure | OK | OK (1 archivo) | OK (3 templates) | — | PASS | PASS | 3/5 — GAP-002, GAP-003 |
| workflow-decompose | OK | OK (1 archivo) | OK (2 templates) | — | PASS | PASS | 4/5 — GAP-004 |
| workflow-pilot | OK | OK (1 archivo) | OK (1 template) | — | PASS | PASS | 5/5 |
| workflow-implement | OK | OK (3 archivos) | OK (9 templates) | — | PASS | PASS | 4/5 — GAP-005 |
| workflow-track | OK | OK (2 archivos) | OK (8 templates) | OK (2 scripts + tests/) | PASS | PASS | 5/5 |
| workflow-standardize | OK | OK (1 archivo) | OK (2 templates) | — | PASS | PASS | 4/5 — GAP-006 |

---

## Hallazgos por capa

### Capa 1 — Inventario físico

Todos los 12 skills tienen el directorio raíz, SKILL.md, references/ y assets/. Solo workflow-track tiene scripts/. Ningún skill tiene el directorio completamente vacío.

**Hallazgo:** workflow-track tiene `scripts/tests/` con un archivo (`test-phase-readiness.sh`), lo que confirma que el script `validate-phase-readiness.sh` tiene cobertura de test — es el skill más maduro anatómicamente.

**Hallazgo:** El único script mencionado en todos los hooks (`set-session-phase.sh`) reside en `.claude/scripts/`, no en los skills individuales. Ese script existe en disco. Los scripts `close-wp.sh`, `update-state.sh`, `project-status.sh` también existen en `.claude/scripts/`.

### Capa 2 — Compliance I-007 (allowed-tools)

Todos los skills tienen `allowed-tools` en frontmatter.

| Skill | allowed-tools declarados | Evaluación |
|-------|--------------------------|------------|
| workflow-discover | `Read Glob Grep Bash` | PASS — mínimo cumplido |
| workflow-baseline | `Read Glob Grep Bash` | PASS |
| workflow-diagnose | `Read Glob Grep Bash` | PASS |
| workflow-constraints | `Read Glob Grep Bash` | PASS |
| workflow-strategy | `Read Glob Grep Bash` | PASS |
| workflow-scope | `Read Glob Grep Bash` | PASS |
| workflow-structure | `Read Glob Grep Bash` | PASS — nota: crea archivos pero no declara Write/Edit |
| workflow-decompose | `Read Glob Grep Bash` | PASS — nota: crea archivos pero no declara Write/Edit |
| workflow-pilot | `Read Glob Grep Bash Write Edit` | PASS — ampliado correctamente |
| workflow-implement | `Read Glob Grep Bash Write Edit` | PASS — ampliado correctamente |
| workflow-track | `Read Glob Grep Bash` | PASS — nota: crea archivos pero no declara Write/Edit |
| workflow-standardize | `Read Glob Grep Bash Write Edit` | PASS |

**Observación sobre Write/Edit:** workflow-structure (L40-46), workflow-decompose (L38-41) y workflow-track (L39-63) instruyen la creación de archivos en sus fases. Sin embargo, no declaran `Write` ni `Edit` en `allowed-tools`. Los skills que sí ejecutan código y modifican archivos (workflow-pilot, workflow-implement, workflow-standardize) sí los incluyen. Esta inconsistencia es leve dado que el agente que ejecuta un skill puede tener estos tools por su propio perfil — pero representa un riesgo de comportamiento si el skill se activa en un contexto más restrictivo.

### Capa 3 — Compliance I-008 (patrón "Use when...")

Todos los skills siguen el patrón. Extracto de verificación:

- workflow-discover L3: `"Use when starting a new work package or exploring a problem. Phase 1 DISCOVER — contextualiza..."` — PASS
- workflow-baseline L3: `"Use when you need to establish baselines and quantify the current state before analyzing. Phase 2 MEASURE — recopila..."` — PASS
- workflow-diagnose L3: `"Use when doing deep analysis of a problem after initial discovery. Phase 3 ANALYZE — análisis sistemático..."` — PASS
- workflow-constraints L3: `"Use when you need to document technical, business or platform constraints before designing a solution. Phase 4 CONSTRAINTS — documenta..."` — PASS
- workflow-strategy L3: `"Use when designing a solution after constraints are documented. Phase 5 STRATEGY — investiga..."` — PASS
- workflow-scope L3: `"Use when defining scope after strategy is approved. Phase 6 PLAN — define scope in/out explícito..."` — PASS
- workflow-structure L3: `"Use when specifying requirements with Given/When/Then after plan is approved. Phase 7 DESIGN/SPECIFY — produce..."` — PASS
- workflow-decompose L3: `"Use when breaking down approved specs into atomic executable tasks. Phase 8 PLAN EXECUTION — produce task-plan.md..."` — PASS
- workflow-pilot L3: `"Use when you need to validate a solution with a PoC before full execution. Phase 9 PILOT/VALIDATE — confirma..."` — PASS
- workflow-implement L3: `"Use when implementing tasks from the approved task plan. Phase 10 EXECUTE — toma la siguiente tarea T-NNN..."` — PASS
- workflow-track L3: `"Use when evaluating results and closing a work package after execution. Phase 11 TRACK/EVALUATE — evalúa..."` — PASS
- workflow-standardize L3: `"Use when closing a work package and propagating learnings to the system. Phase 12 STANDARDIZE — documenta..."` — PASS

**Resultado:** 12/12 PASS en I-008.

### Capa 4 — Completitud de assets/

**GAP-002 — workflow-structure:** El SKILL.md L51 declara: `"Para docs técnicos sin template específico: assets/document.md.template"`. El archivo `document.md.template` NO existe en `workflow-structure/assets/`. Los assets presentes son: `design.md.template`, `requirements-specification.md.template`, `spec-quality-checklist.md.template`.

**GAP-004 — workflow-decompose:** El SKILL.md L55 declara: `"Si hay >50 issues: usar assets/categorization-plan.md.template para categorizar primero"`. El archivo `categorization-plan.md.template` NO existe en `workflow-decompose/assets/`. Los assets presentes son: `plan-execution.md.template`, `tasks.md.template`.

**GAP-005 — workflow-implement:** El SKILL.md L82 declara: `"crear context/errors/ERR-NNN-descripcion.md usando assets/error-report.md.template"`. El archivo `error-report.md.template` NO existe en `workflow-implement/assets/`. Los assets presentes son: `ad-hoc-tasks.md.template`, `execution-log.md.template` y varios templates de commit.

Los demás skills tienen todos los assets referenciados explícitamente en sus cuerpos:
- workflow-discover: todos los templates mencionados existen (introduction.md.template, risk-register.md.template, exit-conditions.md.template, adr.md.template)
- workflow-baseline: baseline.md.template existe
- workflow-diagnose: analyze-synthesis.md.template existe
- workflow-constraints: constraints.md.template existe
- workflow-strategy: solution-strategy.md.template existe; `../workflow-discover/assets/adr.md.template` referenciado en L53 — ese archivo existe en workflow-discover/assets/
- workflow-scope: plan.md.template, epic.md.template existen
- workflow-pilot: pilot-report.md.template existe
- workflow-track: todos los templates referenciados (lessons-learned.md.template, wp-changelog.md.template, final-report.md.template, refactors.md.template, technical-debt-resolved.md.template) existen
- workflow-standardize: patterns.md.template, final-report.md.template existen

### Capa 5 — Completitud de references/

Todas las referencias explícitamente citadas en los cuerpos de los SKILL.md existen en disco:

- workflow-discover L32: `references/scalability.md` — EXISTE
- workflow-strategy L36: `references/solution-strategy.md` y L58 ídem — EXISTE
- workflow-structure L49: `references/spec-driven-development.md` — EXISTE
- workflow-decompose L53: `../../references/conventions.md` (ruta relativa desde el skill) — el archivo `/home/user/thyrox/.claude/references/conventions.md` EXISTE
- workflow-track L79: `../../references/state-management.md` — el archivo `/home/user/thyrox/.claude/references/state-management.md` EXISTE

**GAP-006 — workflow-standardize:** El SKILL.md L92 llama `bash .claude/scripts/validate-session-close.sh`. Ese script existe. Sin embargo, workflow-track/scripts/ también tiene un `validate-session-close.sh` diferente (los archivos difieren). La versión en `.claude/scripts/` es la versión robusta actual (verifica timestamps, agentes huérfanos, consistencia de now.md); la versión en `workflow-track/scripts/` es una versión antigua con lógica distinta. workflow-track L27 llama `bash .claude/skills/workflow-track/scripts/validate-session-close.sh` (versión local, antigua). workflow-standardize L92 llama `bash .claude/scripts/validate-session-close.sh` (versión global, actual). Esta bifurcación hace que Phase 11 y Phase 12 ejecuten validaciones distintas contra el mismo artefacto de cierre.

### Capa 6 — Realismo performativo

**GAP-001 — workflow-strategy:** El SKILL.md L32 dice literalmente `## Fase a ejecutar: Phase 2 SOLUTION_STRATEGY`. El frontmatter (L11), el título del archivo (L15), y todas las demás referencias internas (L17, L27, L95, L100) dicen correctamente "Phase 5". Este es un label residual de una versión anterior del skill donde la estrategia era la Phase 2 del ciclo (antes de la expansión a 12 phases). No hay mecanismo que lo detecte en runtime — el skill funciona correctamente porque el número es solo un encabezado de sección, pero cualquier agente que lea el skill y trate de inferir la fase activa desde ese encabezado obtendrá "Phase 2" en lugar de "Phase 5".

**workflow-structure — doble ruta para requirements-spec.md:** El SKILL.md declara en las instrucciones de creación (L40, L45) que los artefactos van en `work/../{nombre-wp}-requirements-spec.md` (raíz del WP o subdirectorio no especificado). Sin embargo, los Exit Criteria (L80) y la sección Detectar (L84) dicen `work/.../design/*-requirements-spec.md`. Esta es una inconsistencia interna: las instrucciones de ejecución llevan a una ruta, los criterios de completitud verifican otra. Un agente que siga las instrucciones y luego verifique los exit criteria concluirá erróneamente que Phase 7 no completó. Se documenta como GAP-003.

**workflow-track L37 (realismo performativo leve):** La sección de ejecución en paralelo (L35-36) dice "Phase 7 es single-agent por diseño" — pero la Phase 7 en el contexto de workflow-track es Phase 11 (TRACK/EVALUATE). El número "7" es un residuo de una numeración anterior. No bloquea operación pero introduce confusión.

### Capa 7 — Consistencia inter-stages

**Flujo output → input verificado:**

| Stage saliente | Output declarado | Stage receptor | Input esperado | Consistente |
|----------------|-----------------|----------------|----------------|-------------|
| Phase 1 DISCOVER | `discover/{nombre-wp}-analysis.md` + risk-register | Phase 2 MEASURE (L24: `cat discover/*-analysis.md`) | síntesis DISCOVER | SI |
| Phase 2 MEASURE | `measure/{nombre-wp}-baseline.md` | Phase 3 ANALYZE (L29: `ls measure/ 2>/dev/null`) | baseline si existe | SI (opcional) |
| Phase 3 ANALYZE | `analyze/*/` + síntesis cross-domain | Phase 4 CONSTRAINTS (L24: `ls analyze/ 2>/dev/null`) | análisis existente | SI |
| Phase 4 CONSTRAINTS | `constraints/{nombre-wp}-constraints.md` | Phase 5 STRATEGY (L49: `constraints/`) | restricciones documentadas | SI |
| Phase 5 STRATEGY | `strategy/*-solution-strategy.md` | Phase 6 PLAN (L27: verifica `*-solution-strategy.md`) | solution-strategy aprobado | SI |
| Phase 6 PLAN | `plan/{nombre-wp}-plan.md` | Phase 7 STRUCTURE (L24: lee plan + strategy) | plan aprobado | SI |
| Phase 7 STRUCTURE | `{nombre-wp}-requirements-spec.md` | Phase 8 DECOMPOSE (L24: `*-requirements-spec.md`) | spec | GAP — ruta ambigua (ver GAP-003) |
| Phase 8 DECOMPOSE | `plan-execution/*-task-plan.md` | Phase 9 PILOT (L24: `plan-execution/*-task-plan.md`) | task-plan | SI |
| Phase 8 DECOMPOSE | `plan-execution/*-task-plan.md` | Phase 10 IMPLEMENT (L24: `*-task-plan.md`) | task-plan | SI |
| Phase 9 PILOT | `pilot/{nombre-wp}-pilot-report.md` | Phase 10 IMPLEMENT (implícito, L28: verifica pilot/) | decisión GO | SI |
| Phase 10 IMPLEMENT | checkboxes `[x]` + execution-log | Phase 11 TRACK (L25: verifica task-plan [x]) | tareas completadas | SI |
| Phase 11 TRACK | `track/{nombre-wp}-lessons-learned.md` + changelog | Phase 12 STANDARDIZE (L24: `cat track/*-lessons-learned.md`) | lecciones | SI |

El único punto de rotura en la cadena inter-stages es la ambigüedad de ruta del requirements-spec entre Phase 7 (output) y Phase 8 (input), documentada como GAP-003.

---

## Tabla de hallazgos

| ID | Hallazgo | Skill / Archivo | Línea | Severidad |
|----|---------|-----------------|-------|-----------|
| GAP-001 | Encabezado de sección dice "Phase 2 SOLUTION_STRATEGY" cuando la fase es Phase 5. Residuo de numeración anterior. Un agente que infiera la fase activa desde ese encabezado obtendrá número incorrecto. | workflow-strategy/SKILL.md | L32 | MEDIO |
| GAP-002 | `assets/document.md.template` referenciado en instrucciones pero no existe en assets/. Si el agente sigue L51 literalmente no encontrará el template. | workflow-structure/SKILL.md | L51 | ALTO |
| GAP-003 | Inconsistencia interna de ruta para requirements-spec.md: instrucciones dicen `work/../{nombre-wp}-requirements-spec.md` (L40, L45), exit criteria dicen `work/.../design/*-requirements-spec.md` (L80, L84). La verificación de completitud de Phase 7 fallará si el agente siguió las instrucciones de creación. | workflow-structure/SKILL.md | L40, L80 | ALTO |
| GAP-004 | `assets/categorization-plan.md.template` referenciado para WPs con >50 issues (L55) pero no existe en assets/. Condición de uso poco frecuente pero el template declarado es inexistente. | workflow-decompose/SKILL.md | L55 | MEDIO |
| GAP-005 | `assets/error-report.md.template` referenciado explícitamente para crear ERR-NNN (L82) pero no existe en workflow-implement/assets/. El agente no puede seguir la instrucción literal — debe crear el archivo sin template. | workflow-implement/SKILL.md | L82 | ALTO |
| GAP-006 | Dos versiones divergentes de `validate-session-close.sh` en uso simultáneo: Phase 11 ejecuta `workflow-track/scripts/validate-session-close.sh` (versión antigua, verifica focus.md + phase + commits + placeholders) y Phase 12 ejecuta `.claude/scripts/validate-session-close.sh` (versión actual, verifica timestamps + agentes huérfanos + consistencia now.md). Las validaciones son distintas e incompatibles — una puede pasar y la otra fallar sobre el mismo estado. | workflow-track/SKILL.md L27 vs workflow-standardize/SKILL.md L92 | L27 / L92 | ALTO |
| GAP-007 | workflow-track L35: "Phase 7 es single-agent por diseño" — el número "7" es residuo de numeración anterior; en el contexto actual es Phase 11 la que se describe. Bajo impacto operacional pero genera confusión de lectura. | workflow-track/SKILL.md | L35 | BAJO |
| GAP-008 | workflow-structure, workflow-decompose y workflow-track instruyen creación de archivos pero no declaran `Write` ni `Edit` en `allowed-tools`. workflow-pilot, workflow-implement y workflow-standardize sí los declaran. La inconsistencia puede causar comportamiento restrictivo en contextos donde los tools se filtran por allowed-tools. | workflow-structure/SKILL.md L4, workflow-decompose/SKILL.md L4, workflow-track/SKILL.md L4 | L4 | MEDIO |

---

## Propuestas de tasks

### CRÍTICO (sin bloqueo inmediato pero con riesgo de ejecución)

**TASK-G01 — Crear `workflow-structure/assets/document.md.template`** [GAP-002, ALTO]
- Problema: L51 de workflow-structure/SKILL.md referencia el template como instrucción de ejecución directa.
- Acción: crear el template con metadata estándar + secciones genéricas para documentos técnicos sin tipo específico.
- Dependencia: ninguna.
- Archivo destino: `/home/user/thyrox/.claude/skills/workflow-structure/assets/document.md.template`

**TASK-G02 — Crear `workflow-implement/assets/error-report.md.template`** [GAP-005, ALTO]
- Problema: L82 de workflow-implement/SKILL.md instruye explícitamente usar ese template al registrar errores en Phase 10. Sin él, el agente crea ERR-NNN sin estructura consistente.
- Acción: crear template con campos: descripción del error, contexto, tarea que falló, approach intentado, siguiente approach.
- Dependencia: ninguna.
- Archivo destino: `/home/user/thyrox/.claude/skills/workflow-implement/assets/error-report.md.template`

**TASK-G03 — Resolver inconsistencia de ruta en workflow-structure** [GAP-003, ALTO]
- Problema: las instrucciones de creación (L40, L45) y los exit criteria (L80, L84) apuntan a rutas distintas para el requirements-spec.
- Acción: decidir si requirements-spec vive en raíz del WP o en `design/`. Actualizar el SKILL.md para que instrucciones y exit criteria sean coherentes. Actualizar también el input esperado en workflow-decompose/SKILL.md L24 si cambia la ruta.
- Dependencia: decisión de diseño sobre anatomía del WP Phase 7.
- Archivos: `workflow-structure/SKILL.md` (L40-45 + L80-84), `workflow-decompose/SKILL.md` (L24 si aplica).

**TASK-G04 — Unificar `validate-session-close.sh`** [GAP-006, ALTO]
- Problema: workflow-track invoca la versión local (antigua) y workflow-standardize invoca la versión global (actual). Las validaciones son sustancialmente distintas — una puede pasar lo que la otra rechaza.
- Acción opción A: eliminar `workflow-track/scripts/validate-session-close.sh` y actualizar L27 de workflow-track/SKILL.md para usar `.claude/scripts/validate-session-close.sh`.
- Acción opción B: hacer que la versión local llame a la global como wrapper.
- Dependencia: ninguna. Opción A es más simple.
- Archivos: `workflow-track/SKILL.md` (L27), `workflow-track/scripts/validate-session-close.sh` (eliminar o reemplazar).

### MEDIO (mejoras de calidad, no bloquean ejecución)

**TASK-G05 — Corregir label "Phase 2 SOLUTION_STRATEGY" en workflow-strategy** [GAP-001, MEDIO]
- Problema: L32 tiene el encabezado incorrecto. Corregir a "Phase 5 STRATEGY".
- Archivo: `workflow-strategy/SKILL.md` (L32).

**TASK-G06 — Crear `workflow-decompose/assets/categorization-plan.md.template`** [GAP-004, MEDIO]
- Problema: referenciado en L55 para WPs con >50 issues. Template inexistente.
- Acción: crear template con estructura de categorización por tipo, prioridad y dominio.
- Archivo destino: `/home/user/thyrox/.claude/skills/workflow-decompose/assets/categorization-plan.md.template`

**TASK-G07 — Agregar Write/Edit a allowed-tools de workflow-structure, workflow-decompose y workflow-track** [GAP-008, MEDIO]
- Problema: los tres skills instruyen creación de archivos sin declarar los tools necesarios.
- Acción: agregar `Write Edit` a `allowed-tools` en los tres SKILL.md.
- Archivos: `workflow-structure/SKILL.md` (L4), `workflow-decompose/SKILL.md` (L4), `workflow-track/SKILL.md` (L4).

**TASK-G08 — Corregir "Phase 7" residual en workflow-track** [GAP-007, BAJO]
- Problema: L35 dice "Phase 7 es single-agent por diseño" cuando debería decir "Phase 11".
- Archivo: `workflow-track/SKILL.md` (L35).
```
