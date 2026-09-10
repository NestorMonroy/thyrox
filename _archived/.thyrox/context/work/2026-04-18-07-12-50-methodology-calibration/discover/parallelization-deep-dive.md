```yml
created_at: 2026-04-18 09:02:08
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
topic: Capítulo 3 — Paralelización (deep-review exhaustivo)
ratio_calibracion: N/A (documento de análisis, no artefacto de gate)
clasificacion: N/A
```

# Deep-Review: Capítulo 3 — Paralelización

> Este documento es el análisis exhaustivo del Capítulo 3. No repite lo ya documentado
> en `parallelization-pattern-input.md` (v2.0.0) — lo extiende con conexiones al corpus
> THYROX, análisis de código línea por línea, mapeo a los 12 stages, riesgos y síntesis
> con los tres capítulos previos (Cap. 1 Chaining, Cap. 6 Agente, Cap. 2 Routing).

---

## 1. Lo que ya está documentado — no repetir

`parallelization-pattern-input.md` v2.0.0 cubre exhaustivamente:

- La posición del capítulo como tercer patrón complementario
- El ejemplo de dos niveles de paralelismo (búsqueda + resumen)
- El criterio de implementación del capítulo ("validar múltiples criterios concurrentemente")
- Los 7 casos de uso con relevancia diferencial para THYROX
- Análisis de `RunnableParallel`, `output_key`, `ParallelAgent`, `SequentialAgent`
- El principio de grounding del merger como definición operacional de anti-realismo-performativo
- La barrera de sincronización
- La arquitectura del gate calibrado combinando los tres patrones

Este documento no repite ninguno de esos contenidos. Los asume como base.

---

## 2. Análisis línea por línea del código LangChain

### 2.1. Inicialización defensiva del LLM

```python
try:
    LLM: Optional[ChatOpenAI] = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
except Exception as e:
    print(f"Error initializing language model: {e}")
    LLM = None
```

**Qué hace:** Inicializa el LLM con manejo de excepción. Si la inicialización falla (API key ausente, red inaccesible), `LLM` queda como `None`.

**Por qué importa para el diseño del gate:** Los evaluadores paralelos de THYROX deben implementar el mismo patrón defensivo. Un evaluador que falla en inicialización no debe silenciosamente producir `pass` — debe producir `unclear` o propagar el error al merger con un campo explícito:

```python
# Patrón correcto para evaluadores THYROX:
try:
    evaluador = EvaluadorEstructural(...)
except Exception as e:
    return {"structural_result": {"error": str(e), "status": "unclear"}}
```

**Implicación de calibración:** El merge que recibe `{"status": "unclear"}` de cualquier evaluador debe enrutar a `unclear`, no a `pass`. La ausencia de evaluación no es evidencia de calidad — es evidencia de que el sistema de evaluación no funcionó.

### 2.2. Definición de cadenas por responsabilidad única

```python
summarize_chain: Runnable = (
    ChatPromptTemplate.from_messages([
        ("system", "Summarize the following topic concisely:"),
        ("user", "{topic}")
    ]) | LLM | StrOutputParser()
)

questions_chain: Runnable = (...)
terms_chain: Runnable = (...)
```

**Qué hace:** Cada `chain` es una pipeline completa e independiente: prompt → modelo → parser. Son `Runnable` — pueden componerse con `|` (pipe operator de LCEL).

**Por qué importa:** Cada chain tiene exactamente una responsabilidad. `summarize_chain` no genera preguntas. `questions_chain` no identifica términos. Esta separación garantiza:
1. Cada evaluador es reemplazable sin afectar a los demás
2. Si un evaluador necesita cambiar (ej: el evaluador de consistencia necesita contexto del WP), solo se modifica esa chain
3. Los outputs son estructurados y predecibles para el merger

**Aplicado a evaluadores THYROX:** El evaluador de completitud estructural (`structural_result`) debe ser completamente independiente del evaluador de evidencia observable (`evidence_result`). Deben compartir solo el artefacto de entrada — no el estado interno ni las conclusiones intermedias.

### 2.3. `RunnableParallel` con dict nombrado + `RunnablePassthrough`

```python
map_chain = RunnableParallel({
    "summary":    summarize_chain,
    "questions":  questions_chain,
    "key_terms":  terms_chain,
    "topic":      RunnablePassthrough(),
})
```

**Qué hace:**
- `RunnableParallel({...})` ejecuta todas las chains del diccionario simultáneamente cuando recibe el mismo input
- El resultado es siempre un `dict` con las mismas claves — independientemente del orden en que terminen los procesos internos
- `RunnablePassthrough()` es un "wire" que pasa el input original sin transformación bajo la clave `"topic"`

**Por qué `RunnablePassthrough()` importa:** El merger necesita el input original para contexto. Sin este campo, el merger solo tiene las transformaciones — no puede verificar que las transformaciones son fieles al input. En un gate THYROX, el artefacto original (`artifact_content`) debe pasarse al merger junto con los resultados de todos los evaluadores.

```python
# Equivalente THYROX:
gate_parallel = RunnableParallel({
    "structural_result":  evaluador_completitud,
    "evidence_result":    evaluador_evidencia,
    "consistency_result": evaluador_consistencia,
    "artifact_content":   RunnablePassthrough(),  # el artefacto original al merger
})
```

