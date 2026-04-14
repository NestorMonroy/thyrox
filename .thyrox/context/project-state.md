```yml
type: Dashboard de Proyecto
category: Estado Actual
version: 2.6.0
purpose: Dashboard del proyecto THYROX — estado actual y navegación
goal: Punto de entrada para entender estado actual y próximos pasos
updated_at: 2026-04-13 19:58:23
```

# Project State — THYROX

## Status General

**Versión:** 2.6.0
**Estado:** Activo — framework thyrox con 7 FASEs completadas
**Última actualización:** 2026-04-13 19:58:23
**Branch activo:** `claude/check-merge-status-Dcyvj`

---

## Agentes nativos (`11` agentes en `.claude/agents/`)

- `deep-review` — Analiza cobertura entre artefactos de fases consecutivas del WP, o profundidad d
- `diagrama-ishikawa` — Especialista en análisis de causa raíz con diagramas de Ishikawa (espina de pe
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

## FASEs completadas (7 total)

| FASE 27: agentic-loop — Mecanismo de ejecución continua con /loop (2026-04-09) |
| FASE 28: auto-operations — Sincronización determinista de now.md via hooks reactivos (2026-04-09) |
| FASE 29: technical-debt-resolution — Resolución de Deuda Técnica del Framework (2026-04-09) |
| FASE 30: uv-adoption — Adopción de uv como gestor de entorno Python (2026-04-10) |
| FASE 31: thyrox-commands-namespace — Namespace /thyrox:* mediante Plugin Claude Code (2026-04-11) |
| FASE 33: skill-authoring-modernization — Actualización skill-authoring.md + benchmark TD-010/TD-025 (2026-04-12) |
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

Ver `.claude/context/technical-debt.md` para TD-001 a TD-007.

---

## Próximos pasos

Ver ROADMAP.md sección "sin completar" y `context/focus.md` para WP activo.
