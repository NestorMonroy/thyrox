```yml
type: Estrategia de Solución
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 03:32:14
status: Borrador
phase: Phase 2 — SOLUTION_STRATEGY
```

# Solution Strategy: Parallel Agent Conventions

## Propósito

Transformar los 6 gaps identificados en Phase 1 en decisiones ejecutables que permitan a N agentes Claude operar en paralelo sobre el mismo repositorio THYROX sin conflictos de escritura, duplicación de tareas ni pérdida de trazabilidad — usando exclusivamente Markdown y git.

---

## Key Ideas

### Idea 1: Estado `[~]` como mecanismo atómico de claim

**Descripción:**
El estado `[~]` (in-progress) en el task-plan actúa como el único mecanismo de coordinación entre agentes. Cuando un agente toma una tarea, cambia `[ ]` por `[~]` e incluye su identidad y timestamp en la misma línea. Cualquier otro agente que lea el task-plan ve inmediatamente que esa tarea ya fue reclamada.

**Impacto:**
Elimina la duplicación de trabajo sin necesidad de ningún mecanismo de locking externo. El historial de git provee la trazabilidad completa de quién reclamó qué y cuándo. Un claim abandonado (agente que falló) es detectable: `[~]` con timestamp antiguo sin commit de cierre posterior.

**Formato:**
```
- [~] [T-001] Descripción de la tarea @agent-id (claimed: 2026-04-07 03:10:00)
```

---

### Idea 2: Estado de sesión per-agente con `now-{agent-id}.md`

**Descripción:**
En lugar de un único `now.md` que todos los agentes sobreescriben, cada agente mantiene su propio archivo `now-{agent-id}.md` en `.claude/context/`. El agente coordinador (o el usuario) puede leer todos los archivos `now-*.md` para obtener el estado global del sistema.

**Impacto:**
Elimina la categoría entera de write conflicts en estado de sesión. Cada agente es el único escritor de su propio archivo. El patrón es retrocompatible: `now.md` original permanece para sesiones single-agent; los archivos `now-{id}.md` son aditivos.

---

### Idea 3: ROADMAP como archivo de solo lectura durante ejecución paralela

**Descripción:**
Durante ejecución paralela, los agentes NO escriben en `ROADMAP.md`. Cada agente registra su progreso en el `execution-log.md` de su propio WP. `ROADMAP.md` solo se actualiza en Phase 7 por el agente coordinador (o el único agente activo al cierre). Esto convierte ROADMAP de archivo con N escritores concurrentes a archivo con escritor único designado.

**Impacto:**
Elimina la clase más difícil de conflictos: actualizaciones simultáneas a un archivo estructurado compartido. El `execution-log.md` por WP ya existe en el framework — solo se formaliza su rol como buffer de escritura aislada.

---

## Research por GAP

### GAP-001: Ausencia de estado `[~]` (in-progress)

**Alternativa A: Estado `[~]` inline en el task-plan**

Formato: `- [~] [T-001] Descripción @agent-id (claimed: 2026-04-07 03:10:00)`

| Pros | Cons |
|------|------|
| Un solo archivo a leer — el task-plan ya es la fuente de verdad | Línea más larga — reduce legibilidad |
| Sin archivos adicionales | El claim no es atómico al 100% (race condition en <1s teórico) |
| Git diff muestra claramente quién reclamó qué | Requiere update del template `tasks.md.template` |
| Compatible con la convención de checkboxes del framework | |

**Alternativa B: Archivo separado `{wp}/claims.md`**

Formato: archivo con tabla de claims por tarea

| Pros | Cons |
|------|------|
| Task-plan queda limpio | Dos archivos a leer para saber el estado real |
| Claim más explícito | Introduce un segundo archivo que puede desincronizarse |
| | Más complejidad para el agente |

**Decisión: Alternativa A — estado `[~]` inline**

Justificación: La fuente de verdad debe ser única. Un agente que lee solo el task-plan ve el estado completo. La "race condition teórica" en <1s es aceptable: en la práctica, dos agentes tomando la misma tarea en el mismo segundo es un escenario hipotético que el historial de git resuelve (el commit más temprano gana; el segundo agente relee antes de continuar).

---

### GAP-002: `now.md` único genera write conflicts

**Alternativa A: Patrón `now-{agent-id}.md` por agente**

Cada agente escribe en `.claude/context/now-{agent-id}.md`. El `now.md` original permanece para sesiones single-agent.

| Pros | Cons |
|------|------|
| Cero conflictos — cada agente es propietario exclusivo de su archivo | Más archivos en el directorio context/ |
| Retrocompatible — `now.md` original no se modifica | Vista global requiere leer N archivos |
| Patrón simple y predecible | Requiere convención de naming para `agent-id` |
| Git history por agente es limpio | |

**Alternativa B: Directorio `context/sessions/{agent-id}/now.md`**

Cada agente escribe en un subdirectorio propio.

| Pros | Cons |
|------|------|
| Aislamiento total por agente | Cambia la estructura del directorio context/ |
| Puede incluir más archivos de estado por agente | Rompe retrocompatibilidad — requiere migración |
| | Más profundidad de path innecesaria |

