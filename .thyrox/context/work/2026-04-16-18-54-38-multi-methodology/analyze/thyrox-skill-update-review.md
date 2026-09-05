```yml
created_at: 2026-04-17 01:35:29
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Deep-Review: Terminología y gaps en thyrox/SKILL.md para multi-methodology

**Motivación:** ÉPICA 40 demostró que THYROX orquesta metodologías externas (PDCA, DMAIC, etc.) y también ejecutó un patrón interno (`skill-anatomy-task-plan`). El SKILL.md del framework no documenta ninguno de los dos. La pregunta de terminología: ¿"flujos" o algo más coherente con `workflow-*`?

---

## Análisis de terminología actual

### Tres grupos de skills en `.claude/skills/`

**Grupo A — `workflow-*` (12 skills, ciclo THYROX base):**

`workflow-discover`, `workflow-baseline`, `workflow-diagnose`, `workflow-constraints`, `workflow-strategy`, `workflow-scope`, `workflow-structure`, `workflow-decompose`, `workflow-pilot`, `workflow-implement`, `workflow-track`, `workflow-standardize`

- Patrón de nombre: `workflow-{stage-name}`
- Descripción siempre: `"Use when [condición]. Phase N NOMBRE — [qué hace]"`
- Son la implementación de las 12 fases THYROX
- Interfaz pública: `/thyrox:{stage}` (via plugin namespace, ADR-019)

**Grupo B — `{metodología}-{paso}` (29 skills, metodologías externas):**

`pdca-plan/do/check/act`, `dmaic-define/measure/analyze/improve/control`, `rup-inception/elaboration/construction/transition`, `rm-elicitation/analysis/specification/validation/management`, `pm-initiating/planning/executing/monitoring/closing`, `ba-planning/elicitation/requirements-analysis/requirements-lifecycle/solution-evaluation/strategy`

- Cada SKILL.md declara `## Estado en now.md` con `flow:` y `methodology_step:`
- Cada SKILL.md declara `**THYROX Stage:**` — mapeo al ciclo THYROX
- No tienen hook de fase THYROX; actualizan `flow` y `methodology_step`

**Grupo C — tech skills (6 skills):**

`backend-nodejs`, `db-mysql`, `db-postgresql`, `frontend-react`, `frontend-webpack`, `python-mcp`

- Patrón: `{layer}-{framework}` — tecnología, sin relación metodológica

---

## Qué usa el framework hoy

| Término | Dónde aparece | Qué significa |
|---------|--------------|---------------|
| `workflow-*` | Prefijo de skill | Implementación de un stage THYROX |
| `flow:` | `now.md` campo | Metodología externa activa (pdca/dmaic/rup/rm/pmbok/babok) |
| `methodology_step:` | `now.md` campo | Paso actual de la metodología con prefijo namespace |
| `THYROX Stage:` | En cada skill de metodología | Anclaje del skill al ciclo THYROX |

**Lo que NO tiene nombre:** el patrón de trabajo interno del framework (skill-anatomy-task-plan, auditorías de anatomía, etc.) — en now.md tuvo `flow: null` durante toda su ejecución.

---

## Gaps identificados: 4

### Gap 1 — thyrox/SKILL.md no documenta los 29 methodology skills (Grupo B)

**Impacto:** Alto. Un lector del SKILL.md principal no sabe que existen `/dmaic-define`, `/pdca-plan`, etc.

El catálogo de fases (líneas 44-57) lista solo las 12 fases THYROX. Las metodologías externas no aparecen en ninguna sección del SKILL.md orquestador.

### Gap 2 — thyrox/SKILL.md no documenta la relación THYROX ↔ methodology skill

**Impacto:** Alto. No hay sección que explique cómo se anidan: methodology skill opera *dentro* de un stage THYROX.

El patrón real documentado en los skills de metodología es:
```
Stage 3 DIAGNOSE (workflow-diagnose)
└── dmaic:define → dmaic:measure → dmaic:analyze → dmaic:improve → dmaic:control
    (5 pasos DMAIC satisfacen lo que Stage 3 requiere)
```
Esto no aparece en thyrox/SKILL.md.

### Gap 3 — Sin terminología para patrones internos del framework

**Impacto:** Medio. El patrón skill-anatomy ejecutó trabajo de framework sin identidad en now.md (`flow: null`).

Si se formalizara como skill, coherente con la nomenclatura `workflow-*`, sería `workflow-anatomy` o similar. Alternativa: documentarlo como "framework maintenance pattern" sin crear un skill nuevo.

