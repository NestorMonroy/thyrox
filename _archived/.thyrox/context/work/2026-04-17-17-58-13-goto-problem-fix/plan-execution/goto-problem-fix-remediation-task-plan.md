```yml
created_at: 2026-04-17 22:37:43
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Stage 8 — PLAN EXECUTION
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Task Plan — goto-problem-fix Remediación (B8/B9)

> **Generado desde:** `analyze/goto-problem-fix-remediation-analysis.md`
> **Alcance:** Cierre de hallazgos del audit + mejoras al framework identificadas en Stage 11
> **Ruta crítica:** B8 → B9 → Cierre (B8 y B9 independientes, pueden ejecutarse en paralelo)

---

## Convención

Tareas T-026+ (continuación del task plan original T-001..T-025).
Formato: `T-NNN Descripción (ID-problema)`

---

## B8 — Correcciones de auditoría

> Cierra los hallazgos del audit report. Bajo riesgo — sin cambios a SKILL.md ni scripts críticos.

- [x] **T-026** Sincronizar checkboxes en `plan-execution/goto-problem-fix-task-plan.md`: marcar `[x]` en T-001..T-025 (todos implementados y verificados). Usar un único Edit sobre el archivo. (A-1, PAT-004 retroactivo)

- [x] **T-027** Fix README: eliminar Opción A (líneas 93-95 con `bash setup-template.sh`), conservar Opción B y la nota de migración. Resultado esperado: `grep "setup-template" README.md` → solo la nota informativa, no como instrucción ejecutable. (A-2/A-3, T-009/T-017 definitivo)

- [x] **T-028** Actualizar `track/goto-problem-fix-audit-report.md`:
  - T-023: mover de FAIL → PASS (artefacto creado en `analyze/templates/skill-templates-phase-fields-audit.md`)
  - T-020: mover de PARTIAL → SKIP (política ROADMAP confirmada: milestones, no estado de sesión)
  - Recalcular score: 23 PASS + 1 PARTIAL → ~96% Grade A
  - Actualizar Executive Summary y Dimension Scores (A-4/A-5)

- [x] **T-029** Actualizar `analyze/templates/skill-templates-phase-fields-audit.md`: marcar los 3 templates en `legacy/` como SKIP con justificación (están archivados — no son templates activos). Actualizar el total: 5 FIXED + 3 SKIP + 0 PENDING. (A-5 complemento)

- [x] **T-030** Commit B8: `fix(goto-problem-fix): close audit findings — sync checkboxes, readme opcionA, audit-report scores`

---

## B9 — Mejoras al framework

> Mejoras estructurales derivadas del análisis. Modifican SKILL.md y un script.
> Pueden ejecutarse en paralelo con B8 (archivos distintos).

- [x] **T-031** Actualizar `thyrox/SKILL.md` (C-1):
  - En la tabla del catálogo, modificar la entrada de Phase 11:
    `| Phase 11: TRACK/EVALUATE | /thyrox:track | Evaluar resultados. Lessons learned + changelog + cierre WP. Usar /thyrox:audit antes de STANDARDIZE para gate de calidad. |`
  - Agregar sección nueva "## Herramientas de calidad" después del catálogo de las 12 fases:
    ```
    ## Herramientas de calidad
    | Herramienta | Skill | Cuándo usar |
    |------------|-------|-------------|
    | **AUDIT** | /thyrox:audit | Antes de Stage 12, o cuando el ejecutor quiere verificar calidad del WP. Produce track/{wp}-audit-report.md con score y action plan. |
    ```
  - Actualizar `updated_at` en frontmatter (regla CLAUDE.md obligatoria)
  - (C-1, Opción B + referencia Opción C aprobada)

- [x] **T-032** Actualizar `workflow-implement/SKILL.md` (C-2):
  - Antes del paso 7 ("Actualizar checkbox en *-task-plan.md"), agregar bloque destacado:
    ```
    **PAT-004 — Checkbox-at-commit (OBLIGATORIO):** El `[x]` va en el MISMO commit que
    implementa el T-NNN. No acumular checkboxes para después — el drift crece exponencialmente.
    ```
  - Actualizar `updated_at` en frontmatter
  - (C-2, Fix 1 de `analyze/process/task-plan-sync-root-cause.md`)

- [x] **T-033** Fix `session-start.sh` (C-3):
  - Línea 61: cambiar `maxdepth 1` → `maxdepth 2`
  - Línea 69: cambiar `maxdepth 1` → `maxdepth 2` (también busca execution-log — misma corrección para consistencia)
  - Verificar: `bash -n .claude/scripts/session-start.sh` → PASS
  - (C-3, Fix 2 de `analyze/process/task-plan-sync-root-cause.md`)

- [x] **T-034** Agregar TD-042 a `technical-debt.md` (C-4):
  ```
  ## TD-042: validate-session-close.sh sin verificación PAT-004
  Agregar verificación: si hay commits T-NNN en el log sin [x] en task-plan, emitir
  advertencia antes del cierre. Requiere análisis de git log. Prioridad: media.
  Origen: ÉPICA 41, analyze/process/task-plan-sync-root-cause.md Fix 3.
  ```
  - (C-4, Fix 3 — va al backlog, no a esta ÉPICA)

- [x] **T-035** Commit B9: `feat(goto-problem-fix): framework improvements — audit in SKILL catalog, PAT-004 enforce, session-start fix`

---

## Cierre

- [x] **T-036** Verificación final:
  ```bash
  grep "Herramientas de calidad" .claude/skills/thyrox/SKILL.md           # con match
  grep "PAT-004.*OBLIGATORIO" .claude/skills/workflow-implement/SKILL.md  # con match
  grep "maxdepth 2" .claude/scripts/session-start.sh                      # con match (2 líneas)
  bash -n .claude/scripts/session-start.sh                                 # PASS
  grep "TD-042" .thyrox/context/technical-debt.md                          # con match
  grep "setup-template.sh" README.md | grep "bash setup"                   # vacío
  ```

- [x] **T-037** Actualizar `now.md` y `focus.md`: reflejar B8/B9 completados, WP en Stage 11 continuando

- [x] **T-038** Commit cierre + push: `chore(goto-problem-fix): B8/B9 complete — remediation plan executed`

---

## DAG de dependencias

```
T-026 (sync checkboxes) ─┐
T-027 (README fix)       ├──→ T-030 (commit B8) ─┐
T-028 (audit report)     │                         │
T-029 (templates audit)  ┘                         │
                                                   ├──→ T-036 (verify) → T-037 (state) → T-038 (push)
T-031 (SKILL.md thyrox)  ─┐                        │
T-032 (workflow-implement)├──→ T-035 (commit B9) ─┘
T-033 (session-start.sh) │
T-034 (TD-042)           ┘
```

---

## Resumen de progreso

| Batch | Tareas | Completadas | Pendientes |
|-------|--------|-------------|------------|
| **B8 — Audit corrections** | 5 | 0 | 5 |
| **B9 — Framework** | 5 | 0 | 5 |
| **Cierre** | 3 | 0 | 3 |
| **Total** | **13** | **0** | **13** |
