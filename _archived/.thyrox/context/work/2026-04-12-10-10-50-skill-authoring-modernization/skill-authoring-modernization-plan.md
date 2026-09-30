```yml
type: Plan
created_at: 2026-04-12 11:45:00
wp: 2026-04-12-10-10-50-skill-authoring-modernization
fase: FASE 33
phase: 3 — PLAN
scope_archivos: 18
archivos_destino: .claude/references/
archivos_adicionales: 2  # thyrox/SKILL.md + technical-debt.md
archivos_scope_creep_resuelto: 1  # scheduled-tasks.md (ref temporal → local)
```

# Plan — skill-authoring-modernization (FASE 33)

## 1. Scope statement

Crear 13 archivos nuevos y actualizar 5 archivos existentes en `.claude/references/` (incluye fix de referencia temporal en `scheduled-tasks.md`), más 2 archivos de cierre (`thyrox/SKILL.md` referencias y `technical-debt.md` TD-025/TD-010). El objetivo es que THYROX tenga cobertura completa de todos los componentes Claude Code (authoring), features avanzadas, CLI completo y patrones de uso.

**No hay cambios de comportamiento** — solo documentación nueva/actualizada. Reversible con git revert.

---

## 2. Archivos IN SCOPE

### Grupo A — Authoring por componente (`.claude/references/`)

| Archivo | Acción | Tamaño actual | Tamaño objetivo |
|---------|--------|---------------|-----------------|
| `skill-authoring.md` | UPDATE — agregar 8 secciones nuevas (GAP-001..006,014,015) | 840 líneas | ~950 líneas |
| `agent-authoring.md` | CREATE — frontmatter agentes (GAP-007), skills: (GAP-008), memory: (GAP-009), background: (GAP-010), isolation: (GAP-011), permission modes (GAP-012) | — | ~350 líneas |
| `claude-authoring.md` | CREATE — cuándo CLAUDE.md, jerarquía, @imports, /init, anti-patrones | — | ~280 líneas |
| `hook-authoring.md` | CREATE — tipos eventos, output control, patrones, errores comunes | — | ~320 líneas |
| `component-decision.md` | CREATE — flowchart decisión, tabla SKILL/CLAUDE/Agent/Hook/Plugin/Command (GAP-013), casos concretos, ambiguos. **No duplicar estructura de plugin.json — referenciar `plugins.md`** | — | ~250 líneas |

### Grupo B — Referencias de plataforma (`.claude/references/`)

| Archivo | Acción | Tamaño actual | Tamaño objetivo |
|---------|--------|---------------|-----------------|
| `advanced-features.md` | CREATE — Planning Mode, Extended Thinking, Auto Mode, Worktrees, Sandboxing, Agent Teams, Remote/Web, Channels | — | ~380 líneas |
| `cli-reference.md` | CREATE — todos los flags, 30+ env vars, comandos claude auth/mcp/agents, patrones | — | ~420 líneas |

### Grupo C — Guías de patrones (`.claude/references/`)

| Archivo | Acción | Tamaño actual | Tamaño objetivo |
|---------|--------|---------------|-----------------|
| `memory-patterns.md` | CREATE — patrones de estado, @imports, auto-memory, anti-patrones | — | ~280 líneas |
| `tool-patterns.md` | CREATE — herramienta correcta, parallel calls, restrictions, anti-patrones | — | ~280 líneas |
| `testing-patterns.md` | CREATE — SDD práctico, CI/CD con claude -p, code review automation | — | ~300 líneas |
| `multimodal.md` | CREATE — image/PDF/notebook/screenshot reading, limitaciones | — | ~200 líneas |
| `output-formats.md` | CREATE — print mode, --output-format, --json-schema, jq, structured output | — | ~280 líneas |
| `stream-resilience.md` | CREATE — recovery patterns, --fallback-model, StopFailure hook, --resume, checkpoints, fork-session | — | ~280 líneas |
| `streaming-errors.md` | CREATE — catálogo de errores con causas/fixes, "partial response received", StopFailure, --verbose/--debug, MAX_THINKING_TOKENS | — | ~300 líneas |
| `long-running-calls.md` | CREATE — --max-turns, --max-budget-usd, background tasks, planning mode, agent teams, worktrees, scheduled tasks, checkpoints | — | ~320 líneas |

### Grupo D — Actualizaciones de existentes (`.claude/references/`)

