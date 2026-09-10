# Análisis de mise como referencia de diseño para THYROX

**Repositorio:** https://github.com/jdx/mise
**Fecha de análisis:** 2026-04-07
**Propósito:** Extraer patrones de diseño aplicables a THYROX (meta-framework de gestión de proyectos para Claude Code)

---

## Objetivo / Por qué

mise es un gestor de versiones de herramientas de desarrollo (reemplaza nvm, pyenv, rbenv, etc.). Lo que nos interesa NO es el producto en sí, sino su **arquitectura como referencia** para THYROX:

- Cómo organiza un registry extensible con cientos de entradas
- Cómo separa datos (registry) de comportamiento (backends)
- Cómo documenta y valida configuración
- Cómo gestiona extensibilidad sin modificar el core

## Resumen Ejecutivo

- **Registry declarativo plano**: 938 archivos TOML (uno por herramienta), cada uno con 3-8 campos. La simplicidad es el punto: `backends`, `description`, `detect`, `aliases`, `test`, `idiomatic_files`. Sin jerarquías complejas.
- **Backends como trait/interface**: Cada "mecanismo de instalación" implementa una interfaz común. Los tools son datos (registry TOML); los backends son código (Rust). Esta separación datos/comportamiento es clave.
- **Configuración jerárquica con merge semántico diferenciado**: `[tools]` y `[env]` son aditivos (merge upward), `[tasks]` son reemplazados completamente (no merge). Diferente semántica por sección, documentada explícitamente.
- **Tres capas de configuración**: sistema (`/etc/mise/`), usuario (`~/.config/mise/`), proyecto (`mise.toml` + `mise.local.toml`). Walk-up del árbol de directorios desde el CWD.
- **File-based tasks como alternativa a TOML inline**: Scripts ejecutables en `mise-tasks/` con metadata en comentarios (`#MISE description="..."`) — la configuración vive con el código que ejecuta.
- **Hooks de lifecycle bien definidos**: `enter`, `leave`, `cd`, `preinstall`, `postinstall`, `watch_files`. Permiten automatización sin tocar el core.
- **Schema JSON con autocompletion**: `mise.json` publicado en CDN, referenciado con `#:schema ./schema/mise.json` en el propio `mise.toml`. Los editores lo consumen automáticamente.
- **Test integrado en el registry**: Cada tool puede definir `test = { cmd = "rg --version", expected = "ripgrep {{version}}" }`. La verificación es parte de la definición, no un script separado.
- **CLI organizado por dominio**: 14 subdirectorios en `src/cli/` (backends/, cache/, config/, plugins/, tasks/...) + 53 archivos de comandos individuales. "Comando por archivo" + agrupación por dominio.
- **Monorepo con `task_config`**: Las tasks pueden cargarse desde archivos externos (`tasks.toml`) y directorios (`xtasks/`), permitiendo modularizar sin romper el formato central.

---

## Estructura de Directorios Anotada

