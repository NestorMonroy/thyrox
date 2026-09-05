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

**Evaluación:** Diseñado para auditorías masivas de issues en proyectos legacy o sistemas
existentes. `introduction.md.template` captura el análisis general; este template captura
el inventario exhaustivo con severidad, distribución y top-N afectados. Son complementarios,
no duplicados: se usan juntos cuando la escala lo justifica.

**Decisión: MANTENER + MAPEAR a Phase 1.** Cuando Phase 1 encuentra 50+ issues, usar junto
a `introduction.md.template`. Referenciar también desde `references/incremental-correction.md`.
Output: `{nombre-wp}-issue-inventory.md`

---

#### `categorization-plan.md.template`

**Estructura:** Estrategia de batching con Gantt, validación entre lotes, rollback plan.
Asume explícitamente ">100 issues" con un identificador numérico por issue.

**Evaluación:** Complemento de `tasks.md.template` para descomposición de alta escala.
`tasks.md` lista tareas con IDs; este template organiza esas tareas en lotes secuenciales
con validación entre lotes, timeline y rollback. Son complementarios: primero el inventario
de tareas, luego la estrategia de batching.

**Decisión: MANTENER + MAPEAR a Phase 5.** Para descomposición de 30+ tareas, usar
después de `tasks.md.template`. Referenciar también desde `references/scalability.md`.
Output: `{nombre-wp}-batch-plan.md`

---

#### `document.md.template`

**Estructura:** Template genérico con secciones Purpose, Executive Summary, TOC, Introduction,
Main Sections (3), Examples, Best Practices, Common Issues, References, Changelog.

**Evaluación:** Template base para documentos de referencia o guías técnicas que no son
artefactos directos de una fase específica (no es un análisis, ni una estrategia, ni
un plan de tareas). Cubre casos como: runbooks, guías de onboarding, documentación de
APIs internas, referencias técnicas duraderas del proyecto.

**Decisión: MANTENER + MAPEAR como template transversal.** Agregar en SKILL.md junto a
`adr.md.template` y `constitution.md.template` como templates de documentación de soporte.
Cuándo usar: cuando el output es documentación duradera de referencia, no un artefacto de WP.
Output: `{nombre-descriptivo}.md` (sin prefijo de WP)

---

#### `project.json.template`

**Estructura:** JSON con `metadata`, `phases` (7 objetos con status/timing/artifacts),
`timing`, `decisions`, `completion_checklist`.

**Evaluación:** Resumen machine-readable del estado del proyecto por fases. Útil cuando
existe tooling externo (dashboards, pipelines CI/CD, scripts de métricas) que necesita
leer el estado de forma programática. Es un output derivado —no la fuente de verdad—
complementario a los artefactos Markdown del WP.

**Decisión: MANTENER + MAPEAR a Phase 7 (opcional).** Agregar en SKILL.md Phase 7 como
artefacto opcional de cierre, con la nota: "solo si existe tooling que lo consuma".
Output: `{nombre-wp}-project.json`

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

Todos los templates se mantienen. El problema no es su existencia sino que no están
mapeados en el flujo. La solución es mapearlos correctamente en SKILL.md y en los
references correspondientes.

```
ad-hoc-tasks.md.template        → MANTENER + MAPEAR: Phase 6 (EXECUTE)
analysis-phase.md.template      → MANTENER + MAPEAR: Phase 1 (ANALYZE) — escala grande
categorization-plan.md.template → MANTENER + MAPEAR: Phase 5 (DECOMPOSE) — lotes grandes
document.md.template            → MANTENER + MAPEAR: cross-phase (reference docs y ADRs)
project.json.template           → MANTENER + MAPEAR: Phase 7 (TRACK) — resumen machine-readable
refactors.md.template           → MANTENER + MAPEAR: Phase 6 (EXECUTE) + Phase 7 (TRACK)
```

### 1.4 Mapeo detallado por template

#### `ad-hoc-tasks.md.template` → Phase 6: EXECUTE

**Cuándo usar:** Cuando durante la ejecución emergen tareas informales que no tienen
SPEC asignado ni `[T-NNN]` formal. Umbral: si hay >3 tareas ad-hoc, crear este artefacto.
Nota: si el volumen supera 5 items, evaluar si justifican un nuevo task-plan.