| Archivo | Acción | Adición |
|---------|--------|---------|
| `mcp-integration.md` | UPDATE — agregar ~30 líneas | `claude mcp serve`, code-execution-with-MCP pattern, env var expansion, `--strict-mcp-config` |
| `plugins.md` | UPDATE — agregar ~30 líneas | Restricciones seguridad subagents-in-plugins, directorio `bin/`, `claude plugin` commands |
| `scheduled-tasks.md` | UPDATE — fix 1 línea (L284) | Reemplazar ref temporal `/tmp/reference/claude-howto/09-advanced-features/README.md` → `advanced-features.md` local |

### Archivos de cierre

| Archivo | Acción |
|---------|--------|
| `.claude/skills/thyrox/SKILL.md` | UPDATE — sección "Avanzado": agregar los 12 archivos nuevos agrupados por dominio |
| `.claude/context/technical-debt.md` | UPDATE — TD-025 `[x]`, TD-010 nota de evaluación (texto exacto en strategy §8) |

---

## 3. Archivos OUT OF SCOPE

| Archivo | Razón de exclusión |
|---------|-------------------|
| `agent-spec.md` | Pertenece a TD-009 (WP separado) |
| `skill-vs-agent.md` | Ya existe y está correcto — solo referenciar desde component-decision.md |
| `claude-code-components.md` | Fuente canónica, no se modifica |
| `hooks.md` | Fuente canónica para hook-authoring.md, no se modifica |
| `hook-output-control.md` | Fuente canónica, no se modifica |
| `plugins.md` (estructura) | Solo adición mínima (~30 líneas), no reescritura |
| `memory-hierarchy.md` | Fuente canónica para memory-patterns.md, no se modifica |
| `sdd.md` | Fuente canónica para testing-patterns.md, no se modifica |
| `tool-execution-model.md` | Fuente para tool-patterns.md, no se modifica |
| `subagent-patterns.md` | Complementario, no modifica |
| Todos los `workflow-*/SKILL.md` | Fuera de alcance |
| Templates de skills existentes | Fuera de alcance |
| `prompting-tips.md` / `long-context-tips.md` | Mencionan skill-authoring.md pero no requieren actualización (la referencia sigue válida) |

---

## 4. Cross-references verificadas

### Archivos que referencian los 14 targets (requieren update al finalizar):

| Archivo referenciante | Referencia actual | Actualización requerida |
|-----------------------|-------------------|------------------------|
| `thyrox/SKILL.md` L209 | `skill-authoring.md` en sección "Avanzado" | Agregar los 10 archivos nuevos en esa sección |
| `long-context-tips.md` L672 | "Ver también: skill-authoring.md" | No requiere cambio (skill-authoring.md sigue existiendo) |
| `prompting-tips.md` L662 | "Ver también: skill-authoring.md" | No requiere cambio |
| `thyrox/SKILL.md` L196 | `plugins.md` | Descripción ya menciona "seguridad de subagentes en plugins" — actualizar solo si la descripción cambia |
| `thyrox/SKILL.md` L201 | `mcp-integration.md` | No requiere cambio de la referencia (misma URL, solo se agrega contenido) |
| `command-execution-model.md` L327 | `plugins.md` | No requiere cambio |
| `scheduled-tasks.md` L284 | ref a `/tmp/reference/claude-howto/09-advanced-features/README.md` | Actualizar para referenciar `advanced-features.md` local — **IN SCOPE, asignado a commit C3** |

**Resultado:** `thyrox/SKILL.md` y `scheduled-tasks.md` requieren update de referencias. `scheduled-tasks.md` apunta a un path temporal del repo de referencia — se corrige en C3 junto con la creación de `advanced-features.md`.

---

## 5. Dependencias entre archivos

> **Fuentes secundarias por archivo:** Ver strategy §5 tabla completa (fuente primaria + secundaria por archivo).

