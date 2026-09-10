```yml
type: Task Plan
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-07 19:03:31
status: Pendiente de ejecución
phase: Phase 5 — DECOMPOSE
reversibility: documentation
```

# Task Plan: async-gates

## Pre-flight

**Archivos afectados:**
| Tarea | Archivo |
|-------|---------|
| T-001 | `.claude/context/work/2026-04-07-19-03-31-async-gates/analysis/async-gates-analysis.md` |
| T-002 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 3) |
| T-003 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 1) |
| T-004 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 5) |
| T-005 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 6 — task-notification) |
| T-006 | `.claude/skills/pm-thyrox/SKILL.md` (Phase 6 — calibración) |
| T-007 | `.claude/context/work/2026-04-07-19-03-31-async-gates/async-gates-lessons-learned.md` |
| T-008 | `CHANGELOG.md` + `ROADMAP.md` |

**Intersecciones:** T-002 a T-006 todas tocan `SKILL.md` → ejecución secuencial obligatoria.
T-001 y T-007/T-008 no tocan `SKILL.md` → pueden ejecutarse en sus ventanas sin conflicto.

**No se lanza ningún agente en background** — WP es `documentation`, tareas simples de edición. Ejecución single-agent.

---

## Tareas

- [x] [T-001] Añadir sección `## Stopping Point Manifest` en `async-gates-analysis.md` con tabla completa (gate-fase de las 7 fases de este WP) (US-06 / AC-06.1, AC-06.2)

- [x] [T-002] Añadir nota metodológica en SKILL.md Phase 3: "Phase 2 define el cómo; Phase 3 define el qué" con aclaración de que Phase 2 orienta pero no declara scope (US-05 / AC-05.1, AC-05.2)

- [x] [T-003] Añadir paso 9 en SKILL.md Phase 1: crear sección `## Stopping Point Manifest` en el `*-analysis.md` del WP, con formato estándar de tabla (ID | Fase | Tipo | Evento | Acción requerida) y tipos válidos (gate-fase, async-completion, gate-operacion, gate-decision) (US-01 / AC-01.1, AC-01.2, AC-01.3, AC-01.4, AC-01.5)

- [x] [T-004] Ampliar Phase 5 SKILL.md sección pre-flight: añadir paso para registrar SP-NNN por cada agente background en el Stopping Point Manifest antes de lanzarlo, con commit del manifest actualizado previo al primer agente (US-02 / AC-02.1, AC-02.2, AC-02.3)

- [x] [T-005] Añadir instrucción explícita en Phase 6 SKILL.md para `<task-notification>`: 6 pasos (identificar SP → presentar resultado → STOP → esperar → marcar ✓ → continuar o crear ERR-NNN) (US-03 / AC-03.1, AC-03.2, AC-03.3, AC-03.4)

- [x] [T-006] Añadir tabla de calibración de gates async en Phase 6 SKILL.md: dos ejes reversibilidad × tipo de agente, tres niveles (fuerte/estándar/ligero) (US-04 / AC-04.1, AC-04.2, AC-04.3, AC-04.4)

- [x] [T-007] Crear `async-gates-lessons-learned.md` con lecciones L-068+ (Phase 7 prep)

- [x] [T-008] Actualizar ROADMAP.md (checkboxes FASE 19 → `[x]`) y CHANGELOG.md

---

## Orden de ejecución

```
T-001  (independiente — solo toca analysis.md)
  ↓
T-002  ┐
T-003  │ secuenciales — todos tocan SKILL.md
T-004  │
T-005  │
T-006  ┘
  ↓
T-007  (lecciones — después de implementación)
  ↓
T-008  (ROADMAP + CHANGELOG — al final)
```

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo | ✓ Completado — usuario aprobó |
| SP-02 | 2→3 | gate-fase | Estrategia definida | ✓ Completado — usuario aprobó |
| SP-03 | 3→4 | gate-fase | Plan y scope aprobado | ✓ Completado — usuario aprobó |
| SP-04 | 4→5 | gate-fase | Spec aprobada | ✓ Completado — usuario aprobó |
| SP-05 | 5→6 | gate-fase | Task-plan completo | ⏳ ACTUAL — este gate |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas | Presentar cambios en SKILL.md, esperar SI |
