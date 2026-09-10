```yml
Sub-análisis: Meta-framework como template replicable — arquitectura v3
wp: 2026-04-05-01-09-22-thyrox-capabilities-integration
created_at: 2026-04-05 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
Nuevos requisitos incorporados:
  - Solicitudes atómicas: descomposición obligatoria antes de ejecutar
  - Model-agnostic: funciona con Claude Y GPT
  - Template replicable: bootstrap rápido, bajo friction
  - Inspiración EvoAgentX: patrones adoptados, no copiados
Reemplaza parcialmente: mcp-agents-architecture-analysis.md (amplía, no contradice)
```

# Análisis: Meta-framework como Template Replicable

## El problema central — la imagen de MLflow aplicada a THYROX

La imagen compartida muestra dos journeys de MLflow. La analogía directa:

```
LEGACY (izquierda — lo que THYROX hace HOY):
  Usuario: "implementa autenticación"
       ↓
  Claude recibe solicitud vaga
       ↓
  Intenta interpretar todo a la vez ← FAILURE POINT: ambigüedad
       ↓
  Genera código / docs
       ↓
  ¿Funciona? → NO → Hard to fix (no sabemos dónde falló la interpretación)

MODERN (derecha — lo que THYROX v2 debe ser):
  Usuario: "implementa autenticación"
       ↓
  TaskPlanner descompone en subtareas atómicas ← automated validation
       ↓
  Cada subtarea: acción clara + archivo único + output esperado
       ↓
  Agente especializado ejecuta cada subtarea
       ↓
  ¿Funciona? → NO → Easy to fix (sabemos exactamente qué subtarea falló)

"If it works in your development environment, it will likely work everywhere else"
→ En THYROX: si el template funciona con Claude, funciona con GPT.
```

---

## Hallazgo 1: La atomicidad NO es opcional

### El problema detectado

El usuario identificó algo fundamental sobre los LLMs:

> "si no somos atómicos en las solicitudes, NO es posible que el modelo detecte
> o interprete de manera correcta la solicitud del usuario, esta puede ser
> desde muy vaga hasta específica"

Esto se confirma con lo visto en EvoAgentX: su `TaskPlanner` no es un feature
adicional — es la **capa obligatoria** que convierte cualquier goal en subtareas
ejecutables antes de enviarlas a los agentes.

### Por qué un LLM falla con solicitudes no atómicas

```
SOLICITUD VAGA:
  "implementa el módulo de pagos"
  → El modelo debe adivinar: ¿Stripe o PayPal? ¿webhook o polling? ¿qué endpoints?
  → Resultado: implementación incompleta, asunciones incorrectas, difícil de debuggear

SOLICITUD ESPECÍFICA PERO NO ATÓMICA:
  "implementa Stripe con webhooks, maneja eventos payment_intent.succeeded
   y payment_intent.payment_failed, guarda en PostgreSQL, envía email de confirmación"
  → Demasiados concerns en una sola tarea → el modelo puede olvidar alguno
  → Resultado: implementación parcial

SOLICITUD ATÓMICA:
  "Crea endpoint POST /api/webhooks/stripe que recibe y valida la firma Stripe"
  → Una acción, un archivo, un output claro
  → El modelo no puede malinterpretar
  → Si falla, el error es localizado y fácil de corregir
```

### La capa obligatoria: TaskPlanner propio

Inspirado en `TaskPlanner` de EvoAgentX pero implementado como **agente nativo**:

```markdown
# .claude/agents/task-planner.md

---
name: task-planner
description: "SIEMPRE invocar antes de cualquier tarea de implementación.
  Convierte solicitudes vagas o específicas en subtareas atómicas.
  Use this agent when: el usuario pide implementar, crear, modificar,
  refactorizar, o cualquier acción de código.
  <example>
  usuario: implementa autenticación JWT
  acción: descompone en 6-8 subtareas atómicas antes de ejecutar
  </example>"
tools: Read, Glob, Grep
model: sonnet
---

## Criterios de atomicidad — una subtarea DEBE cumplir TODOS:

1. **Una acción**: Create | Update | Delete | Move | Rename | Execute — solo una
2. **Un artefacto**: un archivo, un endpoint, una función — no "los archivos de auth"
3. **Output verificable**: existe el archivo X / el test pasa / el endpoint responde 200
4. **Sin decisiones implícitas**: todas las opciones ya están tomadas, no hay "elige entre..."
5. **Independiente o con dependencia explícita**: "depende de T-001" — no asumida

## Formato de output obligatorio:

Para cada subtarea:
T-NNN: [verbo] [artefacto específico]
  Input:  qué necesita para ejecutarse
  Output: qué produce exactamente
  Agent:  qué agente la ejecuta (react-expert | nodejs-expert | task-executor)
  Test:   cómo verificar que funcionó
```

