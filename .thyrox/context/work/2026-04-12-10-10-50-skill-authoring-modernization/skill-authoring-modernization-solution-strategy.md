```yml
type: Solution Strategy
created_at: 2026-04-12 11:30:00
wp: 2026-04-12-10-10-50-skill-authoring-modernization
fase: FASE 33
phase: 2 — SOLUTION_STRATEGY
archivos_total: 14
archivos_crear: 10
archivos_actualizar: 4
```

# Solution Strategy — skill-authoring-modernization (FASE 33)

## 1. Resumen de decisión

Crear **10 archivos nuevos** y actualizar **4 existentes** en `.claude/references/`. Cada archivo es autónomo por tema — no por tipo de componente únicamente. Esto maximiza la descubribilidad y mantiene tamaños razonables (~200-400 líneas cada uno).

---

## 2. Mapa de contenido por archivo

### Grupo A — Authoring por tipo de componente

#### `skill-authoring.md` — ACTUALIZAR (841 → ~950 líneas)

**Qué queda en este archivo (de los 15 gaps):**

| Gap | Contenido | Fuente |
|-----|-----------|--------|
| GAP-001 | Frontmatter completo de Skills post-2026-03-25 | `claude-code-components.md` §Skills |
| GAP-002 | Tres modos de invocación: default / disable-model-invocation / user-invocable | `claude-code-components.md` §invocation |
| GAP-003 | Context budget optimization con `disable-model-invocation` | `claude-code-components.md` §context budget |
| GAP-004 | Variables de sustitución: `$ARGUMENTS`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_SESSION_ID}` | `claude-code-components.md` §variables |
| GAP-005 | Inyección dinámica de contexto con `!` backtick syntax | `claude-code-components.md` §dynamic injection |
| GAP-006 | `context: fork` + `agent:` field | `claude-code-components.md` §context isolation |
| GAP-014 | Description budget: 250 chars, truncación, 1% context window | `claude-code-components.md` §description |
| GAP-015 | `paths:` field para activación condicional por archivos | `claude-code-components.md` §paths |

**Qué va a otros archivos (no duplicar aquí):**
- GAP-007/008/009/010/011/012 → `agent-authoring.md`
- GAP-013 → `component-decision.md`

**Estructura de adiciones:**
```
Sección nueva: "Frontmatter completo"        ← GAP-001
Sección nueva: "Modos de invocación"         ← GAP-002 + GAP-003
Sección nueva: "Variables de sustitución"    ← GAP-004
Sección nueva: "Inyección dinámica de contexto" ← GAP-005
Sección existente ampliada: "Context isolation" ← GAP-006
Sección existente ampliada: "Description"    ← GAP-014
Sección nueva: "Activación condicional (paths:)" ← GAP-015
```

---

#### `agent-authoring.md` — CREAR NUEVO (~350 líneas)

**Qué contiene:**

| Sección | Gaps / Fuente |
|---------|---------------|
| Frontmatter completo de Agentes | GAP-007 — `claude-code-components.md` §Subagents |
| `skills:` field (inyecta contenido completo de skills) | GAP-008 — `claude-code-components.md` §skills field |
| `memory:` en subagents (3 scopes: user/project/local) | GAP-009 — `claude-code-components.md` §memory |
| `background: true` | GAP-010 — `claude-code-components.md` §background |
| `isolation: worktree` | GAP-011 — `claude-code-components.md` §isolation |
| Permission modes de subagents (6 modos) | GAP-012 — `claude-code-components.md` §permissionMode |
| Naming conventions y dónde viven (.claude/agents/) | `agent-spec.md` |
| Tools restrictions (cómo restringir herramientas) | `agent-spec.md`, `claude-howto/04-subagents/` |
| Anti-patrones: no usar `model:` innecesario, no duplicar CLAUDE.md | Derivado del análisis |

**Estructura:**
```
1. Cuándo crear un agente (vs SKILL vs Hook)
2. Frontmatter completo con todos los campos
3. Campos obligatorios vs opcionales
4. skills: field — cómo inyectar contexto de skills
5. memory: — 3 scopes y cuándo usar cada uno
6. Isolation y background
7. Permission modes (6) — tabla + casos de uso
8. Tool restrictions — cómo y cuándo restringir
9. Naming y estructura de directorio
10. Anti-patrones comunes
```

**Fuentes primarias:** `claude-code-components.md` §Subagents, `agent-spec.md`, `claude-howto/04-subagents/README.md`

---

#### `claude-authoring.md` — CREAR NUEVO (~280 líneas)

**Qué contiene:**

| Sección | Fuente |
|---------|--------|
| Cuándo CLAUDE.md es correcto (regla: aplica sin excepción a TODA sesión) | `skill-vs-agent.md`, análisis Phase 1 |
| Jerarquía de 4 niveles (enterprise/user/project/subdir) | `memory-hierarchy.md` |
| `@path/to/file` imports — cuándo y cómo | `claude-howto/02-memory/`, `memory-hierarchy.md` |
| `/init` command para bootstrapping | `claude-howto/02-memory/` |
| Estructura recomendada de CLAUDE.md | THYROX CLAUDE.md como referencia |
| Qué NO va en CLAUDE.md (reglas context-heavy, workflows largos, anything conditional) | Derivado del análisis |
| Anti-patrones: CLAUDE.md como SKILL, instrucciones que solo aplican a veces | `skill-vs-agent.md` |

**Estructura:**
```
1. Regla core: CLAUDE.md = instrucciones universales sin excepción
2. Jerarquía de niveles
3. @imports — referencias a documentación externa
4. /init — inicialización del proyecto
5. Estructura recomendada (secciones)
6. Límites de tamaño y cuando hacer split
7. Qué NO incluir (condicional → SKILL, side effects → Agent, reacción a evento → Hook)
8. Anti-patrones
```

**Fuentes primarias:** `memory-hierarchy.md`, `claude-howto/02-memory/README.md`, `skill-vs-agent.md`

---

#### `hook-authoring.md` — CREAR NUEVO (~320 líneas)

**Qué contiene:**

| Sección | Fuente |
|---------|--------|
| Tipos de eventos disponibles (PreToolUse, PostToolUse, Stop, SessionStart, etc.) | `hooks.md` |
| Configuración en settings.json | `hooks.md` |
| Output control: `suppressOutput`, `additionalContext`, `updatedInput`, `permissionDecision` | `hook-output-control.md` |
| Patrones de uso: validación, logging, estado reactivo | `claude-howto/06-hooks/` |
| Scripts de ejemplo del repo (notify-team.sh, security-scan.sh, validate-prompt.sh) | `claude-howto/06-hooks/` |
| Errores comunes: archivo no ejecutable, paths relativos, stdout contaminado | `hook-output-control.md` |

**Estructura:**
```
1. Cuándo un Hook es correcto (acción determinística ante evento)
2. Tipos de eventos — tabla completa
3. Configuración en settings.json
4. Output control — semántica de cada campo
5. Patrones comunes: sync-state, pre-flight check, logging, notificación
6. Errores frecuentes y cómo evitarlos
7. Testing de hooks
```

**Fuentes primarias:** `hooks.md`, `hook-output-control.md`, `claude-howto/06-hooks/README.md`

---

#### `component-decision.md` — CREAR NUEVO (~250 líneas)

**Qué contiene (absorbe GAP-013 completamente):**

| Sección | Fuente |
|---------|--------|
| Flowchart de decisión (cuándo usar cada tipo) | Análisis Phase 1 |
| Tabla comparativa SKILL vs CLAUDE.md vs Agent vs Hook vs Plugin vs Command | Análisis Phase 1 |
| Casos concretos del repo claude-howto | Análisis Phase 1 §5 |
| Reglas rápidas memorizables | Derivado |
| Ejemplos de casos ambiguos y resolución | Análisis Phase 1 (brand-voice case) |

**Estructura:**
```
1. Diagrama de decisión (flowchart en mermaid)
2. Tabla de criterios por tipo
3. Regla rápida por tipo (1 línea)
4. Casos concretos (refactor SKILL, directory CLAUDE.md, secure-reviewer Agent, brand-voice ambiguo)
5. Casos ambiguos — cómo resolver la ambigüedad
6. Anti-patrones (agent como CLAUDE.md, hook como SKILL)
```

**Fuentes primarias:** `skill-vs-agent.md`, análisis Phase 1 §4-5, `claude-howto/03-skills/brand-voice/`

---

### Grupo B — Referencias de plataforma

#### `advanced-features.md` — CREAR NUEVO (~380 líneas)

**Qué contiene:**

| Sección | Contenido | Fuente |
|---------|-----------|--------|
| Planning Mode | Activación, cuándo usar, integración con Phase 1 THYROX | `claude-howto/09-advanced-features/README.md` §Planning |
| Extended Thinking | `--effort` levels, `MAX_THINKING_TOKENS`, `--betas interleaved-thinking` | §Extended Thinking |
| Auto Mode | `--enable-auto-mode`, `--permission-mode auto`, permisos | §Auto Mode |
| Git Worktrees | `claude -w`, `--tmux`, aislamiento de contexto | §Git Worktrees |
| Sandboxing | Contenedores, restricciones, cuándo activar | §Sandboxing |
| Agent Teams | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `--teammate-mode tmux` | §Agent Teams |
| Remote Control | `claude --rc`, `claude remote-control`, casos de uso | §Remote Control |
| Web Sessions | `claude --remote`, `--teleport`, sincronización local↔web | §Web Sessions |
| Desktop App | Funcionalidades específicas del desktop app | §Desktop App |
| Channels | `--channels`, MCP channel plugins, push notifications | §Channels |
| Voice Dictation | Dictado en Desktop/Web | §Voice Dictation |
| Task List | `CLAUDE_CODE_ENABLE_TASKS`, `CLAUDE_CODE_TASK_LIST_ID` | §Task List |

**Estructura:**
```
1. Overview — qué features avanzadas existen y cuándo importan
2. Planning Mode — plan antes de ejecutar (⚠️ relevante para THYROX Phase 1)
3. Extended Thinking — razonamiento profundo (effort levels)
4. Auto Mode — autonomía máxima con seguridad
5. Git Worktrees — aislamiento de trabajo paralelo
6. Sandboxing — ejecución segura
7. Agent Teams — coordinación multi-agente
8. Remote/Web/Desktop — modos no-CLI
9. Channels — integración push (Discord, Telegram)
10. Voice Dictation y Task List
```

**Fuentes primarias:** `claude-howto/09-advanced-features/README.md`, `scheduled-tasks.md` (existente), `subagent-patterns.md` (existente)

---

#### `cli-reference.md` — CREAR NUEVO (~420 líneas)

**Qué contiene:**

| Sección | Contenido clave |
|---------|-----------------|
| Core flags | `-p`, `-c`, `-r`, `-v`, `-w`, `-n` |
| Model & config | `--model`, `--fallback-model`, `--effort`, `--agents JSON` |
| System prompt | `--system-prompt`, `--system-prompt-file`, `--append-system-prompt` |
| Tools & permissions | `--tools`, `--allowedTools`, `--disallowedTools`, `--permission-mode` |
| Output & format | `--output-format`, `--json-schema`, `--input-format`, `--include-partial-messages` |
| Workspace | `--add-dir`, `--settings`, `--plugin-dir`, `--setting-sources` |
| MCP | `--mcp-config`, `--strict-mcp-config`, `--channels` |
| Session mgmt | `--session-id`, `--fork-session`, `--from-pr` |
| Advanced | `--bare`, `--max-turns`, `--debug`, `--enable-lsp-logging`, `--betas` |
| Commands | `claude auth`, `claude mcp serve`, `claude agents`, `claude auto-mode defaults`, `claude remote-control` |
| Env vars | 30+ variables — tabla completa |
| Patrones de integración | CI/CD, piping, batch processing, JSON API |

**Gaps vs estado actual de THYROX:** THYROX cubre ~7 env vars, este archivo documenta 30+. Flags como `--bare`, `--fallback-model`, `--agents JSON`, `--json-schema`, `--max-turns` no están documentados en ninguna referencia actual.

**Fuentes primarias:** `claude-howto/10-cli/README.md` (completo, ya leído)

---

### Grupo C — Guías de patrones

#### `memory-patterns.md` — CREAR NUEVO (~280 líneas)

**Qué contiene:**

| Sección | Contenido | Fuente |
|---------|-----------|--------|
| 8 niveles de memoria | Enterprise → User → Project → SubDir → Import → Skill → Agent → Hook | `memory-hierarchy.md` (existente) — referenciar, no duplicar |
| Patrones de estado en THYROX | `now.md`, `focus.md`, `project-state.md` como patrones de memoria local | Observación THYROX |
| `@path/to/file` imports | Referencia a documentación externa desde CLAUDE.md | `claude-howto/02-memory/` |
| Auto-memory | `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, cuándo deshabilitar | `claude-howto/02-memory/` |
| memory: en subagents | Scopes user/project/local desde perspectiva de patrones | `claude-code-components.md` |
| Anti-patrones | CLAUDE.md gigante, estado en archivos ad-hoc fuera del WP, memoria sin estructura | Derivado |

