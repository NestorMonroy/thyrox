```yml
created_at: 2026-04-16 17:45:29
project: THYROX
phase: Investigación transversal
author: NestorMonroy
fuente: /tmp/references/claude-code (anthropics/claude-code v2.1.111)
status: Aprobado
```

# Investigación: Repositorio oficial anthropics/claude-code

Análisis exhaustivo del repositorio público de Anthropic para extraer patrones,
correcciones y oportunidades de mejora para THYROX.

---

## Tipo de repositorio

Mixto: documentación oficial + 13 plugins de ejemplo + configuraciones de referencia
+ scripts de mantenimiento del repositorio en GitHub. **No es el código fuente de Claude Code**
(ese es propietario), sino los recursos públicos de soporte.

---

## Estructura general

```
claude-code/
├── .claude-plugin/marketplace.json   ← Catálogo de plugins del repo
├── .claude/commands/                 ← 3 comandos internos del repo
├── .devcontainer/                    ← Contenedor de desarrollo con cortafuego
├── .github/workflows/               ← 11 flujos de CI/CD
├── examples/
│   ├── hooks/bash_command_validator_example.py
│   ├── mdm/                          ← Plantillas de despliegue empresarial
│   └── settings/                    ← 3 perfiles de configuración por nivel de seguridad
├── plugins/                          ← 13 plugins de ejemplo
├── scripts/                          ← Scripts de gestión del repositorio GitHub (no reutilizables)
└── CHANGELOG.md, README.md, LICENSE.md, SECURITY.md
```

---

## Hallazgo A — Todos los `plugin.json` son minimalistas

**Lo que hay:** Los 13 plugins usan únicamente:
```json
{
  "name": "nombre-kebab-case",
  "version": "1.0.0",
  "description": "Descripción breve",
  "author": { "name": "Nombre", "email": "correo@anthropic.com" }
}
```

Ninguno usa `monitors`, `hooks`, `bin`, `skills`, `agents` ni rutas personalizadas.
El auto-descubrimiento por directorios convencionales es el mecanismo estándar.

**Implicación para THYROX:** El `plugin.json` de THYROX tiene `skills`, `agents`, `hooks`, `bin`
fuera del estándar documentado. Si el auto-descubrimiento detecta los directorios convencionales,
estos campos son redundantes. Evaluar si quitarlos en una FASE futura.

---

## Hallazgo B — BUG CRÍTICO: Formato diferenciado de `hooks.json` en plugin

**Lo que hay:** La documentación oficial distingue dos formatos incompatibles:

**Formato incorrecto (de `settings.json`):**
```json
{
  "SessionStart": [{ "hooks": [{ "type": "command", "command": "..." }] }]
}
```

**Formato correcto para `hooks/hooks.json` de plugin:**
```json
{
  "description": "Descripción opcional del conjunto de hooks",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/bin/script.sh" }]
      }
    ]
  }
}
```

**Estado en THYROX:** `hooks/hooks.json` usa el formato incorrecto (sin wrapper) y la variable
`$PLUGIN_DIR` en lugar de `$CLAUDE_PLUGIN_ROOT`. **CORREGIDO en esta misma sesión.**

---

## Hallazgo C — Variable de entorno obligatoria en hooks de plugin

**Lo que hay:** Todos los hooks de plugins oficiales usan `${CLAUDE_PLUGIN_ROOT}` como
prefijo de todas las rutas:

```json
"command": "${CLAUDE_PLUGIN_ROOT}/hooks-handlers/session-start.sh"
"command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/security_reminder_hook.py"
```

**Variable incorrecta en THYROX:** Se usó `$PLUGIN_DIR`. La variable oficial es `$CLAUDE_PLUGIN_ROOT`.
**CORREGIDO en esta misma sesión.**

**Otras variables de entorno disponibles en hooks:**
- `$CLAUDE_PROJECT_DIR` — Raíz del proyecto del usuario
- `$CLAUDE_PLUGIN_ROOT` — Directorio del plugin instalado
- `$CLAUDE_ENV_FILE` — Solo en SessionStart: persiste variables entre herramientas
- `$CLAUDE_CODE_REMOTE` — Disponible en contexto remoto

