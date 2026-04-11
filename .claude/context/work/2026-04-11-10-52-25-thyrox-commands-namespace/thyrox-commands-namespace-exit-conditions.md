```yml
type: Exit Conditions
created_at: 2026-04-11 10:52:25
project: thyrox-framework
feature: thyrox-commands-namespace
fase: FASE 31
wp_size: mediano
```

# Exit Conditions — thyrox-commands-namespace (FASE 31)

> **GATES SON OBLIGATORIOS.** No avanzar si las condiciones no se cumplen.
> WP mediano → todas las 7 fases activas.

---

## Phase 1: ANALYZE

**Exit conditions:**
- [x] 8 aspectos documentados (objetivo, stakeholders, uso operacional, atributos de calidad, restricciones, contexto/sistemas vecinos, fuera de alcance, criterios de éxito)
- [x] `analysis/thyrox-commands-namespace-analysis.md` sin `[NEEDS CLARIFICATION]`
- [x] `thyrox-commands-namespace-risk-register.md` existe (7 riesgos)
- [x] `thyrox-commands-namespace-exit-conditions.md` existe (este archivo)
- [x] Stopping Point Manifest documentado (SP-01..SP-06)
- [x] `reversibility: reversible` y `wp_size: mediano` en frontmatter
- [ ] **Usuario aprobó hallazgos explícitamente** ← PENDIENTE (Gate SP-01)

**Transition:** → Phase 2 SOLUTION STRATEGY (`/thyrox:strategy`)

---

## Phase 2: SOLUTION_STRATEGY

**Exit conditions:**
- [ ] `thyrox-commands-namespace-solution-strategy.md` existe
- [ ] Decisión documentada: Opción A / Opción B / Opción C (con justificación)
- [ ] Si aplica: ADR borrador creado o amendment de ADR-016 planificado
- [ ] Meta-comandos (UC-003): decisión documentada — ¿en FASE 31 o diferir FASE 32?
- [ ] Usuario aprobó strategy (Gate SP-02)

**Transition:** → Phase 3 PLAN

---

## Phase 3: PLAN

**Exit conditions:**
- [ ] `thyrox-commands-namespace-plan.md` existe
- [ ] Scope statement: qué archivos se modifican, cuáles no
- [ ] Scope incluye / excluye meta-comandos (UC-003) explícitamente
- [ ] ROADMAP.md actualizado con tarea de FASE 31
- [ ] Usuario aprobó plan (Gate SP-03)

**Transition:** → Phase 4 STRUCTURE

---

## Phase 4: STRUCTURE

**Exit conditions:**
- [ ] `thyrox-commands-namespace-requirements-spec.md` existe
- [ ] Cada UC (001–006 + TD-036) tiene acceptance criteria verificable
- [ ] Inventario de archivos afectados verificado con grep (no estimado)
- [ ] Si UC-003 en scope: meta-comandos tienen spec individual por comando
- [ ] Usuario aprobó spec (Gate SP-04)

**Transition:** → Phase 5 DECOMPOSE

---

## Phase 5: DECOMPOSE

**Exit conditions:**
- [ ] `thyrox-commands-namespace-task-plan.md` existe
- [ ] Cada tarea tiene ID T-NNN y referencia al UC/TD correspondiente
- [ ] Tareas atómicas — ninguna toca más de 1-2 archivos
- [ ] Orden de ejecución: `session-start.sh` primero (fuente de verdad), docs después
- [ ] Usuario aprobó task plan + GATE OPERACION (Gate SP-05)

**Transition:** → Phase 6 EXECUTE

---

## Phase 6: EXECUTE

**Exit conditions:**
- [ ] Todas las T-NNN en `[x]`
- [ ] `grep -ri "/workflow-analyze\|/workflow-strategy\|/workflow-plan\|/workflow-structure\|/workflow-decompose\|/workflow-execute\|/workflow-track" .claude/skills/ .claude/scripts/ .claude/references/ .claude/commands/` → 0 resultados (excepto paths de directorio)
- [ ] `bash .claude/scripts/session-start.sh` → muestra `/thyrox:analyze` en opción B
- [ ] TD-036 implementado: `workflow-analyze/SKILL.md` tiene paso 1.5
- [ ] `thyrox-commands-namespace-execution-log.md` documentado
- [ ] Usuario aprobó resultado (Gate SP-06)

**Transition:** → Phase 7 TRACK

---

## Phase 7: TRACK

**Exit conditions:**
- [ ] `thyrox-commands-namespace-lessons-learned.md` existe
- [ ] `thyrox-commands-namespace-wp-changelog.md` existe (commits documentados)
- [ ] `CHANGELOG.md` actualizado con entrada de release si aplica
- [ ] `context/now.md` → `current_work: null`, `phase: null`
- [ ] `context/focus.md` actualizado
- [ ] Commit + push del cierre del WP
