```yml
created_at: 2026-04-19 11:16:42
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# Calibración adversarial — Chapter 18: Guardrails & Safety Patterns

---

## Ratio de calibración global: 43/67 (64.2%)

## Clasificación: PARCIALMENTE CALIBRADO

**Zona de riesgo:** ratio entre 53.1% (Cap.13) y 74.0% (Cap.15). Por encima del threshold mínimo de exploración (≥0.50) pero por debajo del threshold de gate (≥0.75). El capítulo tiene el código más robusto de la serie — sus caídas de calibración vienen de secciones conceptuales, no del código.

---

## CAD Breakdown — Calibración por dominio

| Dominio | Claims obs/total | Ratio | Estado |
|---------|-----------------|-------|--------|
| Código técnico (CrewAI) | 21/24 | 87.5% | CALIBRADO |
| Código técnico (ADK) | 8/9 | 88.9% | CALIBRADO |
| Conceptual/introductorio | 6/16 | 37.5% | REALISMO PERFORMATIVO |
| Engineering Reliable Agents | 5/12 | 41.7% | REALISMO PERFORMATIVO |
| At a Glance / Key Takeaways / Conclusion | 3/6 | 50.0% | BORDERLINE |
| Referencias | 0/0 | N/A | No aplica (sin claims inline) |

**Regla CAD:** min domain ≥ 0.60 para CALIBRADO global. Dominios "Conceptual/introductorio" y "Engineering Reliable Agents" están por debajo — esto explica el veredicto PARCIALMENTE CALIBRADO a pesar de que el código es el mejor de la serie.

---

## Tabla de claims por dominio

### Dominio 1: Código técnico — CrewAI (24 claims)

| # | Claim | Línea input | Score | Tipo | Notas |
|---|-------|-------------|-------|------|-------|
| C1 | `logging.basicConfig(level=logging.ERROR, ...)` está en el código | L:115 | 1.0 | Observación directa | Verificable: texto literal |
| C2 | `logging.info("GOOGLE_API_KEY environment variable is set.")` sigue al basicConfig de ERROR | L:121 | 1.0 | Observación directa | La llamada INFO nunca se ejecutará — observable en el código |
| C3 | `class PolicyEvaluation(BaseModel)` con 3 campos Pydantic | L:181-185 | 1.0 | Observación directa | `compliance_status`, `evaluation_summary`, `triggered_policies` definidos explícitamente |
| C4 | `validate_policy_evaluation` maneja `TaskOutput`, `PolicyEvaluation`, `str` con try/except múltiple | L:188-224 | 1.0 | Observación directa | Tres branches de tipo + dos except blocks visibles |
| C5 | `temperature=0.0` en el LLM del guardrail | L:233 | 1.0 | Observación directa | Valor exacto verificable en el código |
| C6 | `guardrail=validate_policy_evaluation` y `output_pydantic=PolicyEvaluation` en la misma Task | L:245-246 | 1.0 | Observación directa | Patrón de doble validación/complementario — ambos campos presentes |
| C7 | 8 test cases definidos en `__main__` | L:308-317 | 1.0 | Observación directa | Lista enumerable en el texto |
| C8 | `temperature=0.0` es correcto para guardrail determinístico (vs. Cap.16 `temperature=1`) | — | 0.8 | Inferencia calibrada | Fundamento: clasificación binaria compliant/non-compliant requiere determinismo; Nota 6 confirma el contraste |
| C9 | El patrón `isinstance(output, PolicyEvaluation)` como primer case evita doble-parse | L:199 | 0.8 | Inferencia calibrada | Fundamento: si CrewAI ya parseó, la rama entra directamente; Nota 7 documenta el análisis |
| C10 | Comentario "Set to logging.INFO to see detailed guardrail logs" contradice behavior por defecto | L:114 | 1.0 | Observación directa | El comentario existe pero el nivel es ERROR — observable directamente |
| C11 | La afirmación "Monitoring and observability are vital" contradice `level=logging.ERROR` | L:69, L:115 | 0.8 | Inferencia calibrada | El texto dice "vital", el código los silencia por defecto — tensión documentada en Nota 8 |
| C12 | Placeholders `[Your Service A, Your Product B]` sin reemplazar en SAFETY_GUARDRAIL_PROMPT | L:155-156 | 1.0 | Observación directa | Texto literal presente |
| C13 | Placeholders hacen que la categoría Brand/Competitive nunca bloquee inputs reales | — | 0.8 | Inferencia calibrada | Fundamento: string matching fallará siempre — Nota 5 documenta la consecuencia |
| C14 | `SAFETY_GUARDRAIL_PROMPT` tiene output JSON con 3 keys | L:169 | 1.0 | Observación directa | Keys `compliance_status`, `evaluation_summary`, `triggered_policies` visibles |
| C15 | Segundo prompt (standalone) tiene output JSON con 2 keys (`decision`, `reasoning`) | L:428-434 | 1.0 | Observación directa | Estructura diferente, verificable en el texto |
| C16 | El capítulo no explica la diferencia de diseño entre los dos prompts | — | 0.8 | Inferencia calibrada | Ausencia verificable: no hay párrafo de explicación entre los dos prompts |
| C17 | `policy_enforcer_agent` tiene `allow_delegation=False` y `verbose=False` | L:231-232 | 1.0 | Observación directa | Valores literales en el código |
| C18 | `run_guardrail_crew` retorna `Tuple[bool, str, List[str]]` | L:257 | 1.0 | Observación directa | Type annotation explícita |
| C19 | El código de CrewAI es de tercero (MIT License, Marco Fago 2025) con atribución | L:98-100 | 1.0 | Observación directa | Comentario con copyright y URL presentes |
| C20 | El código puede ejecutarse sin modificar el placeholder brand guardrail | — | 0.5 | Inferencia calibrada | El código compila; el guardrail brand simplemente no funciona — distinción importante |
| C21 | "Implementing guardrails requires a layered defense rather than a single solution" | L:63 | 0.5 | Inferencia calibrada | El código demuestra múltiples layers (input validation + Pydantic + guardrail fn + logging) pero el claim es más amplio que lo que el código solo evidencia |
| C22 | "uses try-except blocks and implementing retry logic with exponential backoff" | L:77-78 | 0.2 | Afirmación performativa | try-except sí está en el código; exponential backoff NO aparece en ningún lugar del código — segunda mitad del claim sin implementación |
| C23 | "Content moderation APIs to detect inappropriate prompts" | L:67 | 0.2 | Afirmación performativa | El ejemplo usa un LLM como moderador, no una API de moderación externa (OpenAI Moderation API, etc.) — el claim diverge de la implementación real |
| C24 | "Schema validation tools like Pydantic to ensure structured inputs adhere to predefined rules" | L:67-68 | 1.0 | Observación directa | Pydantic `PolicyEvaluation` con `Field` y `ValidationError` implementado |

**Subtotal dominio 1:** 21/24 = **87.5%**

---

### Dominio 2: Código técnico — ADK (9 claims)

| # | Claim | Línea input | Score | Tipo | Notas |
|---|-------|-------------|-------|------|-------|
| A1 | `before_tool_callback` usa `ToolContext` no `CallbackContext` | L:349 | 1.0 | Observación directa | Type annotation explícita; comentario `# Correct signature, removed CallbackContext` confirma |
| A2 | `return None` permite ejecución de la tool (semántica correcta) | L:367, comentario | 1.0 | Observación directa | Comentario `# Allow tool execution to proceed` está en el código |
| A3 | El callback retorna `dict` para bloquear la tool | L:361-364 | 1.0 | Observación directa | `return {"status": "error", "error_message": ...}` visible |
| A4 | `tool_context.state.get("session_user_id")` para acceder al estado de sesión | L:356 | 1.0 | Observación directa | Acceso exacto visible en el código |
| A5 | `root_agent` usa `model='gemini-2.0-flash-exp'` | L:372 | 1.0 | Observación directa | Valor literal presente |
| A6 | El snippet ADK tiene placeholder `# ... list of tool functions or Tool instances ...` sin tools reales | L:376-378 | 1.0 | Observación directa | Comentario placeholder verificable; Nota 9 confirma |
| A7 | El snippet no puede ejecutarse sin completar la lista de tools | — | 0.8 | Inferencia calibrada | Agent sin tools válidas fallará en runtime — inferencia directa de la ausencia |
| A8 | `before_tool_callback` es contrato correcto para tool callbacks (vs. `before_model_callback`) | — | 0.8 | Inferencia calibrada | Fundamento: diferencia de contratos documentada en Notas 2 y 3; coherente con arquitectura ADK |
| A9 | El snippet importa `from google.adk.tools.tool_context import ToolContext` | L:343 | 1.0 | Observación directa | Import explícito presente |

