```yml
type: Estado Operacional
version: 1.2
updated_at: 2026-06-03 05:43:00
```

# Focus

<!-- WP-STATUS -->
**WP activo:** open-wp-automation — Phase 1 — DISCOVER
WP: `.thyrox/context/work/2026-06-03-05-42-51-open-wp-automation/`
<!-- /WP-STATUS -->

**Última ÉPICA cerrada: 47 — functional-size-signal ✓ (2026-06-03)**
`workflow-discover` clasifica tamaño por 2 ejes (Duración + señal funcional objetiva) + regla de
desempate "gana la mayor". Mitiga ERR-002/006. Audit GRADE A. Hallazgo del audit: PAT-001
(focus.md stale al abrir) confirmado ×3 → ÉPICA 48 (este WP).

**ÉPICA 46 — cosmic-review ✓** (calibración H-1..4 + skill F-1..3; verify-cosmic-baseline.sh).
**ÉPICA 45 — ucs-detallados ✓** (123 UCs formales). **ÉPICA 44 — thyrox-ucs-cosmic ✓**
(baseline COSMIC 675 CFP: A 108 · B 46 · C 376 · D 145, 123 procesos; ADR-009). Skill cosmic +
UCs durables en `docs/requisitos/casos-uso/`.

**Pendiente futuro (otra ÉPICA):** UC-ENG-14 (SubagentStop) tras merge de PR #4 → re-medir capa B (+1 proceso).

**En curso (no cerrada): ÉPICA 43 — github-workflows — Stage 6 SCOPE.**

## Completado (2026-04-17)

- FASE 29: technical-debt-resolution — thyrox rename, 7 SKILL.md validaciones pre-gate, REGLA-LONGEV-001, templates Phase 7, 6 TDs cerrados, L-118..L-122
- FASE 31: thyrox-commands-namespace — plugin namespace `/thyrox:*`, deep-review agent, SDD commands, 8 platform references, TD-036 cerrado, L-123..L-127
- FASE 32: technical-debt-audit — 24 TDs auditados (7 confirmados implementados, 3 implementados, 14 diferidos), REGLA-LONGEV-001 cumplida (70KB→23KB), gates workflow-* mejorados
- FASE 33: skill-authoring-modernization — 14 nuevas referencias (authoring, plataforma, patrones, streaming), 5 actualizadas, TD-025 cerrado, CLAUDE_STREAM_IDLE_TIMEOUT_MS=120000 fix, diagrama-ishikawa agent, 8 lecciones
- FASE 34: technical-debt-resolution — 7 TDs resueltos (TD-001/003/009/018/027/028/035), validate-session-close.sh creado, REGLA-LONGEV-001 en project-status.sh, 4 lecciones
- FASE 39: plugin-distribution — COMPLETADA 2026-04-16
- **ÉPICA 40: multi-methodology — COMPLETADA 2026-04-17** ✓
  - 11 namespaces (lean/pps/sp/cp/bpa + pdca/dmaic/rup/rm/pm/ba)
  - 32 skills nuevos con anatomía completa (assets + references + SKILL.md)
  - 5 coordinator agents nuevos, routing-rules.yml, thyrox-coordinator reworked
  - Artifact-ready signals en 11 coordinators, now.md::coordinators tracking
  - plan-execution.md.template + categorización WP cajones en metadata-standards.md
  - 5 patrones propagados: PAT-001..PAT-005. ADR: meta-framework-orchestration

## Estado del sistema

- 23 agentes nativos en `.claude/agents/`
- **Versión: v2.8.0** (MINOR — 5 nuevos namespaces metodológicos + meta-framework layer)
- 11 metodologías soportadas: PDCA, DMAIC, RUP, RM, PMBOK, BABOK, Lean, PPS, SP, CP, BPA
- TDs activos: TD-010, TD-037, TD-038, TD-039, TD-040, TD-041

## Completado (ÉPICA 41 — 2026-04-17)

- B1 Scripts: close-wp.sh (A-4/A-5/A-6), session-start.sh (A-1/GAP-02), session-resume.sh (A-2/A-3)
- B2 State docs: state-management.md v2.0.0 (flow/methodology_step/# Contexto body)
- B3 README: 9 fixes (pm-thyrox→thyrox, 12 stages, coordinators, 47 refs/23 agents)
- B4 ARCHITECTURE.md: coordinator 4-layer pattern + registry documentation
- B5 DECISIONS.md + methodology-selection-guide + coordinator-integration
- B6 Hooks: 3 hooks reales documentados + close-wp.sh como script manual
- B7 Templates: 5 templates con phase: field malformado corregidos
- Naming: taxonomía 3 niveles (stage directory → domain subdirectory → artifact)
- 6 artefactos renombrados a patrón {content}-{subtype}.md
- **workflow-audit skill**: creado completo (SKILL.md + references/ + assets/ + comando)
- **Audit ÉPICA 41**: Grade A ~96%, 24 PASS + 1 SKIP (T-020 política ROADMAP)
- **B8 Remediación**: sync checkboxes (PAT-004), README opción A eliminada, audit-report actualizado
- **B9 Framework**: PAT-004 en workflow-implement, maxdepth 2 en session-start.sh, Herramientas de calidad en thyrox/SKILL.md, TD-042

## Próxima acción

- Continuar ejecución del task-plan T-001..T-078 (ÉPICA 42)
- Task-plan: `.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/plan-execution/methodology-calibration-task-plan.md`

## Próximos candidatos (post ÉPICA 42)

1. **ÉPICA 37 (platform-references-expansion):** Stage 11 TRACK pendiente
2. **ÉPICA 38 (commands-rellinks):** Stage 1 gate 1→3 pendiente
