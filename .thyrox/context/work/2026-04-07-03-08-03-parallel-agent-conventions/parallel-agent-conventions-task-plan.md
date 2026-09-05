```yml
type: Plan de Tareas
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 05:19:42
status: Pendiente ejecución
phase: Phase 5 — DECOMPOSE
```

# Plan de Tareas: parallel-agent-conventions

## Propósito

Descomponer los requisitos de `parallel-agent-conventions` en tareas atómicas ejecutables. Cada tarea referencia el requisito que satisface y puede ser tomada por un agente de forma independiente, siguiendo el claim protocol definido en R-001.

---

Basado en: `parallel-agent-conventions-requirements-spec.md`

## Resumen

Total de tareas: 12
Tareas desbloqueadas: 10
Tareas gateadas (WP-2): 2
Tareas paralelizables: 6

---

## Fases de Implementación

### FASE 1 — Fundamentos del claim protocol (base para todo lo demás)

- [x] [T-001] Documentar estado `[~]` con formato exacto en `assets/tasks.md.template` (R-001)
- [x] [T-002] [P] Documentar formato `now-{agent-id}.md` en `references/conventions.md` (R-002)
- [x] [T-003] [P] Documentar protocolo de claim en `references/conventions.md` — sección "Claim de tareas" (R-001)

> T-002 y T-003 son paralelas entre sí. Ambas requieren que T-001 esté aprobada conceptualmente (el estado `[~]` es prerequisito de ambas secciones), pero pueden escribirse simultáneamente en secciones distintas de `conventions.md`.

### FASE 2 — Convenciones de sesión paralela

- [x] [T-004] [P] Documentar protocolo ROADMAP solo lectura en `references/conventions.md` — sección "ROADMAP durante ejecución paralela" (R-003)
- [x] [T-005] [P] Documentar ciclo de vida de `now-{agent-id}.md` (inicio, trabajo, cierre) en `references/conventions.md` (R-002, R-005)
- [x] [T-006] Documentar protocolo de handoff de sesión paso a paso en `references/conventions.md` — sección "Handoff y recuperación" (R-005)
- [x] [T-012] Documentar recuperación de claims abandonados (timeout/crash) en `references/conventions.md` — sección "Recovery de tareas bloqueadas" (R-005)

> T-004 y T-005 son paralelas entre sí. T-006 y T-012 dependen de T-005 (el protocolo de cierre es prerequisito para hablar de recovery). T-012 puede ejecutarse en paralelo con T-006 si se coordinan las secciones.

### FASE 3 — Namespacing y script

- [x] [T-007] Documentar namespacing de ADRs por capa en `references/conventions.md` — sección "ADRs por capa" (R-004)
- [x] [T-008] [P] Actualizar `scripts/project-status.sh` para leer glob `now-*.md` con retrocompatibilidad (R-006)
- [x] [T-009] [P] Actualizar `CLAUDE.md` — reflejar `adr_path` por defecto para proyectos nuevos (R-004)

> T-007 debe completarse antes de T-009 (CLAUDE.md referencia el namespacing). T-008 y T-009 son paralelas entre sí.

### FASE 4 — Tareas gateadas [GATE WP-2]

- [x] [T-010] [GATE WP-2] task-executor — claim protocol (R-007) @task-executor (done: 2026-04-07 05:32:58)
- [x] [T-011] [GATE WP-2] task-planner — awareness de claims (R-008) @task-executor (done: 2026-04-07 05:32:58)

> No ejecutar hasta que WP-2 (`agent-format-spec`) apruebe su spec formal.

---

## Orden de Ejecución

```
T-001
 ├── T-002 [P] ─────────────────────────────────────────┐
 └── T-003 [P] ──────────────────────────────────────┐  │
                                                      ↓  ↓
                                              T-005 [P] ─────── T-006
                                              T-004 [P]         T-012
                                                   │
                                                   ↓
                                          T-007 ──── T-009 [P]
                                                     T-008 [P]
                                                          │
                                                          ↓
                                              [GATE WP-2] T-010
                                              [GATE WP-2] T-011
```

