```yml
ID work package: 2026-04-05-00-00-00-evoagentx-analysis
Fecha: 2026-04-05
Proyecto: THYROX — Análisis externo de EvoAgentX
Fase: Phase 1 — ANALYZE
Autor: Claude
Repositorio: https://github.com/EvoAgentX/EvoAgentX
Versión analizada: v0.1.0 (commit main, 2025-08)
```

# Análisis: EvoAgentX — Framework de Agentes Auto-Evolutivos

## Resumen ejecutivo

EvoAgentX es un framework Python open-source (MIT) para construir, evaluar y evolucionar sistemas multi-agente basados en LLMs. Su diferenciador clave es el **motor de auto-evolución**: no solo orquesta agentes, sino que los mejora iterativamente usando algoritmos de optimización (TextGrad, AFlow, MIPRO, EvoPrompt, SEW). Está en versión 0.1.0, lanzado en Mayo 2025, con +1,000 stars en GitHub.

---

## H-001: Arquitectura de capas — 8 módulos ortogonales

La codebase está organizada en `evoagentx/` con 8 subsistemas bien definidos:

```
evoagentx/
├── core/          BaseModule, Message, Parser, Registry — fundación Pydantic
├── models/        Adaptadores LLM (OpenAI, LiteLLM, Aliyun, SiliconFlow, OpenRouter)
├── agents/        Agent, ActionAgent, CustomizeAgent, AgentManager
├── actions/       Unidades atómicas de ejecución del agente
├── workflow/      WorkFlow, WorkFlowGraph, WorkFlowGenerator — orquestación
├── optimizers/    SEW, AFlow, TextGrad, MIPRO, EvoPrompt — auto-evolución
├── evaluators/    Evaluator, AFlowEvaluator — scoring automático
├── benchmark/     HotPotQA, MBPP, MATH, HumanEval, GSM8K, NQ, LiveCodeBench
├── memory/        ShortTermMemory + LongTermMemory + MemoryManager
├── rag/           RAG pipeline completo (readers, chunkers, embeddings, retrievers)
├── storages/      DB, VectorStore, GraphStore (Neo4j, FAISS, PostgreSQL, MongoDB)
├── tools/         30+ toolkits (browser, search, code, DB, files, APIs)
├── hitl/          Human-in-the-Loop — approval gates, GUI, workflow editor
├── frameworks/    Multi-agent debate (framework externo integrado)
└── app/           FastAPI REST API + Celery + Redis + JWT auth
```

**Patrón fundamental:** Todo hereda de `BaseModule(BaseModel, metaclass=MetaModule)`. Pydantic v2 para validación, serialización automática JSON/YAML, y registro global de clases (`MODULE_REGISTRY`). Esto permite cargar cualquier componente por `class_name` string — esencial para serializar/deserializar workflows.

---

## H-002: Motor de Workflows — 3 tipos de grafo

El sistema de workflows tiene 3 niveles de abstracción:

### WorkFlowGraph (nivel alto)
- `WorkFlowGraph`: grafo genérico DAG con `WorkFlowNode` + `WorkFlowEdge`
- `SequentialWorkFlowGraph`: ejecución lineal — cada nodo es un paso
- `SEWWorkFlowGraph`: variante para el optimizador SEW, con serialización multi-esquema (Python, YAML, BPMN, Core)

Cada `WorkFlowNode` tiene:
- `name`, `description`: identidad
- `inputs/outputs`: lista de `Parameter` tipados
- `agents`: agentes asignados (referenciados por nombre o config dict)
- `action_graph`: grafo de acciones interno (nivel micro)
- `status`: PENDING → RUNNING → COMPLETED / FAILED

### ActionGraph (nivel bajo)
Sub-grafo de acciones dentro de un nodo. Un agente ejecuta su `ActionGraph` para completar su tarea. Permite workflows anidados.

### WorkFlowGenerator (autoconstrucción)
Dado un goal en lenguaje natural:
1. `TaskPlanner` → descompone en subtareas
2. `AgentGenerator` → asigna/crea agentes por subtarea
3. `WorkFlowReviewer` → revisa y mejora (TODO en código, pendiente de implementar)

```python
wf_generator = WorkFlowGenerator(llm=llm)
workflow_graph = wf_generator.generate_workflow(goal="Analyze stock XYZ")
```

---

## H-003: Motor de Auto-Evolución — 4 optimizadores

El diferenciador principal. Todos heredan de `Optimizer(BaseModule)` con interfaz común: `optimize(dataset)`, `step()`, `evaluate()`, `convergence_check()`.

| Optimizer | Paper | Mecanismo | Qué optimiza |
|-----------|-------|-----------|--------------|
| **SEW** | Propio EvoAgentX | Mutación aleatoria + selección | Workflow completo (estructura + prompts) |
| **AFlow** | arXiv:2410.10762 | Monte Carlo Tree Search | Flujo de ejecución del agente |
| **TextGrad** | Nature 2025 | Gradiente textual (backprop verbal) | Prompts individuales |
| **MIPRO** | arXiv:2406.11695 | Evaluación black-box + reranking | Prompts + few-shot examples |
| **EvoPrompt** | arXiv:2309.08532 | Evolución evolutiva de prompts | Prompts individuales |

