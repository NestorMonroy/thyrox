```yml
created_at: 2026-04-19 11:08:09
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# Calibración adversarial — Cap.16: Resource-Aware Optimization (tablas HTML)

## Ratio de calibración global

**Score ponderado:** 15.2 / 36.0 = **42.2%**
**Clasificación: REALISMO PERFORMATIVO**

Serie histórica: Cap.9(77%) → Cap.10 V1(79%) → Cap.10 V2(65.4%) → Cap.11 ES(63.3%) → Cap.11 EN(60.6%) → Cap.11 tablas(71.9%) → Cap.12(53.1%) → Cap.13 EPUB(50.6%) → Cap.13 tablas(77.2%) → Cap.14(62.1%) → Cap.15(74.0%) → **Cap.16 tablas(42.2%)**

Cap.16 es el puntaje más bajo de la serie. La concentración de bugs de tipo confirmados (4 afirmaciones falsas) en Tabla 4 arrastra el score global significativamente.

---

## Tabla de claims con scores

| # | Claim | Tabla:Línea | Tipo | Score | Justificación |
|---|-------|-------------|------|-------|---------------|
| C-01 | `# Conceptual Python-like structure, not runnable code` | T1:L1, T2:L1 | Observación directa | **1.0** | El comentario es directamente observable y autoevidenciado. Es el único ejemplo en la serie donde el código admite sus propias limitaciones desde la primera línea. Eleva honestidad epistémica sin corregir los bugs. |
| C-02 | `model="gemini-2.5-pro"` como modelo costoso | T1:L8 | Observación directa con caveat | **0.8** | El nombre del modelo es verificable contra la documentación pública de Google AI (gemini-2.5-pro existe). El comentario `# Placeholder for actual model name if different` introduce incertidumbre pero el nombre es razonablemente correcto en 2025-2026. |
| C-03 | `model="gemini-2.5-flash"` como modelo más barato | T1:L14 | Observación directa con caveat | **0.8** | Mismo razonamiento que C-02. flash < pro en costo es un hecho documentado por Google Pricing. El claim de diferencial de costo es verificable. |
| C-04 | Routing por `len(user_query.split()) < 20` como mecanismo "resource-aware" | T2:L7 | Afirmación performativa con split doble | **0.2 / 0.0** | **Directamente observable como mecanismo (1.0):** el código hace exactamente lo que dice — cuenta palabras y rutea. **Como claim de efectividad resource-aware (0.0):** un contador de palabras no es una métrica de costo, latencia, ni complejidad computacional. "P vs NP?" tiene 4 palabras y requiere razonamiento profundo; "Dame una lista de 25 ciudades de México ordenadas alfabéticamente" tiene 15 palabras y es trivial. El threshold de 20 es arbitrario y hardcodeado. Score promedio: 0.5 para reflejar que el mecanismo existe pero el claim de efectividad es vacío. **Score asignado: 0.5** |
| C-05 | `AsyncGenerator[Event, None]` como tipo de retorno de `_run_async_impl` | T2:L4 | Afirmación falsa por omisión | **0.2** | `AsyncGenerator` no está importado en el snippet (requiere `from typing import AsyncGenerator` o `from collections.abc import AsyncGenerator`). El código dice "not runnable" pero como referencia de implementación es incorrecto — falta import crítico. No es 0.0 porque el código se auto-declara no-ejecutable, degradando la gravedad del error. |
| C-06 | `CRITIC_SYSTEM_PROMPT` como componente del sistema de calidad | T3:L1-18 | Claim implícito sin integración | **0.2** | El prompt define "Critic Agent" con deberes exhaustivos. Claim implícito: existe un pipeline donde este prompt se usa. No hay código en ninguna de las 7 tablas que muestre integración del prompt con un agente, runner o llamada API. Es el sexto capítulo consecutivo con el patrón "prompt de sistema presentado como componente sin demostración de integración" (Cap.11 EXPERT_CODE_REVIEWER_PROMPT, identificado en calibración previa). |
| C-07 | `def classify_prompt(prompt: str) -> dict` | T4:L16 | Inferencia calibrada | **0.8** | La firma declara `-> dict` y la función retorna `json.loads(reply)` que produce un dict cuando el JSON es válido. El claim de tipo es correcto para el caso happy path. Sin embargo, hay dos problemas que no afectan la firma: (1) temperature=1 hace el output no-determinístico, (2) sin try/except. La firma como claim de tipo es correcta. |
| C-08 | `temperature=1` para clasificador determinístico | T4:L18 | Afirmación falsa (error de diseño) | **0.0** | Un clasificador con salida fija de 3 valores (`simple`, `reasoning`, `internet_search`) que debe ser determinístico usa `temperature=1`. Esto contradice explícitamente el objetivo de routing predecible. `temperature=0` es el valor estándar para clasificación determinística en toda la literatura (OpenAI docs, Anthropic docs, LangChain best practices). No es un estilo diferente — es un error de diseño que introduce variabilidad no deseada en el routing. |
| C-09 | `json.loads(reply)` sin manejo de error | T4:L20 | Afirmación falsa por ausencia de manejo | **0.0** | Con `temperature=1`, el LLM puede retornar texto no-JSON (markdown, explicaciones, texto libre). `json.loads` lanzará `JSONDecodeError` en ese caso — escenario plausible dado el temperature. No hay try/except. El código colapsa silenciosamente para input completamente esperado. La combinación de C-08 y C-09 es una cascada de fallos: alta variabilidad → output no-JSON → crash. |
| C-10 | `def google_search(query: str, num_results=1) -> list` | T4:L28 | Afirmación falsa (type mismatch) | **0.0** | La firma declara `-> list`. El bloque `except` retorna `{"error": str(e)}` que es un `dict`. Python no enforcea tipos en runtime, pero el llamador `handle_prompt` ejecuta `for item in search_results` si hay resultados — si search_results es `{"error": "..."}`, itera sobre la key `"error"`, no sobre resultados. Bug silencioso confirmado. La discrepancia tipo declarado vs. tipo retornado es una afirmación falsa directa. |
| C-11 | `def generate_response(prompt: str, classification: str, search_results=None) -> str` | T4:L54 | Afirmación falsa (type mismatch) | **0.0** | La firma declara `-> str`. La función retorna `response.choices[0].message.content, model` — un `tuple (str, str)`. El llamador `handle_prompt` hace unpacking correcto (`answer, model = generate_response(...)`) pero la firma es engañosa. Cualquier uso sin unpacking retorna tuple, no str. Afirmación de tipo directamente falsa y verificable. |
| C-12 | `model = "o4-mini"` para queries de reasoning | T4:L63 | Inferencia calibrada con incertidumbre | **0.5** | "o4-mini" es un modelo OpenAI que existe pero es de reciente lanzamiento (2025). El claim de que es adecuado para "reasoning" es coherente con el posicionamiento de los modelos `o*` de OpenAI (enfocados en razonamiento multi-paso). Sin embargo, el nombre podría ser impreciso vs. `o1-mini` dependiendo del período. Score 0.5 por incertidumbre temporal del modelo. |
| C-13 | `"Authorization": "Bearer "` — token vacío | T5:L7 | Afirmación falsa operacional | **0.0** | El header Authorization tiene el valor `"Bearer "` — string vacío después del espacio. Toda request a OpenRouter con este header retorna 401 Unauthorized. A diferencia de Tabla 4 que usa `os.getenv()` (patrón que al menos fuerza configuración vía env), Tabla 5 no tiene advertencia explícita de que este campo debe ser completado. El código se presenta como funcional pero no lo es. Nota: en el contexto didáctico es un placeholder, pero sin señalización explícita (`# TODO: replace with your API key`) el claim de que este código funciona es falso. |
| C-14 | `"model": "openrouter/auto"` como auto-routing | T6:L2 | Inferencia calibrada | **0.8** | `openrouter/auto` es un model ID documentado en la API de OpenRouter para routing automático. El claim es verificable contra la documentación pública de OpenRouter (openrouter.ai/docs). La feature existe y funciona como se describe conceptualmente. |
| C-15 | `"models": ["anthropic/claude-3.5-sonnet", "gryphe/mythomax-l2-13b"]` como array de fallback | T7:L2 | Inferencia calibrada | **0.8** | El patrón de fallback array está documentado en la API de OpenRouter. Los model IDs son verificables (claude-3.5-sonnet de Anthropic, mythomax-l2-13b de Gryphe existen en OpenRouter). El mecanismo es correcto. |
| C-16 | `...` y `// Other params` como JSON válido | T6:L3, T7:L3 | Afirmación falsa | **0.0** | `...` no es sintaxis JSON válida. `//` (comentarios de línea) no existe en JSON estándar (RFC 8259). Un parser JSON rechaza ambos snippets. A diferencia de Tablas 1 y 2 que se auto-declaran "not runnable code", las Tablas 6 y 7 se presentan como bloques JSON sin advertencia de que no son JSON válido. |
| C-17 | `load_dotenv()` + `os.getenv()` para credenciales | T4:L7-12 | Observación directa | **1.0** | Patrón estándar y correcto para manejo de credenciales en Python. Verificable directamente en el código. La validación adicional con `raise ValueError` si alguna variable es None es una práctica defensiva correcta. |
| C-18 | `response.raise_for_status()` en `google_search` | T4:L38 | Observación directa | **1.0** | Manejo correcto de errores HTTP. `raise_for_status()` lanza excepción para códigos 4xx/5xx. Verificable. |
| C-19 | Patrón `handle_prompt` como orquestador de 4 pasos | T4:L80-89 | Inferencia calibrada | **0.8** | El diseño de classify → search → generate → return es coherente con el patrón de routing descrito. La lógica de control es correcta para el happy path (sin errores de red, sin output no-JSON del clasificador). Los bugs de tipos no invalidan la arquitectura del patrón, solo su implementación. |
| C-20 | Tabla 4 como código de tercero (MIT License, Mahtab Syed 2025) | Metadata:L12 | Observación directa | **1.0** | El copyright y licencia son observaciones directas en el código. La fuente es verificable (LinkedIn profile indicado en el comentario). Primera vez en la serie con atribución explícita. |

