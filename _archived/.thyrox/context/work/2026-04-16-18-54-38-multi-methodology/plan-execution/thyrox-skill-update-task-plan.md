```yml
created_at: 2026-04-17 02:45:52
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 8 — PLAN EXECUTION
author: NestorMonroy
status: Completado
```

# Task Plan — Actualización thyrox/SKILL.md post ÉPICA 40

**Fuente:** `plan/thyrox-skill-update-plan.md` — 7 adiciones (A1–A7) a 2 archivos.
**Archivos modificados:** `.claude/skills/thyrox/SKILL.md` + `.claude/skills/workflow-discover/references/scalability.md`

## DAG de dependencias

```
T-001 (A1+A7) ──┐
T-002 (A2)    ──┤── T-007 (commit)
T-003 (A4)    ──┤
T-004 (A5)    ──┤
T-005 (A3)    ──┘
T-006 (A6) ───────── T-007 (commit)
```

T-001 a T-006 son independientes entre sí (editan secciones distintas).
T-007 depende de T-001..T-006.

## Trazabilidad

| Tarea | Adición del plan | Archivo |
|-------|-----------------|---------|
| T-001 | A1 + A7 | `thyrox/SKILL.md` |
| T-002 | A2 | `thyrox/SKILL.md` |
| T-003 | A4 | `thyrox/SKILL.md` |
| T-004 | A5 | `thyrox/SKILL.md` |
| T-005 | A3 | `thyrox/SKILL.md` |
| T-006 | A6 | `workflow-discover/references/scalability.md` |
| T-007 | — | git commit |

---

## Tareas

- [x] **[T-001]** Insertar sección "Methodology skills" (A1) + nota de extensibilidad (A7) en `thyrox/SKILL.md`

  **Ubicación:** después del bloque `---` que cierra la sección "Catálogo de fases" (después de la línea `Ver [escalabilidad]... para reglas detalladas.` y el `---` siguiente, antes de `## Dónde viven los artefactos`).

  **Contenido a insertar:**

  ```markdown
  ## Methodology skills

  Cuando un WP requiere un marco metodológico específico, activar el skill de metodología
  correspondiente **dentro** del workflow stage apropiado. Cada skill declara su
  `THYROX Stage:` de anclaje.

  | Namespace | Metodología | Skills | Stages de anclaje |
  |-----------|------------|--------|-------------------|
  | `pdca:` | PDCA (Deming) | pdca-plan, pdca-do, pdca-check, pdca-act | 3, 10, 11, 12 |
  | `dmaic:` | DMAIC Six Sigma | dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control | 2, 3, 10, 11, 12 |
  | `rup:` | RUP | rup-inception, rup-elaboration, rup-construction, rup-transition | 1, 3, 5, 7, 10, 11, 12 |
  | `rm:` | Requirements Management | rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management | 1, 3, 5, 7, 9, 10, 11 |
  | `pm:` | PMBOK | pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing | 1, 3, 5, 6, 7, 10, 11, 12 |
  | `ba:` | BABOK / Business Analysis | ba-planning, ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-solution-evaluation, ba-strategy | 1, 2, 3, 5, 6, 7, 10, 11, 12 |

  > **Framework extensible:** Los 6 namespaces listados son los methodology skills
  > implementados actualmente (ÉPICA 40). El framework soporta incorporar cualquier
  > marco metodológico adicional siguiendo el patrón `{metodología}-{paso}` con
  > declaración de `THYROX Stage:` en su SKILL.md y anatomía completa
  > (SKILL.md + assets/ + references/).
  >
  > Frameworks del landscape original (V3.1) pendientes de implementación:
  > SDLC, Lean Six Sigma, Problem Solving 8-step, Strategic Planning,
  > Strategic Management, Consulting Process, Business Process Analysis.

  **Cómo activar:** invocar directamente el skill del paso, ej. `/dmaic-define`.
  El skill actualiza `now.md::flow` y `now.md::methodology_step`.

  **Selección por necesidad:**
  - Mejora continua con ciclos rápidos → `pdca-*`
  - Reducción de variabilidad con datos → `dmaic-*`
  - Desarrollo iterativo con milestones → `rup-*`
  - Gestión formal de requisitos → `rm-*`
  - Gestión de proyectos PMI → `pm-*`
  - Análisis de negocio BABOK → `ba-*`

  ---
  ```

- [x] **[T-002]** Insertar sección "Arquitectura de orquestación" (A2) en `thyrox/SKILL.md`

  **Ubicación:** inmediatamente antes de `## Modelo de permisos` (línea ~220 en el archivo actual).

  **Contenido a insertar:**

  ```markdown
  ## Arquitectura de orquestación

  THYROX opera en dos niveles simultáneos:

  **Nivel 1 — Workflow stages (ciclo THYROX):**
  Los 12 stages definen el marco macro del WP. Implementados por los `workflow-*` skills.
  Estado rastreado en `now.md::stage`.

  **Nivel 2 — Methodology skills (opcional, anidado):**
  Dentro de un workflow stage, se puede activar un methodology skill para aplicar
  un marco metodológico específico. Implementados por `{metodología}-{paso}` skills.
  Estado rastreado en `now.md::flow` + `now.md::methodology_step`.

  El workflow stage no se interrumpe — el methodology skill opera como sub-proceso
  dentro del stage activo.

  **Ejemplo concreto:** WP con `flow: dmaic` en Stage 3 DIAGNOSE:
  - `now.md::stage` → `Stage 3 — DIAGNOSE`
  - `now.md::flow` → `dmaic`
  - `now.md::methodology_step` → `dmaic:analyze`
  - Artefacto producido → `analyze/dmaic-analyze.md` (del skill dmaic-analyze)

  **Framework patterns:**
  Trabajo de mantenimiento del framework (ej: completar anatomía de skills, auditorías de references)
  se ejecuta como tareas del task-plan sin `flow:` declarado (`flow: null`). No requiere skill dedicado.

  ---
  ```

