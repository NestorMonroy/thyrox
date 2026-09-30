```yml
type: Deep-Review Artifact
created_at: 2026-04-14 10:45:00
source: /tmp/reference/claude-howto/ (versión 2.3.0, April 2026)
topic: convenciones de nomenclatura, estilo y formato en Claude Code
fase: FASE 35
```

# conventions-review-claude-howto.md

Artefacto autocontenido. Fuente: repositorio `claude-howto` analizado sin sesgo de
hipótesis previa. 38 patrones encontrados en 8 categorías + 5 discrepancias.

---

## Categoría 1: Nomenclatura de archivos y directorios

**P1.1 — Carpetas de lecciones: prefijo numérico `NN-` + kebab-case**
`STYLE_GUIDE.md:37-44`
```
01-slash-commands/   02-memory/   03-skills/
```

**P1.2 — Archivos de features: kebab-case, extensión `.md`**
`STYLE_GUIDE.md:52-58`
```
code-reviewer.md   generate-api-docs.md   format-code.sh
```

**P1.3 — Docs de nivel raíz: UPPER_CASE con guión bajo**
`STYLE_GUIDE.md:56`
```
CATALOG.md   QUICK_REFERENCE.md   STYLE_GUIDE.md   CONTRIBUTING.md
```

**P1.4 — Archivos de memoria: `scope-CLAUDE.md`**
`STYLE_GUIDE.md:55`
```
project-CLAUDE.md   personal-CLAUDE.md   directory-api-CLAUDE.md
```

**P1.5 — Regla base de nomenclatura**
`STYLE_GUIDE.md:62-64`
> "Use **lowercase** for all file and folder names (except top-level docs like `README.md`, `CATALOG.md`)"
> "Use **hyphens** (`-`) as word separators, never underscores or spaces"

---

## Categoría 2: Campo `name` en frontmatter YAML

**P2.1 — Skills: kebab-case, solo letras minúsculas + números + guiones, máx 64 chars**
`03-skills/README.md:139`
> "lowercase letters, numbers, hyphens only (max 64 chars). Cannot contain 'anthropic' or 'claude'."

Ejemplos reales:
- `name: code-review-specialist` — `03-skills/code-review/SKILL.md:2`
- `name: code-refactor` — `03-skills/refactor/SKILL.md:2`

**P2.2 — Subagents: kebab-case (lowercase letters and hyphens)**
`04-subagents/README.md:120`
- `name: code-reviewer` — `04-subagents/code-reviewer.md:2`
- `name: security-reviewer` — `07-plugins/pr-review/agents/security-reviewer.md:2`

**P2.3 — Plugins: kebab-case**
`07-plugins/README.md:78`
- `"name": "pr-review"` — `07-plugins/pr-review/.claude-plugin/plugin.json:2`

**P2.4 — Campo `description`: una oración, máx 1024 chars, incluir cuándo usar**
`STYLE_GUIDE.md:498-499`
> "Keep `description` to one sentence"
> "description: what the Skill does AND when to use it. Critical for auto-invocation matching."

Budget técnico: cap del 1% del context window (fallback 8.000 chars); cada entrada
capeada en 250 chars. `03-skills/README.md:103`

---

## Categoría 3: Capitalización en encabezados y títulos

**P3.1 — Sentence case para TODOS los encabezados**
`STYLE_GUIDE.md:144`
> "**Use sentence case** — capitalize first word and proper nouns only (exception: feature names stay as-is)"

Aplica a H1, H2, H3, H4 sin excepción.

**P3.2 — Una sola H1 por documento**
`STYLE_GUIDE.md:131, 141`
> "**One H1 per document** — the page title only"

**P3.3 — Emojis: solo en root README, no en lesson READMEs**
`STYLE_GUIDE.md:461`
> "**Only use emojis in headers** on the root README (not in lesson READMEs)"

---

## Categoría 4: Parámetros de herramientas

**P4.1 — Campo `tools` en subagents: PascalCase, separado por comas**
`04-subagents/README.md:122`
```
tools: Read, Grep, Glob, Bash
```

**P4.2 — Sintaxis para restringir Bash (dos formas — sin consenso)**
```yaml
# Forma A (con `:`)
allowed-tools: Bash(git add:*), Bash(git status:*)

# Forma B (sin `:`)
allowed-tools: Bash(npm *), Bash(git *)
```
No hay regla explícita en `STYLE_GUIDE.md` que resuelva cuál usar. Ver Discrepancia 5.

**P4.3 — Nombre de campo distinto según tipo de artefacto**
`STYLE_GUIDE.md:474`, `04-subagents/README.md:122`
| Artefacto | Campo |
|-----------|-------|
| Skills y commands | `allowed-tools:` |
| Subagents | `tools:` |

**P4.4 — Modelos válidos**: `opus`, `sonnet`, `haiku`, o model ID completo
`04-subagents/README.md:124`

---

## Categoría 5: Estructura de documentos

