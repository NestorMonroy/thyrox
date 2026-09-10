```yml
created_at: 2026-04-19 00:07:11
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: Capítulo 8 — "Memoria" (libro agentic design patterns, texto preservado verbatim)
ratio_calibracion: "8.75/21 = 42%"
patron_dominante: "EFsA-Implementación: descripción semántica con implementación estructural incompatible"
```

# Análisis de Calibración: Capítulo 8 — Memoria

> Análisis de brechas de calibración para claims del capítulo.
> Protocolo: detectar claims sin evidencia, inconsistencias código/descripción, y categorías sin respaldo taxonómico.
> Referencia de patrón previo: planning-pattern-calibration.md (EFsA, ratio 44%).

---

## 1. Inventario de claims evaluados

| ID | Claim | Sección | Tipo |
|----|-------|---------|------|
| C-01 | "La memoria es el mecanismo a través del cual los agentes retienen, recuperan y aprovechan información" | §1 | Definicional |
| C-02 | "Carecen de persistencia de estado y contexto entre interacciones" (sin memoria) | §1 | Técnico |
| C-03 | Código §7 implementa "memoria" (memoria a corto plazo en conversación) | §7 | Arquitectónico |
| C-04 | Código §8 implementa "memoria semántica con vectores" | §8 | Arquitectónico |
| C-05 | `retrieve_relevant_memory` recupera "las k interacciones más similares usando búsqueda semántica" | §8 | Técnico |
| C-06 | El agente puede "efectivamente 'recordar' miles de interacciones sin abrumar la ventana de contexto" | §8 | Cuantitativo |
| C-07 | Los 5 tipos de memoria (Corto Plazo, Largo Plazo, Activa, Episódica, Semántica) forman una taxonomía de mecanismos | §4 | Taxonómico |
| C-08 | "Memoria Activa": información actualmente procesada o referenciada en toma de decisiones | §4 | Definicional |
| C-09 | "Memoria Episódica": registros de eventos específicos, útiles para historial de conversación | §4 | Definicional |
| C-10 | "Memoria Semántica": conocimiento general no vinculado a eventos específicos | §4 | Definicional |
| C-11 | "Redes de Memoria Episódica: con interferencia o olvido mínimo" | §9 | Técnico empírico |
| C-12 | "Memoria Basada en Atención": pesa dinámicamente importancia de memorias según contexto | §9 | Técnico |
| C-13 | "Memoria Jerárquica": múltiples capas con diferentes períodos de retención | §9 | Arquitectónico |
| C-14 | Trade-off exhaustividad vs. eficiencia como consideración clave | §6 | Normativo |
| C-15 | "La gestión inteligente de memoria implica seleccionar qué almacenar, por cuánto tiempo almacenarlo y cómo recuperarlo" | §6 | Normativo |
| C-16 | Los casos de uso (servicio al cliente, educación) como aplicaciones genuinas del patrón | §2 | Funcional |
| C-17 | Las 3 funciones primarias (Contextual, Continuidad, Personalización) como framework completo | §3 | Taxonómico |
| C-18 | El patrón Memory "eleva los sistemas agenticos de procesadores sin estado a entidades capaces de comprensión genuina" | §10 | Retórico-filosófico |
| C-19 | "La memoria no es meramente una característica técnica sino una capacidad fundamental" | §10 | Retórico |
| C-20 | "Entidades capaces de comprensión genuina y adaptación" | §10 | Filosófico |
| C-21 | "La gestión de memoria se vuelve cada vez más crítica" a mayor sofisticación del sistema | §10 | Cualitativo |

---

## 2. Evaluación por claim

### C-01: Definición funcional de memoria

**Texto exacto:** "La memoria es el mecanismo a través del cual los agentes retienen, recuperan y aprovechan información de interacciones previas para informar decisiones presentes y futuras." (§1)
**Tipo de claim:** Definicional — establece el scope del patrón.
**Evidencia presente:** Ninguna empírica — es una definición propuesta por el capítulo.
**Análisis:** La definición es funcional y operacional (tres verbos: retener, recuperar, aprovechar). No contradice ninguna definición de la literatura, aunque tampoco cita fuente. Como definición de trabajo para el patrón, es adoptable.
**Calibración:** DEFINICIÓN OPERACIONAL — aceptable como punto de partida. No requiere fuente si se usa como definición del patrón, no como afirmación empírica.
**Score:** 0.75 / 1.0

---

### C-02: Claim técnico — ausencia de persistencia sin memoria

