```yml
type: Requirements Spec
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-09 01:00:00
updated_at: 2026-04-09 01:00:00
phase: Phase 4 — STRUCTURE
complexity: Complejo (16 tareas en 4 bloques)
reversibility: reversible
```

# Requirements Spec: workflow-restructure (FASE 23)

## Overview

Convertir 7 `workflow_*.md` flat files a subdirectorios `workflow-*/SKILL.md` con frontmatter oficial
(TD-019). Actualizar referencias externas. Añadir contenido faltante. Reducir `pm-thyrox/SKILL.md`
de ~471 a ~130 líneas.

Basado en: [solution-strategy](workflow-restructure-solution-strategy.md) · [plan](workflow-restructure-plan.md)

---

## BLOQUE M — Migración (7 specs)

### SPEC-M-01: Migrar `workflow_analyze.md` → `workflow-analyze/SKILL.md`

**Descripción:** Crear `.claude/skills/workflow-analyze/SKILL.md` con frontmatter oficial y contenido
actualizado del flat file. Eliminar `.claude/skills/workflow_analyze.md`.

**Pre-condición:** `.claude/skills/workflow_analyze.md` existe con su contenido actual.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-analyze/` existe como directorio
- [ ] `.claude/skills/workflow-analyze/SKILL.md` tiene exactamente el siguiente frontmatter:
  ```yaml
  ---
  name: workflow-analyze
  description: Phase 1 ANALYZE — inicia o retoma el análisis del work package activo.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 1' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Cuerpo del SKILL.md: encabezado principal actualizado de `# /workflow_analyze — Phase 1: ANALYZE`
  a `# /workflow-analyze — Phase 1: ANALYZE`
- [ ] Referencia interna en línea 25 actualizada: `Proponer '/workflow_strategy'.`
  → `Proponer '/workflow-strategy'.`
- [ ] Referencia interna en línea 93 actualizada: `proponer '/workflow_strategy' para Phase 2.`
  → `proponer '/workflow-strategy' para Phase 2.`
- [ ] El resto del cuerpo (lógica de fase, gates, exit criteria) **no cambia**
- [ ] `.claude/skills/workflow_analyze.md` NO existe

---

### SPEC-M-02: Migrar `workflow_strategy.md` → `workflow-strategy/SKILL.md`

**Pre-condición:** `.claude/skills/workflow_strategy.md` existe.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-strategy/SKILL.md` tiene exactamente:
  ```yaml
  ---
  name: workflow-strategy
  description: Phase 2 SOLUTION_STRATEGY — inicia o retoma la estrategia del work package activo.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 2' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Encabezado: `# /workflow_strategy — Phase 2: SOLUTION_STRATEGY`
  → `# /workflow-strategy — Phase 2: SOLUTION_STRATEGY`
- [ ] Referencia línea 24: `Proponer '/workflow_plan'.` → `Proponer '/workflow-plan'.`
- [ ] Referencia línea 75: `proponer '/workflow_plan' para Phase 3.`
  → `proponer '/workflow-plan' para Phase 3.`
- [ ] Lógica de fase sin cambios
- [ ] `.claude/skills/workflow_strategy.md` NO existe

---

### SPEC-M-03: Migrar `workflow_plan.md` → `workflow-plan/SKILL.md`

**Pre-condición:** `.claude/skills/workflow_plan.md` existe.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-plan/SKILL.md` tiene exactamente:
  ```yaml
  ---
  name: workflow-plan
  description: Phase 3 PLAN — inicia o retoma el plan del work package activo.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 3' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Encabezado: `# /workflow_plan — Phase 3: PLAN` → `# /workflow-plan — Phase 3: PLAN`
- [ ] Referencia línea 23: `Proponer '/workflow_structure'.` → `Proponer '/workflow-structure'.`
- [ ] Referencia línea 70: `proponer '/workflow_structure' para Phase 4.`
  → `proponer '/workflow-structure' para Phase 4.`
