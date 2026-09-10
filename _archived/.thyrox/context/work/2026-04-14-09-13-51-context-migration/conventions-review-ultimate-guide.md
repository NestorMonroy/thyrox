```yml
type: Deep-Review Artifact
created_at: 2026-04-14 11:00:00
source: /tmp/reference/claude-code-ultimate-guide/ (versión 3.38.12, guide 3.34.1)
topic: convenciones de nomenclatura, estilo y formato en Claude Code
fase: FASE 35
```

# conventions-review-ultimate-guide.md

Artefacto autocontenido. Fuente: repositorio `claude-code-ultimate-guide` analizado
sin sesgo de hipótesis previa. 47 patrones en 8 categorías + 4 discrepancias.

---

## Categoría 1: Campo `name` en agentes

**P1.1 — Kebab-case obligatorio**
`guide/ultimate-guide.md:6489` — "Kebab-case identifier"
`examples/commands/audit-agents-skills.md:118` — "Name is lowercase, 1-64 chars, matches `[a-z0-9-]+`"

**P1.2 — `name` debe coincidir con filename sin extensión**
`guide/ultimate-guide.md:7431`
Evidencia en todos los ejemplos:
- `examples/agents/code-reviewer.md` → `name: code-reviewer`
- `examples/agents/adr-writer.md` → `name: adr-writer`
- `examples/agents/devops-sre.md` → `name: devops-sre`

**P1.3 — Sin guión doble (`--`), máximo 64 chars**
`guide/ultimate-guide.md:7431`

---

## Categoría 2: Campo `name` en skills

**P2.1 — Misma especificación que agentes**
`guide/ultimate-guide.md:7431` — lowercase, 1-64 chars, hyphens only, no `--`

**P2.2 — Directorio del skill coincide con su `name`**
Evidencia en todos los ejemplos:
- Directorio `audit-agents-skills/` → `name: audit-agents-skills`
- Directorio `rtk-optimizer/` → `name: rtk-optimizer`

---

## Categoría 3: Campo `name` en commands

**P3.1 — Kebab-case sin excepciones**
25+ ejemplos en `examples/commands/` — todos kebab-case:
`audit-agents-skills`, `check-cache-bugs`, `git-worktree-clean`, `land-and-deploy`

**P3.2 — Sistema de prefijos semánticos**
`CLAUDE.md:244-249`
| Prefijo | Patrón | Ejemplos |
|---------|--------|---------|
| `audit-*` | Quality checks con scored output | `audit-agents-skills`, `audit-deps` |
| `update-*` | Sync/refresh desde fuente externa | `update-infos-release` |
| `security-*` | Scans de seguridad, profundidad ascendente | `security-check` (quick), `security-audit` (full) |
| *(sin prefijo)* | Core workflow commands | `release`, `sync`, `version` |

**P3.3 — Subnamespace: `{namespace}:{command}` en invocación**
`guide/ultimate-guide.md:9123-9127`
- `commit.md` en `tech/` → `/tech:commit`
- `problem-framer.md` en `product/` → `/product:problem-framer`

---

## Categoría 4: Campo `description` — formato y contenido

**P4.1 — Agentes: trigger de activación, no descripción interna**
`guide/ultimate-guide.md:6489` — "When to activate this agent (use 'PROACTIVELY' for auto-invocation)"
`guide/ultimate-guide.md:6475` — "Clear activation trigger (50-100 chars)"
`guide/ultimate-guide.md:7507` — "tell Claude WHEN to activate this skill, not what it does internally"

**P4.2 — Dos patrones de description para agentes**
```yaml
# Patrón "Use when":
description: Use when designing APIs, reviewing database schemas, or optimizing backend performance

# Patrón "PROACTIVELY":
description: Security code reviewer - use PROACTIVELY when reviewing auth code
```
`guide/ultimate-guide.md:6612` y `guide/ultimate-guide.md:6960`

**P4.3 — Skills: `{qué hace}. Use when {condición}.` — máx 1024 chars**
`guide/ultimate-guide.md:7424`
Evidencia:
- `"Audit Claude Code agents, skills, and commands for quality. Use when evaluating skill quality..."`
- `"Wrap high-verbosity shell commands with RTK. Use when running git log, git diff..."`

**P4.4 — Commands: frase imperativa + objeto, sin "Use when"**
Ejemplos de frontmatter en `examples/commands/`:
- `"Generate a conventional commit message for staged changes"`
- `"Codebase health audit scoring 7 categories with progression plan"`

**P4.5 — Longitud: 50-100 chars (doctrina) vs 100-300 chars (práctica)**
Ver Discrepancia D-01.

---

## Categoría 5: Capitalización de herramientas (Tools)

**P5.1 — Built-in tools: PascalCase**
`guide/ultimate-guide.md:6477`, `guide/ultimate-guide.md:7425`
```
Read, Write, Edit, Bash, Grep, Glob, WebSearch
```

**P5.2 — Herramientas MCP: `mcp__<server>__<tool>`**
`guide/ultimate-guide.md:5797`
- `mcp__github__create_issue`
- `mcp__claude-code-guide__search_guide`
Todo minúsculas, doble guión bajo como separador.

**P5.3 — Wildcard MCP: `mcp__<server>__*`**
`guide/ultimate-guide.md:5796`
- `mcp__serena__*` — autoriza todas las tools del servidor `serena`

