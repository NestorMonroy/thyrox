```yml
created_at: 2026-04-16 23:47:00
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 8 — PLAN EXECUTION
author: NestorMonroy
status: Borrador
```

# Task Plan — Skill Anatomy Completion (ÉPICA 40 — Batch 2)

> Plan de referencia: `plan/skill-anatomy-completion-plan.md`
> Análisis de base: `analyze/skill-anatomy-gap-analysis.md`
>
> Cada tarea cubre la anatomía completa de 1 skill:
> assets/ + references/ + actualización de SKILL.md con `## Reference Files`.
> Las tareas de scripts van al final (B7) por ser independientes.

---

## Convención de tarea

Cada T-NNN cubre un skill completo:
1. Crear `assets/{artefacto}-template.md`
2. Crear `references/{archivo}.md` (uno o más)
3. Actualizar `SKILL.md`: extraer contenido Tier 2 a references/, agregar links inline, agregar `## Reference Files` al final

---

## B1 — PDCA (4 skills)

- [ ] T-001 `pdca-plan` — assets: pdca-plan-template.md · references: problem-analysis-techniques.md, action-planning.md · SKILL.md update
- [ ] T-002 `pdca-do` — assets: pdca-do-template.md · references: implementation-tracking.md · SKILL.md update
- [ ] T-003 `pdca-check` — assets: pdca-check-template.md · references: measurement-tools.md · SKILL.md update
- [ ] T-004 `pdca-act` — assets: pdca-act-template.md · references: standardization-patterns.md · SKILL.md update
- [ ] T-005 Commit B1: `feat(pdca): complete skill anatomy — assets, references, SKILL.md updates`

## B2 — DMAIC (5 skills)

- [ ] T-006 `dmaic-define` — assets: project-charter-template.md · references: voc-techniques.md, sipoc-guide.md · SKILL.md update
- [ ] T-007 `dmaic-measure` — assets: dmaic-measure-template.md · references: msa-gage-rr.md, process-capability.md · SKILL.md update
- [ ] T-008 `dmaic-analyze` — assets: dmaic-analyze-template.md · references: hypothesis-testing.md, root-cause-tools.md · SKILL.md update
- [ ] T-009 `dmaic-improve` — assets: dmaic-improve-template.md · references: doe-guide.md · SKILL.md update
- [ ] T-010 `dmaic-control` — assets: dmaic-control-template.md · references: control-chart-guide.md · SKILL.md update
- [ ] T-011 Commit B2: `feat(dmaic): complete skill anatomy — assets, references, SKILL.md updates`

## B3 — RUP (4 skills)

- [ ] T-012 `rup-inception` — assets: inception-vision-template.md · references: lco-criteria.md · SKILL.md update
- [ ] T-013 `rup-elaboration` — assets: elaboration-report-template.md · references: lca-criteria.md, architecture-baseline.md · SKILL.md update
- [ ] T-014 `rup-construction` — assets: construction-report-template.md · references: ioc-criteria.md · SKILL.md update
- [ ] T-015 `rup-transition` — assets: transition-report-template.md · references: pd-criteria.md · SKILL.md update
- [ ] T-016 Commit B3: `feat(rup): complete skill anatomy — assets, references, SKILL.md updates`

## B4 — RM (5 skills)

- [ ] T-017 `rm-elicitation` — assets: elicitation-report-template.md · references: elicitation-techniques.md · SKILL.md update
- [ ] T-018 `rm-analysis` — assets: requirements-analysis-template.md · references: analysis-patterns.md · SKILL.md update
- [ ] T-019 `rm-specification` — assets: requirements-spec-template.md · references: specification-standards.md · SKILL.md update
- [ ] T-020 `rm-validation` — assets: validation-report-template.md · references: validation-checklist.md · SKILL.md update
- [ ] T-021 `rm-management` — assets: change-request-template.md · references: change-control-process.md · SKILL.md update
- [ ] T-022 Commit B4: `feat(rm): complete skill anatomy — assets, references, SKILL.md updates`

