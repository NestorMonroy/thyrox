```yml
created_at: 2026-04-19 07:20:05
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "Capítulo 10: MCP — Versión Calibrada 2.0" (documento externo, 2026-04-19)
veredicto_síntesis: PARCIALMENTE VÁLIDO — PARCHE CON REGRESIÓN TÉCNICA
saltos_lógicos: 6
contradicciones: 6
engaños_estructurales: 5
```

# Deep-Dive Adversarial — Cap. 10 MCP: Versión Calibrada 2.0

---

## VERIFICACIÓN DE COMPLETITUD DEL INPUT

El input `mcp-corrected-v2-input.md` presenta el texto completo del documento preservado verbatim, con una nota editorial de 12 ítems que documenta los cambios respecto a V1. Señales evaluadas:

- Todos los ejemplos de código aparecen completos (4 ejemplos)
- Las tablas comparativas están completas con todas las filas incluyendo las nuevas de V2
- Los bloques "CATEGORÍA A/B/C" están completos con todos los casos
- Las secciones de conclusión y "VERDAD FUNDAMENTAL" están completas
- La nota editorial al final identifica correctamente dos bugs residuales: JSON-RPC y Discovery Sec.8

**Señal crítica detectada:** La nota editorial al final del input (líneas 744-757) identifica explícitamente el bug JSON-RPC como persistente en V2 y pregunta si el caveat de Discovery se aplicó en Sec.8. Esta nota proviene del orquestador, NO del documento analizado. El análisis debe tratar estos como hipótesis a verificar, no como hallazgos dados.

**Conclusión:** Input completo. No hay compresión que limite el análisis. Procediendo con las 6 capas.

---

## CAPA 1: LECTURA INICIAL

### Tesis de V2

V2 mantiene la tesis de V1 corregida: MCP es un protocolo cliente-servidor estandarizado que reduce acoplamiento (no complejidad conceptual) al integrar LLMs con herramientas externas. V2 refina tres correcciones específicas sobre V1:

1. **Estructural:** La distinción binaria ANTES/DESPUÉS de V1 se reemplaza por una tabla tridimensional (TRABAJO / ACOPLAMIENTO / COMPLEJIDAD) que separa qué reduce MCP y qué no.
2. **Tablacell nuevo:** La tabla comparativa MCP vs. Tool Calling distingue "Descubrimiento de FUNCIONES" (dinámico) de "Descubrimiento de SERVIDORES" (requiere config previa en ambos casos).
3. **Balanceo explícito:** Sec.2 añade "Interpretación honesta" con criterios numéricos para cuándo Tool Calling es SUPERIOR.

### Premisa → Mecanismo → Resultado declarado

```
Premisa:    Los LLMs necesitan herramientas externas para ser agentes efectivos
Mecanismo:  MCP estandariza la comunicación cliente-servidor con manifiesto de herramientas
Resultado:  Reducción de acoplamiento (no complejidad) + casos de uso con límites claros
```

### Cambios de V1 a V2 (declarados en el input — todos deben ser verificados)

| # | Cambio declarado | Ubicación en V2 | Tipo |
|---|-----------------|----------------|------|
| 1 | Header con scores históricos V1: 79% | Header | Cosmético |
| 2 | "REDUCCIÓN DRAMÁTICA en ACOPLAMIENTO y REPETICIÓN, aunque NO en COMPLEJIDAD CONCEPTUAL" | Sec.1 | Terminológico |
| 3 | Tabla cuantitativa desglosada en TRABAJO/ACOPLAMIENTO/COMPLEJIDAD | Sec.1 | Estructural |
| 4 | Tabla comparativa: filas FUNCIONES vs. SERVIDORES separadas | Sec.2 | Corrección de contenido |
| 5 | Tabla comparativa: filas "Casos ideales" y "Tradeoff" nuevas | Sec.2 | Adición |
| 6 | "Interpretación honesta" — cuándo Tool Calling es SUPERIOR | Sec.2 | Adición honesta |
| 7 | "CLARIFICACIÓN: Parámetro tool_filter (FIX BUG 3)" | Sec.3 | Corrección declarada |
| 8 | Casos de uso en categorías A/B/C | Sec.5 | Restructuración |
| 9 | Financiero: cada requisito explica por qué MCP no lo cumple + veredictos por fase | Sec.5 Cat.C | Corrección de contenido |
| 10 | Gap Desarrollo/Producción: añade 8vo requisito (Rate Limiting) + allocación 20-30%/60-70% | Sec.6 | Adición |
| 11 | Ejemplo 4: TypeVar T explícito + async_wrapper | Sec.7 Ej.4 | Corrección declarada (FIX BUG 1) |
| 12 | Conclusión: "VERDAD FUNDAMENTAL" con 3 afirmaciones + "CUÁNDO MCP NO DEBE USARSE" | Sec.8 | Restructuración |

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

| Framework | Correcto en V2 | Observación |
|-----------|---------------|-------------|
| JSON-RPC 2.0 | Citado, pero mal aplicado | Ver Capa 3 SALTO-6 — `method: tool_name` viola la especificación |
| Arquitectura cliente-servidor | Correcto | Sin cambios vs. V1 |
| SSE / STDIO como transportes | Correcto | Mencionados en Sec.3 consideración 8 |
| ACID para transacciones financieras | Correcto | La caracterización de por qué MCP no lo cumple es técnicamente válida |
| asyncio / aiohttp | Parcialmente correcto | Ver SALTO-4: bug síncrono persiste con TypeVar incorrecto |

