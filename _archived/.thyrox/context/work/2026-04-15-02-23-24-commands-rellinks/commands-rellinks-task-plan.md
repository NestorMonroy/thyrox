```yml
type: Task Plan
created_at: 2026-04-15 02:23:24
wp: commands-rellinks
fase: FASE 38
```

# Task Plan — commands-rellinks (FASE 38)

## Task A: Mover commands /commands/ → .claude/commands/

- [x] T-001 Mover `analyze.md` + fix path `workflow-analyze/SKILL.md`
- [x] T-002 Mover `decompose.md` + fix path `workflow-decompose/SKILL.md`
- [x] T-003 Mover `execute.md` + fix path `workflow-execute/SKILL.md`
- [x] T-004 Mover `plan.md` + fix path `workflow-plan/SKILL.md`
- [x] T-005 Mover `strategy.md` + fix path `workflow-strategy/SKILL.md`
- [x] T-006 Mover `structure.md` + fix path `workflow-structure/SKILL.md`
- [x] T-007 Mover `track.md` + fix path `workflow-track/SKILL.md`
- [x] T-008 Mover `init.md` + fix path `workflow_init.md`
- [x] T-009 Mover `deep-review.md` + fix mención `../references/`
- [x] T-010 Mover `spec-driven.md` + fix link `../references/sdd.md`
- [x] T-011 Mover `test-driven-development.md` + fix link `../references/sdd.md`
- [x] T-012 Commit + eliminar directorio `/commands/` vacío

## Task B: Relative links en top 5 .claude/references/

- [x] T-013 `claude-authoring.md` — sin cambios (ya tenía links correctos)
- [x] T-014 `conventions.md` — 2 paths rotos corregidos + 4 tablas linkificadas
- [x] T-015 `skill-authoring.md` — "Ver también" línea 1163 → 3 links relativos
- [x] T-016 `examples.md` — línea 580 → [conventions.md](./conventions.md)
- [x] T-017 `memory-hierarchy.md` — sin cambios (ya tenía links correctos)

## Validación

- [x] T-018 Correr `detect_broken_references.py` — 9/9 links añadidos OK, 89 rotas pre-existentes fuera de scope

---

DAG: T-001..T-011 paralelos → T-012 → T-013..T-017 paralelos → T-018
