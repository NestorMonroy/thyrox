```yml
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
created_at: 2026-04-17 14:30:24
current_phase: Phase 10 — IMPLEMENT
author: NestorMonroy
```

# Plan de Implementación — ÉPICA 40: Multi-Methodology

**Basado en:** `analyze/comprehensive-gap-analysis.md` — 32 gaps identificados en 8 capas.

**Objetivo:** Completar THYROX como Meta-Framework Agentic funcional: 11 namespaces de metodología con coordinators, registry YAMLs y documentación precisa.

---

## Decisión Previa Requerida

> **GAP-005 (CRITICAL):** `ps8.yml` implementa Ford 8D (D0-D8); los 6 skills implementan Toyota TBP (clarify/target/analyze/countermeasures/implement/evaluate). Son metodologías distintas.
>
> **Opciones:**
> - **Opción A (recomendada):** Reescribir `ps8.yml` para alinear con Toyota TBP (6 pasos). `ps8:` = Toyota Business Practices.
> - **Opción B:** Renombrar skills a `tbp-*`, crear `tbp.yml`, conservar `ps8.yml` para 8D.
>
> **Asunción de este plan:** Opción A. Ajustar T-002 si se elige B.

---

## DAG de Dependencias

```
GAP-005 (ps8.yml rewrite)
    ↓
GAP-001..004 (YAMLs lean/sp/cp/bpa) ─── paralelo con GAP-005
    ↓
GAP-006..010 (coordinator agents) ─── depende de YAMLs correspondientes
    ↓
GAP-011..014 (skills: en coordinators existentes) ─── paralelo, sin dependencias
    ↓
GAP-015 (metadata.triggers 32 skills) ─── independiente
    ↓
GAP-016..019, 028, 031 (documentación) ─── independiente
    ↓
GAP-018 (workflow-diagnose references/) ─── independiente
    ↓
GAP-020..021 (routing-rules + thyrox-coordinator) ─── depende de todos los YAMLs
    ↓
GAP-022..027 (meta-framework orchestration) ─── Tier 4, arquitectura mayor
```

---

## Tier 1 — Registry YAMLs + Coordinator Agents (5 namespaces)

### T-001 — Resolver GAP-005: reescribir ps8.yml → pps.yml para Toyota TBP
- [x] **T-001** Renombrar `ps8.yml` → `pps.yml` (Practical Problem Solving), reescribir alineando con 6 pasos TBP (pps:clarify, pps:target, pps:analyze, pps:countermeasures, pps:implement, pps:evaluate). Renombrar todos los skills ps8-* → pps-*. Actualizar SKILL.md y scalability.md.

### T-002..005 — Crear YAMLs de registry faltantes
- [x] **T-002** Crear `.thyrox/registry/methodologies/lean.yml` — `type: sequential`, 5 pasos: lean:define, lean:measure, lean:analyze, lean:improve, lean:control. Tollgates y outputs basados en los SKILL.md de cada skill.
- [x] **T-003** Crear `.thyrox/registry/methodologies/sp.yml` — `type: sequential`, 8 pasos: sp:context, sp:analysis, sp:gaps, sp:formulate, sp:plan, sp:execute, sp:monitor, sp:adjust. Nota: sp:adjust puede retornar a sp:analysis (ciclo estratégico).
- [x] **T-004** Crear `.thyrox/registry/methodologies/cp.yml` — `type: sequential`, 7 pasos: cp:initiation, cp:diagnosis, cp:structure, cp:recommend, cp:plan, cp:implement, cp:evaluate.
- [x] **T-005** Crear `.thyrox/registry/methodologies/bpa.yml` — `type: sequential`, 6 pasos: bpa:identify, bpa:map, bpa:analyze, bpa:design, bpa:implement, bpa:monitor.

### T-006..010 — Crear coordinator agents faltantes
Cada coordinator debe seguir el patrón de `dmaic-coordinator.md`: frontmatter con `skills:` array, `isolation: worktree`, lógica de routing por paso nativo, actualización de `now.md`, tollgate verification.

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
- [x] **T-015** Agregar `metadata.triggers` (3-5 keywords cada uno) al frontmatter de los 32 SKILL.md en namespaces lean/pps/sp/cp/bpa. Palabras clave basadas en nombre de metodología + artefactos clave + dominio (ej: lean-define → `["lean", "waste reduction", "TIMWOOD", "lean charter", "muda"]`).

---

## Tier 3 — Documentación y Quick Wins

