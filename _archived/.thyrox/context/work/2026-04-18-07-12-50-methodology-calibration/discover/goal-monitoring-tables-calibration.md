```yml
created_at: 2026-04-19 10:42:23
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
status: Borrador
version: 1.0.0
fuente: "Chapter 11: Goal Setting and Monitoring — tablas suplementarias" (documento externo, 2026-04-19)
ratio_calibración: 23/32 (71.9%)
clasificación: PARCIALMENTE CALIBRADO
delta_vs_cap11_original: +11.3pp
delta_vs_cap11_traduccion: +8.6pp
```

# Calibración epistémica — Chapter 11: Goal Setting and Monitoring (tablas suplementarias)

## Ratio de calibración: 23/32 (71.9%)
## Clasificación: PARCIALMENTE CALIBRADO

Ratio binario estándar: (Observaciones directas + Inferencias calibradas) / Total claims
= (14 + 9) / 32 = 71.9%

Nota de input: El input es un `input.md` estructurado por el orquestador que incluye el
contenido completo de las 3 tablas más 10 notas editoriales. El contenido de las tablas
está preservado verbatim según indica la nota de la metadata. No hay señales de compresión
en las secciones de código (Tabla 2 es código completo, 199 líneas). Ratio calculado sobre
32 claims identificados en el input disponible.

---

## Distribución por tipo de evidencia

| Tipo | Cantidad | % | Peso continuo |
|------|----------|---|---------------|
| Observación directa | 14 | 43.8% | 14 × 1.00 = 14.00 |
| Inferencia calibrada | 9 | 28.1% | 9 × 0.75 = 6.75 |
| Inferencia especulativa | 4 | 12.5% | 4 × 0.40 = 1.60 |
| Claim performativo | 5 | 15.6% | 5 × 0.10 = 0.50 |
| **Total** | **32** | **100%** | **22.85 / 32.00 = 71.4%** |

Ratio ponderado (evidencia continua): 22.85 / 32.00 = **71.4%**

Contexto de referencia:
- Cap.9 = 77% CALIBRADO
- Cap.10 original = 65% PARCIALMENTE CALIBRADO
- Cap.11 traducción española = 63.3% PARCIALMENTE CALIBRADO
- Cap.11 EPUB original = 60.6% PARCIALMENTE CALIBRADO
- **Cap.11 tablas suplementarias = 71.9% PARCIALMENTE CALIBRADO**

---

## Grupo A — Tabla 1 (instalación): 4 claims

### A-01: `pip install langchain_openai openai python-dotenv`
**Texto:** `pip install langchain_openai openai python-dotenv` (input.md:31)
**Tipo:** Observación directa (1.0)
**Justificación:** Comando verificable contra PyPI. Los tres paquetes existen y tienen los
nombres exactos especificados:
- `langchain_openai`: paquete oficial LangChain para integración OpenAI, disponible en PyPI
- `openai`: cliente oficial OpenAI Python SDK
- `python-dotenv`: paquete para carga de variables de entorno desde `.env`
El comando es sintácticamente correcto. Verificable con: `pip show langchain_openai openai python-dotenv`
**Impacto:** Bajo (instalación standard, no bloquea comprensión del patrón)

### A-02: Variable de entorno `OPENAI_API_KEY` para ChatOpenAI
**Texto:** `.env file with key in OPENAI_API_KEY` (input.md:32)
**Tipo:** Observación directa (1.0)
**Justificación:** El nombre `OPENAI_API_KEY` es la variable de entorno estándar y documentada
para el SDK de OpenAI. LangChain's `ChatOpenAI` acepta `openai_api_key` como parámetro o
lee `OPENAI_API_KEY` del entorno. El código de Tabla 2 confirma ambas rutas: lee la variable
con `os.getenv("OPENAI_API_KEY")` y la pasa explícitamente al constructor. Verificable en
documentación oficial de LangChain y OpenAI.
**Impacto:** Bajo

### A-03: Claim implícito de suficiencia de instalación
**Texto:** Las dos líneas de Tabla 1 (pip install + .env) presentadas como instrucciones
completas de setup (input.md:28-33, contexto de la tabla como bloque completo)
**Tipo:** Inferencia calibrada (0.75)
**Justificación:** Para ejecutar el código de Tabla 2 se necesita también: Python 3.10+
(para `list[str]` como type hint sin `from __future__ import annotations`), y una cuenta
OpenAI con créditos disponibles. Estas dependencias son implícitas pero estándar. La omisión
es razonable en un texto pedagógico. La instrucción es suficiente para la mayoría de
entornos modernos.
**Impacto:** Bajo