### Sub-capa B: Aplicaciones concretas — nuevas en V2

| Claim aplicado | Derivado o analógico | Evaluación |
|---------------|---------------------|-----------|
| Tabla TRABAJO/ACOPLAMIENTO/COMPLEJIDAD | Estimación editorial — no derivada | Los tres ejes son conceptualmente correctos como distinción; los números siguen sin fuente |
| "Casos ideales: Tool Calling para 1-5 funciones; MCP para 10+ herramientas" | Estimación editorial | Los umbrales (1-5, 10+) no tienen derivación formal; son heurísticas |
| "tool_filter en HttpServerParameters — más recomendado; StdioServerParameters — menos necesario" | Prescripción editorial | INCIERTO — depende de la API real de ADK que no se verifica |
| Patrón 3 fases para finanzas (Análisis → Autorización → Ejecución) | Prescripción sin validación de completitud | Heredado de V1 — los gaps de idempotencia post-firma persisten |
| Categorías A/B/C para casos de uso | Taxonomía editorial | La clasificación es internamente consistente; hay un caso mal clasificado (ver CONTRADICCIÓN-4) |

### Sub-capa C: Números específicos en V2

| Valor | Fuente declarada | Evaluación |
|-------|-----------------|-----------|
| 200-500 líneas sin MCP | Ninguna | INCIERTO — estimación editorial; heredado de V1 |
| 50 líneas con MCP (V2 reduce de "50-100" a "50 líneas" flat) | Ninguna | INCIERTO — V2 usa "50 líneas" (sin rango) en la tabla; V1 usaba "50-100"; la reducción del rango es injustificada |
| 20-30% esfuerzo en código MCP | Ninguna | INCIERTO — estimación editorial |
| 60-70% esfuerzo en capas de producción | Ninguna | INCIERTO — estimación editorial; heredado de V1 |
| Umbral "1-5 funciones" para Tool Calling | Ninguna | INCIERTO — heurística |
| Umbral "10+ herramientas" para MCP | Ninguna | INCIERTO — heurística |
| max_retries=3, timeout_sec=5.0, backoff_base=2.0 | Convención | INCIERTO como parámetros MCP-específicos |

**Observación:** V2 cambia "50-100 líneas" (rango de V1) a "50 líneas" (valor único). Este es un cambio regresivo: un rango tenía más honestidad epistémica que un punto. El valor único "50 líneas" es más falso con más apariencia de precisión.

### Sub-capa D: Afirmaciones de garantía en V2

| Garantía | Estado en V2 | Evaluación |
|---------|-------------|-----------|
| "FIX BUG 1: Decorador async correcto" | Declarada corregida | PARCIALMENTE FALSO — TypeVar T está presente pero el tipo del parámetro es incorrecto (ver SALTO-4) |
| "FIX BUG 2: Discovery correcto en Sec.1" | Declarada corregida | VERDADERO — la corrección está en Sec.1 y Sec.2 |
| "FIX BUG 3: Clarificación tool_filter en Sec.3" | Declarada corregida | PARCIALMENTE VERDADERO — la clarificación existe pero la ubicación en el código (Ej.3) no fue verificada |
| "MCP estandariza COMUNICACIÓN, no CORRECTITUD" | Nueva en V2 | VERDADERO — afirmación técnicamente precisa |
| "MCP reduce ACOPLAMIENTO, no COMPLEJIDAD CONCEPTUAL" | Nueva en V2 | VERDADERO — afirmación técnicamente precisa |

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

```
SALTO-1: [Tabla TRABAJO/ACOPLAMIENTO/COMPLEJIDAD con "50 líneas"] → [cuantificación rigurosa del beneficio de MCP]
Ubicación: Sec.1, tabla comparativa ANTES/CON MCP
Tipo de salto: número sin fuente presentado como medición, con regresión vs. V1
Tamaño: crítico
Análisis: V2 cambia de "50-100 líneas" (V1, rango honesto) a "50 líneas" (V2, valor único).
Este cambio va en dirección opuesta a la honestidad epistémica. Un rango expresa incertidumbre
medida; un valor único expresa falsa precisión. La tabla dice:
  "Integración LLM + Servidor MCP A: 50 líneas (patrón genérico)"
  "Integración LLM + Servidor MCP B: 50 líneas (mismo patrón)"
  "Integración LLM + Servidor MCP C: 50 líneas (mismo patrón)"
El Ejemplo 1 (cliente local básico) tiene ~18 líneas de código activo. El Ejemplo 3 tiene ~16 líneas.
Estos son DEVELOPMENT examples que el capítulo mismo desautoriza para producción. El Ejemplo 4
(PRODUCCIÓN) tiene ~90 líneas solo en el decorador + ~25 en el cliente = ~115 líneas antes de
las 8 consideraciones de Sec.3. La tabla usa el caso de desarrollo para cuantificar el beneficio
que se promete en producción — exactamente lo que CONTRADICCIÓN-1 de V1 identificó, y que V2 no
resuelve; en cambio, hace el número más específico y por tanto más incorrecto.
Justificación que debería existir: separar cuantificación de desarrollo vs. producción, o usar
rango con reconocimiento explícito de que el rango aplica a código básico sin capas de producción.
```

