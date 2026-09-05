```yml
type: Especificación Técnica
wp: thyrox-capabilities-integration
version: 1.0
created_at: 2026-04-05 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
status: Pendiente aprobación
Fuentes: solution-strategy v3.1 (D-1..D-10), plan aprobado 2026-04-05
SPECs: 12
```

# Especificación de Requisitos — THYROX Capabilities Integration

## Resumen Ejecutivo

Integrar tres capacidades faltantes en THYROX via MCP servers y native Claude Code agents:
ejecución de código (BRECHA-1), memoria semántica persistente (BRECHA-2) y agentes
especializados por tecnología (BRECHA-3). El código es **implementación propia** inspirada
en patrones de EvoAgentX — sin dependencia de la librería. Los agentes son native Claude
Code agents con acceso completo al ecosistema de tools. Bootstrap.py instala el sistema en un comando.

**Objetivo:** Un desarrollador ejecuta `python registry/bootstrap.py --stack "react,nodejs,postgresql" --model claude` y obtiene un sistema funcional con MCP servers, agentes, memory store y tech-expert skills.

---

## Mapeo Brechas → SPECs

| Brecha / Decisión | SPEC IDs |
|-------------------|---------|
| BRECHA-1: Ejecución de código | SPEC-001, SPEC-003 |
| BRECHA-2: Memoria semántica | SPEC-001, SPEC-002 |
| BRECHA-3: Agentes especializados | SPEC-005..SPEC-010 |
| D-6: Atomicidad obligatoria | SPEC-005 |
| D-7: Model-agnostic registry | SPEC-009 |
| D-8: Bootstrap one-shot | SPEC-011 |
| D-9: Executor scope reducido | SPEC-003 |
| D-10: DAG implícito T-NNN | SPEC-005, SPEC-006 |

---

## SPEC-001: Core Services Layer — implementación propia

**ID:** SPEC-001
**Origen:** D-3 revisado — código propio inspirado en EvoAgentX, sin dependencia de la librería
**Prioridad:** Critical — memory_server y executor_server dependen de este módulo
**Estado:** Pendiente

### Descripción

Módulo interno `registry/mcp/thyrox_core.py` que implementa desde cero las interfaces
de memoria vectorial y ejecución de código. Usa FAISS + sentence-transformers para
memoria, subprocess para ejecución. Los patrones (TaskPlanner → T-NNN, LongTermMemory →
FAISS store/retrieve) están inspirados en EvoAgentX pero son código THYROX nativo.

### Criterios de Aceptación

```
Given faiss-cpu y sentence-transformers instalados
When se importa thyrox_core
Then expone: exec_cmd, exec_python, store_memory, retrieve_memory, init_memory

Given un comando shell válido
When exec_cmd(cmd="echo hello", cwd="/tmp")
Then retorna ExecResult(stdout="hello\n", stderr="", returncode=0)

Given código Python válido
When exec_python(code="print(1+1)")
Then retorna ExecResult(stdout="2\n", stderr="", returncode=0)

Given content="lección sobre React hooks"
When store_memory(content, metadata={"wp": "abc"})
Then vectoriza con sentence-transformers y almacena en índice FAISS local

Given índice con documentos
When retrieve_memory("React hooks", top_k=3)
Then retorna lista[MemoryResult] ordenada por similitud coseno descendente
```

### Interfaces del módulo

```python
from dataclasses import dataclass

@dataclass
class ExecResult:
    stdout: str
    stderr: str
    returncode: int

@dataclass
class MemoryResult:
    content: str
    metadata: dict
    score: float

def init_memory(index_path: str, model_name: str = "all-MiniLM-L6-v2") -> None
def exec_cmd(cmd: str, cwd: str = ".", timeout: int = 60) -> ExecResult
def exec_python(code: str, timeout: int = 30) -> ExecResult
def store_memory(content: str, metadata: dict) -> str          # retorna uuid
def retrieve_memory(query: str, top_k: int = 5) -> list[MemoryResult]
```

**Archivos:** `registry/mcp/thyrox_core.py`
**Complejidad:** Alta — es el núcleo de las capacidades de memoria y ejecución

---

## SPEC-002: thyrox-memory MCP Server

**ID:** SPEC-002
**Origen:** BRECHA-2, D-4 (FAISS + sentence-transformers)
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

MCP server en stdio transport. Expone 2 tools: `store` y `retrieve`.
Usa FAISS-cpu + sentence-transformers local. El índice persiste en `.claude/memory/thyrox.faiss`.