- [ ] Lógica de fase sin cambios
- [ ] `.claude/skills/workflow_plan.md` NO existe

---

### SPEC-M-04: Migrar `workflow_structure.md` → `workflow-structure/SKILL.md`

**Pre-condición:** `.claude/skills/workflow_structure.md` existe.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-structure/SKILL.md` tiene exactamente:
  ```yaml
  ---
  name: workflow-structure
  description: Phase 4 STRUCTURE — inicia o retoma la especificación del work package activo.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 4' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Encabezado: `# /workflow_structure — Phase 4: STRUCTURE`
  → `# /workflow-structure — Phase 4: STRUCTURE`
- [ ] Referencia línea 24: `Proponer '/workflow_decompose'.` → `Proponer '/workflow-decompose'.`
- [ ] Referencia línea 73: `proponer '/workflow_decompose' para Phase 5.`
  → `proponer '/workflow-decompose' para Phase 5.`
- [ ] Lógica de fase sin cambios
- [ ] `.claude/skills/workflow_structure.md` NO existe

---

### SPEC-M-05: Migrar `workflow_decompose.md` → `workflow-decompose/SKILL.md`

**Pre-condición:** `.claude/skills/workflow_decompose.md` existe.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-decompose/SKILL.md` tiene exactamente:
  ```yaml
  ---
  name: workflow-decompose
  description: Phase 5 DECOMPOSE — inicia o retoma la descomposición del work package activo.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 5' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Encabezado: `# /workflow_decompose — Phase 5: DECOMPOSE`
  → `# /workflow-decompose — Phase 5: DECOMPOSE`
- [ ] Referencia línea 24: `Proponer '/workflow_execute'.` → `Proponer '/workflow-execute'.`
- [ ] Referencia línea 85: `proponer '/workflow_execute' para Phase 6.`
  → `proponer '/workflow-execute' para Phase 6.`
- [ ] Lógica de fase sin cambios
- [ ] `.claude/skills/workflow_decompose.md` NO existe

---

### SPEC-M-06: Migrar `workflow_execute.md` → `workflow-execute/SKILL.md`

**Pre-condición:** `.claude/skills/workflow_execute.md` existe.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-execute/SKILL.md` tiene exactamente:
  ```yaml
  ---
  name: workflow-execute
  description: Phase 6 EXECUTE — toma la siguiente tarea pendiente del work package activo y la ejecuta.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 6' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Encabezado: `# /workflow_execute — Phase 6: EXECUTE`
  → `# /workflow-execute — Phase 6: EXECUTE`
- [ ] Referencia línea 94: `proponer '/workflow_track' para Phase 7.`
  → `proponer '/workflow-track' para Phase 7.`
- [ ] Sección `/loop` (líneas 99-108): `workflow_execute` → `workflow-execute` (2 ocurrencias)
- [ ] Lógica de fase sin cambios
- [ ] `.claude/skills/workflow_execute.md` NO existe

---

### SPEC-M-07: Migrar `workflow_track.md` → `workflow-track/SKILL.md`

**Pre-condición:** `.claude/skills/workflow_track.md` existe.

**Acceptance criteria:**

- [ ] `.claude/skills/workflow-track/SKILL.md` tiene exactamente:
  ```yaml
  ---
  name: workflow-track
  description: Phase 7 TRACK — documenta lecciones aprendidas, genera changelog y cierra el work package activo.
  disable-model-invocation: true
  hooks:
    - event: UserPromptSubmit
      once: true
      type: command
      command: "echo 'phase: Phase 7' >> .claude/context/now.md"
  updated_at: 2026-04-09 00:00:00
  ---
  ```
- [ ] Encabezado: `# /workflow_track — Phase 7: TRACK` → `# /workflow-track — Phase 7: TRACK`
- [ ] Sin referencias cruzadas a otros workflow skills (no hay cambios de contenido internos adicionales)
- [ ] Lógica de fase sin cambios
- [ ] `.claude/skills/workflow_track.md` NO existe

