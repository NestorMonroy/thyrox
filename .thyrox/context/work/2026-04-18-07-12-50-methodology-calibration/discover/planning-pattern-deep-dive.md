```yml
created_at: 2026-04-18 16:52:29
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: Capítulo 6 — "Planificación" (libro agentic design patterns, vía planning-pattern-input.md)
veredicto_síntesis: PARCIALMENTE VÁLIDO
saltos_lógicos: 5
contradicciones: 3
engaños_estructurales: 4
```

# Deep-Dive: Capítulo 6 — Planificación (Planning Pattern)

> Análisis adversarial exhaustivo. Cuarto capítulo del libro de agentic design patterns.
> Base de contexto: Cap. 1 Chaining (`prompt-chaining-input.md`), Cap. 2 Routing
> (`routing-pattern-input.md`), Cap. 3 Parallelization (`parallelization-deep-dive.md`).
> Seis capas mínimas + capa adicional de integración inter-capítulos.

---

## CAPA 1: LECTURA INICIAL

### Tesis central del capítulo

El capítulo argumenta que existe un cuarto patrón agentic — Planning — que se diferencia de los tres anteriores por una sola propiedad: el "cómo" del workflow no se conoce de antemano y debe ser descubierto autónomamente por el agente. La regla de selección es una sola pregunta: "¿Necesita el 'cómo' ser descubierto, o ya se conoce?"

### Estructura lógica declarada

```
Premisa: la inteligencia requiere previsión y descomposición de objetivos complejos
   ↓
Mecanismo: Planning = transformar objetivo de alto nivel → secuencia de pasos discretos
   ↓
Distinción: Chaining/Routing/Parallelization tienen workflow predeterminado; Planning no
   ↓
Implementación: CrewAI (un agente planner+writer) + DeepResearch (Google) + OpenAI API
   ↓
Jerarquía: Planning genera el workflow → que ejecutan Chaining + Routing + Parallelization
   ↓
Conclusión: Planning es el "puente esencial entre intención humana y ejecución automatizada"
```

### Afirmaciones centrales (perspectiva del autor, sin crítica aún)

1. **A1** — "La decisión de usar un agente de planificación versus un agente simple de ejecución de tareas depende de una única pregunta: ¿necesita el 'cómo' ser descubierto, o ya se conoce?" (Sec. 4 — Regla de selección)
2. **A2** — El código CrewAI con un solo agente "Article Planner and Writer" en `Process.sequential` implementa el patrón Planning — "el plan emerge del propio LLM" (Sec. 6)
3. **A3** — Planning genera el workflow que los otros tres patrones ejecutan: "Planning → genera el workflow → que se ejecuta mediante Chaining + Routing + Parallelization" (Sec. 9)
4. **A4** — DeepResearch implementa "revisión colaborativa: el plan se presenta al usuario para modificación antes de ejecutar" (Sec. 7)
5. **A5** — `reasoning={"budget_tokens": 10000}` en la API de OpenAI son "tokens dedicados al proceso de planificación interno" (Sec. 8)
6. **A6** — Los cuatro casos de uso (onboarding, robótica, investigación, soporte) son manifestaciones genuinamente distintas del patrón Planning (Sec. 5)

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa 1: Frameworks teóricos

| Instancia | Ubicación | Validez en dominio original |
|-----------|-----------|----------------------------|
| Planning como "proceso computacional fundamental en sistemas autónomos" | Sec. 3, párr. 1 | INCIERTO — la IA clásica tiene planning formal (STRIPS, PDDL, HTN). El capítulo no cita ninguna de estas tradiciones ni explica cómo se relaciona con ellas. |
| "Estado inicial → estado objetivo → secuencia de acciones" | Sec. 3 | VERDADERO parcialmente — es la definición de planning clásico (STRIPS, 1971). Pero el capítulo no deriva sus implementaciones de este framework; lo enuncia y luego usa LLM sin conexión con la formalización. |
| "Previsión, descomposición de tareas complejas en pasos más pequeños y manejables, y estrategia" | Sec. 2, párr. 1 | INCIERTO — descripción informal sin referencia a corpus de planificación. |

**Hallazgo:** El capítulo invoca la terminología de planificación clásica (estado inicial, estado objetivo, secuencia de acciones) sin citar ni derivar formalmente de esos frameworks. La "credibilidad prestada" de STRIPS/HTN opera en la superficie.

### Sub-capa 2: Aplicaciones concretas

