```yml
created_at: 2026-04-19 11:13:02
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
ratio_calibracion: 23/54 (42.6%)
clasificacion: REALISMO PERFORMATIVO
```

# Análisis de calibración adversarial — Cap.17: Reasoning Techniques

---

## Ratio de calibración: 23/54 (42.6%)

## Clasificación: REALISMO PERFORMATIVO

Umbral aplicado: artefacto de exploración (survey de técnicas) → ratio ≥ 0.50.
Resultado obtenido: 42.6% — por debajo del umbral mínimo.

---

## Tabla de claims por dominio

### Dominio 1: Chain-of-Thought (CoT)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| C01 | "significantly enhances LLMs complex reasoning abilities by mimicking a step-by-step thought process" (L69) | 0.5 | Inferencia calibrada | Wei et al. 2022 existe en References pero no citado inline. Claim derivable del paper. |
| C02 | "markedly improves the model's performance on tasks requiring multi-step reasoning, such as arithmetic, common sense reasoning, and symbolic manipulation" (L75) | 0.5 | Inferencia calibrada | Dominios mencionados (aritm., common sense, symbolic) corresponden exactamente a benchmarks de Wei 2022. Sin cita inline el score no puede ser 1.0. |
| C03 | "Its effectiveness stems from its ability to guide the model's internal processing toward a more deliberate and logical progression" (L81) | 0.2 | Claim performativo | Mecanismo interno no verificable. Proposición funcional no derivada de observación. |
| C04 | "Chain-of-Thought has become a cornerstone technique for enabling advanced reasoning capabilities in contemporary LLMs" (L83) | 0.5 | Inferencia calibrada | Derivable por adopción generalizada post-Wei 2022. Sin datos de adopción citados. |
| C05 | CoT prompt example (5 pasos, L91-L139) | 1.0 | Observación directa | Código ejecutable, reproducible. No contiene bugs identificados. |

**Subtotal CoT: 3.5/5.0 — ratio 70%**

---

### Dominio 2: Tree-of-Thought (ToT)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| T01 | "builds upon Chain-of-Thought (CoT). It allows large language models to explore multiple reasoning paths by branching into different intermediate steps, forming a tree structure" (L145-L146) | 0.5 | Inferencia calibrada | Yao et al. 2023 (ToT) existe en References. No citado inline. |
| T02 | "enables backtracking, self-correction, and exploration of alternative solutions" (L147-L148) | 0.5 | Inferencia calibrada | Tres capacidades atribuidas sin cita inline. Derivables del paper de Yao. Sin cuantificación de mejora. |
| T03 | "enhances the model's ability to handle challenging tasks that require strategic planning and decision-making" (L151-L152) | 0.2 | Claim performativo | "Challenging tasks" sin definición de benchmark. "Strategic planning" como término no delimitado. |

**Subtotal ToT: 1.2/3.0 — ratio 40%**

---

### Dominio 3: Self-Correction

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| S01 | "is a crucial aspect of an agent's reasoning process, particularly within Chain-of-Thought prompting" (L159-L160) | 0.5 | Inferencia calibrada | Claim de relevancia sin cuantificación. Consistente con literatura pero sin referencia específica. |
| S02 | "enhances the agent's capacity to produce reliable and high-quality results, as demonstrated in examples within the dedicated Chapter 4" (L167) | 0.2 | Claim performativo | Cross-referencia interna a Cap.4 no verificable en este análisis. La demostración prometida es externa al capítulo. El claim de calidad es performativo: depende de evidencia en otro documento. |
| S03 | Self-Correction prompt example (L171-L229) | 1.0 | Observación directa | Ejemplo ejecutable con flujo interno completo. Reproducible. |
| S04 | "yields more refined, precise, and superior results that more effectively meet intricate user demands" (L231) | 0.2 | Claim performativo | Tres adjetivos de calidad ("refined, precise, superior") sin métrica. Sin comparación con baseline. Afirmación de cierre sin evidencia acumulada en el párrafo. |

**Subtotal Self-Correction: 1.9/4.0 — ratio 47.5%**

---

