```yml
created_at: 2026-04-19 11:07:56
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Chapter 16: Resource-Aware Optimization — Tablas y Bloques de Código (7 tablas HTML, sin texto del capítulo)"
veredicto_síntesis: ENGAÑOSO
saltos_lógicos: 6
contradicciones: 5
engaños_estructurales: 7
```

# Deep-Dive Adversarial — Chapter 16: Resource-Aware Optimization

---

## ADVERTENCIA DE COMPLETITUD DEL INPUT

El input analizado contiene EXCLUSIVAMENTE las 7 tablas HTML del capítulo. El texto
narrativo del capítulo principal (CAP16_EXTRACTION.adoc) no fue proporcionado. Las
siguientes categorías de claims son por definición no analizables:

- Definiciones formales de "resource-aware optimization" que el capítulo pueda hacer
- Justificación del threshold 20 en el texto (si existe)
- Advertencias o disclaimers sobre el código de tercero
- Claims sobre qué escenarios cada modelo maneja mejor

El análisis que sigue es válido y exhaustivo para el material recibido. Los hallazgos
pueden estar incompletos si el texto narrativo contiene claims que contradicen o
mitigan los bugs identificados. Esto no reduce la gravedad de los bugs — solo limita
la capacidad de atribuir intención al autor.

---

## CAPA 1: LECTURA INICIAL

### Objetivo declarado del capítulo (inferido de las tablas)

El capítulo presenta un sistema de routing de queries entre modelos de diferente costo.
La premisa es que no todas las queries necesitan el modelo más potente (y costoso): queries
simples pueden resolverse con modelos baratos y rápidos, reservando los modelos avanzados
para queries complejas. Esto es lo que el título llama "resource-aware optimization".

### Estructura inferida: premisa → mecanismo → resultado

```
Premisa:     Los LLMs tienen diferentes costos y capacidades.
             Usar siempre el modelo más caro es sub-óptimo en recursos.

Mecanismo:   Un agente router clasifica la complejidad de la query
             y despacha al modelo apropiado.

Resultado:   Ahorro de costo/tokens sin degradar calidad para queries simples.
```

### Componentes presentados (por tabla)

| Tabla | Contenido | Naturaleza declarada |
|-------|-----------|---------------------|
| T1 | Dos agentes ADK (Gemini Pro + Flash) | "Conceptual, not runnable" |
| T2 | QueryRouterAgent por longitud de palabras | "Conceptual, not runnable" |
| T3 | CRITIC_SYSTEM_PROMPT como string | Sin declaración de naturaleza |
| T4 | Router completo con OpenAI (MIT, Mahtab Syed 2025) | Código ejecutable de tercero |
| T5 | Llamada básica a OpenRouter API | Sin declaración de naturaleza |
| T6 | JSON de auto-routing de OpenRouter | Sin declaración de naturaleza |
| T7 | JSON de fallback array de OpenRouter | Sin declaración de naturaleza |

### Mecanismo central de routing (Tabla 2)

```python
query_length = len(user_query.split())
if query_length < 20:
    # → Gemini Flash (barato)
else:
    # → Gemini Pro (caro)
```

### Mecanismo central de routing (Tabla 4 — tercero)

```
classify_prompt() → "simple" | "reasoning" | "internet_search"
                         ↓              ↓              ↓
                    gpt-4o-mini      o4-mini         gpt-4o
```

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

- **Google ADK (Agent Development Kit)**: referenciado en T1 y T2 vía `from google.adk.agents import Agent, BaseAgent`. Framework real — no verificable en el código dado que T1/T2 se declaran "not runnable".
- **OpenRouter**: plataforma real de routing multi-modelo. T5, T6, T7 lo referencian.
- **Patrón de routing condicional**: patrón legítimo de ML ops — clasificar complejidad antes de despachar.
- **OpenAI API**: biblioteca real, usada correctamente en T4 a nivel de interfaz de cliente.

### Sub-capa B: Aplicaciones concretas

- T2 aplica el patrón de routing usando `len(split())` — aplicación analógica, no derivada formalmente de ningún framework.
- T4 aplica clasificación LLM-like para routing — derivación plausible del patrón, pero con bugs de implementación críticos (ver Capa 3).
- T3 presenta un `CRITIC_SYSTEM_PROMPT` cuya relación con resource-aware optimization no está establecida.

### Sub-capa C: Números específicos