**Nota:** `memory-hierarchy.md` ya existe y documenta la jerarquía. Este archivo documenta **cómo usar** la memoria en patrones concretos, no cómo funciona el sistema.

---

#### `tool-patterns.md` — CREAR NUEVO (~280 líneas)

**Qué contiene:**

| Sección | Contenido | Fuente |
|---------|-----------|--------|
| Herramienta correcta por tarea | Read vs cat, Grep vs grep, Glob vs find, Edit vs sed | `tool-execution-model.md` (existente) |
| Parallel tool calls | Cuándo y cómo llamar herramientas en paralelo | `tool-execution-model.md` |
| Tool restrictions en agentes | `tools:` array para restricción física vs `disallowedTools` CLI | `agent-spec.md`, `cli-reference.md` |
| Error handling | Qué hacer cuando una tool falla, retry patterns | Observación THYROX |
| Edit vs Write | Cuándo usar uno vs otro, `replace_all` | Instrucciones Claude Code |
| Bash tool | Cuándo es necesario vs dedicadas, commands paralelos, timeout | Instrucciones Claude Code |
| Anti-patrones | Bash para leer archivos, grep en lugar de Grep, sleep loops | Instrucciones Claude Code |

---

#### `testing-patterns.md` — CREAR NUEVO (~300 líneas)

