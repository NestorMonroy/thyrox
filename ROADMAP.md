```yml
Tipo: Plan Maestro
Categoría: Gestión de Proyecto
Versión: 0.2.0
Propósito: Plan maestro de trabajo y tracking de progreso — FASEs activas (27+)
Objetivo: Documentar fases, epics, y estado actual del proyecto
Fecha actualización: 2026-04-15
```

# ROADMAP - THYROX

## Propósito

Plan maestro del proyecto THYROX. Fuente única de verdad para el estado del trabajo.

> **FASEs 1-26** disponibles en `git log --oneline --follow -- ROADMAP.md` (historial completo en git — I-002).

---

## Convenciones

- `[ ]` = Pendiente
- `[-]` = En Progreso
- `[x]` = Completado (YYYY-MM-DD)

---

## ÉPICA 41: goto-problem-fix — Consolidar fuente única de estado del framework ✓ COMPLETADO 2026-04-18

**WP:** `.thyrox/context/work/2026-04-17-17-58-13-goto-problem-fix/`
**Resultado:** scripts phase→stage fix, workflow-audit skill, domain subdirectories, PAT-004 enforcement, REGLA-LONGEV-001 revisada, CHANGELOG/ROADMAP policy, coordinator rename (ba/pm), coverage analysis, Ishikawa I-011, reposicionamiento THYROX → sistema de Agentic AI (35+ archivos), 2 ADRs nuevos. 46 commits.

- [x] Stage 1 DISCOVER — 2026-04-17
- [x] Stage 3 DIAGNOSE — 2026-04-17
- [x] Stage 5 STRATEGY — 2026-04-17
- [x] Stage 6 SCOPE — 2026-04-17
- [x] Stage 8 PLAN EXECUTION — 2026-04-17
- [x] Stage 10 IMPLEMENT — 2026-04-17
- [x] Stage 11 TRACK/EVALUATE — 2026-04-17
- [x] Stage 12 STANDARDIZE — 2026-04-18

---

## ÉPICA 40: multi-methodology — Meta-framework multi-metodología ✓ COMPLETADO 2026-04-17

**WP:** `.thyrox/context/work/2026-04-16-18-54-38-multi-methodology/`
**Resultado:** 11 namespaces (lean/pps/sp/cp/bpa + 6 existentes), 32 skills nuevos con anatomía completa, 5 coordinator agents, routing-rules.yml, thyrox-coordinator reworked, artifact-ready signals. Versión: v2.8.0.

- [x] Stage 1 DISCOVER — 2026-04-16
- [x] Stage 5 STRATEGY — 2026-04-16
- [x] Stage 6 SCOPE — 2026-04-16
- [x] Stage 8 PLAN EXECUTION — 2026-04-16
- [x] Stage 10 IMPLEMENT — 2026-04-17
- [x] Stage 11 TRACK — 2026-04-17
- [x] Stage 12 STANDARDIZE — 2026-04-17

## FASE 39: plugin-distribution — Migración THYROX a plugin puro de Claude Code (2026-04-15)

**WP:** `.thyrox/context/work/2026-04-15-08-29-58-plugin-distribution/`
**Alcance:** Investigar y migrar distribución de THYROX de "git clone + setup-template.sh" a plugin puro. Eliminar `setup-template.sh`. Implementar `bin/thyrox-init.sh` + `hooks/hooks.json` como reemplazo idempotente.

- [x] Phase 1 ANALYZE — completado 2026-04-15
- [x] Phase 10 EXECUTE — completado 2026-04-16 (T-001..T-014)
- [x] Phase 11 TRACK — completado 2026-04-16
- [x] Phase 12 STANDARDIZE — completado 2026-04-16

---

## FASE 38: commands-rellinks — Fix broken links y referencias relativas en commands (2026-04-15)

**WP:** `.thyrox/context/work/2026-04-15-02-23-24-commands-rellinks/`
**Alcance:** Reparar links rotos y referencias relativas en `.claude/references/`. Fix de `detect_broken_references.py`. Gate 1→3 pendiente.