```
SALTO-2: [Umbral "1-5 funciones" para Tool Calling; "10+ herramientas" para MCP] → [criterios válidos de decisión]
Ubicación: Sec.2, "Interpretación honesta"
Tipo de salto: heurísticas presentadas como criterios técnicos
Tamaño: medio
Análisis: Los umbrales 1-5 y 10+ son heurísticas. No están derivados de análisis de overhead de
MCP en distintas escalas, ni de benchmarks de latencia, ni de estudios de mantenibilidad. Son
números que suenan razonables. El problema operacional: un sistema con 6 funciones fijas podría
estar mejor con MCP si hay 3 equipos distintos consumiendo las mismas herramientas (criterio de
reutilización). Un sistema con 15 funciones podría estar mejor con Tool Calling si todas son
específicas de una sola aplicación monolítica y nunca cambian. Los umbrales numéricos ocultan
que la variable real es reutilización + frecuencia de cambio + overhead aceptable, no el conteo.
Justificación que debería existir: derivación de los umbrales desde análisis de overhead de MCP
(tiempo de setup del servidor, latencia de manifiesto), o reconocimiento explícito de que son
heurísticas, no umbrales calibrados.
```

```
SALTO-3: [FIX BUG 3: "tool_filter en HttpServerParameters — más recomendado"] → [corrección de ubicación del parámetro]
Ubicación: Sec.3, CLARIFICACIÓN tool_filter
Tipo de salto: prescripción sin verificación contra la API real
Tamaño: crítico
Análisis: V1 tenía el bug de tool_filter potencialmente en ubicación incorrecta (dentro de
HttpServerParameters vs. en MCPToolset). FIX BUG 3 intenta corregirlo con texto prescriptivo.
Pero el Ejemplo 3 del capítulo muestra:
    MCPToolset(
        connection_params=HttpServerParameters(
            url=FASTMCP_SERVER_URL,
            tool_filter=['greet']   ← DENTRO de HttpServerParameters
        )
    )
Si tool_filter es argumento de MCPToolset (no de HttpServerParameters), este código sigue siendo
incorrecto. La "CLARIFICACIÓN" en texto no verifica si el código del Ejemplo 3 es coherente con
la API real de ADK. Hay dos posibilidades:
  (a) tool_filter SÍ es argumento de HttpServerParameters en ADK — entonces el Ejemplo 3 es
      correcto y la "clarificación" es redundante.
  (b) tool_filter es argumento de MCPToolset — entonces el Ejemplo 3 sigue siendo incorrecto y
      el FIX BUG 3 es performativo (corrige el texto sin corregir el código).
El capítulo no verifica cuál aplica. FIX BUG 3 es INCIERTO en su efectividad.
Justificación que debería existir: verificación contra la documentación de ADK de si tool_filter
es argumento de HttpServerParameters o de MCPToolset, y corrección del código Ejemplo 3 si aplica.
```

```
SALTO-4: [TypeVar T + Callable[..., Awaitable[T]] → "decorador async correcto"] → [FIX BUG 1 completo]
Ubicación: Sec.7, Ejemplo 4, decorador with_retry_and_logging
Tipo de salto: corrección del tipo de retorno sin corrección del tipo de entrada
Tamaño: crítico
Análisis: V2 declara "FIX BUG 1: TypeVar T explícito en type hints del decorador".
El código muestra:
    T = TypeVar('T')
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            ...
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=timeout_sec
            )
El TypeVar T CORRIGE el tipo de retorno (antes era genérico Any, ahora es T).
PERO: Callable[..., Awaitable[T]] en el tipo del parámetro func ES EL PROBLEMA:
  - Si func es `async def`, entonces func(*args, **kwargs) retorna una coroutine (que es Awaitable[T]) — CORRECTO
  - Si func NO es `async def`, entonces func(*args, **kwargs) retorna T directamente (no Awaitable[T])
  - En el segundo caso, asyncio.wait_for(T_instance, timeout=...) lanzará TypeError porque
    asyncio.wait_for espera un awaitable, no un valor ya resuelto
  
El tipo del PARÁMETRO (Callable[..., Awaitable[T]]) teóricamente restringe a funciones que
retornan Awaitable — pero esto es solo anotación de tipos en Python. Python no enforce type
hints en runtime. Si se pasa una función síncrona, Python no lanzará error en la llamada al
decorador — el error ocurrirá en runtime cuando asyncio.wait_for reciba un valor no-awaitable.

DIFERENCIA CRÍTICA ENTRE V1 Y V2:
V1 original del bug: el tipo era Callable[..., Any] — explícitamente permitía cualquier callable
V2 con FIX BUG 1: el tipo es Callable[..., Awaitable[T]] — teóricamente restringe a async
La corrección del tipo mejora la DOCUMENTACIÓN del contrato pero NO el COMPORTAMIENTO EN RUNTIME.
Un desarrollador que pase una función síncrona al decorador recibirá el mismo TypeError en ambas
versiones. FIX BUG 1 es una corrección de type hints, no de comportamiento.

El análisis de V1 identificó que el bug crítico era "asyncio.wait_for falla con funciones síncronas".
El fix corrige la anotación de tipos, que es la mitad correcta. La otra mitad sería agregar una
verificación en runtime: `if not asyncio.iscoroutinefunction(func): raise TypeError(...)` o
implementar una rama síncrona separada.
Justificación que debería existir: agregar verificación en runtime que detecte funciones síncronas
y lance TypeError inmediatamente (fail-fast) en lugar de dejar el error ocurrir dentro del await,
o documentar explícitamente que el decorador es SOLO para funciones async.
```

