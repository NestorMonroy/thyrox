```yml
ID work package: 2026-04-05-01-09-22-thyrox-capabilities-integration
Sub-análisis: Meta-framework como sistema de agentes — template replicable
Fecha: 2026-04-05
Requisitos nuevos incorporados:
  - Solicitudes atómicas (decomposición obligatoria antes de ejecutar)
  - Model-agnostic (Claude O GPT, sin lock-in)
  - Template replicable (bajo friction, bootstrap once)
  - Inspirado en EvoAgentX pero implementación propia
Fuentes anteriores: mcp-agents-architecture-analysis.md, thyrox-capabilities-integration-analysis.md
```

# Análisis: THYROX como sistema de agentes — meta-framework template

---

## El problema central que THYROX resuelve como sistema de agentes

### Lo que tenemos hoy

```
Usuario: "implementa autenticación JWT en el proyecto"
                ↓
    UN SOLO Claude (pm-thyrox SKILL cargado)
                ↓
    Claude interpreta TODO al mismo tiempo:
    - ¿Qué significa "implementar"?
    - ¿Qué tech stack?
    - ¿Qué archivos tocar?
    - ¿Cómo testear?
    - ¿Qué convenciones seguir?
                ↓
    Resultado: interpretación inconsistente
    con solicitudes vagas → trabajo incorrecto
```

### El problema detectado

> "si no somos atómicos en las solicitudes, NO es posible que el modelo
> detecte o interprete de manera correcta la solicitud del usuario"

El modelo (Claude o GPT) falla cuando recibe una solicitud que mezcla:
- Intención del usuario (QUÉ quiere lograr)
- Contexto técnico (EN QUÉ stack)
- Tarea concreta (QUÉ acción específica)
- Criterio de éxito (CÓMO saber que está bien)

Una solicitud vaga colapsa estas 4 dimensiones en una sola pregunta sin resolver.

---

## Parte I: Atomicidad — el principio arquitectónico central

### H-ATOM-01: Qué significa "solicitud atómica"

Una solicitud atómica tiene exactamente:
- **1 verbo de acción**: Create / Update / Delete / Execute / Validate
- **1 target específico**: un archivo, endpoint, componente, o comando
- **1 output verificable**: el resultado exacto esperado
- **0 ambigüedad**: no hay "dependiendo de X, hacer Y o Z"

```
❌ NO ATÓMICA:
  "implementa autenticación JWT"
  → múltiples acciones, múltiples archivos, múltiples decisiones

✓ ATÓMICA:
  "Create src/models/User.ts con campos: email (string), passwordHash (string), createdAt (Date)"
  "Create POST /api/auth/register que recibe {email, password} y devuelve {userId, token}"
  "Create POST /api/auth/login que recibe {email, password} y devuelve {token, expiresAt}"
  "Add JWT middleware a todas las rutas bajo /api/protected/*"
  "Execute: npm test -- --testPathPattern=auth para validar los 4 endpoints"
```

### H-ATOM-02: La analogía con MLflow — "Models from Code"

La imagen del usuario muestra exactamente este patrón aplicado a MLflow:

```
LEGACY (izquierda — complejo, hard to fix):
  Define Custom PythonModel → Create instance → Log Model Object
  → múltiples puntos de fallo: serialization, input schema,
    external references, unpicklable state, dependency inference
  → cuando falla: no sabes dónde ni por qué → "Hard to fix"

MODERN (derecha — simple, easy to fix):
  Define PythonModel in script → Log script as model
  → Automated validation
  → Falla en: external references, input schema (lugares conocidos)
  → "Easy to fix"
  → "If the model works in your development environment,
     it will likely work everywhere else"
```

**La traducción directa a THYROX:**

| MLflow Legacy | MLflow Modern | THYROX equivalente |
|--------------|--------------|-------------------|
| Define Custom PythonModel | Define PythonModel in script | Define agent en registry template |
| Create instance + Log Object | Log script as model | Bootstrap desde registry |
| Múltiples puntos de fallo | Automated validation | task-decomposer valida atomicidad |
| Hard to fix | Easy to fix | Cada tarea atómica falla en aislamiento |
| Works per environment | Works everywhere | Works with Claude OR GPT |