### A-04: `find_dotenv()` encuentra el archivo `.env` automáticamente
**Texto:** `_ = load_dotenv(find_dotenv())` (input.md:60)
**Tipo:** Inferencia calibrada (0.75)
**Justificación:** `find_dotenv()` busca el `.env` subiendo desde el directorio actual.
Funciona en la mayoría de estructuras de proyecto pero falla si el archivo `.env` no está
en el árbol de directorios del script o si hay múltiples archivos `.env` anidados. La
combinación `load_dotenv(find_dotenv())` es un patrón idiomático de `python-dotenv`.
Verificable en documentación de python-dotenv.
**Impacto:** Bajo

**Subtotal Tabla 1:** 3/4 calibrados (75.0%)

---

## Grupo B — Tabla 2 (código Python): 22 claims

### B-01: Import `from langchain_openai import ChatOpenAI`
**Texto:** `from langchain_openai import ChatOpenAI` (input.md:57)
**Tipo:** Observación directa (1.0)
**Justificación:** Import correcto. `ChatOpenAI` vive en `langchain_openai` (no en
`langchain.chat_models` que es la ruta legacy). El paquete instalado en Tabla 1 provee
exactamente esta clase.
**Impacto:** Medio (incorrecto haría el código no ejecutable)

### B-02: Import `from dotenv import load_dotenv, find_dotenv`
**Texto:** `from dotenv import load_dotenv, find_dotenv` (input.md:58)
**Tipo:** Observación directa (1.0)
**Justificación:** Import correcto. `python-dotenv` expone `load_dotenv` y `find_dotenv`
en el namespace `dotenv`.
**Impacto:** Medio

### B-03: `ChatOpenAI(model="gpt-4o", temperature=0.3, openai_api_key=OPENAI_API_KEY)`
**Texto:** `llm = ChatOpenAI(model="gpt-4o", temperature=0.3, openai_api_key=OPENAI_API_KEY)` (input.md:66-70)
**Tipo:** Observación directa (1.0)
**Justificación:** API correcta para `langchain_openai.ChatOpenAI` en versiones actuales.
Los parámetros `model`, `temperature`, y `openai_api_key` son parámetros documentados del
constructor. El nombre de modelo `"gpt-4o"` es válido (existente en la API de OpenAI a la
fecha del análisis). Verificable en: langchain-openai API reference.
**Impacto:** Medio (API correcta = código ejecutable)

### B-04: `llm.invoke(prompt)` retorna un `AIMessage`
**Texto:** `return llm.invoke(feedback_prompt)` en `get_code_feedback` (input.md:100);
`llm.invoke(review_prompt).content.strip().lower()` en `goals_met` (input.md:118)
**Tipo:** Observación directa (1.0)
**Justificación:** `ChatOpenAI.invoke()` retorna un `AIMessage` (hereda de `BaseMessage`).
El atributo `.content` contiene el texto string. Esto es correcto y verificable en la
documentación de LangChain Core. El código en `goals_met` (L:118) llama `.content`
directamente sobre el return value, lo cual es el patrón correcto.
**Impacto:** Medio

### B-05: `to_snake_case` es dead code (nunca llamada)
**Texto:** `def to_snake_case(text: str) -> str:` definida en input.md:133-135; confirmado
por nota editorial (input.md:219-221)
**Tipo:** Observación directa (1.0)
**Justificación:** La función está definida. `save_code_to_file` construye el nombre del
archivo con `re.sub(r"[^a-zA-Z0-9_]", "", raw_summary.replace(" ", "_").lower())[:10]`
directamente (input.md:144), sin llamar a `to_snake_case`. Verificable con: búsqueda de
todos los call sites de `to_snake_case` en el código — ninguno existe.
**Impacto:** Bajo (no afecta ejecución, afecta calidad del código)

