```yml
type: Task Plan
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 05:20:00
updated_at: 2026-04-08 05:35:00
phase: Phase 5 — DECOMPOSE
reversibility: reversible
status: pendiente de aprobación
```

# Task Plan: Revisión Arquitectónica de pm-thyrox SKILL (FASE 21)

## Pre-flight

**Archivos afectados:**

| Tarea | Archivo |
|-------|---------|
| T-001 | `.claude/context/decisions/adr-015.md` — estructura + contexto + 5 hallazgos |
| T-002 | `.claude/context/decisions/adr-015.md` — 9 decisiones D-01..D-09 |
| T-003 | `.claude/context/decisions/adr-015.md` — tabla 5 capas + PTC + estado actual vs objetivo |
| T-004 | `.claude/skills/pm-thyrox/scripts/session-start.sh` |
| T-005 | `.claude/CLAUDE.md` |
| T-006 | `.claude/context/technical-debt.md` — actualizar TD-006 |
| T-007 | `.claude/context/technical-debt.md` — añadir TD-008 |
| T-008 | `.claude/context/technical-debt.md` — añadir TD-009 |
| T-009 | `.claude/context/technical-debt.md` — añadir TD-010 |
| T-010 | `.claude/context/work/…/analysis/skill-vs-agent-analysis.md` — sección corrección |
| T-011 | `.claude/skills/pm-thyrox/references/conventions.md` — naming convention |
| T-012 | `.claude/skills/pm-thyrox/references/skill-vs-agent.md` — tabla 5 capas + 3 rutas |
| T-013 | `.claude/skills/pm-thyrox/references/skill-vs-agent.md` — 5 hallazgos externos |
| T-014 | `.claude/skills/pm-thyrox/references/skill-vs-agent.md` — tabla decisión + referencias ADR |
| T-015 | `.claude/skills/pm-thyrox/SKILL.md` — nota limitaciones ≤10 líneas |
| T-016 | `ROADMAP.md` — checkboxes FASE 21 → [x] al finalizar |

**Intersecciones:** T-001/T-002/T-003 tocan el mismo archivo → secuenciales entre sí.
T-006/T-007/T-008/T-009 tocan el mismo archivo → secuenciales entre sí.
T-012/T-013/T-014 tocan el mismo archivo → secuenciales entre sí.
T-004/T-005/T-010/T-011/T-015 → independientes entre sí y del resto.
T-016 → last (depende de todas las anteriores).

**Sin agentes en background** — ejecución single-agent.

---

## Tareas

### Bloque ADR (T-001..T-003) — secuencial, mismo archivo

- [x] [T-001] Crear `adr-015.md` con estructura base, sección de contexto, y los 5 hallazgos externos documentados con fuentes: artículo "Ultimate Guide to Claude Code Skills" (H1 probabilístico, H2 prompt injection, H3 CLAUDE.md alternativa) + análisis FASE 21 (H4 PTC ortogonal, H5 truncación de descripciones) (US-01 / AC-01.2)

- [x] [T-002] Añadir sección "Decision" en `adr-015.md` con las 9 decisiones D-01..D-09, cada una con su justificación y referencia a la Key Idea o decisión de Phase 2 (US-01 / AC-01.3)

- [x] [T-003] Añadir secciones finales en `adr-015.md`: tabla de 5 capas (triggering / overhead / actualizable), cláusula PTC (D-05), estado actual vs objetivo (qué funciona hoy vs qué requiere TD-008), estado `Accepted` y fecha (US-01 / AC-01.1, AC-01.4..AC-01.7)

---

### Bloque hooks y configuración (T-004..T-005) — independientes

- [x] [T-004] Actualizar `session-start.sh` — añadir variable `COMMANDS_SYNCED=false` y lógica de output para mostrar ambas rutas: "Opción A (calidad alta HOY): invocar pm-thyrox SKILL" y "Opción B (determinístico): /workflow_N [outdated — esperar TD-008]" mapeado según `phase` en now.md; cuando `COMMANDS_SYNCED=true` eliminar la etiqueta sin cambiar estructura (US-02 / AC-02.1..AC-02.6)

- [ ] [T-005] Añadir sección `## Multi-skill orchestration` en `CLAUDE.md` — ≤15 líneas: máx 2-3 skills simultáneos, cuándo secuenciar (si skill B necesita output de skill A), principio de section owners disjuntos, naming convention `now-{skill-name}-{wp-id}.md` (US-03 / AC-03.1..AC-03.6)

---

### Bloque technical-debt (T-006..T-009) — secuencial, mismo archivo

- [x] [T-006] Actualizar TD-006 en `technical-debt.md` — añadir subsección "Corrección 2026-04-08 (FASE 21)": listar los 3 errores de framing del análisis original ("única opción viable", "limitación arquitectónica", "trigger por tamaño"); cambiar el trigger de "~600 líneas" a "cuando TD-008 esté completo" (US-04 / AC-04.1, AC-04.2)

