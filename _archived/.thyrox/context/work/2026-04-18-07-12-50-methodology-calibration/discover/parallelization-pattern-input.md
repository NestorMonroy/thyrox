```yml
created_at: 2026-04-18 08:51:42
updated_at: 2026-04-18 08:55:54
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 2.0.0
fuente: Capítulo 3 — "Paralelización" (traducción profesional CORRECTA, libro agentic design patterns)
nota: v1.0.0 basado en texto erróneo (contenía Cap.2 mezclado). Esta versión usa el capítulo real.
```

# Input: Capítulo 3 — Deep-Review Completo de Paralelización

---

## 1. Posición del capítulo en la secuencia del libro

> "En los capítulos anteriores, hemos explorado el encadenamiento de prompts para flujos de trabajo secuenciales y el enrutamiento para procesos de toma de decisiones dinámicas. Ahora nos adentramos en un tercero y poderoso patrón: la paralelización."

El capítulo se posiciona explícitamente como el tercer patrón complementario:
- Cap. 1 Chaining → secuencia lineal
- Cap. 2 Routing → lógica condicional
- Cap. 3 Parallelization → ejecución concurrente

Y el capítulo cierra con la síntesis unificadora:
> "Integrando procesamiento paralelo con flujos de control **secuencial (encadenamiento)** y **condicional (enrutamiento)**, es posible construir flujos de trabajo sofisticados que optimicen tanto el rendimiento como la flexibilidad y adaptabilidad del sistema."

Los tres patrones no son alternativos — son complementarios y forman la arquitectura completa.

---

## 2. El problema que motiva el patrón — formulación precisa

> "Mientras que el encadenamiento y el enrutamiento mejoran la funcionalidad del agente a través de la secuencia lineal o la lógica condicional, **la paralelización optimiza el rendimiento** permitiendo que múltiples operaciones ocurran de forma concurrente."

La distinción es importante:
- Chaining y Routing = mejoran **funcionalidad** (qué puede hacer el sistema)
- Parallelization = mejora **rendimiento** (cuán rápido y con cuánta cobertura lo hace)

---

## 3. El ejemplo del capítulo — paralelismo por niveles (no solo plano)

El capítulo muestra un ejemplo de investigación con dos niveles de paralelización:

**Secuencial (5 pasos, tiempo = suma de todos):**
```
1. Buscar Fuente A
2. Resumir Fuente A
3. Buscar Fuente B
4. Resumir Fuente B
5. Sintetizar resumen final
```

**Paralelo (3 pasos, tiempo = búsqueda + resumen + síntesis):**
```
1. Buscar Fuente A  AND  Buscar Fuente B        ← nivel 1 paralelo
2. Resumir Fuente A  AND  Resumir Fuente B       ← nivel 2 paralelo (bloqueado por paso 1)
3. Sintetizar resumen final                      ← secuencial (depende de paso 2)
```

**Principio extraído:** La paralelización no elimina la secuencia — identifica qué pasos no tienen dependencias entre sí y los ejecuta simultáneamente. Los pasos con dependencias siguen siendo secuenciales.

> "La idea central es **identificar partes del flujo de trabajo que no dependen de la salida de otras partes** y ejecutarlas en paralelo."

**Tiempo total:** no es el tiempo acumulativo de todas las operaciones — es el tiempo del paso más lento en cada nivel paralelo.

---

## 4. Requisito técnico — async/multithreading

> "Implementar la paralelización a menudo requiere marcos que soporten **ejecución asincrónica o multithreading**, donde el tiempo de espera de una operación puede ser utilizado por otra."

Esto tiene implicaciones directas para THYROX:
- Los evaluadores del gate calibrado deben ejecutarse con `asyncio` o equivalente
- El merger debe esperar a que **todos** los evaluadores completen antes de sintetizar
- La arquitectura es `await asyncio.gather(evaluator_1, evaluator_2, evaluator_3)` → merger

---

## 5. Los 7 casos de uso — análisis diferencial para THYROX

| # | Caso de uso | Patrón clave | Aplicación THYROX | Relevancia |
|---|------------|-------------|-------------------|-----------|
| 1 | Recopilación de información | N fuentes en paralelo → síntesis | Stage 1 DISCOVER: recopilar evidencia de múltiples sources simultáneamente | Alta |
| 2 | Procesamiento y análisis de datos | N técnicas analíticas sobre mismo dataset | Stage 3 ANALYZE: coverage + naming + architecture en paralelo | Alta |
| 3 | Multi-API / múltiples herramientas | N llamadas independientes | Sub-análisis que requieren diferentes herramientas | Media |
| 4 | Generación de contenido multi-componente | N secciones en paralelo → ensamblaje | Generar múltiples secciones de un artefacto WP simultáneamente | Media |
| **5** | **Validación y verificación** | **N predicados independientes en paralelo** | **Gate calibrado: N evaluadores simultáneos** | **Crítica** |
| 6 | Procesamiento multi-modal | texto + imagen + audio concurrentes | No aplica a THYROX (solo texto) | Baja |
| **7** | **Pruebas A/B / múltiples variantes** | **N formulaciones en paralelo → selección** | **Generar 3 versiones del exit criterion → elegir la más verificable** | **Alta** |