- [-] Phase 1 ANALYZE — en curso, gate 1→3 pendiente

---

## FASE 37: platform-references-expansion — Expansión de reference files de plataforma Claude Code (2026-04-15)

**WP:** `.thyrox/context/work/2026-04-14-23-40-08-platform-references-expansion/`
**Alcance:** 7 nuevos reference files + 3 actualizaciones en `.claude/references/`. Cobertura de 10 gaps de impacto alto del deep-review de `claude-code-ultimate-guide` y `claude-howto`. 16 gaps de impacto medio diferidos como TD-041.

- [-] Phase 6 EXECUTE — en progreso 2026-04-15

---

## FASE 36: guidelines-registry-migration — Migrar .claude/guidelines/ y .claude/registry/ a .thyrox/ (2026-04-14)

**WP:** `.thyrox/context/work/2026-04-14-22-38-05-guidelines-registry-migration/`
**Alcance:** Separar generadores/tooling de la zona de config Claude Code. Mover guidelines/ y registry/ a .thyrox/. Actualizar paths en _generator.sh, bootstrap.py, .mcp.json. Agregar TDs de registry inconsistencies.

- [x] Phase 6 EXECUTE — completado 2026-04-14
- [x] Phase 7 TRACK — completado 2026-04-14

---

## FASE 35: context-migration — Migración .claude/context/ → .thyrox/context/ ✓ COMPLETADO 2026-04-14

**WP:** `.thyrox/context/work/2026-04-14-09-13-51-context-migration/`
**Resultado:** 52 WPs + 19 ADRs + 16 ERRs migrados. 19 ADRs + 18 errores renombrados. 11 refs de plataforma actualizadas. Knowledge base creada. bound-detector.py implementado. FASE 35 formalmente cerrada.

- [x] Phase 6 EXECUTE — completado, Gate SP-06 aprobado 2026-04-14
- [x] Phase 7 TRACK — completado 2026-04-14

---

## FASE 34: technical-debt-resolution — Resolución 7 TDs activos ✓ COMPLETADO 2026-04-14

**WP:** `.thyrox/context/work/2026-04-14-*-technical-debt-resolution/`

- [x] Phase 6 EXECUTE — completado 2026-04-14
- [x] Phase 7 TRACK — completado 2026-04-14

---

## FASE 27: agentic-loop — Mecanismo de ejecución continua con /loop (2026-04-09)

**WP:** `.claude/context/work/2026-04-09-17-22-48-agentic-loop/`
**Causa raíz:** Sin mecanismo para ejecutar workflows de forma repetitiva sin intervención manual.

- [ ] Phase 1 ANALYZE — completado, gate 1→2 pendiente aprobación usuario

---

## FASE 28: auto-operations — Sincronización determinista de now.md via hooks reactivos (2026-04-09)

**WP:** `.claude/context/work/2026-04-09-17-28-34-auto-operations/`
**Causa raíz:** 3 bugs de sincronización de estado (Bug 1: echo append YAML, Bug 2: current_work sin hook, Bug 4: cierre WP LLM-dependiente).

### Fase A — Scripts nuevos

- [x] T-001: Crear `set-session-phase.sh` — reemplaza `phase:` in-place via sed — 2026-04-09
- [x] T-002: Crear `sync-wp-state.sh` — PostToolUse hook para `current_work` — 2026-04-09
- [x] T-003: Crear `close-wp.sh` — cierra WP seteando null — 2026-04-09
- [x] T-004: chmod +x en los 3 scripts — 2026-04-09
- [x] T-018: Commit Fase A — 2026-04-09

### Fase B — Edición de configuración

- [x] T-005: settings.json — agregar PostToolUse Write hook → sync-wp-state.sh — 2026-04-09
- [x] T-006..T-012: 7 workflow-*/SKILL.md — echo→set-session-phase + updated_at — 2026-04-09
- [x] T-013: workflow-track/SKILL.md cuerpo — fila now.md → bash close-wp.sh — 2026-04-09
- [x] T-019: Commit Fase B — 2026-04-09

### Fase C — Validación

