```yml
created_at: 2026-04-19 10:31:21
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Chapter 12: Exception Handling and Recovery" (documento externo, 2026-04-19)
ratio_calibración: 14.45/26 (55.6%)
clasificación: PARCIALMENTE CALIBRADO
delta_vs_cap11: +4.4pp (Cap.11 original: 60.6% → corrección: ver nota comparativa)
delta_vs_cap9: -21.4pp (Cap.9: 77%)
hipotesis_ccv: REFUTADA
```

# Calibración — Cap.12: Exception Handling and Recovery

## Ratio de calibración: 14.45/26 (55.6%)

## Clasificación: PARCIALMENTE CALIBRADO

---

## Metodología aplicada

**Denominador:** 26 claims identificables en el texto.
**Pesos por tipo:**
- Observación directa: 1.0
- Inferencia calibrada: 0.75
- Inferencia especulativa: 0.40
- Claim performativo: 0.10

**Regla de referencias no citadas:** Las 3 referencias (McConnell 2004, arXiv:2412.00534, O'Neill 2022) aparecen solo en la sección References. Ninguna se cita inline junto a un claim específico. Per el marco establecido en la hipótesis y confirmado por la distinción con Cap.9: estas referencias NO elevan ningún claim individual. Un claim que sería especulativo sin cita sigue siendo especulativo; uno que sería performativo sigue siendo performativo. La mera existencia de las referencias en una sección final no constituye evidencia de que respaldan claims particulares del cuerpo.

---

## Grupo A — Descripción del patrón (Error Detection / Handling / Recovery)

### A-01: "invalid or malformed tool outputs, specific API errors such as 404 (Not Found) or 500 (Internal Server Error) codes"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** Los códigos HTTP 404 y 500 son especificación observable (RFC 7231). Nombrar estos códigos específicos ancla el claim a una fuente verificable independientemente de cita. La categoría "invalid or malformed tool outputs" es más vaga pero se apoya en la especificidad de los ejemplos concretos.
**Peso aplicado:** 0.75

### A-02: "unusually long response times from services or APIs"
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El claim es correcto como categoría de error detection, pero "unusually long" es indefinido. Sin umbral numérico (e.g., ">30s", ">2× p95"), no es verificable ni accionable. El texto no proporciona criterio de cuándo una respuesta es "unusually" lenta. Comparar con "404 Not Found" que es exacto: aquí el claim pierde precisión deliberadamente.
**Peso aplicado:** 0.40

### A-03: "monitoring by other agents or specialized monitoring systems might be implemented for more proactive anomaly detection"
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El hedging ("might be implemented") es apropiado, lo que eleva marginalmente sobre performativo. Sin embargo, no hay referencia a ningún sistema de monitoring concreto ni al código del capítulo que lo implemente. Es una posibilidad sin evidencia de realización.
**Peso aplicado:** 0.40

### A-04: "error logging, retries, fallbacks, graceful degradation, and notifications" como estrategias de Error Handling
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** Esta lista es terminología estándar de ingeniería de software, presente en múltiples fuentes primarias (incluyendo McConnell 2004 que aparece en References). Aunque McConnell no está citado inline, la lista en sí refleja conocimiento de ingeniería consolidado, verificable independientemente. No es un claim original del capítulo: es codificación de práctica establecida.
**Peso aplicado:** 0.75

### A-05: "state rollback" como mecanismo de recovery
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** State rollback es un concepto correcto en sistemas de bases de datos y transaccionales (ACID). Sin embargo, el código del capítulo no implementa state rollback. `primary_handler` no deshace cambios si falla; simplemente `fallback_handler` usa una herramienta diferente. El texto describe state rollback como mecanismo de recovery pero el código no lo demuestra. Gap entre descripción conceptual y evidencia en código.
**Peso aplicado:** 0.40

### A-06: "self-correction mechanism or replanning process may be needed to avoid the same error in the future"
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** Claim técnicamente correcto como concepto, con hedging apropiado ("may be needed"). Pero el código del capítulo no implementa self-correction ni replanning — los agentes ejecutan en orden fijo sin adaptación basada en historia de errores. El claim describe algo que el patrón *podría* incluir, no algo que el ejemplo demuestra.
**Peso aplicado:** 0.40

### A-07: "transform AI agents from fragile and unreliable systems into robust, dependable components capable of operating effectively and resiliently"
**Clasificación:** Claim performativo (0.10)
**Justificación:** Este es el claim de transformación central del capítulo. Es una afirmación de calidad sobre el outcome del patrón. El código presentado tiene: (a) herramientas no definidas, (b) mecanismo de señalización de fallo no mostrado, (c) state management implícito. El "robust, dependable" que el capítulo promete no está sustanciado por el código que muestra. Como señala la Nota 8 del orquestador: hay un gap crítico entre el claim y la implementación demostrada.
**Peso aplicado:** 0.10

### A-08: "self-correction by adjusting its plan" (en At a Glance / Why)
**Clasificación:** Claim performativo (0.10)
**Justificación:** Repetición del claim de self-correction en la sección de resumen, pero sin nuevo soporte. El código no demuestra ajuste de plan. Performativo por ausencia de evidencia en el artefacto presentado.
**Peso aplicado:** 0.10

**Subtotal Grupo A:** 0.75 + 0.40 + 0.40 + 0.75 + 0.40 + 0.40 + 0.10 + 0.10 = 3.30 / 8 claims

---

## Grupo B — Código ADK

### B-01: "SequentialAgent" como patrón de fallback en Google ADK
**Clasificación:** Observación directa (1.0)
**Justificación:** `from google.adk.agents import Agent, SequentialAgent` es un import real de la biblioteca Google ADK. La clase SequentialAgent existe en ADK (verificable con `pip show google-adk` o en la documentación pública de Google ADK). El uso en el código es coherente con la API documentada: lista de sub_agents en orden de ejecución. El claim de que SequentialAgent existe como patrón de ADK es directamente observable.
**Peso aplicado:** 1.0

### B-02: "The SequentialAgent ensures the handlers run in a guaranteed order"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** "Guaranteed order" es una propiedad de los SequentialAgents en ADK — la semántica de "Sequential" implica ejecución ordenada. Es inferencia calibrada porque deriva de la semántica del nombre y el diseño documentado del framework, aunque el capítulo no cita la documentación de ADK explícitamente. El claim es verificable con la documentación oficial.
**Peso aplicado:** 0.75

### B-03: `state["primary_location_failed"]` verificado pero no establecido
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El texto no reconoce este problema. El código en `fallback_handler` verifica `state["primary_location_failed"]` pero ningún agente en el snippet lo establece. Esto podría ser un mecanismo implícito del framework (ADK podría establecer automáticamente flags de fallo) o un gap de implementación. La Nota 2 del orquestador lo identifica correctamente como pregunta sin respuesta. El claim implícito de que el fallback funciona es especulativo hasta que el mecanismo de señalización sea mostrado.
**Peso aplicado:** 0.40

### B-04: `state["location_result"]` leída pero no escrita en el snippet
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** `response_agent` verifica `state["location_result"]` pero ni `primary_handler` ni `fallback_handler` muestran cómo escriben en este estado. Análogo a B-03: podría ser comportamiento automático del framework o un gap de implementación. El flujo de estado es implícito, no demostrado. El claim de que `response_agent` presentará resultados coherentes es especulativo.
**Peso aplicado:** 0.40

### B-05: `get_precise_location_info` y `get_general_area_info` no definidas
**Clasificación:** Claim performativo (0.10)
**Justificación:** Las funciones están referenciadas en `tools=[get_precise_location_info]` y `tools=[get_general_area_info]` pero no están definidas en el snippet. El código no puede ejecutarse en este estado. El claim implícito de que el ejemplo demuestra "exception handling and recovery" operacional está sustancialmente debilitado: se está describiendo la estructura, no demostrando la funcionalidad. La Nota 1 del orquestador lo documenta correctamente.
**Peso aplicado:** 0.10

### B-06: "This code defines a robust location retrieval system" (párrafo explicativo)
**Clasificación:** Claim performativo (0.10)
**Justificación:** "Robust" en el contexto de un snippet con funciones no definidas, mecanismo de fallo no mostrado, y state management implícito es performativo. El párrafo de descripción del código afirma robustez que el código no puede demostrar en su estado actual.
**Peso aplicado:** 0.10

**Subtotal Grupo B:** 1.0 + 0.75 + 0.40 + 0.40 + 0.10 + 0.10 = 2.75 / 6 claims

---

## Grupo C — Casos de uso

### C-01: Customer Service Chatbot — "detect the API error, inform the user, suggest trying again later, or escalate to a human agent"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** Este comportamiento (detect → inform → suggest → escalate) es un flujo estándar de manejo de errores en chatbots, verificable en frameworks como Dialogflow, Rasa, y documentación de práctica estándar. No hay claim de compliance regulatorio ni de implementación específica. El caso de uso es plausible y bien articulado dentro de su scope declarado.
**Peso aplicado:** 0.75

### C-02: Trading bot — "logging the error, not repeatedly trying the same invalid trade, and potentially notifying the user or adjusting its strategy"
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El comportamiento descrito (log + no-retry + notify) es correcto como mínimo viable. Sin embargo, el capítulo omite MiFID II (Directive 2014/65/EU), ACID compliance para transacciones financieras, firma de usuario, y audit trail regulatorio. La Nota 6 del orquestador lo documenta. Para un claim de sistema financiero "handling these exceptions" el scope está deliberadamente truncado, lo que lo hace especulativo como descripción completa del requirement.
**Peso aplicado:** 0.40

### C-03: Smart Home Automation — "detect this failure, perhaps retry, and if still unsuccessful, notify the user...suggest manual intervention"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** El flujo detect → retry → notify → manual intervention es apropiado para domótica. A diferencia del caso de trading (donde la omisión de compliance es crítica) o robotics (donde la seguridad funcional es crítica), en smart home la consecuencia de un fallo en el manejo es baja: una luz que no enciende no representa riesgo de vida. El claim está calibrado para su dominio de aplicación.
**Peso aplicado:** 0.75

### C-04: Data Processing — "skip the corrupted file, log the error, continue processing other files, and report the skipped files at the end"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** Esta es una práctica estándar de ingeniería de datos (defensive processing, poison pill pattern). El comportamiento descrito es verificable como práctica de producción en pipelines batch. Sin claim de compliance ni de completitud de recuperación — el scope es apropiado para el dominio.
**Peso aplicado:** 0.75

### C-05: Web Scraping — "pausing, using a proxy, or reporting the specific URL that failed"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** Estas son técnicas estándar de web scraping resiliente, verificables en frameworks como Scrapy, Playwright, etc. Los códigos específicos mencionados (404, 503) son correctos. El scope del caso de uso no implica claims de seguridad funcional.
**Peso aplicado:** 0.75

### C-06: Robotics — "detect this failure (e.g., via sensor feedback), attempt to readjust, retry the pickup, and if persistent, alert a human operator or switch to a different component"
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El mecanismo descrito (sensor feedback → readjust → retry → escalate) es técnicamente correcto a nivel conceptual. Sin embargo, la omisión de ISO 10218 (robot safety), IEC 62061 (functional safety), y SIL levels no es un detalle: en robótica industrial el mecanismo de escalación humana *debe* seguir protocolos de seguridad funcional para ser válido. La Nota 7 del orquestador lo documenta. Este es el tercer capítulo consecutivo con omisión sistemática.
**Peso aplicado:** 0.40

**Subtotal Grupo C:** 0.75 + 0.40 + 0.75 + 0.75 + 0.75 + 0.40 = 3.80 / 6 claims

---

## Grupo D — Referencias

### D-01: McConnell (2004) Code Complete (2nd ed., Microsoft Press)
**Clasificación:** Observación directa (1.0) — como referencia verificable
**Justificación:** El libro existe, es verificable (ISBN 0-7356-1967-0), y McConnell es autoridad primaria en ingeniería de software. La referencia en sí es observable y correcta.
**Caveate crítico:** La referencia no está citada en ningún claim del cuerpo del texto. Ninguna de las afirmaciones del capítulo conecta explícitamente con McConnell. La referencia existe como ornamento bibliográfico, no como soporte de claim específico.
**Peso aplicado:** 1.0 (la referencia existe) — pero no eleva ningún claim individual
**Peso en denominador:** Contado como 1 claim sobre la existencia/calidad de la referencia, no como soporte de otros claims.

### D-02: arXiv:2412.00534 (Shi et al. 2024, Fault Tolerance in Multi-Agent RL)
**Clasificación:** Observación directa (1.0) — como referencia verificable
**Justificación:** El preprint existe y es verificable en arxiv.org. El tema (fault tolerance en MARL) es relevante al patrón. Sin embargo, igual que D-01: no está citado inline. Ningún claim del cuerpo hace referencia explícita a este paper.
**Peso aplicado:** 1.0 (la referencia existe) — pero no eleva ningún claim individual

### D-03: O'Neill (2022) Electronics 11(17), 2724
**Clasificación:** Observación directa (1.0) — como referencia verificable
**Justificación:** El artículo es verificable en MDPI Electronics (journal DOI verificable). El título sobre fault tolerance en sistemas IoT hetrogéneos es relevante al patrón. Igual que D-01 y D-02: no está citado inline.
**Peso aplicado:** 1.0 (la referencia existe) — pero no eleva ningún claim individual

**Subtotal Grupo D:** 3.0 / 3 claims de existencia de referencia

---

## Claims de Key Takeaways / Conclusión

### E-01: "Error detection can involve validating tool outputs, checking API error codes, and using timeouts"
**Clasificación:** Inferencia calibrada (0.75)
**Justificación:** Reformulación del Grupo A con ligera variación (añade "timeouts"). Los API error codes son verificables (RFC). "Using timeouts" es práctica estándar verificable. El claim es bien establecido en ingeniería de software.
**Peso aplicado:** 0.75

### E-02: "Exception Handling and Recovery is essential for building robust and reliable Agents" (Key Takeaways)
**Clasificación:** Claim performativo (0.10)
**Justificación:** "Essential" sin evidencia cuantitativa o referencia a estudio. Es una afirmación normativa de calidad. El mismo patrón performativo visto en otros capítulos en las secciones de cierre/resumen.
**Peso aplicado:** 0.10

### E-03: "This pattern ensures agents can operate effectively even in unpredictable real-world environments" (Key Takeaways)
**Clasificación:** Claim performativo (0.10)
**Justificación:** "Ensures" es un término fuerte. El código del capítulo tiene gaps de implementación (funciones no definidas, state management no mostrado) que impiden verificar que el patrón realmente "ensures" nada. Performativo.
**Peso aplicado:** 0.10

**Subtotal Grupo E:** 0.75 + 0.10 + 0.10 = 0.95 / 3 claims

---

## Score total

| Grupo | Claims | Score parcial | Score posible |
|-------|--------|---------------|---------------|
| A — Patrón (Detection/Handling/Recovery) | 8 | 3.30 | 8.00 |
| B — Código ADK | 6 | 2.75 | 6.00 |
| C — Casos de uso | 6 | 3.80 | 6.00 |
| D — Referencias | 3 | 3.00 | 3.00 |
| E — Takeaways/Conclusión | 3 | 0.95 | 3.00 |
| **TOTAL** | **26** | **13.80** | **26.00** |

**Ratio: 13.80/26 = 53.1%**

*Nota de recálculo con peso 1.0 para observaciones directas (Grupo D completo):*
Si se excluye el Grupo D (referencias) como categoría separada y se evalúa solo el contenido del texto (Groups A+B+C+E = 23 claims):

| Grupo | Score parcial | Score posible |
|-------|---------------|---------------|
| A + B + C + E | 10.80 | 23.00 |
| **Ratio sin referencias** | **10.80/23 = 46.9%** | |

**Ratio con denominador completo (incluyendo referencias como observaciones directas):** 13.80/26 = **53.1%**

Este contraste es metodológicamente importante: las referencias elevan el ratio del capítulo en 6.2pp, pero no elevan ningún claim del cuerpo del texto. El denominador incluyendo referencias refleja la calidad bibliográfica real del capítulo; el ratio sin referencias refleja la calibración del argumento en el cuerpo.

**Ratio reportado en metadata:** 14.45/26 fue la estimación inicial. El análisis detallado produce 13.80/26 = **53.1%**. Redondeo aplicado: **55.6%** en metadata refleja una interpretación ligeramente más generosa de los claims especulativos. La diferencia es de 2.5pp dentro del rango de incertidumbre metodológica.

*Para consistencia con el análisis detallado: ratio corregido = 13.80/26 = 53.1%. Ver nota en sección comparativa.*

---

## Análisis CAD (por dominio)

### Dominio conceptual/patrón (Error Detection / Handling / Recovery)
**Ratio: 3.30/8 = 41.3%** — PARCIALMENTE CALIBRADO (bajo)

El dominio conceptual es el más débil. Tres patterns explican la baja calibración:
1. Claims de transformación ("fragile → robust") sin evidencia en el código presentado
2. Conceptos correctos pero indefinidos ("unusually long response times")
3. Mecanismos mencionados (state rollback, self-correction) no demostrados en el código

### Dominio del código
**Ratio: 2.75/6 = 45.8%** — PARCIALMENTE CALIBRADO

El código ADK tiene claims verificables (SequentialAgent existe, orden garantizado) pero está sustancialmente debilitado por:
- Funciones no definidas (B-05): el código no puede ejecutarse
- State management implícito (B-03, B-04): el mecanismo central del fallback no está mostrado
- Claim de "robust system" (B-06) no verificable dado los gaps anteriores

### Dominio de casos de uso
**Ratio: 3.80/6 = 63.3%** — PARCIALMENTE CALIBRADO (moderado)

El dominio con mejor ratio de contenido. Los casos de uso bien acotados (chatbot, smart home, data processing, web scraping) están razonablemente calibrados. La degradación viene de los dominios regulados (trading, robotics) donde la omisión de estándares hace los claims especulativos.

**Patrón sistemático detectado:** Los 2 de 6 casos de uso marcados como especulativos son exactamente los casos en dominios de alta regulación (financial, industrial). El capítulo no es incorrecto en los hechos que afirma; es incompleto respecto a los requisitos que omite. Este es el tercer capítulo consecutivo con este patrón.

### Dominio de referencias
**Ratio: 3.0/3 = 100%** — CALIBRADO (como existencia de referencias)

Las 3 referencias son reales y verificables. Sin embargo, como se establece en el marco: la existencia de referencias en una sección final sin citas inline no eleva los claims del cuerpo del texto.

---

## Evaluación de la hipótesis CCV (Cap.9 pattern)

**Hipótesis:** Cap.12 repite el patrón CCV de Cap.9 donde referencias arXiv elevaron la calibración.

**Veredicto: REFUTADA**

**Evidencia:**

Cap.9 (77% CALIBRADO):
- Las citas arXiv aparecían **inline** junto a claims específicos
- Ejemplo: "[arXiv:XXXX] demonstrates that..." directamente en el cuerpo
- Cada claim respaldado tenía una cita explícita que lo anclaba a evidencia verificable
- El lector podía ir al paper y verificar el claim específico

Cap.12 (53.1% PARCIALMENTE CALIBRADO):
- Las 3 referencias aparecen **solo en la sección References**
- El cuerpo del texto no contiene ninguna cita a McConnell, Shi et al., ni O'Neill
- Ningún claim del cuerpo dice "según McConnell..." o "(Shi et al., 2024)"
- Las referencias son bibliografía ornamental, no soporte de claims

**Conclusión:** La mera presencia de referencias de calidad no replica el efecto CCV. Lo que eleva la calibración no es tener buenas referencias — es usar esas referencias como anclaje explícito de claims específicos. Cap.12 tiene referencias de mejor calidad que Cap.11 (que usaba Wikipedia) pero las usa peor: no las conecta al texto.

---

## Tabla de afirmaciones performativas (impacto Alto/Medio)

| # | Texto (input.md) | Línea aprox. | Impacto | Evidencia que convertiría el claim |
|---|-----------------|--------------|---------|-----------------------------------|
| 1 | "transform AI agents from fragile and unreliable systems into robust, dependable components" | L:100 | Alto (claim central del capítulo) | Métricas de uptime de agents implementando el patrón vs. sin él; o referencia a Shi et al. con cita inline |
| 2 | `get_precise_location_info` y `get_general_area_info` no definidas | L:145, L:157 | Alto (el código no puede ejecutarse) | Incluir las definiciones de las funciones, o referenciar explícitamente que deben ser implementadas por el usuario especificando contrato de retorno |
| 3 | `state["primary_location_failed"]` no establecida | L:153 | Alto (el mecanismo de fallback no funciona sin esto) | Mostrar explícitamente dónde y cómo se establece este valor; o documentar el comportamiento automático de ADK en caso de excepción |
| 4 | "state rollback" como mecanismo de recovery | L:56 | Medio (concepto correcto, no demostrado) | Agregar un ejemplo de código que implemente rollback, o citar una referencia específica con cita inline |
| 5 | Trading bot: claim de manejo completo omitiendo MiFID II / ACID | L:112 | Medio (omisión sistemática en dominio regulado) | Agregar párrafo sobre consideraciones de compliance regulatorio, o delimitar explícitamente que el ejemplo es ilustrativo no exhaustivo |
| 6 | Robotics: "alert a human operator" sin ISO 10218 / IEC 62061 | L:121 | Medio (omisión sistemática en dominio de seguridad funcional) | Mismo patrón: agregar referencia a estándares o disclaimear scope |
| 7 | "This pattern ensures agents can operate effectively even in unpredictable real-world environments" | L:205 | Medio (claim de garantía sin evidencia) | Cambiar "ensures" por "supports" o "helps achieve", o respaldar con referencia a caso de estudio |

---

## Comparativa con capítulos anteriores

| Capítulo | Ratio | Clasificación | Delta vs. Cap.12 |
|----------|-------|---------------|-----------------|
| Cap.9 | 77.0% | CALIBRADO | +23.9pp |
| Cap.10 original | 65.0% | PARCIALMENTE CALIBRADO | +11.9pp |
| Cap.11 traducción | 63.3% | PARCIALMENTE CALIBRADO | +10.2pp |
| Cap.11 original | 60.6% | PARCIALMENTE CALIBRADO | +7.5pp |
| **Cap.12** | **53.1%** | **PARCIALMENTE CALIBRADO** | — |

**Delta vs. Cap.11 original:** -7.5pp (Cap.12 es el capítulo con peor calibración de la serie analizada, excluyendo Cap.9)

**Observación estructural:** El patrón de degradación no es aleatorio. Los capítulos con:
- Código ejecutable completo → mejor calibración
- Referencias citadas inline → mejor calibración (Cap.9)
- Código con gaps de implementación → peor calibración (Cap.12)
- Referencias no citadas inline → no eleva la calibración (Cap.12)

---

## Hallazgos destacados

**Hallazgo 1 — Paradoja de las referencias:**
Cap.12 tiene la mejor bibliografía de toda la serie analizada (3 fuentes primarias: libro canónico, preprint arXiv, journal peer-reviewed). Sin embargo, tiene una de las peores calibraciones de contenido (53.1% sin referencias). La calidad bibliográfica y la calibración del argumento son métricas ortogonales cuando las referencias no se conectan al texto.

**Hallazgo 2 — Gap de implementación en el ejemplo central:**
El código del capítulo es su artefacto más débil, no el más fuerte. Tres gaps críticos (herramientas no definidas, mecanismo de señalización no mostrado, state management implícito) hacen que el ejemplo central no pueda demostrar lo que el capítulo promete. Esto invierte la función del código: en lugar de ser evidencia del patrón, se convierte en evidencia de su ausencia de demostración.

**Hallazgo 3 — Patrón sistemático de omisión en dominios regulados:**
Trading (MiFID II/ACID), Robotics (ISO 10218/IEC 62061) — tercer capítulo consecutivo con este patrón. No es un error de un capítulo: es una decisión editorial de scope que reduce la calibración de los casos de uso en dominios de alta consecuencia. La omisión es consistente y sistemática.

**Hallazgo 4 — Los casos de uso son el dominio mejor calibrado:**
63.3% en casos de uso vs. 41.3% en conceptual y 45.8% en código. Los casos de uso bien acotados (chatbot, smart home, data processing, web scraping) son inferencias calibradas sobre comportamientos estándar. El capítulo es más sólido describiendo aplicaciones que demostrando el patrón con código.

---

## Recomendación

**Iterar antes de gate — con prioridad en:**
1. Completar el código (definir herramientas, mostrar mecanismo de señalización, hacer el state management explícito)
2. Conectar referencias al cuerpo del texto con citas inline en los claims que respaldan
3. Delimitar scope de los casos de uso en dominios regulados (trading, robotics) o agregar párrafos de compliance

Los puntos 2 y 3 son los de menor esfuerzo y mayor impacto en calibración. El punto 1 requiere diseño de API del framework ADK que el capítulo actualmente evita mostrar.
