```yml
created_at: 2026-04-06 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
wp: thyrox-capabilities-integration
breakdown_version: 1.0
total_tasks: 27
critical_dependencies: 5
planned_start: 2026-04-06
implementation_owner: Claude
```

# Task Plan — THYROX Capabilities Integration via MCP + Native Agents

## Propósito

Descomposición en tareas atómicas de los 12 SPECs del WP thyrox-capabilities-integration.
Orden topológico: infraestructura core → MCP servers → configuración → registry YAML →
tech skill templates → native agents → bootstrap → validación E2E → cierre.

Fuente: `thyrox-capabilities-integration-requirements-spec.md` (SPEC-001..SPEC-012)

---

## Resumen

| Fase | Tareas | Estimación | Paralelas |
|------|--------|------------|-----------|
| 0 — Estructura | T-001 | 5 min | — |
| 1 — Core | T-002, T-003 | 45 min | T-003 [P] |
| 2 — MCP Servers | T-004, T-005 | 60 min | T-005 [P] |
| 3 — Configuración | T-006 | 15 min | — |
| 4 — Registry YAML | T-007..T-013 | 45 min | Todas [P] |
| 5 — Skill Templates | T-014..T-016 | 45 min | Todas [P] |
| 6 — Native Agents | T-017..T-020 | 60 min | Todas [P] |
| 7 — Bootstrap | T-021 | 45 min | — |
| 8 — Validación E2E | T-022 | 30 min | — |
| 9 — Commits y cierre | T-023..T-027 | 20 min | — |
| **TOTAL** | **27 tareas** | **~6h** | |

---

## FASE 0 — Estructura de directorios (5 min)

- [x] [T-001] Crear estructura de directorios del registry: `registry/mcp/`, `registry/agents/`, `registry/frontend/`, `registry/backend/`, `registry/database/`, `.claude/memory/` (SPEC-001, SPEC-009, SPEC-010, SPEC-011)

---

## FASE 1 — Core Services Layer (45 min)

- [x] [T-002] Implementar `registry/mcp/thyrox_core.py` — dataclasses `ExecResult` y `MemoryResult`, funciones `init_memory`, `store_memory`, `retrieve_memory` (FAISS + sentence-transformers), `exec_cmd`, `exec_python` (subprocess con blocklist de comandos destructivos) (SPEC-001)
- [x] [T-003] [P] Crear `requirements.txt` con dependencias mínimas: `mcp`, `faiss-cpu`, `sentence-transformers`, `pydantic`, `numpy` (SPEC-004)

> CHECKPOINT-1: `python -c "import registry.mcp.thyrox_core"` sin errores de importación.

---

## FASE 2 — MCP Servers (60 min)

_Requiere T-002 completo._

- [x] [T-004] Implementar `registry/mcp/memory_server.py` — MCP server stdio con tools `store` y `retrieve`; inicializa índice FAISS en `.claude/memory/thyrox.faiss` si no existe; usa `thyrox_core.store_memory` y `retrieve_memory` (SPEC-002)
- [x] [T-005] [P] Implementar `registry/mcp/executor_server.py` — MCP server stdio con tools `exec_cmd` y `exec_python`; delega a `thyrox_core.exec_cmd` y `exec_python`; valida blocklist antes de ejecutar (SPEC-003)

> CHECKPOINT-2: `python registry/mcp/memory_server.py --help` y `python registry/mcp/executor_server.py --help` corren sin errores.

---

## FASE 3 — Configuración MCP (15 min)

_Requiere T-004 y T-005 completos._

- [x] [T-006] Crear `.mcp.json` con `mcpServers` (thyrox-memory + thyrox-executor) — nota: settings.json no acepta mcpServers, usar .mcp.json con `thyrox-memory` (command: python, args: registry/mcp/memory_server.py, env: MEMORY_INDEX_PATH=.claude/memory/thyrox.faiss) y `thyrox-executor` (command: python, args: registry/mcp/executor_server.py) (SPEC-004)

---

## FASE 4 — Registry YAML (45 min, todas paralelas)

_Sin dependencias de FASE 1-3. Pueden ejecutarse en paralelo._

