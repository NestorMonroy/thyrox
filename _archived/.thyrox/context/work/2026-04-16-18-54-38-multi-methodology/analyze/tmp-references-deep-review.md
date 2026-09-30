```yml
created_at: 2026-04-17 03:20:56
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Aprobado
```

# Deep-Review: Referencias en /tmp para implementación de 5 frameworks

**Propósito:** Identificar material reutilizable en `/tmp/references/` para implementar
Lean Six Sigma, Problem Solving 8-step, Strategic Planning, Consulting Process y Business Process Analysis
como methodology skills en THYROX.

---

## Inventario de /tmp/references/

```
/tmp/references/
├── antigravity-awesome-skills/    ← 1412 skills de comunidad
│   ├── CATALOG.md
│   └── skills/                   ← directorios individuales por skill
└── topics/
    ├── guides/                   ← guías temáticas (README.md + assets, sin contenido inline)
    │   ├── lean-six-sigma-guide/
    │   ├── project-management-guide/
    │   └── business-lingo-guide/
    └── topics/                   ← 1000+ topics, cada uno con index.md de contenido real
```

**Nota estructural:** El contenido usable está en `topics/topics/{nombre}/index.md`.
Los `guides/` solo tienen README.md con links — el contenido está en topics individuales.

---

## Framework 1: Lean Six Sigma (`lean:`)

### Cobertura: ALTA

### Topics disponibles en /tmp

| Archivo | Contenido | Uso en implementación |
|---------|-----------|----------------------|
| `topics/six-sigma-methodology/index.md` | 5 principios core Six Sigma | `references/lean-principles.md` |
| `topics/dmaic-methodology/index.md` | 5 fases DMAIC con descripción | `references/lean-dmaic-overview.md` |
| `topics/lean-manufacturing/index.md` | 7 aspectos: valor, VSM, flujo, pull, waste, kaizen, respeto | `references/lean-manufacturing.md` |
| `topics/value-stream-mapping/index.md` | 5 pasos de VSM | `references/vsm-guide.md` |
| `topics/kaizen/index.md` | Filosofía + PDCA + 4 pasos | `references/kaizen-guide.md` |
| `topics/the-pareto-principle/index.md` | 80/20 rule con ejemplos | `references/pareto-guide.md` |
| `topics/root-cause-analysis/index.md` | 6 pasos RCA | `references/rca-guide.md` (compartido con ps8:) |
| `topics/five-whys-analysis/index.md` | 5 Whys completo | `references/five-whys.md` (compartido) |
| `topics/cause-and-effect-diagram/index.md` | Fishbone con 6M | `references/fishbone.md` (compartido) |
| `topics/critical-to-quality/index.md` | CTQ en Six Sigma | `references/ctq-guide.md` |
| `topics/voice-of-customer/index.md` | VOC — métodos y beneficios | `references/voc-guide.md` (compartido) |
| `topics/ooda-loop-v-dmaic-cycle-v-pdca-spiral/index.md` | Tabla comparativa OODA/DMAIC/PDCA | `references/methodology-comparison.md` |

### Material existente en THYROX (reutilizar)

| Archivo THYROX | Contenido | Acción |
|---------------|-----------|--------|
| `.claude/skills/dmaic-improve/references/lean-tools-guide.md` | 7 desperdicios MUDA (TIMWOOD), 5S completo, Kanban, SMED, Jidoka, Heijunka, NVA elimination | **Mover/copiar como base de `lean:improve`** |
| `.claude/skills/dmaic-analyze/references/root-cause-tools.md` | RCA tools | Compartir con `lean:analyze` |
| `.claude/skills/dmaic-define/references/voc-techniques.md` | VOC | Compartir con `lean:define` |

### Skills de Antigravity

- `skills/kaizen/SKILL.md` — Kaizen aplicado a código (4 pilares: Continuous Improvement, Poka-Yoke, Standardized Work, JIT). Útil como ejemplo de aplicación práctica en `references/`.

### Gaps — deben generarse desde cero