**Por qué el dict nombrado es crítico:** El merger no opera sobre texto concatenado — opera sobre campos con nombre. Si el evaluador de evidencia reporta `ratio=0.45`, el merger puede aplicar la regla `if ratio < 0.75 → rework` de forma determinista. Si fuera texto plano, el merger necesitaría interpretar semánticamente cuándo el ratio es suficiente — volviendo el sistema probabilístico.

### 2.4. Composición del pipeline completo

```python
full_parallel_chain = map_chain | synthesis_prompt | LLM | StrOutputParser()
```

**Qué hace:** La pipe `|` conecta cuatro etapas:
1. `map_chain` — produce dict con 4 claves (output: `dict`)
2. `synthesis_prompt` — toma el dict y llena el template (output: `ChatPromptValue`)
3. `LLM` — procesa el prompt (output: `AIMessage`)
4. `StrOutputParser()` — extrae el texto del AIMessage (output: `str`)

**La transición `map_chain → synthesis_prompt` es la barrera de sincronización implícita:** LCEL no ejecuta `synthesis_prompt` hasta que `map_chain` produce un dict completo. El dict solo existe cuando todas las chains paralelas han completado. Esto es la garantía estructural de que el merger siempre ve el conjunto completo de evaluaciones.

**Implicación de diseño:** En la implementación THYROX sin LangChain, esta garantía debe ser explícita:

```python
# Sin LCEL, la barrera debe ser explícita:
results = await asyncio.gather(
    evaluador_completitud(artifact),
    evaluador_evidencia(artifact),
    evaluador_consistencia(artifact),
)
# asyncio.gather() garantiza que todos completan antes de retornar
structural_result, evidence_result, consistency_result = results
verdict = merger(structural_result, evidence_result, consistency_result)
```

### 2.5. Ejecución asincrónica

```python
async def run_parallel_example(topic: str) -> None:
    ...
    response = await full_parallel_chain.ainvoke(topic)
```

**Qué hace:** `.ainvoke()` es la versión asincrónica de `.invoke()`. Permite que el event loop Python continúe procesando otras coroutines mientras espera respuestas de la API.

**Por qué `.ainvoke()` y no `.invoke()`:** Con `.invoke()`, los procesos de `map_chain` ocurrirían secuencialmente aunque el código declare `RunnableParallel`. La paralelización real requiere el contexto asincrónico. Sin `async/await`, `RunnableParallel` puede ejecutar de forma secuencial dependiendo del runtime.

**Implicación crítica para Claude Code:** En el contexto de Claude Code (hooks, agentes nativos), el modelo de ejecución no es un event loop Python estándar. Los evaluadores paralelos del gate THYROX no pueden usar `asyncio.gather()` directamente en hooks (que son scripts bash síncronos). La paralelización en Claude Code se logra via:

1. **Agent tool con múltiples invocaciones:** El orquestador lanza tres agentes en paralelo via `Agent()` tool — cada uno es un proceso con context window propio
2. **Background subagents:** `run_in_background: true` en la invocación del Agent tool
3. **Worktree isolation:** Para evaluadores que necesitan context git aislado

Ver sección 6 (Conexiones con corpus THYROX) para el análisis completo de viabilidad.

---

## 3. Análisis línea por línea del código Google ADK

### 3.1. `output_key` como contrato nombrado

```python
researcher_agent_1 = LlmAgent(
    name="RenewableEnergyResearcher",
    model=GEMINI_MODEL,
    instruction="""...""",
    description="Researches renewable energy sources.",
    tools=[google_search],
    output_key="renewable_energy_result"   # ← CONTRATO
)
```

**Qué hace:** `output_key` es el nombre bajo el cual este agente escribe su resultado en el estado compartido. Es el análogo a la clave en el dict de `RunnableParallel`.

**Por qué es un "contrato":** El merger tiene `{renewable_energy_result}` en su template. Si el agente cambia su `output_key` sin actualizar el template del merger, el merger recibe una cadena vacía (o el literal `{renewable_energy_result}` sin sustituir) — falla silenciosamente. El `output_key` es el contrato de interfaz entre el productor y el consumidor.

**Implicación de diseño para THYROX:** Los evaluadores del gate deben declarar contratos explícitos antes de ser implementados:

```markdown
## Contrato del Evaluador de Evidencia
output_key: evidence_result
campos_obligatorios:
  claims_sin_ancla: int          # número de afirmaciones sin fuente
  ratio_calibracion: float       # (observaciones + inferencias) / total_claims
  claims_performativos: list[str] # texto exacto de cada afirmación performativa
status: pass | rework | unclear
```

Si el evaluador no puede producir `ratio_calibracion` (por fallo en parsing del artefacto), debe producir `{"status": "unclear", "reason": "cannot parse artifact"}` — no omitir el campo.

### 3.2. El merger con constraint de grounding explícito

```python
merger_agent = LlmAgent(
    name="SynthesisAgent",
    model=GEMINI_MODEL,
    instruction="""...
**Crucially: Your entire response MUST be grounded *exclusively* on the
information provided in the 'Input Summaries' below.
Do NOT add any external knowledge, facts, or details not present in these
specific summaries.**
...
""",
)
```

