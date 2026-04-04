# /workflow_decompose — Phase 5: DECOMPOSE

Inicia o retoma Phase 5 DECOMPOSE del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer `*-requirements-spec.md` del WP para obtener los SPECs
3. Verificar si ya existe `*-task-plan.md` con checkboxes `- [ ] [T-NNN]`:
   - Si existe → Phase 5 ya completó. Proponer `/workflow_execute`.

---

## Fase a ejecutar: Phase 5 DECOMPOSE

Crear `[nombre-wp]-task-plan.md` basado en los SPECs del requirements-spec.

Formato obligatorio por tarea:
```
- [ ] [T-NNN] Descripción de la tarea (SPEC-N)
- [ ] [T-NNN] [P] Tarea paralelizable (SPEC-N)
```

Cada tarea debe:
- Referenciar su SPEC de origen `(SPEC-N)`
- Ser atómica: máximo 1-2 horas de trabajo
- Tener criterio de éxito observable

Incluir en el task-plan:
1. **DAG de dependencias** en Mermaid — qué bloquea qué
2. **Fases de ejecución** agrupadas lógicamente
3. **Tareas [P]** marcadas explícitamente
4. **Checkpoints** de validación por fase

Verificar cobertura: cada SPEC debe tener al menos 1 tarea.

---

## Exit criteria

Phase 5 completa cuando:
- `*-task-plan.md` existe con checkboxes `- [ ] [T-NNN]`
- Todas las tareas tienen referencia a su SPEC
- DAG de dependencias documentado
- Usuario aprobó el plan

Al terminar: proponer `/workflow_execute` para Phase 6.