| Instancia | Ubicación | Derivación o analogía |
|-----------|-----------|----------------------|
| Un solo agente CrewAI "Plan and Writer" implementa Planning | Sec. 6 | ANALOGÍA — el agente genera texto que tiene estructura de plan, pero no hay separación arquitectónica entre planning y execution. |
| DeepResearch como "Planning avanzado asíncrono" | Sec. 7 | ANALÓGICO — describe features de un producto comercial (Gemini) como si implementaran el patrón. No hay derivación de por qué estos features son "Planning" según la definición del capítulo. |
| `budget_tokens` = "proceso de planificación interno" | Sec. 8 | ANALÓGICO — renombra una feature de la API (extended thinking) como "planning". |

### Sub-capa 3: Números específicos

El capítulo contiene un solo número específico: `budget_tokens: 10000`. No hay explicación de por qué 10000, si es el mínimo viable, el óptimo, o un valor de ejemplo. El capítulo trata este número como si fuera un parámetro técnico derivado, cuando es un valor arbitrario de demostración.

### Sub-capa 4: Afirmaciones de garantía

| Afirmación | Ubicación | Evidencia de respaldo |
|------------|-----------|----------------------|
| Planning "proporciona el puente esencial entre la intención humana y la ejecución automatizada" | Sec. 1, síntesis | NINGUNA — afirmación no respaldada, no validada externamente. |
| "Process.sequential — el agente crea y luego ejecuta su propio plan internamente" | Sec. 6, principio 3 | INCIERTO — esto es una interpretación del comportamiento del LLM, no una garantía arquitectónica. |
| Los cuatro patrones forman "una arquitectura completa" | Sec. 9 | INCIERTO — el capítulo afirma esto sin demostrar que los cuatro son suficientes para todos los casos. |

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

### SALTO-1: Del "objetivo de alto nivel" al "plan que emerge del LLM"

**Premisa:** Planning es un proceso donde el agente descubre autónomamente cómo llegar al objetivo.  
**Conclusión:** Un solo agente con rol "Article Planner and Writer" que recibe `topic` y produce un reporte implementa este patrón.  
**Ubicación:** Sec. 6, código CrewAI — Principios 1-3.  
**Tipo de salto:** Analogía sin derivación. El agente genera texto con estructura de plan, pero no hay separación entre la fase de planning y la fase de execution. El mismo "agente" hace ambas.  
**Tamaño:** CRÍTICO  
**Justificación que debería existir:** El patrón Planning debería requerir que: (a) exista una representación explícita del plan como objeto separable del proceso de execution, (b) el plan sea inspeccionable y modificable antes de ejecutarse, (c) haya una distinción arquitectónica entre el planner y el executor. El código de CrewAI no satisface ninguna de estas tres condiciones.

---

### SALTO-2: De "el cómo debe ser descubierto" a Planning como categoría distinta

**Premisa:** La diferencia entre Planning y los otros patrones es si el workflow se conoce o no.  
**Conclusión:** Por tanto, Planning es un patrón arquitectónico diferente, no una extensión o composición de los otros.  
**Ubicación:** Sec. 2, párr. 3; Sec. 4, tabla de regla de selección.  
**Tipo de salto:** La distinción está correctamente enunciada pero no derivada arquitectónicamente. Un sistema con Routing (Cap. 2) que tiene suficientes rutas puede "descubrir el cómo" dinámicamente — no necesariamente Planning. La frontera entre "Routing complejo" y "Planning" no está demarcada.  
**Tamaño:** MEDIO  
**Justificación que debería existir:** Una demostración de que existe una clase de problemas donde Routing + Parallelization + Chaining son insuficientes y Planning es necesario — no solo más conveniente.

---

### SALTO-3: De Planning a "genera el workflow que los otros tres ejecutan" (jerarquía)

**Premisa:** Planning descompone objetivos de alto nivel en pasos.  
**Conclusión:** Planning genera el workflow; Chaining + Routing + Parallelization son los mecanismos de ejecución de ese workflow.  
**Ubicación:** Sec. 9, tabla y relación jerárquica.  
**Tipo de salto:** EXTRAPOLACIÓN. La relación jerárquica (Planning es meta-nivel respecto a los otros) es una inferencia del análisis, no una derivación explícita del capítulo. El capítulo la presenta en una tabla sin argumentar por qué Planning no puede ser también el ejecutor, o por qué no puede haber Planning dentro de un paso de Chaining.  
**Tamaño:** MEDIO  
**Justificación que debería existir:** Una demostración de que Planning siempre opera sobre los otros (no al mismo nivel) — y qué pasa cuando un sub-plan a su vez necesita Planning (recursividad del patrón).