- [x] **T-016** Actualizar label `*(pendiente)*` en `.claude/skills/thyrox/SKILL.md` para los 5 namespaces: de "*(pendiente)*" a texto que refleje el estado real (skills completos, coordinator activo) (GAP-016).
- [x] **T-017** Extender sección "Selección por necesidad" en `.claude/skills/thyrox/SKILL.md` para incluir lean, pps, sp, cp, bpa con cuándo usar cada uno (GAP-017).
- [x] **T-018** Corregir nombres de workflow skills en `.claude/CLAUDE.md` Locked Decision #5 Addendum FASE 39: workflow-baseline, workflow-diagnose, workflow-scope, workflow-implement (GAP-019).
- [x] **T-019** Crear `.claude/skills/workflow-diagnose/references/root-cause-analysis-methodology.md` — guía de análisis de causa raíz como reference file faltante (GAP-018).
- [x] **T-020** Actualizar descripción en `.claude-plugin/plugin.json` para mencionar todos los namespaces activos: lean, pps, sp, cp, bpa (GAP-028).
- [x] **T-021** Corregir stale checkboxes en artefactos WP relevantes, incluyendo este plan y `multi-methodology-namespaces-task-plan.md` (GAP-031).

---

## Tier 4 — Meta-Framework Orchestration (Arquitectura Mayor)

> Estos gaps requieren decisiones arquitectónicas antes de implementar. Documentados aquí para visibilidad; implementar en ÉPICA separada si se aprueba.

- [x] **T-022** Agregar `native_phase_count`, `produces:`, `consumes:` a los 11 YAMLs de registry (GAP-022). Schema de artifacts implementado.
- [x] **T-023** Extender `now.md` con sección `coordinators:` para tracking per-coordinator (GAP-023).
- [x] **T-024** Crear template `artifact-registry.md` en `workflow-discover/assets/` para inter-coordinator coordination (GAP-025).
- [x] **T-025** Crear template `orchestration-log.md` para historial de activaciones de coordinators (GAP-027).
- [x] **T-026** Actualizar todos los 11 coordinator agents para emitir artifact-ready signal estructurado (GAP-024).
- [x] **T-027** Crear `.thyrox/registry/routing-rules.yml` con mapeo problema→coordinator (GAP-020).
- [x] **T-028** Rework de `thyrox-coordinator.md` con 5 preguntas diagnósticas y routing automático basado en routing-rules.yml (GAP-021).
- [x] **T-029** Crear `.claude/skills/thyrox/references/methodology-selection-guide.md` con árboles de decisión entre metodologías similares (GAP-029).
- [x] **T-030** Actualizar `scalability.md`: eliminados *(pendiente)*, lenguaje "no-saltables" → "recomendados con alta prioridad" (GAP-026).
- [x] **T-031** Política de coordinator agents documentada en `bootstrap.py`: estáticos, no generados dinámicamente (GAP-030 + GAP-032).

---

## Estado de progreso (actualizado 2026-04-17)

| Tier | Tareas | Completadas | Pendientes | Effort restante |
|------|--------|-------------|------------|-----------------|
| **Tier 1** | T-001..T-010 (10 tareas) | **10 ✓** | 0 | — |
| **Tier 2** | T-011..T-015 (5 tareas) | **5 ✓** | 0 | — |
| **Tier 3** | T-016..T-021 (6 tareas) | **6 ✓** | 0 | — |
| **Tier 4** | T-022..T-031 (10 tareas) | **10 ✓** | 0 | — |
| **Total** | **31 tareas** | **31 ✓** | **0** | **COMPLETADO** |

---

## Criterios de Éxito por Tier

### Tier 1 completado cuando: ✓ DONE
- Los 5 namespaces nuevos tienen YAML en registry y coordinator agent
- `thyrox-coordinator` puede rutear a lean/pps/sp/cp/bpa leyendo sus YAMLs
- Cada coordinator declara su `skills:` array

### Tier 2 completado cuando:
- Los 4 coordinators existentes tienen `skills:` en frontmatter
- Los 32 skills nuevos tienen `metadata.triggers`

### Tier 3 completado cuando:
- THYROX SKILL.md refleja el estado real de implementación
- CLAUDE.md tiene nombres correctos de workflow skills
- workflow-diagnose tiene su references/

### Tier 4 completado cuando:
- `thyrox-coordinator` puede seleccionar coordinator automáticamente
- `now.md` puede trackear múltiples coordinators simultáneos
- Los YAMLs tienen metadata de artifacts para routing determinístico

---

## Orden de ejecución recomendado

```
T-001 → T-002 → T-003 → T-004 → T-005  (YAMLs en paralelo tras T-001)
  ↓       ↓       ↓       ↓       ↓
T-006   T-007   T-008   T-009   T-010  (coordinators en paralelo)
  └───────────────────────────────────→ T-011, T-012, T-013, T-014  (paralelo)
                                         ↓
                                        T-015  (bulk update 32 skills)
                                         ↓
                                        T-016..T-021  (docs, paralelo)
                                         ↓
                                        T-022..T-031  (Tier 4, secuencial)
```
