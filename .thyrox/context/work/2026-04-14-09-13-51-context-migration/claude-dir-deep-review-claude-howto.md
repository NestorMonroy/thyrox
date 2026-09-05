```yml
type: Deep-Review Artifact
created_at: 2026-04-14 17:51:03
source: /tmp/reference/claude-howto/
topic: qué va en .claude/ y qué no — estructura canónica del directorio
fase: FASE 35
```

# claude-dir-deep-review-claude-howto.md

Deep-review Modo 2 (exploración sin sesgo de hipótesis previa).
22 patrones en 7 categorías. Fuente: repositorio `claude-howto`.

---

## Patrones identificados: 22 (en 7 categorías)

---

### Categoría 1: Anatomía canónica de `.claude/` a nivel de proyecto

- **Patrón 1.1:** `.claude/CLAUDE.md` o `./CLAUDE.md` — memoria de proyecto, commiteada vía git, cargada automáticamente al iniciar sesión.
  Fuente: `02-memory/README.md:224-226`, `CATALOG.md:413`

- **Patrón 1.2:** `.claude/rules/*.md` — reglas modulares por tema, con soporte de subdirectorios y path-glob en frontmatter (`paths: src/api/**/*.ts`), descubiertas recursivamente.
  Fuente: `02-memory/README.md:317-336`

- **Patrón 1.3:** `.claude/agents/` — definiciones de subagentes del proyecto (archivos `.md` con frontmatter YAML), commiteadas vía git.
  Fuente: `04-subagents/README.md:71-77`, `CATALOG.md:163`

- **Patrón 1.4:** `.claude/skills/` — skills del proyecto (cada skill es un directorio `skill-name/SKILL.md`), commiteadas vía git.
  Fuente: `03-skills/README.md:87-95`, `CATALOG.md:195-198`

- **Patrón 1.5:** `.claude/commands/` — slash commands legacy del proyecto. Cuando coexiste con `.claude/skills/review/SKILL.md`, el skill toma precedencia.
  Fuente: `03-skills/README.md:23-24`

- **Patrón 1.6:** `.claude/settings.json` — configuración de proyecto, commiteada al repo. Contiene hooks, permisos, configuraciones de comportamiento.
  Fuente: `06-hooks/README.md:25`

- **Patrón 1.7:** `.claude/settings.local.json` — overrides locales del proyecto, explícitamente **no commiteados** (git-ignored).
  Fuente: `06-hooks/README.md:26`, `02-memory/README.md:297-303`

- **Patrón 1.8:** `.claude/agent-memory/<name>/` — memoria persistente de subagente, scope `project`, commiteada.
  Fuente: `04-subagents/README.md:423-425`

- **Patrón 1.9:** `.claude/agent-memory-local/<name>/` — memoria persistente de subagente, scope `local`, **no commiteada**.
  Fuente: `04-subagents/README.md:425`

- **Patrón 1.10:** `.claude/hooks/` — scripts de hooks referenciados desde `settings.json`. Directorio de scripts, no de configuración.
  Fuente: `CATALOG.md:364-369`

---

### Categoría 2: Qué va en `~/.claude/` (user-scope, no proyecto)

- **Patrón 2.1:** `~/.claude/CLAUDE.md` — memoria personal del usuario, aplica a todos los proyectos.
  Fuente: `02-memory/README.md:379`

- **Patrón 2.2:** `~/.claude/rules/` — reglas personales del usuario, aplican a todos los proyectos.
  Fuente: `02-memory/README.md:330-336`

- **Patrón 2.3:** `~/.claude/agents/` — subagentes personales disponibles en todos los proyectos.
  Fuente: `04-subagents/README.md:73`

- **Patrón 2.4:** `~/.claude/skills/` — skills personales disponibles en todos los proyectos.
  Fuente: `CATALOG.md:197`

- **Patrón 2.5:** `~/.claude/settings.json` — configuración personal del usuario.
  Fuente: `06-hooks/README.md:24`

- **Patrón 2.6:** `~/.claude/hooks/` — scripts de hooks de uso personal.
  Fuente: `README.md:460`

- **Patrón 2.7:** `~/.claude/projects/<project>/memory/` — auto-memory de Claude escrita automáticamente durante sesiones. Separada del directorio del proyecto deliberadamente.
  Fuente: `02-memory/README.md:411-413`

- **Patrón 2.8:** `~/.claude/keybindings.json` — keybindings personalizados.
  Fuente: `09-advanced-features/README.md:982`

- **Patrón 2.9:** `~/.claude/teams/{team-name}/config.json` — configuraciones de Agent Teams.
  Fuente: `04-subagents/README.md:648`

---

### Categoría 3: Archivos fuera de `.claude/` que Claude también lee

- **Patrón 3.1:** `./CLAUDE.md` (raíz del repo) — equivalente a `.claude/CLAUDE.md`. Ambas ubicaciones son reconocidas.
  Fuente: `02-memory/README.md:224`, `CATALOG.md:377`

- **Patrón 3.2:** `./CLAUDE.local.md` — overrides locales personales, git-ignored. Respuesta correcta del quiz oficial para "preferencias personales de proyecto no commiteadas".
  Fuente: `02-memory/README.md:237-239`, `question-bank.md:135-138`

- **Patrón 3.3:** `.mcp.json` — configuración de MCP servers del proyecto. Vive en la raíz, no dentro de `.claude/`.
  Fuente: `INDEX.md:196`

---

### Categoría 4: Lo que `.claude/` NO contiene según la documentación

