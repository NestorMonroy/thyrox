---
name: workflow-execute
description: Phase 6 EXECUTE — toma la siguiente tarea pendiente del work package activo y la ejecuta.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 6' >> .claude/context/now.md"
updated_at: 2026-04-09 00:00:00
---

# /workflow-execute — Phase 6: EXECUTE

Toma la siguiente tarea pendiente del work package activo y la ejecuta.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer `*-task-plan.md` del WP activo
3. Encontrar la siguiente tarea pendiente: primera línea con `- [ ] [T-`
4. Leer `context/now.md` — verificar `phase`
5. Listar tech skills activos: `ls .claude/skills/ | grep -v pm-thyrox`
6. REQUERIDO al inicio de sesión: crear o actualizar `{nombre-wp}-execution-log.md` usando `assets/execution-log.md.template`

---

## Fase a ejecutar: Phase 6 EXECUTE

Commits frecuentes con mensajes descriptivos crean un historial navegable.

**Al recibir `<task-notification>` (agente background completó):**
1. Identificar el SP-NNN en el Stopping Point Manifest del `*-analysis.md`
2. Presentar al usuario: qué agente completó + resumen del resultado
3. ⏸ GATE ASYNC — STOP: esperar confirmación antes de usar el output o lanzar el siguiente agente
4. Intensidad del gate según calibración (tabla abajo)
5. Si aprueba: marcar SP-NNN como `si` en el manifest y continuar
6. Si hay problema: crear `context/errors/ERR-NNN.md` y ajustar el plan

**Calibración de gates async:**

| Reversibilidad | Tipo de agente | Nivel de gate |
|----------------|----------------|--------------|
| `irreversible` | cualquiera | **Fuerte** — diff completo + "SI" explícito |
| `reversible` | `task-executor` | **Fuerte** — diff completo + "SI" explícito |
| `reversible` | `Explore` / decisión | **Estándar** — resumen + confirmación |
| `reversible` | `Explore` / validación mecánica | **Ligero** — resultado + opción de objetar |
| `documentation` | `task-executor` | **Estándar** — resumen + confirmación |
| `documentation` | `Explore` / cualquiera | **Ligero** — resultado + opción de objetar |

> Ausencia de respuesta ≠ aprobación. Si el usuario no responde, esperar — no auto-continuar.

**Para cada tarea pendiente:**

1. Leer la descripción y el SPEC referenciado
2. Verificar dependencias: ¿las tareas previas requeridas están `[x]`?
3. **⚠ GATE OPERACIÓN** — antes de **ediciones decision** en archivos que afectan todas las sesiones, STOP y describir qué se va a hacer:
   - Eliminar archivos/directorios, sobreescribir config con `--force`
   - Cambiar instrucciones, pasos o criterios en `CLAUDE.md`, `SKILL.md`, `.mcp.json`
   - Cambiar `description`, `allowed-tools` u otro frontmatter de comportamiento en un skill
   - `git push --force` o cualquier operación que reescriba historia
   - Cualquier operación no reversible con `git revert`

   **NO requieren GATE OPERACIÓN (ediciones consecuencia — auto):**
   - Actualizar `updated_at` o `version` en frontmatter como resultado de un cambio aprobado
   - Corregir links rotos o typos sin cambiar instrucciones
   - Agregar una entrada a una lista de referencias sin modificar las existentes
4. Implementar el cambio respetando las reglas de los tech skills activos
5. Si falla: crear `context/errors/ERR-NNN-descripcion.md` usando `assets/error-report.md.template` antes de reintentar con otro approach
6. Commit con Conventional Commits: `type(scope): T-NNN — descripción`
7. Actualizar checkbox en `*-task-plan.md`: `- [ ]` → `- [x]`
8. Actualizar ROADMAP.md: `[ ]` → `[x]` con fecha

**Pre-flight para ejecución paralela (antes de lanzar agentes):**
1. Listar archivos que toca cada agente
2. Detectar intersecciones → resolver scope collision antes de lanzar
3. Asignar section owners para archivos compartidos
4. Definir gates explícitos (quién desbloquea a quién)
5. REQUERIDO: registrar SP-NNN en el Stopping Point Manifest por cada agente background
   — hacer commit del manifest actualizado ANTES de lanzar el primer agente

**Validación pre-Phase 7 — REQUERIDO antes de proponer TRACK:**
- [ ] `*-task-plan.md` — todas las tareas completadas tienen `[x]`
- [ ] `*-execution-log.md` — estado final de cada tarea registrado
- [ ] `ROADMAP.md` — todos los checkboxes de la FASE actual en `[x]`
- [ ] Stopping Point Manifest — SP-NNN de Phase 6 marcados como `si`
Si algún ítem falla → corregir antes de avanzar.

---

## Exit criteria

Phase 6 completa cuando:
- Todas las checkboxes en `*-task-plan.md` están `[x]`
- Todos los cambios están commiteados
- Validación pre-Phase 7 pasada

**Detectar:** Si todas las checkboxes en `*-task-plan.md` están `[x]`, Phase 6 ya completó.
Al terminar: proponer `/workflow-track` para Phase 7.

---

## Sinergia con /loop

Una vez que los workflow-* están en `.claude/skills/` (TD-008 completo), es posible ejecutar:

```
/loop 10m /workflow-execute
```

Esto invoca `/workflow-execute` cada 10 minutos de forma automática — útil para WPs con muchas tareas que se ejecutan en batches. El skill `once: true` del hook garantiza que `now.md::phase` solo se actualiza en el primer disparo de la sesión.

> Nota: requiere que el task-plan no tenga gates humanos pendientes (las tareas deben ser automáticas). Para WPs con gates obligatorios, usar `/loop` solo para el batch de tareas entre gates.
