```yml
type: Plan
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 04:34:26
status: Pendiente aprobación
phase: Phase 3 — PLAN
```

# Plan — Parallel Agent Conventions

## Scope Statement

**Problema:** El framework pm-thyrox carece de convenciones documentadas para que N agentes Claude operen en paralelo sobre el mismo repositorio sin conflictos de escritura, duplicación de tareas ni pérdida de trazabilidad.

**Usuarios:** Agentes Claude ejecutando WPs en paralelo, y el agente coordinador que consolida su trabajo. En sesiones single-agent, el comportamiento existente permanece sin cambios.

**Criterios de éxito:**
- SC-001: Un agente puede determinar qué tareas están disponibles leyendo únicamente el `task-plan.md` del WP (sin archivos auxiliares).
- SC-002: Dos agentes ejecutando fases paralelas no generan conflictos de escritura en ningún archivo compartido.
- SC-003: El estado de sesión de cada agente es rastreable individualmente en git sin ambigüedad.
- SC-004: Las convenciones no requieren infraestructura externa ni procesos coordinadores fuera de git y Markdown.

---

## In-Scope

Lista explícita de entregables que produce este WP:

- **`assets/tasks.md.template`** — Agregar documentación del estado `[~]` (in-progress) con formato exacto de claim que incluye `@agent-id` y timestamp.
- **`references/conventions.md`** — Nueva sección "Parallel Execution" con section owner marker, documentando los 6 patrones de coordinación (D-001 a D-006) y la convención de `agent-id` (D-007).
- **`SKILL.md`** — Actualización de Phase 5 (EXECUTE) y Phase 6 (CLOSE) con instrucciones de claim/release y cierre per-agente; cada bloque con section owner marker `<!-- parallel-agent-conventions -->`.
- **`scripts/project-status.sh`** — Actualización para leer archivos `now-*.md` con glob en lugar de solo `now.md`, mostrando estado de todos los agentes activos.
- **Documentación del patrón `now-{agent-id}.md`** — Incluida en `conventions.md`, especificando estructura YAML, campo `status: closed`, y convención de `agent-id`.
- **Documentación de namespacing ADRs** — Incluida en `conventions.md`, especificando subdirectorios por capa (`global/`, `api/`, `db/`, `ui/`, `deploy/`, `framework/`) y reglas de retrocompatibilidad.
- **(Gate WP-2) `agents/task-executor.md`** — Agregar claim protocol: cómo leer task-plan, transición `[ ]` → `[~]`, formato de commit de claim, y condiciones de release.
- **(Gate WP-2) `agents/task-planner.md`** — Agregar awareness de claims: cómo leer el estado `[~]` al generar nuevas tareas para evitar duplicación.

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Modificar `.claude/agents/*.md` (sin gate) | Gate: depende de aprobación de WP-2 `agent-format-spec`; no bloquea el resto del WP |
| Crear subdirectorios en `decisions/` | Operación de runtime, no de framework; los directorios se crean cuando se necesiten, no como parte de este WP |
| Migrar ADRs existentes (`adr-001.md`...`adr-014.md`) a nueva estructura | Retrocompatibilidad explícita: ADRs existentes permanecen en raíz |
| Modificar `ROADMAP.md` | Solo actualizable en Phase 7 por agente coordinador |
| Modificar `context/now.md` | Permanece sin cambios para sesiones single-agent |
| Infraestructura de coordinación externa (locks, queues, registries) | Locked Decision #4: Markdown only |
| Migrar WPs históricos al nuevo formato de claim | Retrocompatibilidad: el estado `[~]` es aditivo; WPs existentes no requieren migración |
| Implementar detección automática de claims abandonados | Complejidad fuera de MVP; el historial git es suficiente para auditoría manual |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| `tasks.md.template` — estado `[~]` + formato de claim | 1 |
| `conventions.md` — sección Parallel Execution (6 patrones + agent-id) | 2 |
| `SKILL.md` — Phase 5: instrucciones de claim en EXECUTE | 1 |
| `SKILL.md` — Phase 6: instrucciones de cierre per-agente en CLOSE | 1 |
| `scripts/project-status.sh` — soporte glob `now-*.md` | 1 |
| Verificación de consistencia entre archivos modificados | 1 |
| (Gate WP-2) `agents/task-executor.md` — claim protocol | 1 |
| (Gate WP-2) `agents/task-planner.md` — claim awareness | 1 |
| **Total (sin gate)** | **7 tareas** |
| **Total (con gate WP-2)** | **9 tareas** |

