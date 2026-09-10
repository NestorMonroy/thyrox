```yml
created_at: 2026-04-16 23:47:00
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 8 — PLAN EXECUTION
author: NestorMonroy
status: Aprobado — v2 (post deep-review)
```

# Task Plan — Skill Anatomy Completion (ÉPICA 40 — Batch 2)

> Plan de referencia: `plan/skill-anatomy-completion-plan.md`
> Análisis de base: `analyze/skill-anatomy-gap-analysis.md`
>
> **v2** — Actualizado tras deep-review de cobertura. Cambios vs v1:
> - T-002: eliminada `implementation-tracking.md` (no hay contenido Tier 2 real en pdca-do)
> - T-006: asset renombrado a `dmaic-project-charter-template.md` (evita colisión con T-023)
> - T-009: agregadas `lean-tools-guide.md` y `fmea-guide.md` (contenido Tier 2 omitido)
> - T-010: especificado contenido de `control-chart-guide.md` (3 tablas identificadas)
> - T-012: asset renombrado a `rup-inception-template.md` (artefacto cubre más que solo Vision)
> - T-018: asset renombrado a `rm-analysis-template.md` (evita colisión con T-031)
> - T-023: asset renombrado a `pm-initiating-template.md` + scope ampliado
> - T-024: especificados criterios de verificación de `planning-techniques.md`
> - T-025: especificado contenido de `team-management.md` (5 técnicas de conflicto PMBOK)
> - T-026: especificados criterios de verificación de `evm-and-change-control.md`
> - T-029: agregado segundo asset `ba-progress-template.md` + nota de Routing Table
> - T-030: agregada corrección de typo `ba-baplanning.md` → `ba-planning.md`
> - T-031: asset renombrado a `ba-requirements-analysis-template.md`
> - T-042: clarificado qué campos de now.md actualizar

---

## Convención de tarea

Cada T-NNN cubre un skill completo:
1. Crear `assets/{artefacto}-template.md`
2. Crear `references/{archivo}.md` (uno o más)
3. Actualizar `SKILL.md`: extraer contenido Tier 2 a references/, agregar links inline, agregar `## Reference Files` al final

---

## B1 — PDCA (4 skills)

- [x] T-001 `pdca-plan` — assets: pdca-plan-template.md · references: problem-analysis-techniques.md (5-Why, Fishbone 6M, Pareto), action-planning.md (SMART, Gantt mínimo, asignación responsables) · SKILL.md update
- [x] T-002 `pdca-do` — assets: pdca-do-template.md · *(sin references — contenido procedimental, no catálogo Tier 2)* · SKILL.md update
- [x] T-003 `pdca-check` — assets: pdca-check-template.md · references: measurement-tools.md (Run chart, Control chart tipos, before/after table, sample size) · SKILL.md update
- [x] T-004 `pdca-act` — assets: pdca-act-template.md · references: standardization-patterns.md (Yokoten, A3 Report template, SDCA cycle, SOP estructura) · SKILL.md update
- [x] T-005 Commit B1: `feat(pdca): complete skill anatomy — assets, references, SKILL.md updates`

## B2 — DMAIC (5 skills)

- [x] T-006 `dmaic-define` — assets: **dmaic-project-charter-template.md** (Charter con CTQs + VOC + SIPOC — distinto del Charter PMBOK) · references: voc-techniques.md (VOC→CTQ conversion tabla, 6 técnicas), sipoc-guide.md (SIPOC paso a paso, ejemplos, errores comunes) · SKILL.md update
- [x] T-007 `dmaic-measure` — assets: dmaic-measure-template.md · references: msa-gage-rr.md (Gage R&R tabla de decisión, Kappa Cohen, % contribution thresholds), process-capability.md (Cp/Cpk/Pp/Ppk fórmulas, tabla interpretación, 1.5σ shift) · SKILL.md update
- [x] T-008 `dmaic-analyze` — assets: dmaic-analyze-template.md · references: hypothesis-testing.md (H0/H1 templates, p-value decision table, test selection matrix), root-cause-tools.md (VSM symbols, Fishbone profundo, 5-Why con verificación, Scatter plot) · SKILL.md update
- [x] T-009 `dmaic-improve` — assets: dmaic-improve-template.md · references: doe-guide.md (full factorial vs fractional, factors/levels/runs), **lean-tools-guide.md** (5S/Kanban/SMED/MUDA 7 desperdicios/Jidoka/Heijunka — catálogo con tipo de waste que resuelve), **fmea-guide.md** (tabla RPN, escala Severidad/Ocurrencia/Detección, criterio >200 crítico/100-200 importante/<100 monitorear) · SKILL.md update
- [x] T-010 `dmaic-control` — assets: dmaic-control-template.md · references: control-chart-guide.md *(debe incluir: (1) 8 Reglas Western Electric completas con señal, (2) Plan de Reacción por señal — quién actúa/qué hace, (3) tabla selección tipo gráfica SPC por tipo de dato y tamaño de subgrupo)* · SKILL.md update
- [x] T-011 Commit B2: `feat(dmaic): complete skill anatomy — assets, references, SKILL.md updates`

