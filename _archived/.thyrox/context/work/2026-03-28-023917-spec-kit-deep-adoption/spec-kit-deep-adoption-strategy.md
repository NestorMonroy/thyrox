```yml
Fecha: 2026-03-28
Proyecto: THYROX — Adopción profunda de spec-kit
Tipo: Phase 2 (SOLUTION_STRATEGY)
Autor: Claude Code + Human
Estado: Borrador
```

# Solution Strategy: Adopción profunda de spec-kit

## Research Step

### Unknown 1: ¿Cómo implementar [NEEDS CLARIFICATION] sin un CLI?

**Alternativas:**
- A) Convención en templates — agregar instrucción "marcar con [NEEDS CLARIFICATION]" en spec template + regla en SKILL.md
- B) Script detect — crear detect-needs-clarification.sh que busque markers sin resolver
- C) Ambos — convención + script

**Decisión:** C) Ambos. La convención guía al humano/AI, el script lo verifica.
**Justificación:** Convención sola depende de disciplina. Script solo detecta pero no previene. Juntos cubren prevención + detección.

### Unknown 2: ¿Cómo encadenar outputs entre fases sin un CLI?

**Alternativas:**
- A) Validación manual — el usuario verifica que los docs existen antes de avanzar
- B) Script validate-phase-readiness.sh — verifica que los artefactos de Phase N existen antes de permitir Phase N+1
- C) Documentar en EXIT_CONDITIONS — hacer explícito qué artefactos debe producir cada fase

**Decisión:** B + C. Script que valida + EXIT_CONDITIONS que documenta.
**Justificación:** EXIT_CONDITIONS ya tiene gates. El script lo automatiza.

### Unknown 3: ¿Cómo implementar trazabilidad sin IDs formales?

**Alternativas:**
- A) IDs opcionales — solo si el proyecto es grande
- B) IDs obligatorios — FR-001, T-001, CHK-001 en todos los proyectos
- C) IDs en templates — los templates tienen placeholders con IDs

**Decisión:** C) IDs en templates. Los templates ya sugieren formato con IDs (R-1, UC-001). Formalizar como convención.
**Justificación:** Si los templates los incluyen, el usuario los usa naturalmente. No es overhead extra.

---

## Constitution Double-Check

Verifico contra nuestros principios:
- ✅ Markdown only — todo son .md y .sh
- ✅ Git as persistence — no archivos backup
- ✅ Single skill — todo dentro de pm-thyrox/
- ✅ SKILL < 500 lines — agregar ~10 líneas máximo
- ✅ Anatomía oficial — scripts/ para ejecutables, assets/ para templates, references/ para docs

---

## Decisiones

### D1: [NEEDS CLARIFICATION] markers

**Implementación:**
- Agregar instrucción a `assets/spec-quality-checklist.md.template`: "¿Hay [NEEDS CLARIFICATION] sin resolver? → Fallar"
- Agregar a SKILL.md Phase 4: "Resolve all [NEEDS CLARIFICATION] before Phase 5"
- NO crear script por ahora (el checklist manual es suficiente para v1)

### D2: Double constitution check

**Implementación:**
- SKILL.md Phase 2 ya dice "Constitution check"
- Agregar: "Re-check constitution AFTER design decisions, not just before"
- Actualizar EXIT_CONDITIONS Phase 2 gate

### D3: Trazabilidad requirement → task → checklist

**Implementación:**
- Actualizar `assets/tasks.md.template` — cada task debe referenciar su requirement (R-N o FR-NNN)
- Actualizar `assets/spec-quality-checklist.md.template` — cada item debe referenciar spec section
- Agregar convención a SKILL.md: "Tasks reference requirements. Checklists reference spec sections."

### D4: Phase readiness validation

**Implementación:**
- Crear `scripts/validate-phase-readiness.sh` — verifica artefactos requeridos por fase
- Phase 1 → necesita: introduction, requirements-analysis, use-cases, quality-goals, stakeholders, basic-usage, constraints, context
- Phase 2 → necesita: solution-strategy con research step
- Phase 3 → necesita: ROADMAP.md actualizado + epic creado
- Phase 4 → necesita: spec + checklist pasado
- Phase 5 → necesita: tasks.md con IDs y dependencias
- Phase 6 → necesita: tasks.md completado
- Phase 7 → necesita: ROADMAP actualizado + changelog

### D5: Priority → phase mapping

**Implementación:**
- Documentar en conventions.md y tasks template: "P1 stories = Phase 3 (MVP), P2 = Phase 4, P3 = Phase 5"
- No es un cambio grande, es una convención documentada

---

## Artefactos a crear/modificar

| Artefacto | Acción | Decisión |
|-----------|--------|----------|
| `scripts/validate-phase-readiness.sh` | Crear | D4 |
| `assets/tasks.md.template` | Mejorar | D3 (trazabilidad) |
| `assets/spec-quality-checklist.md.template` | Mejorar | D1 ([NEEDS CLARIFICATION] check) + D3 (traceability refs) |
| `assets/EXIT_CONDITIONS.md.template` | Mejorar | D2 (double constitution check) |
| `references/conventions.md` | Mejorar | D5 (priority mapping) |
| `SKILL.md` | Mejorar | D1, D2, D3 (3-5 líneas) |

**Total:** 1 archivo nuevo, 5 archivos editados. Zero carpetas nuevas.

---

## Siguiente Paso

→ Phase 3: PLAN — Actualizar ROADMAP.md