---

## BLOQUE R — Referencias externas (5 specs)

### SPEC-R-01: Actualizar `session-start.sh`

**Archivo:** `.claude/skills/pm-thyrox/scripts/session-start.sh`

**Acceptance criteria:**

- [ ] Función `_phase_to_command()` (líneas 17-27): 8 ocurrencias de `/workflow_*` → `/workflow-*`:
  ```bash
  # Antes:
  "Phase 1") echo "/workflow_analyze" ;;
  "Phase 2") echo "/workflow_strategy" ;;
  "Phase 3") echo "/workflow_plan" ;;
  "Phase 4") echo "/workflow_structure" ;;
  "Phase 5") echo "/workflow_decompose" ;;
  "Phase 6") echo "/workflow_execute" ;;
  "Phase 7") echo "/workflow_track" ;;
  *) echo "/workflow_analyze" ;;

  # Después:
  "Phase 1") echo "/workflow-analyze" ;;
  "Phase 2") echo "/workflow-strategy" ;;
  "Phase 3") echo "/workflow-plan" ;;
  "Phase 4") echo "/workflow-structure" ;;
  "Phase 5") echo "/workflow-decompose" ;;
  "Phase 6") echo "/workflow-execute" ;;
  "Phase 7") echo "/workflow-track" ;;
  *) echo "/workflow-analyze" ;;
  ```
- [ ] Línea 82 (fallback "sin WP activo"): `/workflow_analyze` → `/workflow-analyze`
- [ ] Comentarios de líneas 10-11: `/workflow_*` → `/workflow-*` (2 ocurrencias en comentarios)
- [ ] Sin otros cambios al script

---

### SPEC-R-02: Actualizar `CLAUDE.md` — Addendum Locked Decision #5

**Archivo:** `.claude/CLAUDE.md`

**Acceptance criteria:**

- [ ] Locked Decision #5 addendum actualizado:
  ```markdown
  # Antes:
     *Addendum FASE 22:* Los 7 `workflow_*` skills (workflow_analyze, …, workflow_track) son la
     excepción intencional: son herramientas de ejecución por fase, no skills de dominio tecnológico.
     Esta excepción está documentada en ADR-016. La regla original sigue vigente para tech skills
     (python, react, etc.). Ver TD-019 para la resolución de estructura (subdirectorio vs flat file).

  # Después:
     *Addendum FASE 22:* Los 7 `workflow-*` skills (workflow-analyze, …, workflow-track) son la
     excepción intencional: son herramientas de ejecución por fase, no skills de dominio tecnológico.
     Esta excepción está documentada en ADR-016. La regla original sigue vigente para tech skills
     (python, react, etc.).
     *Addendum FASE 23:* Nomenclatura resuelta a kebab-case hyphens — `workflow-*/SKILL.md`.
     TD-019 cerrado (FASE 23).
  ```
- [ ] Sin otros cambios a CLAUDE.md

---

### SPEC-R-03: Actualizar `commands/workflow_init.md`

**Archivo:** `.claude/commands/workflow_init.md`

**Acceptance criteria:**

- [ ] Línea 108 actualizada:
  ```markdown
  # Antes:
  - Siguiente paso sugerido: `/workflow_analyze` para empezar Phase 1

  # Después:
  - Siguiente paso sugerido: `/workflow-analyze` para empezar Phase 1
  ```
- [ ] Sin otros cambios al archivo

---

### SPEC-R-04: Actualizar `adr-016.md` — Addendum FASE 23

**Archivo:** `.claude/context/decisions/adr-016.md`

**Justificación:** Los ADRs son registros históricos inmutables. La técnica correcta es añadir un
addendum al final en lugar de modificar el cuerpo histórico.

**Acceptance criteria:**