### B-06: `feedback if isinstance(feedback, str) else feedback.content` — type handling
**Texto:** `feedback if isinstance(feedback, str) else feedback.content` (input.md:164)
**Tipo:** Observación directa (1.0)
**Justificación:** El type handling es correcto para el caso nominal: en iteración 1,
`feedback=""` (str), la rama `feedback` se evalúa y retorna "". En iteraciones 2+,
`feedback=AIMessage(...)`, la rama `feedback.content` retorna el string. Sin embargo,
la nota editorial (input.md:236) identifica una asimetría real: `if feedback:` en
`generate_prompt` (input.md:85-86) evalúa `AIMessage` como truthy siempre (incluso con
`.content == ""`), mientras que en iteración 1 un feedback vacío `""` evalúa como falsy.
El type check del isinstance es correcto; la asimetría de truthiness es un bug menor
separado. Clasifico el isinstance como correcto (observación directa) y la asimetría
como claim especulativo B-06b.
**Impacto:** Bajo para el isinstance; ver B-06b para la asimetría

### B-06b: Asimetría de truthiness `if feedback:` entre iteración 1 y 2+
**Texto:** `if feedback:` (input.md:85); feedback inicializado como `""` (input.md:161);
feedback asignado a `AIMessage` tras primera iteración (input.md:171)
**Tipo:** Observación directa (1.0)
**Justificación:** El código muestra claramente las dos rutas: `feedback = ""` antes del
loop, `feedback = get_code_feedback(code, goals)` dentro del loop que retorna `AIMessage`.
El comportamiento de `bool("")` es `False` y `bool(AIMessage(...))` es `True` siempre. Esto
es verificable directamente en el código sin necesidad de ejecutarlo.
**Impacto:** Bajo (edge case: solo afecta si el LLM retorna un AIMessage con content vacío)

### B-07: `goals_met` con LLM-as-judge — claim de "monitoring"
**Texto:** "To check if we have met our goals I am asking the LLM to judge this and answer
just True or False which makes it easier to stop the iterations." (input.md:50)
**Tipo:** Inferencia especulativa (0.40)
**Justificación:** LLM-as-judge es un patrón documentado en la literatura de AI evaluation
(OpenAI Evals, HELM benchmarks). Sin embargo, el claim de que esto constituye "monitoring"
del título del capítulo es especulativo: el mecanismo puede medir si el LLM revisor cree
que los goals están met, no si los goals están objetivamente met. Las limitaciones
documentadas (sycophancy, inconsistencia entre invocaciones) no están mencionadas. La
afirmación de que "makes it easier to stop the iterations" es correcta mecánicamente pero
omite que facilita la detención independientemente de la calidad real.
**Impacto:** Alto (afecta la comprensión del patrón de monitoring)

### B-08: `for i in range(max_iterations)` — `UnboundLocalError` si `max_iterations=0`
**Texto:** `for i in range(max_iterations):` (input.md:162); `final_code = add_comment_header(code, use_case)` (input.md:179); confirmado en nota editorial (input.md:222-228)
**Tipo:** Observación directa (1.0)
**Justificación:** Si `max_iterations=0`, `range(0)` produce cero iteraciones. La variable
`code` se define solo dentro del loop (input.md:168: `code = clean_code_block(raw_code)`).
Las líneas 179-180 referencian `code` y `final_code` fuera del loop sin ningún guard.
Python levanta `UnboundLocalError` en este caso. Verificable ejecutando:
`run_code_agent("test", "simple", max_iterations=0)` — producirá error.
La firma `max_iterations: int = 5` no documenta que valores ≤0 son inválidos.
**Impacto:** Alto (bug real que el capítulo no reconoce)

### B-09: `save_code_to_file` hace llamada LLM para nombre de archivo
**Texto:** `raw_summary = llm.invoke(summary_prompt).content.strip()` (input.md:143);
nota editorial (input.md:282-291)
**Tipo:** Observación directa (1.0)
**Justificación:** El código muestra explícitamente una llamada `llm.invoke(summary_prompt)`
para generar el nombre del archivo. La nota editorial confirma el edge case: si el LLM
retorna algo que `re.sub(r"[^a-zA-Z0-9_]", "", ...)[:10]` reduce a string vacío, el
filename resultante es `_NNNN.py`. Verificable en el código directamente. La decisión
de hacer una LLM call para un nombre de archivo introduce latencia y costo innecesarios
cuando `to_snake_case` ya existe (aunque no se usa).
**Impacto:** Bajo-Medio (informa evaluación de calidad de diseño)

