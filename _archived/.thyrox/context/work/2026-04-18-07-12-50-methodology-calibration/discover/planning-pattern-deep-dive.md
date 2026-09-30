```yml
created_at: 2026-04-18 16:52:29
updated_at: 2026-04-18 23:55:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 2.1.0
fuente: Capítulo 6 — "Planificación" (libro agentic design patterns, versión ajustada v2.1)
veredicto_síntesis: PARCIALMENTE VÁLIDO
saltos_lógicos: 5
contradicciones: 3
engaños_estructurales: 5
delta_vs_v2.0: "SALTO-6 NUEVO: integración de documentos privados etiquetada como Planning (es RAG+Planning, no solo Planning). ENGAÑO-5 NUEVO: 'no mera concatenación' como garantía de síntesis crítica sin mecanismo de validación."
delta_vs_v1: "SALTO-3 RESUELTO (jerarquía eliminada). SALTO-4 DEBILITADO (casos concretos). SALTO-6 NUEVO. ENGAÑO-5 NUEVO. Veredicto sin cambio."
```

# Deep-Dive: Capítulo 6 — Planificación (Planning Pattern) v2.0.0

> Análisis adversarial exhaustivo del capítulo ajustado.
> **Base de delta:** v1.0.0 (planning-pattern-deep-dive.md, 2026-04-18 16:52:29).
> Los saltos y contradicciones numerados heredados de v1 conservan su numeración.
> Sección 0 documenta los cambios desde v1 antes del análisis completo.

---

## SECCIÓN 0: DELTA V1.0.0 → V2.0.0

### Cambios en el texto fuente

| Elemento eliminado | Efecto en análisis |
|-------------------|-------------------|
| Sección 9: "los cuatro patrones como arquitectura completa" — tabla jerárquica "Planning → genera workflow → ejecutan Chaining+Routing+Parallelization" | **SALTO-3 RESUELTO**: el salto dependía de esta afirmación explícita. Sin ella, no hay claim de jerarquía que analizar. |
| Tabla "Implicaciones directas para THYROX" (era parte del input.md estructurado v1, no del texto del capítulo) | No afecta el análisis del capítulo — era interpretación del autor del input |

| Elemento añadido | Efecto en análisis |
|-----------------|-------------------|
| DeepResearch: casos concretos (análisis competitivo, exploración académica) | **SALTO-4 DEBILITADO**: el capítulo ahora provee ejemplos funcionales específicos que aumentan la plausibilidad del claim "Planning para investigación compleja". El salto persiste pero su tamaño baja de MEDIO a MENOR. |
| Código CrewAI: `load_dotenv()` + print statements | Sin efecto en el análisis arquitectónico — no cambia la estructura planner/executor del código. |
| Nueva conclusión con "escalabilidad" (sin jerarquía) | CONTRADICCIÓN-3 persiste: "herramienta específica" vs. "puente esencial" — ambas frases siguen presentes en el texto. |

### Conteo de cambios

| Métrica | v1.0.0 | v2.0.0 | Delta |
|---------|--------|--------|-------|
| Saltos lógicos | 5 | 4 | -1 (SALTO-3 resuelto) |
| Contradicciones | 3 | 3 | 0 |
| Engaños estructurales | 4 | 4 | 0 |
| Veredicto | PARCIALMENTE VÁLIDO | PARCIALMENTE VÁLIDO | sin cambio |

---

## CAPA 1: LECTURA INICIAL

### Tesis central del capítulo

El capítulo argumenta que existe un patrón agentic — Planning — que se diferencia de otros por una sola propiedad: el "cómo" del workflow no se conoce de antemano y debe ser descubierto autónomamente por el agente. La regla de selección es una sola pregunta: "¿Necesita el 'cómo' ser descubierto, o ya se conoce?"

La v2 reemplaza la síntesis jerárquica ("Planning genera el workflow para los otros tres patrones") por una narrativa de escalabilidad: Planning se escala desde tareas simples hasta sistemas complejos como DeepResearch.

### Estructura lógica declarada (v2)

