```yml
created_at: 2026-04-19 07:01:46
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: deep-dive
status: Borrador
version: 1.0.0
fuente: "Capítulo 10: Protocolo de Contexto de Modelo (MCP) — Versión Corregida Calibrada" (documento externo, 2026-04-19)
veredicto_síntesis: PARCIALMENTE VÁLIDO — PARCHE SOFISTICADO
saltos_lógicos: 5
contradicciones: 4
engaños_estructurales: 4
```

# Deep-Dive Adversarial — Cap. 10 MCP: Versión Corregida Calibrada

---

## VERIFICACIÓN DE COMPLETITUD DEL INPUT

El input `mcp-corrected-input.md` es un documento estructurado por orquestador con nota explícita de cambios vs. versión original. Señales evaluadas:

- Las 11 secciones presentan citas directas, no paráfrasis
- El código de los 4 ejemplos aparece verbatim completo
- La tabla de cambios al final documenta explícitamente 11 diferencias
- Las notas editoriales identifican correcciones específicas en Sec. 5 y Sec. 6
- La sección de referencias reconoce que son idénticas a la versión original

**Señal de compresión detectada:** La Sec. 7 del flujo de interacción MCP está comprimida en una sola línea: "Los 5 pasos del flujo (...) — idénticos a la versión original." Eso es compresión explícita. Como el análisis previo del original cubrió ese flujo y no encontró problemas estructurales en él, la compresión es aceptable para este análisis diferencial. Se documenta y se procede.

**Conclusión:** Input suficientemente completo para análisis diferencial. Las correcciones están documentadas con precisión. Procediendo.

---

## CAPA 1: LECTURA INICIAL

### Tesis de la versión corregida

Misma tesis que el original: MCP es un protocolo estandarizado cliente-servidor que reduce el costo de integración LLM-herramienta. La versión corregida añade:

1. Cuantificación del beneficio de reducción de complejidad (tabla líneas de código)
2. Corrección del alcance de "dynamic discovery"
3. Calificación de casos de uso problemáticos (financiero como ANTI-PATRÓN; IoT y multi-paso con requisitos explícitos)
4. Código de producción nuevo (Ejemplo 4)
5. Sección explícita sobre Gap Desarrollo/Producción

### Estructura de las correcciones declaradas

| Corrección | Naturaleza | Verificable |
|-----------|-----------|------------|
| Tabla ANTES/DESPUÉS de líneas (200-500 → 50-100) | Cuantificación nueva | SÍ — ¿de dónde vienen los números? |
| "Dynamic discovery" → "funciones dentro de servidores configurados" | Restricción de alcance | SÍ — ¿es completa la corrección? |
| Servicios financieros → ANTI-PATRÓN con patrón 3 fases | Reclasificación + patrón alternativo | SÍ — ¿el patrón resuelve el problema? |
| IoT y multi-paso → VÁLIDO SOLO CON requisitos explícitos | Condicionalización | SÍ — ¿son los requisitos suficientes? |
| Ejemplo 4 con retry/timeout/logging | Código nuevo | SÍ — ¿es correcto el código? |
| Sección Gap Desarrollo/Producción | Nueva sección | SÍ — ¿el "60-70%" tiene fuente? |
| Advertencia de Sec. 4 conectada con casos de uso | Corrección estructural prometida | CRÍTICO — ¿se cumple? |

### Claim central de la versión corregida

La versión corregida afirma implícitamente que: los problemas identificados en la versión original han sido resueltos. Este es el claim que el análisis debe verificar.

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos (sin cambios respecto al original)

La arquitectura cliente-servidor, JSON-RPC, SSE/HTTP son frameworks reales y correctamente citados. No hay cambio aquí entre versiones. VERDADERO como en el original.

### Sub-capa B: Aplicaciones concretas — cambios en esta versión

| Claim aplicado | Derivado o analógico | Nuevo en esta versión |
|---------------|---------------------|----------------------|
| "200-500 líneas sin MCP, 50-100 con MCP" | Estimación editorial — no derivada | SÍ — Sec. 3 |
| "60-70% del esfuerzo a capas de producción" | Afirmación sin fuente | SÍ — Sec. 10 |
| Patrón 3 fases para finanzas (Análisis → Autorización → Ejecución) | Prescripción arquitectónica — no derivada de datos | SÍ — Sec. 8 |
| "VÁLIDO SOLO SI se implementan garantías de aislamiento" (multi-paso) | Condicionalización correcta | SÍ — Sec. 8 |
| "VÁLIDO SOLO SI se implementan 5 requisitos" (IoT) | Condicionalización correcta | SÍ — Sec. 8 |

