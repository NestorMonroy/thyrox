```yml
work_package_id: 2026-04-05-01-09-22-thyrox-capabilities-integration
Sub-análisis: MCP + Agentes propios — arquitectura corregida
created_at: 2026-04-05 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
Correcciones sobre solution-strategy v1:
  - NO usar evoagentx.agents (CustomizeAgent, AgentManager)
  - Los agentes son nuestros: Claude Code native agents (.claude/agents/*.md)
  - EvoAgentX solo como librería de infraestructura: memory + tools
  - MCP explicado desde la definición del protocolo
```

# Análisis: MCP y Agentes Propios — Arquitectura Corregida

## Por qué este documento

La Phase 2 solution-strategy v1 cometió un error crítico:
propuso usar `evoagentx.agents.CustomizeAgent` y `AgentManager` para implementar
los agentes del meta-framework. El usuario lo rechazó con una razón clara:

> "nosotros no queremos usar evoagentx.agents, nosotros queremos implementar
> los de nosotros, esto con la finalidad de que todo va a estar controlado"

Este análisis define la arquitectura correcta:
- Nuestros propios agentes como **Claude Code native agents** (archivos `.md`)
- EvoAgentX restringido a: `memory/` + `tools/` — infraestructura de soporte
- MCP como protocolo que conecta ambas capas

---

## Parte I: Qué es MCP — Definición completa

### 1.1 El problema que MCP resuelve

Antes de MCP (2024), cada herramienta de IA tenía su propio formato propietario
para que el LLM llamara código externo:

```
OpenAI Function Calling:  { "name": "get_weather", "parameters": {...} }
Anthropic tool_use:        { "type": "tool_use", "name": "...", "input": {...} }
LangChain Tools:           clase Tool con .run() propio
LlamaIndex:                formato propio
```

**El problema:** fragmentación total. Una herramienta escrita para Claude no funciona
con GPT-4 y viceversa. Cada integración se construye desde cero para cada sistema.

### 1.2 Qué es MCP

**MCP** (Model Context Protocol) es el **estándar abierto** creado por Anthropic
(noviembre 2024) para que cualquier LLM acceda a herramientas externas de forma
estandarizada, independiente del proveedor.

Funciona como cliente-servidor:

```
MCP HOST                    MCP SERVER
(Claude Code, Cursor,   ←→  (cualquier proceso que exponga
 VS Code + Continue...)      tools, resources, prompts)
```

**Analogía:** MCP es para los LLMs lo que USB es para los dispositivos.
USB estandarizó cómo conectar periféricos. MCP estandariza cómo los LLMs
acceden a herramientas externas. Un MCP server escrito una vez funciona
con cualquier cliente compatible.

### 1.3 El protocolo técnico

MCP usa **JSON-RPC 2.0** sobre dos transportes:

```
STDIO (Local):
  Claude Code → spawn proceso Python → stdin/stdout
  Latencia: ~1ms | Sin puertos | Zero configuración de red

HTTP + SSE (Remoto):
  Claude Code → HTTP POST/GET → servidor remoto
  Latencia: red | Requiere URL y auth
```

Para THYROX usamos **stdio exclusivamente** — procesos locales, sin red.

**Ciclo de vida de una tool call MCP:**

```
1. STARTUP:
   Claude Code lee settings.json → mcpServers
   → spawn process: python registry/mcp/memory_server.py
   → envía: { "method": "initialize" }
   ← recibe: { "serverInfo": { "name": "thyrox-memory", "version": "1.0" } }

2. DISCOVERY:
   → envía: { "method": "tools/list" }
   ← recibe: lista de tool schemas (nombre, descripción, parámetros JSON Schema)
   Claude registra internamente: mcp__thyrox_memory__store, mcp__thyrox_memory__retrieve

3. INVOCACIÓN (cuando Claude decide usar la herramienta):
   → envía: { "method": "tools/call", "params": { "name": "retrieve", "arguments": { "query": "..." } } }
   ← recibe: { "content": [{ "type": "text", "text": "resultado..." }] }

4. SHUTDOWN:
   → envía: { "method": "shutdown" }
   → cierra stdin → proceso termina
```

### 1.4 Las tres capacidades de un MCP server

Un servidor MCP puede exponer tres tipos de capacidades:

| Capacidad | Qué es | Ejemplo |
|-----------|--------|---------|
| **Tools** | Funciones que Claude invoca activamente | `execute_command`, `store_memory` |
| **Resources** | Datos que Claude puede leer como contexto | `project://readme`, `file://config.json` |
| **Prompts** | Templates de prompt reusables | `/analyze-pr`, `/write-tests` |

