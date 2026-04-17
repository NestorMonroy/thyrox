```yml
created_at: 2026-04-17 18:25:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 2.0.0
```

# Deep-Review: "THYROX Meta-Framework: TODOS Los Use Cases"

> **Diferencia vs v1:** Esta versión cubre el error arquitectónico central (coordinators NO
> adaptan las 12 fases THYROX), las estructuras internas de cada coordinator, los mecanismos
> de estado, y los 5 coordinators ausentes con sus fases reales.

---

## Resumen ejecutivo

| Dimensión | v1 Review | v2 Review |
|-----------|-----------|-----------|
| 5 coordinators ausentes | ✅ cubierto | ✅ cubierto + detalle |
| 12 stage names incorrectos | ✅ cubierto | ✅ cubierto |
| Agent naming | ✅ cubierto | ✅ cubierto |
| PDCA vs Lean conflation | ✅ cubierto | ✅ cubierto |
| **PREMISA CENTRAL INCORRECTA** | ❌ NO cubierto | ✅ cubierto aquí |
| **BABOK no-secuencial** | ❌ NO cubierto | ✅ cubierto aquí |
| **Fases reales por coordinator** | ❌ NO cubierto | ✅ cubierto aquí |
| **RM state machine con retornos** | ❌ NO cubierto | ✅ cubierto aquí |
| **RUP milestones LCO/LCA/IOC/PD** | ❌ NO cubierto | ✅ cubierto aquí |
| **SP ciclo estratégico** | ❌ NO cubierto | ✅ cubierto aquí |
| **methodology_step tracking** | ❌ NO cubierto | ✅ cubierto aquí |
| **isolation: worktree** | ❌ NO cubierto | ✅ cubierto aquí |
| **artifact-ready signals** | ❌ NO cubierto | ✅ cubierto aquí |
| **Trigger keyword conflicts BA vs RM** | ⚠️ parcial | ✅ cubierto aquí |
| **Artefactos de 5 coordinators ausentes** | ❌ NO cubierto | ✅ cubierto aquí |

---

## ERROR CRÍTICO #1 — La premisa central del documento es incorrecta

### Lo que dice el documento

```
Clave: Las 12 fases de THYROX son el CORE de coordinación.
Cada coordinator LAS ADAPTA a su metodología específica.
```

Y en cada sección de coordinator:
```
THYROX Phase 1: DISCOVER → BABOK: Stakeholder Analysis
THYROX Phase 2: ANALYSIS → BABOK: Elicitation
THYROX Phase 3: CONSTRAINT → BABOK: Requirements Analysis (continued)
...
THYROX Phase 9: VALIDATE → BABOK: Solution Evaluation
```

### La realidad del framework v2.8.0

**Los coordinators NO adaptan las 12 fases THYROX. Ejecutan SUS PROPIAS fases metodológicas.**

Las 12 fases THYROX son el ciclo del **work package** (WP), no el ciclo del coordinator. Un coordinator se *activa dentro* de un WP, pero corre su propia secuencia independiente.

La relación real es:

```
WP (Work Package) — 12 stages THYROX
  └─ Stage 1: DISCOVER
  └─ Stage 2: BASELINE
  └─ Stage 3: DIAGNOSE
  └─ ...
  └─ Stage N: [Coordinator activo aquí, con sus propias fases]
  └─ Stage 11: TRACK/EVALUATE
  └─ Stage 12: STANDARDIZE
```

El coordinator no "ejecuta los 12 stages". El coordinator ejecuta SU ciclo interno, y cuando termina emite un **artifact-ready signal** que indica que su trabajo está completo. El WP puede continuar al Stage 11.

### Fases reales de cada coordinator (verificadas contra `.claude/agents/`)

