```yml
Fecha: 2026-04-03-00-49-34
WP: voltfactory-adaptation
Fase: 4 - STRUCTURE
Estado: En revisión
```

# Especificación de Requisitos — Meta-Framework Generativo

## Resumen Ejecutivo

Extender PM-THYROX con un sistema de tech skills generados automáticamente desde un
registry centralizado. El objetivo es que cada proyecto pueda tener skills de tecnología
específicos (React, Node.js, PostgreSQL) sin configuración manual repetida por sesión.

Los tech skills se generan una sola vez (bootstrap), se commitean a git, y se activan
automáticamente en sesiones subsecuentes vía `.instructions.md`. PM-THYROX sigue siendo
el orquestador de gestión sin cambios a su lógica.

---

## Mapeo Decisiones → Especificaciones

| Decisión (Phase 2) | SPEC | Descripción |
|---|---|---|
| D-003: Estructura de tech skill | SPEC-001 | Registry directory + formato template |
| D-003: Estructura de tech skill | SPEC-002 | `_generator.sh` — instanciador de templates |
| D-005: Bootstrap via /workflow_init | SPEC-003 | Tres templates iniciales (react, nodejs, postgresql) |
| D-005: Bootstrap via /workflow_init | SPEC-004 | Comando `/workflow_init` — detección + bootstrap |
| H-002: Slash commands por fase | SPEC-005 | 7 workflow commands como Phase entry points |
| D-006: session-start.sh display | SPEC-006 | `session-start.sh` muestra tech skills activos |
| D-007: ADR-004 refinado | SPEC-007 | `ADR-012` documenta la evolución |

---

## SPEC-001: Registry — estructura y formato de templates

**ID:** SPEC-001
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

Crear la estructura `.claude/registry/` con un README que explique las convenciones y
los directorios para cada capa tecnológica.

Cada template es un archivo `.template.md` que contiene DOS secciones separadas por
marcadores HTML comments:
- Sección SKILL: contenido de `SKILL.md` para esa tecnología (guía fase-por-fase)
- Sección INSTRUCTIONS: contenido de `.instructions.md` (reglas siempre-on)

**Formato de template:**

```markdown
<!-- SKILL_START -->
# {LAYER_TITLE} {FRAMEWORK_TITLE} — SKILL
...contenido del SKILL.md...
<!-- SKILL_END -->

<!-- INSTRUCTIONS_START -->
# {LAYER_TITLE} {FRAMEWORK_TITLE} — Guidelines
...contenido del .instructions.md...
<!-- INSTRUCTIONS_END -->
```

**Placeholders obligatorios en cada template:**
- `{{PROJECT_NAME}}` — nombre del proyecto destino
- `{{LAYER}}` — capa (frontend, backend, db, infra)
- `{{FRAMEWORK}}` — framework específico (react, nodejs, postgresql)

### Criterios de Aceptación

```
Given el directorio .claude/registry/ existe
When se lista su contenido
Then contiene: README.md, _generator.sh, frontend/, backend/, db/

Given un archivo registry/frontend/react.template.md existe
When se verifica su formato
Then contiene exactamente un bloque <!-- SKILL_START --> ... <!-- SKILL_END -->
 y exactamente un bloque <!-- INSTRUCTIONS_START --> ... <!-- INSTRUCTIONS_END -->
 y contiene todos los placeholders: {{PROJECT_NAME}}, {{LAYER}}, {{FRAMEWORK}}

Given el README.md del registry existe
When se lee
Then explica: cómo agregar un nuevo template, las capas válidas, los placeholders
 obligatorios, y el formato de las dos secciones
```

### Archivos a crear

- [README](.claude/registry/README.md)
- `.claude/registry/frontend/` (directorio)
- `.claude/registry/backend/` (directorio)
- `.claude/registry/db/` (directorio)

---

## SPEC-002: `_generator.sh` — instanciador de templates

**ID:** SPEC-002
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

Script bash que toma un template del registry y genera dos archivos en el proyecto:
- `.claude/skills/{layer}-{framework}/SKILL.md`
- `.claude/guidelines/{layer}-{framework}.instructions.md`

El script extrae cada sección del template usando los marcadores HTML, reemplaza
los placeholders con los valores reales del proyecto, y crea los directorios necesarios.

**Interfaz del script:**
```bash
.claude/registry/_generator.sh <layer> <framework> [project_name]

# Ejemplos:
.claude/registry/_generator.sh frontend react "mi-proyecto"
.claude/registry/_generator.sh backend nodejs
.claude/registry/_generator.sh db postgresql "ecommerce"
```

### Criterios de Aceptación

