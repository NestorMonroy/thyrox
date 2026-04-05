```yml
Fecha estrategia: 2026-04-05-01-09-22
Proyecto: THYROX — Integración de capacidades con EvoAgentX
Versión arquitectura: 3.0
Fase: Phase 2 — SOLUTION_STRATEGY
Estado: Aprobada
Fuentes:
  - thyrox-capabilities-integration-analysis.md (BRECHA-1, BRECHA-2, BRECHA-3)
  - analysis/mcp-agents-architecture-analysis.md (MCP + native agents)
  - analysis/meta-framework-template-analysis.md (atomicity + model-agnostic + template)
Restricciones: Sin CLI, Sin GUI, Sin REST API
Cambios v3:
  - D-6: task-planner como gate obligatorio de atomicidad
  - D-7: registry YAML como fuente model-agnostic (Claude + GPT)
  - D-8: bootstrap.py como único entry point de instalación
  - 6 agentes core definidos (task-planner, task-executor, tech-detector, skill-generator + N tech-experts)
  - thyrox-agents MCP server eliminado (reemplazado por native agents)
  - 2 MCP servers definitivos: thyrox-memory + thyrox-executor
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

### Idea 2: Dos servidores MCP especializados + agentes nativos Claude Code

Las brechas de Phase 1 se resuelven con la combinación correcta de mecanismos:

```
BRECHA-1: Ejecución de código    → thyrox-executor  (CMDToolkit + PythonInterpreterToolkit)
BRECHA-2: Memoria semántica      → thyrox-memory    (LongTermMemory + FAISS)
BRECHA-3: Agentes especializados → .claude/agents/*.md  (native Claude Code agents)
```

**Por qué agentes nativos y NO un tercer MCP server para agentes:**

El `mcp-agents-architecture-analysis.md` demostró que `evoagentx.agents` no es
invoable como tool MCP — requiere un agente orquestador que interprete. Los
agentes en `.claude/agents/*.md` son exactly eso: el mecanismo nativo de
Claude Code para subagentes especializados con contexto persistente.

**Por qué dos servers y no uno monolítico:**

| Criterio | Un servidor monolítico | Dos servidores especializados |
|----------|----------------------|-------------------------------|
| Activación | Todo o nada | Activar solo lo que se necesita |
| Fallo | Un error bloquea todo | Fallo aislado por dominio |
| Dependencias | Carga todas las deps (incluyendo torch) | Cada server carga solo sus deps |
| Evolución | Cambio en memoria afecta ejecución | Servers evolucionan independientemente |

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

### Idea 5: task-planner como gate de atomicidad — obligatorio antes de ejecutar

El análisis v3 confirma que los LLMs fallan de forma impredecible con solicitudes
vagas o multi-concern. La solución es un agente dedicado que **siempre corre primero**:

```
SIN task-planner (HOY):
  Usuario: "implementa el módulo de pagos"
       ↓ Claude interpreta todo a la vez
       ↓ hace asunciones sobre Stripe/PayPal, webhooks/polling
       ↓ falla en algún lugar → difícil de debuggear

CON task-planner (v3):
  Usuario: "implementa el módulo de pagos"
       ↓ task-planner descompone (5 criterios de atomicidad)
       ↓ T-001: "Crea endpoint POST /api/webhooks/stripe que valida firma"
       ↓ T-002: "Guarda evento en tabla stripe_events con campos X,Y,Z"
       ↓ task-executor ejecuta cada T-NNN por separado
       ↓ fallo localizado → fácil de corregir
```

**Los 5 criterios de atomicidad** (gate obligatorio — si alguno falla, re-descomponer):
1. Un solo verbo de acción (crea, actualiza, elimina, lee — no "crea y conecta")
2. Un solo artefacto modificado (un archivo, una migración, un endpoint)
3. Output verificable sin interpretación (200 OK, test verde, archivo existe)
4. Sin decisiones implícitas (qué campo guardar, qué librería usar — ya decidido)
5. Dependencias explícitas (si depende de T-001, debe decirlo)

---

### Idea 6: Registry YAML como fuente model-agnostic

El registry define el comportamiento de cada agente en YAML neutral al modelo.
`bootstrap.py` lo renderiza al formato correcto según el flag `--model`:

```
registry/agents/task-planner.yml          ← definición neutral
    name: task-planner
    role: Descompone goals en tareas atómicas
    tools: [thyrox-executor, thyrox-memory]
    behavior: |
      Antes de ejecutar cualquier implementación, descomponer...
         ↓
bootstrap.py --model claude
    → .claude/agents/task-planner.md       ← frontmatter Claude Code nativo
         ↓
bootstrap.py --model openai   (futuro)
    → .openai/assistants/task-planner.json ← Assistants API config
```

**Por qué esto importa:**

La misma metodología THYROX funciona con cualquier LLM. Si el usuario migra
de Claude a GPT-4o, no pierde el framework — cambia el renderer, no el contenido.

---

### Idea 7: bootstrap.py — un comando, sistema completo

```bash
python bootstrap.py --stack "react,nodejs,postgresql" --model claude
```

Genera en menos de 5 minutos:
- 6 agentes core en `.claude/agents/`
- Tech-experts por cada tecnología del stack
- `registry/mcp/` con los dos servers
- `settings.json` con mcpServers configurados
- `requirements.txt` con deps mínimas

**Por qué importa:** Reduce la fricción de adopción a cero. THYROX en un proyecto
nuevo no requiere documentación — un solo comando lo configura todo.

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

### R-4: ¿Un MCP server o dos?

Cubierto en Key Idea 2. **Decisión:** Dos servidores especializados (thyrox-memory + thyrox-executor).
Los agentes especializados van como native Claude Code agents, no como MCP server.

---

### R-5: ¿Dónde implementar la atomicidad — en el SKILL.md o como agente separado?

**Unknown:** ¿La descomposición atómica debe ser una instrucción en pm-thyrox SKILL.md
o un agente independiente (`task-planner.md`)?

| Alternativa | Pros | Cons |
|-------------|------|------|
| **A: Instrucción en SKILL.md** | Simple, sin agente extra | No es ejecutable por separado; Claude puede saltárselo |
| **B: Agente task-planner.md** | Invocable explícitamente; separación de concerns; testeable | Requiere crear y mantener el agente |
| **C: Sin atomicidad explícita** | Zero overhead | Mantiene el problema de LLM con solicitudes vagas |

**Decisión:** B — Agente `task-planner.md` como nativo Claude Code.
**Justificación:** Un agente separado es invocable, testeable, y forzable antes de
cualquier ejecución. La instrucción en SKILL.md es complementaria (dice "usar task-planner"),
pero el mecanismo de enforcement es el agente.

---

### R-6: ¿Registry YAML o directamente archivos .md por modelo?

**Unknown:** ¿Definir agentes directamente en `.claude/agents/*.md` o via YAML neutral?

| Alternativa | Pros | Cons |
|-------------|------|------|
| **A: Solo .md directo** | Simple, cero overhead | Lock-in a Claude; si hay 20 agentes, mantenerlos a mano es costoso |
| **B: YAML → render** | Model-agnostic; single source of truth; bootstrap consistente | Requiere bootstrap.py |
| **C: JSON schema** | Estándar OpenAI | Más complejo, menos legible |

**Decisión:** B — YAML en `registry/agents/*.yml` → `bootstrap.py` renderiza a `.md`.
**Justificación:** Permite model-agnostic y reduce los archivos que hay que mantener
a mano. Los `.md` son artefactos generados — la fuente de verdad es el YAML.

---

### R-7: ¿Cómo implementar bootstrap.py sin violar "sin CLI"?

**Unknown:** `bootstrap.py` se ejecuta con `python bootstrap.py` — ¿es eso "CLI"?

**Clarificación de la restricción "sin CLI":**
La restricción significa que Claude NO llama herramientas Python via subprocess
durante las sesiones de trabajo. `bootstrap.py` es una herramienta de **setup inicial**
que el desarrollador ejecuta una sola vez fuera de Claude — no es integración runtime.

**Análogo a:** `npm install` o `npx create-react-app`. Se corre antes de trabajar,
no durante el trabajo. Sin violación de restricciones.

**Decisión:** `bootstrap.py` es una herramienta de instalación one-shot, fuera del
flujo runtime de Claude. Los artefactos que genera (`.claude/agents/*.md`, `settings.json`)
son los que Claude usa — no el script en sí.

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
- `registry/` ahora tiene subdirectorios: agents/, frontend/, backend/, database/, mcp/
- Los MCP servers + agent YAMLs son parte del "paquete THYROX" que se instala en un proyecto nuevo

---

### D-6: task-planner como agente nativo obligatorio — gate de atomicidad

**Alternativas:** Instrucción en SKILL.md, sin atomicidad explícita
**Decisión:** `.claude/agents/task-planner.md` como agente Claude Code nativo
**Justificación:** La atomicidad no puede ser opcional si queremos resultados predecibles.
Un agente invocable es el único mecanismo que enforcement la descomposición antes de ejecutar.
**Implicaciones:**
- `task-planner.md` define los 5 criterios de atomicidad y el formato T-NNN
- pm-thyrox SKILL.md referencia `task-planner` como primer paso de Phase 6 EXECUTE
- `task-executor.md` es el agente complementario que ejecuta cada T-NNN
- Los 6 agentes core: task-planner, task-executor, tech-detector, skill-generator + N tech-experts

---

### D-7: Registry YAML como fuente model-agnostic — bootstrap.py como renderer

**Alternativas:** Archivos `.md` escritos a mano directamente, JSON schema
**Decisión:** YAML en `registry/agents/*.yml` → `bootstrap.py` renderiza a formato correcto
**Justificación:** Single source of truth model-agnostic. Los `.claude/agents/*.md` son
artefactos generados. Si THYROX se porta a otro LLM, solo cambia el renderer.
**Implicaciones:**
- `registry/agents/` contiene: task-planner.yml, task-executor.yml, tech-detector.yml,
  skill-generator.yml, react-expert.yml, nodejs-expert.yml, etc.
- `bootstrap.py --model claude` genera los `.md` con frontmatter correcto
- `bootstrap.py --model openai` (futuro) genera config de Assistants API
- Los `.claude/agents/*.md` se commitean en git (artefactos generados, no ignorados)

---

### D-8: bootstrap.py como entry point de instalación one-shot

**Alternativas:** Documentación manual de setup, Makefile, shell script
**Decisión:** `bootstrap.py` como único comando de instalación
**Justificación:** Reduce fricción de adopción a cero. Un solo comando genera todo el sistema.
No es integración runtime (sin violación de "sin CLI") — es setup inicial como `npm install`.
**Implicaciones:**
- `python bootstrap.py --stack "react,nodejs,postgresql" --model claude`
- Genera: 6 agentes core + tech-experts + MCP servers + settings.json + requirements.txt
- Idempotente: si ya existe un agente generado, no sobreescribe sin `--force`
- Documentado en README del registry como el primer paso

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
Persistencia agents:        .claude/agents/*.md (generados por bootstrap.py, commiteados)
Persistencia skills:        .claude/skills/*/SKILL.md (commiteado en git)
Agent definitions source:   registry/agents/*.yml (YAML model-agnostic)
Bootstrap tool:             registry/bootstrap.py (one-shot setup, no runtime)
```

**Dependencias mínimas** (sin torch, sin ColPali, sin app/):
```
mcp>=0.9.0
evoagentx==0.1.0
faiss-cpu>=1.7.4
sentence-transformers>=2.2.0
pydantic>=2.0
pyyaml>=6.0        # para bootstrap.py
jinja2>=3.1        # rendering de templates YAML → .md
```

**6 Agentes core** (generados por bootstrap.py):
```
task-planner     — descompone goals en T-NNN atómicos (gate obligatorio)
task-executor    — ejecuta un T-NNN usando mcp__thyrox_executor
tech-detector    — detecta stack tecnológico del repositorio
skill-generator  — genera SKILL.md desde registry/agents/*.yml
{tech}-expert    — N agentes, uno por tecnología (react-expert, nodejs-expert, etc.)
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

## Diagrama de arquitectura final (v3)

```
SETUP (one-shot, fuera de Claude):
  python bootstrap.py --stack "react,nodejs,postgresql" --model claude
       ↓
  Lee: registry/agents/*.yml  (YAML model-agnostic)
       ↓
  Genera:
    .claude/agents/task-planner.md
    .claude/agents/task-executor.md
    .claude/agents/tech-detector.md
    .claude/agents/skill-generator.md
    .claude/agents/react-expert.md
    .claude/agents/nodejs-expert.md
    .claude/agents/postgresql-expert.md
    .claude/settings.json → mcpServers configurados

─────────────────────────────────────────────────────────

RUNTIME (dentro de Claude Code):

PROYECTO USUARIO
└── .claude/
    ├── settings.json
    │   └── mcpServers:
    │       ├── thyrox-memory:   python registry/mcp/memory_server.py
    │       └── thyrox-executor: python registry/mcp/executor_server.py
    │
    ├── agents/                  ← generados por bootstrap.py, commiteados
    │   ├── task-planner.md      ← gate de atomicidad (siempre primero)
    │   ├── task-executor.md     ← ejecuta T-NNN via thyrox-executor
    │   ├── tech-detector.md     ← detecta stack, invoca skill-generator
    │   ├── skill-generator.md   ← genera SKILL.md desde registry YAML
    │   ├── react-expert.md      ← especialista React (generado si --stack react)
    │   ├── nodejs-expert.md     ← especialista Node.js
    │   └── postgresql-expert.md ← especialista PostgreSQL
    │
    ├── skills/
    │   ├── pm-thyrox/           ← orquestador, sin cambios
    │   ├── react-frontend/      ← generado por skill-generator en bootstrap
    │   └── nodejs-backend/      ← generado por skill-generator en bootstrap
    │
    └── memory/
        └── thyrox.faiss         ← índice semántico de WPs/ADRs/lecciones

registry/
├── agents/                      ← YAML model-agnostic (fuente de verdad)
│   ├── task-planner.yml
│   ├── task-executor.yml
│   ├── tech-detector.yml
│   ├── skill-generator.yml
│   └── tech-experts/
│       ├── react.yml
│       ├── nodejs.yml
│       └── postgresql.yml
├── mcp/
│   ├── _evoagentx_adapter.py    ← único punto de contacto con EvoAgentX
│   ├── memory_server.py         ← tools: store, retrieve
│   └── executor_server.py       ← tools: exec_cmd, exec_python
├── bootstrap.py                 ← entry point de instalación
├── frontend/
│   └── react.skill.template.md
└── backend/
    └── nodejs.skill.template.md

─────────────────────────────────────────────────────────

FLUJO POR FASE (runtime):

Phase 1: ANALYZE (nueva sesión)
  Claude → mcp__thyrox_memory__retrieve("contexto proyectos anteriores similares")
  [si no hay agents/] → tech-detector → skill-generator → commit

Phase 6: EXECUTE — CON gate de atomicidad
  Usuario: "implementa autenticación JWT"
       ↓
  Claude invoca task-planner
       ↓ descompone en T-001..T-005 (5 criterios verificados)
       ↓
  Claude invoca task-executor para cada T-NNN
       ↓ usa mcp__thyrox_executor__exec_cmd("yarn test")
       ↓ usa mcp__thyrox_executor__exec_python(script)
       ↓ resultado localizado → fácil de corregir si falla

Phase 7: TRACK
  Claude → mcp__thyrox_memory__store(lessons_learned, {wp, date, phase})
```

---

## Post-design Re-check (v3)

| Check | Estado |
|-------|--------|
| ¿Viola algún ADR? | No. ADR-008, ADR-012 respetados |
| ¿Requiere CLI/GUI/REST? | No. stdio transport + bootstrap.py es one-shot setup, no runtime |
| ¿Bootstrap once preservado? | Sí. Agentes y skills generados se commitean en git (H-020) |
| ¿Las 3 brechas están cerradas? | Sí. BRECHA-1 → executor, BRECHA-2 → memory, BRECHA-3 → native agents |
| ¿EvoAgentX aislado? | Sí. Adapter layer + `evoagentx==0.1.0` pinned |
| ¿Local-first? | Sí. FAISS-cpu + sentence-transformers, zero API keys |
| ¿Atomicidad enforced? | Sí. task-planner como gate obligatorio antes de Phase 6 EXECUTE |
| ¿Model-agnostic? | Sí. Registry YAML → bootstrap.py renderiza para Claude o GPT |
| ¿Template replicable? | Sí. Un comando instala el sistema completo en cualquier proyecto |
| ¿Complejidad justificada? | Sí. 2 servers + adapter + 6 agents + bootstrap = mínimo para cerrar las 3 brechas + los 3 nuevos requisitos |

---

## Validation Checklist

- [x] Key ideas claramente articuladas (MCP bridge, 2 servers, native agents, atomicidad, model-agnostic, bootstrap)
- [x] Decisiones fundamentales documentadas (D-1..D-8)
- [x] Alternativas consideradas para cada decisión (R-1..R-7)
- [x] Justificaciones claras
- [x] Technology stack completo con deps mínimas
- [x] Patrones seleccionados (Adapter, Single Responsibility, Registry, Facade, Bootstrap)
- [x] Quality goals cubiertos (QG-1..QG-4)
- [x] Restricciones respetadas (Sin CLI/GUI/REST — bootstrap.py es setup, no runtime)
- [x] Trazable a Phase 1 (BRECHA-1, BRECHA-2, BRECHA-3)
- [x] Nuevos requisitos integrados (atomicidad, model-agnostic, template replicable)
- [x] Diagrama de arquitectura actualizado (v3 con 6 agentes + 2 MCP servers)
- [x] Guía clara para Phase 3: PLAN

---

## Siguiente Paso

Phase 2 completa. Proponer `/workflow_plan` para Phase 3 — scope y entregables concretos:

**MCP Servers (2):**
- `registry/mcp/_evoagentx_adapter.py`
- `registry/mcp/memory_server.py`
- `registry/mcp/executor_server.py`

**Registry agents YAML (6 core):**
- `registry/agents/task-planner.yml`
- `registry/agents/task-executor.yml`
- `registry/agents/tech-detector.yml`
- `registry/agents/skill-generator.yml`
- `registry/agents/tech-experts/react.yml`, `nodejs.yml`, `postgresql.yml`

**Bootstrap:**
- `registry/bootstrap.py`

**Config:**
- `.claude/settings.json` con `mcpServers` configurados
- `.claude/agents/*.md` generados por bootstrap.py

**Skill templates tech:**
- `registry/frontend/react.skill.template.md`
- `registry/backend/nodejs.skill.template.md`
- `registry/database/postgresql.skill.template.md`