| Template/Artefacto | Para skill | Descripción |
|-------------------|-----------|-------------|
| VSM template (As-Is + Future State) | `lean:measure` | Swimlanes con tiempos de ciclo, inventario, push/pull |
| Kaizen Event Charter | `lean:improve` | Alcance, equipo, objetivo, pre-work, post-work |
| 5S Audit Checklist | `lean:control` | Checklist de evaluación por cada S |
| TIMWOOD Diagnostic Checklist | `lean:analyze` | Preguntas diagnósticas por cada tipo de desperdicio |
| Lean Project Charter | `lean:define` | Diferenciado del DMAIC Charter — enfoque en waste reduction |

---

## Framework 2: Problem Solving 8-step Toyota TBP (`ps8:`)

### Cobertura: BAJA

### Topics disponibles en /tmp

| Archivo | Contenido | Uso en implementación |
|---------|-----------|----------------------|
| `topics/root-cause-analysis/index.md` | 6 pasos RCA | `references/rca-guide.md` (compartido) |
| `topics/five-whys-analysis/index.md` | 5 Whys | `references/five-whys.md` (compartido) |
| `topics/cause-and-effect-diagram/index.md` | Fishbone/Ishikawa con 6M | `references/fishbone.md` (compartido) |

### Gaps — casi todo debe generarse

| Template/Artefacto | Para skill | Descripción |
|-------------------|-----------|-------------|
| Los 8 pasos Toyota TBP con preguntas diagnósticas por paso | `ps8:clarify`…`ps8:standardize` | Descripción detallada de cada paso con preguntas guía |
| A3 Report template (9 secciones) | Transversal ps8: | Background, Current Condition, Goal/Target, Root Cause Analysis, Countermeasures, Effect Confirmation, Follow-up |
| Diferencias entre tipos de A3 | `references/a3-types.md` | Problem Solving A3 vs Proposal A3 vs Status Report A3 |
| Gemba Walk guide | `references/gemba-walk.md` | Cómo hacer observación directa en campo |
| Ishikawa con 6M aplicado a software | `references/fishbone-software.md` | Adaptación: Machine→Technology, etc. |

---

## Framework 3: Strategic Planning (`sp:`)

### Cobertura: MEDIA-ALTA

### Topics disponibles en /tmp

| Archivo | Contenido | Uso en implementación |
|---------|-----------|----------------------|
| `topics/strategic-balanced-scorecard/index.md` | BSC con 4 perspectivas + métricas ejemplo | `references/balanced-scorecard.md` |
| `topics/strategy-map/index.md` | Strategy Map — estructura, propósito, alineación | `references/strategy-map.md` |
| `topics/okr/index.md` | OKR — 5 pasos, beneficios | `references/okr-guide.md` |
| `topics/agile-change-smart-okrs/index.md` | **25+ OKRs SMART concretos** | `assets/okr-examples.md` ← muy valioso |
| `topics/key-performance-indicators/index.md` | KPIs — SMART, revisión periódica | `references/kpi-guide.md` |
| `topics/swot-analysis/index.md` | SWOT — 4 cuadrantes con ejemplos | `references/swot-guide.md` |
| `topics/business-strategy-and-business-tactics/index.md` | Diferencia estrategia vs táctica | `references/strategy-vs-tactics.md` |
| `topics/five-forces-analysis/index.md` | Porter's Five Forces | `references/five-forces.md` |
| `topics/blue-ocean-strategy/index.md` | ERRC framework (Eliminate, Reduce, Raise, Create) | `references/blue-ocean.md` |

### Skills de Antigravity — altamente reutilizables

| Archivo | Contenido | Uso |
|---------|-----------|-----|
| `skills/startup-business-analyst-business-case/SKILL.md` | Business Case completo: 10 secciones con tablas, métricas, TAM/SAM/SOM | `assets/strategic-business-case.md` — template investor-grade |
| `skills/startup-business-analyst-market-opportunity/SKILL.md` | Market sizing: bottom-up + top-down, TAM/SAM/SOM con fórmulas | `assets/market-sizing-template.md` |

### Gaps — deben generarse