### H-ATOM-03: El TaskPlanner de EvoAgentX — qué adoptamos

EvoAgentX tiene `TaskPlanner` que descompone goals en subtareas:

```python
# EvoAgentX TaskPlanner (Python, LLM calls propias)
class TaskPlanner(Agent):
    def plan(self, goal: str) -> List[SubTask]:
        response = self.llm.generate(
            f"Decompose this goal into atomic subtasks: {goal}"
        )
        return parse_subtasks(response)
```

**Nuestro equivalente (inspirado, no copiado):**

```markdown
---
name: task-decomposer
description: "Descompone cualquier solicitud del usuario en tareas atómicas
  antes de delegarlas a agentes especializados.
  Use this agent when: el usuario hace una solicitud que involucra
  más de un archivo, más de una acción, o cuya scope no está definido.
  <example>
  input: 'implementa autenticación JWT'
  output: lista de 5 tareas atómicas con verbo + target + output esperado
  </example>"
tools: Read, mcp__thyrox_memory__retrieve
model: sonnet
---

# Task Decomposer

## Responsabilidad
Convertir solicitudes (vagas o específicas) en tareas atómicas
antes de que cualquier otro agente ejecute.

## Proceso OBLIGATORIO
1. Leer el contexto del proyecto (package.json, estructura, skills activos)
2. Recuperar tareas similares anteriores (mcp__thyrox_memory__retrieve)
3. Descomponer en tareas donde CADA tarea tenga:
   - Verbo: Create | Update | Delete | Execute | Validate
   - Target: 1 archivo o 1 comando específico
   - Output: resultado exacto y verificable
   - Agente: qué tech-expert debe ejecutarla
4. Presentar lista al usuario — NO ejecutar sin aprobación (HITL gate)

## Criterio de atomicidad
Una tarea es atómica cuando puede fallar de manera aislada
sin afectar las demás tareas de la lista.

## CAN
- Leer archivos de configuración del proyecto
- Recuperar contexto de tareas similares anteriores
- Producir lista estructurada de tareas atómicas

## CANNOT
- Ejecutar ninguna tarea
- Escribir ningún archivo del proyecto
- Decidir el orden de ejecución (eso es pm-thyrox)
```

**Por qué native agent y no Python:** El task-decomposer ES Claude razonando.
No necesita un proceso Python externo — necesita contexto del proyecto y
capacidad de razonamiento. Un native agent `.md` lo provee sin overhead.

---

## Parte II: Model-agnostic — funciona con Claude O GPT

### H-MODEL-01: El problema del lock-in actual

Los `.claude/agents/*.md` con frontmatter YAML son **Claude Code específicos**.
Un equipo que usa Cursor (GPT-4) o GitHub Copilot no puede usar los mismos archivos.

### H-MODEL-02: La solución — registry como fuente de verdad model-agnostic

El registry define el agente en formato neutro (YAML). El bootstrap genera
el formato específico al modelo del equipo:

```
registry/
└── agents/
    └── react-expert.agent.yaml      ← FUENTE DE VERDAD (model-agnostic)
        name: react-expert
        purpose: React component implementation expert
        can:
          - Implement React components following hooks pattern
          - Execute: yarn test --testPathPattern=[component]
          - Execute: yarn build to validate no TypeScript errors
        cannot:
          - Modify backend files
          - Make database queries directly
        tools:
          - filesystem_read
          - filesystem_write
          - shell_execute
        atomic_scope: one component file per task
```

**Bootstrap genera el formato correcto según el modelo:**

