```yml
created_at: 2026-04-16 22:12:50
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 10 — IMPLEMENT
author: NestorMonroy
status: Borrador
```

# Plan de mejoras — CSO + Anti-Rationalization + Tier2 + Rename + Mermaid + Fixes

Basado en el análisis de `/tmp/references/antigravity-awesome-skills/` (catálogo community con 500+ skills + guías de authoring profesional). Se aplican mejoras a los 20 skills de metodología nuevos (PM, BA, RM, RUP) + correcciones de consistencia encontradas en la búsqueda.

---

## Cambio 0 — Rename: `ba-baplanning` → `ba-planning`

**Problema:** El nombre `ba-baplanning` duplica el prefijo namespace. El patrón correcto es `{namespace}-{paso}`:
- `pm-planning` ✓, `pm-executing` ✓ → `ba-planning` ✓ (no `ba-baplanning`)

**Archivos afectados:**
| Campo | Antes | Después |
|-------|-------|---------|
| Directorio | `.claude/skills/ba-baplanning/` | `.claude/skills/ba-planning/` |
| `name:` | `ba-baplanning` | `ba-planning` |
| Heading | `# /ba-baplanning` | `# /ba-planning` |
| `methodology_step:` | `ba:baplanning` | `ba:planning` |
| `ba_ka:` | (sin cambio) | `business_analysis_planning` |
| Artifact path | `{wp}/ba-baplanning.md` | `{wp}/ba-planning.md` |
| Referencias en otros skills | Todas las menciones a `ba:baplanning` | `ba:planning` |
| Coordinator `babok-coordinator` | routing a `ba:baplanning` | routing a `ba:planning` |

---

## Cambio A — CSO: Campo `metadata.triggers` en los 20 skills nuevos

**Fuente:** `antigravity-awesome-skills/skills/writing-skills/references/cso/README.md`

**Problema:** Sin `metadata.triggers`, el LLM depende exclusivamente del campo `description` para decidir si cargar el skill. Con 40+ skills activos, la competencia por el slot de "skill relevante" es alta.

**Solución:** Agregar `metadata.triggers` con 3-5 keywords por skill — errores específicos, síntomas, y nombres de herramientas/artefactos que el usuario menciona naturalmente.

**Formato:**
```yaml
---
name: {skill-name}
description: "Use when [trigger]. {namespace}:{step} — [qué hace]."
metadata:
  triggers: {trigger1}, {trigger2}, {trigger3}, {artefacto}, {metodología}
---
```

**Triggers por skill:**

| Skill | Triggers propuestos |
|-------|-------------------|
| `pm-initiating` | Project Charter, stakeholder register, kick-off, Power Interest grid, business case, PMBOK initiating |
| `pm-planning` | WBS, Gantt, CPM, PERT, risk matrix, scope baseline, cost baseline, RACI, Comms Plan, PMBOK planning |
| `pm-executing` | Direct and Manage, quality audit, team performance, conflict resolution, PMBOK executing |
| `pm-monitoring` | EVM, CPI, SPI, earned value, varianza, change request, CCB, PMBOK monitoring |
| `pm-closing` | lecciones aprendidas, final acceptance, archive, contract closure, PMBOK closing |
| `ba-planning` | BA Plan, stakeholder engagement, babok-progress, gobernanza, business analysis planning |
| `ba-elicitation` | entrevista, JAD, workshop, shadowing, cuestionario, elicitar, stakeholder needs, BABOK elicitation |
| `ba-requirements-analysis` | use case, user story, INVEST, MoSCoW, verificación, validación, criterios de aceptación, BABOK requirements |
| `ba-requirements-lifecycle` | RTM, trazabilidad, change request, baseline requisitos, BABOK lifecycle, traceability matrix |
| `ba-strategy` | estado actual, estado futuro, gap analysis, SWOT, Business Need, BABOK strategy |
| `ba-solution-evaluation` | KPI, value realization, ROI, adopción, evaluación post-implementación, BABOK solution evaluation |
| `rm-elicitation` | elicitar requisitos, stakeholder interview, RM elicitation, necesidades stakeholder |
| `rm-analysis` | IEEE 830, calidad requisitos, conflictos, MoSCoW, RM analysis, priorización |
| `rm-specification` | SRS, BRD, user stories, acceptance criteria, Given When Then, baseline, RM specification |
| `rm-validation` | sign-off, Fagan inspection, verificación, validación, aprobación, RM validation |
| `rm-management` | CCB, change request, trazabilidad, baseline, RTM, RM management, control de cambios |
| `rup-inception` | Vision Document, LCO, business case, stakeholder workshops, RUP inception |
| `rup-elaboration` | SAD, Architecture Prototype, LCA, use case model 80%, riesgos arquitectura, RUP elaboration |
| `rup-construction` | iteraciones, IOC, deuda técnica, UAT, incrementos, RUP construction |
| `rup-transition` | deployment, beta, UAT, PD, lecciones aprendidas, defectos, RUP transition |

