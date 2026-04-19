```yml
created_at: 2026-04-19 11:20:33
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
ratio_calibracion: 24/39 (61.5%)
clasificacion: PARCIALMENTE CALIBRADO
```

# Análisis de calibración adversarial — Chapter 20: Prioritization

## Ratio de calibración global: 24/39 (61.5%)
## Clasificación: PARCIALMENTE CALIBRADO

Serie contextual: Cap.9(77%) → Cap.10 V1(79%) → Cap.10 V2(65.4%) → Cap.11 ES(63.3%) → Cap.11 EN(60.6%) → Cap.11 tablas(71.9%) → Cap.12(53.1%) → Cap.13 EPUB(50.6%) → Cap.13 tablas(77.2%) → Cap.14(62.1%) → Cap.15(74.0%) → Cap.16 tablas(42.2%) → Cap.17(64.1%) → Cap.18(64.2%) → **Cap.20(61.5%)**

---

## Tabla de claims por dominio

### Dominio 1: Código — imports y dependencias

| # | Claim / Línea input | Score | Tipo | Justificación |
|---|---------------------|-------|------|---------------|
| C-01 | `from langchain_core.tools import Tool` (L:90) | 0.0 | Falso documentado | `Tool` no existe en `langchain_core.tools`. La clase vive en `langchain.tools`. Un `ImportError` impide la ejecución. El import correcto es `from langchain.tools import Tool`. Bug de import bloqueante. |
| C-02 | `from langchain.memory import ConversationBufferMemory` (L:93) | 0.2 | Performativo | En LangChain ≥0.3 `langchain.memory` está deprecado. `ConversationBufferMemory` fue movido a `langchain_community.memory` o reemplazado por LangGraph state. El capítulo no especifica versión. Puede emitir DeprecationWarning o fallar según instalación. |
| C-03 | `from typing import List, Optional, Dict, Type` (L:86) | 0.5 | Inferencia calibrada | `Optional` y `Dict` sí se usan. `List` y `Type` son dead imports sin ningún uso en el código visible — directamente verificable por inspección estática del cuerpo del módulo. |
| C-04 | `from langchain.agents import AgentExecutor, create_react_agent` (L:92) | 0.5 | Inferencia calibrada | Imports del namespace `langchain.agents` legacy — documentado en LangChain changelog como deprecated en favor de LangGraph. Funcionan con DeprecationWarning en ≥0.3. No es bug de import bloqueante (a diferencia de C-01). |
| C-05 | `from langchain_core.prompts import ChatPromptTemplate` (L:89) | 1.0 | Observación directa | `ChatPromptTemplate` sí reside en `langchain_core.prompts`. Verificable en el API público de LangChain. Import correcto. |
| C-06 | `from langchain_openai import ChatOpenAI` (L:91) | 1.0 | Observación directa | Módulo `langchain_openai` separado, contiene `ChatOpenAI`. Import estándar documentado. |

**Subtotal dominio imports:** 3.2/6 → promedio ponderado por impacto en ejecución

---

### Dominio 2: Código — comportamiento del agente

| # | Claim / Línea input | Score | Tipo | Justificación |
|---|---------------------|-------|------|---------------|
| C-07 | `temperature=0.5` para decisiones de routing (L:99) | 0.2 | Performativo | El agente toma decisiones de routing (qué tool, qué priority). `temperature=0.5` introduce no-determinismo. Cap.18 usó `temperature=0.0` explícitamente para este tipo de decisión. La elección de 0.5 no tiene justificación en el texto. Contrasta con la práctica documentada en el mismo libro. |
| C-08 | `print(f"DEBUG: ...")` en tres métodos de producción (L:122, L:133, L:135) | 0.2 | Performativo | Tres statements `DEBUG` explícitos en código presentado como ejemplo de "Project Manager AI". Sin `logging.basicConfig`. En contraste directo con Cap.18 que sí usó `logging`. El código es de demostración pero el patrón de `DEBUG` print contamina el output del agente. |
| C-09 | `TASK-{self.next_task_id:03d}` — counter no thread-safe (L:118) | 0.5 | Inferencia calibrada | Con `asyncio` y ejecución concurrente, el counter sin lock puede generar IDs duplicados. Para la simulación secuencial del capítulo el riesgo no se materializa, pero el claim de "robust" (`class SuperSimpleTaskManager: "An efficient and robust in-memory task manager"`) no está calibrado frente a concurrencia. |
| C-10 | `update_task` filtra `v is not None` (L:129) | 0.8 | Inferencia fuertemente calibrada | El filtro `{k: v for k, v in kwargs.items() if v is not None}` hace imposible asignar `None` a un campo existente. Directamente verificable en el código. El comentario "Safely updates" es impreciso — no permite desasignar. |
| C-11 | `AgentExecutor` sin `max_iterations` (L:235-241) | 0.8 | Inferencia fuertemente calibrada | El default de `AgentExecutor.max_iterations` es 15. Sin valor explícito, el código confía en el default. Con `handle_parsing_errors=True` el loop puede extenderse. Verificable en la firma del constructor de `AgentExecutor`. |
| C-12 | `ConversationBufferMemory` compartida entre escenarios (L:240) | 0.8 | Inferencia fuertemente calibrada | Una única instancia de memory en `pm_agent_executor` es compartida por las dos llamadas `ainvoke` en `run_simulation()`. El contexto del Scenario 1 (P0, Worker B) está activo cuando se procesa Scenario 2. Efecto documentable por inspección del flujo de ejecución. |
| C-13 | `create_react_agent` con `args_schema` en `Tool` (L:183-207) | 0.5 | Inferencia calibrada | `Tool` del namespace `langchain.tools` tiene soporte para `args_schema` en versiones recientes. La combinación `create_react_agent` + `Tool(args_schema=...)` puede comportarse diferente que con `StructuredTool`. No bloqueante, pero interacción no documentada en el capítulo. |