### Sub-capa C: Números específicos — evaluación detallada

| Valor | Fuente declarada | Evaluación |
|-------|-----------------|------------|
| 200-500 líneas sin MCP | "Sin MCP cada integración requiere..." | NO hay fuente — estimación |
| 50-100 líneas con MCP | "Con MCP el patrón genérico..." | NO hay fuente — estimación |
| 60-70% del esfuerzo a capas de producción | Ninguna | NO hay fuente — estimación |
| max_retries=3, timeout_sec=5.0, backoff_base=2.0 | Parámetros del Ejemplo 4 | Convención — no calibrados para MCP |
| 5 requisitos para IoT | Lista editorial | No derivados de spec IoT |
| 3 fases para finanzas | Prescripción editorial | No derivadas de regulación ACID real |

**Observación crítica:** La versión corregida introduce MÁS números que la original, no menos. Los números nuevos (200-500, 50-100, 60-70%) son estimaciones sin fuente presentadas en formato tabla — lo que aumenta su apariencia de rigor sin aumentar su base empírica.

### Sub-capa D: Afirmaciones de garantía — cambios en esta versión

| Garantía original | ¿Corregida? | Estado en versión corregida |
|------------------|------------|----------------------------|
| "reduce dramáticamente la complejidad" sin cuantificar | PARCIALMENTE — ahora tiene tabla | La tabla usa estimaciones sin fuente |
| "dynamic discovery" como ventaja | PARCIALMENTE — se añade caveat | Ver Capa 3 y 4 |
| Sec. 2 advertencia desconectada de Sec. 6 | INCIERTO | Ver Capa 4, CONTRADICCIÓN-3 |
| Código de producción ausente | RESUELTO | Ejemplo 4 existe y es técnicamente evaluable |

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

```
SALTO-1: [Tabla ANTES/DESPUÉS] → [reducción de 200-500 a 50-100 líneas]
Ubicación: Sección 3, tabla
Tipo de salto: números sin fuente presentados como derivación
Tamaño: crítico
Análisis: Los rangos "200-500 líneas" y "50-100 líneas" no tienen fuente empírica declarada.
La tabla ANTES/DESPUÉS crea apariencia de análisis cuantitativo cuando en realidad son estimaciones
editoriales. El rango "200-500 líneas" para integración sin MCP es plausible pero no verificado —
una integración directa con OpenAI o Anthropic API para una sola herramienta puede ser 20-50 líneas
con SDKs modernos. El rango "50-100 líneas" con MCP es plausible para el caso de usar un servidor
MCP existente, pero no para el caso de CREAR un servidor MCP desde cero (que requiere más, no menos).
La tabla ANTES/DESPUÉS resuelve el problema estético del original (sin cuantificar) pero introduce
un problema nuevo: cuantifica sin datos.
Justificación que debería existir: comparación de repositorios reales — integración OpenAI directa
vs. integración vía MCP para la misma funcionalidad, con conteo de líneas real.
```

```
SALTO-2: [Patrón 3 fases propuesto para finanzas] → [resuelve el problema identificado]
Ubicación: Sección 8, caso financiero
Tipo de salto: prescripción sin validación de completitud
Tamaño: medio-crítico
Análisis: El patrón Análisis→Autorización→Ejecución es arquitectónicamente correcto como
separación de concerns. Sin embargo, el salto de "proponer el patrón" a "resolver los problemas
identificados" contiene gaps:
(a) IDEMPOTENCIA entre Fase 2 y 3: ¿Qué ocurre si el usuario FIRMA (Fase 2) pero la ejecución
falla (Fase 3)? ¿Puede el usuario firmar de nuevo? ¿El sistema detecta firma duplicada?
(b) REVERSIBILIDAD: La Fase 3 dice "Sistema verifica compliance" pero no dice cómo se cancela
una transacción ya ejecutada. "Reversibilidad" es listada como requisito que MCP no cumple
pero no aparece en el patrón propuesto.
(c) FIRMA DIGITAL: ¿Qué infraestructura de firma digital se requiere? El patrón dice "Usuario
FIRMA digitalmente" como si eso fuera trivial de implementar — es una infraestructura completa
(PKI, certificados, almacenamiento de claves).
El patrón identifica la separación correcta pero no resuelve los problemas operacionales que él
mismo lista como requisitos.
Justificación que debería existir: diagrama de secuencia con manejo de fallo en Fase 3 post-firma,
y especificación del mecanismo de firma digital.
```