## B3 — RUP (4 skills)

- [x] T-012 `rup-inception` — assets: **rup-inception-template.md** (cubre artefacto completo: Vision + UC Model + Risk List + Business Case + Plan inicial + LCO checklist) · references: lco-criteria.md (LCO evaluation criteria, concurrence checklist, decisiones típicas) · SKILL.md update
- [x] T-013 `rup-elaboration` — assets: elaboration-report-template.md · references: lca-criteria.md (LCA evaluation criteria, architecture baseline checklist, riesgos arquitectónicos), architecture-baseline.md (SAD estructura, 4+1 view model, ADR template para RUP) · SKILL.md update
- [x] T-014 `rup-construction` — assets: construction-report-template.md · references: ioc-criteria.md (IOC evaluation criteria, feature complete checklist, test coverage thresholds) · SKILL.md update
- [x] T-015 `rup-transition` — assets: transition-report-template.md · references: pd-criteria.md (PD evaluation criteria, deployment checklist, user acceptance criteria) · SKILL.md update
- [x] T-016 Commit B3: `feat(rup): complete skill anatomy — assets, references, SKILL.md updates`

## B4 — RM (5 skills)

- [x] T-017 `rm-elicitation` — assets: elicitation-report-template.md · references: elicitation-techniques.md (7 técnicas con ventajas/limitaciones/output) · SKILL.md update
- [x] T-018 `rm-analysis` — assets: **rm-analysis-template.md** (evita colisión de nombre con T-031) · references: analysis-patterns.md (MoSCoW tabla completa, conflict resolution, dependency mapping) · SKILL.md update
- [x] T-019 `rm-specification` — assets: requirements-spec-template.md · references: specification-standards.md (IEEE 830 estructura, Gherkin avanzado, acceptance criteria patterns) · SKILL.md update
- [x] T-020 `rm-validation` — assets: validation-report-template.md · references: validation-checklist.md (20-item checklist por tipo de requisito, defect taxonomy) · SKILL.md update
- [x] T-021 `rm-management` — assets: change-request-template.md · references: change-control-process.md (CCB proceso detallado, impact assessment template, change log format) · SKILL.md update
- [x] T-022 Commit B4: `feat(rm): complete skill anatomy — assets, references, SKILL.md updates`

## B5 — PMBOK (5 skills)

- [x] T-023 `pm-initiating` — assets: **pm-initiating-template.md** (cubre artefacto completo: Charter + Stakeholder Register + Power/Interest Grid + High-Level Risk Log) · references: project-charter-guide.md *(debe incluir: charter template completo + Power/Interest Grid 4 cuadrantes con estrategia + técnicas identificación de stakeholders)* · SKILL.md update
- [x] T-024 `pm-planning` — assets: project-plan-template.md · references: verificar `planning-techniques.md` (ya existe) — debe cubrir: WBS/regla 8-80, CPM, PERT, Fast Tracking/Crashing, Three-point estimation (triangular/beta), P×I Matrix 8 estrategias de respuesta, RACI regla 1-A · SKILL.md update (agregar `## Reference Files` si no existe)
- [x] T-025 `pm-executing` — assets: status-report-template.md · references: team-management.md *(debe incluir: tabla 5 técnicas de conflicto PMBOK con cuándo usar cada una, RACI con regla 1-A, señales de desengagement de stakeholders)* · SKILL.md update
- [x] T-026 `pm-monitoring` — assets: performance-report-template.md · references: verificar `evm-and-change-control.md` (ya existe) — debe cubrir: todas las fórmulas EVM (PV/EV/AC/SV/CV/SPI/CPI/EAC/ETC/VAC/TCPI), umbrales de varianza, flujo CCB completo, template Change Request · SKILL.md update (agregar `## Reference Files` si no existe)
- [x] T-027 `pm-closing` — assets: closure-report-template.md · references: project-closure-guide.md (closure checklist, lessons learned facilitation, contract closure, knowledge transfer) · SKILL.md update
- [x] T-028 Commit B5: `feat(pmbok): complete skill anatomy — assets, references, SKILL.md updates`

## B6 — BABOK (6 skills)

