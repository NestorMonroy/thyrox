```yml
type: Especificación Técnica
category: Requisitos de Sistema
version: 1.0
purpose: Especificación técnica de requisitos del WP thyrox-commands-namespace
goal: Traducir los UCs y TDs de Phase 1 en especificaciones técnicas implementables con Given/When/Then
created_at: 2026-04-11 20:26:31
```

# Especificación de Requisitos Técnicos — thyrox-commands-namespace (FASE 31)

## Resumen Ejecutivo

THYROX necesita un namespace de comandos slash propio: `/thyrox:*`. La solución es
implementar la arquitectura de plugin de Claude Code — crear `.claude-plugin/plugin.json`
y 8 command files en `commands/` que actúan como thin wrappers sobre los `workflow-*`
skills existentes. La implementación es aditiva: no modifica ni elimina la infraestructura
interna existente.

**Objetivo:** Al finalizar FASE 31, el usuario puede invocar `/thyrox:analyze` (y los 7
restantes) desde el menú `/` de Claude Code, y `session-start.sh` muestra el comando
correcto en la opción B.

**Diseño técnico:** Ver [`thyrox-commands-namespace-solution-strategy.md`](thyrox-commands-namespace-solution-strategy.md) Phase 2 — contiene la arquitectura completa (Plugin Facade, Namespace Isolation, Additive Extension, Single Authority patterns, estructura de directorios y mapeo de componentes).

---

## Mapeo Análisis → Especificación

| Requisito (Phase 1) | ID Spec | Descripción Técnica |
|---------------------|---------|---------------------|
| UC-007: Implementar plugin THYROX | SPEC-001 | Plugin manifest `.claude-plugin/plugin.json` |
| UC-001,002,004,007: Comandos `/thyrox:*` | SPEC-002 | 8 command files en `commands/` (thin wrappers) |
| UC-001,002,004: Display en session-start | SPEC-003 | Actualizar `session-start.sh` — 5 cambios de strings/comentarios |
| TD-036: Gate pre-creación WP | SPEC-004 | Paso 1.5 ⏸ STOP en `workflow-analyze/SKILL.md` |
| Framework: ADR-019 formalizar | SPEC-005 | Cambiar `status: Draft` → `Accepted` en `adr-019.md` |
| Framework: ADR-016 amendment | SPEC-006 | Agregar Addendum FASE 31 en `adr-016.md` |
| Framework: CLAUDE.md amendment | SPEC-007 | Agregar Addendum FASE 31 en Locked Decision #5 |
| UC-005: TD-030 + TDs legacy (TD-008, TD-021) | SPEC-008 | Actualizar `technical-debt.md` — TD-036 resuelto, TDs afectados |
| UC-006: Referencias `/workflow_*` | SPEC-009 | Actualizar tabla de `skill-vs-agent.md` con `/thyrox:*` |
| UC-001: `thyrox/SKILL.md` tabla de fases | SPEC-010 | Actualizar columna Skill en tabla de fases (líneas 40-46) |
| Plugin + tooling: agente deep-review | SPEC-011 | Crear `.claude/agents/deep-review.md` + `commands/deep-review.md` |

---

## SPEC-001: Plugin Manifest

**ID:** SPEC-001
**Requisito Origen:** UC-007 (Plugin THYROX implementado)
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

Crear el archivo `.claude-plugin/plugin.json` en la raíz del repo. Este es el
manifest que Claude Code usa para registrar el plugin y asignar el namespace `thyrox:`
a todos los command files en `commands/`.

### Criterios de Aceptación

```
Given que el repositorio thyrox no tiene directorio .claude-plugin/
When se crea .claude-plugin/plugin.json con name "thyrox", description, version y author
Then Claude Code puede leer el manifest del plugin
And el prefijo thyrox: queda reservado para los command files en commands/

Given que plugin.json tiene "name": "thyrox"
When el usuario escribe /thyrox: en el menú /
Then aparece la lista de comandos disponibles (analyze, strategy, plan, etc.)
```

