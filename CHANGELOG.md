```yml
Tipo: Historial de Cambios
Categoría: Proyecto
Versión: 0.2.0
Propósito: Registro de cambios notables del proyecto
Fecha actualización: 2026-03-27
```

# CHANGELOG — THYROX

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versionado con [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-03-27

### Added
- Phase 1: ANALYZE — 8 documentos de análisis del proyecto
- Phase 2: SOLUTION_STRATEGY — estrategia arquitectónica
- Phase 3: PLAN — ROADMAP reescrito con estado real
- Phase 4: STRUCTURE — PRD para completar documentación
- Phase 5: DECOMPOSE — 9 tasks atómicas
- Patrón detect/convert/validate para md-links (3 scripts Bash)
- Patrón detect/convert/validate para broken-references (3 scripts Python)
- context/analysis/ y context/epics/ para outputs del framework
- references/scalability.md (escalabilidad, sub-agents, metrics)
- references/reference-validation.md (guía de validación)
- "Where Outputs Live" table en SKILL.md

### Changed
- SKILL.md optimizado: 1084 → 246 líneas (progressive disclosure)
- ROADMAP.md reescrito reflejando estado real del proyecto
- ARCHITECTURE.md reescrito con decisiones reales (no aspiracionales)
- CONTRIBUTING.md reescrito con flujo THYROX real
- CLAUDE.md conectado a SKILL con 7 fases y jerarquía
- README.md con sección Metodología y tabla de jerarquía
- templates/ → assets/ (anatomía oficial de Anthropic)
- tracking/ → assets/ (AD_HOC_TASKS, REFACTORS como .template)
- Orden de fases unificado: ANALYZE primero en todos los archivos
- use-cases.md integrado como 3ra subsección de Phase 1
- Metadata "Proyecto ADT" → "THYROX" en 3 archivos genéricos
- EXIT_CONDITIONS.md.template y project.json.template corregidos

### Removed
- 85 ocurrencias de "arc42" reemplazadas por "architecture docs"
- requirements.md y requirements.md.template (residuos de renombrado)
- .claude/utils/ completo (reportes obsoletos)
- .claude/START-HERE.md (era navegador de utils)
- .claude/context/changes/ (templates movidos a assets/)
- .claude/skills/pm-thyrox/epics/ (epic template movido a assets/)
- Root scripts/ (consolidado en pm-thyrox/scripts/)
- detect-arc42.sh (propósito cumplido)

### Fixed
- 6 errores de numeración de fases en references
- 7 links rotos por paths relativos incorrectos
- `<br>` tags inconsistentes en metadata blocks
- Backtick refs convertidos a markdown links (63+ conversiones)
- .md removido del texto visible de links

---

## [0.1.0] - 2026-03-25

### Added
- Estructura base del proyecto THYROX
- SKILL.md con metodología de 7 fases SDLC
- 20 references de documentación por fase
- 28 assets/templates para documentos
- 9 ADRs (Architecture Decision Records)
- README.md, ROADMAP.md, CHANGELOG.md
- ARCHITECTURE.md, CONTRIBUTING.md
- docs/API.md, docs/BUILD.md
- api/README.md, build/README.md
- project-state.md, decisions.md
- Conventional Commits integrado

---

**Generado desde:** `git log --oneline`
