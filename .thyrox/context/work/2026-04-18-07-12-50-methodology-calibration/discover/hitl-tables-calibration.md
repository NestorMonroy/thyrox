```yml
created_at: 2026-04-19 10:50:14
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Chapter 13: Human in the Loop — tablas suplementarias (technical_support_agent)" (documento externo, 2026-04-19)
ratio_calibración: 13.90/18 (77.2%)
clasificación: CALIBRADO
delta_vs_cap13_loan: +26.6pp
delta_vs_cap11_tablas: +5.3pp
```

# Calibración — Cap.13 tablas: technical_support_agent

## Ratio de calibración: 13.90/18 (77.2%)
## Clasificación: CALIBRADO
## Umbral gate (75%): ALCANZADO

---

## Marco de scores aplicado

| Tipo | Score |
|------|-------|
| Observación directa (verificable en snippet, sin ejecutar) | 1.0 |
| Inferencia calibrada fuerte (API pública documentada + hedging) | 0.85 |
| Inferencia calibrada moderada (razonamiento implícito sin hedging) | 0.65 |
| Inferencia especulativa (posible, depende de runtime o versión exacta) | 0.40 |
| Claim performativo (afirma calidad sin derivarla) | 0.10 |

---

## Grupo A — Imports y estructura (6 claims)

### A-01: `from google.adk.agents import Agent`
**Texto:** Línea 1 del snippet
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** `Agent` como clase principal de ADK es coherente con el framework público. Sin embargo, la Nota 4 del input establece que los paths de import pueden diferir entre versiones — el loan agent usaba un path diferente para `CallbackContext` en el mismo capítulo. Sin especificar la versión exacta de ADK, el path es plausible pero no verificado. No se degrada a especulativo porque `Agent` es el punto de entrada canónico del framework.

### A-02: `from google.adk.callbacks import CallbackContext`
**Texto:** Línea 3 del snippet
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** La Nota 4 del input documenta que el loan agent usaba `from google.adk.agents.callback_context import CallbackContext` — un path diferente para la misma clase dentro del mismo capítulo. Este path alternativo puede ser correcto si la clase fue movida entre versiones, o incorrecto si el ejemplo fue escrito contra una versión distinta. La inconsistencia interna al capítulo impide elevar el score sin conocer la versión exacta de ADK.

### A-03: `from google.adk.models.llm import LlmRequest`
**Texto:** Línea 4 del snippet
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** El namespace `models.llm` es estructuralmente coherente para una clase que representa la request al LLM en ADK. El objeto `LlmRequest` es usado correctamente como tipo de parámetro en `personalization_callback`. Sin ejecutar contra una versión fija de ADK, el path es plausible pero no verificado.

### A-04: `from google.adk.tools.tool_context import ToolContext` — importado pero no usado
**Texto:** Línea 2 del snippet
**Clasificación:** Observación directa (1.0)
**Justificación:** `ToolContext` aparece en el import pero no existe ninguna referencia al nombre `ToolContext` en el resto del snippet (ni en anotaciones de tipo, ni en cuerpos de función, ni como default). Dead import verificable sin ejecutar. Patrón idéntico al de Cap.14 con `RunnablePassthrough` y Cap.11 con `to_snake_case` (Nota 5 del input).

### A-05: `from google.genai import types` — correcto
**Texto:** Línea 5 del snippet
**Clasificación:** Inferencia calibrada fuerte (0.85)
**Justificación:** `google.genai` es el SDK oficial de Google Generative AI. El namespace `types` para `Content` y `Part` es consistente con la API pública documentada de `google-generativeai`. Esta es una importación verificable independientemente de la versión específica de ADK — el SDK de `genai` es un paquete separado con documentación pública. No llega a 1.0 porque no se ha ejecutado contra la API real.

### A-06: `from typing import Optional` — correcto
**Texto:** Línea 6 del snippet
**Clasificación:** Observación directa (1.0)
**Justificación:** Stdlib de Python. `Optional[LlmRequest]` como tipo de retorno en la firma `-> Optional[LlmRequest]` es sintácticamente correcto. Verificable sin ejecutar.

**Subtotal Grupo A: 0.65 + 0.40 + 0.65 + 1.0 + 0.85 + 1.0 = 4.55 / 6 = 75.8%**

---

## Grupo B — Funciones herramienta (4 claims)

