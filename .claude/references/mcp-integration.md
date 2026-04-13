# MCP Integration — Model Context Protocol

Referencia para integrar servidores MCP (Model Context Protocol) con Claude Code. MCP proporciona acceso en tiempo real a APIs externas, bases de datos y servicios — a diferencia de la memoria (estática), MCP es live.

## Cuándo usar MCP vs otras alternativas

| Necesidad | Mecanismo |
|-----------|----------|
| Datos que cambian frecuentemente (GitHub PRs, DB queries) | **MCP** |
| Instrucciones persistentes (convenciones, reglas) | CLAUDE.md / Memory |
| Conocimiento del dominio de proyecto | Skill / SKILL.md |
| Acceso a archivos del proyecto | Read/Grep/Glob tools |
| Integración con APIs externas en tiempo real | **MCP** |
| Notificaciones push a Claude Code | MCP Channels |

## Tipos de servidores MCP

| Tipo | Transporte | Caso de uso |
|------|-----------|-------------|
| **HTTP** | REST over HTTP | APIs remotas (Notion, Stripe, GitHub) |
| **Stdio** | stdin/stdout local | Herramientas locales (git, database local) |
| **SSE** | Server-Sent Events | Streaming de datos en tiempo real |

## Instalación básica

```bash
# HTTP transport (APIs remotas)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Stdio transport (servidores locales)
claude mcp add --transport stdio github -- npx @modelcontextprotocol/server-github

# Verificar servidores activos
claude mcp list

# Probar conexión
/mcp test
```

## Configuración en archivos

Los servidores MCP se configuran en `.mcp.json` (proyecto) o `~/.claude.json` (usuario):

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.github.com/mcp"
    },
    "database": {
      "command": "npx",
      "args": ["@mcp/server-database"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL:-postgresql://localhost/dev}"
      }
    },
    "local-tools": {
      "type": "stdio",
      "command": "./scripts/mcp-server.sh"
    }
  }
}
```

**Interpolación de variables de entorno:**
- `${VAR}` — error si VAR no está definida
- `${VAR:-default}` — usa `default` si VAR no está definida

## Alcances (scopes) y deduplicación

| Ubicación | Alcance | Commiteado |
|-----------|---------|------------|
| `.mcp.json` | Proyecto (equipo) | Sí |
| `~/.claude.json` | Usuario (todos los proyectos) | No |
| Plugin `.mcp.json` | Plugin (cuando activo) | Con el plugin |

**Deduplicación por nombre:** Local > Proyecto > Usuario (el primero gana). Si `github` está en `.mcp.json` y en `~/.claude.json`, usa el de `.mcp.json`.

## Autenticación OAuth

Claude Code maneja el flujo OAuth automáticamente. Los tokens se guardan en el keychain del sistema.

```bash
# OAuth automático (flujo browser)
claude mcp add --transport http notion https://notion.example.com/mcp

# Con credenciales pre-configuradas
claude mcp add --transport http myservice https://example.com/mcp \
  --client-id "client-id" \
  --client-secret "secret" \
  --callback-port 8080
```

**Override de metadata OAuth (v2.1.64+):**

```json
{
  "mcpServers": {
    "my-server": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "oauth": {
        "authServerMetadataUrl": "https://auth.example.com/.well-known/openid-configuration"
      }
    }
  }
}
```

**Comportamiento:**
- Tokens almacenados en keychain del sistema (seguro, específico de máquina)
- Step-up auth soportado para operaciones privilegiadas
- Discovery de metadata cacheado para reconexiones rápidas

## Límites de herramientas MCP

| Límite | Valor | Efecto |
|--------|-------|--------|
| **Descripción por server** | 2KB (v2.1.84+) | Previene context bloat |
| **Output warning** | 10K tokens | Warning mostrado |
| **Output máximo default** | 25K tokens | Truncado |
| **Persistencia a disco** | 50K chars | Guardado como archivo temporal |

**Tool search automático:** Cuando las descripciones de herramientas MCP superan el 10% del context window, se activa tool search para evitar cargar todas al contexto.

## Acceso a recursos MCP

```bash
# Referencia a recurso específico
@github:https://api.github.com/repos/owner/repo
@notion:notion://page/PAGE_ID
```

Los recursos MCP son distintos de las herramientas — son datos accesibles por referencia (como archivos), no funciones a ejecutar.

## Elicitación — servidores MCP que piden input

Los servidores MCP pueden solicitar input del usuario mid-workflow mediante el evento `Elicitation`:

```
MCP Server requiere input
    ↓
Evento: Elicitation
    ↓
Claude presenta diálogo al usuario
    ↓
Evento: ElicitationResult (usuario responde)
    ↓
MCP Server recibe respuesta
```

**Hooks relevantes:**
```json
{
  "hooks": {
    "Elicitation": [
      {
        "hooks": [{
          "type": "command",
          "command": "./scripts/validate-mcp-input.sh"
        }]
      }
    ],
    "ElicitationResult": [
      {
        "hooks": [{
          "type": "command",
          "command": "./scripts/process-mcp-response.sh"
        }]
      }
    ]
  }
}
```

**Cuándo usar:** Servidores MCP que necesitan confirmación del usuario (deploy approval, configuración inicial). Evitar en scripts (no habrá usuario disponible).

## Actualizaciones dinámicas de herramientas

Los servidores MCP pueden actualizar sus herramientas disponibles sin reiniciar la sesión mediante `list_changed` notifications. Claude Code detecta el cambio y actualiza la lista de herramientas automáticamente.

## MCP en CLI

```bash
# Cargar configuración específica
claude --mcp-config ./custom-mcp.json "query"

