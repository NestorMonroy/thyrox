```yml
created_at: 2026-04-19 00:00:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: Capítulo 7 — "Colaboración Multiagente" (versión ajustada v2.0.0)
ratio_calibracion: "9.75/22 = 44%"
clasificacion: PARCIALMENTE CALIBRADO
patron_dominante: "EFsA-Estructural — Evidencia Funcional sin Derivación Arquitectónica con capa de retórica de cambio de paradigma"
```

# Análisis de Calibración: Capítulo 7 — Colaboración Multiagente (v2.0.0)

> Protocolo aplicado: Modo 1 — Detección de realismo performativo.
> Base de análisis: multiagent-collaboration-pattern-input.md v2.0.0 (texto preservado verbatim).
> Referencia de patrón: planning-pattern-calibration.md v1.2.0 (patrón EFsA identificado en Cap. 6).

---

## 1. Inventario de claims evaluados

| ID   | Claim                                                                                  | Sección | Tipo            |
|------|----------------------------------------------------------------------------------------|---------|-----------------|
| C-01 | Arquitectura monolítica "limitada" frente a tareas complejas y multidominio            | Sec. 1  | Comparativo     |
| C-02 | Descomposición de tareas como principio base del patrón                                | Sec. 1  | Arquitectónico  |
| C-03 | "Protocolo de comunicación estandarizado y ontología compartida" como requisito crítico | Sec. 2  | Técnico         |
| C-04 | "Resultado sinérgico" — desempeño colectivo supera capacidades individuales            | Sec. 3  | Cualitativo     |
| C-05 | Modularidad, escalabilidad y robustez como ventajas declaradas                         | Sec. 3  | Arquitectónico  |
| C-06 | Falla de un único agente no causa falla total del sistema                              | Sec. 3  | Técnico         |
| C-07 | Las 5 formas de colaboración (secuencial, paralela, consenso, herramientas, dominio)   | Sec. 5  | Clasificatorio  |
| C-08 | Forma Secuencial — "(similar al patrón de planificación, pero con diferentes agentes)" | Sec. 5  | Arquitectónico  |
| C-09 | Código CrewAI implementa el patrón Multi-Agent Collaboration                          | Sec. 10 | Técnico         |
| C-10 | Caso Investigación como manifestación genuina del patrón                               | Sec. 8  | Funcional       |
| C-11 | Caso Desarrollo de Software como manifestación genuina del patrón                     | Sec. 8  | Funcional       |
| C-12 | Caso Marketing como manifestación genuina del patrón                                  | Sec. 8  | Funcional       |
| C-13 | Caso Finanzas como manifestación genuina del patrón                                   | Sec. 8  | Funcional       |
| C-14 | Caso Cadena de Suministro como manifestación genuina del patrón                       | Sec. 8  | Funcional       |
| C-15 | Caso Operaciones Autónomas como manifestación genuina del patrón                      | Sec. 8  | Funcional       |
| C-16 | Integración de ML tradicional como ventaja del patrón en Operaciones Autónomas        | Sec. 8  | Arquitectónico  |
| C-17 | Modelo Supervisor introduce "punto único de falla"                                    | Sec. 9  | Técnico         |
| C-18 | Modelo Supervisor "cuello de botella" bajo carga alta                                 | Sec. 9  | Técnico         |
| C-19 | Modelo Jerárquico "bien adecuado" para problemas complejos descomponibles             | Sec. 9  | Cualitativo     |
| C-20 | CrewAI y Google ADK "están diseñados para facilitar" el patrón de Colaboración        | Sec. 7  | Técnico         |
| C-21 | "Cambio de paradigma" en diseño de sistemas inteligentes (conclusión)                 | Sec. 11 | Retórico        |
| C-22 | "Capacidad de gestionar sistemas multiagentes será crucial" para el futuro            | Sec. 11 | Predictivo      |

---

## 2. Evaluación por claim

### C-01: Arquitectura monolítica "limitada" frente a tareas complejas y multidominio

**Texto exacto:** "sus capacidades a menudo se ven limitadas cuando se enfrenta a tareas complejas y multidominio" (Sec. 1)
**Evidencia presente:** Ninguna empírica — es una afirmación comparativa sin benchmark ni caso documentado donde un agente único falló y el sistema multiagente no falló.
**Derivación:** Cualitativa. La palabra "a menudo" reconoce que no es universal, pero tampoco define bajo qué condiciones concretas ocurre la limitación.
**Umbral para ser válido:** Requeriría al menos un caso donde: (a) un agente monolítico fue probado en una tarea multidominio específica, (b) el resultado fue insatisfactorio, (c) un sistema multiagente en la misma tarea lo superó.
**Calibración:** AFIRMACIÓN PERFORMATIVA — plausible como heurístico de diseño pero no derivada de evidencia comparable. La limitación puede ser real pero no está demostrada, solo asumida.
**Score:** 0.35 / 1.0

---

### C-02: Descomposición de tareas como principio base del patrón

**Texto exacto:** "se basa en el principio de descomposición de tareas, donde un objetivo de alto nivel se desglosa en subproblemas discretos" (Sec. 1)
**Evidencia presente:** El principio está soportado por el ejemplo de la consulta de investigación (Sec. 2) y estructuralmente por el código CrewAI con agentes y tareas separadas (Sec. 10).
**Derivación:** PARCIAL — la descomposición de tareas como principio está bien establecida en literatura de sistemas distribuidos e IA clásica (divide-and-conquer). El capítulo no cita fuentes pero el principio no requiere derivación novedosa.
**Calibración:** INFERENCIA CALIBRADA — el principio es trasladable desde CS general a sistemas multiagentes sin requerir nueva derivación.
**Score:** 0.80 / 1.0