### Diferencia entre TaskPlanner de EvoAgentX y el nuestro

| Aspecto | EvoAgentX TaskPlanner | Nuestro task-planner |
|---------|----------------------|---------------------|
| Implementación | Clase Python que llama al LLM propio | Agente `.md` nativo — usa Claude |
| Invocación | `wf_generator.plan(goal)` en código | Claude lo invoca por `description` |
| Output | Lista de `SubTask` Python objects | Markdown con T-NNN formateado |
| Integración | Con `AgentManager` Python | Con pm-thyrox SKILL y otros agentes |
| Control | EvoAgentX framework | Nosotros — instrucciones en Markdown |
| Modelo | Configurable (GPT-4, Claude, etc.) | El modelo activo (Claude o GPT) |

---

## Hallazgo 2: Model-agnostic — el problema real

### El lock-in actual

Los `.claude/agents/*.md` son **Claude Code específicos**. Si el usuario trabaja
con Cursor + GPT-4, o VS Code + Copilot, o Windsurf + Claude, esos agentes
no funcionan fuera del ecosistema Claude Code.

### La solución: Registry como fuente de verdad model-agnostic

La clave es separar **la definición del comportamiento** (model-agnostic)
de **el formato de integración** (model-specific):

```
registry/
└── agents/
    └── task-planner.agent.yaml    ← DEFINICIÓN (model-agnostic)

Al hacer bootstrap:
  → render para Claude Code  → .claude/agents/task-planner.md
  → render para OpenAI       → openai-assistants/task-planner.json (futuro)
  → render para cualquier LLM que soporte tool calling
```

### El formato YAML model-agnostic en registry

```yaml
# registry/agents/task-planner.agent.yaml

agent:
  name: task-planner
  version: "1.0"
  purpose: >
    Decomposes vague or specific user requests into atomic subtasks
    before any implementation agent executes.

  trigger:
    # Claude Code: description field → auto-invoke
    # GPT: system prompt prefix or function definition
    when:
      - "user requests any implementation, creation, or modification"
      - "input contains: implement, create, build, add, modify, refactor"
    examples:
      - input: "implement JWT authentication"
        action: "decompose into 6-8 atomic subtasks"

  constraints:
    can:
      - read project files to understand context
      - ask clarifying questions if critical info is missing
      - produce atomic task list in standard format
    cannot:
      - write any files
      - execute any commands
      - make architectural decisions

  output_format:
    type: structured_task_list
    schema:
      task_id: "T-NNN"
      verb: "Create|Update|Delete|Move|Execute"
      artifact: "specific file/endpoint/function"
      input: "what it needs"
      output: "what it produces"
      agent: "which agent executes it"
      test: "how to verify"

  atomicity_criteria:
    - single_action: true
    - single_artifact: true
    - verifiable_output: true
    - no_implicit_decisions: true
    - explicit_dependencies: true

# Renderizado para Claude Code:
render:
  claude_code:
    file: ".claude/agents/task-planner.md"
    frontmatter:
      tools: ["Read", "Glob", "Grep"]
      model: "sonnet"
      color: "yellow"

# Renderizado para OpenAI (futuro):
  openai:
    file: "openai-config/assistants/task-planner.json"
    format: "assistant_api_v2"
```

### Qué cambia por modelo

| Elemento | Claude Code | GPT-4 (Cursor/API) |
|----------|------------|-------------------|
| Agente definition | `.claude/agents/*.md` | System prompt / Assistant config |
| Auto-invocación | `description` field | Function calling / tool definition |
| MCP tools | `mcp__thyrox_*` nativo | OpenAI tools JSON (mismo protocolo) |
| SKILL.md | Cargado automáticamente | Como system prompt / RAG context |
| Registry render | `skill-generator.md` → Write | `bootstrap.py --model openai` |

**Lo que es IDÉNTICO en ambos modelos:**
- Los MCP servers (thyrox-memory, thyrox-executor) — MCP es model-agnostic
- La estructura del registry (`registry/`)
- Los artefactos producidos (SKILL.md, .instructions.md, task lists)
- El flujo de 7 fases (ANALYZE → TRACK)
- La atomicidad de las tareas

---

## Hallazgo 3: Template replicable — "Models from Code" para agentes

### El paralelo exacto con la imagen MLflow