- [x] [T-007] [P] Crear `registry/agents/task-planner.yml` — schema YAML con name, description, model (claude-sonnet-4-6), tools ([Read, Write, Edit, Glob, Grep, Agent, TodoWrite]), system_prompt con los 5 criterios de atomicidad y formato T-NNN (SPEC-009, SPEC-005)
- [x] [T-008] [P] Crear `registry/agents/task-executor.yml` — schema YAML con name, description, model, tools ([Read, Write, Edit, Glob, Grep, Bash, mcp__thyrox_executor__exec_cmd, mcp__thyrox_executor__exec_python, mcp__thyrox_memory__store]), system_prompt con reglas de ejecución T-NNN (SPEC-009, SPEC-006)
- [x] [T-009] [P] Crear `registry/agents/tech-detector.yml`
- [x] [T-010] [P] Crear `registry/agents/skill-generator.yml`
- [x] [T-011] [P] Crear `registry/agents/react-expert.yml`
- [x] [T-012] [P] Crear `registry/agents/nodejs-expert.yml`
- [x] [T-013] [P] Crear `registry/agents/postgresql-expert.yml`

---

## FASE 5 — Tech Skill Templates (45 min, todas paralelas)

_Sin dependencias de FASE 1-4. Pueden ejecutarse en paralelo._

- [x] [T-014] [P] Crear `registry/frontend/react.skill.template.md`
- [x] [T-015] [P] Crear `registry/backend/nodejs.skill.template.md`
- [x] [T-016] [P] Crear `registry/database/postgresql.skill.template.md`

---

## FASE 6 — Native Agents (60 min, todas paralelas)

_Requiere FASE 4 completa (T-007..T-013) para que los YAML sean la fuente de verdad._

- [x] [T-017] [P] Crear `.claude/agents/task-planner.md`
- [x] [T-018] [P] Crear `.claude/agents/task-executor.md`
- [x] [T-019] [P] Crear `.claude/agents/tech-detector.md`
- [x] [T-020] [P] Crear `.claude/agents/skill-generator.md`

> CHECKPOINT-3: `ls .claude/agents/` muestra los 4 agentes. Cada `.md` tiene frontmatter YAML válido (name, description, tools).

---

## FASE 7 — Bootstrap (45 min)

_Requiere T-007..T-016 completos (YAML y templates existentes)._

- [x] [T-021] Implementar `registry/bootstrap.py` — CLI con args `--stack` (CSV), `--model` (default: claude), `--force`; lee YAML de `registry/agents/`, renderiza `.claude/agents/*.md` para cada agente; actualiza `mcpServers` en `.claude/settings.json`; genera `requirements.txt`; idempotente (skip si existe sin --force); reporta "modelo openai no soportado en v3" si --model openai (SPEC-011)

> CHECKPOINT-4: `python registry/bootstrap.py --stack "react,nodejs,postgresql" --model claude` completa sin errores. Genera 7 archivos en `.claude/agents/`.

---

## FASE 8 — Validación E2E (30 min)

_Requiere T-001..T-021 completos._

- [x] [T-022] Validar flujo completo SPEC-012:
  - Step 1: `python registry/bootstrap.py --stack "react,nodejs" --model claude` → 7 agentes en `.claude/agents/`
  - Step 2: Verificar `settings.json` tiene sección `mcpServers` con thyrox-memory y thyrox-executor
  - Step 3: Verificar que `requirements.txt` contiene las 5 deps
  - Step 4: Verificar que los 4 agentes core tienen frontmatter válido
  - Step 5: `python registry/bootstrap.py --stack "react" --model claude` (sin --force) → reporta "ya existe — skip"
  - Step 6: Verificar blocklist en executor_server.py — `rm -rf /` devuelve error bloqueado (SPEC-012)

---

## FASE 9 — Commits y Cierre (20 min)

- [ ] [T-023] Commit infraestructura core: `feat(mcp): add thyrox_core.py with FAISS memory and subprocess execution` — incluir T-001, T-002, T-003, T-004, T-005, T-006
- [ ] [T-024] Commit registry: `feat(registry): add agent YAML definitions and tech skill templates` — incluir T-007..T-016
- [ ] [T-025] Commit native agents: `feat(agents): add task-planner, task-executor, tech-detector, skill-generator` — incluir T-017..T-020
- [ ] [T-026] Commit bootstrap y validación: `feat(bootstrap): add one-shot installer with idempotent setup` — incluir T-021, T-022
- [ ] [T-027] Actualizar `now.md` y `focus.md` → Phase 7: TRACK. Actualizar ROADMAP.md marcando tareas completadas

---

## Orden de Ejecución — DAG

```
T-001 (dirs)
├── T-002 (thyrox_core.py)
│   ├── T-004 (memory_server.py)
│   │   └── T-006 (settings.json) ──────────────────────────┐
│   └── T-005 (executor_server.py) ──────────────────────────┤
└── T-003 [P] (requirements.txt)                             │
                                                             │
T-007..T-013 [P] (registry YAML) ──┐                        │
T-014..T-016 [P] (templates)       ├── T-021 (bootstrap.py) ┤
                                   │                         │
T-007..T-013 ──── T-017..T-020 [P] (agents)                 │
                                                             │
                        T-022 (validación E2E) ◄────────────┘
                              │
                        T-023..T-027 (commits + cierre)
```

