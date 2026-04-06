```yml
Tipo: Metodología General
Categoría: Convenciones
Versión: 1.0
Propósito: Define convenciones del proyecto: ubicaciones de archivos, nombrado, estructura.
Objetivo: Asegurar consistencia en todo el proyecto.
Fecha actualización: 2026-03-25
```

# PM-THYROX Conventions

## Propósito

Define convenciones del proyecto: ubicaciones de archivos, nombrado, estructura.

> Objetivo: Asegurar consistencia en todo el proyecto.

---

## File Locations

All PM-THYROX workflow files are stored in the THYROX project structure:

```
/project/
├── ROADMAP.md                    Source of truth for progress
├── CHANGELOG.md                  Auto-generated from commits
├── ARCHITECTURE.md               Architectural decisions
├── CONTRIBUTING.md               Contribution guide
│
└── .claude/
    ├── CLAUDE.md                 Persistent context (Level 2)
    ├── context/                  Work produced by framework
    │   ├── project-state.md     Current phase/progress
    │   ├── decisions/           ADRs (adr-NNN.md)
    │   ├── analysis/            Diagnostics and audits (Phase 1, 7)
    │   ├── epics/               Planned work (Phase 3, 4, 5)
    │   └── work-logs/           Session journals (Phase 6)
    │
    └── skills/pm-thyrox/        The SKILL (Level 1)
        ├── SKILL.md             Motor — canonical source
        ├── references/          Documentation loaded on demand
        ├── scripts/             Executable code (detect/convert/validate)
        └── assets/              Templates for output
```

## ROADMAP.md Format

### Structure

