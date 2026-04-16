```yml
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
created_at: 2026-04-16 18:54:38
updated_at: 2026-04-16 18:54:38
current_phase: Phase 1 — DISCOVER
author: NestorMonroy
```

# Exit Conditions — multi-methodology (FASE 40)

## Phase 1 DISCOVER → Phase 5 STRATEGY

> Saltamos Phase 2 MEASURE (sin baseline cuantitativo relevante) y Phase 3-4 (análisis y
> constraints ya documentados en plugin-distribution/analyze/ — base suficiente).

- [x] WP creado con timestamp real
- [x] Análisis de referencia localizado y documentado en discover/
- [x] GAPs priorizados y numerados
- [x] Riesgos registrados en risk-register.md
- [x] **GATE: usuario valida scope y ruta de fases** — aprobado 2026-04-16

## Stage 5 STRATEGY → Stage 6 SCOPE

- [x] Contrato `now.md::methodology_step = "{flow}:{step-id}"` definido
- [x] ADR terminología ÉPICA/Stage aprobado
- [x] 6 metodologías confirmadas: PDCA, DMAIC, PMBOK, BABOK, RUP, RM
- [x] Schema YAML del registry diseñado para los 5 tipos de flujo
- [x] Campos `flow`, `methodology_step` especificados

## Stage 6 SCOPE → Stage 8 PLAN EXECUTION

> Saltamos Stage 7 DESIGN/SPECIFY — spec es el contrato de Stage 5 + SKILL.md individuales.

- [x] Scope declarado: in-scope y out-of-scope explícitos
- [x] ROADMAP.md actualizado con ÉPICA 40
- [x] GAP-010 (`.gitignore`) explícitamente out-of-scope por decisión del usuario

## Phase 8 PLAN EXECUTION → Phase 10 EXECUTE

- [ ] Task plan con T-NNN para cada entregable
- [ ] DAG de dependencias (GAP-010 primero, luego coordinators, luego registry)
- [ ] Stopping points definidos (especialmente gate antes de implementar Patrón 5)

## Phase 10 EXECUTE → Phase 11 TRACK

- [ ] GAP-010 resuelto (`.gitignore` actualizado)
- [ ] `now.md` tiene campo `flow:` implementado
- [ ] Al menos 1 coordinator (pdca-coordinator) funcional con `isolation: worktree`
- [ ] Al menos 4 skills PDCA creados y registrados
- [ ] `WorktreeCreate` hook en hooks.json
- [ ] Schema YAML de registry con al menos sdlc.yml y pdca.yml
- [ ] Tests de idempotencia pasados

## Phase 11 TRACK → Phase 12 STANDARDIZE

- [ ] Lessons learned documentadas
- [ ] PAT-NNN para patrones reutilizables (coordinator genérico, YAML schema, etc.)
- [ ] TDs abiertos registrados en technical-debt.md
