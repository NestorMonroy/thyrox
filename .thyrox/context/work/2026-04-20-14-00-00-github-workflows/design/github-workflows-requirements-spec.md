```yml
created_at: 2026-04-20 23:00:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 7 — DESIGN/SPECIFY
author: Claude
status: Pendiente aprobación
version: 1.0.0
```

# Especificación de Requisitos — GitHub Workflows Infrastructure

## Resumen Ejecutivo

Este documento especifica la construcción de 21 componentes para la infraestructura de `.github/` en el proyecto THYROX. Los componentes se agrupan en 5 categorías: Issue Templates (3), GitHub Actions (3), Script Directories (3), Config Files (3), y Workflows (3).

**Objetivo:** Establecer una estructura modular estándar que valide la integridad del repositorio a nivel de CI/CD (GitHub Actions) y del framework THYROX a nivel local (Sistema Agentic AI).

---

## Mapeo SCOPE → Especificación

| Componente | ID Spec | Descripción |
|-----------|---------|------------|
| Issue Templates (bug, enhancement, config) | SPEC-001 | Issue creation guidance and templates |
| GitHub Actions (run-claude, run-pytest, setup-uv) | SPEC-002 | Reusable workflow actions |
| Script Directories (mention, pr-review, workflows) | SPEC-003 | Support scripts for CI/CD operations |
| Config Files (pull_request_template, dependabot, release) | SPEC-004 | Repository configuration |
| Workflows (test-markdown-links, validate-references, detect-secrets) | SPEC-005 | CI validation for feature → develop |

---

## SPEC-001: Issue Templates

**ID:** SPEC-001<br>
**Scope Origin:** Plan section "Issue Templates (3 archivos)"<br>
**Priority:** High<br>
**Status:** Specification

### Descripción

Three YAML-based issue templates that guide users through structured problem reporting. Each template provides field definitions, required information, and examples.

### Criterios de Aceptación

#### AC-001a: bug.yml Template

```
Given a developer wants to report a bug
When they select "Bug report" from GitHub issue templates
Then they see:
  - Title field (required)
  - Description section with instruction text
  - Steps to reproduce (numbered list)
  - Expected behavior field
  - Actual behavior field
  - Example code block (optional)
  - Version/Environment field (required)
  - Labels automatically set to "bug"
```

#### AC-001b: enhancement.yml Template

```
Given a developer wants to request a feature
When they select "Enhancement" from GitHub issue templates
Then they see:
  - Title field (required)
  - Problem description (what doesn't work)
  - Proposed solution field
  - Alternative approaches field (optional)
  - Additional context field (optional)
  - Labels automatically set to "enhancement"
```

#### AC-001c: config.yml Configuration

```
Given the repository has issue templates
When GitHub loads the issue creation page
Then:
  - Template list displays with descriptions
  - "blank_issues_enabled" is false (force template selection)
  - Contact links are present if repository has contact policy
  - Templates are ordered: bug → enhancement → blank (disabled)
```

### Consideraciones Técnicas

- YAML format per GitHub Actions standard
- Must be in `.github/ISSUE_TEMPLATE/` directory
- Use `about` field for template descriptions
- Validate against GitHub issue form schema

### Implementación

**Archivos a Crear:**
- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/enhancement.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

**Referencia:** FastMCP examples provided in scope phase

**Esfuerzo Estimado:** 1 hora<br>
**Complejidad:** Baja

---

## SPEC-002: GitHub Actions

**ID:** SPEC-002<br>
**Scope Origin:** Plan section "GitHub Actions (3 stubs)"<br>
**Priority:** High<br>
**Status:** Specification

### Descripción

Three reusable GitHub Actions for common CI/CD operations. These are composite actions that wrap existing tooling or serve as stubs for future implementation.

### Criterios de Aceptación

#### AC-002a: run-claude/action.yml

```
Given a workflow wants to execute Claude Code analysis
When it calls the run-claude action
Then it accepts:
  - prompt: string (required, the analysis prompt)
  - oauth-token: string (required, GitHub OAuth token)
  - github-token: string (required, GITHUB_TOKEN)
  - allowed-tools: string (optional, comma-separated tool list)
  - model: string (optional, default="opus")
  - mcp-servers: string (optional, semicolon-separated server list)
  - trigger-phrase: string (optional, to activate Claude on PR comment)
And it outputs:
  - conclusion: string ("success" or "failure")
```

#### AC-002b: run-pytest/action.yml

