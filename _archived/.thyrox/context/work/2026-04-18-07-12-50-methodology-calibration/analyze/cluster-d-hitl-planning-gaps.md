```yml
created_at: 2026-04-20 00:16:21
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 8 — PLAN EXECUTION
author: deep-dive
status: Borrador
```

# Cluster D — Gaps no capturados en T-001..T-024

**Fuente de análisis:** 8 archivos del Cluster D (HITL, Planning, Resource-Aware, Learning Adaptation, Framework Applications Meta-Accounting, Prioritization, Reasoning Techniques)
**Referencia del task-plan:** `plan-execution/methodology-calibration-task-plan.md` (T-001..T-024)
**Método:** extracción de hallazgos por archivo → mapeo contra T-001..T-024 → propuesta de tasks para gaps

---

## SECCIÓN 1 — Hallazgos por archivo

### 1.1 hitl-pattern-deep-dive.md (Cap.13 — Human in the Loop)

**Hallazgo H1-A:** El mecanismo de interrupt/resume pattern (HITL real) no está implementado en el código del capítulo. El workflow no se bloquea hasta recibir respuesta humana. `flag_for_review` retorna `{"success": True}` sin blocking ni estado de espera. Esta es la distinción central entre un sistema HITL real y un sistema con herramientas opcionales de escalada.

**Hallazgo H1-B:** La taxonomía HITL/HOTL/HIC es el único concepto completamente VERDADERO y adoptable del capítulo. La distinción conceptual entre "humano en el loop bloqueante", "humano en el loop observador", y "humano con capacidad de override" tiene valor directo para THYROX cuando diseña WPs agentic que involucran supervisión humana.

**Hallazgo H1-C:** `personalization_callback` retorna `None` y usa `types.Content(role="system")` en Gemini/ADK — dos bugs sistemáticos de contrato de API que se repiten en ambos ejemplos del capítulo. Esto confirma que AP-01 (callback contract) y AP-02 (callback tool contract) son patrones de error sistemáticos, no anecdóticos. El capítulo de HITL es el cuarto capítulo consecutivo que los replica.

---

### 1.2 hitl-tables-deep-dive.md (Cap.13 — technical_support_agent)

**Hallazgo H2-A:** El comentario `# Return None to continue with the modified request` convierte el bug silencioso de AP-01 en doctrina activa. El lector que confía en el comentario aprenderá que `return None` propaga modificaciones — y replicará el bug con confianza. Esta es la escalada más grave del patrón: de "error de implementación" a "enseñanza incorrecta documentada".

**Hallazgo H2-B:** `ticket_id = "TICKET123"` hardcodeado es un bug de funcionalidad que afecta al LLM: el agente opera con la convicción de que todos los tickets tienen el mismo ID. Cuando referencia tickets en conversación, usa `TICKET123` para todos, haciendo imposible el tracking real. Este bug no es pedagógico — afecta el comportamiento del agente en ejecución.

**Hallazgo H2-C:** La contradicción entre instrucción del agente ("Use escalate_to_human to transfer to a human specialist") y el comentario del código ("# This would typically transfer to a human queue in a real system") hace que el LLM opere bajo una descripción falsa de sus propias herramientas. El LLM cree que la transferencia ocurrió; no ocurrió.

---

### 1.3 planning-pattern-deep-dive.md (Cap.6 — Planning Pattern, v2.1)

**Hallazgo P1-A:** La distinción `workflow conocido` vs. `workflow a descubrir` es la regla de selección central del patrón Planning — y es VERDADERA como heurístico para THYROX. La pregunta "¿necesita el workflow de este WP ser descubierto, o ya se conoce?" tiene valor directo en Stage 1 DISCOVER para clasificar si un WP requiere Planning dinámico genuino o un ciclo THYROX con stages predeterminados.

**Hallazgo P1-B:** SALTO-6 (RAG presentado como Planning): la integración de documentos privados con búsqueda web es RAG, no Planning. El capítulo atribuye ambas capacidades al patrón "Planning" sin distinguirlas. Para THYROX: si un WP necesita combinar artefactos internos con investigación externa, eso es Planning + RAG — dos capas arquitectónicas distintas. Diseñar solo con el framework "Planning" subestimaría la complejidad.

**Hallazgo P1-C:** ENGAÑO-5 ("no mera concatenación" como garantía de síntesis crítica): negar un defecto no prueba que la alternativa positiva ocurra mecánicamente. El capítulo afirma que DeepResearch produce síntesis crítica porque "no es mera concatenación" — pero un LLM puede generar texto con apariencia de síntesis crítica sin que exista un mecanismo de evaluación crítica separado. Esta trampa retórica es relevante para THYROX cuando evalúa si un artefacto producido por agente constituye análisis genuino.

