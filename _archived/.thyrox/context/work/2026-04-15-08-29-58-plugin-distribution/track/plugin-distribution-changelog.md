```yml
created_at: 2026-04-16 17:24:02
project: THYROX
work_package: 2026-04-15-08-29-58-plugin-distribution
phase: Phase 11 — TRACK/EVALUATE
author: NestorMonroy
status: Borrador
```

# WP Changelog: plugin-distribution

Cambios de FASE 39 — Migración THYROX a plugin puro de Claude Code.

---

## [FASE 39] — 2026-04-16

### Added

- `hooks/hooks.json` — hook SessionStart que ejecuta `bin/thyrox-init.sh` condicionalmente (`[ -d .thyrox/context ] || bash ...`)
- `bin/thyrox-init.sh` — script de inicialización idempotente que reemplaza `setup-template.sh`:
  - Crea `.thyrox/context/` con subdirectorios (`work/`, `decisions/`, `errors/`, `research/`)
  - Genera `now.md`, `focus.md`, `project-state.md`, `technical-debt.md` con valores iniciales
  - Genera `ROADMAP.md` y `CHANGELOG.md` si no existen
  - Crea `.claude/settings.json` con permisos mínimos THYROX si no existe
  - Guard de idempotencia: salida inmediata si `.thyrox/context/` ya existe

### Changed

- `.claude-plugin/plugin.json` — agregados campos funcionales:
  - `"skills": "../.claude/skills"` — carga in-situ de skills del framework
  - `"agents": "../.claude/agents"` — agentes nativos del plugin
  - `"hooks": "../hooks/hooks.json"` — referencia al SessionStart hook
  - `"bin": "../bin"` — directorio de ejecutables accesibles via `$PLUGIN_DIR`

### Removed

- `setup-template.sh` — eliminado (287 líneas). Reemplazado por `bin/thyrox-init.sh`.
  - Razón: 4 bugs acumulados (paths pre-FASE-35, naming pre-FASE-29), incompatible con modelo plugin.
  - Funcionalidad de renombrado ("THYROX → nombre-proyecto") eliminada: en modelo plugin el usuario no clona el repo THYROX, no hay nada que renombrar.

---

## Commits del WP

| Hash | Mensaje |
|------|---------|
| `0504ac4` | feat(plugin-distribution): T-013 T-014 — validación y test de idempotencia pasados |
| `4bf1721` | feat(plugin-distribution): T-012 — eliminar setup-template.sh |
| `36d9ec2` | feat(plugin-distribution): T-005..T-011 — crear bin/thyrox-init.sh |
| `af521e6` | feat(plugin-distribution): T-003 T-004 — crear hooks/hooks.json |
| `b95f596` | feat(plugin-distribution): T-001 T-002 — actualizar plugin.json |
| `52db312` | docs(plugin-distribution): crear task-plan con T-001..T-014 |
| `6dccaa0` | refactor(plugin-distribution): move thyrox-phases-restructuring |
| `f09527b` | docs(plugin-distribution): rewrite thyrox-phases-restructuring |
| `2f5c858` | docs(plugin-distribution): rename + add sdlc-phases analysis |
| `8d30009` | refactor(plugin-distribution): reorganize WP flat-by-phase |
| `dc70d9c` | docs(fase-39): sub-análisis worktrees aplicado a plugin-distribution |
| `79316b2` | docs(fase-39): completar Phase 1 ANALYZE — audit interno |
| `a207cdd` | feat(fase-39): iniciar Phase 1 ANALYZE — plugin-distribution |
