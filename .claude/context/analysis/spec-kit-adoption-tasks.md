```yml
Fecha: 2026-03-28
Proyecto: THYROX — Adopción de conceptos spec-kit
Tipo: Phase 5 (DECOMPOSE)
Tasks totales: 9
```

# Tasks: Adopción de conceptos spec-kit

## Task Order

```
TASK-S01 (constitution template — independiente)
TASK-S02 (spec-quality-checklist template — independiente)
TASK-S03 (EXIT_CONDITIONS gates — depende de S01, S02)
TASK-S04 (solution-strategy research step — independiente)
TASK-S05 (conventions ROADMAP→epic — independiente)
TASK-S06 (SKILL.md constitution + checklist — depende de S01, S02)
TASK-S07 (SKILL.md Phase 3 executable — independiente)
TASK-S08 (SKILL.md Phase 5 executable — independiente)
TASK-S09 (SKILL.md Phase 6 executable — independiente)
```

S01, S02, S04, S05, S07, S08, S09 pueden ejecutarse en paralelo.
S03 y S06 dependen de que S01 y S02 estén completados.

---

## TASK-S01: Crear constitution.md.template

**Archivo:** assets/constitution.md.template<br>
**Estimación:** 10 min

**Qué hacer:**
- YAML frontmatter con proyecto, versión, fecha
- Sección "Core Principles" (5-7 principios con nombre + descripción)
- Sección "Constraints" (seguridad, performance, compliance)
- Sección "Governance" (proceso de enmiendas, versionado MAJOR/MINOR/PATCH)
- Basarse en spec-kit constitution-template.md como referencia

**Done cuando:** Template usable para cualquier proyecto nuevo

---

## TASK-S02: Crear spec-quality-checklist.md.template

**Archivo:** assets/spec-quality-checklist.md.template<br>
**Estimación:** 10 min

**Qué hacer:**
- YAML frontmatter con feature name, fecha, estado
- Sección "Completitud" (todos los requisitos documentados, sin gaps)
- Sección "Claridad" (requisitos específicos, sin ambigüedad)
- Sección "Consistencia" (requisitos no se contradicen)
- Sección "Medibilidad" (criterios de éxito verificables)
- Sección "Cobertura" (edge cases, flujos alternativos)
- Instrucción: "Si hay items fallidos → iterar spec, máximo 2 veces"

**Done cuando:** Template que funciona como "unit tests para specs"

---

## TASK-S03: Mejorar EXIT_CONDITIONS.md.template con gates

**Archivo:** assets/EXIT_CONDITIONS.md.template<br>
**Estimación:** 10 min<br>
**Depende de:** S01, S02

**Qué hacer:**
- Phase 1 (ANALYZE): agregar "constitution.md creada o revisada"
- Phase 2 (SOLUTION_STRATEGY): agregar "constitution check — principios respetados"
- Phase 4 (STRUCTURE): agregar "spec-quality-checklist completado con 0 items fallidos"
- Cada phase: cambiar tono de "checklist" a "gate" — agregar "Si NO → PARAR"
- Agregar bloque de instrucciones: "Gates son mandatorios. No avanzar sin cumplirlos."

**Done cuando:** EXIT_CONDITIONS es bloqueante, no informativo

---

## TASK-S04: Agregar Research Step a solution-strategy.md

**Archivo:** references/solution-strategy.md<br>
**Estimación:** 10 min

**Qué hacer:**
- Agregar sección "Research Step" ANTES de "Fundamental Decisions"
- Pasos: 1) Listar unknowns/assumptions 2) Investigar cada uno 3) Documentar alternativas con pros/cons 4) Justificar elección
- Ejemplo de formato para cada decisión investigada
- Referencia a spec-kit Phase 0 como inspiración

**Done cuando:** solution-strategy.md tiene paso de investigación explícito

---

## TASK-S05: Agregar convención ROADMAP→epic a conventions.md

