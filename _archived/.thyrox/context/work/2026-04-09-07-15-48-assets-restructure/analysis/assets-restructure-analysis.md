```yml
type: Análisis de Work Package
work_package: 2026-04-09-07-15-48-assets-restructure
fase: FASE 25
phase: Phase 1 — ANALYZE
created_at: 2026-04-09 07:15:48
status: En progreso
```

# Análisis — FASE 25: assets-restructure

## Problema

`pm-thyrox/assets/` centraliza 38 templates pertenecientes a 7 fases SDLC distintas. Los archivos `workflow-*/SKILL.md` y `workflow-*/references/*.md` ya usan paths relativos `assets/X.md.template` y `../assets/X.md.template` que asumen su propio directorio `assets/` — pero esos directorios no existen. Las referencias están **rotas hoy**.

Adicionalmente, FASE 24 movió `references/conventions.md` y `references/examples.md` de `pm-thyrox/references/` a `.claude/references/`, rompiendo sus links a `../assets/X.md.template` (ahora apuntan a `.claude/assets/` que no existe).

---

## Hallazgo clave: paths ya son correctos en workflow-* files

La mayoría de archivos en `workflow-*/` YA usan la ruta relativa correcta para un mundo donde los assets estén distribuidos:

| Archivo | Path que usa | Resuelve a | ¿Estado? |
|---------|-------------|-----------|---------|
| `workflow-analyze/SKILL.md` | `assets/introduction.md.template` | `workflow-analyze/assets/` | ✗ ROTO (dir no existe) |
| `workflow-analyze/references/introduction.md` | `../assets/requirements-analysis.md.template` | `workflow-analyze/assets/` | ✗ ROTO |
| `workflow-execute/SKILL.md` | `assets/execution-log.md.template` | `workflow-execute/assets/` | ✗ ROTO |
| `workflow-track/references/incremental-correction.md` | `../assets/analysis-phase.md.template` | `workflow-track/assets/` | ✗ ROTO |

**Consecuencia directa:** crear `workflow-*/assets/` y mover los templates FIX estas referencias sin necesidad de editar esos archivos. Los archivos `workflow-*/` empezarán a funcionar automáticamente.

---

## Inventario completo — 38 assets con asignación propuesta

### workflow-analyze/assets/ — 14 templates (Phase 1)

| Template | Motivo de asignación |
|----------|---------------------|
| `introduction.md.template` | Artefacto principal Phase 1 |
| `risk-register.md.template` | REQUERIDO Phase 1 |
| `exit-conditions.md.template` | Gate Phase 1 (mediano/grande) |
| `constitution.md.template` | Phase 1, principios globales |
| `requirements-analysis.md.template` | Sub-análisis Phase 1 |
| `use-cases.md.template` | Sub-análisis Phase 1 |
| `quality-goals.md.template` | Sub-análisis Phase 1 |
| `stakeholders.md.template` | Sub-análisis Phase 1 |
| `basic-usage.md.template` | Sub-análisis Phase 1 |
| `constraints.md.template` | Sub-análisis Phase 1 |
| `context.md.template` | Sub-análisis Phase 1 |
| `end-user-context.md.template` | Step 0 Phase 1 |
| `project.json.template` | "Fase 1 — ANALYZE" en el template |
| `adr.md.template` | Phase 1–2; Phase 1 lo usa primero según workflow-analyze/SKILL.md |

### workflow-strategy/assets/ — 1 template (Phase 2)

| Template | Motivo |
|----------|--------|
| `solution-strategy.md.template` | REQUERIDO Phase 2 |

### workflow-plan/assets/ — 2 templates (Phase 3)

| Template | Motivo |
|----------|--------|
| `plan.md.template` | REQUERIDO Phase 3 |
| `epic.md.template` | Phase 3 opcional (trabajo grande) |

### workflow-structure/assets/ — 4 templates (Phase 4)

| Template | Motivo |
|----------|--------|
| `requirements-specification.md.template` | REQUERIDO Phase 4 |
| `design.md.template` | Phase 4 diseño técnico |
| `spec-quality-checklist.md.template` | REQUERIDO al finalizar Phase 4 |
| `document.md.template` | Docs técnicos sin template específico (Phase 4) |

### workflow-decompose/assets/ — 1 template (Phase 5)

| Template | Motivo |
|----------|--------|
| `tasks.md.template` | REQUERIDO Phase 5 |

> `categorization-plan.md.template` — **AMBIGUO**: referenciado desde `workflow-decompose/SKILL.md:51` Y desde `workflow-track/references/incremental-correction.md:215`. Ver Sección "Casos ambiguos" abajo.

### workflow-execute/assets/ — 9 templates (Phase 6)

| Template | Motivo |
|----------|--------|
| `execution-log.md.template` | REQUERIDO Phase 6 |
| `commit-message-main.template` | commit-helper.md |
| `feature.template` | commit-helper.md |
| `bugfix.template` | commit-helper.md |
| `refactor.template` | commit-helper.md |
| `documentation.template` | commit-helper.md |
| `ad-hoc-tasks.md.template` | references/examples.md |
| `multiple-files.template` | commit-helper.md |
| `task-completion.template` | commit-helper.md |

### workflow-track/assets/ — 5 templates (Phase 7)

