```yml
type: Analysis Sub-document
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 03:25:00
updated_at: 2026-04-09 03:25:00
purpose: Clasificar cada referencia y script por nivel arquitectónico según docs oficiales Claude Code
```

# Clasificación de Referencias y Scripts por Nivel

---

## Fundamento: Arquitectura de 3 Niveles

Basado en la documentación oficial de Claude Code y la anatomía de skills:

```
~/.claude/                           ← Nivel 0: usuario (global a todas las sesiones)

<cwd>/.claude/                       ← Nivel 1: proyecto
├── CLAUDE.md                        ← siempre cargado (instrucciones del proyecto)
├── rules/                           ← siempre cargado (reglas adicionales)
├── references/                      ← [NUEVO] cargado bajo demanda — docs de plataforma
├── settings.json                    ← hooks + permisos
├── agents/                          ← agentes nativos Claude Code
└── skills/
    ├── pm-thyrox/                   ← Nivel 2A: framework cross-phase
    │   ├── SKILL.md
    │   ├── references/              ← docs de la metodología pm-thyrox
    │   ├── scripts/                 ← scripts del framework (hooks, validadores)
    │   └── assets/                  ← templates de output (se quedan aquí)
    └── workflow-analyze/            ← Nivel 2B: skill de fase específica
        ├── SKILL.md
        └── references/              ← docs propios de esta fase
```

**Principio de Progressive Disclosure** (docs oficiales):
> Metadata (description) → siempre en contexto.
> SKILL.md body → cuando el skill se activa.
> Bundled resources (references/, scripts/) → bajo demanda, sin límite.

**Implicación directa**: Las referencias dentro de un skill no consumen contexto hasta que el
skill las lee explícitamente. Cada skill debe ser autocontenido con las referencias que necesita.

---

## Por qué `.claude/references/` como nivel nuevo

Los docs oficiales describen `settingSources: ["project"]` cargando:
- `CLAUDE.md` → instrucciones siempre activas
- `.claude/rules/*.md` → reglas siempre activas
- `.claude/skills/` → skills descubiertos, cargados bajo demanda

No existe un concepto oficial de `.claude/references/`, pero la lógica es consistente:
- `CLAUDE.md` / `rules/` = documentación que SIEMPRE debe estar en contexto
- `skills/*/references/` = documentación de un skill específico
- `.claude/references/` = documentación del sistema Claude Code mismo — no de un skill, no siempre activa, pero global al proyecto

**Qué va aquí**: documentación sobre la plataforma Claude Code en sí — cómo funcionan los
skills, cómo se escriben los agentes, cuándo usar uno vs. otro. Son docs que se consultan al
CREAR o MODIFICAR componentes del sistema, no al USAR el framework en el día a día.

---

## Criterio de clasificación (revisado)

La distinción no es "¿pertenece a pm-thyrox?" sino **"¿quién se beneficia si esto existe?"**:

| Nivel | Criterio | Ejemplo |
|-------|---------|---------|
| **Fase** (`workflow-*/references/`) | Solo útil durante una fase específica del SDLC | `scalability.md` — solo al iniciar Phase 1 |
| **Global** (`.claude/references/`) | Útil en **cualquier proyecto Claude Code**, independientemente del framework | `skill-vs-agent.md`, `conventions.md` |

`pm-thyrox/references/` **queda vacío** — todos los docs o son de fase o son globales.

---

## Clasificación completa — 24 referencias

### Nivel FASE → mover a `workflow-*/references/`

Criterio: el contenido describe cómo ejecutar UNA fase específica del SDLC.
No tiene sentido fuera de ese contexto de fase.

| Archivo | Destino |
|---------|---------|
| `introduction.md` | `workflow-analyze/references/` |
| `basic-usage.md` | `workflow-analyze/references/` |
| `constraints.md` | `workflow-analyze/references/` |
| `context.md` | `workflow-analyze/references/` |
| `quality-goals.md` | `workflow-analyze/references/` |
| `requirements-analysis.md` | `workflow-analyze/references/` |
| `stakeholders.md` | `workflow-analyze/references/` |
| `use-cases.md` | `workflow-analyze/references/` |
| `scalability.md` | `workflow-analyze/references/` |
| `solution-strategy.md` | `workflow-strategy/references/` |
| `spec-driven-development.md` | `workflow-structure/references/` |
| `commit-convention.md` | `workflow-execute/references/` |
| `commit-helper.md` | `workflow-execute/references/` |
| `reference-validation.md` | `workflow-track/references/` |
| `incremental-correction.md` | `workflow-track/references/` |