**Qué hace:** El instruction del merger tiene una directiva explícita anticonfabulación: no puede agregar información que no esté en los inputs. Esto está marcado con `**Crucially:**` y en negrita — énfasis deliberado.

**Por qué importa:** Sin esta directiva, un LLM como merger puede:
- Suavizar findings negativos de los sub-agentes ("aunque hay algunos gaps, el análisis es sólido")
- Agregar conclusiones que no se derivaron de los evaluadores ("dado el contexto del WP, esto parece suficiente")
- Ignorar un evaluador que reportó contradicciones y producir `pass` basándose en los dos que reportaron `ok`

La directiva de grounding convierte al merger de un generador creativo a un agregador determinístico. Esta es exactamente la propiedad requerida por un gate calibrado.

**La anticonfabulación en el merger THYROX:** El instruction del merger debe incluir explícitamente:

```markdown
Tu OUTPUT debe derivarse EXCLUSIVAMENTE de {structural_result}, {evidence_result}
y {consistency_result}. NO puedes agregar juicio propio sobre la calidad del artefacto.
NO puedes suavizar findings negativos de los evaluadores.
Si ANY evaluador reportó status: rework, tu OUTPUT debe ser rework con el diagnóstico
exacto del evaluador que falló — no una interpretación nueva.
```

### 3.3. `ParallelAgent` como barrera explícita

```python
parallel_research_agent = ParallelAgent(
    name="ParallelWebResearchAgent",
    sub_agents=[researcher_agent_1, researcher_agent_2, researcher_agent_3],
    description="Runs multiple research agents in parallel to gather information."
)
```

**Qué hace:** `ParallelAgent` es un agente contenedor que:
1. Lanza todos sus `sub_agents` simultáneamente
2. Espera a que TODOS completen
3. Expone el estado acumulado (todos los `output_key`) al siguiente agente en la cadena

**La barrera es la propiedad central:** El `SequentialAgent` que envuelve `ParallelAgent + merger` no ejecuta el merger hasta que el `ParallelAgent` complete. El `ParallelAgent` no completa hasta que todos sus sub-agentes completan. Esto crea una garantía composicional: si cualquier evaluador falla (excepción, timeout, respuesta malformada), el merger no se ejecuta.

**Cuál es el comportamiento cuando un sub-agente falla:** El capítulo no lo especifica. Esta es una brecha que el diseño del gate THYROX debe resolver explícitamente — ver sección 5 (Riesgos y contradicciones).

### 3.4. `SequentialAgent` como orquestador de fases

```python
sequential_pipeline_agent = SequentialAgent(
    name="ResearchAndSynthesisPipeline",
    sub_agents=[parallel_research_agent, merger_agent],
    description="Coordinates parallel research and synthesizes the results."
)

root_agent = sequential_pipeline_agent
```

**Qué hace:** `SequentialAgent` ejecuta sus `sub_agents` en orden estricto. `parallel_research_agent` primero, `merger_agent` segundo. El estado (todos los `output_key`) se acumula y está disponible para `merger_agent`.

**Por qué `SequentialAgent` + `ParallelAgent` juntos:** Este es el patrón isomórfico a la arquitectura completa del gate calibrado THYROX:
- `SequentialAgent` = el gate como paso en la cadena THYROX (Chaining del Cap. 1)
- `ParallelAgent` = los evaluadores concurrentes (Parallelization del Cap. 3)
- `merger_agent` = el verdictgenerador grounded (punto de síntesis)
- El routing de 4 rutas (cap. 2) se agrega sobre el output del merger

**`root_agent = sequential_pipeline_agent`:** Este patrón de exponer el orquestador como `root_agent` es el punto de entrada del sistema. En THYROX, el gate calibrado debe ser invocable como agente nativo desde el contexto del stage actual.

---

## 4. Conexiones con el problema del WP (realismo performativo)

### 4.1. La paralelización como antídoto estructural al realismo performativo

El realismo performativo ocurre cuando el sistema afirma calidad sin el mecanismo que la sustancia. La raíz es que hay **un solo generador** (Claude, P(correcto) ≈ 0.70-0.80) que tanto produce el artefacto como "evalúa" si el artefacto es correcto — con el mismo contexto, los mismos sesgos, y sin perspectiva independiente.

La paralelización rompe este bucle porque:
1. Los evaluadores son instancias **independientes** del modelo — reciben el artefacto sin el historial de su generación
2. Múltiples evaluadores con perspectivas distintas (completitud, evidencia, consistencia) no comparten sesgos de generación
3. El merger con constraint de grounding no puede suavizar el output de los evaluadores — convierte múltiples perspectivas independientes en un veredicto trazable

**Esto es independencia epistémica por diseño arquitectónico, no por disciplina del ejecutor.**

### 4.2. Por qué la independencia del evaluador no es suficiente: el riesgo de contaminación

Si el evaluador recibe como input no solo el artefacto sino también "el contexto del WP", el evaluador puede absorber el mismo framing que produjo el artefacto. Ejemplo:

```
Evaluador recibe:
  - artefacto: "El análisis es completo y cubre todos los casos"  
  - contexto WP: "Este WP es crítico para la ÉPICA 42"
→ El evaluador puede suavizar el juicio por el contexto de criticidad
```

