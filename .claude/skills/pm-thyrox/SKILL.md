---
name: pm-thyrox
description: Project management workflow adapted from CCPM for THYROX template. Use this skill whenever the user wants to plan features, break down work, track progress, create PRDs, or manage project lifecycle. Make sure to use this when users say "plan this feature", "break it down", "what's next", "what's blocked", "create task", "mark done", "generate changelog", or any project planning activity. This is a spec-driven development approach using ROADMAP.md as the source of truth combined with Claude Code native task management.
---

# PM-THYROX: Project Management for THYROX Template

A project management skill that adapts CCPM (Spec-driven development) principles for the THYROX template system. Unlike CCPM which requires GitHub Issues, PM-THYROX uses ROADMAP.md as the single source of truth, combined with Claude Code native task management and Git-based automation.

---

## When to Use This Skill

Trigger PM-THYROX whenever the user:

- Wants to **plan a feature** or capability: "I want to build X", "let's plan X"
- Needs to **break down work**: "break down the X epic", "create tasks for X"
- Wants to **track progress**: "what's next?", "what's blocked?", "standup"
- Needs to **manage tasks**: "create task", "mark done", "start working on X"
- Wants to **generate changelog**: "generate changelog", "create release notes"
- Asks about **dependencies**: "what depends on X?", "what's blocking Y?"
- Wants to **document decisions**: "we decided to...", "architectural decision"

This skill is designed to work seamlessly with the THYROX template structure and Claude Code's native task management.

---

## How This Skill Works

PM-THYROX follows a 5-phase workflow, each phase working directly with files in the THYROX structure:

```
Phase 1: PLAN         → Update ROADMAP.md with requirements
Phase 2: STRUCTURE    → Create PRD in .claude/prds/ (optional)
Phase 3: DECOMPOSE    → Break down into tasks using Claude Code /task:create
Phase 4: EXECUTE      → Work on tasks and commit with Conventional Commits
Phase 5: TRACK        → Monitor progress and auto-generate CHANGELOG.md
```

Each phase updates the project's source of truth — no external tools required.

---

## Phase 1: PLAN

**Goal:** Capture requirements and create a clear specification.

### Trigger
User says something like: "I want to build X", "let's plan X", "create feature X"

### Process

1. **Guided Brainstorming**
   Ask clarifying questions about:
   - What problem does this solve?
   - Who are the users?
   - What's success?
   - What's out of scope?

2. **Update ROADMAP.md**
   Once brainstorming is done, edit the user's ROADMAP.md directly:
   - Add a new PHASE or section if needed
   - List the feature with acceptance criteria
   - Mark as `[ ]` (pending)
   
   Example:
   ```
   FASE 2: Sub-proyecto API
   
   Feature: User Authentication
   - [ ] JWT token generation
   - [ ] Login endpoint
   - [ ] Refresh token logic
   - [ ] Token validation middleware
   ```

3. **Optional: Create a PRD**
   If the feature is complex, offer to create a detailed PRD at `.claude/prds/<feature-name>.md`
   This is optional — ROADMAP.md is the source of truth.

### Transition
Ask: "Ready to break this down into tasks, or do you want more planning?"

---

## Phase 2: STRUCTURE (Optional PRD)

**Goal:** Create a formal specification document if needed.

### When to Use
- Feature is complex (5+ subtasks)
- Team collaboration needed
- Requirements need detailed documentation

### Process

1. **Create PRD File**
   Create `.claude/prds/<feature-name>.md` with:
   - Overview
   - User Stories
   - Acceptance Criteria
   - Technical Approach
   - Open Questions

2. **Use Interactive Refinement**
   Ask for feedback:
   - "Does this scope look right?"
   - "Missing any requirements?"
   - "Anything unclear?"

3. **Link to ROADMAP.md**
   Update ROADMAP.md to reference the PRD:
   ```
   Feature: User Authentication
   PRD: See .claude/prds/user-authentication.md
   ```

### Transition
"Ready to decompose this into tasks?"

---

## Phase 3: DECOMPOSE

**Goal:** Break down the feature into discrete, assignable tasks.

### Trigger
User says: "break it down", "create tasks", "decompose this"

### Process

1. **Analyze the Scope**
   Look at ROADMAP.md or PRD and identify independent work streams
   Group related work together (e.g., database, API, UI)

2. **Create Tasks**
   For each task, use Claude Code:
   ```
   /task:create "Task name"
   /task:create "Another task" --depends-on "task-id-1"
   ```

