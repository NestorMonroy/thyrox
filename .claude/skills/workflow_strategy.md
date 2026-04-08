---
description: /workflow_strategy — Phase 2: SOLUTION_STRATEGY. Inicia o retoma estrategia de solución del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 2' >> .claude/context/now.md"
updated_at: 2026-04-08
---

# /workflow_strategy — Phase 2: SOLUTION_STRATEGY

Inicia o retoma Phase 2 SOLUTION_STRATEGY del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer el analysis existente: `cat .claude/context/work/[WP]/analysis/*-analysis.md`
3. Verificar si ya existe `*-solution-strategy.md`:
   - Si existe con decisiones documentadas → Phase 2 ya completó. Proponer `/workflow_plan`.
4. Listar tech skills activos: `ls .claude/skills/ | grep -v pm-thyrox`

---

## Fase a ejecutar: Phase 2 SOLUTION_STRATEGY

REQUERIDO: Leer `skills/pm-thyrox/references/solution-strategy.md` antes de empezar.

Crear `[nombre-wp]-solution-strategy.md` con estas secciones obligatorias:

1. **Key Ideas** — conceptos centrales basados en el analysis
2. **Research** — unknowns → alternativas → pros/cons documentados
3. **Pre-design check** — verificar contra ADRs y constitution.md
4. **Decisions** — decisiones fundamentales con justificación
5. **Post-design re-check** — re-verificar después de decidir

Para decisiones arquitectónicas importantes: crear ADR en `context/decisions/`.

---

## Exit criteria

Phase 2 completa cuando:
- `work/../[nombre]-solution-strategy.md` existe con las 5 secciones
- Arquitectura aprobada por el usuario

Al terminar: proponer `/workflow_plan` para Phase 3.