```markdown
# ROADMAP - Project Name

**Status:** [Planning / In Development / Beta / Production]
**Current Phase:** Phase N
**Last Updated:** YYYY-MM-DD
**Version:** X.Y.Z

## Progress Conventions

- [ ] = Pendiente (not started)
- [-] = En Progreso (in progress)
- [x] = Completado (YYYY-MM-DD)

## PHASE N: Feature Name

### Feature X
Brief description of what this feature does and why.

**Epic:** context/epics/YYYY-MM-DD-nombre/

- [ ] Subtask 1
- [-] Subtask 2 (started 2025-03-24)
- [x] Subtask 3 (2025-03-24)

**Dependencies:** List what this depends on
**Blocked by:** List what's blocking this

---

## Tabla de Contenidos

- [File Locations](#file-locations)
- [ROADMAP.md Format](#roadmap.md-format)
- [Progress Conventions](#progress-conventions)
- [PHASE N: Feature Name](#phase-n-feature-name)
- [Priority Mapping](#priority-mapping)
- [Traceability IDs](#traceability-ids)
- [Analysis vs Epic](#analysis-vs-epic)
- [Progress Conventions](#progress-conventions)
- [PHASE 1: Estructura Base](#phase-1-estructura-base)
- [PHASE 2: Sub-proyecto API](#phase-2-sub-proyecto-api)
- [PHASE 3: Sub-proyecto Build](#phase-3-sub-proyecto-build)
- [Conventional Commits Format](#conventional-commits-format)
- [Task Management with Claude Code](#task-management-with-claude-code)
- [Progress Tracking](#progress-tracking)
- [Dependency Management](#dependency-management)
- [Blocking and Waiting](#blocking-and-waiting)
- [Architectural Decisions](#architectural-decisions)
- [ADR-001: JWT for Authentication](#adr-001-jwt-for-authentication)
- [ADR-002: Use Stripe for Payments](#adr-002-use-stripe-for-payments)
- [Reference: Change Log Template](#reference-change-log-template)
- [[0.2.0] - 2025-03-28](#[0.2.0]---2025-03-28)
- [[0.1.0] - 2025-03-24](#[0.1.0]---2025-03-24)
- [Common Workflows](#common-workflows)
- [Best Practices](#best-practices)
- [When to Update What](#when-to-update-what)

---


## Priority Mapping

User stories con prioridades se mapean a fases de ejecución:

| Priority | Task Phase | Execution | MVP? |
|----------|-----------|-----------|------|
| P1 | Phase 3 tasks | Primero | Sí |
| P2 | Phase 4 tasks | Segundo | No |
| P3 | Phase 5 tasks | Último | No |

---

## Timestamp Format

Todos los artefactos del framework usan el formato:

```
YYYY-MM-DD-HH-MM-SS
```

**Aplica a:**
- Nombres de work packages: `context/work/2026-04-04-04-16-29-feature-name/`
- Frontmatter YAML de artefactos: `Fecha: 2026-04-04-04-16-29`
- Campos `Fecha creación`, `Fecha actualización`, `Fecha cierre` dentro de cualquier template
- Nombres de work-logs: `context/work-logs/2026-04-04-04-16-29-descripcion.md`

**Cómo obtener el timestamp — OBLIGATORIO:**

```bash
date +%Y-%m-%d-%H-%M-%S
# Ejemplo de output: 2026-04-06-14-32-07
```

SIEMPRE ejecutar este comando antes de escribir cualquier campo `Fecha` en un artefacto.
NUNCA usar solo la fecha (`YYYY-MM-DD`) — siempre incluir la hora (`HH-MM-SS`).
NUNCA inventar ni estimar el timestamp.

**Regla:** Nunca dejar `[YYYY-MM-DD-HH-MM-SS]` como placeholder literal. Siempre reemplazar con timestamp real obtenido del sistema.

---

## Traceability IDs

Cada artefacto usa IDs para trazabilidad cruzada:

| Tipo | Formato | Ejemplo | Dónde se usa |
|------|---------|---------|-------------|
| Requirements | R-N | R-1, R-2 | requirements-analysis |
| Functional Requirements | FR-NNN | FR-001 | spec/requirements |
| Use Cases | UC-NNN | UC-001 | use-cases |
| Success Criteria | SC-NNN | SC-001 | quality-goals/spec |
| Tasks | T-NNN | T-001 | tasks.md |
| Checklist Items | CHK-NNN | CHK-001 | checklists |
| ADRs | adr-NNN | adr-001 | decisions/ |

**Regla:** Cada task (T-NNN) DEBE referenciar el requirement que satisface (R-N o FR-NNN).

---

## Analysis vs Epic

| Tipo | Qué es | Dónde va | Cuándo |
|------|--------|----------|--------|
| **Analysis** | Diagnóstico, hallazgos, investigación | `context/analysis/` | Phase 1 (ANALYZE) o Phase 7 (TRACK) |
| **Epic** | Plan de trabajo con spec + tasks + execution | `context/epics/YYYY-MM-DD-nombre/` | Phase 3+ (tiene epic.md + tasks.md) |

**Regla:** Si el trabajo tiene las 7 fases completas (analysis + strategy + plan + structure + tasks + execute + track) → es un epic. Si es solo hallazgos → es un analysis.
**Notes:** Any relevant context or decisions
**PRD:** Link to .claude/prds/feature.md if exists
**Epic:** Link to .claude/epics/feature/ if exists

### Feature Y
...
```

### Example

```markdown
# ROADMAP - THYROX

**Status:** In Development
**Current Phase:** Phase 2
**Last Updated:** 2025-03-24
**Version:** 0.1.0

## Progress Conventions

- [ ] = Pendiente
- [-] = En Progreso
- [x] = Completado (YYYY-MM-DD)

## PHASE 1: Estructura Base

### Project Setup
- [x] Initialize repository (2025-03-24)
- [x] Create directory structure (2025-03-24)
- [x] Write documentation (2025-03-24)

## PHASE 2: Sub-proyecto API

### User Authentication
- [x] Database schema (2025-03-24)
- [-] JWT service (started 2025-03-24)
- [ ] API endpoints
- [ ] Tests

**Dependencies:** JWT service blocks API endpoints
**PRD:** See .claude/prds/user-authentication.md

### Payment Integration
- [ ] Stripe client setup
- [ ] Subscription endpoints
- [ ] Webhook handler
- [ ] Tests

**Blocked by:** Stripe API credentials setup
**Notes:** Coordinate with ops team for credentials

## PHASE 3: Sub-proyecto Build

...
```

## Conventional Commits Format

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: A new feature
- `fix`: A bug fix
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code restructuring (no feature or bug fix)
- `perf`: Performance improvements
- `chore`: Build, CI/CD, dependencies, tooling
- `style`: Code style changes (formatting, missing semicolons, etc.)

