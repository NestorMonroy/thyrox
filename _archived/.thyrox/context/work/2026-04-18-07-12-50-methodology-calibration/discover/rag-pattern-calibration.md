```yml
created_at: 2026-04-19 10:47:38
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Chapter 14: Knowledge Retrieval (RAG)" (documento externo, 2026-04-19)
ratio_calibración: 18/29 (62.1%)
clasificación: PARCIALMENTE CALIBRADO
delta_vs_cap13: +11.5pp
delta_vs_cap9: -14.9pp
hipotesis_ccv: CONFIRMADA
```

# Calibration Review — Chapter 14: Knowledge Retrieval (RAG)

## Ratio de calibración: 18/29 (62.1%)
## Clasificación: PARCIALMENTE CALIBRADO

**Distribución de claims:**
- Observaciones directas (OD): 10
- Inferencias calibradas (IC): 8
- Especulación útil (EU): 1 (excluida del denominador — explícitamente marcada)
- Afirmaciones performativas (AP): 11

**Total claims evaluados: 29** (+ 1 EU fuera de ratio)

---

## Afirmaciones performativas: 11

| # | Texto (cita exacta) | Línea | Impacto | Evidencia propuesta |
|---|---------------------|-------|---------|---------------------|
| AP-01 | "Use cases include complex financial analysis, connecting companies to market events, and scientific research for discovering relationships between genes and diseases" | L77 | Bajo | Citar implementaciones reales: Bloomberg RAG, BioASQ, o GraphRAG paper §4 casos de uso |
| AP-02 | "dramatically improve the reliability and depth of the generated answers" | L91 | Medio | Cuantificar con benchmark: RAGAS score, faithfulness metric, o citar Lewis et al. 2020 §5 resultados |
| AP-03 | "they drastically improve the depth and trustworthiness of the final response" | L329 | Medio | Mismo que AP-02 — mismo claim repetido en Conclusión. Intensificador "drastically" sin delta cuantificado |
| AP-04 | Snippet ADK google_search termina en definición del agente sin mostrar invocación ni manejo de respuesta | L130 | Medio | Agregar `runner = Runner(agent=search_agent, ...)` + `runner.run(...)` con output; o declarar explícitamente que es snippet de inicialización |
| AP-05 | SIMILARITY_TOP_K=5 y VECTOR_DISTANCE_THRESHOLD=0.7 presentados como valores de configuración sin justificación empírica | L139-142 | Bajo | Agregar nota: "valores de ejemplo — ajustar según corpus" o citar documentación Vertex AI que recomienda esos defaults |
| AP-06 | "enables agents to perform scalable and persistent semantic knowledge retrieval" — claim de capacidad sin demostración en código | L143-145 | Medio | El snippet solo inicializa VertexAiRagMemoryService; falta integración con Agent + query de demostración |
| AP-07 | URL `https://github.com/langchain-ai/langchain/blob/master/docs/docs/how_to/state_of_the_union.txt` — el código se presenta como funcional pero devuelve HTML de GitHub, no texto plano | L195-197 | Alto | Corrección: `https://raw.githubusercontent.com/langchain-ai/langchain/master/docs/docs/how_to/state_of_the_union.txt` — bug que hace el RAG funcionalmente inútil sobre HTML |
| AP-08 | `from langchain_community.embeddings import OpenAIEmbeddings` — import deprecado presentado sin advertencia | L181 | Medio | Corregir a `from langchain_openai import OpenAIEmbeddings` o agregar nota de versión (LangChain ≥0.2.x) |
| AP-09 | `from langchain_community.vectorstores import Weaviate` — import deprecado e incompatible con cliente Weaviate v4 | L182 | Medio | Corregir a `from langchain_weaviate.vectorstores import WeaviateVectorStore` o declarar versión requerida |
| AP-10 | "RAG-based systems can offer precise and consistent responses to customer queries" | L105 | Bajo | Calificar con "may offer" o citar benchmark de Customer Support RAG; "precise and consistent" son claims de calidad no cuantificados |
| AP-11 | "more relevant recommendations" — comparativo sin base de comparación definida | L107 | Bajo | Agregar "compared to keyword-matching" para anclar el comparativo, o citar estudio de relevancia |

---

## Inferencias calibradas: 8 (bien fundamentadas)

