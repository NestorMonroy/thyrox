```yml
created_at: 2026-04-16 20:49:14
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 10 — IMPLEMENT
author: NestorMonroy
status: Aprobado
updated_at: 2026-04-16 21:07:15
```

# Plan: Skills de Metodología — PMBOK, BABOK, RM, RUP

Plan para la creación de 20 skills de metodología complementarios a los 9 ya existentes (PDCA + DMAIC). Generado a partir del análisis de los coordinators PMBOK, BABOK, RM y RUP en el registry de THYROX, y enriquecido con referencias de `/tmp/references/antigravity-awesome-skills/` y `/tmp/references/topics/`. **Revisado para incorporar todas las correcciones del deep-review de PDCA/DMAIC — cada skill nuevo nace sin los gaps encontrados.**

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

### Correcciones universales (todos los 20 skills)

Incorporar correcciones identificadas en el deep-review de los skills PDCA/DMAIC:

| Decisión | Motivo | ID deep-review |
|---|---|---|
| `disable-model-invocation: true` en todos | Skills de uso manual explícito; no cargar description en cada sesión | GT-002 |
| Bloque `yml` metadata en templates de artefactos | Cumplir `metadata-standards.md` e invariante I-010 | GT-007 |
| Sección "Pre-condición" en todos | Qué artefacto del step anterior se requiere | GT-006 |
| `now.md`: separar "Al INICIAR" vs "Al COMPLETAR" | Recuperación correcta tras interrupciones | GT-005 |
| Sin referencias a `CLAUDE.md` en skills genéricos | Skills reutilizables fuera del proyecto THYROX | DC-005 |
| Mapeo explícito THYROX Stage en todos | Orientación en el ciclo THYROX al aplicar la metodología | GT-001 |
| Fuente primaria de requisitos con técnicas (equivalente VOC) | Cada metodología tiene su propio mecanismo de captura de necesidades | DD-001 |
| Herramienta de priorización estándar de la metodología | No inventar criterios — usar las herramientas canónicas de cada framework | DI-002 |
| Sin referencias a archivos del proyecto (CLAUDE.md, etc.) | Skills son genéricos y reutilizables | DC-005 |
| Al menos 5 Red Flags específicos (no genéricos) | Red Flags genéricos no aportan valor diagnóstico | — |
| Limitaciones explícitas | Qué NO cubre el skill | — |
| Retornos condicionales documentados para flujos conditional/iterative | Recuperación correcta y transparencia del flujo | — |

---

### Equivalente al VOC por metodología

El gap DD-001 (DMAIC: VOC sin técnicas) tiene análogos específicos en cada nueva metodología. La "fuente primaria de requisitos" es el equivalente al VOC — si se omite o se hace sin técnicas, el resultado son supuestos del equipo, no necesidades reales.

| Metodología | Fuente primaria de requisitos | Técnicas de captura | Riesgo si se omite |
|---|---|---|---|
| **PMBOK** | Stakeholder needs (Collect Requirements — Planning KA) | Entrevistas, focus groups, cuestionarios, observación, prototipos, facilitated workshops, benchmarking, document analysis | El project scope se basa en supuestos internos; cambios de scope masivos en Executing cuando los stakeholders ven resultados reales |
| **BABOK** | Business Need (Strategy Analysis) + elicitación de stakeholders (Elicitation & Collaboration) | Entrevistas, workshops JAD, observación (shadowing), prototipos, análisis de documentos, encuestas, focus groups, brainstorming | Requisitos derivados de supuestos en lugar de necesidades; alto riesgo de requirements creep cuando los stakeholders ven la solución tardíamente |
| **RM** | Elicitación directa con stakeholders (rm:elicitation) | Entrevistas estructuradas/semi-estructuradas, talleres JAD, observación directa, prototipos, encuestas, análisis de documentos existentes | Requisitos incompletos o con sesgos del analista; detección tardía de gaps genera ciclos costosos de re-elicitación |
| **RUP** | Use Case Model + Vision Document (Inception) + stakeholder interviews | Workshops de visión, entrevistas a usuarios representativos, análisis de dominio, revisión de documentos existentes | Alcance no alineado con stakeholders; LCO milestone no alcanzable si los riesgos críticos son desconocidos |

---

### Herramienta de priorización estándar por metodología

El gap DI-002 (DMAIC Improve: score no estándar) se evita usando las herramientas canónicas de cada framework:

