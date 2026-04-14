```yml
created_at: 2026-04-12 00:00:00
wp: 2026-04-11-23-27-08-technical-debt-audit
fase: FASE 32
phase: 5 - DECOMPOSE
status: Pendiente aprobación
```

# Task Plan — technical-debt-audit (FASE 32)

## Resumen

| Grupo | Tareas | TDs cubiertos |
|-------|--------|---------------|
| A — Status updates (SPEC-001) | T-001 | TD-006/007/008/029/031/032/033 |
| B.1 — TD-039 async_suitable (SPEC-002) | T-002..T-004 | TD-039 |
| B.2 — TD-038 Edit rules (SPEC-003) | T-005..T-007 | TD-038 |
| B.3 — TD-040 Gates (SPEC-004/005/006) | T-008..T-012 | TD-040 |
| REGLA-LONGEV-001 (SPEC-007) | T-013..T-015 | todos los [x] |
| **Total** | **15 tareas** | **10 TDs** |

---

## DAG de dependencias

```mermaid
graph TD
    T001[T-001: Grupo A status [x]]

    T002[T-002: async_suitable deep-review]
    T003[T-003: async_suitable task-planner]
    T004[T-004: TD-039 [x] en TD.md]

    T005[T-005: Remove Edit rules settings.json]
    T006[T-006: Update tool-execution-model.md]
    T007[T-007: TD-038 [x] en TD.md]

    T008[T-008: Gate humano workflow-plan]
    T009[T-009: Artefact update workflow-strategy]
    T010[T-010: Artefact update workflow-structure]
    T011[T-011: status field template]
    T012[T-012: TD-040 [x] en TD.md]

    T013[T-013: Crear resolved file]
    T014[T-014: Limpiar technical-debt.md]
    T015[T-015: Verificar wc -c lt 25000]

    T002 --> T004
    T003 --> T004
    T005 --> T006
    T005 --> T007
    T006 --> T007
    T008 --> T012
    T009 --> T012
    T010 --> T012
    T011 --> T012

    T001 --> T013
    T004 --> T013
    T007 --> T013
    T012 --> T013
    T013 --> T014
    T014 --> T015
```

**Paralelismo disponible:**
- T-001 es independiente (puede ir primero o en paralelo con B.1/B.2/B.3)
- T-002 y T-003 pueden ejecutarse en paralelo (archivos distintos)
- T-005 es independiente de T-002/T-003
- T-008, T-009, T-010, T-011 pueden ejecutarse en paralelo (archivos distintos)

---

## Grupo A — Status updates (SPEC-001)

- [x] T-001: Marcar TD-006, TD-007, TD-008, TD-029, TD-031, TD-032, TD-033 como `[x]` en `technical-debt.md` (SPEC-001)
  - **Archivo:** `.claude/context/technical-debt.md`
  - **Cambio:** 7 entradas `Estado: "[ ] Pendiente"` → `Estado: "[x] Resuelto 2026-04-11 (FASE 32, auditado — implementado en FASEs anteriores)"`
  - **Nota:** Fecha `2026-04-11` = fecha real de la auditoría (cuando se descubrió la implementación existente), no la fecha de ejecución de este WP
  - **Verificación:** `grep -c "\[x\] Resuelto 2026-04-11" technical-debt.md` → 7

---

## Grupo B.1 — TD-039: async_suitable en agentes (SPEC-002)

- [x] T-002: Añadir `async_suitable: true` al frontmatter de `agents/deep-review.md` (SPEC-002)
  - **Archivo:** `.claude/agents/deep-review.md`
  - **Cambio:** Insertar `async_suitable: true  # Read-only analysis — safe for run_in_background=true` después del campo `description`
  - **Verificación:** `grep "async_suitable" .claude/agents/deep-review.md` → match

- [x] T-003: Añadir `async_suitable: true` al frontmatter de `agents/task-planner.md` (SPEC-002)
  - **Archivo:** `.claude/agents/task-planner.md`
  - **Cambio:** Insertar `async_suitable: true  # Planning-only — writes WP artefacts, safe for background` después del campo `description`
  - **Verificación:** `grep "async_suitable" .claude/agents/task-planner.md` → match

- [x] T-004: Marcar TD-039 como `[x]` en `technical-debt.md` (SPEC-002 completion)
  - **Archivo:** `.claude/context/technical-debt.md`
  - **Depende de:** T-002, T-003
  - **Cambio:** TD-039 `Estado: "[ ] Parcialmente implementado"` → `Estado: "[x] Resuelto 2026-04-12 (FASE 32)"`
  - **Verificación:** `grep "TD-039" technical-debt.md` → contiene `[x]`

---

## Grupo B.2 — TD-038: Limpiar settings.json (SPEC-003)