```bash
# Para Claude Code:
thyrox bootstrap --model claude --stack react,node,postgres
→ genera: .claude/agents/react-expert.md (con frontmatter YAML)

# Para OpenAI/GPT (Cursor, Copilot, etc.):
thyrox bootstrap --model openai --stack react,node,postgres
→ genera: .cursorrules o openai-assistants.json con la misma lógica

# En ambos casos:
→ el agente tiene el mismo CAN/CANNOT
→ el agente recibe las mismas tareas atómicas
→ el resultado es equivalente
```

### H-MODEL-03: Qué es idéntico en ambos modelos

El **comportamiento** del agente no cambia según el modelo. Lo que cambia es el formato de invocación:

| Elemento | Claude Code | GPT/OpenAI |
|----------|-------------|-----------|
| Definición del agente | `.claude/agents/react-expert.md` | `.cursorrules` o assistant config |
| Invocación | `description` field + `<example>` | System prompt o assistant instructions |
| Tools de filesystem | `Read`, `Write`, `Edit` (built-in) | `file_read`, `file_write` (tool calling) |
| Tools de ejecución | `mcp__thyrox_executor__exec_cmd` | MCP o function calling a executor |
| Memoria semántica | `mcp__thyrox_memory__retrieve` | Mismo MCP server (protocolo estándar) |
| Atomicidad | Garantizada por task-decomposer | Misma garantía (mismo agente) |

**Los MCP servers son model-agnostic por definición:** MCP es un estándar abierto
que funciona con cualquier LLM que soporte tool calling. El `thyrox-memory` y
`thyrox-executor` MCP servers no saben si los llama Claude o GPT-4.

---

## Parte III: Agentes del sistema — 4 core + N generados

### El sistema completo de agentes

```
NIVEL 0 — ORQUESTADOR (ya existe, sin cambio)
  pm-thyrox SKILL.md
  → conoce las 7 fases del SDLC
  → NO conoce tecnologías específicas
  → delega a agentes según la fase

NIVEL 1 — AGENTES CORE (4 agentes, siempre presentes)
  task-decomposer.md   → descompone solicitudes vagas en atómicas (NUEVO)
  tech-detector.md     → detecta stack del proyecto (NUEVO)
  skill-generator.md   → genera skills + agentes desde registry (NUEVO)
  memory-manager.md    → gestiona cuándo indexar y qué recuperar (NUEVO)

NIVEL 2 — AGENTES GENERADOS (N agentes, uno por tech stack detectado)
  react-expert.md      → generado en bootstrap para proyectos React
  nodejs-expert.md     → generado para proyectos Node.js
  postgresql-expert.md → generado para proyectos PostgreSQL
  [tech]-expert.md     → generado para cada tech en registry/

INFRAESTRUCTURA MCP (2 servidores Python, siempre activos)
  thyrox-memory        → LongTermMemory + FAISS (EvoAgentX memory/)
  thyrox-executor      → CMDToolkit + PythonInterpreterToolkit (EvoAgentX tools/)
```

### Flujo completo con agentes y atomicidad

```
USUARIO: "implementa autenticación JWT con refresh tokens"
                ↓
PASO 1 — task-decomposer (NIVEL 1)
  Lee: package.json, estructura del proyecto, skills activos
  Recupera: mcp__thyrox_memory__retrieve("autenticación JWT proyectos anteriores")
  Produce: lista de 7 tareas atómicas
    [T-001] Create src/models/User.ts {email, passwordHash, refreshToken} [nodejs-expert]
    [T-002] Create POST /api/auth/register endpoint [nodejs-expert]
    [T-003] Create POST /api/auth/login → {accessToken, refreshToken} [nodejs-expert]
    [T-004] Create POST /api/auth/refresh → nuevo accessToken [nodejs-expert]
    [T-005] Create JWT middleware para rutas protegidas [nodejs-expert]
    [T-006] Create src/components/LoginForm.tsx [react-expert]
    [T-007] Execute: npm test -- --testPathPattern=auth [nodejs-expert]
  HITL: presenta lista al usuario → espera aprobación

PASO 2 — pm-thyrox SKILL (NIVEL 0)
  Registra tareas en task-plan.md
  Inicia Phase 6 EXECUTE

PASO 3 — nodejs-expert ejecuta T-001 (NIVEL 2)
  Recibe: tarea ATÓMICA "Create src/models/User.ts con campos X, Y, Z"
  Usa: Write (escribe el archivo)
  Usa: mcp__thyrox_executor__exec_cmd("npx tsc --noEmit") para validar types
  Resultado: ✓ o error aislado en T-001 solamente

PASO 4..N — cada tarea atómica ejecutada por el agente correcto
  Cada fallo es aislado → fácil de identificar y corregir (MLflow analogy: "easy to fix")

PASO FINAL — memory-manager
  Usa: mcp__thyrox_memory__store(lessons_learned, {task: "jwt-auth", stack: "nodejs"})
  Próxima vez: task-decomposer tiene contexto de esta implementación
```