```
SALTO-5: ["VERDAD FUNDAMENTAL: MCP estandariza COMUNICACIÓN, no CORRECTITUD"] → [afirmación que resuelve la tensión central del capítulo]
Ubicación: Sec.8, VERDAD FUNDAMENTAL
Tipo de salto: afirmación correcta pero incompleta como cierre
Tamaño: pequeño
Análisis: Las 3 afirmaciones de VERDAD FUNDAMENTAL son técnicamente correctas:
  - "MCP estandariza COMUNICACIÓN, no CORRECTITUD" — VERDADERO
  - "MCP reduce ACOPLAMIENTO, no COMPLEJIDAD CONCEPTUAL" — VERDADERO
  - "MCP simplifica INTEGRACIÓN, no GARANTÍAS OPERACIONALES" — VERDADERO
El salto es que estas afirmaciones se presentan como cierre resolutivo, pero no abordan el
problema estructural que el capítulo mismo identificó en Sec.1: la corrección de CATEGORÍA A
(casos "válidos") depende del diseño de las APIs subyacentes, no solo del uso de MCP.
Los casos A (Integración de BD, APIs externas, extracción) son presentados como VÁLIDOS sin
condición, pero la VERDAD FUNDAMENTAL implica que su corrección también depende de que el
protocolo de comunicación sea suficiente. Para BD: ¿tiene la API de BD paginación? ¿Filtrado?
Para extracción: ¿el formato es consumible? La VERDAD FUNDAMENTAL cierra el documento sin
resolver que los casos A están sujetos a las mismas condiciones de Sec.1 advertencia.
Justificación que debería existir: un caveat adicional en VERDAD FUNDAMENTAL que conecte con
la advertencia de Sec.1: "MCP es correcto para Categoría A SI las APIs subyacentes están
diseñadas para consumo agéntico."
```

```
SALTO-6: [payload = {'jsonrpc': '2.0', 'method': tool_name, 'params': params, 'id': 1}] → [llamada MCP válida]
Ubicación: Sec.7, Ejemplo 4, método call_tool, línea de construcción del payload
Tipo de salto: violación de especificación de protocolo
Tamaño: crítico
Análisis: La especificación JSON-RPC 2.0 de MCP define que las llamadas a herramientas usan:
  method: "tools/call"
  params: { "name": "<tool_name>", "arguments": { ... } }
El código usa:
  method: tool_name     ← INCORRECTO — tool_name es el nombre de la herramienta, no el método
  params: params        ← INCORRECTO — params debería ser {name: tool_name, arguments: params}
Esta es una violación del protocolo MCP real. Un servidor MCP real rechazará esta solicitud
porque no reconocerá `method: "greet"` como un método válido JSON-RPC — solo reconoce
`method: "tools/call"`, `method: "tools/list"`, `method: "resources/list"`, etc.
El Ejemplo 4 está presentado como "Cliente Robusto para PRODUCCIÓN" y funciona para el
servidor FastMCP del Ejemplo 2 (que puede o no ser permisivo con el método) pero NO
funciona con un servidor MCP conformante a la especificación oficial.
Este bug fue identificado en el análisis de V1 (SALTO del original). NO fue corregido en V2.
La nota editorial del input lo menciona como bug persistente. El capítulo lo presenta como
"FIX BUG 1 aplicado" sin mencionar que el bug de protocolo (más grave) persiste.
Justificación que debería existir: corrección del payload a:
  {'jsonrpc': '2.0', 'method': 'tools/call',
   'params': {'name': tool_name, 'arguments': params}, 'id': 1}
```

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

```
CONTRADICCIÓN-1 (heredada de V1, no resuelta):
Afirmación A: Sec.1 — "Integración LLM + Servidor MCP A: 50 líneas (patrón genérico)"
Afirmación B: Sec.7, Ejemplo 4 — código de producción (~115 líneas para decorador + cliente,
  sin contar las 8 consideraciones de Sec.3 que siguen siendo necesarias)
Por qué chocan: La tabla de Sec.1 cuantifica "50 líneas" para una integración MCP. El Ejemplo 4
(que el capítulo presenta como el estándar de producción correcto) tiene ~115 líneas ANTES de
implementar las 8 consideraciones. Si el estándar de producción supera los "50 líneas" del claim,
el claim mide el caso de desarrollo. V2 agravó esta contradicción: V1 usaba "50-100 líneas"
(rango que podría incluir casos de desarrollo), V2 usa "50 líneas" (valor único que no puede
reconciliarse con el Ejemplo 4).
Cuál prevalece: B expone que A mide el caso mínimo, no el caso de producción. La contradicción
es interna al documento y no fue resuelta — fue empeorada por la mayor especificidad del número.
```

