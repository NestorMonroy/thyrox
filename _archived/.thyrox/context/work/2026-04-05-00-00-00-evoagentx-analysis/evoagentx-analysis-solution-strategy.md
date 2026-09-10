```yml
ID work package: 2026-04-05-00-00-00-evoagentx-analysis
Fecha: 2026-04-05
Fase: Phase 2 — SOLUTION_STRATEGY
Estado: CANCELADO
Razón: Análisis incompleto — no consideró la visión meta-framework generativo de THYROX (H-014, H-020 de voltfactory-adaptation-analysis.md). La estrategia propuesta trataba THYROX como una app de gestión, no como un generador de stacks de skills.
Reemplazado por: WP 2026-04-05-01-09-22-thyrox-capabilities-integration
Tipo: Análisis de integración EvoAgentX ↔ THYROX
Restricciones: Sin CLI, Sin GUI, Sin REST API (app/ layer excluido)
```

> ⚠️ **DOCUMENTO CANCELADO** — Ver WP `2026-04-05-12-00-00-thyrox-capabilities-integration` para el análisis correcto.

# Solution Strategy: Integración EvoAgentX ↔ THYROX

---

## 1. Qué está construyendo THYROX

Antes de identificar qué integrar, es necesario definir con precisión qué ES THYROX.

**THYROX es un framework de PM para Claude Code.** No es una aplicación. Es una metodología empaquetada como un Anthropic Skill que:

1. Define un ciclo de trabajo de 7 fases (ANALYZE → TRACK)
2. Guía a Claude Code a través de esas fases con artefactos Markdown
3. Se extiende con **tech skills** ortogonales (ADR-012): backend, frontend, DB, etc.
4. Usa Markdown + Git como única persistencia

**Estado actual — lo que THYROX NO tiene:**
- No ejecuta código real dentro de sus fases (todo es texto/documentación)
- No tiene memoria semántica — solo Markdown estático (`focus.md`, `now.md`)
- No tiene agentes especializados — un solo Claude Code hace todo
- No puede buscar en el codebase durante una sesión
- No puede evaluar automáticamente si una fase cumplió sus criterios de salida
- No puede procesar imágenes, diagramas o wireframes

**Hacia dónde apunta THYROX (project-state.md "Largo plazo"):**
```
- Sub-agents para validación entre PHASEs
- Aggregación de timing data
- Analysis de patterns (cuáles PHASEs toman más tiempo)
```

Esto es exactamente lo que EvoAgentX habilita — pero en Python, no como más Markdown.

---

## 2. Qué hace bien EvoAgentX (sin CLI/GUI/API)

Filtrando el `app/` layer (FastAPI, Celery, Redis, JWT), lo que queda es el
**núcleo ejecutable de EvoAgentX como librería Python**:

| Módulo | Qué resuelve | Calidad |
|--------|-------------|---------|
| `agents/` | Multi-agent execution, roles especializados | Alta |
| `workflow/` | Orquestación de grafos de agentes | Alta |
| `memory/` | Memoria short/long-term con RAG backing | Alta |
| `tools/` | 30+ toolkits listos para usar | Alta |
| `rag/` | Indexación semántica + retrieval | Alta |
| `evaluators/` | Scoring automático de outputs | Media |
| `optimizers/` | Auto-evolución de workflows | Media |
| `benchmark/` | Datasets para evaluación | Media |

---

## 3. Análisis de integración — Qué integrar y por qué

### 3.1 Memory + RAG — Prioridad ALTA

**Problema actual en THYROX:**
- `focus.md` y `now.md` son texto plano — no son consultables semánticamente
- En proyectos grandes, Claude Code pierde contexto entre sesiones
- No hay forma de "buscar en la historia de decisiones" de forma automática

**Qué ofrece EvoAgentX:**
```python
# ShortTermMemory — buffer de messages para una sesión
from evoagentx.memory import ShortTermMemory, LongTermMemory, MemoryManager

# LongTermMemory — RAG-backed, persiste entre sesiones
ltm = LongTermMemory(
    storage_handler=storage,     # SQLite, MongoDB, etc.
    rag_config=RAGConfig(...)     # FAISS + embeddings
)
# Indexa cada mensaje/decisión → recupera por similitud semántica
await ltm.add_memory(message)
results = await ltm.retrieve_memory("¿cuál fue la decisión sobre adr_path?")
```

