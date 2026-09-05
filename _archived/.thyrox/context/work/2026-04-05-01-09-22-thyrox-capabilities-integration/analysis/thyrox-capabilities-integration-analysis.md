```yml
work_package_id: 2026-04-05-01-09-22-thyrox-capabilities-integration
created_at: 2026-04-05 23:00:00  # hora estimada — corregido FASE 35 (2026-04-14), WP histórico sin hora original
Hora: 01-09-22
phase: Phase 1 — ANALYZE
type: Análisis de capacidades faltantes + integración EvoAgentX
Restricciones: Sin CLI, Sin GUI, Sin REST API (app/ layer excluido)
Fuentes: voltfactory-adaptation-analysis.md (H-014, H-019, H-020) + evoagentx-analysis.md (H-001..H-013)
```

# Análisis: Capacidades faltantes en THYROX — Integración con EvoAgentX

## Propósito

Identificar qué capacidades de ejecución, memoria semántica y agentes especializados
necesita THYROX para cumplir su visión como **meta-framework generativo**,
y qué ofrece EvoAgentX para cerrar esas brechas.

---

## Contexto obligatorio — La visión real de THYROX

Antes de cualquier análisis, es crítico entender qué ES y qué QUIERE SER THYROX.

### Lo que THYROX ES hoy

THYROX es un **framework de PM para Claude Code**: metodología 7 fases (ANALYZE → TRACK)
empaquetada como un Anthropic Skill. Todo son artefactos Markdown + Git.
Un solo Claude Code ejecuta las 7 fases sin agentes especializados.

### Lo que THYROX QUIERE SER (H-014, voltfactory-adaptation-analysis.md)

**THYROX es un meta-framework generativo.** Su objetivo NO es gestionar proyectos
manualmente — es **auto-generar el stack de skills de Claude Code** adaptado a
cada tecnología detectada:

```
Usuario dice: "Proyecto React + Node.js + PostgreSQL"
                        ↓
        THYROX Phase 1: Tech Detection
                        ↓
    Auto-genera:
    .claude/skills/react-frontend/SKILL.md
    .claude/skills/nodejs-backend/SKILL.md
    .claude/skills/postgresql-db/SKILL.md
    .claude/guidelines/react.instructions.md
    .claude/guidelines/nodejs.instructions.md
    .claude/guidelines/project-conventions.instructions.md
```

### La arquitectura de dos ejes (ADR-012, H-019)

```
Eje 1 — Gestión (pm-thyrox):   CUÁNDO y CÓMO documentar (fases, artefactos, gates)
Eje 2 — Tecnología (tech skills): CÓMO implementar en una tech específica

pm-thyrox no conoce React.
react-frontend no conoce fases SDLC.
Ninguno reemplaza al otro.
```

### Bootstrap once, use forever (H-020)

Los tech skills se generan **una sola vez** y viven en git permanentemente.
En sesiones posteriores, ya están ahí — sin re-detección.

```
SESIÓN 1 — Bootstrap:
  tech-detector → skill-generator → git commit
  → .claude/skills/react-frontend/ creado (permanente)

SESIÓN 2, 3, N — Normal:
  session-start detecta skills existentes → Claude los aplica automáticamente
```

---

## Las 3 brechas críticas

### BRECHA-1: Los tech skills NO ejecutan código — todo es texto

**Estado actual:**
- Phase 6 EXECUTE produce documentación sobre qué hacer
- Claude Code escribe el código pero no hay agente que lo ejecute, pruebe ni valide
- No hay loop de feedback: "escribir → ejecutar → verificar → corregir"

**Por qué importa para el meta-framework:**
Si los tech skills generados desde el registry son solo Markdown de convenciones,
un dev senior puede usar THYROX sin ayuda real. El meta-framework solo tiene valor
si los tech skills pueden *hacer* trabajo real: ejecutar tests, hacer commits,
verificar builds — no solo documentar cómo hacerlo.

**Gap concreto en Phase 6:**
```
HOY:
  pm-thyrox dice: "implementar según task-plan, commit convencional"
  react-frontend dice: "naming PascalCase, tests con RTL"
  → Claude escribe el plan, el dev hace el trabajo

META-FRAMEWORK OBJETIVO:
  pm-thyrox dice: "implementar según task-plan"
  react-frontend AGENT ejecuta: yarn test, git commit, corrige errores
  → Claude + agente hacen el trabajo
```