| Valor | Ubicación | Fuente declarada |
|-------|-----------|-----------------|
| `< 20` (threshold de palabras) | T2, línea 8 | Ninguna — comentario dice "Example threshold" |
| `temperature=1` (clasificador) | T4, `classify_prompt` | Ninguna — default aparente |
| `temperature=1` (generador) | T4, `generate_response` | Ninguna |
| `num_results=1` (búsqueda Google) | T4, `google_search` | Ninguna |

Todos los números carecen de fuente empírica o derivación. Son valores hardcodeados sin
respaldo documentado.

### Sub-capa D: Afirmaciones de garantía

- **Implícita en título**: "Resource-Aware Optimization" implica que el sistema optimiza uso de recursos.
- **Implícita en T2**: el threshold de 20 palabras distingue queries simples de complejas.
- **Implícita en T4**: el sistema de clasificación LLM dirige correctamente al modelo apropiado.

Ninguna de estas garantías está validada con datos.

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

```
SALTO-1: [Queries cortas son simples] → [Routing por longitud de palabras es resource-aware]
Ubicación: T2, línea 8 ("Example threshold for simplicity vs. complexity")
Tipo de salto: analogía sin derivación
Tamaño: CRÍTICO
Justificación que debería existir: correlación empírica entre longitud de query y costo
de inferencia necesario; análisis de distribución de queries por complejidad real.
```

```
SALTO-2: [Clasificador LLM retorna categoría válida] → [json.loads() siempre tiene éxito]
Ubicación: T4, función classify_prompt(), línea final
Tipo de salto: asunción implícita sin manejo defensivo
Tamaño: CRÍTICO
Justificación que debería existir: try/except JSONDecodeError; validación del campo
"classification" contra el enum esperado.
```

```
SALTO-3: [google_search() fue llamado] → [search_results es list iterable]
Ubicación: T4, handle_prompt() + generate_response() bajo classification=="internet_search"
Tipo de salto: asunción implícita que viola el type contract
Tamaño: CRÍTICO
Justificación que debería existir: verificación explícita de que search_results no es
dict de error antes de iterar; manejo de caso de error de red.
```

```
SALTO-4: [CRITIC_SYSTEM_PROMPT existe como string] → [forma parte del sistema resource-aware]
Ubicación: T3, completa
Tipo de salto: presencia sin integración demostrada
Tamaño: MEDIO
Justificación que debería existir: código que instancie un agente critic con este prompt
y lo conecte al pipeline de routing.
```

```
SALTO-5: [OpenRouter existe y tiene auto-routing] → [usar "openrouter/auto" implementa resource-aware optimization]
Ubicación: T6
Tipo de salto: delegación externa sin análisis de comportamiento
Tamaño: MEDIO
Justificación que debería existir: descripción de qué criterios usa OpenRouter internamente
para su auto-routing; comparación con la implementación propia del capítulo.
```

```
SALTO-6: [generate_response recibe classification] → [siempre ejecuta uno de los 3 ramos del if/elif]
Ubicación: T4, generate_response(), estructura condicional
Tipo de salto: path implícito sin else — variable 'model' puede quedar sin asignar
Tamaño: CRÍTICO
Justificación que debería existir: else/raise para clasificación inesperada; asignación
de 'model' garantizada antes de usarla en el return.
```

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

```
CONTRADICCIÓN-1:
Afirmación A: "def google_search(query: str, num_results=1) -> list:" (T4, línea de firma)
Afirmación B: "return {"error": str(e)}" (T4, bloque except)
Por qué chocan: La firma declara list; el except retorna dict. Son tipos incompatibles.
               El caller itera sobre el resultado asumiendo list — con dict itera sobre keys.
Cuál prevalece: B (el código ejecutado) — pero viola A (el contrato declarado).
               Resultado: type contract roto, bug silencioso en runtime.
```

```
CONTRADICCIÓN-2:
Afirmación A: "def generate_response(prompt: str, classification: str, search_results=None) -> str:" (T4)
Afirmación B: "return response.choices[0].message.content, model" (T4, final de la función)
Por qué chocan: La firma declara str; el return produce tuple(str, str).
               En Python, retornar dos valores separados por coma siempre produce tuple.
Cuál prevalece: B (el comportamiento real) — pero cualquier consumidor que use la firma
               como contrato obtiene un tipo inesperado.
```