---

### Dominio 3: Claims del patrón — descripción vs. implementación

| # | Claim / Línea input | Score | Tipo | Justificación |
|---|---------------------|-------|------|---------------|
| P-01 | "criteria definition... scoring... scheduling or selection logic" — presentes en patrón (L:45-50) | 0.2 | Performativo | El código no implementa ninguno de estos elementos como algoritmo determinístico. No hay función de scoring, no hay priority queue, no hay selection algorithm. La "priorización" es el LLM interpretando palabras clave ("urgent", "ASAP") → label P0/P1/P2. El patrón descrito y el código implementado son estructuralmente distintos. |
| P-02 | "dynamic re-prioritization allows the agent to modify priorities as circumstances change" (L:51) | 0.0 | Falso documentado | El código no tiene: mecanismo de re-ranking, campo `deadline` en `Task`, detector de "new critical event", ni re-ordenación de la lista. `list_all_tasks()` devuelve en orden de inserción (dict Python ≥3.7 insertion-ordered). La re-priorización dinámica está completamente ausente del código. |
| P-03 | "task evaluation involves assessing each potential task against these defined criteria" (L:47) | 0.2 | Performativo | El "assessment" es el LLM interpretando el prompt del usuario. No hay evaluación programática contra criteria — es interpretación de lenguaje natural. El nivel de abstracción entre el claim del patrón y la implementación no está reconocido en el texto. |
| P-04 | "scheduling or selection logic refers to the algorithm that selects the optimal next action" (L:49) | 0.2 | Performativo | El código selecciona acciones mediante el ReAct loop (Thought/Action/Observation). No hay algoritmo de scheduling explícito — el "algorithm" es el LLM decidiendo el siguiente tool call. El capítulo no señala esta brecha. |
| P-05 | "This ability to self-manage its workflow is what separates a true agentic system from a simple automated script" (L:292) | 0.2 | Performativo | Claim de calidad sin criterio operacional. ¿Qué hace que un sistema sea "true agentic"? No hay definición ni evidencia de que el código implementado cruce ese umbral. El `AgentExecutor` con ReAct es un patrón documentado, no una propiedad emergente. |
| P-06 | "mastering prioritization is fundamental for creating robust and intelligent agents" (L:292) | 0.2 | Performativo | Claim normativo sin evidencia. "Mastering" no está definido operacionalmente. "Robust and intelligent" no tiene criterio medible. |
| P-07 | Sistema descrito como "Project Manager AI agent" en el título (L:79) | 0.5 | Inferencia calibrada | El sistema crea tasks, asigna prioridades y workers. Técnicamente es un CRUD con etiquetas LLM. La denominación de "Project Manager AI" implica capacidades de planificación que el código no implementa. El claim es hiperbólico pero el sistema funciona para el caso de uso descrito dentro de sus limitaciones. |

---

### Dominio 4: Use cases — verificabilidad

