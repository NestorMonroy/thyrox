```yml
type: Plan
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-07 19:03:31
status: En progreso
phase: Phase 3 — PLAN
reversibility: documentation
scope_approved: false
```

# Plan: async-gates

> **Nota metodológica incorporada en este WP:**
> Phase 2 define el *cómo* (estrategia, alternativas, decisiones arquitectónicas).
> Phase 3 define el *qué* — scope statement, in-scope explícito, out-of-scope explícito.
> Phase 2 orienta el scope (las decisiones acotan qué entra y qué no), pero el scope formal es un artefacto de Phase 3.

---

## Scope Statement

Implementar en SKILL.md los mecanismos para que Claude se detenga cuando un agente en background completa (`<task-notification>`), y para que Phase 1 produzca un Stopping Point Manifest que anticipe todos los puntos de parada del WP.

---

## In-Scope

- **S-01** — Añadir paso 9 en Phase 1 de SKILL.md: crear sección `## Stopping Point Manifest` en el archivo de análisis del WP
- **S-02** — Definir formato estándar del Stopping Point Manifest (tabla: ID, Fase, Tipo, Evento, Acción requerida)
- **S-03** — Ampliar Phase 5 SKILL.md: pre-flight de paralelos incluye registrar SP-NNN por cada agente background
- **S-04** — Añadir en Phase 6 SKILL.md: instrucción explícita para `<task-notification>` con 6 pasos (identificar SP → presentar → STOP → esperar → marcar ✓ → continuar o crear ERR)
- **S-05** — Definir tabla de calibración de gates async: reversibilidad × tipo de agente
- **S-06** — Añadir Stopping Point Manifest al análisis de este WP (este mismo WP como primer ejemplo)
- **S-07** — Documentar nota metodológica en SKILL.md Phase 3: "Phase 2 orienta el scope; Phase 3 lo declara"
- **S-08** — Lecciones aprendidas L-068+ y CHANGELOG

---

## Out-of-Scope

- **OS-01** — Cambios en código Python, agentes o MCP — este WP solo modifica SKILL.md y documentos de metodología
- **OS-02** — Implementar un sistema de tracking de SPs en base de datos o archivo estructurado — el manifest es Markdown, no datos
- **OS-03** — Modificar el comportamiento de los agentes existentes (task-executor, Explore, etc.) — los gates son instrucciones a Claude, no código
- **OS-04** — Retroactive update de WPs anteriores — el manifest aplica a WPs creados después de este cambio
- **OS-05** — Sistema de timeout (cuánto esperar antes de auto-continuar) — fuera del alcance de SKILL.md

---

## Estimación de esfuerzo

| Tarea | Esfuerzo |
|-------|---------|
| S-01 a S-05: cambios en SKILL.md | ~45 min |
| S-06: manifest en este WP | ~15 min |
| S-07: nota metodológica | ~10 min |
| S-08: lecciones + CHANGELOG | ~15 min |
| **Total** | **~85 min** |

Tamaño: **Mediano** — 7 fases completas.

---

## Link al ROADMAP

Este WP se registra como **FASE 19** en ROADMAP.md.

Cambios en ROADMAP:
- Nueva sección `## FASE 19: Async Gates`
- Tareas con checkboxes `[ ]` → `[x]` al completar Phase 6
