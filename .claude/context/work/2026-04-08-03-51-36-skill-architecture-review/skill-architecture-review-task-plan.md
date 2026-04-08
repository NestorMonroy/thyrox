```yml
type: Task Plan
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 05:20:00
phase: Phase 5 — DECOMPOSE
reversibility: reversible
status: pendiente de aprobación
```

# Task Plan: Revisión Arquitectónica de pm-thyrox SKILL (FASE 21)

## Pre-flight

**Archivos afectados:**

| Tarea | Archivo |
|-------|---------|
| T-001 | `.claude/context/decisions/adr-015.md` (nuevo) |
| T-002 | `.claude/skills/pm-thyrox/scripts/session-start.sh` |
| T-003 | `.claude/CLAUDE.md` |
| T-004 | `.claude/context/technical-debt.md` |
| T-005 | `.claude/context/work/2026-04-08-02-05-03-context-hygiene/analysis/skill-vs-agent-analysis.md` |
| T-006 | `.claude/skills/pm-thyrox/references/conventions.md` |
| T-007 | `.claude/skills/pm-thyrox/references/skill-vs-agent.md` |
| T-008 | `.claude/skills/pm-thyrox/SKILL.md` |

**Intersecciones:** Ninguna — cada tarea toca un archivo distinto.
**Sin agentes en background** — ejecución single-agent, tareas atómicas.
**T-001 no bloquea ninguna tarea** — el número de ADR (015) ya está determinado.

---

## Tareas

- [ ] [T-001] Crear `adr-015.md` en `.claude/context/decisions/` — documentar las 9 decisiones D-01..D-09, tabla de 5 capas (triggering / overhead / actualizable), cláusula PTC, estado actual vs objetivo, contexto de 5 hallazgos externos (US-01 / AC-01.1..AC-01.7)

- [ ] [T-002] Actualizar `session-start.sh` — añadir las dos rutas con etiqueta de calidad: "Opción A (calidad alta HOY): invocar pm-thyrox SKILL" y "Opción B (determinístico): /workflow_N [outdated — esperar TD-008]"; variable `COMMANDS_SYNCED=false` para eliminar la etiqueta cuando TD-008 esté completo (US-02 / AC-02.1..AC-02.6)

- [ ] [T-003] Añadir sección `## Multi-skill orchestration` en `CLAUDE.md` — ≤15 líneas: máx 2-3 skills simultáneos, cuándo secuenciar, section owners disjuntos, naming `now-{skill-name}-{wp-id}.md` (US-03 / AC-03.1..AC-03.6)

- [ ] [T-004] Actualizar `technical-debt.md` — (a) TD-006: añadir "Corrección 2026-04-08" con 5 hallazgos + errores de framing, actualizar trigger a "cuando TD-008 esté completo"; (b) registrar TD-008 (sync /workflow_*), TD-009 (patrón now-{agent-name}.md en agentes), TD-010 (benchmark empírico) (US-04 / AC-04.1..AC-04.5)

- [ ] [T-005] Añadir sección `## Corrección — 2026-04-08 (FASE 21)` al final de `skill-vs-agent-analysis.md` — listar 3 conclusiones incorrectas del análisis original con su corrección y referencia a adr-015 (US-05 / AC-05.1..AC-05.4)

- [ ] [T-006] Actualizar `references/conventions.md` — añadir sección `## State files — naming conventions`: tabla de 3 tipos (now.md / now-{agent-name}.md / now-{skill-name}-{wp-id}.md), ejemplos concretos, regla de section owner, referencia a state-management.md (US-06 / AC-06.1..AC-06.5)

- [ ] [T-007] Actualizar `references/skill-vs-agent.md` — reescribir/ampliar con: tabla 5 capas, tabla 3 rutas con calidad actual, 5 hallazgos externos con fuentes, tabla decisión SKILL vs /workflow_* vs agente nativo, referencia a adr-015 (US-07 / AC-07.1..AC-07.6)

- [ ] [T-008] Añadir nota en `pm-thyrox SKILL.md` — sección `## Limitaciones conocidas y arquitectura objetivo` ≤10 líneas, antes de "Las 7 Fases": triggering probabilístico, compensación via session-start.sh + CLAUDE.md, referencia a adr-015, arquitectura objetivo cuando TD-008 esté completo (US-08 / AC-08.1..AC-08.6)

---

## Orden de ejecución

```
T-001  (ADR — sin dependencias, establece el número de referencia)
  │
  ├─ T-002  (session-start.sh — independiente)
  ├─ T-003  (CLAUDE.md — independiente)
  ├─ T-004  (technical-debt.md — independiente)
  ├─ T-005  (skill-vs-agent-analysis.md — independiente)
  ├─ T-006  (conventions.md — independiente)
  ├─ T-007  (skill-vs-agent.md — independiente)
  └─ T-008  (SKILL.md — independiente)
```

T-002..T-008 son independientes entre sí — pueden ejecutarse en cualquier orden.
T-001 primero para tener el número de ADR disponible al redactar referencias en T-005..T-008.

---

## Stopping Point Manifest

| ID | Fase | Tipo | Evento | Acción requerida |
|----|------|------|--------|-----------------|
| SP-01 | 1→2 | gate-fase | Análisis completo presentado | ✓ Completado |
| SP-02 | 2→3 | gate-fase | Strategy presentada | ✓ Completado |
| SP-03 | 3→4 | gate-fase | Plan aprobado | ✓ Completado |
| SP-04 | 4→5 | gate-fase | Spec aprobada | ✓ Completado |
| SP-05 | 5→6 | gate-fase | Task-plan aprobado | ⏳ ACTUAL |
| SP-06 | 6→7 | gate-fase | Todas las tareas completas + validación pre-7 | Presentar, esperar SI |