| # | Texto | Línea | Fundamento |
|---|-------|-------|------------|
| IC-01 | "RAG enables LLMs to access and integrate external, current, and context-specific information" | L35 | Descripción funcional del patrón, correcta por definición del sistema RAG |
| IC-02 | "grounding responses in real-time, verifiable data beyond their static training" | L37 | Inferida del mecanismo de retrieval + augmentation — funcionamiento verificable |
| IC-03 | "reduces the risk of 'hallucination'…by grounding responses in verifiable data" | L51 | Hedging apropiado ("reduces the risk", no "eliminates"). Consistente con Lewis et al. 2020 aunque no citado inline. Calibración lingüística superior a Cap.11 |
| IC-04 | "GraphRAG is an advanced form of RAG that utilizes a knowledge graph instead of a simple vector database" | L75 | Descripción técnica correcta; verificable con arXiv:2501.00309 (en referencias, no inline) |
| IC-05 | GraphRAG: "significant complexity, cost, and expertise required to build and maintain" | L77 | Inferencia correcta derivada del análisis funcional del sistema — no requiere cita empírica |
| IC-06 | Agentic RAG — 4 escenarios (source validation, conflict reconciliation, multi-step reasoning, gap+tool) | L79-93 | Escenarios bien articulados, conceptualmente correctos, descripciones de comportamiento funcional coherentes |
| IC-07 | News Summarization: "LLMs can be integrated with real-time news feeds…RAG system retrieves recent articles" | L109-110 | Descripción funcional del patrón aplicado — inferida directamente del mecanismo RAG |
| IC-08 | Descripción del pipeline LangChain: StateGraph con retrieve → generate | L284-295 | Descripción correcta del código presente; verificable leyendo el snippet |

---

## Observaciones directas: 10

| # | Texto | Línea | Fuente de verificación |
|---|-------|-------|------------------------|
| OD-01 | "embeddings are numerical representations of text…in the form of a vector" | L59 | Definición técnica estándar del campo — verificable en cualquier referencia de ML |
| OD-02 | "BM25, a keyword-based algorithm that ranks chunks based on term frequency" | L67 | Robertson & Zaragoza (2009); descripción técnica correcta |
| OD-03 | "hybrid search approaches combining BM25 with semantic search" | L67 | Práctica estándar documentada en literatura de Information Retrieval |
| OD-04 | "HNSW - Hierarchical Navigable Small World" | L69 | Malkov & Yashunin (2016), arXiv:1603.09320 — verificable |
| OD-05 | "managed databases like Pinecone and Weaviate…Chroma DB, Milvus, and Qdrant…Redis, Elasticsearch, Postgres (pgvector)" | L69 | Tecnologías existentes y verificables |
| OD-06 | "libraries like Meta AI's FAISS or Google Research's ScaNN" | L69 | Atribuciones verificables: github.com/facebookresearch/faiss, github.com/google-research/scann |
| OD-07 | `from google.adk.tools import google_search` / `Agent(name=..., model=..., tools=[google_search])` | L122-130 | API pública ADK — verificable en documentación Google ADK |
| OD-08 | `from google.adk.memory import VertexAiRagMemoryService` con parámetros `rag_corpus`, `similarity_top_k`, `vector_distance_threshold` | L148-164 | API verificable — Referencia 5 en el capítulo apunta a documentación Vertex AI RAG Corpus |
| OD-09 | `StateGraph(RAGGraphState)`, `workflow.add_node`, `workflow.add_edge`, `workflow.compile()` | L261-267 | API correcta de LangGraph — verificable en documentación LangGraph |
| OD-10 | `app.stream(inputs)` | L274 | API correcta de LangGraph compilado — verificable en documentación LangGraph |

---

## Especulación útil: 1 (excluida del ratio)

| # | Texto | Línea | Naturaleza |
|---|-------|-------|------------|
| EU-01 | "cat" → (2,3), "kitten" → (2.1,3.1), "car" → (8,1) | L59 | Pseudocoordenadas pedagógicas explícitamente marcadas: "imagine a simple 2D graph" y mitigadas con "In reality, these embeddings are in a much higher-dimensional space". Hedging apropiado — no es falsa precisión |

---

## Análisis CAD (Claims por dominio)

| Dominio | OD | IC | AP | Ratio |
|---------|----|----|----|----|
| Conceptos técnicos RAG (embeddings, HNSW, BM25, chunking) | 4 | 3 | 1 | 7/8 = 87.5% |
| Código ADK | 2 | 0 | 3 | 2/5 = 40.0% |
| Código LangChain | 2 | 1 | 3 | 3/6 = 50.0% |
| GraphRAG / Agentic RAG | 0 | 3 | 2 | 3/5 = 60.0% |
| Casos de uso | 0 | 1 | 2 | 1/3 = 33.3% |
| No aplica (definición/mecanismo general) | 2 | 0 | 0 | 2/2 = 100% |

**Hallazgo CAD:** El dominio conceptual técnico es el mejor calibrado (87.5%) — HNSW, BM25, FAISS, ScaNN son tecnologías verificables con atribución correcta. El dominio de código ADK es el más débil (40%) — snippets incompletos y claim de capacidad sin demostración. Casos de uso también débil (33.3%) por ausencia de implementaciones citadas.

