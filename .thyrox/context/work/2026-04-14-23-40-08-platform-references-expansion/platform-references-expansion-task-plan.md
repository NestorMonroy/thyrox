```yml
type: Task Plan
created_at: 2026-04-15 01:38:42
wp: platform-references-expansion
fase: FASE 37
```

# Task Plan — platform-references-expansion (FASE 37)

## Nuevos reference files

- [ ] T-001 Crear `context-engineering.md` — context rot, path-scoping, maturity model (R-1)
- [ ] T-002 Crear `security-hardening.md` — CVEs, MCP vetting, supply chain, data retention (R-1)
- [ ] T-003 Crear `production-safety.md` — 6 reglas no-negociables con implementaciones (R-1)
- [ ] T-004 Crear `multi-instance-workflows.md` — Boris pattern, dual-instance, Agent Teams (R-1)
- [x] T-005 Crear `development-methodologies.md` — 15 metodologías, pirámide, framework decisión (R-1)
- [x] T-006 Crear `github-actions.md` — claude-code-action, 5 patterns CI/CD (R-1)
- [x] T-007 Crear `known-issues.md` — 3 bugs Prompt Cache, GitHub Issue privacy bug (R-1)

## Actualizaciones a references existentes

- [x] T-008 Actualizar `memory-hierarchy.md` — agregar Auto Memory + `claudeMdExcludes` (R-3, R-4)
- [x] T-009 Actualizar `skill-authoring.md` — agregar `` !`command` `` dynamic context injection (R-3, R-4) ← ya documentado en GAP-005, sin cambios
- [x] T-010 Actualizar `subagent-patterns.md` — agregar `isolation: worktree` (R-3, R-4)

## Cierre

- [x] T-011 Registrar TDs medios en `technical-debt.md` (17 gaps out-of-scope)
- [x] T-012 Actualizar ROADMAP.md — agregar FASE 37

---

R-1 = Riesgo fuentes /tmp/ disponibles; R-3 = Consistencia formato; R-4 = No duplicar existente