### Consideraciones Técnicas

- `name` debe ser exactamente `"thyrox"` — es la fuente de verdad del namespace
- `version` debe coincidir con la versión actual del framework (`"2.5.0"`)
- `author.name` debe ser `"NestorMonroy"`
- No se incluyen hooks ni settings en el plugin (fuera de scope FASE 31)

### Implementación

**Archivos a Crear:**
- `.claude-plugin/plugin.json`

**Contenido esperado:**
```json
{
  "name": "thyrox",
  "description": "Framework THYROX — gestión de proyectos con metodología SDLC de 7 fases",
  "version": "2.5.0",
  "author": { "name": "NestorMonroy" }
}
```

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-002: Command Files (Thin Wrappers)

**ID:** SPEC-002
**Requisito Origen:** UC-001 (`/thyrox:analyze`), UC-002 (flujo completo), UC-004 (`/thyrox:init`), UC-007 (plugin completo)
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

Crear 8 command files en `commands/` en la raíz del repo. Cada archivo es un thin
wrapper que describe brevemente la fase e invoca el skill correspondiente vía instrucción
de Skill tool. No duplican la lógica — solo redirigen al skill.

### Criterios de Aceptación

```
Given que .claude-plugin/plugin.json existe con name "thyrox"
When se crea commands/analyze.md con frontmatter name y description
Then el comando /thyrox:analyze aparece en el menú / de Claude Code
And al invocarlo, ejecuta el contenido del workflow-analyze skill

Given que commands/ tiene los 8 command files (analyze, strategy, plan, structure, decompose, execute, track, init)
When el usuario escribe /thyrox: en el menú /
Then aparecen exactamente 8 comandos con nombres descriptivos

Given que commands/analyze.md invoca el workflow-analyze skill
When el usuario ejecuta /thyrox:analyze
Then se ejecuta Phase 1 ANALYZE con toda la lógica de workflow-analyze/SKILL.md
And los workflow-* skills internos siguen funcionando directamente sin cambios

Given que commands/init.md invoca el skill workflow_init
When el usuario ejecuta /thyrox:init
Then se ejecuta el bootstrap de tech skills equivalente a /workflow_init
```

### Consideraciones Técnicas

- Frontmatter requerido: `name` (ej: "Analyze") y `description` (descripción de la fase)
- Cuerpo: instrucción clara de invocación al skill correspondiente
- Sin duplicar la lógica del skill — thin wrapper puro
- `commands/init.md` invoca skill `workflow_init` (underscore, no hyphen — nombre del skill existente)
- No crear `commands/next.md` — UC-003 es out-of-scope en FASE 31
- **`.claude/commands/workflow_init.md` (existente):** Phase 1 §UC-002 requiere actualizar la sugerencia de la línea 108 (`"/workflow-analyze para empezar Phase 1"`) → cambiar a `/thyrox:analyze`. El archivo se conserva (backward-compat, Additive Extension), no se elimina.

**Mapa de command files:**

| Command file | Comando | Skill invocado |
|-------------|---------|----------------|
| `commands/analyze.md` | `/thyrox:analyze` | `workflow-analyze` |
| `commands/strategy.md` | `/thyrox:strategy` | `workflow-strategy` |
| `commands/plan.md` | `/thyrox:plan` | `workflow-plan` |
| `commands/structure.md` | `/thyrox:structure` | `workflow-structure` |
| `commands/decompose.md` | `/thyrox:decompose` | `workflow-decompose` |
| `commands/execute.md` | `/thyrox:execute` | `workflow-execute` |
| `commands/track.md` | `/thyrox:track` | `workflow-track` |
| `commands/init.md` | `/thyrox:init` | `workflow_init` |

### Implementación

**Archivos a Crear:**
- `commands/analyze.md`
- `commands/strategy.md`
- `commands/plan.md`
- `commands/structure.md`
- `commands/decompose.md`
- `commands/execute.md`
- `commands/track.md`
- `commands/init.md`