Secuencia recomendada:

1. **T-001** — Prerequisito: define el formato `[~]` que todas las demás convenciones referencian
2. **T-002, T-003** — Paralelas: pueden ejecutarse simultáneamente tras T-001
3. **T-004, T-005** — Paralelas: dependen de T-002/T-003 completadas
4. **T-006, T-012** — Pueden ejecutarse en paralelo coordinando secciones; dependen de T-005
5. **T-007** — Prerequisito de T-009; independiente de T-006/T-012
6. **T-008, T-009** — Paralelas: T-009 depende de T-007; T-008 es independiente desde T-005
7. **T-010, T-011** — Solo tras aprobación WP-2 (no bloqueadas por orden interno, sí por el gate externo)

---

## Archivos afectados por tarea

| Tarea | Archivo | Operación |
|-------|---------|-----------|
| T-001 | `.claude/skills/pm-thyrox/assets/tasks.md.template` | MODIFICADO |
| T-002 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |
| T-003 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |
| T-004 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |
| T-005 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |
| T-006 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |
| T-007 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |
| T-008 | `.claude/skills/pm-thyrox/scripts/project-status.sh` | MODIFICADO |
| T-009 | `.claude/CLAUDE.md` | MODIFICADO |
| T-010 | `.claude/skills/pm-thyrox/references/task-executor.md` | MODIFICADO (gate WP-2) |
| T-011 | `.claude/skills/pm-thyrox/references/task-planner.md` | MODIFICADO (gate WP-2) |
| T-012 | `.claude/skills/pm-thyrox/references/conventions.md` | MODIFICADO |

> **Nota de coordinación:** T-002, T-003, T-004, T-005, T-006, T-007 y T-012 todas modifican `conventions.md`. Los agentes que ejecuten estas tareas en paralelo deben coordinar secciones distintas del archivo para evitar conflictos de merge. Ver claim protocol (R-001) — reclamar la sección específica, no el archivo completo.

---

## Detalle de T-012 — Recovery de claims abandonados

**Contexto:** R-005 menciona que si un agente falla con tareas en `[~]`, quedan bloqueadas. Durante Phase 3 y Phase 4 de este mismo WP se observaron 2 timeouts que dejaron claims colgados — evidencia directa del gap.

**Qué documentar en `conventions.md`:**
1. Cómo detectar un claim abandonado: `[~]` con timestamp `claimed:` mayor a N minutos sin actividad del agente en `git log`
2. Cómo verificar si el agente sigue activo: revisar `context/now-{agent-id}.md` — si `status: closed` o el archivo no existe, el claim está huérfano
3. Protocolo de liberación manual: cambiar `[~]` a `[ ]`, eliminar `@agent-id` y timestamp, hacer commit con mensaje `fix(task-plan): liberar claim huérfano de {agent-id} en T-NNN`
4. Umbral sugerido: claim con más de 30 minutos sin commit asociado del agente = candidato a liberación

**Prioridad:** Alta — es el gap más crítico revelado por el dogfooding de este WP.

---

## Checkpoints

**CHECKPOINT-1:** Tras T-001
- Validar que `tasks.md.template` documenta `[~]` con formato exacto del spec
- Criterio: se puede leer el formato y aplicarlo sin ambigüedad

**CHECKPOINT-2:** Tras T-006 + T-012
- Validar que `conventions.md` cubre el ciclo completo: claim → trabajo → cierre → recovery
- Criterio: un agente nuevo puede seguir el protocolo solo con `conventions.md`

**CHECKPOINT-3:** Tras T-008
- Validar que `project-status.sh` pasa `shellcheck` sin errores
- Criterio: funciona con 0, 1 y 2+ archivos `now-*.md`

---

## Aprobación

- [ ] Tasks revisadas
- [ ] Orden de ejecución verificado
- [ ] Gates confirmados (T-010, T-011 bloqueadas hasta WP-2)
- [ ] T-012 incluida por dogfooding de timeouts
```