---

## Hallazgo D — Formato de entrada y salida de hooks (stdin/stdout JSON)

**Entrada (stdin) para todos los hooks:**
```json
{
  "session_id": "abc123",
  "transcript_path": "/ruta/al/transcript.jsonl",
  "cwd": "/directorio/actual",
  "permission_mode": "ask|allow",
  "hook_event_name": "PreToolUse"
}
```

Campos adicionales según el evento:
- `PreToolUse`/`PostToolUse`: `tool_name`, `tool_input`, `tool_result`
- `UserPromptSubmit`: `user_prompt`
- `Stop`/`SubagentStop`: `reason`

**Códigos de salida:**
| Código | Efecto |
|--------|--------|
| `0` | Éxito — stdout aparece en el transcript |
| `2` | Error bloqueante — stderr se retroalimenta a Claude |
| Otros | Error no bloqueante |

**Salida de PreToolUse (stdout JSON):**
```json
{
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask",
    "updatedInput": {"campo": "valor_modificado"}
  },
  "systemMessage": "Explicación para Claude"
}
```

**Salida de Stop (stdout JSON):**
```json
{
  "decision": "approve|block",
  "reason": "Explicación",
  "systemMessage": "Contexto adicional"
}
```

**Eventos disponibles:**
`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`, `SessionStart`, `SessionEnd`,
`UserPromptSubmit`, `PreCompact`, `Notification`

---

## Hallazgo E — SessionStart puede inyectar contexto adicional a Claude

**Lo que hay:** Los plugins `explanatory-output-style` y `learning-output-style` inyectan
instrucciones al inicio de sesión mediante `additionalContext`:

```bash
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Instrucciones adicionales para Claude en esta sesión..."
  }
}
EOF
exit 0
```

**Aplicación en THYROX:** El hook `session-start.sh` puede emitir el estado del WP activo,
la fase actual y las reglas críticas como `additionalContext` — eliminando la necesidad de
que Claude lea `now.md` manualmente al inicio de cada sesión.

---

## Hallazgo F — El transcript es JSONL y accesible desde cualquier hook

**Lo que hay:** El hook `stop-hook.sh` del plugin `ralph-wiggum` demuestra cómo leer
el transcript directamente desde un hook:

```bash
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path')
LAST_LINE=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -1)
LAST_OUTPUT=$(echo "$LAST_LINE" | jq -r '
  .message.content |
  map(select(.type == "text")) |
  map(.text) |
  join("\n")
')
```

El `transcript_path` llega como campo del JSON de entrada (stdin) en todos los hooks.

**Aplicación en THYROX:** Una implementación propia del concepto de
`/menos-prompts-de-permiso` puede escanear el transcript JSONL para extraer todos los
comandos Bash ejecutados, filtrar los de solo lectura, y generar entradas para
`permissions.allow` en la configuración del proyecto.

---

## Hallazgo G — `/less-permission-prompts` es habilidad nativa del binario, no código abierto

**Lo que hay:** El CHANGELOG v2.1.111 menciona:
```
Added `/less-permission-prompts` skill — scans transcripts for common read-only
Bash and MCP tool calls and proposes a prioritized allowlist for `.claude/settings.json`
```

No existe código fuente en el repositorio — es una habilidad integrada al binario de Claude Code.

**Implicación:** THYROX debe **reimplementar** el concepto como comando propio.
La implementación usa los Hallazgos F + D: leer `transcript_path` desde el hook de Stop,
extraer llamadas a herramientas de solo lectura, generar entradas para `permissions.allow`.

**Implementado como:** `.claude/commands/permisos-sugeridos.md` en esta sesión.

---

## Hallazgo H — Convenciones de escritura en SKILL.md (oficiales)

### Descripción: tercera persona + frases exactas de disparo

```yaml
description: "This skill should be used when the user asks to 'frase exacta 1',
  'frase exacta 2', or mentions [términos relacionados]."
```

