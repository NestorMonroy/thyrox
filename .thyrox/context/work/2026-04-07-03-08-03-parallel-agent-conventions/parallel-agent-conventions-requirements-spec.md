```yml
type: Especificación de Requisitos
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 04:47:24
status: Borrador
phase: Phase 4 — STRUCTURE
```

# Especificación de Requisitos: parallel-agent-conventions

## Tabla de Requisitos

| ID | Descripción | Prioridad | GAP | Tareas |
|----|------------|-----------|-----|--------|
| R-001 | Estado `[~]` (in-progress) en task-plan con claim | Alta | GAP-001, GAP-004 | T-001, T-003 |
| R-002 | Patrón `now-{agent-id}.md` por agente | Alta | GAP-002 | T-004, T-005, T-009 |
| R-003 | ROADMAP solo lectura durante ejecución paralela | Alta | GAP-003 | T-006, T-004 |
| R-004 | Namespacing ADRs por capa | Media | GAP-005 | T-007 |
| R-005 | Protocolo de handoff de sesión | Alta | GAP-006 | T-008 |
| R-006 | project-status.sh lee glob `now-*.md` | Media | GAP-002 | T-009 |
| R-007 | task-executor — claim protocol | Alta | GAP-001, GAP-006 | T-010 (gate WP-2) |
| R-008 | task-planner — awareness de claims | Media | GAP-001 | T-011 (gate WP-2) |

---

## R-001 — Estado [~] en task-plan

**Given** un task-plan con tareas en formato `- [ ] [T-NNN] descripción`
**When** un agente selecciona una tarea para ejecutar
**Then** antes de comenzar la ejecución el agente cambia la tarea a:
```
- [~] [T-NNN] descripción @{agent-id} (claimed: YYYY-MM-DD HH:MM:SS)
```
**And** hace commit del cambio antes de ejecutar la tarea
**And** al completar la tarea cambia a:
```
- [x] [T-NNN] descripción @{agent-id} (claimed: ..., done: YYYY-MM-DD HH:MM:SS)
```

**Acceptance criteria:**
- El template `assets/tasks.md.template` incluye la documentación del estado `[~]` con el formato exacto
- Un agente leyendo el task-plan puede distinguir tareas disponibles `[ ]`, en progreso `[~]`, y completadas `[x]`
- El campo `@agent-id` identifica inequívocamente al agente que tomó la tarea
- Un segundo agente que lee `[~]` no toma esa tarea

---

## R-002 — Patrón now-{agent-id}.md

**Given** un agente iniciando una sesión de trabajo en el repositorio
**When** necesita registrar su estado de sesión
**Then** escribe en `context/now-{agent-id}.md` (NO en `context/now.md`)
**And** el archivo tiene el mismo formato YAML que `now.md` con campos `current_work`, `phase`, `status`, etc.

**Given** un agente cerrando su sesión
**When** completa su trabajo o pausa
**Then** actualiza `status: closed` en su `context/now-{agent-id}.md` y hace commit

**Given** `context/now.md` (archivo legacy)
**When** existe en el repositorio
**Then** permanece sin modificar — retrocompatibilidad con sesiones single-agent

**Acceptance criteria:**
- `context/now.md` original no es modificado por ninguna sesión paralela
- Cada agente activo tiene su propio `context/now-{agent-id}.md`
- Al cerrar, el archivo del agente tiene `status: closed`
- El naming del `agent-id` sigue kebab-case: `agent-a`, `task-executor-1`, etc.

---

## R-003 — ROADMAP solo lectura durante ejecución paralela

**Given** múltiples agentes ejecutando en paralelo
**When** un agente completa una tarea durante su sesión
**Then** registra el progreso en `{wp}-execution-log.md` (ya existe en el WP)
**And** NO modifica `ROADMAP.md` durante la sesión paralela

**Given** la sesión paralela ha terminado (Phase 7 o cierre coordinado)
**When** el agente coordinador o el usuario consolida el trabajo
**Then** `ROADMAP.md` se actualiza una sola vez con todos los cambios

**Acceptance criteria:**
- Las convenciones documentan explícitamente: "ROADMAP.md es de solo lectura durante ejecución paralela"
- El `execution-log.md` es el registro de progreso durante la sesión
- SKILL.md Phase 6 refleja este protocolo

---

