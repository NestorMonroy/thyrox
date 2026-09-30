```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 05:34:03
status: Completado
phase: Phase 7 — TRACK
total_lessons: 5
```

# Lecciones Aprendidas: agent-format-spec

---

### L-039 — Agentes con `description` vacío son invisibles para el routing

**Contexto:** Durante el análisis de agentes existentes en THYROX se encontraron agentes con el campo `description` vacío o ausente. El framework de Claude Code no emitía ninguna advertencia ni error al respecto, dejando esos agentes fuera del routing de forma silenciosa.

**Aprendizaje:** Un agente sin `description` válida nunca será seleccionado por el sistema de routing. El problema no es visible en tiempo de creación ni en ejecución — el agente simplemente no se usa, sin que nadie lo sepa. Un linter habría detectado este problema desde el primer agente creado.

**Acción:** Se creó `scripts/lint-agents.py` con validación explícita de `description`: requerida, mínimo 20 caracteres, no puede ser un bloque vacío `>`. Se documentó en `references/agent-spec.md`.

---

### L-040 — El campo `model` en agentes nativos es el error más común al generar desde registry

**Contexto:** Los agentes `nodejs-expert.md` y `react-expert.md` tenían el campo `model` en su frontmatter. Este campo es válido en el registry para bootstrap, pero está prohibido en agentes nativos de Claude Code donde causa conflictos con el modelo seleccionado por el framework.

**Aprendizaje:** Al generar agentes desde el registry, el generador propaga todos los campos del YAML de origen — incluyendo `model`. La solución correcta es filtrar el campo en el generador, no eliminarlo del registry (que lo necesita para bootstrap). Eliminar `model` del registry rompería el proceso de inicialización.

**Acción:** Se actualizó `skill-generator.md` con instrucción explícita de no propagar el campo `model` al generar agentes nativos. Se corrigieron `nodejs-expert.md` y `react-expert.md` eliminando el campo.

---

### L-041 — La ejecución en paralelo de Phase 6 reveló trabajo duplicado sin estado intermedio `[~]`

**Contexto:** Durante Phase 6, múltiples agentes ejecutaron tareas en paralelo. Cuando un agente verificó el estado del work package, encontró que T-002, T-004, T-005 y T-006 ya habían sido completadas por otro agente. No hubo forma de saber cuáles estaban en progreso antes de que completaran.

**Aprendizaje:** El sistema de estados actual solo tiene `[ ]` (pendiente) y `[x]` (completado). Sin un estado `[~]` (en progreso), dos agentes pueden iniciar la misma tarea simultáneamente sin saberlo, duplicando el trabajo. El estado intermedio es necesario para coordinación en ejecución paralela.

**Acción:** Documentar como mejora pendiente para la metodología: agregar estado `[~]` al task-plan para marcar tareas en ejecución activa. Previene trabajo duplicado en contextos multi-agente.

---

### L-042 — La distinción SKILL vs Agente no estaba documentada pero era necesaria

**Contexto:** Durante el desarrollo del WP, tanto usuarios como agentes mostraron ambigüedad sobre cuándo crear un SKILL y cuándo crear un agente nativo. Los dos mecanismos tienen propósitos distintos pero se superponen superficialmente (ambos son "instrucciones para Claude").

**Aprendizaje:** Sin documentación explícita de la distinción, cada actor toma decisiones inconsistentes. Un reference dedicado resuelve la ambigüedad de forma durable y reutilizable, sin depender de que cada sesión redescubra la diferencia.

**Acción:** Se creó `references/skill-vs-agent.md` con tabla comparativa de 7 dimensiones, regla de decisión accionable en una oración, y ejemplos concretos de SKILLs y agentes del proyecto THYROX.

---

### L-043 — El gate explícito entre WPs coordinó correctamente la ejecución secuencial

**Contexto:** WP-2 (`agent-format-spec`) tenía que completar T-001 (`agent-spec.md`) antes de que WP-1 (`parallel-agent-conventions`) pudiera modificar `task-executor.md` y `task-planner.md`. El gate estaba documentado en ADR-014 y en `scope-coordination.md`.

**Aprendizaje:** El mecanismo de gate via ADR + documento de coordinación fue suficiente para dos WPs concurrentes. WP-1 esperó la spec antes de modificar agentes, evitando que los agentes fueran corregidos con un formato desactualizado. La coordinación explícita documentada es más confiable que la coordinación implícita por convención.

**Acción:** Mantener el patrón: cuando dos WPs tienen dependencia de datos (no solo de orden), documentar el gate en el ADR correspondiente y referenciar en ambos task-plans. Para más de dos WPs concurrentes, considerar un documento de coordinación dedicado.
