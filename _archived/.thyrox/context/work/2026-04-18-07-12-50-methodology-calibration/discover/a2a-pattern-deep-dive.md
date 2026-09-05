```yml
created_at: 2026-04-19 11:03:08
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Chapter 15: Inter-Agent Communication (A2A)" (documento externo, 2026-04-19)
veredicto_síntesis: PARCIALMENTE VÁLIDO
saltos_lógicos: 4
contradicciones: 3
engaños_estructurales: 4
```

# Deep-Dive Adversarial: Chapter 15 — Inter-Agent Communication (A2A)

---

## VERIFICACIÓN DE COMPLETITUD DEL INPUT

El input es texto fuente original preservado verbatim con 8 notas editoriales del orquestador.
No se detecta compresión significativa. Las secciones críticas — código Python verbatim, payloads
JSON-RPC completos, Key Takeaways, References — están preservadas íntegramente.

**Diferencia estructural respecto a capítulos anteriores (Cap.10-14):** El código apunta a
repositorios GitHub reales y verificables (google-a2a/a2a-samples, Apache 2.0). Esto cambia
el tipo de análisis posible: los bugs son verificables contra el repositorio fuente, no solo
inferibles del snippet.

---

## CAPA 1: LECTURA INICIAL

### Tesis del capítulo

A2A (Agent2Agent) es un protocolo abierto basado en HTTP/JSON-RPC 2.0 que resuelve el
problema de comunicación entre agentes de distintos frameworks. El capítulo presenta:

1. Los conceptos core del protocolo (Core Actors, Agent Card, Agent Discovery, Tasks, Interaction, Security)
2. Casos de uso prácticos (multi-framework, workflow orchestration, dynamic retrieval)
3. Un ejemplo de implementación — un Calendar Agent como A2A Server usando Google ADK
4. Comparación con MCP
5. Resumen en Key Takeaways y Conclusiones

### Estructura argumental

```
Premisa: los agentes individuales están aislados y no pueden colaborar entre frameworks
Mecanismo: A2A estandariza la comunicación via HTTP + JSON-RPC 2.0 + Agent Card
Resultado esperado: interoperabilidad entre ADK, LangGraph, CrewAI, Azure AI Foundry, AG2
Evidencia: código del repositorio google-a2a/a2a-samples (Calendar Agent)
```

### Afirmaciones centrales extraídas (perspectiva del autor)

1. A2A es un open standard soportado por Atlassian, Box, LangChain, MongoDB, Salesforce, SAP, ServiceNow, Microsoft
2. La comunicación usa JSON-RPC 2.0 sobre HTTP(S)
3. Los métodos son `tasks/send` y `tasks/sendSubscribe` (Key Takeaways) / `sendTask` y `sendTaskSubscribe` (payloads)
4. `datetime.datetime.now()` "dynamically incorporates the current date for temporal context"
5. El Calendar Agent demuestra A2A inter-agent communication
6. Las interacciones son modulares, escalables y seguras con mTLS

---

## CAPA 2: AISLAMIENTO DE CAPAS

### Sub-capa A: Frameworks teóricos

| Instancia | Sección | Status |
|-----------|---------|--------|
| JSON-RPC 2.0 como protocolo de transporte | "Communications and Tasks" | VERDADERO — estándar bien establecido (jsonrpc.org) |
| HTTP(S) como capa de transporte | "Communications and Tasks" | VERDADERO |
| OAuth 2.0 / API keys para autenticación | "Security" | VERDADERO |
| mTLS para autenticación de transporte | "Security" | VERDADERO |
| Modelo /.well-known/ para discovery | "Agent Discovery" | VERDADERO — patrón RFC 8615 |

### Sub-capa B: Aplicaciones concretas