**P5.4 — Tool-qualified format para permisos: `Tool(qualifier)`**
`guide/ultimate-guide.md:5798-5800`
```
Read(file_path:*.env*)
Edit(file_path:*.pem)
Bash(npm run *)
Bash(command:*rm -rf*)
```

**P5.5 — Separador diferente entre skills y agentes**
| Artefacto | Campo | Separador | Ejemplo |
|-----------|-------|-----------|---------|
| Agentes | `tools:` | Coma | `tools: Read, Grep, Glob, Bash` |
| Skills | `allowed-tools:` | Espacio | `allowed-tools: Read Grep Bash` |

`guide/ultimate-guide.md:7425` y `guide/ultimate-guide.md:6477`

---

## Categoría 6: Capitalización en settings

**P6.1 — Claves de `settings.json`: camelCase**
`guide/ultimate-guide.md:5839-5840`
`autoApproveTools`, `allowedTools`, `disallowedTools`, `outputStyle`

**P6.2 — Valores de `model`: minúsculas**
`guide/ultimate-guide.md:6491`
`sonnet`, `opus`, `haiku`, `inherit`

**P6.3 — Valores de `permissionMode`: camelCase**
`guide/ultimate-guide.md:6494`
`default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`

**P6.4 — Valores de `effort`: minúsculas**
`guide/ultimate-guide.md:7437`
`low`, `medium`, `high`

---

## Categoría 7: Archivos y directorios

**P7.1 — Hooks: kebab-case + `.sh` / `.ps1`**
`examples/hooks/bash/` — 30 archivos, todos kebab-case:
`auto-format.sh`, `dangerous-actions-blocker.sh`, `pre-commit-secrets.sh`

**P7.2 — MCP server names: `[a-zA-Z0-9_-]`, máx 64 chars**
`guide/ultimate-guide.md:23142-23158`
Correcto: `my-server-v1`. Incorrecto: `my-server@v1`

**P7.3 — Branch naming: kebab-case con prefijos semánticos**
`guide/ultimate-guide.md:16925-16933`
`feature/user-authentication`, `fix/login-bug`, `refactor/api-endpoints`

**P7.4 — `argument-hint` format (implícito, sin sección dedicada)**
`guide/ultimate-guide.md:7438`
- Requerido: `<arg>`
- Opcional: `[arg]`
- Flag: `[--flag]`
Ejemplo: `"[--verbose] [--max N] <branch>"`

---

## Categoría 8: Tool SEO (descripción optimizada para routing)

**P8.1 — Concepto: "Tool SEO" para maximizar activación automática correcta**
`guide/ultimate-guide.md:6950-6972`
```yaml
# ❌ Mala descripción
description: Reviews code

# ✅ Tool SEO
description: |
  Security code reviewer - use PROACTIVELY when:
  - Reviewing authentication/authorization code
  Triggers: security, auth, vulnerability, OWASP
```

**P8.2 — Cuatro técnicas de Tool SEO**
1. `"use PROACTIVELY"` — fuerza activación automática
2. Explicit triggers — keywords de activación
3. Listed contexts — cuándo es relevante
4. Short nicknames — `sec-1`, `perf-a`
`guide/ultimate-guide.md:6968-6972`

**P8.3 — Criterio de audit: description debe contener `when`, `use`, o `trigger`**
`examples/commands/audit-agents-skills.md:71-72`

---

## Discrepancias

| # | Descripción | Severidad |
|---|-------------|-----------|
| D-01 | Description de agentes: doctrina dice 50-100 chars pero ejemplos propios tienen 100-300 chars — sin reconciliación explícita | Media |
| D-02 | `tools:` (coma, agentes) vs `allowed-tools:` (espacio, skills) — intencional pero no explicado en un solo lugar | Media |
| D-03 | `model: inherit` documentado como default real pero ausente en template de ejemplo | Baja |
| D-04 | `argument-hint` format `<required> [optional]` usado consistentemente pero sin sección canónica | Baja |

---

## Gaps en `.claude/references/` de THYROX

| Tema | Estado |
|------|--------|
| Formato `mcp__server__tool` | No documentado |
| Tool-qualified permissions `Tool(qualifier)` | No documentado |
| Prefijos semánticos `audit-*`, `update-*`, `security-*` | No documentado |
| `argument-hint` format | No documentado |
| Tool SEO / PROACTIVELY technique | No documentado |
| Separador `tools:` (coma) vs `allowed-tools:` (espacio) | Parcialmente |
| Branch naming conventions | No documentado |

**Recomendación:** Crear `references/conventions-naming.md` separado del
`references/conventions.md` actual (que cubre convenciones del framework THYROX).
El nuevo archivo cubriría convenciones de la *plataforma* Claude Code.

---

## Hallazgo relevante para THYROX: Agent tool `description` parameter

El repositorio **no documenta explícitamente** la capitalización del parámetro
`description` del Agent tool en código. Los patrones más cercanos aplicables son:

- **P4.1:** Descripciones de agentes como frases de activación — "Use when..." o "PROACTIVELY..."
- **P6.1-P6.4:** Valores en configuración siguen sus propias convenciones de case
- **General:** Todo lo que funciona como label/título sigue minúsculas en el ecosistema Claude Code (model names, effort values, kebab-case names)

**Conclusión convergente con claude-howto:** Sin regla explícita documentada.
La convención más alineada con el ecosistema es **minúscula consistente** para
el parámetro `description` del Agent tool.