**Integración concreta con THYROX:**
- **ShortTermMemory** reemplaza `now.md` como buffer de sesión activa
- **LongTermMemory** indexa todos los WPs, ADRs y decisiones del proyecto
- En Phase 1: ANALYZE, el agente puede *recuperar* decisiones previas relevantes automáticamente
- En Phase 3: PLAN, recupera restricciones técnicas de proyectos anteriores

**Beneficio:** El agente nunca empieza desde cero — siempre tiene acceso semántico a todo el historial.

---

### 3.2 Toolkits — Prioridad ALTA

**Problema actual en THYROX:**
- Las fases EXECUTE y TRACK son texto — Claude Code escribe código pero no lo ejecuta automáticamente
- No hay búsqueda automática de documentación técnica durante ANALYZE
- No hay operaciones de archivos programáticas

**Qué integrar de los 30+ toolkits (excluyendo browser, GUI):**

| Toolkit | Fase THYROX donde aplica | Uso concreto |
|---------|--------------------------|-------------|
| `PythonInterpreterToolkit` | Phase 6: EXECUTE | Ejecutar tests del código generado |
| `CMDToolkit` | Phase 6: EXECUTE | `git`, `npm`, `pytest`, `docker` |
| `StorageToolkit` / `FileToolkit` | Todas | Leer/escribir artefactos WP automáticamente |
| `ArxivToolkit` | Phase 1: ANALYZE | Buscar papers relevantes al dominio |
| `WikipediaSearchToolkit` | Phase 1: ANALYZE | Investigación de contexto |
| `DDGSSearchToolkit` / `GoogleFreeSearchToolkit` | Phase 1: ANALYZE | Búsqueda web sin API key |
| `FaissToolkit` | Phase 1: ANALYZE | Búsqueda semántica en codebase |
| `MongoDBToolkit` / `PostgreSQLToolkit` | Tech skills DB | Agentes que operan la base de datos directamente |
| `RSSToolkit` | Phase 1: ANALYZE | Seguimiento de noticias técnicas del dominio |

**Integración concreta:**
```python
# En un tech skill de backend, durante Phase 6: EXECUTE
from evoagentx.tools import PythonInterpreterToolkit, CMDToolkit

python_tool = PythonInterpreterToolkit()
cmd_tool = CMDToolkit()

# El agente ejecuta los tests después de escribir el código
result = python_tool.execute_code("import pytest; pytest.main(['tests/'])")
# El agente hace git commit
cmd_tool.execute("git add -A && git commit -m 'feat(api): add user endpoint'")
```

**Beneficio:** Phase 6 deja de ser solo documentación — los agentes pueden ejecutar y validar.

---

### 3.3 Agent System (5 tipos) + AgentManager — Prioridad ALTA

**Problema actual en THYROX:**
- Un solo Claude Code hace todo — analiza, planea, ejecuta, valida
- No hay separación de roles por especialidad
- Phase 7 (TRACK) no tiene evaluador independiente

**Mapa de agentes EvoAgentX → fases THYROX:**

| Tipo de Agente EvoAgentX | Rol en THYROX | Fase |
|--------------------------|---------------|------|
| `TaskPlanner` | Descompone un goal en subtareas durante Phase 5 (DECOMPOSE) | 5 |
| `ActionAgent` | Ejecuta tareas atómicas: escribir código, tests, docs | 6 |
| `CustomizeAgent` | Agente configurado para un tech skill específico (React, PostgreSQL) | 6 |
| `AgentManager` | Coordina múltiples agentes especializados en una misma fase | 3–6 |
| `WorkFlowReviewer` | ⚠️ TODO — cuando esté implementado: revisa el workflow generado | 3 |

**Integración concreta — Phase 5: DECOMPOSE automático:**
```python
from evoagentx.workflow import WorkFlowGenerator
from evoagentx.agents import AgentManager

# THYROX tiene la spec de Phase 4. EvoAgentX genera el plan de ejecución.
wf_generator = WorkFlowGenerator(llm=llm)
workflow_graph = wf_generator.generate_workflow(
    goal="Implement user authentication with JWT for the REST API"
    # goal viene del {nombre-wp}-requirements-spec.md de Phase 4
)
# → genera automáticamente las tareas del {nombre-wp}-task-plan.md de Phase 5
```