| Template/Artefacto | Para skill | Descripción |
|-------------------|-----------|-------------|
| BSC template tabular | `sp:formulate` | Tabla: Perspectiva → Objetivo → Medida → Meta → Iniciativa |
| Strategy Map visual | `sp:formulate` | Jerarquía de objetivos por perspectiva con flechas causa-efecto |
| PESTEL Analysis template | `sp:analysis` | Political, Economic, Social, Technological, Environmental, Legal |
| Vision/Mission/Values template | `sp:context` | Formato de declaración + preguntas guía para definir cada uno |
| Hoshin Kanri / X-Matrix | `sp:plan` | Cascada de objetivos organización → departamento → equipo |

---

## Framework 4: Consulting Process (`cp:`)

### Cobertura: BAJA (la más baja de los 5)

### Topics con contenido periférico

| Archivo | Contenido | Uso |
|---------|-----------|-----|
| `topics/consulting-agreement/index.md` | Estructura de contrato de consultoría | `references/engagement-structure.md` (contexto) |
| `topics/business-strategy-and-business-tactics/index.md` | Estrategia vs táctica | `references/strategy-framing.md` |
| `topics/stakeholder-analysis/index.md` | 5 pasos de análisis de stakeholders | `references/stakeholder-analysis.md` (compartido) |

### Skills de Antigravity

| Archivo | Contenido | Uso |
|---------|-----------|-----|
| `skills/startup-business-analyst-business-case/SKILL.md` | Section 4: Competitive Matrix, Differentiation, Positioning Map | `assets/competitive-analysis-template.md` |

### Gaps — casi todo el framework debe generarse

| Template/Artefacto | Para skill | Descripción |
|-------------------|-----------|-------------|
| MECE definition + ejemplos | `references/mece-guide.md` | Mutually Exclusive, Collectively Exhaustive — ejemplos y anti-ejemplos |
| Issue Tree / Logic Tree | `assets/issue-tree-template.md` | Estructura jerárquica de descomposición MECE |
| Pyramid Principle / SCQA | `references/pyramid-principle.md` | Situation-Complication-Question-Answer + vertical/horizontal logic |
| Workplan template | `assets/consulting-workplan.md` | Phases, workstreams, análisis, owners, fechas |
| Problem Definition Document | `assets/problem-definition.md` | Problem statement + scope + stakeholders + success criteria |
| Slide deck structure | `references/slide-structure.md` | Executive summary, storyline, appendix |
| Hypothesis-driven approach | `references/hypothesis-driven.md` | Formular hipótesis, diseñar análisis, validar/invalidar |

---

## Framework 5: Business Process Analysis (`bpa:`)

### Cobertura: MEDIA

### Topics disponibles en /tmp

| Archivo | Contenido | Uso en implementación |
|---------|-----------|----------------------|
| `topics/process-mapping/index.md` | 7 pasos de process mapping | `references/process-mapping-guide.md` |
| `topics/workflow-analysis/index.md` | 7 aspectos: Task, Time, Data Flow, Roles, Decisions, Controls | `references/workflow-analysis.md` |
| `topics/swimlanes/index.md` | Swimlanes — usos, herramientas | `references/swimlane-guide.md` |
| `topics/value-stream-mapping/index.md` | VSM — 5 pasos (compartido con lean:) | `references/vsm-guide.md` (compartido) |
| `topics/stakeholder-analysis/index.md` | 5 pasos stakeholder analysis | `references/stakeholder-analysis.md` (compartido) |
| `topics/business-model-canvas/index.md` | BMC — 9 componentes | `references/bmc-guide.md` |
| `topics/voice-of-customer/index.md` | VOC | `references/voc-guide.md` (compartido) |

### Material existente en THYROX (adaptable)

| Archivo THYROX | Acción |
|---------------|--------|
| `.claude/skills/dmaic-define/references/sipoc-guide.md` | Adaptar para BPA (foco en documentar proceso, no proyecto de mejora) |
| `.claude/skills/dmaic-define/references/voc-techniques.md` | Compartir con `bpa:identify` |