| Instancia | Sección | Status |
|-----------|---------|--------|
| A2A facilita LangGraph + CrewAI + ADK comunicándose | "Overview" | INCIERTO — el código de ejemplo solo muestra el server ADK, no la comunicación cross-framework |
| `create_agent()` incorpora la fecha "dinámicamente" | Comentario en código | FALSO — evaluación estática (ver Capa 3) |
| El Calendar Agent "demonstrates A2A" | "Hands-On" | PARCIAL — demuestra solo el server side de A2A, no la comunicación A2A entre agentes |
| `asyncio.run(create_agent(...))` en función síncrona `main()` | `__main__.py`, línea 291 | PROBLEMÁTICO — ver Capa 3 |

### Sub-capa C: Números específicos

| Valor | Sección | Fuente |
|-------|---------|--------|
| `gemini-2.0-flash-001` | `adk_agent.py` | Hardcoded — sin derivación de por qué este modelo |
| `version: '1.0.0'` en AgentCard | `__main__.py` | Convencional — sin derivación |
| `historyLength: 5` en JSON-RPC payloads | Interaction Mechanisms | Sin fuente — no hay justificación de por qué 5 |
| 7 referencias en lista | References | Verificable — 7 URLs, ninguna peer-reviewed |

### Sub-capa D: Afirmaciones de garantía

| Garantía | Sección | Evidencia de respaldo |
|----------|---------|----------------------|
| "A2A ensures interoperability" entre frameworks distintos | Overview | INCIERTO — asumido, no demostrado en el código |
| "Security is a fundamental aspect" con mTLS | Conclusions | El código usa HTTP plano (`http://{host}:{port}/`), sin TLS |
| "A2A is modality-agnostic" (audio, video) | Interaction Mechanisms | INCIERTO — no hay código ni referencia técnica que lo demuestre para audio/video |
| Las referencias son verificables | Nota 3 | VERDADERO pero Ref.6 duplica Ref.1 exactamente |

---

## CAPA 3: BÚSQUEDA DE SALTOS LÓGICOS

### SALTO-1: "dynamically incorporates the current date"

**Premisa:** `instruction=f"...Today is {datetime.datetime.now()}..."` en `create_agent()`
**Conclusión del capítulo:** "The agent's instructions dynamically incorporate the current date for temporal context." (Sección "Hands-On Code Example", párrafo de descripción del snippet `adk_agent.py`)
**Tipo de salto:** Error de comprensión de evaluación de f-strings en Python
**Tamaño:** CRÍTICO para la afirmación de corrección del código
**Justificación que debería existir:** La fecha se evalúa EXACTAMENTE UNA VEZ cuando se llama
`create_agent()`. Si el servidor arranca el día D y corre por 30 días, todos los usuarios
reciben "Today is [día D]" durante esos 30 días. Para que fuera dinámico, la fecha debería
calcularse dentro del handler de cada invocación, no en el constructor del agente. El texto
usa la palabra "dynamically" para describir comportamiento que es por definición estático.

### SALTO-2: El código "demuestra A2A inter-agent communication"

**Premisa:** Se muestra código de `adk_agent.py` y `__main__.py` para el Calendar Agent
**Conclusión del capítulo:** "These examples illustrate the process of building an A2A-compliant agent" (Hands-On, párrafo final)
**Tipo de salto:** El código muestra SOLO el A2A Server — no hay ningún A2A Client en el ejemplo
**Tamaño:** CRÍTICO para el claim del título
**Justificación que debería existir:** Para demostrar "Inter-Agent Communication" se necesita
al menos: (1) un A2A Client que envíe una tarea, (2) un A2A Server que la procese,
(3) la respuesta viajando de regreso. El capítulo solo muestra la mitad del protocolo.
El título del capítulo es "Inter-Agent Communication" pero el código de ejemplo es
"cómo construir un A2A Server". La comunicación inter-agente en sí — es decir, un agente
llamando a otro agente mediante A2A — no aparece en el código.

### SALTO-3: `asyncio.run()` dentro de servidor ASGI