**Qué contiene:**

| Sección | Contenido | Fuente |
|---------|-----------|--------|
| SDD overview | Spec-Driven Development: TDD + DbC | `sdd.md` (existente) — referenciar, no duplicar |
| Collaborative tests | Claude escribe tests, humano valida lógica de negocio | `sdd.md` |
| Contratos (DbC) | Precondiciones, postcondiciones, invariantes | `sdd.md` |
| Test amplification | Claude amplía tests existentes con edge cases | `sdd.md` |
| CI/CD integration | `claude -p --max-turns 3 --output-format json` en pipelines | `claude-howto/10-cli/` §CI/CD |
| Code review automation | `claude -p "review PR changes"` patterns | `claude-howto/03-skills/code-review/` |
| Cuándo usar cada tipo | Unit vs integration vs contract vs collaborative | `sdd.md` |

**Nota:** `sdd.md` ya existe y documenta SDD completo. Este archivo documenta **patrones prácticos** de testing con Claude — especialmente CI/CD y code review automation.

---

#### `multimodal.md` — CREAR NUEVO (~200 líneas)

**Qué contiene:**

| Sección | Contenido | Fuente |
|---------|-----------|--------|
| Image reading | Read tool en PNG/JPG/GIF/WEBP — casos de uso (screenshots, diagrams, mockups) | Claude Code docs |
| PDF reading | `pages:` parameter, máximo 20 páginas por request | Claude Code docs |
| Notebook reading | `.ipynb` — combina code + text + outputs | Claude Code docs |
| Screenshot patterns | Capturar pantalla → Read → análisis | Observación |
| Limitaciones | Lo que Claude NO puede hacer con archivos binarios | Documentación |
| Anti-patrones | Leer PDF sin `pages:` (falla para >10 páginas), enviar imágenes sin contexto | Documentación |