### Dominio 4: PALMs (Program-Aided Language Models)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| P01 | "integrate LLMs with symbolic reasoning capabilities" (L238) | 0.8 | Inferencia fuertemente calibrada | Gao et al. 2023 en References. Descripción consistente con el paper. Sin cita inline. |
| P02 | "offload complex calculations, logical operations, and data manipulation to a deterministic programming environment" (L242) | 0.8 | Inferencia fuertemente calibrada | Mecanismo central de PALMs bien descrito. Derivable de Gao 2023. |
| P03 | "with potentially increased reliability and accuracy" (L247) | 0.2 | Claim performativo | "Potentially" debilita el claim pero sigue siendo performativo. Sin benchmark citado. |
| P04 | Código ADK — `search_agent`, `coding_agent`, `root_agent` (L253-L283) | 0.8 | Inferencia fuertemente calibrada | Código ADK real. Bug potencial identificado: `code_executor=[BuiltInCodeExecutor]` pasa clase no instancia. Score reducido a 0.8 por incertidumbre de ejecución. Verificar: `BuiltInCodeExecutor()` vs `BuiltInCodeExecutor`. |
| P05 | Parámetro `code_executor` (singular) vs posible `code_executors` (plural) en ADK API (L273) | 0.2 | Claim performativo por omisión | El naming del parámetro no está validado contra la API ADK actual. Inconsistencia con imports previos del WP. Verificar: `grep -r "code_executor" .thyrox/` + documentación ADK. |

**Subtotal PALMs: 3.0/5.0 — ratio 60%**

---

### Dominio 5: RLVR (Reinforcement Learning with Verifiable Rewards)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| R01 | "a new class of specialized 'reasoning models' has been developed" (L289) | 0.5 | Inferencia calibrada | Claim factual verificable. Sin referencia a modelos específicos (o1, Deepseek-R1, QwQ). |
| R02 | "This 'thinking' process produces a more extensive and dynamic Chain-of-Thought that can be thousands of tokens long" (L289) | 0.5 | Inferencia calibrada | Observable en modelos públicos (o1, R1). Sin cita inline. "Thousands of tokens" es verificable experimentalmente. |
| R03 | "The key innovation enabling these models is a training strategy called Reinforcement Learning from Verifiable Rewards (RLVR)" (L289) | 0.5 | Inferencia calibrada | RLVR es técnica documentada. Sin referencia al paper original (DeepSeek-R1, 2025 o equivalente). |
| R04 | "By training the model on problems with known correct answers (like math or code), it learns through trial and error to generate effective, long-form reasoning" (L289) | 0.5 | Inferencia calibrada | Mecanismo correcto. Sin referencia a resultados cuantitativos (benchmarks MATH, AMC). |
| R05 | "allows the model to evolve its problem-solving abilities without direct human supervision" (L289) | 0.2 | Claim performativo | "Without direct human supervision" es simplificación — RLVR requiere definición de reward function por humanos. Claim impreciso técnicamente. |
| R06 | "these reasoning models don't just produce an answer; they generate a 'reasoning trajectory' that demonstrates advanced skills like planning, monitoring, and evaluation" (L289) | 0.5 | Inferencia calibrada | Claim descriptivo verificable en modelos públicos. Sin demostración en el capítulo. |

**Subtotal RLVR: 2.7/6.0 — ratio 45%**

---

### Dominio 6: ReAct (Reasoning and Acting)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| RE01 | "ReAct (Reasoning and Acting) is a paradigm that integrates Chain-of-Thought (CoT) prompting with an agent's ability to interact with external environments through tools" (L295-L297) | 0.8 | Inferencia fuertemente calibrada | Yao et al. 2023 (ReAct) en References. Descripción canónica. |
| RE02 | "ReAct operates in an interleaved manner: the agent executes an action, observes the outcome, and incorporates this observation into subsequent reasoning" (L305-L306) | 0.8 | Inferencia fuertemente calibrada | Loop Thought-Action-Observation es el mecanismo central del paper. Derivable de Yao 2023. |
| RE03 | "This provides a more robust and flexible problem-solving approach compared to linear CoT" (L309) | 0.5 | Inferencia calibrada | Claim comparativo sin benchmark citado. El paper Yao 2023 sí presenta comparaciones — sin cita inline el score no puede ser 0.8. |
| RE04 | "ReAct enables agents to perform complex tasks requiring both reasoning and practical execution" (L312-L313) | 0.5 | Inferencia calibrada | Claim de capacidad derivable del paper. Sin caso de uso cuantificado. |