### B-01: `troubleshoot_issue` devuelve stub con f-string — calibrado como demostración
**Texto:** Líneas 36–37 del snippet; comentario `# Placeholder for tools (replace with actual implementations if needed)`
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** El stub es observable directamente. El comentario del autor reconoce explícitamente el carácter provisional con "replace with actual implementations if needed". La etiqueta "Placeholder" es honesta sobre el gap. El score no llega a 0.85 porque el agente registra la función como tool operativa y el LLM la invocará como si funcionara — la distinción placeholder/producción no está expuesta al modelo.

### B-02: `create_ticket` retorna `"ticket_id": "TICKET123"` hardcodeado — bug de implementación
**Texto:** Líneas 39–40 del snippet
**Clasificación:** Observación directa (1.0)
**Justificación:** El string literal `"TICKET123"` es directamente observable en el código. La Nota 8 del input establece correctamente que en un sistema que crea múltiples tickets en la misma sesión, todos retornarían el mismo ID — el LLM no podría distinguirlos. A diferencia de los stubs de `troubleshoot_issue` y `escalate_to_human` (que retornan datos genéricos), `create_ticket` retorna un identificador concreto que debería ser único. El claim "es un bug de implementación más problemático que un stub genérico" es verificable en el código.

### B-03: `escalate_to_human` retorna `success` sin bloqueo, comentario admite placeholder
**Texto:** Líneas 42–44 del snippet; comentario `# This would typically transfer to a human queue in a real system`
**Clasificación:** Inferencia calibrada moderada (0.65)
**Justificación:** El comportamiento observable (retorna inmediatamente con `{"status": "success"}`, sin loop de espera, sin bloqueo del workflow) contradice la implementación real de HITL. El comentario reconoce explícitamente el gap ("would typically transfer... in a real system"). Este score es paralelo al B-09 del loan agent (0.65): el reconocimiento in-code es honesto aunque parcial. La diferencia con el loan agent es que no hay narración externa contradictoria que afirme que esto es un HITL completo.

### B-04: Las 3 funciones herramienta están definidas
**Texto:** Líneas 36–44 del snippet
**Clasificación:** Observación directa (1.0)
**Justificación:** `troubleshoot_issue`, `create_ticket`, `escalate_to_human` están definidas con `def` y `return` statements. Verificable directamente, sin ejecutar. Contraste positivo con Cap.12 donde las funciones no estaban definidas en el snippet.

**Subtotal Grupo B: 0.65 + 1.0 + 0.65 + 1.0 = 3.30 / 4 = 82.5%**

---

## Grupo C — Agent definition (3 claims)

### C-01: `Agent(name=..., model="gemini-2.0-flash-exp", instruction=..., tools=[...])` — API ADK verificable
**Texto:** Líneas 46–61 del snippet
**Clasificación:** Inferencia calibrada fuerte (0.85)
**Justificación:** La firma `Agent(name, model, instruction, tools)` es la API pública de ADK documentada. `gemini-2.0-flash-exp` es un model ID de Gemini verificable en la documentación de Google AI. Los parámetros corresponden con el contrato público del constructor. No llega a 1.0 porque no se ha ejecutado contra una instancia real del framework.

### C-02: La instrucción incluye lógica de escalación — el LLM puede interpretar "complex issues beyond basic troubleshooting"
**Texto:** Líneas 54–57 del snippet (instrucción del agente): "For complex issues beyond basic troubleshooting: 1. Use escalate_to_human"
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** La decisión de escalar está completamente delegada a la interpretación del LLM del criterio "complex issues beyond basic troubleshooting". No hay threshold determinístico, no hay condición cuantificable, no hay interrupt pattern real. El LLM puede interpretar "complex" de forma demasiado conservadora (escala todo) o demasiado permisiva (nunca escala). La Nota 6 del input confirma el anti-patrón. Score 0.40 por ser un claim plausible sobre capacidad del LLM pero sin validación del comportamiento real.

### C-03: `state["customer_info"]["support_history"]` referenciado en instrucción pero no inicializado en snippet
**Texto:** Línea 51 del snippet (instrucción): `state["customer_info"]["support_history"]`; ausencia de inicialización en el código
**Clasificación:** Observación directa (1.0)
**Justificación:** La instrucción contiene la referencia explícita. El snippet no muestra código que inicialice `customer_info` en el estado. La Nota 9 del input confirma que si `customer_info` es `None`, el callback hace early return silencioso — sin error ni advertencia. La ausencia de inicialización es verificable directamente en el snippet presentado.