### Scope

The scope is optional but recommended. Use the functional area:
- `api` - API changes
- `auth` - Authentication/authorization
- `db` - Database/models
- `ui` - User interface
- `tests` - Test suite
- `docs` - Documentation

### Examples

```
feat(api): add user login endpoint
fix(auth): handle token expiry correctly
test(api): add JWT validation tests
docs(readme): update setup instructions
refactor(db): simplify user model queries
perf(api): optimize query performance
chore(deps): update dependencies
```

### Benefits

- **Automatic CHANGELOG generation** - Tool reads commits and groups by type
- **Clear history** - Git log is instantly readable
- **Semantic versioning** - `feat` = minor, `fix` = patch, `BREAKING CHANGE` = major
- **CI/CD hooks** - Tooling can trigger based on commit type

## Task Management with Claude Code

### Native Commands

```bash
/task:show              # Show all available tasks
/task:create "Name"     # Create a new task
/task:next              # Show next available task
/task:complete <id>     # Mark task as complete
```

### With Dependencies

```bash
/task:create "Task 1"
/task:create "Task 2" --depends-on "task-1"
/task:create "Task 3" --depends-on "task-1,task-2"
```

### Parallel Execution

Multiple Claude Code sessions can work simultaneously:
- Each session calls `/task:show` to see available work
- Each session commits with Conventional Commits
- Git merges independent work automatically
- ROADMAP.md tracks overall progress

## Progress Tracking

### Daily Updates

At the start of each session:
1. Check ROADMAP.md for current phase
2. Review recent commits: `git log --oneline -10`
3. Update any in-progress items with current status

### Weekly Updates

Once a week:
1. Update CHANGELOG.md from recent commits
2. Archive completed features in ROADMAP.md
3. Update project-state.md with current progress

### Monthly Updates

Once a month:
1. Review decisions.md - any architectural changes?
2. Update VERSION in ROADMAP.md if releasing
3. Create git tag: `git tag -a v0.2.0 -m "Release v0.2.0"`

## Dependency Management

### In ROADMAP.md

```markdown
### Feature X
- [x] Task 1
- [ ] Task 2

**Dependencies:** Task 1 completes before Task 2
```

### In Claude Code

```bash
/task:create "Task 2" --depends-on "task-1"
```

### Parallel vs Sequential

```markdown
### Feature X
- [ ] Task 1: Database (can run in parallel)
- [ ] Task 2: API (can run in parallel)
- [ ] Task 3: Tests (depends on Task 1 and Task 2)

**Dependencies:** Task 3 waits on Task 1 and Task 2
**Parallel:** Task 1 and Task 2 can run simultaneously
```

## Blocking and Waiting

### Mark as Blocked

```markdown
### Feature X
- [ ] Task 1
- [ ] Task 2 (BLOCKED - waiting on external API keys)

**Blocked by:** External API credentials not yet available
**Waiting on:** Ops team to provide Stripe credentials
**ETA:** Expected 2025-03-25
```

### Standup Status

When asked for standup, reference blocked items:
```
In Progress: Task X (75%)
Blocked: Task Y (waiting on API keys from ops)
Next: Task Z (ready to start)
```

## Architectural Decisions

Use [.claude/context/decisions](../../../context/decisions.md) to document ADRs:

```markdown
# Architectural Decision Records

## ADR-001: JWT for Authentication

**Status:** Accepted
**Date:** 2025-03-24
**Context:** Need stateless authentication for API
**Decision:** Use JWT tokens with refresh token rotation
**Consequences:** Requires token storage on client; expiry handling needed

---

## ADR-002: Use Stripe for Payments

**Status:** Accepted
**Date:** 2025-03-24
**Context:** Need payment processing for subscriptions
**Decision:** Use Stripe API instead of building custom solution
**Consequences:** Stripe dependency; webhook handling required
```

## Reference: Change Log Template

[CHANGELOG](../../../../CHANGELOG.md) is auto-generated but follows this format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-03-28

### Added
- User authentication with JWT tokens
- Payment integration with Stripe
- Subscription management endpoints

### Fixed
- Token expiry handling
- Concurrent request race condition

