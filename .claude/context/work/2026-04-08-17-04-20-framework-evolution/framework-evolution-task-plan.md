```yml
type: Task Plan
work_package: 2026-04-08-17-04-20-framework-evolution
created_at: 2026-04-08 21:00:00
phase: Phase 5 — DECOMPOSE
total_tasks: 31
status: Pendiente aprobación
```

# Task Plan — FASE 22: Framework Evolution

## DAG de Dependencias

```mermaid
flowchart TD
    T001[T-001 stop-hook-git-check.sh] --> T003[T-003 settings.json Stop]
    T002[T-002 session-resume.sh] --> T004[T-004 settings.json PostCompact]
    T005[T-005 SKILL.md Phase5 checklist]
    T006[T-006 ADR-015 Addendum] --> T010[T-010 ADR-016]
    T007[T-007 skill-vs-agent triggering]
    T008[T-008 skill-vs-agent hooks]
    T009[T-009 skill-vs-agent agent-teams]

    T011[T-011 Spike] --> T012[T-012 migrate analyze]
    T011 --> T013[T-013 migrate strategy]
    T011 --> T014[T-014 migrate plan]
    T011 --> T015[T-015 migrate structure]
    T011 --> T016[T-016 migrate decompose]
    T011 --> T017[T-017 migrate execute]
    T011 --> T018[T-018 migrate track]

    T012 --> T019[T-019 sync analyze]
    T013 --> T020[T-020 sync strategy]
    T014 --> T021[T-021 sync plan]
    T015 --> T022[T-022 sync structure]
    T016 --> T023[T-023 sync decompose]
    T017 --> T024[T-024 sync execute]
    T018 --> T025[T-025 sync track]
    T005 --> T023

    T019 & T020 & T021 & T022 & T023 & T024 & T025 --> T027[T-027 reduce pm-thyrox SKILL]
    T019 & T020 & T021 & T022 & T023 & T024 & T025 --> T028[T-028 delete commands/]
    T024 --> T026[T-026 sinergia note]
    T028 --> T029[T-029 COMMANDS_SYNCED=true]

    T030[T-030 SKILL.md Phase1 Step0] --> T031[T-031 context.md.template]
```

---

## Fases de Ejecución

### Sesión 1 — Bloque E + B (5 tareas, micro)

- [ ] [T-001] Crear `.claude/skills/pm-thyrox/scripts/stop-hook-git-check.sh` con verificación `stop_hook_active` (SPEC-E01)
- [ ] [T-002] Crear `.claude/skills/pm-thyrox/scripts/session-resume.sh` con lógica PostCompact condicional (SPEC-E02)
- [ ] [T-003] Actualizar `.claude/settings.json` — añadir entrada `Stop` hook (SPEC-E03)
- [ ] [T-004] Actualizar `.claude/settings.json` — añadir entrada `PostCompact` hook (SPEC-E03)
- [ ] [T-005] Actualizar `.claude/skills/pm-thyrox/SKILL.md` — añadir checklist atomicidad en sección Phase 5 DECOMPOSE (SPEC-B01)

**Checkpoint S1:** `stop-hook-git-check.sh` existe + `session-resume.sh` existe + `settings.json` tiene 3 hooks + SKILL.md Phase 5 tiene checklist. Verificar con `ls scripts/` y `cat settings.json`.

---

### Sesión 2 — Bloque A (5 tareas, docs)

- [ ] [T-006] Actualizar `.claude/context/decisions/adr-015.md` — añadir sección "Addendum 2026-04-08" con 5 correcciones (SPEC-A01)
- [ ] [T-007] Actualizar `.claude/skills/pm-thyrox/references/skill-vs-agent.md` — actualizar tabla de triggering con 3 modos (SPEC-A02)
- [ ] [T-008] Actualizar `.claude/skills/pm-thyrox/references/skill-vs-agent.md` — actualizar sección de hooks con 4 tipos (SPEC-A02)
- [ ] [T-009] Actualizar `.claude/skills/pm-thyrox/references/skill-vs-agent.md` — añadir Agent teams como 4ta categoría (SPEC-A02)
- [ ] [T-010] Crear `.claude/context/decisions/adr-016.md` — decisión commands→skills hidden (SPEC-A03)

