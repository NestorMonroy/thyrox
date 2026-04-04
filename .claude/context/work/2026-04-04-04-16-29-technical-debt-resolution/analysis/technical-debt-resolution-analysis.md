```yml
ID work package: 2026-04-04-04-16-29-technical-debt-resolution
Fecha: 2026-04-04-04-16-29
Proyecto: THYROX
Fase: 1 - ANALYZE
Autor: claude
```

# Análisis — Technical Debt Resolution

## Propósito

Inventario completo de deuda técnica activa en el proyecto THYROX:
1. 6 templates huérfanos en `assets/` sin referencia en ningún flujo
2. 7 tareas pendientes del WP `skill-consistency` (2026-03-31)
3. TD-001: timestamps incompletos en artefactos
4. TD-002: Phase 3 sin artefacto WP (parcialmente resuelto)
5. T-DT-001: `examples.md` con nomenclatura de fases desactualizada

---

## 1. Templates Huérfanos en `assets/`

### 1.1 Inventario completo

Los siguientes 6 templates existen en `.claude/skills/pm-thyrox/assets/` pero NO están
referenciados en `SKILL.md` ni en ningún `references/*.md` activo del flujo:

| Template | Descripción | Fase potencial | Duplica |
|----------|-------------|----------------|---------|
| `ad-hoc-tasks.md.template` | Tracking de tareas informales sin WP formal | Phase 6 (EXECUTE) | Parcial: vs `tasks.md.template` (formal) |
| `analysis-phase.md.template` | Inventario de 100+ issues con severidad | Phase 1 (ANALYZE) | Sí: `introduction.md.template` cubre el mismo dominio |
| `categorization-plan.md.template` | Batching de issues en lotes con timeline | Phase 3/5 | Parcial: vs `tasks.md.template` |
| `document.md.template` | Template genérico para cualquier documento | Ninguna | No |
| `project.json.template` | Metadata de project progress en JSON | Cross-phase | No |
| `refactors.md.template` | Tracking de deuda técnica por categoría | Phase 6/7 | Parcial: vs `risk-register.md.template` |

### 1.2 Análisis detallado por template

#### `ad-hoc-tasks.md.template`

**Estructura:** Metadata + secciones por categoría (Docs, Code, Testing, DevOps) con checkboxes.
Nota interna: "mover a ROADMAP si >5 items acumulados".

**Evaluación:** Valor legítimo. Cubre el caso de tareas que emergen durante Phase 6 y no
justifican abrir un task-plan formal. `tasks.md.template` usa `[T-NNN]` con trazabilidad
a specs — no es sustituto para trabajo ad-hoc.

**Decisión: MANTENER + MAPEAR a Phase 6.** Agregar referencia en SKILL.md Phase 6 como
alternativa para tareas informales: "Si hay >3 tareas ad-hoc sin SPEC, usar
`ad-hoc-tasks.md.template`".

---

#### `analysis-phase.md.template`

**Estructura:** Inventario exhaustivo de 100+ issues con tabla de distribución por severidad,
patrones de anti-patterns, top-10 archivos afectados, estrategias de resolución.

**Evaluación:** Diseñado para un caso muy específico: auditorías masivas de issues en proyectos
legacy. Duplica el propósito de `introduction.md.template` para el 99% de los casos. SKILL.md
ya tiene el flujo: Phase 1 con `introduction.md` + sub-análisis especializados.

**Decisión: ELIMINAR.** Cuando se necesita analizar 100+ issues, el flujo normal es Phase 1
con `introduction.md.template`. Si la escala lo justifica, se puede referenciar
`references/incremental-correction.md`. No se necesita un template separado.

---

#### `categorization-plan.md.template`

**Estructura:** Estrategia de batching con Gantt, validación entre lotes, rollback plan.
Asume explícitamente ">100 issues" con un identificador numérico por issue.

**Evaluación:** Demasiado específico para remediation masiva de proyectos legacy. El flujo
normal de PM-THYROX cubre la descomposición en Phase 5 con `tasks.md.template`.
Este template asume un dominio de problema que no es el caso general.

**Decisión: ELIMINAR.** El caso de batching masivo está documentado en
`references/incremental-correction.md`. Un template separado agrega ruido sin
agregar valor al flujo estándar.

---

#### `document.md.template`

**Estructura:** Template genérico con secciones Purpose, Executive Summary, TOC, Introduction,
Main Sections (3), Examples, Best Practices, Common Issues, References, Changelog.

**Evaluación:** No está ligado a ninguna fase. Es boilerplate para "cualquier documento".
En un framework donde cada fase tiene su template específico, esto genera ambigüedad:
¿cuándo se usa `document.md` vs `introduction.md` vs `solution-strategy.md`?

