```yml
created_at: 2026-04-16 23:37:54
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Análisis de Gap: Anatomía incompleta de los 29 methodology skills

## Problema identificado

Los 29 methodology skills creados en ÉPICA 40 tienen anatomía incompleta:
solo contienen `SKILL.md`. La anatomía oficial del framework requiere:
`SKILL.md + assets/ + scripts/ + references/`

## Inventario actual

### Estado por skill

| Skill | SKILL.md | assets/ | scripts/ | references/ | Gap |
|-------|----------|---------|----------|-------------|-----|
| pdca-plan | ✅ | ❌ | ❌ | ❌ | 3 |
| pdca-do | ✅ | ❌ | ❌ | ❌ | 3 |
| pdca-check | ✅ | ❌ | ❌ | ❌ | 3 |
| pdca-act | ✅ | ❌ | ❌ | ❌ | 3 |
| dmaic-define | ✅ | ❌ | ❌ | ❌ | 3 |
| dmaic-measure | ✅ | ❌ | ❌ | ❌ | 3 |
| dmaic-analyze | ✅ | ❌ | ❌ | ❌ | 3 |
| dmaic-improve | ✅ | ❌ | ❌ | ❌ | 3 |
| dmaic-control | ✅ | ❌ | ❌ | ❌ | 3 |
| rup-inception | ✅ | ❌ | ❌ | ❌ | 3 |
| rup-elaboration | ✅ | ❌ | ❌ | ❌ | 3 |
| rup-construction | ✅ | ❌ | ❌ | ❌ | 3 |
| rup-transition | ✅ | ❌ | ❌ | ❌ | 3 |
| rm-elicitation | ✅ | ❌ | ❌ | ❌ | 3 |
| rm-analysis | ✅ | ❌ | ❌ | ❌ | 3 |
| rm-specification | ✅ | ❌ | ❌ | ❌ | 3 |
| rm-validation | ✅ | ❌ | ❌ | ❌ | 3 |
| rm-management | ✅ | ❌ | ❌ | ❌ | 3 |
| pm-initiating | ✅ | ❌ | ❌ | ❌ | 3 |
| pm-planning | ✅ | ❌ | ❌ | ✅ (parcial) | 2 |
| pm-executing | ✅ | ❌ | ❌ | ❌ | 3 |
| pm-monitoring | ✅ | ❌ | ❌ | ✅ (parcial) | 2 |
| pm-closing | ✅ | ❌ | ❌ | ❌ | 3 |
| ba-planning | ✅ | ❌ | ❌ | ❌ | 3 |
| ba-elicitation | ✅ | ❌ | ❌ | ❌ | 3 |
| ba-requirements-analysis | ✅ | ❌ | ❌ | ❌ | 3 |
| ba-requirements-lifecycle | ✅ | ❌ | ❌ | ❌ | 3 |
| ba-strategy | ✅ | ❌ | ❌ | ❌ | 3 |
| ba-solution-evaluation | ✅ | ❌ | ❌ | ❌ | 3 |

**Total gaps:** 85 componentes faltantes (29 assets + 29 scripts + 27 references)

---

## Especificación de cada componente

### 1. `assets/{skill-name}.md.template`

**Propósito:** Template del artefacto que el skill produce. El ejecutor lo copia al WP como punto de partida.

**Patrón:** Cada SKILL.md tiene sección "Artefacto esperado" con la estructura. Hay que:
1. Extraer esa estructura a `assets/{skill-name}.md.template`
2. Reemplazar la sección en SKILL.md con relative link: `[{skill-name}.md.template](./assets/{skill-name}.md.template)`

**Naming:** `{skill-name}.md.template` — e.g., `pdca-plan.md.template`, `dmaic-define.md.template`

**Contenido tipo:**
```markdown
# [Título del artefacto]

## [Sección 1]
[contenido guiado]

