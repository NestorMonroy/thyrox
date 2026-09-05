```yml
type: Exit Conditions
created_at: 2026-04-13 20:17:28
project: thyrox-framework
feature: technical-debt-resolution
fase: FASE 34
wp_size: pequeño
reversibility: reversible
```

# Exit Conditions — technical-debt-resolution (FASE 34)

> **GATES SON OBLIGATORIOS.** No avanzar si las condiciones no se cumplen.
> WP pequeño → fases activas: 1, 3, 5, 6, 7. Phase 2 y Phase 4 omitidas.

---

## Phase 1: ANALYZE

**Exit conditions:**
- [x] Objetivo documentado: resolver 7 TDs (TD-001, TD-003, TD-009, TD-018, TD-027, TD-028, TD-035)
- [x] TD-010 explícitamente fuera de scope (trigger no activado)
- [x] Trabajo pendiente definido por TD con archivos afectados
- [x] WP clasificado como `pequeño` con justificación
- [x] Fases 2 y 4 propuestas para omisión con justificación
- [x] Stopping Point Manifest SP-01..SP-03 documentado
- [x] `technical-debt-resolution-risk-register.md` existe (4 riesgos)
- [x] `technical-debt-resolution-exit-conditions.md` existe (este archivo)
- [ ] **Usuario aprobó hallazgos, clasificación pequeño, omisión Phase 2/4** ← Gate SP-01

**Transition:** → Phase 3 PLAN (saltando Phase 2 SOLUTION_STRATEGY)

---

## Phase 2: SOLUTION_STRATEGY

**Estado: OMITIDA** — WP clasificado como pequeño. Cada TD tiene solución ya identificada en analysis.md. No hay decisiones arquitectónicas nuevas. Aprobación SP-01 requerida.

---

## Phase 3: PLAN

**Exit conditions:**
- [x] Scope statement: lista de 7 TDs + archivos afectados por cada uno
- [x] ROADMAP.md actualizado con entrada FASE 34
- [ ] **Usuario aprobó plan** ← Gate SP-02 (combinado con SP de Phase 5)

**Transition:** → Phase 5 DECOMPOSE (saltando Phase 4 STRUCTURE)

---

## Phase 4: STRUCTURE

**Estado: OMITIDA** — WP pequeño. El analysis.md describe el trabajo con suficiente detalle. No se requiere spec formal. Aprobación SP-01 requerida.

---

## Phase 5: DECOMPOSE

**Exit conditions:**
- [x] `technical-debt-resolution-task-plan.md` existe (17 tareas T-001..T-017)
- [x] Tareas atómicas T-NNN — una tarea por cambio concreto en archivo
- [x] DAG de dependencias documentado (TD-027 antes que TD-035 por settings.json)
- [ ] **Usuario aprobó task-plan** ← Gate SP-02

**Transition:** → Phase 6 EXECUTE

---

## Phase 6: EXECUTE

**Exit conditions:**

### TD-001 — Timestamps incompletos
- [ ] `validate-session-close.sh` detecta `created_at: YYYY-MM-DD$` (sin hora) — commit

### TD-003 — Templates huérfanos
- [ ] Audit de 6 templates completado (mapear / legacy / eliminar)
- [ ] `assets/legacy/` creado si aplica
- [ ] `ad-hoc-tasks.md.template` referenciado en SKILL.md Phase 6 (si se decide mapear)
- [ ] Commit

### TD-009 — now-{agent-name}.md en agentes
- [ ] `references/agent-spec.md` — campo `state_file` agregado
- [ ] `agents/task-executor.md` — instrucción `now-task-executor.md`
- [ ] `agents/task-planner.md` — instrucción `now-task-planner.md`
- [ ] Commit

### TD-018 — execution-log timestamps
- [ ] `framework-evolution-execution-log.md` `created_at` corregido a `YYYY-MM-DD HH:MM:SS`
- [ ] Commit

### TD-027 — Criterio auto-write vs validación
- [ ] `thyrox/SKILL.md` — tabla de categorías completada (References, ADRs, Scripts operacionales)
- [ ] `settings.json` — `Write(/.claude/references/**)` agregado al allow list
- [ ] Commit

### TD-028 — Reclasificación tamaño WP
- [ ] `workflow-strategy/SKILL.md` — sección `## Re-evaluación de tamaño post-estrategia` agregada
- [ ] Commit

### TD-035 — Alerta tamaño archivos vivos
- [ ] `project-status.sh` — bloque REGLA-LONGEV-001 agregado con `wc -c` para 4 archivos monitoreados
- [ ] Commit

### Cierre
- [x] `technical-debt.md` — 7 TDs marcados `[x]` con fecha 2026-04-14
- [x] Commit C8
- [ ] **Usuario aprobó resultado** ← Gate SP-03

**Transition:** → Phase 7 TRACK

---

## Phase 7: TRACK

**Exit conditions:**
- [x] `technical-debt-resolution-lessons-learned.md` existe (4 lecciones)
- [x] `technical-debt-resolution-changelog.md` existe (9 commits)
- [x] `technical-debt-resolution-technical-debt-resolved.md` existe (7 TDs)
- [x] `context/now.md` → `current_work: null`, `phase: null`
- [x] `context/focus.md` actualizado con FASE 34
- [x] Commit + push del cierre del WP
- [x] Prueba de Edit automático confirmada — 2026-04-14