**Checkpoint S2:** ADR-015 tiene Addendum + skill-vs-agent.md tiene 3 actualizaciones + ADR-016 existe. Verificar con `grep "Addendum" adr-015.md` y `ls decisions/`.

---

### Sesión 3 — Bloque C: Spike + Migración (8 tareas)

- [ ] [T-011] Spike: crear `.claude/skills/workflow_spike_test.md` con `disable-model-invocation: true`, verificar invocación `/<name>`, eliminar el archivo de prueba (SPEC-C01)

> **Gate T-011:** Si el spike falla, detener Bloque C y notificar al usuario. Activar fallback (mantener commands/, solo sincronizar contenido in-place). T-012..T-029 se cancelan.

- [ ] [T-012] [P] Crear `.claude/skills/workflow_analyze.md` — frontmatter + `disable-model-invocation: true` + hook `once:true` + contenido actual de commands/ (SPEC-C02)
- [ ] [T-013] [P] Crear `.claude/skills/workflow_strategy.md` — frontmatter + hook + contenido actual (SPEC-C02)
- [ ] [T-014] [P] Crear `.claude/skills/workflow_plan.md` — frontmatter + hook + contenido actual (SPEC-C02)
- [ ] [T-015] [P] Crear `.claude/skills/workflow_structure.md` — frontmatter + hook + contenido actual (SPEC-C02)
- [ ] [T-016] [P] Crear `.claude/skills/workflow_decompose.md` — frontmatter + hook + contenido actual (SPEC-C02)
- [ ] [T-017] [P] Crear `.claude/skills/workflow_execute.md` — frontmatter + hook + contenido actual (SPEC-C02)
- [ ] [T-018] [P] Crear `.claude/skills/workflow_track.md` — frontmatter + hook + contenido actual (SPEC-C02)

**Checkpoint S3:** `ls .claude/skills/workflow_*.md` muestra 7 archivos. Cada uno tiene `disable-model-invocation: true` en su frontmatter.

---

### Sesión 4 — Bloque C: Sync contenido parte 1 (4 tareas, batch)

- [ ] [T-019] [P] Actualizar `.claude/skills/workflow_analyze.md` — reemplazar cuerpo con lógica Phase 1 actual (contexto sesión, 8 aspectos, exit criteria, stopping point manifest) (SPEC-C03)
- [ ] [T-020] [P] Actualizar `.claude/skills/workflow_strategy.md` — reemplazar cuerpo con lógica Phase 2 actual (key ideas, research, decisiones, pre/post check) (SPEC-C03)
- [ ] [T-021] [P] Actualizar `.claude/skills/workflow_plan.md` — reemplazar cuerpo con lógica Phase 3 actual (scope, in-scope, out-of-scope, estimación, validación archivos existentes) (SPEC-C03)
- [ ] [T-022] [P] Actualizar `.claude/skills/workflow_structure.md` — reemplazar cuerpo con lógica Phase 4 actual (complejidad, spec/design, checklist) (SPEC-C03)

**Checkpoint S4:** Los 4 skills tienen contenido actualizado. Verificar que cada uno tiene sección "Exit criteria" y referencia al siguiente workflow.

---

### Sesión 5 — Bloque C: Sync contenido parte 2 (3 tareas, batch)

- [ ] [T-023] [P] Actualizar `.claude/skills/workflow_decompose.md` — reemplazar cuerpo con lógica Phase 5 actual (DAG, tareas atómicas, checklist atomicidad de T-005, aprobación usuario) (SPEC-C03)
- [ ] [T-024] [P] Actualizar `.claude/skills/workflow_execute.md` — reemplazar cuerpo con lógica Phase 6 actual (gates async, state-management now.md, stopping points, async gates) (SPEC-C03)
- [ ] [T-025] [P] Actualizar `.claude/skills/workflow_track.md` — reemplazar cuerpo con lógica Phase 7 actual (lecciones aprendidas, CHANGELOG, ROADMAP, cierre de FASE, now.md → complete) (SPEC-C03)