| Metodología | Herramienta estándar | Descripción | Referencia |
|---|---|---|---|
| **PMBOK** | Matriz Poder/Interés (Power/Interest Grid) para stakeholders; Matriz Probabilidad×Impacto para riesgos | Cuadrante 2x2 para clasificación — no inventar scoring | PMBOK 7th ed., Stakeholder Engagement |
| **BABOK** | MoSCoW (Must/Should/Could/Won't) para requisitos; Kano para valor percibido | MoSCoW es el método canónico de BABOK v3 para priorización | BABOK v3, Requirements Lifecycle Management |
| **RM** | MoSCoW + INVEST criteria para User Stories | MoSCoW para priorizar; INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable) para validar calidad de stories | IEEE 830 + Agile practices |
| **RUP** | Priorización por riesgo-valor: alto riesgo + alto valor → primero | Use cases priorizados por riesgo técnico e impacto en arquitectura — no por features | RUP disciplines, Inception/Elaboration |

---

### Gaps análogos por metodología — qué buscar específicamente

Para cada metodología, los gaps más probables por analogía con PDCA/DMAIC:

#### PMBOK — gaps análogos probables

| Gap PDCA/DMAIC | Análogo en PMBOK | Contenido que lo previene |
|---|---|---|
| DD-001: VOC sin técnicas | `pmbok-planning` sin "Collect Requirements" explícito — scope asumido | Sección de Collect Requirements con tabla de técnicas por tipo de stakeholder |
| DI-002: Score no estándar | Risk score inventado en lugar de Probabilidad×Impacto estándar | Matriz P×I con escala PMI (1-5 × 1-5) y categorías Muy Alto/Alto/Medio/Bajo/Muy Bajo |
| DM-002: Sin Process Map antes de medir | `pmbok-planning` sin WBS — scope no descompuesto antes de estimar | WBS obligatorio antes de estimación de costos y cronograma |
| DC-005: Referencia a CLAUDE.md | References a herramientas propietarias en templates | Sin referencias a archivos de proyecto específicos |
| DA-001: Sin VSM | Sin análisis de proceso base antes de planificar mejoras | `pmbok-monitoring` incluir análisis de varianza antes de acciones correctivas |

#### BABOK — gaps análogos probables

| Gap PDCA/DMAIC | Análogo en BABOK | Contenido que lo previene |
|---|---|---|
| DD-001: VOC sin técnicas | `babok-elicitation` sin tabla de técnicas con criterios de selección | Tabla de 7+ técnicas de elicitación con criterios de cuándo usar cada una |
| DA-002/003: Sin H0/H1 y correlación ≠ causalidad | `babok-requirements-analysis` sin criterios de verificación vs validación | Distinción explícita: verificar (¿correcto según spec?) vs validar (¿resuelve la necesidad real?) |
| DI-002: Score no estándar | Priorización ad-hoc sin método | MoSCoW como método estándar + criterios de asignación por categoría |
| DC-004: Sin lecciones aprendidas | `babok-solution-evaluation` sin retrospectiva de BA performance | Sección de "BA Performance Improvements" en cierre de cada área |
| GT-005: now.md sin separación | Sin estado INICIAR/COMPLETAR por área BABOK | `babok-progress.md` con estado por área + now.md con separación al/completar |

#### RM — gaps análogos probables

| Gap PDCA/DMAIC | Análogo en RM | Contenido que lo previene |
|---|---|---|
| GT-006: Sin Pre-condición | `rm-analysis` sin indicar que requiere output de rm-elicitation | Pre-condición explícita: artefacto requerido del step anterior con campos mínimos |
| DM-003: Kappa ausente para atributos | `rm-validation` sin técnica formal de inspección | Inspección Fagan con roles y defect taxonomy explícitos |
| DI-001: Sin herramientas Lean | `rm-management` sin gestión visual de change requests | Kanban de change requests como mecanismo de visualización del backlog |
| DI-004: Sin criterio piloto vs completo | `rm-validation` sin criterio de qué requiere validación formal vs walkthrough | Tabla de criterios: cuándo usar walkthrough vs inspección Fagan vs prototipo |
| DM-004: 1.5σ shift no explicado | Terminología RM sin explicar conceptos no obvios (ej: baseline, CCB) | Glosario inline para términos técnicos RM (CCB, baseline, impact analysis) |

#### RUP — gaps análogos probables