### B-10: Silent termination — mismo output si goals_met=True o si loop se agota
**Texto:** Loop en input.md:162-177; líneas post-loop input.md:179-180; nota editorial
(input.md:265-277)
**Tipo:** Observación directa (1.0)
**Justificación:** El código muestra que el `break` en L:176 y el agotamiento del loop
sin break producen el mismo flujo de ejecución post-loop: `final_code = add_comment_header(code, use_case)` + `return save_code_to_file(final_code, use_case)`. No hay
distinción en el valor de retorno ni en los mensajes de output entre los dos casos. Hay
un `print("✅ LLM confirms goals are met.")` dentro del if (L:175) pero no hay un print
simétrico de "goals NOT met" cuando el loop se agota. El caller no puede distinguir el
resultado. Verificable por análisis de flujo del código.
**Impacto:** Alto (contradicción directa con "Monitoring" del título)

### B-11: Docstring "Saves the final code in a .py file with a clean filename and a header comment"
**Texto:** Docstring del módulo, input.md:51
**Tipo:** Observación directa (1.0)
**Justificación:** El docstring es verificable contra el código:
- "Saves... in a .py file": confirmado, `save_code_to_file` hace `with open(filepath, "w") as f: f.write(code)` (input.md:148-149)
- "with a clean filename": parcialmente — LLM puede generar nombres no predecibles, y el
  truncamiento a 10 caracteres puede producir nombres no semánticos. La "limpieza" depende
  del LLM.
- "with a header comment": confirmado, `add_comment_header` agrega comentario (input.md:129-131)
El docstring describe correctamente el comportamiento mecánico aunque "clean filename" tiene
hedging implícito que el texto no explicita.
**Impacto:** Bajo

### B-12: Claim de código del docstring: "Uses an LLM to generate and refine Python code until the goals are met"
**Texto:** "Uses an LLM (like GPT-4o) to generate and refine Python code until the goals
are met." (input.md:49)
**Tipo:** Inferencia especulativa (0.40)
**Justificación:** "Until the goals are met" implica que el sistema garantiza la terminación
con goals met. El código implementa "hasta que el LLM crea que los goals están met O hasta
que se agoten las iteraciones" — diferente. Si el loop se agota (el caso más común para
goals difíciles), el código guarda el resultado SIN que los goals estén met. La frase
"until the goals are met" sobreafirma la garantía del sistema. Sin evidencia cuantitativa
de tasa de éxito del LLM-as-judge en 5 iteraciones.
**Impacto:** Alto (afecta comprensión del comportamiento del sistema)

### B-13: `get_code_feedback` retorna `AIMessage`, no `str`
**Texto:** `return llm.invoke(feedback_prompt)` en `get_code_feedback` (input.md:100);
type hint: `-> str`
**Tipo:** Observación directa (1.0)
**Justificación:** El type hint de `get_code_feedback` declara `-> str` pero retorna
`llm.invoke(feedback_prompt)` que es un `AIMessage`. El caller en `run_code_agent` maneja
esto con el isinstance (B-06), pero el type hint es incorrecto. Verificable: la firma
declara `str`, la implementación retorna `AIMessage`.
**Impacto:** Bajo (no afecta ejecución dado el isinstance guard, pero es deuda técnica)

### B-14: `import random` — uso único y acotado
**Texto:** `import random` (input.md:54); `random_suffix = str(random.randint(1000, 9999))` (input.md:145)
**Tipo:** Observación directa (1.0)
**Justificación:** `random` se importa y se usa en exactamente un lugar para generar un
sufijo de 4 dígitos. El comportamiento es correcto: `random.randint(1000, 9999)` produce
enteros inclusivos en ese rango (1000 valores posibles). No hay claims sobre collision
probability del sufijo (que sería ~0.1% para 1000 nombres, aceptable).
**Impacto:** Bajo

### B-15: `clean_code_block` — strip de fence markdown
**Texto:** `def clean_code_block(code: str) -> str:` (input.md:121-127)
**Tipo:** Observación directa (1.0)
**Justificación:** La función verifica si la primera línea empieza con ` ``` ` y la elimina,
y si la última línea es exactamente ` ``` ` y la elimina. Este es el patrón estándar para
remover markdown code fences de output LLM. La lógica es correcta para el caso típico.
Edge case no manejado: LLM puede retornar ` ```python ` con language tag, lo cual también
empieza con ` ``` ` y sería correctamente manejado por `.startswith("```")`.
**Impacto:** Bajo

