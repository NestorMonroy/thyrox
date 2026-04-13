```yml
type: Task Plan
created_at: 2026-04-13 19:18:59
wp: ishikawa-stream-analysis
origen: Migrado desde FASE 33 — skill-authoring-modernization
fase_origen: FASE 33
fase_actual: FASE 34
formato: natural-language-parsing v1
```

# Task Plan — Tareas migradas de FASE 33 (skill-authoring-modernization)

Este archivo contiene todas las tareas pendientes del WP `skill-authoring-modernization` (FASE 33),
registradas con formato de parsing de lenguaje natural para extracción estructurada de propiedades.

## Estructura de parsing

Cada tarea es una línea markdown con los siguientes campos extraíbles:

| Campo | Formato | Ejemplo |
|-------|---------|---------|
| `status` | `- [ ]` pendiente / `- [x]` completada | `- [ ]` |
| `description` | Texto libre después del marcador | `Crear agent-authoring.md` |
| `date` | `📅 <valor>` | `📅 Phase 6 EXECUTE` |
| `priority` | `⏫` alta / `🔼` media / `🔽` baja | `⏫` |
| `tags` | `#tag` (múltiples permitidos) | `#grupo-a #referencias` |
| `dependencies` | `\| depende de: <lista>` | `\| depende de: requirements-spec.md` |

---

## Fase 4 — STRUCTURE (bloqueada)

- [ ] Crear requirements-spec.md para FASE 33 (Phase 4 STRUCTURE — nunca completado por stream timeout) 📅 inmediato ⏫ #phase-4 #bloqueante | depende de: sesión nueva + CLAUDE_STREAM_IDLE_TIMEOUT_MS=120000

---

## Fase 6 — EXECUTE: Commit C1 — Authoring files (Agent, CLAUDE.md, Hook)

- [ ] Crear agent-authoring.md (~350 líneas) — frontmatter agentes: skills, memory, background, isolation, permission modes (GAP-007..012) 📅 Phase 6 EXECUTE ⏫ #grupo-a #referencias #c1
- [ ] Crear claude-authoring.md (~280 líneas) — cuándo CLAUDE.md, jerarquía, @imports, /init, anti-patrones 📅 Phase 6 EXECUTE ⏫ #grupo-a #referencias #c1
- [ ] Crear hook-authoring.md (~320 líneas) — tipos eventos, output control, patrones, errores comunes 📅 Phase 6 EXECUTE ⏫ #grupo-a #referencias #c1

---

## Fase 6 — EXECUTE: Commit C2 — skill-authoring + component-decision

- [ ] Actualizar skill-authoring.md (~840→950 líneas) — agregar 8 secciones nuevas (GAP-001..006,014,015): Frontmatter Técnico, Descripción Semántica, Tools, Model, etc. 📅 Phase 6 EXECUTE ⏫ #grupo-a #referencias #c2
- [ ] Crear component-decision.md (~250 líneas) — flowchart decisión SKILL/CLAUDE/Agent/Hook/Plugin/Command (GAP-013), casos concretos y ambiguos 📅 Phase 6 EXECUTE 🔼 #grupo-a #referencias #c2 | depende de: skill-authoring.md (secciones nuevas)

---

## Fase 6 — EXECUTE: Commit C3 — Platform references + scheduled-tasks fix

- [ ] Crear advanced-features.md (~380 líneas) — Planning Mode, Extended Thinking, Auto Mode, Worktrees, Sandboxing, Agent Teams, Remote/Web, Channels 📅 Phase 6 EXECUTE ⏫ #grupo-b #referencias #c3
- [ ] Crear cli-reference.md (~420 líneas) — todos los flags, 30+ env vars, comandos claude auth/mcp/agents, patrones de uso 📅 Phase 6 EXECUTE ⏫ #grupo-b #referencias #c3
- [ ] Fix scheduled-tasks.md L284 — reemplazar ref temporal `/tmp/reference/claude-howto/09-advanced-features/README.md` → `advanced-features.md` local 📅 Phase 6 EXECUTE 🔼 #grupo-d #fix #c3 | depende de: advanced-features.md

---

## Fase 6 — EXECUTE: Commit C4 — Guías de patrones (5 archivos)