```
Premisa: la inteligencia requiere previsión y descomposición de objetivos complejos
   ↓
Mecanismo: Planning = transformar objetivo de alto nivel → secuencia de pasos discretos
   ↓
Distinción: cuando el "cómo" debe ser descubierto → Planning; cuando ya se conoce → workflow fijo
   ↓
Implementación: CrewAI (un agente planner+writer) + DeepResearch (Google) + OpenAI API
   ↓
Escalabilidad: Planning escala de tareas simples (CrewAI) a sistemas complejos (DeepResearch)
   ↓
Conclusión: Planning es el "puente esencial entre intención humana y ejecución automatizada"
```

### Afirmaciones centrales

1. **A1** — Regla de selección: "¿Necesita el 'cómo' ser descubierto, o ya se conoce?"
2. **A2** — El código CrewAI con un solo agente "Article Planner and Writer" implementa el patrón Planning
3. **A3** *(nueva v2)* — Planning "se escala desde ejecución de tareas secuencial y directa... a sistemas más complejos y dinámicos"
4. **A4** — DeepResearch implementa "revisión colaborativa: el plan se presenta al usuario para modificación antes de ejecutar"
5. **A5** — `reasoning={"budget_tokens": 10000}` = "razonamiento, planificación y síntesis de información de forma independiente"
6. **A6** — Los casos de uso (onboarding, robótica, investigación, soporte) son manifestaciones genuinamente distintas del patrón

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa 1: Frameworks teóricos

| Instancia | Ubicación | Validez |
|-----------|-----------|---------|
| Planning como "proceso computacional fundamental en sistemas autónomos" | Definición central | INCIERTO — la IA clásica tiene planning formal (STRIPS, PDDL, HTN). El capítulo no cita estas tradiciones. |
| "Estado inicial → estado objetivo → secuencia de acciones" | Definición del plan | VERDADERO parcialmente — es la definición de planning clásico (STRIPS, 1971). El capítulo no deriva sus implementaciones de este framework. |
| Adaptabilidad del plan inicial | Analogía de la reunión | INCIERTO — descripción informal sin referencia a planificación bajo incertidumbre. |

**Hallazgo:** El capítulo invoca terminología de planning clásica sin citar ni derivar formalmente de esos frameworks. La credibilidad prestada de STRIPS/HTN opera en la superficie.

### Sub-capa 2: Aplicaciones concretas

| Instancia | Ubicación | Derivación |
|-----------|-----------|------------|
| Un solo agente CrewAI implementa Planning | Código + descripción | ANALOGÍA — el agente genera texto con estructura de plan, no hay separación arquitectónica planner/executor. |
| DeepResearch como Planning avanzado | Sec. 6 | ANALÓGICO — features UX mapeadas al patrón. No hay derivación de que estos features sean Planning según la definición del capítulo. |
| `budget_tokens` = planificación + razonamiento + síntesis | Sec. 7 | ANALÓGICO — renombra extended thinking como capacidades Planning. |

### Sub-capa 3: Números específicos

`budget_tokens: 10000` — sin justificación de por qué 10000, si es mínimo viable o valor de ejemplo. Sigue siendo arbitrario.

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

### SALTO-1: Del "objetivo de alto nivel" al "plan que emerge del LLM" *(PERSISTE — CRÍTICO)*

**Premisa:** Planning es un proceso donde el agente descubre autónomamente cómo llegar al objetivo.
**Conclusión:** Un solo agente con rol "Article Planner and Writer" que recibe `topic` y produce un reporte implementa este patrón.
**Ubicación:** Código CrewAI + descripción "primero formula un plan de múltiples pasos... y luego ejecuta ese plan secuencialmente."
**Tipo de salto:** Analogía sin derivación. No hay separación entre fase de planning y fase de execution. El mismo agente hace ambas.
**Tamaño:** CRÍTICO
**Justificación que debería existir:** El patrón Planning debería requerir: (a) representación explícita del plan como objeto separable, (b) plan inspeccionable/modificable antes de ejecutar, (c) distinción arquitectónica entre planner y executor. El código no satisface ninguna de estas tres condiciones.

---