**Dónde mapear en SKILL.md:** Phase 6 paso 1, como alternativa al task-plan para
tareas emergentes sin trazabilidad formal.

**Nombre de output:** `{nombre-wp}-ad-hoc-tasks.md`

---

#### `analysis-phase.md.template` → Phase 1: ANALYZE (proyectos de escala grande)

**Cuándo usar:** Cuando Phase 1 encuentra 50+ issues, errores o elementos a corregir
en un sistema existente. `introduction.md.template` captura el análisis general;
`analysis-phase.md.template` captura el inventario exhaustivo con severidad, distribución
y top-N afectados.

**Relación con `introduction.md.template`:** No duplican — son complementarios.
`introduction.md` es el resumen ejecutivo. `analysis-phase.md` es el inventario detallado
(solo se usa cuando la escala lo justifica).

**Dónde mapear en SKILL.md:** Phase 1 paso 3, como artefacto opcional para proyectos
con escala de corrección masiva. También referenciable desde `references/incremental-correction.md`.

**Nombre de output:** `{nombre-wp}-issue-inventory.md`

---

#### `categorization-plan.md.template` → Phase 5: DECOMPOSE (lotes grandes)

**Cuándo usar:** Cuando Phase 5 necesita descomponer 30+ tareas en lotes secuenciales
con validación entre lotes. `tasks.md.template` lista tareas con IDs; `categorization-plan.md`
organiza esas tareas en batches con timeline, checkpoints y rollback.

**Relación con `tasks.md.template`:** Complementarios. Se usa después de `tasks.md`:
primero se lista el inventario de tareas, luego se agrupa en lotes con este template.

**Dónde mapear en SKILL.md:** Phase 5 paso 3, como artefacto opcional para descomposición
de alta escala (>30 tareas). También desde `references/scalability.md`.

**Nombre de output:** `{nombre-wp}-batch-plan.md`

---

#### `document.md.template` → cross-phase (documentos de referencia y soporte)

**Cuándo usar:** Cuando se necesita crear un documento de referencia, guía técnica o
documentación de soporte que no es un artefacto directo de una fase (no es un análisis,
ni una estrategia, ni un plan de tareas). Ejemplos: guías de onboarding, documentación
de APIs internas, runbooks de operación.

**Dónde mapear en SKILL.md:** Sección de templates transversales, junto a `adr.md.template`
y `constitution.md.template`. Indicar que aplica cuando el output es documentación de
referencia sin fase asignada.

**Nombre de output:** `{nombre-descriptivo}.md` (sin prefijo de WP — es documentación
duradera, no artefacto de WP)

---

#### `project.json.template` → Phase 7: TRACK (resumen machine-readable opcional)

**Cuándo usar:** En proyectos donde existe tooling externo (dashboards, pipelines CI/CD,
scripts de métricas) que necesita leer el estado del proyecto de forma programática.
Es un artefacto opcional de cierre en Phase 7, no un requerimiento del flujo.

**Nota de uso:** El contenido que captura (estado de fases, timing, artefactos) debe
ser consistente con los artefactos Markdown del WP. Es un output derivado, no la fuente
de verdad.

**Dónde mapear en SKILL.md:** Phase 7 como artefacto opcional para proyectos con
integración de tooling. Indicar explícitamente: "solo si existe tooling que lo consuma".

**Nombre de output:** `{nombre-wp}-project.json`

---

#### `refactors.md.template` → Phase 6: EXECUTE + Phase 7: TRACK

**Cuándo usar:**
- En Phase 6: cuando durante la implementación se identifican oportunidades de refactor
  que no están en el task-plan. Se crea para trackearlas sin bloquear la tarea en curso.
- En Phase 7: cuando el cierre del WP revela deuda de código que debe registrarse para
  sesiones futuras.

**Relación con `risk-register.md.template`:** `risk-register` cubre riesgos del proyecto
(qué puede salir mal). `refactors.md` cubre deuda de código identificada (qué se puede
mejorar). Son ortogonales.

**Dónde mapear en SKILL.md:** Phase 6 como artefacto opcional para deuda de código
identificada durante ejecución. Phase 7 como artefacto opcional de cierre.

**Nombre de output:** `{nombre-wp}-refactors.md`

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