### Skills de Antigravity

| Archivo | Uso |
|---------|-----|
| `skills/business-analyst/SKILL.md` | Lista de capacidades BPA (process mining, workflow analysis, automation opportunity) → `references/bpa-capabilities.md` |

### Gaps — deben generarse

| Template/Artefacto | Para skill | Descripción |
|-------------------|-----------|-------------|
| As-Is Process Map template | `bpa:map` | Formato: inicio, fin, actividades, decisiones, roles, tiempos |
| To-Be Process Map template | `bpa:improve` | Proceso rediseñado con mejoras marcadas |
| BPMN Notation guide | `references/bpmn-guide.md` | Eventos (círculos), Tareas (rect.), Gateways (diamantes), Pools/Lanes |
| Gap Analysis template | `bpa:analyze` | As-Is vs To-Be: gap, causa raíz, intervención sugerida |
| Process Inventory template | `bpa:identify` | Lista de procesos candidatos con criterios de priorización |
| Activity Value Analysis | `bpa:analyze` | VA (Value-Added), BVA (Business VA), NVA (Non-Value Added) por actividad |

---

## Recursos transversales — compartibles entre frameworks

| Recurso | Path | Frameworks |
|---------|------|-----------|
| `root-cause-analysis/index.md` | /tmp/references/topics/topics/ | lean, ps8, bpa |
| `five-whys-analysis/index.md` | /tmp/references/topics/topics/ | lean, ps8, bpa |
| `cause-and-effect-diagram/index.md` | /tmp/references/topics/topics/ | lean, ps8, bpa |
| `value-stream-mapping/index.md` | /tmp/references/topics/topics/ | lean, bpa |
| `voice-of-customer/index.md` | /tmp/references/topics/topics/ | lean, sp, bpa |
| `stakeholder-analysis/index.md` | /tmp/references/topics/topics/ | sp, bpa, cp |
| `business-strategy-and-business-tactics/index.md` | /tmp/references/topics/topics/ | sp, cp |
| `ooda-loop-v-dmaic-cycle-v-pdca-spiral/index.md` | /tmp/references/topics/topics/ | lean, ps8 |
| `lean-tools-guide.md` (THYROX) | `.claude/skills/dmaic-improve/references/` | lean — base del skill |
| `root-cause-tools.md` (THYROX) | `.claude/skills/dmaic-analyze/references/` | lean, ps8, bpa |
| `startup-business-analyst-business-case/SKILL.md` | /tmp/references/antigravity-awesome-skills/skills/ | sp, cp |
| `agile-change-smart-okrs/index.md` | /tmp/references/topics/topics/ | sp — 25+ OKRs ejemplos |

---

## Resumen de cobertura y prioridad de implementación

| # | Framework | Namespace | Cobertura | Esfuerzo | Skills estimados |
|---|-----------|-----------|-----------|----------|-----------------|
| 1 | Lean Six Sigma | `lean:` | Alta | Bajo | 4-5 |
| 2 | Strategic Planning | `sp:` | Media-Alta | Medio | 6-8 |
| 3 | Business Process Analysis | `bpa:` | Media | Medio | 6 |
| 4 | Problem Solving 8-step | `ps8:` | Baja | Medio-Alto | 6 |
| 5 | Consulting Process | `cp:` | Baja | Alto | 5-7 |

**Total estimado: 27-32 skills nuevos** (sumados a los 29 existentes = 56-61 methodology skills)

### Criterio de priorización
1. **lean:** — reutiliza `lean-tools-guide.md` de THYROX + material /tmp. Menor esfuerzo neto.
2. **sp:** — topics de /tmp cubren BSC, OKR, SWOT. Antigravity provee business case template.
3. **bpa:** — process-mapping y workflow-analysis en /tmp + SIPOC adaptable de THYROX.
4. **ps8:** — herramientas analíticas disponibles; A3 template y 8 pasos desde conocimiento base.
5. **cp:** — todo el núcleo (MECE, Issue Tree, Pyramid) desde conocimiento base. Mayor esfuerzo.
