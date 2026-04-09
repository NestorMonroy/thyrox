---
name: workflow-decompose
description: Phase 5 DECOMPOSE — inicia o retoma la descomposición del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "bash .claude/scripts/set-session-phase.sh 'Phase 5'"
updated_at: 2026-04-09 22:00:00
---

# /workflow-decompose — Phase 5: DECOMPOSE

Inicia o retoma Phase 5 DECOMPOSE del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .claude/context/work/ | head -1`
2. Leer `*-requirements-spec.md` del WP para obtener los SPECs
3. Leer `context/now.md` — verificar `phase`
4. Verificar si ya existe `*-task-plan.md` con checkboxes `- [ ] [T-NNN]`:
   - Si existe → Phase 5 ya completó. Proponer `/workflow-execute`.

---

## Fase a ejecutar: Phase 5 DECOMPOSE

Tareas atómicas con trazabilidad previenen trabajo duplicado o perdido.

1. Leer `work/.../*-requirements-spec.md` del WP activo
   - Si el usuario pide descomposición directa sin spec previo: crear WP y descomponer desde la descripción — no cuestionar si el proyecto existe

2. REQUERIDO: Crear `work/../{nombre-wp}-task-plan.md` usando `assets/tasks.md.template`
   - Nombre descriptivo: `skill-activation-task-plan.md`, no `task-plan.md`

3. Crear lista de tareas con IDs trazables:
   ```
   - [ ] [T-NNN] Descripción de la tarea (SPEC-N)
   - [ ] [T-NNN] [P] Tarea paralelizable (SPEC-N)
   ```
   Cada tarea necesita ID + referencia a su requisito — permite detectar tareas huérfanas.

4. Marcar tareas paralelas `[P]`
   - En ejecución paralela: usar `[~]` para reclamar tareas antes de ejecutarlas
   - Ver `../../references/conventions.md#parallel-agent-execution`

5. Definir checkpoints de validación por grupo de tareas
   - Si hay >50 issues: usar `assets/categorization-plan.md.template` para categorizar primero

6. Incluir en el task-plan:
   - **DAG de dependencias** en Mermaid — qué bloquea qué
   - **Fases de ejecución** agrupadas lógicamente
   - **Cobertura SPEC→Task** — tabla de trazabilidad inversa

7. **Verificar atomicidad antes de presentar al usuario:**
   - [ ] Cada tarea toca exactamente 1 ubicación (1 archivo O 1 sección de 1 archivo)
   - [ ] Ninguna descripción de tarea contiene "y" conectando dos operaciones distintas
   - [ ] Cada tarea puede commitearse y marcarse [x] de forma independiente
   Si algún ítem falla: descomponer la tarea infractora antes de continuar.

---

## Gate humano

⏸ GATE CRÍTICO — STOP obligatorio antes de Phase 6.
Presentar el task-plan completo con TODAS las tareas listadas.
Esperar confirmación explícita. Este gate NO tiene excepciones.
Razón: Phase 6 modifica el repositorio — el usuario debe aprobar antes de que se ejecute.
Al aprobar: actualizar `context/now.md::phase` a `Phase 6`.

---

## Exit criteria

Phase 5 completa cuando:
- `work/.../*-task-plan.md` existe con checkboxes `- [ ] [T-NNN]`
- Todas las tareas tienen referencia a su SPEC
- DAG de dependencias documentado en Mermaid
- Atomicidad verificada (3 ítems del checklist)
- Usuario aprobó el plan explícitamente en esta sesión

**Detectar:** Si `work/.../*-task-plan.md` tiene checkboxes `- [ ] [T-NNN]`, Phase 5 ya completó.
Al terminar: proponer `/workflow-execute` para Phase 6.