### Criterios de Aceptación

```
Given settings.json con thyrox-memory en mcpServers
When Claude Code arranca
Then mcp__thyrox_memory__store y mcp__thyrox_memory__retrieve son tools disponibles

Given content="lección aprendida sobre React hooks"
When mcp__thyrox_memory__store(content=content, metadata={"wp": "wp-abc", "date": "2026-04-05"})
Then retorna {"status": "ok", "id": "<uuid>"}
Y el dato persiste en .claude/memory/thyrox.faiss tras restart

Given índice con 10 documentos almacenados
When mcp__thyrox_memory__retrieve(query="React hooks", top_k=3)
Then retorna lista de hasta 3 MemoryResult ordenados por score descendente

Given .claude/memory/ no existe
When memory_server.py inicia
Then crea el directorio y un índice FAISS vacío
```

### Tool schemas (MCP)

```json
store: {
  "content": "string (required)",
  "metadata": "object (optional)"
}
retrieve: {
  "query": "string (required)",
  "top_k": "integer (optional, default: 5)"
}
```

**Archivos:** `registry/mcp/memory_server.py`
**Dependencias:** SPEC-001, faiss-cpu, sentence-transformers
**Complejidad:** Alta

---

## SPEC-003: thyrox-executor MCP Server

**ID:** SPEC-003
**Origen:** BRECHA-1, D-9 (scope reducido — solo subprocess)
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

MCP server con scope acotado: solo `exec_cmd` y `exec_python`.
**NO** expone file operations — los agentes usan Read/Write/Edit nativos.

### Criterios de Aceptación

```
Given settings.json con thyrox-executor en mcpServers
When Claude Code arranca
Then mcp__thyrox_executor__exec_cmd y mcp__thyrox_executor__exec_python disponibles

Given cmd="yarn test --coverage", cwd="."
When mcp__thyrox_executor__exec_cmd(cmd=cmd, cwd=cwd)
Then retorna {"stdout": "...", "stderr": "...", "returncode": 0}
Y el comando se ejecuta en el directorio especificado

Given code="import sys; print(sys.version)"
When mcp__thyrox_executor__exec_python(code=code)
Then retorna {"stdout": "3.11...\n", "stderr": "", "returncode": 0}

Given cmd="rm -rf /" (comando destructivo)
When mcp__thyrox_executor__exec_cmd
Then retorna {"returncode": 1, "stderr": "Blocked: destructive command pattern"}
```

### Tool schemas (MCP)

```json
exec_cmd: {
  "cmd": "string (required)",
  "cwd": "string (optional, default: '.')",
  "timeout": "integer (optional, default: 60)"
}
exec_python: {
  "code": "string (required)",
  "timeout": "integer (optional, default: 30)"
}
```

**Archivos:** `registry/mcp/executor_server.py`
**Dependencias:** SPEC-001
**Complejidad:** Media

---

## SPEC-004: Configuración de integración

**ID:** SPEC-004
**Origen:** D-1 (MCP como capa de integración)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Archivos de configuración que conectan Claude Code con los MCP servers y declaran
las dependencias Python mínimas.

### Criterios de Aceptación

```
Given settings.json con mcpServers configurado
When Claude Code inicia en el proyecto
Then los dos MCP servers arrancan automáticamente (stdio transport)
Y las tools mcp__thyrox_memory__* y mcp__thyrox_executor__* están disponibles

Given requirements.txt con las 5 deps
When pip install -r requirements.txt
Then instala sin conflictos: mcp, faiss-cpu, sentence-transformers, pydantic
```

### Contenido esperado

```json
// .claude/settings.json — sección mcpServers
{
  "mcpServers": {
    "thyrox-memory": {
      "command": "python",
      "args": ["registry/mcp/memory_server.py"],
      "env": { "MEMORY_INDEX_PATH": ".claude/memory/thyrox.faiss" }
    },
    "thyrox-executor": {
      "command": "python",
      "args": ["registry/mcp/executor_server.py"]
    }
  }
}
```

**Archivos:** `.claude/settings.json`, `requirements.txt`
**Complejidad:** Baja

---

## SPEC-005: task-planner — gate de atomicidad

**ID:** SPEC-005
**Origen:** D-6 (atomicidad obligatoria), D-10 (DAG implícito T-NNN)
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