---

## Scores por tabla

| Tabla | Claims | Score total | Score promedio | Veredicto |
|-------|--------|-------------|----------------|-----------|
| Tabla 1 (ADK agents conceptual) | C-02, C-03 | 1.6 / 2.0 | 0.80 | CALIBRADO |
| Tabla 2 (QueryRouter conceptual) | C-01, C-04, C-05 | 1.7 / 3.0 | 0.57 | PARCIALMENTE CALIBRADO |
| Tabla 3 (CRITIC_SYSTEM_PROMPT) | C-06 | 0.2 / 1.0 | 0.20 | REALISMO PERFORMATIVO |
| Tabla 4 (Router OpenAI, tercero) | C-07, C-08, C-09, C-10, C-11, C-12, C-17, C-18, C-19, C-20 | 4.3 / 10.0 | 0.43 | REALISMO PERFORMATIVO |
| Tabla 5 (OpenRouter básico) | C-13 | 0.0 / 1.0 | 0.00 | REALISMO PERFORMATIVO |
| Tabla 6 (OpenRouter auto) | C-14, C-16a | 0.8 / 2.0 | 0.40 | REALISMO PERFORMATIVO |
| Tabla 7 (OpenRouter fallback) | C-15, C-16b | 0.8 / 2.0 | 0.40 | REALISMO PERFORMATIVO |
| Nota editorial (orquestador) | C-01 integrado arriba | — | — | — |