| Template | Motivo |
|----------|--------|
| `lessons-learned.md.template` | REQUERIDO Phase 7 |
| `changelog.md.template` | REQUERIDO Phase 7 |
| `final-report.md.template` | Phase 7, proyectos grandes |
| `refactors.md.template` | Phase 7, deuda técnica |
| `analysis-phase.md.template` | Referenciado desde `incremental-correction.md` (workflow-track) con `../assets/analysis-phase.md.template` |

### pm-thyrox/assets/ — 1 template (cross-phase, SE QUEDA)

| Template | Motivo para quedarse |
|----------|---------------------|
| `error-report.md.template` | Usado en Phase 1 (ERR al analizar), Phase 6 (ERR al ejecutar), cualquier fase. Referenciado desde `context/errors/README.md` y `conventions.md` como utilidad global. |

---

## Casos ambiguos — decisiones requeridas

### Caso 1: `categorization-plan.md.template`

**El problema:** referenciado desde dos workflows distintos:
- `workflow-decompose/SKILL.md:51` → `assets/categorization-plan.md.template` → resuelve a `workflow-decompose/assets/`
- `workflow-track/references/incremental-correction.md:215` → `../assets/categorization-plan.md.template` → resuelve a `workflow-track/assets/`

**Opciones:**
- A) Copiar (no mover) a ambos directorios — dos copias, no depende de quién lo "posea"
- B) Asignar a workflow-decompose + actualizar link en incremental-correction.md
- C) Asignar a workflow-track + actualizar link en workflow-decompose/SKILL.md

**Recomendación:** Opción B — `workflow-decompose/assets/`, actualizar 1 link en incremental-correction.md. Decompose es donde se categoriza trabajo activo; track lo usa en corrección, que es un flujo secundario.

### Caso 2: `adr.md.template`

**El problema:** descrito como Phase 1–2 en el artefact table. `workflow-strategy/SKILL.md:51` lo menciona.
**Asignado a:** workflow-analyze (Phase 1 lo usa primero; context/decisions.md lo referencia en contexto de Phase 1).

---

## Archivos que necesitan updates post-move

A diferencia de FASE 24, **la mayoría de los workflow-* files no necesitan edición** — sus paths relativos ya son correctos. Solo necesitan los archivos con paths absolutos o que apuntan a pm-thyrox/assets/:

| Archivo | Links a actualizar | Qué cambia |
|---------|-------------------|------------|
| `pm-thyrox/SKILL.md` (tabla "Dónde viven") | 14 | `assets/X.md` → `../workflow-*/assets/X.md` |
| `context/decisions.md` | 3 | `pm-thyrox/assets/adr.md.template` → `workflow-analyze/assets/adr.md.template` |
| `references/conventions.md` | 1 | `../assets/error-report.md.template` → `../skills/pm-thyrox/assets/error-report.md.template` (pre-existing broken desde FASE 24) |
| `references/examples.md` | 3 | `../assets/refactors.md.template` → `../skills/workflow-track/assets/refactors.md.template`; `../assets/ad-hoc-tasks.md.template` → `../skills/workflow-execute/assets/ad-hoc-tasks.md.template` (pre-existing broken desde FASE 24) |
| `workflow-track/references/reference-validation.md` | 1 | Texto `.claude/skills/pm-thyrox/assets/` → `.claude/skills/pm-thyrox/assets/ (error-report) y workflow-*/assets/ (resto)` |
| `setup-template.sh` | 2 | `pm-thyrox/assets/document.md.template` → `workflow-structure/assets/`; `pm-thyrox/assets/epic.md.template` → `workflow-plan/assets/` |
| `workflow-decompose/SKILL.md` | 1 | (solo si decisión ambigua Caso 1 = Opción B: actualizar categorization-plan.md.template path en incremental-correction.md, no en decompose) |

**Total estimado:** ~25 link updates en 7 archivos (vs ~50 en 18 archivos en FASE 24).

---

## Descubrimiento secundario: referencias pre-existing rotas desde FASE 24

`references/conventions.md` y `references/examples.md` fueron movidos de `pm-thyrox/references/` a `.claude/references/` en FASE 24. Sus links a `../assets/X.md.template` ahora apuntan a `.claude/assets/` (no existe). Estaban funcionando antes (apuntaban a `pm-thyrox/assets/`). Necesitan corrección en este WP.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| `categorization-plan.md.template` en 2 workflows | Alta | Bajo | Decidir antes del primer commit; Opción B recomendada |
| setup-template.sh no escaneado por validador | Media | Bajo | Grep manual de `pm-thyrox/assets` en .sh files |
| error-report.md.template con referencias externas | Baja | Bajo | Verificar conventions.md + context/errors/README.md |
| pm-thyrox/SKILL.md tabla con 14 paths distintos | Alta | Medio | Un solo commit dedicado a la tabla |

---

## Scope summary

- 38 assets → 7 directorios workflow-*/assets/ (37) + 1 queda en pm-thyrox/assets/
- 7 directorios nuevos a crear
- ~25 link updates en 7 archivos
- Corrección de 4 referencias pre-existing rotas (FASE 24 side-effect)
- pm-thyrox/assets/ queda con 1 archivo (error-report.md.template)