3. **Update ROADMAP.md**
   Mark subtasks with progress:
   ```
   Feature: User Authentication
   - [ ] Task 1: Database schema
   - [ ] Task 2: JWT service
   - [ ] Task 3: API endpoint (depends on Task 2)
   - [ ] Task 4: Tests
   ```

4. **Define Dependencies**
   Show which tasks block others:
   ```
   Task 3 depends on Task 2
   Task 4 can run parallel to Task 3
   ```

### Output
- Tasks created in Claude Code
- ROADMAP.md updated with structure
- Dependencies documented

### Transition
"Ready to start working? I can show you /task:show to see what's next."

---

## Phase 4: EXECUTE

**Goal:** Build the feature and track progress.

### Trigger
User starts working or asks: "what should I work on?", "start working on X"

### Process

1. **Check Available Tasks**
   Show available work:
   ```
   Run: /task:show
   ```

2. **Guide Execution**
   - Assign task scope clearly
   - Explain what "done" means
   - Point to tests if needed

3. **Track Progress**
   Claude Code makes commits with Conventional Commits format:
   ```
   git commit -m "feat(api): add user login endpoint"
   git commit -m "test(auth): add JWT validation tests"
   git commit -m "fix(api): handle token expiry"
   ```

4. **Update ROADMAP.md**
   As features are completed:
   ```
   - [x] Task 1: Database schema (2025-03-24)
   - [x] Task 2: JWT service (2025-03-24)
   - [-] Task 3: API endpoint (in progress...)
   ```

### Parallel Execution
Multiple Claude Code sessions can work simultaneously:
- Session 1 works on database
- Session 2 works on API
- Session 3 works on tests
- All commit to same repo with Conventional Commits

### Transition
"Ready to check standup?" or "What's blocked?"

---

## Phase 5: TRACK

**Goal:** Know project status at a glance.

### Standup
User asks: "standup", "what's our status?", "daily standup"

**Show:**
```
Current ROADMAP.md status:
- In Progress: Task X (70%)
- Blocked: Task Y (waiting on...)
- Next: Task Z (ready to start)

Recent commits:
<last 5 commits with types: feat, fix, test, etc.>

CHANGELOG since last release:
<auto-generated from commits>
```

### What's Next
User asks: "what's next?", "what should I work on?"

**Show:**
- Available tasks (not yet started)
- Tasks with no blockers
- Priority based on ROADMAP.md phase order

### What's Blocked
User asks: "what's blocked?", "blockers"

**Show:**
- Tasks waiting on dependencies
- Tasks marked as blocked in ROADMAP.md
- External blockers

### Mark Done
User says: "mark X done", "complete task X"

**Process:**
1. Update ROADMAP.md: `[ ]` → `[x]` with date
2. Verify task has been merged/committed
3. Show remaining work

### Generate Changelog
User asks: "generate changelog", "create release notes"

**Process:**
1. Read recent commits (Conventional Commits)
2. Group by type: feat, fix, test, docs, refactor
3. Update CHANGELOG.md
4. Show summary

Example output:
```markdown
## [0.2.0] - 2025-03-24

### Added
- User authentication with JWT tokens
- Login endpoint
- Token refresh mechanism

### Fixed
- Token expiry handling
- Concurrent request race condition

### Changed
- Updated API error response format
```

---

## Natural Language Commands

These are patterns users will say. PM-THYROX should recognize and respond:

| User Says | What Happens |
|-----------|--------------|
| "plan X feature" | Phase 1: PLAN → brainstorm + update ROADMAP.md |
| "create a PRD for X" | Phase 2: STRUCTURE → create .claude/prds/X.md |
| "break down X" | Phase 3: DECOMPOSE → create tasks in Claude Code |
| "what's next?" | Phase 5: TRACK → show next available tasks |
| "what's blocked?" | Phase 5: TRACK → show blocked tasks |
| "standup" | Phase 5: TRACK → show status report |
| "mark X done" | Phase 4/5 → update ROADMAP.md, confirm complete |
| "create task: X" | Phase 3 → /task:create "X" |
| "show tasks" | Phase 4 → /task:show |
| "generate changelog" | Phase 5 → read commits, update CHANGELOG.md |

---

## File Locations & Conventions

All project files live in THYROX structure:

```
/home/thyrox/
├── ROADMAP.md              Single source of truth for project status
├── CHANGELOG.md            Auto-generated from commits (weekly)
├── CLAUDE.md               Persistent context for Claude Code
│
├── .claude/
│   ├── context/
│   │   ├── project-state.md    Current phase/progress
│   │   └── decisions.md        Architectural decisions (ADRs)
│   │
│   ├── prds/                   Product requirement documents
│   │   └── <feature-name>.md
│   │
│   ├── epics/                  Epics (optional, for complex features)
│   │   └── <epic-name>/
│   │       ├── epic.md
│   │       └── <task-id>.md
│   │
│   └── skills/
│       └── pm-thyrox/          This skill
│
├── reference/
│   ├── AD_HOC_TASKS.md         Small tasks/improvements
│   └── REFACTORS.md            Technical debt

└── (api/, build/, docs/)       Project structure
```

### ROADMAP.md Format

```markdown
# ROADMAP - THYROX

**Status:** In Development
**Current Phase:** Phase X
**Last Updated:** YYYY-MM-DD

## Conventions
- [ ] = Pendiente
- [-] = En Progreso
- [x] = Completado (YYYY-MM-DD)

## PHASE N: Feature Name

### Feature X
Description and context.

- [ ] Subtask 1
- [-] Subtask 2 (started 2025-03-24)
- [x] Subtask 3 (2025-03-24)

**Dependencies:** Subtask 2 blocks Subtask 3
**Notes:** Any relevant context
```

### Git Commit Format

Follow Conventional Commits:

```
<type>(<scope>): <subject>

feat(api):     New functionality
fix(auth):     Bug fixes
test(api):     Tests
docs(readme):  Documentation
refactor(db):  Code restructuring
chore(build):  Build/tooling
```

Examples:
```
feat(api): add user login endpoint
fix(auth): handle token expiry correctly
test(api): add endpoint integration tests
docs(readme): update setup instructions
```

These commits are parsed for auto-generating CHANGELOG.md.

---

## Example Workflow

### Day 1: Planning

```
User: "I want to build a payment integration with Stripe"

PM-THYROX: [Asks 5 clarifying questions about scope, users, success criteria]

User: [Answers with context]

PM-THYROX: [Updates ROADMAP.md in FASE 2]

ROADMAP.md:
  FASE 2: Sub-proyecto API
  - Payment Integration
    - [ ] Stripe client setup
    - [ ] Subscription endpoints
    - [ ] Webhook handler
    - [ ] Tests
```

### Day 2: Decomposition

```
User: "break down payment integration"

PM-THYROX: 
  /task:create "Stripe client setup"
  /task:create "Subscription endpoints" --depends-on "task-1"
  /task:create "Webhook handler"
  /task:create "Tests" --depends-on "task-2,task-3"

Updates ROADMAP.md with task IDs
```

### Days 3-5: Execution

```
User: "what should I work on?"

PM-THYROX: Shows task-1 (no blockers)

User: Builds feature, makes commits:
  feat(payments): add Stripe client initialization
  feat(payments): add subscription API endpoint
  
PM-THYROX: 
  Detects commits
  Updates ROADMAP.md with progress
  Shows remaining tasks
```

### End of Week: Status

```
User: "standup"

PM-THYROX: Shows:
  In Progress: task-2 (API endpoint) - 80%
  Blocked: task-4 (Tests, waiting on task-3)
  Next: task-3 (Webhook handler)
  
  Recent commits:
  feat(payments): stripe client
  feat(payments): subscription endpoint
  feat(payments): webhook handler
```

### Release

```
User: "generate changelog"

PM-THYROX: 
  Reads commits from last release
  Groups by type (feat, fix, test)
  Updates CHANGELOG.md
  
  v0.2.0 - 2025-03-28
  
  Added:
  - Stripe payment integration
  - Subscription management
  - Webhook handling
  
  Tests:
  - Payment endpoint tests
  - Webhook validation tests
```

---

## Key Principles

1. **ROADMAP.md is source of truth** — Not GitHub Issues, not a separate tool. One file, always accessible.

2. **Spec-driven, not vibe-driven** — Every task comes from documented requirements. No surprises.

3. **Persistent context** — CLAUDE.md, ROADMAP.md, and git history keep context alive across sessions.

4. **Parallel execution** — Multiple Claude Code sessions can work simultaneously thanks to Conventional Commits and Git.

5. **Transparency** — Status is always clear from ROADMAP.md and recent commits.

6. **Automation** — CHANGELOG.md, task dependencies, and progress tracking are automated where possible.

---

## Tips & Best Practices

**Break down features early** — Don't wait until execution. A 30-minute planning session saves 2 hours of confusion.

**Use Conventional Commits** — They enable automatic changelog generation and clear history. Always `feat:`, `fix:`, `test:`, etc.

