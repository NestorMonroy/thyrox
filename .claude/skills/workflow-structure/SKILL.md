---
name: workflow-structure
description: Phase 4 STRUCTURE — inicia o retoma la especificación del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 4' >> .claude/context/now.md"
updated_at: 2026-04-09 00:00:00
---

# /workflow-structure — Phase 4: STRUCTURE

Inicia o retoma Phase 4 STRUCTURE del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer plan y solution-strategy del WP para entender el scope
3. Leer `context/now.md` — verificar `phase`
4. Verificar si ya existe `*-requirements-spec.md` sin `[NEEDS CLARIFICATION]`:
   - Si existe con spec-checklist al 100% → Phase 4 ya completó. Proponer `/workflow-decompose`.
5. Listar tech skills activos para orientar la spec técnica.

---

## Fase a ejecutar: Phase 4 STRUCTURE

Especificar antes de descomponer previene ambigüedad en las tareas.

**Determinar complejidad:**
- < 10 tareas estimadas → **Simple**
- 10+ tareas estimadas → **Complejo** (requiere también design.md)

**Simple:** Crear `work/../{nombre-wp}-requirements-spec.md` usando `assets/requirements-specification.md.template`
  - Con overview, user stories, acceptance criteria (Given/When/Then)
  - Nombre descriptivo: `skill-activation-requirements-spec.md`, no `requirements-spec.md`

**Complejo:** Crear ambos:
1. `work/../{nombre-wp}-requirements-spec.md` — qué construir (SPECs con Given/When/Then)
2. `work/../{nombre-wp}-design.md` — cómo construirlo usando `assets/design.md.template`:
   - Visión arquitectónica, componentes afectados, decisiones de diseño
   - Ver `references/spec-driven-development.md` para guía completa

**Reglas de formato:**
- Todos los flujos, modelos y diagramas deben usar **Mermaid** (no ASCII art)
- Para docs técnicos sin template específico: `assets/document.md.template`

REQUERIDO al finalizar: completar `{nombre-wp}-spec-checklist.md` usando `assets/spec-quality-checklist.md.template` (20 ítems).
NO avanzar si quedan ítems sin +o marcadores `[NEEDS CLARIFICATION]` sin resolver.

---

## Gate humano

⏸ STOP — Presentar la especificación completa (user stories, acceptance criteria, diseño si aplica).
Esperar confirmación explícita. NO continuar sin respuesta.
Excepción: si el WP es `reversibility: documentation` y la spec no tiene ambigüedades, el gate puede ser ligero.
Al aprobar: actualizar `context/now.md::phase` a `Phase 5`.

---

## Exit criteria

Phase 4 completa cuando:
- `work/.../*-requirements-spec.md` existe sin `[NEEDS CLARIFICATION]`
- `{nombre-wp}-spec-checklist.md` completado al 100%
- Usuario confirmó la especificación explícitamente en esta sesión

**Detectar:** Si `work/.../*-requirements-spec.md` tiene user stories y acceptance criteria sin `[NEEDS CLARIFICATION]`, Phase 4 ya completó.
Al terminar: proponer `/workflow-decompose` para Phase 5.