---

## Cambio B — Anti-Rationalization: Tabla de excusas en Red Flags (skills de disciplina)

**Fuente:** `antigravity-awesome-skills/skills/writing-skills/references/anti-rationalization/README.md`

**Problema:** Los skills de metodología donde el orden importa (PDCA, DMAIC, RUP) tienen riesgo de que el agente "racionalice" saltarse pasos bajo presión. Los Red Flags actuales son listas de síntomas pero no contra-argumentan excusas explícitas.

**Solución:** Agregar tabla de racionalización al final de la sección Red Flags en los 3 skills de disciplina prioritarios.

**Skills afectados (prioridad alta):**

1. **`pdca-plan`** — riesgo de saltar análisis 5W2H y pasar directo a Do
2. **`dmaic-define`** — riesgo de saltar VOC/VOB y asumir que el problema ya está definido
3. **`rup-elaboration`** — riesgo de declarar LCA sin Architecture Prototype ejecutable

**Tabla tipo a agregar:**
```markdown
### Tabla de racionalización — excusas comunes y por qué no aplican

| Excusa | Realidad |
|--------|---------|
| "Ya sé cuál es el problema, no necesito análisis" | Sin 5W2H/VOC documentado, el equipo trabaja con supuestos no validados |
| "El estado futuro está claro, puedo saltarme el análisis del actual" | El gap analysis requiere medir el estado actual — sin baseline, no hay gap |
| "El Architecture Prototype es un spike de 2 horas" | Un spike no ejecuta el escenario de mayor riesgo bajo carga — el prototype sí |
```

**Skills de prioridad media** (agregar en iteración futura si es necesario):
- `rm-validation` — riesgo de skip de Fagan inspection cuando el tiempo escasea
- `ba-strategy` — riesgo de presentar una sola opción sin análisis real de alternativas

---

## Cambio C — Token Efficiency: Candidatos Tier 2 (references/)

**Fuente:** `antigravity-awesome-skills/skills/writing-skills/references/standards/README.md`

**Umbral:** Skills > 300 líneas son candidatos a Tier 2 (SKILL.md como índice + `references/` para contenido).

**Líneas actuales de los skills nuevos:**

| Skill | Líneas | Estado |
|-------|--------|--------|
| `pm-planning` | 323 | ⚠️ Candidato Tier 2 |
| `pm-monitoring` | 311 | ⚠️ Candidato Tier 2 |
| `pm-closing` | 285 | Borderline — monitor |
| `rup-elaboration` | 266 | Borderline — monitor |
| `pm-initiating` | 265 | Borderline — monitor |
| `pm-executing` | 253 | OK por ahora |
| `ba-requirements-analysis` | 253 | OK por ahora |
| `rup-construction` | 251 | OK por ahora |
| `rup-inception` | 250 | OK por ahora |
| `rup-transition` | 248 | OK por ahora |
| `ba-baplanning` | 244 | OK por ahora |
| `ba-strategy` | 243 | OK por ahora |
| `rm-management` | 242 | OK por ahora |
| `ba-requirements-lifecycle` | 242 | OK por ahora |
| `ba-solution-evaluation` | 238 | OK por ahora |

**Decisión para esta iteración:** Aplicar Tier 2 solo a `pm-planning` y `pm-monitoring` — los dos únicos que superan 300 líneas.

**Estructura Tier 2 para pm-planning:**
```
.claude/skills/pm-planning/
  SKILL.md                          ← índice + pre-condición + routing + estado now.md (~120 líneas)
  references/
    knowledge-areas.md              ← Las 10 KAs con tablas detalladas
    wbs-cpm-pert.md                 ← WBS 8/80 rule + CPM + PERT fórmulas
    risk-matrix.md                  ← Matriz P×I + registro de riesgos
    raci-comms.md                   ← RACI + Comms Plan
```