**Update ROADMAP.md regularly** — Even small progress updates help. Date every completion.

**Leverage Claude Code /task** — The native task system handles dependencies and multi-session work.

**Document blockers** — If something is blocked, say it in ROADMAP.md. Next person will see it immediately.

**Keep PRDs optional** — Simple features don't need a PRD. ROADMAP.md bullet points are enough.

---

## Differences from CCPM

| Aspect | CCPM | PM-THYROX |
|--------|------|-----------|
| Source of truth | GitHub Issues | ROADMAP.md |
| Task management | Manual GitHub sync | Claude Code /task native |
| Changelog | Auto from GH Issues | Auto from Conventional Commits |
| External tool | GitHub required | Git only |
| PRDs | .claude/prds/ required | .claude/prds/ optional |
| Parallelism | Worktrees + Issues | Claude Code sessions + Git |
| Complexity | Medium-High | Low-Medium |

---

## When to NOT Use This Skill

- **Ad-hoc experiments** — For quick POCs, just code. Update ROADMAP.md later.
- **Very small tasks** — "Add a comment" doesn't need a task. Use AD_HOC_TASKS.md instead.
- **Bug fixes** — Quick fixes go straight to commits. Add to REFACTORS.md if it's tech debt.

---

## Recursos Avanzados

Este skill incluye referencias a best practices de Anthropic y convenciones de commit para optimizar cómo trabajas:

### Commit Helper - CUANDO HAGAS UN COMMIT, USA LOS TEMPLATES

Después de completar trabajo y necesitar hacer commit:

**Paso 1: Determina tipo de cambio**
- Nueva feature → **feature.template**
- Bug fix → **bugfix.template**
- Refactoring → **refactor.template**
- Documentación → **documentation.template**
- Completar tarea PM-THYROX → **task-completion.template**
- Múltiples archivos → **multiple-files.template**
- Referencia completa → **commit-message-main.template**

**Paso 2: Consulta el template**
```bash
cat .claude/skills/pm-thyrox/templates/[template-nombre].template
```

**Paso 3: Completa y commitea**
```bash
git add [archivos]
git commit -m "[contenido del template completado]"
```

Consultar **`references/commit-helper.md`** para:
- Explicación completa de Conventional Commits
- Tipos válidos (feat, fix, docs, refactor, test, chore, perf)
- Scopes THYROX-specific
- Reglas esenciales (72 chars, NO emojis, imperativo)
- Ejemplos prácticos
- Best practices de commit
- Integración con PM-THYROX

---

### Prompting Optimization

Consultar **`references/prompting-tips.md`** cuando:
- Claude no entiende tus instrucciones correctamente
- Necesitas mejor calidad en análisis complejos
- Trabajas en tareas multi-paso y algo falla
- Quieres mejorar consistencia de respuestas

**Cubre**: Long-horizon reasoning, state management, context awareness, feedback específico.

---

### Skill Authoring

Consultar **`references/skill-authoring.md`** cuando:
- Necesitas crear un nuevo skill
- Un skill crece demasiado (>500 líneas)
- Quieres mejorar calidad de un skill existente
- Necesitas decidir cómo estructurar contenido

**Cubre**: Principios de design, progressive disclosure, naming conventions, evaluación.

---

### Long Context Documents

Consultar **`references/long-context-tips.md`** cuando:
- Trabajas con documentos >5,000 palabras
- Necesitas traducir arc42 o docs técnicas grandes
- Analizas build output o logs extensos
- Validar cross-references en múltiples archivos

**Cubre**: Data at top patterns, XML structuring, ground responses, mejores prácticas para docs grandes.

---

## Troubleshooting

**"ROADMAP.md is getting cluttered"**
→ Archive completed phases to a separate ARCHIVED-ROADMAP.md section

**"Task dependencies are complex"**
→ Create a simple dependency diagram in ROADMAP.md as comments. Or use a PRD for complex features.

**"Forgot to update ROADMAP.md"**
→ It's OK. Use `git log --oneline` to see recent commits. Update ROADMAP.md from that.

**"Multiple people/sessions are conflicting"**
→ Use conventional commit scope to separate concerns (feat(api) vs feat(ui)). Git handles the merges.

---

## Next Steps

1. Start with Phase 1: PLAN your feature
2. Move to Phase 3: DECOMPOSE into tasks
3. Use Phase 4: EXECUTE with Claude Code
4. Monitor with Phase 5: TRACK
5. Every week, run Phase 5: TRACK → generate changelog

Happy shipping!
