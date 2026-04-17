```yml
created_at: 2026-04-17 19:30:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Stage 8 — PLAN EXECUTION
author: NestorMonroy
status: Borrador
```

# Task Plan — goto-problem-fix (ÉPICA 41)

> **Generado desde:** `plan/goto-problem-fix-plan.md`
> **Alcance:** 30 problemas en 4 clusters — migración parcial acumulada ÉPICAs 29/31/35/39
> **Ruta crítica:** T-001 → T-002 → T-003 → T-004 (Batch 1) → Batches 2-5 en paralelo

---

## Convención de tarea

Opción C — tareas genéricas con trazabilidad a problema raíz.
Formato: `T-NNN Descripción (ID-problema)`

---

## B1 — Scripts (ruta crítica)

> Orden interno: close-wp.sh primero (más bugs), luego session-start.sh, luego session-resume.sh
> Prerequisito de todos los demás batches: si los scripts están rotos, los docs describen comportamiento incorrecto.

- [ ] **T-001** Aplicar fixes A-4 + A-5 + A-6 en `close-wp.sh`: agregar patrones sed `stage:/flow:/methodology_step:` con retrocompat `phase:`, cleanup bash-puro del body `# Contexto`, llamada a `update-state.sh || true` (A-4, A-5, A-6)
- [ ] **T-002** Aplicar fixes A-1 + GAP-02 en `session-start.sh`: eliminar fallback líneas 61-63 y comprimir 6 líneas de comentarios (L9-12→1, L37→delete, L40-41→delete) para llegar a exactamente 120 líneas (A-1, GAP-02)
- [ ] **T-003** Aplicar fixes A-2 + A-3 en `session-resume.sh`: agregar lectura `stage:` con fallback `phase:` en línea 36 y eliminar bloque fallback líneas 46-48 (A-2, A-3)
- [ ] **T-004** Validar sintaxis: `bash -n .claude/scripts/close-wp.sh && bash -n .claude/scripts/session-start.sh && bash -n .claude/scripts/session-resume.sh && wc -l .claude/scripts/session-start.sh`
- [ ] **T-005** Commit B1: `fix(goto-problem-fix): fix session scripts phase→stage migration A-1..A-6 GAP-02`

---

## B2 — Documentación de estado (state-management + methodology_step)

> Puede ejecutarse en paralelo con B3 y B4 después de completar B1.
> D-1 documenta el comportamiento que A-5 implementa — hacerlo post-fix para documentar la solución real.

- [ ] **T-006** Actualizar `state-management.md` (D-1): agregar sección `# Contexto body` documentando que es LLM-managed, que `close-wp.sh` lo resetea al cerrar WP, y su formato canónico; agregar campos `flow` y `methodology_step` en la tabla de campos YAML (D-1)
- [ ] **T-007** Agregar docs de `methodology_step` (D-4): en el archivo de referencia apropiado, documentar el namespacing completo (`dmaic:define`, `pdca:do`, `ba:planning`, `rup:inception`, etc.) con tabla completa de todos los coordinators (D-4)
- [ ] **T-008** Commit B2: `docs(goto-problem-fix): document now.md body and methodology_step namespacing D-1 D-4`

---

## B3 — README (9 ítems directos + 2 archivos separados)

> Independiente de B2. Los 9 ítems de README van en un solo Edit.

- [ ] **T-009** Aplicar fixes B-1..B-9 en `README.md` en un solo Edit: renombrar `pm-thyrox`→`thyrox` (×5), actualizar Quick Start con nota de migración `setup-template.sh`, corregir "Phase 1: ANALYZE"→"Stage 1: DISCOVER", reemplazar `/task:show`/`/task:next` por comandos actuales, actualizar árbol de directorios `.claude/context/`→`.thyrox/context/`, reemplazar "7 fases SDLC"→"12 stages THYROX", agregar sección Coordinators con lista de 11 coordinators, actualizar versión a v2.8.0 y fecha (B-1, B-2, B-3, B-4, B-5, B-6, B-7, B-8, B-9)
- [ ] **T-010** Commit B3: `docs(goto-problem-fix): update README for ÉPICA 29/31/35/39 migrations B-1..B-9`

---

## B4 — ARCHITECTURE.md

> Independiente de B2 y B3.

