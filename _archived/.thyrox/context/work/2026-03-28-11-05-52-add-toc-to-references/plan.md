```yml
Fecha: 2026-03-28
Tipo: Plan
```

# Plan: TOC + Description Optimization + Functional Evals

## Tasks

- [x] [T-001] commit-helper.md TOC (2026-03-28)
- [x] [T-002] conventions.md TOC (2026-03-28)
- [x] [T-003] examples.md TOC (2026-03-28)
- [x] [T-004] incremental-correction.md TOC (2026-03-28)
- [x] [T-005] long-context-tips.md TOC (2026-03-28)
- [x] [T-006] prompting-tips.md TOC (2026-03-28)
- [x] [T-007] spec-driven-development.md TOC (2026-03-28)
- [x] [T-008] Re-ejecutar verify-skill-mapping.sh — 0 warnings (2026-03-28)
- [x] [T-009] Description keyword check — 12/12 passed (2026-03-28)
- [x] [T-010] FE-01: Project start — 4/5 expectations (2026-03-28)
- [x] [T-011] FE-02: Status check — 3/4 expectations (2026-03-28)
- [x] [T-012] FE-03: Decomposition — 4/5 expectations (2026-03-28)

## Functional Eval Results

| Eval | Passed | Failed | Notes |
|------|--------|--------|-------|
| FE-01: Project start | 4/5 | E2 (work package) | Reasonable: first interaction, asks questions before creating structure |
| FE-02: Status check | 3/4 | E3 (next step) | Reads state files correctly, identifies phase |
| FE-03: Decomposition | 4/5 | E1 (task IDs) | Tasks atomic and ordered, but no [T-NNN] format |

**Overall: 11/14 expectations passed (78.6%)**

## Notes

- Description covers all 12 trigger keywords (12/12)
- verify-skill-mapping.sh: 0 warnings after TOC additions
- FE-01 E2 miss: Expected — Claude asks questions before proposing structure
- FE-03 E1 miss: SKILL.md shows [T-NNN] format but Claude doesn't always follow it in first response