---

### BRECHA-2: THYROX no recuerda entre sesiones semánticamente

**Estado actual:**
- `focus.md` y `now.md` son texto plano — requieren lectura completa cada sesión
- `context/work/` crece con artefactos Markdown sin indexación semántica
- No hay forma de preguntar: "¿qué decidimos sobre autenticación en el WP anterior?"
- En proyectos grandes, el contexto previo se pierde o requiere leer decenas de archivos

**Por qué importa para el meta-framework:**
El meta-framework aprende qué registry templates funcionaron bien, qué tech skills
generados necesitaron correcciones, qué convenciones se violaron más. Sin memoria
semántica entre sesiones, cada proyecto empieza desde cero — perdiendo el aprendizaje
del meta-framework mismo.

**Gap concreto:**
```
HOY:
  Sesión 5: "¿cuáles fueron los problemas con el skill de PostgreSQL en el WP anterior?"
  → Leer manualmente: lessons-learned.md, risk-register.md, execution-log.md
  → 15 minutos de reconstrucción de contexto

META-FRAMEWORK OBJETIVO:
  Sesión 5: memoria semántica recupera automáticamente los hallazgos relevantes
  → "En voltfactory-adaptation, el skill de PostgreSQL tuvo R-003 (migrations sin rollback)"
  → Contexto disponible en segundos
```

---

### BRECHA-3: Un solo Claude hace todo — sin especialización de agentes

**Estado actual:**
- Un único Claude Code (con el SKILL cargado) ejecuta las 7 fases
- Phase 1 ANALYZE y Phase 6 EXECUTE requieren capacidades muy distintas
- No hay agente `tech-detector` ni `skill-generator` — son conceptos en documentos

**Por qué importa para el meta-framework:**
H-014 describe `tech-detector.md` y `skill-generator.md` como agentes del sistema.
H-013 (Volt Factory) muestra que los agentes tienen frontmatter con CAN/CANNOT.
El meta-framework necesita al menos 3 agentes core:
1. `tech-detector` — analiza el proyecto y detecta el stack
2. `skill-generator` — genera SKILL.md + .instructions.md desde templates del registry
3. Agentes por tech skill generado — ejecutan trabajo especializado en su capa

**Gap concreto:**
```
HOY:
  /workflow_init → Claude lee el proyecto → documenta en analysis.md
  → El usuario tiene que generar los skills manualmente

META-FRAMEWORK OBJETIVO:
  /workflow_init → tech-detector analiza → skill-generator crea skills → git commit
  → Todo automático, con agentes especializados
```

---

## Qué ofrece EvoAgentX para cerrar cada brecha

### Para BRECHA-1: Ejecución real de código

**EvoAgentX toolkits relevantes** (de H-009, evoagentx-analysis.md):

| Toolkit | Qué permite | Fase THYROX |
|---------|------------|-------------|
| `PythonInterpreterToolkit` | Ejecutar Python: pytest, scripts, validaciones | Phase 6: EXECUTE |
| `CMDToolkit` | Shell: git, npm, yarn, docker, make | Phase 6: EXECUTE |
| `FileToolkit` / `StorageToolkit` | Leer/escribir archivos del repo programáticamente | Todas |
| `FaissToolkit` | Búsqueda semántica en codebase durante análisis | Phase 1: ANALYZE |
| `DDGSSearchToolkit` / `ArxivToolkit` | Research externo sin API key | Phase 1: ANALYZE |

**Integración concreta:**
```python
# En un tech skill generado de React:
from evoagentx.tools import CMDToolkit, PythonInterpreterToolkit

cmd = CMDToolkit()
# Phase 6: El agente ejecuta tests automáticamente después de cada tarea
result = cmd.execute("yarn test --coverage")
if result.returncode != 0:
    # El agente lee el error, corrige, reintenta — no el usuario
    ...
# El agente hace el commit convencional
cmd.execute("git add -A && git commit -m 'feat(auth): add JWT validation'")
```

**Por qué este toolkit, no otro:** `CMDToolkit` da acceso al shell sin GUI ni CLI de THYROX.
`PythonInterpreterToolkit` permite validar código Python en tech skills de backend.

---

### Para BRECHA-2: Memoria semántica entre sesiones

**EvoAgentX memory relevante** (de H-007, evoagentx-analysis.md):