---

### 1.4 resource-aware-optimization-deep-dive.md (Cap.16)

**Hallazgo R1-A:** El único mecanismo de "resource awareness" implementado es `len(user_query.split()) < 20`. No hay métricas de costo real, no hay feedback loop, no hay configuración dinámica del threshold. El threshold de 20 palabras no tiene calibración empírica. Este capítulo es ENGAÑOSO por el patrón "Named Mechanism vs. Implementation" — octavo caso de la serie. El patrón ahora está confirmado en 8 capítulos consecutivos (Cap.10-17, excepto Cap.18).

**Hallazgo R1-B:** El código de tercero (Tabla 4, MIT Mahtab Syed 2025) tiene 5 bugs críticos incluyendo: `google_search() -> list` retorna `dict` en excepción (cascada a AttributeError 3 niveles abajo), `generate_response() -> str` retorna `tuple`, `temperature=1` para clasificador determinístico, `json.loads` sin try/except, y `model` puede quedar sin asignar produciendo `UnboundLocalError`. El capítulo usa código de tercero sin verificación de bugs como demostración del patrón.

**Hallazgo R1-C:** El JSON de las Tablas 6 y 7 no es JSON válido — contiene `...` y `//` que violan RFC 8259. Las Tablas 1 y 2 tienen disclaimer "not runnable code"; las Tablas 6 y 7 no tienen disclaimer, creando la apariencia de que el JSON es válido cuando no lo es. La inconsistencia del disclaimer funciona como engaño por contraste: el disclaimer en T1/T2 hace que su ausencia en T6/T7 implique validez.

---

### 1.5 learning-adaptation-pattern-deep-dive.md (Cap.9)

**Hallazgo L1-A:** El código de OpenEvolve tal como aparece produce `NameError` al ejecutar: `evolve.run()` usa `evolve` como objeto pero `evolve = OpenEvolve(...)` nunca se instancia. Las variables de ruta están asignadas pero nunca pasadas a ningún constructor. Este es el único código del capítulo — y no puede ejecutarse.

**Hallazgo L1-B:** La cadena de credibilidad epistémica: PPO (paper verificado arXiv) → DPO (sin cita, correcta por Rafailov 2023) → SICA (preprint sin peer-review) → AlphaEvolve (blog corporativo). El tono de afirmación permanece constante a través de los cuatro niveles, pero el nivel de validación epistémica se degrada en cada paso. Esto es la forma más sofisticada del patrón "credibilidad prestada en cascada" — donde la autoridad del primer elemento se propaga sin atenuación a los siguientes.

**Hallazgo L1-C:** La tensión "SICA logra autonomía" vs. "SICA tiene supervisor asincrónico que puede cancelar la ejecución" nunca se reconcilia en el capítulo. Para THYROX: cualquier sistema que se declare "autónomo" pero tenga un mecanismo de supervisión con poder de cancelación es autónomo condicionalmente, no plenamente. Esta distinción es crítica para el diseño del mandato agentic de THYROX.

---

### 1.6 framework-applications-meta-accounting-deep-dive.md (Claude Architecture Part D)

**Hallazgo F1-A:** Π_inconsist no tiene definición operacional en ninguna de las 4 partes del framework analizado, pero en Part D es clasificado como "Observable Fact PROVEN". La trayectoria es monotónica: la autoridad epistémica de Π_inconsist aumenta con cada parte mientras su definición operacional permanece ausente. Este es el caso más extremo del patrón "notación formal encubriendo especulación" — una variable sin definición alcanza el status de "PROVEN".

**Hallazgo F1-B:** Los confidence scores de Sec 16 (30%, 20%, 25%, 40%) son estadísticamente indistinguibles con n=2 observaciones. No existe protocolo que justifique distinguir 30% de 25% con n=2. Presentarlos como porcentajes distintos es precisión epistémica fabricada. Para THYROX: cuando un artefacto reporta "confianza X%" en un claim, sin declarar el método de calibración y el tamaño de muestra, ese porcentaje es decorativo.

**Hallazgo F1-C:** La "meta-honestidad" opera como inmunización epistémica: el CRITICAL PREAMBLE ("hipótesis, no validado, 2 ejemplos") hace que el lector asuma que los problemas ya fueron identificados y acotados — lo que aumenta, no disminuye, la credibilidad de los valores incorrectos que siguen en Sec 11.2. La admisión explícita de limitaciones puede funcionar como escudo contra análisis adicional.