---

### SALTO-4: De DeepResearch (producto comercial) a implementación del patrón Planning

**Premisa:** DeepResearch de Google tiene fases de deconstrucción, revisión colaborativa, bucle iterativo, síntesis asíncrona.  
**Conclusión:** Por tanto DeepResearch "ejemplifica el patrón en su forma más sofisticada."  
**Ubicación:** Sec. 7, encabezado y descripción de fases.  
**Tipo de salto:** ANALOGÍA SIN DERIVACIÓN. DeepResearch es un producto con arquitectura interna no publicada. El capítulo describe sus features de cara al usuario y los mapea al patrón Planning. No hay acceso a la arquitectura interna de DeepResearch que confirme que la "deconstrucción" usa un sub-sistema de planning separado del execution.  
**Tamaño:** MEDIO  
**Justificación que debería existir:** Acceso a la arquitectura interna de DeepResearch, o al menos una paper técnico que describa el sistema. Sin esto, el mapeo a "Planning avanzado" es especulativo.

---

### SALTO-5: De `budget_tokens` (extended thinking) a "proceso de planificación interno"

**Premisa:** La API de OpenAI tiene `reasoning={"budget_tokens": 10000}`.  
**Conclusión:** Esto son "tokens dedicados al proceso de planificación interno" del modelo.  
**Ubicación:** Sec. 8, código OpenAI — Principio 1.  
**Tipo de salto:** RENAMING SIN EQUIVALENCIA. `budget_tokens` en la API de OpenAI controla el presupuesto de tokens de "chain-of-thought" o "extended thinking" del modelo. Este mecanismo existe para razonamiento extendido en general — no es específico de planning. El capítulo lo renombra como "planning" para mantener la narrativa del capítulo, pero es una equivalencia no demostrada.  
**Tamaño:** CRÍTICO  
**Justificación que debería existir:** Una distinción técnica entre "extended thinking" y "planning tokens" — y evidencia de que el modelo usa esos tokens específicamente para generar un plan separable, no simplemente para razonar más.

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

### CONTRADICCIÓN-1: Definición de Planning vs. implementación CrewAI

**Afirmación A:** "El patrón de planificación [...] permite a un agente sintetizar una secuencia de acciones para lograr un objetivo especificado [...] Este proceso transforma un objetivo de alto nivel en un plan estructurado compuesto de pasos discretos y ejecutables." (Sec. 3 — definición formal)

**Afirmación B:** El código CrewAI usa un solo agente con `allow_delegation=False` y `Process.sequential` que "crea y luego ejecuta su propio plan internamente" (Sec. 6, Principio 3).

**Por qué chocan:** La definición (A) implica que el plan es una entidad separable — "compuesto de pasos discretos y ejecutables" — que existe como output del proceso de planning antes de la ejecución. La implementación (B) tiene el mismo agente generando y ejecutando el plan en un único paso, sin separación entre plan y ejecución. Si el plan no es inspeccionable ni separable, el patrón descrito en (A) y la implementación de (B) son arquitectónicamente distintos.

**Cuál prevalece:** Ninguna sin modificación. Si el criterio es arquitectónico, (A) describe Planning genuino y (B) es simplemente "un agente que genera texto con estructura de plan." Si el criterio es funcional (el output del LLM tiene estructura de plan), (B) es suficiente pero (A) es sobredeclarada.

---

### CONTRADICCIÓN-2: Planning como descubrimiento autónomo vs. revisión colaborativa obligatoria en DeepResearch

**Afirmación A:** "El patrón de planificación [...] permite a un agente sintetizar una secuencia de acciones [...] en entornos dinámicos o complejos." El planning es un proceso autónomo del agente. (Sec. 3)

**Afirmación B:** DeepResearch incluye "revisión colaborativa: el plan se presenta al usuario para modificación antes de ejecutar." (Sec. 7, Fase 2)

**Por qué chocan:** Si Planning es autónomo (A), la revisión colaborativa obligatoria (B) introduce dependencia humana que contradice la autonomía del patrón. O el patrón Planning es autónomo (y la revisión es opcional), o la revisión colaborativa es parte esencial del patrón (y entonces Planning no es totalmente autónomo). El capítulo no resuelve esta tensión — describe la revisión colaborativa como una feature de DeepResearch sin aclarar si es parte del patrón general o específica de ese producto.