```
mise/
├── src/                        # Código fuente Rust (74.6% del repo)
│   ├── cli/                    # CLI: 14 subdirectorios por dominio + 53 archivos por comando
│   │   ├── backends/           # Comandos de gestión de backends
│   │   ├── cache/              # Operaciones de caché
│   │   ├── config/             # Comandos de configuración
│   │   ├── plugins/            # Gestión de plugins
│   │   ├── tasks/              # Gestión de tasks
│   │   ├── install.rs          # Comando: mise install
│   │   ├── use.rs              # Comando: mise use
│   │   ├── exec.rs             # Comando: mise exec
│   │   ├── run.rs              # Comando: mise run
│   │   └── ...53 archivos más
│   ├── backend/                # 23 backends implementando un trait común
│   │   ├── mod.rs              # Registro de backends + interfaz trait
│   │   ├── backend_type.rs     # Enum de tipos de backend
│   │   ├── core/               # Backends builtin (node, python, ruby...)
│   │   ├── github.rs           # Backend: GitHub Releases
│   │   ├── aqua.rs             # Backend: Aqua registry
│   │   ├── npm.rs              # Backend: npm packages
│   │   ├── cargo.rs            # Backend: Cargo crates
│   │   ├── pipx.rs             # Backend: pipx (Python tools)
│   │   ├── asset_matcher.rs    # Lógica de selección de assets
│   │   └── version_list.rs     # Enumeración de versiones
│   ├── config/                 # Sistema de configuración
│   │   ├── config_file/        # Parsing de archivos de config
│   │   ├── env_directive/      # Directivas especiales de [env]
│   │   └── settings.rs         # Settings globales
│   ├── plugins/                # Sistema de plugins Lua
│   ├── task/                   # Motor de ejecución de tasks
│   ├── toolset/                # Gestión de instalaciones
│   ├── hooks.rs                # Lifecycle hooks
│   └── env.rs, dirs.rs, cache.rs, git.rs, github.rs...
│
├── registry/                   # 938 archivos TOML (uno por tool)
│   ├── node.toml               # Tool: Node.js
│   ├── python.toml             # Tool: Python
│   ├── ripgrep.toml            # Tool: ripgrep (con múltiples backends)
│   ├── terraform.toml          # Tool: Terraform (con idiomatic_files)
│   └── ...935 más
│
├── docs/                       # Documentación VitePress/Vite
│   ├── configuration.md        # Referencia de configuración
│   ├── tasks/                  # Subsección tasks
│   ├── dev-tools/backends/     # Subsección backends
│   └── ...
│
├── schema/
│   └── mise.json               # JSON Schema de mise.toml (para autocompletion)
│
├── e2e/                        # Tests end-to-end por funcionalidad
├── e2e-win/                    # Tests E2E específicos Windows
├── test/                       # Tests unitarios
├── xtasks/                     # Tasks de desarrollo externas (scripts de build)
├── tasks.toml                  # Tasks de desarrollo del propio proyecto
├── completions/                # Shell completions (bash, zsh, fish, pwsh)
├── man/man1/                   # Páginas de manual
├── packaging/                  # Empaquetado para distribución
└── mise.toml                   # Config del propio proyecto (self-hosted)
```

---

## Patrones Clave

### 1. Registry Design: Datos Planos + Múltiples Backends

El registry es **puramente declarativo**. Cada archivo TOML describe UN tool. El formato es minimalista:

```toml
# registry/ripgrep.toml
aliases = ["rg"]

backends = [
  "aqua:BurntSushi/ripgrep",
  "asdf:https://gitlab.com/wt0f/asdf-ripgrep",
  "cargo:ripgrep",
]

description = "ripgrep recursively searches directories for a regex pattern while respecting your gitignore"

test = { cmd = "rg --version", expected = "ripgrep {{version}}" }
```

```toml
# registry/node.toml
backends = ["core:node"]
description = "Node.js® is a free, open-source, cross-platform JavaScript runtime environment..."
detect = ["package.json", ".nvmrc", ".node-version"]
```

```toml
# registry/terraform.toml
backends = [
  "aqua:hashicorp/terraform",
  "asdf:mise-plugins/mise-hashicorp",
  "vfox:mise-plugins/vfox-terraform",
]
description = "..."
idiomatic_files = [".terraform-version"]
test = { cmd = "terraform version", expected = "Terraform v{{version}}" }
```

**Campos del registry:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `backends` | `string[]` | Mecanismos de instalación, en orden de preferencia |
| `description` | `string` | Descripción del tool |
| `aliases` | `string[]` | Nombres alternativos del tool |
| `detect` | `string[]` | Archivos que activan este tool automáticamente |
| `idiomatic_files` | `string[]` | Archivos de versión específicos del tool |
| `test` | `{ cmd, expected }` | Verificación de instalación correcta |

### 2. Plugin System: Trait-Based + 4 Tipos

La arquitectura de backends sigue este patrón:

```
Backend Trait (interfaz)
├── Core Backends      → src/backend/core/ (node, python, ruby, go...)
│                        Implementados en Rust, shippeados con el binario
├── Package Manager    → npm, cargo, pipx, gem, conda, dotnet
│                        Delegan al PM nativo
├── Universal          → github, aqua, http, s3, ubi
│                        Instalan desde fuentes genéricas
└── Plugin Backends    → asdf, vfox + custom plugins (Lua/shell)
                         Extensibilidad sin modificar core
```

Formato de referencia en config: `backend:tool-identifier`
- `core:node`
- `aqua:BurntSushi/ripgrep`
- `github:cli/cli`
- `npm:prettier`
- `cargo:ripgrep`

### 3. Configuración: Jerarquía con Merge Semántico

**Orden de carga** (mayor a menor precedencia):
1. `mise.local.toml` (local, no commiteado)
2. `mise.toml`
3. `mise/config.toml` o `.mise/config.toml`
4. `.config/mise.toml`
5. Parent dirs (walk-up hasta `/`)
6. `~/.config/mise/config.toml` (global usuario)
7. `/etc/mise/config.toml` (sistema)

