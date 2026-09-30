```yml
Fecha estrategia: 2026-03-27
Proyecto: THYROX
Versión arquitectura: 1.0
Arquitecto: Claude Code + Human
Stack: Markdown + Bash + Python + Git
Estado: Borrador
```

# Solution Strategy: THYROX

## Propósito

Documentar el plan arquitectónico de THYROX. CÓMO el framework logra sus requisitos dentro de las limitaciones.

> Objetivo: Transformar los 8 requisitos de Phase 1 en decisiones arquitectónicas ejecutables.

---

## Key Ideas

### Idea 1: Single Skill con Progressive Disclosure

**Descripción:**
Todo el framework vive en un solo skill (pm-thyrox) con contenido distribuido en references/ que se carga bajo demanda. SKILL.md es el punto de entrada (<500 líneas) y navega hacia 20 references.

**Impacto:**
Evita fragmentación (el problema de ADT con 15 skills). Claude Code solo carga lo que necesita, eficiente en tokens.

### Idea 2: Separación Motor vs Trabajo

**Descripción:**
El framework (skills/pm-thyrox/) es estático y reutilizable. El trabajo producido (context/) es dinámico y específico por proyecto. Nunca se mezclan.

**Impacto:**
Se puede copiar pm-thyrox/ a cualquier proyecto nuevo sin arrastrar el trabajo de otro proyecto.

### Idea 3: Detect/Convert/Validate Pattern

**Descripción:**
Cada herramienta de validación se divide en 3 scripts con responsabilidad única: detect (encuentra problemas), convert (los corrige), validate (verifica pass/fail).

**Impacto:**
Cada script sirve a una fase diferente (Phase 1, 6, 7). Composable para CI/CD.

---

## Fundamental Decisions

### Decision 1: Markdown como formato único

**Alternatives Considered:**
- JSON/YAML para datos estructurados — más parseable pero menos legible
- Base de datos (SQLite) — más poderoso pero agrega dependencia
- Formato propietario — más control pero no portable

**Justification:**
Markdown es universal, git-friendly, legible por humanos y AI, no requiere herramientas especiales.

**Implications:**
No hay queries complejos. La "base de datos" es el filesystem. Los scripts parsean texto.

### Decision 2: Git como único sistema de persistencia

**Alternatives Considered:**
- Backup files dentro del repo (_backup_*.md) — como hacía ADT
- Base de datos local — más features pero más complejidad
- Cloud storage — accesible pero dependencia externa

**Justification:**
Git ya versiona todo. No se necesitan backups manuales. `git log` es el changelog. Tags son releases.

**Implications:**
Zero archivos de backup en el repo. El historial vive en git, no en archivos.

### Decision 3: Anatomía oficial de Anthropic

**Alternatives Considered:**
- Estructura libre (como ADT) — más flexible pero inconsistente
- Estructura propia de THYROX — más control pero no estándar

**Justification:**
Seguir el estándar oficial garantiza compatibilidad futura y establece expectativas claras.

**Implications:**
4 carpetas obligatorias: SKILL.md + scripts/ + references/ + assets/. No se crean carpetas ad-hoc.

### Decision 4: ANALYZE primero, siempre

**Alternatives Considered:**
- PLAN primero (como tenían project-state y exit conditions antes de corregir)
- Flexible (cada proyecto decide)

**Justification:**
No puedes planificar lo que no entiendes. Nuestra propia sesión lo demostró: empezamos analizando, no planificando.

**Implications:**
Phase 1 siempre es ANALYZE. El orden es fijo: ANALYZE → SOLUTION_STRATEGY → PLAN → STRUCTURE → DECOMPOSE → EXECUTE → TRACK.

---

## Technology Stack

```
Documentation:     Markdown (.md)
Version Control:   Git
Hosting:           GitHub
AI Runtime:        Claude Code (Anthropic)
Scripts (detect):  Bash (portable, sin dependencias)
Scripts (validate): Python 3 (más robusto para parsing)
Templates:         Markdown templates (.template)
CI/CD:             GitHub Actions (exit codes 0/1)
```

**Justification:**
- Markdown: sin dependencias, git-friendly, AI-legible
- Bash: disponible en todo sistema UNIX, scripts simples
- Python: para lógica más compleja (parsing de referencias)
- Git/GitHub: estándar de la industria, sin costo

---

## Architecture Patterns

### Structural Patterns

- **Single Skill** — Un skill centralizado con referencias modulares
- **Progressive Disclosure** — SKILL.md lean, detalles en references/
- **Anatomía estándar** — SKILL.md + scripts/ + references/ + assets/
- **Motor/Trabajo separation** — skills/ (estático) vs context/ (dinámico)

### Behavioral Patterns