---

## Parte IV: Qué adoptamos de EvoAgentX (transformado a nuestro sistema)

### Patrones de EvoAgentX que adaptamos

| Patrón EvoAgentX | Implementación EvoAgentX | Nuestra adaptación |
|-----------------|--------------------------|-------------------|
| `TaskPlanner` | Clase Python con LLM calls propias | `task-decomposer.md` native agent |
| `BaseModule` + `MODULE_REGISTRY` | Registro Python de clases por `class_name` | `registry/` directory con templates YAML |
| `WorkFlowGraph` DAG | Grafo Python de nodos y edges | 7 fases SDLC de pm-thyrox (ya existe) |
| `AgentManager` pool | Python: gestiona lista de agentes | Claude Code invoca por `description` |
| `ShortTermMemory` | Buffer Python en memoria | Ventana de contexto de Claude/GPT |
| `LongTermMemory` + FAISS | Python: EvoAgentX lo implementa | MCP server `thyrox-memory` lo expone |
| `CMDToolkit` | Python: subprocess wrapper | MCP server `thyrox-executor` lo expone |
| `WorkFlowReviewer` | TODO (no implementado) | task-decomposer hace la revisión ANTES |

### Lo que EvoAgentX NO tiene que nosotros sí

| Nuestra característica | Por qué importa |
|----------------------|----------------|
| Model-agnostic templates | EvoAgentX hardcodea LiteLLMModel — nosotros no hardcodeamos nada |
| Registry como fuente de verdad | EvoAgentX define agentes en Python — nosotros en YAML templates versionados |
| HITL como gate de fase (Markdown) | EvoAgentX tiene GUI para HITL — nosotros usamos aprobación en texto |
| Atomicity enforcement | EvoAgentX no valida atomicidad — nosotros lo hacemos obligatorio |
| Bootstrap once, git persist | EvoAgentX recrea agentes en memoria cada vez — nosotros los commiteamos |

---

## Parte V: Template replicable — "bootstrap once, works everywhere"

### El requisito

> "lo que nosotros queremos es que lo que estamos haciendo sirva como template,
> y sea fácil replicar, sin que demore mucho integrarlo en su flujo"

### Diseño del bootstrap (analogía: MLflow "Models from Code")

```
PROYECTO NUEVO que quiere usar THYROX:

Paso 1 — clonar/instalar (1 minuto):
  git submodule add https://github.com/nestormonroy/thyrox .thyrox
  # O: pip install thyrox (si se empaqueta)

Paso 2 — bootstrap (1 comando):
  thyrox init --stack "react,nodejs,postgresql" --model claude
  # O: thyrox init --stack "vue,fastapi,mongodb" --model openai

  Resultado automático:
  ├── .claude/
  │   ├── CLAUDE.md          (generado, imperativo, 15 líneas)
  │   ├── skills/pm-thyrox/  (copiado desde .thyrox)
  │   ├── agents/
  │   │   ├── task-decomposer.md   (core, siempre)
  │   │   ├── tech-detector.md     (core, siempre)
  │   │   ├── react-expert.md      (generado por stack)
  │   │   ├── nodejs-expert.md     (generado por stack)
  │   │   └── postgresql-expert.md (generado por stack)
  │   └── guidelines/
  │       ├── react.instructions.md    (generado)
  │       └── nodejs.instructions.md  (generado)
  ├── registry/mcp/
  │   ├── memory_server.py    (copiado)
  │   └── executor_server.py  (copiado)
  └── settings.json           (generado con mcpServers)

Paso 3 — empezar a trabajar (0 minutos):
  El equipo ya tiene agentes especializados funcionando.
  pm-thyrox SKILL activo. Memoria semántica lista.
  task-decomposer asegura atomicidad desde el primer request.

TOTAL: < 5 minutos desde cero hasta sistema de agentes operativo
```