---

### 1.7 prioritization-deep-dive.md (Cap.20 — Prioritization)

**Hallazgo PR1-A:** `from langchain_core.tools import Tool` produce `ImportError` — la clase `Tool` no existe en `langchain_core.tools`, vive en `langchain.tools`. El código falla antes de instanciar cualquier objeto. Este es un bug terminal que impide la ejecución de cualquier parte del código del capítulo.

**Hallazgo PR1-B:** El Prioritization Pattern descrito tiene 4 componentes (criteria definition, scoring, scheduling/selection, dynamic re-prioritization). El código implementa 0 de los 4. No hay scoring function, no hay priority queue, no hay deadline field en Task, no hay re-ranking trigger. Los labels P0/P1/P2 son metadatos decorativos sin efecto sobre el orden de ejecución. El capítulo es la novena instancia del patrón "Named Mechanism vs. Implementation".

**Hallazgo PR1-C:** `temperature=0.5` para decisiones de routing determinístico (crear task → asignar prioridad → asignar worker) es el error opuesto al de Cap.16 (`temperature=1` para clasificador). En ambos casos el capítulo usa temperatura incorrecta para el tipo de decisión. La práctica correcta documentada en Cap.18 (Guardrails) es `temperature=0.0` para decisiones determinísticas — pero Cap.20 no lo replica. Esto confirma que la temperatura correcta para clasificadores es una regla no propagada entre capítulos del libro.

---

### 1.8 reasoning-techniques-deep-dive.md (Cap.17)

**Hallazgo RT1-A:** CoD ("Chain of Debates") se atribuye a Microsoft como "formal AI framework" sin ninguna referencia bibliográfica. GoD no tiene referencia ni declaración de originalidad. Con 11 técnicas en el capítulo, 4 tienen papers peer-reviewed verificables (CoT, ToT, PALMs, ReAct) y los 4 papers verificables actúan como ancla de credibilidad para las 7 técnicas restantes sin referencia — ese es el mecanismo del engaño.

**Hallazgo RT1-B:** "Scaling Inference Law" se llama "law" sin presentar ninguna ecuación de la forma `P(c) = f(c)`. Es una observación empírica de dirección (más compute de inferencia → mejor resultado a veces) elevada a estatus de ley formalizada por nominalización. El patrón "escalada de estatus terminológico sin formalización" es nuevo respecto a los capítulos anteriores.

**Hallazgo RT1-C:** El snippet ADK que ilustra PALMs muestra configuración de un `code_executor` — no implementa el ciclo PALMs (generate code para resolver problema → execute → incorporate result en respuesta). El lector que estudia el snippet aprende configuración de infrastructure de code execution, no la técnica PALMs de Gao 2023. La ilustración y la técnica son distintas.

---

## SECCIÓN 2 — Mapeo contra T-001..T-024

### Qué cubren T-001..T-024

| Bloque | Tasks | Qué cubre |
|--------|-------|-----------|
| Bloque 0 | T-001, T-001b, T-003b | Verificación mecanismo @imports |
| Bloque 1 | T-002, T-003 | Guideline agentic-python con AP-01..AP-30 |
| Bloque 2 | T-004, T-005 | Agente agentic-validator |
| Bloque 3 | T-006 | 6 patrones consultables (AP-01, AP-02, AP-16, AP-17, AP-18, AP-25) |
| Bloque 4 | T-007 | TD-042 validate-session-close.sh |
| Bloque 5 | T-008..T-012 | Documentación del proyecto |
| Bloque 6 | T-013 | workflow-standardize actualización |
| Bloque 7 | T-014 | Consistencia de nomenclatura de stages |
| Bloque 8 | T-015..T-018 | THYROX como sistema agentic (árbol, referencia, exit criteria, mandato) |
| Bloque 9 | T-019 | Platform evolution tracking |
| Bloque 10 | T-020, T-021 | Calibración de incertidumbre en templates |
| Bloque 11 | T-022 | Enforcement I-001 en script |
| Bloque 12 | T-023 | YMLs de 16 agentes sin registry |
| Bloque 13 | T-024 | bound-detector.py cobertura inglés |

### Análisis de cobertura por hallazgo