| Coordinator | Fases propias | namespace::step |
|-------------|---------------|-----------------|
| `dmaic-coordinator` | **5** (D→M→A→I→C) | `dmaic:define`, `dmaic:measure`, `dmaic:analyze`, `dmaic:improve`, `dmaic:control` |
| `pdca-coordinator` | **4** cíclicas (P→D→C→A→loop) | `pdca:plan`, `pdca:do`, `pdca:check`, `pdca:act` |
| `rup-coordinator` | **4** iterativas + milestones LCO/LCA/IOC/PD | `rup:inception`, `rup:elaboration`, `rup:construction`, `rup:transition` |
| `pmbok-coordinator` | **5** process groups | `pm:initiating`, `pm:planning`, `pm:executing`, `pm:monitoring`, `pm:closing` |
| `rm-coordinator` | **5** con retornos condicionales | `rm:elicitation`, `rm:analysis`, `rm:specification`, `rm:validation`, `rm:management` |
| `babok-coordinator` | **6** knowledge areas, NO secuenciales | `ba:planning`, `ba:elicitation`, `ba:requirements-lifecycle`, `ba:strategy`, `ba:requirements-analysis`, `ba:solution-evaluation` |
| `lean-coordinator` | **5** (D→M→A→I→C Lean) | `lean:define`, `lean:measure`, `lean:analyze`, `lean:improve`, `lean:control` |
| `bpa-coordinator` | **6** (identify→map→analyze→design→implement→monitor) | `bpa:identify`, `bpa:map`, `bpa:analyze`, `bpa:design`, `bpa:implement`, `bpa:monitor` |
| `pps-coordinator` | **6** (clarify→target→analyze→countermeasures→implement→evaluate) | `pps:clarify`, `pps:target`, `pps:analyze`, `pps:countermeasures`, `pps:implement`, `pps:evaluate` |
| `sp-coordinator` | **8** con ciclo estratégico (adjust→analysis loop) | `sp:context`, `sp:analysis`, `sp:gaps`, `sp:formulate`, `sp:plan`, `sp:execute`, `sp:monitor`, `sp:adjust` |
| `cp-coordinator` | **7** (McKinsey/BCG: initiation→diagnosis→structure→recommend→plan→implement→evaluate) | `cp:initiation`, `cp:diagnosis`, `cp:structure`, `cp:recommend`, `cp:plan`, `cp:implement`, `cp:evaluate` |

**Consecuencia directa:** El mapeo que hace el documento (ej: "THYROX Phase 2: ANALYSIS → BABOK: Elicitation, Requirements Analysis") no representa cómo funciona el framework. BABOK no se ejecuta "en Phase 2 de THYROX". Se activa cuando corresponde y recorre sus propias 6 knowledge areas.

---

## ERROR CRÍTICO #2 — BABOK es NO-SECUENCIAL

### Lo que dice el documento

```
THYROX Phase 1: DISCOVER → BABOK: Stakeholder Analysis
THYROX Phase 2: ANALYSIS → BABOK: Elicitation + Requirements Analysis
THYROX Phase 3: CONSTRAINT → BABOK: Requirements Analysis (continued)
...
THYROX Phase 9: VALIDATE → BABOK: Solution Evaluation
```

El documento presenta BABOK como flujo lineal secuencial adaptado a 12 fases.

### La realidad

De la descripción del agent `babok-coordinator.md`:

> "A diferencia de otros coordinators, BABOK es no-secuencial: el coordinator selecciona la
> knowledge area más relevante según el contexto, o presenta las 6 áreas para que el
> usuario elija."

El coordinator funciona así:

```
Inicio
  ↓
Presentar 6 knowledge areas
  ↓
Usuario / coordinator elige área más relevante al contexto
  ↓
Ejecutar esa área
  ↓
Re-evaluar → ¿qué área tiene más valor ahora?
  ↓
[puede ir a cualquier área en cualquier orden]
```

BABOK NO tiene orden fijo. Puede comenzar con `ba:strategy` (si el usuario necesita entender
el negocio primero), o con `ba:elicitation` (si ya hay un proyecto y necesita reunir info),
o con `ba:solution-evaluation` (si evalúa una solución existente).

Estado tracked en `ba-progress.md` — no en un step secuencial sino en estado de cada área.

---

## ERROR #3 — RM no es lineal: tiene state machine con retornos condicionales

### Lo que dice el documento

RM descrito como flujo lineal:
```
Phase 1→5: DISCOVER & ANALYSIS → RM: Requirements Elicitation (50+ stakeholders)
Phase 6: SCOPE & PLAN → RM: Specification detailed
Phase 7-8: DESIGN & EXECUTE → RM: Implementation Traceability
Phase 9: VALIDATE → RM: Validation
Phase 10-12: OPTIMIZE, TRACK, STANDARDIZE → RM: Post-Implementation Governance
```

### La realidad

`rm-coordinator` tiene una **state machine con retornos condicionales**:

```
rm:elicitation
  └─ on_complete → rm:analysis

rm:analysis
  ├─ on_success → rm:specification
  └─ on_gaps_found → rm:elicitation  ← RETORNO (re-elicitar)

rm:specification
  └─ on_complete → rm:validation

rm:validation
  ├─ on_approved → rm:management
  └─ on_corrections_needed → rm:analysis  ← RETORNO (re-analizar)

rm:management
  ├─ on_change_request → rm:analysis  ← RETORNO (gestionar cambio)
  └─ on_stable → [CLOSE]
```

RM no es un flujo secuencial: puede regresar a pasos anteriores cuando hay gaps en
elicitación, cuando la validación falla, o cuando llegan change requests. Esto es
fundamentalmente diferente a lo que el documento describe.

---

## ERROR #4 — RUP sin milestones formales

### Lo que dice el documento

```
THYROX Phase 1: DISCOVER → RUP: Inception
THYROX Phase 4: STRATEGY → RUP: Elaboration (start)
THYROX Phase 7-8: DESIGN & EXECUTE → RUP: Construction
THYROX Phase 10-11: OPTIMIZE & TRACK → RUP: Transition
```

No menciona milestones.

### La realidad

`rup-coordinator` tiene **4 fases con milestones formales** como tollgates:

| Fase | Milestone | Criterio de avance |
|------|-----------|-------------------|
| `rup:inception` | **LCO** (Lifecycle Objectives) | Stakeholders alineados en visión. Riesgos críticos identificados. |
| `rup:elaboration` | **LCA** (Lifecycle Architecture) | Arquitectura estabilizada. Riesgos técnicos principales mitigados. |
| `rup:construction` | **IOC** (Initial Operational Capability) | Beta Release + IOC Report |
| `rup:transition` | **PD** (Product Delivery) | Product Release + Deployment Package |

Los milestones son checkpoints arquitectónicos formales de RUP — sin ellos, el mapping
al documento es incompleto. Además, RUP soporta **múltiples iteraciones por fase** (feature
de ÉPICA 40), que el documento no menciona.

---

## ERROR #5 — SP tiene ciclo estratégico (no es lineal)

### Lo que dice el documento

No menciona SP-coordinator (es uno de los 5 coordinators ausentes).

### La realidad de sp-coordinator

8 fases con posibilidad de ciclo estratégico:

```
sp:context → sp:analysis → sp:gaps → sp:formulate → sp:plan → sp:execute → sp:monitor
                                                                                  ↓
                                                                            sp:adjust
                                                                           ├─ Opción A: CIERRE
                                                                           └─ Opción B: NUEVO CICLO
                                                                              → sp:analysis (loop)
```

`sp:adjust` puede cerrar el engagement O iniciar un nuevo ciclo estratégico regresando a
`sp:analysis`. Este comportamiento cíclico es compartido con PDCA pero con 8 fases y contexto estratégico (PESTEL, SWOT, BSC, OKRs).

---

## ERROR #6 — PPS tiene retorno condicional en evaluate

### Lo que dice el documento

No menciona PPS-coordinator (ausente).

### La realidad de pps-coordinator

6 fases con retorno condicional al final:

```
pps:clarify → pps:target → pps:analyze → pps:countermeasures → pps:implement → pps:evaluate
                                ↑                                                       |
                                └──────── si target NO alcanzado ────────────────────┘
```

En `pps:evaluate`, si los resultados no alcanzan el target: retorno automático a
`pps:analyze` para re-examinar la causa raíz. El A3 Report se actualiza en cada ciclo.

---

## BRECHA #7 — Mecanismos de estado no documentados

El documento no menciona ninguno de estos mecanismos de estado del framework:

### 7.1 methodology_step en now.md

Todos los coordinators actualizan `now.md::methodology_step` con namespace + paso:

```yaml
# Ejemplo durante DMAIC
flow: dmaic
methodology_step: dmaic:analyze

# Ejemplo durante BABOK
flow: ba
methodology_step: ba:requirements-analysis

# Ejemplo durante SP
flow: sp
methodology_step: sp:formulate
```

Este es el mecanismo central de tracking de progreso. Sin él, Claude no sabe en qué
parte de la metodología está en la próxima sesión.

### 7.2 now.md::coordinators para orquestación multi-coordinator