### Validación automática (el punto "easy to fix" de MLflow)

Durante el bootstrap, el sistema valida:
```
✓ registry/mcp/memory_server.py importa sin errores
✓ registry/mcp/executor_server.py importa sin errores
✓ faiss-cpu instalado
✓ sentence-transformers instalado
✓ .claude/agents/ contiene los 4 core agents
✓ settings.json tiene mcpServers configurados
✗ Error: postgresql no tiene template en registry/database/
  → Acción: usar template genérico o agregar al registry
```

Si algo falla en validación → falla en un lugar conocido → "easy to fix".
Si todo pasa → "works in dev → works everywhere" (mismo comportamiento con Claude o GPT).

---

## Parte VI: Por qué esto resuelve los objetivos de AI agents

Mapeando los objetivos del usuario a nuestra arquitectura:

| Objetivo AI agents | Cómo lo resuelve THYROX |
|-------------------|------------------------|
| **Modular Components** | Cada agente `.md` tiene responsabilidad única (CAN/CANNOT) |
| **Collaboration** | task-decomposer → tech-experts → memory-manager: pipeline colaborativo |
| **Human-Agent Collaboration** | HITL gate en task-decomposer: humano aprueba lista antes de ejecutar |
| **Process Orchestration** | pm-thyrox SKILL coordina las 7 fases; agentes ejecutan por fase |
| **Autonomy** | tech-experts ejecutan tareas atómicas sin intervención humana |
| **Goal-Oriented** | task-decomposer convierte cualquier goal en plan ejecutable |
| **Multi-Agent Collaboration** | react-expert + nodejs-expert + postgresql-expert colaboran en Phase 6 |

---

## Resumen: hallazgos de este análisis

| ID | Hallazgo | Acción |
|----|----------|--------|
| H-ATOM-01 | Solicitudes no atómicas = modelo no interpreta correctamente | `task-decomposer.md` obligatorio como primer agente |
| H-ATOM-02 | Analogía MLflow: atómico = easy to fix, monolítico = hard to fix | Cada agente recibe 1 tarea con 1 output |
| H-ATOM-03 | TaskPlanner de EvoAgentX → nuestro task-decomposer native | Implementar como native agent, no Python |
| H-MODEL-01 | `.claude/agents/*.md` es Claude-specific | Templates YAML en registry como fuente neutral |
| H-MODEL-02 | Registry → render a Claude format O GPT format | `thyrox init --model [claude|openai]` |
| H-MODEL-03 | MCP servers son model-agnostic por protocolo | thyrox-memory y thyrox-executor funcionan con cualquier LLM |
| H-SYS-01 | 4 agentes core siempre presentes + N generados por stack | Arquitectura de 2 niveles: core + tech-experts |
| H-SYS-02 | HITL gate en task-decomposer antes de ejecutar | Humano aprueba lista atómica → autonomía en ejecución |
| H-TMPL-01 | Bootstrap en < 5 min: `thyrox init --stack X --model Y` | Un comando instala todo el sistema |
| H-TMPL-02 | Validación automática al bootstrap | Falla en lugar conocido → easy to fix |
| H-EVO-01 | EvoAgentX restringido: solo memory/ + tools/ | No usar agents/, workflow/, optimizers/ |
