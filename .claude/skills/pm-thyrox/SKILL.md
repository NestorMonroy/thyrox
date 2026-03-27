```yml
Tipo: Skill Maestro
Categoría: Project Management
Versión: 1.0
Nombre: pm-thyrox
Descripción: Flujo de gestión de proyectos basado en CCPM para THYROX
Propósito: Proporcionar metodología completa de gestión de proyectos usando 7 fases SDLC
Objetivo: Que usuarios puedan planificar, descomponer, ejecutar y trackear proyectos
Fecha actualización: 2026-03-25
```

# PM-THYROX: Project Management for THYROX Template

## Propósito

PM-THYROX es el skill maestro de gestión de proyectos que adapta principios CCPM (Spec-driven development) para el template THYROX. Proporciona una metodología estructurada en 7 fases SDLC.

> Objetivo: Que usuarios puedan planificar features, descomponer trabajo, trackear progreso, crear PRDs, y manejar el ciclo de vida completo del proyecto.

---

## Descripción General

A project management skill that adapts CCPM (Spec-driven development) principles for the THYROX template system. Unlike CCPM which requires GitHub Issues, PM-THYROX uses ROADMAP.md as the single source of truth, combined with Claude Code native task management and Git-based automation.

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

PM-THYROX follows a 7-phase workflow aligned with SDLC (Software Development Lifecycle), each phase working directly with files in the THYROX structure:

```
Phase 1: ANALYZE           → Requirements, Quality Goals, Stakeholders, Context
                             References: introduction.md, requirements-analysis.md, etc.
                             
Phase 2: SOLUTION_STRATEGY → Architectural plan: ideas, decisions, tech stack
                             Reference: solution-strategy.md
                             
Phase 3: PLAN              → Brainstorm, update ROADMAP.md
                             
Phase 4: STRUCTURE         → Create PRD or Spec-Driven docs (optional)
                             Templates: requirements-analysis.md, requirements-specification.md, design.md, tasks.md
                             
Phase 5: DECOMPOSE         → Break down into tasks using Claude Code /task:create
                             
Phase 6: EXECUTE           → Work on tasks and commit with Conventional Commits
                             
Phase 7: TRACK             → Monitor progress, testing, deployment, maintenance
```

Each phase updates the project's source of truth — no external tools required.

---

## Phase 1: ANALYZE

**Goal:** Deep understanding of requirements, quality goals, stakeholders, constraints, and context.

**Output:** Introduction & Goals, Constraints, Context (Sections 1, 2, 3)

### Process

This phase contains 8 subsections:

1. [Introduction](references/introduction.md)
   - Vision general del proyecto
   - Propósito y contexto

2. **Requirements Analysis** ([requirements-analysis](references/requirements-analysis.md))
   - Requisitos funcionales (Level 1 + Level 2)
   - Matriz de trazabilidad

3. [Use Cases](references/use-cases.md)
   - Flujos de interacción usuario-sistema
   - Flujos alternativos y postcondiciones

4. [Quality Goals](references/quality-goals.md)
   - Priority 1, 2, 3
   - Quality attributes y scenarios
   - Trade-offs

5. [Stakeholders](references/stakeholders.md)
   - Matriz de roles y necesidades
   - Conflictos y resoluciones
   - Alineamiento con Quality Goals

6. [Basic Usage](references/basic-usage.md)
   - Cómo funciona el sistema operacionalmente
   - Flujo principal, modos de operación
   - Resultados observables

7. [Constraints](references/constraints.md)
   - Technical, Platform, Organizational, Regulatory, Business
   - Cómo guían la arquitectura

8. [Context](references/context.md)
   - Business Context (sistemas externos)
   - Technical Context (dependencias)
   - Diagrama de contexto

**References:**
See: [introduction](references/introduction.md), [requirements-analysis](references/requirements-analysis.md), [use-cases](references/use-cases.md), [quality-goals](references/quality-goals.md), [stakeholders](references/stakeholders.md), [basic-usage](references/basic-usage.md), [constraints](references/constraints.md), [context](references/context.md)

**Templates:**
Use: `introduction.md.template`, `requirements-analysis.md.template`, etc.

### Trigger

User says: "I need to analyze this project", "let's document requirements", "what are the constraints?"

### Transition

Ask: "Ready to move to PHASE 2: SOLUTION_STRATEGY?" (after all 7 subsections approved)

---

## Phase 2: SOLUTION_STRATEGY

**Goal:** Architectural plan defining HOW to satisfy requirements within constraints.

