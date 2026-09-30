```yml
work_package_id: 2026-04-11-10-52-25-thyrox-commands-namespace
closed_at: 2026-04-11 22:30:00
project: thyrox-framework
source_phase: Phase 7 — TRACK
total_lessons: 5
fase: FASE 31
```

# Lessons Learned: thyrox-commands-namespace (FASE 31)

## Propósito

Capturar qué aprendió el equipo durante FASE 31 — implementación del plugin namespace `/thyrox:*` para el framework THYROX. Qué funcionó, qué falló, y reglas generalizables.

---

## Lecciones

### L-123: Task-plan checkboxes deben marcarse [x] en el mismo commit que el artefacto

**Qué pasó**

Las tareas T-001..T-013, T-019, T-020 se implementaron correctamente en múltiples commits, pero los checkboxes en `task-plan.md` quedaron todos como `[ ]`. El deep-review pre-gate SP-06 lo detectó como gap crítico. Se necesitó un commit adicional para corregirlo.

**Raíz**

La ejecución se fragmentó en múltiples sesiones con compactación de contexto entre ellas. Los commits de artefactos se hicieron correctamente, pero no se incluyó el update del task-plan en el mismo commit. El execution-log documentaba las tareas como completadas, pero el task-plan no.

**Fix aplicado**

Commit `b566aa2`: las 15 tareas marcadas `[x]` y tabla de cobertura SPEC actualizada a "Completado". El deep-review detectó el gap antes del gate, no después.

**Regla**

Cuando se implementa una tarea T-NNN, marcar `[x]` en `task-plan.md` en el MISMO commit. No batch-updates al final de la fase. Si el contexto se compacta entre sesiones, leer el task-plan al inicio de la sesión y sincronizar el estado.

---

### L-124: Gate instructions no conectan la aprobación con la actualización del artefacto principal

**Qué pasó**

`plan.md` tenía `status: Pendiente aprobación` y `[ ] Scope aprobado` cuando Phase 3 fue aprobada días antes. `solution-strategy.md` tenía `status: En revisión`. Ambos detectados en pre-gate SP-06 cuando ya estábamos en Phase 6.

**Raíz**

Los `workflow-*/SKILL.md` dicen "Al aprobar: actualizar `context/now.md::phase`" pero **no** dicen "también actualizar el artefacto principal". Adicionalmente, `workflow-plan/SKILL.md` no tiene sección `## Gate humano` — el gate está implícito en "Exit criteria" pero no instruccionado explícitamente.

**Fix aplicado**

`plan.md` y `solution-strategy.md` actualizados manualmente. TD-040 registrado para corregir los 5 SKILL.md afectados en FASE futura.

**Regla**

Cuando el gate de una Phase se aprueba, actualizar TANTO `now.md::phase` COMO el artefacto de la fase (`status: Aprobado — YYYY-MM-DD`, `[x] Scope aprobado`). El SKILL.md debe instruccionar ambas acciones en el mismo paso.

---

### L-125: Exit criteria con grep "0 resultados" literal falla ante path-references válidas

**Qué pasó**

El exit criterion decía: `grep -ri "/workflow-analyze\|..." → 0 resultados`. El deep-review encontró 29 matches, pero todos eran path-references en los command files (e.g., `commands/analyze.md` contiene `.claude/skills/workflow-analyze/SKILL.md` como path). 0 invocaciones de usuario, 29 path-references válidas.

**Raíz**

El criterio estaba escrito literalmente ("0 resultados") cuando el intent era "0 invocaciones de usuario". Los command files thin-wrapper necesariamente referencian los skills internos por path — eso es imposible de evitar por diseño.

**Fix aplicado**

Exit-conditions Phase 6 actualizado: "0 invocaciones de usuario" con nota explicativa sobre los 29 path-references esperados.

**Regla**