### B-16: Afirmación de "Iteration 2" como versión mejorada
**Texto:** "Hands-On Code Example - Iteration 2" (input.md:45); nota editorial (input.md:279-281)
**Tipo:** Inferencia especulativa (0.40)
**Justificación:** El código se presenta como "Iteration 2" implicando que es una versión
refinada. La nota editorial confirma que Iteration 1 no está en las tablas. Sin evidencia
de qué cambió entre Iteration 1 y 2, ni de qué criterios determinaron que Iteration 2
es la versión a presentar. La mejora es inferida del número ordinal, no demostrada.
**Impacto:** Bajo (contextual, no bloquea comprensión del patrón)

### B-17: Claim de que max_iterations=5 "could be based on a set goal as well"
**Texto:** "I am using max 5 iterations, this could be based on a set goal as well" (input.md:49)
**Tipo:** Inferencia calibrada (0.75)
**Justificación:** La afirmación es verdadera: `max_iterations` es un parámetro de la
función y podría derivarse de cualquier lógica, incluyendo una goal-based. El código
lo implementa como `int = 5` hardcoded en el default, pero la nota señala que es
configurable. Esta es una observación arquitectónica correcta sobre extensibilidad.
**Impacto:** Bajo

### B-18: `add_comment_header` agrega correctamente el header
**Texto:** `def add_comment_header(code: str, use_case: str) -> str:` (input.md:129-131)
**Tipo:** Observación directa (1.0)
**Justificación:** La función construye el comentario con string formatting estándar y
lo concatena al código. Funciona correctamente para cualquier `use_case` string. No hay
edge cases problemáticos identificables.
**Impacto:** Bajo

### B-19: `goals_met` parsea "true"/"false" — fragilidad ante variaciones LLM
**Texto:** `response = llm.invoke(review_prompt).content.strip().lower()` + `return response == "true"` (input.md:118-119)
**Tipo:** Inferencia calibrada (0.75)
**Justificación:** El prompt pide "Respond with only one word: True or False." El parseo
verifica si el resultado (lowercased) es exactamente "true". El LLM puede retornar
variaciones: "true.", "TRUE", "True\n", "Yes", "Certainly true". El `.strip().lower()`
maneja trailing whitespace y case, pero no punktuation ni sinónimos. Esta es una fragilidad
documentada en el diseño de LLM parsers. La implementación es correcta para respuestas
adherentes al prompt; frágil para respuestas no-aderentes. Inferencia calibrada porque
el comportamiento nominal es correcto y la fragilidad es conocida.
**Impacto:** Medio (determina si el loop continúa — falsos negativos causan iteraciones extra)

### B-20: `generate_prompt` con `chr(10).join(...)` para newlines
**Texto:** `{chr(10).join(f"- {g.strip()}" for g in goals)}` (input.md:81, 95, 107)
**Tipo:** Observación directa (1.0)
**Justificación:** `chr(10)` es `\n`. El uso de `chr(10)` en lugar de `\n` dentro de
f-strings es un workaround para Python f-strings que no permiten backslashes en
expresiones (válido en Python < 3.12). En Python 3.12+ los f-strings sí admiten `\n`.
El código es correcto y ejecutable en todas las versiones de Python soportadas.
**Impacto:** Bajo

### B-21: Exception handling de `OPENAI_API_KEY` ausente
**Texto:** `if not OPENAI_API_KEY: raise EnvironmentError(...)` (input.md:62-63)
**Tipo:** Observación directa (1.0)
**Justificación:** El guard es correcto: si la variable no está configurada, el error
se levanta temprano con un mensaje descriptivo en lugar de fallar más tarde con un
error menos claro de la API. `EnvironmentError` es apropiado para este caso.
**Impacto:** Bajo

### B-22: El código presenta patrón "generate-evaluate-refine" como "Goal Setting and Monitoring"
**Texto:** Docstring completo (input.md:44-52); título del capítulo "Goal Setting and Monitoring"
**Tipo:** Inferencia especulativa (0.40)
**Justificación:** El capítulo titula el patrón "Goal Setting and Monitoring". El código
implementa un loop generate-evaluate-refine. La conexión con "goal monitoring" requiere
que los goals definidos al inicio sean efectivamente monitoreados a través del proceso.
Lo que el código implementa es: goals → prompt → code → LLM feedback → LLM judge → repeat.
El "monitoring" es delegado a un LLM que puede ser inconsistente. Sin evidencia de que este
mecanismo monitorea efectivamente el progreso hacia los goals (vs. un loop de refinamiento
sin monitoring real). La contradicción de silent termination (B-10) agrava este claim.
**Impacto:** Alto (es la tesis central del capítulo)