**Estructura Tier 2 para pm-monitoring:**
```
.claude/skills/pm-monitoring/
  SKILL.md                          ← índice + EVM resumen + routing + estado now.md (~120 líneas)
  references/
    evm-metrics.md                  ← 10 métricas EVM con fórmulas y umbrales
    change-control.md               ← Integrated Change Control + CCB template
    quality-risk-control.md         ← QC técnicas + Monitor Risks
```

---

## Cambio D — Naming alineado (seguimiento)

El cambio D de la referencia es "naming alineado con el nuestro" — confirmación de que nuestro patrón `{namespace}-{paso}` ya es correcto. No requiere cambios adicionales más allá del Cambio 0 (rename `ba-baplanning`).

**Verificación del patrón actual:**
| Namespace | Skills | Estado naming |
|-----------|--------|--------------|
| `pm-` | pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing | ✓ Correcto |
| `ba-` | ba-planning (post-rename), ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-strategy, ba-solution-evaluation | ✓ Correcto post-rename |
| `rm-` | rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management | ✓ Correcto |
| `rup-` | rup-inception, rup-elaboration, rup-construction, rup-transition | ✓ Correcto |

---

---

## Cambio E — Mermaid diagrams en skills que lo necesitan

**Problema:** Los flujos de decisión, ciclos y relaciones entre KAs/fases se describen en texto o tablas, pero son más claros como diagramas. Los skills de disciplina y los de flujo no-lineal son los principales candidatos.

**Skills candidatos y tipo de diagrama:**

| Skill | Diagrama propuesto | Valor |
|-------|-------------------|-------|
| `ba-baplanning` (→ `ba-planning`) | `flowchart LR` — navegación no-secuencial entre las 6 KAs | Muestra que BABOK no es lineal |
| `ba-requirements-lifecycle` | `stateDiagram-v2` — ciclo de vida de estados de un requisito (Identificado → Analizado → Aprobado → ... → Validado) | Visualiza las transiciones |
| `rm-management` | `flowchart TD` — proceso de Change Request a través del CCB | Clarifica el flujo de aprobación |
| `rup-elaboration` | `flowchart TD` — decisión LCA alcanzado/nueva iteración | Gate de milestone visual |
| `rup-construction` | `flowchart TD` — ciclo de iteración Construction (plan → implementar → testear → retro → ¿IOC?) | Ciclo iterativo visual |
| `pm-monitoring` | `flowchart TD` — rama de acción según SPI/CPI (normal / alerta / crítico) | Umbrales de varianza como árbol de decisión |
| `pdca-plan` | `flowchart LR` — el ciclo PDCA completo con el paso actual destacado | Orientación en el ciclo |
| `dmaic-define` | `flowchart LR` — el ciclo DMAIC completo con el paso actual destacado | Orientación en el ciclo |

**Formato estándar para el bloque mermaid en cada skill:**

```markdown
## Flujo visual

\`\`\`mermaid
flowchart LR
    A([PASO]) --> B([PASO]) --> C([PASO])
    style A fill:#f9f,stroke:#333
\`\`\`
```

**Criterio de inclusión:** Solo agregar diagrama si reduce texto explicativo o si el flujo tiene ≥ 3 nodos de decisión. No agregar "por decoración".

---

## Cambio F — Correcciones de consistencia `pmbok:*` → `pm:*` y `babok:*` → `ba:*`

### Hallazgo

La búsqueda reveló una **inconsistencia de namespace** entre los skills y los coordinators/registry:

| Componente | Namespace actual | Namespace correcto |
|-----------|-----------------|-------------------|
| Skills `pm-*` (frontmatter) | `flow: pm`, `methodology_step: pm:initiating` | ✓ Ya correcto |
| Registry `pmbok.yml` | `id: pmbok`, steps `pmbok:initiating` etc. | ❌ Debe ser `pm:*` |
| Agent `pmbok-coordinator.md` | `pmbok:initiating`, references `pmbok.yml` | ❌ Debe ser `pm:*` |
| Skills `ba-*` (frontmatter) | `flow: ba`, `methodology_step: ba:strategy` | ✓ Ya correcto |
| Registry `babok.yml` | `id: babok`, areas `babok:baplanning` etc. | ❌ Debe ser `ba:*` |
| Agent `babok-coordinator.md` | `babok:baplanning`, `flow: babok` | ❌ Debe ser `ba:*` |