| Gap PDCA/DMAIC | Análogo en RUP | Contenido que lo previene |
|---|---|---|
| DI-004: Sin criterio piloto vs implementación completa | Sin criterios claros de "¿nueva iteración o avanzar al milestone?" | Tabla de criterios explícitos por milestone (LCO/LCA/IOC/PD) con condiciones de avance y de repetición |
| DC-002: Solo 1-2 Western Electric Rules | Solo citar milestone sin criterios de evaluación detallados | Checklist de evaluación milestone con múltiples criterios (no solo el enunciado) |
| DA-001: Sin VSM | Sin tabla de intensidad de disciplinas por fase | Tabla disciplinas × fases con nivel de actividad (Alta/Media/Baja/Nula) |
| GT-005: now.md sin separación | Sin estado por iteración | now.md con contador de iteraciones + separación INICIAR/COMPLETAR |
| DC-004: Sin lecciones aprendidas | `rup-transition` sin retrospectiva de iteraciones | Sección de Post-Mortem / lecciones aprendidas por iteración y por fase |

---

## Checklist de calidad — aplicar a cada skill antes de commitear

Verificar que cada skill nuevo cumple con todos los puntos antes del commit:

```
FRONTMATTER
□ disable-model-invocation: true en frontmatter
□ allowed-tools explícito (mínimo: Read Glob Grep Bash Write Edit)
□ effort: medium (o el apropiado)
□ description sigue patrón "Use when [condición]. [methodology]:[step] — [qué hace]"

ESTRUCTURA
□ Pre-condición: artefacto previo requerido con campos mínimos documentados
□ THYROX Stage mapping explícito (Stage N NOMBRE)
□ Sección "Cuándo usar" / "Cuándo NO usar"
□ now.md: "Al INICIAR" / "Al COMPLETAR" separados con yaml blocks

CONTENIDO DE METODOLOGÍA
□ Fuente primaria de requisitos (equivalente a VOC) con técnicas listadas
□ Herramienta de priorización estándar de la metodología (no inventada)
□ Terminología técnica específica de la metodología (no genérica)
□ Retornos condicionales documentados si el flujo es conditional/iterative

ARTEFACTO ESPERADO
□ yml metadata block en template de artefacto (NUNCA --- frontmatter)
□ Campos: created_at, project, work_package, phase, author, status
□ Secciones del artefacto cubren actividades del skill

CALIDAD
□ Al menos 5 Red Flags específicos (no genéricos)
□ Limitaciones explícitas (qué NO cubre el skill)
□ Sin referencias a archivos del proyecto (CLAUDE.md, settings.json, etc.)
□ Sin referencias a herramientas propietarias del equipo del proyecto
```

---

## BATCH 1 — RM (5 skills) — Prioridad 1

**Flujo:** conditional. Cada skill documenta las transiciones condicionales explícitas.

| Skill | ID | next exitoso | Retornos condicionales | Gaps análogos a prevenir |
|---|---|---|---|---|
| `rm-elicitation` | `rm:elicitation` | → `rm:analysis` | — | DD-001: incluir ≥5 técnicas con criterios de selección |
| `rm-analysis` | `rm:analysis` | `on_success` → `rm:specification` | `on_gaps_found` → `rm:elicitation` | GT-006: pre-condición = output de rm-elicitation; retorno documentado |
| `rm-specification` | `rm:specification` | → `rm:validation` | — | DI-004: criterio cuándo usar SRS vs BRD vs User Stories |
| `rm-validation` | `rm:validation` | `on_approved` → `rm:management` | `on_corrections_needed` → `rm:analysis` | DM-003: inspección Fagan con roles; retorno documentado |
| `rm-management` | `rm:management` | `on_stable` → cierre | `on_change_request` → `rm:analysis` | DI-001: Kanban visual de change requests; DM-004: glosario CCB/baseline |

### Herramientas clave por skill — detalle

| Skill | Herramientas / técnicas | Fuente canónica |
|---|---|---|
| `rm-elicitation` | Entrevistas estructuradas/semi-estructuradas (con guía de preguntas), Workshops JAD (Joint Application Development), Observación directa (shadowing), Prototipos (low-fi/hi-fi según etapa), Encuestas (Likert + preguntas abiertas), Análisis de documentos existentes | IEEE 830, BABOK v3 |
| `rm-analysis` | Quality checklist (completeness/consistency/unambiguity/non-conflict/verifiability/feasibility), MoSCoW para priorización, Kano para valor percibido, Conflict resolution matrix | IEEE 830 |
| `rm-specification` | IEEE 830 SRS (formato estándar), BRD template (Business Requirements Document), User Story + INVEST criteria + Given/When/Then (BDD), NFR specification (non-functional: performance/security/scalability) | IEEE 830, Agile |
| `rm-validation` | Walkthrough (informal), Inspección formal Fagan (roles: Author, Moderator, Reviewer, Scribe; defect taxonomy), Prototipo de validación, Test cases de aceptación (UAT), Sign-off matrix con stakeholders | Fagan 1976, IEEE 1028 |
| `rm-management` | CCB (Change Control Board) process con roles explícitos, Impact analysis matrix (req→design→test→code), Traceability matrix forward/backward, Baseline + versioning con etiquetado, Kanban de change requests | IEEE 830, CMMI |

