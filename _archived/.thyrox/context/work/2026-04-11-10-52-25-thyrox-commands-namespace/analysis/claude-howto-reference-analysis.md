```yml
type: Análisis de Referencia
created_at: 2026-04-11 10:52:25
project: thyrox-framework
feature: thyrox-commands-namespace
fase: FASE 31
phase: Phase 1 — ANALYZE
source: https://github.com/luongnv89/claude-howto
cloned_to: /tmp/reference/claude-howto
```

# Análisis de Referencia: luongnv89/claude-howto

Análisis del repositorio de referencia para validar si documenta patrones relevantes
para la implementación del namespace `/thyrox:*` en THYROX.

---

## 1. Hallazgo crítico — El `:` es namespace de PLUGIN, no de proyecto

### Qué dice el repositorio

`01-slash-commands/README.md`:

```
Plugin commands: /plugin-name:command-name
Example: /frontend-design:frontend-design
```

`07-plugins/README.md` — tabla Standalone vs Plugin:

| Approach | Command Names | Configuration | Best For |
|----------|---------------|---|---|
| **Standalone** | `/hello` | Manual setup in CLAUDE.md | Personal, project-specific |
| **Plugins** | `/plugin-name:hello` | Automated via plugin.json | Sharing, distribution, team use |

### Impacto directo en FASE 31

**El formato `/thyrox:*` es EXCLUSIVAMENTE el separador de namespace de plugins.**
No existe un "project namespace" para skills ni commands — ambos usan namespace plano (`/skill-name`).

Para obtener `/thyrox:analyze`, `/thyrox:strategy`, etc. auténticos, THYROX debe
implementarse como un **plugin Claude Code** con:

```
.claude-plugin/
├── plugin.json          ← { "name": "thyrox", "version": "...", "description": "..." }
└── commands/
    ├── analyze.md       → /thyrox:analyze
    ├── strategy.md      → /thyrox:strategy
    ├── plan.md          → /thyrox:plan
    ├── spec.md          → /thyrox:spec
    ├── decompose.md     → /thyrox:decompose
    ├── execute.md       → /thyrox:execute
    ├── track.md         → /thyrox:track
    ├── next.md          → /thyrox:next
    ├── sync.md          → /thyrox:sync
    ├── prime.md         → /thyrox:prime
    ├── review.md        → /thyrox:review
    └── init.md          → /thyrox:init
```

Los `workflow-*` skills existentes no se eliminan — los command files del plugin
los invocan via Skill tool. La relación es: plugin commands = interfaz pública,
workflow-* skills = implementación.

---

## 2. Skills vs Commands — el repositorio ya migró

`01-slash-commands/README.md`:

> "Custom slash commands have been merged into skills. Files in `.claude/commands/`
> still work, but skills (`.claude/skills/`) are now the **recommended approach**.
> Both create `/command-name` shortcuts."

> "If a skill and a command share the same name, the **skill takes precedence**."

### Impacto en Opción B del análisis

**La Opción B (alias en `commands/` que delegan a skills) está ROTA.**

Si el skill `workflow-analyze` existe y se crea un command `analyze.md`, el skill
gana. El command nunca se invocaría cuando se use `/analyze`.

La única forma de que los commands en `commands/` surtan efecto es que NO exista
un skill con el mismo nombre. Pero si el comando es `/thyrox:analyze` (namespace
de plugin), no hay conflicto — es un nombre diferente al skill `workflow-analyze`.

---

## 3. Estructura del plugin Claude Code

### `plugin.json` mínimo

```json
{
  "name": "thyrox",
  "description": "THYROX — framework de gestión de proyectos con metodología SDLC de 7 fases",
  "version": "2.5.0",
  "author": {
    "name": "NestorMonroy"
  }
}
```

### Estructura completa del plugin THYROX

```
thyrox/                          ← raíz del proyecto (ya existe)
├── .claude-plugin/
│   └── plugin.json              ← NUEVO — manifest del plugin
├── .claude/
│   ├── commands/                ← NUEVO — command files del plugin
│   │   ├── analyze.md           → /thyrox:analyze (invocar workflow-analyze)
│   │   ├── strategy.md          → /thyrox:strategy
│   │   ├── plan.md              → /thyrox:plan
│   │   ├── spec.md              → /thyrox:spec
│   │   ├── decompose.md         → /thyrox:decompose
│   │   ├── execute.md           → /thyrox:execute
│   │   ├── track.md             → /thyrox:track
│   │   ├── next.md              → /thyrox:next (meta-comando)
│   │   ├── sync.md              → /thyrox:sync (meta-comando)
│   │   ├── prime.md             → /thyrox:prime (meta-comando)
│   │   ├── review.md            → /thyrox:review (meta-comando)
│   │   └── init.md              → /thyrox:init (reemplaza workflow_init)
│   └── skills/
│       ├── thyrox/              ← ya existe — no cambia
│       └── workflow-*/          ← ya existen — no cambian
```

