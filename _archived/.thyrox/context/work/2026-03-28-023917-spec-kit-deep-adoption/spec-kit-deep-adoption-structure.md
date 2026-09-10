```yml
Fecha: 2026-03-28
Proyecto: THYROX — Adopción profunda de spec-kit
Tipo: Phase 4 (STRUCTURE) — PRD
Autor: Claude Code + Human
Estado: Borrador
```

# PRD: Adopción profunda — Mecanismos de calidad

## Overview

Implementar 5 mecanismos de calidad inspirados en spec-kit: [NEEDS CLARIFICATION] markers, double constitution check, trazabilidad con IDs, phase readiness validation, y priority mapping.

---

## Acceptance Criteria

### validate-phase-readiness.sh (D4)

- [x] Script recibe phase number como argumento
- [x] Verifica que los artefactos requeridos existen para esa fase
- [x] Retorna exit 0 si ready, exit 1 si no
- [x] Muestra qué falta cuando falla
- [x] Cubre las 7 fases

### tasks.md.template (D3)

- [x] Cada task tiene formato: `- [x] [T-NNN] Descripción (R-N)`
- [x] El (R-N) referencia el requirement que satisface
- [x] Ejemplo concreto incluido en template

### spec-quality-checklist.md.template (D1 + D3)

- [x] Item nuevo: "¿Hay [NEEDS CLARIFICATION] sin resolver? → FAIL"
- [x] Items existentes incluyen referencia a sección del spec: `[Spec §Requisitos]`
- [x] Instrucción: "Si hay markers sin resolver, iterar spec antes de continuar"

### EXIT_CONDITIONS.md.template (D2)

- [x] Phase 2 tiene dos checks de constitution: "Pre-design check" y "Post-design re-check"
- [x] Phase 4 tiene check de [NEEDS CLARIFICATION]: "Zero markers sin resolver"

### conventions.md (D5)

- [x] Sección "Priority Mapping": P1→Phase 3 (MVP), P2→Phase 4, P3→Phase 5
- [x] Sección "Traceability IDs": R-N para requirements, T-NNN para tasks, CHK-NNN para checklists

### SKILL.md (~5 líneas adicionales)

- [x] Phase 2: menciona "Re-check constitution after design decisions"
- [x] Phase 4: menciona "Resolve all [NEEDS CLARIFICATION] markers"
- [x] Phase 5: menciona "Each task references its requirement (R-N)"
- [x] Total ≤300 líneas

---

## Out of Scope

- Crear analyze command (script de validación semántica) — futuro
- Crear scripts de workflow (create-epic.sh, setup-plan.sh) — futuro
- Hooks system — no aplica para THYROX skill

---

## Siguiente Paso

→ Phase 5: DECOMPOSE