**Cuál prevalece:** INCIERTO. El capítulo no tiene una sección de variantes del patrón que distinga "Planning con human-in-the-loop" de "Planning completamente autónomo".

---

### CONTRADICCIÓN-3: Planning como "herramienta específica, no universal" vs. "puente esencial"

**Afirmación A:** "La planificación dinámica es una herramienta específica, no una solución universal." (Sec. 4, principio de equilibrio)

**Afirmación B:** "El patrón de planificación proporciona el puente esencial entre la intención humana y la ejecución automatizada para problemas complejos." (Sec. 1, síntesis)

**Por qué chocan:** (A) califica Planning como específico y limitado. (B) lo posiciona como "esencial" — un término que no admite excepciones. Un puente "esencial" no puede ser también una "herramienta específica" sin aclaración de en qué contexto aplica cada descriptor. Si Planning es esencial solo para "problemas complejos" donde el cómo se desconoce, entonces (B) debería ser "el puente esencial *en esos casos*" — pero la formulación original es incondicional.

**Cuál prevalece:** (A) es más precisa. (B) es un claim de marketing que sobrescribe la limitación explícita de (A). En el análisis THYROX, usar (A) y descartar (B) como retórica no técnica.

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

### ENGAÑO-1: Credibilidad prestada de la planificación clásica

**Patrón:** Credibilidad prestada.  
**Operación:** El capítulo usa terminología de planning clásico (estado inicial, estado objetivo, secuencia de acciones) — que tiene décadas de investigación rigurosa en IA (STRIPS, PDDL, HTN) — pero sin citar esa tradición ni derivar sus claims de ella. El lector asocia la terminología con el rigor de la IA clásica, aunque el capítulo opera en un marco completamente distinto (LLMs que generan texto).  
**Ubicación:** Sec. 3 — definición técnica completa.  
**Efecto:** La definición parece técnicamente robusta porque usa vocabulario preciso de un dominio riguroso. En realidad, los LLMs no tienen garantías de completitud ni correctitud del plan generado — propiedades centrales en la planificación clásica. El vocabulario prestado oculta esta brecha fundamental.

---

### ENGAÑO-2: Código CrewAI como demostración de Planning

**Patrón:** Validación en contexto distinto.  
**Operación:** El código CrewAI demuestra que un agente puede recibir un objetivo de alto nivel y producir un output estructurado. Esto se presenta como implementación del patrón Planning. Pero lo que el código demuestra es que un LLM puede generar texto con estructura de plan — no que existe un proceso de planning separable de la ejecución.  
**Ubicación:** Sec. 6, código completo y principios derivados.  
**Efecto:** El lector concluye que Planning se implementa con un solo agente de rol combinado. Pero el patrón descrito en Sec. 3 (plan separable, inspeccionable, con estado inicial y objetivo definidos) requeriría al menos dos componentes: un planner y un executor con interfaz explícita. El código no tiene esta arquitectura.

---

### ENGAÑO-3: DeepResearch como evidencia de Planning avanzado

**Patrón:** Notación formal encubriendo especulación.  
**Operación:** DeepResearch es un producto comercial. El capítulo describe sus features de cara al usuario (deconstrucción, revisión colaborativa, bucle iterativo, síntesis asíncrona) y los mapea a "fases del pipeline agentico." La descripción es estructurada y usa terminología técnica, creando la apariencia de que el capítulo conoce la arquitectura interna de DeepResearch.  
**Ubicación:** Sec. 7, fases del pipeline.  
**Efecto:** El lector asume que la descripción es arquitectónica cuando es en realidad una descripción funcional de la UX del producto. Las "fases" son descripciones de lo que el usuario ve, no de cómo está implementado el sistema.

---

### ENGAÑO-4: `budget_tokens` renombrado como "planning tokens"