```
Bloque 1 (independientes — ejecutar todos en paralelo):
  skill-authoring.md    ← claude-code-components.md §Skills (GAP-001..006,014,015)
  agent-authoring.md    ← claude-code-components.md §Subagents (GAP-007..012)
  claude-authoring.md   ← memory-hierarchy.md + skill-vs-agent.md
  hook-authoring.md     ← hooks.md + hook-output-control.md
  advanced-features.md  ← claude-howto/09-advanced-features/  [+ scheduled-tasks.md L284 update]
  cli-reference.md      ← claude-howto/10-cli/
  memory-patterns.md    ← memory-hierarchy.md
  tool-patterns.md      ← tool-execution-model.md
  testing-patterns.md   ← sdd.md
  multimodal.md         ← Claude Code docs
  output-formats.md     ← claude-howto/10-cli/
  stream-resilience.md  ← claude-howto/10-cli/ + 06-hooks/ + 08-checkpoints/
  streaming-errors.md   ← claude-howto/06-hooks/ + 10-cli/ + 09-advanced-features/
  long-running-calls.md ← claude-howto/10-cli/ + 09-advanced-features/ + 04-subagents/ + 08-checkpoints/
  mcp-integration.md    ← (update) claude-howto/10-cli/
  plugins.md            ← (update) claude-howto/07-plugins/

Bloque 2 (necesita skill-authoring.md del Bloque 1 en borrador):
  component-decision.md ← análisis Phase 1 + skill-vs-agent.md
  DEPENDENCIA DIRECCIONAL: component-decision.md → skill-authoring.md
  (component-decision referencia las secciones nuevas de skill-authoring — no al revés)

Bloque 3 (necesita los 14 anteriores completados):
  thyrox/SKILL.md       ← referencias actualizadas
  technical-debt.md     ← TD-025 [x], TD-010 nota (texto en strategy §8)
```

---

## 6. Commits planificados

| Commit | Archivos | Convención |
|--------|----------|-----------|
| C1 | agent-authoring.md + claude-authoring.md + hook-authoring.md | `docs(referencias): crear authoring files para Agent, CLAUDE.md y Hook` |
| C2 | skill-authoring.md + component-decision.md | `docs(referencias): actualizar skill-authoring + crear component-decision` |
| C3 | advanced-features.md + cli-reference.md + scheduled-tasks.md (fix ref) | `docs(referencias): crear advanced-features, cli-reference + fix ref temporal en scheduled-tasks` |
| C4 | memory-patterns + tool-patterns + testing-patterns + multimodal + output-formats | `docs(referencias): crear 5 guías de patrones` |
| C4b | stream-resilience + streaming-errors + long-running-calls | `docs(referencias): crear guías de streaming y llamadas largas` |
| C5 | mcp-integration.md + plugins.md (updates) | `docs(referencias): actualizar mcp-integration y plugins con patrones nuevos` |
| C6 | thyrox/SKILL.md + technical-debt.md | `docs(framework): actualizar referencias Avanzado + cerrar TD-025` |

---

## 7. Riesgos activos

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| R-01: skill-authoring.md incompatible con thyrox/SKILL.md | medio | Verificar line 209 antes de editar |
| R-03: scope creep de análisis | medio | Completamente mitigado — scope cerrado |
| R-04: regla de decisión contradice ADR-015/016 | alto | component-decision.md es complementario, no sustitutivo de ADR-015 |

---

## 9. Estrategia de ejecución — Agentes paralelos

> **Nota aprendida en Phase 4:** Ejecutar work complejo de 18+ archivos en un solo agente secuencial causa "Request timed out" y "partial response received". La estrategia correcta es paralelización.

Phase 6 EXECUTE usará **4 agentes paralelos** por grupo:

| Agente | Archivos | Tamaño total est. |
|--------|----------|-------------------|
| Agent-A | skill-authoring + agent-authoring + claude-authoring + hook-authoring + component-decision | ~2,150 líneas |
| Agent-B | advanced-features + cli-reference | ~800 líneas |
| Agent-C | memory-patterns + tool-patterns + testing-patterns + multimodal + output-formats | ~1,340 líneas |
| Agent-D | stream-resilience + streaming-errors + long-running-calls + updates (mcp, plugins, scheduled-tasks) | ~960 líneas |

Cada agente recibe: la sección de requirements spec correspondiente + fuentes canónicas + instrucción de crear/actualizar sus archivos y reportar qué hizo. El agente orquestador (esta sesión) hace los commits después de validar cada grupo.

**Ver también:** `long-running-calls.md` (a crear) §Parallel Agent Pattern — documenta este patrón para proyectos THYROX futuros.

---

## 8. Stopping Point SP-03

> ⏸ **GATE SP-03** — Esperar aprobación del usuario antes de continuar a Phase 4 STRUCTURE.
>
> **Decisión requerida:** Aprobar el scope (14 archivos + 2 adicionales), los archivos OUT OF SCOPE, y la estrategia de commits.
