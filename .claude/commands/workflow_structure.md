# /workflow_structure — Phase 4: STRUCTURE

Inicia o retoma Phase 4 STRUCTURE del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer plan y solution-strategy del WP para entender el scope
3. Verificar si ya existe `*-requirements-spec.md` sin `[NEEDS CLARIFICATION]`:
   - Si existe con checklist al 100% → Phase 4 ya completó. Proponer `/workflow_decompose`.
4. Listar tech skills activos para orientar la spec técnica.

---

## Fase a ejecutar: Phase 4 STRUCTURE

**Determinar complejidad:**
- < 10 tareas estimadas → Simple
- 10+ tareas estimadas → Complejo (requiere también design.md)

**Simple:** Crear `[nombre-wp]-requirements-spec.md` con overview, user stories, acceptance criteria.

**Complejo:** Crear ambos:
1. `[nombre-wp]-requirements-spec.md` — qué construir (SPECs con Given/When/Then)
2. `[nombre-wp]-design.md` — cómo construirlo (arquitectura, componentes, flujos con Mermaid)

**Todos los flujos, modelos y diagramas deben usar Mermaid** (no ASCII art).

REQUERIDO al finalizar: completar `[nombre-wp]-spec-checklist.md` (20 ítems).
No avanzar si quedan `[NEEDS CLARIFICATION]` sin resolver.

---

## Exit criteria

Phase 4 completa cuando:
- `*-requirements-spec.md` existe sin `[NEEDS CLARIFICATION]`
- Spec-checklist completado al 100%
- Usuario aprobó la especificación

Al terminar: proponer `/workflow_decompose` para Phase 5.