## R-004 — Namespacing ADRs por capa

**Given** un agente necesita crear un ADR
**When** la decisión afecta una capa específica
**Then** crea el ADR en `context/decisions/{capa}/adr-{CAPA}-NNN.md`

Capas definidas:
| Capa | Path | Prefijo |
|------|------|---------|
| Cross-layer | `decisions/global/` | `ADR-GLOBAL-` |
| API / backend | `decisions/api/` | `ADR-API-` |
| Base de datos | `decisions/db/` | `ADR-DB-` |
| Frontend / UI | `decisions/ui/` | `ADR-UI-` |
| Deploy / infra | `decisions/deploy/` | `ADR-DEPLOY-` |
| Framework pm-thyrox | `decisions/framework/` | `ADR-FRAMEWORK-` |

**Given** ADRs existentes en `context/decisions/` raíz (adr-001.md … adr-014.md)
**When** se adopta el nuevo namespacing
**Then** los ADRs históricos NO se migran — permanecen en raíz
**And** los ADRs nuevos siguen el namespacing por capa

**Acceptance criteria:**
- Las convenciones documentan las 6 capas con ejemplos
- ADRs históricos en raíz quedan intactos
- El CLAUDE.md refleja el nuevo `adr_path` por defecto para proyectos nuevos

---

## R-005 — Protocolo de handoff de sesión

**Given** un agente iniciando sesión en un repo con ejecución paralela activa
**When** lee el estado del proyecto
**Then** hace glob de `context/now-*.md` para ver todos los agentes activos/cerrados
**And** puede determinar qué agentes están activos (`status: active`) vs cerrados (`status: closed`)

**Given** un agente cerrando su sesión
**When** termina su trabajo
**Then**:
1. Actualiza `status: closed` en su `context/now-{agent-id}.md`
2. Hace commit del estado de cierre
3. Si tiene tareas en `[~]` sin completar: las revierte a `[ ]` con nota de liberación

**Acceptance criteria:**
- Las convenciones documentan el protocolo de inicio y cierre en formato paso a paso
- Un agente que falla (crash) deja su `now-{agent-id}.md` con el último estado — recuperable vía git
- Las tareas `[~]` de un agente caído pueden ser liberadas manualmente

---

## R-006 — project-status.sh lee glob now-*.md

**Given** el script `scripts/project-status.sh` se ejecuta
**When** hay múltiples archivos `context/now-*.md` activos
**Then** el script lee todos los archivos `context/now-*.md` (glob)
**And** muestra un estado consolidado: qué agente trabaja en qué WP

**Given** solo existe `context/now.md` (modo single-agent legacy)
**When** se ejecuta el script
**Then** funciona igual que antes — retrocompatibilidad preservada

**Acceptance criteria:**
- El script actualizado pasa `shellcheck` sin errores
- Con 0 archivos `now-*.md` y `now.md` existente: muestra estado de `now.md`
- Con 2 archivos `now-*.md`: muestra estado de ambos agentes

---

## R-007 — task-executor: claim protocol [GATE WP-2]

> **GATEADO:** No implementar hasta que WP-2 (`agent-format-spec`) apruebe su spec formal.

**Given** `task-executor.md` ejecuta tareas de un task-plan
**When** selecciona la siguiente tarea disponible `[ ]`
**Then** antes de ejecutar:
1. Cambia la tarea a `[~]` con su `@agent-id` y timestamp
2. Hace commit del claim
3. Procede con la ejecución

**And** si la tarea ya está en `[~]` (otro agente la tomó): pasa a la siguiente `[ ]`

---

## R-008 — task-planner: awareness de claims [GATE WP-2]

> **GATEADO:** No implementar hasta que WP-2 (`agent-format-spec`) apruebe su spec formal.

**Given** `task-planner.md` genera o revisa un task-plan
**When** lista tareas disponibles o sugiere la siguiente tarea
**Then** considera las tareas en `[~]` como no disponibles
**And** solo sugiere tareas en `[ ]`

---

## Checklist de calidad

- [x] Todos los requisitos tienen Given/When/Then
- [x] Todos los requisitos tienen acceptance criteria medibles
- [x] Ningún requisito contiene `[NEEDS CLARIFICATION]`
- [x] R-007 y R-008 marcados como `[GATE WP-2]`
- [x] Trazabilidad completa GAP → R → Tarea
