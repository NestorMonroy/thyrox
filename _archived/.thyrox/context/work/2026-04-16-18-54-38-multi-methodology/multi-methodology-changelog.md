```yml
created_at: 2026-04-16 23:19:43
feature: multi-methodology
wp: 2026-04-16-18-54-38-multi-methodology
fase: ÉPICA 40
commits: 38
```

# WP Changelog — multi-methodology (ÉPICA 40)

> Registro de cambios producidos por ÉPICA 40: expansión del framework THYROX a 6 metodologías con 20 skills especializados, 7 coordinators, y CSO improvements.

---

## Cambios producidos

### Added

- 20 methodology skills nuevos: RM (5), RUP (4), PMBOK (5), BABOK (6) (710cefb, 24be441, 8c0e63c, c1a0d70)
- 9 skills PDCA y DMAIC con contenido enriquecido (647bbff, e456ba3)
- 7 coordinators: pdca, dmaic, rup, pmbok, babok, rm, thyrox-coordinator genérico (ebb8221)
- Registry YAML para 6 metodologías: pdca, dmaic, rup, rm, pmbok, babok (d0c5b48)
- Scripts de hooks: WorktreeCreate/Remove, sync-wp-state, stop-hook-git-check (d0c5b48, 83fca56)
- `metadata.triggers` en 20 methodology skills para CSO (c9f42f0)
- Anti-rationalization tables en pdca-plan, dmaic-define, rup-elaboration (90918f1)
- Mermaid diagrams en 8 methodology skills: BABOK routing, RM state machine, RUP phases, PDCA cycle, DMAIC cycle, CCB flow, EVM cycle, Construction iterations (fe918cc)
- `pm-planning/references/planning-techniques.md` — WBS, Schedule, Cost, Risk, Communications, RACI detail (069f965)
- `pm-monitoring/references/evm-and-change-control.md` — EVM variables, variance metrics, CCB process (069f965)
- ADR terminología ÉPICA/Stage + desambiguación metodologías (092237d)

### Changed

- `ba-baplanning/` → `ba-planning/` (rename con git mv, historial preservado) (037528b)
- Namespace `pmbok:*` → `pm:*` en registry YAML, coordinator, todos los skills PMBOK (037528b)
- Namespace `babok:*` → `ba:*` en registry YAML, coordinator, todos los skills BABOK (037528b)
- `babok-progress.md` → `ba-progress.md` en babok-coordinator (037528b)
- Registry YAML: `id: pmbok` → `id: pm`, `id: babok` → `id: ba` (037528b)
- pm-planning: 325 → 207 líneas (Tier 2 refactor) (069f965)
- pm-monitoring: 328 → 277 líneas (Tier 2 refactor) (069f965)
- Glosario CLAUDE.md: `pmbok:executing` → `pm:executing` (9d56cda)
- README.md metodologías: ejemplos `pmbok:/babok:` → `pm:/ba:` (9d56cda)

### Fixed

- Deep-review corrections Batch 1: GAP-C1/C2, GAP-I1/I2/I3/I6/I9/I11 (ff09798)
- Deep-review corrections Batch 2: deep-review gaps post CSO (9d56cda)
- `ba-solution-evaluation/SKILL.md:40`: `ba:baplanning` → `ba:planning` (9d56cda)
- Hooks WorktreeCreate/Remove formato y path sync (4c0363c)
- `validate-session-close.sh`: detección correcta de WPs activos (13e86bf)
- `stop-hook-git-check`: duplicado de validate-session-close eliminado (794bb60)

### Removed

- Directorio `ba-baplanning/` (reemplazado por `ba-planning/`) (037528b)
- Directorio `pmbok-*/` → renombrado a `pm-*/` para PMBOK skills (487b6a8)
- Directorio `babok-*/` → renombrado a `ba-*/` para BABOK skills (487b6a8)

---

## Commits de este WP

| Hash | Tipo | Descripción |
|------|------|-------------|
| 9d56cda | fix | deep-review gaps — ba:baplanning residual, pmbok:/babok: examples in docs |
| 13189a1 | chore | update now.md — CSO improvements plan completado |
| 069f965 | refactor | Cambio C — Tier 2 refactor pm-planning y pm-monitoring |
| fe918cc | feat | Cambio E — Mermaid diagrams en 8 methodology skills |
| 90918f1 | feat | Cambio B — anti-rationalization tables en pdca/dmaic/rup |
| c9f42f0 | feat | Cambio A — metadata.triggers en 20 methodology skills |
| 037528b | refactor | Cambio 0+F — rename ba-baplanning→ba-planning, pmbok:*/babok:* namespaces |
| 8b5766e | docs | add Cambio E y F al CSO plan |
| f9b9351 | docs | add CSO improvements plan |
| ff09798 | fix | apply deep-review corrections — múltiples GAPs |
| 794bb60 | fix | remove duplicate validate-session-close call |
| 487b6a8 | refactor | rename pmbok-* → pm-* and babok-* → ba-* |
| fa74c39 | chore | mark all 38 tasks complete |
| c1a0d70 | feat | add Batch 4 — BABOK 6 skills |
| 8c0e63c | feat | add Batch 3 — PMBOK 5 skills |
| 24be441 | feat | add Batch 2 — RUP 4 skills + task plan |
| 710cefb | feat | add Batch 1 — RM 5 skills |
| a98c0c7 | docs | enrich skills expansion plan |
| 64de54a | fix | apply deep-review corrections to PDCA/DMAIC skills |
| e456ba3 | feat | enrich PDCA and DMAIC skills with depth |
| 4c0363c | fix | corregir formato WorktreeCreate/Remove |
| 64e5a02 | chore | registrar artefacto de prueba T-031 |
| 72acd97 | test | T-031/T-032 PASS — registry y worktree isolation |
| 1c01e90 | chore | actualizar estado 36/38 tareas |
| 22b9af3 | docs | T-033/T-034 — ejemplos coordinator |
| bbc2ea1 | refactor | T-027..T-030/T-037/T-038 — renames + observabilidad |
| ebb8221 | feat | T-020..T-026 — 6 coordinators + thyrox-coordinator |
| 647bbff | feat | T-011..T-019 — 9 skills PDCA y DMAIC |
| d0c5b48 | feat | T-002/T-003/T-005/T-006/T-009/T-010/T-036 — scripts + registry YAMLs |
| 83fca56 | feat | T-001/T-007/T-008/T-035 — hooks + RUP/RM schemas |
| 935b2d4 | docs | task-plan v2 post deep-review — 38 T-NNN |
| 2e77acb | docs | Stage 8 PLAN EXECUTION — task-plan 34 T-NNN |
| f58dc44 | docs | Stage 6 SCOPE — plan aprobado |
| 3f6da4d | docs | Stage 5 STRATEGY — solution strategy aprobada |
| 092237d | docs | ADR terminología ÉPICA/Stage |
| 6069b52 | docs | Phase 1 DISCOVER — FASE 40 iniciada |

---

## Notas de release

> Este WP representa una expansión significativa del framework THYROX — de soporte PDCA/DMAIC a 6 metodologías completas. Merece un bump de versión MINOR cuando se haga merge a main.
> - Versión sugerida: MINOR (nuevas capacidades sin breaking changes para usuarios existentes)
> - Razón: 20 nuevos skills + 7 coordinators + CSO improvements son adiciones, no reestructuras de lo existente
