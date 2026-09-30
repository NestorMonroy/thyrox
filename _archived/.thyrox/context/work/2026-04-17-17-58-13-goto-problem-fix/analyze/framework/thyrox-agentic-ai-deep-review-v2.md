```yml
created_at: 2026-04-18 05:30:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# THYROX Agentic AI Positioning — Deep Review v2

Revisión exhaustiva post-commits 9516573 y 4ce2d37. Identifica ocurrencias restantes de
"framework" describiendo a THYROX y errores de versioning en archivos no cubiertos por v1.

---

## Resumen ejecutivo

**Archivos verificados:** 35+ archivos .md en skills/, references/, agents/, ARCHITECTURE.md, DECISIONS.md, CONTRIBUTING.md, project-state.md, technical-debt.md, conventions.md, component-decision.md

**Estado post-commits anteriores:** Todo lo de alta prioridad del v1 está corregido.

**Ocurrencias pendientes:** 18 ítems en 12 archivos

| Prioridad | Cantidad | Tipo |
|-----------|----------|------|
| ALTO | 3 | Versioning incorrecto (7 fases / SDLC) |
| MEDIO | 2 | Identidad sujeto/predicado |
| BAJO | 13 | Adjetivales posesivos "del framework" |
| NO CAMBIAR | 15+ | Correctos (meta-framework, ADRs, tech-frameworks, benchmark) |

---

## Inventario — `[CAMBIAR]`

### ALTO — Versioning incorrecto

| # | Archivo | Línea | Texto actual | Texto propuesto |
|---|---------|-------|-------------|----------------|
| A1 | `.claude/references/conventions.md` | ~270 | `Si el trabajo tiene las 7 fases completas (analysis + strategy + plan + structure + tasks + execute + track) → es un epic.` | `Si el trabajo tiene plan completo + tasks + ejecución + track → es un epic (WP multi-stage). Si es solo hallazgos → es un analysis.` |
| A2 | `.claude/references/component-decision.md` | ~83 | `### Caso: Metodología de gestión de proyectos (7 fases)` | `### Caso: Sistema de gestión de proyectos (12 stages)` |
| A3 | `.claude/skills/sphinx/SKILL.md` | ~3, 12 | `thyrox gestiona el proceso de trabajo (fases SDLC)` | `thyrox gestiona el proceso de trabajo (12 stages propios: DISCOVER → STANDARDIZE)` |

### MEDIO — Identidad como sujeto

| # | Archivo | Línea | Texto actual | Texto propuesto |
|---|---------|-------|-------------|----------------|
| M1 | `.claude/references/checkpointing.md` | ~113 | `El framework thyrox usa Git como mecanismo de persistencia` | `El sistema THYROX usa Git como mecanismo de persistencia` |
| M2 | `.claude/references/permission-model.md` | ~213 | `framework maintenance ocurre en ~80% FASEs` | `mantenimiento del sistema ocurre en ~80% FASEs` |

### BAJO — Adjetivales posesivos

| # | Archivo | Línea | Texto actual | Texto propuesto |
|---|---------|-------|-------------|----------------|
| B1 | `ARCHITECTURE.md` | ~100 | `fuente de verdad del framework` | `fuente de verdad del sistema` |
| B2 | `ARCHITECTURE.md` | ~121 | `## Hooks del framework` | `## Hooks del sistema` |
| B3 | `.claude/skills/workflow-standardize/SKILL.md` | desc | `propagating learnings to the framework` | `propagating learnings to the system` |
| B4 | `.claude/skills/workflow-standardize/SKILL.md` | ~36 | `patrones al framework y actualiza guidelines` | `patrones al sistema y actualiza guidelines` |
| B5 | `.claude/skills/workflow-standardize/SKILL.md` | ~75 | `al framework` | `al sistema` |
| B6 | `.claude/skills/workflow-standardize/SKILL.md` | ~110 | `actualizaciones al framework` | `actualizaciones al sistema` |
| B7 | `.claude/skills/workflow-track/SKILL.md` | ~87 | `Phase 12 propaga cambios al framework` | `Phase 12 propaga cambios al sistema` |
| B8 | `.claude/references/state-management.md` | ~18 | `¿Qué hay en el framework hoy?` | `¿Qué hay en el sistema hoy?` |
| B9 | `.claude/references/memory-hierarchy.md` | ~287 | `reglas del framework (Locked Decisions, estructura)` | `reglas del sistema (Locked Decisions, estructura)` |
| B10 | `.claude/references/permission-model.md` | ~9 | `propósito: ...aprobacion del framework` | `propósito: ...aprobacion del sistema THYROX` |
| B11 | `.claude/references/permission-model.md` | ~55 | `comportamiento futuro del framework` | `comportamiento futuro del sistema` |
| B12 | `.claude/references/permission-model.md` | ~214 | `correcto para config del framework` | `correcto para config del sistema` |
| B13 | `.claude/references/conventions.md` | ~806 | `archivos de configuración del framework` | `archivos de configuración del sistema` |

---

## `[CORRECTO]` — No cambiar

| Archivo | Ocurrencia | Razón |
|---------|-----------|-------|
| `.thyrox/context/focus.md` | `meta-framework layer` | Término técnico ADR-meta |
| `DECISIONS.md` | `framework-evolution`, `Meta-framework Orchestration Architecture` | Nombres históricos ADR/WP — inmutables |
| `.claude/references/benchmark-skill-vs-claude.md` | `sin framework`, `¿Era viable sin el framework?` | Benchmark comparativo — correcto |
| `.claude/skills/rup-inception/SKILL.md` | `RUP es un framework` | Describe a RUP — correcto |
| `.claude/skills/frontend-react/SKILL.md` | `framework: react` | Metadata de tech skill — correcto |
| `.claude/skills/frontend-webpack/SKILL.md` | `framework: webpack` | Metadata de tech skill — correcto |
| `.claude/skills/python-mcp/SKILL.md` | `meta-framework THYROX` | Término técnico capa orquestación |
| `.claude/references/conventions.md:684` | `framework/` en adr_path | Nombre de subdirectorio ADRs |
| `.thyrox/guidelines/{layer}-{framework}.instructions.md` | `{framework}` | Placeholder de variable — no describe a THYROX |
| `.claude/CLAUDE.md:159` | `framework/` en adr_path comentario | Nombre de subdirectorio de ADRs |
| `ARCHITECTURE.md:192` | `AI Runtime: Claude Code (Anthropic)` | Descripción correcta de implementación |
| `.thyrox/context/technical-debt.md` | `pm-thyrox` en TDs cerrados | Registros históricos — no editar |

---

## `[DUDOSO]` — Casos ambiguos

| Archivo | Ocurrencia | Decisión |
|---------|-----------|---------|
| `.thyrox/context/technical-debt.md:136,168,193,199` | `pm-thyrox` en TDs cerrados | NO cambiar — son trazabilidad histórica |
| `.claude/references/conventions.md:33` | `Work produced by framework` (comentario árbol) | Dejar — contexto de árbol de directorios |

---

## Archivos confirmados limpios (post commits 9516573 + 4ce2d37)

README.md · ARCHITECTURE.md (línea 13) · SKILL.md (thyrox) · CLAUDE.md · skill-vs-agent.md ·
permission-model.md (Scripts/Config del sistema) · project-state.md · focus.md · CONTRIBUTING.md ·
Todos `.claude/agents/*.md` · Todos `.thyrox/registry/methodologies/*.yml` ·
Todos `.thyrox/context/decisions/*.md` (ADRs inmutables)
