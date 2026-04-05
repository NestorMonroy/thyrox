```yml
Fecha estrategia: 2026-04-05-01-09-22
Proyecto: THYROX — Integración de capacidades con EvoAgentX
Versión arquitectura: 1.0
Fase: Phase 2 — SOLUTION_STRATEGY
Estado: Propuesta
Fuentes: thyrox-capabilities-integration-analysis.md (BRECHA-1, BRECHA-2, BRECHA-3)
Restricciones: Sin CLI, Sin GUI, Sin REST API
```

# Solution Strategy: THYROX + EvoAgentX via MCP

## Propósito

Transformar los 3 hallazgos de brechas de Phase 1 en decisiones arquitectónicas implementables.
El eje central de esta estrategia es un único concepto: **MCP como puente de integración nativa**.

---

## Key Ideas

### Idea 1: MCP — El puente que resuelve la restricción de "sin CLI/GUI/API"

**Qué es MCP:**

MCP (Model Context Protocol) es el protocolo abierto de Anthropic para exponer
capacidades externas a Claude como **herramientas nativas**. Es el mismo mecanismo
por el que funcionan `mcp__github__list_issues()` o `mcp__filesystem__read_file()`:
un servidor local o remoto registrado en `settings.json`, cuyas herramientas
Claude llama igual que cualquier built-in tool.

```
SIN MCP (excluido):
  Claude → subprocess("python executor.py 'yarn test'") ← CLI — excluido
  Claude → POST http://localhost:8000/execute            ← REST API — excluido

CON MCP (solución):
  Claude → mcp__thyrox_executor__exec_cmd("yarn test")  ← tool nativa — ✓
  Claude → mcp__thyrox_memory__retrieve("PostgreSQL")   ← tool nativa — ✓
  Claude → mcp__thyrox_agents__detect_tech("./")        ← tool nativa — ✓
```

**Cómo funciona técnicamente:**

```
settings.json
└── mcpServers:
    ├── thyrox-memory:   { command: python, args: [registry/mcp/memory_server.py] }
    ├── thyrox-executor: { command: python, args: [registry/mcp/executor_server.py] }
    └── thyrox-agents:   { command: python, args: [registry/mcp/agents_server.py] }

Cuando Claude Code inicia:
  → Lanza los 3 procesos Python (stdio transport)
  → Descubre sus tool schemas (OpenAI-compatible)
  → Las herramientas están disponibles como: mcp__thyrox_memory__*, etc.

El MCP server corre en el mismo host, sin puertos externos, sin GUI.
Transport: stdio (pipe directo entre Claude y el proceso Python).
```

**Relación con EvoAgentX:**
Los MCP servers son wrappers Python que usan EvoAgentX como **librería interna**.
EvoAgentX no se expone — es un detalle de implementación de cada server.

```
Claude Code
    ↓ tool call
MCP Server (Python process)
    ↓ import
EvoAgentX (librería: agents, memory, tools)
    ↓ filesystem/subprocess
Repositorio del proyecto
```

**Impacto en la arquitectura:**
- Elimina la necesidad de CLI, GUI o REST API para integrar EvoAgentX
- Claude llama las capacidades Python de forma nativa, con tipado y schemas
- Cada MCP server puede activarse/desactivarse independientemente en settings.json

---

### Idea 2: Tres servidores MCP especializados — uno por brecha

Cada brecha de Phase 1 mapea a un servidor MCP distinto con responsabilidad única:

```
BRECHA-1: Ejecución de código   → thyrox-executor  (CMDToolkit + PythonInterpreterToolkit)
BRECHA-2: Memoria semántica     → thyrox-memory    (LongTermMemory + FAISS)
BRECHA-3: Agentes especializados → thyrox-agents   (CustomizeAgent + AgentManager)
```

**Por qué tres servidores y no uno:**

| Criterio | Un servidor monolítico | Tres servidores especializados |
|----------|----------------------|-------------------------------|
| Activación | Todo o nada | Activar solo lo que se necesita |
| Fallo | Un error bloquea todo | Fallo aislado por dominio |
| Dependencias | Carga todas las deps (incluyendo torch) | Cada server carga solo sus deps |
| Evolución | Cambio en memoria afecta ejecución | Servers evolucionan independientemente |
| Testing | Difícil aislar | Testeable por separado |

---

### Idea 3: Adapter Layer — aislamiento de EvoAgentX 0.1.0

EvoAgentX está en v0.1.0. Su API puede cambiar en 0.2.x. La solución es una
**capa adapter** que encapsula toda interacción con EvoAgentX:

```
registry/
└── mcp/
    ├── _evoagentx_adapter.py   ← ÚNICO punto de contacto con EvoAgentX
    │   # Expone interfaces estables:
    │   # - create_agent(name, description, tools) → AbstractAgent
    │   # - store_memory(content, metadata) → None
    │   # - retrieve_memory(query, top_k) → List[MemoryResult]
    │   # - exec_cmd(command, cwd) → ExecResult
    │   # - exec_python(code) → ExecResult
    ├── memory_server.py        ← usa _evoagentx_adapter, no EvoAgentX directamente
    ├── executor_server.py      ← idem
    └── agents_server.py        ← idem
```

Si EvoAgentX cambia su API, solo se modifica `_evoagentx_adapter.py`.
Los tres MCP servers no saben nada de EvoAgentX internamente.

---

### Idea 4: Registry como fuente de verdad unificada

El directorio `registry/` ya existe (H-015 voltfactory) como fuente de templates.
Con esta estrategia, el registry se expande: no solo contiene templates de skills,
sino también las configuraciones de los agentes MCP generados:

```
registry/
├── frontend/
│   ├── react.skill.template.md        ← SKILL.md generado para react-frontend
│   ├── react.instructions.template.md ← .instructions.md generado
│   └── react.agent.template.py        ← agente MCP generado (usa executor server)
├── backend/
│   ├── nodejs.skill.template.md
│   └── nodejs.agent.template.py
├── database/
│   ├── postgresql.skill.template.md
│   └── postgresql.agent.template.py
└── mcp/
    ├── _evoagentx_adapter.py           ← adapter (compartido)
    ├── memory_server.py                ← MCP server de memoria
    ├── executor_server.py              ← MCP server de ejecución
    └── agents_server.py                ← MCP server de agentes
```

**Flujo completo con el registry:**

```
/workflow_init
  ↓
thyrox-agents: detect_tech("./")
  → detecta: React, Node.js, PostgreSQL
  ↓
thyrox-agents: generate_skill("react", registry/frontend/react.skill.template.md)
  → escribe: .claude/skills/react-frontend/SKILL.md
  → escribe: .claude/guidelines/react.instructions.md
  ↓
git commit "feat(skills): bootstrap React + Node + Postgres skills"
  ↓
SESIONES SIGUIENTES: skills ya están, zero re-detección
```

---

## Research — Decisiones investigadas

### R-1: ¿Cómo integrar EvoAgentX con Claude Code?

**Unknown:** Sin CLI/GUI/REST, ¿cómo llama Claude a código Python?

| Alternativa | Pros | Cons |
|-------------|------|------|
| **A: Subprocess/bash** | Simple, sin dependencias | Hacky, no nativo, inyección de comandos, sin tipado |
| **B: REST API (FastAPI)** | Estándar, versátil | Explícitamente excluido — requiere levantar servidor |
| **C: Solo Markdown** | Cero complejidad | No cierra ninguna de las 3 brechas |
| **D: MCP servers (stdio)** | Nativo en Claude Code, tipado, local, sin servidor externo | Requiere implementar los servers |

**Decisión:** D — MCP servers.
**Justificación:** Es el único mecanismo que integra código Python de forma nativa
en Claude Code sin requerir CLI, GUI o REST API. Transporte stdio = proceso local,
sin puertos, sin infraestructura externa.

---

### R-2: ¿Qué vector store para LongTermMemory?

**Unknown:** ¿FAISS local o vector DB externo (Qdrant, Chroma, Pinecone)?

| Alternativa | Setup | Persistencia | Búsqueda | Costo |
|-------------|-------|-------------|---------|-------|
| **FAISS-cpu** | `pip install faiss-cpu` | Archivo local `.faiss` | Vectorial + BM25 | Gratis, local |
| **Chroma** | Requiere servidor (puerto 8000) o embedded | SQLite local | Vectorial | Gratis, embedded |
| **Qdrant** | Docker o cloud | Cloud o volumen | Vectorial + filtros | Cloud = $$ |
| **Pinecone** | API key, cloud only | Cloud | Vectorial | $$ |

**Decisión:** FAISS-cpu en modo embedded.
**Justificación:**
- Zero servidores externos — el índice es un archivo `.faiss` en disco
- EvoAgentX ya tiene `FaissToolkit` y `LongTermMemory` con backend FAISS
- `faiss-cpu` no requiere torch (a diferencia de `faiss-gpu`)
- Alineado con ADR-008 (Git as persistence): el índice puede vivir en `.claude/memory/`

