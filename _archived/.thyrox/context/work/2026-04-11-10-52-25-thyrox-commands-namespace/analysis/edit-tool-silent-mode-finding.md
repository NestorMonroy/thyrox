```yml
type: Artefacto de Investigación
title: Edit tool — Output de éxito y solución via aislamiento de contexto (subagentes)
created_at: 2026-04-11 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
fase: FASE 31
work_package: 2026-04-11-10-52-25-thyrox-commands-namespace
td: TD-037
severidad: baja
estado: RESUELTO — solución arquitectónica documentada
```

# Edit tool — Output de éxito y solución via aislamiento de contexto

## Contexto

Durante FASE 31, el usuario observó la asimetría entre el Bash tool y el Edit tool
en cuanto al output que muestran cuando completan sin producir contenido relevante:

```
Bash (sin stdout/stderr):   (Bash completed with no output)       ← limpio
Edit (éxito):               The file /path/to/file has been       ← verboso
                            updated successfully.
```

La pregunta fue: **¿Se puede replicar el comportamiento `(Bash completed with no output)`
para el Edit tool, mostrando algo como `(Edit completed with no output)`?**

---

## Investigación

### Fuente de `(Bash completed with no output)`

Este mensaje es generado por la **plataforma Claude Code** cuando el Bash tool:
- Termina con exit code 0
- No produce stdout ni stderr

Es un comportamiento **built-in del tool**, no configurable externamente. La plataforma
detecta que el result está vacío y sustituye el vacío con el mensaje explicativo.

### Por qué Edit siempre emite su mensaje

El Edit tool produce como tool result la cadena:

```
"The file /path/to/file has been updated successfully."
```

Este string es el **output del tool mismo**, generado internamente por Claude Code antes
de devolver el control al agente. No es stdout de un proceso externo — es parte del
protocolo interno tool-result.

A diferencia del Bash tool (que puede tener stdout vacío), el Edit tool siempre produce
un resultado no-vacío. La plataforma no tiene lógica condicional del tipo "si Edit tuvo
éxito y el resultado es trivial → mostrar mensaje compacto".

---

## Mecanismos evaluados

### 1. `suppressOutput: true` en hook (evaluado vs claude-howto)

El campo existe en el JSON output schema de los hooks:

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "...",
  "hookSpecificOutput": { ... }
}
```

**Semántica real** (confirmada en claude-howto/06-hooks/README.md): suprime el stdout
del **propio hook** en el debug log de Claude Code. No afecta el tool result del Edit tool.

Distinción crítica:
- **Tool result del Edit** = `"The file has been updated successfully."` → producido por la plataforma, antes de que el hook corra
- **Hook stdout** = el JSON que devuelve el script del hook → esto sí lo suprime `suppressOutput: true`

Son dos canales distintos. `suppressOutput` solo controla el segundo.

**Resultado:** No funciona para el objetivo.

### 2. PostToolUse hook con command

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "true" }]
      }
    ]
  }
}
```

**Resultado:** No funciona. El hook corre **después** de que el tool result ya fue emitido.
PostToolUse solo puede agregar `additionalContext` (más contenido), no reemplazar ni retirar
lo ya emitido.

**Referencia claude-howto:** *"PostToolUse — Runs immediately after tool completion. Cannot
block (already occurred)."*

### 3. PreToolUse hook para interceptar Edit

Un hook `PreToolUse` puede bloquear la ejecución del Edit tool (exit 2). Pero:
- Bloquearlo implica que el edit **no ocurre** — no es lo que se quiere
- No existe mecanismo para "redirigir" el Edit tool a una implementación alternativa

**No aplica.**

### 4. Sustituir Edit por `Bash(sed/python)`

Técnicamente posible: un `Bash(sed -i 's/old/new/' file)` produce `(Bash completed with
no output)` cuando tiene éxito silencioso.