### SEWOptimizer — el más propio del framework
Serializa el workflow en múltiples representaciones (Python, YAML, BPMN, Core), aplica mutaciones con `mutation_prompts` y `thinking_styles`, evalúa resultado, y selecciona el mejor. Convergencia por: `convergence_threshold` pasos sin mejora.

### Resultados publicados (sobre GPT-4o-mini):
| Método | HotPotQA (F1%) | MBPP (Pass@1%) | MATH (%) |
|--------|----------------|-----------------|-----------|
| Original | 63.58 | 69.00 | 66.00 |
| TextGrad | **71.02** | 71.00 | **76.00** |
| AFlow | 65.09 | **79.00** | 71.00 |
| MIPRO | 69.16 | 68.00 | 72.30 |

---

## H-004: Capa de Agentes — 4 tipos con sincronía dual

### Jerarquía de agentes

```
Agent (base)
├── ActionAgent        — ejecuta ActionGraph, sin memoria explícita cross-workflow
├── CustomizeAgent     — agente con prompts y acciones 100% configurables por usuario
├── AgentManager       — pool de agentes, asignación por nombre en workflow
└── [Especializados]
    ├── TaskPlanner    — descompone goals en subtareas
    ├── AgentGenerator — crea configs de agentes desde descripciones
    ├── WorkFlowReviewer — TODO (placeholder, no implementado aún)
    └── LongTermMemoryAgent — integra memoria persistente en ejecución
```

### Patrón sync/async
```python
def __call__(self, *args, **kwargs):
    try:
        asyncio.get_running_loop()
        return self.async_execute(*args, **kwargs)  # async context
    except RuntimeError:
        return self.execute(*args, **kwargs)         # sync context
```
El agente detecta el contexto automáticamente. Útil para uso en FastAPI (async) vs scripts (sync).

### Memory dual
- **ShortTermMemory**: buffer de `Message` para una sesión de workflow
- **LongTermMemory**: persistente entre sesiones, con indexación y retrieval
- **MemoryManager**: coordina ambas, decide qué persiste

---

## H-005: Toolkits — 30+ herramientas en 8 categorías

| Categoría | Herramientas |
|-----------|-------------|
| **Code Interpreters** | PythonInterpreter (sandbox), DockerInterpreter (aislado) |
| **Search** | Wikipedia, Google (oficial + free), DDGS, SerpAPI, SerperAPI, Arxiv, RSS |
| **Browser** | BrowserToolkit (Selenium, paso a paso), BrowserUseToolkit (LLM-driven) |
| **Files** | StorageToolkit, FileToolkit, CMDToolkit (shell) |
| **Databases** | MongoDB, PostgreSQL, FAISS (vector) |
| **Finance** | FinanceTool, CryptoCurrencies, BasicInfo |
| **Comunicación** | Gmail, Telegram |
| **Geolocalización** | GoogleMaps |
| **APIs** | RequestToolkit, APIConverter, AlitaAgent |
| **Imágenes** | ImageAnalysis, OpenAI/Flux image generation |
| **MCP** | Integración con MCP tools (protocolo Model Context Protocol) |

Todos los toolkits heredan de `Toolkit` con método `get_tool_schemas()` que devuelve OpenAI-compatible tool definitions. Los agentes los consumen directamente.

---

## H-006: Human-in-the-Loop (HITL) — Sistema de aprobación

Módulo completo para supervisión humana en workflows:

```
HITLManager          — registro central, activate()/deactivate()
HITLInterceptorAgent — pausa workflow, espera aprobación humana
HITLUserInputCollectorAgent — recoge input del usuario en tiempo real
HITLConversationAgent — modo conversacional con el humano
HITLOutsideConversationAgent — input desde canal externo (API)
workflow_editor.py   — edición del workflow durante ejecución
hitl_gui.py         — interfaz gráfica para interacción
```

Tipos de interacción (`HITLInteractionType`): APPROVAL, USER_INPUT, CONVERSATION, POST_EXECUTION.
Modos (`HITLMode`): CLI, GUI, API.

---

## H-007: RAG Pipeline completo

Pipeline RAG modular con componentes intercambiables:

```
Readers      → Document loaders (PDF, DOCX, PPTX, HTML, imágenes con ColPali)
Chunkers     → Estrategias de segmentación
Embeddings   → Modelos de embedding (sentence-transformers, VoyageAI)
Indexings    → Indexación (FAISS, Neo4j graph)
Retrievers   → BM25, vectorial, híbrido
Postprocessors → Re-ranking, filtrado
```

Integrado con LlamaIndex. Soporta RAG multimodal via ColPali (imágenes).

---

## H-008: Benchmarks integrados

Corpus de evaluación built-in:

| Benchmark | Tarea | Métrica |
|-----------|-------|---------|
| HotPotQA | Multi-hop QA | F1 |
| MBPP | Code generation | Pass@1 |
| MATH | Razonamiento matemático | Solve rate |
| HumanEval | Code completion | Pass@1 |
| GSM8K | Aritmética | Accuracy |
| NQ | Open-domain QA | F1/EM |
| LiveCodeBench | Coding competitivo | Pass@k |
| BigBenchHard | Razonamiento multi-dominio | Accuracy |
| WorfBench | Evaluación de workflows | Custom |

---

## H-009: App layer — FastAPI + Celery + Redis

El módulo `app/` es una aplicación web completa para exponer EvoAgentX via API REST:

- `main.py`: FastAPI app con rutas de workflow
- `api.py`: Endpoints (presumiblemente CRUD de agentes/workflows)
- `services.py`: Lógica de negocio
- `db.py`: Conexión a MongoDB (via `motor` async)
- `security.py`: JWT auth + bcrypt
- `schemas.py`: Pydantic schemas de la API
- `config.py`: Variables de entorno
- Background tasks via **Celery + Redis** (para ejecución async de workflows)

Tiene `app.env` (variables de entorno separadas del `.env` principal).

---

## H-010: Ecosistema de modelos LLM

Adaptadores nativos + bridge universal:

| Adaptador | LLMs soportados |
|-----------|----------------|
| `OpenAIModel` | GPT-4o, GPT-4, GPT-3.5, etc. |
| `AliyunModel` | Qwen (DashScope API) |
| `LiteLLMModel` | 100+ modelos: Claude, Gemini, Deepseek, Ollama local, etc. |
| `SiliconFlowModel` | Modelos chinos (Qwen, Baichuan, etc.) |
| `OpenRouterModel` | Multi-proveedor via OpenRouter |

`BaseLLM` define la interfaz común: `generate()`, `async_generate()`, soporte a tool-calling, output parsing (JSON, XML, Title, Custom).

---

## H-011: Wonderful Workflow Corpus — datos de entrenamiento

El directorio `Wonderful_workflow_corpus/` contiene 6 workflows de referencia:

- `Fengshui_analysis/` — análisis Feng Shui
- `arxiv_daily_digest/` — resumen diario de papers
- `invest/` — análisis de inversiones
- `recipe_meal_plan/` — planificación de menús
- `tetris_game/` — ¡juego Tetris generado por agentes!
- `travel_recommendation/` — recomendaciones de viaje

Estos sirven como corpus de entrenamiento/demostración para el `SEWOptimizer` y como inspiración para usuarios.

---

## H-012: Testing — cobertura parcial

```
tests/src/
├── agents/       Tests de Agent, ActionAgent
├── benchmark/    Tests de benchmarks
├── core/         Tests de BaseModule, Parser, Message
├── evaluator/    Tests de Evaluator
├── hitl/         Tests de HITL
├── models/       Tests de LLM adapters
├── optimizers/   Tests de optimizadores
├── rag/          Tests de RAG pipeline
├── storages/     Tests de stores
└── workflow/     Tests de workflow execution
```

Stack de testing: pytest + pytest-asyncio + pytest-mock + pytest-subtests + pytest-cov. Cobertura de testing **no medida** (no hay `.coveragerc` ni badges de coverage).

---

## H-013: Estado del arte — gaps identificados

### Gaps técnicos observados

| Gap | Severidad | Evidencia |
|-----|-----------|-----------|
| `WorkFlowReviewer` no implementado | Media | `# TODO` en `workflow_generator.py:54` |
| `workflow/` exports comentados | Media | `__init__.py` tiene 6 imports comentados |
| `core/callbacks.py` no exportado | Baja | Comentado en `core/__init__.py` |
| `core/decorators.py` no exportado | Baja | Comentado en `core/__init__.py` |
| Versión 0.1.0 — API puede cambiar | Alta | Semver implica inestabilidad pre-1.0 |
| Dependencias muy pesadas (~40) | Media | Incluye torch, transformers, colpali, selenium |
| Sin métricas de coverage | Baja | No hay badge ni config de cobertura |
| `app/` sin documentación | Media | Sin README en app/ |

### Fortalezas
- Serialización/deserialización robusta (BaseModule + Pydantic v2)
- Abstracción limpia de modelos (cualquier LLM vía LiteLLM)
- Múltiples algoritmos de optimización (estado del arte académico)
- HITL bien estructurado (5 tipos de agente, 3 modos)
- RAG multimodal (ColPali)
- Benchmarks built-in para comparación objetiva

---

## Criterios de éxito del análisis

- [x] Arquitectura general comprendida (8+ módulos)
- [x] Flujo de datos documentado (Goal → Workflow → Execute → Optimize)
- [x] Diferenciadores identificados (auto-evolución, HITL, RAG multimodal)
- [x] Gaps técnicos detectados (TODOs, imports comentados, pre-1.0)
- [x] Stack tecnológico completo documentado

---

## Fuera de alcance de este análisis

- Lectura completa de cada archivo (47,000 líneas totales)
- Evaluación de calidad de los tests
- Análisis de performance/latencia
- Revisión de seguridad de la app layer
- Análisis del corpus `Wonderful_workflow_corpus`
