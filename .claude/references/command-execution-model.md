```yml
type: Reference
category: Claude Code Platform — Command Architecture
version: 1.0
purpose: Flujo de ejecución de commands, responsabilidades por componente, y patrones fat vs thin
source: claude-howto deep-review (01-slash-commands, 03-skills, 04-subagents, 07-plugins)
updated_at: 2026-04-11 20:41:54
```

# Command Execution Model — Responsabilidades y Flujo

Referencia de cómo se ejecutan los commands en Claude Code, qué responsabilidad
tiene cada componente, y cuándo usar cada patrón.

> **Relación con otros references:**
> - `skill-vs-agent.md` — cuándo crear un skill vs un agente (decisión estática de diseño)
> - `tool-execution-model.md` — flujos de Edit/Write y permission model
> - `plugins.md` — estructura de plugins y distribución
> Este document cubre: qué ocurre en runtime cuando el usuario escribe `/command`.

---

## Convergencia Commands = Skills (post-merge)

> Fuente: `01-slash-commands/README.md:17`

"Custom slash commands have been merged into skills. Files in `.claude/commands/` still
work, but skills (`.claude/skills/`) are now the recommended approach."

**Implicación práctica:** Un archivo en `.claude/commands/name.md` y un directorio
`.claude/skills/name/SKILL.md` son equivalentes en invocación — ambos responden a `/name`.

**Regla de precedencia:** Si ambos existen para el mismo nombre, **el skill gana**.
Los commands son el formato legacy; los skills son el formato actual.

---

## Flujo de Ejecución — Paso a Paso

Cuando el usuario escribe `/optimize` (o `/thyrox:analyze`):

```mermaid
sequenceDiagram
    participant U as Usuario
    participant CC as Claude Code
    participant FS as Filesystem
    participant Shell as Shell
    participant LLM as Claude (LLM)

    U->>CC: /optimize
    CC->>FS: Busca en .claude/skills/ (primero)
    FS-->>CC: optimize/SKILL.md
    Note over CC: Si no hay skill, busca .claude/commands/

    CC->>CC: Parse frontmatter (name, description,<br/>allowed-tools, context, model, argument-hint)

    CC->>Shell: Ejecuta !`git status` etc.<br/>(sustituciones de backtick con !)
    Shell-->>CC: Output de comandos

    CC->>CC: Sustituye $ARGUMENTS, $N,<br/>${CLAUDE_SESSION_ID}, ${CLAUDE_SKILL_DIR}

    CC->>LLM: Envía: [frontmatter body + sustituciones aplicadas]
    LLM->>LLM: Ejecuta instrucciones usando tools
    LLM-->>U: Resultado
```

> Fuente: `01-slash-commands/README.md:326-341`

### Sustituciones disponibles en el body del command/skill

| Variable | Valor |
|----------|-------|
| `$ARGUMENTS` | Todo lo que el usuario escribió después del nombre del comando |
| `$1`, `$2`, `$N` | Argumentos posicionales |
| `${CLAUDE_SESSION_ID}` | ID único de la sesión actual |
| `${CLAUDE_SKILL_DIR}` | Path absoluto al directorio del skill |
| `` !`comando bash` `` | Ejecutado en shell; Claude ve el output, no el comando |

---

## Responsabilidades por Componente

```mermaid
flowchart TB
    subgraph "Nivel 1 — Entry Point (visible al usuario)"
        CMD_SA["Slash Command standalone\n.claude/commands/name.md\n→ /name\n\nResponsabilidad:\nLógica inline completa\n(fat) o routing (thin)"]
        CMD_PL["Plugin Command\nplugin/commands/name.md\n→ /plugin:name\n\nResponsabilidad:\nThin wrapper —\npunto de entrada del plugin"]
    end

    subgraph "Nivel 2 — Expertise inyectable (on-demand)"
        SK[".claude/skills/name/SKILL.md\n→ /name (o via Skill tool)\n\nResponsabilidad:\nInstrucciones metodológicas\nreutilizables entre proyectos"]
    end

    subgraph "Nivel 3 — Ejecutores autónomos (aislados)"
        AG[".claude/agents/name.md\n(auto-invocado por LLM)\n\nResponsabilidad:\nEspecialista autónomo\ncon context window propio"]
    end

    CMD_SA -->|"puede delegar a"| SK
    CMD_SA -->|"puede delegar a"| AG
    CMD_PL -->|"routing a"| AG
    CMD_PL -->|"routing a"| SK
    SK -->|"context: fork →"| AG
```