**Patrón:** Notación formal encubriendo especulación.  
**Operación:** `reasoning={"type": "enabled", "budget_tokens": 10000}` es un parámetro de la API de OpenAI para extended thinking. El capítulo lo presenta como "tokens dedicados al proceso de planificación interno" del modelo — renombrando un mecanismo general de razonamiento extendido como si fuera específicamente planning.  
**Ubicación:** Sec. 8, código OpenAI — Principio 1.  
**Efecto:** El lector puede creer que este parámetro activa un modo especial de "planning" en el modelo, cuando en realidad controla el presupuesto de razonamiento extendido (chain-of-thought) en general. No hay evidencia de que el modelo use esos tokens específicamente para generar un plan separable del resto del razonamiento.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente externa |
|-------|--------------------------|----------------|
| La distinción entre "workflow conocido" y "workflow a descubrir" es real y útil | La diferencia entre sistemas rule-based (determinísticos) y sistemas de planificación (search sobre espacio de acciones) está bien documentada en IA clásica | Russell & Norvig, "Artificial Intelligence: A Modern Approach", Cap. 10-11 (Planning) |
| Los LLMs pueden generar secuencias de pasos coherentes para objetivos de alto nivel | Demostrado empíricamente en numerosos benchmarks de reasoning y task decomposition | BIG-Bench, MMLU, ToolBench |
| Planning tiene un rol meta en sistemas agenticos complejos (orquesta a los otros patrones) | La intuición es correcta: en sistemas con múltiples sub-agentes, alguien debe generar el workflow de coordinación — ese proceso es planning | Google ADK documentation, LangChain Agents docs |
| El principio de equilibrio (Planning solo cuando el cómo no se conoce) es operacionalmente correcto | Es la regla de parsimonia para sistemas agenticos: no usar planning dinámico donde un workflow predeterminado es suficiente y más confiable | Engineering principle — YAGNI aplicado a agentic design |
| DeepResearch presenta el plan al usuario antes de ejecutar (revisión colaborativa) | Confirmado por usuarios de Gemini DeepResearch — la UX tiene este paso | Feature documentada en Gemini DeepResearch product page |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia contraria |
|-------|-----------------|----------------------------------|
| El código CrewAI con un solo agente "Article Planner and Writer" implementa el patrón Planning | El código no tiene separación entre planning y execution. El mismo agente genera y ejecuta el plan en un único paso. El "plan" no existe como objeto separable — es parte del texto de output del LLM. | CONTRADICCIÓN-1: la propia definición del capítulo (Sec. 3) requiere un plan "compuesto de pasos discretos y ejecutables" — que implica separabilidad. El código no la tiene. |
| `budget_tokens` son "tokens dedicados al proceso de planificación interno" | `budget_tokens` controla el presupuesto de extended thinking en general, no un modo específico de planning. OpenAI no documenta que esos tokens se usen para planning separable. | SALTO-5: renaming sin equivalencia. La documentación de OpenAI describe `reasoning` como "chain-of-thought" o "extended thinking" — no como "planning tokens". |
| Los cuatro patrones forman "una arquitectura completa" | Esta es una afirmación sin demostración de suficiencia. Hay patrones agenticos documentados (reflexion, tool use, memory, multi-agent) que no se reducen a Chaining + Routing + Parallelization + Planning. | El libro mismo (Secs. no analizadas) probablemente tiene más capítulos — lo que contradice que estos cuatro sean "completos". |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| DeepResearch implementa Planning en el sentido técnico del capítulo | La arquitectura interna de DeepResearch es propietaria. El capítulo describe features de UX, no la arquitectura. | Acceso a la arquitectura técnica de DeepResearch (technical report, paper, o código fuente) |
| La revisión colaborativa es parte del patrón Planning o solo de DeepResearch | El capítulo no generaliza explícitamente la revisión colaborativa como elemento del patrón — la describe solo en la sección de DeepResearch. | Definición explícita en el capítulo de si la revisión humana es opcional u obligatoria en Planning |
| Planning "genera el workflow → que ejecutan Chaining + Routing + Parallelization" como jerarquía formal | Esta relación es una inferencia del análisis (Sec. 9), no una derivación del capítulo. El capítulo la presenta en una tabla sin argumentarla. | Demostración de que esta jerarquía es necesaria (no solo conveniente) y de que el resultado de Planning es siempre un workflow de los otros tres patrones |
| Los cuatro casos de uso documentados (onboarding, robótica, investigación, soporte) son genuinamente distintos | Los cuatro pueden reducirse a la misma estructura: objetivo de alto nivel → descomposición en pasos → ejecución con herramientas. La distinción es terminológica, no arquitectónica. | Un análisis de qué propiedades de Planning son distintas en cada dominio (ej: optimización de métricas en robótica vs. síntesis iterativa en investigación) |

### Patrón dominante

**Credibilidad prestada de múltiples fuentes simultáneas sin derivación.**