```
SALTO-3: [asyncio.wait_for(func(*args, **kwargs), timeout=timeout_sec)] → [timeout funciona]
Ubicación: Sección 9, Ejemplo 4, líneas del decorador with_retry_and_logging
Tipo de salto: asunción técnica incorrecta en código presentado como "producción"
Tamaño: crítico
Análisis: `asyncio.wait_for()` requiere una COROUTINE como primer argumento, no el resultado de
llamar una coroutine. Cuando se llama `func(*args, **kwargs)` donde `func` es una función `async`,
la expresión retorna un objeto coroutine — y eso es correcto para `asyncio.wait_for()`.
PERO: si `func` es una función síncrona (no `async`), `func(*args, **kwargs)` retorna el resultado
directamente, no una coroutine, y `asyncio.wait_for()` lanzará TypeError.
El decorador `with_retry_and_logging` está definido para funciones genéricas (`Callable[..., Any]`),
no solo para funciones `async`. Si se aplica a una función síncrona, el código falla silenciosamente
o lanza TypeError — el exacto anti-patrón que el Ejemplo 4 dice resolver.
ADEMÁS: el método `call_tool` está decorado con `@with_retry_and_logging(...)` pero `call_tool`
mismo usa `async with self.session.post(...)`. El timeout de `asyncio.wait_for` aplica al tiempo
total, pero si `aiohttp` tiene su propio timeout interno más largo, hay comportamiento ambiguo
sobre cuál timeout prevalece.
Justificación que debería existir: restricción explícita de que el decorador solo funciona con
funciones `async`; o manejo del caso síncrono; o anotación de tipo `Callable[..., Coroutine]`.
```

```
SALTO-4: ["60-70% del esfuerzo a capas de producción"] → [recomendación de planificación válida]
Ubicación: Sección 10, último párrafo
Tipo de salto: número sin fuente presentado como recomendación actionable
Tamaño: medio
Análisis: El porcentaje "60-70%" no tiene fuente declarada. No es un estudio, no es una medición,
no es una convención del sector. Es una estimación editorial que se convierte en recomendación de
planificación: "al adoptar MCP en producción, asignar 60-70% del esfuerzo a estas capas."
Si un equipo planifica un proyecto MCP de 100 horas basándose en este porcentaje, destinaría
60-70 horas a infraestructura de producción y 30-40 horas a código MCP básico. Si el porcentaje
real es 40% o 80%, la planificación está mal. El número tiene apariencia de experiencia de campo
cuando no tiene respaldo documentado.
Justificación que debería existir: referencia a proyectos reales donde se midió la distribución
de esfuerzo, o reconocimiento explícito de que es una estimación ("estimamos que...").
```

```
SALTO-5: [Sección 10 lista 7 requisitos de producción] → [lista es completa]
Ubicación: Sección 10, tabla de producción
Tipo de salto: lista de requisitos presentada como exhaustiva cuando probablemente no lo es
Tamaño: pequeño-medio
Análisis: La sección lista: service discovery, load balancing, health checks, logging centralizado,
monitoreo de errores, política de reintentos, circuit breaker. Es una lista razonable pero omite:
- Autenticación/autorización entre cliente y servidor MCP (mencionada en Sec. 6 del texto base
  pero ausente de la lista de producción)
- TLS/mTLS para conexiones remotas
- Rate limiting / throttling
- Gestión de secretos (API keys del servidor MCP)
- Versionado de API del servidor MCP (¿qué ocurre cuando el servidor actualiza su manifiesto?)
La lista es presentada con el formato "✓ / ✗" que sugiere completitud cuando es selectiva.
Justificación que debería existir: reconocimiento de que es una lista de requisitos comunes,
no exhaustiva.
```

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