**Decisión: ELIMINAR.** Los templates fase-específicos ya cubren todos los documentos que
PM-THYROX produce. Un template genérico contradice el principio de "fase tiene un output".

---

#### `project.json.template`

**Estructura:** JSON con `metadata`, `phases` (7 objetos con status/timing/artifacts),
`timing`, `decisions`, `completion_checklist`.

**Evaluación:** Viola directamente ADR-001 "Markdown only — Sin bases de datos, sin formatos
propietarios". Además, ningún script del repositorio consume este archivo — existe sin
tooling que lo lea. La información que captura ya vive en los artefactos Markdown del WP
y en ROADMAP.md.

**Decisión: ELIMINAR.** Viola ADR-001. Sin tooling que lo consuma. Información duplicada
en artefactos Markdown existentes.

---

#### `refactors.md.template`

**Estructura:** Tracking de refactoring por categoría (Code Quality, Performance, Security,
Structure) con prioridad alta/media/baja. Incluye proceso de uso y criteria de completitud.

**Evaluación:** Valor legítimo específico para deuda técnica de código. `risk-register.md.template`
es más amplio (riesgos + deuda). `refactors.md` tiene granularidad útil: separa por
categoría técnica (performance vs security vs structure). No duplica exactamente al
risk-register.

**Decisión: MANTENER + MAPEAR.** Agregar referencia en SKILL.md Phase 6 (si surgen refactors
durante ejecución) y Phase 7 (si refactors se identifican al cerrar WP). Nota en
`risk-register.md.template` indicando que deuda de código puede usar `refactors.md.template`.

---

### 1.3 Resumen de decisiones

```
ad-hoc-tasks.md.template   → MANTENER: mapear a Phase 6 en SKILL.md
analysis-phase.md.template → ELIMINAR: duplica flujo Phase 1
categorization-plan.md.template → ELIMINAR: demasiado específico
document.md.template       → ELIMINAR: genérico, contradice framework
project.json.template      → ELIMINAR: viola ADR-001
refactors.md.template      → MANTENER: mapear a Phase 6 + Phase 7 en SKILL.md
```

---

## 2. WP `skill-consistency` — 7 Tareas Pendientes

**WP:** `context/work/2026-03-31-06-14-23-skill-consistency/`

Este WP tiene 7 tareas registradas, todas en estado `[ ]` pendiente. Nunca avanzó
a Phase 6 (EXECUTE).

### Tareas identificadas

| ID | Descripción | Dependencias |
|----|-------------|--------------|
| T-001 | Renombrar `AD_HOC_TASKS.md.template` → `ad-hoc-tasks.md.template` | — |
| T-002 | Renombrar `EXIT_CONDITIONS.md.template` → `exit-conditions.md.template` | — |
| T-003 | Renombrar `REFACTORS.md.template` → `refactors.md.template` | — |
| T-004 | Actualizar referencias en `examples.md`, `reference-validation.md`, `scalability.md`, `trigger-evals.json` | T-001..T-003 |
| T-005 | Agregar limpieza de `context/decisions/` en `setup-template.sh` | — |
| T-006 | Reescribir flujo de sesión en `CLAUDE.md` | T-005 |
| T-007 | Actualizar `focus.md` + `now.md` | T-006 |

### Evaluación de relevancia actual

- **T-001:** `AD_HOC_TASKS.md.template` ya NO EXISTE — fue renombrado en una sesión
  posterior como `ad-hoc-tasks.md.template`. Ya completado en la práctica.
- **T-002:** `EXIT_CONDITIONS.md.template` ya NO EXISTE — fue renombrado en una sesión
  posterior como `exit-conditions.md.template`. Ya completado en la práctica.
- **T-003:** `REFACTORS.md.template` ya NO EXISTE — fue renombrado en una sesión
  posterior como `refactors.md.template`. Ya completado en la práctica.
- **T-004:** Actualizar referencias — verificar si `examples.md` y otros aún mencionan
  nombres en mayúsculas. Puede ser relevante aún.
- **T-005:** `setup-template.sh` — verificar si limpieza de `context/decisions/` ya está implementada.
- **T-006:** CLAUDE.md flujo de sesión — ya fue reescrito en sesiones posteriores (FASE 5).
  Completado en la práctica.
- **T-007:** `focus.md` + `now.md` — actualizados en esta misma sesión. Completado.

**Conclusión:** T-001, T-002, T-003, T-006, T-007 ya están implementados. Solo T-004
(actualizar referencias en `examples.md`) y T-005 (setup-template.sh) requieren verificación.

---

## 3. TD-001: Timestamps Incompletos en Artefactos

**Origen:** Revisión 2026-04-03. Registrado en `technical-debt.md`.