**Caso 5 — cita exacta:**
> "Tareas Paralelas: Verificar formato de correo electrónico, validar número telefónico, verificar dirección en una base de datos y detectar lenguaje inapropiado **simultáneamente**."

Este caso describe exactamente un gate calibrado con múltiples predicados independientes ejecutados concurrentemente.

---

## 6. Criterio de Implementación — la "Regla de Oro" de este capítulo

> "Implementar este patrón cuando un flujo de trabajo contiene múltiples operaciones independientes que pueden ejecutarse simultáneamente, tales como **recuperar datos de varios puntos finales, procesar segmentos de datos en paralelo o validar múltiples criterios de forma concurrente**."

La mención explícita de "validar múltiples criterios de forma concurrente" valida directamente el uso de paralelización en los gates THYROX.

---

## 7. Análisis del código — principios arquitectónicos

### LangChain — `RunnableParallel` + `RunnablePassthrough`

```python
map_chain = RunnableParallel({
    "summary":    summarize_chain,
    "questions":  questions_chain,
    "key_terms":  terms_chain,
    "topic":      RunnablePassthrough()  # input original pasa al merger
})
full_chain = map_chain | synthesis_prompt | LLM | StrOutputParser()
```

Principios:
1. `RunnableParallel` ejecuta todas las chains simultáneamente
2. Los resultados son un **dict estructurado** — no texto plano — que el merger puede leer por clave
3. `RunnablePassthrough()` garantiza que el input original llega al merger sin transformación
4. El merger (`synthesis_prompt | LLM`) tiene acceso a `{summary}`, `{questions}`, `{key_terms}`, `{topic}` — campos nombrados, no concatenación

### Google ADK — `ParallelAgent` + `SequentialAgent` + `output_key`

```python
researcher_agent_1 = LlmAgent(..., output_key="renewable_energy_result")
researcher_agent_2 = LlmAgent(..., output_key="ev_technology_result")
researcher_agent_3 = LlmAgent(..., output_key="carbon_capture_result")

parallel_research_agent = ParallelAgent(sub_agents=[agent_1, agent_2, agent_3])
# ParallelAgent termina cuando TODOS sus sub_agents han completado

merger_agent = LlmAgent(
    instruction="""...
    MUST be grounded *exclusively* on the information provided...
    Do NOT add any external knowledge...
    Input Summaries:
    * Renewable Energy: {renewable_energy_result}
    * Electric Vehicles: {ev_technology_result}
    * Carbon Capture: {carbon_capture_result}
    """)

sequential_pipeline_agent = SequentialAgent(
    sub_agents=[parallel_research_agent, merger_agent]
)
```

Principios:
1. `output_key` es el contrato entre el agente paralelo y el merger: produce un resultado con nombre
2. `ParallelAgent` actúa como barrera — no avanza hasta que **todos** los sub-agentes completan
3. `SequentialAgent` envuelve el paralelo + el merger: primero completa el paralelo, luego ejecuta el merger
4. El merger lee del estado compartido por clave (`{renewable_energy_result}`) — contrato explícito, no implícito

---

## 8. El principio de grounding del merger — definición operacional de anti-realismo-performativo

El merger tiene esta instrucción explícita:
> "Tu respuesta DEBE estar basada **EXCLUSIVAMENTE** en la información proporcionada en las 'Entradas Resumidas'. **NO agregues conocimiento externo, hechos o detalles no presentes en estos resúmenes específicos.**"

Este principio es la definición operacional de lo opuesto al realismo performativo:
- El merger NO puede generar afirmaciones propias
- El merger NO puede suavizar conclusiones de los sub-agentes
- Si sub-agente 1 reportó un gap, el merger no puede ignorarlo
- El output del merger es trazable: cada claim tiene un origen nombrado

**Aplicado al merger del gate calibrado THYROX:**
- Si Evaluador-Evidencia reportó `{claims_sin_ancla: 3}`, el merger no puede emitir `pass`
- Si Evaluador-Histórico reportó `{contradicciones: ["Stage 4 constraint C-02"]}`, el merger debe incluir el nombre del constraint en el diagnóstico de `rework`
- El merger no añade juicio propio — agrega y clasifica lo que los evaluadores encontraron

