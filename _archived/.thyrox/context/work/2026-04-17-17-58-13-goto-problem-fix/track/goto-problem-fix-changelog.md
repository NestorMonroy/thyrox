```yml
created_at: 2026-04-18 01:58:20
feature: goto-problem-fix
wp: 2026-04-17-17-58-13-goto-problem-fix
fase: ÉPICA 41
commits: 45
```

# WP Changelog — goto-problem-fix (ÉPICA 41)

> Cambios producidos por ÉPICA 41: corrección de goto-problems en scripts de sesión,
> remediación de audit, creación de workflow-audit skill, mejoras al sistema,
> y reposicionamiento de identidad THYROX de "framework" a sistema de Agentic AI.

---

## Cambios producidos

### Added

- `adr-thyrox-agentic-ai-identity.md` — ADR identidad canónica THYROX como sistema de Agentic AI, independiente de plataforma (b482033)
- Addendum `adr-arquitectura-orquestacion-thyrox.md` — pm-thyrox→thyrox, 7 fases→12 stages, Agentic AI platform-independent (b482033)
- `analyze/framework/thyrox-agentic-ai-positioning-review.md` — inventario completo P1-P4 (b6d627f)
- `analyze/framework/thyrox-agentic-ai-deep-review-v2.md` — 18 ocurrencias residuales con clasificación CAMBIAR/CORRECTO/DUDOSO (17f5013)
- `workflow-audit` skill — auditor crítico de WPs con scoring PASS/FAIL/PARTIAL/SKIP (ccbd772)
- `analyze/coverage/use-cases-recommendations-coverage.md` — 8/9 recomendaciones implementadas (1867d81)
- `analyze/framework/changelog-roadmap-policy-analysis.md` — benchmarking industrial + action plan (52e7e79)
- `execute/goto-problem-fix-execution-log.md` — log retroactivo de 2 sesiones de ejecución (de5cc9d)
- `track/goto-problem-fix-audit-report.md` v2.1.0 — Grade A 100%, 0 FAILs (de5cc9d)
- Domain subdirectories en `analyze/`: coverage/, framework/, naming/, process/, readme/, templates/, audit-design/ (07c33d3)
- Sección "Herramientas de calidad" en `thyrox/SKILL.md` referenciando `/thyrox:audit` (9525ce0)
- `DECISIONS.md` index y guías de metodología en `analyze/` (4086161)
- `.gitignore` excepción `!.thyrox/context/**/coverage/` para domain subdirs (1867d81)

### Changed

- `README.md`, `ARCHITECTURE.md`, `.claude/skills/thyrox/SKILL.md`, `CONTRIBUTING.md` — identidad THYROX: "framework" → "sistema de Agentic AI" + desacople de plataforma Claude Code (9516573, 4ce2d37)
- 19 archivos adicionales (`references/`, `skills/`, `project-state.md`, `focus.md`, `CLAUDE.md`, etc.) — "del framework/al framework" → "del sistema/al sistema", versioning "7 fases" → "12 stages" (17f5013)
- `session-start.sh`, `session-resume.sh`, `project-status.sh` — migración `phase:` → `stage:` (A-1..A-6) (1f6986f)
- `README.md` — removida Opción A (`bash setup-template.sh`), actualizada nota de migración (107e65d)
- `.claude/agents/babok-coordinator.md` → `ba-coordinator.md` — rename + todos los campos internos (1867d81)
- `.claude/agents/pmbok-coordinator.md` → `pm-coordinator.md` — rename + todos los campos internos (1867d81)
- `.thyrox/registry/routing-rules.yml` — `pmbok-coordinator` → `pm-coordinator`, `babok-coordinator` → `ba-coordinator` (1867d81)
- `ARCHITECTURE.md` — tabla coordinators actualizada (ba/pm prefijos) (1867d81)
- `.claude/references/conventions.md` — REGLA-LONGEV-001 revisada, CHANGELOG policy ampliada (e5a2cb7)
- `analyze/` — reorganización flat → domain subdirectories (07c33d3)
- Metadata de artefactos WP — content-first naming (`{contenido}-{subtipo}.md`) (3e6eea9)
- `CHANGELOG.md` raíz — referencia rota a CHANGELOG-archive.md corregida (bce1b03)

### Fixed

- GAP-02: `phase:` → `stage:` en 3 scripts de sesión — 6 bugs de sincronización (1f6986f)
- PAT-004 enforcement en `workflow-execute/SKILL.md` y `thyrox/SKILL.md` (273ce55)
- Score audit-report: T-023 FAIL→PASS, T-020 PARTIAL→SKIP (107e65d)
- Templates legacy marcados SKIP en `analyze/templates/skill-templates-phase-fields-audit.md` (107e65d)
- Nombres de artefactos WP — eliminado prefijo de tipo, adoptado content-first (3e6eea9)