**Decisión: Alternativa A — `now-{agent-id}.md`**

Justificación: Mantiene todos los archivos de estado en `.claude/context/` (plano), sin romper la estructura existente. La convención de naming `now-*.md` es autodescriptiva. El glob `now-*.md` permite al coordinador leer todos los estados en una operación.

---

### GAP-003: `ROADMAP.md` con escritura concurrente

**Alternativa A: Agentes escriben solo en `execution-log.md`; ROADMAP se actualiza en Phase 7 por agente coordinador**

Durante ejecución paralela: cada agente registra progreso en `{wp}/{nombre}-execution-log.md`. Al cierre (Phase 7), el agente designado como coordinador (o el último en terminar) consolida en ROADMAP.md.

| Pros | Cons |
|------|------|
| Elimina completamente los conflictos en ROADMAP.md | ROADMAP puede quedar desactualizado durante la sesión |
| `execution-log.md` ya existe — no introduce nuevos archivos | Requiere designar un agente coordinador |
| Git history de ROADMAP queda limpio | La consolidación final es una tarea coordinada |

**Alternativa B: Sistema de turnos — agentes hacen queue para escribir ROADMAP**

Agentes escriben en archivos temporales `roadmap-patch-{agent-id}.md`; un proceso los fusiona.

| Pros | Cons |
|------|------|
| ROADMAP siempre refleja el estado real | Complejidad de implementación muy alta |
| | Requiere proceso coordinador externo |
| | Viola restricción "Markdown only" en la práctica |
| | Overhead inaceptable para el beneficio |

**Decisión: Alternativa A — ROADMAP solo en Phase 7 por agente coordinador**

Justificación: La complejidad de Alternativa B es inaceptable dado que Locked Decision #4 prohíbe infraestructura. El `execution-log.md` ya cumple el rol de registro de progreso durante la sesión. La desactualización temporal de ROADMAP es un trade-off aceptable frente a la garantía de cero conflictos.

---

### GAP-004: Task-plan sin ownership por agente

**Alternativa A: Campo `@agent-id` en el claim del estado `[~]`**

Inline en la línea de tarea: `@agent-id` es parte del claim.

| Pros | Cons |
|------|------|
| Un solo lugar para leer claim + owner | El campo `@agent-id` está en formato de texto libre |
| No requiere tabla separada | |
| Git blame muestra el commit del claim | |

**Alternativa B: Tabla de ownership en el encabezado del task-plan**

Sección `## Ownership` con tabla `| Tarea | Agente | Claimed |`.

| Pros | Cons |
|------|------|
| Ownership visible en un solo lugar | Redundante con el estado inline |
| | Dos lugares a mantener sincronizados |
| | Introduce posibilidad de desincronización |

**Decisión: Alternativa A — `@agent-id` inline en el claim**