**Premisa:** `adk_agent = asyncio.run(create_agent(...))` en `main()` síncrona, línea 291
**Conclusión implícita:** El código funciona como presentado
**Tipo de salto:** Potencial conflicto de event loop
**Tamaño:** MEDIO-CRÍTICO
**Análisis detallado:**
`main()` es una función síncrona. `asyncio.run()` crea un nuevo event loop, ejecuta
`create_agent()` (una coroutine), y lo cierra. Esto funciona en el contexto de `main()`
porque `main()` es síncrona y no hay loop activo cuando se llama.
**PERO:** El servidor Uvicorn que se inicia después con `uvicorn.run(app, host=host, port=port)`
crea su PROPIO event loop interno para manejar las conexiones ASGI. Esto significa:
- El `create_agent()` corre en un loop efímero (ya cerrado)
- El servidor ASGI corre en un loop diferente (el de Uvicorn)
- Los objetos async creados en el primer loop (como `toolset.get_tools()`) ahora viven
  en un contexto de loop que ya no existe
En la práctica esto puede funcionar si `CalendarToolset` y `LlmAgent` no mantienen
referencias internas a coroutines del loop original. Sin embargo, el patrón es frágil:
si cualquier componente interno del ADK usa `asyncio.get_running_loop()` en tiempo de
ejecución del servidor, fallará porque el loop original fue cerrado.
**Justificación que debería existir:** La forma idiomática sería inicializar el agente
dentro del contexto del event loop del servidor (via `on_startup` de Starlette, o via
`asyncio.run()` que también inicie el servidor completo).

### SALTO-4: Seguridad "fundamental" vs. `http://` en el código

**Premisa:** "Security is a fundamental aspect, with built-in mechanisms like mTLS" (Conclusions)
**Código real:** `url=f'http://{host}:{port}/'` en AgentCard — HTTP plano, no HTTPS
**Tipo de salto:** El código de ejemplo contradice la afirmación de seguridad
**Tamaño:** MEDIO (no invalida la arquitectura, pero el ejemplo es inconsistente con el claim)
**Justificación que debería existir:** El capítulo debería aclarar que el ejemplo es para
desarrollo local y que producción requiere configuración TLS explícita, no solo mencionarlo
en la sección de Security sin conectarlo al código de ejemplo.

---

## CAPA 4: IDENTIFICACIÓN DE CONTRADICCIONES

### CONTRADICCIÓN-1: Naming de métodos JSON-RPC (internal naming collision)

