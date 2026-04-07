```yml
created_at: 2026-04-05-01-09-22
wp: thyrox-capabilities-integration
phase: 3 - PLAN
status: Aprobado — 2026-04-05
```

# Plan — THYROX: Integración de Capacidades via MCP + Native Agents

## Scope Statement

**Problema:** THYROX carece de tres capacidades que EvoAgentX provee: ejecución de
shell/Python, memoria semántica persistente y agentes especializados por tecnología.
Sin estas, el framework depende exclusivamente del contexto de conversación de Claude,
que se pierde entre sesiones y no puede ejecutar comandos ni recuperar conocimiento acumulado.

**Usuarios:** Desarrolladores que usan THYROX como framework de gestión. Se benefician
desde la primera sesión después del bootstrap: los agentes detectan el stack, generan
skills específicos, ejecutan tests, y recuperan contexto de WPs anteriores.

**Criterios de éxito:**
- `mcp__thyrox_memory__store` y `retrieve` funcionan — datos persisten entre sesiones en `.claude/memory/`
- `mcp__thyrox_executor__exec_cmd("yarn test")` retorna stdout/stderr desde Claude Code
- `python bootstrap.py --stack "react,nodejs" --model claude` genera todos los agentes y settings.json en <5 min
- tech-detector identifica el stack correctamente usando Glob/Read nativos (sin MCP)
- task-planner descompone cualquier solicitud en T-NNN antes de ejecutar (gate obligatorio)
- Zero dependencias externas en runtime: sin API keys, sin servidores, sin puertos

---

## In-Scope

### MCP Infrastructure (BRECHA-1 + BRECHA-2)

- `registry/mcp/thyrox_core.py` — implementación propia: FAISS + subprocess + sentence-transformers
- `registry/mcp/memory_server.py` — MCP server con 2 tools: `store`, `retrieve`
- `registry/mcp/executor_server.py` — MCP server con 2 tools: `exec_cmd`, `exec_python`
- `settings.json` — sección `mcpServers` con thyrox-memory y thyrox-executor
- `requirements.txt` — deps mínimas: `mcp`, `faiss-cpu`, `sentence-transformers`, `pydantic`

### Native Agents — Core (BRECHA-3)

- `.claude/agents/task-planner.md` — gate de atomicidad: descompone goals en T-NNN con deps
- `.claude/agents/task-executor.md` — ejecuta un único T-NNN; usa Read/Write/Edit/Glob/Grep + exec_cmd
- `.claude/agents/tech-detector.md` — detecta stack via Glob/Read nativos (pure-native, sin MCP)
- `.claude/agents/skill-generator.md` — genera SKILL.md y agente tech-expert desde registry YAML

### Registry — Fuente de verdad model-agnostic

- `registry/agents/task-planner.yml` — definición YAML del agente task-planner
- `registry/agents/task-executor.yml`
- `registry/agents/tech-detector.yml`
- `registry/agents/skill-generator.yml`
- `registry/agents/react-expert.yml` — tech-expert template para React
- `registry/agents/nodejs-expert.yml`
- `registry/agents/postgresql-expert.yml`
- `registry/frontend/react.skill.template.md` — SKILL.md template para React
- `registry/backend/nodejs.skill.template.md`
- `registry/database/postgresql.skill.template.md`

### Bootstrap