**Problema:** El campo `Fecha:` en artefactos WP se instancia frecuentemente como
`YYYY-MM-DD` (sin hora) en lugar de `YYYY-MM-DD-HH-MM-SS`.

**Artefactos afectados conocidos:**
- `voltfactory-adaptation-solution-strategy.md` tenía `Fecha: 2026-04-03` (corregido)
- Otros WPs históricos no auditados

**Resolución requerida:**
1. Auditar todos los artefactos en WPs activos que tengan `Fecha:` sin componente de hora
2. Agregar regla en `references/conventions.md`: el campo `Fecha:` siempre usa `YYYY-MM-DD-HH-MM-SS`
3. Agregar validación en `validate-session-close.sh`: detectar `Fecha: \d{4}-\d{2}-\d{2}$`

---

## 4. TD-002: Phase 3 sin Artefacto en el WP (Estado Actual)

**Origen:** Revisión 2026-04-03. Registrado en `technical-debt.md`.

**Estado actual (2026-04-04):**
- `plan.md.template` — CREADO en WP `voltfactory-adaptation`
- SKILL.md Phase 3 — ACTUALIZADO: paso 3 REQUERIDO con `{nombre-wp}-plan.md`
- `validate-phase-readiness.sh` — NO verifica `*-plan.md` para Phase 3

**Resolución pendiente:**
1. Verificar que `validate-phase-readiness.sh` incluya check de `*-plan.md` en Phase 3
2. Si no, agregar la verificación al script

**Nota:** TD-002 está prácticamente resuelto. Solo falta confirmación del script de validación.

---

## 5. T-DT-001: `examples.md` con Nomenclatura Desactualizada

**Origen:** WP `skill-activation-failure` (2026-04-01). Última tarea pendiente del WP.

**Problema:** `references/examples.md` usa nomenclatura antigua de fases.
Ejemplo: "Phase 1: PLAN" en lugar de "Phase 1: ANALYZE". Puede confundir a Claude
en modelos más pequeños (Haiku) que dependen más del contenido literal.

**Impacto:** Bajo (no bloquea compatibilidad Haiku; solo mejora claridad).

**Resolución:** Actualizar nomenclatura de fases en `examples.md` para que coincida
con el SKILL.md actual (ANALYZE, SOLUTION_STRATEGY, PLAN, STRUCTURE, DECOMPOSE, EXECUTE, TRACK).

---

## 6. Verificación de Scripts

Los siguientes scripts son referenciados en SKILL.md Phase 7 y deben verificarse:

| Script | Referenciado en | ¿Existe? |
|--------|----------------|----------|
| `validate-phase-readiness.sh` | SKILL.md Phase 7, workflow commands | A verificar |
| `validate-session-close.sh` | SKILL.md Phase 7 | A verificar |
| `project-status.sh` | SKILL.md Phase 7 | A verificar |
| `session-start.sh` | settings.json (SessionStart hook) | Confirmado existente |

---

## 7. Síntesis — Qué Requiere Implementación Real

Ordenado por impacto y dependencias:

### Grupo A — Templates (baja fricción, alto valor de claridad)
- Eliminar 4 templates: `analysis-phase.md`, `categorization-plan.md`, `document.md`, `project.json`
- Mapear 2 templates: `ad-hoc-tasks.md` y `refactors.md` a fases en SKILL.md

### Grupo B — Referencias desactualizadas (bajo esfuerzo)
- T-004 del WP skill-consistency: verificar y corregir nombres en `examples.md`, `reference-validation.md`, `scalability.md`
- T-DT-001: actualizar nomenclatura de fases en `examples.md`
- Cerrar formalmente el WP `skill-consistency` (marcar tareas resueltas, crear lessons-learned)

### Grupo C — Convenciones y validación (impacto estructural)
- TD-001: agregar regla de timestamp en `conventions.md`
- TD-001: agregar validación en `validate-session-close.sh`
- TD-002: verificar y agregar check de `*-plan.md` en `validate-phase-readiness.sh` Phase 3

### Grupo D — Setup template
- T-005 del WP skill-consistency: agregar limpieza de `context/decisions/` en `setup-template.sh`

---

## 8. Decisión Arquitectónica Clave

**No mover templates a `assets/legacy/`.**

Los 4 templates a eliminar se borrarán directamente (ADR-008: Git as persistence).
El historial git preserva el contenido si se necesita en el futuro. No crear
directorios legacy que acumulen ruido.

Los 2 templates a mantener se mapean explícitamente a fases en SKILL.md.

---

## 9. Fuera de Scope

- Auditoría de WPs históricos (pre-2026-04) para timestamps — demasiado volumen, bajo valor
- Refactoring de referencias dentro de los WPs históricos archivados
- Nueva funcionalidad (este WP es solo deuda técnica)