**Comportamiento de merge por sección:**
- `[tools]`: Aditivo con override (hijo reemplaza versión del padre, añade nuevos)
- `[env]`: Aditivo con override
- `[tasks]`: Reemplazo total por task (el hijo reemplaza completamente una task del padre)
- `[settings]`: Aditivo con override

**Formato completo de `mise.toml`:**
```toml
#:schema ./schema/mise.json
min_version = "2024.1.1"

[tools]
node = "24"
python = { version = "3.12", virtualenv = ".venv" }
"npm:prettier" = "3"
"aqua:BurntSushi/ripgrep" = "latest"
"github:cli/cli" = "latest"

[env]
NODE_ENV = "production"
DATABASE_URL = { required = true }
_.file = ".env"
_.path = ["./bin", "./node_modules/.bin"]

[tasks.build]
description = "Build the project"
run = "cargo build --release"
depends = ["lint"]
sources = ["src/**/*.rs"]
outputs = ["target/release/app"]

[tasks.ci]
depends = ["build", "lint", "test"]  # Tarea coordinadora sin run

[hooks]
enter = ["echo 'entering project'", { task = "setup" }]
postinstall = "echo 'Installed: $MISE_INSTALLED_TOOLS'"

[task_config]
includes = ["tasks.toml", "xtasks"]

[settings]
jobs = 4
```

### 4. File-Based Tasks: Scripts con Metadata

Las tasks pueden ser scripts ejecutables independientes:

```bash
#!/usr/bin/env bash
#MISE description="Build the CLI"
#MISE alias="b"
#MISE depends=["lint"]
#MISE sources=["src/**/*.rs"]
#MISE outputs=["target/debug/app"]
#MISE env={RUST_LOG = "debug"}
#MISE dir="{{cwd}}"

cargo build
```

**Organización por directorio:**
```
mise-tasks/
├── build           # → mise run build
├── lint            # → mise run lint
└── test/
    ├── unit        # → mise run test:unit
    └── integration # → mise run test:integration
```

### 5. Hooks de Lifecycle

```toml
[hooks]
cd = "echo 'directory changed'"
enter = "echo 'entering project'"
leave = "echo 'leaving project'"
preinstall = "echo 'before install'"
postinstall = "echo 'after: $MISE_INSTALLED_TOOLS'"

[[watch_files]]
patterns = ["src/**/*.rs"]
run = "cargo fmt"
```

### 6. Auto-Detection ("Idiomatic Files")

Mise detecta automáticamente el contexto de un proyecto por archivos presentes:
- `package.json`, `.nvmrc`, `.node-version` → activa Node
- `pyproject.toml`, `.python-version`, `setup.py`, `requirements.txt` → activa Python
- `.terraform-version` → activa Terraform

Esto elimina configuración explícita para proyectos existentes.

---

## Paralelos con THYROX

| Concepto en mise | Equivalente en THYROX | Notas |
|-----------------|----------------------|-------|
| `registry/*.toml` (tool definitions) | `skills/*/SKILL.md` | THYROX usa Markdown; mise usa TOML |
| Backend (npm, github, aqua...) | Tipo de skill (framework, library, tool) | La "forma de instalar/ejecutar" |
| `[tools]` en mise.toml | Declaración de skills en project-state.md | Qué herramientas/skills usa este proyecto |
| `[tasks]` en mise.toml | Work packages en `context/work/` | Unidades de trabajo ejecutables |
| `[hooks].enter` | Session startup flow (CLAUDE.md §Flujo) | Automatización al entrar al contexto |
| `detect = ["package.json"]` | Auto-detección de tech stack en Phase 1 | Identificar qué skills activar |
| `mise.local.toml` (no commiteado) | `context/now.md` (estado de sesión) | Estado local no versionado |
| Walk-up de directorios | Herencia de context entre proyectos anidados | Config padre + config hijo |
| `#:schema ./schema/mise.json` | Schema de CLAUDE.md / project-state.md | Validación y autocompletion |
| File-based tasks en `mise-tasks/` | Scripts en `.claude/skills/*/scripts/` | Comportamiento como archivos ejecutables |
| ADR implícito en CONTRIBUTING.md | ADRs explícitos en `.claude/context/decisions/` | THYROX lo hace más explícito |
| `task_config.includes` | Composición de skills en SKILL.md | Modularizar sin romper el formato central |

---

## Inspiraciones Concretas para THYROX

### Inspiración 1: `skill.toml` por skill — registry declarativo