- [ ] Se añade al final del archivo una sección `## Addendum — FASE 23 (2026-04-09)`:
  ```markdown
  ## Addendum — FASE 23 (2026-04-09)

  **Cambio de nomenclatura:** Los 7 skills migrados en esta FASE usan guiones (kebab-case) en lugar
  de underscores, resolviendo TD-019. Los paths y comandos mencionados en este ADR como
  `workflow_analyze`, `workflow_*.md`, `/workflow_{fase}` corresponden ahora a:
  `workflow-analyze/SKILL.md`, `workflow-*/SKILL.md`, `/workflow-{fase}`.

  El campo `name:` en el frontmatter oficial de Claude Code solo acepta `a-z`, `0-9`, `-` (hyphens)
  — underscores no son válidos. La migración a hyphens es el único formato correcto per docs oficiales.

  **WP:** `2026-04-08-23-55-52-workflow-restructure`
  ```
- [ ] Sin modificaciones al cuerpo histórico del ADR

---

### SPEC-R-05: Actualizar `technical-debt.md` — referencias `workflow_*`

**Archivo:** `.claude/context/technical-debt.md`

**Scope:** Actualizar referencias en las descripciones de TD-019, TD-020, TD-021, TD-022, TD-023
donde se menciona el estado TARGET (cómo debería quedar), cambiando `workflow_*` → `workflow-*`.
Las referencias históricas del estado PROBLEMA se dejan como están.

**Acceptance criteria:**

- [ ] TD-019: Sección de resolución/criterio de cierre actualiza los paths target a `workflow-analyze/SKILL.md`,
  `workflow-strategy/SKILL.md`, etc. (hyphens)
- [ ] TD-020: Descripción del target `workflow_analyze` → `workflow-analyze`
- [ ] TD-021: Referencias target actualizadas
- [ ] TD-022: Referencias target actualizadas
- [ ] TD-023: Referencias target actualizadas
- [ ] Ninguna referencia histórica (estado PROBLEMA) se modifica — se preservan para trazabilidad

---

## BLOQUE TD — Deuda técnica (3 specs)

### SPEC-TD-01: Añadir tabla de escalabilidad a `workflow-analyze/SKILL.md`

**Pre-condición:** SPEC-M-01 completado (workflow-analyze/SKILL.md existe).

**Descripción:** Mover la tabla de escalabilidad desde `pm-thyrox/SKILL.md` (parte de S-01) hacia
`workflow-analyze/SKILL.md`. El contenido de esta sección en SKILL.md se elimina en S-01.

**Acceptance criteria:**

- [ ] `workflow-analyze/SKILL.md` contiene una nueva sección `## Escalabilidad` antes de
  `## Contexto de sesión`, con exactamente:
  ```markdown
  ## Escalabilidad

  Determinar qué fases son obligatorias antes de empezar el análisis:

  | Tamaño | Duración | Fases activas | Qué omitir |
  |--------|----------|---------------|------------|
  | Micro | <30 min | 1, 6, 7 | Phases 2, 3, 4, 5 (spec y plan opcionales) |
  | Pequeño | 30 min – 2h | 1, 2, 6, 7 | Phases 3, 4, 5 (no requiere plan formal) |
  | Mediano | 2h – 8h | 1, 2, 3, 4, 5, 6, 7 | Ninguna — seguir las 7 fases completas |
  | Grande | >8h | 1, 2, 3, 4, 5, 6, 7 | Ninguna — usar epic.md para agrupar features |

  Ver [escalabilidad](../../pm-thyrox/references/scalability.md) para detalles y casos de borde.
  ```
- [ ] TD-020 marcado como `[-]` en `technical-debt.md` al completarse esta tarea

---

### SPEC-TD-02: Añadir `owner:` a frontmatter de 24 archivos en `references/`

**Directorio:** `.claude/skills/pm-thyrox/references/`

**Descripción:** Añadir campo `owner:` al frontmatter YAML de cada archivo de referencia.