**Subtotal Tabla 2:** 15/22 calibrados (68.2%)

---

## Grupo C — Tabla 3 (Expert Code Reviewer system prompt): 6 claims

### C-01: "eliminate code hallucinations"
**Texto:** "Your core mission is to eliminate code hallucinations" (input.md:207)
**Tipo:** Claim performativo (0.10)
**Justificación:** "Eliminate" es un claim absoluto. Un system prompt instruyendo a un LLM
a "eliminar" alucinaciones no puede garantizar ese resultado — los LLMs siguen siendo capaces
de alucinar APIs, funciones y comportamientos aun con instrucciones explícitas de no hacerlo.
El claim correcto sería "reducir" o "minimizar". Adicionalmente, la nota editorial (input.md:256-262)
confirma que este prompt NO está integrado en el código de Tabla 2 (ver C-05), lo que hace
el claim doblemente no verificable en el sistema presentado.
**Evidencia propuesta:** Benchmark de código generado con/sin este system prompt midiendo
tasa de alucinaciones en un conjunto de test cases. Sin ese benchmark, el claim no es verificable.
**Impacto:** Medio (afecta evaluación de la propuesta del capítulo)

### C-02: "ensuring every suggestion is grounded in reality and best practices"
**Texto:** "ensuring every suggestion is grounded in reality and best practices" (input.md:207)
**Tipo:** Claim performativo (0.10)
**Justificación:** "Every suggestion" y "grounded in reality" son claims absolutos para
un sistema LLM. Un LLM con este system prompt puede aún producir sugerencias basadas en
patrones de training no válidos para el contexto específico. "Best practices" no está
definido en el prompt — es subjetivo y variable según el contexto de la codebase. El claim
es una aspiración editorial del system prompt, no una garantía verificable.
**Evidencia propuesta:** Evaluación de sugerencias producidas con este prompt contra
un benchmark de best practices definido.
**Impacto:** Bajo (claim de calidad del system prompt, no afecta la arquitectura)

### C-03: "Identify and Correct Errors: Point out any logical flaws, bugs, or potential runtime errors"
**Texto:** `-- Identify and Correct Errors: Point out any logical flaws, bugs, or potential runtime errors.` (input.md:209)
**Tipo:** Inferencia calibrada (0.75)
**Justificación:** Esta es una instrucción de sistema razonable y con precedentes en la
literatura de prompting para code review. GPT-4o con instrucciones de revisión de código
efectivamente identifica errores lógicos y runtime en benchmarks de code review (HumanEval,
SWEBench). El claim de que el system prompt puede elicitar este comportamiento es calibrado.
Sin embargo, la nota editorial (input.md:246-254) confirma que este prompt NO está integrado
en el código de Tabla 2 — la arquitectura presentada usa su propio prompt de feedback
diferente.
**Impacto:** Medio (claim verificable sobre el system prompt pero desconectado del código)

### C-04: "Offer Corrected Code: Show the 'before' and 'after'"
**Texto:** `-- Offer Corrected Code: Show the "before" and "after" of your suggested changes` (input.md:211)
**Tipo:** Inferencia calibrada (0.75)
**Justificación:** Instrucción de prompting válida. Los LLMs como GPT-4o son capaces de
producir outputs "before/after" cuando se les instruye. La instrucción es clara y el
comportamiento esperado es razonable de obtener. Sin embargo: (a) el código de Tabla 2 no
integra este prompt (Nota 5), por lo que el sistema presentado no produce outputs "before/after";
(b) el formato de output de `get_code_feedback` simplemente retorna texto libre de feedback
sin estructura "before/after".
**Impacto:** Medio

### C-05: Tabla 3 (Expert Code Reviewer) NO está integrada en el código de Tabla 2
**Texto:** Tabla 3 presentada como artefacto del capítulo (input.md:203-213); código de
Tabla 2 no contiene ninguna referencia a este prompt (input.md:39-199); nota editorial
(input.md:246-254)
**Tipo:** Observación directa (1.0)
**Justificación:** El código completo de Tabla 2 (199 líneas) usa exactamente tres prompts:
1. `generate_prompt` (input.md:76-89): instrucción de generación de código
2. `feedback_prompt` en `get_code_feedback` (input.md:93-99): instrucción de review
3. `review_prompt` en `goals_met` (input.md:107-117): instrucción de evaluación