---

### C-03: "Protocolo de comunicación estandarizado y ontología compartida" como requisito crítico

**Texto exacto:** "Esto requiere un protocolo de comunicación estandarizado y una ontología compartida, permitiendo que los agentes intercambien datos, deleguen subtareas y coordinen sus acciones" (Sec. 2)
**Evidencia presente:** El código CrewAI (Sec. 10) usa una API con objetos `Agent`, `Task` y `Crew` — esto constituye un protocolo estructurado, pero no una "ontología compartida" en el sentido formal del término.
**Derivación:** El término "ontología compartida" es técnicamente preciso (en IA formal, una ontología define vocabulario y relaciones entre conceptos de un dominio). Sin embargo, el capítulo lo menciona sin definirlo ni demostrar que el código de referencia lo implementa.
**Brecha específica:** CrewAI no implementa una ontología compartida — implementa paso de mensajes entre agentes como strings. La diferencia es arquitectónicamente relevante: una ontología garantizaría consistencia semántica; el paso de strings no lo garantiza.
**Calibración:** AFIRMACIÓN PERFORMATIVA DE ALTO IMPACTO — el requisito es enunciado como verdad crítica sin que la implementación de referencia lo satisfaga.
**Score:** 0.20 / 1.0

---

### C-04: "Resultado sinérgico" — desempeño colectivo supera capacidades individuales

**Texto exacto:** "La colaboración permite un resultado sinérgico donde el desempeño colectivo del sistema multiagente supera las capacidades potenciales de cualquier agente individual dentro del conjunto" (Sec. 3)
**Evidencia presente:** Ninguna cuantitativa. El capítulo no provee ningún experimento, benchmark ni caso documentado donde el sistema multiagente haya sido comparado contra un agente único con igual capacidad total de cómputo/contexto.
**Derivación:** La sinergia como concepto tiene precedentes en literatura de sistemas distribuidos, pero la afirmación aquí es más fuerte: "supera las capacidades potenciales" — es decir, supera no solo la ejecución individual sino el límite teórico de lo que ese agente podría hacer. Esta afirmación extraordinaria no tiene evidencia extraordinaria.
**Problema adicional:** "Capacidades potenciales" es vago — ¿qué impide que un agente único con más contexto o más tokens logre el mismo resultado? La sinergia puede ser una consecuencia de la paralelización del tiempo de ejecución, no del desempeño cualitativo.
**Calibración:** AFIRMACIÓN PERFORMATIVA — el claim más débil del capítulo desde el punto de vista epistémico. La sinergia puede ser real pero el capítulo la afirma sin derivarla.
**Score:** 0.10 / 1.0

---

### C-05: Modularidad, escalabilidad y robustez como ventajas declaradas

**Texto exacto:** "Esta arquitectura distribuida ofrece varias ventajas, incluyendo modularidad mejorada, escalabilidad y robustez" (Sec. 3)
**Evidencia presente:** Parcial. La modularidad está soportada por la estructura del código (agentes separados con roles distintos). La escalabilidad no está demostrada — se afirma pero no se mide. La robustez está parcialmente soportada por C-06.
**Derivación:** Modularidad como propiedad de arquitecturas distribuidas está bien establecida en ingeniería de software. Los otros dos claims son heredados de esa tradición pero sin verificación en el contexto específico de sistemas LLM multiagentes, donde la latencia de comunicación entre agentes y la coherencia semántica añaden vectores de falla no presentes en sistemas distribuidos convencionales.
**Calibración:** INFERENCIA PARCIALMENTE CALIBRADA — modularidad sí derivable; escalabilidad y robustez son heredadas de otro dominio sin verificación en LLM multiagentes.
**Score:** 0.50 / 1.0

---

### C-06: Falla de un único agente no causa falla total del sistema

**Texto exacto:** "ya que la falla de un único agente no necesariamente causa una falla total del sistema" (Sec. 3)
**Evidencia presente:** La palabra "necesariamente" es la clave — el capítulo no afirma que nunca cause falla total, sino que no necesariamente la causa. Esto es correcto en arquitecturas con redundancia o con manejo de excepciones.
**Derivación:** En el modelo Secuencial (pipeline), la falla de un agente intermedio sí puede causar falla total si no hay recuperación implementada. En el modelo Red (descentralizado), la afirmación es más sólida. El capítulo no distingue entre modelos al hacer este claim.
**Calibración:** INFERENCIA CALIBRADA CON EXCEPCIÓN — la palabra "necesariamente" la hace técnicamente correcta, pero la falta de distinción entre modelos de interrelación la debilita como guía de diseño.
**Score:** 0.65 / 1.0

---

### C-07: Las 5 formas de colaboración como taxonomía completa