**Subtotal dominio 2:** 8/9 = **88.9%** (A7 como inferencia calibrada 0.8 — sigue siendo calibrado)

---

### Dominio 3: Conceptual / Introductorio (16 claims)

| # | Claim | Línea input | Score | Tipo | Notas |
|---|-------|-------------|-------|------|-------|
| I1 | "Guardrails are crucial mechanisms that ensure agents operate safely, ethically, and as intended" | L:27 | 0.2 | Afirmación performativa | Definición normativa sin métricas de "safely" — claim de propósito, no de eficacia |
| I2 | "They serve as a protective layer" | L:29 | 0.2 | Afirmación performativa | Metáfora sin mecanismo técnico especificado |
| I3 | Guardrails pueden implementarse en: Input Validation, Output Filtering, Behavioral Constraints, Tool Use Restrictions, External Moderation APIs, Human Oversight | L:31-33 | 0.5 | Inferencia calibrada | Taxonomía razonable; el código demuestra 3 de 6 categorías |
| I4 | "The primary aim is not to restrict capabilities but to ensure robust, trustworthy, beneficial operation" | L:34-35 | 0.2 | Afirmación performativa | Claim de intención sin criterio de medición |
| I5 | "Without them, an AI system may be unconstrained, unpredictable, and potentially hazardous" | L:37 | 0.2 | Afirmación performativa | Plausible pero sin evidencia citada — hipótesis de diseño, no observación |
| I6 | "A less computationally intensive model can be employed as a rapid, additional safeguard" | L:39-40 | 0.8 | Inferencia calibrada | El código implementa exactamente esto: `CONTENT_POLICY_MODEL = "gemini/gemini-2.0-flash"` como guardrail rápido frente al agente principal |
| I7 | 7 casos de uso listados (Customer Service, Content Gen, Educational, Legal, HR, Social Media, Scientific) | L:47-54 | 0.5 | Inferencia calibrada | Los casos son plausibles; ninguno tiene referencia ni estudio — lista construida por inducción |
| I8 | "Monitoring and observability are vital for maintaining compliance" | L:69 | 0.2 | Afirmación performativa | El código establece `level=logging.ERROR` por defecto, silenciando INFO/WARNING — claim contradice implementación |
| I9 | "Logging all actions, tool usage, inputs, and outputs for debugging and auditing" | L:71 | 0.2 | Afirmación performativa | El logging está presente pero silenciado (`level=logging.ERROR`) — "all actions" es incorrecto por defecto |
| I10 | "Error handling and resilience are also essential" | L:75 | 0.2 | Afirmación performativa | try/except sí está en el código; "resilience" como categoría no es demostrada ni definida |
| I11 | "Retry logic with exponential backoff for transient issues" | L:77-78 | 0.0 | Afirmación falsa documentada | Mencionado como implementado; no aparece en ninguna parte del código del capítulo |
| I12 | "Securely managing API keys" | L:91-92 | 0.5 | Inferencia calibrada | El código hace `os.environ.get("GOOGLE_API_KEY")` — manejo básico via variables de entorno presente, no gestión robusta de secrets |
| I13 | "Agent configuration acts as another guardrail layer" | L:83 | 0.5 | Inferencia calibrada | El agente tiene `allow_delegation=False` que limita comportamiento — parcialmente demostrado |
| I14 | "Employing specialized agents over generalists maintains focus" | L:87 | 0.2 | Afirmación performativa | El ejemplo tiene un solo agent, no comparación entre especializado y generalista |
| I15 | "Adversarial training to enhance model robustness against malicious attacks" | L:91-92 | 0.2 | Afirmación performativa | Mencionado sin referencia, sin código, sin mecanismo descrito |
| I16 | "Considering adversarial training are critical for advanced security" | L:91 | 0.2 | Afirmación performativa | Duplicado con I15 — misma ausencia de sustancia técnica |