- [x] T-005: Eliminar 3 reglas `Edit(...)` redundantes de `settings.json` (SPEC-003)
  - **Archivo:** `.claude/settings.json`
  - **Cambio:** Eliminar SOLO las 3 líneas con `"Edit(/.claude/context/now.md)"`, `"Edit(/.claude/context/focus.md)"`, `"Edit(/.claude/context/work/**)"`
  - **IMPORTANTE — NO tocar:** Las reglas `Write(...)` deben permanecer intactas: `Write(/.claude/context/now.md)`, `Write(/.claude/context/focus.md)`, `Write(/.claude/context/work/**)`
  - **Referencia:** Ver `design.md D-03` para el estado final exacto esperado de `settings.json`
  - **Verificación 1:** `grep -c "Edit(/.claude" .claude/settings.json` → 0
  - **Verificación 2:** `grep -c "Write(/.claude/context" .claude/settings.json` → 3 (las Write permanecen)
  - **GATE OPERACIÓN:** Este archivo requiere prompt(ask) — confirmar antes de editar

- [x] T-006: Actualizar ejemplo canónico en `tool-execution-model.md` (SPEC-003)
  - **Archivo:** `.claude/references/tool-execution-model.md`
  - **Cambio:** Sección "Estructura de settings.json" (líneas 64-82) — remover `Edit(/.claude/context/now.md)` del ejemplo, mostrar solo reglas `Write(...)` como ejemplo de paths con permisos
  - **Depende de:** T-005
  - **Verificación:** El ejemplo no muestra reglas `Edit(...)` redundantes

- [x] T-007: Marcar TD-038 como `[x]` en `technical-debt.md` + smoke test de `session-start.sh` (SPEC-003 completion)
  - **Archivo:** `.claude/context/technical-debt.md`
  - **Depende de:** T-005, T-006
  - **Cambio:** TD-038 `Estado: "[ ] Pendiente"` → `Estado: "[x] Resuelto 2026-04-12 (FASE 32)"`
  - **Smoke test post-settings:** `bash .claude/scripts/session-start.sh` ejecuta sin errores (verifica que eliminar las 3 Edit rules no rompió nada)

---

## Grupo B.3 — TD-040: Gates en workflow-*/SKILL.md (SPEC-004/005/006)

- [x] T-008: Añadir sección `## Gate humano` a `workflow-plan/SKILL.md` (SPEC-004)
  - **Archivo:** `.claude/skills/workflow-plan/SKILL.md`
  - **Cambio:** Insertar entre `## Validaciones pre-gate` y `## Exit criteria`:
    ```markdown
    ## Gate humano

    ⏸ STOP — Presentar scope statement (problema, in-scope, out-of-scope, criterios de éxito) al usuario.
    Esperar confirmación explícita. NO continuar sin respuesta.
    Al aprobar:
    1. Actualizar `context/now.md::phase` a `Phase 4`
    2. Actualizar `{nombre-wp}-plan.md::status` a `Aprobado — {fecha}`
    3. Marcar `[x] Scope aprobado por usuario — {fecha}` en `{nombre-wp}-plan.md`
    ```
  - **Verificación:** `grep -n "Gate humano" .claude/skills/workflow-plan/SKILL.md` → match

- [x] T-009: Actualizar gate de `workflow-strategy/SKILL.md` con paso de artefacto (SPEC-005)
  - **Archivo:** `.claude/skills/workflow-strategy/SKILL.md`
  - **Cambio:** Reemplazar `Al aprobar: actualizar \`context/now.md::phase\` a \`Phase 3\`.` con:
    ```markdown
    Al aprobar:
    1. Actualizar `context/now.md::phase` a `Phase 3`
    2. Actualizar `{nombre-wp}-solution-strategy.md::status` a `Aprobado — {fecha}`
    ```
  - **Verificación:** `grep "solution-strategy.md::status" .claude/skills/workflow-strategy/SKILL.md` → match

- [x] T-010: Actualizar gate de `workflow-structure/SKILL.md` con paso de artefacto (SPEC-006A)
  - **Archivo:** `.claude/skills/workflow-structure/SKILL.md`
  - **Cambio:** Reemplazar `Al aprobar: actualizar \`context/now.md::phase\` a \`Phase 5\`.` con:
    ```markdown
    Al aprobar:
    1. Actualizar `context/now.md::phase` a `Phase 5`
    2. Actualizar `{nombre-wp}-requirements-spec.md::status` a `Aprobado — {fecha}`
    ```
  - **Verificación:** `grep "requirements-spec.md::status" .claude/skills/workflow-structure/SKILL.md` → match

- [x] T-011: Añadir campo `status` al frontmatter de `requirements-specification.md.template` (SPEC-006B)
  - **Archivo:** `.claude/skills/workflow-structure/assets/requirements-specification.md.template`
  - **Cambio:** Insertar después de `updated_at`:
    ```yml
    status: [Pendiente aprobación | Aprobado — YYYY-MM-DD]
    ```
  - **Verificación:** `grep "status:" .claude/skills/workflow-structure/assets/requirements-specification.md.template` → match

