```yml
created_at: 2026-04-16 23:47:00
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 6 — SCOPE
author: NestorMonroy
status: Borrador
```

# Plan — Skill Anatomy Completion (ÉPICA 40 — Batch 2)

## Contexto

Los 29 methodology skills creados en ÉPICA 40 tienen anatomía incompleta: solo `SKILL.md`.
La anatomía oficial del framework requiere `SKILL.md + assets/ + scripts/ + references/`.

Este plan cubre la segunda fase de trabajo dentro del WP multi-methodology:
completar la anatomía de los 29 skills con los componentes faltantes.

**Análisis de base:** `analyze/skill-anatomy-gap-analysis.md`
**Plan de infraestructura anterior:** `plan/multi-methodology-plan.md` (completado)

---

## Scope statement

Dotar a los 29 methodology skills (PDCA×4, DMAIC×5, RUP×4, RM×5, PMBOK×5, BABOK×6)
de anatomía completa: un template de artefacto en `assets/`, contenido de referencia
Tier 2 en `references/`, scripts selectivos donde haya cálculo determinístico real,
y sección `## Reference Files` en cada `SKILL.md` con relative links a todos los
archivos de soporte.

---

## In-scope

### assets/ — 29 templates de artefacto

Un template por skill, nombrado `{artefacto}-template.md`, que refleja la estructura
del artefacto que el skill produce. Extraído de la sección "Artefacto esperado" existente
en cada SKILL.md.

| Batch | Skills | Templates |
|-------|--------|-----------|
| B1 PDCA | pdca-plan, pdca-do, pdca-check, pdca-act | pdca-plan-template.md, pdca-do-template.md, pdca-check-template.md, pdca-act-template.md |
| B2 DMAIC | dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control | 5 templates |
| B3 RUP | rup-inception, rup-elaboration, rup-construction, rup-transition | 4 templates |
| B4 RM | rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management | 5 templates |
| B5 PMBOK | pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing | 5 templates |
| B6 BABOK | ba-planning, ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-strategy, ba-solution-evaluation | 6 templates |

### references/ — 31 archivos de referencia Tier 2

Contenido de dominio denso extraído de SKILL.md o creado nuevo. Solo contenido que no
es instrucción procedimental: tablas de técnicas, catálogos, fórmulas, criterios de
evaluación, checklists de salida de fase.

| Batch | Archivo | Skill origen |
|-------|---------|-------------|
| B1 | `problem-analysis-techniques.md` | pdca-plan |
| B1 | `action-planning.md` | pdca-plan |
| B1 | `measurement-tools.md` | pdca-check |
| B1 | `standardization-patterns.md` | pdca-act |
| B2 | `voc-techniques.md` | dmaic-define |
| B2 | `sipoc-guide.md` | dmaic-define |
| B2 | `msa-gage-rr.md` | dmaic-measure |
| B2 | `process-capability.md` | dmaic-measure |
| B2 | `hypothesis-testing.md` | dmaic-analyze |
| B2 | `root-cause-tools.md` | dmaic-analyze |
| B2 | `doe-guide.md` | dmaic-improve |
| B2 | `control-chart-guide.md` | dmaic-control |
| B3 | `lco-criteria.md` | rup-inception |
| B3 | `lca-criteria.md` | rup-elaboration |
| B3 | `architecture-baseline.md` | rup-elaboration |
| B3 | `ioc-criteria.md` | rup-construction |
| B3 | `pd-criteria.md` | rup-transition |
| B4 | `elicitation-techniques.md` | rm-elicitation |
| B4 | `analysis-patterns.md` | rm-analysis |
| B4 | `specification-standards.md` | rm-specification |
| B4 | `validation-checklist.md` | rm-validation |
| B4 | `change-control-process.md` | rm-management |
| B5 | `project-charter-guide.md` | pm-initiating |
| B5 | `team-management.md` | pm-executing |
| B5 | `project-closure-guide.md` | pm-closing |
| B6 | `ba-approach-techniques.md` | ba-planning |
| B6 | `elicitation-techniques.md` | ba-elicitation |
| B6 | `analysis-techniques.md` | ba-requirements-analysis |
| B6 | `traceability-matrix.md` | ba-requirements-lifecycle |
| B6 | `gap-analysis-guide.md` | ba-strategy |
| B6 | `evaluation-techniques.md` | ba-solution-evaluation |

> pm-planning y pm-monitoring ya tienen references/ del Cambio C. Se verificará cobertura
> y se complementará si hay contenido faltante.