Reglas documentadas:
1. Tercera persona: "This skill should be used when..."
2. Frases exactas entre comillas que el usuario diría
3. Sin vaguedad ("Use when working with hooks" → incorrecto)
4. Límite: 1,536 caracteres (ampliado en v2.1.105 desde 250)

**Diferencia con THYROX:** La regla `I-008` de `thyrox-invariants.md` usa el patrón
`"Use when [condición]"` — compatible pero menos específico que el estándar oficial.

### Escritura del cuerpo: forma imperativa, no segunda persona

Correcto (imperativo):
```
Para crear un hook, definir el tipo de evento.
Configurar el servidor MCP con autenticación.
```

Incorrecto (segunda persona):
```
Debes crear un hook definiendo el tipo de evento.
Necesitas configurar el servidor MCP.
```

**Acción en THYROX:** Revisar los `workflow-*` SKILL.md para eliminar frases con "debes",
"necesitas", "tienes que" y reemplazar con forma imperativa.

---

## Hallazgo I — Divulgación progresiva en skills (progressive disclosure)

**Tamaños documentados:**

| Nivel | Contenido | Carga en contexto |
|-------|-----------|-------------------|
| Metadatos (nombre + descripción) | ~100 palabras | Siempre activo |
| Cuerpo de SKILL.md | Ideal 1,500-2,000 palabras, máximo ~5,000 | Al activar el skill |
| Recursos en subdirectorios | Sin límite | Solo cuando Claude los necesita |

Subdirectorios estándar: `references/` (documentación), `examples/` (código funcional),
`scripts/` (herramientas ejecutables), `assets/` (plantillas de artefactos).

**Implicación para THYROX:** Los skills con SKILL.md de más de 3,000 palabras son candidatos
a refactorización — mover detalles a `references/`. Los `workflow-*` más extensos son:
`workflow-execute`, `workflow-track`, `workflow-decompose`.

---

## Hallazgo J — Plugin `hookify`: sistema de reglas en archivos locales

**Lo que hay:** El plugin `hookify` implementa reglas definidas en archivos
`.claude/hookify.{nombre}.local.md` con frontmatter YAML. Los hooks Python leen estos
archivos dinámicamente sin reiniciar Claude Code.

Estructura de una regla simple:
```markdown
---
name: nombre-regla
enabled: true
event: bash|file|stop|prompt|all
pattern: expresion-regular-python
action: warn|block
---
Mensaje a mostrar cuando la regla activa
```

Estructura de una regla con condiciones complejas:
```yaml
conditions:
  - field: file_path
    operator: regex_match|contains|equals|not_contains|starts_with|ends_with
    pattern: \.env$
  - field: new_text
    operator: contains
    pattern: CLAVE_API
```

**Aplicación en THYROX:** Este patrón es adaptable para crear un sistema de validación
de metodología: prevenir confirmaciones de cambios sin WP activo, validar formato de
confirmaciones de cambios, etc.

---

## Hallazgo K — Patrón de advertencia única por sesión (`security-guidance`)

**Lo que hay:** El hook `security_reminder_hook.py` muestra advertencias solo una vez
por sesión usando `session_id` como clave:

```python
state_file = os.path.expanduser(
    f"~/.claude/security_warnings_state_{session_id}.json"
)
shown_warnings = load_state(session_id)
warning_key = f"{file_path}-{rule_name}"
if warning_key not in shown_warnings:
    shown_warnings.add(warning_key)
    save_state(session_id, shown_warnings)
    print(reminder, file=sys.stderr)
    sys.exit(2)
```

**Aplicación en THYROX:** Útil para recordatorios de metodología no repetitivos, como
"no hay WP activo" o "fase incorrecta para esta operación".

---

## Hallazgo L — `model` y `color` en agentes nativos

**Lo que hay:** Los agentes en `.claude/agents/` soportan campos adicionales de frontmatter:

```markdown
---
name: identificador-del-agente
description: Use this agent when [condición].
model: inherit
color: blue
tools: ["Read", "Write", "Grep"]
---
```