**Archivo:** references/conventions.md<br>
**Estimación:** 5 min

**Qué hacer:**
- En sección de ROADMAP format, agregar regla: cada feature con epic debe incluir `**Epic:** context/epics/YYYY-MM-DD-nombre/`
- Ejemplo concreto con link

**Done cuando:** La convención está documentada con ejemplo

---

## TASK-S06: Agregar constitution y checklist al flujo de SKILL.md

**Archivo:** SKILL.md<br>
**Estimación:** 10 min<br>
**Depende de:** S01, S02

**Qué hacer:**
- Phase 1 (ANALYZE): agregar "Create or review constitution.md (use `assets/constitution.md.template`)"
- Phase 2 (SOLUTION_STRATEGY): agregar "Constitution check: verify decisions respect principles"
- Phase 4 (STRUCTURE): agregar "Run spec-quality-checklist (use `assets/spec-quality-checklist.md.template`). Gate: 0 failed items before Phase 5."
- Mantener SKILL.md ≤ 300 líneas (agregar 3-4 líneas, no más)

**Done cuando:** SKILL.md menciona constitution y checklist como parte del flujo

---

## TASK-S07: Phase 3 (PLAN) — pasos ejecutables

**Archivo:** SKILL.md<br>
**Estimación:** 5 min

**Qué hacer:**
- Reemplazar descripción actual de Phase 3 con pasos numerados:
  1. Brainstorm: ¿qué problema resuelve? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera de scope?
  2. Crear epic: `context/epics/YYYY-MM-DD-nombre/epic.md`
  3. Actualizar ROADMAP.md con features + link al epic
  4. Obtener aprobación del scope

**Done cuando:** Phase 3 tiene pasos que se pueden seguir mecánicamente

---

## TASK-S08: Phase 5 (DECOMPOSE) — pasos ejecutables

**Archivo:** SKILL.md<br>
**Estimación:** 5 min

**Qué hacer:**
- Reemplazar descripción actual con pasos numerados:
  1. Leer epic.md y specs
  2. Identificar work streams independientes
  3. Crear task list con IDs, dependencias, estimaciones
  4. Marcar tasks paralelas [P]
  5. Definir checkpoints de validación
  6. Guardar en `context/epics/.../tasks.md`

**Done cuando:** Phase 5 tiene pasos ejecutables

---

## TASK-S09: Phase 6 (EXECUTE) — pasos ejecutables

**Archivo:** SKILL.md<br>
**Estimación:** 5 min

**Qué hacer:**
- Reemplazar descripción actual con pasos numerados:
  1. Revisar tasks.md — ¿cuál es la siguiente sin bloqueos?
  2. Implementar el cambio
  3. Commit con Conventional Commits
  4. Actualizar ROADMAP.md: `[ ]` → `[x]` con fecha
  5. Si sesión larga: documentar en `context/work-logs/`
  6. Repetir hasta todas las tasks completadas

**Done cuando:** Phase 6 tiene pasos ejecutables

---

## Resumen

| Task | Concepto | Archivo | Estimación | Dependencia |
|------|----------|---------|-----------|-------------|
| S01 | Constitution | assets/constitution.md.template | 10 min | - |
| S02 | Spec checklist | assets/spec-quality-checklist.md.template | 10 min | - |
| S03 | Gates mandatorios | assets/EXIT_CONDITIONS.md.template | 10 min | S01, S02 |
| S04 | Research step | references/solution-strategy.md | 10 min | - |
| S05 | ROADMAP→epic | references/conventions.md | 5 min | - |
| S06 | SKILL flujo | SKILL.md | 10 min | S01, S02 |
| S07 | Phase 3 pasos | SKILL.md | 5 min | - |
| S08 | Phase 5 pasos | SKILL.md | 5 min | - |
| S09 | Phase 6 pasos | SKILL.md | 5 min | - |

**Total estimado:** ~70 min (~1h 10min)

---

## Siguiente Paso

→ Phase 6: EXECUTE