### Removed

- `CHANGELOG-archive.md` (475 líneas) — historial v0.x/v1.x ahora solo en git log (e5a2cb7)
- `ROADMAP-history.md` (921 líneas) — historial FASEs 1-26 ahora solo en git log (e5a2cb7)

---

## Commits de este WP

| Hash | Tipo | Descripción |
|------|------|-------------|
| b482033 | docs | ADR identidad THYROX como sistema de Agentic AI |
| 17f5013 | refactor | deep-review-v2 — eliminar framework restantes (19 archivos) |
| 4ce2d37 | refactor | desacoplar identidad THYROX de plataforma Claude Code |
| 9516573 | refactor | reposicionar THYROX de framework a Agentic AI (9 archivos) |
| b6d627f | docs | deep-review THYROX positioning — framework → Agentic AI system |
| bbe3afa | fix | resolve audit v3.0.0 PARTIALs P-01..P-04 |
| 03022a0 | docs | audit v3.0.0 — Grade A 96% post Stage 12 (4 PARTIAL, 0 FAIL) |
| b34d9b7 | docs | Ishikawa analysis — WP premature close violating I-011 |
| bce1b03 | fix | remove broken CHANGELOG-archive.md reference |
| e5a2cb7 | chore | remove -archive/-history files, fix REGLA-LONGEV-001 |
| 52e7e79 | docs | changelog-roadmap policy analysis |
| 1867d81 | refactor | rename babok→ba, pmbok→pm + coverage analysis |
| de5cc9d | docs | execution-log retroactive + audit v2.1.0 Grade A 100% |
| 9d6cbd7 | docs | audit v2.0.0 — Grade A 97.6% |
| 7b96d27 | chore | B8/B9 complete — remediation plan executed |
| 9525ce0 | feat | framework improvements — audit in SKILL catalog |
| 107e65d | fix | close audit findings |
| 273ce55 | fix | PAT-004 framework fixes T-032/T-033/T-034 |
| fd0b3f0 | docs | remediation analysis + B8/B9 task plan |
| 07c33d3 | refactor | reorganize analyze/ into domain subdirectories |
| 1467d01 | docs | 4 analysis documents — T-023, setup-template, PAT-004, catalog |
| 6d0fd32 | docs | audit report Grade A 94% |
| ccbd772 | feat | create workflow-audit skill |
| a0fe13b | chore | advance to Stage 11 TRACK/EVALUATE |
| cbc261f | docs | align skill templates with stage-directory naming |
| 4086161 | docs | methodology guides and DECISIONS.md index |
| 75376be | docs | ARCHITECTURE.md coordinator pattern + hooks |
| 657ee67 | docs | update README for ÉPICA 29/31/35/39 migrations |
| f33207c | docs | now.md body and methodology_step namespacing |
| 1f6986f | fix | fix session scripts phase→stage migration A-1..A-6 |
| e99cc5e | refactor | stage directory taxonomy + domain subdirectories |
| 3e6eea9 | refactor | rename artifacts to content-first naming |
| f1dcf1d | docs | Ishikawa analysis on WP artifact naming |
| 2f52b73 | docs | final validation deep-review + task plan v1.3.0 |
| ad1abde | docs | audit cross-reference deep-review + task plan v1.2.0 |
| 6f7790c | docs | deep-review task plan coverage + v1.1.0 |
| eb3b545 | refactor | remove v-suffix, adopt SemVer 2.0.0 |
| 804e617 | refactor | rename deep-review file |
| 4cfba1b | docs | Stage 1→3 deep-review |
| eebceaa | docs | strategy, scope plan and task plan |
| 534163a | docs | Stage 3 DIAGNOSE — causa raíz 30 problemas |
| ce23647 | docs | deep-review references |
| d814221 | docs | deep-review v2 — error arquitectónico central |
| 56cfd01 | docs | deep-review use cases document |
| 753126d | chore | track phase history log |
| 6ec46e9 | docs | Stage 1 DISCOVER — análisis GO-TO problem |
| 8a402be | docs | REGLA-LONGEV-001 + timestamps + CHANGELOG root rule |
| 51c8e03 | docs | root cause analysis of 3 functional eval failures |

---

## Notas de release

Este WP no genera bump de versión de producción — es un WP de mejora y corrección del framework.
Las versiones de producción se emiten con `git tag vX.Y.Z` en releases formales.
