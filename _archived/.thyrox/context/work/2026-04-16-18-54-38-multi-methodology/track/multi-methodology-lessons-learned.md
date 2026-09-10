```yml
work_package_id: 2026-04-16-18-54-38-multi-methodology
closed_at: 2026-04-17 16:47:19
project: THYROX
source_phase: Stage 11 — TRACK/EVALUATE
total_lessons: 6
author: NestorMonroy
```

# Lessons Learned — multi-methodology (ÉPICA 40)

---

## Lecciones

### L-131: Declarar ÉPICA completa antes de Stage 11/12 — síntoma del GO-TO problem

**Qué pasó**

Al terminar Stage 10 IMPLEMENT (31/31 tasks), el asistente declaró "ÉPICA 40 está completa" y actualizó `focus.md` con "COMPLETADA 2026-04-16". Los Stages 11 TRACK y 12 STANDARDIZE quedaron sin ejecutar. El usuario tuvo que corregirlo explícitamente.

**Raíz**

`focus.md` no tiene un mecanismo que distinga "Stage 10 done" de "WP cerrado". El asistente interpretó la finalización del task-plan como cierre del WP. La regla I-011 existe pero no se aplicó.

**Fix aplicado**

Revertido en la misma sesión: `focus.md` y `now.md` corregidos, status cambiado a "Stage 10 IMPLEMENT completo → pendiente gate Stage 11". Regla I-011 reforzada en la sesión siguiente.

**Regla**

Cuando [task-plan tiene 100% checkboxes marcados], NO declarar ÉPICA completa — actualizar `now.md::stage` a "Stage N done → pendiente gate Stage N+1" y esperar instrucción explícita del usuario para continuar.

---

### L-132: Stale checkboxes acumulados en 3 task-plans simultáneos

**Qué pasó**

Al auditar el WP antes de Stage 11, se encontraron 21 checkboxes `[ ]` en `implementation-plan.md`, 2 en `skill-anatomy-task-plan.md` y 7 en `thyrox-skill-update-task-plan.md` — todos correspondiendo a trabajo ya commitado en git. El drift fue acumulado durante el WP sin que nadie lo detectara.

**Raíz**

ÉPICA 40 tuvo 4 task-plans activos en paralelo. No hay protocolo para actualizar checkboxes al momento del commit — es una acción manual post-hoc. En WPs largos con muchos archivos de tracking, el drift es inevitable sin enforcement.

**Fix aplicado**

Audit pass al final del WP: grep de commits vs checkboxes, marcado `[x]` masivo con verificación de contenido. Requirió una sesión dedicada de ~30 min.

**Regla**

Cuando [se hace un commit que completa una tarea T-NNN], marcar ese checkbox inmediatamente en el mismo commit o en el siguiente. No diferir la actualización de checkboxes a una "sesión de auditoría" al final — el drift crece exponencialmente con el número de task-plans activos.

---

### L-133: Naming conflict ps8→pps descubierto tarde — después de crear 6 skills

**Qué pasó**

Se implementaron 6 skills bajo el namespace `ps8:` (8D Ford) antes de descubrir en el gap analysis que el contenido real era Toyota TBP (6 pasos), no Ford 8D. Requirió un refactor de renaming de skills, YAML, coordinator y SKILL.md.

**Raíz**

El análisis de la metodología fue superficial en Stage 1 DISCOVER. El nombre `ps8` se tomó del registry existente sin verificar que el contenido alineara con la nomenclatura.

**Fix aplicado**

T-001: renombrar `ps8.yml` → `pps.yml`, todos los skills `ps8-*` → `pps-*`. Documentado como GAP-005 CRITICAL en el gap analysis.

**Regla**

Cuando [se crea un namespace de metodología], verificar que el identificador corto refleja el nombre oficial de la metodología ANTES de crear los skills. El costo de renaming post-implementación es alto (skills + YAML + coordinator + docs + SKILL.md).

---

### L-134: Sin template para plan-execution causó drift de formato entre 4 task-plans

**Qué pasó**

Los 4 task-plans del WP (`multi-methodology-task-plan.md`, `skill-anatomy-task-plan.md`, `multi-methodology-namespaces-task-plan.md`, `thyrox-skill-update-task-plan.md`) usaron formatos distintos: uno con Mermaid DAG, otro con texto, otro con tiers, otro con batches. No había template de referencia.

**Raíz**