```
CONTRADICCIÓN-2 (heredada de V1, no resuelta):
Afirmación A: Sec.8 (conclusión) — "Descubrimiento dinámico de funciones es valioso" —
  aparece en la lista de "CUÁNDO MCP ES RECOMENDADO" sin el caveat de configuración previa
Afirmación B: Sec.1 (FIX BUG 2) — "NOTA CRÍTICA: MCP estandariza la COMUNICACIÓN con
  servidores ya configurados. El 'descubrimiento dinámico' de MCP aplica a FUNCIONES dentro
  de servidores conocidos, no a DESCUBRIMIENTO de nuevos servidores"
Afirmación C: Sec.2, tabla — fila "Descubrimiento de SERVIDORES: Requiere configuración
  previa (igual)" — correctamente caveat en ambas columnas
Por qué chocan: Las Sec.1 y Sec.2 aplican el FIX BUG 2 correctamente. La Sec.8 no lo aplica.
La conclusión del documento es el lugar donde un lector resume el capítulo. Si la conclusión
dice "Descubrimiento dinámico de funciones es valioso" sin el caveat, un lector que solo lee
la conclusión tiene la versión incorrecta. El caveat fue aplicado en el cuerpo, no en las
conclusiones — exactamente como en V1.
Cuál prevalece: A y B/C son inconsistentes. La conclusión (Sec.8) contradice el FIX BUG 2
de Sec.1. El problema identificado en el análisis de V1 persiste sin corrección.
```

```
CONTRADICCIÓN-3 (heredada de V1, no resuelta — parcialmente):
Afirmación A: Sec.1 advertencia — "MCP NO reemplaza automáticamente los flujos de trabajo
  deterministas existentes. De hecho, a menudo REQUIERE flujos deterministas más robusto y
  bien diseñado para tener éxito."
Afirmación B: Sec.5, CATEGORÍA A — "Integración de Bases de Datos: Validez: SÍ — Los datos
  en BD son estáticos, no requieren garantías transaccionales críticas. Calibración: 0.75."
Por qué chocan: La Categoría A presenta casos como VÁLIDOS sin condicionalizar explícitamente
sobre la calidad de la API subyacente. La advertencia de Sec.1 aplica a TODOS los casos,
incluyendo los de Categoría A. Una integración de BD que devuelve datos sin paginación, sin
filtrado, o en formato no consumible (e.g., blobs binarios) falla exactamente por la razón de
Sec.1 — pero el caso de Categoría A no carga ese caveat. V2 resolvió esto para las Categorías
B y C (que tienen sus propios caveats detallados) pero Categoría A sigue siendo presentada como
incondicionalmente válida.
Cuál prevalece: A es más general y más correcta. B es válida CONDICIONALMENTE. La asimetría
es estructural: los casos problemáticos recibieron tratamiento, los "válidos" no.
```

```
CONTRADICCIÓN-4 (nueva en V2 — clasificación inconsistente):
Afirmación A: Sec.5, CATEGORÍA A — "Orquestación de Generación de Medios: Validez: SÍ —
  Validez CONDICIONAL: Debe reconocerse que no hay reversibilidad después de generación.
  Calibración: 0.65 (válido pero con limitaciones)"
Afirmación B: Definición de las categorías implícita en el encabezado:
  CATEGORÍA A = "CASOS VÁLIDOS Y RECOMENDADOS"
  CATEGORÍA B = "CASOS CON REQUISITOS CRÍTICOS"
Por qué chocan: "Orquestación de Generación de Medios" está en Categoría A pero tiene:
  - "Validez CONDICIONAL" (no incondicionalmente válido)
  - Calibración de 0.65 (más baja que los otros casos de Categoría A: 0.75, 0.70, 0.68)
  - Caveat explícito sobre irreversibilidad
Esto es un caso con requisitos críticos que está en la categoría equivocada. El caveat de
irreversibilidad ("no hay reversibilidad después de generación") es exactamente el tipo de
requisito que define Categoría B (e.g., para multi-paso se pide "Aislamiento Transaccional"
y "Decidir: TODO_O_NADA vs. PARCIAL"). Generación de medios sin reversibilidad comparte ese
patrón. Está mal clasificado.
Cuál prevalece: La clasificación en Categoría A es incorrecta para este caso. El caso pertenece
a Categoría B o a Categoría A con un asterisco explícito que lo distingue del resto.
```

```
CONTRADICCIÓN-5 (nueva en V2 — FIX BUG 1 incompleto vs. claim de corrección):
Afirmación A: Header del documento — "FIX BUG 1: Ejemplo 4 decorador async correcto
  (Awaitable en type hints, async_wrapper)"
Afirmación B: Análisis del código — TypeVar T corrige el tipo de retorno pero el bug de
  comportamiento en runtime con funciones síncronas persiste (ver SALTO-4)
Por qué chocan: El claim "FIX BUG 1 aplicado" presenta la corrección como completa. El análisis
del código muestra que la corrección es parcial: mejora la anotación de tipos (documentación
del contrato) pero no el comportamiento en runtime. Python no enforce type hints. Un desarrollador
que siga el patrón del Ejemplo 4 y aplique el decorador a una función síncrona encontrará el
mismo TypeError que existía antes del fix — solo que ahora el código parece más correcto por
tener TypeVar T. El fix es más engañoso que la versión sin fix: da apariencia de corrección
sin producir el comportamiento correcto.
Cuál prevalece: B. FIX BUG 1 es una corrección de tipo que no elimina el bug de runtime.
El claim de corrección es FALSO para el caso síncrono.
```