### SALTO-2: De "el cómo debe ser descubierto" a Planning como categoría distinta *(PERSISTE — MEDIO)*

**Premisa:** La diferencia entre Planning y otros patrones es si el workflow se conoce o no.
**Conclusión:** Por tanto, Planning es un patrón arquitectónico diferente.
**Ubicación:** Sec. 3 — principio de equilibrio.
**Tipo de salto:** La distinción está correctamente enunciada pero no demarcada arquitectónicamente respecto a Routing complejo. La frontera "Routing con muchas rutas" vs. "Planning" no está definida.
**Tamaño:** MEDIO

---

### ~~SALTO-3: Planning como meta-nivel que genera workflow de los otros tres~~ *(RESUELTO en v2)*

**Resolución:** La sección que contenía la afirmación "Planning → genera el workflow → que se ejecuta mediante Chaining + Routing + Parallelization" fue eliminada del capítulo. La conclusión v2 usa "escalabilidad" sin hacer la afirmación jerárquica. El salto desaparece.

**Nota para THYROX:** La resolución es por omisión, no por corrección. La relación jerárquica no fue demostrada falsa — simplemente dejó de afirmarse. Para THYROX, el análisis de v1 sigue siendo válido: en arquitecturas con workflow predeterminado (como el gate calibrado), los cuatro patrones operan al mismo nivel.

---

### SALTO-4: De DeepResearch (producto comercial) a implementación del patrón Planning *(PERSISTE — MENOR, debilitado)*

**Premisa:** DeepResearch de Google tiene fases de deconstrucción, revisión colaborativa, bucle iterativo, síntesis asíncrona, y produce resultados verificables en análisis competitivo y exploración académica.
**Conclusión:** Por tanto DeepResearch "ejemplifica el patrón en su forma más avanzada."
**Ubicación:** Sec. 6, descripción de DeepResearch + casos de uso.
**Tipo de salto:** ANALOGÍA SIN DERIVACIÓN. DeepResearch es un producto con arquitectura interna no publicada. Los casos de uso concretos (análisis competitivo, exploración académica) aumentan la plausibilidad funcional pero no confirman la arquitectura interna.
**Tamaño:** MENOR *(reducido desde MEDIO — los casos concretos añaden evidencia funcional)*
**Justificación que debería existir:** Acceso a la arquitectura interna de DeepResearch o paper técnico.

---

### SALTO-6: De integración de documentos privados a "esto es Planning" *(NUEVO en v2.1 — MEDIO)*

**Premisa:** DeepResearch "puede integrar documentos proporcionados por el usuario, combinando información de fuentes privadas con su investigación basada en web."
**Conclusión:** Esta capacidad es presentada como parte del patrón Planning.
**Ubicación:** Sección DeepResearch — arquitectura del sistema.
**Tipo de salto:** EXPANSIÓN DE ALCANCE SIN SEPARACIÓN. La integración de documentos privados con búsqueda web es Retrieval-Augmented Generation (RAG), no Planning. El capítulo presenta RAG + Planning como si fueran el mismo patrón — sin aclarar que la integración de documentos privados agrega una capa arquitectónica distinta al Planning descrito formalmente.
**Tamaño:** MEDIO
**Justificación que debería existir:** Una distinción explícita entre las capacidades de Planning (planificación dinámica) y las capacidades RAG (integración de fuentes privadas). DeepResearch implementa ambas — pero el capítulo atribuye ambas al patrón "Planning."
**Implicación THYROX:** Si un WP necesita combinar análisis de artefactos internos con investigación web, eso es Planning + RAG — no solo Planning. Distinguir estas capas afecta cómo se diseñaría el agente.

---

### SALTO-5: De `budget_tokens` (extended thinking) a capacidades de Planning *(PERSISTE — CRÍTICO)*

**Premisa:** La API de OpenAI tiene `reasoning={"type": "enabled", "budget_tokens": 10000}`.
**Conclusión (v2):** El sistema "puede razonar, planificar y sintetizar información de forma independiente."
**Ubicación:** Descripción del sistema OpenAI Deep Research.
**Tipo de salto:** RENAMING SIN EQUIVALENCIA. `budget_tokens` controla el presupuesto de extended thinking (chain-of-thought) del modelo. El capítulo lo amplía a "razonar, planificar y sintetizar" — tres capacidades distintas que no se derivan de este único parámetro.
**Tamaño:** CRÍTICO

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