```
CONTRADICCIÓN-1 (nueva, introducida por la corrección):
Afirmación A: Sec. 3 — "REDUCCIÓN DRAMÁTICA en complejidad de ACOPLAMIENTO" y tabla mostrando
reducción de 200-500 → 50-100 líneas.
Afirmación B: Sec. 3, mismo párrafo — "aunque no en complejidad conceptual" y "las 8
consideraciones arquitectónicas (seguridad, error handling, etc.) siguen siendo necesarias."
Por qué chocan: La tabla cuantifica la reducción de líneas de código como si eso fuera el
beneficio central. Pero Sec. 3 mismo reconoce que las 8 consideraciones siguen siendo necesarias.
Si las 8 consideraciones siguen siendo necesarias, ¿dónde está la reducción de 200-500 a 50-100?
La reducción de líneas aplica solo al "código de integración básica" sin contar el código de
seguridad, error handling, retry, timeout, etc. — es decir, sin las 8 consideraciones.
El Ejemplo 4 (código de producción) tiene ~90 líneas solo para el decorador de retry/timeout/logging
más ~25 líneas para el cliente — ya estamos en >115 líneas sin contar las 8 consideraciones restantes.
La reducción de líneas del claim es real solo para el caso mínimo (conexión básica sin producción).
Cuál prevalece: B (la admisión de que las 8 consideraciones permanecen) expone que A mide
el caso de desarrollo, no el caso de producción que el capítulo pretende abordar.
```

```
CONTRADICCIÓN-2 (corrección incompleta del SALTO-3 del original):
Afirmación A: Sec. 5, tabla corregida — "El cliente MCP puede descubrir funciones disponibles
DENTRO de servidores previamente configurados consultando su manifiesto. Nota: El descubrimiento
de servidores mismos requiere configuración explícita previa."
Afirmación B: Sec. 6, Descubribilidad Dinámica de Funciones — "Un cliente MCP puede consultar
dinámicamente un servidor para determinar qué funciones y recursos ofrece. Este mecanismo de
descubrimiento 'bajo demanda' resulta especialmente valioso para agentes que requieren adaptarse
a nuevas funciones sin ser redesplegados o reconfigurados. Sin embargo, el descubrimiento de
servidores mismos requiere configuración previa."
Por qué chocan parcialmente: Sec. 5 y Sec. 6 ahora son internamente consistentes en el caveat
sobre servidores. La corrección es real y se aplicó en ambos lugares. Sin embargo, Sec. 11
(Síntesis y Conclusiones) dice: "cuando los agentes requieren capacidad de descubrir dinámicamente
nuevas funciones sin necesidad de redesplegarse" — usando "dinámicamente" sin el caveat, lo que
reactiva el problema original en la sección de conclusiones.
Cuál prevalece: La corrección en Sec. 5 y 6 es VÁLIDA. El problema residual en Sec. 11 es menor
pero documenta que la corrección no fue aplicada de forma exhaustiva.
```

```
CONTRADICCIÓN-3 (persistencia del problema estructural central del original):
Afirmación A: Sec. 4 — "Sin embargo, MCP representa un contrato para una 'interfaz agentica',
y su efectividad depende en gran medida del diseño de las APIs subyacentes que expone."
+ "los agentes no reemplazan automáticamente los flujos de trabajo deterministas existentes;
de hecho, a menudo requieren soporte determinista más robusto y bien diseñado para tener éxito."
Afirmación B: Sec. 8 lista los casos de uso con sus calificaciones. Pero los casos marcados como
"VÁLIDOS" (casos 1-6) se califican con condiciones técnicas específicas ("cuando los datos no
requieren garantías transaccionales críticas", "cuando no se requiere edición posterior") sin
mencionar la condición general de Sec. 4 — que el éxito de MCP depende del diseño de las APIs
subyacentes, no solo de condiciones técnicas de ese caso.
Por qué chocan: La versión corregida resuelve el problema de los casos 7, 8, 9 (multi-paso, IoT,
finanzas) pero los casos 1-6 siguen siendo presentados como VÁLIDOS sin referenciar la advertencia
de Sec. 4. El problema estructural del original (advertencia desconectada de casos de uso) se
resolvió para los casos más problemáticos pero no para los "VÁLIDOS".
Un caso de Database Integration (caso 1) con una API de BD que devuelve datos no estructurados
o sin paginación puede fallar exactamente por la razón de Sec. 4 — pero el caso 1 no lleva ese
caveat. La corrección es selectiva: solo los casos más obvios recibieron el tratamiento.
Cuál prevalece: A es más rigurosa. La corrección parcial crea una asimetría: los casos 7-9 tienen
advertencias detalladas; los casos 1-6 parecen "seguros" aunque están sujetos a la misma condición.
```