---

#### `output-formats.md` — CREAR NUEVO (~280 líneas)

**Qué contiene:**

| Sección | Contenido | Fuente |
|---------|-----------|--------|
| Print mode (`-p`) | Modo no-interactivo, piping, scriptable | `claude-howto/10-cli/` |
| `--output-format` | `text` / `json` / `stream-json` — diferencias y casos de uso | `claude-howto/10-cli/` |
| `--json-schema` | Salida estructurada con validación de schema | `claude-howto/10-cli/` |
| `--input-format` | `text` / `stream-json` para input programático | `claude-howto/10-cli/` |
| `--include-partial-messages` | Streaming con eventos parciales | `claude-howto/10-cli/` |
| jq patterns | Parseo de output JSON con jq en scripts | `claude-howto/10-cli/` §jq |
| Structured output recipes | Patrones comunes: list de bugs, análisis de código, reportes | `claude-howto/10-cli/` |
| Hook output control | `suppressOutput`, `additionalContext` (perspectiva de output) | `hook-output-control.md` |

---

### Grupo D — Actualizaciones de existentes

#### `mcp-integration.md` — ACTUALIZAR

**Qué agregar (sin modificar lo existente):**

| Adición | Contenido | Fuente |
|---------|-----------|--------|
| `claude mcp serve` | Ejecutar Claude Code como servidor MCP | `claude-howto/10-cli/` |
| Code-execution-with-MCP | Patrón: reducción 98.7% de tokens usando MCP para ejecución de código | Deep-review FASE 33 |
| Env var expansion | Variables de entorno en configuración MCP | `claude-howto/10-cli/` §MCP |
| `--strict-mcp-config` | Modo estricto — solo servers del config especificado | `claude-howto/10-cli/` |