---

## Hipótesis CCV: CONFIRMADA (tercera vez consecutiva)

**La hipótesis:** Referencias con arXiv verificable pero sin citas inline no elevan calibración.

**Evidencia en Cap.14:**
- Lewis et al. 2020 (arXiv:2005.11401) — en sección References, L335. No citado inline en ningún punto del cuerpo del texto donde se describen los beneficios de RAG (L51, L73, L329).
- GraphRAG (arXiv:2501.00309) — en sección References, L337. No citado inline donde se describe GraphRAG (L75-78).

**Historial CCV:**
| Capítulo | Ratio | Referencias arXiv | Citas inline | CCV |
|----------|-------|-------------------|--------------|-----|
| Cap.9 | 77% | Sí | Sí | Eleva calibración |
| Cap.12 | 53.1% | Sí | No | REFUTADA (referencias no compensan) |
| Cap.13 | 50.6% | Sí | No | CONFIRMADA (sin inline = no eleva) |
| Cap.14 | 62.1% | Sí (2 arXiv) | No | CONFIRMADA |

**Conclusión CCV:** El patrón es estable. La presencia de referencias verificables en la sección final no afecta el ratio de calibración del cuerpo del texto. Lo que eleva calibración es la cita inline que conecta un claim específico a una fuente específica. Cap.9 lo hace y tiene 77%. Los demás no lo hacen y quedan entre 50-65%.

---

## Hallazgos diferenciales vs. capítulos anteriores

### Por qué Cap.14 supera a Cap.12 y Cap.13 (+11.5pp vs Cap.13)

1. **Dominio técnico más denso:** Cap.14 introduce HNSW, BM25, FAISS, ScaNN — todas tecnologías con nombre y atribución verificable. Cap.12/13 tenían menos claims técnicos nominativos con fuente implícita.

2. **Hedging lingüístico más cuidadoso:** "reduces the risk of hallucination" (L51) vs. Cap.11 "eliminate code hallucinations". El capítulo usa lenguaje epistémicamente más cuidadoso en los claims de beneficio de RAG.

3. **Código LangChain más completo:** Aunque tiene bugs (URL, imports deprecados), el ejemplo LangChain es más completo que los snippets de Cap.12/13. Genera más OD verificables (StateGraph API, app.stream).

4. **Agentic RAG bien articulado:** Los 4 escenarios son inferencias calibradas sobre el comportamiento esperado del sistema — correctos conceptualmente.

### Por qué Cap.14 no alcanza Cap.9 (-14.9pp)

1. **Sin citas inline:** Cap.9 cita arXiv papers en el cuerpo del texto junto a claims específicos. Cap.14 no lo hace — las mismas referencias están al final sin conexión a claims.

2. **Código con bugs críticos:** La URL de GitHub (AP-07) hace el ejemplo LangChain funcionalmente inútil. Cap.9 no tenía este tipo de error de implementación.

3. **Claims de capacidad no demostrados:** "enables agents to perform scalable and persistent semantic knowledge retrieval" (AP-06) sin código que lo demuestre. Cap.9 tenía mayor coherencia entre claims y evidencia.

---

## Issue técnico de mayor impacto: AP-07

El bug de la URL de GitHub (L195-197) es el único AP clasificado como **Alto** porque:
- El código se ejecutará sin error (requests.get no falla, el archivo se escribe)
- El fallo es silencioso: el RAG funciona sobre HTML de GitHub en lugar del texto del discurso
- El lector que ejecute el código creerá que el sistema RAG funciona correctamente
- El claim de que el ejemplo ilustra un pipeline RAG funcional es técnicamente falso en este estado

Corrección de una línea: reemplazar la URL por `https://raw.githubusercontent.com/langchain-ai/langchain/master/docs/docs/how_to/state_of_the_union.txt`

---

## Recomendación

**Iterar antes de gate** para los claims de código (AP-04, AP-06, AP-07, AP-08, AP-09).

El contenido conceptual (dominios RAG, GraphRAG, Agentic RAG) está bien calibrado para un capítulo introductorio — 87.5% en el dominio técnico conceptual es el mejor resultado de la serie después de Cap.9. El problema está concentrado en los ejemplos de código: dos snippets ADK incompletos y un snippet LangChain con bugs que lo hacen funcionalmente defectuoso.

**Acción mínima de alto impacto:** corregir la URL de GitHub (AP-07) + agregar invocación en el snippet ADK google_search (AP-04). Esas dos correcciones subirían el ratio aproximadamente a 20/29 = 69.0%.
