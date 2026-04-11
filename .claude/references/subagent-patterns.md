# Subagent Patterns — Aislamiento de Contexto y Delegación

Patrones arquitectónicos para usar subagentes correctamente. Este archivo cubre el *cómo* usar subagentes para resultados concretos — no el *cuándo* elegir subagente vs skill (ver [skill-vs-agent](skill-vs-agent.md)).

## Principio fundamental: aislamiento de contexto

Cada subagente recibe un **context window fresco**, sin historial de la conversación principal. Solo recibe el contexto relevante para su tarea. Los resultados se **destilan** de vuelta al agente padre.

```
Main agent (contexto completo)
    │
    ├─ Agent(task-executor) ─── Edit × N → tool results aislados
    │                                        │
    │                        resumen ←───────┘
    │
    └─ [usuario ve solo el resumen]
```

**Consecuencia clave:** Si Claude llama `Edit × N` directamente en el contexto principal, el usuario ve N mensajes de `"The file has been updated successfully."`. Si los mismos Edits ocurren dentro de un subagente, el usuario solo ve el resumen que el subagente devuelve al padre.

## Patrón 1 — Context Pollution Prevention

**Problema:** Operaciones intensivas en tools (Edit, Bash) llenan el contexto con mensajes de éxito triviales.

**Solución:** Delegar a un subagente.

```
❌ Mal:  Claude → Edit × N  → N mensajes de éxito en pantalla
✅ Bien: Claude → Agent(task-executor) → Edit × N → 1 resumen al padre
```

El agente `task-executor` en THYROX ya implementa este patrón — ejecuta edits en su contexto aislado y reporta solo el resultado.

**Cuándo usar:** Implementaciones que modifican 3+ archivos, actualizaciones masivas de documentación, generación de código con múltiples writes.

## Patrón 2 — Worktree Isolation

El subagente trabaja en su propia rama git, sin afectar el working tree principal.

```yaml
---
name: feature-builder
isolation: worktree
description: Implementa features en un worktree git aislado
tools: Read, Write, Edit, Bash, Grep, Glob
---
```

**Comportamiento:**
- Si el subagente no hace cambios → worktree se limpia automáticamente
- Si hay cambios → devuelve el path del worktree y el nombre de la rama al padre

**Cuándo usar:** Experimentos que pueden fallar, features paralelas, probar enfoques alternativos sin arriesgar el trabajo actual.

## Patrón 3 — Persistent Memory

El subagente acumula conocimiento entre sesiones vía `MEMORY.md`.

```yaml
---
name: researcher
memory: user      # user | project | local
description: Investigador con memoria persistente
---

Consulta tu MEMORY.md al inicio de cada sesión para recordar contexto previo.
```

| Scope | Directorio | Caso de uso |
|-------|-----------|-------------|
| `user` | `~/.claude/agent-memory/<name>/` | Preferencias personales en todos los proyectos |
| `project` | `.claude/agent-memory/<name>/` | Conocimiento del proyecto compartido con el equipo |
| `local` | `.claude/agent-memory-local/<name>/` | Conocimiento local no commiteado |

**Comportamiento:** Las primeras 200 líneas de `MEMORY.md` se cargan automáticamente en el system prompt del subagente. Las tools Read, Write, Edit se habilitan automáticamente para que el agente gestione su memoria.

**Cuándo usar:** Agentes que construyen contexto incremental (rastreador de deuda técnica, investigador de codebase, agente de onboarding).

## Patrón 4 — Background Subagents

El subagente corre sin bloquear la conversación principal. **Hay dos planos independientes — no confundirlos.**

### Plano A — Agente declara compatibilidad (frontmatter)

```yaml
---
name: long-runner
background: true
description: Análisis de larga duración en background
---
```

`background: true` en el frontmatter declara que este agente es apto para ejecución async. Efecto: auto-deniega cualquier permiso que no esté pre-aprobado al correr en background. Ninguno de los agentes actuales de THYROX usa este campo — es opcional.

### Plano B — Orquestador invoca en background (tool call)

El orquestador pasa `run_in_background: true` al Agent tool, independientemente de si el agente tiene `background: true` en su frontmatter:

```
Agent({
  description: "...",
  run_in_background: true,
  prompt: "Analiza cobertura Phase 5→6 del WP activo"
})
```

**Output del sistema al lanzar:**

```
Async agent launched successfully.
agentId: abc123  (internal ID — no mencionar al usuario.
                  Usar SendMessage con to: 'abc123' para continuar.)
output_file: /tmp/claude-0/.../tasks/abc123.output
Do not duplicate this agent's work — avoid working with the same
files or topics it is using. Continue with other work or respond
to the user instead.
```

**Reglas de operación obligatorias:**

| Regla | Razón |
|-------|-------|
| **NO leer `output_file`** | Es el JSONL completo del transcript — desborda el context window |
| **NO duplicar trabajo** | Evitar tocar los mismos archivos que el agente en background |
| **NO hacer sleep/poll** | El sistema notifica automáticamente al completar |
| **Continuar con otra tarea** | El propósito del background es paralelismo — usarlo |

**Shortcuts interactivos:**
- `Ctrl+B` — Poner en background un subagente que está corriendo síncronamente
- `Ctrl+F` (dos veces) — Matar todos los agentes en background

**Cuándo usar `run_in_background: true`:** Análisis largos (deep-review, auditorías), builds, test suites, research paralela — cualquier tarea ≥ 30s que no bloquea el hilo principal.

**Cuándo NO:** Si necesitas el resultado antes de continuar (el agente padre depende del output), usar invocación síncrona.

---

## Patrón 5 — Resumable Agents

El subagente puede continuar una conversación previa con contexto completo. Se integra con el Patrón 4: los agentes lanzados en background son continuables vía `SendMessage`.