**Secuencia lineal recomendada:**
1. T-001 (setup dirs)
2. T-002 + T-003 [P] (core + requirements)
3. T-004 + T-005 [P] (MCP servers)
4. T-006 (settings.json)
5. T-007..T-013 [P] + T-014..T-016 [P] (registry YAML + templates, en paralelo entre sí)
6. T-017..T-020 [P] (native agents, después de YAML)
7. T-021 (bootstrap)
8. T-022 (validación E2E)
9. T-023..T-027 (commits + cierre)

---

## Checkpoints de Validación

| Checkpoint | Después de | Criterio |
|-----------|------------|---------|
| CP-1 | T-002 | `python -c "from registry.mcp import thyrox_core"` sin errores |
| CP-2 | T-004, T-005 | Ambos servers corren sin errores en import |
| CP-3 | T-017..T-020 | `ls .claude/agents/` muestra 4 agentes con frontmatter válido |
| CP-4 | T-021 | bootstrap genera 7 agentes en `.claude/agents/` |
| CP-5 | T-022 | Flujo completo SPEC-012 pasa todos los steps |

---

## Rollback Points

**Si falla T-002 (thyrox_core.py):**
- Verificar que `faiss-cpu` y `sentence-transformers` están instalados: `pip install faiss-cpu sentence-transformers`
- Revisar compatibilidad Python 3.11+
- Los MCP servers (T-004, T-005) no pueden continuar sin este módulo

**Si falla T-004 o T-005 (MCP servers):**
- Verificar que `mcp` package está instalado
- Verificar que thyrox_core importa correctamente
- T-006 (settings.json) puede hacerse manualmente mientras se repara

**Si falla T-021 (bootstrap.py):**
- Los agentes .md pueden crearse manualmente desde los YAML (T-017..T-020 ya están hechos)
- bootstrap.py es conveniente pero no es bloqueante para la funcionalidad core

**Si falla T-022 (validación E2E):**
- Diagnosticar qué step falla y corregir la tarea correspondiente
- Documentar el error en `context/errors/ERR-NNN-descripcion.md`

---

## Notas de Implementación

### Trazabilidad SPEC → Tarea

| SPEC | Tareas |
|------|--------|
| SPEC-001 | T-001, T-002 |
| SPEC-002 | T-004 |
| SPEC-003 | T-005 |
| SPEC-004 | T-003, T-006 |
| SPEC-005 | T-007, T-017 |
| SPEC-006 | T-008, T-018 |
| SPEC-007 | T-009, T-019 |
| SPEC-008 | T-010, T-020 |
| SPEC-009 | T-007..T-013 |
| SPEC-010 | T-014..T-016 |
| SPEC-011 | T-021 |
| SPEC-012 | T-022 |

### Convenciones de commits
- Formato: `type(scope): description` (Conventional Commits)
- Scopes: `mcp`, `registry`, `agents`, `bootstrap`
- Push a branch: `claude/check-merge-status-Dcyvj`

### Archivos a crear (resumen)
```
registry/
├── mcp/
│   ├── thyrox_core.py     (T-002)
│   ├── memory_server.py   (T-004)
│   └── executor_server.py (T-005)
├── agents/
│   ├── task-planner.yml   (T-007)
│   ├── task-executor.yml  (T-008)
│   ├── tech-detector.yml  (T-009)
│   ├── skill-generator.yml(T-010)
│   ├── react-expert.yml   (T-011)
│   ├── nodejs-expert.yml  (T-012)
│   └── postgresql-expert.yml (T-013)
├── frontend/
│   └── react.skill.template.md (T-014)
├── backend/
│   └── nodejs.skill.template.md (T-015)
├── database/
│   └── postgresql.skill.template.md (T-016)
└── bootstrap.py           (T-021)

.claude/
├── agents/
│   ├── task-planner.md    (T-017)
│   ├── task-executor.md   (T-018)
│   ├── tech-detector.md   (T-019)
│   └── skill-generator.md (T-020)
├── memory/                (T-001, directorio)
└── settings.json          (T-006, actualizar)

requirements.txt           (T-003)
```

---

## Aprobación

- [ ] Tasks revisadas
- [ ] Estimaciones validadas
- [ ] Orden de ejecución verificado
- [ ] Aprobado por: usuario
- [ ] Fecha aprobación:

---

**Última actualización:** 2026-04-06