- [ ] **T-011** Actualizar `ARCHITECTURE.md` (B-10): agregar sección de coordinator pattern (Patrón 3 + Patrón 5), diagrama de flujo methodology_step → coordinator → worktree, campos `flow`/`methodology_step` en now.md, y lista de 11 coordinators con su methodology (B-10)
- [ ] **T-012** Commit B4: `docs(goto-problem-fix): update ARCHITECTURE.md with coordinator pattern B-10`

---

## B5 — DECISIONS.md + guías de metodología

> Puede ejecutarse en paralelo con B3 y B4. Después de B2 es preferible (D-4 ya documentado).

- [ ] **T-013** Actualizar `DECISIONS.md` (B-11): agregar índice de ADRs de coordinators creados en ÉPICA 40 (pdca-coordinator, dmaic-coordinator, rup-coordinator, rm-coordinator, pmbok-coordinator, babok-coordinator, lean-coordinator, bpa-coordinator, pps-coordinator, sp-coordinator, cp-coordinator, thyrox-coordinator) con link al directorio `.thyrox/context/decisions/` (B-11)
- [ ] **T-014** Crear `methodology-selection-guide` (D-2): documento nuevo en `.claude/references/` con tabla de 11 metodologías, cuándo usar cada una, tipo de flujo, y señales de contexto que activan cada coordinator (D-2)
- [ ] **T-015** Crear `coordinator-integration guide` (D-3): documento nuevo en `.claude/references/` con contrato de invocación (cómo llamar a un coordinator), campos `now.md::flow` + `now.md::methodology_step`, ciclo de vida del coordinator, artifact-ready signals, y ejemplo paso a paso (D-3)
- [ ] **T-016** Commit B5: `docs(goto-problem-fix): add methodology guides and DECISIONS.md index B-11 D-2 D-3`

---

## Cierre

- [ ] **T-017** Verificar cobertura final: confirmar que todos los 30 problemas tienen fix aplicado (grep por `pm-thyrox`, `phase:` en scripts, `7 fases`, `.claude/context/` en README)
- [ ] **T-018** Actualizar `now.md`: stage → Stage 11 — TRACK/EVALUATE, commit + push
- [ ] **T-019** Push rama: `git push -u origin claude/check-merge-status-Dcyvj`

---

## DAG de dependencias

```
T-001 (close-wp.sh A-4+A-5+A-6)
T-002 (session-start.sh A-1+GAP-02)  ──→ T-004 (validar) ──→ T-005 (commit B1)
T-003 (session-resume.sh A-2+A-3)                                     │
                                                                       ↓
                                          ┌────────────────────────────┤
                                          │                            │
                                    T-006 (D-1)               T-009 (README B-1..9)
                                    T-007 (D-4)               T-011 (ARCH B-10)
                                    T-008 (commit B2)         T-013 (DECISIONS B-11)
                                          │                   T-014 (guide D-2)
                                          │                   T-015 (guide D-3)
                                          │                   T-010 (commit B3)
                                          │                   T-012 (commit B4)
                                          │                   T-016 (commit B5)
                                          └─────────────────────────────────────────→ T-017 → T-018 → T-019
```

---

## Stopping Points

| SP | Tarea | Condición de parada |
|----|-------|---------------------|
| SP-B1 | Pre-T-005 | T-004 debe pasar: `bash -n` sin errores en los 3 scripts Y `wc -l session-start.sh` muestra ≤120 |

---

## Out-of-scope

- Índice de referencias (47 docs) y agents (23) → ÉPICA 42
- Reescritura completa de scripts (solo fixes quirúrgicos)
- Migración big-bang de terminología histórica en docs pre-ÉPICA 39

---

## Resumen de progreso

| Batch | Tareas | Completadas | Pendientes |
|-------|--------|-------------|------------|
| **B1 — Scripts** | 5 | 0 | 5 |
| **B2 — State docs** | 3 | 0 | 3 |
| **B3 — README** | 2 | 0 | 2 |
| **B4 — ARCHITECTURE.md** | 2 | 0 | 2 |
| **B5 — DECISIONS + guides** | 4 | 0 | 4 |
| **Cierre** | 3 | 0 | 3 |
| **Total** | **19** | **0** | **19** |