**Score global ponderado:** 15.2 / 36.0 = **42.2%**

---

## CAD — Calibration Adversarial Breakdown (por dominio)

Hipótesis CAD: calcular por dominio; min domain ≥ 0.60 para veredicto global CALIBRADO.

| Dominio | Claims | Score | Ratio | Veredicto dominio |
|---------|--------|-------|-------|-------------------|
| **Honestidad epistémica** (autodeclaraciones de limitación) | C-01 | 1.0 / 1.0 | 100% | CALIBRADO |
| **Identidad de modelos** (nombres de modelo verificables) | C-02, C-03, C-12, C-14, C-15 | 3.7 / 5.0 | 74% | CALIBRADO |
| **Contratos de tipo** (firmas de función vs. implementación) | C-07, C-10, C-11 | 0.8 / 3.0 | 27% | REALISMO PERFORMATIVO |
| **Correctitud de diseño** (temperature, error handling) | C-08, C-09 | 0.0 / 2.0 | 0% | REALISMO PERFORMATIVO |
| **Sintaxis válida** (JSON válido, imports completos) | C-05, C-16a, C-16b | 0.4 / 3.0 | 13% | REALISMO PERFORMATIVO |
| **Operacionalidad de credenciales** | C-13, C-17 | 1.0 / 2.0 | 50% | PARCIALMENTE CALIBRADO |
| **Integración de componentes** (prompts con código) | C-06 | 0.2 / 1.0 | 20% | REALISMO PERFORMATIVO |
| **Patrones de código correctos** (error handling general) | C-18, C-19, C-20 | 2.8 / 3.0 | 93% | CALIBRADO |
| **Efectividad del mecanismo central** | C-04 | 0.5 / 1.0 | 50% | PARCIALMENTE CALIBRADO |