- [x] T-029 `ba-planning` — assets: ba-plan-template.md + **ba-progress-template.md** (tracking multi-KA: tabla 6 KAs con estado inicial + Routing History) · references: ba-approach-techniques.md (stakeholder engagement matrix, BA plan template, governance) · SKILL.md update *(nota: preservar Routing Table en el cuerpo del SKILL.md — es instrucción de navegación, no Tier 2)*
- [x] T-030 `ba-elicitation` — assets: elicitation-notes-template.md · references: elicitation-techniques.md (9 técnicas BABOK con protocolos detallados de JAD y Shadowing) · SKILL.md update *(incluir corrección de typo en Pre-condición: `ba-baplanning.md` → `ba-planning.md`)*
- [x] T-031 `ba-requirements-analysis` — assets: **ba-requirements-analysis-template.md** (evita colisión de nombre con T-018) · references: analysis-techniques.md (decision table, decision tree, process modeling, data modeling) · SKILL.md update
- [x] T-032 `ba-requirements-lifecycle` — assets: requirements-lifecycle-template.md · references: traceability-matrix.md (traceability matrix template, coverage analysis, impact assessment) · SKILL.md update
- [x] T-033 `ba-strategy` — assets: strategy-analysis-template.md · references: gap-analysis-guide.md (Current/Future state templates, gap categorization — capability/performance/knowledge/process, SWOT, Business Need tabla 4 elementos) · SKILL.md update
- [x] T-034 `ba-solution-evaluation` — assets: solution-evaluation-template.md · references: evaluation-techniques.md (KPI measurement framework, ROI calculation, adoption metrics, survey design) · SKILL.md update
- [x] T-035 Commit B6: `feat(babok): complete skill anatomy — assets, references, SKILL.md updates`

## B7 — Scripts selectivos (4 scripts independientes)

- [x] T-036 `dmaic-measure/scripts/calculate-capability.py` — Cp/Cpk desde CSV · SKILL.md update con invocación
- [x] T-037 `dmaic-control/scripts/check-control-limits.py` — Western Electric Rules · SKILL.md update
- [x] T-038 `rup-inception/scripts/check-lco-criteria.sh` — artefactos LCO en WP · SKILL.md update
- [x] T-039 `rm-management/scripts/count-requirements.sh` — conteo por estado en traceability matrix · SKILL.md update
- [x] T-040 Commit B7: `feat(scripts): add selective deterministic scripts to dmaic-measure, dmaic-control, rup-inception, rm-management`

## Cierre

- [x] T-041 Deep-review de cobertura: verificar que todos los 29 skills tienen anatomía completa y links válidos
- [x] T-042 Push final y actualizar `.thyrox/context/now.md` (campos: `stage`, `current_work`, `methodology_step: null`)

---

## DAG de dependencias

```
T-001 → T-002 → T-003 → T-004 → T-005 (B1 commit)
                                       ↓
T-006 → T-007 → T-008 → T-009 → T-010 → T-011 (B2 commit)
                                                ↓
T-012 → T-013 → T-014 → T-015 → T-016 (B3 commit)
                                        ↓
T-017 → T-018 → T-019 → T-020 → T-021 → T-022 (B4 commit)
                                                ↓
T-023 → T-024 → T-025 → T-026 → T-027 → T-028 (B5 commit)
                                                ↓
T-029 → T-030 → T-031 → T-032 → T-033 → T-034 → T-035 (B6 commit)

T-036, T-037, T-038, T-039 (paralelos entre sí) → T-040 (B7 commit)

T-005 + T-011 + T-016 + T-022 + T-028 + T-035 + T-040 → T-041 → T-042
```

**Nota T-029 → T-030:** T-030 depende de T-029 para corregir el typo `ba-baplanning.md` → `ba-planning.md` con el nombre del artefacto ya establecido.
**Nota T-006 / T-023:** Assets con nombre diferenciado — no hay confusión entre `dmaic-project-charter-template.md` y `pm-initiating-template.md`.

Los batches B1-B6 son secuenciales entre sí para facilitar revisión por metodología.
Los scripts B7 son independientes y pueden ejecutarse en paralelo al final.

---

## Resumen

| Batch | Skills | Tareas | Assets | References | Scripts |
|-------|--------|--------|--------|------------|---------|
| B1 PDCA | 4 | T-001..T-005 | 4 | 3 | 0 |
| B2 DMAIC | 5 | T-006..T-011 | 5 | 10 | 0 |
| B3 RUP | 4 | T-012..T-016 | 4 | 5 | 0 |
| B4 RM | 5 | T-017..T-022 | 5 | 5 | 0 |
| B5 PMBOK | 5 | T-023..T-028 | 5 | 3 | 0 |
| B6 BABOK | 6 | T-029..T-035 | 7 | 6 | 0 |
| B7 Scripts | 4 | T-036..T-040 | 0 | 0 | 4 |
| Cierre | — | T-041..T-042 | — | — | — |
| **Total** | **29** | **42** | **30** | **32** | **4** |