```
Given .claude/registry/frontend/react.template.md existe
When se ejecuta: _generator.sh frontend react "mi-proyecto"
Then se crea .claude/skills/frontend-react/SKILL.md con el contenido SKILL_START..SKILL_END
 y se crea .claude/guidelines/frontend-react.instructions.md con INSTRUCTIONS_START..INSTRUCTIONS_END
 y los placeholders {{PROJECT_NAME}}, {{LAYER}}, {{FRAMEWORK}} están reemplazados
 y el script termina con exit code 0
 y muestra en stdout: "Generated: frontend-react (2 files)"

Given un template para la capa/framework no existe en el registry
When se ejecuta: _generator.sh mobile flutter
Then el script termina con exit code 1
 y muestra en stderr: "ERROR: Template not found: registry/mobile/flutter.template.md"

Given los archivos ya existen en el proyecto
When se ejecuta el script con --force
Then sobreescribe los archivos existentes con los del template actualizado

Given el script se ejecuta sin argumentos
When se llama sin parámetros
Then muestra ayuda: uso, ejemplos, capas disponibles en el registry actual
```

### Archivos a crear

- `.claude/registry/_generator.sh`

---

## SPEC-003: Templates iniciales — react, nodejs, postgresql

**ID:** SPEC-003
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Tres templates que representan el stack canónico del ejemplo de usuario. Cada template
produce un SKILL.md (guía fase-por-fase) y un .instructions.md (reglas siempre-on).

**Calidad mínima por template (criterio U-5 de solution-strategy):**
- Cada regla en la sección INSTRUCTIONS es específica, verificable, y tiene ejemplo
- La sección SKILL cubre al menos: Phase 1 (qué investigar), Phase 4 (qué especificar),
  Phase 6 (convenciones de implementación), Phase 7 (qué revisar al cerrar)
- Mínimo 5 reglas en INSTRUCTIONS, cada una con ejemplo bueno y malo

### Criterios de Aceptación

```
Given registry/frontend/react.template.md existe
When se revisa su sección INSTRUCTIONS
Then contiene reglas específicas sobre: naming de componentes, estructura de archivos,
 gestión de estado, testing, y estilos — cada una con ejemplo

Given registry/backend/nodejs.template.md existe
When se revisa su sección INSTRUCTIONS
Then contiene reglas sobre: estructura de módulos, manejo de errores, async/await,
 validación de input, y configuración de entorno

Given registry/db/postgresql.template.md existe
When se revisa su sección INSTRUCTIONS
Then contiene reglas sobre: naming de tablas y columnas, uso de índices, migraciones,
 queries N+1, y manejo de transacciones
```

### Archivos a crear

- [react.template](.claude/registry/frontend/react.template.md)
- [nodejs.template](.claude/registry/backend/nodejs.template.md)
- [postgresql.template](.claude/registry/db/postgresql.template.md)

---

## SPEC-004: `/workflow_init` — comando bootstrap

**ID:** SPEC-004
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Slash command que detecta el stack tecnológico del proyecto, muestra al usuario lo que
detectó, solicita confirmación (y permite override manual), ejecuta `_generator.sh` para
cada tech detectada, y commitea los skills generados.

**Mecanismo de detección:**

| Archivo detectado | Tech skill generado |
|---|---|
| `package.json` con `"react"` | `frontend-react` |
| `package.json` con `"express"` o `"fastify"` | `backend-nodejs` |
| `package.json` sin frameworks frontend conocidos | `backend-nodejs` |
| `requirements.txt` o `pyproject.toml` | `backend-python` (si template existe) |
| `go.mod` | `backend-go` (si template existe) |
| `*.sql` o `docker-compose.yml` con `postgres` | `db-postgresql` |
| Sin archivos de config reconocidos | Modo manual override |

**Flujo del comando:**
1. Escanear proyecto en busca de archivos de configuración
2. Mostrar techs detectadas con justificación (qué archivo lo detectó)
3. Preguntar confirmación o permitir agregar/quitar techs manualmente
4. Para cada tech confirmada: ejecutar `_generator.sh`
5. `git add` + `git commit` con mensaje convencional
6. Mostrar resumen: skills generados, archivos creados

### Criterios de Aceptación

```
Given un proyecto con package.json que tiene "react" y "express" en dependencies
When el usuario invoca /workflow_init
Then Claude detecta: frontend-react, backend-nodejs
 y muestra: "Detectado: frontend-react (package.json → react), backend-nodejs (package.json → express)"
 y pregunta confirmación antes de generar

Given el usuario confirma
When Claude ejecuta los generators
Then se crean: .claude/skills/frontend-react/SKILL.md,
              .claude/skills/backend-nodejs/SKILL.md,
              .claude/guidelines/frontend-react.instructions.md,
              .claude/guidelines/backend-nodejs.instructions.md
 y se ejecuta git commit con mensaje "feat(skills): bootstrap frontend-react, backend-nodejs"

Given los tech skills ya existen (bootstrap previo)
When el usuario invoca /workflow_init de nuevo
Then Claude detecta los skills existentes y muestra:
 "Tech skills ya configurados: frontend-react, backend-nodejs. ¿Regenerar con --force?"

Given un proyecto sin archivos de config reconocidos
When el usuario invoca /workflow_init
Then Claude muestra las capas disponibles en el registry
 y permite selección manual antes de generar
```