El evaluador debe recibir solo:
- El artefacto a evaluar
- Los criterios de evaluación (template del evaluador, sin contexto subjetivo del WP)
- Los artefactos históricos relevantes (para consistencia), si aplica — pero sin el framing de importancia

### 4.3. El Caso 5 (Validación y Verificación) como arquitectura de gate

El capítulo describe el Caso 5 así:
> "Verificar formato de correo electrónico, validar número telefónico, verificar dirección en una base de datos y detectar lenguaje inapropiado **simultáneamente**."

Cada verificación es independiente — no necesita el resultado de las otras para ejecutarse. El resultado combinado es la conjunción: el input es válido si y solo si TODAS las verificaciones pasan.

Para un gate THYROX el isomorfismo es directo:

| Caso 5 (validación de input) | Gate THYROX (validación de artefacto) |
|------------------------------|---------------------------------------|
| Verificar formato de email | Verificar completitud estructural (campos obligatorios presentes) |
| Validar número telefónico | Verificar presencia de evidencia (ratio de calibración ≥ umbral) |
| Verificar dirección en DB | Verificar consistencia con artefactos anteriores del WP |
| Detectar lenguaje inapropiado | Verificar ausencia de afirmaciones performativas en claims de gate |

El gate avanza (pass) si y solo si todos los evaluadores pasan. Cualquier fallo enruta a `rework` con el diagnóstico específico del evaluador que falló.

### 4.4. El Caso 7 (A/B testing) como mecanismo de calibración de criterios

El capítulo describe:
> "Generar tres titulares diferentes para un artículo simultáneamente utilizando indicaciones o modelos ligeramente variados."
> "Beneficio: Facilitar la selección rápida del contenido de mayor calidad."

Aplicado al problema de calibración: cuando un criterio de exit condition es ambiguo o no verificable, se puede usar A/B para generar variantes de formulación del criterio y seleccionar la más verificable:

```
Input: exit criterion "El análisis es suficientemente completo"
Variante A: "≥ 75% de claims tienen fuente observable"
Variante B: "0 claims de tipo performativo en sección de hallazgos"
Variante C: "Cada dominio identificado en Stage 1 tiene al menos 1 finding en Stage 3"
→ Seleccionar la variante más verificable con herramientas disponibles
```

Este uso del A/B no está documentado en `parallelization-pattern-input.md` en esta dimensión. Es un aplicación del patrón a la **calibración de los propios criterios de gate** — meta-calibración.

---

## 5. Mapeo a los 12 stages THYROX

### 5.1. Tabla de paralelizabilidad por stage

| Stage | Nombre | Paralelo interno posible | Tipo de paralelismo | Dependencias que impiden paralelizar |
|-------|--------|--------------------------|--------------------|------------------------------------|
| 1 | DISCOVER | Sí | Múltiples fuentes de evidencia simultáneas (herramientas, archivos, contexto) | El análisis síntesis depende de que todas las fuentes estén recopiladas |
| 2 | BASELINE | Sí | Múltiples métricas baseline simultáneas (cobertura, naming, estructura, deuda) | Las métricas son independientes entre sí |
| 3 | DIAGNOSE (ANALYZE) | Sí | Múltiples ejes de análisis simultáneos (coverage, naming, architecture) — ya ocurre en domain subdirectories | La síntesis de diagnóstico depende de todos los ejes |
| 4 | CONSTRAINTS | Parcial | Las constraints técnicas y las constraints de recursos pueden derivarse en paralelo | Las constraints de diseño a veces dependen de las técnicas |
| 5 | STRATEGY | No recomendado | La estrategia es una decisión integrada — la paralelización produce variantes no síntesis | La síntesis estratégica requiere perspectiva única |
| 6 | PLAN (SCOPE) | Sí | Secciones del plan pueden generarse en paralelo (alcance, timeline, recursos, riesgos) | La integración final del plan requiere coherencia entre secciones |
| 7 | DESIGN/SPECIFY | Sí | Componentes arquitectónicos independientes pueden especificarse en paralelo | Las interfaces entre componentes requieren coordinación |
| 8 | PLAN EXECUTION | Sí | Las tareas T-NNN independientes se pueden generar en paralelo si no hay dependencias entre ellas | El grafo de dependencias entre tareas debe estar mapeado antes |
| 9 | PILOT/VALIDATE | Sí | Múltiples criterios de validación pueden verificarse en paralelo | La decisión de Go/No-Go requiere todos los criterios |
| 10 | IMPLEMENT (EXECUTE) | Sí | Tareas atómicas sin dependencias entre sí pueden ejecutarse en paralelo | Las tareas con dependencias deben ejecutarse secuencialmente |
| 11 | TRACK/EVALUATE | Sí | Los evaluadores del gate (este WP: completitud, evidencia, consistencia) | La decisión final del gate requiere todos los evaluadores |
| 12 | STANDARDIZE | No — excepto si hay múltiples templates | La estandarización es secuencial por naturaleza (un template a la vez) | Un template depende de los hallazgos previos |

### 5.2. Stage 11 TRACK/EVALUATE — el stage donde vive el gate calibrado

