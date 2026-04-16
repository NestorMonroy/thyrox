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

- [ ] Contrato `now.md::phase = "{metodologia}-{step}"` definido y documentado
- [ ] Patrón 3 vs Patrón 5 con decisión formal (ADR)
- [ ] 4-5 metodologías prioritarias seleccionadas para implementación corto plazo
- [ ] Schema YAML de registry diseñado (aunque no implementado aún)
- [ ] Campo `flow:` en now.md especificado

## Phase 6 PLAN → Phase 8 PLAN EXECUTION

> Saltamos Phase 7 DESIGN (la spec es el contrato definido en Strategy + los SKILL.md individuales).

- [ ] Scope declarado: qué entra y qué queda fuera de este WP
- [ ] ROADMAP.md actualizado con FASE 40
- [ ] Decisión sobre GAP-010 (`.gitignore`) incluida en scope

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