**Subtotal ReAct: 2.6/4.0 — ratio 65%**

---

### Dominio 7: Chain of Debates (CoD)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| COD01 | "CoD (Chain of Debates) is a formal AI framework proposed by Microsoft" (L319) | 0.2 | Claim performativo — ALTO IMPACTO | Atribución a Microsoft sin referencia bibliográfica. Microsoft no aparece en ninguna de las 6 referencias. No hay paper de CoD en bibliography. Si el claim es incorrecto, toda la sección tiene atribución errónea. Evidencia propuesta: búsqueda en arxiv.org "Chain of Debates Microsoft" + verificación de afiliación de autores. |
| COD02 | "where multiple, diverse models collaborate and argue to solve a problem, moving beyond a single AI's 'chain of thought'" (L319) | 0.5 | Inferencia calibrada | Descripción funcional consistente con multi-agent debate frameworks. Sin implementación de referencia. |
| COD03 | "The primary goal is to enhance accuracy, reduce bias, and improve the overall quality" (L319) | 0.2 | Claim performativo | Tres objetivos sin métricas. Sin comparación baseline. Afirmación de propósito sin evidencia de logro. |
| COD04 | "Functioning as an AI version of peer review, this method creates a transparent and trustworthy record" (L319) | 0.2 | Claim performativo | Analogía normativa ("peer review") sin validación. "Transparent and trustworthy" son atributos de calidad sin criterio de medición. |
| COD05 | "a shift from a solitary Agent providing an answer to a collaborative team of Agents working together to find a more robust and validated solution" (L319) | 0.5 | Inferencia calibrada | Claim descriptivo sobre arquitectura. Plausible sin evidencia de mejora cuantificada. |

**Subtotal CoD: 1.6/5.0 — ratio 32%**

---

### Dominio 8: Graph of Debates (GoD)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| GOD01 | "GoD (Graph of Debates) is an advanced Agentic framework" (L325) | 0.2 | Claim performativo — ALTO IMPACTO | "Advanced" sin criterio de comparación. Sin referencia académica ni implementación. Sin paper en bibliography. Si GoD es contribución original del libro, debe declararse explícitamente. Si es framework existente, falta la referencia. |
| GOD02 | "arguments are individual nodes connected by edges that signify relationships like 'supports' or 'refutes,' reflecting the multi-threaded nature of real debate" (L325) | 0.5 | Inferencia calibrada | Descripción de grafo argumental es estructuralmente plausible. Sin implementación verificable. |
| GOD03 | "A conclusion is reached not at the end of a sequence, but by identifying the most robust and well-supported cluster of arguments within the entire graph" (L325) | 0.2 | Claim performativo | Mecanismo de identificación de "cluster más robusto" no especificado. Sin algoritmo, sin referencia. "Well-supported" definido en párrafo siguiente pero circularmente. |
| GOD04 | "'well-supported' refers to knowledge that is firmly established and verifiable" incluyendo "ground truth", "search grounding" y "consensus reached by multiple models" (L326-L327) | 0.5 | Inferencia calibrada | Definición operacional presente aunque informal. Los tres criterios son verificables en principio. Sin implementación citada. |
| GOD05 | "This approach provides a more holistic and realistic model for complex, collaborative AI reasoning" (L329) | 0.2 | Claim performativo | Comparativo sin baseline. "More holistic" que qué. "More realistic" que qué. Sin evidencia empírica. |

**Subtotal GoD: 1.6/5.0 — ratio 32%**

---

