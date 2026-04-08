---
description: /workflow_execute — Phase 6: EXECUTE. Toma la siguiente tarea pendiente del work package activo y la ejecuta.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 6' >> .claude/context/now.md"
updated_at: 2026-04-08
---

# /workflow_execute — Phase 6: EXECUTE

Toma la siguiente tarea pendiente del work package activo y la ejecuta.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer `*-task-plan.md` del WP activo
3. Encontrar la siguiente tarea pendiente: primera línea con `- [ ] [T-`
4. Listar tech skills activos: `ls .claude/skills/ | grep -v pm-thyrox`
5. Crear o actualizar `[nombre-wp]-execution-log.md`

---

## Fase a ejecutar: Phase 6 EXECUTE

Para la tarea pendiente identificada:

1. Leer la descripción y el SPEC referenciado para entender qué construir
2. Verificar dependencias: ¿las tareas previas requeridas están en `[x]`?
3. Implementar el cambio respetando las reglas de los tech skills activos
4. Si la implementación falla: crear `context/errors/ERR-NNN-descripcion.md` antes de reintentar
5. Commit con conventional commits: `feat(scope): T-NNN — descripción`
6. Actualizar el checkbox en `*-task-plan.md`: `- [ ]` → `- [x]`
7. Actualizar ROADMAP.md: marcar el item como `[x]` con fecha

**Convención de commit por tarea:**
```
feat(scope): T-NNN — descripción breve

Implementa [qué]. Referencias: SPEC-N.
```

Después de cada tarea: preguntar si continuar con la siguiente o pausar.

---

## Exit criteria

Phase 6 completa cuando:
- Todas las checkboxes en `*-task-plan.md` están `[x]`
- Todos los cambios están commiteados

Al terminar: proponer `/workflow_track` para Phase 7.
