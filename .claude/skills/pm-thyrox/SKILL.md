```yml
name: pm-thyrox
description: "Framework de gestión de proyectos con metodología SDLC de 7 fases. Usar este skill cuando el usuario quiera planificar, analizar, diseñar, organizar, trackear o gestionar CUALQUIER tipo de trabajo — features, bug fixes, refactoring, documentación, investigación o setup de proyecto. También usar cuando el usuario pregunte '¿qué hago primero?', '¿cómo organizo esto?', '¿cuál es el estado?', 'crea un plan para X', 'analiza X', 'descompón X en tareas', 'documenta esta decisión', o cualquier cosa relacionada con workflow de proyecto, tracking de trabajo, registros de decisiones o desarrollo estructurado. Siempre empezar con ANALYZE antes de planificar."
```

# PM-THYROX: Gestión de Proyectos

Framework de gestión para organizar trabajo de cualquier tamaño con Claude Code. Sigue una metodología de 7 fases donde entender viene antes que planificar, y planificar viene antes que ejecutar.

**Principio core:** Analizar antes de actuar. Cada fase produce artefactos que alimentan la siguiente. Saltar fases produce trabajo sin fundamento.

**Nomenclatura:** "FASE" y "Phase" son niveles distintos — no confundir.
`FASE N` = número secuencial global del proyecto (cada WP ocupa una FASE).
`Phase N` = etapa interna del ciclo SDLC dentro de ese WP (1–7, se reinicia en cada FASE).
Ejemplo: "FASE 20 está en Phase 6" = el WP #20 del proyecto está ejecutándose.
Ver glosario completo en [CLAUDE.md](../../../CLAUDE.md#glosario).

```mermaid
flowchart LR
    P1([ANALYZE]) --> P2([SOLUTION\nSTRATEGY])
    P2 --> P3([PLAN])
    P3 --> P4([STRUCTURE])
    P4 --> P5([DECOMPOSE])
    P5 --> P6([EXECUTE])
    P6 --> P7([TRACK])
    P6 -->|más tareas| P6

    P1 -.->|micro: saltar 2-5| P6
    P2 -.->|pequeño: saltar 3-5| P6
```

---

## Catálogo de fases

Cada fase vive en su propio skill. Invocar directamente para ejecutar:

| Fase | Skill | Descripción |
|------|-------|-------------|
| Phase 1: ANALYZE | `/workflow-analyze` | Entender el problema. 8 aspectos + WP + análisis + risk register. |
| Phase 2: SOLUTION_STRATEGY | `/workflow-strategy` | Investigar alternativas. Key Ideas + Research + Decisions. |
| Phase 3: PLAN | `/workflow-plan` | Definir scope. Scope statement + in/out-of-scope + ROADMAP. |
| Phase 4: STRUCTURE | `/workflow-structure` | Especificar. Requirements spec + design (si complejo). |
| Phase 5: DECOMPOSE | `/workflow-decompose` | Crear tareas atómicas. Task plan + DAG + trazabilidad. |
| Phase 6: EXECUTE | `/workflow-execute` | Ejecutar. Commits + actualizar task plan + gates async. |
| Phase 7: TRACK | `/workflow-track` | Cerrar WP. Lessons learned + CHANGELOG + estado. |

Ver [escalabilidad](../workflow-analyze/references/scalability.md) para reglas de qué fases omitir según tamaño del WP.

---

## Dónde viven los artefactos

| Fase | Artefacto | Ubicación | Template |
|------|-----------|-----------|----------|
| 1 | Síntesis de análisis | `work/.../analysis/{nombre-wp}-analysis.md` | [introduction.md.template](../workflow-analyze/assets/introduction.md.template) |
| 1 | Registro de riesgos | `work/../{nombre-wp}-risk-register.md` | [risk-register.md.template](../workflow-analyze/assets/risk-register.md.template) |
| 1 | Sub-análisis (opcional) | `work/.../analysis/*.md` | stakeholders, requirements-analysis, use-cases, quality-goals, constraints, context, basic-usage |
| 1 | Gates de 7 fases (mediano/grande) | `work/../{nombre-wp}-exit-conditions.md` | [exit-conditions.md.template](../workflow-analyze/assets/exit-conditions.md.template) |
| 1 | Principios globales del proyecto | `constitution.md` (raíz) | [constitution.md.template](../workflow-analyze/assets/constitution.md.template) |
| 1–2 | Decisiones arquitectónicas | `{adr_path}/adr-NNN.md` (ver CLAUDE.md o default `docs/architecture/decisions/`) | [adr.md.template](../workflow-analyze/assets/adr.md.template) |
| 1 | Work package | `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` | — |
| 2 | Estrategia de solución | `work/../{nombre-wp}-solution-strategy.md` | [solution-strategy.md.template](../workflow-strategy/assets/solution-strategy.md.template) |
| 3 | Scope del trabajo | `work/../{nombre-wp}-plan.md` | [plan.md.template](../workflow-plan/assets/plan.md.template) |
| 4 | Especificación de requisitos | `work/../{nombre-wp}-requirements-spec.md` | [requirements-specification.md.template](../workflow-structure/assets/requirements-specification.md.template) |
| 4 | Diseño técnico (complejo) | `work/../{nombre-wp}-design.md` | [design.md.template](../workflow-structure/assets/design.md.template) |
| 5 | Plan de tareas | `work/../{nombre-wp}-task-plan.md` | [tasks.md.template](../workflow-decompose/assets/tasks.md.template) |
| 6 | Log de ejecución | `work/../{nombre-wp}-execution-log.md` | [execution-log.md.template](../workflow-execute/assets/execution-log.md.template) |
| 6 | Código | Repositorio (git) | — |
| 7 | Lecciones aprendidas | `work/../{nombre-wp}-lessons-learned.md` | [lessons-learned.md.template](../workflow-track/assets/lessons-learned.md.template) |
| 7 | Changelog | [CHANGELOG](CHANGELOG.md) | [changelog.md.template](../workflow-track/assets/changelog.md.template) |
| 7 | Reporte final (grande) | `work/../{nombre-wp}-final-report.md` | [final-report.md.template](../workflow-track/assets/final-report.md.template) |
| — | Errores | `context/errors/ERR-NNN-descripcion.md` | [error-report.md.template](assets/error-report.md.template) |

## Estructura de un work package

```
context/work/YYYY-MM-DD-HH-MM-SS-nombre/
├── analysis/
│   ├── {nombre}-analysis.md          ← Síntesis del análisis (Phase 1) — REQUERIDO
│   └── {nombre}-{subtema}.md         ← Sub-análisis opcionales (stakeholders, constraints, etc.)
├── {nombre}-risk-register.md         ← Riesgos vivos Phase 1→6 — REQUERIDO
├── {nombre}-exit-conditions.md       ← Gates de las 7 fases (Phase 1, mediano/grande)
├── {nombre}-solution-strategy.md     ← Estrategia arquitectónica (Phase 2)
├── {nombre}-plan.md                  ← Scope aprobado (Phase 3)
├── {nombre}-requirements-spec.md     ← Especificación de requisitos (Phase 4)
├── {nombre}-design.md                ← Diseño técnico (Phase 4, complejo)
├── {nombre}-task-plan.md             ← Tareas con checkboxes (Phase 5) — REQUERIDO
├── {nombre}-execution-log.md         ← Log de sesiones de ejecución (Phase 6)
├── {nombre}-lessons-learned.md       ← Lecciones aprendidas (Phase 7) — REQUERIDO
└── {nombre}-final-report.md          ← Reporte final con métricas (Phase 7, grande)
```

## Naming

```
Archivos:        kebab-case.md
Work packages:   YYYY-MM-DD-HH-MM-SS-nombre/   ← timestamp real: `date +%Y-%m-%d-%H-%M-%S`
Commits:         type(scope): description
ADRs:            adr-NNN.md
Tareas:          [T-NNN] Descripción (R-N)
Errores:         ERR-NNN-descripcion.md
```

**Artefactos de work package — patrón `{nombre-wp}-{tipo}.md`:**

```
{nombre-wp} = parte descriptiva del WP (sin timestamp)
{tipo}      = analysis | solution-strategy | plan | requirements-spec | design |
              task-plan | execution-log | lessons-learned | risk-register |
              exit-conditions | final-report | spec-checklist

Excepción: CHANGELOG.md — nombre global, convención universal (Keep a Changelog)
```

Ver [conventions](../../references/conventions.md) para detalles completos.

---

## References por dominio

### Phase 1: ANALYZE (leer cuando se investiga un problema)
[introduction](../workflow-analyze/references/introduction.md) · [requirements-analysis](../workflow-analyze/references/requirements-analysis.md) · [use-cases](../workflow-analyze/references/use-cases.md) · [quality-goals](../workflow-analyze/references/quality-goals.md) · [stakeholders](../workflow-analyze/references/stakeholders.md) · [basic-usage](../workflow-analyze/references/basic-usage.md) · [constraints](../workflow-analyze/references/constraints.md) · [context](../workflow-analyze/references/context.md)

### Phase 2: SOLUTION (leer cuando se toman decisiones arquitectónicas)
[solution-strategy](../workflow-strategy/references/solution-strategy.md)

### Phase 4: STRUCTURE (leer cuando se crean especificaciones complejas)
[spec-driven-development](../workflow-structure/references/spec-driven-development.md)

### Phase 6: EXECUTE (leer cuando se hacen commits)
[commit-helper](../workflow-execute/references/commit-helper.md) · [commit-convention](../workflow-execute/references/commit-convention.md)

### Phase 7: TRACK (leer cuando se valida o corrige)
[reference-validation](../workflow-track/references/reference-validation.md) · [incremental-correction](../workflow-track/references/incremental-correction.md)

### Cross-phase (leer según necesidad)
[conventions](../../references/conventions.md) — Convenciones de archivos, commits, ROADMAP, ejecución paralela
[scalability](../workflow-analyze/references/scalability.md) — Cómo escalar el framework según complejidad
[examples](../../references/examples.md) — 8 casos de uso reales
[agent-spec](../../references/agent-spec.md) — Spec formal de agentes nativos Claude Code (campos obligatorios/prohibidos, naming)
[skill-vs-agent](../../references/skill-vs-agent.md) — Cuándo crear un SKILL vs un agente nativo
[claude-code-components](../../references/claude-code-components.md) — Referencia oficial de Skills, Subagents y Context (docs oficiales)

### Avanzado (leer cuando Claude tiene dificultades)
[prompting-tips](../../references/prompting-tips.md) — Cuando Claude no entiende instrucciones
[long-context-tips](../../references/long-context-tips.md) — Documentos >5,000 palabras
[skill-authoring](../../references/skill-authoring.md) — Crear o mejorar skills