| Componente | Lógica propia | Context aislado | Invocación usuario | Invocación auto-LLM |
|------------|:-------------:|:---------------:|:------------------:|:-------------------:|
| Command standalone | Sí (fat) o no (thin) | No | Sí (`/name`) | No |
| Plugin command | Minimal (thin) | No | Sí (`/plugin:name`) | No |
| Skill | Instrucciones declarativas | Con `context: fork` | Sí (`/name`) | Sí |
| Native Agent | System prompt + tools | Siempre | Vía Agent tool | Sí (auto-routing) |

> Fuente: `04-subagents/README.md:1104`

---

## Dos Patrones de Command

### Patrón A — Fat Command (lógica propia)

El command contiene su propio algoritmo completo. No delega a ningún skill ni agente.

**Cuándo usar:**
- Tarea simple y autocontenida
- Pocos pasos, output no verboso
- No necesita reutilización en otros contextos
- No requiere context aislado

**Ejemplo real** (`01-slash-commands/push-all.md`):
```markdown
---
name: Push All
description: Safely stages, commits, and pushes all changes
allowed-tools: Bash, Read
---

## Steps
1. Run: !`git status` and !`git diff HEAD`
2. STOP if you detect .env*, *.key or *_API_KEY with real values
3. Generate commit message following Conventional Commits
4. Ask: "Proceed with push? (yes/no)" — WAIT for explicit 'yes'
5. git add -A && git commit -m "..." && git push
6. Handle errors: [auth failure → instructions] [conflict → rebase] [rejected → explain]
```

Toda la lógica (safety checks, confirmación, error handling) vive en el command.

### Patrón B — Thin Wrapper (routing)

El command articula intención de alto nivel. La lógica real vive en agents o skills del plugin.

**Cuándo usar:**
- Plugin commands (entry point → agentes especializados)
- Commands que invocan skills metodológicos complejos
- Cuando la lógica debe ser reutilizable en otros contextos
- Cuando el output sería verboso y pollutaría el context

**Ejemplo real** (`07-plugins/pr-review/commands/review-pr.md`):
```markdown
---
name: Review PR
description: Start comprehensive PR review with security and testing checks
---

# PR Review
1. Security analysis
2. Test coverage verification
3. Documentation updates
4. Code quality checks
5. Performance impact assessment
```

La lógica real la ejecutan los agentes `security-reviewer`, `test-checker`, `performance-analyzer`
del mismo plugin.

---

## Dos Formas de Delegación desde un Command

### Delegación explícita — `context: fork` en el skill

```yaml
# .claude/skills/mi-skill/SKILL.md
---
context: fork
agent: Explore
---
Investiga $ARGUMENTS exhaustivamente...
```

- El body del skill se convierte en el **task prompt de un subagente**
- El campo `agent` especifica el tipo: `Explore`, `Plan`, `general-purpose`, custom
- El context está garantizadamente aislado — hardcoded en el frontmatter
- El command NO puede evitar el fork — si el skill lo tiene, siempre forkea

```mermaid
flowchart LR
    CMD["Command\n/mi-comando"] --> SK["Skill\n(context: fork)"]
    SK --> SUB["Subagente\n(agent: Explore)"]
    SUB -->|"resultado"| CTX["Context principal"]
```

### Delegación probabilística — routing por description del agente

```markdown
# commands/deploy.md
Despliega la aplicación siguiendo el deployment checklist completo...
```

```yaml
# .claude/agents/deployment-specialist.md
description: Maneja deploys siguiendo checklist. Usar cuando se necesita deploy a producción.
```

- El LLM lee el command content, infiere la intención
- Busca agentes cuya `description` coincida con la intención
- Decide autónomamente delegar al `deployment-specialist`
- El routing puede fallar si las descriptions son ambiguas

```mermaid
flowchart LR
    CMD["Command\n/deploy"] -->|"LLM interpreta intención"| LLM["Claude\n(routing decision)"]
    LLM -->|"description match"| AG["deployment-specialist\nagent"]
    AG -->|"resultado"| CTX["Context principal"]

    style LLM fill:#fff3cd
```

