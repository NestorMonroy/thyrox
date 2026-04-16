---
name: pm-planning
description: "Use when developing the project management plan in PMBOK. pm:planning — develop all subsidiary plans across 10 knowledge areas, create WBS, define schedule with CPM/PERT, estimate costs, plan quality/risks/communications/stakeholders."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
disable-model-invocation: true
updated_at: 2026-04-16 00:00:00
---

# /pm-planning — PMBOK: Planning

> *"Planning is the most undervalued process group in project management. Every hour spent in solid planning eliminates three to ten hours of rework during execution. The plan is not the goal — the plan is the tool that makes the goal achievable."*

Ejecuta el **Grupo de Proceso Planning** de PMBOK. Desarrolla todos los planes subsidiarios de las 10 Knowledge Areas, crea el WBS, define el cronograma con CPM/PERT, estima costos, planifica calidad, riesgos, comunicaciones y stakeholders. El output es el **Project Management Plan** aprobado.

**THYROX Stage:** Stage 5 STRATEGY / Stage 6 SCOPE / Stage 7 DESIGN/SPECIFY.

**Outputs clave:** Project Management Plan · WBS · Schedule Baseline · Cost Baseline · Risk Register.

---

## Pre-condición

Requiere: `{wp}/pm-initiating.md` con:
- Project Charter firmado por el sponsor
- Stakeholder Register inicial completo
- PM asignado con autoridad delegada

---

## Cuándo usar este paso

- Cuando el Project Charter está firmado y el equipo está listo para planificar
- Al iniciar la planificación de una nueva fase en proyectos multi-fase
- Cuando un cambio aprobado requiere re-planificación significativa de una o más KAs

## Cuándo NO usar este paso

- Sin Project Charter firmado — planificar sin autorización formal genera trabajo que puede ser rechazado
- Si hay aspectos del negocio aún no claros — regresar a Initiating para aclarar antes de planificar

---

## Knowledge Areas en Planning

| # | Knowledge Area | Plan subsidiario clave |
|---|---------------|----------------------|
| 1 | Integration Management | Project Management Plan (integra todos los demás) |
| 2 | Scope Management | Scope Management Plan · WBS · WBS Dictionary |
| 3 | Schedule Management | Schedule Management Plan · Network Diagram · Cronograma |
| 4 | Cost Management | Cost Management Plan · Cost Estimates · Cost Baseline |
| 5 | Quality Management | Quality Management Plan · Quality Metrics |
| 6 | Resource Management | Resource Management Plan · RACI · Staffing Plan |
| 7 | Communications Management | Communications Management Plan |
| 8 | Risk Management | Risk Management Plan · Risk Register |
| 9 | Procurement Management | Procurement Management Plan (si aplica) |
| 10 | Stakeholder Management | Stakeholder Engagement Plan |

---

## Actividades

### 1. Scope Management — WBS

El Work Breakdown Structure (WBS) es la base de todo lo demás en Planning:

**Construir el WBS:**

| Nivel | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nivel 1** | Proyecto completo | "Sistema de Gestión de Pedidos" |
| **Nivel 2** | Fases o componentes principales | "1. Módulo de clientes · 2. Módulo de pedidos · 3. Módulo de pagos" |
| **Nivel 3** | Deliverables de cada componente | "1.1 Registro de clientes · 1.2 Gestión de perfiles" |
| **Nivel N** | Work Packages — unidad más pequeña planificable | "1.1.1 API de registro · 1.1.2 Validación de datos" |

**Regla de los 8/80:** Un Work Package no debería tomar menos de 8 horas ni más de 80 horas. Si es más, descomponerlo.

**WBS Dictionary:** Para cada Work Package definir:
- Descripción del trabajo
- Criterio de aceptación
- Responsable (de la RACI)
- Estimación de esfuerzo
- Dependencias

### 2. Schedule Management — CPM y PERT

**Critical Path Method (CPM):**

| Concepto | Descripción |
|----------|-------------|
| **Forward Pass** | Calcular Early Start (ES) y Early Finish (EF) para cada actividad |
| **Backward Pass** | Calcular Late Start (LS) y Late Finish (LF) para cada actividad |
| **Float (Slack)** | Float = LS − ES = LF − EF. Actividades con Float = 0 están en el Critical Path |
| **Critical Path** | La secuencia de actividades con el menor float total — determina la duración mínima del proyecto |

**PERT (Program Evaluation and Review Technique):**

Para estimaciones con incertidumbre:

| Variable | Fórmula | Descripción |
|----------|---------|-------------|
| **Optimistic (O)** | — | Mejor caso posible |
| **Most Likely (M)** | — | Estimación más probable |
| **Pessimistic (P)** | — | Peor caso posible |
| **PERT Estimate** | (O + 4M + P) / 6 | Estimación ponderada |
| **Std Dev** | (P − O) / 6 | Incertidumbre de la estimación |