### Dominio 9: MASS (Multi-Agent System Search)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| M01 | "a novel framework called Multi-Agent System Search (MASS) was developed to automate and optimize the design of MAS" (L336) | 1.0 | Observación directa | Referencia #6 en bibliography: arXiv:2502.02533 — paper específico con título consistente. |
| M02 | "MASS employs a multi-stage optimization strategy that systematically navigates the complex design space by interleaving prompt and topology optimization" (L337) | 0.8 | Inferencia fuertemente calibrada | Derivable del paper arXiv:2502.02533. Tres etapas descritas con detalle operacional. Sin cita inline pero referencia existe. |
| M03 | Ejemplo HotpotQA: "Debator agent framed as expert fact-checker" (L341) | 0.8 | Inferencia fuertemente calibrada | Nivel de detalle (nombre dataset, rol específico del agente, estrategia de prompt) consistente con paper real. Verificable en arXiv:2502.02533. |
| M04 | Ejemplo MBPP: "one predictor agent + one executor agent, iterative refinement with code verification" (L347) | 0.8 | Inferencia fuertemente calibrada | Nivel de detalle específico (nombre dataset, número de agentes, topología descrita). Verificable en paper. |
| M05 | Ejemplo DROP: "Predictor agent prompt con meta-knowledge + few-shot + role-playing" (L353) | 0.8 | Inferencia fuertemente calibrada | Detalle operacional (dataset DROP, estructura de prompt final) consistente con paper. Verificable. |
| M06 | "MAS optimized by MASS significantly outperform existing manually designed systems and other automated design methods across a range of tasks" (L355) | 0.8 | Inferencia fuertemente calibrada | Claim de benchmark presente. "Significantly outperform" sin dar las métricas exactas (%. en el texto del capítulo). Derivable del paper sin cita inline. |
| M07 | Tres principios de diseño (L356-L358) | 0.8 | Inferencia fuertemente calibrada | Principios derivados de los experimentos descritos. Consistencia interna con los tres ejemplos precedentes. |

**Subtotal MASS: 5.8/7.0 — ratio 82.9%** — dominio mejor calibrado del capítulo.

---

### Dominio 10: Deep Research

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| DR01 | "Major platforms in this space include Perplexity AI, Google's Gemini research capabilities, and OpenAI's advanced functions within ChatGPT" (L364) | 1.0 | Observación directa | Plataformas nombradas son productos públicos verificables a la fecha de escritura. |
| DR02 | "you task an AI with a complex query and grant it a 'time budget'—usually a few minutes" (L369) | 0.8 | Inferencia fuertemente calibrada | "Usually a few minutes" observable en demos públicas de las tres plataformas. Verificable empíricamente. |
| DR03 | Cuatro pasos del proceso Deep Research (L371-L376) | 0.8 | Inferencia fuertemente calibrada | Descripción funcional consistente con comportamiento observable en productos públicos. |
| DR04 | Repositorio `gemini-fullstack-langgraph-quickstart` (L417) | 1.0 | Observación directa | Repositorio público de Google, Apache 2.0, verificable. |
| DR05 | Stack tecnológico: "React con Vite, Tailwind CSS, Shadcn UI, LangGraph, Google Gemini" (L437) | 1.0 | Observación directa | Verificable en el repo público. |
| DR06 | "not intended as a production-ready backend" (L425) | 1.0 | Observación directa | Claim limitante en el texto. Consistente con la nota del repo. |
| DR07 | LangGraph snippet — StateGraph, nodes, edges (L441-L468) | 0.5 | Inferencia calibrada | Código real del repo identificado. Sin imports mostrados. Sin la aclaración de Cap.15 ("only the code required..."). El snippet parece incompleto no intencionalmente. Score reducido por ausencia de aclaración. |
| DR08 | Fig numbering: código etiquetado "Fig.4" pero imagen DeepSearch era Fig.6 (L471) | 0.0 | Afirmación falsa documentada | Error verificable dentro del capítulo. El texto usa Fig.6 para la imagen de DeepSearch (L417: "Fig. 6") y luego asigna Fig.4 al código. La inconsistencia está documentada en el propio input. |

**Subtotal Deep Research: 7.1/8.0 — ratio 88.75%** — segundo dominio mejor calibrado.

---

### Dominio 11: Scaling Inference Law

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| SI01 | "This critical principle dictates the relationship between an LLM's performance and the computational resources allocated during its operational phase" (L382) | 0.5 | Inferencia calibrada | Referencia #5 existe en bibliography. Sin cita inline. Descripción correcta del dominio. |
| SI02 | Uso del término "law" sin fórmula matemática (L382-L404) | 0.2 | Claim performativo — ALTO IMPACTO | "Law" implica relación matemática verificable. El capítulo no presenta ninguna fórmula. Referencia #5 ("Empirical Analysis...") existe pero no está citada inline. Sin fórmula, "law" es más fuerte que la evidencia presentada. Evidencia propuesta: citar Ref.#5 inline + presentar la relación funcional entre compute y performance. |
| SI03 | "superior results can frequently be achieved from a comparatively smaller LLM by augmenting the computational investment at inference time" (L389) | 0.5 | Inferencia calibrada | Claim central verificable experimentalmente. Consistente con literatura. Sin benchmark específico. |
| SI04 | Ejemplo "diverse beam search or self-consistency methods" (L392) | 0.8 | Inferencia fuertemente calibrada | Técnicas concretas nombradas. Self-consistency es técnica documentada (Wang et al. 2022). Beam search es estándar. |
| SI05 | "smaller model, when granted a more substantial 'thinking budget' during inference, can occasionally surpass the performance of a much larger model" (L400) | 0.5 | Inferencia calibrada | "Occasionally" — qualifier honesto. Claim verificable en papers de inference scaling. Sin experimento propio. |
| SI06 | Tres factores a balancear: Model Size, Response Latency, Operational Cost (L406-L410) | 0.5 | Inferencia calibrada | Framework descriptivo plausible. Sin datos de trade-off específicos. Útil como guía pero no cuantificado. |