```python
from evoagentx.memory import ShortTermMemory, LongTermMemory, MemoryManager

# ShortTermMemory — buffer de sesión activa (reemplaza now.md como buffer dinámico)
stm = ShortTermMemory(window_size=20)

# LongTermMemory — RAG-backed, persiste entre sesiones
# Indexa: WPs, ADRs, lecciones, risk-registers
ltm = LongTermMemory(
    storage_handler=storage,     # SQLite local para desarrollo
    rag_config=RAGConfig(
        embedder_type="sentence_transformers",  # local, sin API key
        indexer_type="faiss"                    # local, sin servidor
    )
)

# Indexar lecciones al cerrar Phase 7
await ltm.add_memory(lessons_learned_content)

# Recuperar contexto relevante al iniciar Phase 1
results = await ltm.retrieve_memory(
    "problemas con generación de tech skills de PostgreSQL"
)
```

**Rol específico en el meta-framework:**
- Al cerrar cada WP (Phase 7 TRACK), el sistema indexa automáticamente: lecciones aprendidas, riesgos materializados, decisiones ADR
- Al iniciar Phase 1 de un nuevo WP, el sistema recupera hallazgos relevantes de proyectos anteriores
- El registry se enriquece con aprendizajes: qué templates funcionaron, qué convenciones se violaron más

**FAISS local (sin servidor):** Alineado con la restricción de "sin CLI/GUI/REST API" — el índice vectorial vive como archivos en disco.

---

### Para BRECHA-3: Agentes especializados

**EvoAgentX agents relevantes** (de H-003, H-004, evoagentx-analysis.md):

```python
from evoagentx.agents import CustomizeAgent, AgentManager, ActionAgent

# tech-detector agent (core del meta-framework)
tech_detector = CustomizeAgent(
    name="tech-detector",
    description="Analiza el repositorio y detecta el stack tecnológico. "
                "Use this agent when: /workflow_init, /workflow_add_tech",
    tools=[FileToolkit(), CMDToolkit()],
    # CAN: leer package.json, requirements.txt, Dockerfile, .claude/
    # CANNOT: modificar archivos, generar skills
)

# skill-generator agent
skill_generator = CustomizeAgent(
    name="skill-generator",
    description="Genera SKILL.md y .instructions.md desde registry templates. "
                "Use after tech-detector completes.",
    tools=[FileToolkit(), StorageToolkit()],
    # CAN: leer registry/, escribir .claude/skills/, escribir .claude/guidelines/
    # CANNOT: detectar tech, ejecutar código del proyecto
)

# Agente por tech skill generado (N instancias)
react_agent = CustomizeAgent(
    name="react-frontend",
    description="React expert: hooks, RTL testing, feature-based architecture. "
                "Use when implementing frontend React components.",
    tools=[CMDToolkit(), PythonInterpreterToolkit()],
)

# AgentManager coordina los agentes en una fase
agent_manager = AgentManager()
agent_manager.add_agents([tech_detector, skill_generator])
```

**Patrón de frontmatter (H-013, Volt Factory):**
Cada agente generado desde el registry tiene:
- `description` con `Use this agent when: <example>` → Claude Code lo invoca automáticamente
- CAN / CANNOT explícito → reduce scope creep entre agentes
- `tools` explícita → solo los toolkits que necesita

---

## Mapa completo: EvoAgentX → meta-framework THYROX