```
MLflow "Models from Code":          THYROX "Skills from Registry":

Define PythonModel in script        Define agent in registry YAML
       ↓                                    ↓
Log script as model                 Bootstrap from registry
       ↓                                    ↓
Automated validation                TaskPlanner validates atomicity
       ↓                                    ↓
Register Model                      git commit (skills viven en git)
       ↓                                    ↓
Deploy Model                        Agents active in .claude/agents/
       ↓                                    ↓
Use the model                       Use the agent

"Easy to fix" when it fails         Atomic tasks → fallo localizado
"Works everywhere"                  Works with Claude OR GPT
```

### Lo que hace replicable un template

Un proyecto nuevo debería poder integrar THYROX en **menos de 5 minutos**:

```bash
# OPCIÓN A: Bootstrap completo (proyecto nuevo)
git clone https://github.com/thyrox/thyrox-template .thyrox
python .thyrox/bootstrap.py --stack "react,nodejs,postgresql" --model claude

# Resultado inmediato:
.claude/
├── CLAUDE.md                (generado — 15 líneas imperativas)
├── skills/pm-thyrox/        (copiado desde template)
├── agents/
│   ├── task-planner.md      (generado desde registry)
│   ├── tech-detector.md     (generado desde registry)
│   ├── skill-generator.md   (generado desde registry)
│   ├── react-expert.md      (generado desde react.agent.yaml)
│   ├── nodejs-expert.md     (generado desde nodejs.agent.yaml)
│   └── postgresql-expert.md (generado desde postgresql.agent.yaml)
├── guidelines/
│   ├── react.instructions.md
│   └── nodejs.instructions.md
└── memory/                  (vacío — se llena con el uso)
registry/mcp/
├── memory_server.py
└── executor_server.py
settings.json                (mcpServers configurado)

git add . && git commit -m "feat(thyrox): bootstrap React+Node+PostgreSQL stack"

# OPCIÓN B: Proyecto existente (agregar tech skill)
python .thyrox/bootstrap.py --add "vue" --model claude
```

### La estructura del template en sí

```
thyrox-template/               ← el repo que se instala
├── bootstrap.py               ← script de bootstrap (único punto de entrada)
├── registry/
│   ├── agents/
│   │   ├── task-planner.agent.yaml    ← REQUERIDO en todo proyecto
│   │   ├── tech-detector.agent.yaml
│   │   ├── skill-generator.agent.yaml
│   │   └── task-executor.agent.yaml   ← ejecuta tareas atómicas genéricas
│   ├── frontend/
│   │   ├── react.agent.yaml
│   │   ├── react.skill.template.md
│   │   └── react.instructions.template.md
│   ├── backend/
│   │   ├── nodejs.agent.yaml
│   │   └── nodejs.skill.template.md
│   ├── database/
│   │   └── postgresql.agent.yaml
│   └── mcp/
│       ├── _evoagentx_adapter.py
│       ├── memory_server.py
│       └── executor_server.py
├── skills/
│   └── pm-thyrox/             ← skill base (no se modifica)
└── templates/
    ├── CLAUDE.md.template     ← template de CLAUDE.md imperativo
    └── settings.json.template ← template de settings con mcpServers
```

---

## Hallazgo 4: Patrones de EvoAgentX que adoptamos (transformados)

### 4.1 TaskPlanner → task-planner.md (nuestro)

**EvoAgentX:** Clase Python, llama al LLM propio, retorna `List[SubTask]` Python
**Nuestro:** Agente `.md`, usa Claude nativo, retorna lista Markdown `T-NNN`

La diferencia arquitectónica: EvoAgentX crea un `TaskPlanner` por workflow.
Nosotros tenemos UN `task-planner.md` que Claude invoca para CUALQUIER solicitud.
Es el guardián de la atomicidad — ningún agente ejecuta sin que task-planner valide.

### 4.2 BaseModule + MODULE_REGISTRY → registry/ (nuestro)

**EvoAgentX:** `BaseModule` con `MODULE_REGISTRY` Python — cualquier clase puede
ser serializada/deserializada por nombre string. Permite cargar componentes dinámicamente.

**Nuestro:** `registry/` con YAML templates — cualquier tecnología puede ser
"cargada" como un conjunto de archivos generados. El nombre string es el directorio
(`react`, `nodejs`, `postgresql`).

La diferencia: EvoAgentX hace registro en Python runtime.
Nosotros hacemos registro en filesystem — más simple, más portable, más git-friendly.

### 4.3 Dual sync/async → MCP servers (thyrox-executor)

**EvoAgentX:**
```python
def __call__(self, *args, **kwargs):
    try:
        asyncio.get_running_loop()
        return self.async_execute(...)  # async context (FastAPI)
    except RuntimeError:
        return self.execute(...)         # sync context (scripts)
```