**Subtotal Grupo C: 0.85 + 0.40 + 1.0 = 2.25 / 3 = 75.0%**

---

## Grupo D — personalization_callback (5 claims)

### D-01: Tipo de retorno `Optional[LlmRequest]` — correcto declarativamente
**Texto:** Línea 65 del snippet: `-> Optional[LlmRequest]:`
**Clasificación:** Observación directa (1.0)
**Justificación:** La declaración `Optional[LlmRequest]` es sintácticamente correcta para una función que puede retornar `LlmRequest` o `None`. El tipo es consistente con el contrato del callback en ADK (que define `before_model_callback` como `Optional[LlmRequest]`). Verificable sin ejecutar. La declaración es correcta aunque la implementación no la use apropiadamente (D-02, D-04).

### D-02: `return None  # Return None to continue with the modified request` — el comentario documenta el bug
**Texto:** Línea 86 del snippet (exacta): `return None  # Return None to continue with the modified request`
**Clasificación:** Observación directa (1.0)
**Justificación:** El texto del comentario es directamente observable. La Nota 2 del input establece el contrato ADK: retornar `None` continúa con el request original (posiblemente sin las modificaciones si ADK hace deepcopy). El comentario afirma que retornar `None` propaga la modificación — esto es incoherente con el contrato si se hace deepcopy. La inconsistencia entre el comentario y el contrato documentado es verificable sin ejecutar. Este bug es más grave que el del loan agent: el loan agent no tenía `return` statement (retornaba `None` implícitamente sin comentar el contrato); este código incluye el `return None` con un comentario que documenta explícitamente la confusión sobre el contrato.

### D-03: `types.Content(role="system", ...)` insertado en `contents` — rol potencialmente inválido en Gemini/ADK
**Texto:** Líneas 82–85 del snippet
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** La Nota 3 del input establece que en Gemini/ADK, `contents` acepta roles "user" y "model"; el rol "system" se configura via `system_instruction`. Sin ejecutar el código no se puede verificar si esta inserción genera `InvalidArgument`, es silenciosamente ignorada, o es aceptada en alguna versión. Score idéntico al B-02 del loan agent (0.40): la documentación de la API sugiere que "system" no es un rol válido en `contents`, pero el comportamiento exacto requiere ejecución para confirmarse.

### D-04: La modificación in-place de `llm_request.contents` no se propaga con `return None` si ADK hace deepcopy
**Texto:** Líneas 85–86 del snippet: `.insert(0, system_content)` seguido de `return None`
**Clasificación:** Inferencia especulativa (0.40)
**Justificación:** El comportamiento depende de si ADK hace deepcopy del request antes de invocar el callback. Si hace deepcopy: la modificación in-place se descarta (bug crítico). Si pasa referencia: se propaga (comportamiento correcto pero frágil). Sin el código fuente de ADK o sin ejecutarlo, no se puede determinar cuál es el caso. La incertidumbre es real y material — afecta si el mecanismo de personalización funciona o no.

### D-05: `personalization_callback` no conectada al agente en el snippet
**Texto:** Líneas 46–61 (Agent definition) y líneas 63–86 (definición del callback) — ausencia de `before_model_callback=personalization_callback` en el constructor
**Clasificación:** Observación directa (1.0)
**Justificación:** El constructor de `technical_support_agent` no incluye el parámetro `before_model_callback`. El callback está definido pero no registrado en el agente en el código presentado. Esta diferencia vs. el loan agent (donde la conexión sí aparecía) hace que el mecanismo de personalización esté definido pero inactivo según el snippet. Verificable directamente sin ejecutar.

**Subtotal Grupo D: 1.0 + 1.0 + 0.40 + 0.40 + 1.0 = 3.80 / 5 = 76.0%**

---

## Resumen de claims performativos / especulativos de alto impacto