- [x] T-014: Test set-session-phase.sh — PASS — 2026-04-09
- [x] T-015: Test sync-wp-state.sh — PASS — 2026-04-09
- [x] T-016: Test close-wp.sh — PASS — 2026-04-09
- [x] T-017: Test integración — Step 1+3 PASS / Step 2 requiere nueva sesión — 2026-04-09

### Fase D — Cierre

- [x] T-020: git push — 2026-04-09

---

## FASE 29: technical-debt-resolution — Resolución de Deuda Técnica del Framework (2026-04-09)

**WP:** `.claude/context/work/2026-04-09-22-47-58-technical-debt-resolution/`
**Causa raíz:** 35 TDs acumulados durante FASEs 1–28; 3 archivos críticos superan límite Read tool; skill orquestador con nombre incorrecto; workflows sin validaciones pre-gate.

### Grupo 1 — Renombrado pm-thyrox → thyrox

- [x] Mover directorio `.claude/skills/pm-thyrox/` → `.claude/skills/thyrox/` — 2026-04-10
- [x] Actualizar referencias en CLAUDE.md (6), scripts (5), workflow-*/SKILL.md (3), references/*.md (~10) — 2026-04-10
- [x] Actualizar Locked Decision #5 addendum en CLAUDE.md — 2026-04-10

### Grupo 2 — Validaciones pre-gate en 7 workflow-*/SKILL.md

- [x] Step 0 END USER CONTEXT en workflow-analyze/SKILL.md (TD-007) — 2026-04-10
- [x] Validación pre-gate en los 7 SKILL.md (TD-029, TD-031, TD-033) — 2026-04-10
- [x] Re-evaluación tamaño WP en workflow-strategy/SKILL.md (TD-028) — 2026-04-10
- [x] Criterio auto-write + pre-flight checklist en workflow-execute/SKILL.md (TD-027 A, TD-032) — 2026-04-10

### Grupo 3 — Mejoras a scripts existentes

- [x] project-status.sh: alerta ROADMAP entry faltante (B-08) — 2026-04-10
- [x] session-start.sh: alerta execution-log faltante en Phase 6 (B-09) — 2026-04-10

### Grupo 4 — Nuevos artefactos Phase 7

- [x] Crear wp-changelog.md.template + technical-debt-resolved.md.template — 2026-04-10
- [x] Actualizar workflow-track/SKILL.md + thyrox/SKILL.md con nuevos artefactos — 2026-04-10

### Grupo 5 — Reglas de longevidad y timestamps

- [x] REGLA-LONGEV-001 en conventions.md (TD-035) — 2026-04-10
- [x] Timestamps en artefactos: conventions.md (TD-001) + validate-session-close.sh (TD-018) — 2026-04-10

### Grupo 6 — Splits de archivos sobredimensionados

- [x] ROADMAP.md → ROADMAP-history.md (FASEs 1–26) — 2026-04-10
- [x] CHANGELOG.md → CHANGELOG-archive.md (versiones históricas) — 2026-04-10
- [x] technical-debt.md: mover TDs resueltos al WP correspondiente — 2026-04-10

### Grupo 7 — Cerrar TDs ya implementados

- [x] Marcar [x] TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 en technical-debt.md — 2026-04-10

---

## FASE 30: uv-adoption — Adopción de uv como gestor de entorno Python (2026-04-10)

**WP:** `.claude/context/work/2026-04-10-03-32-38-uv-adoption/`
**Causa raíz:** pip/venv/pyenv inconsistentes entre proyectos; uv ofrece velocidad y reproducibilidad superiores.

- [ ] Phase 1 ANALYZE — completado, gate 1→2 pendiente aprobación usuario

---

## FASE 31: thyrox-commands-namespace — Namespace /thyrox:* mediante Plugin Claude Code (2026-04-11)

**WP:** `.claude/context/work/2026-04-11-10-52-25-thyrox-commands-namespace/`
**Causa raíz:** Sin namespace propio, los comandos `/workflow-*` no están agrupados, colisionan con proyectos externos y no permiten distribución como plugin.