**Checkpoint S5:** Los 7 skills tienen contenido completo y actualizado. Cada uno tiene `updated_at` en frontmatter.

---

### Sesión 6 — Bloque C: Finalización (4 tareas)

- [ ] [T-026] Actualizar `.claude/skills/workflow_execute.md` — añadir nota de sinergia `/loop 10m /workflow_execute` al final del archivo (SPEC-C07)
- [ ] [T-027] Actualizar `.claude/skills/pm-thyrox/SKILL.md` — reducir a catálogo ~40 líneas (eliminar lógica de fases, mantener activación + tabla /workflow_* + ADR-015 ref) (SPEC-C04)
- [ ] [T-028] Eliminar los 7 archivos de `.claude/commands/`: `workflow_analyze.md`, `workflow_strategy.md`, `workflow_plan.md`, `workflow_structure.md`, `workflow_decompose.md`, `workflow_execute.md`, `workflow_track.md` (SPEC-C05)
- [ ] [T-029] Actualizar `.claude/skills/pm-thyrox/scripts/session-start.sh` línea 13 — cambiar `COMMANDS_SYNCED=false` → `COMMANDS_SYNCED=true` (SPEC-C06)

**Checkpoint S6:** `ls .claude/commands/` muestra solo `workflow_init.md`. `session-start.sh` línea 13 = `COMMANDS_SYNCED=true`. pm-thyrox SKILL.md ≤80 líneas.

---

### Sesión 7 — Bloque D (2 tareas)

- [ ] [T-030] Actualizar `.claude/skills/pm-thyrox/SKILL.md` — añadir Step 0 END USER CONTEXT al inicio de la sección Phase 1 ANALYZE (SPEC-D01)
- [ ] [T-031] Crear `.claude/skills/pm-thyrox/assets/context.md.template` — template para documentar END USER CONTEXT al inicio de cada WP (SPEC-D02)

**Checkpoint S7:** SKILL.md Phase 1 tiene Step 0 antes de los 8 aspectos. `assets/context.md.template` existe.

---

## Cobertura SPEC → Task

| SPEC | Tareas | Cobertura |
|------|--------|-----------|
| SPEC-E01 | T-001 | ✓ |
| SPEC-E02 | T-002 | ✓ |
| SPEC-E03 | T-003, T-004 | ✓ |
| SPEC-B01 | T-005 | ✓ |
| SPEC-A01 | T-006 | ✓ |
| SPEC-A02 | T-007, T-008, T-009 | ✓ |
| SPEC-A03 | T-010 | ✓ |
| SPEC-C01 | T-011 | ✓ |
| SPEC-C02 | T-012..T-018 | ✓ |
| SPEC-C03 | T-019..T-025 | ✓ |
| SPEC-C04 | T-027 | ✓ |
| SPEC-C05 | T-028 | ✓ |
| SPEC-C06 | T-029 | ✓ |
| SPEC-C07 | T-026 | ✓ |
| SPEC-D01 | T-030 | ✓ |
| SPEC-D02 | T-031 | ✓ |

**Cobertura: 16/16 SPECs cubiertos — 31 tareas atómicas**

---

## Checklist de Atomicidad (SPEC-B01 aplicado)

- [x] Cada tarea toca exactamente 1 ubicación (1 archivo O 1 sección de 1 archivo)
- [x] Ninguna descripción de tarea contiene "y" conectando dos operaciones distintas
- [x] Cada tarea puede commitearse y marcarse [x] de forma independiente

*Nota: T-011 (spike) crea + verifica + elimina un archivo temporal — es una única operación de validación que produce un resultado binario (pass/fail). Es atómica en su propósito.*

---

## Estado de Aprobación

- [ ] Task-plan aprobado por usuario — PENDIENTE
