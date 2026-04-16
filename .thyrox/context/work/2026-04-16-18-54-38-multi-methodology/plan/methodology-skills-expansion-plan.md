```yml
created_at: 2026-04-16 20:49:14
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 10 — IMPLEMENT
author: NestorMonroy
status: Aprobado
```

# Plan: Skills de Metodología — PMBOK, BABOK, RM, RUP

Plan para la creación de 20 skills de metodología complementarios a los 9 ya existentes (PDCA + DMAIC). Generado a partir del análisis de los coordinators PMBOK, BABOK, RM y RUP en el registry de THYROX, y enriquecido con referencias de `/tmp/references/antigravity-awesome-skills/` y `/tmp/references/topics/`.

---

## Resumen ejecutivo

| Metodología | Tipo de flujo | Skills a crear | Total |
|---|---|---|---|
| PMBOK | Sequential | 5 process groups | 5 |
| BABOK | Non-sequential | 6 knowledge areas | 6 |
| RM | Conditional | 5 steps | 5 |
| RUP | Iterative | 4 phases | 4 |
| **Total** | | | **20 skills** |

---

## Pre-decisiones de diseño — aplicar en todos los skills nuevos desde el primer draft

Incorporar correcciones identificadas en el deep-review de los skills PDCA/DMAIC:

| Decisión | Motivo | ID deep-review |
|---|---|---|
| `disable-model-invocation: true` en todos | Skills de uso manual explícito; no cargar description en cada sesión | GT-002 |
| Bloque `yml` metadata en templates de artefactos | Cumplir `metadata-standards.md` e invariante I-010 | GT-007 |
| Sección "Pre-condición" en todos | Qué artefacto del step anterior se requiere | GT-006 |
| `now.md`: separar "Al INICIAR" vs "Al COMPLETAR" | Recuperación correcta tras interrupciones | GT-005 |
| Sin referencias a `CLAUDE.md` en skills genéricos | Skills reutilizables fuera del proyecto THYROX | DC-005 |
| VOC methodology explícita donde aplique | BABOK y RM requieren técnicas de captura | DD-001 |

---

## BATCH 1 — RM (5 skills) — Prioridad 1

**Flujo:** conditional. Cada skill documenta las transiciones condicionales explícitas.

| Skill | ID | next exitoso | Retornos condicionales |
|---|---|---|---|
| `rm-elicitation` | `rm:elicitation` | → `rm:analysis` | — |
| `rm-analysis` | `rm:analysis` | `on_success` → `rm:specification` | `on_gaps_found` → `rm:elicitation` |
| `rm-specification` | `rm:specification` | → `rm:validation` | — |
| `rm-validation` | `rm:validation` | `on_approved` → `rm:management` | `on_corrections_needed` → `rm:analysis` |
| `rm-management` | `rm:management` | `on_stable` → cierre | `on_change_request` → `rm:analysis` |

### Herramientas clave por skill

| Skill | Herramientas / técnicas |
|---|---|
| `rm-elicitation` | Entrevistas estructuradas/semi-estructuradas, Workshops/JAD, Observación directa, Prototipos, Encuestas, Análisis de documentos |
| `rm-analysis` | Quality checklist (completeness/consistency/unambiguity/non-conflict), MoSCoW, Kano, Conflict resolution |
| `rm-specification` | IEEE 830 SRS, BRD template, User Story + INVEST + Given/When/Then, NFR specification |
| `rm-validation` | Walkthrough, Inspección formal (Fagan), Prototipo de validación, Test cases de aceptación, Sign-off matrix |
| `rm-management` | CCB process, Impact analysis matrix, Traceability matrix (req→design→test), Baseline + versioning |

### Consideraciones de diseño

- Sección "Decisión de retorno" explícita en `rm-analysis`, `rm-validation`, `rm-management`
- `rm-management`: criterios de cuándo un change request justifica nuevo WP vs gestión dentro del ciclo
- `rm-specification`: criterios de cuándo usar SRS vs BRD vs User Stories
- Red Flags: req sin stakeholder owner, spec sin acceptance criteria verificables, trazabilidad solo al final, change requests sin impact analysis