```
CONTRADICCIÓN-3:
Afirmación A: classify_prompt debe retornar categoría determinística de tres opciones fijas
              (objetivo implícito: routing predecible)
Afirmación B: "temperature=1" en classify_prompt (T4, línea dentro de client.chat.completions.create)
Por qué chocan: temperature=1 maximiza variabilidad estocástica; routing predecible
               requiere temperature=0. Los objetivos son opuestos.
Cuál prevalece: B (es el código que se ejecuta). El routing es no-determinístico por diseño.
```

```
CONTRADICCIÓN-4:
Afirmación A: Tablas 1 y 2 son "Conceptual Python-like structure, not runnable code"
              (advertencia explícita en el código)
Afirmación B: Tablas 6 y 7 presentan JSON inválido sin ninguna advertencia equivalente
Por qué chocan: El capítulo aplica la advertencia de forma inconsistente. Si el estándar
               es advertir cuando el código no es ejecutable, Tablas 6 y 7 deberían tener
               el mismo disclaimer. Su ausencia implica falsamente que el JSON es válido.
Cuál prevalece: Ninguna es consistente — el capítulo tiene dos estándares para el mismo problema.
```

```
CONTRADICCIÓN-5:
Afirmación A: generate_response() tiene una estructura if/elif para "simple", "reasoning",
              "internet_search" — implica que esas son las únicas clasificaciones posibles
Afirmación B: classify_prompt() con temperature=1 puede retornar texto libre, incluyendo
              clasificaciones fuera de esas tres categorías, o incluso output no-JSON
Por qué chocan: El sistema asume que la clasificación siempre es uno de los tres valores
               válidos. No hay else en generate_response. Si classify_prompt retorna
               "complex" o "factual" (valores no en el enum), 'model' queda sin asignar
               y el código lanza UnboundLocalError.
Cuál prevalece: La contradicción es real y produce crash en runtime para input inesperado.
```

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

### Engaño 1: Credibilidad prestada — título vs. implementación

**Patrón:** Credibilidad prestada + Profecía auto-cumplida

"Resource-Aware Optimization" como título implica: métricas de costo real, feedback loop,
optimización dinámica. El único mecanismo de "resource awareness" implementado es
`len(user_query.split()) < 20`. El título presta al capítulo la credibilidad del dominio
de optimización de recursos sin que el código lo implemente.

### Engaño 2: Notación formal encubriendo especulación

**Patrón:** Números redondos disfrazados

El threshold `< 20` aparece con el comentario "Example threshold for simplicity vs. complexity".
El comentario es honesto sobre el nombre ("Example") pero la presencia de un número concreto
en código ejecutable da la ilusión de que fue calibrado. No hay estudio que respalde que
20 palabras es el punto de inflexión entre query simple y compleja en ningún dominio.

### Engaño 3: Código de tercero presentado como ejemplo pedagógico

**Patrón:** Validación en contexto distinto

Tabla 4 es código MIT de Mahtab Syed 2025. El código fue escrito para otro propósito
(posiblemente un tutorial independiente), no como material pedagógico del libro. Al
incluirlo, el capítulo implícitamente certifica sus type annotations como correctas y
su arquitectura como "el patrón a seguir". Pero el código tiene bugs de tipos en dos
funciones públicas. El capítulo usa la credibilidad del "código real ejecutable" de un
tercero para respaldar sus claims sobre routing, sin verificar los contratos del código.

### Engaño 4: Inconsistencia de disclaimers como señal de rigor selectivo

**Patrón:** Limitación enterrada por omisión diferencial

Tablas 1 y 2 tienen advertencia explícita de "not runnable code". Tablas 6 y 7 presentan
JSON inválido sin advertencia. La presencia del disclaimer en T1/T2 crea la impresión de
que el capítulo es cuidadoso con la distinción ejecutable/conceptual. Esa impresión hace
que la ausencia del disclaimer en T6/T7 pase inadvertida — el lector que vio la advertencia
antes asume que su ausencia significa que el JSON es válido.

### Engaño 5: CRITIC_SYSTEM_PROMPT como componente sin integración

**Patrón:** Credibilidad prestada (artefacto de diseño sin implementación)

Tabla 3 presenta un prompt de 7 bullets con formato markdown elaborado. La densidad del
contenido crea la apariencia de un componente de sistema bien especificado. No hay código
en las tablas que muestre cómo este prompt se usa. Es un string que existe para ser leído,
no para ser ejecutado. Patrón idéntico al de Cap.11 T3 (`EXPERT_CODE_REVIEWER_PROMPT`).

### Engaño 6: Bearer token vacío sin señalización como placeholder