**Subtotal dominio 3:** 6/16 = **37.5%** — dominio crítico por debajo del umbral

---

### Dominio 4: Engineering Reliable Agents (12 claims)

| # | Claim | Línea input | Score | Tipo | Notas |
|---|-------|-------------|-------|------|-------|
| E1 | "The checkpoint and rollback pattern is akin to transactional systems with commit/rollback" | L:444-445 | 0.5 | Inferencia calibrada | Analogía con DB engineering es técnicamente válida; sin código que la demuestre |
| E2 | "Checkpoint/rollback transforms error recovery into proactive testing strategy" | L:446 | 0.2 | Afirmación performativa | Sin implementación, sin métricas, sin ejemplo |
| E3 | "Implementing checkpoints" (como práctica recomendada) | L:444 | 0.2 | Afirmación performativa | Descrito sin ningún código de implementación — Nota 10 documenta la ausencia explícitamente |
| E4 | "Modularity and Separation of Concerns" mejoran agility y fault isolation | L:448 | 0.2 | Afirmación performativa | Principio de software engineering válido pero sin evidencia específica a agents — importado de contexto general sin validación |
| E5 | "Modularity enables parallel processing, improving performance" | L:448 | 0.5 | Inferencia calibrada | Cierto para multi-agent systems en general; sin benchmark ni referencia |
| E6 | "Structured logs that capture the agent's chain of thought — tools called, data received, reasoning, confidence scores" | L:450-451 | 0.2 | Afirmación performativa | "Confidence scores for its decisions" — ningún código del capítulo implementa esto; Nota 10 documenta la ausencia |
| E7 | "The Principle of Least Privilege" aplicado a agents | L:452 | 0.5 | Inferencia calibrada | Principio de seguridad bien establecido; la aplicación a agents es razonable aunque el capítulo no demuestra implementación de permisos granulares |
| E8 | "An agent designed to summarize news should only have access to a news API, not private files" | L:452-453 | 0.5 | Inferencia calibrada | Ejemplo ilustrativo coherente con el principio — pero el código del capítulo no implementa restricción de herramientas por tipo de agente |
| E9 | "This drastically limits the 'blast radius' of potential errors or malicious exploits" | L:453-454 | 0.2 | Afirmación performativa | Claim de efectividad sin métricas ni referencia — metáfora no sustanciada |
| E10 | "Integrating these principles moves from functional to resilient, production-grade agents" | L:454-455 | 0.2 | Afirmación performativa | Claim de resultado sin criterio de medición de "production-grade" |
| E11 | "Even deterministic code is prone to bugs and unpredictable emergent behavior" | L:442 | 0.5 | Inferencia calibrada | Afirmación generalmente aceptada en ingeniería de software; sin referencia para el caso específico de agents |
| E12 | "Agents manage complex states and can head in unintended directions" | L:444 | 0.5 | Inferencia calibrada | Observación razonable sobre arquitectura agentic; sin evidencia cuantitativa |

