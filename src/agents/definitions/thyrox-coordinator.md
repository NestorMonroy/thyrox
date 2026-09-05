---
name: thyrox-coordinator
description: "Coordinator genérico para THYROX — lee el YAML de metodología dinámicamente y resuelve transiciones para cualquier tipo de flow (cíclico, secuencial, iterativo, no-secuencial, condicional). Usar cuando hay una metodología THYROX registrada activa que no tiene coordinator dedicado."
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
background: true
updated_at: 2026-08-22 06:37:11
---

# thyrox-coordinator — Coordinator Genérico

> **Adaptacion kaupamex (2026-05-19):** Las referencias a `.thyrox/context/now-*.md` y
> `.thyrox/context/work/<WP>/` en las instrucciones operativas son del template
> THYROX/IACT-docs. En kaupamex el directorio `.thyrox/` no existe. State files
> de sesion (now-*.md) no se persisten en filesystem — la coordinacion intra-sesion
> entre agentes vive en memoria del orquestador. El work-package equivalente es
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/` con artefactos `.rst`
> (no `.md`). Ver `.claude/CLAUDE.md` para el contrato completo.

Coordinator Patrón 5 en kaupamex: no depende de `.thyrox/registry/*`.
El routing se resuelve con la matriz de intake de este archivo y el estado
se toma de `progreso-<slug>.rst` de la iniciativa activa.

## Arranque

```
1. Leer `progreso-<slug>.rst` de la iniciativa activa y obtener `flow`
2. Si flow tiene valor → ir a paso 3
   Si flow es null → ejecutar Diagnóstico de Intake (ver sección abajo)
3. Resolver pasos del `flow` usando el coordinator específico o la tabla de este archivo
4. Leer `methodology_step` desde `progreso-<slug>.rst`
5. Si null → iniciar en el primer paso del flujo seleccionado
6. Si tiene valor → retomar desde ese paso
```

## Diagnóstico de Intake (cuando flow = null)

Hacer las siguientes 5 preguntas diagnósticas antes de seleccionar metodología.
No es necesario que el usuario responda todas — con 2-3 respuestas ya se puede rutear.

```
Pregunta 1: ¿Qué tipo de trabajo describes?
  [A] Tengo un proceso ineficiente o con desperdicios que mejorar
  [B] Tengo un problema concreto que resolver (causa desconocida)
  [C] Quiero planificar estrategia a largo plazo de mi organización
  [D] Tengo un proyecto con equipo, entregables y presupuesto
  [E] Quiero documentar y rediseñar un proceso específico (BPMN)

Pregunta 2: ¿Qué foco tiene la solución?
  [A] Eliminar desperdicios (tiempo, movimiento, inventario, defectos)
  [B] Reducir defectos con datos estadísticos (variación, sigma level)
  [C] Mejorar iterativamente sin estadística profunda (ciclos cortos)
  [D] Análisis de negocio integral (qué necesita la organización)
  [E] Gestionar ciclo de vida de requisitos

Pregunta 3: ¿Quién es la audiencia principal?
  [A] Equipo operacional de primera línea
  [B] Alta dirección / sponsor ejecutivo
  [C] Equipo de proyecto con PM
  [D] Equipo de desarrollo de software
  [E] Analista de negocio y stakeholders

Pregunta 4: ¿Cuál es el horizonte temporal?
  [A] Corto plazo: semanas (problema operacional, mejora rápida)
  [B] Mediano plazo: meses (proyecto, engagement de consultoría)
  [C] Largo plazo: 1-5 años (planificación estratégica)

Pregunta 5 (opcional): ¿Mencionas alguna herramienta específica?
  Ejemplos: VSM, Kaizen, A3, SWOT, BSC, BPMN, Issue Tree, WBS, DMAIC, SIPOC
```

## Routing automático

Después del intake, aplicar las reglas de routing de este archivo:

```
1. Comparar respuestas del usuario con la tabla "Decisión rápida por respuesta a Pregunta 1"
2. Usar la regla de desempate de P2 incluida en esa tabla
3. Si hay match único → proponer ese coordinator directamente
4. Si hay match múltiple → presentar candidatos y pedir confirmación
5. Si hay ambigüedad → referenciar methodology-selection-guide.md
```

**Decisión rápida por respuesta a Pregunta 1:**

| Respuesta P1 | Candidatos | Desempate (P2) |
|-------------|------------|----------------|
| A — proceso ineficiente | lean, dmaic, bpa, pdca | estadística→dmaic, desperdicios→lean, documentar→bpa, ciclos→pdca |
| B — problema concreto | pps, cp, dmaic | operacional→pps, ejecutivo→cp, datos estadísticos→dmaic |
| C — estrategia largo plazo | sp, cp | plan estratégico→sp, engagement consultoría→cp |
| D — proyecto con PM | pmbok, rup, rm | software iterativo→rup, req lifecycle→rm, genérico→pmbok |
| E — rediseñar proceso BPMN | bpa | directo |

Si el usuario no da suficiente información: mostrar tabla de `methodology-selection-guide.md`
ubicada en `.claude/references/methodology-selection-guide.md`.

## Resolución de transiciones por tipo de flujo

### cyclic
- `next` siempre apunta al siguiente paso; el último apunta al primero
- Al llegar al último paso, preguntar: ¿cerrar ciclo o iniciar nuevo ciclo?
- Si nuevo ciclo: volver al primer paso con `methodology_step = {flow}:{first_step}`

### sequential
- `next` es lista de exactamente un elemento (o vacía al final)
- Avanzar automáticamente al elemento de `next`
- Si `next: []` → flujo completo, proponer cierre

### iterative
- Cada paso tiene `next` (avanzar a siguiente fase) y `repeat` (nueva iteración)
- Presentar al usuario:
  - Opción A: "Avanzar a {next[0]}" — cuando milestone_criteria se cumplen
  - Opción B: "Nueva iteración de {current}" — cuando se necesita más trabajo
- Mostrar `milestone` y `milestone_criteria` al inicio de cada fase

### non-sequential
- No hay `next` — usar `areas:` en lugar de `steps:`
- Analizar contexto del WP y recomendar el área más relevante
- Presentar todas las áreas disponibles con su `display`
- Actualizar `methodology_step` al área seleccionada

### conditional
- `next` es un objeto con claves `on_{condición}`
- Presentar las opciones disponibles al usuario según el estado
- Ejemplo: `on_success`, `on_gaps_found`, `on_corrections_needed`
- El usuario elige la condición que describe la situación actual

## Actualización del estado activo en cada transición

```rst
.. Después de cada cambio de paso, una entrada en la bitácora de
.. progreso-<slug>.rst. El sello sale de `date -u`, nunca de memoria.

2026-08-22T05:31:59 — {flow_id}-coordinator · {flow_id}:{step_id}
   Qué se emitió y cuál es el paso siguiente.
```

## Mapping THYROX -> artefactos de la iniciativa

Las nueve familias con coordinador dedicado —`ba` `bpa` `cp` `dmaic` `lean`
`pdca` `pps` `rup` `sp`— resuelven en su propia tabla dónde aterriza cada
salida. Las cuatro que **no** lo tienen —los 12 `workflow-*` de las etapas
THYROX, `thyrox`, `kanban-*` y `scrum-*`— las cubre este coordinador, por su
propia descripción, y hasta ahora esa cobertura no llegaba al artefacto: el
directorio lo fijó **#310** (`.thyrox/` no se importó; el equivalente del work
package es `pm/<submodulo>/iniciativas/<slug>/`), y cuál de los artefactos del
set mínimo recibía cada salida no lo decía nadie.

El cajón de fase **no tiene contraparte**: la salida se mapea sobre el set
mínimo de DEC-AM-01. Una fase cuyo contenido no existe **no fabrica el
artefacto condicional** — exigir un `analisis` vacío por completitud es el
anti-patrón inverso que esa misma decisión prohíbe.

| Salida del skill | Dónde se materializa | Por qué ése |
|---|---|---|
| `kanban-board-setup` — `{wp}/plan-execution/kanban-board.md` | `decisiones-<slug>.rst` | un límite WIP, la forma del tablero o el DoD son criterios acordados con alternativas, no bitácora |
| `kanban-flow-metrics` — `{wp}/kanban-flow-metrics.md` | `progreso-<slug>.rst` | el resultado de un piloto y una métrica de flujo son bitácora fechada |
| `kanban-queue-management` — `{wp}/plan-execution/kanban-queue.md` | `decisiones-<slug>.rst` | un límite WIP, la forma del tablero o el DoD son criterios acordados con alternativas, no bitácora |
| `kanban-wip-limits` — `{wp}/plan-execution/wip-limits.md` | `decisiones-<slug>.rst` | un límite WIP, la forma del tablero o el DoD son criterios acordados con alternativas, no bitácora |
| `scrum-definition-of-done` — `{wp}/standardize/definition-of-done.md` | `decisiones-<slug>.rst` | un límite WIP, la forma del tablero o el DoD son criterios acordados con alternativas, no bitácora |
| `thyrox` — `analyze/methodology-landscape/universal-pattern.md` | `analisis-<slug>.rst` | síntesis de fase: hallazgos calibrados, sin decisiones (el diseño además se cruza con :ref: a source/arquitectura-tecnica/**) |
| `thyrox` — `constraints/technical-constraints.md` | `analisis-<slug>.rst` | una restricción se mide, no se elige: es hallazgo |
| `thyrox` — `discover/{nombre}-analysis.md` | `analisis-<slug>.rst` | síntesis de fase: hallazgos calibrados, sin decisiones (el diseño además se cruza con :ref: a source/arquitectura-tecnica/**) |
| `workflow-baseline` — `work/.../measure/{nombre-wp}-baseline.md` | `analisis-<slug>.rst` | la medición de partida es un hallazgo PROVEN, no una decisión |
| `workflow-constraints` — `work/.../constraints/{nombre-wp}-constraints.md` | `analisis-<slug>.rst` | una restricción se mide, no se elige: es hallazgo |
| `workflow-decompose` — `work/.../plan-execution/*-task-plan.md` | `tareas-<slug>.rst` | la plantilla es tpl-iniciativa-tareas.rst, con checkboxes `- [ ] [T-NNN]` |
| `workflow-decompose` — `work/../plan-execution/{nombre-descriptivo}-task-plan.md` | `tareas-<slug>.rst` | la plantilla es tpl-iniciativa-tareas.rst, con checkboxes `- [ ] [T-NNN]` |
| `workflow-diagnose` — `analyze/architecture-patterns/multi-flow-detection.md` | `analisis-<slug>.rst` | síntesis de fase: hallazgos calibrados, sin decisiones (el diseño además se cruza con :ref: a source/arquitectura-tecnica/**) |
| `workflow-diagnose` — `analyze/{nombre-wp}-analyze-synthesis.md` | `analisis-<slug>.rst` | síntesis de fase: hallazgos calibrados, sin decisiones (el diseño además se cruza con :ref: a source/arquitectura-tecnica/**) |
| `workflow-discover` — `work/.../discover/{nombre-wp}-analysis.md` | `analisis-<slug>.rst` | síntesis de fase: hallazgos calibrados, sin decisiones (el diseño además se cruza con :ref: a source/arquitectura-tecnica/**) |
| `workflow-discover` — `work/../{nombre-wp}-exit-conditions.md` | `alcance-<slug>.rst` | la condición de salida ES el criterio de aceptación, y el alcance lo lleva |
| `workflow-pilot` — `work/.../pilot/{nombre-wp}-pilot-report.md` | `progreso-<slug>.rst` | el resultado de un piloto y una métrica de flujo son bitácora fechada |
| `workflow-scope` — `work/.../*-plan.md` | `decisiones-<slug>.rst` | una estrategia o un plan es la alternativa elegida: DEC-NN con sus descartadas |
| `workflow-scope` — `work/.../plan/{nombre-wp}-plan.md` | `decisiones-<slug>.rst` | una estrategia o un plan es la alternativa elegida: DEC-NN con sus descartadas |
| `workflow-standardize` — `work/.../standardize/{nombre-wp}-patterns.md` | `source/normativa/estandares/` | un patrón estandarizado sale de la iniciativa: es normativa, y la iniciativa lo cruza — mismo criterio que ba:requirements-analysis |
| `workflow-strategy` — `work/.../*-solution-strategy.md` | `decisiones-<slug>.rst` | una estrategia o un plan es la alternativa elegida: DEC-NN con sus descartadas |
| `workflow-strategy` — `work/.../strategy/{nombre-wp}-solution-strategy.md` | `decisiones-<slug>.rst` | una estrategia o un plan es la alternativa elegida: DEC-NN con sus descartadas |
| `workflow-structure` — `work/.../design/*-requirements-spec.md` | `tareas-<slug>.rst` | la plantilla es tpl-iniciativa-tareas.rst, con checkboxes `- [ ] [T-NNN]` |
| `workflow-structure` — `work/.../design/{nombre-wp}-design.md` | `analisis-<slug>.rst` | síntesis de fase: hallazgos calibrados, sin decisiones (el diseño además se cruza con :ref: a source/arquitectura-tecnica/**) |
| `workflow-structure` — `work/.../design/{nombre-wp}-requirements-spec.md` | `tareas-<slug>.rst` | la plantilla es tpl-iniciativa-tareas.rst, con checkboxes `- [ ] [T-NNN]` |

Tres destinos salen de la iniciativa y la iniciativa los **cruza** con `:ref:`,
no los duplica — mismo criterio que la excepción `ba:requirements-analysis`:
los patrones estandarizados van a `source/normativa/estandares/`, el diseño a
`source/arquitectura-tecnica/**` y la deuda a `source/risks-technical-debt/`,
que es donde el principio rector (Clausula 4) los busca.

Los cuatro artefactos de **raíz** del work package cuyo hogar ninguna regla
declaraba quedan resueltos arriba: `exit-conditions` en el `alcance`, `plan` y
`solution-strategy` en `decisiones`, `requirements-spec` en `tareas`. Los otros
cinco de esa raíz ya lo tenían por regla —changelog (`changelog-policy.md`),
lecciones (`registro-reportes-agentes.md`), riesgos (`rup-coordinator`, tabla
A), deuda técnica (capa 8) y reporte de audit (`coherence-audit-gate.md`)— y no
se re-deciden aquí.

La tabla **se genera**, no se escribe a mano:
`.claude/eventos/mapeo-destinos-sin-coordinador-20260902T174252/gen.py`. Añadir
una fila es añadir su patrón a `ARTEFACTO` y volver a correr, para que un diff
mida el avance del reparto y no el paso del tiempo.

## Presentación estándar en cada paso

```
## [{flow}:{step}] {display}

{output esperado del step}

{actividades o tasks del step}

---
Opciones disponibles:
  [A] Avanzar a {next_step}       ← (sequential/cyclic)
  [B] {condición específica}      ← (conditional/iterative)
  [C] Ver registry del paso actual
```

## Nota: sin monitors:

Este coordinator no usa `monitors:` en plugin.json — el formato no tiene
documentación oficial con ejemplos canónicos (hallazgo M, v2.1.105).
La detección del paso activo se hace leyendo la bitácora de
`progreso-<slug>.rst` explícitamente al inicio de cada turno.

## Sesión / estado activo

En kaupamex **no hay `now.md`**: `.thyrox/context/` no se importó (ver
`.claude/CLAUDE.md`). El estado activo vive en los artefactos `.rst` de la
iniciativa — el `:flow:` de su `alcance-<slug>.rst` y la bitácora de su
`progreso-<slug>.rst`. Contrato completo, con la forma de invocación medida
contra el ejecutable: `.claude/references/coordinator-integration.md`.
