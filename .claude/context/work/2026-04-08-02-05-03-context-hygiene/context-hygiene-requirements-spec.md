```yml
type: Especificación de Requisitos
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
updated_at: 2026-04-08 03:00:00
status: En progreso
phase: Phase 4 — STRUCTURE
reversibility: reversible
```

# Requirements Spec: context-hygiene (revisada)

## Overview

Definir los **trigger points** de cada archivo de estado del proyecto y hacer la actualización automática — no manual ni dependiente de que Claude recuerde hacerlo. La corrección del estado actual (archivos congelados) es consecuencia de implementar el mecanismo correcto.

---

## Contexto del mecanismo existente

El hook `SessionStart` ejecuta `session-start.sh` que lee `now.md::current_work` para mostrar el WP activo. Si `now.md` está desactualizado, Claude arranca con el contexto incorrecto en cada sesión. El problema es sistémico — no basta con actualizar los archivos hoy.

---

## User Stories

### US-01 — Mapa de triggers: cuándo se actualiza cada archivo

**Como** equipo manteniendo pm-thyrox,
**quiero** que los triggers de actualización de cada archivo de estado estén documentados,
**para** que tanto Claude como los scripts sepan exactamente cuándo actualizar qué.

**Acceptance Criteria:**
- AC-01.1: SKILL.md o un reference define la tabla de triggers por archivo y por evento
- AC-01.2: La tabla cubre los 4 eventos: crear WP, cambiar de Phase, completar WP, añadir agente
- AC-01.3: `now.md` se actualiza en Phase 1 (WP creado) y en cada transición de Phase
- AC-01.4: `focus.md` se actualiza en Phase 1 (WP abre) y Phase 7 (WP cierra)
- AC-01.5: `project-state.md` se actualiza en Phase 7 y cuando se añaden agentes al framework

---

### US-02 — Instrucciones en SKILL.md por trigger point (no solo Phase 7)

**Como** Claude ejecutando cualquier fase,
**quiero** que SKILL.md me instruya actualizar los archivos correctos en el momento correcto,
**para** no depender de recordar hacerlo al final.

**Acceptance Criteria:**
- AC-02.1: SKILL.md Phase 1 step 2 (crear WP) instruye: actualizar `now.md` con `current_work` y `phase: Phase 1`
- AC-02.2: Cada gate de fase en SKILL.md (Phase 1→2, 2→3, etc.) instruye: actualizar `now.md::phase`
- AC-02.3: SKILL.md Phase 7 instruye: actualizar `focus.md`, `now.md` (cerrar WP → `current_work: null`, `phase: null`), y `project-state.md`
- AC-02.4: La instrucción de Phase 7 especifica el contenido mínimo de cada archivo (no solo "actualiza")

---

### US-03 — Script `update-state.sh` que genera estado desde el repo

**Como** Claude o un hook de sesión,
**quiero** poder ejecutar un script que regenere `project-state.md` leyendo el estado real del repo,
**para** que el contenido sea preciso sin depender de escritura manual.

**Acceptance Criteria:**
- AC-03.1: El script lee los agentes reales desde `.claude/agents/*.md` y los lista
- AC-03.2: El script lee la última versión desde `CHANGELOG.md` (primera entrada `## [X.Y.Z]`)
- AC-03.3: El script lee las FASEs completadas desde `ROADMAP.md` (líneas con `## FASE N`)
- AC-03.4: El script escribe o actualiza `project-state.md` con esos datos y `updated_at` actual
- AC-03.5: El script acepta flag `--dry-run` para mostrar qué escribiría sin modificar el archivo

---

### US-04 — Estado inicial corregido al implementar el mecanismo

**Como** desarrollador que abre una sesión después de este WP,
**quiero** que los 3 archivos reflejen el estado real,
**para** que el hook `session-start.sh` muestre información correcta inmediatamente.

**Acceptance Criteria:**
- AC-04.1: `now.md` tiene `current_work: 2026-04-08-02-05-03-context-hygiene` y `phase: Phase 4` (o la phase actual al momento de ejecutar)
- AC-04.2: `focus.md` menciona FASE 19 completada y context-hygiene como WP activo
- AC-04.3: `project-state.md` generado por `update-state.sh` — lista los 9 agentes reales, FASEs 1-19, versión 1.6.0
- AC-04.4: `session-start.sh` muestra el WP correcto al ejecutarse con estos archivos

---

### US-05 — Glosario FASE vs Phase en lugar prominente

**Como** usuario o Claude trabajando con pm-thyrox,
**quiero** que la distinción entre FASE (WP secuencial) y Phase (SDLC 1-7) esté documentada,
**para** no confundir los dos niveles.

**Acceptance Criteria:**
- AC-05.1: `CLAUDE.md` tiene sección "Glosario" con la distinción y un ejemplo concreto
- AC-05.2: El ejemplo usa: "FASE 20 es el WP número 20; Phase 4 es STRUCTURE dentro de ese WP"
- AC-05.3: SKILL.md tiene una referencia visible al glosario de CLAUDE.md

---

## Tabla de trazabilidad

| Scope item | User Story | Acceptance Criteria |
|-----------|-----------|-------------------|
| S-01: mapa de triggers (documento) | US-01 | AC-01.1, AC-01.2, AC-01.3, AC-01.4, AC-01.5 |
| S-02: Phase 1 step 2 → actualizar now.md | US-02 | AC-02.1 |
| S-03: gates de fase → actualizar now.md::phase | US-02 | AC-02.2 |
| S-04: Phase 7 → actualizar los 3 archivos con contenido mínimo | US-02 | AC-02.3, AC-02.4 |
| S-05: script update-state.sh | US-03 | AC-03.1, AC-03.2, AC-03.3, AC-03.4, AC-03.5 |
| S-06: ejecutar update-state.sh → corregir project-state.md | US-04 | AC-04.3 |
| S-07: actualizar now.md manualmente (estado actual) | US-04 | AC-04.1 |
| S-08: actualizar focus.md manualmente (estado actual) | US-04 | AC-04.2 |
| S-09: verificar session-start.sh con archivos corregidos | US-04 | AC-04.4 |
| S-10: glosario en CLAUDE.md + nota en SKILL.md | US-05 | AC-05.1, AC-05.2, AC-05.3 |
| S-11: lecciones + CHANGELOG | — | (Phase 7) |

---

## Cambio de reversibilidad

Este WP pasa de `documentation` a `reversible` por la creación del script `update-state.sh`.
Los cambios en SKILL.md y CLAUDE.md siguen siendo documentación. El script es recuperable vía git.

---

## Spec Quality Checklist

- [x] Todas las user stories tienen acceptance criteria verificables
- [x] Sin marcadores `[NEEDS CLARIFICATION]`
- [x] Tabla de trazabilidad completa (todos los S-NN tienen al menos una fila)
- [x] Out-of-scope explícito en el plan
- [x] Reversibilidad actualizada a `reversible` (script nuevo)
- [x] 5 user stories — spec simple-mediana (< 12 tareas esperadas)