```yaml
coordinators:
  dmaic-coordinator:
    status: active
    started_at: 2026-04-17 10:00:00
    current_step: dmaic:analyze
    artifacts_produced:
      - dmaic-define.md
      - dmaic-measure.md
  babok-coordinator:
    status: completed
    completed_at: 2026-04-17 09:30:00
    artifacts_produced:
      - ba-planning.md
      - ba-requirements-analysis.md
```

El documento menciona "multi-coordinator orchestration" en la sección de Advanced Scenarios,
pero no describe este mecanismo de tracking. Sin él, no hay fuente de verdad para el estado
de múltiples coordinators en paralelo.

### 7.3 artifact-ready signals

Cuando un coordinator completa su trabajo, emite una señal estructurada:

```
[dmaic-coordinator COMPLETED]
Artifacts produced:
  - {wp}/dmaic-define.md
  - {wp}/dmaic-measure.md
  - {wp}/dmaic-analyze.md
  - {wp}/dmaic-improve.md
  - {wp}/dmaic-control.md
Summary: Sigma level baseline [X] → actual [Y]
Ready for: Stage 11 TRACK/EVALUATE
```

Esta señal es el mecanismo que le dice al orchestrator que el coordinator terminó. El
documento no menciona este protocolo.

### 7.4 isolation: worktree

Todos los coordinators corren con `isolation: worktree` — cada uno en una copia aislada
del repositorio. Esto evita conflictos cuando múltiples coordinators editan archivos en
paralelo. El documento no menciona este comportamiento.

---

## BRECHA #8 — Trigger keywords: conflictos BA vs RM

El documento asigna estos triggers a BA-BABOK:

> "Necesito entender requisitos de negocio"
> "Tenemos gaps en elicitation de requisitos"
> "Necesito documentar requisitos de forma estándar"

**Problema:** En `routing-rules.yml`:
- "elicitación" → `rm-coordinator` (no BA)
- "BRD" (Business Requirements Document) → `rm-coordinator`
- "trazabilidad de requisitos" → `rm-coordinator`

El documento presenta BA como coordinador de requisitos primario, pero en el framework
real BA-BABOK y RM-coordinator tienen dominios distintos:

| BA-BABOK | RM-coordinator |
|----------|----------------|
| "análisis de negocio", "business case", "solución de negocio", "necesidad de negocio" | "gestión de requisitos", "elicitación", "trazabilidad", "SRS", "BRD", "change request" |
| Evalúa el negocio y sus necesidades | Gestiona el ciclo de vida de los requisitos |
| Output: Business Need, Change Strategy, Solution Evaluation | Output: RTM, SRS, Traceability, Change Log |

"Necesito documentar requisitos" → RM, no BA.
"Necesito entender necesidades del negocio" → BA.

---

## BRECHA #9 — Artefactos de los 5 coordinators ausentes

El documento no documenta los outputs de lean, bpa, pps, sp, cp:

### lean-coordinator
```
├─ lean-define.md       (Lean Charter + VOC)
├─ lean-measure.md      (Current State VSM)
├─ lean-analyze.md      (Future State VSM + causas raíz)
├─ lean-improve.md      (Mejoras implementadas pre/post)
└─ lean-control.md      (SOPs + visual management)
```
Artefacto transversal: **Value Stream Map (VSM)** que evoluciona entre fases.

### bpa-coordinator
```
├─ bpa-identify.md      (Proceso objetivo + business case)
├─ bpa-map.md           (As-Is BPMN validado)
├─ bpa-analyze.md       (VA/BVA/NVA + causas raíz + GAP)
├─ bpa-design.md        (To-Be BPMN aprobado + mejora cuantificada)
├─ bpa-implement.md     (Proceso rediseñado operando)
└─ bpa-monitor.md       (KPIs + before/after comparison)
```

### pps-coordinator
```
├─ pps-clarify.md          (Problema clarificado + gap cuantificado) → A3 §1-2
├─ pps-target.md           (Target SMART + baseline + fecha)         → A3 §3
├─ pps-analyze.md          (Causa raíz validada con Gemba evidence)  → A3 §4
├─ pps-countermeasures.md  (Plan de acción aprobado)                 → A3 §5
├─ pps-implement.md        (Contramedidas implementadas)              → A3 §6
└─ pps-evaluate.md         (Resultados confirmados)                  → A3 §7-8
```
Artefacto transversal: **A3 Report** (actualizado en cada fase).

