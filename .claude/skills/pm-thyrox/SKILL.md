```yml
Tipo: Skill Maestro
Categoría: Project Management
Versión: 2.0
Nombre: pm-thyrox
Descripción: Flujo de gestión de proyectos con 7 fases SDLC para THYROX
Propósito: Metodología completa de gestión de proyectos con Claude Code
Fecha actualización: 2026-03-27
```

# PM-THYROX: Project Management Skill

**Level 1 — Motor del framework.** Este archivo es la fuente canónica de la metodología THYROX. Los demás archivos lo referencian, no lo redefinen.

```
Level 1: SKILL.md    → Motor (define metodología, fases, reglas)
Level 2: CLAUDE.md   → Puente (contexto persistente entre sesiones)
Level 3: README.md   → Presentación (entrada para humanos)
```

## Propósito

Metodología de 7 fases SDLC para analizar, planificar, estructurar, ejecutar y trackear proyectos de cualquier tamaño con Claude Code.

> ROADMAP.md es la fuente de verdad. Git es la persistencia. ANALYZE siempre primero.

---

## When to Use This Skill

Trigger cuando el usuario:

- Quiere **analizar** un proyecto: "analyze this", "let's document requirements"
- Quiere **planificar**: "plan feature X", "let's design the architecture"
- Necesita **descomponer**: "break down X", "create tasks for X"
- Quiere **trackear**: "what's next?", "standup", "what's blocked?"
- Quiere **documentar**: "generate changelog", "create ADR", "mark X done"

---

## 7-Phase Workflow

```
Phase 1: ANALYZE           → Understand requirements, stakeholders, context
Phase 2: SOLUTION_STRATEGY → Architectural plan, decisions, tech stack
Phase 3: PLAN              → Scope, brainstorm, update ROADMAP.md
Phase 4: STRUCTURE         → PRDs or Spec-Driven docs (optional)
Phase 5: DECOMPOSE         → Break into atomic tasks
Phase 6: EXECUTE           → Implement + conventional commits
Phase 7: TRACK             → Monitor, changelog, close
```

**Always start with ANALYZE.** For small projects (<2h): phases 1, 2, 6, 7.
For details on scaling: see [scalability](references/scalability.md).

---

## Phase 1: ANALYZE

**Goal:** Deep understanding of requirements, quality goals, stakeholders, constraints, context.

8 subsections (in order):
1. [Introduction](references/introduction.md) — Vision, purpose
2. [Requirements Analysis](references/requirements-analysis.md) — What the system must do
3. [Use Cases](references/use-cases.md) — User-system interactions
4. [Quality Goals](references/quality-goals.md) — How well it must work
5. [Stakeholders](references/stakeholders.md) — Who uses it, what they need
6. [Basic Usage](references/basic-usage.md) — How it works operationally
7. [Constraints](references/constraints.md) — What limits the solution
8. [Context](references/context.md) — External systems, boundaries

**Gate:** Create or review `constitution.md` (use `assets/constitution.md.template`).
**Exit:** All 8 subsections approved + constitution ready → Phase 2.

---

## Phase 2: SOLUTION_STRATEGY

**Goal:** Architectural plan defining HOW to satisfy requirements within constraints.

1. **Research:** List unknowns → investigate alternatives → document pros/cons
2. **Constitution check:** Verify decisions respect constitution principles
3. **Document:** Key Ideas, Decisions, Tech Stack, Patterns, Quality Goals, Constraints

See: [solution-strategy](references/solution-strategy.md)

**Gate:** Constitution check passed + research documented.
**Exit:** Architecture approved → Phase 3.

---

## Phase 3: PLAN

**Goal:** Define scope and update ROADMAP.md.

1. Brainstorm: ¿qué problema? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera de scope?
2. Create epic: `context/epics/YYYY-MM-DD-nombre/epic.md`
3. Update ROADMAP.md with features + link to epic (`**Epic:** context/epics/...`)
4. Get scope approval

**Exit:** ROADMAP.md updated, scope approved → Phase 4.

---

## Phase 4: STRUCTURE

**Goal:** Create detailed specification documents before implementation.

**Simple PRD** (5-10 subtasks, <2h): Create epic.md with overview, user stories, acceptance criteria.

**Spec-Driven** (10+ subtasks, complex): See [spec-driven-development](references/spec-driven-development.md) for 4-step workflow (Requirements → Design → Tasks → Implementation).

**Gate:** Run spec quality checklist (use `assets/spec-quality-checklist.md.template`). 0 failed items before Phase 5.
**Exit:** Specs approved + checklist passed → Phase 5.

---

## Phase 5: DECOMPOSE

**Goal:** Break features into atomic, assignable tasks.

1. Read epic.md and specs
2. Identify independent work streams
3. Create task list with IDs, dependencies, estimations
4. Mark parallel tasks [P]
5. Define validation checkpoints
6. Save to `context/epics/.../tasks.md`

**Exit:** Tasks atomic, order defined → Phase 6.

---

## Phase 6: EXECUTE

**Goal:** Build the feature and track progress.

1. Check tasks.md — next task without blockers?
2. Implement the change
3. Commit with Conventional Commits (see [commit-helper](references/commit-helper.md))
4. Update ROADMAP.md: `[ ]` → `[x]` with date
5. If long session: document in `context/work-logs/`
6. Repeat until all tasks complete

**Exit:** All tasks complete, tests passing, commits done → Phase 7.

---

## Phase 7: TRACK

**Goal:** Monitor progress, validate, close.