**Output:** Solution Strategy document (Section 4)

### Process

Document:

1. **Key Ideas**
   - Fundamental architectural concepts
   
2. **Fundamental Decisions**
   - Why this decision over alternatives
   - Implications
   
3. **Technology Stack**
   - Languages, frameworks, databases, deployment, etc.
   
4. **Architecture Patterns**
   - Structural, behavioral, architectural styles
   
5. **How We Achieve Quality Goals**
   - Mechanisms for each quality goal

6. **Adherence to Constraints**
   - How we respect each constraint

**Reference:**
See: [solution-strategy](references/solution-strategy.md)

**Template:**
Use: `solution-strategy.md.template`

### Trigger

User says: "Let's design the architecture", "what's the technical approach?"

### Transition

Ask: "Ready to move to PHASE 3: PLAN?" (after solution strategy approved)

---

## Phase 3: PLAN

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

## Phase 4: STRUCTURE

**Goal:** Create detailed specification documents before implementation.

### When to Use

**Simple PRD**:
- Feature is moderately complex (5-10 subtasks)
- Straightforward scope
- <2 hours total work
- Low risk

**Spec-Driven Development**:
- Feature is very complex (10+ subtasks)
- Multiple components affected
- Architectural changes
- High risk of regresions
- Multi-session work
- Requires detailed planning
- Multiple stakeholders

### Option A: Simple PRD

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
   Update ROADMAP.md to reference the PRD

### Option B: Spec-Driven Development

For complex work, use **Spec-Driven Development**:

Consult **[spec-driven-development](references/spec-driven-development.md)** for:
- Decision Framework: Should you use spec-driven?
- 4-Phase Workflow:
  * FASE 1: Requirements (QUE necesitas)
  * FASE 2: Design (COMO lo implementarás)
  * FASE 3: Tasks (PASOS exactos)
  * FASE 4: Implementation (EJECUTA)

**Templates**:
- `requirements-analysis.md.template` - Analyze requirements (PHASE 2)
- `requirements-specification.md.template` - Specify technical requirements (PHASE 4)
- `design.md.template` - Design solution
- `tasks.md.template` - Break into actionable tasks

**Benefits**:
- Clear approval gates between phases
- Detailed plan for implementation
- Easy to resume across sessions
- Prevents regresions
- Documents architectural decisions

**Process**:
1. Create requirements document (using template)
2. Get approval from user
3. Create design document (using template)
4. Get approval from user
5. Create tasks document (using template)
6. Get approval from user
7. Execute tasks (PHASE 4)

### Transition

If using Simple PRD:
"Ready to decompose this into tasks?"

If using Spec-Driven:
"Ready to move to FASE 2: Design?" (after requirements approved)

---

## Phase 5: DECOMPOSE

**Goal:** Break down features into discrete, assignable tasks.

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

## Phase 6: EXECUTE

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

## Phase 7: TRACK

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

### Correcting 100+ Issues (Incremental Correction)

If you detect 100+ issues during TRACK phase:

User says: "I have 100+ warnings", "how do I fix many issues?", "correct issues incrementally"

**Use Incremental Correction Methodology:**

Consult **[incremental-correction](references/incremental-correction.md)** for:
- Decision Framework: ¿Manual vs Script?
- 8 Protections for safe scripts
- 4 templates to document process:
  * `analysis-phase.md.template` - Analyze all issues
  * `categorization-plan.md.template` - Plan batches
  * `execution-log.md.template` - Track execution
  * `final-report.md.template` - Document results

**Quick Process:**
1. Use `analysis-phase.md.template` to understand issues
2. Use `categorization-plan.md.template` to create batches
3. Execute batches, document in `execution-log.md.template`
4. Finalize with `final-report.md.template`
5. Commit results with clear messages

---

## Natural Language Commands

These are patterns users will say. PM-THYROX should recognize and respond:

| User Says | What Happens |
|-----------|--------------|
| "analyze X", "let's document requirements" | Phase 1: ANALYZE → requirements, stakeholders, context |
| "let's design the architecture" | Phase 2: SOLUTION_STRATEGY → architectural plan |
| "plan X feature" | Phase 3: PLAN → brainstorm + update ROADMAP.md |
| "create a PRD for X" | Phase 4: STRUCTURE → create .claude/prds/X.md |
| "break down X" | Phase 5: DECOMPOSE → create tasks in Claude Code |
| "create task: X" | Phase 5: DECOMPOSE → /task:create "X" |
| "show tasks" | Phase 6: EXECUTE → /task:show |
| "mark X done" | Phase 6/7 → update ROADMAP.md, confirm complete |
| "what's next?" | Phase 7: TRACK → show next available tasks |
| "what's blocked?" | Phase 7: TRACK → show blocked tasks |
| "standup" | Phase 7: TRACK → show status report |
| "generate changelog" | Phase 7: TRACK → read commits, update CHANGELOG.md |

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
│           ├── SKILL.md
│           ├── references/     Documentation references
│           └── assets/         Document templates + tracking templates
│               ├── AD_HOC_TASKS.md.template
│               └── REFACTORS.md.template
│
├── docs/                       Documentation (API, BUILD, etc.)
├── api/                        Sub-project: API
├── build/                      Sub-project: Build
│
└── .gitignore
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
- **Very small tasks** — "Add a comment" doesn't need a task. Use [AD_HOC_TASKS](assets/AD_HOC_TASKS.md.template) instead.
- **Bug fixes** — Quick fixes go straight to commits. Add to [REFACTORS](assets/REFACTORS.md.template) if it's tech debt.

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
cat .claude/skills/pm-thyrox/assets/[template-nombre].template
```

**Paso 3: Completa y commitea**
```bash
git add [archivos]
git commit -m "[contenido del template completado]"
```

Consultar **[commit-helper](references/commit-helper.md)** para:
- Explicación completa de Conventional Commits
- Tipos válidos (feat, fix, docs, refactor, test, chore, perf)
- Scopes THYROX-specific
- Reglas esenciales (72 chars, NO emojis, imperativo)
- Ejemplos prácticos
- Best practices de commit
- Integración con PM-THYROX

---

### Prompting Optimization

Consultar **[prompting-tips](references/prompting-tips.md)** cuando:
- Claude no entiende tus instrucciones correctamente
- Necesitas mejor calidad en análisis complejos
- Trabajas en tareas multi-paso y algo falla
- Quieres mejorar consistencia de respuestas

**Cubre**: Long-horizon reasoning, state management, context awareness, feedback específico.

---

### Skill Authoring

Consultar **[skill-authoring](references/skill-authoring.md)** cuando:
- Necesitas crear un nuevo skill
- Un skill crece demasiado (>500 líneas)
- Quieres mejorar calidad de un skill existente
- Necesitas decidir cómo estructurar contenido

**Cubre**: Principios de design, progressive disclosure, naming conventions, evaluación.

---

### Long Context Documents

Consultar **[long-context-tips](references/long-context-tips.md)** cuando:
- Trabajas con documentos >5,000 palabras
- Necesitas traducir architecture docs o docs técnicas grandes
- Analizas build output o logs extensos
- Validar cross-references en múltiples archivos

**Cubre**: Data at top patterns, XML structuring, ground responses, mejores prácticas para docs grandes.

---

---

## Exit Conditions (Cuándo avanzar de PHASE)

Cada PHASE tiene **exit conditions** que deben cumplirse antes de continuar. Ver: `assets/EXIT_CONDITIONS.md.template`

### Resumen Rápido:

**PHASE 1 (ANALYZE):** Requisitos documentados + Stakeholders identificados + Todas las referencias completas

**PHASE 2 (SOLUTION_STRATEGY):** Arquitectura definida + Alternativas consideradas + Riesgos identificados

**PHASE 3 (PLAN):** Scope definido + Decisión tomada + ROADMAP.md actualizado

**PHASE 4 (STRUCTURE):** Specs completas + Design aprobado + PRD o Spec-Driven docs listos

**PHASE 5 (DECOMPOSE):** Tasks atómicas + Order definido + Checkpoints de validación

**PHASE 6 (EXECUTE):** Todas las tasks completadas + Tests pasados + Commits realizados

**PHASE 7 (TRACK):** Análisis completo + Lecciones documentadas + Proyecto archivado

### Cómo Usar:

1. Copiar: `.claude/skills/pm-thyrox/assets/EXIT_CONDITIONS.md.template`
2. Llenar: Checklist por cada PHASE
3. Validar: ¿Se cumplen todas?
4. Decisión: Avanzar o refinar?

---

## Escalabilidad por Complejidad

**PM-THYROX** se adapta al tamaño del proyecto:

### Proyectos Pequeños (<2 horas)

**Estructura simplificada:**
- 1 work-log (snapshot inicial)
- 1 documento mutable (donde se captura todo)
- Sin structure completa de changes/

**Fases activas:** 1, 2, 6, 7  
**Sin:** Cambios/, sub-agents, JSON metadata

**Ejemplo:**
```
work-logs/2026-03-26-10-00-quick-fix-typo.md
documento: TASK-FIX-TYPO.md (todo en uno)
```

### Proyectos Medianos (2-8 horas)

**Estructura balanceada:**
- work-logs/ granulares (1 por STEP importante)
- changes/YYYY-MM-DD-HH-MM-nombre/ con estructura PHASE-based
- project.json simple

**Fases activas:** 1, 2, 3, 4, 5, 6, 7  
**Con:** Algunas fases pueden ser rápidas
**Sub-agents:** Validación manual entre PHASEs

**Ejemplo:**
```
work-logs/
  2026-03-26-10-00-decision-feature-x.md
  2026-03-26-10-15-analisis-requisitos.md
  2026-03-26-11-00-design-aprobado.md
  