`workflow-decompose/assets/` tenía `tasks.md.template` que era un legacy no alineado con el formato THYROX moderno. Nadie lo usaba en la práctica.

**Fix aplicado**

Al cerrar el WP: crear `plan-execution.md.template` con 3 opciones de convención de tarea (anatomía / tiers / genéricas) y secciones opcionales para DAG, stopping points, versioning y resumen. Registrado como aprendizaje en Stage 12.

**Regla**

Cuando [se crea un task-plan en `plan-execution/`], usar siempre `plan-execution.md.template`. Si el template no cubre el caso de uso, extenderlo — no crear formato ad-hoc que genere drift.

---

### L-135: Múltiples archivos de estado = inconsistencia garantizada (GO-TO problem)

**Qué pasó**

Al auditar el WP, `focus.md`, `project-state.md`, `now.md` y `ROADMAP.md` tenían versiones incompatibles del estado de ÉPICA 40. `project-state.md` tenía 4 días de drift y contaba 11 agentes cuando había 23. `focus.md` decía "COMPLETADA" cuando Stage 11/12 estaban pendientes. Solo `now.md` tenía el estado correcto.

**Raíz**

4 archivos compiten por el título de "single source of truth". No hay protocolo de actualización atómica. Cada uno se actualiza en momentos distintos, con distinto nivel de granularidad. El drift crece con cada sesión que no actualiza todos.

**Fix aplicado**

`now.md` corregido manualmente. Identificado como GO-TO problem estructural → ÉPICA 41 creada para resolverlo.

**Regla**

Cuando [termina una Stage importante], actualizar `now.md`, `focus.md` y `ROADMAP.md` en el mismo commit de cierre — nunca en commits separados. `project-state.md` debe ser generado por script, no editado manualmente.

---

### L-136: Deep-review antes de Tier 4 (arquitectura mayor) fue crítico

**Qué pasó**

El plan original marcó Tier 4 como "requiere decisiones arquitectónicas antes de implementar". Al hacer deep-review de los Tiers 1-3 antes de avanzar, se identificaron 10 gaps adicionales que no estaban en el plan inicial (artifact schema, routing-rules, coordinator signals, etc.).

**Raíz**

No hay ningún mecanismo — es un comportamiento proactivo del framework. El gap analysis inicial (Stage 3 DIAGNOSE) no llegó a la profundidad de los gaps arquitecturales.

**Fix aplicado**

Tier 4 implementado con T-022..T-031 (10 tareas) — todas surgidas del deep-review. Sin el gate, se hubiera completado el WP con los gaps arquitecturales sin resolver.

**Regla**

Cuando [hay un Tier/batch marcado como "arquitectura mayor"], hacer un deep-review explícito de las capas anteriores antes de empezar — no asumir que el gap analysis inicial lo cubrió todo. Los gaps arquitecturales emergen después de ver la implementación completa.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| **GO-TO problem** | L-131, L-135 | ÉPICA 41: consolidar estado en una fuente única con actualización automática |
| **Checkbox drift** | L-132 | Agregar al protocolo de commit: marcar checkbox inmediatamente |
| **Template ausente = formato divergente** | L-134 | `plan-execution.md.template` creado; propagarlo como estándar en Stage 12 |

---

## Qué replicar

- **Estructura Tier 1→2→3→4**: para WPs grandes con múltiples capas de dependencia, el modelo tier con ruta crítica explícita es efectivo. Cada tier termina con commits atómicos revisables.
- **Batch por metodología (B1..B7)**: en trabajo de anatomía (assets + references + SKILL.md), agrupar por dominio permite revisión y rollback por dominio.
- **Gap analysis como artefacto formal**: el `comprehensive-gap-analysis.md` con 32 gaps numerados fue la base de todo el plan. Sin ese artefacto el trabajo hubiera sido ad-hoc.
- **Deep-review gate antes de arquitectura mayor**: añadir Stopping Point explícito antes de cualquier tier/batch que toque arquitectura central.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-NEW-001 | GO-TO problem: 4 archivos de estado inconsistentes sin protocolo de sync | Alta | ÉPICA 41: goto-problem-fix |
| TD-NEW-002 | `project-state.md` generado por script `update-state.sh` — script no se invoca automáticamente al cierre | Alta | ÉPICA 41 (incluido) |
| TD-NEW-003 | Checkboxes en task-plans no se actualizan atómicamente con el commit | Media | Agregar a hook PreToolUse o protocolo de commit |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../track/multi-methodology-lessons-learned.md`