### Consideraciones de diseño — RM

- Sección "Decisión de retorno" explícita en `rm-analysis`, `rm-validation`, `rm-management` — no solo nombrar el retorno, sino los criterios cuantitativos de cuándo retornar
- `rm-management`: criterios de cuándo un change request justifica nuevo WP vs gestión dentro del ciclo (impacto en baseline: <10% → gestionar; >30% → nuevo WP)
- `rm-specification`: tabla de criterios para elegir formato (SRS vs BRD vs User Stories según tipo de proyecto y audience)
- `rm-validation`: explicar la diferencia entre verificación (¿cumple el spec?) y validación (¿resuelve la necesidad real?) — análogo al gap DA-002/003 de DMAIC
- **Glosario inline** en `rm-management` para términos técnicos: CCB, baseline, impact analysis, forward/backward traceability — no asumir conocimiento previo
- Red Flags específicos por skill (no genéricos): req sin stakeholder owner, spec sin acceptance criteria verificables, trazabilidad solo al final, change requests sin impact analysis, baseline cambiado sin CCB, UAT sign-off informal

---

## BATCH 2 — RUP (4 skills) — Prioridad 2

**Flujo:** iterative. Cada fase puede repetirse N veces. Dos caminos: avanzar al milestone → siguiente fase, o nueva iteración.

| Skill | ID | Milestone | Criterios de avance | Criterios de nueva iteración | Gaps análogos a prevenir |
|---|---|---|---|---|---|
| `rup-inception` | `rup:inception` | **LCO** — Lifecycle Objectives | Visión/alcance acordada, riesgos críticos identificados, business case validado, ≥10% use cases identificados | LCO no cumplido: stakeholders no alineados, riesgos críticos sin plan, business case cuestionable | DA-001: tabla disciplinas por fase; DI-004: criterios iteración explícitos |
| `rup-elaboration` | `rup:elaboration` | **LCA** — Lifecycle Architecture | Arquitectura base estabilizada, ≥80% use cases especificados, riesgos técnicos mitigados, plan de construcción realista y aceptado | LCA no cumplido: prototype arquitectural falla bajo carga, riesgos técnicos aún abiertos | DA-001: tabla disciplinas; DC-002: checklist múltiples criterios de milestone |
| `rup-construction` | `rup:construction` | **IOC** — Initial Operational Capability | Funcionalidad suficiente para beta, usuarios pueden evaluar, deuda técnica documentada y acotada | Nuevo release incremental requerido, defectos críticos pendientes | DI-004: criterio piloto vs completo; DC-004: retrospectiva iteración |
| `rup-transition` | `rup:transition` | **PD** — Product Release | Producto desplegado, aceptado por usuarios, defectos críticos resueltos, documentación completa | Ciclo de correcciones post-beta, nueva beta requerida | DC-004: lecciones aprendidas por iteración; GT-005: contador iteraciones |

### Artefactos por fase — detalle

| Fase | Artefactos requeridos | Artefactos opcionales |
|---|---|---|
| `rup:inception` | Vision Document, Use Case Model (10% — casos de uso críticos), Risk List, Business Case | Project Plan outline, Glossary, Stakeholder requests |
| `rup:elaboration` | SAD (Software Architecture Document), Use Case Model (80%), Architecture Prototype ejecutable, Revised Risk List, Construction iteration plan | Test Plan, Deployment Plan draft, Design Model |
| `rup:construction` | Código completo por iteración, Test Suite (unit + integration), User Manual draft, Deployment Plan final, Release Notes por iteración | Performance test results, Security review |
| `rup:transition` | Deployed System, User Training Materials, Bug Fix Releases, Product Acceptance Sign-off | Migration Plan (si aplica), Support documentation |

### Tabla de intensidad de disciplinas por fase

Esencial para `rup-inception` — replica el gap DA-001 (VSM) en forma de mapa de flujo por disciplina:

| Disciplina | Inception | Elaboration | Construction | Transition |
|---|---|---|---|---|
| Business Modeling | Alta | Media | Baja | Nula |
| Requirements | Alta | Alta | Media | Baja |
| Analysis & Design | Media | Alta | Alta | Baja |
| Implementation | Baja | Media | Alta | Media |
| Test | Baja | Media | Alta | Alta |
| Deployment | Nula | Baja | Media | Alta |
| Config & Change Mgmt | Baja | Media | Alta | Alta |
| Project Management | Alta | Alta | Alta | Media |
| Environment | Alta | Media | Baja | Baja |