Valores de `model`: `inherit`, `sonnet`, `opus`, `haiku`
Colores observados: `blue`, `yellow`, `green` (lista completa no documentada)

**Aplicación en THYROX:** Los agentes de THYROX pueden tener `color` para diferenciarse
visualmente en la interfaz. No está documentado en las referencias actuales de THYROX.

---

## Hallazgo M — `monitors` en plugin.json: sin ejemplos todavía

**Lo que hay:** Mencionado en CHANGELOG v2.1.105:
```
Added background monitor support for plugins via a top-level `monitors` manifest key
that auto-arms at session start or on skill invoke
```

No existe ningún `plugin.json` de ejemplo que use `monitors`. Formato desconocido.

**Recomendación:** No implementar hasta que haya documentación oficial con ejemplos.
Monitorear el CHANGELOG para la próxima versión que lo documente.

---

## Hallazgo N — Perfiles de configuración (`examples/settings/`)

Tres perfiles oficiales listos para usar:

**settings-lax.json** (organizaciones con baja restricción):
```json
{
  "permissions": {
    "disableBypassPermissionsMode": "disable"
  },
  "strictKnownMarketplaces": []
}
```

**settings-strict.json** (organizaciones con alta restricción):
```json
{
  "permissions": {
    "disableBypassPermissionsMode": "disable",
    "ask": ["Bash"],
    "deny": ["WebSearch", "WebFetch"]
  },
  "allowManagedPermissionRulesOnly": true,
  "allowManagedHooksOnly": true,
  "strictKnownMarketplaces": []
}
```

**settings-bash-sandbox.json** (con caja de arena obligatoria):
```json
{
  "allowManagedPermissionRulesOnly": true,
  "sandbox": { "enabled": true, "autoAllowBashIfSandboxed": false }
}
```

---

## Hallazgo O — Hook `bash_command_validator_example.py`: patrón de validación

Patrón de validación de comandos Bash en Python con reglas declarativas:

```python
_VALIDATION_RULES = [
    (r"^grep\b(?!.*\|)", "Usa 'rg' en lugar de 'grep'"),
    (r"^find\s+\S+\s+-name\b", "Usa 'rg --files | rg patron'"),
]

for pattern, message in _VALIDATION_RULES:
    if re.search(pattern, command, re.IGNORECASE):
        print(message, file=sys.stderr)
        sys.exit(2)  # Bloqueante — Claude ve el error
```

---

## Hallazgo P — Comandos Bash de solo lectura ya no generan prompt (v2.1.111)

A partir de la versión 2.1.111, los siguientes ya NO requieren entrada en `permissions.allow`:
- Comandos con patrones glob de solo lectura: `ls *.ts`, `find . -name "*.md"`
- Comandos que empiezan con `cd <directorio-proyecto> &&`

**Impacto en THYROX:** Entradas como `Bash(ls *)` y `Bash(echo *)` en `settings.json`
son redundantes desde v2.1.111. Se pueden limpiar sin pérdida de funcionalidad.

---

## Resumen de brechas entre THYROX y el repositorio oficial

| Brecha | Severidad | Estado |
|--------|-----------|--------|
| Formato incorrecto de `hooks.json` de plugin (sin wrapper) | CRÍTICA | **Corregida** |
| Variable `$PLUGIN_DIR` en lugar de `$CLAUDE_PLUGIN_ROOT` | CRÍTICA | **Corregida** |
| Entradas redundantes en `settings.json` (ls, echo) | Baja | Pendiente — limpiar con `/permisos-sugeridos` |
| Skill `/menos-prompts-de-permiso` no existe en THYROX | Media | **Implementado** |
| `color` en agentes no documentado en referencias THYROX | Baja | Pendiente |
| Escritura imperativa no validada en workflow-* skills | Media | Pendiente |
| SKILL.md de más de 3,000 palabras sin refactorizar | Baja | Pendiente |
| `monitors` en plugin.json | N/A | No implementar — sin documentación |
