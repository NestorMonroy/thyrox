```yml
type: Reference
title: Hooks — Automatizacion de workflows en Claude Code
category: Cross-phase
version: 1.0
created_at: 2026-04-09 19:30:00
updated_at: 2026-04-09 19:30:00
owner: thyrox (cross-phase)
purpose: Referencia de hooks de Claude Code para configurar comportamiento deterministico. Usar cuando se disenian automatizaciones, PostToolUse reactivos, gates de validacion o sincronizacion de estado.
source: https://code.claude.com/docs/hooks-guide y /hooks
```

# Hooks — Automatizacion de workflows en Claude Code

Los hooks son comandos shell, endpoints HTTP o prompts LLM que se ejecutan automaticamente
en puntos especificos del ciclo de vida de Claude Code. Proveen control deterministico
sobre el comportamiento de Claude — garantizan que ciertas acciones ocurren sin depender
de que el LLM decida ejecutarlas.

---

## Los cuatro tipos de hooks

| Tipo | Campo | Cuando usar |
|------|-------|-------------|
| `command` | `command: "bash script.sh"` | Operaciones shell, sincronizacion de estado, validaciones |
| `http` | `url: "http://..."` | Servicios externos, audit logs compartidos |
| `prompt` | `prompt: "Evalua si..."` | Decisiones que requieren juicio LLM (no logica determinista) |
| `agent` | `prompt: "Verifica que..."` | Verificacion que requiere leer archivos o correr comandos |

---

## Eventos del ciclo de vida

### Eventos de mayor relevancia para thyrox

| Evento | Cuando dispara | Puede bloquear | Uso tipico |
|--------|---------------|----------------|-----------|
| `SessionStart` | Al iniciar o reanudar sesion | No | Cargar contexto, inyectar estado |
| `UserPromptSubmit` | Al enviar un prompt | Si (exit 2) | Filtrar prompts, inyectar contexto adicional |
| `PreToolUse` | Antes de ejecutar herramienta | Si (exit 2 o deny) | Bloquear operaciones destructivas, modificar input |
| `PostToolUse` | Despues de herramienta exitosa | No (ya ocurrio) | Sincronizar estado, validar resultado, notificar |
| `PostToolUseFailure` | Despues de herramienta fallida | No | Log de errores, feedback a Claude |
| `Stop` | Al terminar de responder Claude | Si (exit 2) | Verificar completitud, forzar validacion |
| `PreCompact` | Antes de compactacion | No | Guardar estado critico |
| `PostCompact` | Despues de compactacion | No | Re-inyectar contexto perdido |
| `SessionEnd` | Al terminar sesion | No | Cleanup, git check |

### Eventos adicionales relevantes

| Evento | Cuando dispara | Uso |
|--------|---------------|-----|
| `SubagentStart` | Al lanzar subagente | Inyectar contexto al agente |
| `SubagentStop` | Al terminar subagente | Verificar resultado del agente |
| `ConfigChange` | Al cambiar settings.json | Audit de cambios de configuracion |
| `FileChanged` | Al cambiar un archivo vigilado | Recargar env, sync state |

---

## Estructura de configuracion

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/scripts/mi-script.sh",
            "async": false,
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Matchers por evento

El `matcher` filtra cuando dispara el hook dentro del evento:

- **PreToolUse / PostToolUse / PermissionRequest**: nombre de herramienta (`Bash`, `Write|Edit`, `mcp__.*`)
- **SessionStart**: como inicio (`startup`, `resume`, `clear`, `compact`)
- **PreCompact / PostCompact**: tipo de compactacion (`manual`, `auto`)
- **UserPromptSubmit / Stop**: sin matcher — siempre dispara

### Campo `if` (filtro fino por argumentos)

Filtra no solo por nombre de herramienta sino por sus argumentos:

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(git *)",
      "command": "bash .claude/scripts/check-git.sh"
    }
  ]
}
```

Solo aplica en eventos de herramienta: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`,
`PermissionRequest`, `PermissionDenied`. En otros eventos, un hook con `if` nunca corre.

Ejemplos de sintaxis `if`:
- `Bash(git *)` — cualquier comando git
- `Write(/context/work/*)` — escrituras en WP directory
- `Edit(/*.md)` — edicion de cualquier markdown
- `Bash(rm *)` — cualquier rm

---

## Input/Output del hook

### Input (stdin para command hooks, body para HTTP hooks)

Cada evento envia campos comunes + campos especificos:

```json
{
  "session_id": "abc123",
  "cwd": "/home/user/project",
  "hook_event_name": "PostToolUse",
  "permission_mode": "acceptEdits",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/home/user/project/context/work/2026-04-09-nombre/analysis/file.md",
    "content": "..."
  },
  "tool_response": { "filePath": "...", "success": true }
}
```

Para PreToolUse/PostToolUse: `tool_name` + `tool_input` + `tool_response` (solo Post).

### Exit codes

| Codigo | Efecto |
|--------|--------|
| `0` | Permitir. Si hay JSON en stdout, se procesa. |
| `2` | Bloquear. Stderr se envia a Claude como feedback. |
| Otro | Error no bloqueante. Ejecucion continua. |

Solo `exit 2` bloquea — `exit 1` NO bloquea (comportamiento contrario a convencion Unix).

### Salida JSON estructurada (exit 0 + stdout JSON)

Para control fino, salir con exit 0 e imprimir JSON:

```json
{ "decision": "block", "reason": "Tests no pasan" }
```

Campos universales:
- `continue: false` — Claude para completamente
- `stopReason` — mensaje al usuario cuando `continue: false`
- `suppressOutput: true` — omite stdout del debug log
- `systemMessage` — advertencia al usuario

---

## Patrones de uso para thyrox

### PostToolUse para sincronizar estado (Automatico-B)

El patron reactivo: cuando Claude escribe un archivo, el hook sincroniza estado.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/scripts/sync-wp-state.sh"
          }
        ]
      }
    ]
  }
}
```

El script lee `tool_input.file_path` de stdin y decide si sincronizar.

### Stop hook para validacion pre-termino

Verificar que todos los checkboxes del task-plan esten completos antes de que Claude pare:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verifica que todas las tareas en *-task-plan.md tienen [x]. Si hay [ ] pendientes, retorna ok:false con las tareas faltantes. $ARGUMENTS",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

### PreToolUse para bloquear operaciones destructivas

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm -rf *)",
            "command": "echo 'rm -rf bloqueado por hook' >&2 && exit 2"
          }
        ]
      }
    ]
  }
}
```

### Async hooks para tareas de fondo

Para operaciones lentas (tests, builds) que no deben bloquear a Claude:

```json
{
  "type": "command",
  "command": "bash .claude/scripts/run-tests.sh",
  "async": true,
  "timeout": 120
}
```

Los async hooks no pueden bloquear (la accion ya ocurrio). Su output se entrega en el
siguiente turno de conversacion como `systemMessage` o `additionalContext`.

---

## Donde configurar hooks

| Ubicacion | Scope | Compartible |
|-----------|-------|-------------|
| `~/.claude/settings.json` | Todos los proyectos | No |
| `.claude/settings.json` | Proyecto actual | Si (commiteable) |
| `.claude/settings.local.json` | Proyecto actual | No (gitignored) |
| Frontmatter de SKILL | Mientras el skill esta activo | Si |
| Frontmatter de Agent | Mientras el agente corre | Si |

### Hooks en SKILL frontmatter

Los hooks de Skills/Agents solo estan activos mientras el componente esta activo.
El campo `once: true` garantiza que el hook corre solo una vez por sesion:

```yaml
hooks:
  - event: UserPromptSubmit
    once: true
    type: command
    command: "bash .claude/scripts/set-phase.sh 'Phase 1'"
```

---

## Limitaciones importantes

1. **Hooks command no pueden invocar comandos slash** (`/workflow-execute`, etc.)
2. **Timeout por defecto: 10 minutos** para command hooks; 30s para prompt; 60s para agent
3. **PostToolUse no puede deshacer** la accion (ya ocurrio)
4. **PermissionRequest no dispara** en modo no-interactivo (`-p`)
5. **Bash(safe-cmd *) no permite** `safe-cmd && otro` — Claude Code trata operadores shell
   como comandos separados
6. **Checkpointing no captura cambios de bash** — cambios hechos por scripts de hooks
   no son revertibles via `/rewind` (ver reference checkpointing.md)

---

## Precedencia de decisiones

Cuando multiples hooks del mismo evento retornan decisiones:
`deny` > `defer` > `ask` > `allow`

El mas restrictivo gana. Las `deny` rules de settings.json tienen precedencia sobre
`allow` de hooks — un hook no puede loosen restricciones mas alla de lo que las reglas
permiten, solo endurecerlas.

---

## Ver tambien

- [permission-model](permission-model.md) — Plano A (gates SKILL) vs Plano B (permisos herramienta)
- [checkpointing](checkpointing.md) — Interaccion entre hooks bash y rewind
- [claude-code-components](claude-code-components.md) — Skills, Agents, Context
- `.claude/settings.json` — Configuracion vigente del proyecto