```
CONTRADICCIÓN-6 (nueva en V2 — el payload JSON-RPC y el claim de "producción"):
Afirmación A: Sec.7, encabezado del Ejemplo 4 — "Cliente Robusto para PRODUCCIÓN (FIX BUG 1)"
Afirmación B: Sec.7, Ejemplo 4, método call_tool:
  payload = {'jsonrpc': '2.0', 'method': tool_name, 'params': params, 'id': 1}
  — donde tool_name es el nombre de la herramienta (e.g., "greet"), no "tools/call"
Por qué chocan: Un cliente "para PRODUCCIÓN" que viola la especificación del protocolo que
implementa no puede ser correcto. El protocolo MCP especifica que el método para invocar
herramientas es "tools/call", no el nombre de la herramienta. Este cliente no es interoperable
con servidores MCP conformantes a la especificación. Es un cliente FastMCP-específico disfrazado
de cliente MCP genérico. El título "Cliente Robusto para PRODUCCIÓN" implica generalidad que
el código no tiene.
Cuál prevalece: B. El payload hace que el código sea incorrecto como cliente MCP genérico.
La claim "para PRODUCCIÓN" aplica únicamente si el servidor es FastMCP con permisividad de
routing, no para el ecosistema MCP en general.
```

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

| Patrón | Instancia en V2 | Ubicación | Estado vs. V1 |
|--------|----------------|-----------|---------------|
| **Notación formal encubriendo especulación** | "50 líneas" (V2 endurece el número: de rango "50-100" a valor único "50") — más preciso, más falso | Sec.1, tabla ANTES/CON MCP | EMPEORADO respecto a V1 — V1 al menos tenía un rango |
| **Credibilidad prestada no derivada** | Umbrales "1-5 funciones" y "10+ herramientas" presentados como criterios técnicos de decisión. Son heurísticas, no derivaciones de análisis de overhead ni benchmarks | Sec.2, "Interpretación honesta" | NUEVO en V2 |
| **Corrección performativa** | FIX BUG 1 corrige el type hint (documentación) pero no el comportamiento en runtime. El fix hace el código más engañoso: parece correcto, tiene el mismo bug | Sec.7, Ejemplo 4 | NUEVO en V2 — la corrección del bug introduce un engaño de segundo orden |
| **Validación de contexto distinto** | Ejemplo 4 presentado como "Cliente Robusto para PRODUCCIÓN" implementa el protocolo incorrectamente (method: tool_name en lugar de method: "tools/call"). Solo es robusto si el servidor es permisivo (FastMCP). La robustez de retry/timeout/logging es real; la conformancia al protocolo es falsa | Sec.7, Ejemplo 4 | HEREDADO de V1, no corregido |
| **Limitación enterrada selectiva** | FIX BUG 2 aplicado en Sec.1 y Sec.2 pero no en Sec.8 (conclusiones). Un lector que solo lee conclusiones obtiene la versión sin caveat | Sec.8 vs. Sec.1/2 | HEREDADO de V1 análisis V1 CONTRADICCIÓN-2, no corregido |

### Patrón dominante de V2

**Nombre:** Corrección con hardening performativo.

**Descripción:** Las correcciones de V2 siguen la misma lógica que las de V1: los problemas más obvios se corrigen genuinamente (FIX BUG 2 en Sec.1/2, distinción de columnas en tabla comparativa, "Interpretación honesta"). Los problemas técnicos profundos se parchean con cambios que tienen apariencia de corrección sin producir el comportamiento correcto (FIX BUG 1 mejora el type hint sin corregir el runtime; FIX BUG 3 añade texto prescriptivo sin verificar el código; el número "50 líneas" reemplaza el rango con un valor más específico y más falso).

**Cómo opera en V2 específicamente:** Cada "FIX BUG" nombrado hace que el problema parezca resuelto. Un revisor que verifica la checklist de bugs (FIX BUG 1 ✓, FIX BUG 2 ✓, FIX BUG 3 ✓) tiene la impresión de que los tres problemas están resueltos. El análisis muestra que los tres fixes son parciales y que el bug más grave (JSON-RPC method incorrecto) no está en la lista de FIX BUGs — no fue nombrado como bug por el autor, por tanto no fue corregido.