changes/2026-03-26-10-00-feature-x/
  project.json
  PLAN.md
  analisis/
  specification/
  tasks/
  implementation/
```

### Proyectos Grandes (8+ horas)

**Estructura completa:**
- work-logs/ muy granulares (1 por STEP)
- changes/YYYY-MM-DD-HH-MM-nombre/ completo
- project.json con timing data
- exit-conditions.md rigurosas
- sub-agents para validación automática

**Fases activas:** 1-7 con rigor completo  
**Con:** Iteraciones, validaciones, análisis cuantitativos
**Sub-agents:** Validación automática entre PHASEs

**Ejemplo:**
```
work-logs/
  2026-03-26-10-00-decision-big-project.md
  2026-03-26-10-15-step1-inventario.md
  2026-03-26-10-30-step2-conflictos.md
  2026-03-26-11-00-estrategia-aprobada.md
  2026-03-26-11-30-step1-especificación.md
  ... (muchos más)

changes/2026-03-26-10-00-big-project/
  project.json (timing data)
  EXIT_CONDITIONS.md (100% compliance)
  PLAN.md, analisis/, estrategia/, specification/, tasks/, implementation/
  [Sub-agent validation logs]
```

### Decision Framework: ¿Cuál usar?

- **< 30 minutos:** Solo work-log
- **30 min - 2 horas:** Work-log + documento simple
- **2 - 8 horas:** Work-logs + changes/ (MEDIUM)
- **8+ horas:** FULL STRUCTURE con sub-agents

---

## Sub-Agents para Validación

Para proyectos MEDIANOS y GRANDES, usar sub-agents para validación entre PHASEs:

### Validación After PHASE 2

Sub-agent revisa:
- [ ] Requisitos están claros?
- [ ] Documentación está completa?
- [ ] Stakeholders aprobaron?
- [ ] Referencias está al 100%?

Feedback: "Ready for PHASE 3" o "Missing: [X]"

### Validación After PHASE 4

Sub-agent revisa:
- [ ] Design es implementable?
- [ ] Tasks pueden ejecutarse atómicamente?
- [ ] Estimaciones son realistas?
- [ ] Criterios de éxito son verificables?

Feedback: "Ready for PHASE 5" o "Refine: [X]"

### Validación After PHASE 6

Sub-agent revisa:
- [ ] Todos los tasks completados?
- [ ] Tests pasados?
- [ ] Code quality OK?
- [ ] Commits sigue convención?

Feedback: "Ready for PHASE 7" o "Fix: [X]"

### Cómo Invocar Sub-Agents

Simplemente decir:
```
"Sub-agent, por favor valida que completamos PHASE 2.
Checkea: exit_conditions.md y project.json"
```

El sub-agent:
1. Lee EXIT_CONDITIONS.md
2. Revisa project.json
3. Valida cambios/
4. Reporta: "✓ LISTO" o "✗ NECESITA: [X]"

---

## Tracking & Metrics

### JSON Metadata

Cada proyecto tiene `project.json` que captura:

```json
{
  "phases": {
    "phase_1": { "status": "completed", "duration_minutes": 15 },
    "phase_2": { "status": "in_progress", "duration_minutes": 30 }
  },
  "timing": {
    "total_duration_minutes": 45,
    "breakdown_by_phase": { ... }
  }
}
```

### Work-Logs

Cada work-log tiene metadata:
```
phase: 2
step: step-1-inventario
duration_minutes: 15
status: completed
```

### Analysis

Después de PHASE 7, puedes:
- Comparar: Estimado vs Real
- Analizar: Cuáles PHASEs toman más tiempo
- Optimizar: Patrones para proyectos futuros

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