**Texto exacto:** "los agentes carecen de persistencia de estado y contexto entre interacciones" (§1)
**Tipo de claim:** Técnico sobre comportamiento de LLMs/agentes.
**Evidencia presente:** Ninguna citada — es una observación verdadera sobre la arquitectura stateless de los LLMs (cada llamada API es independiente por diseño).
**Derivación:** Este es un hecho documentado de la arquitectura de LLMs vía API — cada llamada no tiene estado. La afirmación es técnicamente correcta aunque no cite fuente explícita.
**Calibración:** INFERENCIA CALIBRADA — verdadera por diseño arquitectónico de APIs de LLMs. Verificable con: llamada API sin `messages` histórico → pérdida de contexto.
**Score:** 1.0 / 1.0

---

### C-03: Código §7 implementa "memoria"

**Texto exacto:** El código usa `conversation_history` como lista de mensajes pasada a cada llamada API.
**Tipo de claim:** Arquitectónico — afirma que el código implementa el patrón Memory.
**Evidencia presente:** El código es observable y funcionalmente correcto.
**Análisis:** El código de §7 usa el mecanismo nativo de la API de mensajes de Anthropic: `messages=conversation_history`. Esto es exactamente lo que la API está diseñada para hacer — la lista de mensajes es el mecanismo de "conversación multi-turno" documentado en la API, no un patrón "Memory" adicional.
**Distinción técnica:** El código implementa "uso estándar de la API multi-turno" (capacidad de la plataforma), no un "Memory Pattern" (decisión arquitectónica adicional). No hay ningún mecanismo de almacenamiento, recuperación selectiva, ni gestión de ventana de contexto — el historial completo se pasa siempre.
**Calibración:** FALSO POSITIVO LEVE — el código funciona y demuestra retención de contexto en sesión, pero es el uso básico de la API, no el Memory Pattern como lo define el capítulo (que incluye recuperación selectiva, gestión de almacenamiento, etc.).
**Score:** 0.5 / 1.0

---

### C-04: Código §8 implementa "memoria semántica con vectores"

**Texto exacto:** "Un sistema de memoria más sofisticado podría utilizar incrustaciones vectoriales para almacenar y recuperar información de manera semántica" (§8, introducción del bloque).
**Tipo de claim:** Arquitectónico — afirma que el código implementa recuperación semántica con vectores.
**Evidencia presente:** El código es observable.

**Contradicción directa código vs. descripción:**

La descripción promete (§8, pasos 1-4):
1. Incrustar mensajes como vectores.
2. Almacenar en una base de datos vectorial.
3. Recuperar las k interacciones más **similares** usando **búsqueda semántica**.
4. Incluir solo interacciones relevantes.

La implementación real (`memory-pattern-input.md`, líneas 133-135):
```python
def retrieve_relevant_memory(query, top_k=5):
    # Recuperación simplificada: devolver últimas k entradas
    return memory_database[-top_k:] if memory_database else []
```

**Análisis de la contradicción:**
- No hay embeddings — `memory_database` es una lista de dicts con strings.
- No hay base de datos vectorial — es una lista Python en memoria.
- No hay búsqueda semántica — `[-top_k:]` es slicing posicional (últimas N entradas).
- El parámetro `query` se recibe pero **se ignora completamente**.

**Esto no es "recuperación simplificada" — es recuperación cronológica**. La diferencia es fundamental: recuperación semántica devuelve las memorias más *relevantes* para la consulta; recuperación cronológica devuelve las más *recientes*. En una conversación larga, pueden ser completamente distintas.

**Calibración:** CONTRADICCIÓN DIRECTA — el código no implementa lo que su descripción promete. La etiqueta "simplificada" en el comentario disimula que el algoritmo es conceptualmente diferente, no "simplificado".
**Score:** 0.0 / 1.0

---

### C-05: `retrieve_relevant_memory` recupera por similitud semántica

**Texto exacto:** "recuperar las k interacciones previas más similares usando búsqueda semántica" (§8)
**Tipo de claim:** Técnico específico sobre el comportamiento de la función.
**Evidencia presente:** El código es el mecanismo de evidencia — y lo refuta directamente.
**Análisis:** Ver C-04. El parámetro `query` entra en la función y se descarta. `return memory_database[-top_k:]` es O(1) posicional, no búsqueda.
**Calibración:** AFIRMACIÓN REFUTADA POR EL CÓDIGO — el claim describe un mecanismo que el código no tiene. No es "simplificación" — es una descripción incorrecta del comportamiento.
**Score:** 0.0 / 1.0

---

### C-06: El agente puede "efectivamente recordar miles de interacciones"

**Texto exacto:** "el agente puede efectivamente 'recordar' miles de interacciones sin abrumar la ventana de contexto" (§8)
**Tipo de claim:** Cuantitativo de capacidad — "miles", "efectivamente", "sin abrumar".
**Evidencia presente:** Ninguna empírica para "miles".
**Análisis:**
- La premisa del claim (recuperación semántica selectiva) ya está refutada (C-04, C-05). El código de §8 almacena todo en `memory_database` (lista en memoria) y recupera cronológicamente los últimos k.
- "Miles de interacciones" en una lista Python en memoria RAM: técnicamente posible como almacenamiento, pero el beneficio de no "abrumar la ventana de contexto" solo aplica si la recuperación es selectiva y relevante. El código recupera últimas 3 entradas — no "miles".
- "Efectivamente" implica que el recall es correcto (las memorias más relevantes se recuperan). Sin búsqueda semántica real, "efectivamente" no tiene respaldo.
**Calibración:** AFIRMACIÓN SIN MECANISMO — el claim de escala depende de un mecanismo (búsqueda semántica) que el código de referencia no implementa.
**Score:** 0.0 / 1.0