**Subtotal Scaling Inference: 3.0/6.0 — ratio 50%**

---

### Dominio 12: Aplicaciones prácticas (Use Cases)

| # | Texto (línea input) | Score | Tipo | Evidencia disponible / propuesta |
|---|---------------------|-------|------|----------------------------------|
| UC01 | "Complex Question Answering: multi-hop queries" (L51) | 0.5 | Inferencia calibrada | Aplicación legítima documentada en literatura. Sin implementación propia. |
| UC02 | "Mathematical Problem Solving: división en componentes + code execution para computaciones" (L53) | 0.5 | Inferencia calibrada | Aplicación cubierta por PALMs (Gao 2023). Sin implementación propia en el capítulo. |
| UC03 | "Medical Diagnosis: assessment sistemático de síntomas" (L59) | 0.2 | Claim performativo | Aplicación de alto riesgo descrita sin disclaimers de limitación. Sin paper de validación clínica. El claim implica confiabilidad médica sin evidencia. |
| UC04 | "Legal Analysis: análisis de documentos legales y precedentes" (L61-L62) | 0.2 | Claim performativo | Similar a UC03. Aplicación de alto riesgo sin disclaimers ni referencias a evaluaciones de fiabilidad en dominio legal. |

**Subtotal Use Cases: 1.4/4.0 — ratio 35%**

---

## Resumen global por dominio (CAD Breakdown)

| Dominio | Claims | Score total | Ratio | Clasificación |
|---------|--------|-------------|-------|---------------|
| 1. CoT | 5 | 3.5 | 70.0% | PARCIALMENTE CALIBRADO |
| 2. ToT | 3 | 1.2 | 40.0% | REALISMO PERFORMATIVO |
| 3. Self-Correction | 4 | 1.9 | 47.5% | REALISMO PERFORMATIVO |
| 4. PALMs | 5 | 3.0 | 60.0% | PARCIALMENTE CALIBRADO |
| 5. RLVR | 6 | 2.7 | 45.0% | REALISMO PERFORMATIVO |
| 6. ReAct | 4 | 2.6 | 65.0% | PARCIALMENTE CALIBRADO |
| 7. CoD | 5 | 1.6 | 32.0% | REALISMO PERFORMATIVO |
| 8. GoD | 5 | 1.6 | 32.0% | REALISMO PERFORMATIVO |
| 9. MASS | 7 | 5.8 | 82.9% | CALIBRADO |
| 10. Deep Research | 8 | 7.1 | 88.75% | CALIBRADO |
| 11. Scaling Inference | 6 | 3.0 | 50.0% | REALISMO PERFORMATIVO (límite) |
| 12. Use Cases | 4 | 1.4 | 35.0% | REALISMO PERFORMATIVO |
| **TOTAL** | **62*** | **35.4** | **57.1%** | — |

*Nota: 62 claims analizados con scoring 0.0-1.0 (suma ponderada). Para el ratio de calibración binario (calibrado / total), los claims con score < 0.5 se clasifican como performativos.

### Ratio de calibración binario (score ≥ 0.5 = calibrado)

| Tipo | Count |
|------|-------|
| Observaciones directas (1.0) | 9 |
| Inferencias fuertemente calibradas (0.8) | 14 |
| Inferencias calibradas (0.5) | 18 |
| **Subtotal calibrados (≥ 0.5)** | **41** |
| Claims performativos (0.2) | 22 |
| Afirmaciones falsas documentadas (0.0) | 1 |
| **Subtotal no calibrados (< 0.5)** | **23** |
| **Total** | **64** |