> **Cuándo usar PERT:** Para actividades con alta incertidumbre (nueva tecnología, proveedores no conocidos, requisitos ambiguos). Para actividades bien conocidas, la estimación directa es suficiente.

**Técnicas de compresión en Planning (si el cronograma no cumple la fecha objetivo):**

| Técnica | Descripción | Costo |
|---------|-------------|-------|
| **Fast Tracking** | Actividades en serie → en paralelo | Mayor riesgo de retrabajo |
| **Crashing** | Agregar recursos al Critical Path | Mayor costo |
| **Reducir scope** | Mover deliverables de Must Have a Should Have | Requiere aprobación del sponsor |

### 3. Cost Management — Estimación y Cost Baseline

**Técnicas de estimación de costos:**

| Técnica | Precisión | Cuándo usar |
|---------|-----------|-------------|
| **Analogous (top-down)** | ±50% | Inicio del proyecto — usa datos de proyectos similares |
| **Parametric** | ±20-30% | Cuando hay relaciones cuantificables (ej: $/línea de código, $/función) |
| **Bottom-up** | ±10% | Cuando el WBS es detallado — estimar cada Work Package |
| **Three-point (PERT)** | ±10-15% | Work Packages con incertidumbre alta |

**Cost Baseline = Suma de los costos de todos los Work Packages + reservas de contingencia por riesgo**

> Las reservas de gerencia (management reserves) están por encima del Cost Baseline y no son parte de él.

### 4. Quality Management Plan

| Elemento | Contenido |
|----------|-----------|
| **Quality Standards** | Estándares que aplican al proyecto (ISO, CMMI, industry standards) |
| **Quality Metrics** | Métricas medibles de calidad (defect density, test coverage %, etc.) |
| **Quality Assurance activities** | Auditorías, process reviews — prevenir defectos |
| **Quality Control activities** | Inspecciones, testing — detectar defectos |
| **Definition of Done** | Criterios de aceptación para cada tipo de deliverable |

### 5. Risk Management — Risk Register completo

En Planning, el Risk Register se desarrolla en detalle:

**Identify Risks → Qualitative Analysis → Quantitative Analysis → Plan Responses:**

| Campo | Descripción |
|-------|-------------|
| **Risk ID** | R-001, R-002, ... |
| **Descripción** | Causa → Evento → Efecto |
| **Categoría** | Técnico / Externo / Organizacional / PM |
| **Probabilidad** | Alta (> 70%) / Media (30-70%) / Baja (< 30%) |
| **Impacto** | Alto / Medio / Bajo — evaluado en scope, schedule, cost, quality |
| **P × I** | Probability × Impact = Risk Score |
| **Estrategia** | Avoid / Transfer / Mitigate / Accept (amenazas) / Exploit / Share / Enhance / Accept (oportunidades) |
| **Plan de respuesta** | Acción específica si el riesgo ocurre |
| **Trigger** | Señal de que el riesgo está a punto de materializarse |
| **Responsable** | Quién ejecuta el plan de respuesta |

**Probability × Impact Matrix:**

| | Bajo impacto | Medio impacto | Alto impacto |
|--|-------------|--------------|-------------|
| **Alta probabilidad** | Media | Alta | Crítica |
| **Media probabilidad** | Baja | Media | Alta |
| **Baja probabilidad** | Baja | Baja | Media |

### 6. Communications Management Plan

| Información | Audiencia | Frecuencia | Formato | Responsable |
|------------|-----------|-----------|---------|-------------|
| Status Report | Sponsor + equipo | Semanal | Documento + email | PM |
| Executive Dashboard | Steering Committee | Mensual | Dashboard + RAG | PM |
| Team Standup | Equipo | Diario | Meeting | Scrum Master / PM |
| Change Requests | CCB | Ad hoc | Documento formal | PM |
| Risk Updates | Sponsor | Quincenal | Sección en Status Report | PM |

### 7. RACI Matrix

Para cada deliverable o actividad clave del WBS:

| Letra | Significado | Cuántas personas por actividad |
|-------|------------|-------------------------------|
| **R** | Responsible — hace el trabajo | 1 o más (pero idealmente 1) |
| **A** | Accountable — rinde cuentas por el resultado | Exactamente 1 |
| **C** | Consulted — da input antes de la decisión | 0 o más |
| **I** | Informed — se notifica después de la decisión | 0 o más |

> **Regla:** Cada actividad debe tener exactamente 1 A. Múltiples R en la misma actividad es aceptable. Sin R o sin A = accountability gap.

---

## Criterio de completitud — ¿Project Management Plan aprobado?

