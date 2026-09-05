```yml
Fecha: 2026-04-04-04-16-29
WP: 2026-04-04-04-16-29-technical-debt-resolution
Fase: 3 - PLAN
Estado: Aprobado — 2026-04-04
```

# Plan — Technical Debt Resolution

## Scope Statement

**Problema:** Seis templates en `assets/` no tienen referencia en el flujo, referencias
en `scalability.md` y `examples.md` apuntan a templates inexistentes o con nombres de
fases obsoletos, 8 WPs históricos tienen task-plans con checkboxes sin marcar pese a
estar implementados, y no existe validación automática de timestamps en artefactos.

**Usuarios:** Claude (cualquier modelo) que lee el flujo de PM-THYROX necesita encontrar
cada template en contexto de uso, no como un archivo suelto en `assets/`.

**Criterios de éxito:**
- `grep -r "MANTENER\|sin referencia\|huérfano" assets/` no devuelve resultados — cada template tiene `Fase:` en su header
- `grep -n "Phase [0-9]: PLAN\|Phase [0-9]: STRUCTURE\|Phase [0-9]: DECOMPOSE\|Phase [0-9]: EXECUTE\|Phase [0-9]: TRACK" references/examples.md` no devuelve resultados — nomenclatura actualizada
- `grep -rn "^\- \[ \]" context/work/2026-03-27*/  context/work/2026-03-28*/ context/work/2026-03-31*/` no devuelve resultados — WPs históricos cerrados
- `validate-phase-readiness.sh 3` verifica existencia de `*-plan.md`
- `conventions.md` contiene regla explícita de timestamp `YYYY-MM-DD-HH-MM-SS`

---

## In-Scope

**Grupo 1 — Mapeo de 6 templates huérfanos (3 capas):**
- Actualizar header `Fase:` en los 6 templates: `ad-hoc-tasks.md`, `analysis-phase.md`, `categorization-plan.md`, `document.md`, `project.json`, `refactors.md`
- Agregar referencias en SKILL.md por fase con condición de activación
- Ampliar tabla de artefactos de SKILL.md con los 6 templates
- Actualizar `references/scalability.md`: `categorization-plan.md` y `project.json` (opcional Phase 7)
- Actualizar `references/incremental-correction.md`: agregar `analysis-phase.md`

**Grupo 2 — Corrección de referencias desactualizadas:**
- D-001: Reescribir `references/examples.md` con nomenclatura de 7 fases actuales
- D-002: Actualizar `references/scalability.md` — `project.json` de obligatorio a opcional, corregir `exit_conditions.md` → `exit-conditions.md.template`

**Grupo 3 — Convenciones y validación:**
- TD-001: Agregar regla de timestamp en `references/conventions.md`
- TD-001: Agregar validación de timestamp en `scripts/validate-session-close.sh`
- TD-002: Verificar y actualizar `scripts/validate-phase-readiness.sh` para Phase 3 (`*-plan.md`)

**Grupo 4 — Cierre formal de WPs históricos:**
- Marcar `[x]` en task-plans de 8 WPs: `coherencia-unificacion-fases`, `covariancia`, `spec-kit-adoption`, `spec-kit-deep-adoption`, `cicd-setup`, `multi-interaction-evals`, `skill-flow-analysis`, `skill-consistency`

**Grupo 5 — ROADMAP:**
- Agregar sección FASE 8 en ROADMAP.md con todos los items de este WP

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Corrección retroactiva de 93 timestamps en WPs históricos | WPs cerrados; valor de trazabilidad nulo |
| Crear lessons-learned para los 8 WPs históricos | Información no existe; documentación artificial |
| Nueva funcionalidad del framework | Este WP es solo deuda técnica |
| Auditar references/ más allá de scalability.md e incremental-correction.md | Fuera del scope identificado en análisis |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| Headers de 6 templates | 6 |
| SKILL.md — mapeo por fase + tabla | 3 |
| references/ — scalability + incremental-correction | 2 |
| D-001: examples.md reescritura | 1 |
| D-002: scalability.md referencias | 1 |
| TD-001: conventions.md regla | 1 |
| TD-001: validate-session-close.sh | 1 |
| TD-002: validate-phase-readiness.sh Phase 3 | 1 |
| Cierre 8 WPs históricos | 8 |
| ROADMAP.md actualización | 1 |
| **Total** | **25 tareas** |

Clasificación: mediano
Fases activas: 1 (ANALYZE) → 2 (SOLUTION_STRATEGY) → 3 (PLAN) → 5 (DECOMPOSE) → 6 (EXECUTE) → 7 (TRACK)

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 8](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-04