---

### R-3: ¿Embeddings locales o API?

**Unknown:** sentence-transformers local vs OpenAI embeddings vs VoyageAI

| Alternativa | Setup | Costo | Privacidad | Velocidad |
|-------------|-------|-------|-----------|---------|
| **sentence-transformers local** | `pip install sentence-transformers` | Gratis | 100% local | ~50ms/chunk |
| **OpenAI text-embedding-3-small** | API key requerida | $0.02/1M tokens | Cloud | ~200ms/req |
| **VoyageAI** | API key requerida | $$ | Cloud | ~200ms/req |

**Decisión:** sentence-transformers local (`all-MiniLM-L6-v2`, 80MB).
**Justificación:**
- Zero API keys — el meta-framework funciona offline
- EvoAgentX ya soporta sentence-transformers en su RAG pipeline
- `all-MiniLM-L6-v2`: modelo ligero, buena calidad para documentos técnicos cortos

---

### R-4: ¿Un MCP server o tres?

Cubierto en Key Idea 2. **Decisión:** Tres servidores especializados.

---

## Pre-design Check

Verificación contra ADRs y restricciones del proyecto antes de decidir:

| Principio | Check |
|-----------|-------|
| ADR-008: Git as persistence | ✅ El índice FAISS vive en `.claude/memory/` (commiteado). No hay base de datos externa. |
| ADR-012: Un management skill + N tech skills | ✅ La arquitectura MCP no modifica pm-thyrox. Los MCP servers son infraestructura de soporte. |
| Restricción: Sin CLI | ✅ MCP stdio no es CLI — Claude llama herramientas nativas, no ejecuta comandos shell. |
| Restricción: Sin GUI | ✅ Los MCP servers son procesos headless. Sin hitl_gui.py ni workflow_editor.py. |
| Restricción: Sin REST API | ✅ Transport stdio (pipe local). Sin FastAPI, sin Celery, sin Redis, sin JWT. |
| H-020: Bootstrap once | ✅ Los skills generados por `thyrox-agents` se commitean en git. Zero re-generación en sesiones posteriores. |
| CLAUDE.md Locked Decision #3: Markdown only | ✅ Los artefactos THYROX siguen siendo Markdown. MCP servers son Python de soporte, no artefactos del framework. |

---

## Fundamental Decisions

### D-1: MCP como capa de integración (no subprocess, no REST)

**Alternativas:** subprocess, REST API, solo Markdown
**Decisión:** MCP servers stdio
**Justificación:** Única opción que satisface la restricción "sin CLI/GUI/REST" mientras
cierra las 3 brechas con integración nativa en Claude Code.
**Implicaciones:**
- Requiere `pip install mcp` (SDK oficial Anthropic para MCP servers en Python)
- Los servers se declaran en `settings.json` → arrancan automáticamente con Claude Code
- Claude llama las herramientas con el prefijo `mcp__thyrox_[server]__[tool]`

---

### D-2: Tres MCP servers independientes (memory / executor / agents)

**Alternativas:** Un server monolítico, dos servers
**Decisión:** Tres servers con responsabilidad única
**Justificación:** Isolación de fallos, dependencias independientes, activación selectiva.
**Implicaciones:**
- Tres entradas en `settings.json` mcpServers
- Tres archivos Python en `registry/mcp/`
- Todos comparten `_evoagentx_adapter.py`

---

### D-3: Adapter pattern para EvoAgentX (aislar v0.1.0)

**Alternativas:** Llamar EvoAgentX directamente desde los servers
**Decisión:** Adapter layer en `registry/mcp/_evoagentx_adapter.py`
**Justificación:** EvoAgentX v0.1.0 es inestable. El adapter es el único punto de cambio
si la API cambia en v0.2.x. Los tres MCP servers dependen del adapter, no de EvoAgentX.
**Implicaciones:**
- Interfaces estables del adapter: `create_agent()`, `exec_cmd()`, `store_memory()`, `retrieve_memory()`
- EvoAgentX pinned: `evoagentx==0.1.0` en requirements

---

### D-4: FAISS-cpu + sentence-transformers para memoria (sin API keys, sin servidor)

**Alternativas:** Chroma embedded, Qdrant cloud, OpenAI embeddings
**Decisión:** FAISS-cpu local + `all-MiniLM-L6-v2`
**Justificación:** Zero dependencias externas, zero API keys, alineado con Git-as-persistence.
El índice `.faiss` vive en `.claude/memory/` y se commitea.
**Implicaciones:**
- Primer uso: descarga del modelo (~80MB, una sola vez)
- Sin búsqueda en tiempo real durante edición — solo consultas explícitas vía MCP tool