| Hallazgo | ¿Cubierto por T-001..T-024? | Observación |
|----------|----------------------------|-------------|
| H1-A: interrupt/resume pattern como AP nuevo | PARCIAL — AP-16, AP-17 en T-002 y T-006 cubren HITL | AP-16/17 están en el catálogo pero el patrón interrupt/resume específico (blocking + state persistence + UI notification) puede no estar detallado como sub-componentes distinguibles. Ver análisis. |
| H1-B: taxonomía HITL/HOTL/HIC adoptable | NO capturado | La taxonomía es adoptable para THYROX en Stage 5 STRATEGY cuando un WP involucra supervisión humana. No hay referencia de diseño para esto. |
| H1-C: AP-01/AP-02 confirmados en 4 capítulos consecutivos | CUBIERTO — T-002 (AP-01, AP-02 en Sección 1 de la guideline) | El hallazgo confirma la importancia de AP-01/AP-02 pero no requiere tarea nueva. |
| H2-A: comentario incorrecto como enseñanza activa | PARCIALMENTE — T-002 menciona el patrón, T-006 crea el documento consultable | El sub-caso de "bug documentado como correcto" vs. "bug silencioso" puede no estar capturado con la distinción necesaria en el documento AP-01. |
| H2-B: hardcoded ID afecta comportamiento del agente | NO como AP específico | El patrón "hardcoded identifier en herramienta de agente" no está en AP-01..AP-30 y tiene implicaciones directas en el comportamiento del agente (el LLM toma decisiones basadas en el ID). |
| H2-C: descripción falsa de herramienta al LLM | NO como AP específico | El patrón "instrucción del agente contradice comportamiento real de la herramienta" no está en el catálogo AP-01..AP-30. El LLM opera bajo un modelo mental falso de sus propias herramientas. |
| P1-A: regla de selección Planning adoptable | NO capturado | La heurística "¿workflow conocido o a descubrir?" para clasificar WPs no está en ningún artefacto de THYROX. Tiene valor directo en Stage 1 DISCOVER. |
| P1-B: Planning ≠ RAG (confusión de capas arquitectónicas) | NO capturado | El anti-patrón "atribuir capacidades RAG al patrón Planning" no está en el catálogo. Para THYROX: WPs que necesiten fuentes internas + búsqueda web necesitan Planning + RAG, no solo Planning. |
| P1-C: negación de defecto ≠ afirmación de calidad | PARCIALMENTE — T-020/T-021 abordan calibración de incertidumbre | T-020 agrega "Evidencia de respaldo" en templates, lo que ayuda a detectar este patrón. Pero la regla explícita "negar X no prueba que no-X ocurre" no está formulada como principio. |
| R1-A: "Named Mechanism" confirmado en 8 capítulos | CUBIERTO — AP-25 en T-002 y T-006 | AP-25 es el patrón sistémico. El conteo de 8 instancias refuerza la importancia pero no requiere tarea nueva. |
| R1-B: código de tercero sin verificación de bugs | NO como AP específico | El anti-patrón "incluir código de tercero como demostración sin verificar type contracts" no está en AP-01..AP-30. Para THYROX: cuando se evalúa código de tercero, verificar type contracts antes de adoptarlo. |
| R1-C: JSON inválido sin disclaimer | NO como AP específico | El patrón "disclaimer inconsistente que crea apariencia de validez por contraste" no está en el catálogo. Relevante para validación de artefactos. |
| L1-A: código que produce NameError | NO como AP nuevo | El patrón "objeto usado antes de instanciarse" ya debería estar cubierto en buenas prácticas, pero no como AP específico en el catálogo. |
| L1-B: credibilidad en cascada degradada | NO como AP específico | El patrón "cadena de autoridad epistémica degradante con tono constante" no está en AP-01..AP-30. Es un patrón de análisis crítico para THYROX. |
| L1-C: autonomía condicional vs. autonomía declarada | NO capturado | La distinción "autónomo condicionalmente" vs. "autónomo plenamente" es crítica para el mandato agentic de THYROX. T-018 crea el mandato pero no define esta distinción. |
| F1-A: variable sin definición promovida a PROVEN | PARCIALMENTE — T-020/T-021 abordan calibración | T-020 agrega tabla de evidencia. Pero la regla "una variable sin definición operacional no puede tener un valor PROVEN" no está formulada como criterio de gate. |
| F1-B: confidence % sin protocolo = decorativo | NO capturado | La regla "porcentaje de confianza sin método declarado y sin N es decorativo" no está en ningún artefacto de THYROX. T-020/T-021 son los más cercanos pero no formulan esta regla. |
| F1-C: meta-honestidad como inmunización | NO capturado | El anti-patrón "admisión de limitaciones como escudo contra análisis adicional" no está documentado en THYROX. Relevante para evaluar artefactos que declaran sus propias limitaciones. |
| PR1-A: ImportError terminal antes de ejecución | CUBIERTO — AP-18..AP-22 cubren imports | El patrón de import incorrecto está cubierto en Sección 7 (Imports) de la guideline. |
| PR1-B: 0/4 componentes implementados | CUBIERTO — AP-25 como patrón sistémico | "Named Mechanism vs. Implementation" captura el patrón. |
| PR1-C: temperatura incorrecta para clasificador | CUBIERTO — AP-07, AP-08 en Sección 3 de la guideline | Temperature para clasificadores está cubierto. |
| RT1-A: técnica sin referencia heredando credibilidad de técnicas citadas | NO capturado | El patrón "anclaje de credibilidad por asociación con fuentes verificadas" no está en el catálogo. Es el mecanismo más sofisticado identificado en la serie. |
| RT1-B: observación elevada a "ley" por nominalización | NO capturado | El anti-patrón "escalada de estatus terminológico" (principle → law, observation → theorem) no está en AP-01..AP-30 ni en referencias de THYROX. |
| RT1-C: ilustración de configuración ≠ implementación de técnica | PARCIALMENTE — AP-25 cubre el patrón general | El sub-caso específico de "configurar infrastructure de una técnica ≠ implementar la técnica" no está distinguido en AP-25. |

