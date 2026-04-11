# Scheduled Tasks y Automatización

Referencia para tareas programadas, automatización sin intervención y ejecución headless de Claude Code.

## Tareas programadas en sesión (`/loop` + CronCreate)

Las tareas programadas son **session-scoped**: corren mientras Claude Code está activo y se limpian al terminar la sesión. Disponibles desde v2.1.72+.

### Crear tareas con `/loop`

```bash
# Intervalo explícito
/loop 5m check if the deployment finished

# Lenguaje natural
/loop check build status every 30 minutes

# Cron expression estándar (5 campos)
/loop 0 */2 * * * run the integration test suite
```

### Recordatorios únicos

```
remind me at 3pm to push the release branch
in 45 minutes, run the integration tests
```

### Tools de gestión de cron

| Tool | Descripción |
|------|-------------|
| `CronCreate` | Crear tarea programada |
| `CronList` | Listar tareas activas |
| `CronDelete` | Eliminar tarea |

### Límites y comportamiento

| Aspecto | Detalle |
|---------|---------|
| **Máximo** | 50 tareas por sesión |
| **TTL recurrente** | 3 días, luego auto-expiran |
| **Jitter recurrente** | Hasta 10% del intervalo (máximo 15 minutos) |
| **Jitter único** | Hasta 90 segundos en límites :00/:30 |
| **Missed fires** | Sin catch-up — si Claude Code no corría, se omite |
| **Persistencia** | No persisten entre reinicios |

### Deshabilitar tareas programadas

```bash
export CLAUDE_CODE_DISABLE_CRON=1
```

## Cloud Scheduled Tasks — `/schedule`

Las Cloud Scheduled Tasks persisten entre reinicios y corren en infraestructura de Anthropic:

```bash
/schedule daily at 9am run the test suite and report failures
```

**Diferencia clave:** No requiere que Claude Code esté corriendo localmente. Para automatización que debe sobrevivir reinicios o ejecutarse sin presencia del usuario.

## Por qué Edit tool funciona en tareas programadas

**Pregunta:** Las tareas programadas usan Edit — ¿cómo no bloquean si Edit siempre produce output?

**Respuesta:** El contexto de aislamiento.

Las tareas programadas ejecutan en un **subagente** (Agent tool). El Edit tool corre dentro del contexto aislado del subagente, no en el contexto principal. El output del tool (`"The file has been updated successfully."`) queda en el contexto del subagente. El usuario solo ve el resumen que el subagente devuelve.

```
Sesión principal
    │
    └─ Tarea programada → [subagente] → Edit × N → resultados aislados
                                         │
                          resumen ←──────┘  (lo único que llega al contexto principal)
```

Ver [subagent-patterns](subagent-patterns.md) para el patrón completo.

## Background Tasks

Las background tasks permiten operaciones largas sin bloquear la conversación.

```bash
User: Run the full test suite in the background

Claude: Starting tests in background (task-id: bg-1234)
You can continue working while tests run.
```

### Gestión de background tasks

```bash
/task list           # Listar tareas activas
/task status bg-1234 # Estado y progreso
/task show bg-1234   # Output actual
/task cancel bg-1234 # Cancelar
```

### Deshabilitar background tasks

```bash
export CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1
```

### Parallelismo con background tasks

```
User: Run the build in background    → task bg-5001
User: Also run linter in background  → task bg-5002
User: Meanwhile, let's implement the new API endpoint
Claude: [trabaja en API mientras build y linter corren]

[10 min después]
Claude: Build completed (bg-5001) ✅
Claude: Linter found 12 issues (bg-5002) ⚠️
```

## Modo headless / Print Mode (`claude -p`)

Para scripts, CI/CD, y automatización sin interacción del usuario:

```bash
# Query simple y salir
claude -p "what does this function do?"

# Procesar contenido piped
cat error.log | claude -p "explain this error"

# Continuar última conversación en modo print
claude -c -p "check for type errors"

# Limitar turnos autónomos
claude -p --max-turns 3 "refactor this module"
```

### Formatos de output