```
Given a workflow wants to run Python tests
When it calls the run-pytest action
Then it accepts inputs:
  - test-type: string (options: unit, integration, client_process, conformance)
  - markers: string (optional, pytest markers to run)
  - max-procs: number (optional, auto-detect CPU count if not specified)
  - timeout: number (optional, per-test timeout in seconds)
  - extra-flags: string (optional, additional pytest flags)
And it:
  - Installs test dependencies
  - Runs pytest with specified configuration
  - Outputs test results to job summary
  - Sets conclusion based on test results
```

#### AC-002c: setup-uv/action.yml

```
Given a workflow needs Python environment setup
When it calls the setup-uv action
Then it accepts:
  - python-version: string (default="3.10", e.g., "3.11", "3.12")
  - resolution: string (options: locked, upgrade, lowest-direct)
And it:
  - Installs UV package manager
  - Syncs Python dependencies with specified resolution
  - Caches built wheels for faster runs
  - Exports PATH with UV bin directory
```

### Consideraciones Técnicas

- Use composite action type (runs-on: ubuntu-latest compatible)
- Actions are stubs; implementation deferred to future WP
- Must be in `.github/actions/{action-name}/action.yml`
- Outputs must be strings (GitHub Actions limitation)
- Can use official actions (setup-python, setup-java, etc.) as building blocks

### Implementación

**Archivos a Crear:**
- `.github/actions/run-claude/action.yml`
- `.github/actions/run-pytest/action.yml`
- `.github/actions/setup-uv/action.yml`

**Referencia:** FastMCP examples provided in scope phase

**Esfuerzo Estimado:** 2 horas<br>
**Complejidad:** Media

---

## SPEC-003: Script Directories

**ID:** SPEC-003<br>
**Scope Origin:** Plan section "Scripts Directories (3)"<br>
**Priority:** Medium<br>
**Status:** Specification

### Descripción

Three directories containing utility scripts for GitHub Actions workflows. Scripts handle PR review automation, mention/thread resolution, and generic workflow utilities.

### Criterios de Aceptación

#### AC-003a: mention/ Directory

```
Given a workflow needs to resolve PR review threads
When scripts in .github/scripts/mention/ are called
Then the directory contains:
  - gh-get-review-threads.sh: fetch PR review threads with GraphQL
  - gh-resolve-review-thread.sh: resolve/unresolve threads with mutations
Both scripts:
  - Accept PR number and owner/repo as parameters
  - Use GitHub GraphQL API with GITHUB_TOKEN
  - Output structured JSON or plain text
  - Have usage documentation
```

#### AC-003b: pr-review/ Directory

```
Given a workflow wants to automate PR review comments
When scripts in .github/scripts/pr-review/ are called
Then the directory contains:
  - pr-comment.sh: queue inline review comments (file+line, severity, suggestion)
  - pr-diff.sh: display PR changes with line numbers
  - pr-existing-comments.sh: list existing review threads
  - pr-remove-comment.sh: delete queued comments by ID
  - pr-review.sh: submit PR review (APPROVE, REQUEST_CHANGES, COMMENT)
All scripts:
  - Accept PR context (owner, repo, PR number)
  - Use gh CLI or GitHub API
  - Support filtering/querying by file, status, severity
  - Have clear output format
```

#### AC-003c: workflows/ Directory

```
Given workflows need utility functions
When scripts in .github/scripts/workflows/ are accessed
Then the directory contains:
  - Helper scripts for CI/CD operations
  - Examples: environment variable export, artifact management, notification
Scripts are:
  - Sourced by other scripts or workflows
  - Bash-compatible (POSIX shell)
  - Documented with function signatures
```

### Consideraciones Técnicas

- Scripts use bash shebang: `#!/usr/bin/env bash`
- Must be executable: `chmod +x script.sh`
- Use stderr for errors, stdout for results
- Validate GitHub CLI (`gh`) or curl availability
- Scripts may be stubs with documentation; implementation deferred

### Implementación

**Directorios a Crear:**
- `.github/scripts/mention/`
- `.github/scripts/pr-review/`
- `.github/scripts/workflows/`

**Archivos de Ejemplo:**
- `.github/scripts/mention/gh-get-review-threads.sh` (stub)
- `.github/scripts/mention/gh-resolve-review-thread.sh` (stub)
- `.github/scripts/pr-review/pr-comment.sh` (stub)
- `.github/scripts/pr-review/pr-diff.sh` (stub)
- `.github/scripts/pr-review/pr-existing-comments.sh` (stub)
- `.github/scripts/pr-review/pr-remove-comment.sh` (stub)
- `.github/scripts/pr-review/pr-review.sh` (stub)
- `.github/scripts/workflows/helpers.sh` (stub)

**Referencia:** FastMCP examples provided in scope phase

**Esfuerzo Estimado:** 2 horas<br>
**Complejidad:** Media

