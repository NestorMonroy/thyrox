```yml
type: Especificación de Requisitos
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: En progreso
phase: Phase 4 — STRUCTURE
```

# Requirements Spec: context-hygiene

## Overview

Resolver la desincronización de los archivos de estado del proyecto e impedir que vuelva a ocurrir. Cambios en: 3 archivos de contexto, SKILL.md Phase 7, CLAUDE.md, SKILL.md (glosario).

---

## User Stories

### US-01 — Archivos de estado actualizados al iniciar sesión

**Como** desarrollador que abre una nueva sesión de Claude Code,
**quiero** que `focus.md`, `now.md` y `project-state.md` reflejen el estado real del proyecto,
**para** poder continuar trabajando sin reconstruir el contexto manualmente.

**Acceptance Criteria:**
- AC-01.1: `focus.md` menciona FASE 19 como completada y WP context-hygiene como activo
- AC-01.2: `now.md` menciona WP context-hygiene con phase actual y no tiene referencias a FASEs anteriores como "activas"
- AC-01.3: `project-state.md` lista 9 agentes (los reales), FASEs 1-19 como completadas, versión 1.6.0
- AC-01.4: Los 3 archivos tienen `updated_at` de hoy (2026-04-08)

---

### US-02 — Phase 7 actualiza archivos de estado al cerrar cualquier WP

**Como** Claude ejecutando Phase 7 de cualquier WP,
**quiero** que SKILL.md me instruya actualizar `focus.md`, `now.md` y `project-state.md`,
**para** que el estado del proyecto siempre quede sincronizado al cerrar un WP.

**Acceptance Criteria:**
- AC-02.1: SKILL.md Phase 7 tiene instrucción explícita: actualizar `focus.md`, `now.md`, `project-state.md` como parte del checklist de cierre
- AC-02.2: La instrucción especifica qué escribir en cada archivo (no solo "actualizar")
- AC-02.3: La instrucción está en el checklist final de Phase 7, junto a `validate-session-close.sh`

---

### US-03 — Distinción FASE vs Phase documentada y consultable

**Como** usuario o Claude trabajando con pm-thyrox,
**quiero** que la distinción entre FASE (WP secuencial del proyecto) y Phase (fase SDLC 1-7) esté documentada en un lugar prominente,
**para** no confundir los dos niveles jerárquicos.

**Acceptance Criteria:**
- AC-03.1: `CLAUDE.md` tiene una sección "Glosario" con la distinción FASE vs Phase, con ejemplo concreto
- AC-03.2: SKILL.md tiene una nota o referencia al glosario de CLAUDE.md
- AC-03.3: El glosario usa el ejemplo: "FASE 19 es el WP; Phase 4 es STRUCTURE dentro de ese WP"

---

## Tabla de trazabilidad

| Scope item | User Story | Acceptance Criteria |
|-----------|-----------|-------------------|
| S-01: actualizar focus.md | US-01 | AC-01.1, AC-01.4 |
| S-02: actualizar now.md | US-01 | AC-01.2, AC-01.4 |
| S-03: actualizar project-state.md | US-01 | AC-01.3, AC-01.4 |
| S-04: instrucción Phase 7 SKILL.md | US-02 | AC-02.1, AC-02.2, AC-02.3 |
| S-05: glosario en CLAUDE.md | US-03 | AC-03.1, AC-03.3 |
| S-06: nota en SKILL.md | US-03 | AC-03.2 |
| S-07: lecciones + CHANGELOG | — | (Phase 7 obligatorio) |

---

## Spec Quality Checklist

- [x] Todas las user stories tienen acceptance criteria verificables
- [x] Sin marcadores `[NEEDS CLARIFICATION]`
- [x] Tabla de trazabilidad completa (todos los S-NN tienen al menos una fila)
- [x] Out-of-scope explícito en el plan
- [x] WP clasificado como `documentation` — sin riesgo de operaciones destructivas
- [x] 3 user stories — spec simple (< 10 tareas esperadas)
