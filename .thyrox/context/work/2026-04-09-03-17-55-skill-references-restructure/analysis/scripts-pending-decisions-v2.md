```yml
type: Analysis Sub-document
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 04:15:00
updated_at: 2026-04-09 04:15:00
purpose: Revisión de decisiones D1/D2 con evidencia de proyectos reales que SÍ usan .claude/scripts/
supersedes: scripts-pending-decisions.md
```

# Decisiones D1/D2 — Análisis Revisado con Evidencia Real

---

## Corrección del análisis anterior

El análisis previo concluía que `.claude/scripts/` no existe en proyectos reales. Eso era incorrecto —
los ejemplos usados (claude-cookbooks, claude-code, claude-code-action) son repositorios de herramientas
externas, no proyectos que usan Claude Code como asistente de desarrollo. Los nuevos ejemplos muestran
el patrón correcto para proyectos que sí usan Claude Code internamente.

---

## Evidencia de proyectos reales que usan `.claude/scripts/`

### 1. Go Development Project (CLAUDE.md explícito)

```markdown
### Project Organization Rules
- Keep project root clean - no scripts, docs, or binaries in root
- All Claude-related files go in `.claude/` directory
- Use `.claude/scripts/` for automation scripts      ← REGLA EXPLÍCITA
- Use `.claude/docs/` for detailed documentation
- Use `.claude/config/` for tool configurations
```

**Conclusión directa**: proyectos que mantienen el root limpio y agrupan todo lo Claude en `.claude/`
usan `.claude/scripts/` para sus scripts de automatización.

---

### 2. clickhouse-cs (AGENTS.md)

```markdown
## Code Coverage
### Analyzing coverage

python3 .claude/scripts/coverage-summary.py ...   ← .claude/scripts/ PROYECTO
python3 .claude/scripts/coverage-uncovered.py ...  ← .claude/scripts/ PROYECTO
```

Scripts de utilidad de Claude Code (referenciados en AGENTS.md) viven en `.claude/scripts/` a
nivel de proyecto. No son hooks — son herramientas de soporte para flujos de Claude.

---

### 3. claude-cognitive (SETUP.md — nivel usuario)

```bash
mkdir -p ~/.claude/scripts
cp .claude-cognitive/scripts/*.py ~/.claude/scripts/
```

```json
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command",
      "command": "python3 ~/.claude/scripts/pool-loader.py"}]}],
    "Stop": [{"hooks": [{"type": "command",
      "command": "python3 ~/.claude/scripts/pool-extractor.py"}]}]
  }
}
```

**Patrón**: hook scripts en `~/.claude/scripts/` (nivel usuario). `settings.json` apunta directamente
a `~/.claude/scripts/`. Mismo patrón que THYROX pero a nivel usuario en lugar de proyecto.

---

### 4. claude-user-memory (CHANGELOG.md — nivel usuario)

```
~/.claude/scripts/calculate-confidence.sh   ← scripts de utilidad
~/.claude/scripts/validate-pattern-index.sh ← scripts de validación
```

---

### 5. claude-compress (ccomp script — nivel usuario)

```bash
SCRIPT_DIR="$HOME/.claude/scripts"
python3 "$SCRIPT_DIR/ccomp_chat.py" --cwd "$(pwd)" "$@"
```

---

### 6. awesome-ai-coding-all-in-one (`.claude/scripts/` PROYECTO con README)

Directorio `.claude/scripts/` a nivel de proyecto con su propio `README.md` y scripts como
`litellm-copilot.ps1`. Confirma que `.claude/scripts/` es un directorio de primera clase en proyectos.

---

## Síntesis del patrón

| Nivel | Directorio | Qué contiene |
|-------|-----------|-------------|
| Usuario | `~/.claude/scripts/` | Scripts Claude Code compartidos entre proyectos del usuario |
| Proyecto | `.claude/scripts/` | Scripts Claude Code específicos del proyecto (hooks, utilidades de flujo) |
| Skill fase | `.claude/skills/workflow-*/scripts/` | Scripts solo usados en una fase específica |
| Framework | `.claude/skills/pm-thyrox/scripts/` | Scripts del framework pm-thyrox (evals, legacy) |

**`.claude/scripts/` es un concepto real y documentado**, no una invención.
El Go project incluso lo documenta como regla explícita en CLAUDE.md.

---

## Decisión D1 — RESUELTA: crear `.claude/scripts/`

**D1-B confirmado**: crear `.claude/scripts/` en THYROX.

Esto es consistente con:
- La regla del Go project: "All Claude-related files go in `.claude/`"
- El patrón de claude-cognitive: hooks → `.claude/scripts/`
- El patrón de clickhouse-cs: utilidades de Claude → `.claude/scripts/`
- La anatomía oficial: `.claude/` es el espacio de Claude Code

**Scripts que migran a `.claude/scripts/`:**

| Script | Motivo |
|--------|--------|
| `session-start.sh` | Hook de sesión → infraestructura Claude Code del proyecto |
| `session-resume.sh` | Hook PostCompact → infraestructura Claude Code |
| `stop-hook-git-check.sh` | Hook Stop → infraestructura Claude Code |
| `commit-msg-hook.sh` | Git hook relacionado con flujo Claude Code |
| `lint-agents.py` | Valida `.claude/agents/` → herramienta Claude Code del proyecto |

**Actualización requerida en `settings.json`:**

