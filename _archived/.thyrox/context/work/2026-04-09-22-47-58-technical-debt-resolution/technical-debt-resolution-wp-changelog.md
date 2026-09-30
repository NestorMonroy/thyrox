```yml
created_at: 2026-04-10 04:30:00
feature: technical-debt-resolution
wp: 2026-04-09-22-47-58-technical-debt-resolution
fase: FASE 29
commits: 28
```

# WP Changelog — technical-debt-resolution

> Registro de cambios producidos por FASE 29.
> 28 commits desde 2026-04-09 22:47 hasta 2026-04-10 04:30.

---

## Cambios producidos

### Added

- `wp-changelog.md.template` — Template Phase 7 para registro por WP (D2) (`d0dd79e`)
- `technical-debt-resolved.md.template` — Template Phase 7 para TDs cerrados/archivados (D3) (`d0dd79e`)
- `technical-debt-resolution-technical-debt-resolved.md` — 10 TDs registrados: 6 [x] + 4 [-] (`0dd8ebb`)
- `technical-debt-resolution-lessons-learned.md` — 5 lecciones L-118..L-122 (Phase 7)
- `technical-debt-resolution-wp-changelog.md` — Este archivo (Phase 7)
- `ROADMAP-history.md` — FASEs 1–26 archivadas por REGLA-LONGEV-001 (`1cb8d3c`)
- `CHANGELOG-archive.md` — versiones v0.x/v1.x archivadas (`032f154`)
- Alerta B-08 en `project-status.sh` — detecta WP activo sin entrada en ROADMAP.md (`6b2a729`)
- Alerta B-09 en `session-start.sh` — detecta Phase 6 sin execution-log.md (`6b2a729`)
- Step 0 END USER CONTEXT en `workflow-analyze/SKILL.md` (TD-007) (`d07dbc5`)
- Validaciones pre-gate (TD-029/031/033) en los 7 `workflow-*/SKILL.md` (`d07dbc5`..`252484d`)
- Criterio auto-write (TD-027A) + pre-flight checklist (TD-032) en `workflow-execute/SKILL.md` (`4092585`)
- Re-evaluación tamaño WP (TD-028) en `workflow-strategy/SKILL.md` (`6110c83`)
- REGLA-LONGEV-001 en `conventions.md` — umbral 25,000 bytes + procedimiento de split (`8a402be`)
- Check 5 timestamps en `validate-session-close.sh` (TD-018) (`8a402be`)

### Changed

- `pm-thyrox/` → `thyrox/` — skill orquestador renombrado (git mv, historia preservada) (`6b2a729`)
- `thyrox/SKILL.md`: `name: pm-thyrox` → `name: thyrox`; Phase 7 table actualizada (`6b2a729`)
- `ROADMAP.md` → trimmed a FASEs 27-29 (4,611 bytes < 25,000) (`1cb8d3c`)
- `CHANGELOG.md` → trimmed a v2.x (11,491 bytes < 25,000) (`032f154`)
- `workflow-track/SKILL.md` — artefactos D2+D3 + validaciones pre-cierre (`252484d`)
- `thyrox/SKILL.md` — tabla artefactos Phase 7 + WP changelog + TDs resueltos rows (`d0dd79e`)
- `conventions.md` — 3 nuevas reglas: REGLA-LONGEV-001, timestamps, CHANGELOG raíz (`8a402be`)
- `CLAUDE.md` — Addendum FASE 29: Locked Decision #5 actualizado (`6b2a729`)
- `project-state.md` — v2.5.0, FASE 29 añadida, paths thyrox actualizados
- 12 archivos `.claude/references/*.md` — replace_all pm-thyrox → thyrox (`6b2a729`)

### Fixed

- Referencias `pm-thyrox` en archivos activos: commit-helper.md, spec-driven-development.md, incremental-correction.md, reference-validation.md, test-phase-readiness.sh, migrate-metadata-keys.py, sphinx/SKILL.md (`3dce5ae`)
- Anchors rotos `#integracion-con-pm-thyrox` → `#integracion-con-thyrox` (`3dce5ae`)
- TD-006/021/027 titles en technical-debt.md (`3dce5ae`)
- TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 marcados [x] en technical-debt.md (`b4e4d8f`)

### Removed

- TD-019, TD-020, TD-023, TD-024 ([-] desde FASE 23) removidos de technical-debt.md → WP resolved (`0dd8ebb`)

---

## Commits de este WP

| Hash | Tipo | Descripción |
|------|------|-------------|
| 3dce5ae | fix | referencias pm-thyrox → thyrox en referencias y contexto |
| b4e4d8f | fix | cerrar TD-002/004/011/016/017/021 en technical-debt.md |
| 0dd8ebb | docs | split technical-debt — TDs [-] de FASE 23 a WP resolved |
| 032f154 | docs | split CHANGELOG.md — v0.x/v1.x archivadas |
| 1cb8d3c | docs | split ROADMAP.md — FASEs 1-26 archivadas |
| 8a402be | docs | conventions REGLA-LONGEV-001 + timestamps + CHANGELOG root rule |
| 252484d | docs | track TD-029/031/033 validaciones pre-gate |
| 4092585 | docs | execute TD-027A auto-write + TD-029/031/032/033 validaciones |
| fa42b97 | docs | decompose TD-029/031/033 validaciones pre-gate |
| ac49b1f | docs | structure TD-029/031/033 validaciones pre-gate |
| d26cdd5 | docs | plan TD-029/031/033 validaciones pre-gate |
| 6110c83 | docs | strategy TD-028 WP size + TD-029/031/033 validaciones |
| d07dbc5 | docs | analyze TD-007 Step0 + TD-029/031/033 validaciones |
| d0dd79e | feat | track templates Phase 7 + artefactos {wp}-changelog y {wp}-td-resolved |
| 6b2a729 | refactor | renombrar pm-thyrox → thyrox + alertas B-08/B-09 |

(+ 13 commits de Phases 1-5)

---

## Notas de release

- Versión: v2.5.0
- Tipo de cambio: MINOR
- Razón: Rename de skill orquestador + mejoras metodológicas (validaciones pre-gate, Phase 7 templates, REGLA-LONGEV-001). Sin breaking changes en la API de uso.