**Texto exacto:** "La colaboración puede tomar varias formas: 1. Secuencial 2. Paralela 3. Consenso 4. Basada en Herramientas 5. Especialización por Dominio" (Sec. 5)
**Evidencia presente:** La taxonomía es internamente coherente. Sin embargo, no se deriva de ninguna fuente ni se argumenta por qué son exactamente 5 formas y no más.
**Derivación:** "Basada en Herramientas" y "Especialización por Dominio" son descripciones de cómo se asignan capacidades a agentes, no de cómo colaboran — son dimensiones ortogonales a las formas de colaboración temporal (Secuencial, Paralela) o epistémica (Consenso). La taxonomía mezcla dimensiones sin justificarlo.
**Problema de completitud:** ¿Qué ocurre con colaboración competitiva (multi-agent debate), colaboración asíncrona basada en eventos, o colaboración emergente sin coordinador? La taxonomía puede ser incompleta pero no lo reconoce.
**Calibración:** ESPECULACIÓN ÚTIL presentada como taxonomía completa — útil como punto de partida, no como clasificación exhaustiva.
**Score:** 0.45 / 1.0

---

### C-08: Forma Secuencial — "(similar al patrón de planificación, pero involucrando explícitamente diferentes agentes)"

**Texto exacto:** "Un agente completa una tarea y pasa su salida a otro agente para el siguiente paso en un canal (similar al patrón de planificación, pero involucrando explícitamente diferentes agentes)" (Sec. 5, adición v2.0.0)
**Evidencia presente:** La distinción propuesta es razonable — el patrón Planning puede ejecutarse con un agente único, mientras que la Colaboración Secuencial implica múltiples agentes como actores distintos.
**Derivación:** PARCIAL — la distinción es arquitectónicamente válida pero no derivada del código. El código CrewAI de Sec. 10 usa `Process.sequential` con tres agentes distintos, lo que efectivamente ilustra la diferencia con Planning de agente único. Sin embargo, el capítulo no hace explícita esta conexión código → claim.
**Calibración:** INFERENCIA PARCIALMENTE CALIBRADA — la distinción es correcta, la evidencia del código la soporta parcialmente, pero la conexión no está explicitada.
**Score:** 0.60 / 1.0

---

### C-09: Código CrewAI implementa el patrón Multi-Agent Collaboration

**Texto exacto:** Código completo en Sec. 10 con `researcher_agent`, `writer_agent`, `editor_agent` y `Process.sequential`.
**Evidencia presente:** El código tiene tres agentes con roles distintos, tareas separadas y un proceso de coordinación (`Crew`). Esto es evidencia funcional de colaboración multiagente.
**Análisis de correspondencia con definición:**
- Roles definidos: SÍ (`role=`, `goal=`, `backstory=`)
- Canales de comunicación: PARCIAL — `Task.expected_output` actúa como interfaz entre agentes, pero el mecanismo de paso de datos entre tareas no está explícito en el código
- Protocolo estandarizado: NO — el código usa objetos Python, no un protocolo de comunicación estandarizado ni una ontología compartida como demanda C-03
- Flujo de tareas: SÍ — `Process.sequential` define el orden

**Diferencia con C-03 (Cap. 6):** A diferencia del caso Planning (donde el mismo agente genera y ejecuta), aquí los tres agentes son arquitectónicamente distintos. El código sí ilustra el patrón de Colaboración Multiagente en su forma más básica.
**Problema detectado:** Hay un error de sintaxis en el código (Sec. 10, línea del `editor_agent`): falta la coma después de `tools=[review_tool, grammar_check_tool]` antes de `allow_delegation=False`. Esto hace que el código no ejecute sin corrección.
**Calibración:** EVIDENCIA FUNCIONAL PARCIAL — el código ilustra los elementos del patrón (múltiples agentes, roles distintos, coordinación), pero no implementa "protocolo estandarizado" ni "ontología compartida" como afirma C-03. Es una implementación del patrón en sentido amplio, no en el sentido técnico estricto del capítulo.
**Score:** 0.60 / 1.0

---

### C-10: Caso Investigación como manifestación genuina del patrón

**Texto exacto:** "Un agente podría especializarse en búsqueda en bases de datos académicas, otro en resumir hallazgos, un tercero en identificar tendencias, y un cuarto en sintetizar la información en un informe." (Sec. 8)
**Evidencia presente:** Descripción funcional detallada con roles específicos (búsqueda, resumen, identificación de tendencias, síntesis). La especialización de roles es coherente con el dominio.
**Derivación:** El caso genuinamente requiere especialización de dominio y coordinación — tareas que un agente único con contexto limitado podría no manejar bien. La analogía con equipos humanos de investigación es válida.
**Calibración:** INFERENCIA CALIBRADA — el caso de uso es coherente con la definición del patrón y la especialización es plausiblemente beneficiosa.
**Score:** 0.75 / 1.0

---

### C-11: Caso Desarrollo de Software como manifestación genuina del patrón

**Texto exacto:** "Un agente podría ser un analista de requisitos, otro un generador de código, un tercero un probador, y un cuarto un escritor de documentación." (Sec. 8)
**Evidencia presente:** El flujo analista → generador → probador → documentador es el pipeline SDLC estándar. Los roles son bien conocidos.
**Derivación:** El claim es funcionalmente sólido. El pipeline de desarrollo es un caso real de colaboración secuencial con especialización. Sin embargo, la colaboración real en desarrollo de software frecuentemente implica iteraciones no lineales (probador retroalimenta al generador) — el capítulo presenta solo el flujo lineal.
**Calibración:** FUNDAMENTADO FUNCIONALMENTE — el caso es válido aunque solo captura el flujo lineal, no los bucles de retroalimentación reales.
**Score:** 0.70 / 1.0

---

### C-12: Caso Marketing como manifestación genuina del patrón