> Esta tabla es la principal herramienta de diagnóstico de "Big Design Up Front" — si en Inception la disciplina Implementation está en "Alta", hay un red flag de BDUF.

### Criterios "¿Nueva iteración o avanzar?" — por fase

**`rup-inception`:**
- **Avanzar a Elaboration:** Todos los siguientes cumplidos: (1) stakeholders validaron Vision Document, (2) business case aprobado por sponsor, (3) riesgos críticos identificados con plan de respuesta, (4) ≥10% del Use Case Model existe
- **Nueva iteración Inception:** Cualquiera de: stakeholders clave no alineados en alcance, business case cuestionado, riesgos críticos desconocidos que podrían cancelar el proyecto

**`rup-elaboration`:**
- **Avanzar a Construction:** Todos: (1) prototype arquitectural estable bajo las cargas del escenario crítico, (2) ≥80% de use cases especificados (happy + alternate paths), (3) riesgos técnicos top-5 mitigados o con plan concreto, (4) iteración de Construction planificada con estimación creíble
- **Nueva iteración Elaboration:** Cualquiera de: prototype falla bajo carga esperada, riesgos técnicos abiertos que bloquean arquitectura, use cases críticos sin especificar

**`rup-construction`:**
- **Avanzar a Transition:** Todos: (1) funcionalidad suficiente para que usuarios beta evalúen el valor, (2) defectos críticos (Severity 1) = 0, (3) deuda técnica documentada y acotada (no eliminada), (4) usuario beta o PO aprueba el inicio de Transition
- **Nueva iteración Construction:** Cualquiera de: nuevo release incremental requerido antes de beta, defectos críticos pendientes, funcionalidad incompleta para uso básico

**`rup-transition`:**
- **Cierre PD:** Todos: (1) producto en producción, (2) defectos críticos resueltos, (3) usuarios finales aceptaron formalmente, (4) documentación completa
- **Nueva iteración Transition:** Ciclo de correcciones post-beta identificadas durante deployment, nueva beta necesaria antes del release final

### Consideraciones de diseño — RUP

- Contador de iteraciones en `now.md` — `rup_iteration: N` — para recuperación correcta tras interrupciones (análogo a GT-005)
- Red Flags específicos: Big Design Up Front en Elaboration (Inception con Implementation=Alta), Inception > 10% del total del proyecto, Construction acumulando deuda técnica sin documentar, Transition convertida en segundo proyecto de correcciones, Architecture Prototype que solo prueba casos felices
- `rup-elaboration` debe prevenir explícitamente el "Architecture Astronaut" — arquitectura sobrediseñada que nunca se ejecuta
- Retrospectiva de iteración en todos los skills RUP — no solo en Transition (análogo al gap DC-004 de DMAIC)

---

## BATCH 3 — PMBOK (5 skills) — Prioridad 3

**Flujo:** sequential. `pmbok:monitoring` activable desde cualquier grupo (paralelo en práctica).

| Skill | ID | Knowledge Areas | Herramientas clave | Gaps análogos a prevenir |
|---|---|---|---|---|
| `pmbok-initiating` | `pmbok:initiating` | Integration, Stakeholder | Project Charter template, Stakeholder Register, Power/Interest grid, High-level risk identification | DD-001: stakeholder needs con técnicas de captura explícitas |
| `pmbok-planning` | `pmbok:planning` | Los 10 KAs | WBS, CPM/PERT, Cost estimation (analogía/paramétrica/bottom-up), Risk register P×I matrix, RACI, Communications Matrix | DD-001: Collect Requirements con ≥5 técnicas; DM-002: WBS antes de estimación |
| `pmbok-executing` | `pmbok:executing` | Integration, Quality, Resources, Communications, Procurement, Stakeholders | Quality audits (Manage Quality), Resource assignment matrix, Issue log, Stakeholder engagement assessment | DI-001: incluir gestión visual del progreso |
| `pmbok-monitoring` | `pmbok:monitoring` | Integration, Scope, Schedule, Cost, Quality, Risk | **EVM completo** (PV/EV/AC/SPI/CPI/EAC/ETC/VAC/TCPI), Integrated Change Control, Variance analysis, Trend analysis | DA-002/003: EVM interpretación con causalidad (SPI≠CPI → causas distintas) |
| `pmbok-closing` | `pmbok:closing` | Integration, Procurement | Final acceptance, Lessons learned template, Archive checklist, Contract closure | DC-004: lecciones aprendidas estructuradas por KA |

### Herramientas clave por skill — detalle