### Continuar un agente en background (misma sesión)

```
# El agente ya fue lanzado con run_in_background: true
# Notificación de completado llega automáticamente
# Para continuar o enviar trabajo adicional antes de que termine:

SendMessage(to: 'abc123', message: "Analiza también el módulo de autorización")
```

El `agentId` devuelto al lanzar es el token de continuación — guardarlo si se quiere reanudar.

### Continuar en sesión posterior

```bash
# Primera invocación (sesión A)
> Use the code-analyzer agent to start reviewing the auth module
# Returns agentId: "abc123"

# Continuar más tarde (sesión B)
> Resume agent abc123 and analyze the authorization logic as well
```

Los transcripts se guardan en `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`.

**Cuándo usar:** Investigaciones largas en múltiples sesiones, refinamiento iterativo sin perder contexto, continuar agentes background con trabajo adicional.

## Patrón 6 — Agent Chaining

El output de un subagente alimenta a otro en secuencia.

```bash
> First use the code-analyzer subagent to find performance issues,
  then use the optimizer subagent to fix them
```

**Cuándo usar:** Workflows en dos fases (análisis → implementación), separación de roles (reviewer → fixer), pipelines de transformación.

## Patrón 7 — Agent Teams (Experimental)

Múltiples instancias de Claude Code trabajando en paralelo con coordinación via mailbox.

```
Team Lead (coordina)
    │
    ├── [Shared Task List + Dependency tracking]
    │
    ├── Teammate 1 (propio context window) ──┐
    ├── Teammate 2 (propio context window) ──┤ → Mailbox (mensajes inter-agente)
    └── Teammate 3 (propio context window) ──┘
```

**Diferencia vs Subagentes:**

| Aspecto | Subagentes | Agent Teams |
|---------|-----------|-------------|
| Delegación | Padre espera resultado | Teammates trabajan independientemente |
| Contexto | Fresh per subtask, results distilled | Cada teammate mantiene su propio context |
| Comunicación | Solo resultados al padre | Mensajes directos entre teammates via mailbox |
| Sesión | Resumable | No resumable (in-process) |
| Mejor para | Subtasks bien definidos | Trabajo complejo con comunicación inter-agente |

**Habilitar:**
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

**Tamaño óptimo:** 3-5 teammates. Tareas de 5-15 minutos cada una. Asignar archivos/directorios distintos por teammate para evitar conflictos.

**Hook events para teams:** `TeammateIdle` (teammate sin trabajo pendiente), `TaskCompleted` (tarea marcada completa).

## Patrón 8 — Restrict Spawnable Subagents

Controla qué subagentes puede delegar un subagente dado:

```yaml
---
name: coordinator
description: Coordina trabajo entre agentes especializados
tools: Agent(worker, researcher), Read, Bash
---
```

El `coordinator` solo puede delegar a `worker` y `researcher`. No puede crear otros subagentes.

**Cuándo usar:** Arquitecturas con roles definidos, prevenir escalada de privilegios en sistemas multi-agente.

## Invocación de subagentes

| Método | Cuándo | Ejemplo |
|--------|--------|---------|
| **Automático** | Claude elige basado en descripción | Claude ve tarea de code review → invoca code-reviewer |
| **Explícito** | Usuario pide específicamente | `"Use the task-executor agent to..."` |
| **@-mention** | Garantiza invocación específica | `@"code-reviewer (agent)" review auth module` |
| **--agent flag** | Toda la sesión usa ese agente | `claude --agent code-reviewer` |
| **--agents JSON** | Define agentes para la sesión | `claude --agents '{"reviewer": {...}}'` |

**Para invocación automática:** Incluir "use PROACTIVELY" o "MUST BE USED" en la `description` del agente.

## Cuándo NO usar subagentes

| Escenario | Por qué no |
|-----------|-----------|
| Review rápido de código | Overhead innecesario, latencia |
| Tarea de un solo paso | Agrega complejidad sin beneficio |
| Context compartido necesario | Subagente recibe clean slate |
| Herramientas limitadas del parent | Subagente sin acceso si no se configuran |

## Configuración de tools en subagentes

```yaml
# Opción 1: Heredar todos los tools (omitir el campo)
---
name: full-access-agent
description: Agente con acceso completo
---

# Opción 2: Tools específicos
---
name: read-only-agent
tools: Read, Grep, Glob
---

# Opción 3: Bash restringido a comandos específicos
---
name: test-runner
tools: Read, Bash(npm test:*), Bash(pytest:*)
---
```

## Checklist de diseño

- [ ] El subagente tiene UNA responsabilidad clara
- [ ] La `description` incluye "use PROACTIVELY" si se quiere invocación automática
- [ ] Solo se otorgan los tools necesarios para su tarea
- [ ] Si necesita estado persistente → usar `memory` field
- [ ] Si puede correr sin bloquear → considerar `background: true` en frontmatter (declara compatibilidad) o `run_in_background: true` en la invocación (activa async inmediatamente). Son planos independientes — ver Patrón 4.
- [ ] Si hay riesgo de conflictos git → usar `isolation: worktree`

## Referencias

- [04-subagents/README.md](/tmp/reference/claude-howto/04-subagents/README.md) — Documentación oficial de subagentes
- [skill-vs-agent](skill-vs-agent.md) — Cuándo crear SKILL vs agente nativo
- [hook-output-control](hook-output-control.md) — Por qué PostToolUse no puede suprimir tool results
- [agent-spec](agent-spec.md) — Spec formal de campos de agentes (obligatorios/prohibidos)
- [edit-tool-silent-mode-finding](../context/work/2026-04-11-10-52-25-thyrox-commands-namespace/analysis/edit-tool-silent-mode-finding.md) — Investigación de TD-037 (RESUELTO)