# Modo estricto — solo usar la config especificada
claude --strict-mcp-config --mcp-config ./production-mcp.json "deploy"

# Suscribirse a canales MCP (mensajes push)
claude --channels discord,telegram
```

## Canales MCP — push messaging

Los Canales (Research Preview) permiten que servidores MCP envíen mensajes a una sesión de Claude Code en ejecución:

```bash
# Suscribirse a canales al iniciar
claude --channels discord,telegram
```

Casos de uso: alertas de CI/CD que llegan a la sesión activa, notificaciones de deploys, mensajes de monitoreo.

## Managed MCP para Enterprise

Los administradores pueden controlar qué servidores MCP están disponibles:

```
~/.config/ClaudeCode/managed-mcp.json  (Linux)
%APPDATA%\ClaudeCode\managed-mcp.json  (Windows)

Settings disponibles:
- allowedServers: [...] → whitelist de servidores
- deniedServers: [...] → blocklist de servidores
```

## Ejemplo completo — GitHub MCP

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.github.com/mcp",
      "oauth": {
        "authServerMetadataUrl": "https://github.com/.well-known/openid-configuration"
      }
    }
  }
}
```

```bash
# Entonces Claude puede:
claude "List all open PRs with failing CI"
claude "Create a PR for branch feature-auth"
claude "Get the diff for PR #123"
```


## `claude mcp serve` — Exponer Claude Code como servidor MCP

```bash
# Lanzar Claude Code como servidor MCP al que otros clientes pueden conectarse
claude mcp serve
```

**Que hace:** Convierte Claude Code en un servidor MCP. Otros clientes MCP (IDEs,
herramientas externas, otros agentes) pueden conectarse y usar las herramientas
de Claude Code a traves del protocolo MCP.

**Casos de uso:**
- Integrar Claude Code como backend en IDEs con soporte MCP
- Exponer capacidades de Claude Code a herramientas de terceros
- Arquitecturas multi-agente donde Claude Code actua como servidor de herramientas

## Code-execution-with-MCP pattern

Patron para ejecutar codigo de forma segura via un servidor MCP especializado:

```json
{
  "mcpServers": {
    "code-executor": {
      "command": "npx",
      "args": ["@mcp/sandbox-executor"],
      "env": {
        "SANDBOX_IMAGE": "python:3.11-slim",
        "TIMEOUT_SECONDS": "30"
      }
    }
  }
}
```

El patron: Claude analiza el codigo, delega la ejecucion al MCP server (corriendo
en Docker/sandbox), el server devuelve stdout/stderr/exit code, Claude interpreta
el resultado. Esto aisla la ejecucion de codigo del filesystem del host.

## Env var expansion en `mcpServers`

Las variables de entorno se pueden referenciar en la configuracion de MCP servers:

```json
{
  "mcpServers": {
    "mi-server": {
      "command": "node",
      "args": ["./mcp-server.js"],
      "env": {
        "API_KEY": "${MY_API_KEY}",
        "DATABASE_URL": "${DB_URL:-postgresql://localhost/dev}",
        "REGION": "${AWS_REGION}"
      }
    }
  }
}
```

**Sintaxis:**
- `${VAR}` — error si VAR no esta definida en el entorno
- `${VAR:-default}` — usa `default` si VAR no esta definida

Mantiene secretos fuera de los archivos de configuracion commitados al repositorio.

## `--strict-mcp-config` — Validacion estricta de config MCP

```bash
# Solo usar los servidores MCP del archivo especificado (ignora user/project config)
claude --strict-mcp-config --mcp-config ./production-mcp.json "consulta"
```

**Comportamiento:**
- Carga solo los servidores MCP del archivo especificado en `--mcp-config`
- Ignora `~/.claude.json` y `.mcp.json` del proyecto
- Rechaza configuraciones MCP invalidas en lugar de ignorarlas silenciosamente

**Cuando usar:**
- Entornos de produccion: garantizar que solo servidores aprobados esten disponibles
- CI/CD: configuracion deterministica sin dependencias de archivos locales del usuario
- Auditorias de seguridad: control exacto de que servidores MCP tiene acceso Claude

---

## Comparación: MCP vs Hooks vs Skills para integraciones

| Aspecto | MCP | Hook | Skill |
|---------|-----|------|-------|
| **Datos en tiempo real** | ✅ | ❌ | ❌ |
| **Ejecutar acciones externas** | ✅ | ✅ | ❌ |
| **Instrucciones persistentes** | ❌ | ❌ | ✅ |
| **Push notifications** | ✅ (Channels) | ❌ | ❌ |
| **Configuración** | `.mcp.json` | `settings.json` | `SKILL.md` |
| **Invocación** | Auto por Claude | Event-driven | Por Claude o usuario |

## Referencias

- [05-mcp/README.md](/tmp/reference/claude-howto/05-mcp/README.md) — Documentación oficial de MCP
- [hooks](hooks.md) — Eventos de Elicitation en hooks
- [plugins](plugins.md) — Bundling de MCP servers en plugins
- [claude-code-components](claude-code-components.md) — Frontmatter `mcpServers` en subagentes
