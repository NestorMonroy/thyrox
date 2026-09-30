```yml
type: Solution Strategy
work_package: 2026-04-08-23-55-52-workflow-restructure
created_at: 2026-04-09 00:10:00
updated_at: 2026-04-09 00:10:00
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy: workflow-restructure (FASE 23)

## Key Ideas

1. **Naming resuelto: Option B (hyphen)** — `workflow-analyze/SKILL.md`, `workflow-strategy/SKILL.md`, etc. Consistente con convención kebab-case de todos los demás skills. La invocación cambia de `/workflow_analyze` → `/workflow-analyze`.

2. **Migración = mover + renombrar, no reescribir** — El contenido de los 7 skills NO cambia. Solo cambia la ubicación (flat file → subdirectorio) y el nombre del comando en `description:` y referencias externas.

3. **Referencias externas son atómicas** — Cada archivo con referencias se actualiza en una tarea separada. Total de archivos a actualizar: `session-start.sh`, `CLAUDE.md`, `workflow_init.md`, `adr-016.md`, `technical-debt.md`. No hay dependencias cruzadas entre estas actualizaciones.

4. **SKILL.md reducción es el último bloque** — No se puede reducir SKILL.md hasta que los 7 subdirectorios existan y las referencias estén actualizadas. El orden correcto: migrar → actualizar refs → reducir.

5. **Reducción realista a ~120-150 líneas** — El objetivo original de ~40 líneas no es alcanzable sin perder contenido sin destino ("Dónde viven los artefactos", "Estructura de un WP", "Naming"). Estas secciones se mantienen en SKILL.md. La reducción elimina la lógica detallada de las 7 fases (ya en workflow-*/SKILL.md).

---

## Decisiones

### D-01: Orden de migración — secuencial por bloque

**Bloque M (Migración):** 7 tareas paralelas — crear `workflow-*/SKILL.md` y eliminar `workflow_*.md`.
**Bloque R (Referencias):** 5 tareas paralelas — actualizar archivos externos que referencian `/workflow_*`.
**Bloque S (SKILL.md reducción):** 1 tarea — reducir pm-thyrox SKILL.md. Depende de M + R completos.
**Bloque T (TD-020, TD-023):** 2 tareas — escalabilidad en workflow-analyze + owner en references/.

Los bloques M y R pueden ejecutarse en paralelo entre sí. Bloque S depende de ambos.

### D-02: Contenido de cada `workflow-*/SKILL.md`

Cada subdirectorio contendrá exactamente:
- `SKILL.md` — contenido actual del flat file (sin cambios de contenido)
- Sin archivos adicionales por ahora (references/ permanece en pm-thyrox/)

Excepción: `workflow-analyze/SKILL.md` recibirá la tabla de escalabilidad (TD-020) como sección adicional al final del archivo, antes del Exit criteria.

### D-03: Frontmatter completo por SKILL.md — tres campos a actualizar

Basado en documentación oficial de Claude Code (campo `name`: "Lowercase letters, numbers, and hyphens only" — underscores inválidos):

Cada `workflow-*/SKILL.md` tendrá el siguiente frontmatter:
```yaml
---
name: workflow-analyze          ← NUEVO: campo name explícito (hyphens only per docs)
description: Phase 1 ANALYZE — inicia o retoma el análisis del WP activo.
disable-model-invocation: true  ← sin cambio
hooks:                          ← PRESERVAR — campo oficial de lifecycle hooks
  - event: UserPromptSubmit
    once: true
    type: command
    command: "echo 'phase: Phase 1' >> .claude/context/now.md"