**Subtotal dominio 4:** 5/12 = **41.7%** — por debajo del umbral mínimo

---

### Dominio 5: At a Glance / Key Takeaways / Conclusion (6 claims)

| # | Claim | Línea input | Score | Tipo | Notas |
|---|-------|-------------|-------|------|-------|
| S1 | "LLMs might pose risks if left unconstrained, as their behavior can be unpredictable" | L:460 | 0.5 | Inferencia calibrada | Afirmación generalmente aceptada en el campo; sin referencia específica |
| S2 | "A combination of different guardrail techniques provides the most robust protection" | L:474 | 0.5 | Inferencia calibrada | El código demuestra múltiples técnicas combinadas — parcialmente demostrado por el ejemplo CrewAI |
| S3 | "Guardrails require ongoing monitoring, evaluation, and refinement" | L:475 | 0.2 | Afirmación performativa | Recomendación de proceso sin mecanismo ni métrica — claim de buenas prácticas sin sustancia |
| S4 | "Effective guardrails are crucial for maintaining user trust" | L:476 | 0.2 | Afirmación performativa | Sin evidencia de relación causal entre guardrails y user trust |
| S5 | "Implementing effective guardrails represents a core commitment to responsible AI development" | L:483 | 0.2 | Afirmación performativa | Claim normativo — retórica de cierre sin evidencia |
| S6 | "Guardrails empower AI to serve human needs in a safe and effective manner" | L:491 | 0.2 | Afirmación performativa | Afirmación de resultado sin criterio medible |