```
CONTRADICCIÓN-4 (persistencia del problema de `tool_filter`):
Afirmación A: Ejemplo 3 (cliente ADK con FastMCP) muestra `tool_filter` DENTRO de
`HttpServerParameters`:
    MCPToolset(
        connection_params=HttpServerParameters(
            url=FASTMCP_SERVER_URL,
            tool_filter=['greet']  ← dentro de HttpServerParameters
        )
    )
Afirmación B: La versión corregida elimina la versión extendida del Ejemplo 1 (donde `tool_filter`
estaba comentado incorrectamente dentro de `StdioServerParameters`). Eso resuelve UNA de las tres
ubicaciones inconsistentes del original.
Por qué esto importa: El análisis previo del original documentó que `tool_filter` aparecía en
tres ubicaciones incompatibles. La versión corregida elimina una (la versión extendida del Ejemplo 1).
Pero `tool_filter` dentro de `HttpServerParameters` (Ejemplo 3) sigue siendo potencialmente
incorrecto — si `tool_filter` es argumento de `MCPToolset`, no debería estar dentro de
`HttpServerParameters`. La versión corregida preserva este código sin cambios y sin nota.
Cuál prevalece: INCIERTO — requiere verificar la API real de `MCPToolset` vs. `HttpServerParameters`
en la documentación de ADK. La versión corregida no resolvió este problema — simplemente eliminó
la instancia más obvia del problema y dejó la segunda.
```

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

| Patrón | Instancia en versión corregida | Ubicación | Resuelto vs. original |
|--------|-------------------------------|-----------|----------------------|
| **Notación formal encubriendo especulación** | Tabla ANTES/DESPUÉS con rangos de líneas (200-500 → 50-100) crea apariencia de cuantificación rigurosa. Los números son estimaciones sin fuente, ahora más difíciles de cuestionar porque tienen formato de tabla comparativa | Sec. 3 | NUEVO — introducido por la corrección |
| **Números redondos disfrazados** | "60-70% del esfuerzo" sin fuente presentado como recomendación de planificación actionable | Sec. 10 | NUEVO — introducido por la corrección |
| **Credibilidad prestada** | El patrón 3 fases para finanzas (Análisis → Autorización → Ejecución) usa terminología ACID y PKI para dar credibilidad arquitectónica a una prescripción sin validación de completitud | Sec. 8, caso financiero | NUEVO — introducido por la corrección |
| **Limitación enterrada (residual)** | La corrección parcial de la advertencia de Sec. 4 — solo aplicada a casos 7-9, no a los "VÁLIDOS" 1-6 — crea asimetría que puede leerse como "casos 1-6 no tienen problemas" cuando siguen sujetos a la misma condición | Sec. 8 | PARCIALMENTE resuelto — casos 7-9 mejorados, 1-6 sin cambio |
| **Validación en contexto distinto (residual)** | El Ejemplo 4 presenta `MCP_ProductionClient` con un endpoint hardcoded `/rpc`. Un servidor MCP real puede tener endpoints diferentes; `jsonrpc: '2.0'` es el protocolo pero el path `/rpc` no es parte del estándar MCP. El "cliente de producción" funciona para el servidor del Ejemplo 2 (FastMCP), no necesariamente para cualquier servidor MCP | Sec. 9, Ejemplo 4 | PARCIALMENTE resuelto — el código existe pero valida el caso específico FastMCP, no el caso general |

### Patrón dominante de la versión corregida

**Nombre:** Parche con cuantificación performativa.

**Descripción:** Las correcciones más visibles introducen números (200-500, 50-100, 60-70%) en lugares donde la versión original tenía afirmaciones cualitativas. Esto da apariencia de mayor rigor — la versión corregida "tiene datos" mientras la original "solo decía cosas". Pero los números son estimaciones editoriales sin fuente empírica, no mediciones. El efecto neto es que el claim es más difícil de cuestionar (tiene formato de tabla) sin ser más verdadero.

**Cómo opera:** Un lector que cuestionó "reduce dramáticamente" en la versión original puede quedar satisfecho con la tabla ANTES/DESPUÉS. El cuestionamiento se desplaza de "¿es verdad que reduce?" a "¿son correctos los rangos de líneas?" — una pregunta técnica que requiere verificación activa, no lectura pasiva. El lector promedio no hace esa verificación.

**La corrección real vs. la corrección performativa:**