**Esfuerzo Estimado:** 8 tareas atómicas (1 por command file)
**Complejidad:** Baja (repetitiva)

---

## SPEC-003: Actualización de session-start.sh

**ID:** SPEC-003
**Requisito Origen:** UC-001 (display correcto en opción B), UC-002, UC-004
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Actualizar `session-start.sh` para mostrar los nuevos comandos `/thyrox:*` en lugar
de `/workflow-*` en la opción B del menú de ejecución. Son 3 cambios de strings en el
mismo archivo.

### Criterios de Aceptación

```
Given que session-start.sh tiene la función _phase_to_command()
When phase es "Phase 1" a "Phase 7"
Then la función retorna "/thyrox:analyze" ... "/thyrox:track" respectivamente
And NO retorna "/workflow-analyze" ni ningún /workflow-* en opción B

Given que session-start.sh tiene la rama "sin work package activo"
When no hay WP activo
Then la opción B muestra "/thyrox:analyze" (no "/workflow-analyze")

Given que session-start.sh muestra tech skills activos
When no hay tech skills configurados
Then el mensaje dice "ejecuta /thyrox:init" (no "/workflow_init")

Given que session-start.sh tiene el bloque COMMANDS_SYNCED
When COMMANDS_SYNCED es true o false
Then el bloque outdated de TD-008 ya no aparece (TD-008 completado en FASE 22)
```

### Consideraciones Técnicas

- **Cambio 1:** `_phase_to_command()` (líneas 18-25) — 7 returns `/workflow-*` → `/thyrox:*` + default `/thyrox:analyze`
- **Cambio 2:** Línea 91 — opción B "Sin work package activo" — `/workflow-analyze` → `/thyrox:analyze`
- **Cambio 3:** Línea 113 — tech skills — `/workflow_init` → `/thyrox:init`
- **Cambio 4:** Línea 93 — eliminar echo de opción B outdated (`/workflow_analyze [outdated — esperar TD-008]`). TD-008 completado en FASE 22; el branch `COMMANDS_SYNCED=false` es dead code.
- **Cambio 5:** Líneas 10-15 (comentarios de encabezado) — actualizar referencias `/workflow-*` y `/workflow_*` a `/thyrox:*`. Grep confirmó: líneas 10, 11, 15 contienen `/workflow-*` o `/workflow_*`.

### Implementación

**Archivos a Modificar:**
- `.claude/scripts/session-start.sh`

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

### Validación

```bash
bash .claude/scripts/session-start.sh
# Output esperado: "B (determinístico): /thyrox:analyze" (o la fase activa)
```

---

## SPEC-004: Gate Pre-creación WP en workflow-analyze/SKILL.md (TD-036)

**ID:** SPEC-004
**Requisito Origen:** TD-036 (Gate pre-creación WP ausente)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Agregar un paso explícito ⏸ STOP en `workflow-analyze/SKILL.md` antes de crear el
directorio del WP o cualquier archivo. El gate requiere que Claude presente el nombre
propuesto del WP y espere confirmación explícita del usuario.

### Criterios de Aceptación

```
Given que workflow-analyze/SKILL.md está en Phase 1
When Claude completa el análisis y va a crear el WP
Then el SKILL.md tiene un paso 1.5 visible que dice "⏸ STOP pre-creación"
And el texto instruccional requiere presentar nombre propuesto y timestamp
And el texto instruccional requiere esperar confirmación explícita (sí/no)
And el texto instruccional dice explícitamente "NO crear ningún archivo hasta recibir respuesta"

Given que el paso 1.5 existe en el SKILL.md
When Claude sigue las instrucciones del SKILL.md
Then no crea directorios ni archivos del WP antes de que el usuario confirme
And al recibir confirmación, procede con la creación normal
```

### Consideraciones Técnicas