### Archivos a crear

- [workflow_init](.claude/commands/workflow_init.md)

---

## SPEC-005: Workflow commands — 7 Phase entry points

**ID:** SPEC-005
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Siete slash commands, uno por fase de PM-THYROX. Cada comando pre-carga el contexto
relevante (WP activo, tech skills activos, guía de la fase) y arranca Claude en la
fase correcta sin necesidad de instrucciones adicionales del usuario.

**Diferencia con invocar pm-thyrox directamente:**
- Sin workflow command: el usuario debe recordar qué fase seguir y comunicarlo
- Con workflow command: el comando dice a Claude exactamente en qué fase está y qué
  contexto cargar — es un shortcut, no una funcionalidad nueva

**Cada comando debe:**
1. Identificar el WP activo (directorio más reciente en `context/work/`)
2. Listar los tech skills activos en `.claude/skills/`
3. Invocar pm-thyrox en la fase correspondiente
4. Indicar el exit criteria de esa fase para que Claude sepa cuándo termina

### Criterios de Aceptación

```
Given el usuario invoca /workflow_analyze
When Claude procesa el comando
Then identifica el WP activo más reciente
 y lista los tech skills activos
 y ejecuta Phase 1 ANALYZE del SKILL pm-thyrox
 y al terminar propone el exit criteria de Phase 1

Given el usuario invoca /workflow_execute
When Claude procesa el comando
Then lee el *-task-plan.md del WP activo
 y toma la siguiente tarea pendiente (primer - [ ])
 y la ejecuta con commits convencionales
 y actualiza el checkbox al terminar
```

### Archivos a crear

- [workflow_analyze](.claude/commands/workflow_analyze.md)
- [workflow_strategy](.claude/commands/workflow_strategy.md)
- [workflow_plan](.claude/commands/workflow_plan.md)
- [workflow_structure](.claude/commands/workflow_structure.md)
- [workflow_decompose](.claude/commands/workflow_decompose.md)
- [workflow_execute](.claude/commands/workflow_execute.md)
- [workflow_track](.claude/commands/workflow_track.md)

---

## SPEC-006: `session-start.sh` — mostrar tech skills activos

**ID:** SPEC-006
**Prioridad:** Low
**Estado:** Pendiente

### Descripción

Actualizar el script existente `session-start.sh` para detectar tech skills activos
en `.claude/skills/` y listarlos en el display de inicio de sesión.

**El script NO activa los skills** — eso ya lo hace Claude Code automáticamente al
cargar los `.instructions.md` de `.claude/guidelines/`. El display es solo informativo.

### Criterios de Aceptación

```
Given .claude/skills/frontend-react/ y .claude/skills/backend-nodejs/ existen
When session-start.sh se ejecuta
Then el output incluye una línea:
 "Tech skills activos: frontend-react, backend-nodejs"

Given .claude/skills/ no tiene subdirectorios de tech skills
When session-start.sh se ejecuta
Then el output incluye:
 "Tech skills: ninguno — ejecuta /workflow_init para configurar"
```

### Archivos a modificar

- `.claude/skills/pm-thyrox/scripts/session-start.sh`

---

## SPEC-007: ADR-012 — refinamiento de ADR-004

**ID:** SPEC-007
**Prioridad:** Low
**Estado:** Pendiente

### Descripción

Crear `context/decisions/adr-012.md` documentando la evolución de ADR-004 ("Single skill").
La regla original prohibía fragmentar la metodología en 15 skills separados. La nueva
interpretación distingue dos categorías de skills: gestión y tecnología.

### Criterios de Aceptación

```
Given context/decisions/adr-012.md existe
When se lee
Then documenta: contexto (qué cambió), la decisión actualizada (management skill +
 N tech skills), alternativas consideradas, y la justificación de por qué no viola
 el espíritu de ADR-004
```

### Archivos a crear

- `context/decisions/adr-012.md`

---

## Dependencias entre SPECs

```
SPEC-001 → SPEC-002 (generator necesita el formato de templates definido)
SPEC-001 → SPEC-003 (templates necesitan la estructura de directorio)
SPEC-002 → SPEC-003 (templates se validan ejecutando el generator)
SPEC-002 → SPEC-004 (workflow_init llama a _generator.sh)
SPEC-003 → SPEC-004 (workflow_init instancia los 3 templates iniciales)
SPEC-002 + SPEC-003 → SPEC-005 (workflow commands asumen que skills existen)
SPEC-005 → SPEC-006 (session-start lista lo que workflow_init creó)
SPEC-007 independiente
```

---

## Riesgos y mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| R-004: Registry crece sin control | Medio | Baja | README define criterio para agregar templates: solo frameworks con >50k usuarios |
| R-005: Tech detection falla en polyglot | Medio | Media | Modo manual override en /workflow_init |
| R-006: Templates genéricos | Alto | Media | Criterio U-5: 5+ reglas específicas con ejemplos |

---

**Versión:** 1.0
**Última Actualización:** 2026-04-03-00-49-34