---

## SPEC-004: Config Files

**ID:** SPEC-004<br>
**Scope Origin:** Plan section "Config Files (3)"<br>
**Priority:** High<br>
**Status:** Specification

### Descripción

Three configuration files for repository-level CI/CD settings: PR templates, dependency updates, and automated release management.

### Criterios de Aceptación

#### AC-004a: pull_request_template.md

```
Given a developer creates a pull request
When GitHub loads the PR creation form
Then they see a template with:
  - Description section (required)
  - Contribution type checkbox (bug fix / documentation / enhancement)
  - Checklist items:
    - Related to issue: link to GitHub issue
    - Follows CONTRIBUTING.md guidelines
    - Tests added/updated
    - Ran `uv check` (or equivalent)
    - Self-review completed
    - Complies with LLM usage guidelines (if applicable)
  - All checklist items are optional (not blocking)
```

#### AC-004b: dependabot.yml

```
Given the repository has dependencies
When Dependabot runs (weekly/daily)
Then it:
  - Tracks pip (Python) dependencies
  - Tracks github-actions updates
  - Checks daily for pip updates
  - Checks weekly for github-actions updates
  - Labels all PRs with "dependencies"
  - Groups updates by type (pip, actions separate)
  - Auto-merges only patch updates (optional; can be manual)
```

#### AC-004c: release.yml

```
Given maintainers create a release
When GitHub generates the release changelog
Then it:
  - Organizes changelog by categories:
    * New Features
    * Breaking Changes
    * Enhancements
    * Security
    * Fixes
    * Docs
    * Examples & Contrib
    * Dependencies
    * Other Changes
  - Maps labels to categories (e.g., label:feature → New Features)
  - Excludes internal labels (skip-changelog, dependencies-only)
  - Orders entries by category
```

### Consideraciones Técnicas

- `pull_request_template.md`: Plain Markdown, no YAML frontmatter
- `dependabot.yml`: YAML format, version: 2
- `release.yml`: GitHub's release config format, uses label→category mappings
- All files in `.github/` root directory

### Implementación

**Archivos a Crear:**
- `.github/pull_request_template.md`
- `.github/dependabot.yml`
- `.github/release.yml`

**Referencia:** FastMCP examples provided in scope phase

**Esfuerzo Estimado:** 1.5 horas<br>
**Complejidad:** Baja

---

## SPEC-005: Workflows (Feature → Develop)

**ID:** SPEC-005<br>
**Scope Origin:** Scope decisions "3 workflows para feature → develop"<br>
**Priority:** Critical<br>
**Status:** Specification

### Descripción

Three blocking workflows that validate repository integrity when PRs are created from feature branches to develop. These workflows are blocker gates: PR cannot be merged if any fails.

### Criterios de Aceptación

#### AC-005a: test-markdown-links.yml

```
Given a PR is created from feature → develop
When GitHub Actions triggers test-markdown-links.yml
Then it:
  - Detects broken markdown links in changed files
  - Scans .md files in PR diff
  - Reports broken links as PR comment
  - Fails the workflow if any links are broken (exit 1)
  - Uses: .claude/scripts/detect-missing-md-links.sh (reutilización)
And the result:
  - Blocks PR merge if status is "failure"
  - Allows merge only if status is "success"
```

#### AC-005b: validate-references.yml

```
Given a PR modifies files that reference other files
When GitHub Actions triggers validate-references.yml
Then it:
  - Extracts all file references (links, includes, imports) from changed files
  - Verifies referenced files exist in the repository
  - Reports missing references as PR comment with line numbers
  - Fails workflow if any reference is invalid
  - Handles multiple reference formats (markdown links, includes, imports)
And the result:
  - Blocks PR merge if status is "failure"
  - Allows merge only if status is "success"
```

#### AC-005c: detect-secrets.yml

```
Given a developer pushes code that may contain secrets
When GitHub Actions triggers detect-secrets.yml
Then it:
  - Scans PR diff for API keys, tokens, credentials
  - Uses git-secrets, truffleHog, or pattern-based detection
  - Reports detected secrets with:
    * File path
    * Line number
    * Pattern matched
    * Recommended action (remove / rotate key)
  - Fails workflow if secrets are found
And the result:
  - Blocks PR merge if status is "failure"
  - Allows merge only if status is "success"
  - Prevents accidental credential exposure (defense in depth)
```

### Consideraciones Técnicas

- Trigger: `pull_request` with `types: [opened, synchronize, reopened]` (only feature → develop)
- Conditional: Only run when PR base is `develop` (not `main`)
- Status check required: PR settings must enforce these checks
- Can reuse existing scripts from `.claude/scripts/`
- Error messages must be human-readable and actionable