---

## BATCH 2 — RUP (4 skills) — Prioridad 2

**Flujo:** iterative. Cada fase puede repetirse N veces. Dos caminos: avanzar al milestone → siguiente fase, o nueva iteración.

| Skill | ID | Milestone | Criterios |
|---|---|---|---|
| `rup-inception` | `rup:inception` | **LCO** — Lifecycle Objectives | Visión/alcance acordada, riesgos críticos identificados, business case validado |
| `rup-elaboration` | `rup:elaboration` | **LCA** — Lifecycle Architecture | Arquitectura base estabilizada, riesgos técnicos mitigados, plan de construcción realista |
| `rup-construction` | `rup:construction` | **IOC** — Initial Operational Capability | Funcionalidad suficiente para beta, usuarios pueden evaluar |
| `rup-transition` | `rup:transition` | **PD** — Product Release | Producto desplegado, aceptado por usuarios, defectos críticos resueltos |

### Artefactos por fase

| Fase | Artefactos principales |
|---|---|
| `rup:inception` | Vision Document, Use Case Model (10%), Risk List, Project Plan outline, Business Case |
| `rup:elaboration` | SAD (Software Architecture Document), Use Case Model (80%), Architecture Prototype, Revised Risk List |
| `rup:construction` | Código completo, Test Suite, User Manual draft, Deployment Plan, Release Notes |
| `rup:transition` | Deployed System, User Training Materials, Bug Fix Releases, Product Acceptance Sign-off |

### Consideraciones de diseño

- Bloque "¿Nueva iteración o avanzar?" con criterios de decisión basados en milestone criteria en TODOS los skills RUP
- Tabla de intensidad de disciplinas por fase (9 disciplinas: Business Modeling, Requirements, Analysis & Design, Implementation, Test, Deployment, Config & Change Mgmt, Project Management, Environment)
- Red Flags: Big Design Up Front en Elaboration, Inception > 10% del total del proyecto, Construction acumulando deuda técnica, Transition convertida en segundo proyecto de correcciones

---

## BATCH 3 — PMBOK (5 skills) — Prioridad 3

**Flujo:** sequential. `pmbok:monitoring` activable desde cualquier grupo (paralelo en práctica).

| Skill | ID | Knowledge Areas | Herramientas clave |
|---|---|---|---|
| `pmbok-initiating` | `pmbok:initiating` | Integration, Stakeholder | Project Charter template, Stakeholder Register, power/interest grid |
| `pmbok-planning` | `pmbok:planning` | Los 10 KAs | WBS, CPM/PERT, Cost estimation, Risk register P×I matrix, RACI, Communications Matrix |
| `pmbok-executing` | `pmbok:executing` | Integration, Quality, Resources, Communications, Procurement, Stakeholders | Quality audits, Resource assignment, Issue log |
| `pmbok-monitoring` | `pmbok:monitoring` | Integration, Scope, Schedule, Cost, Quality, Risk | **EVM completo** (PV/EV/AC/SPI/CPI/EAC), Integrated Change Control, Variance analysis |
| `pmbok-closing` | `pmbok:closing` | Integration, Procurement | Final acceptance, Lessons learned, Archive checklist, Contract closure |

### Consideraciones de diseño

- `pmbok-planning` es el skill más denso (10 KAs): dividir actividades en secciones por KA con tabla herramienta→KA
- `pmbok-monitoring`: formulas EVM con tabla de interpretación (SPI<1=behind, CPI<1=over budget)
- `pmbok-monitoring` "Cuándo usar": no solo secuencial, activable desde cualquier grupo ante desviaciones
- Orden de implementación dentro del batch: initiating → closing → executing → monitoring → planning (más denso al final)
- Red Flags: Gold plating, Scope creep, Change requests sin Integrated Change Control, Project Charter sin sponsor real

---

## BATCH 4 — BABOK (6 skills) — Prioridad 4