**Patrón:** Número/valor redondo disfrazado (variante: placeholder sin advertencia)

`"Authorization": "Bearer "` en T5 tiene un espacio vacío donde debería ir el API key.
Comparado con T4 donde el patrón es `os.getenv("OPENAI_API_KEY")`, T5 no fuerza al
lector a configurar el token — deja el string vacío que resulta en 401 silencioso.
La ausencia de un comentario `# Replace with your token` o `os.getenv(...)` hace que
el código parezca listo para ejecutar cuando no lo está.

### Engaño 7: generate_response con UnboundLocalError latente

**Patrón:** Notación formal encubriendo defecto estructural

La función tiene estructura if/elif sin else. Python no inicializa `model` antes del bloque
condicional. Si `classification` no es ninguno de los tres valores esperados, la función
llega al `return response.choices[0].message.content, model` con `model` sin definir.
La firma limpia de la función (`-> str`) y su estructura aparentemente completa ocultan
que hay un path de ejecución que lanza `UnboundLocalError: local variable 'model'
referenced before assignment`.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente externa |
|-------|--------------------------|----------------|
| Gemini Pro 2.5 y Gemini Flash 2.5 son modelos de diferente costo | Documentación pública de precios de Google | Google AI pricing, 2025 |
| OpenRouter existe y ofrece routing multi-modelo con "openrouter/auto" | API pública verificable | openrouter.ai/docs |
| T1 y T2 no son código ejecutable | Declarado explícitamente en el código mismo | T1/T2 comentario inicial |
| El patrón de clasificar-antes-de-despachar es legítimo en LLM ops | Documentado en múltiples papers de compound AI systems | Shankar et al. 2024 |
| `temperature=0` produce outputs más determinísticos que `temperature=1` en clasificadores | Documentado en la propia documentación de OpenAI | OpenAI API reference |
| `...` y `//` no son JSON válido | RFC 8259 — JSON specification | IETF RFC 8259 |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia contraria |
|-------|-----------------|----------------------------------|
| `google_search() -> list` (T4, firma) | El bloque except retorna `{"error": str(e)}` — tipo dict, no list | Contradicción-1: type contract roto |
| `generate_response() -> str` (T4, firma) | El return produce `tuple(content, model)` — Python interpreta `return a, b` como tuple | Contradicción-2: type contract roto |
| classify_prompt con temperature=1 produce routing predecible | temperature=1 maximiza variabilidad; routing predecible requiere temperature=0 | Contradicción-3 |
| generate_response maneja todos los outputs posibles de classify_prompt | No hay else — si classification es cualquier valor fuera del enum, 'model' queda sin asignar → UnboundLocalError | Contradicción-5 |
| Tablas 6 y 7 son JSON válido (ausencia de advertencia implica validez) | `...` y `//` violan RFC 8259; ningún JSON parser acepta estos snippets | Engaño 4 |
| T5 está listo para ejecutar (ausencia de advertencia implica ejecutabilidad) | `"Bearer "` con token vacío retorna 401 Unauthorized en toda request | Engaño 6 |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| El threshold de 20 palabras distingue queries simples de complejas | No hay datos empíricos en el input; el texto del capítulo (ausente) podría justificarlo | Estudio de correlación entre longitud de query y costo de inferencia necesario |
| CRITIC_SYSTEM_PROMPT (T3) está integrado en el sistema de routing | No hay código de integración en las tablas; el texto del capítulo podría mostrar la integración | Código que use el prompt con un agente concreto |
| La elección de temperature=1 en generate_response es intencional o error | No hay justificación en el código; podría ser intencional para creatividad | Comentario o texto del capítulo explicando la elección |
| El capítulo justifica los bugs de T4 señalando que es código de tercero | El texto del capítulo está ausente | Leer el texto narrativo del capítulo |
| "Resource-aware optimization" implica en el texto métricas más sofisticadas que word-count | El texto del capítulo está ausente | Leer definición del término en el capítulo |

---

## ANÁLISIS EXTENDIDO: BUGS DE IMPLEMENTACIÓN EN DETALLE

### Bug 1 — google_search: Violación de type contract con bug silencioso en cascade

**Ubicación:** T4, función `google_search`, bloque `except requests.exceptions.RequestException`

**Firma declarada:** `-> list`
**Valor retornado en excepción:** `{"error": str(e)}` — tipo `dict`

**Cascada del bug:**

