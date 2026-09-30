```yml
created_at: 2026-04-17 14:30:24
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 10 — IMPLEMENT
author: NestorMonroy
status: Stage 10 IMPLEMENT completo — 31/31 tasks. Pendiente Stage 11 TRACK/EVALUATE
```

# Task Plan — ÉPICA 40: Multi-Methodology (Namespaces v2)

> **Generado desde:** `plan-execution/implementation-plan.md`
> **Alcance:** 5 nuevos namespaces (lean, pps, sp, cp, bpa) + gaps arquitecturales.
> **Ruta crítica:** T-001 → T-002..T-005 → T-006..T-010 → T-011..T-015 → T-016..T-021

---

## Tier 1 — Registry YAMLs + Coordinator Agents (5 namespaces)

### T-001 — Resolver GAP-005: reescribir ps8.yml → pps.yml para Toyota TBP
- [x] **T-001** Reescribir `.thyrox/registry/methodologies/ps8.yml` → renombrar a `pps.yml`, alineando con 6 pasos TBP (pps:clarify → pps:target → pps:analyze → pps:countermeasures → pps:implement → pps:evaluate). Renombrar todos los skills ps8-* → pps-*. Actualizar SKILL.md y scalability.md.

### T-002..005 — Crear YAMLs de registry faltantes
- [x] **T-002** Crear `.thyrox/registry/methodologies/lean.yml` — `type: sequential`, 5 pasos: lean:define, lean:measure, lean:analyze, lean:improve, lean:control. Tollgates y outputs basados en los SKILL.md de cada skill.
- [x] **T-003** Crear `.thyrox/registry/methodologies/sp.yml` — `type: sequential`, 8 pasos: sp:context, sp:analysis, sp:gaps, sp:formulate, sp:plan, sp:execute, sp:monitor, sp:adjust. Nota: sp:adjust puede retornar a sp:analysis (ciclo estratégico).
- [x] **T-004** Crear `.thyrox/registry/methodologies/cp.yml` — `type: sequential`, 7 pasos: cp:initiation, cp:diagnosis, cp:structure, cp:recommend, cp:plan, cp:implement, cp:evaluate.
- [x] **T-005** Crear `.thyrox/registry/methodologies/bpa.yml` — `type: sequential`, 6 pasos: bpa:identify, bpa:map, bpa:analyze, bpa:design, bpa:implement, bpa:monitor.

### T-006..010 — Crear coordinator agents faltantes
> Seguir patrón de `dmaic-coordinator.md`: frontmatter `skills:`, `isolation: worktree`, `background: true`, `color`, lógica de routing por paso nativo, actualización de `now.md`, tollgate verification.

- [x] **T-006** Crear `.claude/agents/lean-coordinator.md` — `skills: [lean-define, lean-measure, lean-analyze, lean-improve, lean-control]`. Flow sequential con tollgates por fase Lean. Color: cyan.
- [x] **T-007** Crear `.claude/agents/pps-coordinator.md` — `skills: [pps-clarify, pps-target, pps-analyze, pps-countermeasures, pps-implement, pps-evaluate]`. Flow sequential. Destacar A3 Report como artefacto central. Color: orange.
- [x] **T-008** Crear `.claude/agents/sp-coordinator.md` — `skills: [sp-context, sp-analysis, sp-gaps, sp-formulate, sp-plan, sp-execute, sp-monitor, sp-adjust]`. Flow sequential con retorno cíclico sp:adjust → sp:analysis. Color: purple.
- [x] **T-009** Crear `.claude/agents/cp-coordinator.md` — `skills: [cp-initiation, cp-diagnosis, cp-structure, cp-recommend, cp-plan, cp-implement, cp-evaluate]`. Flow sequential. Color: yellow.
- [x] **T-010** Crear `.claude/agents/bpa-coordinator.md` — `skills: [bpa-identify, bpa-map, bpa-analyze, bpa-design, bpa-implement, bpa-monitor]`. Flow sequential. Color: teal.

---

## Tier 2 — Correcciones a Coordinators Existentes

### T-011..014 — Agregar `skills:` array a 4 coordinators
- [x] **T-011** Agregar `skills: [pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing]` al frontmatter de `.claude/agents/pmbok-coordinator.md`.
- [x] **T-012** Agregar `skills: [ba-planning, ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-strategy, ba-solution-evaluation]` al frontmatter de `.claude/agents/babok-coordinator.md`.
- [x] **T-013** Agregar `skills: [rup-inception, rup-elaboration, rup-construction, rup-transition]` al frontmatter de `.claude/agents/rup-coordinator.md`.
- [x] **T-014** Agregar `skills: [rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management]` al frontmatter de `.claude/agents/rm-coordinator.md`.