---

## SECCIÓN 3 — Hallazgos no capturados y tasks propuestos

### GAP-D1 — Taxonomía HITL/HOTL/HIC para diseño de WPs con supervisión humana

**Hallazgos de origen:** H1-B
**Por qué no está cubierto:** T-001..T-024 generan AP sobre código y generan el mandato agentic (T-018), pero ninguna tarea documenta cómo seleccionar el nivel de involvement humano cuando se diseña un WP con supervisión.
**Prioridad:** ALTO — afecta Stage 5 STRATEGY de cualquier WP donde el agente toma decisiones con consecuencias reales.

```
T-025 Agregar sección "Niveles de supervisión humana" en la referencia agentic-system-design.md
  Archivo: `.claude/skills/workflow-strategy/references/agentic-system-design.md` (creado por T-016)
  Contenido a agregar:
    - Taxonomía HITL/HOTL/HIC (Human-in-the-Loop / Human-on-the-Loop / Human-in-Command)
      con definición operacional de cada nivel para uso en Stage 5 STRATEGY
    - HITL: el workflow se bloquea hasta que el humano revisa y aprueba — requiere interrupt/resume pattern
    - HOTL: el workflow ejecuta; el humano monitorea y puede intervenir — no requiere blocking
    - HIC: el humano define las reglas; el agente las ejecuta autónomamente — sin supervisión en tiempo real
    - Pregunta de Stage 5: "¿Qué nivel de supervisión humana requiere este WP?" con árbol de decisión
    - Señal de advertencia: si el diseño usa HITL conceptualmente pero no implementa interrupt/resume, el sistema
      en realidad es HOTL — declarar el nivel real, no el aspirado
  Dependencias: T-016 (el archivo debe existir antes de agregar sección)
  Prioridad: ALTO
```

---

### GAP-D2 — AP nuevo: Tool Description Mismatch (instrucción del agente contradice comportamiento real)

**Hallazgos de origen:** H2-C
**Por qué no está cubierto:** AP-01..AP-30 cubren contratos de callbacks, temperature, error handling, imports, observabilidad, HITL patterns. No existe AP para el patrón "la descripción de una herramienta en el system prompt contradice lo que la herramienta realmente hace".
**Prioridad:** CRÍTICO — un agente que opera bajo una descripción falsa de sus herramientas toma decisiones basadas en información incorrecta. El LLM no puede compensar porque el modelo mental que le fue dado es incorrecto.

```
T-026 Agregar AP-31 "Tool Description Mismatch" en agentic-python.instructions.md y en agentic-validator.md
  Archivos a modificar:
    1. `.thyrox/guidelines/agentic-python.instructions.md` (creado por T-002):
       Agregar AP-31 en Sección 6 (HITL Patterns) o nueva Sección 9 (Tool Contracts):
         INCORRECTO: herramienta que retorna {"status": "success"} sin hacer la operación prometida,
           combinada con system prompt que describe la operación como si ocurriera
         CORRECTO: si la herramienta es un placeholder, el system prompt debe declararlo explícitamente,
           o la herramienta debe implementar la operación completa
         Por qué falla: el LLM recibe como verdadero que "escalate_to_human transfiere a un especialista"
           y construye su razonamiento sobre esa premisa falsa — incluidas las confirmaciones al usuario
    2. `.claude/agents/agentic-validator.md` (creado por T-005):
       Agregar AP-31 al catálogo con el anti-patrón + correcto + señal de detección
    3. `.thyrox/context/work/2026-04-18-07-12-50-methodology-calibration/discover/patterns/` (T-006):
       Crear `hitl-tool-description-contract.md` como documento consultable de AP-31
  Dependencias: T-002 (PASS) y T-005
  Prioridad: CRÍTICO
```