- **Phase-gated workflow** — Exit conditions antes de avanzar de fase
- **Detect/Convert/Validate** — 3 scripts por herramienta de validación
- **Conventional Commits** — Formato estandarizado para changelog automático
- **Escalabilidad por complejidad** — Quick/Standard/Full según tamaño del proyecto

### Documentation Patterns

- **ROADMAP as source of truth** — Un archivo para estado de progreso
- **ADR for decisions** — Architecture Decision Records trazables
- **Work-logs for sessions** — Bitácora por sesión de trabajo
- **Epics for planned work** — Directorio por feature/proyecto

---

## How We Achieve Quality Goals

### Correctness (Priority 1)

**Approach:** Validación automatizada + consistencia forzada

**Mechanisms:**
- Scripts validate-* verifican integridad (exit 0/1)
- Un solo orden canónico de fases en todos los archivos
- Templates predefinidos para consistencia de formato

### Traceability (Priority 1)

**Approach:** Todo documentado con ubicación definida

**Mechanisms:**
- "Where Outputs Live" table en SKILL.md
- ADRs para decisiones, work-logs para sesiones, epics para planes
- Conventional Commits para historial legible

### Persistence (Priority 1)

**Approach:** Git + archivos de contexto

**Mechanisms:**
- CLAUDE.md persiste entre sesiones
- project-state.md tracking fase actual
- ROADMAP.md como fuente de verdad de progreso

### Reusability (Priority 2)

**Approach:** El skill es un directorio autocontenido

**Mechanisms:**
- `cp -r pm-thyrox/ nuevo-proyecto/.claude/skills/pm-thyrox/` funciona
- Zero dependencias externas al skill
- Assets son templates genéricos, no específicos

### Standards (Priority 2)

**Approach:** Seguir anatomía oficial de Anthropic

**Mechanisms:**
- 4 carpetas: SKILL.md + scripts/ + references/ + assets/
- SKILL.md < 500 líneas (ideal) con progressive disclosure
- No archivos auxiliares (README, CHANGELOG, etc. dentro del skill)

---

## Adherence to Constraints

### Markdown only
**How:** Todo documento es .md. Templates son .md.template. Único excepción: project.json.template y scripts.

### Git as version control
**How:** Zero archivos backup. Historial en git log. Tags para releases.

### Bash + Python scripts
**How:** Scripts detect/validate en Bash (portable). Scripts con parsing complejo en Python.

### SKILL.md < 500 lines
**How:** Progressive disclosure. Solo workflow esencial en SKILL.md. Detalles en 20 references.

### Claude Code compatible
**How:** Anatomía oficial. SKILL.md legible por Claude. References cargados bajo demanda.

### Single skill
**How:** pm-thyrox/ contiene todo. No 15 skills separados como ADT.

### No external tools
**How:** Solo git + text editor + Claude Code. No Jira, no Notion, no GitHub Issues.

### Zero cost
**How:** Todo open source. Git es gratis. Claude Code es la única dependencia con costo.

---

## Traceability to Analysis

### Satisfying Requirements

- R-1 (Metodología SDLC) → 7 fases con exit conditions
- R-2 (Documentación por fase) → "Where Outputs Live" table
- R-3 (Persistencia) → CLAUDE.md + project-state.md + git
- R-4 (Templates) → 30 assets en assets/
- R-5 (Scripts validación) → Detect/Convert/Validate pattern
- R-6 (Trazabilidad) → ADRs + work-logs + epics
- R-7 (Escalabilidad) → Quick/Standard/Full modes
- R-8 (Anatomía estándar) → SKILL.md + scripts/ + references/ + assets/

### Satisfying Quality Goals

- Correctness → Scripts validate-*, orden canónico único
- Traceability → ADRs, work-logs, epics, commits convencionales
- Persistence → CLAUDE.md, project-state.md, ROADMAP.md
- Reusability → Skill autocontenido, copiable
- Standards → Anatomía oficial de Anthropic

### Satisfying Stakeholder Needs

- Solo Developer → Framework claro, escalable, sin overhead
- Team Lead → Metodología consistente, progreso trackeable
- Claude Code Agent → SKILL.md lean, references bajo demanda
- New Contributor → project-state.md, ROADMAP.md, CLAUDE.md como onboarding
- Architect → ADRs, solution-strategy, decisions/

---

## Validation Checklist

- [x] Key ideas clearly articulated
- [x] Fundamental decisions documented
- [x] Alternatives considered for each decision
- [x] Clear justifications
- [x] Technology stack complete
- [x] All patterns explained
- [x] Quality goals addressed
- [x] Constraints respected
- [x] Traceable to Phase 1: ANALYZE
- [x] Clear guidance for Phase 3: PLAN

---

## Siguiente Paso

Phase 2: SOLUTION_STRATEGY completada.
→ Pasar a **PHASE 3: PLAN**