Native Claude Code agent. Recibe un goal y produce una lista de tareas atómicas T-NNN
con dependencias explícitas. Nunca ejecuta — solo planifica. task-executor lo
invoca para cada T-NNN por separado.

### Criterios de Aceptación

```
Given goal="implementa autenticación con JWT"
When se invoca task-planner con ese goal
Then produce lista T-NNN donde cada tarea:
  - Tiene exactamente 1 verbo de acción
  - Afecta exactamente 1 artefacto (archivo o endpoint)
  - Tiene output verificable
  - Declara dependencias explícitas: [deps: T-XXX, T-YYY] o [deps: ninguna]
  - No contiene decisiones implícitas de diseño

Given tarea "Implementa auth con JWT, PostgreSQL y envío de emails"
When task-planner la recibe
Then la rechaza (no atómica) y la descompone en subtareas atómicas

Given goal con 5 subtareas donde T-003 depende de T-001 y T-002
When task-planner produce la lista
Then el orden topológico es determinista y task-executor puede seguirlo linealmente
```

### Formato T-NNN de salida

```
T-001: [verbo] [artefacto] [deps: ninguna]
T-002: [verbo] [artefacto] [deps: T-001]
T-003: [verbo] [artefacto] [deps: T-001, T-002]
```

### 5 criterios de atomicidad (hardcoded en el agente)

1. Exactamente 1 verbo de acción
2. Exactamente 1 artefacto afectado
3. Output verificable objetivamente
4. Sin decisiones de diseño implícitas
5. Dependencias declaradas explícitamente

**Archivos:** `.claude/agents/task-planner.md`, `registry/agents/task-planner.yml`
**Complejidad:** Media

---

## SPEC-006: task-executor — ejecuta T-NNN atómicos

**ID:** SPEC-006
**Origen:** D-10 (order topológico), D-9 (usa native tools + exec_cmd)
**Prioridad:** Critical
**Estado:** Pendiente

### Descripción

Native Claude Code agent. Recibe exactamente un T-NNN y lo ejecuta usando:
- Tools nativas: Read, Write, Edit, Glob, Grep para file operations
- `mcp__thyrox_executor__exec_cmd` para shell commands (yarn, git, pytest)
- `mcp__thyrox_memory__store` para guardar lecciones aprendidas

### Criterios de Aceptación

```
Given T-001: "Crear archivo src/auth/jwt.service.ts" [deps: ninguna]
When task-executor recibe ese T-NNN
Then usa Write("src/auth/jwt.service.ts", content) — NO exec_cmd("cat >")
Y el archivo existe después de la ejecución

Given T-005: "Ejecutar yarn test --coverage" [deps: T-001..T-004]
When task-executor recibe ese T-NNN
Then usa mcp__thyrox_executor__exec_cmd("yarn test --coverage")
Y retorna el resultado de los tests

Given T-NNN que falla
When task-executor encuentra error
Then reporta el error con contexto, no falla silenciosamente
Y almacena la lección en memoria si el error es instructivo
```

**Archivos:** `.claude/agents/task-executor.md`, `registry/agents/task-executor.yml`
**Complejidad:** Media

---

## SPEC-007: tech-detector — pure-native stack detection

**ID:** SPEC-007
**Origen:** R-9 (tech-detector = pure-native, sin MCP)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Native Claude Code agent. Detecta el stack tecnológico de un proyecto usando
exclusivamente tools nativas: Glob, Read, Grep. Zero dependencia de MCP servers.

### Criterios de Aceptación

```
Given proyecto con package.json que tiene "react": "^18.0"
When tech-detector analiza el directorio
Then detecta: ["react", "nodejs"]
Usando: Glob("**/package.json") + Read("package.json")

Given proyecto con requirements.txt con "django==4.2"
When tech-detector analiza
Then detecta: ["python", "django"]
Usando: Glob("**/requirements.txt") + Read("requirements.txt")

Given proyecto con docker-compose.yml con imagen postgres
When tech-detector analiza
Then detecta: ["postgresql", "docker"]

Given .claude/skills/ ya tiene react-expert/SKILL.md
When tech-detector detecta react
Then reporta "react ya tiene skill — skip bootstrap"
```

### Señales de detección