### Implementación

**Archivos a Crear:**
- `.github/workflows/test-markdown-links.yml`
- `.github/workflows/validate-references.yml`
- `.github/workflows/detect-secrets.yml`

**Reutilización:**
- test-markdown-links.yml reutiliza: `.claude/scripts/detect-missing-md-links.sh`
- detect-secrets.yml usa: `git-secrets` o `truffleHog` (no reuse)
- validate-references.yml: lógica nueva (no reuse)

**Esfuerzo Estimado:** 2.5 horas<br>
**Complejidad:** Media

---

## Arquitectura General

```
.github/
├── ISSUE_TEMPLATE/          ← SPEC-001 (3 templates)
│   ├── bug.yml
│   ├── enhancement.yml
│   └── config.yml
├── actions/                 ← SPEC-002 (3 actions)
│   ├── run-claude/
│   │   └── action.yml
│   ├── run-pytest/
│   │   └── action.yml
│   └── setup-uv/
│       └── action.yml
├── scripts/                 ← SPEC-003 (3 script dirs)
│   ├── mention/
│   │   ├── gh-get-review-threads.sh
│   │   └── gh-resolve-review-thread.sh
│   ├── pr-review/
│   │   ├── pr-comment.sh
│   │   ├── pr-diff.sh
│   │   ├── pr-existing-comments.sh
│   │   ├── pr-remove-comment.sh
│   │   └── pr-review.sh
│   └── workflows/
│       └── helpers.sh
├── workflows/               ← SPEC-005 (3 workflows)
│   ├── test-markdown-links.yml
│   ├── validate-references.yml
│   └── detect-secrets.yml
├── pull_request_template.md ← SPEC-004a
├── dependabot.yml           ← SPEC-004b
└── release.yml              ← SPEC-004c
```

---

## Dependencias Entre Especificaciones

```
SPEC-001 (Issue Templates)
  └─ No depende de otros

SPEC-002 (GitHub Actions)
  └─ Depende de: actions/ directory structure (autónomo)

SPEC-003 (Script Directories)
  ├─ SPEC-005 usa scripts de SPEC-003 (opcional: test-markdown-links)
  └─ Puede implementarse independientemente

SPEC-004 (Config Files)
  └─ No depende de otros (autónomo)

SPEC-005 (Workflows)
  ├─ test-markdown-links.yml → SPEC-003 (mention scripts) OPCIONAL
  ├─ validate-references.yml → autónomo
  └─ detect-secrets.yml → autónomo
```

**Orden sugerido de implementación:**
1. SPEC-001 (Issue Templates) — independiente
2. SPEC-004 (Config Files) — independiente
3. SPEC-002 (GitHub Actions) — prerequisito para workflows complejos (futuro)
4. SPEC-003 (Script Directories) — prerequisito para workflows que las usan
5. SPEC-005 (Workflows) — último, depende de algunas SPEC-003

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|-------------|-----------|
| Scripts tienen bugs | Workflows fallan incorrectamente | Media | Documentar stub status; testing manual en PR antes de merge |
| Referencias script erradas | test-markdown-links.yml falla | Baja | Verificar path absoluto a `.claude/scripts/` |
| GitHub Actions sintaxis inválida | Workflow no ejecuta | Baja | Validar YAML con `gh workflow view` |
| Secretos detectan falsos positivos | PRs bloqueadas falsamente | Media | Usar allowlist en git-secrets config |

---

## Flujo de Validación Completo

```
1. Developer push feature branch → GitHub
2. Developer abre PR: feature → develop
3. GitHub Actions dispara automáticamente:
   ├─ test-markdown-links.yml (validar links)
   ├─ validate-references.yml (validar archivos)
   └─ detect-secrets.yml (validar credenciales)
4. Resultados:
   ├─ ✓ Todos pasan → PR mergeable
   ├─ ✗ Alguno falla → PR bloqueado, comentario explica problema
   └─ Reviewer ve status checks en PR
5. Developer corrige problema (si alguno falló)
6. Push fix → workflow re-corre automáticamente
7. Una vez todos pasen → PR can be merged
```

---

## Status de Aprobación

- [ ] Especificación completa (5 SPEC)
- [ ] Criterios de aceptación claros (Given/When/Then)
- [ ] Sin términos ambiguos
- [ ] Dependencias documentadas
- [ ] Riesgos identificados
- [ ] Esperando confirmación del usuario

---

**Versión:** 1.0.0<br>
**Última Actualización:** 2026-04-20 23:00:00<br>
**Próxima Fase:** Phase 8 PLAN EXECUTION (after approval)