Para THYROX usamos **solo Tools** — el caso de uso más directo.

### 1.5 Cómo lo ve Claude Code

Desde la perspectiva de Claude, las tools MCP son **idénticas a las tools built-in**.
No hay diferencia entre llamar `Read` (built-in) y `mcp__thyrox_memory__retrieve` (MCP):

```
Built-in tools:   Read, Write, Bash, Glob, Grep, Edit, Agent...
MCP tools:        mcp__thyrox_memory__store
                  mcp__thyrox_memory__retrieve
                  mcp__thyrox_executor__exec_cmd
                  mcp__thyrox_executor__exec_python
```

Claude los llama todos con el mismo mecanismo. La diferencia es solo de routing:
las built-in las ejecuta el runtime de Claude Code; las MCP las enruta al proceso externo.

### 1.6 Por qué MCP es la respuesta correcta para THYROX

```
RESTRICCIÓN: Sin CLI, Sin GUI, Sin REST API

Opción A — subprocess bash:
  Claude ejecuta: Bash("python memory_server.py retrieve 'query'")
  ✗ Es CLI — excluido
  ✗ No hay schema — sin tipado ni validación
  ✗ Inyección de argumentos — inseguro

Opción B — REST API (FastAPI):
  Claude ejecuta: WebFetch("http://localhost:8000/memory/retrieve")
  ✗ Es REST API — explícitamente excluido
  ✗ Requiere levantar servidor, gestionar puertos

Opción C — Solo Markdown:
  Claude lee archivos manualmente en cada sesión
  ✗ No cierra ninguna de las 3 brechas
  ✗ Status quo sin mejora

Opción D — MCP servers stdio:
  Claude llama: mcp__thyrox_memory__retrieve(query="...")
  ✓ No es CLI (es tool call nativa)
  ✓ No es REST API (es stdio, sin puertos)
  ✓ No es GUI (proceso headless)
  ✓ Schema validado (JSON Schema en tool definition)
  ✓ Cierra las 3 brechas
```

**MCP es la única opción que satisface todas las restricciones.**

---

## Parte II: Nuestros propios agentes — Claude Code native agents

### 2.1 Por qué NO evoagentx.agents

`CustomizeAgent` y `AgentManager` de EvoAgentX son **clases Python** que:
- Hacen sus propias llamadas al LLM (crean su propio cliente OpenAI/LiteLLM)
- Tienen su propio sistema de memoria y contexto
- Se orquestan con `AgentManager` en Python
- No se integran nativamente con el ciclo de vida de Claude Code

**El problema de control:**
Si usamos `CustomizeAgent`, el agente `tech-detector` es una caja negra Python.
No podemos ver qué hace en tiempo real, no podemos modificarlo sin tocar Python,
y no aparece en el UI de Claude Code como un agente nativo.

**Lo que queremos:** Control total. Ver qué hace el agente. Modificarlo como Markdown.
Que Claude Code lo invoque nativamente.

### 2.2 Claude Code native agents — cómo funcionan

Claude Code soporta agentes nativos definidos como archivos `.md` en `.claude/agents/`.
Formato:

```markdown
---
name: tech-detector
description: "Detecta el stack tecnológico del proyecto analizando archivos de configuración.
  Use this agent when: el usuario ejecuta /workflow_init, o cuando no hay skills
  en .claude/skills/ y se necesita saber qué tecnologías usa el proyecto.
  <example>
  usuario: /workflow_init
  acción: analiza package.json, requirements.txt, Dockerfile del proyecto
  </example>"
tools: Read, Glob, Grep, mcp__thyrox_memory__retrieve
model: sonnet
color: blue
---

# Tech Detector

## Responsabilidad
Analizar el repositorio y detectar el stack tecnológico para el bootstrap de skills.

## CAN
- Leer archivos de configuración: package.json, requirements.txt, Dockerfile,
  composer.json, Gemfile, pom.xml, go.mod, pubspec.yaml, Cargo.toml
- Leer .claude/skills/ para detectar qué skills ya existen
- Llamar mcp__thyrox_memory__retrieve para traer contexto de proyectos similares
- Escribir el resultado en analysis/{timestamp}-tech-detection.md

## CANNOT
- Modificar ningún archivo del proyecto
- Generar skills (eso es responsabilidad de skill-generator)
- Ejecutar comandos del proyecto

## Output
Siempre produce: analysis/{timestamp}-tech-detection.md con:
- Stack detectado (frontend, backend, database, infra)
- Skills existentes vs skills necesarios
- Contexto de proyectos similares (desde thyrox-memory)
```