### CONTRADICCIÓN-1: Definición de Planning vs. implementación CrewAI *(PERSISTE)*

**Afirmación A (definición):** "Este proceso transforma un objetivo de alto nivel en un plan estructurado compuesto de pasos discretos y ejecutables." — implica plan como objeto separable.

**Afirmación B (implementación):** Un solo agente con `allow_delegation=False` en `Process.sequential` "primero formula un plan de múltiples pasos... y luego ejecuta ese plan secuencialmente."

**Por qué chocan:** (A) implica separabilidad del plan. (B) tiene el mismo agente generando y ejecutando sin separación — el "plan" no existe como objeto inspeccionable entre las dos fases.

**Cuál prevalece:** Ninguna sin modificación. La contradicción no fue resuelta en v2 — el código CrewAI no cambió arquitectónicamente.

---

### CONTRADICCIÓN-2: Planning como descubrimiento autónomo vs. revisión colaborativa obligatoria en DeepResearch *(PERSISTE)*

**Afirmación A:** Planning es un proceso autónomo del agente.

**Afirmación B:** DeepResearch incluye "revisión colaborativa: el plan se presenta al usuario para modificación antes de ejecutar."

**Por qué chocan:** Si Planning es autónomo, la revisión colaborativa obligatoria introduce dependencia humana. El capítulo no resuelve esta tensión ni distingue variantes del patrón.

**Cuál prevalece:** INCIERTO. No hay sección de variantes que distinga "Planning con human-in-the-loop" de "Planning completamente autónomo."

---

### CONTRADICCIÓN-3: Planning como "herramienta específica, no universal" vs. "puente esencial" *(PERSISTE)*

**Afirmación A:** "La planificación dinámica es una herramienta específica, no una solución universal." (Sec. 3 — principio de equilibrio)

**Afirmación B:** "La planificación proporciona el puente esencial entre la intención humana y la ejecución automatizada para problemas complejos." (Conclusión v2)

**Por qué chocan:** (A) califica Planning como específico y limitado. (B) lo posiciona como "esencial" — un término que no admite excepciones dentro de su dominio declarado. La v2 sigue teniendo ambas afirmaciones en el mismo texto.

**Cuál prevalece:** (A) es más precisa. (B) es retórica de conclusión que sobrescribe la limitación explícita de (A).

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

### ENGAÑO-1: Credibilidad prestada de la planificación clásica *(PERSISTE)*

**Patrón:** Credibilidad prestada.
**Operación:** El capítulo usa terminología de planning clásico (estado inicial, estado objetivo, secuencia de acciones) sin citar STRIPS/PDDL/HTN. El lector asocia la terminología con rigor formal de IA clásica, aunque el capítulo opera con LLMs que no tienen garantías de completitud ni correctitud del plan.

---

### ENGAÑO-2: Código CrewAI como demostración de Planning *(PERSISTE)*

**Patrón:** Validación en contexto distinto.
**Operación:** El código demuestra que un LLM puede generar texto con estructura de plan — no que existe un proceso de planning separable de la ejecución. La v2 añade `load_dotenv()` y print statements, pero no cambia la arquitectura de agente único sin separación planner/executor.

---

### ENGAÑO-3: DeepResearch como evidencia arquitectónica de Planning *(PERSISTE, DEBILITADO)*

**Patrón:** Notación formal encubriendo especulación.
**Operación:** La v2.1 añade casos de uso funcionales (análisis competitivo, exploración académica) con descripción detallada que son plausibles. Pero siguen siendo descripciones de la UX del producto, no de la arquitectura interna. El engaño es menos severo porque los casos concretos añaden plausibilidad funcional — pero la conclusión arquitectónica sigue sin respaldo.

---

### ENGAÑO-5: "No mera concatenación" como garantía de síntesis crítica *(NUEVO en v2.1)*

