```yml
type: Análisis
created_at: 2026-04-11 10:52:25
project: thyrox-framework
feature: thyrox-commands-namespace
fase: FASE 31
phase: Phase 1 — ANALYZE
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

**Decisión de implementación — Opción A vs B:**

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A — Rename directorios** | `skills/workflow-analyze/` → `skills/thyrox/analyze/` (o `thyrox-analyze/`) | Namespace coherente con carpetas | Rompe referencias de path actuales en todos los SKILL.md; git mv complejo |
| **B — Alias en commands/** | Crear `.claude/commands/analyze.md` (invocado como `/thyrox:analyze`) que delega al skill existente | Sin cambio de paths; compatible con nomenclatura actual | Doble indirección; skills siguen llamándose `workflow-*` internamente |
| **C — Solo convención textual** | Mantener skills con nombre `workflow-*` pero renombrar la invocación recomendada en docs a `/thyrox:analyze` | Cero impacto en archivos de skill | Incoherencia entre nombre del directorio y nombre del comando |

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

## 5. Atributos de calidad

| Atributo | Importancia | Cómo se aborda |
|----------|-------------|----------------|
| **Coherencia de naming** | Alta | Un namespace `/thyrox:*` para todo — sin `workflow-` ni `workflow_` |
| **Descubribilidad** | Alta | El usuario que escribe `/thyrox:` ve todos los comandos del framework |
| **Reversibilidad** | Media | Skills con `workflow-*` en nombre del directorio pueden coexistir; el rename es gradual |
| **Impacto mínimo en runtime** | Crítico | Los SKILL.md siguen funcionando igual — solo cambia cómo se llaman |

---

## 6. Restricciones

| Restricción | Impacto |
|-------------|---------|
| FASE 30 (uv-adoption) tiene gate abierto | No bloquea este FASE pero debe resolverse en paralelo o secuencialmente |
| `workflow-*/SKILL.md` son archivos activos con `updated_at` — editarlos requiere update de timestamp | Automático por regla CLAUDE.md |
| Los artefactos WP históricos son inmutables | No se actualizan las referencias en `context/work/` |
| ADR-016 documenta los workflow-* skills como excepción a "Single skill" | Una migración de namespace debe generar un nuevo ADR o amendment |

---

## 7. Fuera de alcance

- Cambiar el contenido lógico de los workflow-*/SKILL.md (eso es TD-008, ya completado)
- Renombrar las fases internas (Phase 1..7) a otro esquema (eso es TD-030 en technical-debt.md)
- Migrar artefactos WP históricos que referencian `/workflow-*`
- Crear tests automatizados para los command files

---

## 8. Criterios de éxito

| Criterio | Verificación |
|----------|-------------|
| `grep -ri "/workflow-" .claude/` → 0 resultados en archivos activos (excepto paths de directorio) | Grep post-migración |
| `/thyrox:analyze` ... `/thyrox:track` funcional via Skill tool | Invocación manual en sesión de prueba |
| `session-start.sh` muestra `/thyrox:analyze` en "Opción B" | `bash .claude/scripts/session-start.sh` |
| TD-030 colisión de IDs resuelta | `technical-debt.md` tiene IDs sin ambigüedad |
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
| P1 — Crítico | UC-001 | Renombrar invocaciones a `/thyrox:*` en docs y scripts | Medio |
| P1 — Crítico | UC-004 | Actualizar `session-start.sh` | Bajo |
| P2 — Alto | UC-002 | Renombrar `/workflow_init` → `/thyrox:init` | Bajo |
| P2 — Alto | UC-005 | Resolver colisión TD-030 y actualizar TDs legacy | Bajo |
| P2 — Alto | UC-006 | Actualizar `skill-vs-agent.md` | Bajo |
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

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | Phase 1 → 2 | gate-fase | Análisis presentado | Usuario aprueba hallazgos, decide opción A/B/C para implementación, y aprueba spec de meta-comandos (o decide diferir UC-003) |
| SP-02 | Phase 2 → 3 | gate-fase | Strategy completa | Usuario aprueba decisión arquitectónica (A/B/C) antes de planificar |
| SP-03 | Phase 3 → 6 | gate-fase | Plan aprobado | Scope definido — ¿incluye meta-comandos en este FASE o se defieren? |
| SP-04 | Phase 5 → 6 | gate-fase | Task plan listo | GATE OPERACION antes de modificar `session-start.sh` y `workflow-*/SKILL.md` |
| SP-05 | Phase 6 → 7 | gate-fase | Implementación completa | Confirmar que `/thyrox:analyze` funciona y `session-start.sh` muestra namespace correcto |