Cuando el criterio de éxito usa grep, especificar el INTENT, no el conteo literal. Formato: `→ 0 invocaciones de [tipo]`. Si hay false-positives esperados, documentarlos explícitamente en el criterio.

---

### L-126: `created_at` de artefactos WP debe incluir hora

**Qué pasó**

`plan.md` se creó con `created_at: 2026-04-11` (sin hora). La convención del framework es `YYYY-MM-DD HH:MM:SS`. Detectado en pre-gate SP-06 durante revisión de nomenclatura.

**Raíz**

Al crear el artefacto en sesión fragmentada, el timestamp se obtuvo manualmente sin verificar el formato completo. El template sí muestra `[YYYY-MM-DD HH:MM:SS]` pero la instrucción de SKILL.md no es suficientemente explícita.

**Fix aplicado**

Corregido a `2026-04-11 18:05:14` usando `git log --format='%ci' -- plan.md | head -1` para recuperar el timestamp real del commit.

**Regla**

Al crear un artefacto WP, obtener el timestamp con `date '+%Y-%m-%d %H:%M:%S'`. Si ya se creó sin hora, recuperarlo con `git log --format='%ci' -- {archivo} | head -1`. Nunca usar solo fecha.

---

### L-127: Deep-reviews pre-gate detectan deuda sistémica nueva, no solo gaps del WP

**Qué pasó**

El deep-review pre-gate SP-06 detectó dos gaps sistémicos fuera del scope original de FASE 31: TD-039 (documentación async subagents incompleta) y TD-040 (gate instructions no actualizan artefacto). Ambos habrían pasado desapercibidos sin el deep-review.

**Raíz**

Los deep-reviews analizan el estado real del sistema, no solo el WP en curso. Al revisar artefactos y SKILL.md, la comparación entre "lo que dice el doc" y "lo que ocurrió realmente" expone gaps sistémicos.

**Fix aplicado**

TD-039 parcialmente resuelto (subagent-patterns.md actualizado en este WP). TD-040 registrado para FASE futura. Ambos commiteados antes del gate.

**Regla**

Cuando se hace deep-review pre-gate, reservar tiempo para registrar los TDs sistémicos encontrados. El deep-review no solo valida la fase actual — también detecta deuda acumulada que vale la pena documentar incluso si queda out-of-scope del WP actual.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| **Tracking lag** — implementación completa, documentos de tracking desactualizados | L-123, L-124 | Actualizar checkboxes y status fields en el MISMO commit que el artefacto |
| **Literalismo en exit criteria** — criterios demasiado literales fallan por edge cases válidos | L-125 | Escribir criterios con INTENT, no solo conteo. Documentar false-positives esperados |
| **Deep-review como detector de deuda sistémica** | L-127 | Mantener el proceso de deep-review pre-gate como práctica estándar |

---

## Qué replicar

- **Deep-review pre-gate como agente background:** El agente `deep-review` lanzado con `run_in_background: true` funcionó correctamente — entregó análisis completo mientras la sesión continuaba. Patrón eficiente para análisis largos.
- **Separación plugin-interface / skill-implementation:** La arquitectura thin-wrapper + plugin namespace es limpia y no destructiva. `workflow-*/SKILL.md` sin cambios, `/thyrox:*` como capa de presentación.
- **Addendums en vez de rewrites:** Los ADRs, CLAUDE.md y TDs se actualizaron con addendums preservando historial — no se reescribieron.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-038 | Eliminar reglas `Edit(...)` redundantes de `settings.json` | alta | settings-cleanup |
| TD-039 | Documentar async subagents completo (run_in_background vs background: true) — iniciado en FASE 31 | media | subagent-patterns-v2 |
| TD-040 | Añadir Gate humano y artefact-update a workflow-*/SKILL.md | media | skill-gate-update |
| FASE 32+ | Actualizar 12 archivos `.claude/references/` con `/thyrox:*` (D-4 out-of-scope) | baja | references-refactor |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
