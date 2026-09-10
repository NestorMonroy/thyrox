```yml
type: Análisis
created_at: 2026-04-11 10:52:25
project: thyrox-framework
feature: thyrox-commands-namespace
fase: FASE 31
phase: Phase 1 — ANALYZE
reversibility: reversible
wp_size: mediano
```

# Análisis: Namespace `/thyrox:*` para comandos del framework

---

## Contexto del usuario final

**Rol:** Mantenedor del framework THYROX (Claude Code).
**Objetivo:** Adoptar `/thyrox:*` como namespace canónico para todos los comandos del framework — reemplazando `/workflow-*` (skills) y `/workflow_init` (command) por un namespace unificado y semánticamente alineado con el nombre del framework.
**Motivación:** El nombre "workflow-" no refleja que los comandos pertenecen a THYROX. El namespace `/thyrox:command` es más explícito y coherente con el renombrado de `pm-thyrox` → `thyrox` (FASE 29).
**Restricciones:** No romper el flujo activo. FASE 30 (uv-adoption) está en Phase 1 con gate abierto.

---

## 1. Objetivo / Por qué

THYROX expone sus 7 fases + 1 bootstrap como comandos invocables por el usuario. Hoy existen dos formatos que conviven sin coherencia:

| Formato | Archivos | Estado |
|---------|---------|--------|
| `/workflow-*` (kebab, guión) | 7 skills en `.claude/skills/workflow-*/SKILL.md` | **Activo — canónico** |
| `/workflow_init` (underscore) | `.claude/commands/workflow_init.md` | Activo — único command |
| `/workflow_*` (underscore) | Solo en texto de TDs y docs legacy | Legacy — no activo en commands/ |
| `/thyrox:*` | Ningún archivo activo | **No existe — propuesto** |

Problema: el prefix `workflow-` no identifica al framework. Después del rename a `thyrox` (FASE 29), lo coherente es que los comandos también reflejen ese nombre.

---

## 2. Stakeholders

| Stakeholder | Rol | Necesidad |
|-------------|-----|-----------|
| Mantenedor THYROX | Desarrollador / usuario único | Comandos con namespace predecible y alineado con el framework |
| Claude Code (agent) | Invocador de skills | Consistencia entre nombre de skill y nombre de comando |
| Documentación (SKILL.md, references/) | Consumidor de convención | Un solo formato a mencionar, sin ambigüedad |

---

## 3. Uso operacional — cómo se invocan comandos hoy

### 3.1 Los 7 skills de fase — `/workflow-*`

Implementados como `SKILL.md` en `.claude/skills/workflow-*/`. Se invocan via Skill tool o `/workflow-{phase}`:

```
/workflow-analyze    → Phase 1 ANALYZE
/workflow-strategy   → Phase 2 SOLUTION_STRATEGY
/workflow-plan       → Phase 3 PLAN
/workflow-structure  → Phase 4 STRUCTURE
/workflow-decompose  → Phase 5 DECOMPOSE
/workflow-execute    → Phase 6 EXECUTE
/workflow-track      → Phase 7 TRACK
```

Referenciados en: `thyrox/SKILL.md` (tabla de fases), `session-start.sh` (`_phase_to_command()`), todos los `workflow-*/SKILL.md` (proponen el siguiente), `hooks.md`, `skill-vs-agent.md`.

### 3.2 El único command — `/workflow_init`

Implementado en `.claude/commands/workflow_init.md`. Es el bootstrap de tech skills.

### 3.3 Meta-comandos planificados — `/thyrox:next`, `:sync`, `:prime`, `:review`

Mencionados en artefactos de FASE 29 (plan.md, solution-strategy.md) como "TD-030 meta-comandos — FASE 30". Sin spec. Sin implementación. Sin descripción de qué harían.

---

## 4. Casos de Uso — todos los identificados

### UC-001: Renombrar los 7 skills de fase a namespace `/thyrox:*`

**Antes:**
```
/workflow-analyze, /workflow-strategy, /workflow-plan,
/workflow-structure, /workflow-decompose, /workflow-execute, /workflow-track
```

**Después:**
```
/thyrox:analyze, /thyrox:strategy, /thyrox:plan,
/thyrox:spec, /thyrox:decompose, /thyrox:execute, /thyrox:track
```

**Nota sobre `/thyrox:spec`:** El user usa `:spec` (no `:structure`) — más corto y más descriptivo que `:structure`.

**Impacto:** Todos los archivos que referencian `/workflow-{phase}` deben actualizarse:
- `thyrox/SKILL.md` — tabla de fases (7 filas)
- `workflow-*/SKILL.md` — cada skill propone el siguiente (7 archivos)
- `session-start.sh` — `_phase_to_command()` (8 líneas)
- `hooks.md` — mención de comandos
- `skill-vs-agent.md` — tabla de decisión
- `commands/workflow_init.md` — sugiere `/workflow-analyze` en el siguiente paso