---

#### `plugins.md` — ACTUALIZAR

**Qué agregar (sin modificar lo existente):**

| Adición | Contenido | Fuente |
|---------|-----------|--------|
| Restricciones de seguridad en subagentes dentro de plugins | `hooks`, `mcpServers`, `permissionMode` bloqueados cuando el agente está en contexto de plugin | `claude-howto/07-plugins/README.md` |
| Directorio `bin/` | Scripts ejecutables que el plugin expone | `claude-howto/07-plugins/README.md` |
| Plugin commands | Cómo los comandos del plugin se exponen via `claude plugin` | `claude-howto/10-cli/` |

---

## 3. Actualización de `thyrox/SKILL.md`

La sección "Avanzado" de `thyrox/SKILL.md` actualmente lista solo `skill-authoring.md`. Después de la ejecución, se actualizará para referenciar los 12 archivos nuevos/actualizados agrupados por dominio:

```
### Authoring — creación de componentes
skill-authoring · agent-authoring · claude-authoring · hook-authoring · component-decision

### Plataforma — referencia completa
advanced-features · cli-reference

### Patrones — cómo usar Claude Code
memory-patterns · tool-patterns · testing-patterns · multimodal · output-formats
```

---

## 4. Distribución de líneas estimada

| Grupo | Archivos | Líneas est. | Total |
|-------|----------|-------------|-------|
| A — Authoring | 5 (1 update + 4 new) | 110+350+280+320+250 | ~1,310 |
| B — Plataforma | 2 new | 380+420 | ~800 |
| C — Patrones | 5 new | 280+280+300+200+280 | ~1,340 |
| D — Updates | 2 updates | ~30+30 | ~60 |
| **Total** | **14** | | **~3,510** |

Cada archivo individual se mantiene < 500 líneas (excepto `cli-reference.md` que puede llegar a ~450 — dentro del límite).

---

## 5. Fuentes canónicas por archivo