**Total: 15 archivos** en sus skills de fase.

---

### Nivel GLOBAL → mover a `.claude/references/`

Criterio: el contenido es **reutilizable en cualquier proyecto Claude Code** — no está
atado a pm-thyrox ni a una fase. Incluye tanto docs de la plataforma Claude Code como
patrones y convenciones que cualquier proyecto con un workflow similar adoptaría.

| Archivo | Por qué es global |
|---------|-------------------|
| `skill-vs-agent.md` | Decisión arquitectónica de plataforma: cuándo crear skill vs agente |
| `agent-spec.md` | Spec de formato para agentes Claude Code — aplica a `.claude/agents/` siempre |
| `claude-code-components.md` | Referencia oficial de Skills, Subagents, Context — documentación de plataforma |
| `skill-authoring.md` | Mejores prácticas Anthropic para crear skills — aplica a cualquier proyecto |
| `conventions.md` | Convenciones de naming, work packages, commits — cualquier proyecto adopta esto |
| `state-management.md` | Patrón para gestionar now.md / focus.md — cualquier proyecto con sesiones complejas |
| `prompting-tips.md` | Tips de prompting cuando Claude no responde bien — aplica en cualquier contexto |
| `long-context-tips.md` | Gestión de contexto con documentos grandes — aplica en cualquier proyecto |
| `examples.md` | Patrones de workflow reutilizables — referencia de diseño general |

**Total: 9 archivos** que migran a `.claude/references/`.

**Resultado neto**: `pm-thyrox/references/` queda **vacío** y se elimina.
pm-thyrox pasa a ser un skill con solo `SKILL.md` + `assets/` + `scripts/`.

**Nota sobre lint-agents.py**: Referenciado desde `agent-spec.md` con path completo.
Si agent-spec.md se mueve a `.claude/references/`, actualizar el path en el doc a
`.claude/skills/pm-thyrox/scripts/lint-agents.py`.

---

## Resumen visual

```
.claude/references/                      (NUEVO — 9 archivos: global Claude Code)
  skill-vs-agent.md
  agent-spec.md
  claude-code-components.md
  skill-authoring.md
  conventions.md
  state-management.md
  prompting-tips.md
  long-context-tips.md
  examples.md

.claude/skills/pm-thyrox/references/     (VACÍO → eliminar directorio)
  [ninguno]

.claude/skills/workflow-analyze/references/  (NUEVO DIR — 9 archivos)
  basic-usage.md  constraints.md  context.md  introduction.md
  quality-goals.md  requirements-analysis.md  scalability.md
  stakeholders.md  use-cases.md

.claude/skills/workflow-execute/references/  (NUEVO DIR — 2 archivos)
  commit-convention.md  commit-helper.md

.claude/skills/workflow-strategy/references/ (NUEVO DIR — 1 archivo)
  solution-strategy.md

.claude/skills/workflow-structure/references/ (NUEVO DIR — 1 archivo)
  spec-driven-development.md

.claude/skills/workflow-track/references/    (NUEVO DIR — 2 archivos)
  reference-validation.md  incremental-correction.md
```

---

## Clasificación de scripts (20 en pm-thyrox/scripts/)

### Scripts de infraestructura → quedan en `pm-thyrox/scripts/`

Referenciados por `settings.json` con paths hard-coded. Son la infraestructura del framework.

| Script | Hook event |
|--------|-----------|
| `session-start.sh` | SessionStart |
| `session-resume.sh` | PostCompact |
| `stop-hook-git-check.sh` | Stop |
| `commit-msg-hook.sh` | git hook directo |

### Scripts de workflow-track → mover a `workflow-track/scripts/` (B2)

Referenciados solo en `workflow-track/SKILL.md` — bajo riesgo de mover.