**Patrón:** Negación de defecto como afirmación de calidad.
**Operación:** El capítulo afirma: "La salida final no es meramente una lista concatenada de hallazgos, sino un informe estructurado de múltiples páginas. Durante la fase de síntesis, el modelo realiza una evaluación crítica de la información recopilada." La negación de concatenación ("no meramente") se usa como evidencia implícita de síntesis crítica genuina.
**Ubicación:** Sección DeepResearch — descripción del output.
**Por qué es engañoso:** Afirmar que el output NO es concatenación no prueba que la alternativa (síntesis crítica con evaluación) ocurra mecánicamente de forma verificable. Un LLM puede generar texto con apariencia de síntesis crítica sin que exista un mecanismo separado de "evaluación crítica" — exactamente el mismo problema del código CrewAI (ENGAÑO-2): el LLM genera texto que parece el output de un proceso, sin que el proceso exista arquitectónicamente.
**Efecto:** El lector infiere que DeepResearch tiene un componente de "evaluación crítica" separado de la generación. No hay evidencia de que esto sea una fase arquitectónica distinguible vs. simplemente el output del modelo con instrucciones de síntesis.
**Tamaño:** MEDIO — relevante para claims de calidad del output, no de arquitectura del patrón.

---

### ENGAÑO-4: `budget_tokens` renombrado como "planning tokens" *(PERSISTE)*

**Patrón:** Notación formal encubriendo especulación.
**Operación:** La v2 describe el sistema como capaz de "razonar, planificar y sintetizar información de forma independiente" — expandiendo el renaming de extended thinking a un conjunto de capacidades más amplio. El engaño persiste y es ligeramente más amplio en v2 (tres capacidades en lugar de una).

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia | Fuente externa |
|-------|-----------|----------------|
| La distinción "workflow conocido" vs. "workflow a descubrir" es real y útil | Diferencia entre sistemas rule-based y sistemas de planificación documentada en IA clásica | Russell & Norvig, Cap. 10-11 (Planning) |
| Los LLMs pueden generar secuencias de pasos coherentes para objetivos de alto nivel | Demostrado en benchmarks de reasoning y task decomposition | BIG-Bench, ToolBench |
| Planning tiene rol meta en sistemas agenticos complejos (orquesta otros patrones) | La intuición es correcta — alguien debe generar el workflow en sistemas multi-agente | Google ADK documentation |
| El principio de equilibrio (Planning solo cuando el cómo no se conoce) es operacionalmente correcto | Regla de parsimonia para sistemas agenticos | YAGNI aplicado a agentic design |
| DeepResearch presenta el plan al usuario antes de ejecutar (revisión colaborativa) | Confirmado por UX del producto | Gemini DeepResearch product page |
| Los casos de uso de análisis competitivo y exploración académica son plausibles como Planning | La investigación multi-fuente iterativa genuinamente requiere planificación dinámica | Ejemplos funcionales coherentes con la definición del patrón |

### FALSO

| Claim | Por qué es falso |
|-------|-----------------|
| El código CrewAI con un solo agente implementa el patrón Planning | No hay separación planner/executor. El "plan" no existe como objeto separable — es parte del output textual del LLM. La propia definición del capítulo requiere pasos "discretos y ejecutables" que implican separabilidad. |
| `budget_tokens` son tokens dedicados específicamente a planificación | `budget_tokens` controla extended thinking en general. No hay evidencia de que el modelo use esos tokens específicamente para generar un plan separable. |

### INCIERTO

| Claim | Por qué no es verificable |
|-------|--------------------------|
| DeepResearch implementa Planning en sentido técnico | Arquitectura interna propietaria — el capítulo describe UX, no arquitectura |
| La revisión colaborativa es parte del patrón Planning | No generalizada en el capítulo — solo feature de DeepResearch |
| Los cuatro casos de uso tienen requisitos genuinamente distintos de Planning | Algunos pueden reducirse a Routing (soporte al cliente — ver Capa 7.3) |

### Patrón dominante (sin cambio respecto a v1)

**Credibilidad prestada de múltiples fuentes simultáneas sin derivación.**