**P5.1 — Orden canónico para lesson READMEs**
`STYLE_GUIDE.md:89-101`
1. H1 title
2. Overview paragraph
3. Quick reference table (opcional)
4. Architecture diagram (Mermaid, opcional)
5. Detailed sections (H2)
6. Practical examples
7. Best practices (Do's and Don'ts tables)
8. Troubleshooting
9. Related guides / Official docs
10. Document metadata footer

**P5.2 — Footer de metadata obligatorio**
`STYLE_GUIDE.md:598-608`
```markdown
---
**Last Updated**: March 2026
**Claude Code Version**: 2.1.97
**Compatible Models**: Claude Sonnet 4.6, ...
```

---

## Categoría 6: Formato de texto y énfasis

| Elemento | Uso | Sintaxis |
|----------|-----|---------|
| Bold | Términos clave, labels en tablas | `**text**` |
| Italic | Primera mención de términos técnicos | `*text*` |
| Code inline | Nombres de archivos, comandos, config | `` `text` `` |
| Callout | Notes, Tips, Warnings | `> **Note:** ...` |
| Listas | Non-ordered, 2-space indent, máx 3 niveles | `-` |

`STYLE_GUIDE.md:154-225`

---

## Categoría 7: Código

**P7.1 — Siempre especificar language tag**: `bash`, `json`, `yaml`, `markdown`
`STYLE_GUIDE.md:279-293`

**P7.2 — Comentar antes de comandos no obvios**
`STYLE_GUIDE.md:300`

---

## Categoría 8: Naming de artefactos del framework

**P8.1 — Vocabulario canónico**
`STYLE_GUIDE.md:554-558`
| Usar | No usar |
|------|---------|
| "Claude Code" | "Claude CLI", "the tool" |
| "skill" | "custom command" (legacy) |

**P8.2 — Directorios canónicos por tipo**
| Artefacto | Project | User |
|-----------|---------|------|
| Skills | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |
| Subagents | `.claude/agents/<name>.md` | `~/.claude/agents/<name>.md` |
| Commands (legacy) | `.claude/commands/<name>.md` | `~/.claude/commands/` |
| Hooks | `.claude/hooks/` | `~/.claude/hooks/` |
| Memory | `./CLAUDE.md` | `~/.claude/CLAUDE.md` |
| Plugin manifest | `.claude-plugin/plugin.json` | — |

**P8.3 — Archivo de skill siempre `SKILL.md` (UPPER_CASE)**
`CATALOG.md:203`, `03-skills/README.md:108`

**P8.4 — Plugin namespace**: `plugin-name:command-name`
`01-slash-commands/README.md:271-276`

**P8.5 — MCP tool format**: `/mcp__<server>__<tool>`
`01-slash-commands/README.md:288`

**P8.6 — Conventional commits**: `type(scope): description`
`STYLE_GUIDE.md:563-589`

---

## Discrepancias entre reglas y ejemplos

| # | Descripción | Severidad |
|---|-------------|-----------|
| D1 | Plugin commands usan `name: Review PR` (title case) — violan regla kebab-case de `STYLE_GUIDE.md:496` | Media |
| D2 | Plugin subagent usa `tools: read, grep` (minúsculas) — debería ser PascalCase | Baja |
| D3 | `LEARNING-ROADMAP.md` usa emojis en H2/H3 — viola `STYLE_GUIDE.md:461` | Baja |
| D4 | `optimize.md` y `commit.md` no tienen campo `name` — el campo tiene default implícito | Baja |
| D5 | Sintaxis Bash: `Bash(cmd:*)` vs `Bash(cmd *)` — ambas coexisten sin regla canónica | Media |

---

## Hallazgo relevante para THYROX: Agent tool `description`

El repositorio **no documenta convenciones específicas** para el parámetro `description`
del Agent tool (subagent invocation via código). La convención más cercana aplicable es:

- **P3.1 (sentence case):** primera palabra capitalizada, resto minúsculas salvo nombres propios
- **P2.4:** descripciones como una sola oración

Por consistencia con sentence case (P3.1), la convención recomendada para el
parámetro `description` del Agent tool sería: **minúscula**, salvo primera palabra
y nombres propios.

Ejemplo: `"deep-review de ultimate-guide sobre permisos"` (no `"Deep-review..."`)

---

## Gaps en `.claude/references/` de THYROX

| Tema | Fuente externa | Estado |
|------|---------------|--------|
| Tabla de directorios canónicos | `CATALOG.md` + `STYLE_GUIDE.md:474` | No documentado |
| Distinción `tools` vs `allowed-tools` | `04-subagents/README.md:122` | No documentado |
| Vocabulario: "skill" no "custom command" | `STYLE_GUIDE.md:554` | No documentado |
| Budget de descriptions (1% ctx window) | `03-skills/README.md:103` | No documentado |
| Plugin namespace `plugin:command` | `01-slash-commands/README.md:271` | Posiblemente en ADR-019 |

**Recomendación:** Crear `references/conventions-claude-artifacts.md` con los patrones
de nomenclatura canónicos por tipo de artefacto.
