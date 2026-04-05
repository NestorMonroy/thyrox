```yml
Fecha creación tareas: 2026-04-04-04-16-29
Proyecto: thyrox — PM-THYROX skill
Feature: Technical Debt Resolution
Versión breakdown: 1.0
Total tareas: 25
Dependencias críticas: 1 (T-023 después de T-019/T-021)
Fase: 5 - DECOMPOSE
```

# Task Plan — Technical Debt Resolution

Basado en: [technical-debt-resolution-requirements-spec](technical-debt-resolution-requirements-spec.md)

---

## Batch A — Paralelo (sin dependencias entre sí)

- [x] [T-001] [P] Reescribir `references/examples.md` con nomenclatura de 7 fases oficiales (SPEC-002)
- [x] [T-002] [P] Agregar sección "Timestamp Format" en `references/conventions.md` con formato YYYY-MM-DD-HH-MM-SS y ejemplos (SPEC-004)
- [x] [T-003] [P] Agregar check de timestamp en `scripts/validate-session-close.sh` — warning si now.md contiene "[YYYY-MM-DD-HH-MM-SS]" literal sin resolver (SPEC-004)
- [x] [T-004] [P] Verificar y actualizar `scripts/validate-phase-readiness.sh` — case Phase 3 verifica existencia de `*-plan.md` con scope aprobado (SPEC-005)
- [x] [T-005] [P] WP `2026-03-27-014512-coherencia-unificacion-fases` — marcar `[x]` en todos los `[ ]` de: `epic-thyrox-documentation/structure.md`, `epic-thyrox-documentation/requirements-analysis.md`, `analysis/references-analysis.md` (SPEC-006)
- [x] [T-006] [P] WP `2026-03-28-015504-covariancia` — marcar `[x]` en todos los `[ ]` de: `covariance-structure.md`, `covariance-tasks.md` (SPEC-006)
- [x] [T-007] [P] WP `2026-03-28-020942-spec-kit-adoption` — marcar `[x]` en todos los `[ ]` de: `spec-kit-adoption-structure.md`, `spec-kit-adoption-tasks.md` (SPEC-006)
- [x] [T-008] [P] WP `2026-03-28-023917-spec-kit-deep-adoption` — marcar `[x]` en todos los `[ ]` de: `spec-kit-deep-adoption-structure.md`, `spec-kit-deep-adoption-tasks.md` (SPEC-006)
- [x] [T-009] [P] WP `2026-03-28-11-16-40-multi-interaction-evals` — marcar `[x]` en todos los `[ ]` de: `plan.md` (SPEC-006)
- [x] [T-010] [P] WP `2026-03-28-18-25-45-cicd-setup` — marcar `[x]` en todos los `[ ]` de: `plan.md` (SPEC-006)
- [x] [T-011] [P] WP `2026-03-28-20-15-30-skill-flow-analysis` — marcar `[x]` en todos los `[ ]` de: `plan.md` (SPEC-006)
- [x] [T-012] [P] WP `2026-03-31-06-14-23-skill-consistency` — marcar `[x]` en todos los `[ ]` de: `plan.md` (SPEC-006)

---

## Batch B — Templates headers (paralelos, sin dependencias)

- [x] [T-013] [P] `assets/ad-hoc-tasks.md.template` — agregar `Fase: 5 - DECOMPOSE / 6 - EXECUTE` al frontmatter YAML (SPEC-001)
- [x] [T-014] [P] `assets/analysis-phase.md.template` — agregar `Fase: 1 - ANALYZE` al frontmatter YAML (SPEC-001)
- [x] [T-015] [P] `assets/categorization-plan.md.template` — agregar `Fase: 5 - DECOMPOSE` al frontmatter YAML (SPEC-001)
- [x] [T-016] [P] `assets/document.md.template` — agregar `Fase: 4 - STRUCTURE` al frontmatter YAML (SPEC-001)
- [x] [T-017] [P] `assets/project.json.template` — agregar comentario `// Fase: 1 - ANALYZE` como primera línea (SPEC-001)
- [x] [T-018] [P] `assets/refactors.md.template` — agregar `Fase: 5 - DECOMPOSE / 6 - EXECUTE` al frontmatter YAML (SPEC-001)

---

## Batch C — SKILL.md y references/ (coordinar scalability.md)

- [x] [T-019] Actualizar tabla de artefactos en `SKILL.md` — agregar los 6 templates con su fase y condición de activación (SPEC-001)
- [x] [T-020] Actualizar sección Phase 1 en `SKILL.md` — agregar links a `analysis-phase.md.template` y `project.json.template` con condición de activación (SPEC-001)
- [x] [T-021] Actualizar secciones Phase 4/5/6 en `SKILL.md` — agregar links a `document.md.template`, `ad-hoc-tasks.md.template`, `categorization-plan.md.template`, `refactors.md.template` con condición (SPEC-001)
- [x] [T-022] Actualizar `references/incremental-correction.md` — agregar `analysis-phase.md.template` en sección de artefactos de análisis (SPEC-001)
- [x] [T-023] Actualizar `references/scalability.md` — (a) agregar categorization-plan + project.json como opcionales con threshold, (b) cambiar `project.json` de obligatorio a opcional ">50 issues", (c) corregir `exit_conditions.md` → `exit-conditions.md.template` (SPEC-001 + SPEC-003) [depende de T-019, T-021]

---

## Finalización

- [x] [T-024] Actualizar [ROADMAP](ROADMAP.md) — agregar sección FASE 8 con todos los items de este WP y link al work package
- [x] [T-025] Validación final — ejecutar todos los criterios de aceptación: grep checks de SPEC-001 a SPEC-006

---

## Orden de ejecución

```
Batch A (T-001 a T-012): todos paralelos
Batch B (T-013 a T-018): todos paralelos, independiente de Batch A
    ↓ (T-019, T-020, T-021 dependen de conocer qué templates hay)
Batch C paso 1 (T-019, T-020, T-021, T-022): paralelos entre sí
    ↓
Batch C paso 2 (T-023): después de T-019 y T-021 (mismo archivo scalability.md)
    ↓
T-024 (ROADMAP)
    ↓
T-025 (Validación)
```

---

## Checkpoints

**CHECKPOINT-1** — Después de T-012:
- `grep -rn "^\- \[ \]" .claude/context/work/2026-03-2*/ .claude/context/work/2026-03-31*/` → 0 resultados

**CHECKPOINT-2** — Después de T-018:
- `grep -r "^Fase:" .claude/skills/pm-thyrox/assets/ad-hoc-tasks.md.template .claude/skills/pm-thyrox/assets/analysis-phase.md.template .claude/skills/pm-thyrox/assets/categorization-plan.md.template .claude/skills/pm-thyrox/assets/document.md.template .claude/skills/pm-thyrox/assets/refactors.md.template` → 5 resultados

**CHECKPOINT-3** — Después de T-023:
- `grep -n "exit_conditions" .claude/skills/pm-thyrox/references/scalability.md` → 0 resultados
- `grep -n "project.json" .claude/skills/pm-thyrox/references/scalability.md` → muestra "Opcional"

**CHECKPOINT-4** — T-025 (validación final):
- Todos los criterios de aceptación de SPEC-001 a SPEC-006 verificados

---

## Aprobación

- [x] Tasks revisadas
- [x] Estimaciones validadas
- [x] Orden de ejecución verificado
- [x] Aprobado por: usuario — 2026-04-04