## 7. Auditoría de WPs Históricos — Deuda Real Encontrada

Todos los `[ ]` en WPs anteriores fueron verificados contra el estado real del repositorio.

### 7.1 WPs con trabajo ya implementado (solo necesitan cierre formal)

Los siguientes WPs tienen todas sus tareas implementadas en sesiones posteriores pero
nunca se marcaron como `[x]` en sus task-plans. Requieren cierre formal:

| WP | Tareas implementadas | Evidencia |
|----|---------------------|-----------|
| `2026-03-27-014512-coherencia-unificacion-fases` | Todos los items de unificación de fases | ROADMAP FASE 2 = 100% ✓ |
| `2026-03-28-015504-covariancia` | Todos los items de covariancia | ROADMAP FASE 3 covariancia = 100% ✓ |
| `2026-03-28-020942-spec-kit-adoption` | Templates + SKILL.md actualizado | ROADMAP FASE 3b = 100% ✓ |
| `2026-03-28-023917-spec-kit-deep-adoption` | validate-phase-readiness.sh + SKILL.md | ROADMAP FASE 3c = 100% ✓ |
| `2026-03-28-18-25-45-cicd-setup` | validate.yml + commit-msg-hook.sh creados | ROADMAP FASE 4 CI/CD = 100% ✓ |
| `2026-03-28-11-16-40-multi-interaction-evals` | evals/multi-interaction-evals.json, run-multi-evals.sh, lessons.md | Scripts y JSON existen en evals/ |
| `2026-03-28-20-15-30-skill-flow-analysis` | T-001..T-008, T-010..T-012 todos aplicados | SKILL.md tiene todos los cambios |
| `2026-03-31-06-14-23-skill-consistency` | T-001/T-002/T-003/T-005/T-006/T-007 implementados | Assets renombrados, CLAUDE.md actualizado, setup-template.sh limpia decisions/ |

**Estos WPs no requieren nueva implementación. Solo cierre: marcar task-plans como `[x]`.**

---

### 7.2 Deuda genuinamente pendiente en WPs históricos

#### D-001: `examples.md` — nomenclatura de fases completamente obsoleta

**WP origen:** `2026-04-01-18-39-56-skill-activation-failure` (T-DT-001)

**Problema verificado:** `references/examples.md` usa una numeración de fases que no
corresponde al SKILL.md actual:

| `examples.md` (actual) | SKILL.md actual | Diferencia |
|------------------------|-----------------|------------|
| Phase 1: PLAN | Phase 1: ANALYZE | Nombre incorrecto |
| Phase 2: STRUCTURE | Phase 2: SOLUTION_STRATEGY | Nombre incorrecto |
| Phase 3: DECOMPOSE | Phase 3: PLAN | Nombre incorrecto |
| Phase 4: EXECUTE | Phase 4: STRUCTURE | Nombre incorrecto |
| Phase 5: TRACK | Phase 5: DECOMPOSE | Nombre incorrecto |
| — | Phase 6: EXECUTE | Faltante |
| — | Phase 7: TRACK | Faltante |

**Impacto:** Claude Haiku y modelos con menos contexto leen `examples.md` como referencia
de comportamiento esperado. Si los ejemplos muestran "Phase 1: PLAN", el modelo puede
confundir la fase de planificación con la fase de análisis.

**Resolución:** Reescribir todos los ejemplos en `examples.md` con la nomenclatura correcta
de 7 fases actuales.

---

#### D-002: `scalability.md` — referencias a templates eliminados

**WP origen:** `2026-03-31-06-14-23-skill-consistency` (T-004 parcialmente pendiente)

**Problema verificado:** `references/scalability.md` referencia `project.json` como si
fuera un artefacto vivo del framework (líneas 49, 63, 78, 95, 140, 149). También
referencia `exit_conditions.md` (sin prefijo `.template`) en línea 140.

- `project.json.template` va a ser eliminado en este WP (viola ADR-001)
- `exit_conditions.md` → nombre correcto es `exit-conditions.md.template`

**Impacto:** `scalability.md` es un reference activo. Un modelo que lo lea ve instrucciones
de mantener un `project.json` que ya no forma parte del framework.