| Tipo | Ejemplo en esta versión |
|------|------------------------|
| Corrección real | Servicios financieros → ANTI-PATRÓN (reconoce el problema y propone alternativa) |
| Corrección real | IoT y multi-paso → VÁLIDO SOLO CON requisitos (condicionalización honesta) |
| Corrección real | Ejemplo 4 existe y el decorador es funcionalmente correcto para funciones `async` |
| Corrección performativa | 200-500 → 50-100 líneas (números sin fuente presentados como cuantificación) |
| Corrección performativa | "60-70% del esfuerzo" (estimación presentada como recomendación calibrada) |
| Corrección incompleta | Sec. 11 mantiene "descubrir dinámicamente" sin caveat |
| Corrección incompleta | Casos 1-6 sin advertencia de Sec. 4 |

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente |
|-------|--------------------------|--------|
| "El descubrimiento de servidores mismos requiere configuración explícita previa" (corrección de Sec. 5 y 6) | Corregido y consistente en ambas secciones. El código sigue mostrando servidores hardcodeados. | Código de Ejemplos 1-3; Sec. 5 tabla; Sec. 6 caveat |
| Servicios financieros es ANTI-PATRÓN para ejecución directa vía MCP | Corrección correcta. MCP no tiene ACID, no tiene firma digital, no tiene auditoría regulatoria por sí solo. La separación en 3 fases es arquitectónicamente correcta como separación de concerns. | Requisitos ACID documentados en literatura de BD; regulación financiera requiere auditoría |
| IoT requiere confirmación de entrega, reintentos exponenciales, timeout explícito, logging | Los 5 requisitos listados son reales y necesarios. Condicionalización correcta. | Estándares de sistemas embebidos y IoT |
| El Ejemplo 4 tiene logging, retry con backoff, timeout y context manager | El código existe y los patrones son correctos para funciones `async` | Análisis del código en Capa 3, SALTO-3 |
| La sección Gap Desarrollo/Producción identifica problemas reales | Service discovery, load balancing, health checks, circuit breaker son requisitos legítimos de producción | Prácticas de ingeniería de software de producción |
| Código de Ejemplos 1-3 sin duplicados y sin imports sin uso | Defectos del original (código doble, `Client` sin uso) resueltos | Comparación directa con versión original |

### FALSO

| Claim | Por qué es falso | Evidencia contraria |
|-------|-----------------|---------------------|
| Tabla "200-500 líneas sin MCP → 50-100 con MCP" cuantifica la reducción de complejidad | Los números no tienen fuente empírica. Son estimaciones editoriales presentadas como mediciones. ADEMÁS, el Ejemplo 4 (código de producción) tiene ~120 líneas solo para retry+cliente, excediendo el rango "50-100" antes de añadir las 8 consideraciones. Si se incluye el código de producción, el rango real con MCP supera el rango declarado. | CONTRADICCIÓN-1: el rango aplica al caso de desarrollo, no al caso de producción que el capítulo pretende abordar |
| `asyncio.wait_for(func(*args, **kwargs), timeout=timeout_sec)` funciona para cualquier callable | Funciona para funciones `async`. Si el decorador `with_retry_and_logging` se aplica a una función síncrona, `func(*args, **kwargs)` retorna el resultado directo (no una coroutine) y `asyncio.wait_for()` lanza TypeError. El tipo declarado es `Callable[..., Any]` — que incluye funciones síncronas. El código de producción tiene un bug latente en el caso síncrono. | SALTO-3: el TypeVar `T` y `Callable[..., Any]` no restringen a funciones `async` |
| Sec. 11 ("descubrir dinámicamente nuevas funciones sin necesidad de redesplegarse") refleja la corrección de Sec. 5/6 | Sec. 11 usa "dinámicamente" sin el caveat de "dentro de servidores previamente configurados". La corrección no fue aplicada a la sección de conclusiones. | CONTRADICCIÓN-2: la corrección es incompleta |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| "60-70% del esfuerzo a capas de producción" | Estimación sin fuente. Plausible para algunos proyectos, incorrecta para otros. El rango es demasiado amplio para ser útil como guía de planificación sin contexto adicional. | Datos de proyectos reales de adopción MCP con distribución de esfuerzo documentada |
| El patrón 3 fases para finanzas resuelve el problema de idempotencia entre Fase 2 y 3 | El patrón no especifica qué ocurre cuando la Fase 2 (firma) completa y la Fase 3 (ejecución) falla. ¿La firma sigue válida? ¿Puede re-ejecutarse? ¿Hay window de expiración? | Especificación del mecanismo de manejo de fallos post-firma |
| `tool_filter` dentro de `HttpServerParameters` es la ubicación correcta en el SDK | El código de Ejemplo 3 lo ubica ahí. El análisis del original lo identificó como potencialmente incorrecto. La versión corregida no modifica este código. | Verificar `MCPToolset` vs. `HttpServerParameters` en documentación ADK oficial |
| Los casos 1-6 ("VÁLIDOS") son seguros sin las advertencias de Sec. 4 | La corrección solo aplicó advertencias a casos 7-9. Los casos 1-6 siguen siendo presentados como VÁLIDOS sin condicionalización equivalente, aunque la condición de Sec. 4 (APIs subyacentes bien diseñadas) aplica a todos. | Evaluación de cada caso 1-6 contra la condición de Sec. 4 |
| La lista de 7 requisitos de producción en Sec. 10 es suficiente | Lista plausible pero omite autenticación/autorización, TLS, rate limiting, gestión de secretos, versionado de API del servidor | Comparación con checklist de producción de infraestructura de microservicios |

