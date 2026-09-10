```yml
Fecha: 2026-03-28
Proyecto: THYROX — Adopción de conceptos spec-kit
Tipo: Phase 4 (STRUCTURE) — PRD
Autor: Claude Code + Human
Estado: Borrador
```

# PRD: Adopción de conceptos spec-kit

## Overview

Integrar 6 conceptos de spec-kit en THYROX: constitution, spec validation, research step, executable phases, ROADMAP→epic links, y exit conditions mandatorias. Todo dentro de la estructura existente.

---

## Acceptance Criteria

### Nuevos templates

- [x] `assets/spec-quality-checklist.md.template` existe y cubre: completitud, claridad, consistencia, medibilidad, cobertura
- [x] `assets/constitution.md.template` existe con: principios core (5-7), constraints, governance, versionado
- [x] Ambos siguen el formato YAML frontmatter + secciones del proyecto

### EXIT_CONDITIONS mejorado

- [x] Cada phase tiene instrucción explícita: "Si NO se cumplen → PARAR"
- [x] Phase 2 incluye: constitution check (¿principios respetados?)
- [x] Phase 4 incluye: spec quality checklist completado
- [x] Gates son mandatorios, no informativos

### Solution-strategy.md con Research Step

- [x] Sección "Research Step" antes de "Fundamental Decisions"
- [x] Pasos: identificar unknowns → investigar → documentar alternativas → justificar elección
- [x] Output: alternativas consideradas con rationale en cada decisión

### Conventions.md con ROADMAP→epic link

- [x] Convención documentada: cada feature del ROADMAP incluye `**Epic:** context/epics/YYYY-MM-DD-nombre/`
- [x] Ejemplo concreto

### SKILL.md actualizado

- [x] Phase 2 menciona constitution check
- [x] Phase 4 menciona spec quality checklist como gate
- [x] Ambos con links a los templates

### Fases con pasos ejecutables

- [x] Phase 3 (PLAN) en SKILL.md tiene pasos numerados claros
- [x] Phase 5 (DECOMPOSE) tiene pasos numerados claros
- [x] Phase 6 (EXECUTE) tiene pasos numerados claros

---

## Technical Approach

**Principio:** Artefacto mínimo. Cada concepto se resuelve con 1 archivo nuevo o 1 sección nueva en archivo existente.

| Concepto | Artefacto | Acción |
|----------|-----------|--------|
| Constitution | `assets/constitution.md.template` | Crear (~50 líneas) |
| Spec validation | `assets/spec-quality-checklist.md.template` | Crear (~40 líneas) |
| Gates mandatorios | `assets/EXIT_CONDITIONS.md.template` | Editar (agregar gates) |
| Research step | `references/solution-strategy.md` | Editar (agregar sección) |
| ROADMAP→epic link | `references/conventions.md` | Editar (agregar convención) |
| Constitution en flujo | `SKILL.md` | Editar (2 líneas en Phase 2 y 4) |
| Fases ejecutables | `SKILL.md` | Editar (pasos numerados en Phase 3, 5, 6) |

**Total:** 2 archivos nuevos, 5 archivos editados. Zero carpetas nuevas.

---

## Out of Scope

- Crear slash commands como spec-kit (THYROX no es un CLI)
- Crear sistema de extensiones/presets
- Crear Phase 0 separada (research se integra en Phase 2)
- Automatizar constitution gates (son checklists manuales)

---

## Siguiente Paso

→ Phase 5: DECOMPOSE — descomponer en tasks atómicas