### Changed
- API error response format updated

### Deprecated
- Legacy authentication method

### Removed
- Debug logging endpoints

### Security
- Fixed SQL injection vulnerability in user queries

## [0.1.0] - 2025-03-24

### Added
- Initial project structure
- ROADMAP and documentation
```

## Common Workflows

### Adding a New Feature

1. Add to ROADMAP.md under appropriate PHASE
2. List subtasks (3-5 items)
3. If complex, create PRD at `.claude/prds/<feature>.md`
4. Create Claude Code tasks: `/task:create "Subtask"`
5. Mark dependencies in task creation
6. Start working, commit with conventional format
7. Update ROADMAP.md as tasks complete
8. When feature complete, move to next feature

### Generating Changelog

1. Review recent commits: `git log --oneline v0.1.0..HEAD`
2. Group by type (feat, fix, test, etc.)
3. Remove internal items (chore, refactor, docs)
4. Update CHANGELOG.md with new version
5. Create git tag: `git tag -a v0.2.0 -m "Release v0.2.0"`

### Handling Blockers

1. Add to ROADMAP.md: `(BLOCKED - reason)`
2. Note what's needed to unblock
3. Note ETA if known
4. Check daily in standup
5. Remove BLOCKED status when unblocked

### Parallel Execution

1. Break feature into independent tasks
2. Use `/task:create` with `--depends-on` only where needed
3. Assign different Claude Code sessions to different tasks
4. Each makes commits with different scopes (e.g., feat(api), feat(ui))
5. Git merges independently
6. ROADMAP.md shows parallel progress

## Error Tracking (AP-06)

Errores se documentan en `context/errors/ERR-NNN.md` usando el template [error-report.md.template](../assets/error-report.md.template).

**Campos obligatorios:** Qué pasó / Por qué / **Prevención** / Insight

**Reglas:**
- Cada error DEBE tener campo "Prevención" con acción concreta
- Si un error recurre (ej: ERR-002 → ERR-006), la "Prevención" del error anterior falló — escalar a regla en SKILL.md o CLAUDE.md
- Errores que recurren 2+ veces se convierten en locked decision en CLAUDE.md

**Feedback loop:** Error → Prevención → Si recurre → Regla en SKILL/CLAUDE

## Human Handoff (AP-04)

Cuando Claude necesita una decisión del usuario que no puede resolverse en la sesión actual:

1. **Sesión actual:** Agregar al campo `blockers:` en `now.md`
   ```yml
   blockers: ["Decidir stack tecnológico para API", "Aprobar diseño de DB schema"]
   ```

2. **Cross-sesión:** Agregar sección en `focus.md`
   ```markdown
   ### Decisiones pendientes del usuario
   - [ ] Decidir stack tecnológico para API (bloquea T-003)
   - [ ] Aprobar diseño de DB schema (bloquea Phase 4)
   ```

3. **Resolución:** Al decidir, eliminar de blockers/focus y documentar decisión en `context/decisions/`

## Best Practices

- **Update ROADMAP.md daily** — Keep it fresh and accurate
- **Use Conventional Commits** — Enables automation and clear history
- **Add dates when completing** — ROADMAP.md shows `[x] Task (2025-03-24)`
- **Link PRDs from ROADMAP.md** — Make it discoverable
- **Document blockers immediately** — Don't let them surprise you later
- **Commit frequently** — Small commits are easier to review and revert
- **Keep task scope small** — Ideally 2-4 hours of work per task
- **Review ROADMAP.md before starting session** — Context transfer is essential
- **Before deleting files, grep for references** — Run `grep -r "filename" .claude/` to find all mentions and update them. Use [detect_broken_references.py](../scripts/detect_broken_references.py) to validate after

## When to Update What

| Update | When | Frequency |
|--------|------|-----------|
| ROADMAP.md | Task starts, task completes | Daily |
| CHANGELOG.md | After commit sequence | Weekly |
| decisions.md | Major architectural decision | As-needed |
| project-state.md | End of session | Weekly |
| focus.md | End of session | Every session |
| now.md | Start and end of session | Every session |
| context/errors/ | When error occurs | As-needed |
| Git tag | Release to production | With version bump |