### Archivos a corregir

**`.thyrox/registry/methodologies/pmbok.yml`** — actualizar todos los `pmbok:*` step IDs:
```yaml
# Antes           → Después
id: pmbok          → id: pm
pmbok:initiating   → pm:initiating
pmbok:planning     → pm:planning
pmbok:executing    → pm:executing
pmbok:monitoring   → pm:monitoring
pmbok:closing      → pm:closing
```

**`.thyrox/registry/methodologies/babok.yml`** — actualizar todos los `babok:*` area IDs:
```yaml
# Antes                      → Después
id: babok                    → id: ba
babok:baplanning             → ba:planning
babok:elicitation            → ba:elicitation
babok:requirements_lifecycle → ba:requirements_lifecycle
babok:strategy               → ba:strategy
babok:requirements_analysis  → ba:requirements_analysis
babok:solution_evaluation    → ba:solution_evaluation
```

**`.claude/agents/pmbok-coordinator.md`** — actualizar referencias internas:
- Todos los `pmbok:*` → `pm:*`
- `flow: pmbok` → `flow: pm`
- Referencia a `pmbok.yml` permanece (nombre del archivo de registry no necesita cambiar)

**`.claude/agents/babok-coordinator.md`** — actualizar referencias internas:
- Todos los `babok:*` → `ba:*`
- `babok:baplanning` → `ba:planning`
- `flow: babok` → `flow: ba`
- `babok-progress.md` → `ba-progress.md`
- Referencia a `babok.yml` permanece

### Cambio F.1 — `babok-progress.md` → `ba-progress.md`

**Hallazgo:** Solo `ba-baplanning/SKILL.md` (9 ocurrencias) y `babok-coordinator.md` (1 ocurrencia) referencian `babok-progress.md`. Ningún otro skill lo menciona.

| Archivo | Ocurrencias | Acción |
|---------|------------|--------|
| `ba-baplanning/SKILL.md` (→ `ba-planning`) | 9 | Renombrar todas a `ba-progress.md` como parte del Cambio 0 |
| `babok-coordinator.md` | 1 | Renombrar a `ba-progress.md` como parte del Cambio F |

**Nota:** El archivo físico `{wp}/babok-progress.md` no existe todavía (se crea al ejecutar el skill). El cambio es solo en las instrucciones.

---

## Secuencia de implementación

| Orden | Cambio | Razón |
|-------|--------|-------|
| 1 | **Cambio 0** — Rename ba-baplanning → ba-planning | Prerequisito: afecta references en skills B y C |
| 2 | **Cambio A** — `metadata.triggers` en 20 skills | Cambio más amplio pero atómico por skill |
| 3 | **Cambio B** — Anti-rationalization tables en pdca-plan, dmaic-define, rup-elaboration | 3 archivos, cambio localizado |
| 4 | **Cambio C** — Tier 2 refactor de pm-planning y pm-monitoring | Mayor impacto estructural — hacer al final |

---

## Commit strategy

```
refactor(multi-methodology): rename ba-baplanning to ba-planning
feat(multi-methodology): add metadata.triggers to 20 methodology skills — CSO improvement
fix(multi-methodology): add anti-rationalization tables to pdca-plan, dmaic-define, rup-elaboration
refactor(pm-planning): extract references/ — Tier 2 architecture for token efficiency
refactor(pm-monitoring): extract references/ — Tier 2 architecture for token efficiency
```

---

## Impacto esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| Auto-invocación rate (estimado) | ~56% (sin triggers) | ~75%+ (con metadata.triggers) |
| Token consumption pm-planning | 323 líneas en RAM siempre | ~120 líneas + referencias on-demand |
| Token consumption pm-monitoring | 311 líneas en RAM siempre | ~120 líneas + referencias on-demand |
| Naming consistency BA namespace | ba-baplanning (redundante) | ba-planning (correcto) |
| Discipline compliance (PDCA/DMAIC/RUP) | Red Flags como síntomas | Red Flags + tabla de racionalización |
