```yml
type: Dashboard de Proyecto
category: Estado Actual
version: 2.1.0
purpose: Dashboard del proyecto THYROX — estado actual y navegación
goal: Punto de entrada para entender estado actual y próximos pasos
updated_at: 2026-04-09 06:34:51
```

# Project State — THYROX

## Status General

**Versión:** 2.1.0
**Estado:** Activo — framework pm-thyrox con 24 FASEs completadas
**Última actualización:** 2026-04-09 06:34:51
**Branch activo:** `claude/check-merge-status-Dcyvj`

---

## Agentes nativos (`9` agentes en `.claude/agents/`)

- `mysql-expert` — Tech-expert para MySQL y bases de datos relacionales. Conoce SQL, diseño de sch
- `nodejs-expert` — Experto en Node.js, Express y ecosistema npm. Usar cuando el usuario necesite im
- `postgresql-expert` — Tech-expert para PostgreSQL. Conoce SQL, migrations, índices, transacciones y c
- `react-expert` — Experto en React, hooks y ecosistema frontend. Usar cuando el usuario necesite i
- `skill-generator` — Genera archivos de skill (.claude/skills/ o .claude/agents/) para una tecnologí
- `task-executor` — Ejecuta tareas atómicas de un task-plan.md. Usar cuando hay un task-plan con ch
- `task-planner` — Descompone trabajo en tareas atómicas con IDs trazables. Usar cuando el usuario
- `tech-detector` — Detecta el stack tecnológico de un proyecto analizando archivos de configuraci�
- `webpack-expert` — Tech-expert para Webpack y bundling de assets. Conoce configuración de entry/ou

---

## FASEs completadas (24 total)

| FASE 1: Framework Base (v0.1.0) |
| FASE 2: Consolidación y Coherencia (v0.2.0) — Sesión 2026-03-27 |
| FASE 3: Completar documentación del framework |
| FASE 4: Template listo para reutilización |
| FASE 5: Compatibilidad multi-modelo (Haiku + activación automática) |
| FASE 6: Integración de templates por fase (Reveal Intent + contrato fase→template→output) |
| FASE 7: Meta-Framework Generativo (tech skills auto-generados) |
| FASE 8: Resolución de Deuda Técnica (2026-04-04) |
| FASE 9: Boundary SKILL vs ADR — compatibilidad multi-modelo (2026-04-04) |
| FASE 10: Separación .claude/ vs docs/ — adr_path configurable (2026-04-04) |
| FASE 11: Integración de Capacidades — MCP + Native Agents (2026-04-05) |
| FASE 12: Estandarización de Keys de Metadata YAML (2026-04-07) |
| FASE 13: Convenciones para Ejecución Paralela de Agentes (2026-04-07) |
| FASE 14: Correcciones al flujo — post-mortem FASE 13 (2026-04-07) |
| FASE 15: Unificación de Registry (2026-04-07) |
| FASE 16: Separación semántica del Registry + Documentación pública (2026-04-07) |
| FASE 17: Análisis de referencia — mise (jdx/mise) (2026-04-07) |
| FASE 18: Human Gates — autorización explícita por fase (2026-04-07) |
| FASE 19: Async Gates — gates para agentes en background (2026-04-08) |
| FASE 20: Context Hygiene — sincronización de archivos de estado (2026-04-08) ✓ |
| FASE 21: Skill Architecture Review — decisión arquitectónica pm-thyrox (2026-04-08) |
| FASE 22: Framework Evolution — Integración documentación oficial + TDs prioritarios (2026-04-08) ✓ |
| FASE 23: workflow-restructure — Migración workflow-* a subdirectorios + reducción SKILL.md (2026-04-09) |
| FASE 24: skill-references-restructure — Redistribución arquitectónica de references y scripts (2026-04-09) |

Ver ROADMAP.md para detalle de cada FASE.

---

## Componentes del framework

### Skills activos (`.claude/skills/`)
- `pm-thyrox/` — Framework principal 7 fases (motor del proyecto)
- Tech skills: backend-nodejs, db-mysql, db-postgresql, frontend-react, frontend-webpack, python-mcp, sphinx

### MCP servers
- `thyrox-memory` — Memoria semántica FAISS (store/retrieve)
- `thyrox-executor` — Ejecución subprocess con blocklist

### Scripts de gestión (`.claude/skills/pm-thyrox/scripts/`)
- `update-state.sh` — Regenera este archivo desde el repo real
- `validate-session-close.sh` — Valida cierre de sesión
- `validate-phase-readiness.sh` — Valida readiness por fase
- `session-start.sh` — Hook SessionStart (inyecta contexto)
- `lint-agents.py` — Valida formato de agentes nativos

---

## Deuda técnica registrada

Ver `.claude/context/technical-debt.md` para TD-001 a TD-007.

---

## Próximos pasos

Ver ROADMAP.md sección "sin completar" y `context/focus.md` para WP activo.