El system prompt de Tabla 3 no aparece en ninguno de estos tres. La búsqueda es exhaustiva
dado que el código completo está disponible. La contradicción C-6 del deep-dive previo
queda confirmada con evidencia directa.
**Impacto:** Alto (afecta la presentación del patrón Expert Code Reviewer como feature del sistema)

### C-06: Claim de "deep commitment to producing clean, correct, and simple code" como atributo del system prompt
**Texto:** "Act as an expert code reviewer with a deep commitment to producing clean, correct, and simple code." (input.md:206)
**Tipo:** Claim performativo (0.10)
**Justificación:** "Deep commitment" es lenguaje aspiracional sin mecanismo de verificación.
Un LLM no tiene "commitment" — tiene patrones de respuesta condicionados por el prompt.
La instrucción puede elicitar outputs que parecen comprometidos con esas propiedades, pero
el claim mezcla lenguaje de agencia ("commitment") con comportamiento estadístico. Es
característica del género "system prompt marketing" — lenguaje de aspiración, no especificación
verificable.
**Impacto:** Bajo (lenguaje de framing, no afecta el comportamiento técnico del sistema)

**Subtotal Tabla 3:** 2/6 calibrados (33.3%)

---

## Tabla consolidada de afirmaciones performativas: 5 claims

| # | Texto (abreviado) | Sección | Línea input | Impacto | Evidencia propuesta |
|---|-------------------|---------|-------------|---------|---------------------|
| 1 | "eliminate code hallucinations" | Tabla 3 | L:207 | Medio | Benchmark con/sin prompt, métricas de alucinación |
| 2 | "ensuring every suggestion is grounded in reality" | Tabla 3 | L:207 | Bajo | Evaluación de sugerencias contra benchmark definido |
| 3 | "deep commitment to producing clean, correct, and simple code" | Tabla 3 | L:206 | Bajo | Ninguna posible — claim de agencia en sistema no agente |
| 4 | "until the goals are met" — guarantee implícita | Tabla 2 docstring | L:49 | Alto | Tasa de éxito del LLM-as-judge en N iteraciones con benchmark |
| 5 | "Goals Setting and Monitoring" — monitoring real vs. LLM proxy | Contexto | — | Alto | Métrica objetiva de progreso hacia goals (no solo LLM judge) |

---

## Análisis CAD — Calibración por dominio

| Dominio | Claims | Calibrados | % | Evaluación |
|---------|--------|------------|---|------------|
| Tabla 1 (instalación) | 4 | 3 | 75.0% | Bien calibrado — comandos verificables |
| Tabla 2 (código Python) | 22 | 15 | 68.2% | Parcialmente calibrado — código correcto pero diseño con gaps |
| Tabla 3 (Expert Code Reviewer) | 6 | 2 | 33.3% | Mal calibrado — claims de calidad absolutos + desconexión |
| **Total** | **32** | **20 + 3 parciales** | **71.9%** | **PARCIALMENTE CALIBRADO** |

Nota metodológica sobre el conteo: "calibrados" incluye observaciones directas (14) + inferencias
calibradas (9). Los claims de inferencia calibrada tienen peso 0.75, no 1.0 — el ratio ponderado
(71.4%) refleja esto más precisamente que el ratio binario (71.9%).

---

## Pregunta específica: ¿El código tiene mejor calibración que el texto descriptivo?

**Respuesta: Sí, el código (Tabla 2) eleva la calibración global, pero Tabla 3 la suprime.**

Desglose del mecanismo:

**Por qué el código eleva la calibración:**
El código es verificable por inspección directa: imports, APIs, flujo de control, nombres de
variables, type hints — todos son observables sin ejecutar el programa. 14 de los 32 claims
totales son observaciones directas, casi todos provenientes del código (B-01 a B-21). El texto
descriptivo del capítulo original (60.6%) no tenía esta densidad de observaciones directas
porque describía el comportamiento del sistema sin mostrarlo.

**Por qué la elevación es limitada (+11.3pp, no mayor):**
1. El código contiene bugs reales (B-08 UnboundLocalError, B-10 silent termination) que son
   observables directamente — son claims negativos verificados, no especulativos. Su presencia
   en el análisis es necesaria pero no degrada la calibración (son observaciones directas de bugs).
2. El docstring del módulo contiene claims sobre el comportamiento del sistema (B-12, B-22)
   que son inferencias especulativas — el código no garantiza lo que el docstring afirma.