El capítulo opera en tres capas simultáneas de credibilidad prestada:
1. Terminología de IA clásica (STRIPS, estado-objetivo) → da rigor formal al concepto.
2. Productos comerciales reconocidos (Google DeepResearch, OpenAI) → da relevancia práctica a las implementaciones.
3. Frameworks de código abierto (CrewAI) → da implementabilidad inmediata.

Ninguna de estas tres capas está derivada formalmente: el capítulo no cita papers de planning clásico, no accede a la arquitectura interna de los productos comerciales, y el código CrewAI no implementa el patrón como fue definido.

El resultado es un documento que parece técnicamente robusto porque cada sección usa credibilidad de un dominio distinto — pero la coherencia entre las tres capas no está demostrada.

---

## CAPA 7 (ADICIONAL): ANÁLISIS DE INTEGRACIÓN INTER-CAPÍTULOS

Esta capa adicional es necesaria porque el capítulo se posiciona explícitamente como síntesis de los cuatro patrones. El contexto de los tres capítulos anteriores (analizados en este WP) permite verificar claims de integración que no son verificables desde un único capítulo.

### 7.1. La relación jerárquica Planning → Chaining/Routing/Parallelization — ¿es válida?

**El claim del capítulo (Sec. 9):** Planning genera el workflow; los otros tres lo ejecutan.

**Verificación desde el análisis de los capítulos anteriores:**

El `parallelization-deep-dive.md` (Sec. 8.1) construyó la arquitectura del gate calibrado combinando los cuatro patrones. En esa arquitectura:
- El gate tiene routing de 4 rutas (Cap. 2) que dirigen al siguiente stage
- Los evaluadores paralelos (Cap. 3) generan el veredicto
- El veredicto fluye por chaining (Cap. 1) al siguiente eslabón

En ningún momento de esa arquitectura Planning "genera" el workflow de los otros tres. Al contrario: el workflow de los otros tres es predeterminado (quién es el evaluador de completitud, cuáles son las 4 rutas del router, cuál es el siguiente eslabón de la cadena). Planning solo aparecería si el sistema necesitara descubrir dinámicamente qué evaluadores usar, cuántas rutas del router activar, o qué eslabones componen la cadena — lo cual no es el caso en una arquitectura de gate calibrado.

**Hallazgo:** La relación jerárquica descrita en Sec. 9 es plausible para sistemas donde el workflow es genuinamente desconocido (agentes de investigación open-ended, sistemas de resolución de problemas sin estructura). Pero no es universalmente válida. En muchos sistemas agenticos prácticos (incluyendo el gate calibrado de THYROX), los cuatro patrones operan al mismo nivel, no con Planning como meta-nivel.

---

### 7.2. La "regla de selección" central — ¿es suficientemente operacional?

**El claim del capítulo (Sec. 4):** Una sola pregunta distingue Planning de los otros patrones: "¿Necesita el 'cómo' ser descubierto, o ya se conoce?"

**Análisis de operacionalidad:**

La pregunta es ambigua en exactamente los casos más comunes en THYROX:

**Caso A — WP con dominio conocido pero instancia nueva:**
Un nuevo WP de refactoring de código. El dominio es conocido (refactoring), los 12 stages THYROX son conocidos. Pero la instancia específica (qué archivos refactorizar, qué dependencies tienen, qué orden es seguro) no se conoce sin análisis. ¿El "cómo" se conoce o no? La regla no resuelve este caso — depende de si "cómo" se refiere al proceso general (conocido: THYROX) o al plan específico (desconocido: requiere Stage 1 DISCOVER).

**Caso B — Routing con muchas rutas conocidas:**
Un router de Cap. 2 con 20 rutas posibles podría "descubrir" el camino correcto al evaluar el input contra las 20 condiciones. Funciona como Planning (descubre el camino), pero arquitectónicamente es Routing. La regla no distingue entre "Routing con muchas rutas" y "Planning genuino."

**Caso C — Agente con herramientas y reflexion:**
Un agente que usa herramientas (web search, code execution) y puede reflexionar sobre los resultados para decidir los próximos pasos. ¿Es Planning o es simplemente ReAct (Reasoning + Acting)? El capítulo no distingue Planning de ReAct.

**Hallazgo:** La regla "¿se conoce el cómo?" es un heurístico útil pero no suficientemente preciso para ser operacional en diseño. Los tres casos anteriores son comunes en THYROX y ninguno tiene respuesta clara de la regla.

---

### 7.3. Los cuatro casos de uso — ¿genuinamente distintos en sus requisitos de Planning?