### sp-coordinator
```
├─ sp-context.md      (Mandato + stakeholders)
├─ sp-analysis.md     (PESTEL + SWOT + Five Forces)
├─ sp-gaps.md         (Brechas estratégicas cuantificadas)
├─ sp-formulate.md    (Estrategia seleccionada + Strategy Map)
├─ sp-plan.md         (Strategic Plan + BSC + Roadmap)
├─ sp-execute.md      (Iniciativas en ejecución + hitos)
├─ sp-monitor.md      (Revisión estratégica)
└─ sp-adjust.md       (Ajustes → cierre o nuevo ciclo)
```

### cp-coordinator
```
├─ cp-initiation.md    (Engagement Charter)
├─ cp-diagnosis.md     (Issue Tree + datos recopilados)
├─ cp-structure.md     (Key Findings validados)
├─ cp-recommend.md     (Storyline + Storyboard — requiere sponsor checkpoint)
├─ cp-plan.md          (Recommendation Deck + Implementation Roadmap)
├─ cp-implement.md     (Iniciativas en ejecución + quick wins)
└─ cp-evaluate.md      (Impacto medido + knowledge transfer)
```

---

## Clasificación completa

### Errores arquitectónicos fundamentales

| Error | Impacto |
|-------|---------|
| "Coordinators adaptan las 12 fases THYROX" (FALSO) | 🔴 Crítico — premisa incorrecta de todo el documento |
| BABOK descrito como secuencial (es NO-secuencial) | 🔴 Crítico |
| RM descrito como lineal (es state machine con retornos) | 🔴 Crítico |

### Errores de contenido

| Error | Impacto |
|-------|---------|
| 5 coordinators ausentes (lean, bpa, pps, sp, cp) | 🔴 Crítico — 45% del sistema no documentado |
| 7/12 stage names incorrectos | 🟠 Alto |
| RUP sin milestones LCO/LCA/IOC/PD | 🟠 Alto |
| SP sin ciclo estratégico sp:adjust→sp:analysis | 🟠 Alto |
| PPS sin retorno condicional en evaluate | 🟠 Alto |
| Trigger keywords BA vs RM mezclados | 🟠 Alto |
| Agent naming incorrecto (ba-coordinator vs babok-coordinator, etc.) | 🟡 Medio |

### Brechas (ausencia de información)

| Brecha | Impacto |
|--------|---------|
| methodology_step tracking en now.md | 🔴 Crítico — mecanismo de persistencia de estado |
| now.md::coordinators tracking multi-coordinator | 🟠 Alto |
| artifact-ready signals protocolo | 🟠 Alto |
| isolation: worktree por coordinator | 🟡 Medio |
| background: true para coordinators async | 🟡 Medio |
| Artefactos de 5 coordinators ausentes | 🟠 Alto |

---

## Lo que el documento tiene CORRECTO (ratificado)

- Concepto de meta-framework que enruta a coordinators especializados ✅
- PDCA como ciclo iterativo cíclico ✅
- DMAIC para variación estadística / Six Sigma ✅
- RUP para software development iterativo ✅
- PM-PMBOK para gestión de proyecto formal ✅
- Multi-coordinator orchestration es posible ✅
- Use cases UC-1..UC-6: conceptualmente sólidos ✅
- routing-rules.yml como mecanismo de routing (aunque el documento no lo nombra) ✅

---

## Recomendaciones de corrección

Para que el documento sea preciso respecto a v2.8.0:

1. **Corregir premisa central**: "Cada coordinator ejecuta SUS PROPIAS fases metodológicas. Las 12 fases THYROX son el ciclo del WP, no del coordinator."

2. **Reescribir sección BABOK**: Describir como no-secuencial con 6 knowledge areas y routing contextual.

3. **Reescribir sección RM**: Incluir state machine con retornos condicionales.

4. **Completar RUP**: Agregar milestones LCO/LCA/IOC/PD como tollgates formales.

5. **Agregar SP**: 8 fases con ciclo estratégico sp:adjust→sp:analysis.

6. **Agregar 4 secciones faltantes**: lean, bpa, pps, cp con sus fases y artefactos.

7. **Agregar sección "Mecanismos de estado"**: methodology_step, coordinators tracking, artifact-ready signals, isolation:worktree.

8. **Corregir trigger keywords BA vs RM**: Separar claramente los dominios.

9. **Corregir 7/12 stage names** (ver tabla en v1 review).
