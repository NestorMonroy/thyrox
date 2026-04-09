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

## Clasificación completa — 24 referencias

### Nivel 2B: Skill-específico → mover a `workflow-*/references/`

Criterio: el contenido describe cómo ejecutar UNA fase específica del SDLC.
Quien lo lee es el skill de esa fase — no tiene sentido en otro contexto.

| Archivo | Destino | Razón |
|---------|---------|-------|
| `introduction.md` | `workflow-analyze/references/` | Guía de análisis inicial — solo Phase 1 |
| `basic-usage.md` | `workflow-analyze/references/` | Patrones de uso operacional — solo Phase 1 |
| `constraints.md` | `workflow-analyze/references/` | Análisis de restricciones — solo Phase 1 |
| `context.md` | `workflow-analyze/references/` | Análisis de contexto/sistemas vecinos — solo Phase 1 |
| `quality-goals.md` | `workflow-analyze/references/` | Análisis de atributos de calidad — solo Phase 1 |
| `requirements-analysis.md` | `workflow-analyze/references/` | Análisis de requisitos — solo Phase 1 |
| `stakeholders.md` | `workflow-analyze/references/` | Análisis de stakeholders — solo Phase 1 |
| `use-cases.md` | `workflow-analyze/references/` | Casos de uso — solo Phase 1 |
| `scalability.md` | `workflow-analyze/references/` | Tabla micro/pequeño/mediano/grande — se consulta al iniciar Phase 1 |
| `solution-strategy.md` | `workflow-strategy/references/` | Cómo estructurar la estrategia de solución — solo Phase 2 |
| `spec-driven-development.md` | `workflow-structure/references/` | SDD, especificación compleja — solo Phase 4 |
| `commit-convention.md` | `workflow-execute/references/` | Conventional Commits — solo Phase 6 |
| `commit-helper.md` | `workflow-execute/references/` | Helper de commits — solo Phase 6 |
| `reference-validation.md` | `workflow-track/references/` | Validar referencias rotas — solo Phase 7 |
| `incremental-correction.md` | `workflow-track/references/` | Corrección incremental — solo Phase 7 |

**Total: 15 archivos** con destino en sus skills correspondientes.

---

### Nivel 2A: Framework pm-thyrox → quedan en `pm-thyrox/references/`

Criterio: el contenido describe la METODOLOGÍA del framework pm-thyrox en sí.
Se usa desde CUALQUIER fase (cross-phase) pero es específico del framework pm-thyrox.

| Archivo | Justificación |
|---------|--------------|
| `conventions.md` | Define convenciones de naming, commits, ROADMAP del proyecto — reglas del framework |
| `examples.md` | 8 casos de uso del framework pm-thyrox — ejemplos de cómo usarlo |
| `state-management.md` | Cómo actualizar now.md, focus.md — infraestructura de estado del framework |
| `long-context-tips.md` | Tips para usar Claude en documentos largos — usado transversalmente por pm-thyrox |
| `prompting-tips.md` | Tips de prompting cuando Claude no entiende instrucciones — soporte del framework |

**Total: 5 archivos** que se quedan en pm-thyrox/references/.

`conventions.md` y `state-management.md` son especialmente críticos de mantener aquí porque
los SKILL.md de workflow-* los referencian (o podrían referenciarlos) para guiar la ejecución.

---

### Nivel 1: Claude Code sistema → mover a `.claude/references/`

Criterio: el contenido documenta el sistema Claude Code en sí — no una fase, no el framework
pm-thyrox, sino la plataforma. Son docs que se consultan al CREAR o AUDITAR componentes
(skills, agentes, hooks). Relevantes para cualquier skill o proyecto que use Claude Code.

| Archivo | Razón para nivel global |
|---------|------------------------|
| `skill-vs-agent.md` | Guía de decisión arquitectónica: cuándo crear un skill vs un agente. Aplica a cualquier proyecto Claude Code, no solo a pm-thyrox. |
| `agent-spec.md` | Especificación de formato de agentes nativos Claude Code. Aplica al directorio `.claude/agents/`, que es sistema, no pm-thyrox. |
| `claude-code-components.md` | Referencia oficial de Skills, Subagents y Context de Claude Code. Documentación de la plataforma. |
| `skill-authoring.md` | Mejores prácticas de Anthropic para crear skills. Aplica a cualquier skill en cualquier proyecto. |

**Total: 4 archivos** que migran a `.claude/references/`.

**Nota sobre lint-agents.py**: El script es referenciado desde `agent-spec.md` con path completo.
Si agent-spec.md se mueve a `.claude/references/`, el path del script en el doc necesita
actualizarse a `.claude/skills/pm-thyrox/scripts/lint-agents.py` (o el script también se mueve).

---