---

### GAP-D3 — AP nuevo: Hardcoded Identifier en herramienta de agente

**Hallazgos de origen:** H2-B
**Por qué no está cubierto:** AP-01..AP-30 no tienen un AP específico para identificadores hardcodeados en herramientas de agente. El patrón es distinto de los números sin fuente del dominio de análisis (Engaño P2 del sistema de análisis) porque afecta directamente el comportamiento del agente: el LLM recibe un ID específico y lo usa como referencia real en conversaciones posteriores.
**Prioridad:** ALTO — afecta la capacidad del agente de razonar correctamente sobre sus propias acciones previas.

```
T-027 Agregar AP-32 "Hardcoded Identifier en Tool Return" en agentic-python.instructions.md
  Archivo: `.thyrox/guidelines/agentic-python.instructions.md`
  Contenido AP-32:
    INCORRECTO: herramienta que retorna ID hardcodeado ({"ticket_id": "TICKET123"})
      — el LLM usará ese ID en conversaciones posteriores, haciendo imposible el tracking real
      — con múltiples llamadas, todos los items tienen el mismo ID → el LLM no puede distinguirlos
    CORRECTO: generar ID dinámico (uuid4, timestamp, secuencial con counter) o
      declarar explícitamente que el ID es un placeholder de demostración y que
      el system prompt del agente no debe referenciar ese ID como valor real
    Señal de detección: buscar strings literales en return de herramientas que parezcan
      identificadores (TASK-123, TICKET123, ID-001, etc.)
  Dependencias: T-002 (PASS)
  Prioridad: ALTO
```

---

### GAP-D4 — Heurístico Planning vs. Routing para clasificar WPs en Stage 1

**Hallazgos de origen:** P1-A, P1-B
**Por qué no está cubierto:** El methodology-selection-guide tiene árboles de decisión para metodologías (PDCA, DMAIC, etc.) pero no para patrones agentic dentro de un WP. T-015 agrega "Árbol 5 — Sistemas Agentic AI" pero está enfocado en el tipo de WP (¿el WP construye un sistema agentic?), no en cómo diseñar el agente dentro del WP.
**Prioridad:** ALTO — sin esta distinción, WPs que necesitan Planning dinámico se diseñan como workflows predeterminados, y WPs que necesitan Planning + RAG se diseñan como Planning solo.

```
T-028 Agregar árbol de decisión "Planning vs. Routing vs. Planning+RAG" en workflow-discover/references/
  Archivo: `.claude/skills/workflow-discover/references/agentic-pattern-selection.md` (nuevo)
  Contenido:
    Pregunta raíz: "¿El workflow de resolución de este WP se conoce de antemano o debe descubrirse?"
    Rama CONOCIDO → considerar Chaining, Routing, o Parallelization según estructura
    Rama A DESCUBRIR → Planning dinámico
      Sub-pregunta: "¿El agente necesita integrar fuentes de información internas (artefactos del proyecto)
        con búsqueda o análisis externo?"
        SÍ → Planning + RAG (dos capas arquitectónicas — no solo Planning)
        NO → Planning puro
    Regla de desempate Routing vs. Planning: "¿El número de rutas posibles es finito y conocido?"
      SÍ con N rutas conocidas → Routing (aunque N sea grande)
      NO (rutas emergen del proceso) → Planning
    Señal de advertencia: si se usa Planning pero el workflow resultante siempre tiene la misma estructura
      de pasos → probablemente es Chaining o Routing, no Planning real
  Independiente — no bloqueador
  Prioridad: ALTO
```

---

### GAP-D5 — Regla de calibración: confidence % sin protocolo declarado es decorativo

**Hallazgos de origen:** F1-B, F1-A
**Por qué no está cubierto:** T-020 agrega tabla de "Evidencia de respaldo" y T-021 agrega `confidence_threshold` a los gates. Ambos avanzan en la dirección correcta pero no formulan la regla crítica: un porcentaje de confianza sin declarar el método de calibración y el tamaño de muestra es epistémicamente decorativo — no puede usarse para priorización ni para decidir si un claim está validado.
**Prioridad:** ALTO — sin esta regla, los confidence thresholds de T-021 pueden ser satisfechos con porcentajes arbitrarios.

