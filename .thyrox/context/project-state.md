```yml
type: Dashboard de Proyecto
category: Estado Actual
version: 2.6.0
purpose: Dashboard del proyecto THYROX — estado actual y navegación
goal: Punto de entrada para entender estado actual y próximos pasos
updated_at: 2026-06-03 05:31:08
```

# Project State — THYROX

## Status General

**Versión:** 2.6.0
**Estado:** Activo — framework thyrox con 14 FASEs completadas
**Última actualización:** 2026-06-03 05:31:08
**Branch activo:** `feature/github-workflows-implementation`

---

## Agentes nativos (`29` agentes en `.claude/agents/`)

- `agentic-reasoning` — DEPRECATED — absorbido por deep-dive (Capa 7 calibración THYROX). Usar cuando
- `agentic-validator` — Valida código Python agentic contra el catálogo AP-01..AP-42. Detecta: violaci
- `ba-coordinator` — Coordinator para BABOK — Business Analysis Body of Knowledge (v3), no-secuenci
- `bpa-coordinator` — Coordinator para BPA — Business Process Analysis: As-Is (BPMN), identificació
- `cp-coordinator` — Coordinator para Consulting Process (McKinsey/BCG): Issue Tree, MECE, hipótesis
- `deep-dive` — Análisis adversarial de cualquier artefacto para determinar qué es verdadero, 
- `deep-review` — Use when analyzing coverage between consecutive WP phases, or analyzing architec
- `diagrama-ishikawa` — Especialista en análisis de causa raíz con diagramas de Ishikawa (espina de pe
- `dmaic-coordinator` — Coordinator para DMAIC — Six Sigma process improvement, 5 fases (Define/Measur
- `gate-consistency-evaluator` — Evalúa claims de un artefacto contra decisiones previas y artefactos de stages 
- `lean-coordinator` — Coordinator para Lean Six Sigma — eliminación de desperdicios, mejora de valu
- `mysql-expert` — Tech-expert para MySQL y bases de datos relacionales. Usar cuando se trabaja con
- `nodejs-expert` — Experto en Node.js, Express y ecosistema npm. Usar cuando el usuario necesite im
- `pattern-harvester` — Extrae patrones accionables de un corpus de archivos de análisis deep-dive y ca
- `pdca-coordinator` — Coordinator para PDCA — ciclo de mejora continua (Plan/Do/Check/Act), 4 stages
- `pm-coordinator` — Coordinator para PMBOK — gestión de proyectos PMI, 5 grupos de procesos (Init
- `postgresql-expert` — Tech-expert para PostgreSQL. Usar cuando se trabaja con PostgreSQL queries, sche
- `pps-coordinator` — Coordinator para PPS — Practical Problem Solving (Toyota TBP): Go-and-See, 5 W
- `react-expert` — Experto en React, hooks y ecosistema frontend. Usar cuando el usuario necesite i
- `rm-coordinator` — Coordinator para RM — Requirements Management: elicitación, análisis, especi
- `rup-coordinator` — Coordinator para RUP — Rational Unified Process: 4 fases iterativas (Inception
- `skill-generator` — Genera archivos de skill (.claude/skills/ o .claude/agents/) para una tecnologí
- `sp-coordinator` — Coordinator para Strategic Planning: PESTEL/SWOT, strategy formulation, Balanced
- `task-executor` — Ejecuta tareas atómicas de un task-plan.md. Usar cuando hay un task-plan con ch
- `task-planner` — Use when planning NEW work from scratch — breaks work into T-NNN tasks. NEVER 
- `task-synthesizer` — Consolida outputs existentes de análisis (cluster reports, gap analyses) en un 
- `tech-detector` — Detecta el stack tecnológico de un proyecto analizando archivos de configuraci�
- `thyrox-coordinator` — Coordinator genérico para THYROX — lee el YAML de metodología dinámicamente
- `webpack-expert` — Tech-expert para Webpack y bundling de assets. Conoce configuración de entry/ou

---

## FASEs completadas (14 total)

| FASE 39: plugin-distribution — Migración THYROX a plugin puro de Claude Code (2026-04-15) |
| FASE 38: commands-rellinks — Fix broken links y referencias relativas en commands (2026-04-15) |
| FASE 37: platform-references-expansion — Expansión de reference files de plataforma Claude Code (2026-04-15) |
| FASE 36: guidelines-registry-migration — Migrar .claude/guidelines/ y .claude/registry/ a .thyrox/ (2026-04-14) |
| FASE 35: context-migration — Migración .claude/context/ → .thyrox/context/ ✓ COMPLETADO 2026-04-14 |
| FASE 34: technical-debt-resolution — Resolución 7 TDs activos ✓ COMPLETADO 2026-04-14 |
| FASE 27: agentic-loop — Mecanismo de ejecución continua con /loop (2026-04-09) |
| FASE 28: auto-operations — Sincronización determinista de now.md via hooks reactivos (2026-04-09) |
| FASE 29: technical-debt-resolution — Resolución de Deuda Técnica del Framework (2026-04-09) |
| FASE 30: uv-adoption — Adopción de uv como gestor de entorno Python (2026-04-10) |
| FASE 31: thyrox-commands-namespace — Namespace /thyrox:* mediante Plugin Claude Code (2026-04-11) |
| FASE 34: technical-debt-resolution — Resolución 7 TDs activos ✓ COMPLETADO 2026-04-14 |
| FASE 33: skill-authoring-modernization — Actualización skill-authoring.md + benchmark TD-010/TD-025 ✓ COMPLETADO 2026-04-13 |
| FASE 32: technical-debt-audit — Auditoría y resolución de deuda técnica ✓ COMPLETADO 2026-04-12 |

Ver ROADMAP.md para detalle de cada FASE.

---

## Componentes del framework

### Skills activos (`.claude/skills/`)
- `thyrox/` — Framework principal 7 fases (motor del proyecto)
- Tech skills: backend-nodejs, db-mysql, db-postgresql, frontend-react, frontend-webpack, python-mcp, sphinx

### MCP servers
- `thyrox-memory` — Memoria semántica FAISS (store/retrieve)
- `thyrox-executor` — Ejecución subprocess con blocklist

### Scripts de gestión (`.claude/skills/thyrox/scripts/`)
- `update-state.sh` — Regenera este archivo desde el repo real
- `validate-session-close.sh` — Valida cierre de sesión
- `validate-phase-readiness.sh` — Valida readiness por fase
- `session-start.sh` — Hook SessionStart (inyecta contexto)
- `lint-agents.py` — Valida formato de agentes nativos

---

## Deuda técnica registrada

Ver `.thyrox/context/technical-debt.md` para TD-001 a TD-007.

---

## Próximos pasos

Ver ROADMAP.md sección "sin completar" y `context/focus.md` para WP activo.