**Subtotal dominio 5:** 3/6 = **50.0%** — borderline

---

## Afirmaciones performativas de alto impacto

Las siguientes afirmaciones tienen impacto Alto (Gate-bloqueante) por su posición en el texto o su influencia en decisiones de diseño:

| # | Texto exacto | Línea | Impacto | Tipo de fallo | Evidencia que lo convertiría en calibrado |
|---|-------------|-------|---------|---------------|-------------------------------------------|
| P1 | "Monitoring and observability are vital for maintaining compliance" | L:69 | Alto | Contradice implementación | Cambiar a `level=logging.INFO` por defecto; o añadir advertencia explícita de que la observabilidad está desactivada por defecto |
| P2 | "implementing retry logic with exponential backoff for transient issues" | L:77-78 | Alto | Afirmación falsa — no implementada | Añadir implementación con `tenacity` o bucle con backoff explícito; o eliminar el claim |
| P3 | "confidence scores for its decisions" en structured logging | L:450-451 | Alto | Sin implementación | Añadir campo `confidence` al `PolicyEvaluation` Pydantic y propagarlo al logging |
| P4 | "checkpoint and rollback pattern" como práctica | L:444-446 | Medio | Sin código | Añadir snippet de checkpoint con serialización de estado y mecanismo de rollback |
| P5 | "Content moderation APIs to detect inappropriate prompts" | L:67 | Medio | Diverge de implementación real | Clarificar que el ejemplo usa LLM-as-moderator, no una Content Moderation API externa |

---

## Fortalezas de calibración — código verificable

Estas son las instancias donde Cap.18 supera el patrón de la serie:

| Fortaleza | Evidencia directa | Línea | Contraste con serie |
|-----------|-------------------|-------|---------------------|
| `temperature=0.0` en guardrail LLM | Código literal | L:233 | Cap.16 usó `temperature=1` para clasificador binario |
| `ToolContext` no `CallbackContext` en `before_tool_callback` | Type annotation + comentario confirmatorio | L:349 | Cap.13 usó `CallbackContext` incorrectamente |
| `return None` = allow (semántica correcta en tool callback) | Comentario explícito en código | L:367 | Cap.13 tenía bug con `return None` en `before_model_callback` |
| Pydantic `PolicyEvaluation` con `Field` y validación | Clase completa implementada | L:181-185 | Mayoría de caps tienen schemas sin validación |
| `validate_policy_evaluation` con 3 branches de tipo + 2 except | Código completo | L:188-224 | Manejo de errores más robusto que cualquier cap anterior |
| 8 test cases con inputs reales | Lista enumerable | L:308-317 | Única vez en la serie con test suite explícita |
| `output_pydantic` + `guardrail` como patrón complementario | Ambos campos en Task | L:245-246 | Doble validación defensiva no vista en serie |

---

## Evaluación CCV — Hipótesis Correlación Citas-Validez

**Estado: 7ma CONFIRMACIÓN**

Las 3 referencias del capítulo (Google AI Principles, OpenAI Moderation, Wikipedia) no están citadas inline. Ninguna respalda claims específicos en el texto. Los claims conceptuales (I1-I16, E1-E12) no tienen mejor calibración que capítulos anteriores, independientemente de la presencia de referencias al final.