- El gate es instrucción metodológica en SKILL.md, no un hook de sistema (D-3)
- Ubicación: entre el paso 1 (análisis) y el paso 2 (creación del WP)
- `updated_at` del SKILL.md se actualiza automáticamente al editar (regla CLAUDE.md)

### Implementación

**Archivos a Modificar:**
- `.claude/skills/workflow-analyze/SKILL.md`

**Texto del paso 1.5:**
```markdown
### 1.5 ⏸ STOP pre-creación — Gate obligatorio

Antes de crear el directorio del WP o cualquier archivo:

1. Presentar al usuario el nombre propuesto del WP y el timestamp.
2. Esperar confirmación explícita (sí/no).
3. NO crear ningún archivo hasta recibir respuesta.

Excepción: si el WP ya existe (retomar work package), saltar este gate.
```

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-005: Formalizar ADR-019

**ID:** SPEC-005
**Requisito Origen:** Framework — decisión arquitectónica documentada en Phase 2
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

El ADR-019 se creó como Draft en Phase 2. Al implementar la solución en Phase 6,
debe cambiar su status a `Accepted` para reflejar que la decisión está implementada.

### Criterios de Aceptación

```
Given que adr-019.md tiene status: Draft
When Phase 6 completa la implementación del plugin
Then adr-019.md tiene status: Accepted
And la fecha de aceptación está registrada
```

### Implementación

**Archivos a Modificar:**
- `.claude/context/decisions/adr-019.md`

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-006: Amendment ADR-016 — Addendum FASE 31

**ID:** SPEC-006
**Requisito Origen:** Framework — ADR-016 documenta la excepción `workflow-*`; FASE 31 agrega la capa de plugin
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Agregar un Addendum en ADR-016 que documente que FASE 31 agrega la interfaz pública
`/thyrox:*` mediante plugin sobre la implementación `workflow-*` existente.

### Criterios de Aceptación

```
Given que adr-016.md documenta la excepción de workflow-* skills
When se completa FASE 31
Then adr-016.md tiene un Addendum FASE 31 que describe la relación plugin (interfaz) vs skills (implementación)
And la excepción original sigue vigente (workflow-* como implementación interna)
```

### Implementación

**Archivos a Modificar:**
- `.claude/context/decisions/adr-016.md`

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-007: Amendment CLAUDE.md — Addendum FASE 31 en Locked Decision #5

**ID:** SPEC-007
**Requisito Origen:** Framework — Locked Decision #5 (Single skill) necesita reflejar el plugin namespace
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Agregar Addendum FASE 31 en la Locked Decision #5 de `CLAUDE.md` explicando que
el plugin namespace `/thyrox:*` es la interfaz pública de los `workflow-*` skills.

### Criterios de Aceptación

```
Given que CLAUDE.md tiene Locked Decision #5 con addendums de FASE 22, 23 y 29
When se completa FASE 31
Then CLAUDE.md tiene Addendum FASE 31 que menciona el plugin como interfaz pública
And el addendum referencia ADR-019
And updated_at del CLAUDE.md se actualiza al timestamp del edit
```

### Implementación

**Archivos a Modificar:**
- `.claude/CLAUDE.md`

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-008: Actualización technical-debt.md

**ID:** SPEC-008
**Requisito Origen:** UC-005 (TD-030 + TDs legacy), TD-036 (cerrar)
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Actualizar `technical-debt.md` para cerrar TD-036 (resuelto por SPEC-004) y actualizar
el texto de los TDs afectados por el rename `/workflow_*` → `/thyrox:*` (UC-005 / TD-030).

### Criterios de Aceptación