**El mecanismo del engaño:** Nombrar un bug como "FIX BUG N" señaliza que fue resuelto. Los bugs sin nombre (JSON-RPC, Sec.8 caveat ausente) no tienen ese señalizador — son invisibles para un revisor que confía en la lista del autor.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| FIX BUG 2 correcto en Sec.1 y Sec.2: "descubrimiento dinámico aplica a FUNCIONES dentro de servidores configurados, no a servidores nuevos" | Sec.1 NOTA CRÍTICA + Sec.2 tabla con fila separada "Descubrimiento de SERVIDORES: Requiere configuración previa (igual)" — ambos lugares correctos | Especificación MCP: servers require explicit configuration |
| Distinción FUNCIONES vs. SERVIDORES en tabla comparativa | Sec.2 tabla: dos filas separadas con comportamiento diferente. Técnicamente correcto. | MCP spec: dynamic function discovery within configured server |
| "Interpretación honesta" — Tool Calling SUPERIOR para funciones fijas, bajo overhead | Sec.2. Técnicamente correcto como heurística — el overhead de MCP (manifiesto, protocolo JSON-RPC, servidor) es real | Arquitectura de sistemas: overhead vs. escalabilidad |
| VERDAD FUNDAMENTAL: 3 afirmaciones | "MCP estandariza COMUNICACIÓN, no CORRECTITUD" / "MCP reduce ACOPLAMIENTO, no COMPLEJIDAD CONCEPTUAL" / "MCP simplifica INTEGRACIÓN, no GARANTÍAS OPERACIONALES" — las tres son técnicamente precisas | Análisis del protocolo MCP |
| Categoría C (financiero) con patrón 3 fases y calificaciones 0.85/0.0 | La separación Análisis (MCP ✓) vs. Ejecución (MCP ✗) es arquitectónicamente correcta. Las razones por qué MCP no cumple ACID, firma digital, auditoría regulatoria son técnicamente válidas | Requisitos ACID de bases de datos; regulación financiera |
| Categoría B (IoT, multi-paso) con requisitos explícitos | Los requisitos listados (confirmación de entrega, reintentos exponenciales, idempotencia, logging auditable) son reales y necesarios | Estándares de sistemas distribuidos |
| Sec.6: los 8 requisitos de producción (incluyendo Rate Limiting nuevo) | Service discovery, load balancing, health checks, circuit breaker, rate limiting son requisitos legítimos de producción | Prácticas de ingeniería de software distribuido |
| Ejemplo 4: reintentos con backoff exponencial, timeout explícito, logging estructurado | Los PATRONES son correctos para funciones async. El backoff `2^attempt` es correcto. El logging con logger.info/warning/error es correcto | Patrones de resiliencia: exponential backoff |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia contraria |
|-------|-----------------|----------------------------------|
| "50 líneas" para integración MCP con MCP (Sec.1 tabla) | V2 endurece "50-100" (V1, rango) a "50" (valor único). El Ejemplo 4 de producción tiene ~115 líneas antes de las 8 consideraciones. El número mide desarrollo, no producción. Sin fuente empírica. | CONTRADICCIÓN-1; Ejemplo 4 del mismo capítulo |
| "FIX BUG 1: Decorador async correcto" como corrección completa | TypeVar T corrige la anotación del tipo de retorno pero no el comportamiento en runtime. Python no enforce type hints. Una función síncrona pasada al decorador produce el mismo TypeError en V1 y V2. El fix es corrección de documentación, no de comportamiento. | SALTO-4; CONTRADICCIÓN-5; Python type system |
| payload = {'method': tool_name, ...} en Ejemplo 4 "para PRODUCCIÓN" | Viola la especificación MCP: el método correcto es "tools/call" con params.name = tool_name. Este cliente no es interoperable con servidores MCP conformantes. Solo funciona con FastMCP si es permisivo con el routing. | SALTO-6; CONTRADICCIÓN-6; Especificación JSON-RPC de MCP |
| "Descubrimiento dinámico de funciones es valioso" en Sec.8 sin caveat | Contradice directamente FIX BUG 2 aplicado en Sec.1 y Sec.2. La conclusión no hereda la corrección del cuerpo. | CONTRADICCIÓN-2 |
| "Orquestación de Generación de Medios" en CATEGORÍA A (Válidos y Recomendados) | El caso tiene "Validez CONDICIONAL" y caveat de irreversibilidad — características de Categoría B. La clasificación es incorrecta. | CONTRADICCIÓN-4; calibración 0.65 vs. 0.75 del resto de Cat.A |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| "tool_filter en HttpServerParameters — más recomendado" (FIX BUG 3) | La prescripción en texto es consistente internamente, pero el código del Ejemplo 3 pone tool_filter DENTRO de HttpServerParameters. Si ADK define tool_filter como argumento de MCPToolset (no de HttpServerParameters), el código es incorrecto y el fix es solo textual. | Verificación contra documentación ADK: `MCPToolset` constructor signature y `HttpServerParameters` constructor signature |
| "60-70% del esfuerzo a capas de producción" | Estimación sin fuente. Plausible para algunos proyectos, incorrecta para otros según madurez de infraestructura existente. | Datos de proyectos reales con distribución de esfuerzo documentada |
| Umbrales "1-5 funciones" y "10+ herramientas" | Heurísticas sin derivación. Plausibles como punto de partida. | Análisis de overhead de MCP en distintas escalas de herramientas; benchmarks de latencia y mantenibilidad |
| Categoría A casos 1-6 son seguros sin caveat de Sec.1 | Los casos están condicionados implícitamente por la advertencia de Sec.1 (APIs subyacentes bien diseñadas). V2 no aplica ese caveat explícitamente a Categoría A. | Evaluación de cada caso A contra: ¿qué pasa si la API subyacente devuelve datos no paginados, binarios, o sin ordenamiento? |
| El patrón 3 fases (financiero) maneja idempotencia post-firma | El patrón no especifica qué ocurre cuando Fase 2 (firma usuario) completa y Fase 3 (ejecución sistema) falla: ¿La firma sigue válida? ¿Hay ventana de expiración? ¿Puede re-ejecutarse la Fase 3? | Especificación del mecanismo de manejo de fallos post-firma en el patrón propuesto |

### Patrón dominante

**Parche incremental con tres propiedades distintivas:**

1. **Los fixes nombrados son parciales:** FIX BUG 1 corrige documentación, no comportamiento. FIX BUG 3 añade texto prescriptivo sin verificar el código. FIX BUG 2 es el único fix genuino — y no fue aplicado a la sección de conclusiones.

2. **El bug más grave no fue nombrado:** El payload JSON-RPC con `method: tool_name` es una violación de protocolo que hace el "cliente de producción" no-interoperable con servidores MCP conformantes. No apareció en la lista de FIX BUGs del autor, por tanto no fue corregido. La ausencia de un nombre previene la corrección.

3. **V2 empeoró un número específico:** "50-100 líneas" (V1, rango con incertidumbre epistémica) → "50 líneas" (V2, valor único con falsa precisión). Este cambio es regresivo: hace el claim más específico, por tanto más verificable, por tanto más claramente incorrecto contra el Ejemplo 4 del mismo capítulo.