| Señal | Tool | Tecnología detectada |
|-------|------|---------------------|
| `**/package.json` + `"react"` | Glob + Read | React |
| `**/package.json` + `"express"\|"fastify"` | Glob + Read | Node.js |
| `**/requirements.txt` + `"django"` | Glob + Read | Django |
| `**/docker-compose.yml` + `postgres` | Glob + Grep | PostgreSQL |
| `**/Cargo.toml` | Glob | Rust |
| `**/go.mod` | Glob | Go |

**Archivos:** `.claude/agents/tech-detector.md`, `registry/agents/tech-detector.yml`
**Complejidad:** Baja

---

## SPEC-008: skill-generator — genera skills desde YAML

**ID:** SPEC-008
**Origen:** BRECHA-3, D-7 (model-agnostic registry)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Native Claude Code agent. Lee YAML de `registry/agents/` y templates de
`registry/{frontend,backend,database}/` para generar SKILL.md y agent `.md`.
Pure-native: usa Read y Write directamente.

### Criterios de Aceptación

```
Given registry/agents/react-expert.yml existe
When skill-generator recibe tech="react"
Then lee registry/agents/react-expert.yml con Read
Y lee registry/frontend/react.skill.template.md con Read
Y escribe .claude/agents/react-expert.md con Write
Y escribe .claude/skills/react-frontend/SKILL.md con Write

Given el agente ya existe en .claude/agents/react-expert.md
When skill-generator recibe tech="react" sin --force
Then reporta "ya existe — skip" sin sobreescribir

Given registry/agents/vue-expert.yml NO existe
When skill-generator recibe tech="vue"
Then reporta "no hay template en registry para vue"
```

**Archivos:** `.claude/agents/skill-generator.md`, `registry/agents/skill-generator.yml`
**Complejidad:** Baja

---

## SPEC-009: Registry YAML — definiciones model-agnostic

**ID:** SPEC-009
**Origen:** D-7 (YAML como fuente neutral)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Directorio `registry/agents/` con archivos YAML que definen el comportamiento
de cada agente de forma portable. `bootstrap.py` los lee para renderizar `.md`.

### Criterios de Aceptación

```
Given registry/agents/task-planner.yml
When bootstrap.py --model claude lo procesa
Then genera .claude/agents/task-planner.md con frontmatter correcto:
  name, description, tools permitidas, prompt del sistema

Given el mismo YAML
When (futuro) bootstrap.py --model openai lo procesa
Then genera config compatible con OpenAI Assistants API

Given registry/agents/react-expert.yml con campo tools: [Read, Write, Glob, Grep]
When se genera el .md para Claude
Then el frontmatter incluye exactamente esas tools
```

### Schema YAML mínimo

```yaml
name: string           # identificador
description: string    # descripción del agente
model: string          # claude-sonnet-4-5 | gpt-4o
tools:                 # lista de tools permitidas
  - Read
  - Write
system_prompt: |       # prompt del sistema (multiline)
  ...
```

**Archivos:** `registry/agents/*.yml` (7 archivos: task-planner, task-executor, tech-detector, skill-generator, react-expert, nodejs-expert, postgresql-expert)
**Complejidad:** Baja

---

## SPEC-010: Tech skill templates

**ID:** SPEC-010
**Origen:** BRECHA-3, H-020 (bootstrap once)
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Templates en `registry/{frontend,backend,database}/` que skill-generator usa para
generar SKILL.md específicos por tecnología.

### Criterios de Aceptación

```
Given registry/frontend/react.skill.template.md
When skill-generator genera .claude/skills/react-frontend/SKILL.md
Then el SKILL.md generado tiene:
  - Convenciones de componentes React
  - Patrones de hooks recomendados
  - Commands de testing (yarn test, vitest)
  - Referencias al stack del proyecto

Given .claude/skills/react-frontend/SKILL.md existe después del bootstrap
When Claude Code inicia en sesiones posteriores
Then skill disponible sin re-detección (H-020 respetado)
```

**Archivos:** `registry/frontend/react.skill.template.md`, `registry/backend/nodejs.skill.template.md`, `registry/database/postgresql.skill.template.md`
**Complejidad:** Baja

---

## SPEC-011: bootstrap.py — instalación one-shot

**ID:** SPEC-011
**Origen:** D-8 (bootstrap como entry point)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Script Python de setup inicial. Lee YAML del registry, renderiza agentes `.md`,
actualiza settings.json y genera requirements.txt. Idempotente.

### Criterios de Aceptación