**Diferencia clave con EvoAgentX CustomizeAgent:**

| Aspecto | EvoAgentX CustomizeAgent | Claude Code native agent |
|---------|------------------------|--------------------------|
| Definición | Clase Python | Archivo `.md` con frontmatter YAML |
| LLM calls | Propias (Python) | Las de Claude Code (nativo) |
| Invocación | `AgentManager.run()` | Claude lo invoca automáticamente por `description` |
| Modificación | Editar Python | Editar Markdown |
| Visibilidad | Caja negra | Claude muestra qué hace el agente |
| Control | EvoAgentX | Nosotros — 100% |
| Tools | Via EvoAgentX toolkits | Claude Code tools + MCP tools |

### 2.3 Los agentes del meta-framework (nuestros)

```
.claude/agents/
├── tech-detector.md       ← detecta stack → produce tech-detection.md
├── skill-generator.md     ← lee registry/ + tech-detection → crea .claude/skills/
└── [generados por skill-generator cuando hace bootstrap]:
    ├── react-expert.md    ← experto en React para Phase 6 EXECUTE
    ├── nodejs-expert.md   ← experto en Node.js
    └── postgresql-expert.md ← experto en PostgreSQL
```

**tech-detector** — solo tiene tools de lectura + MCP memory (sin escritura)
**skill-generator** — tiene Write + MCP executor (para hacer git commit del bootstrap)
**[tech]-expert** — tiene MCP executor (exec_cmd, exec_python) para ejecutar código real

### 2.4 Cómo Claude Code invoca los agentes automáticamente

El campo `description` del frontmatter es lo que Claude Code usa para decidir
cuándo invocar cada agente. El patrón `<example>` es crítico:

```yaml
description: "Detecta el stack tecnológico...
  Use this agent when: el usuario ejecuta /workflow_init
  <example>
  usuario: /workflow_init
  acción: analiza configuración del proyecto
  </example>"
```

Con esto, cuando el usuario ejecuta `/workflow_init`, Claude Code invoca
`tech-detector` automáticamente — sin que el usuario tenga que mencionarlo.
Este es el mismo mecanismo que Volt Factory usa para sus 28 comandos (H-013).

### 2.5 Los agentes generados desde el registry

Cuando `skill-generator` hace el bootstrap de React, no solo crea `SKILL.md`:
también crea el agente experto de React:

```
registry/
└── frontend/
    ├── react.skill.template.md        → .claude/skills/react-frontend/SKILL.md
    ├── react.instructions.template.md → .claude/guidelines/react.instructions.md
    └── react.agent.template.md        → .claude/agents/react-expert.md  ← NUEVO
```

El template del agente ya tiene pre-configurado:
- Tools: `mcp__thyrox_executor__exec_cmd`, `mcp__thyrox_executor__exec_python`
- CAN/CANNOT específicos de React
- Description con ejemplos de cuándo invocarlo
- Qué comandos puede ejecutar (yarn, npm, jest, etc.)

---

## Parte III: Qué usamos de EvoAgentX — solo infraestructura

Con la corrección de "no usar evoagentx.agents", el uso de EvoAgentX queda
**restringido a dos módulos**:

### 3.1 Lo que SÍ usamos

```python
# evoagentx.memory — LongTermMemory + FAISS
from evoagentx.memory import LongTermMemory, MemoryManager
from evoagentx.rag import RAGConfig

# evoagentx.tools — toolkits de ejecución
from evoagentx.tools import CMDToolkit, PythonInterpreterToolkit, FileToolkit
```

Estos módulos son **infraestructura de soporte** para los MCP servers.
No son agentes. No hacen llamadas al LLM. Solo ejecutan código Python.

### 3.2 Lo que NO usamos (tabla definitiva)

| Módulo EvoAgentX | Razón de exclusión |
|-----------------|-------------------|
| `evoagentx.agents` (CustomizeAgent, AgentManager, ActionAgent) | **Nuestros agentes son Claude Code native agents** |
| `evoagentx.workflow` (WorkFlowGenerator, WorkFlowGraph) | El flujo lo orquesta pm-thyrox SKILL |
| `evoagentx.optimizers` (SEW, AFlow, TextGrad, MIPRO) | Sin datasets históricos aún |
| `evoagentx.evaluators` | Sin benchmark setup |
| `evoagentx.benchmarks` | No aplica (no es NLP benchmark) |
| `evoagentx.hitl` | Excluido (GUI) + THYROX ya tiene HITL en gates de fase |
| `evoagentx.app` (FastAPI, Celery, Redis) | Excluido (REST API) |
| `evoagentx.frameworks` (multi_agent_debate) | Complejidad sin beneficio para PM |
| `evoagentx.models` | Los LLM calls los hace Claude Code, no nosotros |