```
google_search() → {"error": "Connection timeout"}     ← dict, no list
       ↓
handle_prompt() → search_results = {"error": "..."}   ← dict asignado a search_results
       ↓
generate_response(prompt, "internet_search", {"error": "..."})
       ↓
for item in search_results:                           ← itera sobre KEYS del dict
    item.get('title')                                 ← item = "error" (string)
    "error".get('title')                              ← AttributeError: str has no .get()
```

El bug no falla en la asignación de tipos — Python no verifica type hints en runtime.
Falla 3 niveles más abajo con un `AttributeError` que apunta a `str.get('title')`,
no al origen real del problema en `google_search`. Esto hace el bug especialmente
difícil de debuggear: el traceback no señala la causa raíz.

**Severidad:** CRÍTICA — rompe el path `internet_search` en cualquier error de red.

### Bug 2 — generate_response: UnboundLocalError en path de clasificación inesperada

**Ubicación:** T4, función `generate_response`, estructura condicional

```python
def generate_response(prompt: str, classification: str, search_results=None) -> str:
    if classification == "simple":
        model = "gpt-4o-mini"        # model asignado
        ...
    elif classification == "reasoning":
        model = "o4-mini"            # model asignado
        ...
    elif classification == "internet_search":
        model = "gpt-4o"             # model asignado
        ...
    # SIN ELSE
    response = client.chat.completions.create(model=model, ...)   # ← model puede no existir
    return response.choices[0].message.content, model
```

Con `temperature=1` en `classify_prompt`, el LLM puede retornar valores fuera del enum.
Ejemplos plausibles: `"complex"`, `"factual"`, `"simple reasoning"`, o incluso la respuesta
envuelta en markdown (`` `json\n{"classification": "simple"}` ``). En cualquiera de estos
casos, ningún ramo del if/elif se ejecuta, `model` queda sin asignar, y Python lanza:

```
UnboundLocalError: local variable 'model' referenced before assignment
```

La combinación de `temperature=1` (que aumenta la probabilidad de output fuera del enum)
con `json.loads` sin try/except (que puede lanzar JSONDecodeError antes de llegar a
generate_response) y la falta de else en generate_response crea un sistema que puede
fallar en múltiples puntos no manejados.

### Bug 3 — generate_response: Violación de type contract en el return

**Ubicación:** T4, última línea de `generate_response`

```python
return response.choices[0].message.content, model
```

En Python, `return a, b` es sintácticamente equivalente a `return (a, b)`. El tipo retornado
es `tuple[str, str]`. La firma declara `-> str`. El caller `handle_prompt` hace:

```python
answer, model = generate_response(...)   # unpacking funciona
```

El unpacking funciona porque `handle_prompt` conoce el comportamiento real. Pero la firma
engañosa tiene consecuencias en cualquier contexto donde alguien:
1. Lea la firma antes de leer la implementación
2. Pase el resultado como argumento a otra función que espera `str`
3. Use type checkers como mypy — reportará error en el return

**Severidad:** MEDIA — no rompe el código como está escrito, pero viola el contrato y rompe
cualquier consumidor que confíe en la firma.

### Bug 4 — classify_prompt: temperature=1 para clasificador determinístico

**Ubicación:** T4, `classify_prompt`, llamada a `client.chat.completions.create`

Un clasificador con tres categorías fijas y reglas explícitas debe ser determinístico.
`temperature=1` introduce variabilidad máxima en el output. Las consecuencias:

1. El mismo prompt puede clasificarse diferente en invocaciones distintas
2. El LLM puede producir output fuera del formato JSON esperado
3. Con mayor variabilidad, el `json.loads` sin try/except tiene mayor probabilidad de fallar

**La solución es trivial:** `temperature=0`. La elección de `temperature=1` aparenta ser
un error de copy-paste desde la función `generate_response` (donde temperature=1 podría
ser defendible para generación creativa).

### Bug 5 — classify_prompt: json.loads sin manejo de JSONDecodeError

**Ubicación:** T4, `classify_prompt`, líneas finales

```python
reply = response.choices[0].message.content
return json.loads(reply)
```

Los LLMs con temperature>0 pueden retornar:
- Texto con explicación antes del JSON: `"The classification is:\n{ "classification": "simple" }"`
- JSON envuelto en markdown: `` ```json\n{"classification": "simple"}\n``` ``
- Texto libre sin JSON: `"I think this is a simple question."`

En todos estos casos, `json.loads(reply)` lanza `json.JSONDecodeError`. No hay try/except.
El sistema colapsa en un escenario perfectamente plausible, especialmente con temperature=1.