---

## CAPA 7: INTER-VERSIONES — EVOLUCIÓN DEL DOCUMENTO

Esta capa analiza la trayectoria de corrección entre versiones para determinar si el proceso de revisión es convergente (cada versión acerca al documento a la corrección técnica) o divergente en algún eje.

### Tabla de evolución por problema

| Problema | Original | V1 | V2 | Tendencia |
|---------|---------|-----|-----|-----------|
| "reduce dramáticamente la complejidad" sin cuantificar | PRESENTE | PARCIAL — tabla con rango "50-100" | PEOR — valor único "50 líneas" más incorrecto | DIVERGENTE |
| Discovery caveat | AUSENTE | PARCIAL — aplicado en Sec.5/6, no en Sec.11 | PARCIAL — aplicado en Sec.1/2, no en Sec.8 | ESTÁTICO |
| tool_filter ubicación incorrecta | PRESENTE | PRESENTE | PARCIAL — texto prescriptivo; código Ej.3 sin verificar | INCIERTO |
| Código de producción ausente | AUSENTE | PRESENTE (Ej.4) | PRESENTE (Ej.4 con TypeVar) | CONVERGENTE |
| JSON-RPC method incorrecto | PRESENTE | PRESENTE | PRESENTE (no nombrado como bug) | ESTÁTICO |
| Servicios financieros mal clasificados | PRESENTE | RESUELTO | RESUELTO | CONVERGENTE |
| IoT/multi-paso sin caveats | PRESENTE | RESUELTO | RESUELTO | CONVERGENTE |
| Bug async/síncrono en decorador | PRESENTE | PRESENTE | PARCIAL — type hint mejor; runtime igual | INCIERTO |
| Importación sin uso / código duplicado | PRESENTE | RESUELTO | RESUELTO | CONVERGENTE |
| Clasificación errónea de Medios en Cat.A | N/A (cat. inexistente) | N/A | NUEVO ERROR | REGRESIVO |

### Evaluación de convergencia

- **Convergente (genuinamente mejorado en V2 vs. V1):** 3 dimensiones — código de producción existente, financiero resuelto, IoT/multi-paso con requisitos.
- **Estático (mismo problema en V1 y V2):** 2 dimensiones — JSON-RPC method, discovery en conclusiones.
- **Divergente (V2 empeoró respecto a V1):** 1 dimensión — número de líneas ("50-100" → "50").
- **Regresivo (nuevo problema introducido en V2 no presente en V1):** 1 dimensión — "Orquestación de Medios" en Categoría A con validez CONDICIONAL.
- **Incierto (corrección parcial no verificable sin API de ADK):** 2 dimensiones — tool_filter, bug async/síncrono.

### Veredicto de trayectoria

El proceso de revisión es **convergente en las dimensiones más visibles y divergente o estático en las más técnicas**. Esto es consistente con un proceso de revisión editorial (detecta lo que puede ver un lector atento) sin revisión técnica adversarial (que requiere ejecutar el código contra la especificación del protocolo y verificar la API del SDK).

---

## Nota de completitud del input

Secciones potencialmente comprimidas: ninguna. El input preserva el texto verbatim con nota editorial explícita que identifica dos bugs residuales hipotéticos. Ambos fueron verificados en el análisis (JSON-RPC confirmado como bug; Discovery en Sec.8 confirmado como persistente).

Saltos no analizables por compresión: ninguno.

---

## Resumen ejecutivo para el orquestador

**¿Los fixes son reales o performativos?**

- FIX BUG 2: REAL. La distinción FUNCIONES vs. SERVIDORES se aplica correctamente en Sec.1 y Sec.2.
- FIX BUG 1: PERFORMATIVO. TypeVar T mejora la anotación; el bug de runtime con funciones síncronas persiste. La corrección hace el código más engañoso, no más correcto.
- FIX BUG 3: INCIERTO. El texto prescriptivo es correcto; el código Ejemplo 3 no fue verificado contra la API de ADK.

**¿Se introdujeron problemas nuevos en V2?**

Sí, dos:
1. "50 líneas" (valor único) es más incorrecto que "50-100 líneas" (rango de V1).
2. "Orquestación de Generación de Medios" está mal clasificada en Categoría A cuando tiene "Validez CONDICIONAL".

**¿Qué problemas de V1 persisten en V2?**

1. JSON-RPC payload incorrecto en Ejemplo 4 (method: tool_name en lugar de method: "tools/call") — CRÍTICO.
2. Discovery caveat ausente en Sec.8/conclusiones — MENOR pero inconsistente.
3. tool_filter en Ejemplo 3 no verificado contra API real de ADK — INCIERTO.
4. Bug async/síncrono en runtime del decorador — LATENTE.
5. Categoría A sin caveat de la advertencia de Sec.1 — ESTRUCTURAL.
6. Números sin fuente (60-70%, 200-500 líneas) — INCIERTO.

**¿El documento puede usarse como referencia técnica?**

Con estas calificaciones:
- Las VERDADES FUNDAMENTALES de Sec.8 son correctas y utilizables.
- La clasificación Categoría B y C con sus requisitos es correcta y utilizables.
- El Ejemplo 4 NO puede usarse como cliente MCP para producción sin corregir el payload JSON-RPC.
- Los números (50 líneas, 60-70%) no deben usarse para planificación sin fuente empírica propia.
- El decorador with_retry_and_logging es correcto solo para funciones async — debe documentarse.
