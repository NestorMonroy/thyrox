---
name: workflow-plan
description: Phase 3 PLAN — inicia o retoma el plan del work package activo.
disable-model-invocation: true
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "bash .claude/scripts/set-session-phase.sh 'Phase 3'"
updated_at: 2026-04-12 00:00:00
---

# /workflow-plan — Phase 3: PLAN

Inicia o retoma Phase 3 PLAN del work package activo.

---

## Contexto de sesión

1. Identificar WP activo: `ls -t .thyrox/context/work/ | head -1`
2. Leer `context/now.md` — verificar `phase`
3. Verificar si ya existe `*-plan.md` con `[x] Scope aprobado`:
   - Si existe aprobado → Phase 3 ya completó. Proponer `/workflow-structure`.
4. Verificar que ROADMAP.md tiene el WP linkeado.

---

## Fase a ejecutar: Phase 3 PLAN

Definir scope antes de estructurar previene scope creep.

> **Nota metodológica:** Phase 2 define el *cómo* (estrategia, alternativas, decisiones). Phase 3 define el *qué* (scope statement, in-scope y out-of-scope explícitos). Phase 2 orienta el scope, pero el scope formal es artefacto de Phase 3.

1. Brainstorm: ¿qué problema? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera?

2. Verificar que el work package existe: `ls context/work/`
   - Si no existe → volver a Phase 1 antes de continuar
   - Para trabajo grande que agrupa múltiples features: usar `assets/epic.md.template`

3. REQUERIDO: Crear `work/../{nombre-wp}-plan.md` usando `assets/plan.md.template`:
   - Scope statement (problema + usuarios + criterios de éxito)
   - In-scope: lista explícita de lo que entra
   - Out-of-scope: lista explícita con razón de cada exclusión
   - Estimación de esfuerzo por componente
   - **REQUERIDO** antes de crear el plan: verificar que los archivos que se planea modificar existen en el repositorio. Si no existen → planificar "crear" no "modificar".

4. Actualizar ROADMAP.md con features y link al WP

5. Si el plan deriva de `analysis/` con RC formales:
   - REQUERIDO: incluir tabla de trazabilidad RC→tarea antes de presentar al usuario
   - Cada RC de prioridad Alta o Media debe tener al menos una fila
   - NO presentar el plan si la tabla está incompleta
   - Si no hay RC formales (trabajo mecánico) → omitir la tabla

6. Obtener aprobación del scope — NO declarar Phase 3 completa hasta confirmación explícita

**Nota DECOMPOSE:** Si el plan tiene RC con prioridades distintas (Alta/Media/Baja) → Phase 5 NO puede saltarse, independientemente del tamaño del WP.

---

## Validaciones pre-gate (TD-029, TD-031, TD-033)

Antes de presentar el gate 3→4:
- **TD-031 deep review**: revisar `{nombre-wp}-solution-strategy.md` de Phase 2 — ¿el scope refleja todas las decisiones?
- **TD-029 criterios**: `{nombre-wp}-plan.md` existe · ROADMAP.md tiene el WP · scope sin ambigüedades pendientes
- **TD-033 now.md**: `git add .thyrox/context/now.md` antes de commits y gates

---

## Gate humano

⏸ STOP — Presentar scope statement (problema, in-scope, out-of-scope, criterios de éxito) al usuario.
Esperar confirmación explícita. NO continuar sin respuesta.
Al aprobar:
1. Actualizar `context/now.md::phase` a `Phase 4`
2. Actualizar `{nombre-wp}-plan.md::status` a `Aprobado — {fecha}`
3. Marcar `[x] Scope aprobado por usuario — {fecha}` en `{nombre-wp}-plan.md`

---

## Exit criteria

Phase 3 completa cuando:
- `work/../{nombre-wp}-plan.md` existe con `[x] Scope aprobado`
- ROADMAP.md tiene el WP linkeado
- Si hay RC formales: tabla de trazabilidad RC→tarea incluida, cada RC Alta/Media con tarea asignada
- Usuario confirmó el scope explícitamente en esta sesión

**Detectar:** Si `work/.../*-plan.md` existe con `[x] Scope aprobado`, Phase 3 ya completó.
Al terminar: proponer `/workflow-structure` para Phase 4.