**Afirmación A:** `"method": "sendTask"` y `"method": "sendTaskSubscribe"` (Sección "Interaction Mechanisms", JSON-RPC payload examples)
**Afirmación B:** "using `tasks/send`" y "using `tasks/sendSubscribe`" (Key Takeaways, tercer bullet)
**Por qué chocan:** Son dos convenciones de naming para el mismo concepto dentro del mismo capítulo. `sendTask` es un método JSON-RPC (camelCase, sin slash). `tasks/send` sugiere un endpoint-style path (REST-like, con slash). No son equivalentes — JSON-RPC no usa paths con slashes como nombres de método. Solo uno puede ser el nombre canónico del método en la especificación A2A.
**Cuál prevalece:** Según la especificación A2A oficial (https://a2a-protocol.org/latest/, referencia en Nota 1 del input), los métodos correctos son `tasks/send` y `tasks/sendSubscribe`. Los payloads del capítulo usan `sendTask` y `sendTaskSubscribe` — que son el formato de una versión ANTERIOR del protocolo. El capítulo mezcla la nomenclatura de dos versiones distintas de la especificación A2A.
**Impacto:** Implementador que siga los JSON-RPC payloads literales del capítulo y use `sendTask` probablemente recibirá errores `Method not found` contra servidores A2A que implementen la especificación actual con `tasks/send`.

### CONTRADICCIÓN-2: Fecha "dinámica" vs. evaluación estática

**Afirmación A:** "The agent's instructions **dynamically** incorporate the current date for temporal context." (Sección "Hands-On Code Example", párrafo descriptivo de `adk_agent.py`)
**Afirmación B:** El código es `instruction=f"...Today is {datetime.datetime.now()}..."` dentro de `create_agent()`, que se llama UNA VEZ en `main()` via `asyncio.run()`.
**Por qué chocan:** "Dynamically" implica que el valor cambia en cada invocación. La f-string en Python se evalúa en el momento de construcción de la string — que ocurre UNA SOLA VEZ cuando se llama `create_agent()`. No hay mecanismo para que este valor se actualice después. Es una contradicción entre la descripción textual y el comportamiento real del código.
**Cuál prevalece:** El comportamiento del código (evaluación estática) prevalece. La descripción del capítulo es incorrecta.

### CONTRADICCIÓN-3: mTLS "fundamental" vs. HTTP en producción implícita

**Afirmación A:** "Security is a fundamental aspect, with built-in mechanisms like mTLS and explicit authentication requirements to protect communications." (Conclusions)
**Afirmación B:** `url=f'http://{host}:{port}/'` — el Agent Card publica explícitamente una URL HTTP (no HTTPS), lo que significa que el agente se anuncia a sí mismo como un endpoint sin TLS.
**Por qué chocan:** Si mTLS fuera fundamental y el código lo implementara, la URL sería `https://`. El hecho de que la URL sea `http://` indica que el ejemplo de referencia no implementa el mecanismo de seguridad que el texto afirma como fundamental.
**Cuál prevalece:** Ninguna afirmación es completamente correcta. El protocolo A2A SOPORTA mTLS — eso es verdad. Pero el código de ejemplo NO lo implementa, y el capítulo no distingue "el protocolo soporta" de "este código implementa".

---

## CAPA 5: MAPEO DE ENGAÑOS ESTRUCTURALES

### Patrón 1: Credibilidad prestada — A2A como "open standard" con adopción de industria

**Definición:** Citar endorsement de empresas válidas (Atlassian, Box, Salesforce, Microsoft) para establecer credibilidad del protocolo, sin distinguir "anunció soporte" de "implementó soporte" de "tiene implementación en producción".
**Localización:** Sección "Inter-Agent Communication Pattern Overview", párrafos 3-5
**Texto citado:** "A2A is supported by a range of technology companies... Microsoft plans to integrate A2A into Azure AI Foundry and Copilot Studio"
**Operación:** "Plans to integrate" y "are integrating" se presentan en la misma lista que soporte ya existente, creando la impresión de un ecosistema establecido. "Plans to" es una declaración de intención futura, no evidencia de interoperabilidad real. El capítulo no distingue entre estos estados.
**Efecto:** El lector asume que puede usar A2A para comunicar sus agentes con Salesforce o ServiceNow hoy. La realidad (para la fecha del capítulo) es heterogénea y la integración puede estar en distintos estados de madurez.

### Patrón 2: Named Mechanism vs. Implementation (continuación del patrón de Cap.10-14)

**Definición:** El mecanismo nombrado en el título es significativamente menos representado en el código que otros mecanismos secundarios.
**Localización:** Título "Inter-Agent Communication (A2A)" vs. código mostrado
**Análisis:**
- El título promete comunicación ENTRE agentes
- El código muestra EXCLUSIVAMENTE cómo construir el lado servidor de un agente A2A
- No hay ningún snippet de un A2A Client
- No hay ningún snippet de dos agentes comunicándose
- La "inter-agent communication" del título requiere mínimo dos participantes; el código muestra uno
**Operación:** El capítulo usa el protocolo A2A (que conceptualmente habilita la comunicación inter-agente) como evidencia de que el capítulo demuestra comunicación inter-agente. Son cosas distintas: explicar un protocolo ≠ demostrar la comunicación que ese protocolo habilita.
**Veredicto:** El patrón "Named Mechanism vs. Implementation" se confirma en el capítulo 15. Es el sexto capítulo consecutivo donde el mecanismo del título está subrepresentado en el código de ejemplo.

### Patrón 3: Descripción como comportamiento — "dynamically"

**Definición:** Usar lenguaje de comportamiento dinámico para describir código estático, ocultando la distinción entre "calculado una vez" y "calculado cada vez".
**Localización:** Sección "Hands-On Code Example", párrafo descriptivo de `adk_agent.py`
**Texto citado:** "The agent's instructions dynamically incorporate the current date for temporal context."
**Operación:** La palabra "dynamically" es técnicamente imprecisa aquí. El código es correcto para demostrar que la instrucción PUEDE incluir la fecha — pero la descripción superpone un comportamiento que el código no tiene. Un lector que quiera implementar un agente con fecha actualizada copiará este código pensando que lo resuelve.
**Impacto:** Genera bug silencioso en producción: el agente tendrá fecha fija aunque el servidor corra por semanas.

### Patrón 4: Limitación enterrada — servicios in-memory sin advertencia de producción

**Definición:** Usar componentes efímeros sin distinguir explícitamente contexto de desarrollo vs. producción.
**Localización:** `__main__.py`, líneas 297-302: `InMemoryArtifactService()`, `InMemorySessionService()`, `InMemoryMemoryService()`
**Operación:** El capítulo describe el código como demostración de "building an A2A-compliant agent" sin aclarar que los tres servicios in-memory pierden estado al reiniciar el proceso. Un agente que gestiona calendarios — con conversaciones multi-turn y autenticación OAuth — necesita persistencia de sesión. El capítulo menciona el patrón "multi-turn conversations" en Key Takeaways pero el código los haría imposibles entre reinicios del servidor.
**Nota:** Este patrón es idéntico al de `EmbeddedOptions()` en Cap.14 (Weaviate in-memory), identificado como engaño estructural en ese análisis. Se repite con el mismo mecanismo.

---

## CAPA 6: SÍNTESIS DE VEREDICTO

### VERDADERO

| Claim | Evidencia que lo respalda | Fuente externa |
|-------|--------------------------|----------------|
| A2A usa JSON-RPC 2.0 sobre HTTP(S) | Especificación técnica del protocolo, payloads en el capítulo | https://a2a-protocol.org/latest/ |
| Agent Card es un JSON de identidad/capabilities | Ejemplo JSON en capítulo, estructura coherente con spec | google-a2a/A2A GitHub repository |
| A2A es open-source con respaldo de múltiples empresas | Anuncios públicos verificables | Referencias 2, 7 del capítulo |
| Los tres servicios in-memory existen como componentes del ADK | Código real en repositorio github | google-a2a/a2a-samples |
| A2A admite SSE para streaming | Documentado en spec y en Agent Card (streaming: true) | Spec oficial |
| Las URLs de código son verificables y open-source (Apache 2.0) | El repositorio es público y accesible | github.com/google-a2a/a2a-samples |
| Ref.6 es URL duplicada exacta de Ref.1 | Comparación directa en lista de referencias | Verificación directa en el texto |

### FALSO

| Claim | Por qué es falso | Contradicción/evidencia contraria |
|-------|-----------------|----------------------------------|
| `datetime.datetime.now()` "dynamically incorporates" la fecha | f-string se evalúa UNA VEZ en `create_agent()` — evaluación estática, no dinámica | Semántica de f-strings en Python: evaluadas en tiempo de construcción, no de acceso |
| Key Takeaways: métodos son `tasks/send` y `tasks/sendSubscribe` | Los JSON-RPC payloads del mismo capítulo usan `sendTask` / `sendTaskSubscribe` — naming de versión anterior | CONTRADICCIÓN-1 — ambos no pueden ser correctos simultáneamente |
| El código de ejemplo demuestra "Inter-Agent Communication" | El código muestra SOLO el A2A Server. No hay A2A Client, no hay comunicación entre agentes | SALTO-2 — comunicación requiere dos participantes |
| "Security is fundamental" con mTLS | El Agent Card publica `http://` (no `https://`). El código de ejemplo no implementa TLS | CONTRADICCIÓN-3 |

### INCIERTO

| Claim | Por qué no es verificable | Qué necesitaría para volverse verdadero/falso |
|-------|--------------------------|----------------------------------------------|
| A2A asegura interoperabilidad entre LangGraph, CrewAI, ADK | El código muestra solo ADK server. No hay prueba de interoperabilidad cross-framework | Un test de integración donde un agente LangGraph llame a un agente ADK via A2A |
| Microsoft "plans to integrate A2A" | Estado de implementación al 2026-04-19 es desconocido — puede estar completo, parcial, o abandonado | Documentación oficial de Azure AI Foundry |
| A2A es "modality-agnostic" para audio/video | No hay código ni referencia técnica específica para estos modos | Implementación real o spec técnica para audio/video modes |
| `asyncio.run()` + Uvicorn no genera conflictos de event loop | Depende de implementación interna del ADK (si mantiene referencias al loop original) | Test de ejecución real del código; inspección del código interno del ADK |
| Los servicios in-memory son suficientes para el caso de uso Calendar | Para demos de corta duración, son suficientes; para producción no | Dependencia del contexto de uso — el capítulo no especifica |

### Patrón dominante

**Nombre:** Named Mechanism vs. Implementation (sexta instancia en capítulos 10-15)

**Descripción del patrón:**
El capítulo promete en su título y secciones introductorias demostrar comunicación entre agentes (A2A). El código de ejemplo demuestra exclusivamente cómo construir el SERVIDOR de un agente A2A. La comunicación inter-agente — que requiere mínimo un cliente y un servidor, un mensaje enviado y recibido — no aparece en el código. El lector termina el capítulo habiendo visto cómo se registra un agente como A2A Server, cómo se define un Agent Card, cómo se inicializa el runner. Nunca ve un agente comunicándose con otro agente.

**Cómo opera en este capítulo específicamente:**
El capítulo usa la arquitectura del protocolo A2A (que conceptualmente HABILITA la comunicación inter-agente) como sustituto de la demostración de esa comunicación. La distinción entre "protocolo que habilita X" y "código que demuestra X" no se hace explícita. El capítulo presenta conceptos reales y correctos (Core Actors, Agent Card, JSON-RPC, SSE) pero los conecta a un ejemplo de código que solo implementa uno de los dos roles necesarios para que el protocolo tenga sentido.

**Consecuencia sistémica:**
Este es el sexto capítulo consecutivo (Cap.10-15) donde el mecanismo nombrado en el título está significativamente subrepresentado en el código de ejemplo. El patrón no es un error aislado — es sistémico. Sugiere que el libro está estructurado para explicar protocolos y conceptos de forma correcta, pero que los ejemplos de código son demostraciones de configuración/setup, no de los mecanismos de colaboración en sí.

---

## ANÁLISIS ESPECÍFICO DE BUGS POR CATEGORÍA

### BUG-1: `datetime.datetime.now()` estático — CRÍTICO para el claim del capítulo

**Ubicación:** `adk_agent.py`, línea de `instruction=f"...Today is {datetime.datetime.now()}..."`
**Categoría de bug:** Error de comprensión del ciclo de vida del objeto
**Severidad en código:** BAJA (el código funciona, solo produce fecha estática)
**Severidad en el texto:** ALTA (el texto afirma que es dinámico)
**Por qué importa:** El capítulo usa este código para enseñar cómo dar contexto temporal a un LLM. Un desarrollador que copie el patrón basándose en la descripción "dynamically incorporates" asumirá que la fecha se actualiza sola. No lo hará. El error de comprensión en la descripción convierte un comportamiento aceptable (fecha fija al inicio) en un bug silencioso cuando se necesita fecha actual.
**Fix correcto:**
```python
# Opción 1: callback por invocación
def get_current_instruction():
    return f"Today is {datetime.datetime.now()}."

# Opción 2: tool que el LLM puede llamar para obtener la fecha
# Opción 3: en el prompt de sistema a nivel de sesión, no a nivel de agente
```

### BUG-2: Servicios in-memory — ADVERTENCIA DE PRODUCCIÓN AUSENTE

**Ubicación:** `__main__.py`, líneas de `InMemoryArtifactService()`, `InMemorySessionService()`, `InMemoryMemoryService()`
**Categoría:** Componentes efímeros presentados sin disclaimer de producción
**Severidad en código:** MEDIA-ALTA para cualquier uso más allá de demo
**El Calendar Agent específicamente:** Gestiona autenticación OAuth y estado de calendario del usuario. Una sesión OAuth que se pierde al reiniciar el servidor requiere re-autenticación. `InMemorySessionService()` hace que TODOS los estados de sesión sean volátiles. No es un problema teórico — es un problema operacional directo para el caso de uso que el capítulo elige como ejemplo.
**Fix correcto:** Para producción usar `DatabaseSessionService`, `CloudStorageArtifactService`, o equivalentes persistentes del ADK.

### BUG-3: `asyncio.run()` en contexto de servidor ASGI — FRÁGIL

**Ubicación:** `__main__.py`, línea `adk_agent = asyncio.run(create_agent(...))`
**Categoría:** Gestión de event loop en aplicación async
**Severidad:** MEDIA — funciona para el caso simple pero es frágil
**Análisis técnico detallado:**
```
Timeline de ejecución:
1. Python inicia, no hay event loop
2. asyncio.run(create_agent(...)) → crea loop L1, ejecuta create_agent(), cierra L1
3. adk_agent tiene objetos creados en L1 (ya muerto)
4. uvicorn.run(app) → crea loop L2 (el loop del servidor ASGI)
5. Las requests entran por L2 → si adk_agent internamente usa asyncio.get_event_loop()
   o mantiene referencias async al L1, hay inconsistencia
```
El ADK probablemente está diseñado para manejar esto correctamente dado que es el ejemplo
oficial de Google. Sin embargo, el PATRÓN enseñado es incorrecto para la mayoría de las
aplicaciones async. La forma idiomática sería:
```python
# Correcto: inicializar el agente dentro del contexto del servidor
@app.on_event("startup")  # Starlette lifespan
async def startup():
    global adk_agent
    adk_agent = await create_agent(...)
```

### BUG-4: Naming inconsistencia `sendTask` vs `tasks/send` — ERROR DE VERSIÓN

**Ubicación 1:** Sección "Interaction Mechanisms", JSON-RPC payloads — `"method": "sendTask"` y `"method": "sendTaskSubscribe"`
**Ubicación 2:** Key Takeaways, tercer bullet — `tasks/send` y `tasks/sendSubscribe`
**Categoría:** Mezcla de nomenclatura de versiones distintas del protocolo A2A
**Severidad:** ALTA para implementadores
**Contexto:** La especificación A2A cambió el naming de sus métodos JSON-RPC durante su desarrollo. La versión actual usa `tasks/send` (con slash, namespace explícito). Una versión anterior usó `sendTask` (camelCase, sin namespace). El capítulo cita ambas versiones sin distinguirlas. Un implementador que intente conectarse a un servidor A2A moderno usando `sendTask` recibirá `{"code": -32601, "message": "Method not found"}`.

---

## EVALUACIÓN DEL PATRÓN SISTÉMICO

### Confirmación: "Named Mechanism vs. Implementation" — Cap.15

| Aspecto | Estado |
|---------|--------|
| Título promete | Inter-Agent Communication |
| Código muestra | Setup de A2A Server únicamente |
| Comunicación entre agentes en código | AUSENTE |
| Patrón previamente visto en | Cap.10, 11, 12, 13, 14 |
| Instancia número | 6 de 6 capítulos analizados (Cap.10-15) |

**Diferencia con capítulos anteriores:** Los capítulos 10-14 tenían código inventado, funciones no definidas, y URLs a repositorios inexistentes. El Capítulo 15 tiene código REAL de un repositorio verificable. Esto cambia la naturaleza del problema:

- En Cap.10-14: el código era ficticio y el patrón era de calidad de fabricación
- En Cap.15: el código es real y correcto para lo que hace (setup de A2A Server), pero no demuestra lo que el capítulo promete (inter-agent communication)

El patrón persiste pero por una razón diferente: el capítulo elige un ejemplo de código que es correcto pero incompleto respecto al claim del título.

### Calidad relativa del capítulo vs. Cap.10-14

| Criterio | Cap.10-14 | Cap.15 |
|----------|-----------|--------|
| Código verificable | NO | SÍ (GitHub real) |
| Código ejecutable | NO (funciones no definidas) | SÍ (con credenciales) |
| URLs funcionales | Mixto | SÍ (7 referencias) |
| Imports presentes | NO (sin declaración) | PARCIAL (honestamente documentado como incompleto) |
| Bugs en código | Fabricados, irreproducibles | Reales, reproducibles |
| Descripción de código precisa | NO | NO (el bug de "dynamically" persiste) |

---

## CALIDAD DE REFERENCIAS

| Ref | URL | Tipo | Nivel de autoridad |
|-----|-----|------|--------------------|
| 1 | trickle.so/blog | Blog | Bajo |
| 2 | github.com/google-a2a/A2A | Repositorio oficial | Alto |
| 3 | google.github.io/adk-docs | Documentación oficial | Alto |
| 4 | codelabs.developers.google.com | Tutorial oficial Google | Alto |
| 5 | a2a-protocol.org/latest | Especificación oficial | Alto |
| 6 | trickle.so/blog (DUPLICADO de Ref.1) | Bug editorial | — |
| 7 | oreilly.com/radar | O'Reilly Radar | Medio |

**Evaluación:** 4 de 7 referencias son fuentes de alta autoridad (spec oficial, repos oficiales, documentación oficial). La ausencia de papers peer-reviewed es apropiada dado que A2A es un protocolo técnico nuevo (2025) sin literatura académica establecida. El tipo de evidencia es correcto para el tipo de contenido. La excepción es Ref.6 — URL duplicada exacta de Ref.1, error editorial claro.

**Patrón CCV confirmado:** Ninguna referencia está citada inline. Las 7 aparecen solo en la lista final. Un lector no puede rastrear qué claim específico respalda cada referencia.

---

## VEREDICTO FINAL

**PARCIALMENTE VÁLIDO**

### Trazabilidad del veredicto

**Por qué NO es INVÁLIDO:**
El código de ejemplo es real, verificable, ejecutable (con credenciales), y tomado de un repositorio oficial open-source. La arquitectura A2A descrita — Core Actors, Agent Card, JSON-RPC 2.0, SSE, Agent Discovery — es correcta y coherente con la especificación oficial. El capítulo no inventa ni fabrica mecanismos.

**Por qué NO es VÁLIDO:**
1. El bug `datetime.datetime.now()` está acompañado de la descripción "dynamically" — el capítulo ENSEÑA el patrón incorrecto activamente, no solo lo usa
2. La inconsistencia de naming `sendTask` vs `tasks/send` dentro del mismo capítulo puede causar `Method not found` en implementaciones reales
3. El mecanismo central prometido por el título (comunicación entre agentes) no aparece en el código

**Criterio de escala aplicado:**
- El comment/docstring activamente enseña el patrón incorrecto (BUG-1): **CRITERIO DE INVÁLIDO cumplido parcialmente** — el bug es en la descripción del código, no en el docstring del código mismo
- Los bugs invalidan partes del mecanismo central: la inconsistencia de naming (BUG-4) invalida la implementabilidad de los JSON-RPC payloads tal como están escritos
- La arquitectura general (cómo funciona A2A como protocolo) es correcta

**Veredicto final:** PARCIALMENTE VÁLIDO

El capítulo es una introducción conceptualmente correcta al protocolo A2A. Sus bugs son de implementación (BUG-1, BUG-4), de alcance (BUG-2, SALTO-2), y de inconsistencia entre versiones del protocolo (BUG-4). No hay fabricación de mecanismos. El código es real. Sin embargo, no demuestra el mecanismo del título, enseña un patrón de fecha estática como dinámico, y usa naming de una versión obsoleta del protocolo en los payloads de ejemplo.

---

*Análisis generado: 2026-04-19. Basado en texto completo del capítulo preservado verbatim en input.*