**Nuestro:** Los MCP servers manejan esto implícitamente.
El cliente MCP (Claude Code) hace tool calls; el server las procesa.
No necesitamos el patrón explícito porque MCP abstrae el transport.

### 4.4 WorkFlowGraph → las 7 fases de pm-thyrox (nuestro)

**EvoAgentX:** DAG Python con `WorkFlowNode` + `WorkFlowEdge`.
Define explícitamente: "A antes que B, C paralelo con D".

**Nuestro:** Las 7 fases del SKILL son el workflow graph — definido en Markdown.
Las fases tienen entrada/salida documentada y exit criteria.
El "DAG" es textual: Phase 1 → Phase 2 → ... → Phase 7.

La diferencia: EvoAgentX es determinista (grafo fijo). Nuestro es adaptativo
(Claude puede saltar fases según tamaño del trabajo).

### 4.5 Agentes especializados por responsabilidad → nuestros agentes core

**EvoAgentX tiene:**
- `TaskPlanner` — descompone goals
- `AgentGenerator` — crea configs de agentes
- `LongTermMemoryAgent` — integra memoria en el workflow

**Nosotros tenemos (análogo, implementado como agentes nativos):**
- `task-planner.md` — descompone solicitudes en tareas atómicas ← NUEVO
- `skill-generator.md` — crea skills desde registry (≈ AgentGenerator)
- `tech-detector.md` — detecta stack (input para skill-generator)
- `task-executor.md` — ejecuta tareas atómicas usando MCP executor ← NUEVO

---

## Hallazgo 5: El agente task-executor — cierre de la BRECHA-1

La BRECHA-1 (los tech skills no ejecutan código) se cierra con DOS agentes, no uno:

```
SOLICITUD USUARIO
      ↓
task-planner.md           ← descompone en T-001, T-002, ..., T-N (atómicos)
      ↓
[tech]-expert.md          ← aplica convenciones tech-específicas a cada T-NNN
      ↓
task-executor.md          ← ejecuta usando mcp__thyrox_executor__exec_cmd
      ↓
RESULTADO + VALIDACIÓN
```

**task-planner** sabe QUÉ hacer (descomponer)
**[tech]-expert** sabe CÓMO hacerlo (convenciones React/Node/etc.)
**task-executor** sabe EJECUTARLO (shell, tests, git commit)

```markdown
# .claude/agents/task-executor.md

---
name: task-executor
description: "Ejecuta una tarea atómica específica (T-NNN) usando herramientas
  de ejecución. Siempre recibe una tarea del task-planner, nunca interpreta
  solicitudes vagas.
  <example>
  input: T-003: Create POST /api/auth/login endpoint in src/routes/auth.js
  acción: escribe el archivo, ejecuta tests, hace commit
  </example>"
tools: Read, Write, Edit, mcp__thyrox_executor__exec_cmd, mcp__thyrox_executor__exec_python
model: sonnet
---

## Reglas de operación

1. SOLO ejecutar tareas con formato T-NNN (atómicas). Si la solicitud no tiene
   este formato, rechazar y pedir al usuario que ejecute task-planner primero.
2. Antes de ejecutar: leer el archivo afectado si existe
3. Después de ejecutar: correr el test especificado en la tarea
4. Si el test falla: máximo 2 reintentos, luego escalar al usuario
5. Siempre hacer commit con Conventional Commits al completar exitosamente
```

---

## Arquitectura v3 — Completa y corregida

