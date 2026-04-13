---
type: Referencia
created_at: 2026-04-13
scope: Claude Code — Advanced Features
---

# Advanced Features — Claude Code

Features avanzadas de Claude Code: Planning Mode, Extended Thinking, Auto Mode, Worktrees, Sandboxing, Agent Teams, Remote Control, Web Sessions, Channels, Voice, Task List.

Para tareas programadas y background tasks, ver [scheduled-tasks](scheduled-tasks.md).
Para todos los flags y env vars, ver [cli-reference](cli-reference.md).

---

## Planning Mode

Planning mode es un enfoque de dos fases: Claude primero analiza la tarea y produce un plan detallado; solo después de aprobación ejecuta.

### Activación

```bash
# Flag CLI — inicio de sesión en plan mode
claude --permission-mode plan

# Slash command dentro del REPL
/plan Implement user authentication system

# Alias de modelo: Opus planifica, Sonnet ejecuta
claude --model opusplan "design and implement the new API"

# Como default en settings
# "permissions": { "defaultMode": "plan" }
```

Keyboard: `Shift+Tab` cicla entre permission modes (incluye `plan`). `Ctrl+G` abre el plan actual en editor externo.

`/ultraplan <prompt>` — workflow end-to-end: Claude redacta el plan, lo abre en el browser para revisión, luego ejecuta remotamente o devuelve al terminal local.

### Cuándo usar

| Usar | No usar |
|------|---------|
| Refactoring multi-archivo complejo | Bug fixes simples |
| Nuevas features con múltiples módulos | Cambios de formato |
| Cambios arquitectónicos | Edits de un solo archivo |
| Migraciones de base de datos | Queries rápidas |
| Rediseños de API | |

### Integración con THYROX Phase 1 ANALYZE

Planning Mode y Phase 1 ANALYZE son complementarios pero distintos:

- **Phase 1 ANALYZE** — Claude entiende el problema antes de planificar (THYROX methodology)
- **Planning Mode** — Claude produce un plan detallado y espera aprobación antes de ejecutar (Claude Code feature)

Recomendación: Activar `--permission-mode plan` al inicio de FASEs complejas. El planning mode alinea con el principio THYROX "ANALYZE first".

### Limitaciones

- En `plan` mode, Claude solo puede leer archivos — no puede editar ni ejecutar comandos
- El plan es un artefacto de conversación, no un archivo persistente (usar `Ctrl+G` para exportarlo)
- `--system-prompt-file` no está disponible en modo interactivo

---

## Extended Thinking

Extended Thinking es el modo de razonamiento profundo donde Claude descompone el problema, evalúa enfoques alternativos y razona edge cases antes de responder.

### Activación

```bash
# Flag CLI
claude --effort high "complex architectural review"

# Slash command dentro del REPL
/effort high

# Env vars
export MAX_THINKING_TOKENS=16000
export CLAUDE_CODE_EFFORT_LEVEL=high   # low | medium | high | max
```

Keyboard: `Option+T` / `Alt+T` — toggle extended thinking. `Ctrl+O` — ver el razonamiento (verbose mode).

Beta header para thinking entre tool calls:
```bash
claude --betas interleaved-thinking "complex multi-step task"
```

### Niveles de esfuerzo (Opus 4.6)

| Nivel | Símbolo | Descripción |
|-------|---------|-------------|
| `low` | ○ | Razonamiento mínimo, más rápido |
| `medium` | ◐ | Balanceado (default) |
| `high` | ● | Razonamiento profundo |
| `max` | ★ | Máximo — solo Opus 4.6 |

Los modelos Sonnet 4.6 y Haiku 4.5 tienen budget fijo de hasta 31,999 tokens. El keyword `"ultrathink"` en el prompt activa razonamiento profundo independientemente del nivel.

### Cuándo vale el costo

| Vale | No vale |
|------|---------|
| Decisiones arquitectónicas | Queries simples |
| Debugging de bugs difíciles | Formatear código |
| Diseño de sistemas con trade-offs complejos | Cambios de configuración triviales |
| Análisis de seguridad exhaustivo | Preguntas con respuesta directa |

### Relación con stream idle timeout

Extended thinking puede generar períodos de silencio prolongado (Claude "piensa" sin producir output visible). Esto puede disparar el timeout de stream inactivo:

```bash
# Aumentar timeout cuando se usa extended thinking con --effort high/max
export CLAUDE_STREAM_IDLE_TIMEOUT_MS=120000   # 2 minutos (default: 10000)
```