Clasificación: **pequeño**
Fases activas: Phase 4 (STRUCTURE) + Phase 5 (EXECUTE) — modificaciones de archivos de framework existentes, sin nueva arquitectura de directorios.

---

## Dependencias

| Dependencia | Tipo | Impacto |
|---|---|---|
| Gate WP-2 `agent-format-spec` | Externa — bloqueante para 2 tareas | Las tareas de `task-executor.md` y `task-planner.md` esperan a que WP-2 defina el spec de formato de agentes. Las 7 tareas restantes son independientes. |
| `conventions.md` antes de `SKILL.md` | Interna — orden de ejecución | SKILL.md referencia las convenciones; conventions.md debe estar completo primero para que las referencias sean válidas. |
| `tasks.md.template` antes de `conventions.md` | Interna — consistencia | El formato exacto de claim debe estar definido en el template antes de documentarlo en conventions.md. |

**Orden de ejecución recomendado (sin gate):**
1. `tasks.md.template` (define formato canónico)
2. `conventions.md` (documenta todos los patrones, referencia el formato del template)
3. `SKILL.md` Phase 5 (referencia conventions.md)
4. `SKILL.md` Phase 6 (referencia conventions.md)
5. `scripts/project-status.sh` (independiente, puede ir en cualquier punto)
6. Verificación de consistencia

---

## Trazabilidad GAP → Tarea

| GAP | Decisión | Tarea | Archivo |
|-----|----------|-------|---------|
| GAP-001: Ausencia de estado `[~]` | D-001: estado `[~]` inline con `@agent-id` + timestamp | T-001: Actualizar `tasks.md.template` con estado `[~]` y formato de claim | `assets/tasks.md.template` |
| GAP-001: Ausencia de estado `[~]` | D-001 | T-002: Documentar estado `[~]` en `conventions.md` sección Parallel Execution | `references/conventions.md` |
| GAP-001: Ausencia de estado `[~]` | D-001 | T-003: Actualizar Phase 5 (EXECUTE) en `SKILL.md` con instrucciones de claim | `SKILL.md` |
| GAP-002: `now.md` único genera write conflicts | D-002: `now-{agent-id}.md` por agente | T-002: Documentar patrón `now-{agent-id}.md` en `conventions.md` | `references/conventions.md` |
| GAP-002: `now.md` único genera write conflicts | D-002 | T-004: Actualizar Phase 6 (CLOSE) en `SKILL.md` con cierre per-agente | `SKILL.md` |
| GAP-002: `now.md` único genera write conflicts | D-002 | T-005: Actualizar `project-status.sh` para leer `now-*.md` glob | `scripts/project-status.sh` |
| GAP-003: `ROADMAP.md` con escritura concurrente | D-003: ROADMAP solo en Phase 7 | T-003: Actualizar Phase 5 (EXECUTE) en `SKILL.md` con restricción ROADMAP | `SKILL.md` |
| GAP-003: `ROADMAP.md` con escritura concurrente | D-003 | T-004: Actualizar Phase 6 (CLOSE) en `SKILL.md` con protocolo coordinador | `SKILL.md` |
| GAP-004: Task-plan sin ownership por agente | D-004: `@agent-id` inline en claim | T-001: Formato de claim en `tasks.md.template` incluye `@agent-id` | `assets/tasks.md.template` |
| GAP-004: Task-plan sin ownership por agente | D-004 | T-006 (Gate WP-2): Agregar claim protocol a `task-executor.md` | `agents/task-executor.md` |
| GAP-004: Task-plan sin ownership por agente | D-004 | T-007 (Gate WP-2): Agregar claim awareness a `task-planner.md` | `agents/task-planner.md` |
| GAP-005: ADR sin namespacing ante creación concurrente | D-005: subdirectorios por capa | T-002: Documentar namespacing ADRs en `conventions.md` con capas definidas | `references/conventions.md` |
| GAP-006: Sin protocolo de handoff entre agentes | D-006: cierre en `now-{agent-id}.md`; coordinador lee glob | T-004: Actualizar Phase 6 (CLOSE) en `SKILL.md` con protocolo handoff | `SKILL.md` |
| GAP-006: Sin protocolo de handoff entre agentes | D-006 | T-002: Documentar protocolo handoff en `conventions.md` | `references/conventions.md` |

**Resumen de cobertura:** Todos los 6 GAPs tienen al menos una tarea directa. Cada tarea resuelve al menos un GAP. No hay GAPs sin cobertura de tarea.

---

## Link ROADMAP

Ver tracking: [ROADMAP.md](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [ ] Scope aprobado por usuario — PENDIENTE
