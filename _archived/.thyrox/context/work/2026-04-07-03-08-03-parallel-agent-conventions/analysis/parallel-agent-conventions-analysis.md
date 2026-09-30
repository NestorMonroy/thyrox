```yml
type: Análisis Phase 1
project: THYROX — pm-thyrox framework
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 03:08:03
analysis_version: 1.0
status: Borrador
author: Claude (agente paralelo)
phase: 1 — ANALYZE
```

# Análisis: Convenciones para Ejecución Paralela de Agentes

## Visión General

El framework pm-thyrox fue diseñado para ejecución secuencial: un agente, un work package activo, archivos compartidos con un único escritor. A medida que el proyecto adopta agentes nativos de Claude (`.claude/agents/`) y ejecución paralela (múltiples instancias del SDK simultáneas), emergen condiciones de carrera sobre archivos de estado compartidos y ausencia de mecanismos de coordinación inter-agente.

Este work package define el conjunto mínimo de convenciones que hacen segura la ejecución paralela de N agentes Claude sobre el mismo repositorio THYROX, sin introducir bases de datos ni infraestructura externa (cumpliendo Locked Decision #4: Markdown only).

El problema no es hipotético: **este mismo WP está siendo ejecutado en paralelo con `agent-format-spec` (mismo timestamp `2026-04-07-03-08-03`)**. La fricción observada durante esta sesión es evidencia directa del problema a resolver.

---

## 1. Objetivo / Por qué importa

**Objetivo principal:** Definir convenciones de coordinación para que N agentes Claude puedan ejecutar WPs distintos en paralelo sobre el mismo repositorio sin:
- Tomar la misma tarea dos veces (task duplication)
- Sobrescribir el estado del otro (write conflicts en now.md, ROADMAP.md)
- Perder la trazabilidad de qué agente hizo qué

**Por qué importa:** FASE 11 introdujo agentes nativos (task-planner, task-executor). El patrón de uso esperado es lanzar múltiples agentes simultáneamente para acelerar el trabajo. Sin convenciones explícitas, esto es inseguro con el framework actual.

---

## 2. Stakeholders

| Stakeholder | Necesidad |
|-------------|-----------|
| Agente Claude ejecutando un WP | Saber qué tareas están disponibles sin duplicar trabajo |
| Agente Claude cerrando sesión | Poder registrar su estado sin pisarle encima a otro agente |
| Desarrollador/usuario del framework | Ver el estado real del sistema, no un estado mezclado |
| Mantenedor del framework (pm-thyrox) | Convenciones implementables solo con Markdown y git, sin infraestructura |

---

## 3. Uso Operacional

**Escenario principal:**
1. Usuario lanza 2+ agentes Claude en paralelo (vía SDK o CLI)
2. Cada agente recibe un WP distinto para ejecutar
3. Cada agente necesita: leer estado global, reclamar tareas, escribir progreso, cerrar sesión
4. Los agentes no se comunican directamente — solo a través de archivos git

**Escenario secundario:**
- Un solo WP con múltiples tareas paralelas marcadas `[P]` — varios agentes toman tareas del mismo task-plan

**Escenario actual (dogfooding activo):**
- WP `parallel-agent-conventions` + WP `agent-format-spec` ejecutándose al mismo timestamp
- Ambos son WPs distintos con archivos propios — no hay conflicto de task-plan
- El conflicto potencial existe en `now.md` (archivo de estado global único)

---

## 4. Atributos de Calidad

| Atributo | Importancia | Descripción |
|----------|-------------|-------------|
| Corrección | Crítica | Ningún agente debe ejecutar una tarea que otro ya tomó |
| Trazabilidad | Alta | Debe quedar registro de qué agente ejecutó qué tarea |
| Simplicidad | Alta | Implementable solo con Markdown + git, sin herramientas externas |
| Compatibilidad hacia atrás | Alta | WPs existentes no deben requerir migración |
| Robustez ante fallo | Media | Si un agente falla, el estado debe ser recuperable |

---

## 5. Restricciones

1. **Markdown only** — Locked Decision #4. Sin SQLite, sin Redis, sin archivos binarios de lock.
2. **Git como única persistencia** — Locked Decision #3. El historial de git es la fuente de verdad de quién hizo qué.
3. **Sin infraestructura de coordinación** — No se puede asumir un proceso coordinador central (eso rompería la naturaleza stateless del framework).
4. **Retrocompatibilidad** — WPs históricos (pre-convención) no se migran.
5. **Los agentes no se pueden comunicar directamente** — Solo ven el filesystem y git.
6. **Claude Code SDK ejecuta agentes en procesos separados** — No hay shared memory nativa entre instancias.

---

## 6. Contexto / Sistemas Vecinos

```
┌─────────────────────────────────────────────────────┐
│                   Repositorio git                    │
│                                                      │
│  ┌─────────────────┐    ┌──────────────────────────┐ │
│  │   Archivos WP   │    │   Archivos Compartidos   │ │
│  │                 │    │                          │ │
│  │ {wp}/analysis/  │    │  now.md ← CONFLICTO      │ │
│  │ {wp}/*-plan.md  │    │  focus.md ← CONFLICTO    │ │
│  │ {wp}/*-task-    │    │  ROADMAP.md ← CONFLICTO  │ │
│  │   plan.md       │    │                          │ │
│  └────────┬────────┘    └──────────────┬───────────┘ │
│           │                            │              │
└───────────┼────────────────────────────┼──────────────┘
            │                            │
     ┌──────▼──────┐              ┌──────▼──────┐
     │  Agente A   │              │  Agente B   │
     │  WP: conv.  │              │  WP: fmt.   │
     └─────────────┘              └─────────────┘
```

**Archivos con riesgo de conflicto:**
- `now.md` — estado de sesión, un único archivo, N agentes lo quieren escribir
- `focus.md` — dirección actual, se actualiza al final de cada sesión
- `ROADMAP.md` — fuente de verdad de progreso, todos los agentes necesitan actualizarlo

**Archivos seguros (por diseño del WP):**
- Todo en `context/work/{timestamp}-{nombre}/` — cada WP tiene su propio directorio
- Los artefactos de WP (analysis, task-plan, etc.) son propiedad exclusiva del agente que ejecuta ese WP

---

## 7. Fuera de Alcance

- Coordinación en tiempo real (WebSockets, notificaciones push)
- Locking de archivos a nivel de OS (flock, inotify)
- Base de datos de estado (SQLite, Redis)
- Migración retroactiva de WPs históricos
- Resolución automática de conflictos de merge git (eso es problema del usuario)
- Convenciones para más de 8 agentes simultáneos (caso extremo fuera del uso normal)

---

## 8. Criterios de Éxito

| ID | Criterio | Medible |
|----|----------|---------|
| SC-001 | Dos agentes ejecutando WPs distintos no producen conflictos de escritura en archivos compartidos | Sí: 0 conflictos en prueba con 2 agentes paralelos |
| SC-002 | Un agente puede determinar qué tareas están disponibles sin comunicarse con otros agentes | Sí: solo leyendo task-plan.md con estados `[ ]`, `[~]`, `[x]` |
| SC-003 | El estado de sesión de cada agente es rastreable individualmente | Sí: cada agente tiene su propio `now-{agent-id}.md` |
| SC-004 | Ninguna convención requiere infraestructura externa | Sí: solo Markdown + git |
| SC-005 | Las convenciones están documentadas en el framework y son aplicables sin entrenamiento especial | Sí: reglas en SKILL.md y conventions.md |
| SC-006 | WPs existentes no necesitan migración | Sí: convenciones aplican solo a WPs nuevos creados con el nuevo formato |

---

## 9. Sistemas Afectados del Framework

| Archivo | Tipo de cambio requerido |
|---------|--------------------------|
| `SKILL.md` | Añadir convenciones de ejecución paralela en Phase 5 y Phase 6 |
| `references/conventions.md` | Nueva sección: "Parallel Agent Execution" |
| `assets/tasks.md.template` | Añadir estado `[~]` (in-progress) con campo `agent_id` |
| `context/now.md` | Reemplazar por patrón `now-{agent-id}.md` (o documentar prohibición de escritura simultánea) |
| `.claude/agents/task-executor.md` | Añadir protocolo de claim antes de ejecutar |
| `.claude/agents/task-planner.md` | Añadir awareness de tareas ya reclamadas |

---

## 10. Gaps Identificados — Análisis Detallado

### GAP-001: Ausencia de estado `[~]` (in-progress)

**Situación actual:** Las tareas solo tienen `[ ]` (pendiente) y `[x]` (completado). No existe estado intermedio.

**Riesgo:** Dos agentes leen el task-plan simultáneamente. Ambos ven `[ ] T-001`. Ambos comienzan a ejecutar T-001.

**Evidencia:** En la sesión actual, si un segundo agente lee este mismo WP, no hay nada en el task-plan que indique que este agente ya está trabajando en Phase 1.

**Solución propuesta:** Estado `[~]` con metadato `agent_id` y timestamp de claim.

### GAP-002: `now.md` es un archivo global único

**Situación actual:** Un único archivo `now.md` describe el estado de la sesión actual.

**Riesgo:** Agente A escribe `current_work: WP-A`. Agente B escribe `current_work: WP-B`. El último en escribir gana; el estado del otro se pierde. En el peor caso, git crea un conflicto de merge.

**Evidencia de dogfooding:** Este agente tiene instrucciones explícitas de NO modificar `now.md`. Eso es evidencia de que el framework ya reconoce el problema pero no tiene solución formal — la solución actual es una regla ad-hoc por instrucción externa, no una convención del framework.

**Solución propuesta:** Patrón `now-{agent-id}.md` para estado per-agente. Un script `project-status.sh` agrega todos los `now-*.md` para vista global.

### GAP-003: `ROADMAP.md` es un archivo global con escritura concurrente

**Situación actual:** ROADMAP.md es la fuente de verdad. Phase 6 lo actualiza al completar cada tarea (`[ ]` → `[x]`).

**Riesgo:** Dos agentes actualizan ROADMAP.md simultáneamente → conflicto de merge. El conflicto requiere intervención manual.

**Evidencia de dogfooding:** La instrucción "NO modificar ROADMAP.md" dada a este agente es evidencia directa. Es la segunda instancia de una regla ad-hoc que debería ser una convención formal.

**Solución propuesta:** Cada agente escribe su progreso en `{wp}/{nombre-wp}-execution-log.md` (ya existe). ROADMAP.md solo se actualiza al final de la sesión por un agente designado como "escritor de ROADMAP" (el último en cerrar, o el agente principal).

### GAP-004: Task-plan sin ownership por agente

**Situación actual:** El task-plan lista tareas como `- [ ] [T-001] Descripción`. No hay campo de responsable.

**Riesgo:** Sin ownership explícito, no se puede auditar qué agente ejecutó qué tarea, ni detectar tareas abandonadas (agente que falló sin completar).

**Solución propuesta:** Extender el formato a `- [~] [T-001] Descripción @agent-A (claimed: 2026-04-07 03:10:00)`.

### GAP-005: ADR sin namespacing por capa

**Situación actual:** Los ADRs en `.claude/context/decisions/` usan numeración secuencial global (`adr-001.md` ... `adr-013.md`).

**Riesgo:** Con múltiples agentes creando ADRs simultáneamente, dos agentes pueden crear `adr-014.md` al mismo tiempo, con contenido diferente.

**Solución propuesta:** Namespacing por capa (`global/`, `api/`, `db/`, `ui/`, `deploy/`) con numeración independiente por capa. O bien: usar timestamp como ID del ADR (`adr-{timestamp}.md`).

### GAP-006: Sin protocolo de handoff entre agentes

**Situación actual:** No hay convención para que un agente le "pase el trabajo" a otro al final de su sesión. El cierre se documenta en `now.md` y `focus.md`, pero son archivos globales.

**Riesgo:** Al cierre, el agente escribe en `now.md` y `focus.md`. Si otro agente está en medio de una operación, el estado que lee al inicio de su siguiente tarea es inconsistente.

**Solución propuesta:** Cada agente cierra en `now-{agent-id}.md`. Un agente coordinador (o el usuario) puede leer todos los `now-*.md` para el estado global.

---

## 11. Observaciones de Dogfooding — Fricción Observada

Esta sección documenta la fricción real experimentada al ejecutar este WP en paralelo con `agent-format-spec` durante la sesión actual.

### Observación 1: Instrucciones ad-hoc como parche de convenciones faltantes

Las instrucciones dadas a este agente incluyen: "NO modificar ROADMAP.md, now.md ni ningún archivo compartido". Esto es un workaround manual de un problema que debería estar resuelto por el framework.

**Fricción:** El agente tiene que recordar una regla externa, no puede confiar en el framework para guiarle. Escala mal: cada ejecución paralela necesita instrucciones personalizadas.

### Observación 2: Dos WPs con timestamp idéntico

`2026-04-07-03-08-03-agent-format-spec` y `2026-04-07-03-08-03-parallel-agent-conventions` fueron creados en el mismo segundo. Esto es posible, pero el framework asume timestamps únicos como IDs de WP. Si dos agentes crean WPs en el mismo segundo, los directorios tienen el mismo prefijo temporal.

**Fricción:** Los timestamps ya no son únicos como identificadores. Un agente que busca "el WP más reciente" con `ls context/work/ | tail -1` podría obtener cualquiera de los dos, dependiendo del ordenamiento.

### Observación 3: now.md refleja estado de sesión de otro WP

`now.md` dice `current_work: work/2026-04-05-01-09-22-thyrox-capabilities-integration/` con `phase: 7-track`. Esto corresponde al estado de la sesión anterior (Sesión 14), no al trabajo actual. Dos agentes paralelos no pueden ambos escribir su `current_work` en el mismo archivo.

**Fricción:** El agente no puede actualizar `now.md` sin riesgo de conflicto. Por eso la instrucción externa de no tocarlo. Pero entonces `now.md` queda desactualizado — no refleja la realidad de lo que está en ejecución.

### Observación 4: Sin mecanismo de "descubrimiento de pares"

Este agente no tiene forma de saber si el agente ejecutando `agent-format-spec` está activo, en qué fase está, o si ya terminó. La única forma sería leer archivos del otro WP — lo cual funciona, pero no hay convención que lo guíe.

**Fricción:** No hay un archivo estándar de "agentes activos" que un agente pueda leer para conocer el estado del sistema completo.

### Observación 5: ROADMAP.md no refleja los WPs nuevos

ROADMAP.md no tiene entrada para `parallel-agent-conventions` ni `agent-format-spec`. La instrucción es no modificarlo. Esto significa que el ROADMAP queda desactualizado respecto al trabajo real en curso.

**Fricción:** La fuente de verdad (ROADMAP.md) no refleja el trabajo activo. Cualquier agente que consulte ROADMAP.md para orientarse verá un estado incompleto.

---

## 12. Hallazgos Clave del Análisis

1. **El problema es real y activo** — No es especulación. La ejecución de este mismo WP demostró 5 instancias concretas de fricción.

2. **El framework tiene workarounds ad-hoc, no convenciones** — Las reglas "no tocar now.md" son parches de instrucción, no soluciones del framework. Un agente sin instrucciones especiales violaría estas restricciones.

3. **Los archivos compartidos son 3** — `now.md`, `focus.md`, y `ROADMAP.md`. Son los únicos que necesitan protocolo de acceso. El resto (artefactos de WP) son seguros por diseño.

4. **La solución mínima es per-agente state** — Reemplazar `now.md` por `now-{agent-id}.md` elimina el 80% del riesgo sin cambios estructurales mayores.

5. **El estado `[~]` es la pieza crítica faltante** — Sin él, no se puede implementar ninguna forma segura de reclamar tareas.

6. **Los timestamps como IDs de WP tienen colisiones** — El caso actual (dos WPs en el mismo segundo) muestra que el sistema de IDs necesita un componente adicional de unicidad.

---

## 13. Próximos Pasos

Phase 1 completa. Proponer Phase 2: SOLUTION_STRATEGY para:
- Evaluar estrategias de per-agent state (now-{id}.md vs directorio agents/)
- Diseñar el estado `[~]` con claim/release protocol
- Definir política de escritura en ROADMAP.md para ejecución paralela
- Evaluar opciones de namespacing para ADRs
- Diseñar protocolo de handoff de sesión