**El claim del capítulo (Sec. 5):** Cuatro dominios (automatización procedimental, robótica, síntesis de información, soporte al cliente) como casos de uso distintos de Planning.

**Análisis comparativo:**

| Dominio | Característica planning del capítulo | Estructura subyacente real |
|---------|-------------------------------------|---------------------------|
| Onboarding | Dependencias ordenadas, herramientas externas | Grafo de dependencias conocido → Planning clásico (HTN) |
| Robótica | Optimización de métricas (tiempo, energía) con obstáculos dinámicos | Planificación bajo incertidumbre con observación parcial (POMDP) |
| Investigación | Fases con bucle iterativo, recopilación → síntesis | Planning iterativo con revisión de resultados — más cercano a PDCA |
| Soporte | Diagnóstico → solución → escalamiento | Árbol de decisión con estados conocidos → es Routing, no Planning |

**Hallazgo CRÍTICO:** El caso de soporte al cliente ("diagnóstico → solución → escalamiento") es estructuralmente idéntico a Routing (Cap. 2). El flujo tiene estados conocidos de antemano (diagnóstico, solución, escalamiento) y lógica condicional entre ellos. El capítulo lo clasifica como Planning sin explicar por qué es Planning y no Routing — lo que contradice directamente la regla de selección de Sec. 4 (el "cómo" del soporte al cliente se conoce: diagnosticar, intentar resolver, escalar si falla).

El caso de robótica con obstáculos dinámicos es el único donde Planning en sentido estricto (descubrimiento autónomo del cómo) es genuinamente necesario — pero el capítulo lo trata con la misma profundidad que los otros tres.

---

### 7.4. DeepResearch y la revisión colaborativa — ¿feature de Planning o de DeepResearch?

**El claim (Sec. 7, Fase 2):** "El plan se presenta al usuario para modificación antes de ejecutar."

**Análisis desde la arquitectura de los otros capítulos:**

Los capítulos anteriores (Chaining, Routing, Parallelization) no incluyen revisión humana como elemento del patrón. La revisión humana en THYROX existe como Stopping Points (SP-N) — son puntos de parada explícitos, no parte del flujo agentico en sí.

Si la revisión colaborativa fuera parte del patrón Planning en general, entonces Planning sería el único patrón que integra human-in-the-loop de forma nativa. Pero el capítulo no formula esto como propiedad general del patrón — solo como feature de DeepResearch.

**Hallazgo:** La revisión colaborativa en DeepResearch es una decisión de producto (reducir el riesgo de ejecutar un plan costoso que el usuario no quería), no una propiedad arquitectónica del patrón Planning. El patrón Planning puede existir sin revisión colaborativa (como lo demuestra el código CrewAI, que no tiene revisión humana antes de ejecutar).

Para THYROX: la revisión colaborativa antes de Stage 10 IMPLEMENT no deriva del patrón Planning — deriva de los Stopping Points y del routing de 4 rutas del Cap. 2. Atribuirla a Planning confundiría la fuente del mecanismo.

---

### 7.5. Qué aporta Planning a la arquitectura del gate calibrado — análisis de necesidad

El `parallelization-deep-dive.md` (Sec. 8) construyó la arquitectura completa del gate calibrado con Agente (Cap. 6 del libro, no del capítulo en análisis), Chaining, Routing, y Parallelization. ¿Dónde entraría Planning en esa arquitectura?

**Respuesta analítica:**

Planning sería necesario en la arquitectura THYROX en exactamente dos casos:

1. **Cuando el número y tipo de evaluadores del gate no es conocido de antemano** — si el sistema debe decidir dinámicamente cuántos evaluadores lanzar y de qué tipo según el artefacto a evaluar. En la arquitectura actual, los evaluadores son predeterminados (completitud, evidencia, consistencia) — Planning no es necesario.

2. **Cuando Stage 1 DISCOVER necesita generar dinámicamente los stages siguientes** — si el plan de trabajo para el WP (qué stages ejecutar, en qué orden, con qué artefactos) debe generarse autónomamente según el dominio del WP. Esto sería Planning genuino al nivel del WP completo.

**Hallazgo:** Para el problema central de este WP (realismo performativo + gate calibrado), Planning no agrega un mecanismo nuevo — los otros tres patrones son suficientes para la arquitectura del gate. Planning sería relevante para THYROX en un nivel más alto: la generación autónoma del plan de un WP completo, no en la evaluación de artefactos individuales.