**Descartado** porque:
- Pierde el diff visual que Edit muestra al usuario para revisión
- Pierde la validación de unicidad que Edit aplica a `old_string`
- Pierde el permiso granular (`"ask": ["Edit(/.claude/CLAUDE.md)"]`) que settings.json
  aplica por path a edits específicos
- Introduce riesgo de regex incorrecto donde Edit sería más seguro

El trade-off es peor que aceptar el mensaje verboso.

---

## Comparativa de comportamiento ideal vs actual

| Escenario | Bash (actual) | Edit (actual) | Edit (ideal) |
|-----------|--------------|---------------|--------------|
| Operación exitosa, trivial | `(Bash completed with no output)` | `The file X has been updated successfully.` | `(Edit completed — 1 change)` |
| Operación exitosa, múltiples archivos | N/A | N mensaje por archivo | `(Edit completed — N files)` |
| Operación fallida | error message | error message | error message |

---

## Solución requerida (nivel plataforma)

Claude Code debería implementar uno o más de los siguientes:

### Opción A — Flag en settings.json

```json
{
  "editTool": {
    "verbosity": "silent"
  }
}
```

Con `"silent"`: Edit exitoso → `(Edit completed with no output)` o `(Edit completed — N changes)`

### Opción B — suppressToolOutput en PostToolUse hook

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{
          "type": "command",
          "command": "true",
          "suppressToolOutput": true
        }]
      }
    ]
  }
}
```

### Opción C — Comportamiento built-in asimétrico

La plataforma detecta que el edit tuvo éxito trivial y muestra:
```
(Edit completed — file.md updated)
```
En lugar de la cadena verbosa actual.

---

## Solución real — Aislamiento de contexto via subagentes

**La solución existe y está documentada en claude-howto.**

El punto clave es que el problema de clutter es un problema de *en qué contexto* corre el Edit,
no de *si el Edit puede suprimir su output*.

### Cómo funciona el aislamiento

Cuando el Edit tool corre **en el contexto principal** (conversación directa):
```
Usuario ve: "The file /path/to/file has been updated successfully."  ← clutter
```

Cuando el Edit tool corre **dentro de un subagente** (Agent tool):
```
Subagente ejecuta Edit → output queda en el contexto aislado del subagente
Usuario ve: solo el resultado final que el subagente reporta al padre ← limpio
```

**Referencia directa de claude-howto/04-subagents/README.md:**
> "**Context preservation** — Operates in separate context, preventing pollution of main conversation"
> "Each subagent gets a **fresh context window** without the main conversation history"
> "Results are **distilled** back to the main agent"

### Por qué las tareas programadas funcionan

Las tareas programadas (scheduled tasks, background tasks) funcionan porque:
1. Si la tarea invoca un **subagente** para hacer los edits → los outputs quedan en el contexto del subagente
2. El subagente completa y devuelve solo el resumen al contexto principal
3. El usuario no ve el spam de "The file has been updated successfully." — ve el resultado

En nuestro proyecto, el agente `task-executor` ya implementa este patrón:
corre edits en su propio contexto y reporta solo el resultado.

### Patrón arquitectónico correcto

```
❌ Mal: Claude (contexto principal) → Edit × N  → N mensajes de éxito en pantalla
✅ Bien: Claude (contexto principal) → Agent(task-executor) → Edit × N → resumen al padre
```

### `suppressOutput` — aclaración final

El campo `suppressOutput: true` en el JSON output de los hooks suprime el **stdout del hook**
del debug log interno de Claude Code. No está relacionado con el tool result del Edit.
Confirmado en claude-howto/06-hooks/README.md.

---

## Estado y seguimiento

| Campo | Valor |
|-------|-------|
| TD | TD-037 en `technical-debt.md` — actualizar a RESUELTO |
| Solución | Arquitectónica — usar subagentes para operaciones Edit intensivas |
| Acción | Documentar patrón en referencias del framework (best practice) |
| Feature request | No necesario — la plataforma ya tiene el mecanismo correcto |