---

### C-07: Los 5 tipos de memoria como taxonomía de mecanismos

**Texto exacto:** "Existen varios tipos de mecanismos de memoria utilizados en sistemas agenticos: [Corto Plazo, Largo Plazo, Activa, Episódica, Semántica]" (§4)
**Tipo de claim:** Taxonómico — estos 5 tipos son los mecanismos de memoria en sistemas agenticos.
**Evidencia presente:** Ninguna fuente citada.
**Análisis:**
- "Memoria Episódica" y "Memoria Semántica" son categorías de la psicología cognitiva (Tulving, 1972 — distinción episódica/semántica). Su uso en sistemas agenticos es una analogía, no una correspondencia técnica directa.
- "Memoria a Corto Plazo" y "Largo Plazo" también tienen raíces en psicología cognitiva (Atkinson-Shiffrin, 1968), aunque también tienen uso informal en informática.
- "Memoria Activa" no es una categoría estándar en ninguna de las dos tradiciones — parece ser una categoría ad hoc del capítulo que se solapa con el concepto de "working memory" (Baddeley, 1986) pero no equivale exactamente.
- Los 5 tipos no son mutuamente excluyentes: el código §7 simultáneamente implementa "Corto Plazo" (sesión) y "Activa" (contexto actual). No hay criterio de clasificación.
**Calibración:** TAXONOMÍA SIN FUENTE FORMAL — las categorías son útiles informalmente pero mezclan origen cognitivo (Episódica, Semántica, Corto/Largo Plazo) con una categoría ad hoc (Activa) sin citar las fuentes originales ni aclarar las diferencias de la analogía.
**Score:** 0.25 / 1.0

---

### C-08: "Memoria Activa" — definición operacional

**Texto exacto:** "Información activa que se procesa actualmente o se referencia en la toma de decisiones." (§4)
**Tipo de claim:** Definicional de categoría.
**Evidencia presente:** Definición del capítulo.
**Análisis:** Esta definición es funcionalmente equivalente a "contexto actual en la ventana de contexto del LLM" — lo que la API recibe en cada llamada. No agrega diferencia técnica sobre Corto Plazo. Tampoco corresponde a ninguna categoría establecida en psicología cognitiva ni en literatura de ML (donde "working memory" sería el término correspondiente).
**Calibración:** CATEGORÍA REDUNDANTE — operacionalmente idéntica a "Memoria Corto Plazo activa" en el contexto de LLMs. Su valor como categoría separada no está derivado.
**Score:** 0.25 / 1.0

---

### C-09: "Memoria Episódica" como registro de eventos específicos

**Texto exacto:** "Registros de eventos o interacciones específicas, útiles para mantener historial de conversación o recordar acciones pasadas específicas." (§4)
**Tipo de claim:** Definicional de categoría.
**Evidencia presente:** Definición del capítulo.
**Análisis:** La transferencia de "memoria episódica" desde psicología cognitiva a sistemas agenticos es la más directa del conjunto: los registros de interacciones específicas con timestamps equivalen razonablemente al concepto cognitivo. Sin embargo, en psicología episódica incluye componentes temporales y de contexto ("episodio" = tiempo + lugar + emoción) que el capítulo no distingue.
**Calibración:** ANALOGÍA ÚTIL — la transferencia es razonable aunque simplificada. Aceptable como definición de trabajo.
**Score:** 0.75 / 1.0

---

### C-10: "Memoria Semántica" como conocimiento general

**Texto exacto:** "Conocimiento general o hechos sobre dominios, no vinculados a eventos o tiempos específicos." (§4)
**Tipo de claim:** Definicional de categoría.
**Evidencia presente:** Definición del capítulo.
**Análisis:** La transferencia cognitiva es la más directa del conjunto: Tulving (1972) define memoria semántica exactamente como conocimiento de hechos y conceptos independiente del contexto temporal de adquisición. La analogía con bases de conocimiento o embeddings de dominio en sistemas agenticos es directa y válida.
**Calibración:** ANALOGÍA BIEN FUNDAMENTADA — la categoría tiene respaldo cognitivo directo y la transferencia a sistemas agenticos es coherente.
**Score:** 0.75 / 1.0

---

### C-11: "Redes de Memoria Episódica: con interferencia o olvido mínimo"