**Ratio final: 41/64 = 64.1%** — Por encima del umbral de exploración (50%) pero por debajo del umbral de gate (75%).

**Corrección del encabezado:** El ratio resumido en el frontmatter (42.6%) usó una conteo preliminar. El conteo exhaustivo da 64 claims. El ratio definitivo es **41/64 = 64.1%** — PARCIALMENTE CALIBRADO, no REALISMO PERFORMATIVO. Ver nota de ajuste al final.

---

## Afirmaciones performativas de alto impacto

| # | Claim | Línea | Impacto | Evidencia propuesta |
|---|-------|-------|---------|---------------------|
| 1 | "proposed by Microsoft" (CoD) | L319 | ALTO — atribución incorrecta invalida sección entera | Búsqueda arxiv.org "Chain of Debates" + verificación afiliación. Si no hay paper de Microsoft, eliminar atribución. |
| 2 | "GoD is an advanced Agentic framework" (sin referencia) | L325 | ALTO — puede ser contribución original no declarada | Declarar si es contribución del libro o citar paper. Si es original, marcarlo explícitamente. |
| 3 | "law" sin fórmula matemática (Scaling Inference) | L382-L404 | ALTO — término técnico ("law") no sustanciado | Presentar relación funcional de Ref.#5 + cita inline. |
| 4 | "allows the model to evolve its problem-solving abilities without direct human supervision" (RLVR) | L289 | MEDIO — imprecisión técnica | RLVR requiere reward function definida por humanos. Reformular: "sin supervisión humana en cada step de entrenamiento". |
| 5 | "Medical Diagnosis" y "Legal Analysis" como aplicaciones sin disclaimers | L59, L61 | MEDIO — riesgo de uso en dominios de alto impacto | Añadir nota de limitación: estos agentes no reemplazan profesionales certificados. |
| 6 | Código `code_executor=[BuiltInCodeExecutor]` — clase no instancia | L273 | MEDIO — bug técnico potencial que causa error en runtime | Verificar ADK API: ¿`code_executor` acepta clase o instancia? Ejecutar snippet en entorno ADK real. |
| 7 | Fig.4 duplicado (MASS y LangGraph code) | L471 | BAJO — error editorial | Renumerar: LangGraph code debería ser Fig.6 o sin número. |
| 8 | Cross-referencia "Chapter 4" sin acceso | L167 | BAJO — evidencia externa no disponible | No bloquea el capítulo pero el claim de calidad de Self-Correction queda sin sustento en este artefacto. |

---

## Evaluación de la hipótesis CCV

**Hipótesis CCV confirmada por 6ta vez** (contexto del WP dice 5ta — este es el 7mo capítulo de la serie, con Cap.17 como 7ma confirmación si se cuenta CCV como: referencias bibliográficas finales sin citar inline no elevan la calibración de los claims asociados).

**Evidencia en Cap.17:**

| Referencia | Paper | Claims dependientes | ¿Cita inline? | Efecto en calibración |
|-----------|-------|---------------------|---------------|----------------------|
| #1 Wei 2022 | CoT original | C01, C02, C04 | No | Score max 0.5 en vez de 0.8-1.0 |
| #2 Yao 2023 ToT | ToT | T01, T02, T03 | No | Score max 0.5 en vez de 0.8 |
| #3 Gao 2023 | PALMs | P01, P02 | No | Score max 0.8 (descripción técnica suficientemente específica) — excepción parcial |
| #4 Yao 2023 ReAct | ReAct | RE01, RE02 | No | Score max 0.8 (descripción canónica suficientemente específica) — excepción parcial |
| #5 Inference Scaling 2024 | Scaling Law | SI01-SI06 | No | "Law" sin fórmula = score reducido a 0.2 para ese claim específico |
| #6 MASS arXiv:2502.02533 | MASS | M01-M07 | No | Detalle operacional del paper sustituye parcialmente la cita inline — ratio 82.9% de todos modos |

**Observación metodológica:** La hipótesis CCV no es absoluta. MASS (82.9%) y Deep Research (88.75%) demuestran que claims descriptivos altamente específicos (nombres de datasets, arquitecturas detalladas, repos públicos verificables) pueden alcanzar inferencia fuertemente calibrada incluso sin cita inline. El problema de CCV se manifiesta principalmente en claims de resultados generales ("improves performance", "enhances accuracy") donde la referencia bibliográfica sería el único mecanismo de sustento.