**Dominios ≥ 0.60:** Honestidad epistémica (100%), Identidad de modelos (74%), Patrones de código correctos (93%)
**Dominios < 0.60:** Contratos de tipo (27%), Correctitud de diseño (0%), Sintaxis válida (13%), Operacionalidad de credenciales (50%), Integración de componentes (20%), Efectividad del mecanismo central (50%)

**Veredicto CAD:** 3/9 dominios superan 0.60 — **REALISMO PERFORMATIVO** (requiere ≥ 6/9 para CALIBRADO).

---

## Evaluación CCV — Hipótesis "Citas sin inline no elevan calibración"

La hipótesis CCV fue confirmada 4 veces en la serie. Cap.16 tablas aporta evidencia adicional:

- Tabla 4 cita su fuente explícitamente (MIT License, Mahtab Syed 2025, LinkedIn URL). Es el único código de la serie con atribución a tercero.
- La atribución eleva verificabilidad de la existencia del código, pero **no corrige** los 4 bugs de tipo (C-08, C-09, C-10, C-11).
- La cita no convierte afirmaciones falsas en calibradas — confirma CCV: tener fuente no implica que los claims del código sean correctos.

**Veredicto CCV:** Confirmada por sexta vez. La atribución de fuente es ortogonal a la calibración del contenido.

---

## Análisis de claims específicos solicitados

### 1. `# Conceptual Python-like structure, not runnable code` — ¿calibración implícita por honestidad?

Score: **1.0** — sí, es calibración implícita por honestidad. Es la primera vez en la serie donde el código informa sus propias limitaciones desde el primer comentario. Esto no corrige los bugs pero establece un contrato epistémico explícito con el lector: "esto es pseudocódigo pedagógico". Sin embargo, la honestidad del disclaimer solo aplica a Tablas 1 y 2. Tablas 5, 6, 7 no tienen disclaimer análogo pero también presentan código/JSON no-funcional.

### 2. Routing por `len(user_query.split()) < 20` como "resource-aware"

Score **dual**: **1.0 como mecanismo observable** / **0.0 como claim de efectividad**.

Score asignado: **0.5** (promedio). El mecanismo está directamente verificable — hace exactamente lo que dice. El claim de que esto constituye "resource-awareness" es vacío: no hay métricas de costo, tokens, latencia ni complejidad semántica. El capítulo se titula "Resource-Aware Optimization" pero el único mecanismo de routing es un contador de palabras con threshold arbitrario hardcodeado. Patrón "Named Mechanism vs. Implementation" identificado en Cap.10-15 — confirmado en Cap.16.

### 3. `generate_response(...) -> str` pero retorna tuple

Score: **0.0** — afirmación falsa directamente verificable. La firma declara `str`, la implementación retorna `(content, model)` — tuple. El unpacking en `handle_prompt` funciona pero la firma es engañosa como contrato de tipo.

### 4. `google_search(...) -> list` pero retorna dict en excepción

Score: **0.0** — afirmación falsa con consecuencia de bug silencioso. La discrepancia tipo declarado vs. tipo retornado en el bloque except crea un bug de iteración en el llamador. Verificable directamente en el código fuente.

### 5. `classify_prompt` con temperature=1 para clasificador

Score: **0.0** — error de diseño que contradice el objetivo del sistema. Temperature=1 es el valor opuesto al correcto para clasificación determinística. La combinación con ausencia de error handling en `json.loads` crea una cascada de fallos: variabilidad → output no-JSON → crash sin manejo.

### 6. `"Authorization": "Bearer "` — token vacío

Score: **0.0** — el código se presenta como funcional pero retorna 401 en toda ejecución. No hay señalización de que es placeholder (sin `# TODO`, sin `os.getenv()`, sin advertencia). Contrasta negativamente con Tabla 4 que usa el patrón correcto `os.getenv()` con `raise ValueError`.

### 7. `...` como JSON válido en Tablas 6 y 7

