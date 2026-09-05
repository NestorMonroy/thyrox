```yml
created_at: 2026-04-17 03:08:36
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Investigación: Frameworks pendientes de implementación como methodology skills

**Propósito:** Documentar flujos, artefactos y características de los 5 frameworks del landscape V3.1
pendientes de implementación como methodology skills en THYROX.

**Fuente:** Web research — abril 2026
**Frameworks investigados:** Lean Six Sigma · Problem Solving 8-step (Toyota) · Strategic Planning · Consulting Process · Business Process Analysis

---

## 1. Lean Six Sigma

### Descripción

Combina dos enfoques complementarios:
- **Lean:** eliminar desperdicios y tiempos muertos (velocidad y eficiencia)
- **Six Sigma / DMAIC:** reducir variabilidad y defectos (precisión y calidad)

Usa la estructura DMAIC de Six Sigma pero integra herramientas Lean en cada fase. No es un framework nuevo — es DMAIC con un conjunto de herramientas adicional. La diferencia con DMAIC puro es que Lean Six Sigma también mapea y elimina desperdicios del flujo de valor.

### Fases y artefactos

| Fase | Qué hace | Herramientas Lean añadidas | Artefactos |
|------|----------|---------------------------|------------|
| **Define** | Definir problema, stakeholders, alcance | Value Stream Mapping (inicial) | Project Charter, SIPOC, Problem Statement, Goal Statement, VoC, Process Flowchart |
| **Measure** | Medir estado actual + mapear flujo de valor | VSM As-Is, identificación de desperdicios (TIMWOOD) | Data Collection Plan, MSA (Measurement System Analysis), Baseline, VSM As-Is |
| **Analyze** | Causas raíz + fuentes de desperdicio y variación | 5S audit, Kaizen event plan | Root Cause Analysis, Fishbone / Ishikawa, 5 Whys, Pareto Chart, ANOVA, VSM con puntos de desperdicio marcados |
| **Improve** | Soluciones Lean (eliminar desperdicios) + Six Sigma (reducir variación) | VSM To-Be, Kanban, 5S, Kaizen | FMEA, Design of Experiments (DOE), Pilot Plan, VSM To-Be, Implementation Plan |
| **Control** | Sostener mejoras + prevenir retroceso | SPC, Poka-yoke, 5S audit continuo | Control Plan, Control Charts (SPC), Standard Work / SOP, Response Plan, Dashboard |

### Herramientas Lean exclusivas (no en DMAIC puro)

| Herramienta | Propósito |
|-------------|-----------|
| Value Stream Mapping (VSM) | Visualizar flujo completo y puntos de desperdicio |
| 5S (Sort, Set, Shine, Standardize, Sustain) | Organización del espacio de trabajo |
| Kanban | Gestión visual del flujo de trabajo |
| Kaizen events | Mejoras intensivas en tiempo corto |
| TIMWOOD (7 desperdicios: Transport, Inventory, Motion, Waiting, Overproduction, Overprocessing, Defects) | Identificar y eliminar desperdicios |
| Poka-yoke | Mistake proofing — hacer errores imposibles |

### Relación con DMAIC y con THYROX

- Lean Six Sigma NO es un framework separado de DMAIC — es DMAIC con herramientas Lean integradas
- DMAIC ya está implementado como `dmaic:` en THYROX
- La implementación de `lean:` debería ser un **complemento** o **extensión** de `dmaic:`, no un skill paralelo que replica toda la estructura
- Opción A: Skills `lean-*` que agregan capas Lean sobre `dmaic:` stages (lean-vsm-define, lean-vsm-measure, etc.)
- Opción B: Un skill transversal `lean-toolkit` que se activa junto con `dmaic:` para agregar las herramientas Lean

### Anclaje THYROX sugerido

| Stage THYROX | Skill Lean Six Sigma propuesto | Qué agrega sobre DMAIC |
|---|---|---|
| Stage 2 BASELINE | lean-vsm-baseline | VSM As-Is + identificación TIMWOOD |
| Stage 3 DIAGNOSE | lean-vsm-analyze | VSM con desperdicios marcados + Kaizen planning |
| Stage 10 IMPLEMENT | lean-vsm-improve | VSM To-Be + implementación 5S + Kanban |
| Stage 11 TRACK | lean-control | SPC + 5S audit + Poka-yoke validation |

---

## 2. Problem Solving 8-step (Toyota TBP)

### Descripción

Toyota Business Practice (TBP) — la expansión de PDCA de 4 a 8 pasos. Desarrollado por Taiichi Ohno para el Toyota Production System. Es el marco de resolución de problemas más riguroso de manufactura y operaciones.

La estructura interna mapea a PDCA:
- **Plan:** Pasos 1-5 (clarificar → descomponer → target → causa raíz → contramedidas)
- **Do:** Paso 6 (implementar)
- **Check:** Paso 7 (evaluar)
- **Act:** Paso 8 (estandarizar + nuevo target)

### Los 8 pasos

| Paso | Nombre | Qué hace | Herramientas |
|------|--------|----------|-------------|
| 1 | **Clarify the Problem** | Describir la situación actual vs estándar esperado. Identificar la brecha. | Gemba walk, observación directa, comparación actual vs estándar |
| 2 | **Break Down the Problem** | Descomponer el problema grande en subproblemas específicos y ubicarlos en el proceso | Process map, análisis por punto de ocurrencia |
| 3 | **Set Target** | Definir objetivo concreto y medible con fecha | Target statement: "Reducir X de Y a Z para fecha" |
| 4 | **Analyze Root Cause** | Identificar causa fundamental usando 5 Whys | 5 Whys, Fishbone (Ishikawa), diagrama de causa-efecto |
| 5 | **Develop Countermeasures** | Crear plan de contramedidas para eliminar causa raíz | Countermeasure plan, prioritization matrix |
| 6 | **Implement Countermeasures** | Ejecutar contramedidas como equipo | Gantt, tablero de seguimiento |
| 7 | **Evaluate Results & Process** | Comparar resultados vs target. Evaluar si la contramedida fue efectiva | Gráficas de resultados, comparación antes/después |
| 8 | **Standardize & Share** | Documentar proceso mejorado + propagar aprendizajes + definir nuevo target | SOP actualizado, lecciones aprendidas, nuevo target |

### Artefacto principal: A3 Report

El A3 Report (papel A3 = 11"×17") es el artefacto central y único del TBP. Es simultáneamente herramienta de pensamiento, documento de comunicación y registro histórico.

**Estructura del A3:**

```
┌─────────────────────────────┬─────────────────────────────┐
│  LADO IZQUIERDO             │  LADO DERECHO               │
│  (Problema / Situación)     │  (Solución / Seguimiento)   │
│                             │                             │
│  1. Background              │  5. Countermeasures         │
│  2. Current State           │  6. Implementation Plan     │
│  3. Problem Statement       │  7. Results / Verification  │
│  4. Root Cause Analysis     │  8. Follow-up / Reflection  │
│     (5 Whys + Fishbone)     │                             │
│  Target State               │                             │
└─────────────────────────────┴─────────────────────────────┘
```

El A3 es tanto el artefacto de análisis como el de comunicación con stakeholders — toda la historia del problema cabe en una sola página.

### Relación con PDCA y con THYROX

- TBP es una especialización de PDCA con énfasis en manufactura/operaciones
- PDCA ya implementado como `pdca:` en THYROX
- La diferencia clave: PDCA es genérico, TBP/8-step es específico para resolución de problemas con causa raíz conocida o por descubrir
- El A3 es el artefacto diferenciador que PDCA no tiene
- Namespace sugerido: `ps8:` (Problem Solving 8-step)

### Anclaje THYROX sugerido

| Stage THYROX | Skill ps8 propuesto | Pasos TBP |
|---|---|---|
| Stage 1 DISCOVER | ps8-clarify | Pasos 1-2 (Clarify + Break Down) |
| Stage 2 BASELINE | ps8-target | Paso 3 (Set Target) |
| Stage 3 DIAGNOSE | ps8-analyze | Paso 4 (Analyze Root Cause) |
| Stage 6 SCOPE | ps8-countermeasures | Paso 5 (Develop Countermeasures) |
| Stage 10 IMPLEMENT | ps8-implement | Paso 6 (Implement) |
| Stage 11 TRACK | ps8-evaluate | Pasos 7-8 (Evaluate + Standardize) |

---

## 3. Strategic Planning

### Descripción

Proceso estructurado mediante el cual una organización define su estrategia de largo plazo (típicamente 3-5 años) y crea un plan de acción alineado con su misión y visión. Es periódico y estructurado — a diferencia de Strategic Management (continuo y adaptativo).

### Fases y artefactos

| Fase | Qué hace | Herramientas | Artefactos |
|------|----------|-------------|-----------|
| **1. Clarify Mission/Vision/Values** | Definir propósito organizacional, estado futuro deseado, principios rectores | Workshops, entrevistas a stakeholders | Mission Statement, Vision Statement, Values Statement |
| **2. Environmental Analysis** | Analizar factores internos y externos que impactan la estrategia | SWOT, PESTEL, Competitor Analysis, Scenario Planning | SWOT Analysis, PESTEL Analysis, Competitor Analysis, Market Analysis |
| **3. Goal & Objective Setting** | Definir metas medibles alineadas con la visión | OKR framework, Balanced Scorecard | Strategic Goals, OKRs (Objectives + Key Results), KPIs |
| **4. Strategy Formulation** | Diseñar iniciativas y prioridades para alcanzar los objetivos | Strategy Map, Portfolio Planning, Prioritization Matrix | Strategy Map, Strategic Initiatives List, Priority Matrix |
| **5. Implementation Planning** | Traducir estrategia en acciones concretas con responsables y fechas | Gantt, roadmap, Balanced Scorecard | Strategic Plan Document, Implementation Roadmap, Resource Plan |
| **6. Monitor & Adjust** | Revisar KPIs periódicamente y ajustar estrategia según feedback | BSC dashboards, OKR reviews | Performance Dashboard, Review Reports, Updated Strategic Plan |

### Herramientas clave

| Herramienta | Descripción |
|-------------|-------------|
| **Strategy Map** | Visualización de causa-efecto entre objetivos estratégicos. Vincula perspectivas: financiera, cliente, procesos internos, aprendizaje/crecimiento |
| **Balanced Scorecard (BSC)** | Sistema de gestión que traduce estrategia en objetivos medibles en 4 perspectivas. Cada objetivo tiene al menos 1 KPI |
| **OKR (Objectives and Key Results)** | Objetivos ambiciosos cualitativos + 2-4 resultados clave cuantitativos. Ciclo típico: trimestral |
| **SWOT** | Strengths, Weaknesses, Opportunities, Threats — análisis interno/externo |
| **PESTEL** | Political, Economic, Social, Technological, Environmental, Legal — análisis del macroentorno |
| **V2MOM** | Vision, Values, Methods, Obstacles, Measures — alternativa a OKR (Salesforce) |
| **Hoshin Kanri** | Policy deployment japonés — cascada de objetivos de empresa a equipos |

### Artefactos por fase (resumen)

```
Mission/Vision Statement
SWOT Analysis
PESTEL Analysis  
Competitor Analysis
Strategic Goals
OKRs (Objectives + Key Results)
Strategy Map
Balanced Scorecard
Strategic Initiatives Portfolio
Strategic Plan Document (3-5 años)
Implementation Roadmap
KPI Dashboard
Quarterly Review Reports
```

### Anclaje THYROX sugerido

| Stage THYROX | Skill sp propuesto | Fase Strategic Planning |
|---|---|---|
| Stage 1 DISCOVER | sp-context | Clarify Mission/Vision/Values |
| Stage 2 BASELINE | sp-analysis | Environmental Analysis (SWOT, PESTEL) |
| Stage 3 DIAGNOSE | sp-gaps | Gap Analysis: estado actual vs visión |
| Stage 5 STRATEGY | sp-formulate | Strategy Formulation + Strategy Map |
| Stage 6 SCOPE | sp-plan | Implementation Planning + OKRs |
| Stage 10 IMPLEMENT | sp-execute | Execute strategic initiatives |
| Stage 11 TRACK | sp-monitor | Monitor KPIs + BSC review |
| Stage 12 STANDARDIZE | sp-adjust | Annual strategic plan update |

---

## 4. Consulting Process

### Descripción

Marco de trabajo profesional para proyectos de consultoría. Existen dos niveles:

1. **Proceso general de consultoría** (5 fases) — estructura de un engagement completo
2. **Proceso de resolución de problemas McKinsey/MBB** (7-8 pasos) — metodología de pensamiento analítico

Ambos son complementarios: el proceso general define la estructura del proyecto, el proceso de resolución de problemas define cómo se analiza dentro de él.

### Proceso general de consultoría (5 fases)

| Fase | Qué hace | Artefactos |
|------|----------|-----------|
| **1. Initiation / Entry** | Contacto inicial, diagnóstico preliminar, propuesta comercial, contrato | Problem Definition Document, Proposal / SOW (Statement of Work), Contract |
| **2. Diagnosis** | Definir y medir el problema en profundidad, investigar, recopilar datos | Interview notes, Data analysis, Stakeholder map, Current state assessment |
| **3. Action Planning** | Desarrollar soluciones y alternativas, seleccionar la mejor, crear plan de implementación | Issue Tree, Hypothesis Tree, Options Analysis, Recommendation document, Implementation Plan |
| **4. Implementation** | Ejecutar plan con equipo cliente, capacitar, gestionar cambio | Project Tracker, Training materials, Change management plan, Progress reports |
| **5. Evaluation / Closure** | Evaluar resultados vs objetivos, entregar informe final, plan de seguimiento | Final Report, Lessons Learned, Follow-up Plan, KPI measurement |

### Metodología analítica McKinsey (7-8 pasos)

| Paso | Nombre | Qué hace | Herramientas |
|------|--------|----------|-------------|
| 1 | **Define the Problem** | Enmarcar el problema con precisión | Problem statement, Initial hypothesis |
| 2 | **Structure the Problem** | Descomponer en subproblemas usando MECE | Issue Tree, Logic Tree (MECE: Mutually Exclusive, Collectively Exhaustive) |
| 3 | **Prioritize Issues** | Identificar qué subproblemas importan más | Prioritization matrix, 80/20 analysis |
| 4 | **Build Analysis Plan** | Definir análisis necesarios y workplan | Workplan / Analysis plan, data needs |
| 5 | **Conduct Analysis** | Recopilar datos y analizar (hypothesis-driven) | Excel models, databases, interviews, benchmarks |
| 6 | **Synthesize Findings** | Integrar análisis en insights coherentes | Synthesis framework, "So what?" test |
| 7 | **Develop Recommendations** | Traducir insights en acciones concretas | Recommendation document, business case |
| 8 | **Communicate Results** | Presentar con estructura piramidal (SCQA) | Slide deck (pyramid structure), Executive summary |

### Artefactos clave

```
Statement of Work (SOW) / Proposal
Problem Definition Document
Issue Tree / Logic Tree (MECE)
Workplan / Project Plan
Data Analysis (Excel models, databases)
Hypothesis Document
Synthesis Framework
Recommendation Document
Slide Deck / PowerPoint (pyramid: Situation → Complication → Question → Answer)
Final Report
Implementation Plan
```

### Concepto MECE (fundamental en consultoría)

> Mutually Exclusive, Collectively Exhaustive — los subproblemas del Issue Tree no se solapan (ME) y cubren todo el problema (CE). Es la base del pensamiento estructurado en McKinsey, BCG y Bain.

### Anclaje THYROX sugerido

| Stage THYROX | Skill consulting propuesto | Fase Consulting |
|---|---|---|
| Stage 1 DISCOVER | cp-initiation | Initiation: diagnóstico preliminar, SOW |
| Stage 2 BASELINE | cp-diagnosis | Diagnosis: recopilación de datos |
| Stage 3 DIAGNOSE | cp-structure | Structure problem: Issue Tree, MECE |
| Stage 5 STRATEGY | cp-recommend | Develop Recommendations |
| Stage 6 SCOPE | cp-plan | Implementation Planning |
| Stage 10 IMPLEMENT | cp-implement | Implementation + Change Management |
| Stage 11 TRACK | cp-evaluate | Evaluation + Final Report |

---

## 5. Business Process Analysis (BPA)

### Descripción

Método sistemático para examinar, mapear y mejorar procesos de negocio existentes. Se diferencia de Business Analysis (BA, ya implementado como `ba:`) en que:

- **BA** → Analiza REQUISITOS para construir soluciones nuevas
- **BPA** → Analiza PROCESOS EXISTENTES para mejorarlos o rediseñarlos

BPA produce dos modelos: **As-Is** (estado actual del proceso) y **To-Be** (estado futuro optimizado). Guiado por las filosofías Six Sigma y Lean Six Sigma para cuantificar ineficiencias.

### Fases y artefactos

| Fase | Qué hace | Herramientas | Artefactos |
|------|----------|-------------|-----------|
| **1. Identify** | Seleccionar proceso a analizar, definir alcance y KPIs de éxito | Process inventory, stakeholder interviews | Process Selection Document, KPIs / Success Metrics, Scope Statement |
| **2. Map (As-Is)** | Documentar el proceso actual tal como funciona | Process Map, Swimlane Diagram, BPMN | As-Is Process Map, Swimlane Diagram, BPMN Diagram, Process Documentation |
| **3. Analyze** | Identificar ineficiencias, bottlenecks, redundancias, pasos sin valor | Value analysis, bottleneck analysis, waste identification | Gap Analysis, Bottleneck Analysis, Value-Added vs Non-Value-Added analysis, Root Cause Analysis |
| **4. Improve / Design (To-Be)** | Crear versión mejorada del proceso | Redesign workshops, brainstorming | To-Be Process Map, Redesign Document, Business Case for change |
| **5. Implement** | Ejecutar cambios en el proceso con gestión del cambio | Project plan, training | Implementation Plan, Training Materials, Change Management Plan |
| **6. Monitor** | Medir performance del proceso mejorado contra KPIs definidos | KPI dashboards, SPC | Monitoring Report, KPI Dashboard, Continuous Improvement Log |

### Artefactos detallados

**As-Is Process Map** — representación visual del proceso actual:
- Pasos del proceso en secuencia
- Actores / roles responsables de cada paso
- Puntos de decisión (gateways)
- Entradas y salidas de cada paso
- Tiempos y volúmenes (si disponibles)

**Swimlane Diagram** — variante del process map con carriles por actor:
```
Rol A:  [Paso 1] ──────────────────────► [Paso 4]
Rol B:                  [Paso 2] ─► [Paso 3]
Sistema:                        [Paso 3a: automatizado]
```

**BPMN (Business Process Model and Notation)** — notación estándar formal:
- 4 elementos: Flows (secuencias), Connections (mensajes/asociaciones), Swimlanes (pools/lanes), Artifacts (datos/anotaciones)
- Eventos: círculos · Actividades: rectángulos · Gateways: diamantes

**Gap Analysis:**
- ¿Qué hace el proceso hoy? vs ¿Qué debería hacer?
- Identifica brechas de eficiencia, calidad, cobertura

**To-Be Process Map** — proceso rediseñado con:
- Pasos eliminados (sin valor)
- Pasos automatizados
- Flujos optimizados
- KPIs de mejora esperados

### Anclaje THYROX sugerido

| Stage THYROX | Skill bpa propuesto | Fase BPA |
|---|---|---|
| Stage 1 DISCOVER | bpa-identify | Identify: selección de proceso + KPIs |
| Stage 2 BASELINE | bpa-map-asis | Map As-Is: proceso actual documentado |
| Stage 3 DIAGNOSE | bpa-analyze | Analyze: bottlenecks, gaps, waste |
| Stage 5 STRATEGY | bpa-design | Design To-Be: proceso rediseñado |
| Stage 10 IMPLEMENT | bpa-implement | Implement: cambios en proceso |
| Stage 11 TRACK | bpa-monitor | Monitor: KPIs del proceso mejorado |

---

## Resumen comparativo: 5 frameworks

| Framework | Namespace propuesto | Skills estimados | Stages de anclaje | Complejidad de implementación |
|-----------|--------------------|-----------------|--------------------|------------------------------|
| Lean Six Sigma | `lean:` (extensión de `dmaic:`) | 4-5 | 2, 3, 10, 11 | Media — reutiliza estructura DMAIC |
| Problem Solving 8-step | `ps8:` | 6 | 1, 2, 3, 6, 10, 11 | Baja — A3 como artefacto único |
| Strategic Planning | `sp:` | 6-8 | 1, 2, 3, 5, 6, 10, 11, 12 | Alta — múltiples herramientas (BSC, OKR, Strategy Map) |
| Consulting Process | `cp:` | 5-7 | 1, 2, 3, 5, 6, 10, 11 | Alta — MECE + pyramid structure requieren templates específicos |
| Business Process Analysis | `bpa:` | 6 | 1, 2, 3, 5, 10, 11 | Media — As-Is/To-Be + BPMN como artefactos clave |

---

## Observaciones para implementación futura

### Lean Six Sigma
- No requiere 5 skills separados — mejor como extensión/complemento de `dmaic:`
- El artefacto diferenciador es VSM (Value Stream Map) — requiere template dedicado
- Lean tools (5S, Kanban, Kaizen) pueden documentarse en references/ sin crear skills por cada herramienta

### Problem Solving 8-step (ps8:)
- El A3 Report es el artefacto central — necesita template A3 en assets/
- 6 skills mapeados a pasos PDCA expandidos (1-2 → discover, 3 → baseline, 4 → diagnose, 5 → scope, 6 → implement, 7-8 → track)
- Menor complejidad que Strategic Planning — buena opción para siguiente implementación

### Strategic Planning
- Alta complejidad por variedad de herramientas (BSC, OKR, Strategy Map)
- Requiere templates: Strategy Map, Balanced Scorecard, OKR document
- El Balanced Scorecard puede funcionar como artefacto maestro del WP de strategic planning

### Consulting Process
- MECE y Issue Tree son conceptos que requieren referencias dedicadas
- La estructura de comunicación (Pyramid / SCQA) es un artefacto de entrega (slide deck)
- Puede implementarse como `cp:` (Consulting Process) en lugar de reutilizar namespace `pm:`

### Business Process Analysis
- Diferenciado claramente de `ba:` (Business Analysis ya implementado)
- BPMN puede referenciarse desde un estándar externo (OMG BPMN 2.0) sin replicarlo
- As-Is y To-Be process maps son templates relativamente simples

---

## Fuentes consultadas

- [Lean Six Sigma — DMAIC 5 phases | GoLeanSixSigma](https://goleansixsigma.com/dmaic-five-basic-phases-of-lean-six-sigma/)
- [Lean Six Sigma — What Is It? | Built In](https://builtin.com/articles/lean-six-sigma)
- [DMAIC Tools por fase | Sprintzeal](https://www.sprintzeal.com/blog/dmaic-tools)
- [Six Sigma Tools | ASQ](https://asq.org/quality-resources/sixsigma/tools)
- [Toyota 8-step A3 methodology | BeltCourse](https://www.beltcourse.com/blog/learn-toyota-s-8-step-practical-problem-solving-methodology)
- [Toyota TBP | Gemba Academy](https://blog.gembaacademy.com/2009/02/22/tbp_toyota_business_practice/)
- [A3 Problem Solving | Lean Enterprise Institute](https://www.lean.org/lexicon-terms/a3-report/)
- [A3 Problem Solving | LearnLeanSigma](https://www.learnleansigma.com/guides/a3-problem-solving/)
- [Strategic Planning Basics | Balanced Scorecard Institute](https://balancedscorecard.org/strategic-planning-basics/)
- [Strategic Planning — 5-step process | Asana](https://asana.com/resources/strategic-planning)
- [Strategy Map + Balanced Scorecard | FutureLearn](https://www.futurelearn.com/info/courses/financial-analysis-business-performance-planning-budgeting-forecasting/0/steps/313430)
- [McKinsey Problem Solving — 8 steps | StrategyU](https://strategyu.co/mckinsey-structured-problem-solving-secrets/)
- [Consulting Project Lifecycle | CaseBasix](https://www.casebasix.com/pages/consulting-project-lifecycle-guide)
- [McKinsey MECE & Process Mapping | ManagementConsulted](https://managementconsulted.com/mckinsey-process-mapping/)
- [Business Process Analysis — IBM](https://www.ibm.com/think/topics/business-process-analysis)
- [BPA step-by-step | Asana](https://asana.com/resources/business-process-analysis)
- [BPA — Visual Paradigm](https://guides.visual-paradigm.com/business-process-analysis-bpa-explained/)
- [BPMN explained | Gliffy](https://www.gliffy.com/blog/what-is-business-process-model-notation-bpmn)