### Gap 4 — Catálogo de namespaces ausente en "References por dominio"

**Impacto:** Bajo. La sección "References por dominio" lista referencias de workflow stages pero no entry point para metodologías.

---

## Terminología recomendada

La palabra "flujos" no aparece en ningún SKILL.md ni CLAUDE.md como término técnico. El framework usa:

- **`workflow-*`** (inglés) para los 12 stages del ciclo THYROX
- **`methodology_step:`** / **`flow:`** para el estado de metodología externa en now.md

| Tipo | Prefijo actual | Nombre para documentar en SKILL.md |
|------|---------------|-------------------------------------|
| Ciclo THYROX base | `workflow-{stage}` | **"workflow stages"** |
| Metodologías externas | `{metodología}-{paso}` | **"methodology skills"** |
| Patrones de framework | (sin prefijo hoy) | **"framework patterns"** — si se formalizan como skill: `workflow-{nombre}` |

---

## Propuesta concreta de actualización a thyrox/SKILL.md

### Adición 1 — Nueva sección "Methodology skills" (después del catálogo de fases)

```markdown
## Methodology skills

Cuando un WP requiere un marco metodológico específico, activar el skill de metodología
correspondiente **dentro** del workflow stage apropiado. Cada skill declara su
`THYROX Stage:` de anclaje.

| Namespace | Metodología | Skills | Workflow stage de anclaje |
|-----------|------------|--------|--------------------------|
| `pdca:` | PDCA (Deming) | pdca-plan, pdca-do, pdca-check, pdca-act | Stage 3 DIAGNOSE / Stage 10 IMPLEMENT |
| `dmaic:` | DMAIC Six Sigma | dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control | Stage 3 DIAGNOSE |
| `rup:` | RUP | rup-inception, rup-elaboration, rup-construction, rup-transition | Stage 3 DIAGNOSE |
| `rm:` | Requirements Management | rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management | Stage 1 / Stage 3 |
| `pm:` | PMBOK | pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing | Stages 1–10 |
| `ba:` | BABOK / Business Analysis | ba-planning, ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-solution-evaluation, ba-strategy | Stage 1 / Stage 3 |

**Cómo activar:** invocar directamente el skill del paso, ej. `/dmaic-define`.
El skill actualiza `now.md::flow` y `now.md::methodology_step`.

**Selección por necesidad:**
- Mejora continua con ciclos rápidos → `pdca-*`
- Reducción de variabilidad con datos → `dmaic-*`
- Desarrollo iterativo con milestones → `rup-*`
- Gestión formal de requisitos → `rm-*`
- Gestión de proyectos PMI → `pm-*`
- Análisis de negocio BABOK → `ba-*`
```

### Adición 2 — Nueva sección "Arquitectura de orquestación" (en Modelo de permisos o como sección propia)

```markdown
## Arquitectura de orquestación

THYROX opera en dos niveles simultáneos:

**Nivel 1 — Workflow stages (ciclo THYROX):**
Los 12 stages definen el marco macro del WP. Implementados por `workflow-*` skills.
Estado en `now.md::stage`.

**Nivel 2 — Methodology skills (opcional, anidado):**
Dentro de un workflow stage, se puede activar un methodology skill.
Implementados por `{metodología}-{paso}` skills. Estado en `now.md::flow` + `now.md::methodology_step`.

El workflow stage no se interrumpe — el methodology skill opera como sub-proceso.

**Framework patterns:**
Trabajo de mantenimiento del framework (ej: completar anatomía de skills, auditorías de references).
Se ejecuta como tareas del task-plan sin `flow:` declarado. No requiere skill dedicado.
```

### Adición 3 — Subsección en "References por dominio"

```markdown
### Methodology skills (leer cuando se activa una metodología)

Ver tabla completa en "Methodology skills" arriba.
Cada skill tiene su propio `references/` con guías del marco metodológico.
```

---

## Conclusión

**4 gaps identificados; 2 de impacto alto (Gap 1 y Gap 2)** — cubrir ambos antes de cerrar ÉPICA 40.

Las tres adiciones propuestas son **additive** (no reescriben el SKILL.md existente) y usan terminología coherente con `workflow-*`: "workflow stages" para el ciclo THYROX, "methodology skills" para los 29 skills externos, "framework patterns" para trabajo interno del framework como skill-anatomy.

El término "flujos" no es recomendado — no tiene respaldo en la nomenclatura existente del framework.