updated_at: 2026-04-09 00:00:00 ← actualizar timestamp
---
```

Cambios respecto al flat file:
1. `name: workflow-analyze` — campo explícito, determina la invocación `/<name>` = `/workflow-analyze`
2. `description:` — limpiar el prefijo `/workflow_analyze —`; descripción natural sin slash command
3. `hooks:` — PRESERVAR exactamente como están (son el mecanismo oficial de lifecycle hooks)
4. `updated_at:` — actualizar timestamp

### D-04: Reducción SKILL.md — qué eliminar y qué conservar

**Eliminar** (ya cubierto en workflow-* skills):
- Phase 1: ANALYZE (completo — ~70 líneas)
- Phase 2: SOLUTION_STRATEGY (~30 líneas)
- Phase 3: PLAN (~25 líneas)
- Phase 4: STRUCTURE (~25 líneas)
- Phase 5: DECOMPOSE (~25 líneas)
- Phase 6: EXECUTE (~60 líneas)
- Phase 7: TRACK (~30 líneas)
- Sección "Limitaciones conocidas" (no relevante para ejecución directa vía SKILL)

**Conservar** (sin destino o de visión global):
- Tabla de escalabilidad (Micro/Pequeño/Mediano/Grande) → mover a workflow-analyze, eliminar de SKILL.md
- "Dónde viven los artefactos" (tabla) → conservar en SKILL.md (es referencia cross-phase)
- "Estructura de un work package" (árbol) → conservar
- "Naming" (convenciones) → conservar
- Catálogo de fases con mapa → sustituir lógica detallada por referencia a `/workflow-*`
- "References por dominio" → conservar (navegación a references/)

**Resultado estimado:** ~130 líneas (de ~450 actuales).

### D-05: TD-023 — owner en frontmatter de references/

Añadir `owner: workflow-analyze` (o el workflow correspondiente) al frontmatter de cada archivo en `pm-thyrox/references/`. No mover archivos. Esto cierra TD-023 sin reestructuración.

Mapeo propuesto:
| Referencia | Owner |
|-----------|-------|
| introduction.md | workflow-analyze |
| requirements-analysis.md | workflow-analyze |
| use-cases.md | workflow-analyze |
| quality-goals.md | workflow-analyze |
| stakeholders.md | workflow-analyze |
| basic-usage.md | workflow-analyze |
| constraints.md | workflow-analyze |
| context.md | workflow-analyze |
| solution-strategy.md | workflow-strategy |
| spec-driven-development.md | workflow-structure |
| commit-helper.md | workflow-execute |
| commit-convention.md | workflow-execute |
| reference-validation.md | workflow-track |
| incremental-correction.md | workflow-track |
| conventions.md | pm-thyrox (cross-phase) |
| scalability.md | workflow-analyze |
| examples.md | pm-thyrox (cross-phase) |
| agent-spec.md | pm-thyrox (cross-phase) |
| skill-vs-agent.md | pm-thyrox (cross-phase) |
| state-management.md | pm-thyrox (cross-phase) |
| skill-authoring.md | pm-thyrox (cross-phase) |
| prompting-tips.md | pm-thyrox (cross-phase) |
| long-context-tips.md | pm-thyrox (cross-phase) |

---

## Alternativas descartadas

**Underscore en directorios (`workflow_analyze/SKILL.md`):** Descartado — inconsistente con convención del proyecto. El beneficio de no cambiar la invocación no supera el costo de mantener inconsistencia permanente.

**Migrar references/ a subdirectorios de workflow-*:** Descartado — alto costo de reestructuración, bajo beneficio inmediato. TD-023 se resuelve más eficientemente con frontmatter `owner:`.

**Reducción a ~40 líneas:** Descartado — requeriría mover "Dónde viven los artefactos" y "Naming" a un references/ separado o a cada workflow-*. Costo alto, beneficio marginal vs ~130 líneas.

---

## Pre-design check

- ✓ Consistente con ADR-016 (skills hidden, Capa 2)
- ✓ No viola Locked Decision #2 (anatomía oficial: SKILL.md en subdirectorio)
- ✓ Mantiene `disable-model-invocation: true` en cada skill
- ✓ TD-019 queda completamente cerrado con esta estrategia
- ✓ Reversible via git (eliminar subdirectorios, restaurar flat files)

## Nota: doble propósito de `disable-model-invocation: true`

Documentación oficial (sección "Manage context with skills and subagents"):
> "For skills you invoke manually, set `disable-model-invocation: true` to keep descriptions out of context until you need them."

Los 7 `workflow-*` skills tienen ~100-150 líneas cada uno. El flag sirve para:
1. **Control de invocación** — solo el usuario puede invocar vía `/workflow-analyze`
2. **Optimización de context budget** — las descripciones NO se cargan en context al inicio de sesión

Sin el flag, 7 skills × descripción = budget significativo consumido en cada sesión.
Con el flag, costo = 0 hasta que el usuario invoca un workflow.
**Este flag NO debe eliminarse en ninguna tarea de migración.**