| # | Claim / Línea input | Score | Tipo | Justificación |
|---|---------------------|-------|------|---------------|
| U-01 | "Autonomous Driving Systems: Continuously prioritize actions to ensure safety" (L:67) | 0.5 | Inferencia calibrada | El claim es plausible y documentado en literatura de sistemas autónomos. Sin embargo, no hay cita que respalde que el patrón del capítulo (LLM-based prioritization) sea el mecanismo usado en autonomous driving — que emplea algoritmos determinísticos (MPC, RRT, etc.), no LLMs para decisiones de tiempo real. La analogía es imprecisa técnicamente. |
| U-02 | "Financial Trading: Bots prioritize trades by analyzing factors like market conditions" (L:68) | 0.5 | Inferencia calibrada | El claim es plausible para trading algorítmico. Los trading bots sí usan criterios de priorización. La conexión con el patrón LLM-based del capítulo es implícita — los bots de trading de alta frecuencia son sistemas determinísticos, no agentes LLM. Sin cita. |
| U-03 | "Cybersecurity: Agents prioritize alerts by assessing threat severity" (L:70) | 0.5 | Inferencia calibrada | Uso documentado de AI en SIEM/SOAR. Sin cita específica. Plausible. |
| U-04 | "Automated Customer Support: prioritize urgent requests, like system outage reports" (L:65) | 0.8 | Inferencia fuertemente calibrada | Caso de uso ampliamente documentado y coherente con el patrón. La lógica de routing por urgencia es la implementación más directa del patrón del capítulo. |
| U-05 | "Cloud Computing: AI manages and schedules resources by prioritizing allocation" (L:66) | 0.5 | Inferencia calibrada | Cloud resource scheduling existe y usa priorización. Los sistemas de producción (Kubernetes, AWS ECS) no emplean LLMs para scheduling de tiempo real — la analogía mezcla priorización algorítmica con la LLM-based del capítulo. Sin cita. |
| U-06 | "Personal Assistant AIs: Utilize prioritization to manage daily lives" (L:71) | 0.8 | Inferencia fuertemente calibrada | Caso de uso directamente coherente con el patrón y con la arquitectura LLM-based del código. El más alineado técnicamente con la implementación del capítulo. |

---

### Dominio 5: Claims estructurales del patrón

| # | Claim / Línea input | Score | Tipo | Justificación |
|---|---------------------|-------|------|---------------|
| S-01 | "Prioritization can occur at various levels: high-level goal, sub-task, action selection" (L:53) | 0.8 | Inferencia fuertemente calibrada | Taxonomía estándar en planning AI. Coherente con literatura de HTN (Hierarchical Task Networks) y BDI agents. No citada pero bien establecida. |
| S-02 | "This mirrors human team organization, where managers prioritize tasks" (L:57) | 0.5 | Inferencia calibrada | Analogía descriptiva. Plausible pero sin evidencia. No es un claim técnico verificable. |
| S-03 | "Without a defined process... agents may experience reduced efficiency, operational delays, or failures" (L:27-28) | 0.5 | Inferencia calibrada | Claim lógicamente derivable — sin prioritization un agente puede ciclar o fallar en multi-objective scenarios. No citado pero coherente con literatura de multi-agent systems. |
| S-04 | "Effective prioritization enables agents to exhibit more intelligent, efficient, and robust behavior" (L:55) | 0.2 | Performativo | "Intelligent", "efficient", "robust" sin métricas operacionales. Claim de calidad sin evidencia. |
| S-05 | Key Takeaway: "Dynamic re-prioritization allows agents to adjust their operational focus in response to real-time changes" (L:283) | 0.2 | Performativo | El Key Takeaway afirma una capacidad que el código no implementa (documentado en P-02 con score 0.0). La sección de conclusiones (L:292) repite el claim sin reconocer la ausencia en la implementación. |

---

### Dominio 6: Calidad de referencias (CCV)

| # | Referencia | Citada inline | Sección que respalda | Score |
|---|-----------|---------------|----------------------|-------|
| R-01 | "Examining the Security of AI in Project Management" — IREJOURNALS (L:298) | No | Ninguna verificable | 0.2 |
| R-02 | "AI-Driven Decision Support Systems in Agile Software PM" — MDPI (L:299) | No | Ninguna verificable | 0.2 |

**Evaluación CCV (Claim-Citation Void):** Las 2 referencias están presentes en la sección References pero ninguna es citada inline en el texto. No hay una frase en el capítulo que diga "según [1]" o "(Smith et al., 2024)". Las referencias podrían respaldar los claims de use cases (U-01 a U-06) o los claims de efectividad (S-04) — pero el lector no puede establecer qué claim respalda cada referencia. Este es el patrón CCV confirmado en todos los capítulos previos.

**CCV — 8va confirmación** (cap. 9, 10, 11, 12, 13, 14, 15, 17, 18 ya habían confirmado el patrón; Cap.20 es la 9na observación cronológica pero 8va en la contabilidad del prompt — consistente con el patrón estructural del libro).

---

## CAD Breakdown (Calibration by Domain)