### 3.3 Instalación mínima verificada

```bash
# Solo los módulos que usamos
pip install \
  evoagentx==0.1.0 \
  faiss-cpu>=1.7.4 \
  sentence-transformers>=2.2.0 \
  mcp>=0.9.0 \
  pydantic>=2.0

# Verificar que NO se instala torch (señal de que ColPali está excluido)
pip show torch  # debe dar: WARNING: Package(s) not found: torch
```

---

## Parte IV: Arquitectura final corregida

### 4.1 Mapa completo

```
THYROX META-FRAMEWORK — ARQUITECTURA CORREGIDA

═══════════════════════════════════════════════════════
CAPA 1: ORQUESTACIÓN (Markdown + Claude Code)
═══════════════════════════════════════════════════════

.claude/
├── CLAUDE.md                    ← 15 líneas imperativas
├── skills/
│   └── pm-thyrox/SKILL.md      ← 7 fases, tech-agnóstico (SIN CAMBIO)
├── agents/                      ← NUESTROS agentes nativos
│   ├── tech-detector.md         ← detecta stack (solo Read + Grep + MCP memory)
│   ├── skill-generator.md       ← genera skills desde registry (Write + MCP executor)
│   ├── react-expert.md          ← [GENERADO] experto React (MCP executor)
│   ├── nodejs-expert.md         ← [GENERADO] experto Node.js (MCP executor)
│   └── postgresql-expert.md     ← [GENERADO] experto PostgreSQL (MCP executor)
├── guidelines/
│   ├── react.instructions.md    ← [GENERADO] always-on conventions
│   └── nodejs.instructions.md   ← [GENERADO] always-on conventions
└── memory/
    └── thyrox.faiss             ← índice semántico (archivo en disco)

═══════════════════════════════════════════════════════
CAPA 2: MCP SERVERS (Python — puente a infraestructura)
═══════════════════════════════════════════════════════

registry/mcp/
├── _evoagentx_adapter.py        ← único punto de contacto con EvoAgentX
│                                   expone: store_memory(), retrieve_memory(),
│                                           exec_cmd(), exec_python()
├── memory_server.py             ← MCP server stdio
│   tools:                          mcp__thyrox_memory__store(content, metadata)
│                                   mcp__thyrox_memory__retrieve(query, top_k)
│   backend: EvoAgentX LongTermMemory + FAISS-cpu + sentence-transformers
│
└── executor_server.py           ← MCP server stdio
    tools:                          mcp__thyrox_executor__exec_cmd(cmd, cwd)
                                    mcp__thyrox_executor__exec_python(code)
                                    mcp__thyrox_executor__read_file(path)
                                    mcp__thyrox_executor__write_file(path, content)
    backend: EvoAgentX CMDToolkit + PythonInterpreterToolkit + FileToolkit

[NOTA: thyrox-agents server ELIMINADO — los agentes son .md nativos, no Python]

═══════════════════════════════════════════════════════
CAPA 3: INFRAESTRUCTURA (EvoAgentX como librería)
═══════════════════════════════════════════════════════

EvoAgentX usado solo en:
  evoagentx.memory.LongTermMemory   ← usado por memory_server.py
  evoagentx.tools.CMDToolkit        ← usado por executor_server.py
  evoagentx.tools.PythonInterpreterToolkit
  evoagentx.tools.FileToolkit

═══════════════════════════════════════════════════════
CAPA 4: REGISTRY (templates + fuente de verdad)
═══════════════════════════════════════════════════════

registry/
├── mcp/                         ← MCP servers (instalados una vez)
│   ├── _evoagentx_adapter.py
│   ├── memory_server.py
│   └── executor_server.py
├── frontend/
│   ├── react.skill.template.md
│   ├── react.instructions.template.md
│   └── react.agent.template.md  ← template para .claude/agents/react-expert.md
├── backend/
│   ├── nodejs.skill.template.md
│   └── nodejs.agent.template.md
└── database/
    ├── postgresql.skill.template.md
    └── postgresql.agent.template.md
```

### 4.2 Flujo por fase con la arquitectura corregida