```
Given que technical-debt.md tiene TD-036 como "Abierto"
When SPEC-004 se implementa (paso 1.5 en workflow-analyze/SKILL.md)
Then TD-036 está marcado como "Resuelto" con fecha y referencia a FASE 31

Given que technical-debt.md tiene TDs que mencionan "/workflow_*" o "workflow-*" en su descripción
When se completa FASE 31
Then TD-008 tiene su texto actualizado para reflejar "/thyrox:*" como interfaz pública (implementación queda en workflow-*)
And TD-021 tiene su texto actualizado de la misma manera (Phase 1 §UC-005 lo identificó explícitamente)
And TD-030 colisión de IDs está resuelta (texto clarificado para evitar ambigüedad con meta-comandos)
And se mantiene la referencia histórica a workflow-* como implementación interna
```

### Consideraciones Técnicas

- TDs a actualizar explícitamente: **TD-008, TD-021, TD-030** (Phase 1 §UC-005), **TD-036** (cerrar)
- TD-021 fue identificado en Phase 1 pero omitido en la spec inicial — gap corregido en v1.1

### Implementación

**Archivos a Modificar:**
- `.claude/context/technical-debt.md`

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-009: Actualizar tabla en skill-vs-agent.md

**ID:** SPEC-009
**Requisito Origen:** UC-006 (referencias `/workflow_*` en skill-vs-agent.md)
**Prioridad:** Low
**Estado:** Pendiente

### Descripción

Actualizar las referencias a `/workflow-*` en la tabla de decisión de
`skill-vs-agent.md` para que muestren `/thyrox:*` como la interfaz pública.

### Criterios de Aceptación

```
Given que skill-vs-agent.md tiene una tabla con referencias a /workflow-*
When se completa FASE 31
Then la tabla muestra /thyrox:* como interfaz de usuario
And se mantiene la nota de que workflow-* son la implementación interna
```

### Implementación

**Archivos a Modificar:**
- `.claude/references/skill-vs-agent.md`

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## SPEC-010: Tabla de fases en thyrox/SKILL.md

**ID:** SPEC-010
**Requisito Origen:** UC-001 (Phase 3 In-Scope explícito: "`.claude/skills/thyrox/SKILL.md` — actualizar tabla de fases")
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Actualizar la columna "Skill" del "Catálogo de fases" en `thyrox/SKILL.md` (líneas 40-46)
para que muestre `/thyrox:*` en lugar de `/workflow-*`. Los paths de implementación interna
(`../workflow-analyze/assets/...`, `../workflow-analyze/references/...`) NO se modifican —
son paths a archivos, no nombres de comandos.

### Criterios de Aceptación

```
Given que thyrox/SKILL.md tiene una tabla "Catálogo de fases" con columna "Skill"
When se completa FASE 31
Then las 7 filas de la columna Skill muestran /thyrox:analyze ... /thyrox:track
And los paths internos ../workflow-analyze/ en el resto del archivo permanecen sin cambios
And updated_at del SKILL.md se actualiza (regla CLAUDE.md)
```

### Implementación

**Archivos a Modificar:**
- `.claude/skills/thyrox/SKILL.md` — solo tabla de fases, líneas 40-46

**Grep verificado:** 7 líneas afectadas (40-46), más las referencias de paths internos (en-scope: solo las 7 de la tabla).

**Esfuerzo Estimado:** 1 tarea atómica
**Complejidad:** Baja

---

## Inventario Verificado con Grep

> Requerido por exit-condition Phase 4: "Inventario verificado con grep (no estimado)"

```bash
grep -rn "/workflow-\|/workflow_" .claude/scripts/ .claude/commands/ .claude/skills/thyrox/SKILL.md
```

**Resultados reales (2026-04-11):**