**Texto exacto:** "un agente de investigación de mercado, un agente de copywriter, un agente de diseño gráfico (utilizando herramientas de generación de imágenes), y un agente de programación en redes sociales, todos trabajando juntos." (Sec. 8)
**Evidencia presente:** Descripción funcional coherente con el dominio de marketing.
**Derivación:** El caso tiene especialización genuina — la generación de imágenes (agente de diseño gráfico) es una capacidad de herramienta distinta del copywriting. La separación es plausiblemente beneficiosa.
**Calibración:** FUNDAMENTADO FUNCIONALMENTE — el caso encaja, aunque la coordinación entre copywriting e imagen requeriría mecanismos de retroalimentación que el capítulo no describe.
**Score:** 0.70 / 1.0

---

### C-13: Caso Finanzas como manifestación genuina del patrón

**Texto exacto:** "obtener datos de acciones, analizar sentimiento de noticias, realizar análisis técnico y generar recomendaciones de inversión." (Sec. 8)
**Evidencia presente:** Descripción funcional. Los cuatro roles corresponden a capacidades distintas que en la práctica financiera son llevadas a cabo por equipos especializados.
**Derivación:** El caso es plausible pero el claim implícito de que el sistema multiagente "analiza mercados financieros" sugiere utilidad productiva, que en finanzas requiere validación regulatoria y backtesting — no abordados.
**Calibración:** FUNDAMENTADO FUNCIONALMENTE con advertencia — el caso de uso es coherente con el patrón pero el contexto de aplicación real (mercados financieros) requiere garantías que el capítulo no menciona.
**Score:** 0.65 / 1.0

---

### C-14: Caso Cadena de Suministro como manifestación genuina del patrón

**Texto exacto:** "agentes podrían representar diferentes nodos en una cadena de suministro (proveedores, fabricantes, distribuidores) y colaborar para optimizar niveles de inventario, logística y programación en respuesta a cambios de demanda o disrupciones." (Sec. 8)
**Evidencia presente:** El modelado de cadenas de suministro con agentes que representan nodos es un área activa de investigación en multi-agent systems (MAS) con literatura establecida desde los años 90. El caso no inventa un uso — existe ya en forma de sistemas como Supply Chain Management (SCM) agents.
**Derivación:** SÓLIDA — este es el caso más cercano a un uso real documentado en literatura académica de MAS. La especialización por nodo es exactamente lo que los sistemas MAS de SC implementan.
**Calibración:** INFERENCIA CALIBRADA — el claim conecta el patrón con un dominio de aplicación real y establecido.
**Score:** 0.85 / 1.0

---

### C-15: Caso Operaciones Autónomas como manifestación genuina del patrón

**Texto exacto:** "Múltiples agentes pueden colaborar para clasificar y remediar problemas, sugiriendo acciones óptimas." (Sec. 8)
**Evidencia presente:** El diagnóstico y remediación distribuida es un caso de uso legítimo para sistemas multiagentes en operaciones (e.g. AIOps, SRE automatizado).
**Derivación:** El caso es funcionalmente coherente con el patrón. Los roles (clasificar, remediar) implican especialización y coordinación.
**Calibración:** INFERENCIA CALIBRADA — el caso encaja con definición y con práctica establecida en operaciones de TI.
**Score:** 0.75 / 1.0

---

### C-16: Integración de ML tradicional como ventaja del patrón en Operaciones Autónomas

**Texto exacto:** "Estos agentes también pueden integrarse con modelos de aprendizaje automático tradicionales y herramientas, aprovechando sistemas existentes mientras ofrecen simultáneamente las ventajas de la IA Generativa." (Sec. 8, adición v2.0.0)
**Evidencia presente:** La integración de LLM-agents con modelos ML es técnicamente posible y está siendo implementada (e.g. LangChain con sklearn pipelines, LlamaIndex con embeddings). El claim es descriptivo de una capacidad real.
**Derivación:** El claim no dice que el patrón de Colaboración Multiagente específicamente habilita esta integración — la integración de LLM con ML es una capacidad de cualquier sistema agentico, no exclusiva del patrón Multi-Agent Collaboration.
**Brecha:** Se presenta como ventaja del patrón cuando es en realidad una ventaja del enfoque agentico en general. No hay derivación de por qué la integración ML se beneficia específicamente de múltiples agentes vs. un agente único.
**Calibración:** INFERENCIA PARCIALMENTE CALIBRADA — la integración es real y técnicamente fundamentada, pero su atribución como ventaja específica del patrón Multiagente no está derivada.
**Score:** 0.45 / 1.0

---

### C-17: Modelo Supervisor introduce "punto único de falla"

**Texto exacto:** "introduce un punto único de falla (el supervisor) y puede convertirse en un cuello de botella si el supervisor es abrumado por un gran número de subordinados o tareas complejas." (Sec. 9)
**Evidencia presente:** El patrón punto único de falla en arquitecturas centralizadas está bien documentado en ingeniería de sistemas distribuidos (SPOF — Single Point of Failure). El capítulo lo identifica correctamente.
**Mitigación:** El capítulo nombra el problema pero no propone mitigación — no menciona supervisores redundantes, supervisores jerárquicos (que están en el Modelo Jerárquico) ni mecanismos de failover. La ausencia de mitigación es una brecha de utilidad para el lector, no un error epistémico.
**Calibración:** OBSERVACIÓN DIRECTA derivable de principios de sistemas distribuidos — correctamente identificada.
**Score:** 0.85 / 1.0

---

### C-18: Modelo Supervisor "cuello de botella" bajo carga alta

