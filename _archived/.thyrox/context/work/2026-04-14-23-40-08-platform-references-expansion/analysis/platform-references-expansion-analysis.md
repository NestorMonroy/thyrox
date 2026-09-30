```yml
type: Phase 1 Analysis
created_at: 2026-04-14 23:40:08
wp: platform-references-expansion
fase: FASE 37
```

# Análisis — platform-references-expansion

## 1. Problema

El deep-review de `claude-code-ultimate-guide` y `claude-howto` identificó **27 gaps** vs las 36 references existentes en `.claude/references/`. La base de conocimiento del framework está incompleta en áreas críticas: context engineering, seguridad, multi-instance workflows, GitHub Actions y otros.

## 2. Hallazgos del deep-review (síntesis)

### Fuente
- `.thyrox/context/research/claude-platform-deep-review/ultimate-guide/_gaps/gaps-ultimate-guide.md` → 16 gaps
- `.thyrox/context/research/claude-platform-deep-review/howto/_gaps/gaps-howto.md` → 11 gaps

### Gaps de impacto ALTO — nuevos archivos

| # | Reference | Fuente principal | Por qué importa |
|---|-----------|-----------------|-----------------|
| 1 | `context-engineering.md` | ultimate-guide/core/context-engineering.md | Context rot matemático inevitable; path-scoping reduce 40-50% tokens; techo 150 instrucciones documentado |
| 2 | `security-hardening.md` | ultimate-guide/security/security-hardening.md, data-privacy.md | 15+ CVEs activos; 36.82% skills con flaws (Snyk); bug caché infla costos 10-20x |
| 3 | `production-safety.md` | ultimate-guide/security/production-safety.md | 6 reglas no-negociables para prod; implementaciones concretas vía settings/hooks |
| 4 | `multi-instance-workflows.md` | ultimate-guide/workflows/agent-teams.md, dual-instance.md | Boris pattern (horizontal scaling); Agent Teams experimental; framework de decisión |
| 5 | `development-methodologies.md` | ultimate-guide/core/methodologies.md | 15 metodologías en pirámide; BMAD, BDD, JiTTesting no cubiertos |
| 6 | `github-actions.md` | ultimate-guide/workflows/github-actions.md | `anthropics/claude-code-action` (6.2k stars); 5 patterns CI/CD |
| 7 | `known-issues.md` | ultimate-guide/core/known-issues.md | 3 bugs Prompt Cache activos; GitHub Issue privacy bug |

### Gaps de impacto ALTO — actualizaciones

| # | Reference existente | Qué agregar | Fuente |
|---|--------------------|-----------|---------| 
| 8 | `memory-hierarchy.md` | Auto Memory + `claudeMdExcludes` | howto/02-memory/README.md |
| 9 | `skill-authoring.md` | `` !`command` `` dynamic context injection | howto/01-slash-commands/README.md |
| 10 | `subagent-patterns.md` | `isolation: worktree` como patrón | howto/04-subagents/README.md |

### Gaps de impacto MEDIO (out of scope FASE 37)

enterprise-governance, session-observability, devops-sre, team-metrics, adoption-approaches, context-optimization-tools, event-driven-automation, settings-reference, agent-evaluation, code-quality-rules, refactoring-patterns, mcp-integration updates, plugins updates, advanced-features updates, long-context-tips updates.

## 3. Estado actual

- `.claude/references/` tiene 36 archivos
- 7 topics de impacto alto sin cobertura
- 3 references existentes con gaps de impacto alto
- Fuentes primarias en `/tmp/reference/` (aún accesibles)
- Deep-review completo en `.thyrox/context/research/claude-platform-deep-review/`

## 4. Restricciones y consideraciones

- **Fuentes disponibles localmente:** `/tmp/reference/claude-code-ultimate-guide/` y `/tmp/reference/claude-howto/` — leer los archivos fuente específicos para cada reference
- **No inventar:** cada afirmación debe citar archivo:línea de la fuente
- **Formato consistente con referencias existentes:** leer un archivo existente como muestra antes de escribir
- **Commit atómico por reference:** no mezclar múltiples referencias en un commit

## 5. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Fuentes en /tmp/ desaparecen antes de completar | Baja | Alto | Priorizar ejecución continua; no diferir |
| Scope creep (incluir gaps medios) | Media | Medio | Scope guard explícito en task plan |
| Inconsistencia de formato | Baja | Medio | Leer ejemplo antes de crear cada archivo |

## 6. Tamaño del WP

**Mediano** — 7 nuevos archivos + 3 actualizaciones = 10 items. Usar Phases 1→3→5→6.
Omitir Phase 4 (STRUCTURE): las referencias no requieren spec formal, el formato es directo.