---

## Síntesis: Implicaciones directas para THYROX

### Lo que es adoptable sin validación adicional

| Concepto | Adopción recomendada | Justificación |
|----------|---------------------|---------------|
| Regla de selección como heurístico (no regla) | Usar como pregunta orientadora en Stage 1 DISCOVER: "¿Necesita el workflow de este WP ser descubierto, o ya se conoce?" | Válida como heurístico de diseño aunque no operacionalmente precisa para todos los casos (ver SALTO-2) |
| Plan = estado inicial + estado objetivo + secuencia | Aplicar a Exit Conditions: cada EC debe tener estado inicial implícito y predicado de estado objetivo verificable | La estructura es válida aunque el capítulo la toma prestada de IA clásica sin derivarla |
| Planning como nivel meta para WPs open-ended | Cuando un nuevo WP no tiene estructura conocida, el primer stage genera dinámicamente el plan del WP (qué stages son relevantes, en qué orden) | Es el uso genuino del patrón — no el código CrewAI de ejemplo |

### Lo que requiere validación antes de adoptar

| Concepto | Por qué requiere validación | Qué validar |
|----------|---------------------------|-------------|
| Jerarquía Planning → genera workflow → otros tres lo ejecutan | No universalmente válida — en arquitecturas con workflow predeterminado, los cuatro operan al mismo nivel (SALTO-3) | Verificar en qué stages de THYROX el workflow debe ser generado dinámicamente vs. predeterminado |
| Revisión colaborativa como parte de Planning | Es feature de DeepResearch (producto), no del patrón (CONTRADICCIÓN-2) | Mantener la revisión colaborativa derivada de SP-N y Routing, no de Planning |

### Lo que contradice claims del capítulo y no debe adoptarse

| Claim del capítulo | Problema | Alternativa correcta |
|-------------------|----------|---------------------|
| Código CrewAI con agente único implementa Planning | FALSO — no hay separación planning/execution (CONTRADICCIÓN-1, SALTO-1) | Un sistema Planning requiere mínimo: planner (genera el plan como objeto separable), executor (ejecuta pasos del plan), y mecanismo de revisión del plan antes de ejecutar |
| `budget_tokens` = "planning tokens" | FALSO — es extended thinking en general, no planning específico (SALTO-5) | Usar `budget_tokens` como parámetro de reasoning extendido, no como activador de planning |
| Soporte al cliente como caso de Planning | INCORRECTO — es Routing con estados conocidos (Capa 7.3) | El soporte al cliente con flujo conocido (diagnóstico → solución → escalamiento) es Cap. 2 Routing |

### Gap respecto a la arquitectura del gate calibrado

Planning no agrega un mecanismo nuevo a la arquitectura del gate calibrado (Chaining + Routing + Parallelization son suficientes para esa función). Planning es relevante para THYROX en un nivel más alto: generación autónoma del plan de un WP completo cuando el dominio es suficientemente abierto para que el workflow no sea predeterminado. Este uso no está en el capítulo — es una extrapolación del análisis.

---

## Conteo final

- **Saltos lógicos identificados:** 5 (SALTO-1 a SALTO-5)
  - Críticos: 2 (SALTO-1: código CrewAI; SALTO-5: budget_tokens)
  - Medios: 3 (SALTO-2: regla de selección; SALTO-3: jerarquía; SALTO-4: DeepResearch)
- **Contradicciones identificadas:** 3 (CONTRADICCIÓN-1 a CONTRADICCIÓN-3)
  - Planning vs. implementación CrewAI: crítica
  - Autonomía vs. revisión colaborativa: media
  - "Herramienta específica" vs. "puente esencial": menor (retórica)
- **Engaños estructurales:** 4 (ENGAÑO-1 a ENGAÑO-4)
  - Credibilidad prestada IA clásica: domina el capítulo
  - Código CrewAI como demostración del patrón: afecta aplicabilidad práctica
  - DeepResearch como evidencia arquitectónica: no verificable
  - `budget_tokens` renombrado: potencialmente confunde implementaciones

**Veredicto:** PARCIALMENTE VÁLIDO — La distinción conceptual central (Planning cuando el workflow debe ser descubierto) es correcta y adoptable. Las implementaciones concretas (CrewAI, OpenAI con `budget_tokens`) no demuestran el patrón como fue definido. La jerarquía Planning → genera workflow de los otros tres es plausible pero no universalmente válida para THYROX.