Stage 11 es donde la paralelización tiene el impacto más directo en el problema del WP. El gate calibrado es una función de Stage 11: evalúa si el output de los stages anteriores cumple los criterios para avanzar.

La arquitectura paralela del gate vive aquí:
```
Stage 10 IMPLEMENT produce artefacto
  ↓ [Chaining — output 10 → input gate]
Stage 11 TRACK/EVALUATE — Gate
  ↓ [Parallelization — evaluadores concurrentes]
  ParallelAgent:
    ├── Evaluador-Completitud (structural_result)
    ├── Evaluador-Evidencia (evidence_result)
    └── Evaluador-Consistencia (consistency_result)
  ↓ [barrera de sincronización]
  Merger grounded → verdict
  ↓ [Routing — 4 rutas]
  pass → Stage 12
  rework → Stage 10 + diagnóstico
  escalate → SP humano
  unclear → calibración de criterios del gate
```

### 5.3. Stage 3 DIAGNOSE — paralelismo ya existente (no formalizado)

El Stage 3 (ANALYZE/DIAGNOSE) ya tiene paralelismo implícito en la estructura de domain subdirectories:
```
analyze/
  ├── coverage/      ← Evaluador-Cobertura
  ├── naming/        ← Evaluador-Naming
  └── architecture-patterns/  ← Evaluador-Arquitectura
```

Cada domain subdirectory es un evaluador independiente. La síntesis del diagnóstico es el merger. Este patrón ya existe — lo que falta es:
1. Formalizarlo como `ParallelAgent` explícito
2. Definir los contratos `output_key` de cada domain subdirectory
3. Agregar la barrera de sincronización: la síntesis no se ejecuta hasta que todos los domains estén completos
4. Agregar el constraint de grounding al merger de diagnóstico

---

## 6. Riesgos y contradicciones

### 6.1. El capítulo no documenta el comportamiento cuando un evaluador falla

**Riesgo:** `ParallelAgent` no especifica su comportamiento cuando un sub-agente lanza una excepción. Las opciones son:
- Propagar la excepción → el gate falla con error, sin veredicto
- Ignorar el sub-agente fallido → el merger opera con datos incompletos
- Substituir con `{"status": "unclear"}` → el merger puede enrutar correctamente

El capítulo no documenta cuál es el comportamiento de ADK/LangChain en este caso. El diseño del gate calibrado THYROX debe hacer explícito este contrato.

**Solución propuesta:** El patrón de mitigación documentado en `subagent-patterns.md` (Patrón 4 — Background Subagents) aplica directamente: el evaluador escribe su resultado a un archivo antes de terminar. El merger lee el archivo, no el output en memoria. Si el archivo no existe, el merger lo trata como `unclear`.

### 6.2. Cuándo NO usar paralelización — regla de oro no documentada en el capítulo

El capítulo describe solo cuándo usar el patrón. No documenta cuándo no usarlo. Casos donde la paralelización es incorrecta o contraproducente:

| Caso | Por qué no paralelizar |
|------|----------------------|
| Evaluadores con dependencia de datos | Si Evaluador-B necesita el output de Evaluador-A para funcionar, son secuenciales, no paralelos |
| Stage 5 STRATEGY | La estrategia es una decisión integrada que requiere perspectiva única — múltiples evaluadores estratégicos producen variantes incompatibles |
| Gate bloqueante con SP humano obligatorio | Si la decisión requiere SP humano (escalate garantizado), los evaluadores automáticos son overhead sin beneficio |
| Artefactos de exploración de bajo riesgo (brainstorming) | El costo de los evaluadores supera el beneficio cuando el artefacto no tiene impacto en decisiones de gate |
| Context window compartido entre evaluadores | Si los evaluadores comparten el mismo context (mismo agente), la "paralelización" es simulada — el modelo procesa secuencialmente aunque el código declare paralelo |

### 6.3. El problema del merger como cuello de botella probabilístico

El capítulo propone que el merger esté grounded en los outputs de los evaluadores. Pero el merger sigue siendo un LLM (P(correcto) ≈ 0.70-0.80). El grounding reduce el riesgo de confabulación, pero no lo elimina si el instruction no es suficientemente restrictivo.

**Contradicción:** Si el merger usa un LLM, la decisión final sigue siendo probabilística incluso cuando los evaluadores son determinísticos (rule-based). El sistema combina evaluadores determinísticos con un merger probabilístico.

**Resolución:** Para gates con criterios binarios claros, el "merger" puede ser una función rule-based pura:

```python
def merger_rule_based(structural, evidence, consistency):
    if any(e["status"] == "unclear" for e in [structural, evidence, consistency]):
        return {"verdict": "unclear", ...}
    if any(e["status"] == "rework" for e in [structural, evidence, consistency]):
        failing = [e for e in [...] if e["status"] == "rework"]
        return {"verdict": "rework", "diagnosis": [f["reason"] for f in failing]}
    if structural["status"] == "pass" and evidence["ratio"] >= THRESHOLD and consistency["consistent"]:
        return {"verdict": "pass"}
    return {"verdict": "escalate", "reason": "criteria not met by rule-based logic"}
```

Para gates con criterios cualitativos (análisis de Stage 3), el merger puede ser LLM con grounding estricto.