**Integración concreta — Multi-agente por tech skill:**
```python
# Tech skill: backend-nodejs
# En lugar de un solo Claude, 3 agentes especializados:
agent_manager = AgentManager()
agent_manager.add_agents([
    CustomizeAgent(name="architect",    # diseña la solución
        description="Node.js architect, expert in Express and TypeScript"),
    CustomizeAgent(name="developer",    # implementa
        description="Senior Node.js developer"),
    CustomizeAgent(name="reviewer",     # revisa código
        description="Code reviewer focused on security and best practices"),
])
```

**Beneficio:** Cada tech skill tiene un equipo de agentes especializados en lugar de un generalista.

---

### 3.4 RAG + LlamaIndex + ColPali Multimodal — Prioridad MEDIA

**Qué ofrece:**

**LlamaIndex** — indexa todo el codebase y documentación:
```python
from evoagentx.rag import RAGEngine, RAGConfig

rag = RAGEngine(config=RAGConfig(
    reader_type="file",       # lee archivos del repo
    embedder_type="openai",   # o sentence-transformers (local)
    indexer_type="faiss",     # índice vectorial local
    retriever_type="vector",  # búsqueda por similitud
))
# Indexa el codebase completo
rag.index_corpus(corpus_path="./src/")

# En Phase 1: ANALYZE, el agente puede consultar
results = rag.retrieve("How is authentication currently implemented?")
```

**ColPali** — RAG multimodal (imágenes + texto):
```python
# EvoAgentX soporta ColPali para procesar imágenes
# Aplicación en THYROX: Phase 1: ANALYZE
# - Procesa wireframes de UI para entender requisitos
# - Analiza diagramas de arquitectura existentes
# - Lee screenshots de issues para entender bugs
```

**Integración concreta con THYROX:**
- **Phase 1: ANALYZE** — indexar la codebase actual + documentación → agente pregunta en lenguaje natural
- **Phase 2: SOLUTION_STRATEGY** — recuperar patrones arquitectónicos similares de proyectos anteriores
- **Phase 6: EXECUTE** — el agente consulta el codebase antes de escribir código nuevo (evita duplicación)

**ColPali aplica cuando:**
- El proyecto tiene wireframes o mockups de UI
- Hay diagramas de arquitectura (UML, C4, etc.)
- Se trabaja con proyectos existentes con docs visuales

---

### 3.5 Evaluadores automáticos — Prioridad MEDIA

**Problema actual en THYROX:**
- Las validaciones de fase son manuales — el usuario aprueba o rechaza
- No hay scoring objetivo de si un artefacto cumple los criterios

**Qué ofrece EvoAgentX:**
```python
from evoagentx.evaluators import Evaluator

evaluator = Evaluator(llm=llm)
# Evalúa si el requirements-spec de Phase 4 es completo y sin ambigüedades
score = evaluator.evaluate(
    graph=spec_review_graph,
    dataset=spec_checklist_benchmark
)
```

**Integración concreta:**
- **Phase 1 gate**: Evalúa si el análisis cubre los 8 aspectos requeridos por THYROX
- **Phase 4 gate**: Verifica que la spec no tiene `[NEEDS CLARIFICATION]`
- **Phase 6 gate**: Ejecuta tests y verifica que el código pasa (integrado con PythonInterpreterToolkit)
- **Phase 7 gate**: Evalúa calidad de las lecciones aprendidas

---

### 3.6 WorkFlowGenerator — Prioridad MEDIA

**Caso de uso en THYROX:**

Actualmente Phase 5: DECOMPOSE es manual — Claude Code lee la spec y crea tareas. Con WorkFlowGenerator:

```python
from evoagentx.workflow import WorkFlowGenerator

# Input: requirements-spec.md de Phase 4
# Output: workflow_graph que mapea a task-plan.md de Phase 5
wf_generator = WorkFlowGenerator(llm=llm, tools=[python_tool, cmd_tool, file_tool])
workflow_graph = wf_generator.generate_workflow(
    goal=spec_content  # el contenido del requirements-spec
)
# → genera automáticamente los WorkFlowNodes = tareas del task-plan
```

**Advertencia:** `WorkFlowReviewer` está marcado como `TODO` en el código actual. Usar sin esa capa implica que el workflow generado no se auto-valida.

---

### 3.7 Optimizadores (SEW/AFlow/TextGrad) — Prioridad BAJA