- [ ] Crear memory-patterns.md (~280 líneas) — patrones de estado, @imports, auto-memory, anti-patrones 📅 Phase 6 EXECUTE 🔼 #grupo-c #referencias #c4
- [ ] Crear tool-patterns.md (~280 líneas) — herramienta correcta, parallel calls, restrictions, anti-patrones 📅 Phase 6 EXECUTE 🔼 #grupo-c #referencias #c4
- [ ] Crear testing-patterns.md (~300 líneas) — SDD práctico, CI/CD con claude -p, code review automation 📅 Phase 6 EXECUTE 🔼 #grupo-c #referencias #c4
- [ ] Crear multimodal.md (~200 líneas) — image/PDF/notebook/screenshot reading, limitaciones 📅 Phase 6 EXECUTE 🔼 #grupo-c #referencias #c4
- [ ] Crear output-formats.md (~280 líneas) — print mode, --output-format, --json-schema, jq, structured output 📅 Phase 6 EXECUTE 🔼 #grupo-c #referencias #c4

---

## Fase 6 — EXECUTE: Commit C4b — Guías de streaming y llamadas largas

- [ ] Crear stream-resilience.md (~280 líneas) — recovery patterns, --fallback-model, StopFailure hook, --resume, checkpoints, fork-session 📅 Phase 6 EXECUTE ⏫ #grupo-c #streaming #c4b
- [ ] Crear streaming-errors.md (~300 líneas) — catálogo errores con causas/fixes: "partial response received", StopFailure, --verbose/--debug, MAX_THINKING_TOKENS 📅 Phase 6 EXECUTE ⏫ #grupo-c #streaming #c4b
- [ ] Crear long-running-calls.md (~320 líneas) — --max-turns, --max-budget-usd, background tasks, planning mode, agent teams, worktrees, checkpoints + §Parallel Agents matiz síntesis padre 📅 Phase 6 EXECUTE ⏫ #grupo-c #streaming #c4b

---

## Fase 6 — EXECUTE: Commit C5 — Updates existentes (mcp, plugins)

- [ ] Actualizar mcp-integration.md — agregar ~30 líneas: `claude mcp serve`, code-execution-with-MCP pattern, env var expansion, `--strict-mcp-config` 📅 Phase 6 EXECUTE 🔼 #grupo-d #update #c5
- [ ] Actualizar plugins.md — agregar ~30 líneas: Restricciones seguridad subagents-in-plugins, directorio `bin/`, `claude plugin` commands 📅 Phase 6 EXECUTE 🔼 #grupo-d #update #c5

---

## Fase 6 — EXECUTE: Commit C6 — Cierre de FASE 33

- [ ] Actualizar thyrox/SKILL.md — sección "Avanzado": agregar los 12 archivos nuevos agrupados por dominio (authoring, platform, patterns, streaming) 📅 Phase 6 EXECUTE 🔼 #cierre #framework #c6 | depende de: todos los archivos grupo-a, grupo-b, grupo-c, grupo-d
- [ ] Actualizar technical-debt.md — TD-025 marcar [x] (cerrado), TD-010 agregar nota de evaluación 📅 Phase 6 EXECUTE 🔼 #cierre #technical-debt #c6 | depende de: todos los archivos grupo-a, grupo-b, grupo-c, grupo-d

---

## Resumen de estado

| Grupo | Tareas | Completadas | Pendientes |
|-------|--------|-------------|------------|
| Phase 4 (bloqueante) | 1 | 0 | 1 |
| C1 — Authoring (A,CLAUDE,Hook) | 3 | 0 | 3 |
| C2 — skill-authoring + decision | 2 | 0 | 2 |
| C3 — Platform + fix | 3 | 0 | 3 |
| C4 — Patrones (5) | 5 | 0 | 5 |
| C4b — Streaming (3) | 3 | 0 | 3 |
| C5 — Updates (mcp, plugins) | 2 | 0 | 2 |
| C6 — Cierre | 2 | 0 | 2 |
| **TOTAL** | **21** | **0** | **21** |

---

## Propiedades estructuradas extraíbles por tarea

```json
{
  "task_schema": {
    "id": "T-NNN",
    "description": "string",
    "status": "pending | completed",
    "date": "string | null",
    "priority": "high | medium | low",
    "tags": ["string"],
    "dependencies": ["string"]
  },
  "priority_mapping": {
    "⏫": "high",
    "🔼": "medium",
    "🔽": "low"
  },
  "status_mapping": {
    "- [ ]": "pending",
    "- [x]": "completed"
  },
  "extractors": {
    "date": "📅 (.+?)(?= [⏫🔼🔽#|]|$)",
    "priority": "[⏫🔼🔽]",
    "tags": "#([\\w-]+)",
    "dependencies": "\\| depende de: (.+)"
  }
}
```