### 6.4. El problema de la barrera de sincronización en Claude Code

La barrera de sincronización (`ParallelAgent` espera a todos sus sub-agentes) asume un runtime que gestiona estado compartido entre agentes concurrentes. En Claude Code:

- Los agentes nativos en paralelo tienen **context windows independientes**
- El estado compartido es el filesystem (`.thyrox/context/`) — no un diccionario Python en memoria
- La "barrera" debe ser el orquestador esperando que todos los agentes escriban sus artefactos al filesystem antes de invocar el merger

El patrón de `subagent-patterns.md` (Patrón 4 — state file como fuente de verdad) es la implementación correcta para Claude Code:

```
Orquestador:
  1. Lanza Evaluador-1 (run_in_background: true) → escribe evidence_result.md al completar
  2. Lanza Evaluador-2 (run_in_background: true) → escribe structural_result.md al completar
  3. Lanza Evaluador-3 (run_in_background: true) → escribe consistency_result.md al completar
  4. Espera notificación de los tres (no lee output_file — lee los .md escritos)
  5. Lee los tres archivos de resultado
  6. Invoca merger con los tres resultados como input
```

### 6.5. Overhead del sistema de evaluación paralela

La Regla de Practicidad del agente (el mecanismo de evidencia NO debe añadir más de 10 minutos a un stage mediano) entra en tensión con lanzar 3 agentes paralelos + merger.

**Estimación de overhead:**
- 3 agentes paralelos en background: ~30-60 segundos de latencia total (no acumulativa)
- Merger: ~15-30 segundos adicionales
- Total: ~45-90 segundos por gate calibrado

Para un WP de 10 stages con gates en cada uno: ~8-15 minutos adicionales de overhead.

**Regla de escalado por riesgo del gate:** No todos los gates necesitan 3 evaluadores. Un gate de Stage 1→2 (descubrimiento a baseline) es de menor riesgo que un gate de Stage 5→6 (estrategia a plan). La cantidad de evaluadores debe ser proporcional al riesgo:

| Riesgo del gate | Evaluadores | Tiempo overhead |
|-----------------|-------------|-----------------|
| Bajo (exploración → diagnóstico) | 1 evaluador (completitud estructural) | ~20s |
| Medio (diagnóstico → estrategia) | 2 evaluadores (completitud + evidencia) | ~35s |
| Alto (estrategia → plan, o cualquier gate irreversible) | 3 evaluadores + human SP | ~60s + SP |

---

## 7. Conexiones con el corpus THYROX

### 7.1. `production-safety.md` — Regla 3 (Feature Completeness) y Regla 7 (Verification Paradox)

**Regla 3** establece que Claude Code puede "resolver a medias" — dejar TODOs, generar mocks en paths de producción. El sistema de evaluación paralela es el mecanismo que detecta esto para artefactos THYROX.

La Regla 3 aplica a código. El equivalente para artefactos metodológicos es: el evaluador de completitud estructural detecta campos de exit condition sin criterio derivado (equivalente a un TODO en código).

**Regla 7 (Verification Paradox):** Cuando el sistema acierta el 95%+, el humano reduce la calidad del review. La solución documentada es "automatizar la verificación rutinaria y reservar atención humana para decisiones arquitectónicas."

Este principio es idéntico al routing de 4 rutas del gate calibrado:
- `pass/rework`: automatizable (evaluadores paralelos determinísticos)
- `escalate`: reservado para atención humana (decisión arquitectónica irreducible)

La Regla 7 valida directamente el diseño del gate: no se trata de que el humano revise menos — se trata de que el humano revise lo correcto.

### 7.2. `skill-vs-agent.md` — Los evaluadores son agentes, no skills

Según la tabla de decisión de `skill-vs-agent.md`:
- "Si quieres que se ejecute en paralelo con otros → definitivamente un agente"
- "Si el archivo necesita `tools` para hacer su trabajo → es un agente, no un SKILL"

Los evaluadores del gate calibrado:
1. Se ejecutan en paralelo (Evaluador-1, 2, 3 simultáneos) → agentes
2. Necesitan tools para su trabajo (Read para leer el artefacto, Grep para buscar patrones, Bash para ejecutar scripts de análisis) → agentes

Los evaluadores del gate son agentes nativos Claude Code (`.claude/agents/evaluador-*.md`), no skills.

**El merger puede ser un agente o un skill** dependiendo de si necesita tools:
- Si el merger opera solo sobre los outputs (dict de resultados) sin leer archivos → puede ser un skill
- Si el merger necesita leer el artefacto original para verificar trazabilidad → es un agente

### 7.3. `command-execution-model.md` — El gate como thin wrapper

El modelo de comandos establece que los plugin commands (`/thyrox:*`) son thin wrappers que delegan a agentes especializados. El comando `/thyrox:gate` (gate calibrado) seguiría este patrón:

```
/thyrox:gate Stage N
  │
  ├── thin wrapper → lee stage actual del WP
  │
  ├── Lanza Evaluador-1 (agente)
  ├── Lanza Evaluador-2 (agente)
  ├── Lanza Evaluador-3 (agente)
  │
  └── Lanza Merger (agente) después de que los tres completan
```

El patrón `context: fork` en el frontmatter del comando garantizaría que el gate corre en un subagente aislado, sin contaminar el context del stage actual.