### scripts/ — 4 scripts selectivos

Solo donde hay cálculo determinístico que no puede hacer Claude leyendo un documento.

| Script | Skill | Qué calcula |
|--------|-------|-------------|
| `calculate-capability.py` | dmaic-measure | Cp/Cpk desde datos CSV de proceso |
| `check-control-limits.py` | dmaic-control | Western Electric Rules sobre serie de datos |
| `check-lco-criteria.sh` | rup-inception | Presencia de artefactos LCO en WP activo |
| `count-requirements.sh` | rm-management | Conteo de requisitos por estado en traceability matrix |

### Actualizaciones de SKILL.md — 29 archivos

Cada SKILL.md actualizado con:
1. Sección `## Reference Files` al final con relative links a todos sus assets y references
2. Links inline en el cuerpo del workflow donde aplica cada referencia
3. Extracción del contenido Tier 2 que queda en SKILL.md al archivo references/ correspondiente

---

## Out-of-scope

| Item | Razón |
|------|-------|
| `workflow-*` skills | Ya tienen anatomía completa (assets/ + scripts/ + references/) |
| Tech skills (backend-nodejs, db-mysql, etc.) | Fuera del scope multi-methodology |
| YAML en references/ | Viola I-003 (Markdown únicamente); innecesario para BA/PM |
| `templates/` como directorio alternativo | El estándar canónico es `assets/` — no duplicar |
| Modificar coordinators o registry YAML | Completados en Batch 1 de este WP |
| Scripts de validación de precondiciones | No tiene precedente en el ecosystem — Claude evalúa por lectura, no por script |
| pm-planning/references/planning-techniques.md (ya existe) | Solo complementar si hay gaps |
| pm-monitoring/references/evm-and-change-control.md (ya existe) | Solo complementar si hay gaps |

---

## Criterios de éxito

| Criterio | Verificación |
|----------|-------------|
| Todos los 29 skills tienen `assets/` con al menos 1 template | `ls .claude/skills/{skill}/assets/` |
| Todos los 29 skills tienen `references/` con al menos 1 archivo | `ls .claude/skills/{skill}/references/` |
| Todos los SKILL.md tienen sección `## Reference Files` | `grep "## Reference Files" .claude/skills/*/SKILL.md` |
| Los relative links en SKILL.md apuntan a archivos que existen | `bash .claude/skills/workflow-track/scripts/validate-phase-readiness.sh` |
| Los 4 scripts son ejecutables y tienen help (`--help` o sin args) | `bash script.sh` sin error |
| No hay contenido duplicado entre SKILL.md y references/ | Revisión manual por batch |

---

## Entregables por batch

| Batch | Entregable | Commit type |
|-------|-----------|-------------|
| B1 PDCA | 4 skills con anatomía completa | `feat(pdca): complete skill anatomy` |
| B2 DMAIC | 5 skills con anatomía completa | `feat(dmaic): complete skill anatomy` |
| B3 RUP | 4 skills con anatomía completa | `feat(rup): complete skill anatomy` |
| B4 RM | 5 skills con anatomía completa | `feat(rm): complete skill anatomy` |
| B5 PMBOK | 5 skills con anatomía completa | `feat(pmbok): complete skill anatomy` |
| B6 BABOK | 6 skills con anatomía completa | `feat(babok): complete skill anatomy` |

---

## Dependencias

| Dependencia | Estado |
|------------|--------|
| Análisis de gap completado | ✅ `analyze/skill-anatomy-gap-analysis.md` |
| Naming convention `{artefacto}-template.md` validada | ✅ Deep-review /tmp/reference/ |
| Patrón `## Reference Files` en SKILL.md confirmado | ✅ Deep-review /tmp/reference/ |
| Task plan creado | ⏳ Pendiente |

---

## Riesgos

| ID | Riesgo | Prob | Impacto | Mitigación |
|----|--------|------|---------|------------|
| R-001 | Contenido extraído a references/ queda incompleto respecto al SKILL.md original | Media | Medio | Leer SKILL.md completo antes de extraer; checklist de secciones |
| R-002 | Relative links rotos si se cambia el nombre del skill | Baja | Alto | No renombrar skills durante este WP; links relativas son robustas a move si se mueven juntas |
| R-003 | References duplican contenido que ya está en guidelines/ o agent-spec.md | Media | Bajo | Verificar antes de crear: `grep -r "tema" .claude/references/` |
