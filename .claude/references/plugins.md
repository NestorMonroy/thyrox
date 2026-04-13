# Plugins — Arquitectura y Distribución

Referencia para crear, estructurar y distribuir plugins de Claude Code.
Un plugin empaqueta comandos, agentes, skills, hooks y servidores MCP en una unidad instalable con un solo comando.

## Cuándo usar un plugin vs comando standalone

| Criterio | Plugin | Standalone |
|----------|--------|------------|
| ¿Múltiples componentes? | ✅ Plugin | ❌ Redundante |
| ¿Compartir con equipo? | ✅ Plugin | ❌ Copiar archivos |
| ¿Configuración automática? | ✅ Plugin | ❌ Manual |
| ¿Tarea personal simple? | ❌ Overkill | ✅ Slash command |
| ¿Dominio especializado único? | ❌ Overkill | ✅ Skill |
| ¿Análisis especializado? | ❌ Crear manualmente | ✅ Subagente |

**Regla general:** Plugin cuando necesitas bundlear múltiples features, compartir con un equipo, o distribuir con versioning automático. Slash command/skill para workflows personales rápidos.

## Manifest (plugin.json)

El único archivo requerido. Va en `.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "Descripción del plugin",
  "version": "1.0.0",
  "author": {
    "name": "Nombre del autor"
  },
  "homepage": "https://example.com",
  "repository": "https://github.com/user/repo",
  "license": "MIT"
}
```

**Nota:** El separador `:` en `/plugin-name:command` viene **exclusivamente** de la arquitectura de plugins. No existe para comandos standalone o skills.

## Estructura completa de un plugin

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json           # Manifest (obligatorio)
├── commands/                 # Slash commands (archivos .md)
│   ├── task-1.md             → /my-plugin:task-1
│   └── task-2.md             → /my-plugin:task-2
├── agents/                   # Subagentes del plugin
│   └── specialist.md
├── skills/                   # Skills con SKILL.md
│   └── skill-1.md
├── hooks/
│   └── hooks.json            # Hooks del plugin
├── .mcp.json                 # Servidores MCP
├── .lsp.json                 # Servidores LSP (code intelligence)
├── bin/                      # Ejecutables añadidos al PATH del Bash tool
├── settings.json             # Configuración por defecto (solo key `agent` soportada)
├── templates/
├── scripts/
└── tests/
```

## Opciones del manifest

### Configuración por usuario (`userConfig`)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "userConfig": {
    "apiKey": {
      "description": "API key del servicio",
      "sensitive": true
    },
    "region": {
      "description": "Región de despliegue",
      "default": "us-east-1"
    }
  }
}
```

Los campos `sensitive: true` se guardan en el keychain del sistema, no en archivos de configuración en texto plano.

### Directorio de datos persistente (`${CLAUDE_PLUGIN_DATA}`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "command": "node ${CLAUDE_PLUGIN_DATA}/track-usage.js"
      }
    ]
  }
}
```

`${CLAUDE_PLUGIN_DATA}` sobrevive sesiones y se limpia solo al desinstalar el plugin.

### Plugin inline via settings

```json
{
  "pluginMarketplaces": [
    {
      "name": "inline-tools",
      "source": "settings",
      "plugins": [
        {
          "name": "quick-lint",
          "source": "./local-plugins/quick-lint"
        }
      ]
    }
  ]
}
```

## Distribución

### Fuentes soportadas

| Fuente | Sintaxis | Ejemplo |
|--------|---------|---------|
| **Path relativo** | String | `"./plugins/my-plugin"` |
| **GitHub** | `{ "source": "github", "repo": "..." }` | `{ "source": "github", "repo": "org/plugin", "ref": "v1.0" }` |
| **Git URL** | `{ "source": "url", "url": "..." }` | Git genérico con tag/branch opcional |
| **Git subdir** | `{ "source": "git-subdir", ... }` | Monorepo con subdirectorio |
| **npm** | `{ "source": "npm", "package": "..." }` | `@acme/claude-plugin` |
| **pip** | `{ "source": "pip", "package": "..." }` | `claude-data-plugin` |

### Tipos de marketplace

| Tipo | Alcance | Autoridad |
|------|---------|-----------|
| **Oficial** | Global | Anthropic |
| **Comunidad** | Global | Community |
| **Organización** | Interno | Empresa |
| **Personal** | Individual | Desarrollador |

## Ciclo de vida

### Comandos de instalación

```bash
# CLI
claude plugin install <name>@<marketplace>
claude plugin uninstall <name>
claude plugin list
claude plugin enable <name>
claude plugin disable <name>
claude plugin validate           # Valida estructura del plugin