### 7.4. `subagent-patterns.md` — Patrón 4 y 7 para el gate calibrado

**Patrón 4 (Background Subagents):** Los evaluadores del gate son candidatos perfectos para `run_in_background: true` — son tareas de análisis de ~30-60 segundos que no bloquean el hilo principal.

**Anti-patrón de notificación:** El `subagent-patterns.md` documenta explícitamente que las notificaciones son intra-sesión y pueden perderse si la sesión se compacta. El gate calibrado THYROX debe usar state files:

```
# Evaluador-Evidencia escribe al completar:
.thyrox/context/work/{wp}/track/gate-N/evidence_result.md

# El merger lee estos archivos, no el output en memoria:
Read(".thyrox/context/work/{wp}/track/gate-N/evidence_result.md")
```

**Patrón 7 (Agent Teams, experimental):** El equipo de evaluadores (3 evaluadores + merger) tiene exactamente la estructura de un Agent Team: 3 teammates (evaluadores) coordinados por un Team Lead (orquestador del gate). Sin embargo, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` es experimental y tiene limitaciones documentadas. El diseño del gate no debe depender de features experimentales para Stage 3 ANALYZE — usar Patrón 4 (Background Subagents) que es estable.

### 7.5. `CLAUDE.md` — Multi-skill orchestration y los evaluadores

La sección Multi-skill orchestration de CLAUDE.md establece:
- **Máximo simultáneos:** 2-3 skills
- **Naming de state files:** `now-{agent-name}.md` para agentes nativos en ejecución

Para los evaluadores del gate calibrado:
- Los evaluadores son agentes nativos (no skills) — no aplica el límite de 2-3 skills
- Los state files de cada evaluador siguen la convención: `now-evaluador-completitud.md`, `now-evaluador-evidencia.md`, etc.
- El merger usa `now-merger-gate-N.md`

---

## 8. Síntesis con los capítulos previos — arquitectura completa

### 8.1. Tabla de contribución de cada capítulo al gate calibrado

| Capítulo | Principio central | Contribución al gate calibrado |
|----------|------------------|-------------------------------|
| **Cap. 6 — Agente** | 6 características; Adaptation requiere feedback observable | Define QUÉ debe hacer el sistema: cerrarel loop de Adaptation con evidencia |
| **Cap. 1 — Chaining** | Output N → input N+1; cada eslabón tiene input/output definido | Define EL FLUJO: el gate es el eslabón de validación entre Stage N y Stage N+1 |
| **Cap. 2 — Routing** | Lógica condicional; 4 rutas; 3 niveles; estado acumulado | Define LAS RUTAS: qué pasa después del gate (pass/rework/escalate/unclear) |
| **Cap. 3 — Parallelization** | Evaluación concurrente; merger grounded; barrera de sincronización | Define CÓMO SE GENERA EL VEREDICTO: múltiples evaluadores independientes → merger |

Los cuatro capítulos son mutuamente necesarios. El gate calibrado sin:
- Cap. 6: no sabe por qué el sistema necesita calibración
- Cap. 1: no sabe dónde vive el gate en el flujo de 12 stages
- Cap. 2: no sabe qué hacer con el veredicto del merger
- Cap. 3: no sabe cómo generar un veredicto epistémicamente independiente del artefacto

### 8.2. Arquitectura completa del gate calibrado (síntesis de los 4 capítulos)

```
CONTEXTO (Cap. 6 — Agente):
  THYROX opera con P(correcto) ≈ 0.70-0.80 por diseño.
  Sin Adaptation calibrada, los artefactos se afirman correctos sin evidencia.
  El gate calibrado cierra el loop de feedback observable de Adaptation.

FLUJO (Cap. 1 — Chaining):
  Stage N produce artefacto
    │
    ├── Output N alimenta Input Gate
    │   (el artefacto + estado acumulado del WP)
    │
    ↓
  [GATE CALIBRADO — Stage 11 TRACK/EVALUATE]

EVALUACIÓN (Cap. 3 — Parallelization):
  ParallelAgent (barrera de sincronización)
    ├── Evaluador-Completitud [agente nativo, tools: Read, Grep]
    │   output_key: structural_result
    │   Contrato: {completo: bool, campos_faltantes: list, status: pass|rework|unclear}
    │
    ├── Evaluador-Evidencia [agente nativo, tools: Read, Grep, Bash]
    │   output_key: evidence_result
    │   Contrato: {ratio_calibracion: float, claims_performativos: list, status: pass|rework|unclear}
    │
    └── Evaluador-Consistencia [agente nativo, tools: Read, Glob]
        output_key: consistency_result
        Contrato: {contradicciones: list, consistente: bool, status: pass|rework|unclear}
    │
    (TODOS completan → barrera → estado compartido disponible)
    │
    Merger [grounded exclusivamente en evaluator outputs]
    instruction: "DO NOT add any judgment not present in {structural_result},
                  {evidence_result}, {consistency_result}"
    output: verdict estructurado
      {
        verdict: pass | rework | escalate | unclear,
        diagnosis: [...],  # solo si rework o escalate
        source_evaluator: "evaluador-evidencia",  # quién falló
        evidence_chain: {structural_result, evidence_result, consistency_result}
      }

