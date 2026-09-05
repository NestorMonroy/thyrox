```yml
type: Plan
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
status: En progreso
phase: Phase 3 — PLAN
reversibility: reversible
scope_approved: false
```

# Plan: context-hygiene

> **Nota metodológica:** Phase 2 definió el cómo (actualizar en Phase 7, glosario, actualización inmediata). Phase 3 declara el qué — qué entra, qué no entra, y qué se entrega.

---

## Scope Statement

Resolver la desincronización de los archivos de estado del proyecto (`focus.md`, `now.md`, `project-state.md`) actualizándolos al estado real e impidiendo que vuelva a ocurrir mediante una instrucción explícita en SKILL.md Phase 7. Además, aclarar la colisión de nomenclatura FASE vs Phase con un glosario en `CLAUDE.md`.

---

## In-Scope

- **S-01** — Actualizar `focus.md` al estado real: FASE 19 completada, WP context-hygiene activo, próximos pasos
- **S-02** — Actualizar `now.md` al estado real: WP context-hygiene activo, Phase 3 en curso
- **S-03** — Actualizar `project-state.md` al estado real: 9 agentes, FASEs 1-19 completadas, versión 1.6.0
- **S-04** — Añadir instrucción en SKILL.md Phase 7: checklist obligatorio para actualizar los 3 archivos de estado al cerrar cualquier WP
- **S-05** — Añadir glosario FASE vs Phase en `CLAUDE.md`
- **S-06** — Añadir nota FASE vs Phase en `SKILL.md` (referencia cruzada al glosario)
- **S-07** — Lecciones aprendidas + CHANGELOG

---

## Out-of-Scope

- **OS-01** — Renombrar FASE → WP-N en ROADMAP.md (riesgo de migración sin beneficio proporcional)
- **OS-02** — Modificar `validate-session-close.sh` para bloquear en lugar de advertir (cambio en código, fuera del alcance documentation)
- **OS-03** — Retroactive update de WPs anteriores — solo aplica a partir de este WP
- **OS-04** — Phase 0 / END USER CONTEXT — registrado como TD-007, requiere WP propio
- **OS-05** — TD-005 (arquitectura monolítica) y TD-006 (pm-thyrox thin) — no urgentes, WP propio cuando se active el trigger

---

## Estimación de esfuerzo

| Tarea | Esfuerzo |
|-------|---------|
| S-01 a S-03: actualizar archivos de estado | ~20 min |
| S-04: instrucción Phase 7 en SKILL.md | ~15 min |
| S-05 a S-06: glosario CLAUDE.md + SKILL.md | ~10 min |
| S-07: lecciones + CHANGELOG | ~15 min |
| **Total** | **~60 min** |

Tamaño: **Mediano** — 7 fases completas.

---

## Link al ROADMAP

Este WP se registra como **FASE 20** en ROADMAP.md.