```bash
# Texto plano (default)
claude -p "explain this code"

# JSON para procesamiento programático
claude -p --output-format json "list all functions in main.py"

# Streaming JSON para procesamiento en tiempo real
claude -p --output-format stream-json "generate a long report"

# JSON con schema validado
claude -p --json-schema '{"type":"object","properties":{"bugs":{"type":"array"}}}' \
  "find bugs and return as JSON"
```

### Integración con CI/CD

**GitHub Actions:**

```yaml
- name: AI Code Review
  run: |
    claude -p --output-format json \
      --max-turns 1 \
      "Review PR for security vulnerabilities. Output as JSON with 'issues' array" \
      > review.json
```

**Script piping:**

```bash
# Analizar logs
tail -1000 /var/log/app/error.log | claude -p "summarize errors and suggest fixes"

# Batch processing
for file in src/*.ts; do
  claude -p --model haiku "summarize this file: $(cat $file)" >> summaries.md
done
```

## Gestión de sesiones para automatización

```bash
# Continuar la sesión más reciente
claude -c

# Resumir sesión por nombre
claude -r "feature-auth" "continue implementing login"

# Fork de sesión para experimentar
claude --resume feature-auth --fork-session "try OAuth instead"

# Session específica por ID
claude --session-id "550e8400-..." "continue"
```

### Session Fork

```bash
# Crear branch de una sesión sin afectar la original
claude --resume abc123 --fork-session "test alternative approach"
```

La sesión original queda intacta. El fork se convierte en una sesión independiente nueva.

## Permission modes para automatización

```bash
# Solo lectura — audit sin modificaciones
claude --permission-mode plan "audit this codebase for security"

# Aceptar edits automáticamente — flujo sin fricción
claude --permission-mode acceptEdits "implement this feature"

# Auto mode — classifier de seguridad en background
claude --enable-auto-mode --permission-mode auto "refactor auth module"

# Herramientas específicas sin confirmación
claude --allowedTools "Bash(git log:*)" "Bash(git status:*)" "Read(*)"

# Bloquear operaciones peligrosas
claude --disallowedTools "Bash(rm -rf:*)" "Bash(git push --force:*)"
```

## Auto Mode — Safety Classifier

Auto Mode (Research Preview) usa un clasificador de seguridad en background para revisar cada acción:

```bash
claude --enable-auto-mode
# Luego Shift+Tab para ciclar hasta "auto" mode
```

**Acciones bloqueadas por defecto:**
- `curl | bash` (pipe-to-shell installs)
- Envío de datos sensibles al exterior
- Deploys a producción
- `rm -rf` masivo
- Cambios de IAM
- `git push --force` a main

**Acciones permitidas por defecto:**
- Operaciones de archivos locales
- `npm install`, `pip install` desde manifests
- HTTP de solo lectura
- Push a la rama actual

**Fallback:** Después de 3 bloqueos consecutivos o 20 totales, vuelve a preguntar al usuario.

## Configuración de tareas programadas

```json
{
  "backgroundTasks": {
    "enabled": true,
    "maxConcurrentTasks": 5,
    "notifyOnCompletion": true,
    "autoCleanup": true,
    "logOutput": true
  }
}
```

## Variables de entorno relevantes

| Variable | Efecto |
|----------|--------|
| `CLAUDE_CODE_DISABLE_CRON` | Deshabilita tareas programadas |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Deshabilita background tasks |
| `CLAUDE_CODE_EFFORT_LEVEL` | Nivel de razonamiento (`low`/`medium`/`high`/`max`) |
| `MAX_THINKING_TOKENS` | Budget de tokens para extended thinking |

## Ejemplo completo — monitoring de deployment

```bash
# Monitorear deploy cada 5 min, auto-detener al completar
/loop 5m check the deployment status of staging.
        If deploy succeeded, notify me and stop looping.
        If it failed, show the error logs.
```

## Referencias

- [09-advanced-features/README.md](/tmp/reference/claude-howto/09-advanced-features/README.md) — Documentación oficial de advanced features
- [10-cli/README.md](/tmp/reference/claude-howto/10-cli/README.md) — Referencia completa del CLI
- [subagent-patterns](subagent-patterns.md) — Aislamiento de contexto (por qué Edit funciona en scheduled tasks)
- [permission-model](permission-model.md) — Modelo de permisos en dos planos