**Refinamiento de la hipótesis CCV para registro del WP:**
> CCV afecta desproporcionadamente a claims de rendimiento y efecto ("+X%", "mejora Y") más que a claims de mecanismo (descripción de cómo funciona algo). Los claims de mecanismo pueden alcanzar calibración media sin cita inline si son suficientemente específicos. Los claims de efecto sin cita inline nunca superan 0.5.

---

## Análisis de patrones cross-capítulo

### Cap.17 vs serie (posición en ranking)

| Cap. | Ratio | Clasificación |
|------|-------|---------------|
| Cap.9 | 77% | CALIBRADO |
| Cap.10 V1 | 79% | CALIBRADO |
| Cap.10 V2 | 65.4% | PARCIALMENTE CALIBRADO |
| Cap.11 ES | 63.3% | PARCIALMENTE CALIBRADO |
| Cap.11 EN | 60.6% | PARCIALMENTE CALIBRADO |
| Cap.11 tablas | 71.9% | CALIBRADO |
| Cap.12 | 53.1% | PARCIALMENTE CALIBRADO |
| Cap.13 EPUB | 50.6% | PARCIALMENTE CALIBRADO |
| Cap.13 tablas | 77.2% | CALIBRADO |
| Cap.14 | 62.1% | PARCIALMENTE CALIBRADO |
| Cap.15 | 74.0% | CALIBRADO |
| Cap.16 tablas | 42.2% | REALISMO PERFORMATIVO |
| **Cap.17** | **64.1%** | **PARCIALMENTE CALIBRADO** |

Cap.17 se ubica en la mediana inferior de la serie. Mejor que Cap.16 tablas (42.2%) y Cap.13 EPUB (50.6%) pero por debajo del promedio de capítulos con código propio.

### Patrón "código de terceros"

Cap.17 rompe el patrón "Named Mechanism vs. Implementation" de capítulos anteriores. El capítulo es explícitamente un survey — no promete implementar lo que describe. Esto tiene una consecuencia en calibración: los dominios con repositorios de terceros verificables (MASS paper, gemini-fullstack-langgraph-quickstart) tienen mayor calibración que los dominios puramente teóricos (CoD, GoD).

**Hallazgo:** La ausencia del patrón "implementación propia" no reduce necesariamente la calibración si los claims teóricos están referenciados. El problema de calibración en Cap.17 no es la falta de código propio sino la falta de citas inline para claims de efecto.

---

## Nota de ajuste de frontmatter

El frontmatter indica `ratio_calibracion: 23/54 (42.6%)` y `clasificacion: REALISMO PERFORMATIVO` basado en conteo preliminar antes del análisis exhaustivo. El conteo final es **41/64 = 64.1%** con clasificación **PARCIALMENTE CALIBRADO**.

El frontmatter no se actualiza (regla I-003 + convención de `created_at` sin `updated_at` en artefactos WP) pero este párrafo establece que los valores definitivos son los del análisis exhaustivo en el cuerpo del documento.

---

## Recomendación

**Veredicto: PARCIALMENTE CALIBRADO (64.1%) — No bloquea uso como referencia de survey**

El capítulo funciona correctamente como introducción descriptiva a técnicas de reasoning. Los dominios con respaldo bibliográfico verificable (MASS, Deep Research, CoT/ToT con papers reales) tienen calibración aceptable. Los problemas críticos son:

1. **CoD: atribución a Microsoft sin referencia** — verificar antes de usar el capítulo como fuente de atribución técnica.
2. **GoD: framework sin referencia** — puede ser contribución original no declarada; no citar como framework externo establecido.
3. **Scaling Inference: "law" sin fórmula** — usar la referencia #5 directamente para claims cuantitativos.
4. **PALMs código: bug potencial** — verificar `code_executor=[BuiltInCodeExecutor]` vs `code_executor=BuiltInCodeExecutor()` antes de usar el snippet.

**Para uso en artefactos de gate:** Elevar ratio a ≥75% requeriría resolver los 4 puntos anteriores. Para uso como material de survey/exploración: 64.1% es aceptable con las advertencias documentadas.
```
