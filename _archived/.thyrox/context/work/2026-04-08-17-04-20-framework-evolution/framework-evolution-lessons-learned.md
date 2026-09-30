```yml
type: Lessons Learned
work_package_id: 2026-04-08-17-04-20-framework-evolution
closed_at: 2026-04-08 23:09:59
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 7
author: Claude
```

# Lessons Learned: Framework Evolution (FASE 22)

## Propósito

Capturar qué aprendió el equipo durante FASE 22 — integración de documentación oficial Claude Code + resolución de 5 TDs prioritarios (TD-007, TD-008, TD-011, TD-012, TD-013).

---

## Lecciones

### L-087: `context.md.template` ya existía — colisión de nombres en SPEC-D02

**Qué pasó**

SPEC-D02 especificó crear `context.md.template`. Al ejecutar T-031, se descubrió que ese archivo ya existe como template de arquitectura del sistema, referenciado en 4 lugares (SKILL.md, test-skill-mapping.sh, references/introduction.md, references/context.md). Crear `context.md.template` habría sobrescrito contenido activo.

**Raíz**

Phase 3 PLAN no verificó la existencia del archivo antes de incluirlo en la spec. El archivo `context.md.template` tiene un significado completamente diferente al que SPEC-D02 intentaba crear.

**Fix aplicado**

El archivo fue creado como `end-user-context.md.template` — nombre descriptivo que revela su propósito (END USER CONTEXT) sin colisión. T-030 fue actualizado para referenciar el nuevo nombre.

**Regla**

Cuando Phase 3 especifica crear un template nuevo, SIEMPRE verificar `ls assets/` antes de escribir el nombre en la spec. Un nombre genérico como `context.md` ya puede estar tomado con semántica diferente.

---

### L-088: T-029 tenía 2 ocurrencias de `COMMANDS_SYNCED=false` — Edit tool falló

**Qué pasó**

T-029 requería cambiar `COMMANDS_SYNCED=false` → `COMMANDS_SYNCED=true` en `session-start.sh`. El Edit tool falló porque había 2 ocurrencias: una en el comentario y otra como declaración.

**Raíz**

La descripción de tarea no especificó qué ocurrencia cambiar. El Edit tool rechaza correctamente cambios ambiguos (múltiples matches).

**Fix aplicado**

Se proporcionó contexto adicional en `old_string` (incluyendo la línea del comentario arriba de la declaración) para hacer el match único. El cambio fue exitoso.

**Regla**

Cuando una tarea modifica un valor que puede aparecer en comentarios y como declaración, incluir la línea del comentario en el contexto del Edit tool para garantizar unicidad. Alternativamente, usar `replace_all: false` con contexto suficiente.

---

### L-089: now.md mostró `phase: Phase 1` después de múltiples sesiones — desincronización acumulativa

**Qué pasó**

Al inicio de Sesión 6, `now.md` tenía `phase: Phase 1` aunque el WP estaba en Phase 6. Esto ocurrió porque el hook `UserPromptSubmit + once:true` de cada `/workflow_*` escribe en `now.md` pero las sesiones anteriores no actualizaron correctamente al avanzar de fase.

**Raíz**

El hook `once:true` garantiza que `phase: Phase N` se escriba una vez por sesión al invocar el workflow, pero si el usuario no invoca el workflow al inicio de la sesión (y en cambio continúa directamente), `now.md` no se actualiza. Adicionalmente, `echo >> now.md` appenda líneas en lugar de reemplazar el valor existente.

**Fix aplicado**

Corrección manual: actualización directa de `now.md::phase` a `Phase 6` con timestamp correcto.

**Regla**

El mecanismo `echo 'phase: Phase N' >> now.md` crea entradas duplicadas y no es idempotente. TD para FASE 23: usar `sed -i` o una función de actualización que reemplace la línea existente. Hasta entonces, verificar `now.md::phase` al inicio de cada sesión de Phase 6+.

---

### L-090: Spike T-011 no podía verificar `/<name>` en contexto automatizado — diseño correcto, verificación parcial

**Qué pasó**

El spike requería verificar que el usuario podía invocar `/<name>` con skills hidden. En contexto automatizado (agente como Claude), el agente no puede actuar como usuario ni observar el comportamiento desde la perspectiva del usuario.

**Raíz**

El criterio de verificación del spike asumía que el agente podría observar la invocación user-side. La separación between modelo y usuario es una restricción fundamental del entorno de ejecución.

**Fix aplicado**

El spike fue declarado PASS basándose en evidencia estructural (skill no visible en Skill tool = comportamiento correcto de `disable-model-invocation: true`) + documentación oficial de Claude Code. El criterio de `/<name>` user invocation fue marcado como ASSUMED con evidencia indirecta.

**Regla**

Cuando un spike requiere verificación de comportamiento user-side (ej. `/<name>` invocación), diseñar el criterio de éxito en términos de evidencia observables por el agente (estructura, logs, ausencia en listas), no en términos de comportamiento interactivo que requiere un usuario real.

---

### L-091: T-027 fue incluido en el task-plan antes de verificar cobertura en destino — planificación prematura

**Qué pasó**

T-027 planificó reducir SKILL.md a ~40 líneas de catálogo. Al ejecutar, el usuario señaló que varias secciones de SKILL.md (escalabilidad, limitaciones conocidas, Dónde viven los artefactos) NO estaban en los workflow_* skills y no podían eliminarse sin migración previa.