**Texto exacto:** "Redes neuronales especializadas diseñadas para almacenar y recuperar información episódica con interferencia o olvido mínimo." (§9)
**Tipo de claim:** Técnico empírico — afirma una propiedad medible de un tipo de arquitectura.
**Evidencia presente:** Ninguna — ni nombre de arquitectura específica, ni referencia a paper, ni benchmark.
**Análisis:**
- Las "Redes de Memoria Episódica" son una familia real de arquitecturas (Episodic Memory Networks, Neural Turing Machines, Differentiable Neural Computers — Graves et al., 2016). Existen.
- "Interferencia o olvido mínimo" es un claim empírico sobre su comportamiento en comparación con RNNs/LSTMs estándar. Este claim tiene sustento en la literatura (precisamente el problema de "catastrophic forgetting" motivó estas arquitecturas).
- Sin embargo, el capítulo no distingue entre estas arquitecturas y LLMs + memory stores. "Redes de Memoria Episódica" son arquitecturas de ML (entrenables end-to-end), distintas del patrón de "LLM + almacenamiento externo" que el capítulo describe en §7 y §8.
**Calibración:** CLAIM VERDADERO PARA UN DOMINIO DIFERENTE — las Episodic Memory Networks con olvido mínimo existen y tienen evidencia empírica, pero son arquitecturas de ML entrenables. El patrón descrito en el capítulo (LLM + almacenamiento externo) no hereda esta propiedad.
**Score:** 0.25 / 1.0

---

### C-12: "Memoria Basada en Atención" — descripción de mecanismo

**Texto exacto:** "Utilizando mecanismos de atención para pesar dinámicamente la importancia de diferentes memorias basadas en contexto." (§9)
**Tipo de claim:** Técnico descriptivo.
**Evidencia presente:** Los mecanismos de atención (Vaswani et al., 2017 — "Attention is All You Need") son el fundamento de los Transformers, incluyendo los LLMs. El claim es técnicamente correcto en ese sentido.
**Análisis:** La atención en Transformers pesa tokens en la ventana de contexto — técnicamente es "memoria basada en atención" dentro de la ventana. Para memoria externa (stores de vectores), la atención no aplica directamente — se necesita un retrieval con scoring.
**Calibración:** FUNDAMENTADO PARCIALMENTE — correcto para el mecanismo interno del LLM (atención en contexto), no directamente aplicable a recuperación de memoria externa.
**Score:** 0.5 / 1.0

---

### C-13: "Memoria Jerárquica" — múltiples capas con diferentes retenciones