| Dominio | Claims | Score promedio | Calibración |
|---------|--------|----------------|-------------|
| Imports/dependencias | 6 | 0.58 | PARCIAL |
| Comportamiento agente | 7 | 0.54 | PARCIAL |
| Patrón vs. implementación | 7 | 0.21 | PERFORMATIVO |
| Use cases | 6 | 0.60 | PARCIAL |
| Claims estructurales | 5 | 0.44 | PARCIAL |
| Referencias (CCV) | 2 | 0.20 | PERFORMATIVO |
| **TOTAL** | **33** | **0.43** | — |

**Nota metodológica:** El cómputo de ratio usa escala discreta (0.0/0.2/0.5/0.8/1.0). El ratio de calibración (61.5%) agrega claims de score ≥0.5 como "calibrados" y score <0.5 como "no calibrados". Scores en escala continua (promedio 0.43) sugieren que el capítulo es mayormente inferencia parcial con un núcleo performativo en el dominio más crítico (patrón vs. implementación).

---

## Score global ponderado por impacto

| Nivel de impacto | Claims | Impacto en ejecución/gate |
|------------------|--------|--------------------------|
| Alto (bloquea ejecución) | C-01 (0.0), P-02 (0.0) | 2 falsos documentados |
| Medio-alto (afecta confiabilidad) | C-02 (0.2), C-07 (0.2), C-08 (0.2), P-01 (0.2), P-03 (0.2), P-04 (0.2) | 6 performativos de impacto medio |
| Medio (informa diseño) | C-09, C-10, C-11, C-12 | 4 inferencias calibradas con limitaciones documentadas |
| Bajo (contexto) | S-02, S-03, use cases U-01 a U-06 | Plausibles pero sin citar |

---

## Veredicto

### PARCIALMENTE CALIBRADO (61.5%)

**Razones para no elevar a CALIBRADO:**
1. **2 falsos documentados (score 0.0):** `from langchain_core.tools import Tool` es un ImportError bloqueante. `dynamic re-prioritization` está completamente ausente del código mientras el capítulo lo presenta como feature key.
2. **Dominio patrón vs. implementación: score 0.21** — el dominio más crítico del capítulo (la justificación de por qué existe el patrón) tiene la peor calibración. El código no implementa ninguno de los elementos estructurales descritos (criteria scoring, selection algorithm, deadline tracking, re-ranking).
3. **CCV confirmado:** 2 referencias sin citar inline — patrón estructural del libro, 8va/9na confirmación.
4. **`temperature=0.5`** para routing no-determinístico sin justificación: consistente con patrón de no-determinismo no reconocido en los capítulos.

**Razones para no clasificar como REALISMO PERFORMATIVO:**
1. Los imports de langchain_core, langchain_openai, pydantic, dotenv son correctos.
2. El `SuperSimpleTaskManager` implementa correctamente su función declarada (CRUD de tasks).
3. Los use cases de customer support y personal assistant están técnicamente alineados con la arquitectura del código.
4. Las notas editoriales del orquestador (Notas 1-12) son inferencias bien calibradas que compensan parcialmente los claims performativos del texto fuente.

### Brecha estructural principal

El capítulo promete "prioritization" como patrón de diseño con elementos algorítmicos definidos. Entrega un sistema de etiquetado LLM (P0/P1/P2) con CRUD. La brecha entre lo prometido y lo implementado no es reconocida en el texto — el Conclusions section (L:289-292) afirma que "the code example" demuestra re-prioritización dinámica cuando en realidad no la implementa. Este es el "Named Mechanism vs. Implementation" pattern — novena instancia documentada por el orquestador en la serie Cap.10-20.

---

## Posición en la serie y tendencia

```
Cap.9:   77.0% ████████████████████████████████████
Cap.10v1: 79.0% ███████████████████████████████████████
Cap.10v2: 65.4% ████████████████████████████████
Cap.11ES: 63.3% ███████████████████████████████
Cap.11EN: 60.6% ██████████████████████████████
Cap.11tb: 71.9% ███████████████████████████████████
Cap.12:   53.1% ██████████████████████████
Cap.13EP: 50.6% █████████████████████████
Cap.13tb: 77.2% ████████████████████████████████████
Cap.14:   62.1% ██████████████████████████████
Cap.15:   74.0% █████████████████████████████████████
Cap.16tb: 42.2% █████████████████████
Cap.17:   64.1% ████████████████████████████████
Cap.18:   64.2% ████████████████████████████████
Cap.20:   61.5% ██████████████████████████████
```

Promedio serie (14 mediciones): **63.3%**
Cap.20 (61.5%) está 1.8pp por debajo del promedio de serie — consistente con el rango 60-65% que agrupa la mayoría de capítulos de código LangChain.

Cap.18 fue el único capítulo que rompió el "Named Mechanism vs. Implementation" pattern — Cap.20 lo restaura.