# Desde slash command
/plugin install plugin-name
/plugin install github:username/repo
/plugin install ./path/to/plugin
```

### Desarrollo local

```bash
# Cargar plugin sin instalar (se puede repetir para múltiples)
claude --plugin-dir ./my-plugin
claude --plugin-dir ./plugin-a --plugin-dir ./plugin-b
```

### Hot-reload durante desarrollo

```bash
/reload-plugins     # Re-lee manifests, commands, agents, hooks sin reiniciar
```

## Seguridad de subagentes en plugins

Los subagentes definidos en plugins tienen restricciones de seguridad. Los siguientes campos **NO están permitidos** en el frontmatter de subagentes de plugin:

- `hooks` — No pueden registrar lifecycle hooks
- `mcpServers` — No pueden configurar servidores MCP
- `permissionMode` — No pueden modificar el modelo de permisos

Esto previene que los plugins escalen privilegios más allá de su alcance declarado.

### Restricciones heredadas por sub-agentes en plugins

Los agentes invocados **desde** un plugin heredan las restricciones del plugin:

- Un plugin NO puede escalar privilegios a traves de sub-agentes
- Los sub-agentes lanzados por un plugin no pueden acceder a recursos fuera del
  scope declarado del plugin
- El principio de minimo privilegio aplica transitivamente: si el plugin no tiene
  acceso a un recurso, sus sub-agentes tampoco

**Implicacion de diseno:** Al disenar un plugin, declarar explicitamente en el
manifest todos los recursos que necesita — incluyendo los que necesitaran sus
sub-agentes. Un plugin que subestima su scope declarado no podra escalar en runtime.

## Directorio `bin/` — Ejecutables del plugin

El directorio `bin/` dentro del plugin contiene scripts ejecutables que se
aaden al `PATH` del Bash tool cuando el plugin esta activo:

```
my-plugin/
├── bin/
│   ├── myplugin-lint      # Disponible como: myplugin-lint en Bash tool
│   └── myplugin-deploy    # Disponible como: myplugin-deploy en Bash tool
└── .claude-plugin/
    └── plugin.json
```

**Convencion de naming:** Prefijo del nombre del plugin para evitar colisiones
con otros comandos del sistema (`myplugin-command`, no simplemente `command`).

**Uso desde Claude:**

```bash
# Claude puede invocar estos ejecutables directamente
myplugin-lint src/
myplugin-deploy --env staging
```

**Caso de uso tipico:** Wrappers de herramientas CLI especificas del plugin,
scripts de deploy, utilitarios de validacion propios del dominio del plugin.

## `claude plugin` commands — Gestion de plugins desde CLI

```bash
# Listar plugins instalados
claude plugin list

# Instalar plugin local
claude plugin install ./path/to/my-plugin

# Instalar plugin desde marketplace
claude plugin install plugin-name@marketplace

# Desinstalar plugin
claude plugin uninstall plugin-name

# Habilitar plugin deshabilitado
claude plugin enable plugin-name

# Deshabilitar plugin sin desinstalar
claude plugin disable plugin-name

# Validar estructura del plugin (desarrollo)
claude plugin validate
```

**Desarrollo local sin instalar:**

```bash
# Cargar plugin sin instalar (util durante desarrollo)
claude --plugin-dir ./my-plugin

# Multiples plugins
claude --plugin-dir ./plugin-a --plugin-dir ./plugin-b

# Hot-reload durante desarrollo (sin reiniciar)
/reload-plugins
```


## Soporte LSP

Los plugins pueden incluir servidores LSP para inteligencia de código en tiempo real:

```json
{
  "python": {
    "command": "pyright-langserver",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".py": "python",
      ".pyi": "python"
    }
  }
}
```

## Contexto THYROX

**Estado actual (FASE 31):** THYROX implementa la arquitectura de plugin (Opción D) para crear el namespace `/thyrox:*`:
- `.claude-plugin/plugin.json` — manifest del framework
- `commands/*.md` — wrappers delgados sobre los skills `workflow-*` internos
- La interfaz pública es `/thyrox:*`; la implementación son los skills `workflow-*` (ADR-019)

**Patrón clave — Wrapper delgado:**

```markdown
# commands/analyze.md → /thyrox:analyze
Thin wrapper. Invoca /workflow-analyze internamente.
```

Los skills `workflow-*` son implementación interna; los comandos del plugin son la interfaz pública distribuible. Esta separación permite actualizar la implementación sin cambiar la interfaz del usuario.

## Referencias

- [07-plugins/README.md](/tmp/reference/claude-howto/07-plugins/README.md) — Documentación oficial claude-howto
- [skill-vs-agent](skill-vs-agent.md) — Cuándo usar skill, subagente, o comando
- [claude-code-components](claude-code-components.md) — Frontmatter completo de skills y agentes
- [ADR-019](../context/decisions/adr-019.md) — Decisión de arquitectura plugin namespace THYROX