```json
{
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command",
      "command": "bash .claude/scripts/session-start.sh"}]}],
    "Stop": [{"hooks": [{"type": "command",
      "command": "bash .claude/scripts/stop-hook-git-check.sh"}]}],
    "PostCompact": [{"hooks": [{"type": "command",
      "command": "bash .claude/scripts/session-resume.sh"}]}]
  }
}
```

---

## Decisión D2 — RESUELTA: `update-state.sh` → `.claude/scripts/`

`update-state.sh` actualiza `context/project-state.md` con el estado actual del framework.
Se invoca en Phase 7 Y de forma cross-phase (nuevo agente añadido, nueva versión).

Comparación directa con clickhouse-cs:
- `coverage-summary.py` → herramienta de soporte para flujos de Claude, en `.claude/scripts/`
- `update-state.sh` → herramienta de mantenimiento del estado del proyecto, mismo perfil

**D2-B confirmado**: `update-state.sh` → `.claude/scripts/update-state.sh`

**Actualizaciones requeridas:**
- `workflow-track/SKILL.md` línea 67: path del script
- `state-management.md` (que migra a `.claude/references/`) líneas 28-30, 69, 78-81: paths

---

## Scripts de validación de referencias — también a `.claude/scripts/`

Los 6 scripts de validación (`detect_broken_references.py`, `validate-broken-references.py`,
`convert-broken-references.py`, `validate-missing-md-links.sh`, `detect-missing-md-links.sh`,
`convert-missing-md-links.sh`) son herramientas de salud del proyecto, similares a los
`coverage-summary.py` de clickhouse-cs.

`reference-validation.md` los documenta (y migra a `workflow-track/references/`), pero los
scripts en sí son cross-project, no exclusivos de Phase 7.

**Propuesta**: migran a `.claude/scripts/` también.
Si se mueven: actualizar paths en `reference-validation.md` (en su nuevo destino).

---

## Trazabilidad revisada — 20 scripts

| # | Script | Destino definitivo | Actualizar |
|---|--------|-------------------|-----------|
| 1 | `session-start.sh` | `.claude/scripts/` | `settings.json` |
| 2 | `session-resume.sh` | `.claude/scripts/` | `settings.json` |
| 3 | `stop-hook-git-check.sh` | `.claude/scripts/` | `settings.json` |
| 4 | `commit-msg-hook.sh` | `.claude/scripts/` | git hooks config |
| 5 | `lint-agents.py` | `.claude/scripts/` | `agent-spec.md` ×3 |
| 6 | `update-state.sh` | `.claude/scripts/` | `workflow-track/SKILL.md` ×1; `state-management.md` ×3 |
| 7 | `project-status.sh` | `.claude/scripts/` | `workflow-track/SKILL.md` ×2 |
| 8 | `detect_broken_references.py` | `.claude/scripts/` | `reference-validation.md` ×5 |
| 9 | `validate-broken-references.py` | `.claude/scripts/` | sin refs externas |
| 10 | `convert-broken-references.py` | `.claude/scripts/` | sin refs externas |
| 11 | `validate-missing-md-links.sh` | `.claude/scripts/` | sin refs externas |
| 12 | `detect-missing-md-links.sh` | `.claude/scripts/` | interno (validate-missing) |
| 13 | `convert-missing-md-links.sh` | `.claude/scripts/` | interno (validate-missing) |
| 14 | `validate-phase-readiness.sh` | `workflow-track/scripts/` | `workflow-track/SKILL.md` ×1; test path |
| 15 | `validate-session-close.sh` | `workflow-track/scripts/` | `workflow-track/SKILL.md` ×1; `state-management.md` ×1 |
| 16 | `run-functional-evals.sh` | `pm-thyrox/scripts/` (queda) | sin refs externas |
| 17 | `run-multi-evals.sh` | `pm-thyrox/scripts/` (queda) | sin refs externas |
| 18 | `migrate-metadata-keys.py` | `pm-thyrox/scripts/` (archivar) | `conventions.md` ×1 |
| 19 | `verify-skill-mapping.sh` | `pm-thyrox/scripts/` (archivar) | tests internos |
| 20 | `tests/` | dividir: `workflow-track/scripts/tests/` + pm-thyrox (legacy) | paths en tests |

**Conteo**: 13 a `.claude/scripts/` · 2 a `workflow-track/scripts/` · 4 en `pm-thyrox/scripts/` · tests divididos

---

## Estado final de directorios

```
.claude/scripts/                     (NUEVO — 13 scripts: infraestructura Claude Code)
  session-start.sh
  session-resume.sh
  stop-hook-git-check.sh
  commit-msg-hook.sh
  lint-agents.py
  update-state.sh
  project-status.sh
  detect_broken_references.py
  validate-broken-references.py
  convert-broken-references.py
  validate-missing-md-links.sh
  detect-missing-md-links.sh
  convert-missing-md-links.sh

.claude/skills/workflow-track/scripts/  (NUEVO DIR — 2 scripts + tests)
  validate-phase-readiness.sh
  validate-session-close.sh
  tests/
    test-phase-readiness.sh

.claude/skills/pm-thyrox/scripts/       (QUEDA — 4 items)
  run-functional-evals.sh
  run-multi-evals.sh
  migrate-metadata-keys.py       (legacy)
  verify-skill-mapping.sh        (legacy)
  tests/
    test-skill-mapping.sh
    run-all-tests.sh (actualizado: ejecuta tests de workflow-track también)
```

**`pm-thyrox/scripts/` no se elimina** — retiene evals del framework y scripts legacy con sus tests.