| Skill | Herramientas / técnicas | Fuente canónica |
|---|---|---|
| `pmbok-initiating` | Project Charter (campos mínimos PMI), Stakeholder Identification (brainstorming + análisis de documentos + expert judgment), Power/Interest Grid (2×2 estándar), High-level WBS para scope inicial, Assumption log | PMBOK 7th ed. |
| `pmbok-planning` | WBS (deliverable-oriented, 100% rule), CPM (Critical Path Method) con red diagram, PERT (3-point estimates: O+4ML+P/6), Cost estimation (analogía/paramétrica/bottom-up/three-point), Risk register con P×I 5×5 matrix, RACI chart, Communications Management Plan, Procurement plan | PMBOK 7th ed., PMI |
| `pmbok-executing` | Direct & Manage Project Work (issue log, change log), Manage Quality (quality audits, process improvement), Acquire & Develop Resources (team assignments, training plan), Manage Communications (push/pull/interactive), Stakeholder engagement assessment matrix | PMBOK 7th ed. |
| `pmbok-monitoring` | EVM formulas completas (ver tabla abajo), Integrated Change Control (CCB process), Scope Validation (customer acceptance), Variance analysis (Schedule Variance, Cost Variance), Trend analysis (gráficas de SPI/CPI a lo largo del tiempo) | PMI, EVM standard |
| `pmbok-closing` | Final acceptance document, Lessons Learned Register (por KA + por fase), Project archive checklist, Contract closure (formal acceptance + financial settlement), Procurement audit | PMBOK 7th ed. |

### Fórmulas EVM — tabla completa para `pmbok-monitoring`

| Métrica | Fórmula | Interpretación | Señal de alerta |
|---|---|---|---|
| **PV** (Planned Value) | Budget × % planificado | Costo del trabajo que debía estar hecho | — |
| **EV** (Earned Value) | Budget × % real completado | Costo del trabajo realmente completado | — |
| **AC** (Actual Cost) | Costo real incurrido | Lo que realmente se gastó | — |
| **SV** (Schedule Variance) | EV − PV | SV < 0: behind schedule | SV < -10% del PV |
| **CV** (Cost Variance) | EV − AC | CV < 0: over budget | CV < -10% del BAC |
| **SPI** (Schedule Performance Index) | EV / PV | SPI < 1: behind schedule | SPI < 0.9 |
| **CPI** (Cost Performance Index) | EV / AC | CPI < 1: over budget | CPI < 0.9 |
| **EAC** (Estimate at Completion) | BAC / CPI | Proyección del costo final | EAC > BAC |
| **ETC** (Estimate to Complete) | EAC − AC | Costo restante estimado | — |
| **VAC** (Variance at Completion) | BAC − EAC | Varianza final proyectada | VAC < 0 = sobre budget |
| **TCPI** (To Complete Performance Index) | (BAC−EV) / (BAC−AC) | Eficiencia necesaria para terminar en budget | TCPI > 1.1: poco realista |

> **Causalidad vs correlación en EVM:** SPI < 1 y CPI < 1 simultáneos no implican la misma causa. SPI < 1 puede ser por recursos insuficientes; CPI < 1 puede ser por subestimación de costos. Analizar por separado antes de tomar acciones correctivas — análogo al gap DA-002/003 de DMAIC.

### Consideraciones de diseño — PMBOK

- `pmbok-planning` es el skill más denso (10 KAs): dividir actividades en secciones por KA con tabla herramienta→KA, pero mantener una narrative coherente
- `pmbok-monitoring` "Cuándo usar": no solo secuencial, activable desde cualquier grupo ante desviaciones — este es el único skill PMBOK con activación no-lineal
- `pmbok-initiating`: Collect Requirements NO está en Initiating sino en Planning — evitar confusión en la descripción; Initiating = autorizar el proyecto, no definir requisitos detallados
- Orden de implementación dentro del batch: initiating → closing → executing → monitoring → planning (más denso al final)
- Red Flags específicos: Gold plating (scope creep autogenerado por el equipo), Scope creep (scope creep por stakeholders sin Integrated Change Control), Change requests sin CCB, Project Charter sin sponsor real, EVM calculado solo al inicio/final del proyecto (debe ser continuo), WBS con actividades en lugar de entregables (WBS es deliverable-oriented, no task-oriented)

---

## BATCH 4 — BABOK (6 skills) — Prioridad 4

**Flujo:** non-sequential. Cada skill termina con **Routing Table** en lugar de "Siguiente paso" fijo.