| Archivo | Fuente primaria | Fuente secundaria |
|---------|-----------------|-------------------|
| `skill-authoring.md` | `claude-code-components.md` | Existente |
| `agent-authoring.md` | `claude-code-components.md` §Subagents | `agent-spec.md`, `claude-howto/04-subagents/` |
| `claude-authoring.md` | `memory-hierarchy.md` | `claude-howto/02-memory/`, `skill-vs-agent.md` |
| `hook-authoring.md` | `hooks.md` + `hook-output-control.md` | `claude-howto/06-hooks/` |
| `component-decision.md` | Análisis Phase 1 §4-5 | `skill-vs-agent.md`, `claude-howto/03-skills/` |
| `advanced-features.md` | `claude-howto/09-advanced-features/README.md` | `scheduled-tasks.md`, `subagent-patterns.md` |
| `cli-reference.md` | `claude-howto/10-cli/README.md` | Flags del sistema |
| `memory-patterns.md` | `memory-hierarchy.md` | `claude-howto/02-memory/README.md` |
| `tool-patterns.md` | `tool-execution-model.md` | `agent-spec.md` |
| `testing-patterns.md` | `sdd.md` | `claude-howto/10-cli/` §CI/CD |
| `multimodal.md` | Claude Code docs (Read tool capabilities) | — |
| `output-formats.md` | `claude-howto/10-cli/` §Output + §jq | `hook-output-control.md` |
| `mcp-integration.md` | `claude-howto/10-cli/` §MCP | `claude-howto/05-mcp/` |
| `plugins.md` | `claude-howto/07-plugins/README.md` | Existente |

---

## 6. Criterios de no-duplicación

Para evitar redundancia entre archivos:

| Tema | Archivo canónico | Otros referencian → no duplican |
|------|------------------|---------------------------------|
| Memory hierarchy (8 niveles) | `memory-hierarchy.md` | `memory-patterns.md` referencia, no repite |
| SDD / spec-driven | `sdd.md` | `testing-patterns.md` referencia, no repite |
| SKILL vs Agent decisión inicial | `skill-vs-agent.md` | `component-decision.md` extiende con Hook/Plugin/Command |
| Campos de Skills frontmatter | `claude-code-components.md` | `skill-authoring.md` aplica y ejemplifica |
| Campos de Agents frontmatter | `claude-code-components.md` | `agent-authoring.md` aplica y ejemplifica |
| Hook output semántica | `hook-output-control.md` | `hook-authoring.md` referencia, `output-formats.md` usa perspectiva output |
| Plugin manifest | `plugins.md` | `component-decision.md` menciona cuándo usar |

---

## 7. Orden de ejecución recomendado (DAG)

```
claude-code-components.md (read) ──┬──► skill-authoring.md (update)
                                   ├──► agent-authoring.md (new)
                                   └──► component-decision.md (new)

skill-vs-agent.md (read) ──────────► claude-authoring.md (new)
                                   ► component-decision.md (new)  [ya iniciado arriba]

hooks.md + hook-output-control.md ─► hook-authoring.md (new)

claude-howto/09-advanced-features ─► advanced-features.md (new)
claude-howto/10-cli ───────────────► cli-reference.md (new)
                                   ► output-formats.md (new)
                                   ► mcp-integration.md (update)

memory-hierarchy.md (read) ────────► memory-patterns.md (new)
tool-execution-model.md (read) ────► tool-patterns.md (new)
sdd.md (read) ─────────────────────► testing-patterns.md (new)

claude-code-components.md (read) ──► multimodal.md (new)
claude-howto/07-plugins ───────────► plugins.md (update)

thyrox/SKILL.md ───────────────────► update referencias "Avanzado"
```

**Archivos que se pueden crear en paralelo:** todos los del mismo nivel en el DAG.
**Dependencia única:** `component-decision.md` necesita `skill-authoring.md` finalizado para coherencia.

---

## 8. Decisión sobre TD-010

TD-010 mantiene estado `[-] En progreso`. Se agrega nota en `technical-debt.md`:

```
**Evaluación 2026-04-12 (FASE 33):** Repo claude-howto (119 artefactos) analizado.
Veredicto: trigger NO activado. Repo es material educativo, no datos de ejecución real.
Para activar: identificar tarea recurrente THYROX con hipótesis medible.
Próxima evaluación: cuando haya caso de uso concreto en producción.
```

---

## 9. Stopping Point SP-02

> ⏸ **GATE SP-02** — Esperar aprobación del usuario antes de continuar a Phase 3 PLAN.
>
> **Decisión requerida:** Aprobar el mapa de contenido para los 14 archivos (10 nuevos + 4 actualizados) y el orden de ejecución.