Justificación: DRY (Don't Repeat Yourself). El estado `[~]` ya contiene toda la información necesaria: tarea, responsable, timestamp. Una tabla de ownership separada duplicaría información y crearía riesgo de inconsistencia. El historial de git es el sistema de auditoría definitivo.

---

### GAP-005: ADR sin namespacing ante creación concurrente

**Alternativa A: Subdirectorios por capa `decisions/{capa}/` con numeración independiente**

Estructura: `decisions/global/adr-001.md`, `decisions/api/adr-001.md`, etc.

| Pros | Cons |
|------|------|
| Namespacing natural por dominio | Requiere definir vocabulario de capas |
| Numeración independiente por capa elimina colisiones entre agentes de distintas capas | Dos agentes en la misma capa aún pueden colisionar (caso poco frecuente) |
| Mejora navegabilidad de ADRs a largo plazo | ADRs existentes permanecen en raíz (estructura mixta transitoria) |

**Alternativa B: Timestamp como ID de ADR (`adr-{YYYY-MM-DD-HH-MM-SS}.md`)**

ADRs identificados por timestamp en lugar de número secuencial.

| Pros | Cons |
|------|------|
| Colisiones prácticamente imposibles (sub-segundo) | Pierde la secuencia numérica que facilita referencias (`ADR-014`) |
| Sin necesidad de coordinación | Rompe retrocompatibilidad con ADRs numerados existentes |

**Decisión: Alternativa A — subdirectorios por capa con numeración independiente**

Justificación: La estructura por capa agrega valor semántico más allá de resolver la colisión. Los ADRs existentes (`adr-001.md`...`adr-014.md`) permanecen en `decisions/` (retrocompat). Los nuevos ADRs en ejecución paralela usan `decisions/{capa}/adr-001.md`. La separación es clara y el riesgo de colisión dentro de una capa es bajo.

**Capas definidas:** `global/`, `api/`, `db/`, `ui/`, `deploy/`, `framework/`

---

### GAP-006: Sin protocolo de handoff entre agentes

**Alternativa A: Agente cierra en `now-{agent-id}.md`; coordinador lee todos los `now-*.md`**

Al cierre de sesión, el agente escribe su estado final en `now-{agent-id}.md` con campo `status: closed` y resumen de lo completado. El agente coordinador (o el siguiente agente) lee el glob `now-*.md` para conocer el estado del sistema.

| Pros | Cons |
|------|------|
| Sin archivos adicionales — reutiliza el patrón de `now-{id}.md` | El coordinador debe saber que debe leer múltiples archivos |
| El estado de cierre queda en git con timestamp | |
| Simple — cada agente solo necesita saber cómo cerrar su propio estado | |

**Alternativa B: Archivo `context/agent-registry.md` con tabla de agentes activos**

Un archivo central que todos los agentes actualizan al inicio y al cierre.

| Pros | Cons |
|------|------|
| Vista única del estado de todos los agentes | Introduce exactamente el tipo de archivo compartido que queremos evitar |
| | Write conflicts en el registry mismo |
| | Resuelve el problema creando el mismo problema |

**Decisión: Alternativa A — cierre en `now-{agent-id}.md`, coordinador lee glob**

Justificación: La Alternativa B introduce el mismo problema que intenta resolver (archivo compartido con múltiples escritores). El patrón glob `now-*.md` es la solución correcta: cada agente escribe su propio archivo, el coordinador agrega la vista. Esto sigue el principio Unix de herramientas simples compuestas.

---

## Decisiones Fundamentales

| ID | Decisión | Justificación |
|----|----------|---------------|
| D-001 | Estado `[~]` en checkbox con formato `- [~] [T-NNN] desc @agent-id (claimed: timestamp)` | Fuente de verdad única; sin archivos adicionales; trazabilidad via git |
| D-002 | Patrón `now-{agent-id}.md` para estado per-agente | Elimina write conflicts; retrocompatible; cada agente es propietario exclusivo |
| D-003 | Agentes escriben solo en `execution-log.md` durante sesión paralela; ROADMAP solo en Phase 7 por agente coordinador | Cero conflictos en ROADMAP; execution-log ya existe en el framework |
| D-004 | `@agent-id` es el campo de ownership, inline en el claim `[~]` | DRY; el claim ya contiene toda la información; git blame como auditoría |
| D-005 | Subdirectorios por capa `decisions/{capa}/` con numeración independiente | Namespacing semántico; retrocompat con ADRs numerados existentes; colisiones improbables por capa |
| D-006 | Cierre en `now-{agent-id}.md` con `status: closed`; coordinador lee `now-*.md` glob | Sin archivos adicionales; patrón Unix de composición; no introduce nuevos archivos compartidos |
| D-007 | `agent-id` convención: rol descriptivo o `{rol}-{timestamp-inicio}` | Identificable en git; único por sesión; no requiere registro central |

---

## Sistemas Afectados

| Archivo | Tipo de cambio | Detalle |
|---------|----------------|---------|
| `skills/pm-thyrox/assets/tasks.md.template` | Modificación | Añadir documentación del estado `[~]` con ejemplo de formato de claim |
| `skills/pm-thyrox/references/conventions.md` | Adición de sección | Nueva sección "Parallel Agent Execution" con todos los patrones definidos |
| `skills/pm-thyrox/SKILL.md` | Adición en Phase 5-6 | Instrucciones de claim/release en Phase 5 (EXECUTE) y cierre per-agente en Phase 6 (CLOSE) |
| `.claude/context/` | Patrón de archivos nuevo | Archivos `now-{agent-id}.md` creados por agentes en ejecución paralela |
| `.claude/context/decisions/` | Adición de subdirectorios | Directorios por capa: `global/`, `api/`, `db/`, `ui/`, `deploy/`, `framework/` |

**Archivos que NO se modifican (per scope-coordination.md y restricciones del WP):**
- `ROADMAP.md` — solo actualizable por agente coordinador en Phase 7
- `context/now.md` — permanece para sesiones single-agent, no se modifica
- `.claude/agents/*.md` — gate: espera a WP `agent-format-spec`

---

## Trazabilidad al Análisis

| Gap | Decisión | Criterio de Éxito (del análisis) |
|-----|----------|----------------------------------|
| GAP-001 | D-001: estado `[~]` inline | SC-002: agente determina tareas disponibles solo leyendo task-plan.md |
| GAP-002 | D-002: `now-{agent-id}.md` | SC-001: 0 conflictos de escritura; SC-003: estado por agente trazable |
| GAP-003 | D-003: ROADMAP solo en Phase 7 | SC-001: 0 conflictos en archivos compartidos |
| GAP-004 | D-004: `@agent-id` inline | SC-003: estado de sesión de cada agente es rastreable individualmente |
| GAP-005 | D-005: subdirectorios por capa | SC-001: 0 conflictos en creación de ADRs concurrentes |
| GAP-006 | D-006: cierre en `now-{agent-id}.md` | SC-003: trazabilidad; SC-004: sin infraestructura externa |

---

## Siguiente Paso

Phase 2 completa. Pasar a **Phase 3: PLAN** para:
- Crear task-plan detallado con tareas específicas de implementación
- Definir el orden de modificación de archivos del framework
- Estimar esfuerzo por tarea
- Identificar dependencias entre cambios (e.g., conventions.md antes de SKILL.md)