| Script | Referenciado en |
|--------|----------------|
| `validate-session-close.sh` | workflow-track/SKILL.md |
| `validate-phase-readiness.sh` | workflow-track/SKILL.md |
| `project-status.sh` | workflow-track/SKILL.md |
| `update-state.sh` | workflow-track/SKILL.md |

### Scripts cross-framework → quedan en `pm-thyrox/scripts/`

| Script | Propósito |
|--------|----------|
| `lint-agents.py` | Valida formato de agentes — referenciado en agent-spec.md |
| `validate-broken-references.py` + `detect_broken_references.py` + `convert-broken-references.py` | Health check y fix de referencias |
| `validate-missing-md-links.sh` + `detect-missing-md-links.sh` + `convert-missing-md-links.sh` | Health check y fix de links |
| `run-functional-evals.sh` + `run-multi-evals.sh` | Evaluaciones del framework |
| `migrate-metadata-keys.py` + `verify-skill-mapping.sh` | Legacy — pueden archivarse |
| `tests/` | Tests del framework |

---

## Trazabilidad completa — todos los 24 archivos con destino

**Regla de eliminación**: `pm-thyrox/references/` solo se elimina cuando TODOS los 24 archivos
estén presentes en su destino y verificados. Ningún archivo se pierde — solo se reubica.

| # | Archivo origen | Destino completo |
|---|----------------|-----------------|
| 1 | `agent-spec.md` | `.claude/references/agent-spec.md` |
| 2 | `basic-usage.md` | `.claude/skills/workflow-analyze/references/basic-usage.md` |
| 3 | `claude-code-components.md` | `.claude/references/claude-code-components.md` |
| 4 | `commit-convention.md` | `.claude/skills/workflow-execute/references/commit-convention.md` |
| 5 | `commit-helper.md` | `.claude/skills/workflow-execute/references/commit-helper.md` |
| 6 | `constraints.md` | `.claude/skills/workflow-analyze/references/constraints.md` |
| 7 | `context.md` | `.claude/skills/workflow-analyze/references/context.md` |
| 8 | `conventions.md` | `.claude/references/conventions.md` |
| 9 | `examples.md` | `.claude/references/examples.md` |
| 10 | `incremental-correction.md` | `.claude/skills/workflow-track/references/incremental-correction.md` |
| 11 | `introduction.md` | `.claude/skills/workflow-analyze/references/introduction.md` |
| 12 | `long-context-tips.md` | `.claude/references/long-context-tips.md` |
| 13 | `prompting-tips.md` | `.claude/references/prompting-tips.md` |
| 14 | `quality-goals.md` | `.claude/skills/workflow-analyze/references/quality-goals.md` |
| 15 | `reference-validation.md` | `.claude/skills/workflow-track/references/reference-validation.md` |
| 16 | `requirements-analysis.md` | `.claude/skills/workflow-analyze/references/requirements-analysis.md` |
| 17 | `scalability.md` | `.claude/skills/workflow-analyze/references/scalability.md` |
| 18 | `skill-authoring.md` | `.claude/references/skill-authoring.md` |
| 19 | `skill-vs-agent.md` | `.claude/references/skill-vs-agent.md` |
| 20 | `solution-strategy.md` | `.claude/skills/workflow-strategy/references/solution-strategy.md` |
| 21 | `spec-driven-development.md` | `.claude/skills/workflow-structure/references/spec-driven-development.md` |
| 22 | `stakeholders.md` | `.claude/skills/workflow-analyze/references/stakeholders.md` |
| 23 | `state-management.md` | `.claude/references/state-management.md` |
| 24 | `use-cases.md` | `.claude/skills/workflow-analyze/references/use-cases.md` |

**Conteo:** 9 a `.claude/references/` + 15 a `.claude/skills/workflow-*/references/` = 24. Cero archivos sin destino.

---

## Decisiones resueltas

**Pregunta A → A2 extendido:**
`.claude/references/` recibe 9 archivos: 4 docs de plataforma + 5 docs de patrón reutilizable.
`pm-thyrox/references/` se elimina **solo después** de verificar que los 24 destinos existen.

**Pregunta B → B2:**
- Scripts de infraestructura (hooks) → quedan en pm-thyrox/scripts/
- 4 scripts de workflow-track → mueven a workflow-track/scripts/
- Scripts cross-framework → quedan en pm-thyrox/scripts/