```
META-FRAMEWORK THYROX + EvoAgentX

pm-thyrox SKILL (orquestador, sin cambio)
└── 7 fases: ANALYZE → TRACK

AGENTES CORE (EvoAgentX CustomizeAgent):
├── tech-detector       ← analiza repo → detecta stack
│   └── tools: FileToolkit, CMDToolkit
└── skill-generator     ← lee registry/ → escribe .claude/skills/
    └── tools: FileToolkit, StorageToolkit

AGENTES GENERADOS DESDE REGISTRY (por tech skill):
├── react-frontend      ← generado cuando se detecta React
│   └── tools: CMDToolkit (yarn, npm), FileToolkit
├── nodejs-backend      ← generado cuando se detecta Node.js
│   └── tools: CMDToolkit (npm, node), PythonInterpreterToolkit
└── postgresql-db       ← generado cuando se detecta PostgreSQL
    └── tools: CMDToolkit (psql, migrations), PostgreSQLToolkit

MEMORIA (EvoAgentX Memory):
├── ShortTermMemory     ← buffer sesión activa (reemplaza now.md dinámico)
└── LongTermMemory      ← RAG-FAISS local, persiste entre sesiones
    └── indexa: WPs, ADRs, lecciones, risk-registers

TOOLKITS DE EJECUCIÓN (EvoAgentX Tools):
├── CMDToolkit          ← git, npm, yarn, pytest, docker
├── PythonInterpreterToolkit ← ejecutar tests, validar outputs
├── FileToolkit         ← leer/escribir artefactos WP
└── FaissToolkit        ← búsqueda semántica en codebase

POR FASE:
Phase 1: ANALYZE
  → FaissToolkit: indexa codebase → responde preguntas en lenguaje natural
  → tech-detector: escanea stack
  → LongTermMemory.retrieve(): trae contexto de proyectos anteriores

Phase 1: BOOTSTRAP (solo sesión inicial)
  → skill-generator: crea .claude/skills/ + .claude/guidelines/ desde registry
  → git commit: skills viven permanentemente

Phase 6: EXECUTE
  → AgentManager: coordina react-agent + nodejs-agent + db-agent
  → CMDToolkit: ejecuta tests, builds, commits
  → PythonInterpreterToolkit: valida outputs de código

Phase 7: TRACK
  → LongTermMemory.add(): indexa lecciones, ADRs, risk-register cerrado
  → ShortTermMemory: limpia buffer de sesión
```

---

## Restricciones de integración — Lo que NO se integra

| Componente EvoAgentX | Razón de exclusión |
|---------------------|-------------------|
| `app/` (FastAPI, Celery, Redis, JWT) | Explícitamente fuera de scope |
| `hitl/hitl_gui.py` | GUI excluida |
| `hitl/hitl.py` | THYROX ya tiene HITL en las aprobaciones de fase (Markdown gates) |
| `frameworks/multi_agent_debate` | Complejidad alta, beneficio marginal para PM |
| Benchmarks (HotPotQA, MBPP, MATH) | Benchmarks de NLP/coding — no aplican a PM |
| Optimizadores SEW/AFlow/TextGrad | Requieren datasets maduros; agregar solo cuando tech skills tengan histórico |
| ColPali multimodal | Solo si proyectos tienen wireframes/diagramas — agregar en v2 |
| `WorkFlowReviewer` | Marcado como TODO en EvoAgentX — no usar hasta que esté implementado |

---

## H-001 (nuevo): Dependencias pesadas — riesgo de setup

EvoAgentX instala ~40 dependencias por defecto incluyendo `torch`, `transformers`,
`colpali-engine`. Para el meta-framework, solo se necesita un subconjunto:

**Instalación mínima** (sin ColPali, sin benchmarks):
```bash
# Core: agents + memory + tools (sin torch, sin transformers)
pip install evoagentx[core]
# o instalar módulos específicos
pip install evoagentx pydantic litellm faiss-cpu sentence-transformers
```

**Verificar:** El módulo `evoagentx.agents`, `evoagentx.memory`, y `evoagentx.tools`
pueden importarse sin los módulos pesados de `evoagentx.rag` y `evoagentx.optimizers`.

---

## H-002 (nuevo): API 0.1.0 inestable — riesgo de breaking changes

EvoAgentX está en v0.1.0 (mayo 2025). Las APIs de `CustomizeAgent`, `LongTermMemory`
y toolkits son estables en la versión actual pero pueden cambiar en 0.2.x.

**Mitigación:** Crear una capa adapter en `registry/agents/` que encapsule las
llamadas a EvoAgentX. Si la API cambia, solo cambia el adapter — no los skills generados.

```
registry/
├── agents/
│   ├── _evoagentx_adapter.py   ← encapsula CustomizeAgent, AgentManager
│   └── tech-detector.py        ← usa el adapter, no EvoAgentX directamente
```

---

## Criterios de éxito de este análisis

- [x] Visión del meta-framework documentada (H-014, H-019, H-020)
- [x] 3 brechas críticas identificadas con gap concreto por brecha
- [x] Mapa EvoAgentX → THYROX por cada brecha
- [x] Restricciones de integración documentadas
- [x] Riesgos de setup y versión identificados
- [x] Integración no propone CLI/GUI/REST API
