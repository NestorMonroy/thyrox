# Memory Hierarchy — Sistema de Memoria en Claude Code

Referencia para el sistema de memoria de 8 niveles de Claude Code. Controla qué instrucciones se cargan automáticamente, en qué orden, y con qué precedencia.

## Los 8 niveles de memoria (prioridad descendente)

| Prioridad | Tipo | Ubicación | Alcance |
|-----------|------|-----------|---------|
| 1 (máxima) | **Managed Policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | Organización |
| 2 | **Managed Drop-ins** | `managed-settings.d/*.md` (v2.1.83+) | Organización (modular) |
| 3 | **Project Memory** | `./CLAUDE.md` o `./.claude/CLAUDE.md` | Proyecto (equipo) |
| 4 | **Project Rules** | `./.claude/rules/*.md` (glob patterns) | Proyecto (modular) |
| 5 | **User Memory** | `~/.claude/CLAUDE.md` | Usuario (todos los proyectos) |
| 6 | **User Rules** | `~/.claude/rules/*.md` | Usuario (modular) |
| 7 | **Local Project Memory** | `./CLAUDE.local.md` (git-ignored) | Máquina local |
| 8 (mínima) | **Auto Memory** | `~/.claude/projects/<project>/memory/` | Auto-escrita por Claude |

**Regla:** Los niveles superiores toman precedencia. Si Managed Policy dice X y Project Memory dice ¬X, gana X.

## Cargado automático vs on-demand

Los archivos CLAUDE.md se cargan automáticamente al inicio de sesión. Los archivos en subdirectorios se cargan cuando Claude accede a esos directorios (traversal contextual).

```
/project-root/
├── CLAUDE.md              ← cargado al inicio
├── .claude/
│   ├── CLAUDE.md          ← cargado al inicio (alternativa)
│   └── rules/
│       ├── security.md    ← cargado por glob pattern match
│       └── tests.md       ← cargado por glob pattern match
├── src/
│   └── CLAUDE.md          ← cargado cuando Claude accede a src/
└── CLAUDE.local.md        ← cargado al inicio, NO commiteado
```

## Import syntax — `@path/to/file`

Los archivos CLAUDE.md pueden importar otros archivos para modularidad:

```markdown
# Importar archivo relativo al proyecto
@.claude/team-standards.md

# Importar archivo del usuario
@~/.claude/personal-preferences.md
```

**Restricciones:**
- La sintaxis `@path` NO funciona dentro de bloques de código markdown
- Importaciones recursivas limitadas a **5 niveles** (previene loops)
- Primera vez que se importa desde ruta externa → diálogo de aprobación único

## Auto Memory — Claude escribe su propia memoria

Claude puede auto-actualizar su memoria persistente para recordar preferencias y contexto entre sesiones:

```
~/.claude/projects/<hash-del-proyecto>/memory/
├── preferences.md     ← preferencias aprendidas
├── patterns.md        ← patrones del proyecto descubiertos
└── context.md         ← contexto acumulado
```

**Control:**
```bash
# Deshabilitar auto memory
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1
```

**Cuándo es útil:** Claude aprende convenciones del proyecto (naming, patterns preferidos) y las retiene entre sesiones sin que el usuario deba repetirlas.

## Managed Settings para Enterprise

Los administradores pueden hacer cumplir políticas a nivel de organización:

```
macOS:   /Library/Application Support/ClaudeCode/
Linux:   ~/.config/ClaudeCode/
Windows: %APPDATA%\ClaudeCode\

Archivos disponibles:
├── CLAUDE.md               # Memoria de política org (nivel 1)
├── managed-settings.json   # Configuración org (permisos, herramientas)
├── managed-mcp.json        # Whitelist/blocklist de servidores MCP
└── managed-settings.d/     # Drop-ins modulares (v2.1.83+)
    ├── security.json
    ├── dev-tools.json
    └── integrations.json
```

**Jerarquía de settings:**
```
managed-settings.json (más alto)
  ↓
~/.claude/settings.json
  ↓
.claude/settings.json
  ↓
.claude/settings.local.json (más bajo)
```

Las organizaciones pueden usar `claudeMdExcludes` para filtrar CLAUDE.md irrelevantes en monorepos:

```json
{
  "claudeMdExcludes": ["vendor/**", "node_modules/**", "packages/legacy/**"]
}
```

## Memoria de subagentes — scope por agente

Los subagentes tienen su propio directorio de memoria separado del contexto principal:

```yaml
---
name: researcher
memory: project    # user | project | local
---
```

| Scope | Directorio |
|-------|-----------|
| `user` | `~/.claude/agent-memory/<agent-name>/` |
| `project` | `.claude/agent-memory/<agent-name>/` |
| `local` | `.claude/agent-memory-local/<agent-name>/` |

**Cómo funciona:**
- Las primeras **200 líneas** (o 25KB) de `MEMORY.md` se inyectan automáticamente en el system prompt del subagente
- Archivos de temas adicionales se cargan on-demand
- El subagente tiene Read/Write/Edit habilitados para gestionar su propia memoria

## Niveles de memoria para diferentes audiencias

| Nivel | Quién lo usa | Ejemplo de contenido |
|-------|-------------|---------------------|
| Managed Policy (1) | Admin IT | Políticas de seguridad, herramientas prohibidas |
| Project Memory (3) | Equipo | Convenciones de código, arquitectura del proyecto |
| User Memory (5) | Desarrollador | Preferencias personales, estilo de respuesta |
| Local Project (7) | Máquina local | Rutas de entorno local, credenciales de dev |
| Auto Memory (8) | Claude mismo | Patrones aprendidos, preferencias inferidas |

## Contexto THYROX

En THYROX, la memoria sigue este patrón:
- **Nivel 3 (Project):** `.claude/CLAUDE.md` — reglas del framework (Locked Decisions, estructura)
- **Nivel 4 (Rules):** Potencialmente `.claude/rules/` para modularizar reglas por capa
- **Nivel 7 (Local):** `CLAUDE.local.md` si existe — overrides locales no commiteados

El `context/now.md` y `context/focus.md` de THYROX NO son memoria de Claude Code — son archivos de estado que el skill lee explícitamente al inicio de sesión (via `session-start.sh` hook + instrucción en CLAUDE.md). Son diferentes mecanismos.

## Referencias

- [02-memory/README.md](/tmp/reference/claude-howto/02-memory/README.md) — Documentación oficial de memoria
- [claude-code-components](claude-code-components.md) — Frontmatter de skills y agentes
- [state-management](state-management.md) — Archivos de estado de sesión (now.md, focus.md)
- [subagent-patterns](subagent-patterns.md) — Memoria persistente de subagentes