| Skill | ID | Tasks BABOK v3 | Herramientas clave | Gaps análogos a prevenir |
|---|---|---|---|---|
| `babok-baplanning` | `babok:baplanning` | Plan BA Approach, Plan Stakeholder Engagement, Plan BA Governance, Plan Information Management, Identify BA Performance Improvements | BA Plan template, Stakeholder engagement matrix, RACI para BA activities | DD-001: stakeholder identification con técnicas; GT-006: pre-condición |
| `babok-elicitation` | `babok:elicitation` | Prepare, Conduct, Confirm Elicitation, Communicate BA Information, Manage Stakeholder Collaboration | Tabla 7 técnicas con criterios de selección (ver abajo) | DD-001: CRÍTICO — sin tabla de técnicas, la elicitación es informal |
| `babok-requirements-lifecycle` | `babok:requirements_lifecycle` | Trace, Maintain, Prioritize, Assess Changes, Approve Requirements | Traceability matrix, MoSCoW (estándar BABOK), Change impact assessment | DI-002: MoSCoW como herramienta canónica, no scoring inventado |
| `babok-strategy` | `babok:strategy` | Analyze Current State, Define Future State, Assess Risks, Define Change Strategy | Current/Future state canvas, Gap analysis, SWOT, Business Need statement | DA-001: análisis del estado actual antes de definir futuro (análogo a VSM) |
| `babok-requirements-analysis` | `babok:requirements_analysis` | Specify & Model, Verify, Validate, Define Architecture, Define Design Options, Analyze Potential Value | Use cases con actores y flujos, User Stories + INVEST, BPM notation básica, Requirements verification checklist | DA-002/003: verificación ≠ validación — distinción explícita |
| `babok-solution-evaluation` | `babok:solution_evaluation` | Measure Performance, Analyze Measures, Assess Solution Limitations, Assess Enterprise Limitations, Recommend Actions | KPI dashboard, Value realization assessment, Root cause analysis para limitaciones | DC-004: lecciones aprendidas de BA process |

### Tabla de técnicas de elicitación para `babok-elicitation`

Esta tabla previene el gap DD-001 (análogo): elicitación sin técnicas → requisitos basados en supuestos:

| Técnica | Cuándo usar | Ventajas | Limitaciones |
|---|---|---|---|
| **Entrevistas** | Stakeholders clave, información profunda, contexto complejo | Alto detalle, permite explorar en profundidad | Costoso en tiempo; sesgo del entrevistador |
| **Workshops JAD** | Múltiples stakeholders, necesidad de consenso, proyectos grandes | Consenso rápido, identifica conflictos en tiempo real | Requiere facilitador experimentado; dominancia de voces fuertes |
| **Observación (Shadowing)** | Procesos operacionales, comportamiento real vs declarado, tareas tácitas | Captura comportamiento real (no lo que dicen que hacen) | Efecto Hawthorne; no captura casos excepcionales |
| **Prototipos** | Validar comprensión de requisitos visuales/funcionales, stakeholders no técnicos | Reduce ambigüedad de req de UI/UX; feedback temprano | Puede anclar expectativas; costo de construcción |
| **Encuestas/Cuestionarios** | Base amplia de stakeholders, validar hipótesis, datos cuantitativos | Alcance amplio; datos estandarizados | Baja tasa de respuesta; sin profundidad; sesgo de diseño |
| **Focus Groups** | Explorar percepciones, antes de encuesta masiva, requisitos de producto | Dinámicas grupales revelan prioridades implícitas | Dinámicas de grupo pueden suprimir opiniones individuales |
| **Análisis de Documentos** | Sistemas existentes, regulaciones, contratos, procesos documentados | Baseline objetivo; sin bias de stakeholder | Documentación desactualizada; solo captura estado formal |

> **Criterio de selección:** Combinar siempre al menos una técnica directa (entrevista/shadowing) con una de validación (encuesta/workshop) para reducir sesgo. No depender de una sola técnica — análogo al riesgo "VOC de un solo tipo" en DMAIC.

### Routing Table para skills BABOK — template

Cada skill BABOK termina con una tabla como esta (los valores cambian por área):

| Si en el proyecto... | Ir a |
|---|---|
| No se ha hecho BA Planning | → `babok:baplanning` primero |
| Hay stakeholders con información no recopilada | → `babok:elicitation` |
| Hay requisitos que gestionar, priorizar o cambios que evaluar | → `babok:requirements_lifecycle` |
| El problema de negocio o el estado futuro no está claro | → `babok:strategy` |
| Hay que especificar, modelar o verificar requisitos | → `babok:requirements_analysis` |
| Una solución está en uso y necesita evaluación de valor | → `babok:solution_evaluation` |
| Todo lo anterior está completo para este ciclo | → Reporting/Stage siguiente THYROX |

### Consideraciones de diseño — BABOK