| # | Texto (claim) | Ubicación | Impacto | Score | Evidencia propuesta |
|---|---------------|-----------|---------|-------|---------------------|
| 1 | Decisión de escalar delegada al LLM ("complex issues beyond basic troubleshooting") | Instrucción agente, L.54 | Alto | 0.40 | Test: ejecutar con N escenarios de dificultad gradual y medir frecuencia de escalación; o reemplazar con criterio determinístico |
| 2 | `return None` propaga la modificación in-place (comentario del bug) | L.86 | Alto | 1.0 (bug observable) | Corregir: `return llm_request`; verificar con test que el contenido insertado llega al modelo |
| 3 | `types.Content(role="system", ...)` aceptado en `contents` | L.82–85 | Alto | 0.40 | Ejecutar snippet y verificar ausencia de `InvalidArgument`; o cambiar a `system_instruction` |
| 4 | Modificación in-place se propaga con `return None` | L.85–86 | Alto | 0.40 | Leer código fuente ADK del dispatcher del callback, o ejecutar y inspeccionar el request recibido por el modelo |
| 5 | Path `from google.adk.callbacks import CallbackContext` correcto | L.3 | Medio | 0.40 | Fijar versión ADK en requirements.txt y verificar import; contrastar con path del loan agent |

---

## Análisis CAD por dominio

### Dominio: imports y estructura
Ratio: 4.55/6 = **75.8%**

El punto fuerte es que los imports son mayoritariamente coherentes y verificables estructuralmente. El punto débil es la inconsistencia de paths entre los dos ejemplos del mismo capítulo (A-02 = 0.40) y el dead import de `ToolContext` (identificado como observación directa del problema, no del claim de corrección). La inconsistencia interna es una señal de que el código fue escrito contra versiones diferentes o sin un proceso de verificación unitario.

### Dominio: funciones herramienta
Ratio: 3.30/4 = **82.5%**

El grupo más sólido del snippet. Las funciones están definidas (mejora vs. Cap.12), el comentario "Placeholder" es honesto, y `escalate_to_human` reconoce su carácter provisional. El único punto de degradación real es `TICKET123` hardcodeado (B-02 = 1.0 como observación del bug, no como validación del comportamiento). El código de herramientas es más calibrado que el del loan agent precisamente porque los comentarios son más honestos sobre sus limitaciones.

### Dominio: definición del agente
Ratio: 2.25/3 = **75.0%**

La API de `Agent` es verificable (C-01 = 0.85). El estado no inicializado (C-03 = 1.0) es una observación directa del problema. La debilidad es C-02 (0.40): delegar la decisión de escalación al LLM sin criterio determinístico es el anti-patrón HITL central del capítulo — el agente no implementa HITL real, implementa un agente que puede opcionalmente escalar si el LLM lo decide.

### Dominio: personalization_callback
Ratio: 3.80/5 = **76.0%**

Paradójicamente el grupo más calibrado en términos de observabilidad directa: el bug es directamente observable (D-02 = 1.0), la declaración de tipo es correcta (D-01 = 1.0), y la desconexión del callback es observable (D-05 = 1.0). Los scores bajos (D-03, D-04 = 0.40) reflejan genuina incertidumbre sobre el runtime de ADK — no realismo performativo, sino incertidumbre real que no puede resolverse sin ejecutar el código o leer el fuente de ADK.

---

## Por qué este snippet tiene mayor calibración que el loan agent (50.6%)

La diferencia de +26.6pp no refleja que el código sea mejor — refleja que el dominio del análisis es diferente:

**El loan agent (EPUB) incluía:**
- 27 claims en 4 grupos heterogéneos (conceptual, código, casos de uso, referencias)
- El grupo conceptual (Grupo A, 8 claims) tenía varios claims performativos sobre beneficios del patrón sin demostración (A-03 "clear lines of accountability", A-04 "continuous improvement") que pesaban hacia abajo
- El grupo de casos de uso (7 claims) incluía afirmaciones sobre "ensures legal validity", "ensures human compassion informs the outcome" — inferencias especulativas
- La narración externa del capítulo hacía afirmaciones como "complete audit trail" contradiciéndose con el código

**Este snippet (tablas, technical_support_agent) incluye:**
- 18 claims en código puro, sin narración externa de beneficios
- Los claims son mayoritariamente sobre lo que el código hace o no hace — verificable
- Los bugs son observables directamente (D-02, D-05) o especulativos por incertidumbre técnica real (D-03, D-04) — no performativos
- Los comentarios del autor son más honestos ("Placeholder", "would typically transfer... in a real system") vs. la narración externa que afirmaba "complete audit trail"