- [x] [T-007] Añadir TD-008 en `technical-debt.md` — sync completo de 7 /workflow_* commands con lógica actual de SKILL.md (gates, Stopping Point Manifest, calibración, state-management); prerequisito para reducir pm-thyrox SKILL a catálogo (S-04 diferido); severidad: alta (US-04 / AC-04.3)

- [x] [T-008] Añadir TD-009 en `technical-debt.md` — implementar patrón `now-{agent-name}.md` / `now-{skill-name}-{wp-id}.md` en definiciones de agentes nativos (agent-spec.md + 9 agentes); trigger: al abrir WP de agentes (US-04 / AC-04.4)

- [x] [T-009] Añadir TD-010 en `technical-debt.md` — benchmark empírico: SKILL vs CLAUDE.md vs baseline sin framework; 3 tareas equivalentes, métricas de calidad de output; trigger: cuando haya caso de uso real que justifique el tiempo (US-04 / AC-04.5)

---

### Bloque corrección de análisis (T-010) — independiente

- [x] [T-010] Añadir sección `## Corrección — 2026-04-08 (FASE 21)` al final de `skill-vs-agent-analysis.md` — listar las 3 conclusiones incorrectas: (1) "SKILL única opción viable" → CLAUDE.md es alternativa más confiable; (2) "limitación arquitectónica" → tradeoff de producto; (3) "trigger por tamaño" → trigger es confiabilidad, no líneas; referenciar adr-015 para razonamiento completo (US-05 / AC-05.1..AC-05.4)

---

### Bloque conventions (T-011) — independiente

- [x] [T-011] Añadir sección `## State files — naming conventions` en `references/conventions.md` — tabla con 3 tipos de archivo: `now.md` (orquestador, estado compartido) / `now-{agent-name}.md` (agente nativo en ejecución, e.g. `now-task-executor.md`) / `now-{skill-name}-{wp-id}.md` (skill especializado, e.g. `now-security-audit-wp-auth.md`); regla de section owner; referencia a state-management.md para trigger map (US-06 / AC-06.1..AC-06.5)

---

### Bloque skill-vs-agent.md (T-012..T-014) — secuencial, mismo archivo

- [x] [T-012] Añadir sección "Las 5 capas y sus rutas" en `references/skill-vs-agent.md` — tabla de 5 capas (Capa 0..4: triggering / overhead / actualizable sin migración) + tabla de 3 rutas (SKILL probabilístico calidad alta HOY / /workflow_* outdated calidad baja HOY / /workflow_* post-TD-008 calidad alta) con criterio de selección (US-07 / AC-07.1, AC-07.2, AC-07.6)

- [x] [T-013] Añadir sección "5 hallazgos externos sobre SKILLs" en `references/skill-vs-agent.md` — H1 triggering probabilístico (evidencia: 0/20 disparos), H2 PTC ortogonal a hooks, H3 truncación de descripciones a 1% context budget, H4 SKILLs como prompt injection (40/47 empeoran output), H5 CLAUDE.md como alternativa superior en simplicidad; fuentes: artículo Mar 2026 + análisis FASE 21 (US-07 / AC-07.3)

- [x] [T-014] Añadir "Tabla de decisión" y referencias en `references/skill-vs-agent.md` — cuándo usar SKILL vs /workflow_* command vs agente nativo; naturaleza de CLAUDE.md (declarativa siempre cargada) vs SKILL (probabilístico on-demand) vs command (determinístico user-triggered); referencia a adr-015 para razonamiento completo (US-07 / AC-07.4, AC-07.5, AC-07.6)

---

### Bloque SKILL.md (T-015) — independiente

- [x] [T-015] Añadir sección `## Limitaciones conocidas y arquitectura objetivo` en `pm-thyrox SKILL.md` — ≤10 líneas, ANTES de "Las 7 Fases": triggering probabilístico compensado por session-start.sh + CLAUDE.md; arquitectura objetivo = SKILL thin (~40 líneas) cuando TD-008 esté completo; referencia a adr-015 para la decisión completa (US-08 / AC-08.1..AC-08.6)

---

### Bloque cierre (T-016) — último

- [x] [T-016] Actualizar `ROADMAP.md` — marcar [x] todos los entregables de FASE 21 a medida que se completan; añadir fecha de completado (Phase 6 step 7)

---

## Orden de ejecución

```
T-001 → T-002 → T-003   (ADR: secuencial — mismo archivo)
T-006 → T-007 → T-008 → T-009   (TDs: secuencial — mismo archivo)
T-012 → T-013 → T-014   (skill-vs-agent.md: secuencial — mismo archivo)

Independientes (cualquier orden, en paralelo con los bloques):
  T-004   (session-start.sh)
  T-005   (CLAUDE.md)
  T-010   (skill-vs-agent-analysis.md)
  T-011   (conventions.md)
  T-015   (SKILL.md)

T-016 al final (depende de todas las anteriores)
```

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