**Diferencia clave:** `context: fork` es determinista. El routing por description es probabilístico — depende de que las descriptions sean claras y no ambiguas.

---

## Plugin Commands vs Commands Standalone

### Namespace

| Tipo | Archivo | Comando resultante |
|------|---------|-------------------|
| Standalone | `.claude/commands/analyze.md` | `/analyze` |
| Plugin | `plugin/commands/analyze.md` + `plugin.json::name="thyrox"` | `/thyrox:analyze` |

El `:` es **exclusivo de plugins**. No existe "project namespace" para commands standalone.

### Responsabilidad

| Aspecto | Standalone | Plugin command |
|---------|-----------|----------------|
| Lógica propia | Sí (fat) o no (thin) | Siempre thin — routing a agentes/skills del plugin |
| Distribución | Manual (copiar archivos) | `/plugin install name` |
| Context isolation | Solo via `context: fork` | Via agentes del plugin |

### Restricciones de seguridad en subagentes de plugin

Los subagentes declarados **dentro de un plugin** (`plugin/agents/*.md`) tienen campos prohibidos:

```
❌ hooks       — no pueden definir lifecycle hooks
❌ mcpServers  — no pueden configurar MCP servers
❌ permissionMode — no pueden override el modelo de permisos
```

Los agentes standalone en `.claude/agents/` no tienen estas restricciones.

> Fuente: `07-plugins/README.md:709-715`, `04-subagents/README.md:730-738`

---

## Árbol de Decisión: ¿Qué tipo de componente crear?

```mermaid
flowchart TD
    Q1{¿Necesitas namespace\n/prefix:command?}
    Q1 -->|Sí| PL[Plugin Command\nthin wrapper]
    Q1 -->|No| Q2{¿Lógica compleja\no reutilizable\nentre proyectos?}

    Q2 -->|Compleja + reutilizable| SK[Skill\n.claude/skills/]
    Q2 -->|Simple + project-specific| Q3{¿Necesita\ncontext aislado?}

    Q3 -->|Sí| AG[Native Agent\n.claude/agents/]
    Q3 -->|No| CMD[Command standalone\n.claude/commands/\nFat pattern]
```

---

## Ejemplo THYROX — Cadena completa de `/thyrox:analyze`

```mermaid
sequenceDiagram
    participant U as Usuario
    participant CC as Claude Code
    participant PL as Plugin (plugin.json)
    participant CMD as commands/analyze.md
    participant SK as workflow-analyze/SKILL.md

    U->>CC: /thyrox:analyze
    CC->>PL: Busca plugin con name="thyrox"
    PL-->>CC: Encontrado en .claude-plugin/plugin.json
    CC->>CMD: Lee commands/analyze.md
    CMD-->>CC: "Invoca el skill workflow-analyze"
    CC->>SK: Carga .claude/skills/workflow-analyze/SKILL.md
    SK-->>CC: Instrucciones Phase 1 ANALYZE
    CC->>U: Ejecuta Phase 1 paso a paso
```

El command (`analyze.md`) tiene responsabilidad de **descubribilidad y routing**.
El skill (`workflow-analyze/SKILL.md`) tiene responsabilidad de **metodología y ejecución**.

---

## Best Practices

> Fuente: `01-slash-commands/README.md:515-519`

```
✅ DO:   Keep commands focused on single task
✅ DO:   Use $ARGUMENTS for parameterization
✅ DO:   Add argument-hint in frontmatter for discoverability
❌ DON'T: Build complex logic that should be in a skill/agent
❌ DON'T: Duplicate logic that already exists in a skill
❌ DON'T: Create commands for one-off tasks (use chat instead)
```

---

## Referencias Relacionadas

- [`skill-vs-agent.md`](skill-vs-agent.md) — decisión de diseño: cuándo crear cada tipo
- [`plugins.md`](plugins.md) — estructura de plugins, distribución, manifest
- [`tool-execution-model.md`](tool-execution-model.md) — flujos Edit/Write y permission model
- [`subagent-patterns.md`](subagent-patterns.md) — context isolation, worktree, background agents
- [`agent-spec.md`](agent-spec.md) — spec formal de agentes nativos (campos, naming)
- [`claude-code-components.md`](claude-code-components.md) — referencia oficial de todos los campos