**Cuándo tiene sentido:**
- El tech skill lleva múltiples sesiones de uso y queremos mejorar sus prompts automáticamente
- Tenemos un dataset de evaluación (qué output es "bueno") para el tech skill específico

**Advertencia:** Los optimizadores requieren datasets + múltiples iteraciones de evaluación. Son adecuados cuando el tech skill está maduro, no durante la construcción inicial.

---

## 4. Arquitectura de integración propuesta

```
THYROX (metodología)
├── pm-thyrox SKILL          ← Orquestación 7 fases (sin cambio)
└── tech skills              ← Cada tech skill powered by EvoAgentX

INTEGRACIÓN PYTHON (EvoAgentX como motor de ejecución):

Phase 1: ANALYZE
  └── RAGEngine.retrieve()    ← busca codebase/docs existentes
  └── ArxivToolkit / DDGSSearchToolkit  ← investiga dominio
  └── ColPali (opcional)      ← procesa diagramas/wireframes

Phase 5: DECOMPOSE
  └── WorkFlowGenerator       ← genera task-plan desde requirements-spec

Phase 6: EXECUTE
  └── AgentManager            ← coordina agentes especializados
      ├── ActionAgent (coder)
      ├── CustomizeAgent (tech_skill_agent)
      └── [reviewer, tester]
  └── PythonInterpreterToolkit ← ejecuta tests
  └── CMDToolkit               ← git, npm, docker
  └── StorageToolkit           ← operaciones de archivos

Phase 7: TRACK
  └── Evaluator               ← scoring objetivo de artefactos
  └── LongTermMemory.add()    ← indexa lecciones aprendidas

Cross-phase:
  └── LongTermMemory.retrieve()  ← recupera contexto de sesiones anteriores
  └── ShortTermMemory            ← buffer de sesión activa
```

---

## 5. Lo que NO integrar (y por qué)

| Módulo EvoAgentX | Razón de exclusión |
|------------------|-------------------|
| `app/` (FastAPI, Celery, Redis) | Explícitamente fuera de scope |
| `hitl/hitl_gui.py` | GUI excluida por requerimiento |
| `hitl/hitl.py` (concepto) | El concepto HITL de THYROX ya está en las aprobaciones de fase |
| `frameworks/multi_agent_debate` | Complejidad alta para beneficio marginal en PM |
| Benchmarks (HotPotQA, MBPP, etc.) | No relevantes para PM — son para NLP/coding benchmarks |
| Optimizadores en primera versión | Requieren datasets maduros; agregar en v2 |
| ColPali en primera versión | Solo si el proyecto tiene documentación visual real |

---

## 6. Riesgos de integración

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| EvoAgentX 0.1.0 — API inestable | Alto | Pinear versión; wrapper adapter layer |
| ~40 dependencias pesadas (torch, transformers) | Medio | Instalar solo módulos necesarios; evitar `pip install evoagentx` full |
| `WorkFlowReviewer` no implementado | Medio | No usar WorkFlowGenerator en producción sin validación manual |
| LongTermMemory requiere storage backend | Bajo | SQLite para desarrollo local; MongoDB para producción |
| Latencia multi-agente > agente único | Bajo | Parallelizar con `AgentManager` (ThreadPoolExecutor ya integrado) |

---

## 7. Decisión de integración

### Fase A — Fundación (implementar primero)
1. **Memory** (ShortTermMemory + LongTermMemory con FAISS local)
2. **Toolkits core** (PythonInterpreter, CMD, File, Storage)
3. **ActionAgent + AgentManager** para tech skills

### Fase B — Capacidades extendidas
4. **RAG + LlamaIndex** para búsqueda semántica en codebase
5. **WorkFlowGenerator** para automatizar Phase 5 DECOMPOSE
6. **Evaluadores** para automatizar gates de fase

### Fase C — Opcional (cuando haya madurez)
7. **ColPali** (si proyectos tienen documentación visual)
8. **Optimizadores** (cuando tech skills tengan datasets de evaluación)

---

## Criterios de éxito

- [ ] Tech skills ejecutan código real (no solo documentan)
- [ ] Agentes recuperan contexto de sesiones anteriores automáticamente
- [ ] Phase 5 (DECOMPOSE) puede generarse automáticamente desde la spec
- [ ] Los gates de fase tienen scoring objetivo (no solo aprobación manual)
- [ ] El sistema funciona sin ningún componente de CLI/GUI/API