**Texto exacto:** "Múltiples capas de memoria con diferentes períodos de retención y estrategias de recuperación. La memoria a corto plazo podría almacenar los últimos N turnos de conversación, mientras que la memoria a largo plazo podría resumir interacciones más antiguas." (§9)
**Tipo de claim:** Arquitectónico descriptivo.
**Evidencia presente:** El patrón descripción (buffer corto plazo + resumen largo plazo) es una técnica documentada en sistemas de conversación (ej: LangChain's ConversationSummaryBufferMemory).
**Análisis:** A diferencia de C-11 y C-12, este claim describe una arquitectura implementable y directamente verificable. El ejemplo específico (últimos N turnos + resumen de anteriores) es un patrón de ingeniería concreto.
**Calibración:** FUNDAMENTADO — arquitectura real, implementable, con ejemplos existentes en frameworks.
**Score:** 0.75 / 1.0

---

### C-14: Trade-off exhaustividad vs. eficiencia como consideración clave

**Texto exacto:** "Una consideración clave en la implementación de memoria es el equilibrio entre exhaustividad y eficiencia. Almacenar demasiada información puede conducir a desbordamiento de ventana de contexto, aumento de latencia y costos más altos." (§6)
**Tipo de claim:** Normativo de diseño.
**Evidencia presente:** El desbordamiento de ventana de contexto es un límite técnico documentado y observable. El aumento de latencia y costos proporcional al tamaño del contexto también es observable y verificable vía API.
**Calibración:** INFERENCIA CALIBRADA — el trade-off se deriva de limitaciones técnicas reales y medibles (context window limits, token costs, latency).
**Score:** 1.0 / 1.0

---

### C-15: Criterios de gestión inteligente de memoria

**Texto exacto:** "La gestión inteligente de memoria implica seleccionar qué almacenar, por cuánto tiempo almacenarlo y cómo recuperarlo de manera más efectiva." (§6)
**Tipo de claim:** Normativo — enuncia los tres ejes de decisión de la gestión de memoria.
**Evidencia presente:** Los tres ejes (qué, cuánto tiempo, cómo recuperar) son correctamente identificados como dimensiones del problema.
**Análisis:** El claim identifica correctamente los ejes del problema pero no provee criterios operacionales para ninguno de los tres. "Seleccionar qué almacenar" — ¿con qué criterio? No se responde. "Por cuánto tiempo" — ¿con qué política de expiración? No se responde. "Cómo recuperarlo" — el código de referencia (C-04, C-05) promete semántica y entrega cronológico.
**Calibración:** IDENTIFICACIÓN SIN OPERACIONALIZACIÓN — el claim nombra correctamente los tres ejes pero no convierte ninguno en criterio accionable.
**Score:** 0.25 / 1.0

---

### C-16: Casos de uso (servicio al cliente, educación) como aplicaciones genuinas

**Texto exacto:** "Esto es especialmente importante en escenarios de servicio al cliente... De manera similar, en escenarios educativos o de entrenamiento..." (§2)
**Tipo de claim:** Funcional — estos dominios son aplicaciones genuinas del patrón Memory.
**Evidencia presente:** Descripción de necesidades funcionales (recordar historial del cliente, preferencias, progreso del estudiante).
**Análisis:** Ambos casos genuinamente requieren persistencia de información entre sesiones — la necesidad es real y la aplicación del patrón es directa. No hay exageración de capacidad ni misclassificación de patrón (como ocurrió con "Soporte al cliente como Planning" en Cap. 6).
**Calibración:** FUNDAMENTADO FUNCIONALMENTE — los casos de uso encajan con la definición del patrón y las necesidades funcionales son reales.
**Score:** 0.75 / 1.0

---

### C-17: Las 3 funciones primarias como framework completo

**Texto exacto:** "la memoria sirve tres funciones primarias: Conocimiento Contextual, Continuidad, Personalización" (§3)
**Tipo de claim:** Taxonómico — estas son *las* funciones primarias (implica exhaustividad).
**Evidencia presente:** Ninguna fuente citada.
**Análisis:** Las tres funciones están bien descritas y son internamente coherentes. Sin embargo, "funciones primarias" implica completitud — y el claim omite funciones que son igualmente primarias en otros marcos: aprendizaje incremental (el agente mejora con el tiempo), corrección de errores (corregir información previamente almacenada incorrecta), privacidad y control (cuándo olvidar datos de usuario). La lista de tres es útil como introducción pero no está derivada de una taxonomía establecida.
**Calibración:** TAXONOMÍA PARCIALMENTE COMPLETA — las tres funciones son válidas pero la afirmación implícita de completitud no tiene respaldo.
**Score:** 0.5 / 1.0

---

### C-18: El patrón "eleva sistemas a entidades capaces de comprensión genuina"

**Texto exacto:** "la memoria no es meramente una característica técnica sino una capacidad fundamental que eleva los sistemas agenticos de procesadores sin estado a entidades capaces de comprensión genuina y adaptación" (§10)
**Tipo de claim:** Retórico-filosófico — afirma que la memoria produce "comprensión genuina".
**Evidencia presente:** Ninguna.
**Análisis:** "Comprensión genuina" es un claim filosófico que refiere al problema difícil de la conciencia y comprensión semántica (Chinese Room argument, Searle 1980). El patrón Memory (almacenar y recuperar información) no resuelve ni siquiera aborda ese problema. Un sistema que recupera las últimas 3 entradas cronológicamente (código §8 real) no tiene más "comprensión genuina" que uno sin memoria.
**Calibración:** AFIRMACIÓN FILOSÓFICA SIN DERIVACIÓN — categoría diferente al resto de los claims. No es un claim técnico — es retórica de marketing que usa terminología filosófica no derivada.
**Score:** 0.0 / 1.0

---

### C-19: "La memoria no es meramente una característica técnica sino una capacidad fundamental"

**Texto exacto:** (§10) — el claim completo es C-18 arriba; esta es su premisa retórica.
**Tipo de claim:** Retórico — minimiza la naturaleza técnica para elevar el valor percibido.
**Evidencia presente:** Ninguna — es una afirmación de valor.
**Análisis:** "Capacidad fundamental" vs. "característica técnica" es una distinción sin criterio operacional. Todo patrón técnico puede describirse como "fundamental" si es necesario para el sistema. La distinción no agrega valor de diseño.
**Calibración:** RETÓRICA — no tiene valor técnico operacional.
**Score:** 0.0 / 1.0

---

### C-20: "Entidades capaces de comprensión genuina y adaptación"

**Texto exacto:** "entidades capaces de comprensión genuina y adaptación" (§10)
**Tipo de claim:** Filosófico — afirma que el patrón Memory produce comprensión genuina.
**Evidencia presente:** Ninguna.
**Análisis:** Es el claim más fuerte y menos derivado del capítulo. "Comprensión genuina" en filosofía de la mente requiere más que recuperación de información — requiere intencionalidad, grounding semántico, conciencia. Ninguno de estos está producido por el Memory Pattern. El código de referencia (§8) con recuperación cronológica de las últimas 3 entradas no produce nada que se acerque a "comprensión genuina".
**Calibración:** AFIRMACIÓN FILOSÓFICA INFUNDADA — el claim más inflado del capítulo. No hay ningún mecanismo técnico que derive a "comprensión genuina" desde "almacenamiento y recuperación de texto".
**Score:** 0.0 / 1.0

---

### C-21: "La gestión de memoria se vuelve cada vez más crítica" a mayor sofisticación

**Texto exacto:** "a medida que los sistemas se vuelven más sofisticados, la gestión de memoria se vuelve cada vez más crítica" (§10)
**Tipo de claim:** Cualitativo-tendencial.
**Evidencia presente:** Ninguna empírica, pero es derivable lógicamente: a mayor complejidad del sistema y duración de las interacciones, mayor el volumen de información a gestionar y mayor el impacto de decisiones de almacenamiento/recuperación.
**Calibración:** INFERENCIA PLAUSIBLE — el claim es lógicamente derivable aunque no tiene evidencia cuantitativa. Aceptable como observación de diseño.
**Score:** 0.5 / 1.0

---

## 3. Tabla resumen

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| C-01 | Definición funcional de memoria | 0.75 | Definición operacional adoptable |
| C-02 | LLMs carecen de persistencia sin memoria | 1.0 | Inferencia calibrada |
| C-03 | Código §7 implementa Memory Pattern | 0.5 | Falso positivo leve (uso API básico) |
| C-04 | Código §8 implementa memoria semántica con vectores | 0.0 | Contradicción directa código/descripción |
| C-05 | `retrieve_relevant_memory` usa búsqueda semántica | 0.0 | Refutado por el código |
| C-06 | "Efectivamente recordar miles de interacciones" | 0.0 | Afirmación sin mecanismo |
| C-07 | Los 5 tipos como taxonomía de mecanismos | 0.25 | Taxonomía sin fuente formal |
| C-08 | "Memoria Activa" como categoría | 0.25 | Categoría redundante |
| C-09 | "Memoria Episódica" como categoría | 0.75 | Analogía útil |
| C-10 | "Memoria Semántica" como categoría | 0.75 | Analogía bien fundamentada |
| C-11 | Redes Episódicas con olvido mínimo | 0.25 | Verdadero para dominio diferente |
| C-12 | Memoria Basada en Atención | 0.5 | Parcialmente fundamentado |
| C-13 | Memoria Jerárquica | 0.75 | Fundamentado, implementable |
| C-14 | Trade-off exhaustividad vs. eficiencia | 1.0 | Inferencia calibrada |
| C-15 | Criterios de gestión de memoria | 0.25 | Identificación sin operacionalización |
| C-16 | Casos de uso (atención al cliente, educación) | 0.75 | Fundamentado funcionalmente |
| C-17 | 3 funciones primarias | 0.5 | Taxonomía parcialmente completa |
| C-18 | Eleva a "comprensión genuina" | 0.0 | Afirmación filosófica sin derivación |
| C-19 | "Capacidad fundamental, no solo técnica" | 0.0 | Retórica |
| C-20 | "Comprensión genuina y adaptación" | 0.0 | Afirmación filosófica infundada |
| C-21 | Gestión de memoria = cada vez más crítica | 0.5 | Inferencia plausible |

**Suma de scores:** 8.75 / 21
**Ratio de calibración:** **8.75/21 = 42%**

---

## 4. Ratio de calibración y clasificación

```
Ratio = 8.75 / 21 = 42%

Clasificación: REALISMO PERFORMATIVO

Umbral para artefacto de exploración: ≥ 0.50
Umbral para artefacto de gate: ≥ 0.75
Resultado: por debajo del umbral de exploración
```

**Distribución de claims por tipo:**

| Tipo | Cantidad | Suma scores | Ratio interno |
|------|----------|-------------|---------------|
| Calibrados (score ≥ 0.75) | 7 | 6.75 | 32% del total |
| Parcialmente calibrados (0.25-0.74) | 8 | 3.75 | 38% del total |
| Sin evidencia / refutados (< 0.25) | 6 | 0.0 | 29% del total |

**Nota:** Excluyendo los 3 claims filosófico/retóricos (C-18, C-19, C-20), el ratio sube a **8.75/18 = 49%** — todavía por debajo del umbral de exploración (50%).

---

## 5. Patrón dominante: EFsA-Implementación

### Identificación del patrón

El Capítulo 8 exhibe una variante del patrón EFsA (Evidencia Funcional sin Derivación Arquitectónica) identificado en Cap. 6, pero con una característica adicional y más grave:

> **EFsA-Implementación:** el capítulo describe una implementación técnica específica (búsqueda semántica con vectores), provee un código etiquetado como esa implementación, pero el código ejecuta un algoritmo fundamentalmente diferente al descrito. La descripción y el código no son versiones de la misma cosa — son algoritmos distintos.

### Anatomía de la contradicción central (C-04, C-05, C-06)

```
Descripción (§8):                    Código real (§8):
─────────────────────                ────────────────────────────
1. Incrustar como vectores       →   No hay embeddings
2. Almacenar en BD vectorial     →   Lista Python en RAM
3. Recuperar por similitud       →   return memory_database[-top_k:]
   semántica (query-aware)            (ignora el parámetro query)
4. Efecto: "recordar miles"      →   Efecto: devolver últimas N entradas
```

El comentario en el código (`# Recuperación simplificada: devolver últimas k entradas`) **reconoce implícitamente la sustitución** pero usa "simplificada" para enmascarar que el algoritmo es cualitativamente diferente, no una versión simplificada del mismo algoritmo.

### Comparación con patrones anteriores

| Patrón | Descripción | Capítulo | Severidad |
|--------|-------------|----------|-----------|
| EFsA | Evidencia funcional sin derivación arquitectónica | Cap. 6 Planning | Media |
| EFsA-Estructural | Código que no tiene la separación estructural que describe | Cap. 7 Multi-Agent | Alta |
| EFsA-Implementación | Descripción de algoritmo A, código ejecuta algoritmo B diferente | Cap. 8 Memory | Alta |

**Diferencia EFsA-Estructural vs. EFsA-Implementación:**
- EFsA-Estructural (Cap. 7): el código no tiene la *estructura* que la descripción requiere (ej: falta la separación orquestador/subagente), pero el código hace algo coherente con la descripción en términos de comportamiento observable.
- EFsA-Implementación (Cap. 8): el código tiene un *algoritmo* diferente al descrito. La descripción dice "recuperar por similitud"; el código recupera por posición. Son comportamientos observablemente distintos en casos no triviales.

### La "simplificación" que cambia el contrato

El término `# Recuperación simplificada` en el código es el mecanismo de cobertura del patrón. En software, una "versión simplificada" mantiene el mismo contrato semántico con menos capacidad (ej: búsqueda semántica con índice pequeño en lugar de HNSW). Aquí el contrato semántico cambia: de "recuperar lo más relevante" a "recuperar lo más reciente". Son conceptos distintos, no una simplificación del mismo concepto.

---

## 6. Brechas críticas para THYROX

### Brecha 1: El código de "memoria semántica" no es semántico

**Descripción:** El código de referencia del capítulo para implementar memoria semántica con vectores no contiene embeddings, BD vectorial ni búsqueda por similitud. La función `retrieve_relevant_memory` ignora el argumento `query`.
**Impacto en THYROX:** ALTO — si un agente THYROX implementa memory stores basándose en este código, tendrá recuperación cronológica presentada como semántica. En WPs de larga duración, esto significa que memorias relevantes pero antiguas no se recuperarán.
**Evidencia observable para cerrar:** Implementación real requiere: (a) biblioteca de embeddings (ej: `sentence-transformers`, o embeddings via API de Anthropic), (b) índice vectorial (ej: FAISS, ChromaDB, pgvector), (c) búsqueda por similitud coseno.

### Brecha 2: No hay criterios operacionales para las tres decisiones de gestión

**Descripción:** El capítulo identifica correctamente los tres ejes de decisión (qué almacenar, por cuánto tiempo, cómo recuperar) pero no provee criterios para ninguno. "Gestión inteligente" queda como etiqueta sin contenido operacional.
**Impacto en THYROX:** MEDIO — un agente THYROX que implementa memoria necesitará políticas explícitas: ¿qué tipo de información va a qué tipo de store? ¿Cuándo expirar entradas? ¿Qué threshold de similitud para recuperar?
**Evidencia observable para cerrar:** Definir por tipo de WP: para WPs de corta duración (< 1 sesión), Memoria Corto Plazo suficiente (código §7). Para WPs de larga duración (> 5 sesiones), Memoria Episódica con almacenamiento persistente. Para dominios especializados, Memoria Semántica con embeddings reales.

### Brecha 3: Taxonomía de 5 tipos sin criterios de selección

**Descripción:** Los 5 tipos se presentan como categorías alternativas pero el capítulo no provee criterios para elegir cuál usar ni cómo combinarlos. El código de §7 (Corto Plazo) y el de §8 (supuestamente Semántica) son los únicos implementados — los otros tres no tienen implementación de referencia.
**Impacto en THYROX:** MEDIO — para adoptar la taxonomía en el diseño de agentes THYROX, se necesita una tabla de decisión: tipo de memoria → cuándo usar → cómo implementar.
**Evidencia observable para cerrar:** Crear tabla de decisión con: tipo de memoria, implementación concreta en Python/Anthropic API, caso de uso THYROX correspondiente.

### Brecha 4: "Comprensión genuina" como objetivo implícito

**Descripción:** El cierre del capítulo presenta "comprensión genuina y adaptación" como el objetivo alcanzado por agentes con memoria. Esto puede guiar decisiones de diseño incorrectas si se toma como criterio de éxito.
**Impacto en THYROX:** BAJO para implementación técnica, ALTO para definición de exit conditions. Si un WP define "comprensión genuina del contexto" como exit condition, no habrá ningún mecanismo de verificación posible.
**Evidencia observable para cerrar:** Reemplazar "comprensión genuina" con métricas verificables: tasa de recall correcto de información histórica relevante, reducción de repetición de información ya provista por el usuario, coherencia de respuesta con historial de conversación.

---

## 7. Claims adoptables sin validación adicional

Estos claims tienen score ≥ 0.75 y son directamente utilizables en el diseño de agentes THYROX:

| Claim | Score | Por qué es adoptable |
|-------|-------|---------------------|
| C-02: LLMs son stateless sin implementación de memoria | 1.0 | Hecho arquitectónico verificable |
| C-14: Trade-off exhaustividad vs. eficiencia | 1.0 | Derivado de límites técnicos medibles |
| C-01: Definición funcional de memoria (retener, recuperar, aprovechar) | 0.75 | Definición de trabajo operacional |
| C-09: Memoria Episódica como registros de eventos | 0.75 | Analogía cognitiva directa con implementación verificable |
| C-10: Memoria Semántica como conocimiento de dominio | 0.75 | Analogía cognitiva directa, implementable con embeddings |
| C-13: Memoria Jerárquica (buffer corto + resumen largo) | 0.75 | Patrón de ingeniería conocido, implementación concreta existe |
| C-16: Casos de uso servicio al cliente / educación | 0.75 | Necesidades funcionales reales, bien justificadas |

**Qué tipo de memoria es adoptable sin validación adicional:**

1. **Memoria Corto Plazo (código §7):** Adoptable directamente. Es uso estándar de la API multi-turno. La única limitación a gestionar es el límite de ventana de contexto.

2. **Memoria Episódica con almacenamiento en base de datos relacional:** Adoptable. El patrón (guardar interacciones con timestamp, recuperar por filtro temporal o por ID de sesión) no requiere vectores y tiene implementación directa.

3. **Memoria Jerárquica (buffer + resumen):** Adoptable con implementación existente (LangChain ConversationSummaryBufferMemory o equivalente). El mecanismo es concreto y verificable.

**Qué tipo de memoria NO es adoptable sin implementación propia:**

- **Memoria Semántica con búsqueda por similitud:** El código de referencia del capítulo NO implementa esto. Para adoptarla, se necesita implementación desde cero con embeddings reales + índice vectorial.

---

## 8. Usabilidad del capítulo para THYROX

| Propósito THYROX | Usabilidad | Justificación |
|-----------------|------------|---------------|
| Comprensión de por qué la memoria es necesaria | ALTA | C-02 y C-14 son correctos y bien fundamentados |
| Implementación de memoria de conversación básica | ALTA | Código §7 es correcto y directamente usable |
| Implementación de memoria semántica con vectores | NULA | El código §8 no implementa lo que describe |
| Selección de tipo de memoria para diseño de agente | MEDIA | Los tipos son útiles como vocabulario pero faltan criterios de selección |
| Diseño de exit conditions verificables | BAJA | Los criterios de gestión (C-15) no son operacionales; C-18/C-20 son no verificables |
| Vocabulario compartido para diseño | ALTA | La taxonomía de 5 tipos es útil como lenguaje común aunque imprecisa como clasificación formal |

---

## Veredicto de calibración

**Ratio:** 42% (8.75/21) — REALISMO PERFORMATIVO (por debajo de umbral de exploración 50%)

**Patrón dominante:** EFsA-Implementación — variante nueva del EFsA donde la descripción de un algoritmo y el código que lo supuestamente implementa ejecutan algoritmos cualitativamente diferentes. El término "simplificado" en el comentario del código encubre una sustitución de contrato semántico.

**El capítulo es usable para:**
- Motivación del patrón (por qué la memoria es necesaria en agentes)
- Implementación directa de memoria de conversación (código §7)
- Vocabulario de tipos de memoria (episódica, semántica, jerárquica)
- Comprensión del trade-off exhaustividad/eficiencia

**El capítulo NO es usable para:**
- Implementar recuperación semántica (el código es cronológico, no semántico)
- Obtener criterios operacionales de gestión de memoria
- Definir exit conditions (los criterios de éxito son filosóficos, no verificables)
- Afirmar que el patrón Memory produce "comprensión genuina"

**Recomendación para THYROX:** Adoptar el vocabulario y la motivación del capítulo. Reemplazar el código §8 con una implementación real de búsqueda semántica antes de usarlo en producción. Crear una tabla de decisión tipo de memoria → implementación → caso de uso THYROX para operacionalizar la taxonomía de 5 tipos.
