```yml
created_at: 2026-04-17 16:47:19
feature: multi-methodology
wp: 2026-04-16-18-54-38-multi-methodology
fase: ÉPICA 40
commits: 101
```

# WP Changelog — multi-methodology (ÉPICA 40)

> Registro de cambios producidos por ÉPICA 40.
> Periodo: 2026-04-16 → 2026-04-17.

---

## Cambios producidos

### Added

**Namespaces de metodología nuevos (5 namespaces, 32 skills)**
- `lean:` — 5 skills: lean-define, lean-measure, lean-analyze, lean-improve, lean-control (a0954f1..e41ca5b)
- `pps:` — 6 skills: pps-clarify, pps-target, pps-analyze, pps-countermeasures, pps-implement, pps-evaluate (d27a8f6)
- `sp:` — 8 skills: sp-context, sp-analysis, sp-gaps, sp-formulate, sp-plan, sp-execute, sp-monitor, sp-adjust (78c5dda..0a10bb7)
- `cp:` — 7 skills: cp-initiation, cp-diagnosis, cp-structure, cp-recommend, cp-plan, cp-implement, cp-evaluate (0a10bb7)
- `bpa:` — 6 skills: bpa-identify, bpa-map, bpa-analyze, bpa-design, bpa-implement, bpa-monitor (0a10bb7)

**Registry YAMLs nuevos**
- `.thyrox/registry/methodologies/lean.yml` — type: sequential, 5 pasos, native_phase_count, produces/consumes (a0954f1)
- `.thyrox/registry/methodologies/pps.yml` — type: sequential, 6 pasos Toyota TBP (d27a8f6)
- `.thyrox/registry/methodologies/sp.yml` — type: sequential, 8 pasos con ciclo sp:adjust→sp:analysis (a0954f1)
- `.thyrox/registry/methodologies/cp.yml` — type: sequential, 7 pasos (a0954f1)
- `.thyrox/registry/methodologies/bpa.yml` — type: sequential, 6 pasos (a0954f1)

**Coordinator agents nuevos (5)**
- `.claude/agents/lean-coordinator.md` — color: cyan (a0954f1)
- `.claude/agents/pps-coordinator.md` — color: orange, A3 Report como artefacto central (a0954f1)
- `.claude/agents/sp-coordinator.md` — color: purple, retorno cíclico sp:adjust→sp:analysis (a0954f1)
- `.claude/agents/cp-coordinator.md` — color: yellow (a0954f1)
- `.claude/agents/bpa-coordinator.md` — color: teal (a0954f1)

**Meta-framework orchestration (Tier 4)**
- `.thyrox/registry/routing-rules.yml` — mapeo problema→coordinator con trigger_keywords (2b862c0)
- `.claude/skills/workflow-discover/assets/artifact-registry.md.template` — inter-coordinator coordination (2b862c0)
- `.claude/skills/workflow-discover/assets/orchestration-log.md.template` — historial de activaciones (2b862c0)
- `.claude/skills/thyrox/references/methodology-selection-guide.md` — 4 árboles de decisión entre metodologías similares (2b862c0)
- `.claude/skills/workflow-diagnose/references/root-cause-analysis-methodology.md` — guía RCA (8c0993f)

**Skill anatomy: 30 assets + 32 references (29 skills × anatomía completa)**
- Namespaces PDCA, DMAIC, RUP, RM, PMBOK, BABOK — cada skill con `assets/` + `references/` (commits B1-B7)
- 4 scripts determinísticos: `calculate-capability.py`, `check-control-limits.py`, `check-lco-criteria.sh`, `count-requirements.sh`

**Templates y reglas**
- `.claude/skills/workflow-decompose/assets/plan-execution.md.template` — template adaptativo con 3 convenciones (2d2099e)

### Changed

**Registry YAMLs existentes — artifact schema añadido**
- Todos los 11 YAMLs de registry actualizados con `native_phase_count`, `produces:`, `consumes:` (2b862c0)

**Coordinator agents existentes — artifact-ready signal**
- Los 11 coordinators tienen sección "Cierre — artifact-ready signal" con lista de artefactos por WP (2b862c0)

**`thyrox-coordinator.md` — rework completo**
- 5 preguntas diagnósticas de intake + tabla de routing automático basado en routing-rules.yml (2b862c0)

**`now.md` — nuevo campo `coordinators:`**
- Campo `coordinators: {}` con formato documentado para tracking per-coordinator (2b862c0)

**`scalability.md`**
- Rows lean/pps/sp/cp/bpa: eliminado `*(pendiente)*`
- Lenguaje "no-saltables" → "recomendados con alta prioridad" (2b862c0)
- Sección "Escalabilidad con methodology skill activo" — regla por flow (088e041)

**`thyrox/SKILL.md`**
- Sección "Methodology skills" con tabla de 11 namespaces (088e041)
- Sección "Arquitectura de orquestación" — dos niveles (stages + methodology skills) (088e041)
- Sección "Selección por necesidad" extendida: lean, pps, sp, cp, bpa añadidos (8c0993f)

**`plugin.json`**
- Descripción actualizada: menciona 11 namespaces activos (8c0993f)

**4 coordinators existentes — `skills:` array añadido**
- `pmbok-coordinator.md`, `babok-coordinator.md`, `rup-coordinator.md`, `rm-coordinator.md` (b268bca)

**`bootstrap.py`**
- Política de coordinators estáticos documentada: no generados dinámicamente, con justificación (2b862c0)

**`metadata-standards.md`**
- Reglas de colocación de artefactos en cajones añadidas (2d2099e)

**`workflow-decompose/SKILL.md`**
- Referencia a `plan-execution.md.template` y regla de cajón `plan-execution/` (2d2099e)

### Fixed

- `ps8.yml` → `pps.yml`: renombrado para alinear con Toyota TBP, no Ford 8D (d27a8f6)
- Stale checkboxes en `implementation-plan.md` (21), `skill-anatomy-task-plan.md` (2), `thyrox-skill-update-task-plan.md` (7) (5cca0ac)
- `now.md` + `focus.md`: declaración prematura "ÉPICA 40 completada" corregida → Stage 10 done, Stage 11 pending (492eb69)

---

## Commits de este WP (selección)

| Hash | Tipo | Descripción |
|------|------|-------------|
| d27a8f6 | refactor | rename ps8: → pps: (Practical Problem Solving) |
| a0954f1 | feat | Tier 1 — registry YAMLs + coordinator agents (T-002..T-010) |
| b268bca | feat | Tier 2 — skills: arrays + metadata.triggers 32 skills (T-011..T-015) |
| 8c0993f | feat | Tier 3 — docs, SKILL.md labels, plugin.json, RCA guide (T-016..T-021) |
| 2b862c0 | feat | Tier 4 — meta-framework orchestration (T-022..T-031) |
| 088e041 | docs | document methodology skills and orchestration architecture |
| 5cca0ac | fix | sync stale checkboxes across all plan-execution docs |
| 492eb69 | fix | correct ÉPICA 40 status — Stage 10 done, Stage 11 pending |
| 2d2099e | feat | add plan-execution template + WP categorization rules |

> Total: ~101 commits en el WP (2026-04-16 → 2026-04-17).
> Ver `git log --oneline --since="2026-04-16"` para lista completa.

---

## Notas de release

- **Versión sugerida:** v2.8.0
- **Tipo:** MINOR — 5 nuevos namespaces metodológicos, 32 skills, meta-framework orchestration layer
- **Razón:** Adición de lean/pps/sp/cp/bpa + routing automático + artifact-ready signals es una extensión significativa del framework sin breaking changes
