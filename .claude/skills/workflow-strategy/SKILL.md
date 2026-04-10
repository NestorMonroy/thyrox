---
name: workflow-strategy
description: Phase 2 SOLUTION_STRATEGY — inicia o retoma la estrategia del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "bash .claude/scripts/set-session-phase.sh 'Phase 2'"
updated_at: 2026-04-09 22:00:00
---

# /workflow-strategy — Phase 2: SOLUTION_STRATEGY

Inicia o retoma Phase 2 SOLUTION_STRATEGY del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer analysis existente: `cat .claude/context/work/[WP]/analysis/*-analysis.md`
3. Leer `context/now.md` — verificar `phase`
4. Verificar si ya existe `*-solution-strategy.md`:
   - Si existe con decisiones documentadas → Phase 2 ya completó. Proponer `/workflow-plan`.
5. Listar tech skills activos: `ls .claude/skills/ | grep -v thyrox`

---

## Fase a ejecutar: Phase 2 SOLUTION_STRATEGY

Investigar alternativas antes de decidir previene decisiones sin evidencia.

0. REQUERIDO: Leer `skills/workflow-strategy/references/solution-strategy.md` antes de empezar.
   Basar las Key Ideas en los hallazgos de `work/.../analysis/`.

1. REQUERIDO: Crear `work/../{nombre-wp}-solution-strategy.md` usando `assets/solution-strategy.md.template`
   - Nombre descriptivo: `skill-activation-solution-strategy.md`, no `solution-strategy.md`

2. **Key Ideas** — definir conceptos centrales que guían la solución (desde analysis/ de Phase 1)

3. **Research** — listar unknowns → investigar alternativas → documentar pros/cons por cada uno

4. **Pre-design check** — verificar que las decisiones respetan:
   - ADRs existentes en `context/decisions/`
   - `constitution.md` si existe
   - Restricciones identificadas en Phase 1

5. **Decisions** — documentar decisiones fundamentales con justificación
   - Para decisiones arquitectónicas importantes: crear ADR en `context/decisions/`
   - Usar `../workflow-analyze/assets/adr.md.template`

6. **Post-design re-check** — re-verificar después de diseñar
   (las decisiones pueden cambiar al profundizar — revisar consistency con Phase 1)

Ver `references/solution-strategy.md` para estructura completa (Tech Stack, Patterns, Quality Goals).

---

## Gate humano

⏸ STOP — Presentar las decisiones clave (Key Ideas, Decisions, alternativas descartadas).
Esperar confirmación explícita. NO continuar sin respuesta.
Al aprobar: actualizar `context/now.md::phase` a `Phase 3`.

---

## Exit criteria

Phase 2 completa cuando:
- `work/.../*-solution-strategy.md` existe con las 5 secciones obligatorias
- Decisiones documentadas con justificación
- Usuario confirmó la estrategia explícitamente en esta sesión

**Detectar:** Si `work/.../*-solution-strategy.md` existe con decisiones documentadas, Phase 2 ya completó.
Al terminar: proponer `/workflow-plan` para Phase 3.