**Flujo:** non-sequential. Cada skill termina con **Routing Table** en lugar de "Siguiente paso" fijo.

| Skill | ID | Tasks BABOK v3 | Herramientas clave |
|---|---|---|---|
| `babok-baplanning` | `babok:baplanning` | Plan BA Approach, Plan Stakeholder Engagement, Plan BA Governance | BA Plan template, Stakeholder engagement matrix |
| `babok-elicitation` | `babok:elicitation` | Prepare, Conduct, Confirm Elicitation | Tabla técnicas con criterios de selección (entrevistas/JAD/observación/encuestas/prototipos) |
| `babok-requirements-lifecycle` | `babok:requirements_lifecycle` | Trace, Maintain, Prioritize, Assess Changes, Approve | Traceability matrix, MoSCoW, Change impact assessment |
| `babok-strategy` | `babok:strategy` | Analyze Current State, Define Future State, Assess Risks, Define Change Strategy | Current/Future state canvas, Gap analysis, SWOT, Business Need statement |
| `babok-requirements-analysis` | `babok:requirements_analysis` | Specify & Model, Verify, Validate, Define Architecture | Use cases, User Stories, BPM notation, Requirements verification checklist |
| `babok-solution-evaluation` | `babok:solution_evaluation` | Measure Performance, Analyze Measures, Assess Limitations, Recommend Actions | KPI dashboard, Value realization assessment |

### Consideraciones de diseño

- **Sin "Siguiente paso" → con "Routing Table"**: cada skill termina con tabla que recomienda qué área trabajar según contexto
- `babok-baplanning` es punto de entrada recomendado pero no obligatorio — el skill debe mencionar que BABOK permite empezar desde cualquier área
- `babok-elicitation` tiene la tabla de técnicas más rica (entrevistas, workshops, JAD, shadowing, encuestas, prototipos, document analysis) con criterio de selección
- `babok-requirements-lifecycle` es transversal — se activa mientras otras áreas están activas
- Artefacto especial: `{wp}/babok-progress.md` para tracking multi-área — documentar su estructura en `babok-baplanning`
- Red Flags únicas: análisis de requisitos sin elicitación previa, requirements creep, stakeholders no identificados hasta tarde, análisis de solución antes de análisis de necesidad

---

## Fuentes de referencia

| Metodología | Fuentes primarias | Fuentes de apoyo |
|---|---|---|
| PMBOK | Web: PMBOK 7th edition process groups + knowledge areas | antigravity: `architecture-patterns`, `risk-manager`, `project-skill-audit` |
| BABOK | Web: BABOK v3 knowledge areas + techniques | antigravity: `business-analyst`, topics: stakeholders, requirements |
| RM | Web: IEEE 830 SRS, requirements management best practices | antigravity: `api-documentation`, topics: user-stories, bdd |
| RUP | Web: RUP disciplines, milestones, artifacts | antigravity: `architecture-patterns`, `software-architecture` |
| Todos | `/tmp/references/topics/` para técnicas específicas | `/tmp/references/antigravity-awesome-skills/skills/` |

---

## Orden de implementación y esfuerzo estimado

| Batch | Skills | Complejidad | Sesiones estimadas |
|---|---|---|---|
| Batch 1 — RM | 5 | Media | 1 sesión |
| Batch 2 — RUP | 4 | Alta (iteraciones + milestone criteria) | 1 sesión |
| Batch 3 — PMBOK | 5 | Alta (planning con 10 KAs, EVM) | 1-2 sesiones |
| Batch 4 — BABOK | 6 | Alta (non-sequential, Routing Tables) | 1 sesión |
| **Total** | **20** | | **4-5 sesiones** |

---

## Dependencias

- Los 9 skills PDCA/DMAIC existentes deben tener las correcciones del deep-review aplicadas antes de implementar los nuevos (para mantener consistencia de anatomy)
- El `thyrox-coordinator.md` ya puede rutear a todos los flows gracias al YAML registry — los skills nuevos son la interfaz de ejecución paso a paso, no nuevos coordinators
