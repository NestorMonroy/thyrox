```yml
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
created_at: 2026-04-16 21:16:07
current_phase: Phase 10 — IMPLEMENT
author: NestorMonroy
```

# Task Plan: Skills de Metodología — PMBOK, BABOK, RM, RUP

## Contexto

Implementación de 20 skills de metodología nuevos + correcciones a los 9 existentes (PDCA/DMAIC).
Plan de referencia: `plan/methodology-skills-expansion-plan.md`
Checklist de calidad a aplicar en cada skill: ver plan, sección "Checklist de calidad".

---

## FASE 0 — Correcciones PDCA/DMAIC (prerequisito)

- [x] T-001 Corregir pdca-plan (disable-model-invocation, pre-condición, yml template, now.md split, 5W2H, Red Flags)
- [x] T-002 Corregir pdca-do (disable-model-invocation, pre-condición, THYROX stage, Gemba Walk, Red Flag presión)
- [x] T-003 Corregir pdca-check (disable-model-invocation, pre-condición, sample size table, Run Chart, CLT)
- [x] T-004 Corregir pdca-act (disable-model-invocation, pre-condición, Yokoten, A3 Report, stakeholder comms, regression case)
- [x] T-005 Corregir dmaic-define (disable-model-invocation, pre-condición, VOC completo DD-001 CRÍTICO, VOB, RACI)
- [x] T-006 Corregir dmaic-measure (disable-model-invocation, pre-condición, Process Map, Kappa Cohen, 1.5σ shift, RF-003)
- [x] T-007 Corregir dmaic-analyze (disable-model-invocation, pre-condición, VSM, H0/H1, criterios causalidad)
- [x] T-008 Corregir dmaic-improve (disable-model-invocation, pre-condición, Lean tools, Impact×Effort, RPN scale, criterio piloto)
- [x] T-009 Corregir dmaic-control (disable-model-invocation, pre-condición, 8 Western Electric Rules, Visual Mgmt, lecciones, quitar CLAUDE.md ref)
- [x] T-010 Commit y push FASE 0 (feat: apply deep-review corrections to all 9 PDCA/DMAIC skills)

---

## FASE 1 — Plan enriquecido

- [x] T-011 Crear plan inicial methodology-skills-expansion-plan.md en WP
- [x] T-012 Deep-review de referencias + web search + actualización del plan con gaps análogos, VOC-equivalent, checklist calidad

---

## BATCH 1 — RM (5 skills)

- [x] T-013 Crear rm-elicitation (7 técnicas, confirmación, retorno condicional desde rm:analysis)
- [x] T-014 Crear rm-analysis (IEEE 830 checklist, MoSCoW, Kano, criterios retorno cuantitativos)
- [x] T-015 Crear rm-specification (SRS/BRD/UserStories tabla, INVEST, Given/When/Then, NFR, baseline)
- [x] T-016 Crear rm-validation (verificación vs validación, Fagan inspection, sign-off matrix, retorno condicional)
- [x] T-017 Crear rm-management (CCB process, impact matrix, trazabilidad forward/backward, Kanban CRs, glosario)
- [x] T-018 Commit Batch 1 RM

---

## BATCH 2 — RUP (4 skills)

- [x] T-019 Crear rup-inception (Vision Doc, LCO criteria, tabla disciplinas, iteración counter, stakeholder workshops)
- [x] T-020 Crear rup-elaboration (SAD, architecture prototype, LCA criteria, BDUF prevention, 80% use cases)
- [x] T-021 Crear rup-construction (iterative releases, IOC criteria, deuda técnica documentada, UAT)
- [x] T-022 Crear rup-transition (PD criteria, deployment, acceptance sign-off, lecciones por iteración)
- [x] T-023 Commit Batch 2 RUP

---

## BATCH 3 — PMBOK (5 skills)

- [x] T-024 Crear pmbok-initiating (Project Charter, stakeholder register, Power/Interest grid, high-level risks)
- [x] T-025 Crear pmbok-closing (final acceptance, lessons learned por KA, archive checklist, contract closure)
- [x] T-026 Crear pmbok-executing (Direct&Manage, quality audits, resource assignment, stakeholder engagement)
- [x] T-027 Crear pmbok-monitoring (EVM completo 10 métricas, Integrated Change Control, causalidad vs correlación)
- [x] T-028 Crear pmbok-planning (10 KAs, WBS, CPM/PERT, cost estimation, P×I risk matrix, RACI, Comms Plan)
- [x] T-029 Commit Batch 3 PMBOK

---

## BATCH 4 — BABOK (6 skills)

- [x] T-030 Crear babok-baplanning (BA Plan, stakeholder engagement matrix, RACI, babok-progress.md structure)
- [x] T-031 Crear babok-elicitation (7 técnicas con criterios, confirmación, Routing Table)
- [x] T-032 Crear babok-requirements-lifecycle (trazabilidad, MoSCoW, change impact, Routing Table)
- [x] T-033 Crear babok-strategy (current/future state, gap analysis, SWOT, Business Need, Routing Table)
- [x] T-034 Crear babok-requirements-analysis (use cases, INVEST, verificación vs validación, Routing Table)
- [x] T-035 Crear babok-solution-evaluation (KPI dashboard, value realization, lecciones BA process, Routing Table)
- [x] T-036 Commit Batch 4 BABOK

---

## FASE FINAL

- [x] T-037 Push total a remote
- [x] T-038 Actualizar now.md con estado completado

---

## Progreso

| Batch | Total | Completados | % |
|-------|-------|-------------|---|
| FASE 0 (PDCA/DMAIC corrections) | 10 | 10 | 100% |
| FASE 1 (Plan) | 2 | 2 | 100% |
| Batch 1 — RM | 6 | 6 | 100% |
| Batch 2 — RUP | 5 | 5 | 100% |
| Batch 3 — PMBOK | 6 | 6 | 100% |
| Batch 4 — BABOK | 7 | 7 | 100% |
| FASE FINAL | 2 | 2 | 100% |
| **Total** | **38** | **38** | **100%** |