- `registry/bootstrap.py` — `--stack`, `--model`, `--force`; genera agents + settings + requirements
- Idempotente: no sobreescribe agentes existentes sin `--force`

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| WorkFlowGraph / DAG engine Python | D-10: paralelo real imposible en Claude Code; T-NNN + deps es suficiente. Diferido a v4. |
| thyrox-agents MCP server | mcp-agents-architecture-analysis: agentes como native Claude Code agents, no MCP server |
| GPT-4 / OpenAI rendering en bootstrap.py | D-7: YAML es model-agnostic; el renderer para OpenAI es v4. v3 solo renderiza para Claude. |
| torch / GPU dependencies | D-4: faiss-cpu (no GPU). sentence-transformers sin torch chain completo |
| Librería `evoagentx` como dependencia | Código propio inspirado en sus patrones — sin dependencia externa |
| EvoAgentX app/ (CLI, GUI, REST) | Restricción del proyecto: sin CLI, sin GUI, sin REST API |
| Producción / Docker / CI pipeline | Fuera del scope del meta-framework en esta fase |
| N tech-experts adicionales (vue, django, etc.) | React, Node.js, PostgreSQL cubren el stack actual. Otros se agregan con el mismo patrón. |
| UI de monitoreo de memoria | Sin GUI — el contenido del índice FAISS se inspecciona via `retrieve` directamente |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|-----------|-----------------|
| `_evoagentx_adapter.py` (interfaces: store, retrieve, exec_cmd, exec_python) | 4 |
| `memory_server.py` (MCP server, 2 tools, FAISS init, persistencia) | 4 |
| `executor_server.py` (MCP server, 2 tools, subprocess, Python interpreter) | 3 |
| `settings.json` — mcpServers + requirements.txt | 2 |
| `task-planner.md` (gate atomicidad: 5 criterios + formato T-NNN) | 3 |
| `task-executor.md` (ejecuta T-NNN; usa nativas + exec_cmd) | 3 |
| `tech-detector.md` (Glob/Read; detecta package.json, requirements, docker-compose) | 2 |
| `skill-generator.md` (lee YAML registry; escribe SKILL.md + agent .md) | 2 |
| Registry YAML — 7 agents (4 core + 3 tech-experts) | 4 |
| Registry templates — 3 tech stacks (react, nodejs, postgresql) | 3 |
| `bootstrap.py` (render YAML → .md, settings.json, requirements.txt) | 4 |
| Validación end-to-end (bootstrap → detect → plan → execute → store) | 3 |
| **Total** | **37 tareas** |

Clasificación: **grande**
Fases activas: 1 (ANALYZE ✓), 2 (SOLUTION_STRATEGY ✓), 3 (PLAN — este doc), 4 (STRUCTURE), 5 (DECOMPOSE), 6 (EXECUTE), 7 (TRACK)

---

## Trazabilidad RC → Componente

| Componente | Resuelve |
|-----------|---------|
| `_evoagentx_adapter.py` + `memory_server.py` | BRECHA-2: Memoria semántica persistente |
| `_evoagentx_adapter.py` + `executor_server.py` | BRECHA-1: Ejecución de shell/Python |
| 4 agentes core (task-planner, task-executor, tech-detector, skill-generator) | BRECHA-3: Agentes especializados |
| Registry YAML + bootstrap.py | D-7 (model-agnostic), D-8 (bootstrap one-shot), D-9 (scope correcto executor) |
| task-planner gate | D-6 (atomicidad obligatoria), D-10 (DAG implícito via T-NNN + deps) |

---

## Orden de implementación (sugerido para Phase 4: STRUCTURE)

```
Bloque A — MCP Infrastructure (base, lo demás depende)
  1. _evoagentx_adapter.py
  2. memory_server.py
  3. executor_server.py
  4. settings.json + requirements.txt

Bloque B — Registry YAML + Templates (independiente de A)
  5. registry/agents/*.yml (7 agentes)
  6. registry/{frontend,backend,database}/*.skill.template.md

Bloque C — Native Agents (depende de B para YAML fuente)
  7. task-planner.md
  8. task-executor.md
  9. tech-detector.md
  10. skill-generator.md

Bloque D — Bootstrap (depende de B y C)
  11. bootstrap.py

Bloque E — Validación (depende de A+C+D)
  12. Test end-to-end: bootstrap → detect → plan → execute → store/retrieve
```

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 11](../../../../../ROADMAP.md#fase-11-thyrox-capabilities-integration)

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-05