- [x] Phase 1 ANALYZE — completado, Gate SP-01 aprobado 2026-04-11
- [x] Phase 2 SOLUTION_STRATEGY — completado, Gate SP-02 aprobado 2026-04-11 (Opción D: Plugin)
- [x] Phase 3 PLAN — completado
- [x] Phase 4 STRUCTURE — completado
- [x] Phase 5 DECOMPOSE — completado, Gate SP-05 aprobado 2026-04-11
- [x] Phase 6 EXECUTE — completado, Gate SP-06 aprobado 2026-04-11
- [x] Phase 7 TRACK — completado 2026-04-11

---

## FASE 34: technical-debt-resolution — Resolución 7 TDs activos ✓ COMPLETADO 2026-04-14

**WP:** `.claude/context/work/2026-04-13-20-17-28-technical-debt-resolution/`
**Causa raíz:** 7 TDs activos (TD-001, TD-003, TD-009, TD-018, TD-027, TD-028, TD-035) con soluciones concretas identificadas en FASEs anteriores. TD-010 diferido (trigger no activado).

- [x] Phase 1 ANALYZE — completado 2026-04-13
- [x] Phase 2 SOLUTION_STRATEGY — **OMITIDA** (WP pequeño, soluciones ya identificadas)
- [x] Phase 3 PLAN — completado 2026-04-13
- [x] Phase 4 STRUCTURE — **OMITIDA** (cambios quirúrgicos, plan suficiente)
- [x] Phase 5 DECOMPOSE — completado 2026-04-14
- [x] Phase 6 EXECUTE — completado 2026-04-14 (9 commits, 7 TDs resueltos)
- [x] Phase 7 TRACK — completado 2026-04-14

---

## FASE 33: skill-authoring-modernization — Actualización skill-authoring.md + benchmark TD-010/TD-025 ✓ COMPLETADO 2026-04-13

**WP:** `.claude/context/work/2026-04-12-10-10-50-skill-authoring-modernization/`
**Resultado:** 14 nuevas referencias creadas, 5 actualizadas. TD-025 cerrado. CLAUDE_STREAM_IDLE_TIMEOUT_MS=120000 fix. diagrama-ishikawa agent agregado. 8 lecciones documentadas.

- [x] Phase 1 ANALYZE — completado, Gate SP-01 aprobado 2026-04-12
- [x] Phase 2 SOLUTION_STRATEGY — completado, Gate SP-02 aprobado 2026-04-12
- [x] Phase 3 PLAN — completado, Gate SP-03 aprobado 2026-04-12
- [x] Phase 4 STRUCTURE — **OMITIDA** (stream timeout × 4 intentos — aprobado por usuario)
- [x] Phase 5 DECOMPOSE — **OMITIDA** (WP mediano → pequeño post-timeout)
- [x] Phase 6 EXECUTE — completado, Gate SP-06 aprobado 2026-04-13
- [x] Phase 7 TRACK — completado 2026-04-13

---

## FASE 32: technical-debt-audit — Auditoría y resolución de deuda técnica ✓ COMPLETADO 2026-04-12

**WP:** `.claude/context/work/2026-04-11-23-27-08-technical-debt-audit/`
**Resultado:** 10 TDs resueltos (7 auditados + 3 implementados). `technical-debt.md` 70,360→23,733 bytes. Gates workflow-* mejorados. Framework v2.6.0.

- [x] Phase 1 ANALYZE — completado, Gate SP-01 aprobado 2026-04-11
- [x] Phase 2 SOLUTION_STRATEGY — completado, Gate SP-02 aprobado 2026-04-11
- [x] Phase 3 PLAN — completado, Gate SP-03 aprobado 2026-04-11
- [x] Phase 4 STRUCTURE — completado, Gate SP-04 aprobado 2026-04-12
- [x] Phase 5 DECOMPOSE — completado, Gate SP-05 aprobado 2026-04-12
- [x] Phase 6 EXECUTE — completado, Gate SP-06 aprobado 2026-04-12
- [x] Phase 7 TRACK — completado 2026-04-12