Ver [cli-reference](cli-reference.md#variables-de-entorno) para la referencia completa de `CLAUDE_STREAM_IDLE_TIMEOUT_MS`.

---

## Auto Mode

Auto Mode (Research Preview, desde marzo 2026) usa un clasificador de seguridad en background que revisa cada acción antes de ejecutarla. Permite autonomía máxima con guardrails.

### Requisitos

- **Plan requerido:** Team, Enterprise, o API — no disponible en Pro/Max
- **Modelos:** Claude Sonnet 4.6 o Opus 4.6
- **Provider:** Solo Anthropic API (no Bedrock, Vertex, ni Foundry)
- **Costo adicional:** El clasificador corre en Claude Sonnet 4.6

### Activación

```bash
# Desbloquear auto mode para la sesión
claude --enable-auto-mode
# Luego Shift+Tab para ciclar hasta "auto"

# O directamente
claude --permission-mode auto

# Como default en settings
# "permissions": { "defaultMode": "auto" }

# Ver reglas default en JSON
claude auto-mode defaults
```

### Cómo funciona el clasificador

Orden de evaluación para cada acción:

1. **Allow/deny rules explícitas** — se verifican primero
2. **Reads y edits** — auto-aprobados sin clasificador
3. **Clasificador Sonnet 4.6** — evalúa la acción
4. **Fallback** — vuelve a preguntar al usuario si hay 3 bloqueos consecutivos o 20 totales

### Acciones bloqueadas por default

| Acción | Ejemplo |
|--------|---------|
| Pipe-to-shell installs | `curl \| bash` |
| Envío de datos sensibles al exterior | API keys, credentials via red |
| Deploys a producción | Comandos con target production |
| Borrado masivo | `rm -rf` en directorios grandes |
| Cambios de IAM | Modificaciones de permisos y roles |
| Force push a main | `git push --force origin main` |

### Acciones permitidas por default

| Acción | Ejemplo |
|--------|---------|
| Operaciones de archivos locales | Read, Write, Edit en el proyecto |
| Instalar dependencias declaradas | `npm install`, `pip install` desde manifests |
| HTTP de solo lectura | `curl` para fetch de documentación |
| Push a la rama actual | `git push origin feature-branch` |

### Alternativa sin Team plan

El script `09-advanced-features/setup-auto-mode-permissions.py` siembra `~/.claude/settings.json` con reglas conservativas que emulan auto mode sin el clasificador:

```bash
# Preview sin cambios
python3 setup-auto-mode-permissions.py --dry-run

# Aplicar baseline conservativo
python3 setup-auto-mode-permissions.py

# Añadir capacidades opcionales
python3 setup-auto-mode-permissions.py --include-edits --include-tests
python3 setup-auto-mode-permissions.py --include-git-write --include-packages
```

---

## Git Worktrees

Worktrees permiten aislar trabajo en ramas git paralelas sin stashing ni cambios de branch.

### Activación

```bash
# Iniciar en worktree aislado
claude --worktree
# o
claude -w
```

Los worktrees se crean en `<repo>/.claude/worktrees/<name>`.

### Configuración avanzada

```json
{
  "worktree": {
    "sparsePaths": ["packages/my-package", "shared/"]
  }
}
```

`sparsePaths` activa sparse-checkout — útil en monorepos para reducir uso de disco y tiempo de clonado.

### Tools y hooks de worktree

| Item | Descripción |
|------|-------------|
| `ExitWorktree` | Tool para salir y limpiar el worktree actual |
| `WorktreeCreate` | Hook event al crear worktree |
| `WorktreeRemove` | Hook event al eliminar worktree |

Auto-cleanup: si no se hacen cambios en el worktree, se limpia automáticamente al terminar la sesión.

### Integración con agentes THYROX

En `.claude/agents/*.md`, el campo `isolation: worktree` instruye al agente a trabajar en worktree dedicado. Ver [agent-spec](agent-spec.md) para la especificación completa.

### Casos de uso

- Feature branches paralelas sin afectar el working tree principal
- Experimentos desechables en ambiente aislado
- Tests en aislamiento
- Sparse-checkout de paquetes específicos en monorepos

---

## Sandboxing

Sandboxing provee aislamiento OS-level de filesystem y red para comandos Bash. Complementa las permission rules con una capa de seguridad adicional.

### Activación

```bash
claude --sandbox      # Habilitar
claude --no-sandbox   # Deshabilitar (default)

# Dentro del REPL
/sandbox
```

### Configuración

```json
{
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "filesystem": {
      "allowWrite": ["/Users/me/project"],
      "allowRead": ["/Users/me/project", "/usr/local/lib"],
      "denyRead": ["/Users/me/.ssh", "/Users/me/.aws"]
    },
    "enableWeakerNetworkIsolation": true
  }
}
```

| Setting | Descripción |
|---------|-------------|
| `sandbox.enabled` | Habilitar/deshabilitar |
| `sandbox.failIfUnavailable` | Fallar si sandboxing no puede activarse |
| `sandbox.filesystem.allowWrite` | Paths permitidos para escritura |
| `sandbox.filesystem.allowRead` | Paths permitidos para lectura |
| `sandbox.filesystem.denyRead` | Paths denegados para lectura |
| `sandbox.enableWeakerNetworkIsolation` | Aislamiento de red más débil (requerido en macOS) |

**Nota macOS:** El aislamiento completo de red no está disponible en macOS. Usar `enableWeakerNetworkIsolation: true` para restricciones parciales.

### Cuándo activar

- Ejecutar código generado o no confiable
- Prevenir modificaciones accidentales fuera del proyecto
- Restringir acceso de red durante tareas automatizadas
- Remote control sessions con `claude remote-control --sandbox`

---

## Agent Teams

Agent Teams (experimental) habilita múltiples instancias de Claude Code colaborando en una tarea. Deshabilitado por default.

### Activación

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

O en settings JSON:
```json
{ "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
```

### Cómo funciona

- Un **team lead** coordina la tarea global y delega subtareas a teammates
- Cada **teammate** trabaja independientemente con su propio context window
- Una **task list compartida** habilita auto-coordinación entre miembros
- Los teammates se definen en `.claude/agents/` o con `--agents` flag

### Modos de display

```bash
# Split panes de tmux (requiere tmux o iTerm2)
claude --teammate-mode tmux

# Mismo proceso terminal (default)
claude --teammate-mode in-process

# Automático — selecciona el mejor modo
claude --teammate-mode auto
```

### Diferencia con sub-agents normales

| Agent Teams | Sub-agents normales |
|-------------|---------------------|
| Múltiples instancias Claude Code | Tool calls `Agent()` dentro de una sesión |
| Cada teammate tiene su proceso | Subagentes corren en el mismo proceso |
| Coordinación vía task list compartida | Coordinación vía return values |
| Experimental — puede cambiar | Estable |

Ver [subagent-patterns](subagent-patterns.md) para patrones de sub-agents normales.

---

## Remote Control

Remote Control permite continuar una sesión Claude Code local desde el teléfono, tablet o cualquier browser. La sesión sigue corriendo en tu máquina — nada se mueve a la nube.

**Disponibilidad:** Pro, Max, Team, Enterprise (v2.1.51+).

### Activación

```bash
# Iniciar servidor Remote Control
claude remote-control

# Con nombre personalizado
claude remote-control --name "Auth Refactor"

# Con sandboxing habilitado
claude remote-control --sandbox

# Dentro del REPL
/remote-control
/remote-control "Auth Refactor"
```

### Conectar desde otro dispositivo

1. **Session URL** — impresa en la terminal al iniciar
2. **QR code** — presionar `spacebar` después de iniciar
3. **Por nombre** — buscar en claude.ai/code o Claude mobile app (iOS/Android)

### Seguridad

- Sin puertos inbound abiertos en tu máquina
- Solo HTTPS outbound sobre TLS
- Tokens de alcance reducido de vida corta
- Cada sesión remota es independiente

### Limitaciones

- Una sesión remota por instancia de Claude Code
- La terminal debe permanecer abierta en el host
- Timeout de ~10 minutos si la red es inalcanzable

### Remote Control vs Web Sessions

| Aspecto | Remote Control | Web Sessions |
|---------|---------------|--------------|
| Ejecución | Corre en tu máquina | Corre en Anthropic cloud |
| Herramientas locales | Acceso completo a MCP local, archivos, CLI | Sin dependencias locales |
| Caso de uso | Continuar trabajo local desde otro dispositivo | Empezar fresh desde cualquier browser |

---

## Web Sessions

Web Sessions permiten correr Claude Code en el browser en claude.ai/code, o crear sesiones web desde el CLI.

### Crear sesión web desde CLI

```bash
claude --remote "implement the new API endpoints"
```

Inicia una sesión Claude Code en claude.ai accesible desde cualquier browser.

### Retomar sesión web localmente

```bash
# Retomar sesión web en la terminal local
claude --teleport

# Dentro del REPL
/teleport
```

### Casos de uso

- Empezar trabajo en una máquina y continuar en otra
- Compartir URL de sesión con teammates
- Usar la UI web para diff visual, luego cambiar a terminal para ejecución

---

## Channels

Channels (Research Preview) empuja eventos de servicios externos hacia una sesión Claude Code activa vía MCP servers. Claude reacciona a notificaciones en tiempo real sin polling.

### Activación

```bash
# Subscribirse a channel plugins al inicio
claude --channels discord,telegram

# Múltiples fuentes
claude --channels discord,telegram,imessage,webhooks
```

### Integraciones disponibles

| Integración | Descripción |
|-------------|-------------|
| **Discord** | Recibir y responder mensajes Discord en la sesión |
| **Telegram** | Recibir y responder mensajes Telegram en la sesión |
| **iMessage** | Recibir notificaciones iMessage en la sesión |
| **Webhooks** | Recibir eventos de fuentes webhook arbitrarias |

### Configuración enterprise

```json
{
  "allowedChannelPlugins": ["discord", "telegram"]
}
```

`allowedChannelPlugins` es un managed setting que controla qué channel plugins están permitidos en la organización.

### Cómo funciona

1. MCP servers actúan como channel plugins conectados a servicios externos
2. Mensajes y eventos entrantes se pushean a la sesión activa
3. Claude puede leer y responder dentro del contexto de la sesión
4. No requiere polling — eventos se pushean en tiempo real

---

## Voice Dictation

Voice Dictation provee input de voz push-to-talk para Claude Code.

### Activación

```bash
/voice
```

### Características

| Feature | Detalle |
|---------|---------|
| Push-to-talk | Mantener tecla para grabar, soltar para enviar |
| 20 idiomas | STT con soporte multilingüe |
| Keybinding personalizable | Via `/keybindings` |
| Requisito de cuenta | Requiere cuenta Claude.ai para procesamiento STT |

**Disponibilidad:** Desktop app y Claude Code en web. No disponible en CLI puro sin UI.

---

## Task List

Task List provee tracking persistente de tareas que sobrevive context compactions.

### Activación

```bash
export CLAUDE_CODE_ENABLE_TASKS=true
```

Keyboard: `Ctrl+T` — toggle de la vista de task list en sesión.

### Task directories compartidos entre sesiones

```bash
# Directorio de tareas compartido por nombre entre sesiones
export CLAUDE_CODE_TASK_LIST_ID=my-project-sprint-3
```

`CLAUDE_CODE_TASK_LIST_ID` permite que múltiples sesiones compartan la misma task list — útil para workflows de equipo o proyectos multi-sesión.

### Por qué importa la persistencia

Las tasks persisten cuando el historial de conversación se recorta (context compaction). Sin Task List, los items de trabajo de largo plazo pueden perderse en implementaciones complejas de múltiples pasos.

---

## Prompt Suggestions

Prompt Suggestions muestra comandos de ejemplo basados en el historial git y el contexto actual de conversación.

```bash
# Deshabilitar suggestions
export CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false
```

- Aparecen como texto gris debajo del prompt de input
- `Tab` acepta la suggestion
- `Enter` acepta y envía inmediatamente

---

## Desktop App

La Desktop App provee una aplicación standalone con diff visual, sesiones paralelas y conectores integrados.

**Disponibilidad:** macOS y Windows (Pro, Max, Team, Enterprise).

### Features principales

| Feature | Descripción |
|---------|-------------|
| **Diff view** | Revisión visual file-by-file con inline comments; Claude lee comentarios y revisa |
| **App preview** | Auto-inicia dev servers con browser embebido para verificación en vivo |
| **PR monitoring** | Integración GitHub CLI con auto-fix de CI failures y auto-merge |
| **Parallel sessions** | Múltiples sesiones en sidebar con aislamiento automático por Git worktree |
| **Scheduled tasks** | Tareas recurrentes (hourly, daily, weekdays, weekly) mientras la app está abierta |

### Handoff desde CLI

```bash
/desktop
```

Transfiere la sesión CLI actual a la Desktop App.

### Configuración de app preview

`.claude/launch.json` en el proyecto:
```json
{
  "command": "npm run dev",
  "port": 3000,
  "readyPattern": "ready on",
  "persistCookies": true
}
```

---

## References

- [cli-reference](cli-reference.md) — Todos los flags, env vars y subcomandos
- [scheduled-tasks](scheduled-tasks.md) — Loop, cron, background tasks, headless mode
- [subagent-patterns](subagent-patterns.md) — Patrones de coordinación multi-agente
- [permission-model](permission-model.md) — Modelo de permisos en dos planos
- [Documentación oficial Advanced Features](https://code.claude.com/docs/en/interactive-mode)
- [Documentación oficial Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Documentación oficial Remote Control](https://code.claude.com/docs/en/remote-control)