## [Sección 2]
...
```

### 2. `scripts/validate-phase-readiness.sh`

**Propósito:** Validar precondiciones del step de metodología antes de ejecutarlo.
**IMPORTANTE:** NO es el mismo script de `workflow-track` (que valida fases THYROX 1-12).
Estos validan precondiciones específicas de la metodología.

**Patrón de invocación desde SKILL.md:**
```bash
bash .claude/skills/{skill-name}/scripts/validate-phase-readiness.sh
```

**Qué valida cada grupo:**

#### PDCA
| Script | Valida |
|--------|--------|
| pdca-plan | WP activo, problem statement documentado, baseline medido |
| pdca-do | pdca-plan.md existe en WP y tiene sección Action Plan aprobada |
| pdca-check | pdca-do completado, datos de ejecución disponibles |
| pdca-act | pdca-check completado, decisión STANDARDIZE/CONTINUE documentada |

#### DMAIC
| Script | Valida |
|--------|--------|
| dmaic-define | Sponsor identificado, VOC recopilado (≥1 técnica directa), Problem Statement sin causas |
| dmaic-measure | dmaic-define.md + Project Charter aprobado, baseline CTQ medido |
| dmaic-analyze | dmaic-measure.md, datos de baseline disponibles, MSA completado |
| dmaic-improve | dmaic-analyze.md, root causes validadas con datos |
| dmaic-control | dmaic-improve.md, solución piloteada, dueño del proceso asignado |

#### RUP
| Script | Valida |
|--------|--------|
| rup-inception | Use case survey existe, stakeholders identificados, LCO criteria definidos |
| rup-elaboration | rup-inception LCO aprobado, architecture baseline en progreso |
| rup-construction | LCA aprobado, architecture baseline estable, IU demo funcional |
| rup-transition | IOC aprobado, beta users identificados, deployment plan existe |

#### RM
| Script | Valida |
|--------|--------|
| rm-elicitation | Stakeholders identificados, técnicas de elicitación seleccionadas |
| rm-analysis | rm-elicitation completado, fuentes de requisitos disponibles |
| rm-specification | rm-analysis completado, requisitos analizados y priorizados |
| rm-validation | rm-specification completado, criterios de validación definidos |
| rm-management | baseline de requisitos aprobado, proceso de cambio definido |

#### PMBOK
| Script | Valida |
|--------|--------|
| pm-initiating | Business case aprobado, sponsor identificado |
| pm-planning | Project Charter aprobado, equipo asignado |
| pm-executing | Plan de proyecto aprobado (WBS, schedule, budget) |
| pm-monitoring | Proyecto en ejecución, métricas de control definidas (EVM baseline) |
| pm-closing | Todos los entregables aceptados, criterios de cierre cumplidos |

#### BABOK
| Script | Valida |
|--------|--------|
| ba-planning | Iniciativa de BA activa, stakeholders preliminares identificados |
| ba-elicitation | ba-planning completado, BA approach definido |
| ba-requirements-analysis | ba-elicitation completado, información recopilada |
| ba-requirements-lifecycle | requisitos especificados, baseline establecido |
| ba-strategy | business need documentado, stakeholders confirmados |
| ba-solution-evaluation | solución en producción ≥2 semanas, baseline pre-implementación existe |

### 3. `references/` — Contenido Tier 2

**Propósito:** Extraer de SKILL.md el material de referencia denso que no es instrucción procedimental.
**Criterio Tier 2:** tablas de técnicas, catálogos de herramientas, fórmulas, checklists extensos.

**Patrón de link desde SKILL.md:**
```markdown
Ver referencia completa: [nombre-archivo](./references/nombre-archivo.md)
```

**Referencias identificadas por skill:**

#### PDCA (4 references)
| Skill | Archivo | Contenido |
|-------|---------|-----------|
| pdca-plan | `problem-analysis-techniques.md` | 5-Why step-by-step, Fishbone categorías (6M), Pareto 80/20, diagrama de afinidad |
| pdca-plan | `action-planning.md` | SMART objectives tabla, Gantt mínimo, asignación de responsables |
| pdca-check | `measurement-tools.md` | Run chart construcción, Control chart tipos, before/after table, sample size |
| pdca-act | `standardization-patterns.md` | Yokoten process, A3 Report template, SDCA cycle, SOP estructura |

#### DMAIC (8 references)
| Skill | Archivo | Contenido |
|-------|---------|-----------|
| dmaic-define | `voc-techniques.md` | VOC→CTQ conversion table detallada, 6 técnicas con cuándo/cómo |
| dmaic-define | `sipoc-guide.md` | SIPOC paso a paso, ejemplos por industria, errores comunes |
| dmaic-measure | `msa-gage-rr.md` | Gage R&R tabla de decisión, Kappa Cohen, % contribution thresholds |
| dmaic-measure | `process-capability.md` | Cp/Cpk/Pp/Ppk fórmulas, tabla de interpretación, 1.5σ shift explicado |
| dmaic-analyze | `hypothesis-testing.md` | H0/H1 templates, p-value decision table, test selection matrix |
| dmaic-analyze | `root-cause-tools.md` | VSM symbols, Fishbone profundo, 5-Why con verificación, Scatter plot |
| dmaic-improve | `doe-guide.md` | Full factorial vs fractional, factors/levels/runs tabla, ANOVA básico |
| dmaic-control | `control-chart-guide.md` | 8 Western Electric Rules completas, tipo de chart por tipo de dato, OCC |

#### RUP (5 references)
| Skill | Archivo | Contenido |
|-------|---------|-----------|
| rup-inception | `lco-criteria.md` | LCO evaluation criteria completos, concurrence checklist, decisiones típicas |
| rup-elaboration | `lca-criteria.md` | LCA evaluation criteria, architecture baseline checklist, riesgos arquitectónicos |
| rup-construction | `ioc-criteria.md` | IOC evaluation criteria, feature complete checklist, test coverage thresholds |
| rup-transition | `pd-criteria.md` | PD evaluation criteria, deployment checklist, user acceptance criteria |
| rup-elaboration | `architecture-baseline.md` | SAD estructura, 4+1 view model, ADR template para RUP |

#### RM (5 references)
| Skill | Archivo | Contenido |
|-------|---------|-----------|
| rm-elicitation | `elicitation-techniques.md` | 8 técnicas detalladas con cuándo/cómo/output, comparativa |
| rm-analysis | `analysis-patterns.md` | MoSCoW tabla completa, conflict resolution patterns, dependency mapping |
| rm-specification | `specification-standards.md` | IEEE 830 estructura, Gherkin avanzado, acceptance criteria patterns |
| rm-validation | `validation-checklist.md` | 20-item checklist por tipo de requisito, defect taxonomy |
| rm-management | `change-control-process.md` | CCB proceso detallado, impact assessment template, change log format |

#### PMBOK (5 references — pm-planning y pm-monitoring ya tienen algunas)
| Skill | Archivo | Contenido |
|-------|---------|-----------|
| pm-initiating | `project-charter-guide.md` | Business case structure, charter template completo, stakeholder register |
| pm-planning | ya tiene `planning-techniques.md` | — (completar si faltan secciones) |
| pm-executing | `team-management.md` | RACI detallado, conflict resolution, team performance metrics, procurement |
| pm-monitoring | ya tiene `evm-and-change-control.md` | — (completar si faltan secciones) |
| pm-closing | `project-closure-guide.md` | Closure checklist, lessons learned facilitation, contract closure, knowledge transfer |

#### BABOK (6 references)
| Skill | Archivo | Contenido |
|-------|---------|-----------|
| ba-planning | `ba-approach-techniques.md` | Stakeholder engagement matrix, BA plan template, governance considerations |
| ba-elicitation | `elicitation-techniques.md` | 9 técnicas BABOK detalladas con cuándo/cómo/output |
| ba-requirements-analysis | `analysis-techniques.md` | Decision table, decision tree, process modeling, data modeling |
| ba-requirements-lifecycle | `traceability-matrix.md` | Traceability matrix template, coverage analysis, impact assessment |
| ba-strategy | `gap-analysis-guide.md` | Current/Future state templates, gap categorization, benchmark sources |
| ba-solution-evaluation | `evaluation-techniques.md` | KPI measurement framework, ROI calculation, adoption metrics, survey design |

---

## Scope total

| Componente | Cantidad | Observaciones |
|------------|----------|---------------|
| `assets/*.md.template` | 29 (1 por skill) | Extraer de sección "Artefacto esperado" existente |
| `scripts/validate-phase-readiness.sh` | 29 (1 por skill) | Nuevo — específico por metodología |
| `references/*.md` (nuevos) | ~33 archivos | Ver tabla por skill arriba |
| `references/*.md` (a completar) | 2 (pm-planning, pm-monitoring) | Verificar cobertura |
| Actualizaciones `SKILL.md` | 29 | Relative links + extraer contenido a references/ |

**Total archivos a crear/modificar: ~95**

---

---

## Hallazgos del deep-review — `/tmp/reference/`

> Fuentes: `claude-howto/03-skills/` (6 skills) + `claude-code-ultimate-guide/examples/skills/` (14 skills) + READMEs canónicos

### assets/ — correcciones al análisis inicial

**Naming real:** `{artefacto}-template.md`, NO `{skill-name}.md.template`.
- ✅ `project-charter-template.md` (dmaic-define)
- ✅ `pdca-plan-template.md` (pdca-plan)
- ❌ ~~`pdca-plan.md.template`~~ (naming incorrecto)

**Referencia en SKILL.md:** Sección `## Reference Files` al final, con descripción:
```markdown
## Reference Files
- `assets/pdca-plan-template.md` — Template del Plan PDCA con secciones obligatorias
- `references/problem-analysis-techniques.md` — 5-Why, Fishbone, Pareto
```

**Importante:** Los assets NO se cargan automáticamente. Se referencian explícitamente en el workflow de SKILL.md con relative link o backtick path.

### scripts/ — calibración crítica

**El deep-review revela que los scripts NO son principalmente para phase readiness.**
Son para **cálculos determinísticos** que vale la pena externalizar:
- `analyze-metrics.py` — métricas de código
- `detect-smells.py` — detección automatizada de patrones
- `check-install.sh` — validar instalación de dependencias

**Para methodology skills, la mayoría de los "scripts" que imaginé son innecesarios:**
- "¿Hay un sponsor identificado?" → no es cálculo determinístico, es juicio del BA
- "¿El Problem Statement menciona causas?" → Claude lo evalúa leyendo el doc, no un script

**Scripts con valor real para methodology skills (pocos):**
| Skill | Script útil | Qué calcularía |
|-------|-------------|----------------|
| dmaic-measure | `calculate-capability.py` | Cp/Cpk desde datos CSV |
| dmaic-control | `check-control-limits.py` | Western Electric Rules sobre serie de datos |
| rup-inception | `check-lco-criteria.sh` | Verificar presencia de artefactos LCO en WP |
| rm-management | `count-requirements.sh` | Contar requisitos por estado en traceability matrix |

**Conclusión:** scripts/ es **opcional** para methodology skills. Solo crear cuando hay cálculo determinístico real. El `validate-phase-readiness.sh` genérico ya existe en `workflow-track` — no duplicar para cada skill.

### references/ — confirmado y ampliado

**Tipos de contenido observados en el ecosystem:**

| Tipo | Tamaño típico | Para metodología |
|------|---------------|-----------------|
| Catálogos de dominio | 500-1000 líneas | ✅ (code-smells.md → pdca-problem-tools.md) |
| Reglas de transformación | 50-100 líneas | ✅ (VOC→CTQ mapping, gap analysis rules) |
| Reglas de evaluación/criterios | 30-50 líneas | ✅ (LCO/LCA/IOC criteria, tollgate checklists) |
| Índices YAML machine-readable | variable | ❌ (viola I-003, innecesario para BA/PM) |

**Patrón de link inline en SKILL.md** (dentro del workflow, donde aplica):
```markdown
### 1. Recopilar VOC
Ver técnicas detalladas: [references/voc-techniques.md](./references/voc-techniques.md)
```

### Corrección al scope total

El deep-review revela que **scripts/ debe ser selectivo**, no universal. Esto reduce el scope:

| Componente | Antes | Después (ajustado) |
|------------|-------|-------------------|
| `assets/*-template.md` | 29 | 29 (sin cambio) |
| `scripts/*.sh` o `*.py` | 29 | ~6 (solo donde hay cálculo real) |
| `references/*.md` | ~35 | ~35 (sin cambio) |
| Actualizaciones `SKILL.md` | 29 | 29 |
| **Total** | **~95** | **~70** |

### Gaps del ecosystem que NO replicar en THYROX

| Gap | Descripción | Decisión |
|-----|-------------|----------|
| `templates/` vs `assets/` inconsistencia | `claude-howto` usa `templates/`, `ultimate-guide` usa `assets/` | Usar `assets/` (estándar canónico de `skill-creator`) |
| YAML en references/ | Solo skills avanzados, viola I-003 | No aplicar — Markdown suficiente |
| `scoring/` como directorio extra | Ad-hoc en un skill específico | No replicar |

---

## Batches de ejecución (revisados)

| Batch | Skills | Assets | Scripts | References | Total archivos |
|-------|--------|--------|---------|------------|----------------|
| B1 — PDCA | 4 | 4 | 0 | 4 | 8 + 4 SKILL.md updates |
| B2 — DMAIC | 5 | 5 | 2 | 8 | 15 + 5 SKILL.md updates |
| B3 — RUP | 4 | 4 | 1 | 5 | 10 + 4 SKILL.md updates |
| B4 — RM | 5 | 5 | 1 | 5 | 11 + 5 SKILL.md updates |
| B5 — PMBOK | 5 | 5 | 0 | 3 | 8 + 5 SKILL.md updates |
| B6 — BABOK | 6 | 6 | 0 | 6 | 12 + 6 SKILL.md updates |
| **Total** | **29** | **29** | **4** | **31** | **64 + 29 updates** |

---

## Pendiente

- [x] Incorporar hallazgos del deep-review de `/tmp/reference/`
- [x] Validar naming conventions de templates contra referencias externas → `{artefacto}-template.md`
- [x] Confirmar estructura de scripts → selectivos, solo cálculo determinístico
- [x] Definir si scripts son standalone → sí, invocables por CLI y desde SKILL.md
- [ ] Crear task-plan con T-NNN para los 6 batches
- [ ] Ejecutar B1 (PDCA) como batch piloto para validar el patrón