---

### D-5: Registry unificado (skills + agent configs + MCP servers)

**Alternativas:** Registry solo para skill templates, MCP servers fuera del registry
**Decisión:** `registry/mcp/` como parte del registry unificado
**Justificación:** El registry es la fuente de verdad de TODO lo que el meta-framework
genera. Tener los MCP servers ahí los hace versionables, distribuibles y parte del bootstrap.
**Implicaciones:**
- `registry/` ahora tiene subdirectorios: frontend/, backend/, database/, mcp/
- Los MCP servers son parte del "paquete THYROX" que se instala en un proyecto nuevo

---

## Technology Stack

```
Protocolo de integración:   MCP (Model Context Protocol) — mcp Python SDK
Runtime servers:            Python 3.11+
Agent framework:            evoagentx==0.1.0  (pinned, via _evoagentx_adapter.py)
Vector store:               faiss-cpu (embedded, sin servidor)
Embeddings:                 sentence-transformers all-MiniLM-L6-v2 (local, ~80MB)
MCP transport:              stdio (proceso local, sin puertos)
Shell toolkit:              EvoAgentX CMDToolkit (git, npm, yarn, pytest, docker)
Python toolkit:             EvoAgentX PythonInterpreterToolkit
Config integración:         settings.json → mcpServers section
Persistencia memoria:       .claude/memory/*.faiss (commiteado en git)
Persistencia skills:        .claude/skills/*/SKILL.md (commiteado en git)
```

**Dependencias mínimas** (sin torch, sin ColPali, sin app/):
```
mcp>=0.9.0
evoagentx==0.1.0
faiss-cpu>=1.7.4
sentence-transformers>=2.2.0
pydantic>=2.0
```

---

## Architecture Patterns

### Structural Patterns

- **Adapter Pattern** — `_evoagentx_adapter.py` aísla EvoAgentX del resto
- **Single Responsibility** — cada MCP server tiene una sola responsabilidad
- **Registry Pattern** — `registry/` como fuente de verdad para templates y configuraciones
- **Facade Pattern** — cada MCP server expone una interfaz simplificada sobre EvoAgentX

### Behavioral Patterns

- **Tool Protocol** — MCP define los schemas de tools; Claude los llama polimórficamente
- **Bootstrap Pattern** — skill generation ocurre una sola vez (H-020), resultado persiste en git

### Architectural Styles

- **Local-first** — FAISS, sentence-transformers, MCP stdio — todo en el mismo host
- **Event-like** — Phase 7 TRACK dispara indexación de memoria; Phase 1 recupera contexto
- **Composition over inheritance** — pm-thyrox + tech skills + MCP servers son ortogonales

---

## Cómo resolvemos cada Quality Goal

### QG-1: Integración sin CLI/GUI/REST

**Approach:** MCP stdio transport — proceso local sin puertos ni interfaces externas
**Mechanisms:** `settings.json` mcpServers → procesos Python arrancados por Claude Code
**Technologies:** `mcp` Python SDK (stdio), sin FastAPI, sin Redis, sin JWT

---

### QG-2: Estabilidad frente a cambios de EvoAgentX

**Approach:** Adapter layer + versión pinned
**Mechanisms:** `_evoagentx_adapter.py` como único punto de cambio; `evoagentx==0.1.0` en requirements
**Technologies:** pip freeze, adapter interfaces estables

---

### QG-3: Local-first (sin API keys, sin internet obligatorio)

**Approach:** FAISS-cpu + sentence-transformers all-MiniLM-L6-v2 locales
**Mechanisms:** El modelo se descarga una sola vez; el índice vive en `.claude/memory/`
**Technologies:** faiss-cpu, sentence-transformers (HuggingFace local cache)

---

### QG-4: Bootstrap once — zero re-detección

**Approach:** Tech skills generados se commitean inmediatamente en git
**Mechanisms:** `session-start.sh` detecta `.claude/skills/` existentes → skip bootstrap
**Technologies:** git, `now.md` con campo `tech_skills_bootstrapped: true`

---

## Adherencia a Restricciones