3. Tabla 3 (Expert Code Reviewer) tiene calibración 33.3% — 6 claims con 4 performativos/especulativos.
   Si Tabla 3 se excluye, la calibración del código puro (Tablas 1+2) sería 21/26 = **80.8%**,
   lo que sería CALIBRADO por el umbral THYROX (≥75%).

**Conclusión sobre el delta:**
El contenido puramente ejecutable/verificable (Tabla 1 + Tabla 2) está en 80.8% — superando
el umbral de artefacto calibrado. Tabla 3 (system prompt editorial sin integración al código)
arrastra la calibración global a 71.9%. La desconexión de Tabla 3 del código es el principal
factor que impide que las tablas alcancen calibración plena.

---

## Hallazgos que confirman o agregan a los análisis previos

### Confirmaciones del deep-dive previo (goal-monitoring-original-deep-dive.md)

1. **C-6 confirmado:** Expert Code Reviewer (Tabla 3) no está integrado en el código (C-05).
   El análisis previo lo detectó por descripción textual; ahora está confirmado con código completo.

2. **Silent termination confirmado:** El loop se agota sin distinguir éxito de fracaso (B-10).
   El análisis previo lo identificó por descripción; el código lo hace inequívoco.

3. **Dead code `to_snake_case` confirmado:** Función definida, nunca llamada (B-05).

4. **`UnboundLocalError` confirmado:** El análisis previo lo detectó; el código completo lo
   muestra sin ambigüedad (B-08).

### Hallazgos nuevos no disponibles sin el código completo

1. **Type hint incorrecto en `get_code_feedback`:** Declara `-> str`, retorna `AIMessage` (B-13).

2. **Asimetría de truthiness de `feedback`:** `if feedback:` evalúa diferente en iteración 1
   vs. iteraciones 2+ (B-06b).

3. **LLM call para nombre de archivo:** `save_code_to_file` hace una llamada LLM adicional con
   edge case de string vacío no manejado (B-09).

4. **`chr(10).join` como workaround de f-string:** Correcto pero inusual (B-20).

---

## Comparación con calibraciones anteriores del mismo capítulo

| Análisis | Claims | Calibrados | Ratio | Delta |
|----------|--------|------------|-------|-------|
| Cap.11 EPUB original (sin tablas) | 33 | 20 | 60.6% | baseline |
| Cap.11 traducción española | 30 | 19 | 63.3% | +2.7pp |
| Cap.11 tablas suplementarias (este análisis) | 32 | 23 | 71.9% | +11.3pp vs. original |

**Interpretación del delta:**
El salto de +11.3pp entre el texto del capítulo y las tablas suplementarias confirma que el
código fuente es más verificable que el texto descriptivo — exactamente como cabría esperar.
Sin embargo, el delta no elimina los problemas de calibración: el 28.1% no-calibrado de las
tablas incluye los claims más importantes del capítulo (la garantía de monitoring, la eficacia
del Expert Code Reviewer, la promesa de "until goals are met").

**Visión integrada del Cap.11:**
Si se combinan los tres análisis (texto original + traducción + tablas), el patrón consistente
es: el capítulo describe un patrón válido (generate-evaluate-refine) pero lo denomina "Goal
Setting and Monitoring" creando expectativas que el mecanismo implementado (LLM-as-judge +
silent termination) no puede verificar. El código en Tabla 2 es técnicamente ejecutable y
en su mayoría correcto; los problemas de calibración están concentrados en (a) los claims
sobre lo que el sistema hace vs. lo que realmente hace, y (b) el system prompt de Tabla 3
que promete más de lo que implementa.

---

## Recomendación: Iterar antes de usar como referencia de patrón

El contenido de las tablas es **ejecutable** (puede correrse) pero **parcialmente calibrado**
como referencia de patrón. Para uso como artefacto de enseñanza sobre "Goal Setting and
Monitoring":

1. Tabla 2 requiere al menos: (a) guard para `max_iterations=0`, (b) mensaje de output
   cuando el loop se agota sin alcanzar goals, (c) corrección del type hint de
   `get_code_feedback`.

2. Tabla 3 requiere: (a) integración real al código o eliminación del capítulo, (b) reframing
   del claim "eliminate hallucinations" a "reduce hallucinations".

3. El docstring debe reflejar: "genera y refina código hasta que el LLM-judge confirme que
   los goals están met o hasta que se agoten las iteraciones, guardando el resultado en
   ambos casos".