**Plan aprobado (todos los siguientes):**
1. WBS completo con todos los deliverables del scope del Charter
2. Schedule con Critical Path identificado y fecha de completion aceptable para el sponsor
3. Cost Baseline dentro del budget del Charter (o re-negociado con sponsor)
4. Risk Register con top 10 riesgos con planes de respuesta
5. RACI completo — todo el equipo conoce sus responsabilidades
6. Plan de comunicaciones con todos los stakeholders de Poder Alto cubiertos
7. Project Management Plan aprobado formalmente por el sponsor

**Requiere más iteración de Planning:**
- Schedule o cost excede el Charter y no hay acuerdo con el sponsor
- Riesgos críticos identificados que pueden cancelar el proyecto — investigar antes de continuar
- Stakeholders de Poder Alto no alineados en scope o prioridades

---

## Artefacto esperado

`{wp}/pm-planning.md`

```yml
created_at: [timestamp]
project: [nombre]
work_package: [wp-id]
phase: pm:planning
author: [nombre]
status: Borrador
```

```markdown
## Project Management Plan — Resumen

### Scope Baseline
- WBS (summary view): [top 2 niveles]
- Scope exclusions: [qué está explícitamente fuera del scope]
- Constraints: [limitaciones de scope]

### Schedule Baseline
- Duración total: [semanas/meses]
- Critical Path: [actividades en el CP]
- Key milestones: | Milestone | Fecha baseline |
- Fecha de completion: [fecha]

### Cost Baseline
- BAC total: $[valor]
- Contingency reserves: $[valor]
- Management reserves: $[valor]
- Distribución por componente principal: | Componente | Costo |

### Quality Management Plan
- Estándares aplicables: [lista]
- Métricas de calidad: | Métrica | Objetivo | Umbral |
- QA activities: [lista]
- QC activities: [lista]

### Resource Management / RACI
[RACI por deliverable clave]

### Risk Register (top 10)
| Risk ID | Descripción | P | I | Score | Estrategia | Plan de respuesta |

### Communications Plan
| Información | Audiencia | Frecuencia | Formato |

### Stakeholder Engagement Plan
| Stakeholder | Estado actual | Estado deseado | Acciones |

## Aprobación del Project Management Plan
- Sponsor: [nombre]
- Fecha: [fecha]
- Aprobado: Sí / No / Con condiciones

## Evaluación de completitud
- [ ] WBS completo
- [ ] Critical Path identificado
- [ ] Cost Baseline dentro del budget
- [ ] Risk Register con planes de respuesta
- [ ] RACI completo
- [ ] Communications Plan completo
- [ ] Project Management Plan aprobado

## Decisión
- [ ] Avanzar a pm:executing
- [ ] Más iteración de planning (motivo: ...)
```

---

## Red Flags — señales de Planning mal ejecutado

- **WBS de 2 niveles** — un WBS con solo "Fases" y "Deliverables" no tiene suficiente granularidad para estimar costos ni asignar responsabilidades; el nivel de Work Package es fundamental
- **Cronograma sin Critical Path identificado** — un cronograma donde todas las actividades parecen igualmente importantes indica que el análisis de red no se realizó
- **Risk Register con solo 3-4 riesgos** — igual que en PDCA y RUP, un proyecto con muy pocos riesgos identificados tiene un Risk Register incompleto
- **RACI con muchos A por actividad** — si 3 personas son "Accountable" de la misma actividad, nadie es realmente accountable; hay que resolver antes de ejecutar
- **Plan aprobado solo por el PM** — el Project Management Plan debe ser aprobado por el sponsor; la aprobación del PM es insuficiente para autorizar el inicio de Executing
- **Costo estimado sin reservas de contingencia** — un budget sin reservas está optimizado para el caso ideal, no para la realidad de los proyectos

---

## Estado en now.md

**Al INICIAR este step:**
```yaml
methodology_step: pm:planning
flow: pm
pm_process_group: planning
```

**Al COMPLETAR** (Project Management Plan aprobado):
```yaml
methodology_step: pm:planning  # completado → listo para pm:executing
flow: pm
pm_process_group: planning
```

## Siguiente paso

- Project Management Plan aprobado → `pm:executing` (+ `pm:monitoring` en paralelo)
- Plan no aprobado → más iteración de `pm:planning` con gaps documentados

---

## Limitaciones

- El nivel de detalle del plan debe ser proporcional al tamaño y complejidad del proyecto — un proyecto pequeño no necesita 50 páginas de plan; un proyecto de $10M sí
- Las estimaciones de Planning tienen ±10-20% de accuracy (vs ±50% de Initiating) — son más precisas pero siguen siendo estimaciones; comprometer fechas y costos exactos en contratos basados en estimaciones de Planning es riesgoso
- El Project Management Plan es una baseline, no una camisa de fuerza — está diseñado para ser actualizado mediante el proceso de Change Control cuando la realidad difiere del plan
