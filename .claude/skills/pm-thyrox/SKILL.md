```yml
name: pm-thyrox
description: "Project management with 7-phase SDLC for THYROX. Use when planning features, breaking down work, tracking progress, documenting decisions, or managing project lifecycle."
```

# PM-THYROX

**Level 1 — Motor del framework.** Fuente canónica de la metodología.

```
Level 1: SKILL.md    → Motor (define metodología y fases)
Level 2: CLAUDE.md   → Puente (contexto persistente entre sesiones)
Level 3: README.md   → Presentación (entrada para humanos)
```

## 7 Phases

### Phase 1: ANALYZE
Understand requirements, stakeholders, constraints, context.
8 subsections: [introduction](references/introduction.md), [requirements-analysis](references/requirements-analysis.md), [use-cases](references/use-cases.md), [quality-goals](references/quality-goals.md), [stakeholders](references/stakeholders.md), [basic-usage](references/basic-usage.md), [constraints](references/constraints.md), [context](references/context.md).
**Exit:** All subsections documented + approved.

### Phase 2: SOLUTION_STRATEGY
Architectural plan: HOW to satisfy requirements within constraints.
1. **Research:** List unknowns → investigate → document pros/cons
2. **Pre-design check:** Verify principles before deciding
3. **Document:** Key Ideas, Decisions, Tech Stack, Patterns
4. **Post-design re-check:** Verify decisions still respect principles
See: [solution-strategy](references/solution-strategy.md)
**Exit:** Architecture approved + research documented.

### Phase 3: PLAN
1. Brainstorm: problem, users, success criteria, out of scope
2. Create work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`
3. Update ROADMAP.md with features + link to work package
4. Get scope approval
**Exit:** ROADMAP updated + scope approved.

### Phase 4: STRUCTURE
**Simple** (<10 tasks): Create spec.md with overview, user stories, acceptance criteria.
**Complex** (10+ tasks): See [spec-driven-development](references/spec-driven-development.md).
**Gate:** Run spec quality checklist (`assets/spec-quality-checklist.md.template`). Zero [NEEDS CLARIFICATION] markers.
**Exit:** Specs approved + checklist passed.

### Phase 5: DECOMPOSE
1. Read spec.md
2. Create task list: `- [ ] [T-NNN] Description (R-N)` — each task references its requirement
3. Mark parallel tasks [P]
4. Define validation checkpoints
5. Save to `work/.../plan.md` or `work/.../tasks.md`
**Exit:** Tasks atomic + order defined.

### Phase 6: EXECUTE
1. Next task without blockers?
2. Implement the change
3. Commit with [Conventional Commits](references/commit-helper.md)
4. Update ROADMAP.md: `[ ]` → `[x]` with date
5. Repeat until all tasks complete
**Exit:** All tasks done + committed.

### Phase 7: TRACK
- **Status:** Show progress from ROADMAP.md + recent commits
- **Changelog:** Generate from commits → CHANGELOG.md
- **Validation:** Run scripts (see [reference-validation](references/reference-validation.md))
- **100+ issues:** See [incremental-correction](references/incremental-correction.md)
**Exit:** Analysis complete + lessons documented.

## Where Outputs Live

| Phase | Output | Location |
|-------|--------|----------|
| 1 | Analysis | `work/.../analysis/` |
| 1-2 | Decisions | `context/decisions/adr-NNN.md` |
| 3 | Work package | `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` |
| 4 | Spec | `work/.../spec.md` |
| 5 | Tasks | `work/.../plan.md` or `work/.../tasks.md` |
| 6 | Code | Repository (git) |
| 7 | Lessons | `work/.../lessons.md` |

## Naming

```
Files:     kebab-case.md        Work packages: YYYY-MM-DD-HH-MM-SS-nombre/
Commits:   type(scope): desc    ADRs:          adr-NNN.md
Branches:  feature/, bugfix/    Tasks:         [T-NNN] Description (R-N)
```

See: [conventions](references/conventions.md) for full details.

## Scalability

**< 2h:** Phases 1, 2, 6, 7. See [scalability](references/scalability.md).
**2-8h:** All 7 phases.
**8h+:** Full structure with EXIT_CONDITIONS (`assets/EXIT_CONDITIONS.md.template`).

## Advanced

- [prompting-tips](references/prompting-tips.md) — When Claude struggles
- [long-context-tips](references/long-context-tips.md) — Documents >5,000 words
- [skill-authoring](references/skill-authoring.md) — Creating or improving skills
- [examples](references/examples.md) — 8 real-world use cases