## B5 — PMBOK (5 skills)

- [ ] T-023 `pm-initiating` — assets: project-charter-template.md · references: project-charter-guide.md · SKILL.md update
- [ ] T-024 `pm-planning` — assets: project-plan-template.md · references: verificar cobertura planning-techniques.md (ya existe) · SKILL.md update
- [ ] T-025 `pm-executing` — assets: status-report-template.md · references: team-management.md · SKILL.md update
- [ ] T-026 `pm-monitoring` — assets: performance-report-template.md · references: verificar cobertura evm-and-change-control.md (ya existe) · SKILL.md update
- [ ] T-027 `pm-closing` — assets: closure-report-template.md · references: project-closure-guide.md · SKILL.md update
- [ ] T-028 Commit B5: `feat(pmbok): complete skill anatomy — assets, references, SKILL.md updates`

## B6 — BABOK (6 skills)

- [ ] T-029 `ba-planning` — assets: ba-plan-template.md · references: ba-approach-techniques.md · SKILL.md update
- [ ] T-030 `ba-elicitation` — assets: elicitation-notes-template.md · references: elicitation-techniques.md · SKILL.md update
- [ ] T-031 `ba-requirements-analysis` — assets: requirements-analysis-template.md · references: analysis-techniques.md · SKILL.md update
- [ ] T-032 `ba-requirements-lifecycle` — assets: requirements-lifecycle-template.md · references: traceability-matrix.md · SKILL.md update
- [ ] T-033 `ba-strategy` — assets: strategy-analysis-template.md · references: gap-analysis-guide.md · SKILL.md update
- [ ] T-034 `ba-solution-evaluation` — assets: solution-evaluation-template.md · references: evaluation-techniques.md · SKILL.md update
- [ ] T-035 Commit B6: `feat(babok): complete skill anatomy — assets, references, SKILL.md updates`

## B7 — Scripts selectivos (4 scripts independientes)

- [ ] T-036 `dmaic-measure/scripts/calculate-capability.py` — Cp/Cpk desde CSV · SKILL.md update con invocación
- [ ] T-037 `dmaic-control/scripts/check-control-limits.py` — Western Electric Rules · SKILL.md update
- [ ] T-038 `rup-inception/scripts/check-lco-criteria.sh` — artefactos LCO en WP · SKILL.md update
- [ ] T-039 `rm-management/scripts/count-requirements.sh` — conteo por estado en traceability matrix · SKILL.md update
- [ ] T-040 Commit B7: `feat(scripts): add selective deterministic scripts to dmaic-measure, dmaic-control, rup-inception, rm-management`

## Cierre

- [ ] T-041 Deep-review de cobertura: verificar que todos los 29 skills tienen anatomía completa y links válidos
- [ ] T-042 Push final y actualizar now.md

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

Los batches B1-B6 son secuenciales entre sí para facilitar revisión por metodología.
Los scripts B7 son independientes y pueden ejecutarse en paralelo al final.

---

## Resumen

| Batch | Skills | Tareas | Assets | References | Scripts |
|-------|--------|--------|--------|------------|---------|
| B1 PDCA | 4 | T-001..T-005 | 4 | 4 | 0 |
| B2 DMAIC | 5 | T-006..T-011 | 5 | 8 | 0 |
| B3 RUP | 4 | T-012..T-016 | 4 | 5 | 0 |
| B4 RM | 5 | T-017..T-022 | 5 | 5 | 0 |
| B5 PMBOK | 5 | T-023..T-028 | 5 | 3 | 0 |
| B6 BABOK | 6 | T-029..T-035 | 6 | 6 | 0 |
| B7 Scripts | 4 | T-036..T-040 | 0 | 0 | 4 |
| Cierre | — | T-041..T-042 | — | — | — |
| **Total** | **29** | **42** | **29** | **31** | **4** |