```
T-029 Agregar regla de calibración en exit-conditions.md.template y en agentic-mandate.md
  Archivos a modificar:
    1. `.claude/skills/workflow-discover/assets/exit-conditions.md.template` (modificado por T-021):
       Agregar nota en el campo `confidence_threshold`:
         "REGLA: un threshold numérico solo es válido si se declara junto a él:
          (a) el método de derivación (observación directa / tool_use confirmatorio / triangulación / estimación bayesiana)
          (b) el tamaño de muestra o evidencia base (N observaciones, N documentos, N ejecuciones)
          Un porcentaje sin (a) y (b) es estimación informal — usar HIGH/MEDIUM/LOW en su lugar"
    2. `.claude/references/agentic-mandate.md` (creado por T-018):
       Agregar en la sección de criterios de evaluación:
         "Criterio de calibración para claims cuantitativos: un claim del tipo 'confianza X%' sin método
          declarado y sin base evidencial (N) no cumple C2 (razonamiento sobre incertidumbre) — cuenta como
          INCIERTO, no como evaluado."
  Dependencias: T-018 y T-021 (los archivos deben existir)
  Prioridad: ALTO
```

---

### GAP-D6 — AP nuevo: Escalada de estatus terminológico (principle → law, observation → theorem)

**Hallazgos de origen:** RT1-B
**Por qué no está cubierto:** AP-01..AP-30 no tienen un AP para el patrón de elevar el estatus epistémico de un claim mediante naming formal sin añadir evidencia. Es distinto de "notación formal encubriendo especulación" (que usa ecuaciones o fórmulas) — este patrón usa solo terminología elevada ("law", "theorem", "formal framework") sin formalización matemática.
**Prioridad:** MEDIO — relevante para análisis de artefactos externos y para detectar claims sobre el propio sistema THYROX.

```
T-030 Agregar AP-33 "Terminological Status Escalation" en agentic-python.instructions.md
  Archivo: `.thyrox/guidelines/agentic-python.instructions.md`
  Contexto: este AP aplica a análisis de documentos y claims sobre sistemas, no solo a código
  Agregar como Sección 9 "Análisis crítico de claims" (separada del código agentic):
    AP-33: Terminological Status Escalation
      SEÑAL: un claim usa términos que implican formalización o validación más allá de la evidencia
        presentada: "law" sin ecuación, "theorem" sin demostración, "formal framework" sin
        especificación formal, "proof" sin derivación
      VERIFICACIÓN: preguntar "¿qué expresión matemática o protocolo justifica el término?"
        Si la respuesta es "ninguna / cualitativa", el término es nominalización — degradar a
        "principle", "observation", "heuristic", o "proposed framework"
      Por qué importa para THYROX: cuando THYROX evalúa herramientas, frameworks, o metodologías
        externas para adoptar, este patrón puede inflar la autoridad epistémica del artefacto
  Dependencias: T-002 (PASS)
  Prioridad: MEDIO
```

---

### GAP-D7 — Distinción "autónomo condicionalmente" vs. "autónomo plenamente" en mandato agentic

**Hallazgos de origen:** L1-C, H1-A
**Por qué no está cubierto:** T-018 crea el mandato agentic con criterios C1..C6. Pero el criterio C2 ("el motor razona sobre incertidumbre") no distingue si el sistema es autónomo condicionalmente (tiene supervisor con poder de cancelación) o autónomo plenamente (opera sin supervisión reactiva). Esta distinción es crítica para evaluar el mandato honestamente.
**Prioridad:** MEDIO — complementa T-018, no lo bloquea.

```
T-031 Agregar distinción de niveles de autonomía en agentic-mandate.md
  Archivo: `.claude/references/agentic-mandate.md` (creado por T-018)
  Contenido a agregar:
    Sub-criterio C2a: "¿El sistema opera con autonomía condicional o plena?"
      - Autonomía condicional: el sistema toma decisiones autónomamente PERO existe un mecanismo
        de supervisión que puede interrumpir o cancelar. (Ejemplo: SICA con supervisor asincrónico.)
        → THYROX actual está en este nivel (bound-detector.py puede rechazar outputs)
      - Autonomía plena: el sistema opera sin supervisión reactiva; los límites son pre-configurados,
        no monitoreados en tiempo real.
        → THYROX no está en este nivel actualmente (C2: NO CUMPLE en la formulación actual)
    Nota: declarar autonomía condicional como "autónomo" sin la distinción reproduce la CONTRADICCIÓN-2
      de Cap.9 (SICA con supervisor declarado autónomo). THYROX debe ser honesto sobre su nivel real.
  Dependencias: T-018
  Prioridad: MEDIO
```