**Problema actual:** Los skills de THYROX son archivos SKILL.md ricos pero difíciles de indexar/descubrir programáticamente.

**Inspiración de mise:** El registry usa un archivo TOML por tool con campos bien definidos y consultables.

**Aplicación a THYROX:**

```toml
# .claude/skills/pm-thyrox/skill.toml
id = "pm-thyrox"
version = "3.1"
description = "Meta-framework de gestión de proyectos para Claude Code"
aliases = ["pm", "project-management"]
detect = [".claude/CLAUDE.md", ".claude/context/project-state.md"]
backends = ["copy:template", "git:submodule"]
depends = []
test = { check = ".claude/context/focus.md exists" }
```

### Inspiración 2: Merge Semántico Diferenciado por Sección

**Aplicación a THYROX:**

| Sección en CLAUDE.md | Comportamiento | Razón |
|----------------------|----------------|-------|
| Locked Decisions | REEMPLAZO total | Las reglas del proyecto hijo ganan |
| Configuración del Proyecto | OVERRIDE | Hijo sobreescribe padre |
| Flujo de sesión | HEREDADO | La metodología es global |
| Skills activados | ADITIVO | Se suman, no se restan |

### Inspiración 3: Auto-Detection de Context por Archivos

**Aplicación a THYROX:** `detect` en cada `skill.toml` para activación automática en el session-start hook.

```toml
detect = [
  "pyproject.toml",
  "package.json",
  "docker-compose.yml",
  ".claude/context/work/**",
]
```

### Inspiración 4: `package.toml` por work package

**Aplicación a THYROX:**

```toml
# .claude/context/work/2026-04-07-XX-XX-XX-refactor-api/package.toml
id = "refactor-api"
created_at = "2026-04-07T13:00:00Z"
phase = "EXECUTE"
status = "active"
depends = ["define-schema"]

[context]
ticket = "GH-142"
adr = "decisions/api/ADR-005.md"
```

### Inspiración 5: Schema JSON con Autocompletion

**Aplicación a THYROX:**

```json
// .claude/schema/skill.json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "title": "THYROX Skill Definition",
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
    "version": { "type": "string" },
    "phase": { "enum": ["ANALYZE", "STRATEGY", "PLAN", "STRUCTURE", "DECOMPOSE", "EXECUTE", "TRACK"] },
    "backends": { "type": "array", "items": { "type": "string" } }
  }
}
```

### Inspiración 6: Test/Verify Integrado en la Definición

**Aplicación a THYROX (`thyrox doctor`):**

```toml
[[verify]]
check = "file_exists:.claude/context/project-state.md"
error = "project-state.md no existe. Ejecuta: thyrox init"

[[verify]]
check = "git_repo:."
error = "No es un repositorio git. pm-thyrox requiere git."
```

### Inspiración 7: Hooks de Lifecycle Declarativos

**Aplicación a THYROX:**

```toml
# .claude/hooks.toml
[hooks]
session_start = [
  { task = "read:focus" },
  { task = "read:now" },
  { task = "read:roadmap" },
  { task = "detect:work-phase" }
]
session_end = [
  { task = "update:focus" },
  { task = "update:now" }
]
```

### Inspiración 8: `task_config.includes` para Modularizar SKILL.md

**Aplicación a THYROX:**

```toml
# .claude/skills/pm-thyrox/skill.toml
[phases]
includes = [
  "phases/analyze.md",
  "phases/strategy.md",
  "phases/plan.md",
  "phases/structure.md",
  "phases/decompose.md",
  "phases/execute.md",
  "phases/track.md",
]
```

---

## Conclusión: Principios de diseño de mise aplicables a THYROX

1. **Datos vs Comportamiento** — registry (datos) separado de backends (comportamiento). En THYROX: `skill.toml` (datos) separado de `SKILL.md` (comportamiento/metodología).
2. **Flat > Nested para registry** — un archivo por elemento, campos mínimos. Escala a 938 tools sin fricción.
3. **Merge semántico documentado** — no todos los datos heredan igual. Documentar explícitamente qué se mergea, qué se reemplaza, qué es aditivo.
4. **Self-hosted** — mise usa su propio `mise.toml` para gestionarse. THYROX debe ser un ejemplo vivo de sí mismo.
5. **Extensión sin modificar core** — nuevos skills = nuevos archivos, no modificar el motor.
6. **Verificación integrada** — la definición incluye cómo verificar que funciona. No son scripts separados.
7. **Schema como contrato** — `#:schema` como primera línea. El schema es la fuente de verdad del formato.