## Resumen de clasificación

```
.claude/references/                  (NUEVO — 4 archivos: sistema Claude Code)
  skill-vs-agent.md
  agent-spec.md
  claude-code-components.md
  skill-authoring.md

.claude/skills/pm-thyrox/references/ (QUEDA — 5 archivos: framework pm-thyrox)
  conventions.md
  examples.md
  state-management.md
  long-context-tips.md
  prompting-tips.md

.claude/skills/workflow-analyze/references/  (NUEVO DIR — 9 archivos)
  basic-usage.md, constraints.md, context.md, introduction.md
  quality-goals.md, requirements-analysis.md, scalability.md
  stakeholders.md, use-cases.md

.claude/skills/workflow-execute/references/  (NUEVO DIR — 2 archivos)
  commit-convention.md, commit-helper.md

.claude/skills/workflow-strategy/references/ (NUEVO DIR — 1 archivo)
  solution-strategy.md

.claude/skills/workflow-structure/references/ (NUEVO DIR — 1 archivo)
  spec-driven-development.md

.claude/skills/workflow-track/references/    (NUEVO DIR — 2 archivos)
  reference-validation.md, incremental-correction.md
```

---

## Clasificación de scripts (20 en pm-thyrox/scripts/)

### Scripts de infraestructura → quedan en `pm-thyrox/scripts/`

Referenciados por `settings.json` con paths hard-coded. Moverlos requiere actualizar settings.json.
Son propiedad del framework pm-thyrox (no de un skill de fase).

| Script | Hook event | Riesgo de mover |
|--------|-----------|----------------|
| `session-start.sh` | SessionStart | Alto — settings.json roto = sin contexto de sesión |
| `session-resume.sh` | PostCompact | Alto — idem |
| `stop-hook-git-check.sh` | Stop | Alto — idem |
| `commit-msg-hook.sh` | (git hook, no settings.json) | Medio |

**Decisión: quedan en pm-thyrox/scripts/**. Son la infraestructura del framework, no de una fase.

### Scripts de workflow-track → candidatos a `workflow-track/scripts/`

Referenciados solo en `workflow-track/SKILL.md`. Si se mueven, solo hay que actualizar ese SKILL.md.

| Script | Referenciado en |
|--------|----------------|
| `validate-session-close.sh` | workflow-track/SKILL.md línea 57 |
| `validate-phase-readiness.sh` | workflow-track/SKILL.md línea 25 |
| `project-status.sh` | workflow-track/SKILL.md líneas 22, 58 |
| `update-state.sh` | workflow-track/SKILL.md línea 67 |

**Candidatos para B2** (si el usuario aprueba mover scripts de workflow-track).

### Scripts cross-framework → quedan en `pm-thyrox/scripts/`

No pertenecen a una fase específica. Son herramientas del framework.

| Script | Propósito |
|--------|----------|
| `lint-agents.py` | Valida formato de agentes — cross-phase, referenciado en agent-spec.md |
| `validate-broken-references.py` | Health check de referencias — cross-phase |
| `detect_broken_references.py` | Ídem |
| `convert-broken-references.py` | Fix de referencias rotas |
| `validate-missing-md-links.sh` | Health check de links |
| `detect-missing-md-links.sh` | Ídem |
| `convert-missing-md-links.sh` | Fix de links |
| `run-functional-evals.sh` | Evaluaciones del framework |
| `run-multi-evals.sh` | Ídem |
| `update-state.sh` | *Ver candidatos workflow-track arriba* |
| `project-status.sh` | *Ver candidatos workflow-track arriba* |
| `migrate-metadata-keys.py` | Migración legacy — puede archivarse |
| `verify-skill-mapping.sh` | Validación de mapping — puede archivarse |
| `tests/` | Tests del framework |

---

## Respuesta a las preguntas del gate

**Pregunta A → A2 con matiz:**
No todo lo `cross-phase` va a `.claude/references/` — solo los docs de la **plataforma Claude Code**.
Los docs de la **metodología pm-thyrox** quedan en `pm-thyrox/references/`.

| Sub-categoría | Destino | Archivos |
|---------------|---------|---------|
| Plataforma Claude Code | `.claude/references/` | skill-vs-agent, agent-spec, claude-code-components, skill-authoring |
| Metodología pm-thyrox | `pm-thyrox/references/` | conventions, examples, state-management, long-context-tips, prompting-tips |

**Pregunta B → B2 (parcial):**
- Scripts de infraestructura (hooks) → quedan en pm-thyrox/scripts/ (sin mover)
- Scripts de workflow-track → candidatos a mover a workflow-track/scripts/ (riesgo bajo, solo actualizar SKILL.md)
- Scripts cross-framework → quedan en pm-thyrox/scripts/