**Texto exacto:** "puede convertirse en un cuello de botella si el supervisor es abrumado" (Sec. 9)
**Evidencia presente:** El cuello de botella en sistemas centralizados bajo carga es un principio de rendimiento establecido (Amdahl's Law en parallelismo; bottleneck theory en queueing). El claim es correcto.
**Calibración:** INFERENCIA CALIBRADA — derivable de teoría de sistemas concurrentes.
**Score:** 0.80 / 1.0

---

### C-19: Modelo Jerárquico "bien adecuado" para problemas complejos descomponibles

**Texto exacto:** "El modelo 'Jerárquico' expande el concepto de supervisor para crear una estructura organizativa multicapa... Esta estructura es bien adecuada para problemas complejos que pueden descomponerse en subproblemas." (Sec. 9)
**Evidencia presente:** La estructura jerárquica para problemas decomponibles es un principio establecido en teoría de organización (Simon 1962, "The Architecture of Complexity") y en sistemas computacionales (divide-and-conquer).
**Derivación:** Sólida a nivel de principio. Sin embargo, el capítulo no deriva en qué punto la complejidad justifica agregar un nivel jerárquico versus mantener un Supervisor plano — la regla de selección entre Supervisor y Jerárquico no está definida operacionalmente.
**Calibración:** INFERENCIA CALIBRADA — el claim conecta con literatura establecida, aunque la regla de selección entre modelos es vaga.
**Score:** 0.75 / 1.0

---

### C-20: CrewAI y Google ADK "están diseñados para facilitar" el patrón de Colaboración

**Texto exacto:** "Marcos de trabajo como CrewAI y Google ADK están diseñados para facilitar este paradigma proporcionando estructuras para la especificación de agentes, tareas y sus procedimientos interactivos." (Sec. 7)
**Evidencia presente:** CrewAI está evidenciado en el código de Sec. 10. Google ADK es mencionado pero no hay código ni demostración de ADK en el capítulo.
**Derivación:** Para CrewAI: SÓLIDA — el código lo demuestra. Para Google ADK: AFIRMACIÓN SIN EVIDENCIA — el capítulo no provee ningún ejemplo, fragmento de código ni referencia de documentación de Google ADK que demuestre que "facilita" el patrón.
**Calibración:** MIXTA — CrewAI: 0.9 | Google ADK: 0.1. Score promedio: 0.50, pero la asimetría es relevante para THYROX (Google ADK aparece sin sustento).
**Score:** 0.50 / 1.0

---

### C-21: "Cambio de paradigma" en diseño de sistemas inteligentes (conclusión)

**Texto exacto:** "el patrón de Colaboración Multiagente representa un cambio de paradigma en cómo diseñamos y desarrollamos sistemas inteligentes" (Sec. 11, adición v2.0.0)
**Evidencia presente:** Ninguna. "Cambio de paradigma" es un término de Kuhn que implica que un modelo anterior fue abandonado por demostrar ser inadecuado bajo anomalías acumuladas.
**Derivación:** El capítulo no cita: (a) el paradigma anterior que está siendo reemplazado, (b) las anomalías que forzaron el cambio, (c) la comunidad que adoptó el nuevo paradigma. La "colaboración multiagente" como concepto existe en literatura MAS desde los años 90 — no es un cambio de paradigma reciente.
**Calibración:** RETÓRICA — idéntica en función a C-11 de Planning ("puente esencial"). Carece de valor técnico operacional.
**Score:** 0.0 / 1.0

---

### C-22: "Capacidad de gestionar sistemas multiagentes será crucial" para el futuro

**Texto exacto:** "la capacidad de diseñar y gestionar sistemas multiagentes será cada vez más crucial para resolver desafíos del mundo real en diversos dominios" (Sec. 11)
**Evidencia presente:** Ninguna empírica — es una predicción de tendencia sin citar adopción actual, tasas de crecimiento, ni estudios de demanda de mercado.
**Derivación:** La predicción puede ser correcta pero no está derivada de datos. Es un argumento de autoridad implícito del capítulo sobre el futuro del campo.
**Calibración:** ESPECULACIÓN NO MARCADA — presentada como hecho futuro inevitable, no como predicción basada en datos.
**Score:** 0.15 / 1.0

---

## 3. Tabla resumen

| ID   | Claim (abreviado)                                              | Score | Estado                              |
|------|----------------------------------------------------------------|-------|-------------------------------------|
| C-01 | Arquitectura monolítica "limitada"                             | 0.35  | Afirmación performativa             |
| C-02 | Descomposición de tareas como principio base                   | 0.80  | Inferencia calibrada                |
| C-03 | Protocolo estandarizado y ontología compartida como requisito  | 0.20  | Afirmación performativa — alto impacto |
| C-04 | "Resultado sinérgico" — colectivo supera individuales          | 0.10  | Afirmación performativa — sin evidencia |
| C-05 | Modularidad, escalabilidad y robustez como ventajas            | 0.50  | Inferencia parcialmente calibrada   |
| C-06 | Falla de un agente no causa falla total                        | 0.65  | Inferencia calibrada con excepción  |
| C-07 | Taxonomía de 5 formas de colaboración                          | 0.45  | Especulación útil                   |
| C-08 | Secuencial distinto a Planning por múltiples agentes           | 0.60  | Inferencia parcialmente calibrada   |
| C-09 | Código CrewAI implementa el patrón                             | 0.60  | Evidencia funcional parcial         |
| C-10 | Caso Investigación como manifestación genuina                  | 0.75  | Inferencia calibrada                |
| C-11 | Caso Desarrollo de Software                                    | 0.70  | Fundamentado funcionalmente         |
| C-12 | Caso Marketing                                                 | 0.70  | Fundamentado funcionalmente         |
| C-13 | Caso Finanzas                                                  | 0.65  | Fundamentado funcionalmente         |
| C-14 | Caso Cadena de Suministro                                      | 0.85  | Inferencia calibrada                |
| C-15 | Caso Operaciones Autónomas                                     | 0.75  | Inferencia calibrada                |
| C-16 | Integración ML como ventaja del patrón                         | 0.45  | Inferencia parcialmente calibrada   |
| C-17 | Modelo Supervisor — punto único de falla                       | 0.85  | Observación directa                 |
| C-18 | Modelo Supervisor — cuello de botella                          | 0.80  | Inferencia calibrada                |
| C-19 | Modelo Jerárquico "bien adecuado" para problemas complejos     | 0.75  | Inferencia calibrada                |
| C-20 | CrewAI y Google ADK como frameworks del patrón                 | 0.50  | Mixto (CrewAI sólido, ADK sin evidencia) |
| C-21 | "Cambio de paradigma" (conclusión)                             | 0.00  | Retórica                            |
| C-22 | "Será crucial" para el futuro                                  | 0.15  | Especulación no marcada             |

**Suma de scores:** 9.75 / 22
**Ratio de calibración:** **9.75/22 = 44%**

> **Nota:** Excluyendo los dos claims retóricos/predictivos terminales (C-21, C-22), el ratio sube a **9.75/20 = 49%**.
> El umbral para artefactos de exploración (no gate) es ≥ 0.50. El capítulo está en el límite inferior.

---

## 4. Afirmaciones performativas de alto impacto

Las siguientes son las afirmaciones sin evidencia cuya aceptación sin validación causaría decisiones arquitectónicas incorrectas en THYROX:

| # | Texto exacto                                                                               | Sección | Impacto | Evidencia propuesta                                                                                                                |
|---|--------------------------------------------------------------------------------------------|---------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| 1 | "resultado sinérgico donde el desempeño colectivo supera las capacidades potenciales de cualquier agente individual" | Sec. 3  | Alto    | Experimento: mismo objetivo ejecutado por (a) agente único con contexto amplio, (b) sistema multiagente. Medir calidad y latencia comparativamente. |
| 2 | "protocolo de comunicación estandarizado y una ontología compartida"                       | Sec. 2  | Alto    | Revisar si CrewAI, LangGraph o Google ADK implementan formalmente una ontología compartida o solo paso de mensajes. Citar documentación oficial de la API. |
| 3 | "cambio de paradigma"                                                                      | Sec. 11 | Bajo    | Citar literatura MAS de los 90 (Wooldridge & Jennings 1995) vs. LLM-based MAS para derivar si hay discontinuidad genuina o evolución incremental. |
| 4 | "capacidad ... será cada vez más crucial"                                                  | Sec. 11 | Bajo    | Citar tendencias de adopción (e.g. State of AI Report, GitHub Copilot para agentes, surveys de Stack Overflow) o eliminar como no falsifiable. |
| 5 | Google ADK "diseñado para facilitar este paradigma"                                        | Sec. 7  | Medio   | Añadir fragmento de código Google ADK con equivalente al ejemplo CrewAI, o eliminar la mención y citar solo documentación oficial de Google ADK. |

---

## 5. Patrón dominante identificado

### EFsA aplica — con variante estructural

El patrón **Evidencia Funcional sin Derivación Arquitectónica (EFsA)** identificado en Cap. 6 está presente en Cap. 7, pero con una variante importante:

**En Cap. 6 (Planning):** La brecha era entre la definición del patrón y la implementación de referencia — el código no implementaba lo que la definición prometía.

**En Cap. 7 (Colaboración Multiagente):** La brecha es diferente. El código sí ilustra el patrón en sentido amplio (múltiples agentes, roles distintos, coordinación). La brecha principal es entre:

1. **Los requisitos técnicos declarados** (protocolo estandarizado, ontología compartida — C-03) y la implementación de referencia (paso de strings entre agentes en CrewAI).
2. **Los claims cualitativos de primer nivel** (sinergia, C-04) que no tienen ningún respaldo empírico.

> **Nombre propuesto para la variante:** **EFsA-Estructural** — el capítulo provee evidencia funcional que sí ilustra el patrón, pero los requisitos arquitectónicos que declara como críticos no están implementados en el código de referencia. El gap no es "el código no implementa el patrón" sino "el código no implementa los requisitos que el propio capítulo declara necesarios para que el patrón funcione".

**Comparación con patrones previos:**

| Patrón | Cap. | Descripción del gap | Gravedad |
|--------|------|---------------------|----------|
| HsR | Basin-hallucination | Admite gaps sin resolverlos | Media |
| EFsA | Cap. 6 Planning | Código no implementa el patrón según su definición | Alta |
| EFsA-Estructural | Cap. 7 Multiagente | Código implementa el patrón pero no los requisitos críticos que el capítulo declara | Media-Alta |

---

## 6. Verificación explícita de los claims solicitados

### Claim A: "Desempeño colectivo supera capacidades potenciales de cualquier agente individual"

**Evaluación:** Ver C-04. Score: 0.10 / 1.0.
**Veredicto:** Afirmación performativa sin evidencia. La "sinergia" puede manifestarse en tareas con especialización genuina (por ejemplo, C-14 Cadena de Suministro donde los nodos son del dominio), pero el capítulo la afirma como propiedad universal del patrón sin derivación.
**Mitigación propuesta para THYROX:** Reemplazar "supera las capacidades potenciales" por "puede superar a un agente único cuando las subtareas requieren herramientas o dominios incompatibles dentro de una misma sesión de contexto." Esto es derivable del mecanismo de la especialización.

---

### Claim B: "Protocolo de comunicación estandarizado y ontología compartida" como requisito crítico

**Evaluación:** Ver C-03. Score: 0.20 / 1.0.
**Veredicto:** Afirmación performativa de alto impacto. El capítulo eleva el requisito a "crítico" pero la implementación de referencia (CrewAI) no lo satisface. En CrewAI, la "ontología compartida" es implícita en el `backstory` y `goal` de cada agente — texto en lenguaje natural, no una ontología formal.
**Implicación para diseño:** Si un arquitecto implementa un sistema multiagente basado en este capítulo y toma en serio el requisito de "ontología compartida," invertirá en infraestructura (ej. knowledge graph, SPARQL endpoint) que el patrón real no requiere. El requisito está sobrespecificado para la implementación que el capítulo presenta.

---

### Claim C: Código CrewAI como implementación del patrón Multi-Agent Collaboration

**Evaluación:** Ver C-09. Score: 0.60 / 1.0.
**Veredicto:** A diferencia del caso Planning (score 0.0), el código de Cap. 7 sí implementa el patrón en sentido amplio — hay tres agentes distintos, con roles distintos, coordinados por un proceso. La brecha está en que no implementa los requisitos críticos que el propio capítulo enuncia (C-03). También hay un error de sintaxis (coma faltante antes de `allow_delegation` en `editor_agent`) que impide ejecución directa.
**Diferencia clave vs. Cap. 6:** En Cap. 6, el código tenía un agente único presentado como Planning (patrón que requiere separación planner/executor). Aquí el código tiene arquitectura genuinamente multiagente — la discrepancia es de nivel de requisito, no de concepto fundamental.

---

### Claim D: Los 6 casos de uso como manifestaciones genuinas del patrón

**Evaluación:** Ver C-10 a C-15. Scores: 0.75, 0.70, 0.70, 0.65, 0.85, 0.75.
**Veredicto:** Los 6 casos son genuinamente coherentes con el patrón. El más sólido es Cadena de Suministro (0.85) — tiene respaldo en literatura MAS establecida. El más débil es Finanzas (0.65) — requiere validaciones regulatorias y backtesting no mencionados.
**Patrón cruzado:** A diferencia de Cap. 6 donde Soporte al Cliente era una misclassificación (score 0.0), ninguno de los 6 casos de Cap. 7 es una misclassificación. Los 6 son aplicaciones plausibles del patrón.

---

### Claim E: Modelo Supervisor como "punto único de falla" — ¿el capítulo propone mitigación?

**Evaluación:** Ver C-17. Score: 0.85 / 1.0.
**Veredicto:** El capítulo identifica correctamente el problema (SPOF y cuello de botella). NO propone mitigación explícita. La única mitigación implícita es la existencia del modelo "Supervisor como Herramienta" (menos control, más soporte) y el modelo "Jerárquico" (distribuye la carga de supervisión). Sin embargo, el capítulo no presenta estas variantes explícitamente como mitigaciones del SPOF — son presentadas como modelos alternativos, no como soluciones al problema identificado.
**Brecha de utilidad:** El lector que identifica que su arquitectura tiene un SPOF no tiene, después de leer este capítulo, una guía de cuándo y cómo mitigarlo. Esto no es un error epistémico — el claim es correcto — pero es una omisión de utilidad para el diseñador.

---

### Claim F: "Cambio de paradigma" en la conclusión

**Evaluación:** Ver C-21. Score: 0.0 / 1.0.
**Veredicto:** Retórica idéntica en función y en vacuidad epistémica a C-11 de Planning ("puente esencial"). Los sistemas multiagentes existen desde los años 90 (FIPA, BDI agents, Wooldridge & Jennings). El "cambio de paradigma" en este contexto probablemente se refiere a LLM-powered MAS vs. MAS clásicos, pero el capítulo no hace esa distinción.

---

### Claim G: Integración de ML tradicional en Operaciones Autónomas como ventaja del patrón

**Evaluación:** Ver C-16. Score: 0.45 / 1.0.
**Veredicto:** La integración técnica es real y factible. La atribución como ventaja específica del patrón Multiagente (vs. ventaja del enfoque agentico en general) no está derivada. En particular, un agente único también puede integrarse con modelos ML — no hay derivación de por qué múltiples agentes beneficia específicamente esta integración. El claim es verdadero a medias y atribuido al patrón equivocadamente.

---

## 7. Ratio de calibración

```
Suma de scores: 9.75
Total claims: 22
Ratio de calibración: 9.75/22 = 44%

Excluyendo retórica/predictivo (C-21, C-22):
9.75/20 = 49%
```

**Umbral objetivo para artefactos de exploración:** ≥ 0.50
**Clasificación:** PARCIALMENTE CALIBRADO (en el límite inferior del umbral de exploración)

**Distribución por tipo:**
- Afirmaciones performativas (score < 0.35): C-01, C-03, C-04, C-21, C-22 — **5 claims (23%)**
- Evidencia parcial o incierta (score 0.35–0.65): C-05, C-06, C-07, C-08, C-09, C-13, C-16, C-20 — **8 claims (36%)**
- Evidencia sólida (score ≥ 0.65): C-02, C-10, C-11, C-12, C-14, C-15, C-17, C-18, C-19 — **9 claims (41%)**

---

## 8. Comparación con Cap. 6 (Planning)

| Dimensión                        | Cap. 6 Planning         | Cap. 7 Multiagente          |
|----------------------------------|-------------------------|-----------------------------|
| Ratio de calibración             | 44% (8.75/20)           | 44% (9.75/22)               |
| Patrón dominante                 | EFsA                    | EFsA-Estructural            |
| Código implementa el patrón      | NO (falso positivo)     | SÍ (parcialmente)           |
| Claims sin evidencia (score<0.35)| 6/20 (30%)              | 5/22 (23%)                  |
| Casos de uso: misclassificaciones| 1 (soporte al cliente)  | 0                           |
| Claim más débil                  | C-09 (budget_tokens)    | C-04 (sinergia)             |
| Claim más sólido                 | C-13 (robótica)         | C-14 (cadena de suministro) |
| Conclusión retórica              | Sí (C-11)               | Sí (C-21)                   |
| Error técnico en código          | No                      | Sí (coma faltante)          |

**Insight clave de la comparación:** El capítulo de Multiagente tiene ratio idéntico al de Planning (44%), pero la naturaleza de las brechas es diferente. En Planning, el código era un falso positivo — no implementaba el patrón. En Multiagente, el código sí ilustra el patrón pero los requisitos críticos declarados (C-03) no están implementados. Cap. 7 es un capítulo más honesto en su implementación de referencia, pero más ambicioso (y sin derivación) en sus declaraciones de requisitos.

---

## 9. Brechas críticas para THYROX

### Brecha 1: Definición de "ontología compartida" vs. práctica real

**Claim:** El patrón requiere "protocolo estandarizado y ontología compartida" (C-03).
**Práctica real:** Los frameworks (CrewAI, LangGraph) usan paso de mensajes en lenguaje natural, no ontologías formales.
**Riesgo para THYROX:** Si un WP usa este capítulo como referencia para diseñar un sistema multiagente e interpreta literalmente el requisito de ontología compartida, añadirá infraestructura de knowledge representation que no es necesaria para la mayoría de casos de uso.
**Recomendación:** Para THYROX, reemplazar "ontología compartida" por "contrato de interfaz entre agentes" — más operacional, más honesto con la práctica.

---

### Brecha 2: Sinergia sin criterio de activación

**Claim:** El sistema multiagente produce sinergia (C-04).
**Brecha:** No hay criterio para saber cuándo la especialización multiagente supera al agente único. El overhead de coordinación puede anular los beneficios en tareas de baja complejidad.
**Riesgo para THYROX:** Usar el patrón Multiagente en WPs donde un agente único con buen prompting sería suficiente — añadiendo latencia y puntos de falla sin beneficio cualitativo.
**Recomendación:** Regla de selección operacional: usar Multiagente cuando las subtareas requieren herramientas mutuamente excluyentes, contextos de conocimiento muy distintos, o ejecución genuinamente paralela. No usar cuando la especialización es solo conceptual pero las herramientas son compartibles.

---

### Brecha 3: Modelo Supervisor sin mitigación de SPOF

**Claim:** Supervisor introduce SPOF (C-17) — correctamente identificado.
**Brecha:** No hay guía de cuándo usar Supervisor vs. Red vs. Jerárquico como función del riesgo de SPOF.
**Riesgo para THYROX:** Diseñar arquitecturas Supervisor sin estrategia de failover, y luego migrar a Jerárquico cuando el SPOF se manifiesta — costoso y tardío.
**Recomendación:** Añadir a la guía de selección de modelo: si el task tiene SLA de disponibilidad > X%, usar Red o Jerárquico con supervisores redundantes. Definir el umbral según el dominio.

---

### Brecha 4: Google ADK sin evidencia

**Claim:** Google ADK "está diseñado para facilitar" el patrón (C-20).
**Brecha:** El capítulo no provee ningún ejemplo de ADK. Para THYROX, esto es relevante si algún WP considera Google ADK como alternativa a CrewAI.
**Recomendación:** No usar este capítulo como evidencia para evaluar Google ADK. Consultar documentación oficial de Google ADK directamente si es relevante para un WP.

---

## Veredicto final

**Ratio:** 44% (9.75/22) | 49% excluyendo retórica

**El capítulo es usable para THYROX para:**
- Comprensión conceptual del patrón (la definición de Sec. 1-6 es sólida como marco conceptual)
- Selección entre modelos de interrelación (Sec. 9 — correcto identificar trade-offs)
- Identificación de casos de uso (los 6 casos son genuinos y ninguno es misclassificación)
- Código de referencia como punto de partida (Sec. 10 — más honesto que Cap. 6, aunque con error de sintaxis)

**El capítulo NO es usable directamente para THYROX para:**
- Justificar requisito de "ontología compartida" en diseño de sistema multiagente
- Afirmar que el sistema multiagente tendrá sinergia sin criterio de activación
- Evaluar Google ADK como framework (no hay evidencia en el capítulo)
- Diseñar mitigación de SPOF en Modelo Supervisor (el problema está identificado, la solución ausente)

**Patrón dominante: EFsA-Estructural** — el capítulo provee evidencia funcional que ilustra el patrón, pero sus requisitos críticos declarados (protocolo estandarizado, ontología compartida) no están implementados en el código de referencia. La brecha no es de honestidad sino de consistencia interna entre los requisitos declarados y la implementación presentada.