ROUTING (Cap. 2 — Routing):
  verdict.pass    → Stage N+1 (chaining avanza)
  verdict.rework  → Stage N + diagnóstico específico del evaluador que falló
  verdict.escalate → SP humano (decisión irreducible a predicado automático)
  verdict.unclear  → calibración de criterios del gate
                     (meta-signal: los criterios están mal definidos)
```

### 8.3. Cómo Cap. 3 completa lo que los anteriores dejaban abierto

**Cap. 6 dejaba abierto:** "THYROX necesita Adaptation calibrada" — pero no cómo implementarla.
**Cap. 3 lo cierra:** Los evaluadores independientes con merger grounded son el mecanismo concreto de Adaptation calibrada.

**Cap. 1 dejaba abierto:** "Cada eslabón necesita validación" — pero no cómo generar esa validación sin realismo performativo.
**Cap. 3 lo cierra:** La validación no la hace el mismo proceso que generó el artefacto — la hacen evaluadores independientes con perspectiva fresca.

**Cap. 2 dejaba abierto:** "El gate necesita 4 rutas y estado acumulado" — pero no qué genera el input de esas rutas.
**Cap. 3 lo cierra:** El veredicto que alimenta el router viene del merger grounded, que integra múltiples evaluaciones independientes.

---

## 9. Pendientes para Stage 3 DIAGNOSE

Los siguientes items requieren trabajo en Stage 3. Están derivados de este análisis, no heredados de `parallelization-pattern-input.md` (que ya tiene su propio listado de pendientes):

1. **Diseño del contrato completo de cada evaluador:** Más allá del `output_key`, definir el schema de cada campo, los tipos, los valores posibles, y el comportamiento cuando el evaluador no puede evaluar (campo `error` obligatorio, status `unclear` por defecto).

2. **Protocolo de failure de evaluador:** Si un evaluador lanza excepción o produce output malformado, qué hace el orquestador. Propuesta: state file ausente = `unclear` automático.

3. **Viabilidad del merger rule-based vs LLM:** Para gates con criterios binarios (ratio ≥ threshold), definir si el merger puede ser una función Python pura en lugar de un LLM. El merger rule-based elimina la probabilística residual.

4. **Mapeo de evaluadores por tipo de gate:** No todos los 12 stages necesitan los 3 evaluadores. Diseñar la tabla de evaluadores mínimos por stage (relacionado con el overhead de 45-90s documentado en sección 6.5).

5. **Instrucción de grounding del merger:** Redactar el instruction exacto del merger con la misma fuerza del ejemplo ADK (`**Crucially:**` en negrita, doble énfasis negativo). Sin instrucción fuerte, el merger puede confabular.

6. **Meta-calibración via Caso 7 (A/B):** Definir el protocolo para cuando un exit criterion no es verificable. El A/B de formulaciones es una herramienta disponible del patrón — documentar cuándo activarlo.

7. **Evaluador de consistencia con estado acumulado (LangGraph):** El evaluador de consistencia necesita acceso a artefactos de stages anteriores. Definir cuáles artefactos son relevantes por tipo de gate (insight del Cap. 2, Sección 4: "las decisiones dependen del estado acumulado de todo el sistema").

8. **Protocolo de state files para background subagents:** Definir los paths exactos donde cada evaluador escribe sus resultados:
   ```
   .thyrox/context/work/{wp}/track/gate-{N}-{timestamp}/
     ├── structural_result.md
     ├── evidence_result.md
     ├── consistency_result.md
     └── verdict.md  (output del merger)
   ```

---

## 10. Resumen ejecutivo para agentes futuros

Un agente que lee solo esta sección debe entender el estado del análisis:

**Cap. 3 (Paralelización) aporta al problema de realismo performativo:**
El patrón provee la arquitectura exacta para generar veredictos de gate epistémicamente independientes del artefacto evaluado: múltiples evaluadores concurrentes (agentes nativos independientes) con merger grounded (instruction anticonfabulación). La barrera de sincronización garantiza que el merger siempre ve el conjunto completo.

**La implementación en Claude Code usa:**
- Agentes nativos (`.claude/agents/evaluador-*.md`) en paralelo via Agent tool con `run_in_background: true`
- State files (`.thyrox/context/work/{wp}/track/gate-N/`) como barrera de sincronización estable
- Merger con instruction de grounding explícito ("DO NOT add judgment not in evaluator outputs")

**Los 3 evaluadores mínimos para gates de alto riesgo:**
- `evaluador-completitud`: campos obligatorios del artefacto presentes y derivados
- `evaluador-evidencia`: ratio de calibración ≥ umbral (por defecto 0.75 para artefactos de gate)
- `evaluador-consistencia`: sin contradicciones con constraints y decisiones de stages anteriores

**El routing de 4 rutas (del Cap. 2) se aplica sobre el output del merger:**
pass → avanza / rework → diagnóstico específico / escalate → SP humano / unclear → calibrar criterios del gate

**Los 4 capítulos son necesarios juntos.** Sin Cap. 3, los otros tres capítulos saben que el sistema necesita calibración y por qué, pero no tienen el mecanismo concreto para generarla sin introducir la misma circularidad del realismo performativo.