**Patrón consistente:** La calidad del código mejora (88.9% en ADK, 87.5% en CrewAI) mientras que los dominios sin código permanecen en zona performativa (37.5% conceptual, 41.7% engineering narrative). Las referencias no cambian este patrón — están desconectadas de los claims que más las necesitan.

**Confirmaciones CCV:** Cap.9(77%) → Cap.10 V1(79%) → Cap.10 V2(65.4%) → Cap.11 ES(63.3%) → Cap.11 EN(60.6%) → Cap.11 tablas(71.9%) → Cap.12(53.1%) → Cap.13 EPUB(50.6%) → Cap.13 tablas(77.2%) → Cap.14(62.1%) → Cap.15(74.0%) → Cap.16 tablas(42.2%) → **Cap.18: 64.2%**

---

## Comparación con la serie

| Capítulo | Ratio | Clasificación | Código presente |
|---------|-------|---------------|-----------------|
| Cap.9 | 77.0% | CALIBRADO | Sí |
| Cap.10 V1 | 79.0% | CALIBRADO | Sí |
| Cap.10 V2 | 65.4% | PARCIALMENTE CALIBRADO | Sí |
| Cap.11 ES | 63.3% | PARCIALMENTE CALIBRADO | Sí |
| Cap.11 EN | 60.6% | PARCIALMENTE CALIBRADO | Sí |
| Cap.11 tablas | 71.9% | PARCIALMENTE CALIBRADO | Parcial |
| Cap.12 | 53.1% | PARCIALMENTE CALIBRADO | Sí |
| Cap.13 EPUB | 50.6% | PARCIALMENTE CALIBRADO | Sí |
| Cap.13 tablas | 77.2% | CALIBRADO | Parcial |
| Cap.14 | 62.1% | PARCIALMENTE CALIBRADO | Sí |
| Cap.15 | 74.0% | PARCIALMENTE CALIBRADO | Sí |
| Cap.16 tablas | 42.2% | REALISMO PERFORMATIVO | Parcial |
| **Cap.18** | **64.2%** | **PARCIALMENTE CALIBRADO** | **Sí (más robusto)** |

**Observación:** Cap.18 tiene el código más robusto de la serie (87.5-88.9% por dominio técnico) pero el mismo patrón de secciones conceptuales sin evidencia que deprime el ratio global. Es el capítulo con mayor brecha entre calidad técnica real y calibración global — la diferencia es 24 puntos (88% código vs. 64% global).

---

## Claim específico: logging contradictorio

El claim más significativo de calibración adversarial en este capítulo no es una omisión sino una contradicción interna verificable:

**Claim de texto (L:69):** "Monitoring and observability are vital for maintaining compliance"

**Implementación (L:115):** `logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')`

**Consecuencia:** Las líneas L:121, L:194, L:201, L:204, L:217, L:265 son `logging.info()` — ninguna será visible en ejecución estándar. El comentario L:114 dice "Set to logging.INFO to see detailed guardrail logs" — reconoce implícitamente que por defecto no hay observabilidad.

**Score:** C11 = 0.8 (inferencia calibrada — la tensión es documentable pero el autor podría argumentar que el código es "demostración"). C8 = 0.2 para el claim en prosa (afirmación performativa porque la implementación lo niega por defecto).

---

## Veredicto

**PARCIALMENTE CALIBRADO (64.2%)**

Cap.18 es el capítulo técnicamente más sólido de la serie para los dominios de código. Sin embargo, replica el patrón consistente: las secciones narrativas (introducción, engineering principles) acumulan claims sin evidencia que arrastran el ratio global. La contradicción logging/observabilidad es el hallazgo adversarial más importante — un claim explícito sobre observabilidad como guardrail clave está negado por la configuración por defecto del código.

**Para alcanzar CALIBRADO (≥75%):** Eliminar o reformular I8/I9 (logging claim), I11 (exponential backoff ausente), P3 (confidence scores sin implementar), y E6 (structured logging claim sin código). Solo esos 4 cambios subirían el ratio a ~73% — casi suficiente.
