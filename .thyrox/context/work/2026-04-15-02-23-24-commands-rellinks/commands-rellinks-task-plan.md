```yml
type: Task Plan
created_at: 2026-04-15 02:23:24
wp: commands-rellinks
fase: FASE 38
```

# Task Plan — commands-rellinks (FASE 38)

## Task A: Mover commands /commands/ → .claude/commands/

- [ ] T-001 Mover `analyze.md` + fix path `workflow-analyze/SKILL.md`
- [ ] T-002 Mover `decompose.md` + fix path `workflow-decompose/SKILL.md`
- [ ] T-003 Mover `execute.md` + fix path `workflow-execute/SKILL.md`
- [ ] T-004 Mover `plan.md` + fix path `workflow-plan/SKILL.md`
- [ ] T-005 Mover `strategy.md` + fix path `workflow-strategy/SKILL.md`
- [ ] T-006 Mover `structure.md` + fix path `workflow-structure/SKILL.md`
- [ ] T-007 Mover `track.md` + fix path `workflow-track/SKILL.md`
- [ ] T-008 Mover `init.md` + fix path `workflow_init.md`
- [ ] T-009 Mover `deep-review.md` + fix mención `../references/`
- [ ] T-010 Mover `spec-driven.md` + fix link `../references/sdd.md`
- [ ] T-011 Mover `test-driven-development.md` + fix link `../references/sdd.md`
- [ ] T-012 Commit + eliminar directorio `/commands/` vacío

## Task B: Relative links en top 5 .claude/references/

- [ ] T-013 `claude-authoring.md` — convertir referencias navegables a links
- [ ] T-014 `conventions.md` — convertir referencias navegables a links
- [ ] T-015 `skill-authoring.md` — convertir referencias navegables a links
- [ ] T-016 `examples.md` — convertir referencias navegables a links
- [ ] T-017 `memory-hierarchy.md` — convertir referencias navegables a links

## Validación

- [ ] T-018 Correr `detect_broken_references.py .claude/references/` — 0 rotas

---

DAG: T-001..T-011 paralelos → T-012 → T-013..T-017 paralelos → T-018