- **Standup:** Show status from ROADMAP.md + recent commits
- **Changelog:** Generate from conventional commits → CHANGELOG.md
- **Validation:** Run scripts (see [reference-validation](references/reference-validation.md))
- **100+ issues:** See [incremental-correction](references/incremental-correction.md)

**Exit:** Analysis complete, lessons documented → PROJECT CLOSED.

---

## Natural Language Commands

| User Says | Phase | Action |
|-----------|-------|--------|
| "analyze X", "document requirements" | 1: ANALYZE | Run 8 subsections |
| "design the architecture" | 2: SOLUTION_STRATEGY | Create solution strategy |
| "plan feature X" | 3: PLAN | Brainstorm + update ROADMAP |
| "create a PRD for X" | 4: STRUCTURE | Create epic/PRD |
| "break down X" | 5: DECOMPOSE | Create atomic tasks |
| "what should I work on?" | 6: EXECUTE | Show next task |
| "mark X done" | 6/7 | Update ROADMAP |
| "standup", "what's next?" | 7: TRACK | Show status |
| "generate changelog" | 7: TRACK | Update CHANGELOG.md |

---

## Where Outputs Live

| Phase | Output | Location |
|-------|--------|----------|
| 1. ANALYZE | Diagnostics, findings | `context/analysis/` |
| 1-2 | Architectural decisions | `context/decisions/adr-NNN.md` |
| 3. PLAN | Epic definition | `context/epics/YYYY-MM-DD-nombre/epic.md` |
| 3. PLAN | Roadmap update | `ROADMAP.md` |
| 4. STRUCTURE | Specs, design | `context/epics/.../specs/` |
| 5. DECOMPOSE | Tasks | `context/epics/.../tasks.md` |
| 6. EXECUTE | Session journals | `context/work-logs/YYYY-MM-DD-HH-MM-desc.md` |
| 6. EXECUTE | Code + commits | Repository (git) |
| 7. TRACK | Audits, reports | `context/analysis/` |
| 7. TRACK | Changelog | `CHANGELOG.md` |

---

## File Structure

```
/project/
├── ROADMAP.md                    Source of truth for progress
├── CHANGELOG.md                  Auto-generated from commits
├── .claude/
│   ├── CLAUDE.md                 Persistent context (links to this SKILL)
│   ├── context/
│   │   ├── project-state.md      Current phase/progress
│   │   ├── decisions/            ADRs
│   │   ├── analysis/             Diagnostics and audits
│   │   ├── epics/                Planned work
│   │   └── work-logs/            Session journals
│   └── skills/pm-thyrox/         This skill
│       ├── SKILL.md              ← You are here
│       ├── references/           Documentation loaded on demand
│       ├── scripts/              Executable code
│       │   ├── detect-missing-md-links.sh
│       │   ├── convert-missing-md-links.sh
│       │   ├── validate-missing-md-links.sh
│       │   ├── detect_broken_references.py
│       │   ├── convert-broken-references.py
│       │   └── validate-broken-references.py
│       └── assets/               Templates for output
```

---

## Naming Conventions

```
Files:       kebab-case.md
Folders:     lowercase/
Commits:     type(scope): description
Branches:    feature/, bugfix/, docs/
Epics:       YYYY-MM-DD-nombre/
Work-logs:   YYYY-MM-DD-HH-MM-desc.md
ADRs:        adr-NNN.md
Templates:   nombre.md.template
```

For full details: see [conventions](references/conventions.md).

---

## Exit Conditions (Summary)

**Phase 1 (ANALYZE):** All 8 subsections documented + approved
**Phase 2 (SOLUTION_STRATEGY):** Architecture defined + alternatives considered
**Phase 3 (PLAN):** Scope defined + ROADMAP.md updated
**Phase 4 (STRUCTURE):** Specs complete + design approved
**Phase 5 (DECOMPOSE):** Tasks atomic + order defined
**Phase 6 (EXECUTE):** All tasks done + tests passing + committed
**Phase 7 (TRACK):** Analysis complete + lessons documented

Full exit conditions: use `assets/EXIT_CONDITIONS.md.template`

---

## Key Principles

1. **ROADMAP.md is source of truth** — Not GitHub Issues, not external tools
2. **Spec-driven, not vibe-driven** — Every task from documented requirements
3. **Persistent context** — CLAUDE.md + ROADMAP.md + git keep context alive
4. **Transparency** — Status always clear from ROADMAP.md and commits

---

## When NOT to Use

- **Ad-hoc experiments** — Just code. Update ROADMAP.md later
- **Very small tasks** — Use [AD_HOC_TASKS](assets/AD_HOC_TASKS.md.template)
- **Quick bug fixes** — Straight to commits. Add to [REFACTORS](assets/REFACTORS.md.template) if tech debt

---

## Advanced References

- **Prompting:** [prompting-tips](references/prompting-tips.md) — When Claude struggles with instructions
- **Long context:** [long-context-tips](references/long-context-tips.md) — Documents >5,000 words
- **Skill authoring:** [skill-authoring](references/skill-authoring.md) — Creating or improving skills
- **Scalability:** [scalability](references/scalability.md) — Quick/Standard/Full modes, sub-agents, metrics
- **Conventions:** [conventions](references/conventions.md) — File naming, ROADMAP format, commits
- **Examples:** [examples](references/examples.md) — 8 real-world use cases

---

## Troubleshooting

**"ROADMAP.md is cluttered"** → Archive completed phases
**"Task dependencies are complex"** → Use a PRD (Phase 4)
**"Forgot to update ROADMAP.md"** → Use `git log --oneline` to catch up
**"Multiple sessions conflicting"** → Use commit scopes: `feat(api)` vs `feat(ui)`