**Mapeo completo (24 archivos):**

| Archivo | owner a añadir |
|---------|---------------|
| `introduction.md` | `workflow-analyze` |
| `requirements-analysis.md` | `workflow-analyze` |
| `use-cases.md` | `workflow-analyze` |
| `quality-goals.md` | `workflow-analyze` |
| `stakeholders.md` | `workflow-analyze` |
| `basic-usage.md` | `workflow-analyze` |
| `constraints.md` | `workflow-analyze` |
| `context.md` | `workflow-analyze` |
| `solution-strategy.md` | `workflow-strategy` |
| `spec-driven-development.md` | `workflow-structure` |
| `commit-helper.md` | `workflow-execute` |
| `commit-convention.md` | `workflow-execute` |
| `reference-validation.md` | `workflow-track` |
| `incremental-correction.md` | `workflow-track` |
| `conventions.md` | `pm-thyrox (cross-phase)` |
| `scalability.md` | `workflow-analyze` |
| `examples.md` | `pm-thyrox (cross-phase)` |
| `agent-spec.md` | `pm-thyrox (cross-phase)` |
| `skill-vs-agent.md` | `pm-thyrox (cross-phase)` |
| `state-management.md` | `pm-thyrox (cross-phase)` |
| `skill-authoring.md` | `pm-thyrox (cross-phase)` |
| `prompting-tips.md` | `pm-thyrox (cross-phase)` |
| `long-context-tips.md` | `pm-thyrox (cross-phase)` |
| `claude-code-components.md` | `pm-thyrox (cross-phase)` |

**Acceptance criteria:**

- [ ] Los 24 archivos tienen `owner:` en su frontmatter YAML
- [ ] El valor de `owner:` coincide exactamente con la tabla anterior
- [ ] El frontmatter de cada archivo permanece válido YAML (sin romper estructura existente)
- [ ] Sin cambios al cuerpo de los archivos (solo frontmatter)
- [ ] TD-023 marcado como `[-]` en `technical-debt.md` al completarse

---

### SPEC-TD-03: Actualizar `agent-spec.md` — corregir campos según docs oficiales

**Archivo:** `.claude/skills/pm-thyrox/references/agent-spec.md`

**Descripción:** El campo `model` está marcado como PROHIBIDO pero las docs oficiales lo validan.
El campo `tools` está marcado como REQUERIDO pero las docs oficiales lo hacen opcional.

**Acceptance criteria:**

- [ ] Tabla de campos: fila `model` cambiada de `PROHIBIDO` a `Opcional`:
  ```markdown
  # Antes:
  | `model` | PROHIBIDO | Metadata del registry. Claude Code infiere el modelo... |

  # Después:
  | `model` | Opcional | `sonnet | opus | haiku | inherit`. Default: `inherit` (hereda del parent). |
  ```
- [ ] Tabla de campos: fila `tools` cambiada de `REQUERIDO` a `Opcional`:
  ```markdown
  # Antes:
  | `tools` | REQUERIDO | Lista YAML de herramientas. Al menos un elemento. |

  # Después:
  | `tools` | Opcional | Lista YAML de herramientas. Si se omite: hereda todas las tools del parent. |
  ```
- [ ] Se añade nota al inicio del archivo (o en la sección de tabla) indicando:
  ```markdown
  > **Nota (2026-04-09):** Campos `model` y `tools` corregidos respecto a versión original.
  > Ver [claude-code-components.md](claude-code-components.md) para referencia oficial completa.
  > TD-024 resuelto.
  ```
- [ ] Sin otros cambios estructurales al archivo
- [ ] TD-024 marcado como `[-]` en `technical-debt.md` al completarse

---

## BLOQUE S — Reducción SKILL.md (1 spec)

### SPEC-S-01: Reducir `pm-thyrox/SKILL.md` de ~471 a ~130 líneas