| Archivo | Línea | Contenido | SPEC que lo cubre |
|---------|-------|-----------|-------------------|
| `session-start.sh` | 10 | `# COMMANDS_SYNCED=false → /workflow-*` | SPEC-003 Cambio 5 |
| `session-start.sh` | 11 | `# COMMANDS_SYNCED=true  → /workflow-*` | SPEC-003 Cambio 5 |
| `session-start.sh` | 15 | `# Mapa phase → /workflow_* command` | SPEC-003 Cambio 5 |
| `session-start.sh` | 18 | `echo "/workflow-analyze"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 19 | `echo "/workflow-strategy"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 20 | `echo "/workflow-plan"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 21 | `echo "/workflow-structure"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 22 | `echo "/workflow-decompose"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 23 | `echo "/workflow-execute"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 24 | `echo "/workflow-track"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 25 | `*) echo "/workflow-analyze"` | SPEC-003 Cambio 1 |
| `session-start.sh` | 91 | `B (determinístico): /workflow-analyze` | SPEC-003 Cambio 2 |
| `session-start.sh` | 93 | `B (determinístico): /workflow_analyze [outdated]` | SPEC-003 Cambio 4 |
| `session-start.sh` | 113 | `ejecuta /workflow_init` | SPEC-003 Cambio 3 |
| `commands/workflow_init.md` | 1 | `# /workflow_init — Bootstrap` | No se modifica nombre del archivo |
| `commands/workflow_init.md` | 108 | `"/workflow-analyze para empezar Phase 1"` | SPEC-002 (workflow_init.md sugerencia) |
| `thyrox/SKILL.md` | 40 | `/workflow-analyze` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 41 | `/workflow-strategy` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 42 | `/workflow-plan` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 43 | `/workflow-structure` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 44 | `/workflow-decompose` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 45 | `/workflow-execute` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 46 | `/workflow-track` en tabla | SPEC-010 |
| `thyrox/SKILL.md` | 48,56-73,172+ | `../workflow-analyze/` (paths internos) | **No en scope** — son paths de archivos, no comandos |

**Total ocurrencias de interfaz pública a actualizar: 23 en 3 archivos** (todas cubiertas por SPECs).

---

## SPEC-011: Agente Deep-Review

**ID:** SPEC-011
**Requisito Origen:** Patrón de trabajo del framework — deep-review es una operación recurrente antes de cada gate de fase
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Crear el agente nativo `deep-review` en `.claude/agents/` y su command wrapper
`commands/deep-review.md` → `/thyrox:deep-review`. El agente analiza cobertura entre
fases consecutivas y referencias externas. Solo análisis — nunca escribe ni edita archivos.

### Criterios de Aceptación

```
Given que .claude/agents/deep-review.md existe con name, description y tools correctos
When el usuario invoca /thyrox:deep-review (o el agente es seleccionado automáticamente)
Then el agente analiza el WP activo identificando el artefacto de Phase N y Phase N+1
And reporta gaps con archivo:línea exacta
And NO crea ni edita ningún archivo (solo análisis)

Given que commands/deep-review.md existe en el repo root
When el usuario escribe /thyrox:deep-review en el menú /
Then el comando aparece junto a analyze, strategy, plan, structure, decompose, execute, track, init
And ejecuta el agente deep-review

Given que el agente tiene tools: Read, Glob, Grep, Bash
When analiza un WP con inventario de archivos
Then ejecuta grep real (no estimado) para verificar inventario
```

### Consideraciones Técnicas

- `tools: Read, Glob, Grep, Bash` — sin Edit ni Write (agente de análisis puro)
- `description` sigue el patrón `{qué hace}. Usar cuando {condición}.` (regla agent-spec.md)
- El comando `/thyrox:deep-review` es el 9º en el plugin (fuera del ciclo de 7 fases)

### Implementación

**Archivos a Crear:**
- `.claude/agents/deep-review.md` — agente nativo (ya creado)
- `commands/deep-review.md` — command wrapper (ya creado)

**Esfuerzo Estimado:** 1 tarea atómica (ambos archivos en un commit)
**Complejidad:** Baja

---

## Nota de Decisión — `:spec` vs `:structure`

Phase 1 §UC-001 documenta: "El user usa `:spec` (no `:structure`) — más corto y más descriptivo".
Phase 3 plan decidió implementar `commands/structure.md` → `/thyrox:structure`.