**Severidad:** CRÍTICA en producción — el failure mode es un crash no manejado, no un
fallback graceful.

---

## ANÁLISIS EXTENDIDO: PATRÓN "NAMED MECHANISM VS. IMPLEMENTATION"

### Estado en Cap.16 vs. capítulos anteriores

El patrón identificado en Cap.10-15 se confirma en Cap.16 como sexto capítulo consecutivo.

| Aspecto de "Resource-Aware Optimization" | Presente en código |
|------------------------------------------|-------------------|
| Métricas de costo real (tokens, pricing) | NO |
| Routing basado en costo-por-token | NO — solo word count |
| Feedback loop (ajuste del threshold con datos) | NO |
| Monitoring de uso de recursos | NO |
| Configuración dinámica de threshold | NO — hardcoded `< 20` |
| Análisis de trade-off calidad/costo | NO |
| Métricas de latencia por modelo | NO |
| Budget constraints | NO |
| **Word count como proxy de complejidad** | SÍ — única implementación |

La "resource-awareness" del capítulo consiste en un condicional de una línea basado en
`len(user_query.split())`. Todo lo que el título promete — optimización de recursos,
consciencia de costos, selección inteligente de modelo — se reduce a este threshold
de 20 palabras sin calibración empírica.

### Mecanismo de evasión: código de tercero como sustituto de implementación propia

Una variante nueva del patrón en Cap.16: incluir código de tercero (T4, MIT Mahtab Syed)
como si demostrara la funcionalidad del capítulo. El código de tercero:
1. No fue diseñado para ilustrar "resource-aware optimization" — es un tutorial de routing con OpenAI
2. Contiene bugs de tipos no detectados por el capítulo
3. Usa temperatura incorrecta para clasificación
4. No implementa ninguna "resource awareness" más allá de seleccionar modelos por categoría

La inclusión de código de tercero con licencia MIT visible crea la apariencia de que
el capítulo referencia implementaciones reales del ecosistema. En realidad, delega la
demostración a código que no fue validado antes de su inclusión.

---

### Nota de completitud del input

Secciones potencialmente comprimidas: texto narrativo completo del capítulo (ausente)
Saltos no analizables por compresión: justificación del threshold 20, definición formal
de "resource-aware optimization" según el autor, disclaimers sobre bugs de T4, integración
de T3 (CRITIC_SYSTEM_PROMPT) en el sistema general.

El análisis de las 7 tablas es exhaustivo. Los hallazgos de código son independientes del
texto narrativo — los bugs existen en el código independientemente de lo que el texto diga.

---

## Patrón dominante

**Nombre:** Delegación sin verificación + Credibilidad prestada por tercero

**Cómo opera en este capítulo:**

El capítulo enfrenta el problema de demostrar "resource-aware optimization" — un concepto
que requeriría métricas de costo, feedback loops, y configuración dinámica para ser
implementado con rigor. En lugar de implementarlo, el capítulo:

1. Define el mecanismo con código conceptual (T1, T2) que admite no ser ejecutable
2. Delega la "implementación real" a código de tercero (T4) que no fue diseñado para
   el propósito del capítulo y contiene bugs de tipos no detectados
3. Muestra pseudocódigo de OpenRouter (T6, T7) para implicar que el routing sofisticado
   existe, sin implementarlo
4. Incluye un prompt de agente critic (T3) sin integración demostrable, añadiendo
   volumen de contenido que aparenta complejidad arquitectónica

El resultado es que ninguna tabla, individualmente o en conjunto, implementa "resource-aware
optimization" en el sentido que el título promete. El capítulo es un ejercicio de señalización
de rigor a través de: admisiones de limitación (T1/T2 "not runnable"), licenciamiento de
tercero visible (T4 MIT), y configuración de API real (T5-T7). Ninguno de estos elementos
constituye la implementación del mecanismo nombrado.

**Veredicto final: ENGAÑOSO**

El capítulo presenta los componentes superficiales de un sistema de routing (dos modelos,
un clasificador, APIs reales) sin implementar el mecanismo central que nombra. El código
ejecutable incluido (T4) tiene bugs críticos de tipos y control de flujo. El código
presentado como JSON (T6, T7) no es JSON válido. La "resource-awareness" se implementa
exclusivamente como un contador de palabras con threshold arbitrario. El patrón
"Named Mechanism vs. Implementation" se confirma como estructural en la serie.