**Decisión de implementación — Opciones A/B/C/D:**

> Hallazgo de referencia (`luongnv89/claude-howto`): el `:` en comandos es **exclusivamente**
> el separador de namespace de plugins (`/plugin-name:command`). No existe "project namespace"
> para skills ni commands standalone. Ver [claude-howto-reference-analysis](analysis/claude-howto-reference-analysis.md).

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A — Rename directorios** | `skills/workflow-analyze/` → nombre nuevo | Coherencia interna | Rompe paths en todos los SKILL.md; git mv complejo; namespace sigue plano (`/nuevo-nombre`) |
| **B — Alias en commands/** | Crear `.claude/commands/analyze.md` | Sin cambio de paths | **INVÁLIDO**: si el skill tiene el mismo nombre, el skill gana siempre (skills > commands) |
| **C — Solo convención textual** | Mantener `workflow-*` pero documentar como `/thyrox:analyze` | Cero impacto | Falso — `/thyrox:analyze` no existe, solo existe `/workflow-analyze` |
| **D — Plugin (NUEVA)** | Crear `.claude-plugin/plugin.json` + `commands/` con wrappers que invocan los `workflow-*` skills | Namespace `/thyrox:*` auténtico · skills existentes intactos · distributable | Nueva capa de indirección plugin→skill · requiere spec de plugin.json |

---

### UC-002: Renombrar `/workflow_init` → `/thyrox:init`

**Antes:** `.claude/commands/workflow_init.md` → `/workflow_init`

**Después:** `.claude/commands/init.md` → `/thyrox:init`

**Impacto:** Un archivo a renombrar. Actualizar referencias en `session-start.sh`, `thyrox/SKILL.md`.

---

### UC-003: Definir e implementar meta-comandos `/thyrox:next`, `:sync`, `:prime`, `:review`

**Contexto:** Mencionados en FASE 29 como futura tarea (sin spec).

**Propuesta de significado (necesita aprobación del usuario):**

| Comando | Significado probable |
|---------|---------------------|
| `/thyrox:next` | Avanzar a la siguiente phase del WP activo (equivale a sugerir el workflow-* correcto) |
| `/thyrox:sync` | Sincronizar estado: verificar now.md, task-plan, git — detectar drift |
| `/thyrox:prime` | Cargar contexto completo del WP activo (leer todos los artefactos relevantes) |
| `/thyrox:review` | Deep review del artefacto actual de la phase — verificar contra criterios antes de gate |

**Impacto:** Crear 4 nuevos command files en `.claude/commands/`.

---

### UC-004: Actualizar `session-start.sh` para usar nuevo namespace

`_phase_to_command()` hoy devuelve `/workflow-analyze`, etc. Debe devolver `/thyrox:analyze`, etc.

También el texto hardcodeado "B (determinístico): /workflow-analyze" debe actualizar.

---

### UC-005: Actualizar `technical-debt.md` — TDs que referencian `/workflow_*`

TD-008 y TD-021 describen el problema con "Los 7 `/workflow_analyze`, `/workflow_strategy`..." — este texto quedará obsoleto si se migra al namespace nuevo.

Además, TD-030 en `technical-debt.md` actual describe "renombrar Phase N" pero los artefactos de FASE 29 usaron "TD-030" para los meta-comandos → hay una colisión de IDs que debe resolverse.

---

### UC-006: Actualizar `skill-vs-agent.md`

Tabla de decisión usa columna `/workflow_*` en múltiples filas. Debe reflejar nuevo namespace.

---

## 5. Contexto / Sistemas vecinos

### 5.1 Cómo Claude Code resuelve nombres de comandos

En Claude Code, los slash commands se resuelven con esta jerarquía de nombres:

- **Skill** (`.claude/skills/{name}/SKILL.md`) → invocado como `/{name}` via Skill tool
- **Command** (`.claude/commands/{name}.md`) → invocado como `/{name}` directamente
- **Namespace de proyecto** → si el proyecto tiene nombre configurado, Claude Code permite `/{project}:{command}` para diferenciar comandos del proyecto de comandos globales

El namespace `/thyrox:*` usa el segundo mecanismo: requiere archivos en `.claude/commands/` con nombres como `analyze.md`, `strategy.md`, etc., invocados como `/thyrox:analyze`. Los directorios de skills (`workflow-analyze/`, etc.) son independientes del nombre del command.

### 5.2 Rol del registry

`.claude/registry/` define qué skills están disponibles para proyectos bootstrapped con THYROX. Si se cambia el nombre de los skills (Opción A — rename de directorios), el registry también debe actualizarse para que los proyectos nuevos reciban los skills con el nuevo nombre.

### 5.3 ADR-016 y la excepción "Single skill"

ADR-016 documenta que los 7 `workflow-*` skills son la excepción aprobada a la regla "Single skill" (Locked Decision #5 en CLAUDE.md). El razonamiento fue: son herramientas de ejecución por fase, no skills de dominio. Si se migra al namespace `/thyrox:*` cambiando los directorios (Opción A), ADR-016 necesita un amendment que cambie el naming de la excepción de `workflow-*` a `thyrox-*` (o `thyrox/{phase}`).

Si se adopta la Opción B (aliases en commands/), ADR-016 no cambia porque los directorios `workflow-*` permanecen.

### 5.4 Relación con session-start.sh

`session-start.sh` tiene una función `_phase_to_command()` que mapea `Phase N` → nombre de comando. Es el único punto donde el mapping Phase→command está centralizado como lógica ejecutable. Cambiar el namespace requiere actualizar exactamente esa función — el resto de archivos que referencian `/workflow-*` son documentación que sigue a ese mapping.

---

## 6. Atributos de calidad  <!-- was: 5 -->

| Atributo | Importancia | Cómo se aborda |
|----------|-------------|----------------|
| **Coherencia de naming** | Alta | Un namespace `/thyrox:*` para todo — sin `workflow-` ni `workflow_` |
| **Descubribilidad** | Alta | El usuario que escribe `/thyrox:` ve todos los comandos del framework |
| **Reversibilidad** | Media | Skills con `workflow-*` en nombre del directorio pueden coexistir; el rename es gradual |
| **Impacto mínimo en runtime** | Crítico | Los SKILL.md siguen funcionando igual — solo cambia cómo se llaman |

---

## 7. Restricciones

| Restricción | Impacto |
|-------------|---------|
| FASE 30 (uv-adoption) tiene gate abierto | No bloquea este FASE pero debe resolverse en paralelo o secuencialmente |
| `workflow-*/SKILL.md` son archivos activos con `updated_at` — editarlos requiere update de timestamp | Automático por regla CLAUDE.md |
| Los artefactos WP históricos son inmutables | No se actualizan las referencias en `context/work/` |
| ADR-016 documenta los workflow-* skills como excepción a "Single skill" | Una migración de namespace debe generar un nuevo ADR o amendment |

---

## 8. Fuera de alcance

- Cambiar el contenido lógico de los workflow-*/SKILL.md (eso es TD-008, ya completado)
- Renombrar las fases internas (Phase 1..7) a otro esquema (eso es TD-030 en technical-debt.md)
- Migrar artefactos WP históricos que referencian `/workflow-*`
- Crear tests automatizados para los command files

---

## Artefactos pendientes de decisión

| Artefacto | Condición | Fase |
|-----------|-----------|------|
| ADR nuevo o amendment de ADR-016 | Solo si se elige Opción A (rename directorios) o si el cambio de namespace se considera decisión arquitectónica permanente | Phase 2 STRATEGY |
| Spec de meta-comandos (UC-003) | Solo si el usuario decide incluirlos en FASE 31 (y no diferirlos a FASE 32) | Phase 4 STRUCTURE |

---

## 9. Criterios de éxito

| Criterio | Verificación |
|----------|-------------|
| `grep -ri "/workflow-" .claude/` → 0 resultados en archivos activos (excepto paths de directorio) | Grep post-migración |
| `/thyrox:analyze` ... `/thyrox:track` funcional via Skill tool | Invocación manual en sesión de prueba |
| `session-start.sh` muestra `/thyrox:analyze` en "Opción B" | `bash .claude/scripts/session-start.sh` |
| TD-030 colisión de IDs resuelta | `technical-debt.md` tiene IDs sin ambigüedad |
| TD-036 implementado: `workflow-analyze/SKILL.md` tiene paso 1.5 con gate pre-WP | Leer SKILL.md y verificar el paso |
| Si se implementan meta-comandos: `/thyrox:next` ejecuta la fase correcta | Test manual |

---

## Inventario de archivos afectados

### Archivos activos que usan `/workflow-*` (invocación)

| Archivo | Ocurrencias | Tipo de cambio |
|---------|-------------|----------------|
| `.claude/skills/thyrox/SKILL.md` | 7 filas tabla + 7 referencias a subdirs | Actualizar invocaciones en tabla; paths de subdir intocables |
| `.claude/skills/workflow-analyze/SKILL.md` | 2 (H1 + propone `/workflow-strategy`) | H1 y referencia al siguiente |
| `.claude/skills/workflow-strategy/SKILL.md` | 2 (H1 + propone `/workflow-plan`) | H1 y referencia al siguiente |
| `.claude/skills/workflow-plan/SKILL.md` | 2 (H1 + propone `/workflow-structure`) | H1 y referencia al siguiente |
| `.claude/skills/workflow-structure/SKILL.md` | 2 (H1 + propone `/workflow-decompose`) | H1 y referencia al siguiente |
| `.claude/skills/workflow-decompose/SKILL.md` | 2 (H1 + propone `/workflow-execute`) | H1 y referencia al siguiente |
| `.claude/skills/workflow-execute/SKILL.md` | 2 (H1 + propone `/workflow-track`) | H1 y referencia al siguiente |
| `.claude/skills/workflow-track/SKILL.md` | 1 (H1) | H1 |
| `.claude/scripts/session-start.sh` | 9 ocurrencias | Función `_phase_to_command()` + texto |
| `.claude/commands/workflow_init.md` | 1 (sugiere `/workflow-analyze`) | Actualizar sugerencia |
| `.claude/references/hooks.md` | 1 | Actualizar mención |
| `.claude/references/skill-vs-agent.md` | ~6 | Tabla de decisión |
| `.claude/context/technical-debt.md` | TD-008, TD-021, TD-030 | Actualizar texto de TDs |

### Archivos activos que usan `/workflow_*` (legacy underscore)

| Archivo | Ocurrencias | Tipo de cambio |
|---------|-------------|----------------|
| `.claude/context/technical-debt.md` | ~15 (en texto de TDs) | Actualizar donde corresponda |
| `.claude/references/skill-vs-agent.md` | ~6 (columna de tabla) | Actualizar |
| `.claude/scripts/session-start.sh` | 1 (rama `else` COMMANDS_SYNCED=false) | Limpiar o actualizar |

**Total: ~13 archivos activos afectados.**

---

## Resumen de casos de uso por prioridad

| Prioridad | UC | Descripción | Esfuerzo |
|-----------|-----|-------------|---------|
| P1 — Crítico | UC-001 | Renombrar invocaciones a `/thyrox:*` en docs y scripts (requiere decidir A/C/D primero) | Medio |
| P1 — Crítico | UC-004 | Actualizar `session-start.sh` | Bajo |
| P1 — Crítico | TD-036 | Gate pre-creación de WP en `workflow-analyze/SKILL.md` | Bajo |
| P1 — Crítico | UC-007 (nuevo) | Implementar plugin THYROX si se elige Opción D — `plugin.json` + command wrappers | Alto |
| P2 — Alto | UC-002 | Renombrar `/workflow_init` → `/thyrox:init` | Bajo |
| P2 — Alto | UC-005 | Resolver colisión TD-030 y actualizar TDs legacy | Bajo |
| P2 — Alto | UC-006 | Actualizar `skill-vs-agent.md` | Bajo |
| P2 — Alto | UC-008 (nuevo) | Investigar causa exacta de confirmación de `mkdir`/`Write` (ver [claude-howto-reference-analysis](claude-howto-reference-analysis.md) §4) | Bajo |
| P3 — Medio | UC-003 | Definir e implementar meta-comandos | Alto |

---

## Decisión pendiente — SP-02

Antes de Phase 2 (STRATEGY), el usuario debe decidir:

**¿Cómo se implementa el namespace `/thyrox:*`?**

- **Opción A** — Rename de directorios (`workflow-analyze/` → nombre nuevo). Coherencia total. Costo alto.
- **Opción B** — Command aliases en `.claude/commands/` que delegan a skills existentes. Costo bajo. Doble indirección.
- **Opción C** — Solo convención textual en docs. Cero impacto en directorios. Incoherencia nombre/path.

---

## Stopping Point Manifest

WP clasificado como **mediano** (2–8h, ~13 archivos): todas las 7 fases activas.

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | Phase 1 → 2 | gate-fase | Análisis presentado | Usuario aprueba hallazgos, decide opción A/B/C para implementación, y aprueba spec de meta-comandos (o decide diferir UC-003) |
| SP-02 | Phase 2 → 3 | gate-fase | Strategy completa | Usuario aprueba decisión arquitectónica (A/B/C) y confirma si se requiere ADR nuevo o amendment de ADR-016 |
| SP-03 | Phase 3 → 4 | gate-fase | Plan aprobado | Scope definido — ¿incluye meta-comandos en este FASE o se defieren a FASE 32? |
| SP-04 | Phase 4 → 5 | gate-fase | Spec completa | Usuario aprueba spec antes de descomponer en tareas atómicas |
| SP-05 | Phase 5 → 6 | gate-operacion | Task plan listo | GATE OPERACION antes de modificar `session-start.sh`, `workflow-*/SKILL.md` y `workflow_init.md` |
| SP-06 | Phase 6 → 7 | gate-fase | Implementación completa | Confirmar que `/thyrox:analyze` funciona via Skill tool y `session-start.sh` muestra nuevo namespace |