### Patrón dominante

**Corrección selectiva con cuantificación performativa.**

La versión corregida resolvió los problemas más obvios y potencialmente más embarazosos (servicios financieros como ANTI-PATRÓN, IoT con requisitos explícitos, código sin duplicados). Estos son cambios reales y mejoras genuinas. Sin embargo, el mecanismo de corrección para los claims cualitativos ("reduce dramáticamente") fue reemplazar la cualidad con números no calibrados — lo que produce un artefacto más difícil de cuestionar sin ser más verdadero.

El patrón opera en dos niveles:

**Nivel 1 — Correcciones reales:** Los problemas que tenían solución directa (reclasificar un caso, añadir condiciones, agregar código) fueron resueltos correctamente. El autor corrigió lo que podía corregir con decisiones editoriales.

**Nivel 2 — Correcciones performativas:** Los problemas que requerirían datos empíricos reales para resolverse genuinamente (¿cuántas líneas ahorra MCP en promedio? ¿qué porcentaje del esfuerzo va a producción?) fueron "resueltos" con estimaciones numéricas presentadas como si tuvieran base empírica. La forma de la corrección es correcta; el contenido sigue siendo especulación.

**Veredicto comparativo:**

| Dimensión | Versión original | Versión corregida |
|-----------|-----------------|-------------------|
| Casos de uso problemáticos | Todos tratados igual | Diferenciados con advertencias apropiadas |
| Cuantificación | Ausente (solo cualitativa) | Presente pero sin fuente empírica |
| Código de producción | Ausente | Presente con bug latente en caso síncrono |
| Corrección del discovery | Ausente | Presente en Sec. 5 y 6, ausente en Sec. 11 |
| Advertencia Sec. 4 → casos 1-6 | Desconectada | Sigue desconectada |
| Imports sin uso / código duplicado | Presentes | Resueltos |
| Números sin fuente | Ninguno | Tres nuevos (200-500, 50-100, 60-70%) |

**¿La versión corregida resuelve los problemas del original o los parchea superficialmente?**

Respuesta diferenciada:

- **Resuelve genuinamente:** La reclasificación del caso financiero, la condicionalización de IoT y multi-paso, la eliminación de código duplicado e imports sin uso. Estos son cambios que mejoran la corrección técnica del capítulo de forma real.

- **Parchea superficialmente:** La cuantificación con estimaciones sin fuente (tabla de líneas, 60-70%), la corrección del discovery que no llega a Sec. 11, la no-extensión de las advertencias a los casos 1-6.

- **Introduce nuevos problemas:** Bug latente en `with_retry_and_logging` para funciones síncronas; el patrón financiero de 3 fases que no especifica el manejo de fallo post-firma.

El artefacto resultante es mejor que el original — el estándar de comparación es bajo. No es suficientemente riguroso para ser usado como referencia técnica sin las calificaciones documentadas en este análisis.

---

## Nota de completitud del input

Secciones potencialmente comprimidas: Sec. 7 (flujo de interacción) comprimida explícitamente, documentada. No afecta el análisis diferencial porque esa sección es idéntica a la versión original y no recibió correcciones.

Saltos no analizables por compresión: ninguno — la compresión aplica a la sección no modificada.
