```yml
Fecha: 2026-04-04
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fase: 3 - PLAN
Estado: Pendiente aprobación
```

# Plan — Correcciones de proceso en SKILL.md Phase 3

## Scope Statement

**Problema:** SKILL.md Phase 3 no tiene gates que detengan al modelo cuando la
trazabilidad RC → tarea está incompleta, ni un criterio explícito que impida saltar
DECOMPOSE cuando hay RC con prioridades distintas.

**Usuarios:**
- Modelos (Sonnet, Haiku) que ejecutan el SKILL: reciben instrucciones con gates claros
- Desarrolladores que usan el framework: lo acordado en strategy llega implementado

**Criterios de éxito:**

```
grep -n "SI.*RC\|RC.*tarea\|trazabilidad" .claude/skills/pm-thyrox/SKILL.md
→ al menos 2 resultados en la sección Phase 3

grep -n "DECOMPOSE.*RC\|RC.*DECOMPOSE" .claude/skills/pm-thyrox/SKILL.md
→ al menos 1 resultado que exprese la condición

grep -n "trazabilidad\|RC.*tarea" .claude/skills/pm-thyrox/assets/plan.md.template
→ al menos 1 resultado en el template
```

---

## In-Scope

- SKILL.md Phase 3 — nuevo paso: construir tabla RC→tarea SI el plan viene de analysis/ con RC
- SKILL.md Phase 3 — nota: DECOMPOSE no se puede saltar SI hay RC con prioridades distintas
- SKILL.md Phase 3 — exit criteria: agregar verificación de cobertura como gate de salida
- plan.md.template — nueva sección condicional de trazabilidad RC→tarea
- Eliminar `process-error-analysis.md` de raíz del WP (H-005 — artefacto en lugar incorrecto)
- ROADMAP.md — actualizar FASE 9 con items de este scope
- CHANGELOG.md — actualizar v0.7.0 con las correcciones

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Modificar tabla de escalabilidad micro/pequeño/mediano/grande | La nota en Phase 3 la refina sin necesidad de cambiarla — Decision 2 de Phase 2 |
| Correcciones a otras phases (Phase 1, 2, 6, 7) | El patrón de "adelantarse" puede existir en otras phases, pero el scope es Phase 3 |
| Resolver T-DT-006 (solution-strategy.md.template sin mermaid) | WP separado |
| Migrar plan.md de WPs históricos al nuevo formato | Legacy — sin ROI |

---

## Trazabilidad H → Tarea

| Tarea | Archivo | Resuelve |
|-------|---------|---------|
| Nuevo paso trazabilidad en Phase 3 | `SKILL.md` | H-001 |
| Nota DECOMPOSE condicional en Phase 3 | `SKILL.md` | H-002 |
| Sección condicional en plan.md.template | `plan.md.template` | H-003 |
| Exit criteria Phase 3 actualizado | `SKILL.md` | H-004 |
| Eliminar process-error-analysis.md de raíz | WP raíz | H-005 |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| SKILL.md Phase 3 (paso + nota + exit criteria) | 3 |
| plan.md.template (sección condicional) | 1 |
| Limpieza WP (H-005) | 1 |
| ROADMAP.md + CHANGELOG.md | 2 |
| **Total** | **7 tareas** |

Clasificación: mediano — hay RC con prioridades distintas → DECOMPOSE obligatorio
Fases activas: 1, 2, 3, 4, 5, 6, 7

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 9](../../../../../ROADMAP.md)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-04