> **Nota importante:** En plugins, `commands/` contiene los command files (como
> `.claude/commands/` pero scoped al plugin). Los skills del plugin irían en
> `skills/` dentro de la estructura del plugin. Verificar ubicación exacta en la
> documentación oficial antes de implementar.

---

## 4. Comportamiento de `acceptEdits` y confirmación de archivos/carpetas

### Qué dice el repositorio

`09-advanced-features/README.md`:

| Mode | Behavior |
|---|---|
| `acceptEdits` | **Read and edit files; prompts for commands** |

`claude_concepts_guide.md`:

> "acceptEdits | Automatically accept file edits without confirmation | Trusted editing workflows"

### Análisis del problema reportado

El usuario reporta que Claude **aún pide confirmación para creación de archivos o carpetas** pese a tener `"defaultMode": "acceptEdits"`.

**Causas posibles identificadas:**

| Causa | Descripción | Probabilidad |
|-------|-------------|-------------|
| C-01 | `acceptEdits` auto-aprueba `Edit`/`Write` pero **no Bash** — `mkdir` sigue siendo Bash y necesita `allow` explícito | Media |
| C-02 | Pattern `Bash(mkdir *)` no hace match cuando el path es absoluto (`mkdir -p /home/user/thyrox/...`) | Media |
| C-03 | Regresión en v2.1.97 — el comportamiento de `allow` con wildcards cambió | Baja |
| C-04 | La primera invocación de `Write` en una sesión nueva puede generar un único prompt aunque el modo sea `acceptEdits` | Alta |
| C-05 | `ask` rules para `Edit(/.claude/skills/*/SKILL.md)` activan confirmación al editar SKILL.md — esto es intencional | Alta (para SKILL.md) |

**Investigación requerida en próxima sesión:**
1. Reproducir: abrir sesión nueva, ejecutar `mkdir -p .claude/context/work/test/` → ¿pide confirmación?
2. Verificar: ejecutar `Write` a un archivo en `context/work/` → ¿pide confirmación?
3. Identificar: qué operación exacta dispara el prompt (Bash mkdir, Write, o Edit a SKILL.md)
4. Verificar versión actual de Claude Code con `/status` → comparar con v2.1.97

### Settings.json vigente — posibles ajustes

Si el problema es C-04 (primera `Write` en sesión), solución: añadir `Write` explícito al allow:
```json
"allow": [
  ...
  "Write(.claude/context/work/**)"
]
```

Si el problema es C-02 (mkdir path absoluto), solución: verificar si el pattern
`Bash(mkdir *)` cubre `mkdir -p /absolute/path` o si requiere otro formato.

---

## 5. Tabla de relevancia para THYROX

| Hallazgo | Relevancia | Acción requerida |
|----------|-----------|-----------------|
| `:` es namespace de plugin | **CRÍTICO** | Añadir Opción D al análisis y al gate SP-01 |
| Skills > commands (precedencia) | **ALTO** | Opción B inválida para mismo nombre — eliminar de candidatas |
| Estructura plugin `plugin.json` | **ALTO** | Usar como spec para Opción D |
| `acceptEdits` + Bash prompts | **ALTO** | Investigar en próximo WS — verificar qué trigger exacto |
| `commands/` en plugins scoped | **MEDIO** | Confirmar ubicación correcta con docs oficiales antes de implementar |

---

## 6. Nueva Opción D — Plugin architecture

Añadir a la tabla de opciones de implementación en [thyrox-commands-namespace-analysis](thyrox-commands-namespace-analysis.md):

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **D — Plugin** | Crear `.claude-plugin/plugin.json` + `commands/` con command files que invocan los workflow-* skills | Namespace `/thyrox:*` auténtico · skills existentes intactos · distribución via marketplace | Requiere entender estructura exacta de plugins · nueva capa de indirección plugin→skill |

**Opción D es la única que produce `/thyrox:*` auténtico** según la arquitectura oficial de Claude Code.

---

## Archivos del repositorio de referencia más relevantes

| Archivo | Contenido relevante |
|---------|-------------------|
| `01-slash-commands/README.md` | Plugin commands namespace, Skills vs Commands, frontmatter de skills |
| `07-plugins/README.md` | Estructura completa de plugin, `plugin.json`, namespace `/plugin:command` |
| `09-advanced-features/README.md` | Permission modes, `acceptEdits` behavior, `allow`/`ask`/`deny` rules |
| `claude_concepts_guide.md` | Resumen ejecutivo de todos los conceptos Claude Code |
| `03-skills/README.md` | Skills anatomy, frontmatter reference, skill precedence |