- **Patrón 4.1 (CRÍTICO):** No hay ningún subdirectorio documentado para **estado de sesión, work packages, archivos de contexto temporal, o artefactos de trabajo en curso**. Cero menciones de `context/`, `work/`, `now.md`, `focus.md`, o cualquier estructura similar en `CATALOG.md`, `02-memory/README.md`, `INDEX.md`, `04-subagents/README.md`, `03-skills/README.md`, `06-hooks/README.md`, `07-plugins/README.md`.
  Fuente: Ausencia sistemática en toda la documentación canónica.

- **Patrón 4.2:** La auto-memory generada durante sesiones vive en `~/.claude/projects/<project>/memory/`, **fuera del directorio del proyecto**, para separar lo que Claude escribe automáticamente de lo que los humanos mantienen como configuración.
  Fuente: `02-memory/README.md:411-413`

- **Patrón 4.3:** Los overrides locales (no commiteados) son para configuración de preferencias: `CLAUDE.local.md` y `.claude/settings.local.json`. Ninguno es para artefactos de trabajo.
  Fuente: `02-memory/README.md:237-239`, `06-hooks/README.md:26`

---

### Categoría 5: La distinción committed/local como principio de diseño

- **Patrón 5.1:** El sistema está diseñado explícitamente sobre la dualidad committed/local: `./CLAUDE.md` + `.claude/rules/` (committed) vs `./CLAUDE.local.md` + `.claude/settings.local.json` (local/ignored).
  Fuente: `02-memory/README.md:293-303`

- **Patrón 5.2:** `.claude/agent-memory-local/<name>/` es el único ejemplo de datos generados por Claude dentro de `.claude/` de un proyecto — explícitamente marcado como "not committed to version control".
  Fuente: `04-subagents/README.md:425`

---

### Categoría 6: Plugins — estructura paralela a `.claude/`

- **Patrón 6.1:** Los plugins usan `.claude-plugin/plugin.json` (distinto de `.claude/`) como manifest. Sus componentes se organizan dentro del directorio del plugin, no dentro de `.claude/`.
  Fuente: `07-plugins/README.md:88-121`

- **Patrón 6.2:** Los plugins tienen directorio de datos persistentes via `${CLAUDE_PLUGIN_DATA}`, fuera del árbol del proyecto.
  Fuente: `07-plugins/README.md:236-252`

---

### Categoría 7: El repo claude-howto como evidencia de uso real

- **Patrón 7.1:** En el repo claude-howto, `.claude/` contiene únicamente dos skills (`lesson-quiz/` y `self-assessment/`). No contiene ningún directorio `context/`, `work/`, ni archivos de estado de sesión.
  Fuente: estructura de archivos del repo.

---

## Hallazgo sobre el contexto investigado

La documentación establece una taxonomía consistente: **`.claude/` es el directorio de configuración y extensión de Claude Code**. Contiene lo que define cómo Claude debe comportarse: instrucciones, reglas, agentes, skills, hooks y settings.

Lo que la documentación **nunca menciona** como habitante de `.claude/` son artefactos de trabajo en curso. No existe ningún patrón documentado para `context/`, work packages, archivos `now.md`, `focus.md`, ni estructuras equivalentes.

El estado de sesión generado automáticamente tiene su lugar en `~/.claude/projects/<project>/memory/` — fuera del repo — precisamente para no interferir con la configuración commiteada. La safety invariant que protege `.claude/` es **coherente con este diseño**: Claude Code trata ese directorio como configuración sensible (hooks ejecutables, agentes con acceso a herramientas, reglas de permisos), no como espacio de trabajo.

Archivos de estado efímero (`now.md`, `focus.md`, work packages) en `.claude/` son una fricción de diseño, no un uso previsto.

---

## Qué debe permanecer en `.claude/`

| Directorio/archivo | Tipo | Committed |
|-------------------|------|-----------|
| `CLAUDE.md` | Memoria del proyecto | ✅ Sí |
| `rules/*.md` | Reglas modulares | ✅ Sí |
| `agents/*.md` | Definiciones de subagentes | ✅ Sí |
| `skills/*/SKILL.md` | Skills del proyecto | ✅ Sí |
| `commands/*.md` | Slash commands legacy | ✅ Sí |
| `settings.json` | Configuración del proyecto | ✅ Sí |
| `settings.local.json` | Overrides locales | ❌ No (git-ignored) |
| `hooks/` | Scripts de hooks | ✅ Sí |
| `agent-memory/<name>/` | Memoria persistente de subagente (project) | ✅ Sí |
| `agent-memory-local/<name>/` | Memoria persistente de subagente (local) | ❌ No |

## Qué NO debe estar en `.claude/`

| Tipo | Ubicación recomendada |
|------|----------------------|
| Estado de sesión (`now.md`, `focus.md`) | `.thyrox/context/` u otro dir fuera de `.claude/` |
| Work packages (`context/work/YYYY-MM-DD-*/`) | `.thyrox/context/work/` u otro dir fuera de `.claude/` |
| Artefactos de trabajo en curso | Fuera de `.claude/` |
| Auto-memory generada por Claude | `~/.claude/projects/<project>/memory/` (automático) |

## Recomendación

La evidencia soporta la migración. Los archivos `now.md`, `focus.md` y los work packages no pertenecen en `.claude/` según el modelo canónico. Migrar a `.thyrox/context/` es coherente con el patrón oficial: datos efímeros de ejecución viven fuera del árbol de configuración de Claude Code.