```
Given proyecto limpio sin .claude/agents/
When python registry/bootstrap.py --stack "react,nodejs,postgresql" --model claude
Then en <5 minutos:
  - .claude/agents/ tiene: task-planner.md, task-executor.md, tech-detector.md,
    skill-generator.md, react-expert.md, nodejs-expert.md, postgresql-expert.md
  - .claude/settings.json tiene sección mcpServers actualizada
  - requirements.txt generado con 5 deps mínimas

Given .claude/agents/task-planner.md ya existe
When bootstrap.py sin --force
Then reporta "task-planner.md ya existe — skip"
Y no sobreescribe el archivo

Given python registry/bootstrap.py --stack "react" --model claude --force
When ejecutado con --force
Then sobreescribe todos los archivos generados

Given --model openai (futuro)
When bootstrap.py lo procesa
Then reporta "modelo openai no soportado en v3 — pendiente v4"
```

**Archivos:** `registry/bootstrap.py`
**Complejidad:** Media

---

## SPEC-012: Validación end-to-end

**ID:** SPEC-012
**Origen:** Criterios de éxito del plan
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Flujo de validación completo que verifica que todas las capacidades funcionan
en conjunto desde bootstrap hasta memoria persistente.

### Criterios de Aceptación

```
FLUJO COMPLETO:
  Step 1: python registry/bootstrap.py --stack "react,nodejs" --model claude
    → .claude/agents/*.md generados (7 archivos)
    → settings.json actualizado

  Step 2: Iniciar Claude Code → MCP servers activos
    → mcp__thyrox_memory__store y retrieve disponibles
    → mcp__thyrox_executor__exec_cmd y exec_python disponibles

  Step 3: Invocar tech-detector → detecta react + nodejs
    → skill-generator genera SKILL.md para cada uno

  Step 4: task-planner recibe "implementa endpoint GET /health"
    → produce: T-001: Crear src/health.ts [deps: ninguna]
               T-002: Registrar ruta en app.ts [deps: T-001]

  Step 5: task-executor ejecuta T-001
    → usa Write("src/health.ts", ...) — nativa
    → archivo existe

  Step 6: task-executor ejecuta T-002 + exec_cmd("yarn build")
    → usa Edit("src/app.ts", ...) — nativa
    → usa mcp__thyrox_executor__exec_cmd("yarn build")
    → build exitoso

  Step 7: mcp__thyrox_memory__store(lessons_learned)
    → persiste en .claude/memory/thyrox.faiss

  Step 8: Nueva sesión → mcp__thyrox_memory__retrieve("health endpoint")
    → retorna la lección almacenada en Step 7
```

**Complejidad:** Alta (integración de todo)

---

## Dependencias entre SPECs

```
SPEC-001 (adapter)
  ↓ dependen
SPEC-002 (memory server)
SPEC-003 (executor server)

SPEC-002 + SPEC-003
  ↓ dependen para funcionar
SPEC-004 (settings.json)

SPEC-009 (YAML registry)
  ↓ dependen
SPEC-005..SPEC-008 (agents .md, via bootstrap)
SPEC-010 (skill templates)
SPEC-011 (bootstrap.py lee YAML)

SPEC-001..SPEC-011
  ↓ todos completos
SPEC-012 (validación e2e)
```

---

## Riesgos

| Riesgo | Impacto | Prob | Mitigación |
|--------|---------|------|-----------|
| faiss-cpu incompatibilidad con Python 3.12+ | Medio | Baja | Desarrollar en Python 3.11; documentar versión soportada |
| sentence-transformers descarga modelo en primer uso (80MB) | Bajo | Alta | Documentar en README; solo ocurre una vez |
| faiss-cpu incompatibilidad con Python 3.12+ | Medio | Baja | Testear en 3.11; documentar versión soportada |
| Claude Code no encuentra MCP server en path relativo | Medio | Media | Usar path absoluto en settings.json o __file__ en server |

---

## Glosario

- **T-NNN:** Tarea atómica con ID secuencial (T-001, T-002...) producida por task-planner
- **Pure-native agent:** Agente que usa solo tools nativas Claude Code, sin MCP
- **Core services layer:** `thyrox_core.py` — implementación propia de memoria y ejecución
- **stdio transport:** Comunicación MCP via pipes stdin/stdout — sin puertos, sin servidor externo
- **Bootstrap once (H-020):** Los artefactos generados se commitean; no se regeneran en sesiones posteriores

---

## Estado de aprobación

- [ ] Spec aprobada por usuario — PENDIENTE
