```yml
type: Dashboard de Proyecto
category: Estado Actual
version: 1.1.1
purpose: Dashboard del proyecto THYROX — estado actual y navegación
goal: Punto de entrada para entender estado actual y próximos pasos
updated_at: 2026-04-07 05:56:49
```

# Project State — THYROX

## Status General

**Versión:** 1.1.1
**Estado:** Activo — framework estable con convenciones de ejecución paralela
**Última actualización:** 2026-04-07
**Branch activo:** `claude/check-merge-status-Dcyvj`

---

## Fases completadas

| FASE | Descripción | Versión | Fecha |
|------|------------|---------|-------|
| 1-4 | Framework base, consolidación, docs, spec-kit | 0.1.0–0.4.0 | 2026-03-25/28 |
| 5 | Compatibilidad multi-modelo, activación automática SKILL | 0.5.0 | 2026-04-01 |
| 6 | Template phase integration, patrón {nombre-wp}-{tipo}.md | 0.6.0 | 2026-04-01/02 |
| 7 | Meta-framework generativo — registry + tech skills | 0.7.0 | 2026-04-03/04 |
| 8 | Resolución de deuda técnica | 0.8.0 | 2026-04-04 |
| 9 | Boundary SKILL vs ADR, correcciones proceso Phase 3 | 0.8.5 | 2026-04-04 |
| 10 | Separación .claude/ vs docs/, adr_path configurable | 0.9.0 | 2026-04-04 |
| 11 | MCP servers (FAISS memory + executor) + Native agents | 0.9.5 | 2026-04-05/06 |
| 12 | Metadata keys → English snake_case, ISO 8601 timestamps | 1.0.0 | 2026-04-07 |
| 13 | Parallel agent conventions + agent format spec | 1.1.0 | 2026-04-07 |
| 14 | Flow corrections post-mortem (8 gaps) | 1.1.1 | 2026-04-07 |

---

## Componentes del framework

### Skills activos (`.claude/skills/`)
- `pm-thyrox/` — Framework principal 7 fases (Level 1)
- `sphinx/` — Tech skill stub
- `backend-nodejs/`, `frontend-react/`, `db-postgresql/`, `python-mcp/` — Tech skills

### Agentes nativos (`.claude/agents/`) — 6 agentes, 0 errores en linter
- `task-planner.md` — Descompone trabajo en tareas atómicas
- `task-executor.md` — Ejecuta tareas con claim protocol
- `tech-detector.md` — Detecta stack tecnológico
- `skill-generator.md` — Genera SKILLs y agentes desde registry
- `nodejs-expert.md` — Experto Node.js/Express
- `react-expert.md` — Experto React/frontend

### MCP servers
- `thyrox-memory` — Memoria semántica FAISS (store/retrieve)
- `thyrox-executor` — Ejecución subprocess con blocklist

### Referencias clave
- `references/conventions.md` — Convenciones incluyendo ejecución paralela
- `references/agent-spec.md` — Spec formal de agentes nativos
- `references/skill-vs-agent.md` — Distinción SKILL vs Agente
- `scripts/lint-agents.py` — Linter de agentes nativos

---

## Lecciones aprendidas

**Total:** L-001..L-052 (52 lecciones)
**Ubicación:** `context/work/*/lessons-learned.md`

---

## Próximos pasos sugeridos

- [ ] Aplicar convenciones de paralelo en próximo WP real
- [ ] Probar `lint-agents.py` en CI/CD pipeline
- [ ] Evaluar si `now-{agent-id}.md` necesita template formal