**Pre-condición:** M-01..M-07 completados, R-01..R-05 completados, TD-01 completado.

**Archivo:** `.claude/skills/pm-thyrox/SKILL.md`

**Regla:** Eliminar la lógica detallada de las 7 fases (ya en `workflow-*/SKILL.md`).
Reemplazar con un catálogo de referencia. Eliminar "Limitaciones conocidas".
Mover escalabilidad table a workflow-analyze (TD-01). Conservar estructura global.

**Mapa de líneas — qué eliminar:**

| Sección | Líneas aprox. | Acción |
|---------|--------------|--------|
| Header + nomenclatura + escalabilidad table | 1-28 | Conservar header/nomenclatura; ELIMINAR la escalabilidad table (líneas 12-21) — ya movida a TD-01 |
| Mermaid flowchart | 29-44 | CONSERVAR |
| `## Limitaciones conocidas y arquitectura objetivo` | 45-56 | ELIMINAR completo |
| `## Las 7 Fases` (Phase 1..7 lógica detallada) | 58-344 | ELIMINAR; REEMPLAZAR con catálogo (ver abajo) |
| `---` separador | 346 | CONSERVAR |
| `## Dónde viven los artefactos` | 348-375 | CONSERVAR |
| `## Estructura de un work package` | 377-407 | CONSERVAR |
| `## Naming` | 409-444 | CONSERVAR |
| `## References por dominio` | 446-471 | CONSERVAR (sin cambios de contenido) |

**Catálogo de fases** (reemplaza líneas 58-344 — ~285 líneas → ~18 líneas):

```markdown
## Catálogo de fases

Cada fase vive en su propio skill. Invocar directamente para ejecutar:

| Fase | Skill | Descripción |
|------|-------|-------------|
| Phase 1: ANALYZE | `/workflow-analyze` | Entender el problema. 8 aspectos + WP + análisis + risk register. |
| Phase 2: SOLUTION_STRATEGY | `/workflow-strategy` | Investigar alternativas. Key Ideas + Research + Decisions. |
| Phase 3: PLAN | `/workflow-plan` | Definir scope. Scope statement + in/out-of-scope + ROADMAP. |
| Phase 4: STRUCTURE | `/workflow-structure` | Especificar. Requirements spec + design (si complejo). |
| Phase 5: DECOMPOSE | `/workflow-decompose` | Crear tareas atómicas. Task plan + DAG + trazabilidad. |
| Phase 6: EXECUTE | `/workflow-execute` | Ejecutar. Commits + actualizar task plan + gates async. |
| Phase 7: TRACK | `/workflow-track` | Cerrar WP. Lessons learned + CHANGELOG + estado. |

Ver [escalabilidad](references/scalability.md) para reglas de qué fases omitir según tamaño del WP.
```

**Resultado esperado:** `pm-thyrox/SKILL.md` ≤ 150 líneas (objetivo ~130).

**Acceptance criteria:**

- [ ] `SKILL.md` ≤ 150 líneas
- [ ] `## Limitaciones conocidas y arquitectura objetivo` NO existe en el archivo
- [ ] `## Las 7 Fases` NO existe en el archivo
- [ ] `## Catálogo de fases` existe con tabla de 7 filas referenciando `/workflow-{phase}`
- [ ] Escalabilidad table (4 filas Micro/Pequeño/Mediano/Grande) NO existe en SKILL.md
  (fue movida a workflow-analyze en TD-01)
- [ ] Mermaid flowchart CONSERVADO
- [ ] `## Dónde viven los artefactos` CONSERVADO íntegro
- [ ] `## Estructura de un work package` CONSERVADO íntegro
- [ ] `## Naming` CONSERVADO íntegro
- [ ] `## References por dominio` CONSERVADO íntegro
- [ ] Header (nombre, descripción, principio core, nomenclatura FASE/Phase) CONSERVADO
- [ ] El archivo es invocable como `/pm-thyrox` sin errores de frontmatter
