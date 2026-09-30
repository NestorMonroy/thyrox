```yml
Fecha: 2026-03-28
Proyecto: THYROX — Adopción profunda de spec-kit
Tipo: Phase 5 (DECOMPOSE)
Tasks totales: 8
```

# Tasks: Adopción profunda — Mecanismos de calidad

## Task Order

```
TASK-D01 (validate-phase-readiness.sh — independiente)
TASK-D02 (tasks.md.template traceability — independiente)
TASK-D03 (spec-quality-checklist markers + refs — independiente)
TASK-D04 (EXIT_CONDITIONS double check + markers — independiente)
TASK-D05 (conventions.md priority + IDs — independiente)
TASK-D06 (SKILL.md Phase 2 double check — depende de D04)
TASK-D07 (SKILL.md Phase 4 markers — depende de D03)
TASK-D08 (SKILL.md Phase 5 traceability — depende de D02)
```

D01-D05 paralelos. D06-D08 dependen de sus respectivos templates.

---

## TASK-D01: Crear validate-phase-readiness.sh

**Archivo:** scripts/validate-phase-readiness.sh<br>
**Estimación:** 15 min

**Qué hacer:**
- Recibe argumento: phase number (1-7)
- Busca epic dir (más reciente en context/epics/ o argumento)
- Por phase, verifica artefactos:
  - Phase 1: introduction, requirements-analysis, use-cases, quality-goals, stakeholders, basic-usage, constraints, context (8 docs)
  - Phase 2: solution-strategy con Research Step
  - Phase 3: ROADMAP.md actualizado + epic dir existe
  - Phase 4: spec + checklist pasado (0 items fallidos)
  - Phase 5: tasks.md con IDs y dependencias
  - Phase 6: tasks.md con items [x] completados
  - Phase 7: ROADMAP actualizado + CHANGELOG
- Exit 0 si ready, exit 1 si falta algo
- Muestra qué falta en stderr

**Done cuando:** `bash validate-phase-readiness.sh 2` dice si Phase 2 tiene sus artefactos

---

## TASK-D02: tasks.md.template — agregar trazabilidad

**Archivo:** assets/tasks.md.template<br>
**Estimación:** 5 min

**Qué hacer:**
- Cambiar formato de task a: `- [ ] [T-NNN] Descripción (R-N)`
- Agregar instrucción: "Cada task debe referenciar el requirement que satisface"
- Agregar ejemplo concreto

**Done cuando:** Template muestra formato con traceability IDs

---

## TASK-D03: spec-quality-checklist — markers + refs

**Archivo:** assets/spec-quality-checklist.md.template<br>
**Estimación:** 5 min

**Qué hacer:**
- Agregar en sección Claridad: `- [ ] Sin marcadores [NEEDS CLARIFICATION] sin resolver`
- Agregar instrucción: "Si hay markers sin resolver → FAIL. Iterar spec."
- Agregar refs a cada item existente: `[Spec §Completitud]`, `[Spec §Claridad]`, etc.

**Done cuando:** Checklist detecta [NEEDS CLARIFICATION] y tiene traceability refs

---

## TASK-D04: EXIT_CONDITIONS — double constitution + markers

**Archivo:** assets/EXIT_CONDITIONS.md.template<br>
**Estimación:** 5 min

**Qué hacer:**
- Phase 2: agregar "Post-design re-check: ¿Las decisiones tomadas siguen respetando constitution?"
- Phase 4: agregar "Zero [NEEDS CLARIFICATION] markers sin resolver"

**Done cuando:** Phase 2 tiene pre + post check, Phase 4 bloquea markers

---

## TASK-D05: conventions.md — priority mapping + IDs

**Archivo:** references/conventions.md<br>
**Estimación:** 5 min

**Qué hacer:**
- Agregar sección "Priority Mapping":
  - P1 stories → Phase 3 tasks (MVP)
  - P2 stories → Phase 4 tasks
  - P3 stories → Phase 5 tasks
- Agregar sección "Traceability IDs":
  - R-N para requirements
  - T-NNN para tasks
  - CHK-NNN para checklist items
  - UC-NNN para use cases
  - FR-NNN para functional requirements

**Done cuando:** Convenciones de prioridad e IDs documentadas

---

## TASK-D06: SKILL.md Phase 2 — double constitution check

**Archivo:** SKILL.md<br>
**Estimación:** 3 min<br>
**Depende de:** D04

**Qué hacer:**
- En Phase 2, después de "Constitution check", agregar: "Re-check after design: verify decisions still respect principles"

**Done cuando:** Phase 2 menciona double check

---

## TASK-D07: SKILL.md Phase 4 — [NEEDS CLARIFICATION]

**Archivo:** SKILL.md<br>
**Estimación:** 3 min<br>
**Depende de:** D03

**Qué hacer:**
- En Phase 4 Gate, agregar: "Zero [NEEDS CLARIFICATION] markers. Resolve before decomposing."

**Done cuando:** Phase 4 bloquea markers sin resolver

---

## TASK-D08: SKILL.md Phase 5 — traceability

**Archivo:** SKILL.md<br>
**Estimación:** 3 min<br>
**Depende de:** D02

**Qué hacer:**
- En Phase 5 pasos, agregar: "Each task references its requirement: `[T-NNN] Description (R-N)`"

**Done cuando:** Phase 5 menciona trazabilidad en tasks

---

## Resumen

| Task | Decisión | Archivo | Estimación | Dependencia |
|------|----------|---------|-----------|-------------|
| D01 | D4 | scripts/validate-phase-readiness.sh | 15 min | - |
| D02 | D3 | assets/tasks.md.template | 5 min | - |
| D03 | D1+D3 | assets/spec-quality-checklist.md.template | 5 min | - |
| D04 | D2 | assets/EXIT_CONDITIONS.md.template | 5 min | - |
| D05 | D5 | references/conventions.md | 5 min | - |
| D06 | D2 | SKILL.md | 3 min | D04 |
| D07 | D1 | SKILL.md | 3 min | D03 |
| D08 | D3 | SKILL.md | 3 min | D02 |

**Total estimado:** ~44 min

---

## Siguiente Paso

→ Phase 6: EXECUTE
