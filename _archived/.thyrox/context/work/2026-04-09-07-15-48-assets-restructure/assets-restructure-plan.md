```yml
type: Plan de Trabajo
work_package: 2026-04-09-07-15-48-assets-restructure
fase: FASE 25
phase: Phase 3 — PLAN
created_at: 2026-04-09 07:30:00
version: 1.0
```

# Plan — assets-restructure

## Scope statement

Distribuir 37 de 38 templates de `pm-thyrox/assets/` a sus `workflow-*/assets/` correspondientes. Dejar `error-report.md.template` en `pm-thyrox/assets/`. Actualizar todos los links externos que referencian las rutas antiguas.

## In scope

- Crear 7 directorios `workflow-*/assets/` nuevos
- `git mv` de 37 templates a sus destinos correctos
- Actualizar `pm-thyrox/SKILL.md` tabla de artefactos (14 links)
- Actualizar archivos externos con paths absolutos a `pm-thyrox/assets/`: `context/decisions.md`, `references/conventions.md`, `references/examples.md`, `reference-validation.md`, `setup-template.sh`, `workflow-strategy/SKILL.md`
- Corregir 4 links pre-existing rotos en `references/conventions.md` y `references/examples.md` (FASE 24 side-effect)
- Crear ADR-018 documentando la decisión

## Out of scope

- Modificar el contenido de los templates (solo movimiento)
- `workflow-*/SKILL.md` y `workflow-*/references/*.md` — sus paths relativos ya son correctos, se auto-reparan
- `pm-thyrox/assets/` directory no se elimina (queda con error-report.md.template)

## Entregables

| Artefacto | Descripción |
|-----------|-------------|
| 7 × `workflow-*/assets/` | Directorios nuevos con templates de su fase |
| `pm-thyrox/assets/error-report.md.template` | Permanece (único cross-phase) |
| `assets-restructure-task-plan.md` | Checklist de ejecución |
| `ADR-018` | Decisión de distribución documentada |

## Criterio de éxito

- `python3 .claude/scripts/detect_broken_references.py` — 0 regresiones en archivos operacionales
- `grep -r "pm-thyrox/assets" . --include="*.sh"` — sin hits (o solo error-report)
- 37 archivos en sus destinos correctos, 1 en pm-thyrox/assets/

## ROADMAP entry

FASE 25: assets-restructure — Distribución de 37 templates a workflow-*/assets/