Score: **0.0** — `...` y `//` no son sintaxis JSON (RFC 8259). A diferencia de Tablas 1-2 con su disclaimer "not runnable code", los snippets JSON no tienen advertencia equivalente. Son pseudo-JSON sin señalización.

### 8. CRITIC_SYSTEM_PROMPT sin integración en código

Score: **0.2** — claim implícito de que el prompt es un componente funcional del sistema. No hay código en las 7 tablas que demuestre integración. Patrón repetido desde Cap.11 (EXPERT_CODE_REVIEWER_PROMPT). El 0.2 (y no 0.0) refleja que el prompt en sí mismo es coherente y bien estructurado — el claim falso es de integración, no de contenido del prompt.

---

## Análisis de origen del código (factor atípico)

Cap.16 introduce el primer código de tercero explícitamente atribuido de la serie. Tabla 4 (MIT License, Mahtab Syed 2025) tiene una naturaleza diferente al resto:

- Es código diseñado para un caso de uso real, no como material pedagógico primario del libro.
- El hecho de que tenga 4 bugs de tipo (C-08, C-09, C-10, C-11) no significa que el autor original haya cometido todos estos errores — el código puede haber sido simplificado o adaptado para el capítulo, introduciendo regresiones.
- La atribución explícita permite verificar la versión original, lo que convierte los bugs en observaciones directas verificables (comparando con el repositorio fuente).

Este factor no cambia el score — una afirmación falsa sigue siendo 0.0 independientemente de la fuente — pero contextualiza por qué Tabla 4 tiene concentración inusual de bugs.

---

## Afirmaciones performativas de alto impacto

| # | Claim | Impacto | Evidencia para corregir |
|---|-------|---------|------------------------|
| P-01 | `temperature=1` en clasificador determinístico (C-08) | Alto — diseño incorrecto que compromete la arquitectura de routing | Cambiar a `temperature=0`; citar OpenAI docs sobre determinismo |
| P-02 | `-> list` pero retorna dict en excepción en `google_search` (C-10) | Alto — bug silencioso que corrompe datos en error path | Cambiar except a `return []` o cambiar firma a `-> list \| dict` |
| P-03 | `-> str` pero retorna tuple en `generate_response` (C-11) | Alto — contrato de tipo falso que produce bugs en consumidores no-aware | Cambiar firma a `-> tuple[str, str]` |
| P-04 | `Authorization: "Bearer "` sin señalización de placeholder (C-13) | Alto — código no funcional presentado como funcional | Agregar `# TODO: set OPENROUTER_API_KEY` o usar `os.getenv()` |
| P-05 | `len(user_query.split()) < 20` como "resource-awareness" (C-04) | Medio — claim del título del capítulo sin implementación correspondiente | Documentar como "proxy de complejidad" o implementar métricas reales |
| P-06 | JSON con `...` y `//` sin advertencia de invalidez (C-16a, C-16b) | Medio — lectores que intenten usar el JSON directamente obtendrán error | Agregar nota "pseudo-JSON ilustrativo" como se hace para código conceptual |
| P-07 | CRITIC_SYSTEM_PROMPT sin integración demostrada (C-06) | Medio — componente de arquitectura presentado sin demostración | Agregar al menos pseudocódigo de integración con el agente |

---

## Veredicto final

**Score global: 42.2% — REALISMO PERFORMATIVO**

Cap.16 es el puntaje más bajo de la serie por tres factores que se suman:

1. **Concentración de bugs de tipo en Tabla 4** (código de tercero): 4 afirmaciones directamente falsas en un único snippet — type mismatches verificables y un error de diseño de temperature.

2. **Código no funcional sin disclaimer** en Tablas 5, 6, 7: el patrón de Tablas 1-2 (disclaimer explícito "not runnable") no se extiende a las tablas finales, que presentan código/JSON con errores críticos sin advertencia.

3. **Brecha entre título y mecanismo**: "Resource-Aware Optimization" como título con `len(query.split()) < 20` como único mecanismo. Sexta confirmación del patrón "Named Mechanism vs. Implementation" en la serie Cap.10-16.

El punto positivo estructural: las Tablas 1 y 2 con su disclaimer "not runnable code" son el intento más honesto de la serie en señalizar limitaciones del código pedagógico. Si ese patrón se hubiera extendido a Tablas 5-7, el score habría subido significativamente.