---

## 9. Implicación de diseño: la barrera de sincronización

El capítulo destaca que `ParallelAgent` termina cuando **todos** sus sub-agentes completan. Esta es la barrera de sincronización:

```
                        ┌─ Evaluador-1 ─┐
Input Stage N ──────────┼─ Evaluador-2 ─┼──→ BARRERA → Merger → pass/rework/escalate/unclear
                        └─ Evaluador-3 ─┘
                            (paralelo)      (sync)      (secuencial)
```

Sin barrera, el merger podría ejecutarse antes de que todos los evaluadores terminen → decisión basada en información incompleta. La barrera garantiza que el merger siempre recibe el conjunto completo de evaluaciones.

---

## 10. Síntesis: los tres patrones como arquitectura completa

La síntesis del capítulo es explícita:

| Patrón | Función | Cómo combina |
|--------|---------|-------------|
| Chaining | Secuencia con validación por eslabón | Define el flujo Stage N → Stage N+1 |
| Routing | Decisión condicional (4 rutas) en cada gate | Determina qué ruta toma el output del stage |
| **Parallelization** | **Evaluación concurrente con merger grounded** | **Cómo se genera la decisión del router** |

El gate calibrado completo combina los tres:
```
Stage N (chaining) → Gate
                      ├─ Parallelization: N evaluadores → merger grounded → verdict
                      └─ Routing: verdict → advance | rework | escalate | unclear
```

---

## Gaps identificados que no cubría el análisis previo (v1.0.0)

| Concepto real del capítulo | Estado en v1.0.0 | Corrección en v2.0.0 |
|---------------------------|-----------------|---------------------|
| Parallelization = mejora rendimiento, no funcionalidad | ❌ No distinguido | ✅ Explicitado |
| Ejemplo con 2 niveles de paralelismo (búsqueda + resumen) | ❌ No mencionado | ✅ Incluido |
| Requisito async/multithreading | ❌ Omitido | ✅ Incluido |
| Criterio de Implementación explícito del capítulo | ❌ No citado | ✅ Citado exacto |
| `output_key` como contrato nombrado entre agentes | ⚠️ Mencionado superficialmente | ✅ Analizado como contrato |
| Barrera de sincronización (todos completan antes del merger) | ❌ Omitido | ✅ Incluido |
| Síntesis de los 3 patrones como arquitectura unificada | ❌ Parcial | ✅ Citado del capítulo |

---

## Arquitectura del gate calibrado — versión revisada con los 3 patrones

```
Stage N produce artefacto
  │
  ▼  [CHAINING: output N → input gate]
Gate calibrado
  │
  ▼  [PARALLELIZATION: evaluación concurrente]
  ParallelAgent (async, barrera de sincronización)
  ├─ Evaluador-1: completitud estructural
  │               output_key="structural_result"
  │               {completo: bool, campos_faltantes: []}
  ├─ Evaluador-2: presencia de evidencia observable
  │               output_key="evidence_result"
  │               {claims_sin_ancla: N, ratio: float}
  └─ Evaluador-3: consistencia con estado acumulado del WP
                  output_key="consistency_result"
                  {contradicciones: [], consistente: bool}
  │ (BARRERA: espera todos)
  ▼
  Merger (grounded exclusively on evaluator outputs)
  ├─ Lee: {structural_result}, {evidence_result}, {consistency_result}
  ├─ NO agrega juicio propio
  └─ Produce: verdict estructurado
  │
  ▼  [ROUTING: decisión condicional]
  Router
  ├─ pass    → Stage N+1 (todos los evaluadores dentro de umbral)
  ├─ rework  → Stage N + diagnóstico específico del evaluador que falló
  ├─ escalate → SP humano (contradicción con decisión arquitectónica previa)
  └─ unclear  → revisión de criterios del evaluador que no pudo clasificar
```

---

## Pendiente para Stage 3 ANALYZE

- Definir los evaluadores mínimos necesarios por tipo de gate (no todos los stages necesitan los 3)
- Definir el contrato `output_key` de cada evaluador: campos exactos y tipos
- Definir el umbral de `pass` para el merger: ¿0 gaps? ¿gaps por debajo de N%?
- Validar si el async/multithreading es viable en el contexto de Claude Code (hooks vs agents)
- Mapear qué evaluadores corren en paralelo vs cuáles deben ser secuenciales (dependencias)
- Evaluar si el A/B de exit criteria (Caso 7) debe ser automático o solo cuando el criterio no es verificable