### T-015 — Agregar `metadata.triggers` a 32 skills nuevos
- [x] **T-015** Agregar `metadata.triggers` (3-5 keywords cada uno) al frontmatter de los 32 SKILL.md en namespaces lean/pps/sp/cp/bpa. Keywords basadas en metodología + artefactos clave + dominio.

---

## Tier 3 — Documentación y Quick Wins

- [x] **T-016** Actualizar label `*(pendiente)*` en `.claude/skills/thyrox/SKILL.md` para los 5 namespaces: eliminado "*(pendiente)*", tabla refleja estado real (GAP-016).
- [x] **T-017** Extender sección "Selección por necesidad" en `.claude/skills/thyrox/SKILL.md` para incluir lean, pps, sp, cp, bpa con cuándo usar cada uno (GAP-017).
- [x] **T-018** Nombres de workflow skills en `.claude/CLAUDE.md` Addendum FASE 39 ya son correctos. No requirió edición (GAP-019).
- [x] **T-019** Crear `.claude/skills/workflow-diagnose/references/root-cause-analysis-methodology.md` — guía con 5 Whys, Ishikawa, Pareto, validación y relación con methodology skills (GAP-018).
- [x] **T-020** Actualizar descripción en `.claude-plugin/plugin.json` — menciona 11 namespaces activos: pdca, dmaic, lean, pps, rup, rm, pm, ba, sp, cp, bpa (GAP-028).
- [x] **T-021** Marcar tareas completadas como `[x]` en artefactos WP. Tier 1 y Tier 2 completos. Tier 3 completo con este ítem (GAP-031).

---

## Tier 4 — Meta-Framework Orchestration (Arquitectura Mayor)

> Estos gaps requieren decisiones arquitectónicas. Implementar en ÉPICA separada o con aprobación explícita.

- [x] **T-022** Agregar `native_phase_count`, `produces:`, `consumes:` a los 11 YAMLs de registry existentes (GAP-022). Schema de artifacts definido e implementado en todos los flows.
- [x] **T-023** Extender `now.md` con sección `coordinators:` para tracking per-coordinator (GAP-023). Formato con status/started_at/artifacts_produced documentado en comentario.
- [x] **T-024** Crear template `artifact-registry.md` en `workflow-discover/assets/` para inter-coordinator coordination (GAP-025).
- [x] **T-025** Crear template `orchestration-log.md` para historial de activaciones de coordinators (GAP-027).
- [x] **T-026** Actualizar todos los 11 coordinator agents para emitir artifact-ready signal estructurado (GAP-024). Todos tienen sección "Cierre — artifact-ready signal".
- [x] **T-027** Crear `.thyrox/registry/routing-rules.yml` con mapeo problema→coordinator (GAP-020).
- [x] **T-028** Rework de `thyrox-coordinator.md` con 5 preguntas diagnósticas de intake y routing automático basado en routing-rules.yml (GAP-021).
- [x] **T-029** Crear `.claude/skills/thyrox/references/methodology-selection-guide.md` con árboles de decisión entre metodologías similares (GAP-029).
- [x] **T-030** Actualizar `scalability.md`: eliminados *(pendiente)* en lean/pps/sp/cp/bpa; "no-saltables" → "recomendados con alta prioridad" (GAP-026).
- [x] **T-031** Política de coordinator agents documentada en `bootstrap.py`: coordinators son estáticos, no generados dinámicamente (GAP-030 + GAP-032).

---

## Resumen de progreso

| Tier | Tareas | Completadas | Pendientes |
|------|--------|-------------|------------|
| **Tier 1** | T-001..T-010 (10 tareas) | **10** ✓ | 0 |
| **Tier 2** | T-011..T-015 (5 tareas) | **5** ✓ | 0 |
| **Tier 3** | T-016..T-021 (6 tareas) | **6** ✓ | 0 |
| **Tier 4** | T-022..T-031 (10 tareas) | **10** ✓ | 0 |
| **Total** | **31 tareas** | **31** ✓ | **0** |

---

## Stopping Points

| SP | Tarea | Condición |
|----|-------|-----------|
| SP-T4-01 | Pre-T-022 | Tier 4 requiere aprobación explícita — decisiones arquitectónicas mayores |