**Raíz**

Phase 3 planificó la reducción sin hacer un inventario explícito de qué contenido de SKILL.md ya existía en los destinos (workflow_* skills). El análisis de cobertura fue implícito, no documentado.

**Fix aplicado**

T-027 marcado `[~]` DIFERIDO. Se registraron TD-019..TD-023 para resolver los gaps antes de ejecutar la reducción en FASE 23.

**Regla**

Cuando una tarea elimina o reduce contenido de una fuente, Phase 3 PLAN debe crear una tabla explícita de cobertura: `sección fuente → ¿existe en destino? → ubicación en destino`. Sin esta tabla, la tarea de eliminación no puede aprobarse de forma segura.

---

### L-092: `COMMANDS_SYNCED` variable tenía comentario que describía estado anterior — documentación desfasada

**Qué pasó**

Después de T-029 (`COMMANDS_SYNCED=true`), el comentario en `session-start.sh` todavía decía "Cambiar a true cuando TD-008 esté completo". El comentario describía el estado pre-FASE 22.

**Raíz**

T-029 especificó cambiar el valor pero no el comentario. Los comentarios de "TODO cuando..." quedan obsoletos una vez que la acción se completa.

**Fix aplicado**

El comentario fue actualizado inline al hacer T-029: cambió a "TD-008 completado (FASE 22). workflow_* ahora en .claude/skills/ (Capa 2, hidden)." — documenta el estado actual en lugar del estado anterior.

**Regla**

Cuando una tarea cambia el valor de una variable/flag de estado, incluir en la misma tarea la actualización del comentario. El comentario debe describir el estado post-cambio, no el pre-cambio.

---

### L-093: workflow_*.md creados como flat files — violación de Option B

**Qué pasó**

T-012..T-018 crearon los 7 workflow_*.md como archivos planos en `.claude/skills/`. La decisión arquitectónica (Option B) tomada en la misma FASE requería `workflow_analyze/SKILL.md` (subdirectorio). El conflicto fue identificado al finalizar las tareas, no al diseñarlas.

**Raíz**

La Option B fue elegida DESPUÉS de que el task-plan original (con flat files) fue aprobado. El diseño de Phase 4 y el task-plan de Phase 5 no anticiparon la pregunta de nomenclatura. TD-019 fue registrado post-hoc.

**Fix aplicado**

Los flat files se mantienen funcionales para FASE 22. TD-019 registrado como deuda para conversión a subdirectorios en FASE 23.

**Regla**

Cuando Phase 2 involucra una decisión de nomenclatura/estructura (flat vs subdirectorio, naming conventions), Phase 4 STRUCTURE debe resolver esa decisión ANTES de generar la spec y el task-plan. Una decisión tomada post-task-plan genera deuda inmediata.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Verificación de existencia previa | L-087 (template), L-093 (estructura) | Phase 3 PLAN requiere inventario explícito antes de crear/eliminar |
| Comentarios "TODO cuando..." obsolescentes | L-092 | Al completar una tarea de flag, actualizar el comentario en la misma operación |
| Decisiones post-task-plan generan deuda | L-093 | Phase 4 STRUCTURE es el gate correcto para decisiones de nomenclatura/estructura |
| Verificación user-side no posible desde agente | L-090 | Diseñar criterios de spike en términos de evidencia observable por el agente |

---

## Qué replicar

- **Batching con checkpoints**: dividir 31 tareas en 7 sesiones con checkpoints verificables funcionó sin errores de secuenciación. Las dependencias del DAG se respetaron.
- **Spike antes de migración masiva**: ejecutar T-011 antes de T-012..T-018 evitó migrar 7 archivos si el mecanismo no funcionaba. El gate gate estructura segura para decisiones de riesgo medio.
- **TD como válvula de seguridad**: registrar TD-019..TD-023 en lugar de ejecutar T-027 prematuramente protegió la integridad de SKILL.md. La deuda técnica explícita es preferible a una eliminación insegura.
- **`[~]` para tareas diferidas**: marcar T-027 como `[~]` en lugar de `[ ]` o `[x]` permite distinguir "pendiente" de "conscientemente diferido" — preserva la trazabilidad sin bloquear el cierre de FASE.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| TD-019 | workflow_*.md flat files → subdirectorio `workflow_analyze/SKILL.md` (Option B) | Alta | FASE 23: workflow-restructure |
| TD-020 | Tabla escalabilidad no distribuida a workflow_* skills | Media | FASE 23: workflow-restructure |
| TD-021 | Phase N no mapea explícitamente a /workflow_* en catálogo pm-thyrox | Media | FASE 23: workflow-restructure |
| TD-022 | Limitaciones conocidas no integradas en workflow_* skills | Media | FASE 23: workflow-restructure |
| TD-023 | pm-thyrox references/ sin owner asignado — bloqueado por TD-019 | Baja | FASE 23: workflow-restructure |
| TD-027-defer | SKILL.md reducción a ~40 líneas — bloqueado por TD-019..TD-023 | Alta (después de TD-019) | FASE 23: workflow-restructure |
| TD-018 | execution-log debe usar timestamp completo `YYYY-MM-DD HH:MM:SS` en frontmatter y headers | Baja | FASE 23 o inline |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