**Conclusión metodológica:** El código de tablas tiene mayor calibración porque el código puro tiene más claims verificables que los párrafos narrativos. Esto confirma y extiende la hipótesis de Cap.11 (71.9% tablas vs. texto más bajo): **el código eleva la calibración porque sus claims son observaciones directas o inferencias técnicas, no afirmaciones de calidad normativas**.

---

## Bugs adicionales vs. loan agent (impacto en calibración comparativa)

| Bug | loan agent | technical_support_agent | Delta |
|-----|------------|------------------------|-------|
| `return None` en callback | Implícito (sin return statement) — score 0.50 en B-01 | Explícito con comentario que documenta la confusión — score 1.0 como observación del bug (D-02) | El bug es más grave pedagógicamente pero más calibrado analíticamente: la evidencia es directa |
| `types.Content(role="system", ...)` | B-02 = 0.40 | D-03 = 0.40 | Sin diferencia en score |
| Dead import | No presente en loan agent | A-04 = 1.0 (observación directa) | El dead import es observable; contribuye positivamente al ratio porque es un claim verificable |
| `TICKET123` hardcodeado | No presente | B-02 = 1.0 (observación del bug) | Contribuye positivamente al ratio porque es verificable |
| Callback no conectada al agente | Loan agent sí conectaba el callback | D-05 = 1.0 (observación directa de ausencia) | Contribuye positivamente al ratio |

---

## Comparación histórica actualizada

| Artefacto | Ratio | Clasificación | Nota |
|-----------|-------|---------------|------|
| Cap.9 | 77.0% | CALIBRADO | Baseline alto — referencias inline |
| Cap.10 original | 65.0% | PARCIALMENTE CALIBRADO | — |
| Cap.11 traducción | 63.3% | PARCIALMENTE CALIBRADO | — |
| Cap.11 original | 60.6% | PARCIALMENTE CALIBRADO | — |
| Cap.11 tablas | 71.9% | PARCIALMENTE CALIBRADO | Código eleva calibración |
| Cap.12 | 53.1% | PARCIALMENTE CALIBRADO | — |
| Cap.13 loan agent (EPUB) | 50.6% | PARCIALMENTE CALIBRADO | Narración normativa baja calibración |
| **Cap.13 tablas (technical_support_agent)** | **77.2%** | **CALIBRADO** | **Solo código — claims verificables** |

---

## Nota sobre completitud del input

El input `hitl-tables-input.md` contiene el código completo del snippet (86 líneas) preservado verbatim y 10 notas editoriales del orquestador. No se detectan señales de compresión: el código está íntegro, las notas son completas, no hay secciones con "...". El análisis cubre la totalidad del input disponible. Las notas editoriales proveen contexto verificable que informa la clasificación de claims especulativos (Notas 2, 3, 4, 9).

**Advertencia:** Este snippet es complementario al análisis del loan agent. El capítulo 13 como unidad completa incluye también el texto narrativo del EPUB (27 claims, 50.6%) y este suplemento de tablas (18 claims, 77.2%). La calibración global del capítulo como documento publicado está más próxima a la del loan agent — el texto narrativo es el que el lector consume como contexto, el código de tablas es el que el lector implementa. La disociación entre calibración del texto (50.6%) y calibración del código de tablas (77.2%) confirma el patrón sistémico: el capítulo afirma más de lo que demuestra en la narración, pero el código por sí mismo es más honesto sobre sus limitaciones.

---

## Recomendación

**Alcanza gate (75%). El código de tablas puede usarse como referencia de implementación con las correcciones indicadas.**

Acciones mínimas antes de usar en producción (no para calibración del análisis, sino para corrección del código):

1. **Conectar `personalization_callback` al agente** vía `before_model_callback=personalization_callback` en el constructor de `Agent`. Sin esto, toda la personalización está inactiva. Impacto: D-05 representa una desconexión silenciosa no documentada.

2. **Corregir `return None` → `return llm_request`** en `personalization_callback`. Esto resuelve la ambigüedad de D-04 y la confusión documentada en D-02.

3. **Reemplazar `TICKET123` con generación dinámica** (e.g., `uuid.uuid4().hex[:8]`). El ticket hardcodeado (B-02) haría que el agente retorne el mismo ID para tickets distintos.

4. **Inicializar `customer_info` en el estado** antes de invocar el agente, o agregar documentación sobre el contrato de inicialización (C-03).

5. **Eliminar el import de `ToolContext`** si no se usa. Dead import sin consecuencia funcional pero indicador de calidad de código (A-04).