- [x] T-012: Marcar TD-040 como `[x]` en `technical-debt.md` (SPEC-004/005/006 completion)
  - **Archivo:** `.claude/context/technical-debt.md`
  - **Depende de:** T-008, T-009, T-010, T-011
  - **Cambio:** TD-040 `Estado: "[ ] Pendiente"` → `Estado: "[x] Resuelto 2026-04-12 (FASE 32)"`

---

## REGLA-LONGEV-001 (SPEC-007)

- [x] T-013: Crear `technical-debt-audit-technical-debt-resolved.md` con todos los TDs de FASE 32 (SPEC-007A)
  - **Archivo (crear):** `context/work/2026-04-11-23-27-08-technical-debt-audit/technical-debt-audit-technical-debt-resolved.md`
  - **Depende de:** T-001, T-004, T-007, T-012
  - **Estructura requerida:** Frontmatter (`created_at`, `wp`, `fase`) + tabla con columnas: `| TD | Descripción breve | Grupo | Cómo se resolvió | Fecha |`
  - **Contenido:** 10 filas — Grupo A (TD-006/007/008/029/031/032/033 — "auditado, ya implementado en FASEs anteriores") + Grupo B (TD-038/039/040 — "implementado en FASE 32")
  - **Referencia de formato:** Ver `technical-debt-resolution-technical-debt-resolved.md` de FASE 29 como ejemplo de estructura
  - **Verificación:** Archivo existe con 10 entradas (una por TD)

- [x] T-014: Eliminar todas las entradas `[x]` de `technical-debt.md` (SPEC-007B)
  - **Archivo:** `.claude/context/technical-debt.md`
  - **Depende de:** T-013
  - **Entradas a eliminar:**
    - FASE 29: TD-002, TD-004, TD-011, TD-016, TD-017, TD-021, TD-019, TD-020, TD-023, TD-024
    - FASE 31: TD-036, TD-037
    - FASE 32: TD-006, TD-007, TD-008, TD-029, TD-031, TD-032, TD-033, TD-038, TD-039, TD-040
  - **Total:** 22 entradas [x] a eliminar
  - **Verificación:** `grep -c "\[x\]" .claude/context/technical-debt.md` → 0

- [x] T-015: Verificar que `technical-debt.md` cumple REGLA-LONGEV-001 (SPEC-007B acceptance)
  - **Archivo:** `.claude/context/technical-debt.md`
  - **Depende de:** T-014
  - **Verificación 1:** `wc -c .claude/context/technical-debt.md` → valor < 25000
  - **Verificación 2 (integridad):** Los 14 TDs activos de `design.md D-04` siguen presentes — verificar con:
    ```
    grep -l "TD-001\|TD-003\|TD-005\|TD-009\|TD-010\|TD-018\|TD-022\|TD-025\|TD-026\|TD-027\|TD-028\|TD-030\|TD-034\|TD-035" .claude/context/technical-debt.md
    ```
    → debe devolver el archivo (todos los TDs activos permanecen)
  - **Nota:** Si > 25000 bytes, revisar si quedaron entradas [x] sin eliminar o secciones de metadata innecesarias

---

## Cobertura SPEC → Tarea

| SPEC | Tareas | Estado |
|------|--------|--------|
| SPEC-001 (TD-006/007/008/029/031/032/033) | T-001 | [ ] |
| SPEC-002 (TD-039) | T-002, T-003, T-004 | [ ] |
| SPEC-003 (TD-038) | T-005, T-006, T-007 | [ ] |
| SPEC-004 (TD-040A workflow-plan) | T-008 | [ ] |
| SPEC-005 (TD-040B workflow-strategy) | T-009 | [ ] |
| SPEC-006 (TD-040C workflow-structure + template) | T-010, T-011 | [ ] |
| SPEC-004/005/006 completion | T-012 | [ ] |
| SPEC-007 (REGLA-LONGEV-001) | T-013, T-014, T-015 | [ ] |

---

## Orden de ejecución sugerido

```
Sesión única:
1. T-001 (Grupo A — batch 7 TDs)
2. T-002, T-003 en paralelo (deep-review + task-planner)
3. T-004 (TD-039 [x])
4. T-005 (settings.json — GATE OPERACIÓN)
5. T-006 (tool-execution-model.md)
6. T-007 (TD-038 [x])
7. T-008, T-009, T-010, T-011 en paralelo (4 SKILL files distintos)
8. T-012 (TD-040 [x])
9. T-013 (crear resolved file)
10. T-014 (limpiar technical-debt.md — operación de alto impacto)
11. T-015 (verificar wc -c)
```