- [x] **[T-003]** Insertar nota bajo tabla de escalabilidad (A4) en `thyrox/SKILL.md`

  **Ubicación:** inmediatamente después de la fila `| Grande | 1–12 completo | Proyecto complejo multi-sesión |` y antes de la línea `Ver [escalabilidad]...`.

  **Contenido a insertar:**

  ```markdown
  > **Con `flow:` activo:** los stages donde el flow tiene methodology skills anclados
  > son **no-saltables**, independientemente del tamaño del WP.
  > Ver reglas detalladas en [scalability.md → Escalabilidad con flow activo](../workflow-discover/references/scalability.md).
  ```

- [x] **[T-004]** Agregar fila en tabla "Dónde viven los artefactos" (A5) en `thyrox/SKILL.md`

  **Ubicación:** antes de la última fila `| — | Errores | ...` en la tabla de artefactos.

  **Fila a insertar:**

  ```markdown
  | Con flow activo | Artefacto del methodology skill | `work/{wp}/{cajón-de-fase}/{methodology}-{step}.md` | Template del skill de metodología |
  ```

  **Nota inline:** Ejemplo — con `flow: dmaic` en Stage 3: el artefacto es `analyze/dmaic-analyze.md`, producido por el skill `dmaic-analyze`, complementando los artefactos del workflow stage.

- [x] **[T-005]** Agregar subsección "Methodology skills" en "References por dominio" (A3) en `thyrox/SKILL.md`

  **Ubicación:** como primera subsección dentro de `## References por dominio`, antes de `### Phase 1: DISCOVER`.

  **Contenido a insertar:**

  ```markdown
  ### Methodology skills (activar cuando hay un `flow:` en now.md)

  Ver tabla completa en [Methodology skills](#methodology-skills) arriba.
  Selección por namespace: `pdca-*` · `dmaic-*` · `rup-*` · `rm-*` · `pm-*` · `ba-*`
  Cada namespace tiene su propio `references/` con guías del marco metodológico.

  Entradas rápidas por namespace:
  - `pdca:` → [pdca-plan](../pdca-plan/SKILL.md)
  - `dmaic:` → [dmaic-define](../dmaic-define/SKILL.md)
  - `rup:` → [rup-inception](../rup-inception/SKILL.md)
  - `rm:` → [rm-elicitation](../rm-elicitation/SKILL.md)
  - `pm:` → [pm-initiating](../pm-initiating/SKILL.md)
  - `ba:` → [ba-planning](../ba-planning/SKILL.md)
  ```

- [x] **[T-006]** Agregar sección "Escalabilidad con methodology skill activo" (A6) en `scalability.md`

  **Archivo:** `.claude/skills/workflow-discover/references/scalability.md`
  **Ubicación:** al final del archivo (después de la línea `**Última actualización:** 2026-03-27`).
  **También:** actualizar `updated_at` en el frontmatter al timestamp actual.

  **Contenido a agregar:**

  ```markdown
  ---

  ## Escalabilidad con methodology skill activo

  Cuando `now.md::flow` tiene un valor (`pdca`, `dmaic`, `rup`, `rm`, `pm`, `ba`),
  la lógica de escalabilidad cambia: los stages donde el flow tiene methodology skills
  anclados son **no-saltables**, independientemente del tamaño del WP.

  **Regla de precedencia:** stages con anclaje de methodology skill > regla de tamaño.

  ### Stages obligatorios por flow activo

  | Flow | Namespace | Stages obligatorios | Stages opcionales (según tamaño) |
  |------|-----------|--------------------|---------------------------------|
  | `pdca` | `pdca:` | 3, 10, 11, 12 | 1, 2, 4, 5, 6, 7, 8, 9 |
  | `dmaic` | `dmaic:` | 2, 3, 10, 11, 12 | 1, 4, 5, 6, 7, 8, 9 |
  | `rup` | `rup:` | 1, 3, 5, 7, 10, 11, 12 | 2, 4, 6, 8, 9 |
  | `rm` | `rm:` | 1, 3, 5, 7, 9, 10, 11 | 2, 4, 6, 8, 12 |
  | `pm` | `pm:` | 1, 3, 5, 6, 7, 10, 11, 12 | 2, 4, 8, 9 |
  | `ba` | `ba:` | 1, 2, 3, 5, 6, 7, 10, 11, 12 | 4, 8, 9 |

  ### Regla de convivencia

  El workflow stage y el methodology skill son **complementarios**, no excluyentes:
  - El workflow stage produce sus artefactos THYROX (ej: `analyze/*.md`)
  - El methodology skill produce sus artefactos metodológicos (ej: `analyze/dmaic-analyze.md`)
  - Ambos conviven en el mismo cajón de fase

  ### Fuente de verdad

  El campo `flow:` en `now.md` determina si aplica esta regla.
  - `flow: null` → escalabilidad normal (solo regla de tamaño)
  - `flow: dmaic` → stages 2, 3, 10, 11, 12 son no-saltables para este WP
  ```

- [x] **[T-007]** Commit de todos los cambios

  ```
  docs(thyrox): document methodology skills and orchestration architecture

  Add 7 sections to thyrox/SKILL.md documenting two-level THYROX orchestration
  (workflow stages + methodology skills) built in ÉPICA 40. Add scalability rules
  for active flows to workflow-discover/references/scalability.md.
  ```

---

## Criterio de completitud

El plan-execution está completo cuando todos los checkboxes están marcados y el commit existe en git.
Verificar contra los 7 criterios del plan original (`plan/thyrox-skill-update-plan.md`).
