```yml
type: Task Plan
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: Pendiente de ejecución
phase: Phase 5 — DECOMPOSE
reversibility: reversible
```

# Task Plan: context-hygiene

## Pre-flight

**Archivos afectados:**

| Tarea | Archivo |
|-------|---------|
| T-001 | `.claude/skills/pm-thyrox/references/state-management.md` (nuevo) |
| T-002 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 1 step 2) |
| T-003 | `.claude/skills/pm-thyrox/SKILL.md` (gates de fase) |
| T-004 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 7) |
| T-005 | `.claude/skills/pm-thyrox/scripts/update-state.sh` (nuevo) |
| T-006 | `.claude/context/project-state.md` (generado por script) |
| T-007 | `.claude/context/now.md` |
| T-008 | `.claude/context/focus.md` |
| T-009 | Verificación (lectura + bash — sin escritura) |
| T-010 | `.claude/CLAUDE.md` + `.claude/skills/pm-thyrox/SKILL.md` (glosario) |
| T-011 | `context/work/.../lessons-learned.md` + `CHANGELOG.md` + `ROADMAP.md` |

**Intersecciones:** T-002, T-003, T-004, T-010 tocan `SKILL.md` → secuenciales entre sí.
T-001 (reference nuevo), T-005 (script nuevo), T-007, T-008 → independientes entre sí y de SKILL.md.
T-006 depende de T-005. T-009 depende de T-006 + T-007 + T-008.

**Sin agentes en background** — ejecución single-agent.

---

## Tareas

- [x] [T-001] Crear `references/state-management.md` con tabla de triggers: archivo × evento (crear WP, cambiar Phase, cerrar WP, añadir agente) (US-01 / AC-01.1, AC-01.2, AC-01.3, AC-01.4, AC-01.5)

- [x] [T-002] Añadir en SKILL.md Phase 1 step 2 (crear WP): instrucción de actualizar `now.md` con `current_work` y `phase: Phase 1` inmediatamente al crear el WP (US-02 / AC-02.1)

- [x] [T-003] Añadir en cada gate de Phase SKILL.md (⏸ GATE HUMANO): instrucción de actualizar `now.md::phase` antes de avanzar a la siguiente fase (US-02 / AC-02.2)

- [x] [T-004] Ampliar checklist final de Phase 7 en SKILL.md: instrucción explícita con contenido mínimo para cada archivo — `focus.md` (FASE completada + próximo paso), `now.md` (`current_work: null`, `phase: null`), `project-state.md` (ejecutar `update-state.sh`) (US-02 / AC-02.3, AC-02.4)

- [x] [T-005] Crear script `update-state.sh` que lea agentes reales de `.claude/agents/`, versión de `CHANGELOG.md`, FASEs de `ROADMAP.md` y escriba `project-state.md` actualizado. Soportar `--dry-run` (US-03 / AC-03.1, AC-03.2, AC-03.3, AC-03.4, AC-03.5)

- [x] [T-006] Ejecutar `update-state.sh` para generar `project-state.md` con estado real: 9 agentes, FASEs 1-19, versión 1.6.0 (US-04 / AC-04.3)

- [x] [T-007] Actualizar `now.md`: `current_work: 2026-04-08-02-05-03-context-hygiene`, `phase: Phase 6`, `updated_at` hoy (US-04 / AC-04.1)

- [x] [T-008] Actualizar `focus.md`: FASE 19 completada (async-gates), WP context-hygiene activo, próximos pasos (US-04 / AC-04.2)

- [x] [T-009] Verificar que `session-start.sh` lee correctamente el WP activo desde `now.md` actualizado (US-04 / AC-04.4)

- [ ] [T-010] Añadir sección "Glosario" en `CLAUDE.md` + nota/referencia en `SKILL.md` con distinción FASE vs Phase y ejemplo concreto (US-05 / AC-05.1, AC-05.2, AC-05.3)

- [x] [T-011] Crear `lessons-learned.md`, actualizar `CHANGELOG.md` y `ROADMAP.md` (FASE 20 → `[x]`)

---

## Orden de ejecución

```
T-001  (reference nuevo — independiente)
T-005  (script nuevo — independiente)
  ↓
T-002 ┐
T-003 │ secuenciales — todos tocan SKILL.md
T-004 │
T-010 ┘
  ↓
T-006  (depende de T-005)
T-007  (independiente — solo now.md)
T-008  (independiente — solo focus.md)
  ↓
T-009  (verificación — depende de T-006, T-007, T-008)
  ↓
T-011  (lecciones + CHANGELOG — al final)
```

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo | ✓ Completado |
| SP-02 | 2→3 | gate-fase | Strategy completa | ✓ Completado |
| SP-03 | 3→4 | gate-fase | Plan aprobado | ✓ Completado |
| SP-04 | 4→5 | gate-fase | Spec aprobada | ✓ Completado |
| SP-05 | 5→6 | gate-fase | Task-plan aprobado | ⏳ ACTUAL |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas | Presentar cambios, esperar SI |