El capítulo opera en tres capas de credibilidad prestada:
1. Terminología de IA clásica (STRIPS, estado-objetivo) → rigor formal al concepto
2. Productos comerciales reconocidos (Google DeepResearch, OpenAI) → relevancia práctica
3. Frameworks de código abierto (CrewAI) → implementabilidad inmediata

Ninguna capa está derivada formalmente. La v2 añade evidencia funcional a la capa de productos comerciales (casos concretos de DeepResearch), pero no resuelve el problema de acceso a la arquitectura interna.

---

## CAPA 7 (ADICIONAL): ANÁLISIS DE INTEGRACIÓN INTER-CAPÍTULOS (actualizado para v2)

### 7.1. La relación jerárquica Planning → otros tres — ¿sigue siendo relevante en v2?

La v2 eliminó la afirmación jerárquica explícita. La conclusión usa "escalabilidad" en lugar de "jerarquía".

**Impacto en THYROX:** El análisis de v1 (Sec. 7.1) sigue siendo válido como hallazgo independiente del capítulo: en arquitecturas con workflow predeterminado (gate calibrado), los cuatro patrones operan al mismo nivel. La eliminación del claim en v2 no lo invalida — simplemente el capítulo ya no lo afirma incorrectamente.

**La v2 añade una narrativa de escalabilidad** ("de tareas simples a sistemas complejos") que es más honesta arquitectónicamente — Planning no está por encima de los otros patrones, sino que aplica en problemas donde el workflow es más abierto.

---

### 7.2. La "regla de selección" central — operacionalidad (sin cambio desde v1)

Los tres casos de ambigüedad identificados en v1 (WP con dominio conocido/instancia nueva; Routing con muchas rutas; ReAct vs. Planning) persisten sin resolución en v2. La regla sigue siendo útil como heurístico pero no suficientemente precisa para diseño arquitectónico.

---

### 7.3. El caso de soporte al cliente — ¿corregido en v2?

**v1:** "diagnóstico → solución → escalamiento" fue identificado como Routing, no Planning.
**v2:** El texto del capítulo dice "diagnóstico → implementación de soluciones → escalamiento."

El cambio es solo de "implementación de soluciones" en lugar de "solución" — la estructura sigue siendo la misma: tres estados conocidos de antemano con lógica condicional entre ellos. El hallazgo de v1 persiste: este caso es Routing, no Planning.

---

### 7.4. Nueva narrativa de escalabilidad de v2 — análisis de validez

**El claim (Conclusión v2):** Planning "se escala desde ejecución de tareas secuencial y directa... a sistemas más complejos y dinámicos."

**Evaluación:** Esta narrativa es más honesta que la jerarquía de v1. Es verdad que Planning puede aplicarse en diferentes escalas de complejidad. Sin embargo, el claim sigue sin distinguir:
- Cuándo la "complejidad" requiere Planning dinámico genuino vs. más Routing/Chaining predeterminado
- Qué propiedades del sistema cambian al "escalar" Planning

La escalabilidad es una descripción cualitativa sin umbral definido.

---

### 7.5. DeepResearch v2 — ¿los nuevos casos de uso resuelven el SALTO-4?

**Casos añadidos en v2:** análisis competitivo, exploración académica.

**Evaluación de validez:**
- Análisis competitivo: múltiples fuentes, evaluación de relevancia, síntesis — genuinamente requiere planificación dinámica porque el conjunto de competidores a analizar no es conocido de antemano. **PLAUSIBLE** como Planning.
- Exploración académica: revisión de literatura con identificación de brechas — también requiere planificación dinámica porque los artículos a incluir emergen del proceso. **PLAUSIBLE** como Planning.

**Conclusión:** Los nuevos casos son genuinamente más alineados con la definición del patrón que los cuatro casos originales. Esto debilita SALTO-4 de MEDIO a MENOR. Sin embargo, siguen siendo descripciones UX — la arquitectura interna permanece no verificable.

---

## Síntesis: Implicaciones directas para THYROX (actualizado v2)

### Lo que es adoptable sin validación adicional