**Resolución:**
- Actualizar las referencias a `project.json` en `scalability.md` (6 ocurrencias): cambiar de
  "el proyecto tiene `project.json`" (como si fuera obligatorio) a "opcionalmente, si existe
  tooling, usar `project.json.template` en Phase 7"
- Corregir `exit_conditions.md` → `exit-conditions.md.template`

---

#### D-003: `skill-flow-analysis` T-009 — OBSOLETO

**WP origen:** `2026-03-28-20-15-30-skill-flow-analysis` (T-009: agregar `document.md.template`
en sección Templates de SKILL.md)

**Verificación:** `document.md.template` NO está en SKILL.md. En este WP se decide
MAPEAR `document.md.template` como template transversal. T-009 sigue siendo válido —
se implementa en este WP como parte del mapeo de templates.

**Acción:** Implementar T-009 en este WP: agregar `document.md.template` en SKILL.md
sección de templates transversales (junto a `adr.md.template` y `constitution.md.template`).

---

#### D-004: WPs con task-plans no cerrados requieren cierre formal

Los WPs listados en §7.1 tienen `- [ ]` en sus task-plans pero el trabajo ya está hecho.
Deben marcarse como completados para que `validate-session-close.sh` no genere falsos alertas.

---

### 7.3 TD-001: Timestamps incompletos — escala real

**Verificación:** `93 artefactos` en WPs históricos tienen `Fecha: YYYY-MM-DD` sin hora.

Los WPs afectados son todos históricos (pre-2026-04), ya cerrados. La corrección
de timestamps en WPs cerrados tiene valor mínimo de trazabilidad.

**Decisión de scope:**
- Artefactos en WPs cerrados: NO corregir retroactivamente (el valor de trazabilidad
  ya es nulo — los WPs están cerrados y no se revisitarán).
- Implementar prevención para WPs futuros:
  - Regla en `conventions.md`
  - Validación en `validate-session-close.sh` para el WP activo

---

## 8. Síntesis — Qué Requiere Implementación Real

Ordenado por impacto y dependencias:

### Grupo A — Templates (mapear todos los 6 en SKILL.md)
- `ad-hoc-tasks.md` → Phase 6: tareas emergentes sin SPEC formal
- `analysis-phase.md` → Phase 1: inventario exhaustivo para escala 50+ issues
- `categorization-plan.md` → Phase 5: batching para 30+ tareas en lotes
- `document.md` → cross-phase: documentación de referencia sin fase asignada
- `project.json` → Phase 7: resumen machine-readable (solo si tooling lo consume)
- `refactors.md` → Phase 6 + Phase 7: deuda de código durante/post ejecución

### Grupo B — Referencias desactualizadas (impacto en modelos más pequeños)
- D-001: Reescribir `examples.md` con nomenclatura de 7 fases actuales
- D-002: Actualizar referencias a `project.json` en `scalability.md` (de obligatorio a opcional Phase 7) y corregir `exit_conditions.md` → `exit-conditions.md.template`

### Grupo C — Convenciones y validación (impacto estructural)
- TD-001: Agregar regla de timestamp en `conventions.md`
- TD-001: Agregar validación en `validate-session-close.sh` para WP activo (no retroactivo)
- TD-002: Verificar que `validate-phase-readiness.sh` incluya check de `*-plan.md` para Phase 3

### Grupo D — Cierre de WPs históricos
- Marcar `[x]` todas las tareas ya implementadas en los 8 WPs históricos (§7.1)
- Marcar T-009 de skill-flow-analysis como `[-]` OBSOLETO

---

## 9. Decisión Arquitectónica Clave

**No eliminar ningún template. Mapear todo en el flujo.**

El problema de los templates "huérfanos" no era su existencia sino la ausencia de
referencias en SKILL.md y en los references correspondientes. La solución correcta
es mapear cada template al contexto de uso explícito en el flujo.

**Timestamps históricos: no corregir retroactivamente.**

93 artefactos en WPs cerrados tienen timestamps sin hora. Corregirlos no agrega
valor de trazabilidad (WPs ya cerrados, no se revisitarán). Solo prevención forward.

---

## 10. Fuera de Scope

- Nueva funcionalidad (este WP es solo deuda técnica)
- Corrección retroactiva de timestamps en WPs cerrados (ver §7.3)