```
PHASE 1: ANALYZE (nueva sesión)
  Claude (con pm-thyrox SKILL)
    → mcp__thyrox_memory__retrieve("contexto proyectos similares")
    → [si no hay skills] Agent(tech-detector) → produce tech-detection.md
    → pm-thyrox guía el análisis con contexto recuperado

PHASE 1: BOOTSTRAP (solo primera vez, si no existen skills)
  Claude → Agent(tech-detector) → lee package.json, Dockerfile, etc.
  Claude → Agent(skill-generator) → lee registry/ + tech-detection.md
    → escribe .claude/skills/react-frontend/SKILL.md
    → escribe .claude/guidelines/react.instructions.md
    → escribe .claude/agents/react-expert.md  ← nuestro agente nativo
    → mcp__thyrox_executor__exec_cmd("git commit -m 'feat(skills): bootstrap...'")

PHASE 6: EXECUTE
  Claude (con pm-thyrox SKILL)
    → Agent(react-expert)
        → mcp__thyrox_executor__exec_cmd("yarn test --coverage")
        → lee resultado → corrige → retry si falla
        → mcp__thyrox_executor__exec_cmd("git commit -m 'feat(auth): ...'")

PHASE 7: TRACK
  Claude
    → mcp__thyrox_memory__store(lessons_learned_content, { wp: "...", date: "..." })
    → el índice FAISS se actualiza en .claude/memory/thyrox.faiss
```

### 4.3 settings.json — configuración de los 2 MCP servers

```json
{
  "mcpServers": {
    "thyrox-memory": {
      "command": "python",
      "args": ["registry/mcp/memory_server.py"],
      "env": {
        "THYROX_MEMORY_PATH": ".claude/memory/thyrox.faiss",
        "THYROX_EMBEDDING_MODEL": "all-MiniLM-L6-v2"
      }
    },
    "thyrox-executor": {
      "command": "python",
      "args": ["registry/mcp/executor_server.py"],
      "env": {
        "THYROX_EXECUTOR_TIMEOUT": "30"
      }
    }
  }
}
```

**Antes había 3 servers (memory, executor, agents). Ahora son 2.**
El server de agentes se elimina porque los agentes son `.md` nativos — no necesitan
un proceso Python para ser invocados.

---

## Parte V: Correcciones a la solution-strategy v1

| Elemento v1 (incorrecto) | Corrección v2 |
|--------------------------|--------------|
| 3 MCP servers (memory + executor + agents) | 2 MCP servers (memory + executor) |
| `evoagentx.agents.CustomizeAgent` | `.claude/agents/*.md` nativos |
| `evoagentx.agents.AgentManager` | Claude Code invoca agentes por `description` |
| `thyrox_agents_detect_tech()` como MCP tool | `Agent(tech-detector)` — agente nativo |
| `thyrox_agents_generate_skill()` como MCP tool | `Agent(skill-generator)` — agente nativo |
| EvoAgentX controla los agentes | Nosotros controlamos los agentes (Markdown) |

### Por qué esto es mejor

```
ANTES (evoagentx.agents):
  EvoAgentX CustomizeAgent → hace sus propios LLM calls → caja negra
  No vemos qué decide el agente. No podemos depurar. EvoAgentX controla el flujo.

AHORA (native agents):
  .claude/agents/tech-detector.md → Claude Code lo invoca
  Claude muestra qué está haciendo el agente en tiempo real
  Si falla, sabemos exactamente qué instrucción falló
  Modificar el agente = editar Markdown = control total
```

---

## Resumen de hallazgos

| ID | Hallazgo | Impacto |
|----|----------|---------|
| H-MCP-01 | MCP stdio es el único mecanismo que integra Python con Claude Code sin CLI/GUI/REST | Arquitectónico — define toda la capa 2 |
| H-MCP-02 | MCP usa JSON-RPC 2.0; tools se descubren en startup y se llaman como built-ins | Implementación |
| H-AGT-01 | Los agentes propios son `.claude/agents/*.md` — nativos de Claude Code | Arquitectónico — elimina evoagentx.agents |
| H-AGT-02 | El campo `description` + `<example>` controla cuándo Claude invoca cada agente | Implementación — crítico para bootstrap |
| H-AGT-03 | Los agentes [tech]-expert se generan desde `registry/[tech]/[tech].agent.template.md` | Implementación — parte del bootstrap |
| H-EVO-01 | EvoAgentX restringido a: `memory/` + `tools/` — infraestructura, no orquestación | Arquitectónico — reduce acoplamiento |
| H-EVO-02 | De 3 MCP servers a 2: memory + executor (agents server eliminado) | Simplificación — menos complejidad |
| H-REG-01 | Registry expande: agrega `[tech].agent.template.md` por cada tecnología | Implementación — parte de la estructura |