| Concepto | Adopción recomendada | Justificación |
|----------|---------------------|---------------|
| Regla de selección como heurístico | Usar como pregunta orientadora en Stage 1 DISCOVER: "¿Necesita el workflow de este WP ser descubierto, o ya se conoce?" | Válida como heurístico aunque no operacionalmente precisa para todos los casos |
| Plan = estado inicial + estado objetivo + secuencia | Aplicar a Exit Conditions: cada EC debe tener estado inicial implícito y predicado de estado objetivo verificable | Estructura válida aunque tomada de IA clásica sin derivación |
| Escalabilidad honesta de Planning | Usar Planning para WPs de investigación open-ended (análisis competitivo, exploración académica de dominios nuevos) — no para WPs con workflow THYROX predeterminado | La narrativa de escalabilidad v2 es más honesta que la jerarquía v1 |
| Planning como nivel meta para WPs open-ended | Cuando un nuevo WP no tiene estructura conocida, el primer stage genera dinámicamente el plan del WP | Uso genuino del patrón — no el código CrewAI de ejemplo |

### Lo que cambia de v1 a v2

| Concepto v1 | Cambio en v2 | Implicación THYROX |
|------------|-------------|-------------------|
| Jerarquía Planning → genera workflow de los otros tres | ELIMINADA del capítulo | El gate calibrado no necesita Planning como "meta-nivel" — los otros tres patrones son suficientes para la arquitectura del gate |
| DeepResearch como "Planning más sofisticado" sin casos | DeepResearch con análisis competitivo y exploración académica | Para THYROX: WPs de investigación de dominios nuevos (benchmarks, landscape de herramientas) son candidatos a Planning genuino |

### Lo que contradice claims del capítulo y no debe adoptarse

| Claim del capítulo | Problema | Alternativa correcta |
|-------------------|----------|---------------------|
| Código CrewAI con agente único implementa Planning | FALSO — no hay separación planning/execution | Un sistema Planning requiere mínimo: planner (genera el plan como objeto separable), executor (ejecuta pasos del plan) |
| `budget_tokens` = capacidades de "razonar, planificar y sintetizar" | FALSO — es extended thinking en general | Usar `budget_tokens` como parámetro de reasoning extendido general, no como activador de capacidades Planning |
| Soporte al cliente como caso de Planning | INCORRECTO — es Routing con estados conocidos | El soporte al cliente con flujo conocido es Cap. 2 Routing |

---

## Conteo final (v2.1)

- **Saltos lógicos identificados:** 5 (SALTO-1, 2, 4, 5, 6 — SALTO-3 resuelto)
  - Críticos: 2 (SALTO-1: código CrewAI; SALTO-5: budget_tokens)
  - Medios: 2 (SALTO-2: regla de selección; SALTO-6: RAG presentado como Planning)
  - Menores: 1 (SALTO-4: DeepResearch, debilitado desde MEDIO)
- **Contradicciones identificadas:** 3 (CONTRADICCIÓN-1 a CONTRADICCIÓN-3) — sin cambio
  - Planning vs. implementación CrewAI: crítica
  - Autonomía vs. revisión colaborativa: media
  - "Herramienta específica" vs. "puente esencial": menor (retórica)
- **Engaños estructurales:** 5 (ENGAÑO-1 a ENGAÑO-5)
  - Credibilidad prestada IA clásica: domina el capítulo
  - Código CrewAI como demostración del patrón: afecta aplicabilidad práctica
  - DeepResearch como evidencia arquitectónica: debilitado pero persiste
  - `budget_tokens` renombrado: potencialmente confunde implementaciones
  - "No mera concatenación" como garantía implícita de síntesis crítica: nuevo en v2.1

**Veredicto (sin cambio):** PARCIALMENTE VÁLIDO — La distinción conceptual central (Planning cuando el workflow debe ser descubierto) es correcta y adoptable. La eliminación de la jerarquía Planning→otros tres es una mejora real (SALTO-3 resuelto). Las implementaciones concretas (CrewAI, OpenAI con `budget_tokens`) siguen sin demostrar el patrón como fue definido. La integración de documentos privados (RAG) y la síntesis crítica son capacidades adicionales no distinguidas del patrón Planning.