- **Sin "Siguiente paso" → con "Routing Table"**: cada skill termina con tabla que recomienda qué área trabajar según contexto — no hay "siguiente" fijo
- `babok-baplanning` es punto de entrada recomendado pero no obligatorio — el skill debe mencionar explícitamente que BABOK permite empezar desde cualquier área según el contexto del proyecto
- `babok-elicitation` tiene la tabla de técnicas más rica — al menos 7 técnicas con criterios de selección (tabla arriba)
- `babok-requirements-lifecycle` es transversal — puede estar activo mientras otras áreas están activas; su now.md no indica "completado" hasta que se cierran todos los requisitos activos
- Artefacto especial: `{wp}/babok-progress.md` para tracking multi-área — documentar su estructura en `babok-baplanning`; campos: área, estado (No iniciado/En progreso/Completado), iteraciones, artefactos generados
- `babok-strategy`: análisis del estado actual (Current State) es el VSM equivalente — obligatorio antes de definir Future State; sin este análisis, el gap analysis es especulativo (análogo DA-001)
- `babok-requirements-analysis`: distinción verificación vs validación es crítica — verificar = ¿el requisito cumple el estándar de calidad (INVEST, testabilidad)? validar = ¿resuelve la necesidad del negocio real? — análogo al gap DA-002/003
- Red Flags únicos BABOK: análisis de requisitos sin elicitación previa, requirements creep sin lifecycle management activo, stakeholders no identificados hasta tarde, análisis de solución antes de análisis de necesidad (solution bias), BA Progress solo actualizado al final del proyecto

---

## Fuentes de referencia

| Metodología | Fuentes locales (registry) | Fuentes de referencia (/tmp) | Fuentes canónicas |
|---|---|---|---|
| PMBOK | `.thyrox/registry/methodologies/pmbok.yml`, `.claude/agents/pmbok-coordinator.md` | `antigravity: business-analyst`, `risk-manager`; topics: `work-breakdown-structure`, `stakeholder-analysis` | PMI PMBOK 7th Edition; PMI EVM Practice Standard |
| BABOK | `.thyrox/registry/methodologies/babok.yml`, `.claude/agents/babok-coordinator.md` | `antigravity: business-analyst`; topics: `stakeholder-analysis`, `use-cases-and-user-stories`, `moscow-method`, `use-case-analysis` | IIBA BABOK v3 |
| RM | `.thyrox/registry/methodologies/rm.yml`, `.claude/agents/rm-coordinator.md` | topics: `use-cases-and-user-stories`, `moscow-method` | IEEE 830 SRS; IEEE 1028 (inspections); Fagan (1976) inspection method |
| RUP | `.thyrox/registry/methodologies/rup.yml`, `.claude/agents/rup-coordinator.md` | `antigravity: agent-orchestrator` (patterns de flujo iterativo) | Rational Unified Process (Kruchten, 2003); RUP disciplines documentation |
| Todos | Skills PDCA/DMAIC existentes como anatomía de referencia | `/tmp/references/topics/` para técnicas específicas | DMAIC skill anatomy en `.claude/skills/dmaic-*/SKILL.md` |

---

## Orden de implementación y esfuerzo estimado

| Batch | Skills | Complejidad | Sesiones estimadas | Razón del orden |
|---|---|---|---|---|
| Batch 1 — RM | 5 | Media | 1 sesión | Flujo condicional más simple; sirve de warm-up para los iterativos |
| Batch 2 — RUP | 4 | Alta (iteraciones + milestone criteria + disciplina table) | 1 sesión | 4 skills densos pero bien estructurados por milestone |
| Batch 3 — PMBOK | 5 | Alta (planning con 10 KAs, EVM completo) | 1-2 sesiones | Planning es el skill más denso del plan completo |
| Batch 4 — BABOK | 6 | Alta (non-sequential, Routing Tables, elicitation table) | 1 sesión | 6 skills pero con patrón Routing Table reutilizable |
| **Total** | **20** | | **4-5 sesiones** | |

---

## Dependencias

- Los 9 skills PDCA/DMAIC existentes deben tener las correcciones del deep-review aplicadas antes de implementar los nuevos (para mantener consistencia de anatomy)
- El `thyrox-coordinator.md` ya puede rutear a todos los flows gracias al YAML registry — los skills nuevos son la interfaz de ejecución paso a paso, no nuevos coordinators
- El checklist de calidad de esta sección debe ejecutarse antes del commit de cada skill nuevo — no es opcional
- Implementar en orden Batch 1 → 2 → 3 → 4: cada batch enseña patrones que simplifican el siguiente (conditional → iterative → sequential → non-sequential)