| Restricción | Cómo se cumple |
|------------|---------------|
| Sin CLI | MCP stdio: Claude llama tools nativas, no ejecuta comandos shell manualmente |
| Sin GUI | Todos los servers son headless. `hitl_gui.py` excluido completamente |
| Sin REST API | Transport stdio (pipe local). Sin FastAPI, sin Celery, sin Redis |
| Sin app/ de EvoAgentX | Los MCP servers importan solo `evoagentx.agents`, `.memory`, `.tools` |
| Sin torch/transformers | `faiss-cpu` (no GPU). `sentence-transformers` sin torch dependency chain completa |

---

## Diagrama de arquitectura final

```
PROYECTO USUARIO
└── .claude/
    ├── settings.json
    │   └── mcpServers:
    │       ├── thyrox-memory:   python registry/mcp/memory_server.py
    │       ├── thyrox-executor: python registry/mcp/executor_server.py
    │       └── thyrox-agents:   python registry/mcp/agents_server.py
    │
    ├── skills/
    │   ├── pm-thyrox/          ← orquestador, sin cambios
    │   ├── react-frontend/     ← generado por thyrox-agents en bootstrap
    │   └── nodejs-backend/     ← generado por thyrox-agents en bootstrap
    │
    ├── guidelines/
    │   └── react.instructions.md ← generado en bootstrap, always-on
    │
    └── memory/
        └── thyrox.faiss        ← índice semántico de WPs/ADRs/lecciones

registry/
├── mcp/
│   ├── _evoagentx_adapter.py   ← único punto de contacto con EvoAgentX
│   ├── memory_server.py        ← tools: store, retrieve
│   ├── executor_server.py      ← tools: exec_cmd, exec_python, read_file, write_file
│   └── agents_server.py        ← tools: detect_tech, generate_skill, list_skills
├── frontend/
│   ├── react.skill.template.md
│   └── react.agent.template.py
└── backend/
    └── nodejs.skill.template.md

FLUJO POR FASE:

Phase 1: ANALYZE (nueva sesión)
  Claude → mcp__thyrox_memory__retrieve("contexto proyectos anteriores similares")
  Claude → mcp__thyrox_agents__detect_tech("./") [solo si no hay skills]

Phase 1: BOOTSTRAP (solo primera vez)
  Claude → mcp__thyrox_agents__generate_skill("react", registry/frontend/react.skill.template.md)
  Claude → git commit "feat(skills): bootstrap React skills"

Phase 6: EXECUTE
  Claude → mcp__thyrox_executor__exec_cmd("yarn test --coverage")
  Claude → mcp__thyrox_executor__exec_cmd("git commit -m 'feat(auth): ...'")

Phase 7: TRACK
  Claude → mcp__thyrox_memory__store(lessons_learned_content, {wp: "...", date: "..."})
```

---

## Post-design Re-check

| Check | Estado |
|-------|--------|
| ¿Viola algún ADR? | No. ADR-008, ADR-012 respetados |
| ¿Requiere CLI/GUI/REST? | No. stdio transport, proceso local |
| ¿Bootstrap once preservado? | Sí. `thyrox-agents` commitea inmediatamente |
| ¿Las 3 brechas están cerradas? | Sí. BRECHA-1 → executor, BRECHA-2 → memory, BRECHA-3 → agents |
| ¿EvoAgentX aislado? | Sí. Adapter layer + versión pinned |
| ¿Local-first? | Sí. FAISS-cpu + sentence-transformers, zero API keys |
| ¿Complejidad justificada? | Sí. 3 archivos Python + 1 adapter = la implementación mínima para cerrar las 3 brechas |

---

## Validation Checklist

- [x] Key ideas claramente articuladas (MCP bridge, 3 servers, adapter, registry)
- [x] Decisiones fundamentales documentadas (D-1..D-5)
- [x] Alternativas consideradas para cada decisión
- [x] Justificaciones claras
- [x] Technology stack completo
- [x] Patrones seleccionados
- [x] Quality goals cubiertos
- [x] Restricciones respetadas (Sin CLI/GUI/REST)
- [x] Trazable a Phase 1 (BRECHA-1, BRECHA-2, BRECHA-3)
- [x] Guía clara para Phase 3: PLAN (qué construir: 3 MCP servers + adapter + registry/mcp/)

---

## Siguiente Paso

Phase 2 completa. Proponer `/workflow_plan` para definir scope y tareas concretas:
- `registry/mcp/_evoagentx_adapter.py`
- `registry/mcp/memory_server.py`
- `registry/mcp/executor_server.py`
- `registry/mcp/agents_server.py`
- Actualización de `settings.json` con `mcpServers`
- Expansión del `registry/` con `{tech}.agent.template.py`