---

### GAP-D8 — Anti-patrón: código de tercero sin verificación de type contracts

**Hallazgos de origen:** R1-B
**Por qué no está cubierto:** AP-01..AP-30 no tienen un AP para el uso de código de tercero como demostración o ejemplo sin verificar sus contratos de tipos. Cuando THYROX adopta herramientas, snippets, o referencias de implementación externas, necesita un protocolo mínimo de verificación.
**Prioridad:** MEDIO — relevante cuando THYROX integra código externo en sus referencias o guidelines.

```
T-032 Agregar AP-34 "Third-Party Code Without Contract Verification" en agentic-python.instructions.md
  Archivo: `.thyrox/guidelines/agentic-python.instructions.md`
  Contenido AP-34 (agregar en Sección 2 — Type Contracts):
    AP-34: Third-Party Code Without Contract Verification
      ANTI-PATRÓN: incluir código de tercero como referencia o ejemplo sin verificar que:
        (a) las type annotations son consistentes con los return types reales
        (b) los paths de error retornan el mismo tipo que el path normal
        (c) las excepciones no son silenciadas con tipos incompatibles (dict retornado como list)
      VERIFICACIÓN MÍNIMA antes de adoptar código de tercero:
        1. Revisar cada función con `-> T` en la firma: ¿todos los return paths retornan T?
        2. Revisar cada bloque except: ¿el return del except tiene el mismo tipo que el return normal?
        3. Revisar condicionales (if/elif sin else): ¿puede quedar alguna variable sin asignar?
      Por qué importa: el libro analizado incluye código MIT de tercero con 5 bugs de tipo no detectados.
        Si THYROX adopta herramientas externas sin este check mínimo, hereda los bugs.
  Dependencias: T-002 (PASS)
  Prioridad: MEDIO
```

---

## SECCIÓN 4 — Resumen de tasks propuestos

| Task | Hallazgos de origen | Prioridad | Dependencias |
|------|---------------------|-----------|--------------|
| T-025 | H1-B | ALTO | T-016 |
| T-026 | H2-C | CRÍTICO | T-002 PASS, T-005 |
| T-027 | H2-B | ALTO | T-002 PASS |
| T-028 | P1-A, P1-B | ALTO | Independiente |
| T-029 | F1-B, F1-A | ALTO | T-018, T-021 |
| T-030 | RT1-B | MEDIO | T-002 PASS |
| T-031 | L1-C, H1-A | MEDIO | T-018 |
| T-032 | R1-B | MEDIO | T-002 PASS |

### Orden de ejecución sugerido para los nuevos tasks

```
T-026 (AP-31 — CRÍTICO, independiente de los otros nuevos tasks)
  └── Ejecutar inmediatamente después de T-005

T-027 (AP-32) y T-030 (AP-33) y T-032 (AP-34)
  └── Paralelo después de T-002 PASS — todos modifican agentic-python.instructions.md
      (coordinar para no conflicto: T-027 en Sección 6 o 9, T-030 en nueva Sección 9, T-032 en Sección 2)

T-028 (Planning selection guide)
  └── Independiente — puede ejecutarse en cualquier momento

T-025 (HITL/HOTL/HIC en strategy)
  └── Después de T-016

T-029 (regla de calibración)
  └── Después de T-018 y T-021

T-031 (autonomía condicional en mandato)
  └── Después de T-018
```

### Impacto en el mandato de ÉPICA 42

T-001..T-024 implementan los 30 anti-patrones (AP-01..AP-30), el agente validador, y la infraestructura de calibración. Los 8 tasks nuevos (T-025..T-032) extienden el catálogo con 4 APs nuevos (AP-31..AP-34) y añaden artefactos de diseño que conectan el conocimiento del libro con el diseño arquitectónico de WPs agentic en THYROX.

El gap más crítico — T-026 (AP-31: Tool Description Mismatch) — no está cubierto por ninguno de los 24 tasks existentes y tiene impacto directo en el comportamiento de agentes: un LLM que opera bajo una descripción falsa de sus herramientas toma decisiones incorrectas que no puede corregir porque el error está en su modelo mental de sus propias capacidades, no en su razonamiento.