**Decisión vigente:** `/thyrox:structure` (per Phase 3 aprobado).
**Si se desea cambiar a `/thyrox:spec`:** actualizar `commands/structure.md` → `commands/spec.md` antes de Phase 5.
Esta decisión debe confirmarse en el gate SP-04 (aprobación de este spec).

---

## Dependencias Entre Requisitos

```
SPEC-001 → SPEC-002 (plugin.json debe existir antes de que los commands tengan namespace)
SPEC-001 + SPEC-002 → SPEC-005 (ADR-019 se acepta cuando el plugin está implementado)
SPEC-004 → SPEC-008 (TD-036 se cierra cuando el paso 1.5 existe en el SKILL)
SPEC-002 + SPEC-003 + SPEC-010 → Criterio de éxito del plan (grep 0 resultados en interfaces públicas)
SPEC-006, SPEC-007 → independientes (documentación, sin dependencia técnica)
SPEC-009 → independiente (documentación, sin dependencia técnica)
SPEC-010 → independiente (solo modifica tabla en thyrox/SKILL.md)
SPEC-011 → independiente (nuevos archivos, sin dependencia técnica con otros SPECs)
```

---

## Plan de Implementación

### Fase 1: Plugin core (bloqueante)
- SPEC-001 — `.claude-plugin/plugin.json`
- SPEC-002 — 8 command files + `workflow_init.md` sugerencia

### Fase 2: Scripts y metodología (paralelo)
- SPEC-003 — `session-start.sh` (5 cambios)
- SPEC-004 — TD-036 gate pre-WP
- SPEC-010 — `thyrox/SKILL.md` tabla de fases

### Fase 3: Documentación y cierre (tras Fase 1+2)
- SPEC-005 — ADR-019 Accepted
- SPEC-006 — ADR-016 addendum
- SPEC-007 — CLAUDE.md addendum
- SPEC-008 — technical-debt.md (TD-008, TD-021, TD-030, TD-036)
- SPEC-009 — skill-vs-agent.md
- SPEC-011 — deep-review agent + command

---

## Criterios de Éxito Globales

Extraídos directamente del plan aprobado en Phase 3:

1. `/thyrox:analyze` (y los 7 comandos equivalentes) aparecen en el menú `/` de Claude Code
2. `bash .claude/scripts/session-start.sh` muestra `/thyrox:analyze` en la opción B
3. `grep -ri "/workflow-analyze\|/workflow-strategy\|/workflow-plan\|/workflow-structure\|/workflow-decompose\|/workflow-execute\|/workflow-track" .claude/scripts/ .claude/commands/ .claude/skills/thyrox/SKILL.md` → 0 resultados en interfaz pública
4. `workflow-analyze/SKILL.md` tiene el paso 1.5 ⏸ STOP pre-creación WP
5. Los `workflow-*` skills internos siguen funcionando sin cambios

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|-----------|
| Claude Code no hace autodiscovery de `.claude-plugin/` | Alto — `/thyrox:*` no aparece en menú | Media | UC-008: observar durante Phase 6. Si no funciona, documentar que requiere `/plugin install thyrox` |
| Command file format incorrecto (frontmatter mal estructurado) | Medio — comando no aparece en menú | Baja | Usar estructura del ejemplo `devops-automation/commands/deploy.md` de claude-howto |
| `session-start.sh` tiene lógica adicional no identificada en análisis | Bajo — string display incorrecto | Baja | Leer el archivo completo antes de editar; ya se identificaron 3 cambios precisos |

---

## Glosario

- **Thin wrapper:** Command file que no contiene lógica propia — solo describe y delega al skill
- **Plugin manifest:** `.claude-plugin/plugin.json` — define el namespace del plugin
- **Interfaz pública:** Los comandos `/thyrox:*` que el usuario ve e invoca
- **Implementación interna:** Los `workflow-*` skills que contienen la lógica real
- **Namespace:** El prefijo `thyrox:` que agrupa todos los comandos del plugin

---

**Versión:** 1.0
**Última Actualización:** 2026-04-11 20:26:31