```
THYROX META-FRAMEWORK v3
════════════════════════════════════════════════════════════════

LAYER 0: REGISTRY (fuente de verdad — model-agnostic)
════════════════════════════════════════════════════════════════

registry/
├── agents/                          ← definiciones YAML portables
│   ├── task-planner.agent.yaml      ← descomposición atómica (NUEVO)
│   ├── task-executor.agent.yaml     ← ejecución atómica (NUEVO)
│   ├── tech-detector.agent.yaml
│   ├── skill-generator.agent.yaml
│   └── [tech].agent.yaml            ← por cada tecnología
├── frontend/react.*
├── backend/nodejs.*
├── database/postgresql.*
└── mcp/
    ├── _evoagentx_adapter.py
    ├── memory_server.py
    └── executor_server.py

bootstrap.py                         ← único punto de entrada
  --stack "react,nodejs,postgresql"  ← genera todo lo necesario
  --model claude|openai              ← renderiza para el modelo correcto
  --add "vue"                        ← agrega tech skill a proyecto existente

════════════════════════════════════════════════════════════════
LAYER 1: ORQUESTACIÓN (generada desde registry)
════════════════════════════════════════════════════════════════

.claude/                             ← generado por bootstrap.py
├── CLAUDE.md                        ← 15 líneas imperativas (auto-generado)
├── skills/pm-thyrox/SKILL.md        ← copiado desde template (sin cambio)
├── agents/
│   ├── task-planner.md              ← render de task-planner.agent.yaml
│   ├── task-executor.md             ← render de task-executor.agent.yaml
│   ├── tech-detector.md             ← render de tech-detector.agent.yaml
│   ├── skill-generator.md           ← render de skill-generator.agent.yaml
│   ├── react-expert.md              ← render de react.agent.yaml
│   ├── nodejs-expert.md             ← render de nodejs.agent.yaml
│   └── postgresql-expert.md         ← render de postgresql.agent.yaml
├── guidelines/
│   ├── react.instructions.md        ← always-on conventions
│   └── nodejs.instructions.md
└── memory/thyrox.faiss              ← índice semántico

════════════════════════════════════════════════════════════════
LAYER 2: MCP SERVERS (puente Python → Claude/GPT)
════════════════════════════════════════════════════════════════

thyrox-memory MCP server:
  mcp__thyrox_memory__store(content, metadata)
  mcp__thyrox_memory__retrieve(query, top_k)
  → EvoAgentX: LongTermMemory + FAISS-cpu + sentence-transformers

thyrox-executor MCP server:
  mcp__thyrox_executor__exec_cmd(cmd, cwd)
  mcp__thyrox_executor__exec_python(code)
  mcp__thyrox_executor__read_file(path)
  mcp__thyrox_executor__write_file(path, content)
  → EvoAgentX: CMDToolkit + PythonInterpreterToolkit + FileToolkit

════════════════════════════════════════════════════════════════
FLUJO COMPLETO — solicitud vaga a resultado atómico
════════════════════════════════════════════════════════════════

USUARIO: "implementa autenticación JWT"
  ↓
[pm-thyrox SKILL detecta tarea de implementación]
  ↓
Agent(task-planner)
  → lee: src/, package.json (contexto del proyecto)
  → recupera: mcp__thyrox_memory__retrieve("autenticación proyectos anteriores")
  → produce:
      T-001: Create User model in src/models/User.js
      T-002: Create POST /api/auth/register in src/routes/auth.js
      T-003: Create POST /api/auth/login returning JWT in src/routes/auth.js
      T-004: Create JWT middleware in src/middleware/auth.js
      T-005: Add auth middleware to protected routes in src/app.js
      T-006: Write integration tests in tests/auth.test.js
  ↓
[Para cada T-NNN]:
Agent(nodejs-expert)         ← aplica convenciones Node.js al T-NNN
  + Agent(task-executor)     ← ejecuta con mcp__thyrox_executor__exec_cmd
      → "npm test tests/auth.test.js" → si pasa → commit
  ↓
Phase 7 TRACK:
  mcp__thyrox_memory__store(lessons, {wp: "...", tech: "nodejs"})
```

---

## Resumen de hallazgos v3

| ID | Hallazgo | Impacto |
|----|----------|---------|
| H-ATOM-01 | Atomicidad es prerequisito — solicitudes no atómicas producen interpretación incorrecta | Arquitectónico — task-planner obligatorio |
| H-ATOM-02 | task-planner + task-executor son dos agentes distintos: uno planifica, otro ejecuta | Diseño de agentes |
| H-MODEL-01 | Registry YAML es model-agnostic; el render produce el formato correcto por modelo | Arquitectónico — portabilidad |
| H-MODEL-02 | MCP protocol es model-agnostic — funciona con Claude y GPT (ambos soportan tool calling) | Implementación |
| H-TMPL-01 | bootstrap.py como único punto de entrada: `--stack`, `--model`, `--add` | UX del meta-framework |
| H-TMPL-02 | "Works everywhere" = si el template funciona en dev, funciona con cualquier modelo | Filosofía de diseño |
| H-EVO-01 | TaskPlanner pattern adoptado como task-planner.md nativo (no Python class) | Implementación |
| H-EVO-02 | BaseModule registry pattern adoptado como registry/ filesystem (más simple, más portable) | Implementación |
| H-EVO-03 | WorkFlowGraph adoptado como las 7 fases de pm-thyrox (Markdown, adaptativo) | Implementación |
| H-AGENT-01 | 6 agentes core: task-planner, task-executor, tech-detector, skill-generator, [tech]-expert(N) | Diseño completo |
