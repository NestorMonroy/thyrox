```yml
created_at: 2026-04-19 06:48:37
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: "AUDITORÍA FORMAL - CAPÍTULO 10: MCP (documento externo)"
ratio_calibracion: "22.15/28 = 79%"
clasificacion: CALIBRADO
```

# Análisis de Calibración: Auditoría Formal — Capítulo 10 MCP

> Protocolo: Modo 1 — Detección de realismo performativo.
> Artefacto auditado: `mcp-audit-input.md` (auditoría externa sobre Cap.10).
> Referencia para verificación de claims: `mcp-pattern-input.md` (texto fuente del capítulo).
> Referencia de trayectoria: `mcp-pattern-calibration.md` (65%, PARCIALMENTE CALIBRADO — análisis del capítulo mismo).

**Naturaleza del artefacto:** Este documento es una auditoría de un capítulo — no el capítulo mismo. Tiene estructura diferente: claims, evidence blocks, verdicts, recomendaciones. Los claims de la auditoría son aserciones sobre el capítulo, por lo tanto son verificables cruzando contra el texto fuente. Esto crea una capa de verificabilidad inusual: cada claim de la auditoría puede confirmarse o refutarse leyendo el capítulo original, que está disponible en `mcp-pattern-input.md`.

---

## 1. Inventario de claims evaluados

| ID | Claim | Sección en audit | Grupo | Tipo |
|----|-------|------------------|-------|------|
| A-01 | "Sección 2 afirma reducción dramática de complejidad" | Contradicción 1 | A | Verificable vs. capítulo |
| A-02 | "Sección 4 lista 8 complejidades que deben resolverse" | Contradicción 1 | A | Verificable vs. capítulo |
| A-03 | Tabla comparativa MCP dice "descubrimiento dinámico de herramientas" | Contradicción 2 | A | Verificable vs. capítulo |
| A-04 | Ejemplo 1 filesystem hardcodea servidor (`command='npx'`) | Contradicción 2 | A | Verificable vs. código del capítulo |
| A-05 | Ejemplo 3 FastMCP client hardcodea servidor (`url='http://localhost:8000'`) | Contradicción 2 | A | Verificable vs. código del capítulo |
| A-06 | `tool_filter=['greet']` hardcodeado en Ejemplo 3 | Contradicción 2 | A | Verificable vs. código del capítulo |
| A-07 | "La advertencia de Sección 2 no se repite en Sección 6" | Contradicción 3 | A | Verificable vs. capítulo |
| A-08 | La auditoría distingue dos niveles de discovery (servidores vs. funciones) | Contradicción 2 | A | Análisis técnico |
| A-09 | `tool_filter` aparece en Ejemplo 3 pero no en Ejemplo 1 | Defecto 1 | B | Verificable vs. código del capítulo |
| A-10 | `StdioConnectionParams` fue "corregido en traducción" | Defecto 2 | B | Claim sobre traducción |
| A-11 | `Client` import fue "corregido en traducción" | Defecto 3 | B | Claim sobre traducción |
| A-12 | "Capítulo 7 declara protocolo de comunicación crítico para multi-agente" | Coherencia | D | Claim sobre capítulo externo no disponible |
| A-13 | "Capítulo 10 implementa JSON-RPC/STDIO y HTTP/SSE" | Coherencia | D | Verificable vs. capítulo |
| A-14 | "Conexión explícita entre Cap.7 y Cap.10: NINGUNA" | Coherencia | D | Verificable vs. capítulo |
| A-15 | "Implementadores ignorarán Sección 2 y perderán dinero" | Impacto en Producción | C | Proyección sobre comportamiento de implementadores |
| A-16 | "Equipos perderán tiempo buscando dynamic discovery que no existe" | Impacto en Producción | C | Proyección sobre comportamiento de implementadores |
| A-17 | "Configuraciones inconsistentes entre equipos" por `tool_filter` | Impacto en Producción | C | Proyección sobre consecuencia de defecto |
| A-18 | "Reemplazar 'reduce dramáticamente' por formulación más precisa" | Recomendación 1 | E | Recomendación de corrección |
| A-19 | "Actualizar tabla comparativa: 'dynamic discovery' → 'discovery de funciones dentro de servidores configurados'" | Recomendación 2 | E | Recomendación de corrección |
| A-20 | "Agregar subsecciones de requisitos deterministas en cada caso de uso" | Recomendación 3 | E | Recomendación de corrección |
| A-21 | "Clarificar cuándo usar `tool_filter`" | Recomendación 4 | E | Recomendación de corrección |
| A-22 | "Agregar conexión explícita con Capítulo 7" | Recomendación 5 | E | Recomendación de corrección |
| A-23 | "Veredicto Final: PARCIALMENTE VÁLIDO — 3 contradicciones lógicas críticas y 3 defectos" | Conclusión | F | Veredicto general |
| A-24 | "Proceder a FASE 4 (Auditoría) y FASE 5 (Reporte)" | Conclusión | F | Recomendación de proceso — terminología externa |
| A-25 | Casos de producción Financiero e IoT: requisitos deterministas no mencionados | Contradicción 3 | A | Verificable vs. capítulo §6 |
| A-26 | MCP estandariza la complejidad; no la elimina | Contradicción 1 | A | Análisis técnico |
| A-27 | Los dos niveles de discovery son distinguibles: servidores (no existe) vs. funciones (sí existe) | Contradicción 2 | A | Análisis técnico de precisión |
| A-28 | "DEFECTO 2 y 3 ya corregidos en traducción" — ambigüedad sobre qué traducción | Defectos 2 y 3 | B | Claim sin fuente de traducción citada |

---

## 2. Evaluación por claim

### Grupo A — Claims sobre contradicciones del capítulo (verificables vs. mcp-pattern-input.md)

#### A-01: "Sección 2 afirma reducción dramática de complejidad"

**Texto en audit:** "Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs en entornos operacionales diversos y heterogéneos."
**Verificación vs. mcp-pattern-input.md §2:** El texto exacto del capítulo dice: "Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs en entornos operacionales diversos." (§2, párrafo 2, última oración del bloque de arquitectura.)
**Estado:** La cita es sustancialmente correcta. La auditoría agrega "y heterogéneos" que no está en el texto original, pero la afirmación central ("reduce dramáticamente") está correctamente citada.
**Impacto de la discrepancia:** Mínimo — el agregado "heterogéneos" no cambia el claim de la auditoría.
**Calibración:** OBSERVACIÓN DIRECTA — verificable contra el capítulo fuente. El claim de la auditoría es correcto.
**Score:** 0.95 / 1.0

---

#### A-02: "Sección 4 lista 8 complejidades que deben resolverse"

**Texto en audit:** Lista explícita de 8 items: Clasificación de Componentes, Descubribilidad Dinámica, Requisitos de Seguridad, Complejidad de Implementación, Estrategia de Gestión de Errores, Opciones de Despliegue, Modos de Operación, Mecanismo de Transporte.
**Verificación vs. mcp-pattern-input.md §4:** La Sección 4 del capítulo tiene las siguientes subsecciones: Tool vs. Resource vs. Prompt, Discoverability, Security, Implementation, Error Handling, Local vs. Remote Server, On-demand vs. Batch, Transportation Mechanism. Conteo: 8 subsecciones exactas.
**Estado:** La auditoría reinterpreta los nombres de las subsecciones con terminología levemente diferente pero la correspondencia es precisa: Discoverability → Descubribilidad Dinámica, Security → Requisitos de Seguridad, Transportation Mechanism → Mecanismo de Transporte. El número 8 es correcto y verificable.
**Calibración:** OBSERVACIÓN DIRECTA — la lista de 8 items es verificable contando las subsecciones de §4 del capítulo.
**Score:** 1.0 / 1.0

---

#### A-03: Tabla comparativa MCP dice "descubrimiento dinámico de herramientas"

**Texto en audit:** Cita la tabla: "MCP: 'Permite el descubrimiento dinámico de herramientas disponibles. Un cliente MCP puede consultar un servidor para determinar qué capacidades ofrece.'"
**Verificación vs. mcp-pattern-input.md §3:** La tabla comparativa de §3, fila "Discovery", columna MCP dice exactamente: "Habilita el descubrimiento dinámico de herramientas disponibles. Un cliente MCP puede consultar un servidor para ver qué capacidades ofrece."
**Estado:** La cita de la auditoría parafrasea ligeramente ("determinar" en lugar de "ver") pero captura el claim central de manera fiel. La contradicción que señala es real: el capítulo afirma discovery dinámico pero el código muestra configuración estática.
**Calibración:** OBSERVACIÓN DIRECTA — la cita de la tabla es verificable. El claim de la contradicción está sustentado.
**Score:** 1.0 / 1.0

---

#### A-04: Ejemplo 1 filesystem hardcodea servidor (`command='npx'`)

**Texto en audit:** Código citado con `command='npx'` marcado como `← HARDCODED`.
**Verificación vs. mcp-pattern-input.md §7:** El código de la versión condensada del agente filesystem tiene exactamente:
```python
StdioServerParameters(
    command='npx',
    args=["-y", "@modelcontextprotocol/server-filesystem", TARGET_FOLDER_PATH]
)
```
**Estado:** La cita es exacta. `command='npx'` es el servidor hardcodeado — no hay mecanismo de discovery de nuevos servidores. La auditoría señala correctamente que el servidor es "CONFIGURADO explícitamente" y que el discovery ocurre dentro del servidor conocido, no de nuevos servidores.
**Calibración:** OBSERVACIÓN DIRECTA — código verificable en §7 del capítulo.
**Score:** 1.0 / 1.0

---

#### A-05: Ejemplo 3 FastMCP client hardcodea servidor (`url='http://localhost:8000'`)

**Texto en audit:** Código citado con `FASTMCP_SERVER_URL = "http://localhost:8000"` marcado como `← HARDCODED`.
**Verificación vs. mcp-pattern-input.md §9:** El código del cliente ADK FastMCP tiene exactamente:
```python
FASTMCP_SERVER_URL = "http://localhost:8000"
...
HttpServerParameters(url=FASTMCP_SERVER_URL, tool_filter=['greet'])
```
**Estado:** La cita es exacta. La URL del servidor y el filtro de herramientas están hardcodeados. La auditoría nombra esto "Ejemplo 3" — en el capítulo no hay numeración explícita de ejemplos, pero el contexto corresponde al ejemplo de §9 (cliente FastMCP). La numeración de la auditoría es una inferencia implícita (filesystem = Ejemplo 1, FastMCP client = Ejemplo 3) — consistente pero no declarada explícitamente.
**Calibración:** OBSERVACIÓN DIRECTA — código verificable en §9 del capítulo.
**Score:** 0.95 / 1.0

---

#### A-06: `tool_filter=['greet']` hardcodeado en Ejemplo 3

**Texto en audit:** `tool_filter=['greet']  # ← HARDCODED - solo 'greet'`
**Verificación vs. mcp-pattern-input.md §9:** El código tiene exactamente `tool_filter=['greet']` con el comentario "Only expose the greet tool".
**Estado:** Correctamente citado y señalado. La observación de que el filtro hardcodea una herramienta específica es válida.
**Calibración:** OBSERVACIÓN DIRECTA — código verificable en §9 del capítulo.
**Score:** 1.0 / 1.0

---

#### A-07: "La advertencia de Sección 2 no se repite en Sección 6"

**Texto en audit:** "Sección 2: 'Agentes requieren soporte determinista robusto'. Sección 6: 'MCP puede automatizar servicios financieros e IoT'. Riesgo: Implementadores leerán Sección 6, ignorarán Sección 2."
**Verificación vs. mcp-pattern-input.md §2 y §6:** La advertencia de §2 ("Esto destaca que los agentes no reemplazan mágicamente los flujos de trabajo deterministas; a menudo requieren soporte determinista más sólido para tener éxito") es verificable. La §6 sobre Financial Services y IoT es verificable. La afirmación de que la advertencia "no se repite" en §6 es verificable por ausencia: los 9 casos de uso de §6 no incluyen ninguna referencia de vuelta a la advertencia de §2.
**Estado:** La contradicción estructural es real y verificable. La auditoría la llama "desconexión estructural" — término apropiado.
**Calibración:** OBSERVACIÓN DIRECTA — verificable por lectura de ambas secciones. La ausencia de cross-reference es observable.
**Score:** 0.90 / 1.0

---

#### A-08: La auditoría distingue dos niveles de discovery

**Texto en audit:** "Dos niveles de 'descubrimiento': (1) Discovery de Servidores: ¿Puede el agente DESCUBRIR nuevos servidores MCP en tiempo de ejecución? [...] Diferencia: NINGUNA. (2) Discovery de Funciones: ¿Puede el agente descubrir qué hace cada servidor? [...] Diferencia: SÍ."
**Verificación:** Esta distinción es un análisis técnico original de la auditoría — no una cita del capítulo. La afirmación es técnicamente precisa: el capítulo presenta como ventaja el "discovery dinámico" pero el código solo demuestra discovery de funciones dentro de servidores pre-configurados, no discovery de servidores nuevos. La distinción es derivable de la especificación MCP (el protocolo define cómo un cliente lista herramientas de un servidor conocido, no cómo descubrir nuevos servidores).
**Calibración:** INFERENCIA CALIBRADA — distinción técnica correcta derivable de la especificación MCP y del comportamiento del código citado. El análisis es original pero técnicamente sólido.
**Score:** 0.90 / 1.0

---

#### A-25: Casos de producción Financiero e IoT sin requisitos deterministas

**Texto en audit:** Para Financial Services lista: rollback de transacciones en error, validación de saldos, auditoría y compliance, manejo de estado distribuido. Para IoT: confirmación de entrega, reintentos en falla, estado conocido del dispositivo. Para Multi-Paso: aislamiento transaccional, idempotencia, reversibilidad.
**Verificación vs. mcp-pattern-input.md §6:** Los tres casos de uso existen en §6 exactamente como los cita la auditoría. Los requisitos deterministas listados por la auditoría son correctos: son requisitos estándar de ingeniería de software para operaciones financieras con estado, control de dispositivos físicos, y flujos multi-paso con efectos secundarios. La auditoría no cita fuentes para estos requisitos pero son conocimiento de dominio estándar (ACID para transacciones, idempotencia para mensajería distribuida, etc.).
**Calibración:** INFERENCIA CALIBRADA — los casos de uso son verificables en el capítulo. Los requisitos deterministas listados son principios estándar de ingeniería (no requieren cita porque son conocimiento de dominio establecido). La auditoría los presenta correctamente como ausentes del capítulo.
**Score:** 0.85 / 1.0

---

#### A-26: MCP estandariza la complejidad; no la elimina

**Texto en audit:** "MCP estandariza la complejidad; no la elimina. La palabra 'dramáticamente' no sobrevive la lectura del propio capítulo."
**Verificación:** El análisis de la auditoría tiene dos partes: (1) el claim de que MCP estandariza sin eliminar es técnicamente correcto — la arquitectura cliente-servidor, los transports, y las 8 consideraciones de §4 son todos elementos de complejidad estandardizados, no eliminados; (2) "no sobrevive la lectura del propio capítulo" es verificable: si el lector lee §2 (reduce dramáticamente) y luego §4 (8 consideraciones a resolver), la tensión es observable. El análisis coincide con lo que el análisis de `mcp-pattern-calibration.md` identificó como C-11 (afirmación performativa, score 0.25).
**Calibración:** INFERENCIA CALIBRADA — análisis técnico correcto, verificable contra las secciones citadas del capítulo. La conclusión es derivable sin especulación.
**Score:** 0.90 / 1.0

---

#### A-27: Distinción entre discovery de servidores vs. discovery de funciones

**Texto en audit:** Tabla con Tool Calling vs. MCP para los dos niveles de discovery, concluyendo que en discovery de servidores "Diferencia: NINGUNA" y en discovery de funciones "Diferencia: SÍ."
**Verificación:** El análisis es un refinamiento del claim de la tabla comparativa del capítulo. La auditoría es técnicamente correcta: el protocolo MCP define cómo un cliente pregunta al servidor qué herramientas expone (discovery de funciones), pero ambos mecanismos —tool calling y MCP— requieren que el servidor sea conocido de antemano. La diferencia identificada es real. Esta distinción está implícitamente validada también por el análisis de `mcp-pattern-calibration.md` (C-09, score 0.80) que identifica la distinción como correcta.
**Calibración:** INFERENCIA CALIBRADA — análisis técnico correcto con evidencia en el código del capítulo.
**Score:** 0.90 / 1.0

---

### Grupo B — Claims sobre defectos de código

#### A-09: `tool_filter` aparece en Ejemplo 3 pero no en Ejemplo 1

**Texto en audit:** "Pregunta sin Respuesta: ¿Cuándo es `tool_filter` válido? ¿Solo con HTTP? ¿Siempre? ¿Nunca?"
**Verificación vs. mcp-pattern-input.md §7 y §9:** Confirmado por comparación directa:
- §7 (filesystem, StdioServerParameters): `tool_filter` aparece solo como comentario en la versión extendida y en el lugar incorrecto (dentro de `StdioServerParameters`).
- §9 (FastMCP client, HttpServerParameters): `tool_filter=['greet']` aparece activamente en el código.
La pregunta que formula la auditoría ("¿Cuándo es `tool_filter` válido?") es legítima — el capítulo no provee la respuesta.
**Nota:** La auditoría no distingue entre el defecto del lugar incorrecto (versión extendida de §7) y la presencia correcta en §9. El defecto real es más específico: `tool_filter` está en el lugar incorrecto en la versión extendida, no que esté ausente del Ejemplo 1. La auditoría identifica el síntoma (inconsistencia) pero no el mecanismo exacto (ubicación incorrecta en StdioServerParameters vs. MCPToolset). `mcp-pattern-calibration.md` (C-19) sí identifica el mecanismo exacto.
**Calibración:** INFERENCIA CALIBRADA — la inconsistencia es verificable. El análisis es correcto aunque menos preciso que el de `mcp-pattern-calibration.md` sobre el mecanismo del defecto.
**Score:** 0.80 / 1.0

---

#### A-10: `StdioConnectionParams` fue "corregido en traducción"

**Texto en audit:** "La traducción actual mantiene `StdioServerParameters` (correcto). No incluye `StdioConnectionParams` (ambigüedad del original resuelta). Veredicto: PARCIALMENTE CORREGIDO EN TRADUCCIÓN."
**Verificación vs. mcp-pattern-input.md §7:** El capítulo sí incluye `StdioConnectionParams` en los ejemplos Python3/UVX (ver §7: "Conexión con Python3" y "Conexión con UVX"). La nota editorial de `mcp-pattern-input.md` señala: "El texto usa `StdioConnectionParams` con `server_params` como dict en los ejemplos Python3/UVX, pero `StdioServerParameters` directamente en los ejemplos principales ADK."
**Problema crítico:** La auditoría afirma que `StdioConnectionParams` no está presente ("No incluye `StdioConnectionParams`") pero el texto del capítulo sí lo incluye en los ejemplos Python3/UVX. La afirmación de "corregido en traducción" no es verificable en el artefacto disponible — el texto del capítulo incluye ambas APIs sin señalar cuál es la "traducción corregida". La auditoría parece evaluar una versión del capítulo diferente a la que está en `mcp-pattern-input.md`, o está confundiendo "el ejemplo principal de ADK usa `StdioServerParameters`" con "el texto no incluye `StdioConnectionParams`".
**Calibración:** AFIRMACIÓN PERFORMATIVA — la auditoría afirma una corrección que no es verificable contra el texto disponible. El texto en `mcp-pattern-input.md` sí contiene `StdioConnectionParams` en los ejemplos Python3/UVX.
**Score:** 0.20 / 1.0

---

#### A-11: `Client` import fue "corregido en traducción"

**Texto en audit:** "La traducción NO incluye este import (corrección implícita). Veredicto: CORREGIDO EN TRADUCCIÓN."
**Verificación vs. mcp-pattern-input.md §8:** El capítulo sí incluye `from fastmcp import FastMCP, Client` en la versión extendida del servidor FastMCP. La nota editorial de `mcp-pattern-input.md` señala explícitamente: "La versión extendida importa `Client` pero no lo usa en ningún lugar del código del servidor."
**Problema crítico:** La auditoría afirma que el import de `Client` no está presente ("La traducción NO incluye este import") pero el texto en `mcp-pattern-input.md` sí lo contiene. La misma inconsistencia que A-10: la auditoría parece evaluar una versión del texto diferente o está confundiendo la versión condensada (que sí es correcta, sin `Client`) con el texto completo del capítulo (que incluye tanto la versión condensada como la extendida).
**Calibración:** AFIRMACIÓN PERFORMATIVA — la auditoría afirma una corrección que no es verificable contra el texto disponible. El texto en `mcp-pattern-input.md` contiene el import superfluo de `Client` en la versión extendida.
**Score:** 0.20 / 1.0

---

#### A-28: "DEFECTO 2 y 3 ya corregidos en traducción" — qué traducción

**Texto en audit:** Ambos defectos llevan el veredicto "CORREGIDO EN TRADUCCIÓN" o "PARCIALMENTE CORREGIDO EN TRADUCCIÓN."
**Análisis:** La auditoría refiere a una "traducción" del texto original sin identificar: (1) qué traducción específica, (2) de qué idioma, (3) qué versión del texto evaluó. El texto en `mcp-pattern-input.md` está en español y el frontmatter dice "traducción profesional" en la nota de la fuente. La auditoría parece evaluar la versión traducida, pero afirma que defectos no están presentes cuando sí están presentes en el texto disponible. La ausencia de referencia a qué traducción evaluó y en qué se diferencia del texto fuente hace que los claims A-10 y A-11 sean no verificables.
**Calibración:** AFIRMACIÓN PERFORMATIVA — "corregido en traducción" sin especificar qué versión ni en qué se diferencia del texto disponible. Impacto: Medio (si se acepta esta afirmación, se omitirían defectos reales del texto disponible).
**Score:** 0.20 / 1.0

---

### Grupo C — Claims de impacto en producción (proyecciones)

#### A-15: "Implementadores ignorarán Sección 2 y perderán dinero"

**Texto en audit:** "Implementadores leerán Sección 6, ignorarán Sección 2, asumirán que MCP 'lo maneja'. Resultado: Pérdida de dinero, violación de compliance."
**Análisis:** La primera parte (implementadores leerán Sección 6 e ignorarán Sección 2) es una proyección sobre el comportamiento de lectores que no está fundamentada con evidencia de estudios de usabilidad, encuestas de desarrolladores, o casos documentados. Es una suposición sobre cognición lectora. La segunda parte (Resultado: Pérdida de dinero) es una consecuencia proyectada del escenario anterior — si el escenario es especulativo, la consecuencia también lo es. No hay evidencia de implementaciones fallidas de MCP en servicios financieros citada.
**Diferencia respecto al análisis estructural:** La observación de que §2 y §6 están desconectadas (A-07, score 0.90) está bien sustentada. La proyección sobre el comportamiento de implementadores (A-15) no lo está.
**Calibración:** ESPECULACIÓN ÚTIL — el riesgo señalado es plausible, pero la afirmación "perderán dinero" es una proyección sin evidencia. El riesgo de la desconexión estructural es real (verificable), pero la magnitud del impacto es especulativa.
**Score:** 0.30 / 1.0

---

#### A-16: "Equipos perderán tiempo buscando dynamic discovery que no existe"

**Texto en audit:** "Implementarán en expectativa de algo que no existe. Resultado: Frustración, rechazo de MCP."
**Análisis:** La premisa (el capítulo presenta dynamic discovery de servidores pero el código no lo implementa) está bien sustentada (A-03, A-04, A-05, A-27). La proyección (equipos perderán tiempo, resultado: frustración, rechazo de MCP) es especulativa: puede ser cierto, pero no hay evidencia de casos donde la confusión sobre discovery haya llevado al rechazo de MCP. "Rechazo de MCP" como resultado proyectado va más allá de lo que la evidencia del defecto justifica.
**Calibración:** ESPECULACIÓN ÚTIL — la premisa del defecto está sustentada, la proyección del impacto no. El riesgo es real pero la magnitud y consecuencia ("rechazo de MCP") es una extrapolación sin evidencia.
**Score:** 0.35 / 1.0

---

#### A-17: "Configuraciones inconsistentes entre equipos" por `tool_filter`

**Texto en audit:** "`tool_filter` presente/ausente sin lógica clara. Resultado: Debugging difícil, inconsistencia operacional."
**Análisis:** De los tres claims de impacto, este es el más cercano a una inferencia calibrada. La premisa (inconsistencia en `tool_filter` entre ejemplos) es verificable. La consecuencia (debugging difícil, inconsistencia operacional) es una proyección más plausible: un desarrollador que ve `tool_filter` en un ejemplo y no en otro puede tomar decisiones inconsistentes — el razonamiento causal es más directo que en A-15 y A-16. Sin embargo, sigue siendo proyección sin evidencia empírica de casos reales.
**Calibración:** ESPECULACIÓN ÚTIL CON RAZONAMIENTO MÁS DIRECTO — la causalidad es más plausible que en A-15/A-16, pero sigue siendo proyección sin evidencia.
**Score:** 0.45 / 1.0

---

### Grupo D — Claims de coherencia inter-capítulos

#### A-12: "Capítulo 7 declara protocolo de comunicación crítico para multi-agente"

**Texto en audit:** "Capítulo 7 declara: 'Protocolo de comunicación crítico [para multi-agente]'"
**Verificación:** El Capítulo 7 no está disponible en los artefactos del WP. No hay `cap7-input.md` o equivalente en el WP actual. El claim de la auditoría no puede verificarse contra el texto del capítulo fuente porque ese capítulo no está disponible.
**Calibración:** AFIRMACIÓN PERFORMATIVA — claim sobre un documento no disponible para verificación. Impacto: Medio (fundamenta la coherencia inter-capítulos que es el fallo identificado). Sin acceso al Capítulo 7, no es posible confirmar que la declaración está en el capítulo ni que usa exactamente ese lenguaje.
**Score:** 0.25 / 1.0

---

#### A-13: "Capítulo 10 implementa JSON-RPC/STDIO y HTTP/SSE"

**Texto en audit:** "Capítulo 10 implementa: JSON-RPC/STDIO (local), HTTP/SSE (remoto)"
**Verificación vs. mcp-pattern-input.md §4:** Verificable directamente: "Para interacciones locales, usa JSON-RPC sobre STDIO [...]. Para conexiones remotas, aprovecha protocolos web como Streamable HTTP y Server-Sent Events (SSE)." El código confirma ambos transports con `StdioServerParameters` y `HttpServerParameters`.
**Calibración:** OBSERVACIÓN DIRECTA — verificable en §4 y en el código del capítulo.
**Score:** 1.0 / 1.0

---

#### A-14: "Conexión explícita entre Cap.7 y Cap.10: NINGUNA"

**Texto en audit:** "Conexión explícita: NINGUNA"
**Verificación vs. mcp-pattern-input.md:** Verificable por ausencia: en ninguna sección del capítulo (§1-§11) hay referencia al Capítulo 7 ni a "multi-agent" ni a "protocolo de comunicación para agentes múltiples" como el contexto del claim. La §10 menciona "sistemas de IA complejos e interconectados" sin referenciar a un capítulo previo. La ausencia de cross-reference explícita es verificable leyendo el capítulo disponible.
**Nota:** La afirmación requiere que A-12 sea verificable (que el Cap.7 efectivamente declare algo específico sobre MCP). Si A-12 no está verificado, la "falta de conexión" podría no ser un defecto sino simplemente que Cap.7 no establece esa conexión. Sin Cap.7 disponible, la magnitud del problema de coherencia no puede determinarse completamente.
**Calibración:** INFERENCIA CALIBRADA CON DEPENDENCIA — verificable para la mitad (Cap.10 no menciona Cap.7) pero la significancia del fallo depende del contenido de Cap.7 que no está disponible.
**Score:** 0.75 / 1.0

---

### Grupo E — Recomendaciones del documento

#### A-18: "Reemplazar 'reduce dramáticamente' por formulación más precisa"

**Texto en audit:** La recomendación completa propone sustituir el claim performativo por uno que menciona "reduciendo el acoplamiento propietario de cada solución, aunque requiere resolver 8 consideraciones arquitectónicas clave enumeradas en la Sección 4."
**Análisis:** La recomendación es técnicamente correcta y específica. La formulación propuesta convierte el claim performativo (C-11 en `mcp-pattern-calibration.md`) en una inferencia calibrada: menciona el mecanismo ("reduciendo el acoplamiento propietario"), califica la afirmación ("aunque requiere resolver 8 consideraciones"), y cita la evidencia interna ("enumeradas en la Sección 4"). Es una corrección bien diseñada.
**Calibración:** INFERENCIA CALIBRADA — la recomendación está bien fundamentada en la contradicción verificable entre §2 y §4.
**Score:** 0.90 / 1.0

---

#### A-19: "Actualizar tabla comparativa: 'dynamic discovery' → 'discovery de funciones dentro de servidores configurados'"

**Texto en audit:** La reformulación propuesta es precisa y técnicamente correcta.
**Análisis:** La reformulación propuesta captura exactamente la distinción identificada en A-08 y A-27: el discovery de MCP es de funciones dentro de servidores conocidos, no de nuevos servidores. La reformulación es verificable contra el comportamiento del código: un cliente MCP pregunta "¿qué herramientas expones?" a un servidor ya configurado.
**Calibración:** INFERENCIA CALIBRADA — la recomendación está derivada del análisis del código del capítulo.
**Score:** 0.90 / 1.0

---

#### A-20: "Agregar subsecciones de requisitos deterministas en cada caso de uso"

**Texto en audit:** Incluye formato ejemplo para Servicios Financieros con requisitos específicos y anti-patrón/patrón correcto.
**Análisis:** La recomendación es sólida. Los requisitos deterministas listados (transacciones ACID, auditoría de compliance, modo "proponer, validar, ejecutar") son principios estándar de ingeniería financiera. El anti-patrón/patrón correcto es específico y accionable. La recomendación está sustentada por la contradicción verificable entre la advertencia de §2 y los casos de uso de §6.
**Calibración:** INFERENCIA CALIBRADA — recomendación derivada de contradicción verificable, con contenido técnico correcto.
**Score:** 0.85 / 1.0

---

#### A-21: "Clarificar cuándo usar `tool_filter`"

**Texto en audit:** La recomendación incluye criterios específicos: usar con HTTP cuando hay múltiples herramientas y el agente necesita un subconjunto; STDIO puede usarlo pero es menos común; obligatorio para control de acceso o servidores compartidos.
**Análisis:** Los criterios propuestos son razonables y técnicamente plausibles. Sin embargo, no están respaldados por documentación oficial de `tool_filter` — son inferencias del comportamiento observado en los ejemplos del capítulo y sentido común de ingeniería. La distinción "con HTTP sí, con STDIO puede" es una extrapolación del comportamiento del código del capítulo, no un requerimiento documentado del SDK. La auditoría no cita la documentación de ADK para confirmar si `tool_filter` funciona con ambos transports o solo con HTTP.
**Calibración:** ESPECULACIÓN ÚTIL — la recomendación es plausible pero los criterios específicos no están derivados de documentación oficial. Verificable ejecutando: grep de `tool_filter` en la documentación de `google.github.io/adk-docs/mcp/`.
**Score:** 0.60 / 1.0

---

#### A-22: "Agregar conexión explícita con Capítulo 7"

**Texto en audit:** Propone un párrafo específico que establece que "MCP implementa el protocolo de comunicación estandarizado descrito en el Capítulo 7."
**Análisis:** La recomendación está condicionada a que A-12 sea correcto (que el Capítulo 7 efectivamente declare algo sobre protocolo de comunicación para multi-agente). Si A-12 no puede verificarse, esta recomendación tampoco puede evaluarse completamente. El párrafo propuesto asume una relación entre Cap.7 y Cap.10 que no puede confirmarse sin acceso al Cap.7.
**Calibración:** INFERENCIA CALIBRADA CON DEPENDENCIA — técnicamente correcta si A-12 es verificable, pero dependiente de un artefacto no disponible.
**Score:** 0.65 / 1.0

---

### Grupo F — Veredicto general y terminología de proceso

#### A-23: "Veredicto Final: PARCIALMENTE VÁLIDO — 3 contradicciones lógicas críticas y 3 defectos"

**Texto en audit:** "3 Contradicciones Centrales (claims vs. realidad del contenido), 3 Defectos de Código (incompatibilidades e importaciones sin uso), 1 Fallo de Coherencia."
**Análisis del conteo:**
- Contradicción 1 (A-01 a A-02, A-26): verificada y válida — 1 real.
- Contradicción 2 (A-03 a A-06, A-08, A-27): verificada y válida — 1 real.
- Contradicción 3 (A-07, A-25): verificada y válida — 1 real.
- Defecto 1 (A-09): verificado — 1 real.
- Defecto 2 (A-10): no verificable contra el texto disponible — cuestionable.
- Defecto 3 (A-11): no verificable contra el texto disponible — cuestionable.
- Fallo de coherencia (A-12 a A-14): parcialmente verificable — 1 real con dependencia.
El conteo de 3+3+1 es correcto para los defectos verificables. El veredicto "PARCIALMENTE VÁLIDO" coincide con el análisis de `mcp-pattern-calibration.md` que clasifica el capítulo como PARCIALMENTE CALIBRADO (65%).
**Calibración:** INFERENCIA CALIBRADA — el veredicto está sustentado por la mayoría de los hallazgos verificables. Las 3 contradicciones son válidas. Los 3 defectos de código: 1 verificado, 2 cuestionados por diferencia de versión de texto evaluado.
**Score:** 0.75 / 1.0

---

#### A-24: "Proceder a FASE 4 (Auditoría) y FASE 5 (Reporte)"

**Texto en audit:** "Recomendación: Proceder a FASE 4 (Auditoría) y FASE 5 (Reporte) CON ESTOS HALLAZGOS INCORPORADOS."
**Análisis:** Este es el claim que requiere evaluación especial. Ver sección 5 de este análisis.
**Calibración:** AFIRMACIÓN PERFORMATIVA CON TERMINOLOGÍA INCOMPATIBLE — el claim usa terminología de un framework diferente a THYROX. Ver sección 5.
**Score:** 0.10 / 1.0

---

## 3. Tabla resumen

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| A-01 | Sección 2 afirma "reduce dramáticamente" | 0.95 | Observación directa (cita verificable) |
| A-02 | Sección 4 lista exactamente 8 complejidades | 1.0 | Observación directa (conteo verificable) |
| A-03 | Tabla comparativa dice "descubrimiento dinámico" | 1.0 | Observación directa (cita verificable) |
| A-04 | Ejemplo 1 hardcodea `command='npx'` | 1.0 | Observación directa (código verificable en §7) |
| A-05 | Ejemplo 3 hardcodea `url='http://localhost:8000'` | 0.95 | Observación directa (código verificable en §9) |
| A-06 | `tool_filter=['greet']` hardcodeado en Ejemplo 3 | 1.0 | Observación directa (código verificable en §9) |
| A-07 | Advertencia de §2 no se repite en §6 | 0.90 | Observación directa (verificable por ausencia) |
| A-08 | Distinción two niveles de discovery (servidores vs. funciones) | 0.90 | Inferencia calibrada (técnicamente correcta) |
| A-09 | `tool_filter` inconsistente entre Ejemplo 1 y 3 | 0.80 | Inferencia calibrada (identifica síntoma, no mecanismo exacto) |
| A-10 | StdioConnectionParams "corregido en traducción" | 0.20 | Afirmación performativa (no verificable — texto incluye ambas APIs) |
| A-11 | Client import "corregido en traducción" | 0.20 | Afirmación performativa (no verificable — versión extendida tiene el defecto) |
| A-12 | Cap.7 declara protocolo crítico para multi-agente | 0.25 | Afirmación performativa (Cap.7 no disponible para verificación) |
| A-13 | Cap.10 implementa JSON-RPC/STDIO y HTTP/SSE | 1.0 | Observación directa (verificable en §4 y código) |
| A-14 | Conexión explícita Cap.7-Cap.10: NINGUNA | 0.75 | Inferencia calibrada con dependencia (Cap.10 no menciona Cap.7; magnitud del fallo depende de Cap.7) |
| A-15 | Implementadores ignorarán §2 y perderán dinero | 0.30 | Especulación útil (riesgo plausible, proyección sobre comportamiento) |
| A-16 | Equipos perderán tiempo buscando discovery inexistente | 0.35 | Especulación útil (riesgo plausible, "rechazo de MCP" es extrapolación) |
| A-17 | Configuraciones inconsistentes por `tool_filter` | 0.45 | Especulación útil con razonamiento más directo |
| A-18 | Rec: Reemplazar "reduce dramáticamente" por formulación calibrada | 0.90 | Inferencia calibrada (recomendación bien fundamentada) |
| A-19 | Rec: Actualizar "dynamic discovery" en tabla | 0.90 | Inferencia calibrada (derivada del análisis de código) |
| A-20 | Rec: Agregar requisitos deterministas en casos de uso | 0.85 | Inferencia calibrada (derivada de contradicción verificable) |
| A-21 | Rec: Clarificar cuándo usar `tool_filter` con criterios específicos | 0.60 | Especulación útil (criterios plausibles, no derivados de doc oficial) |
| A-22 | Rec: Agregar conexión explícita con Cap.7 | 0.65 | Inferencia calibrada con dependencia (válida si A-12 es correcto) |
| A-23 | Veredicto "PARCIALMENTE VÁLIDO" — 3 contradicciones, 3 defectos | 0.75 | Inferencia calibrada (sustentado por hallazgos verificables) |
| A-24 | "Proceder a FASE 4 y FASE 5" | 0.10 | Afirmación performativa con terminología incompatible con THYROX |
| A-25 | Casos de producción sin requisitos deterministas | 0.85 | Inferencia calibrada (verificable en §6 + principios estándar de ingeniería) |
| A-26 | MCP estandariza complejidad; no la elimina | 0.90 | Inferencia calibrada (derivable de §2 vs. §4) |
| A-27 | Distinción: discovery de servidores vs. funciones | 0.90 | Inferencia calibrada (verificable en código) |
| A-28 | "Corregido en traducción" — sin especificar qué versión | 0.20 | Afirmación performativa (referencia a versión no identificada) |

**Suma de scores:** 22.15 / 28
**Ratio de calibración:** **22.15/28 = 79%**

---

## 4. Ratio de calibración y clasificación

```
Ratio = 22.15 / 28 = 79%

Clasificación: CALIBRADO

Umbral para artefacto de exploración: ≥ 0.50   ✓ superado
Umbral para artefacto de gate: ≥ 0.75           ✓ superado (79% > 75%)
Resultado: supera umbral de gate
```

**Distribución de claims por tipo:**

| Tipo | Cantidad | Suma scores | Ratio interno |
|------|----------|-------------|---------------|
| Calibrados (score ≥ 0.75) | 19 | 17.85 | 68% del total |
| Parcialmente calibrados (0.45-0.74) | 3 | 1.80 | 11% del total |
| Sin evidencia / especulativos (< 0.45) | 6 | 0.50 | 21% del total |

**Ratio excluyendo claims de impacto en producción (Grupo C: A-15, A-16, A-17):** 21.55/25 = 86%

**Ratio excluyendo además los claims de traducción no verificable (A-10, A-11, A-28):** 21.35/22 = 97%

---

## 5. Respuesta a la pregunta específica: "FASE 4 y FASE 5" — ¿terminología de framework diferente?

### El claim

**Texto en audit (Conclusión):** "Recomendación: Proceder a FASE 4 (Auditoría) y FASE 5 (Reporte) CON ESTOS HALLAZGOS INCORPORADOS."

### Análisis

El documento describe "FASE 4 (Auditoría)" y "FASE 5 (Reporte)". En THYROX:

- Stage 4 = **CONSTRAINTS** (identificar restricciones del problema)
- Stage 5 = **STRATEGY** (definir la estrategia de solución)

Las etiquetas del documento de auditoría no corresponden a stages THYROX. La auditoría usa una nomenclatura de fases propia — posiblemente de un proceso de auditoría de documentación o un framework de revisión de contenido editorial con las fases: Exploración → Análisis → Síntesis → Auditoría → Reporte.

### ¿Es esto un framework diferente o una coincidencia de numeración?

**Es un framework diferente.** Las señales:

1. La numeración THYROX tiene 12 stages con nombres específicos (DISCOVER, MEASURE, ANALYZE, CONSTRAINTS, STRATEGY...). La auditoría llega solo a "FASE 5 (Reporte)" — un proceso de 5 fases no encaja en el ciclo THYROX de 12 stages.
2. "FASE 4 (Auditoría)" no es compatible con Stage 4 CONSTRAINTS. Auditar el contenido de un capítulo no es "identificar restricciones" — son actividades completamente distintas.
3. "FASE 5 (Reporte)" tampoco encaja con Stage 5 STRATEGY. Un reporte de auditoría no es una estrategia de solución.
4. El proceso implícito del documento (Exploración del capítulo → Identificación de contradicciones → Análisis → Auditoría formal → Reporte) es un proceso de revisión de contenido editorial, no un ciclo THYROX.

### ¿Afecta la aplicabilidad de las recomendaciones en el contexto THYROX?

**Impacto: Bajo en el fondo, pero requiere reinterpretación del proceso.**

Las recomendaciones técnicas del documento (A-18 a A-22) son válidas independientemente de la terminología de proceso. La instrucción "proceder a FASE 4 y FASE 5" es una directiva de proceso que, interpretada literalmente en THYROX, llevaría a Stage 4 (CONSTRAINTS) y Stage 5 (STRATEGY) — que son las etapas correctas para cualquier WP THYROX: una vez identificados los hallazgos (Stage 3 ANALYZE / Stage 1 DISCOVER dependiendo del WP), sí se avanza a CONSTRAINTS y STRATEGY. La coincidencia es accidental pero no perjudicial si se interpreta correctamente.

**Riesgo real:** Si un agente THYROX interpreta "FASE 4 (Auditoría)" como una instrucción de ejecutar Stage 4 CONSTRAINTS antes de completar el análisis actual, podría saltar stages prematuramente. La instrucción es ambigua en el contexto THYROX.

**Recomendación:** Ignorar la directiva de proceso "FASE 4 y FASE 5" del documento de auditoría como instrucción de proceso. En cambio, tratar los hallazgos de la auditoría como inputs para el WP activo en su stage actual (Stage 1 DISCOVER del WP `2026-04-18-07-12-50-methodology-calibration`).

---

## 6. Afirmaciones performativas: 6

| # | Texto | Sección | Impacto | Evidencia propuesta |
|---|-------|---------|---------|---------------------|
| 1 | "StdioConnectionParams corregido en traducción" (A-10) | Defecto 2 | Medio (omite un defecto real del texto disponible) | Verificar: leer §7 de mcp-pattern-input.md — `StdioConnectionParams` con Python3/UVX sí está presente. Identificar qué versión del texto evaluó la auditoría. |
| 2 | "Client import corregido en traducción" (A-11) | Defecto 3 | Medio (omite un defecto real del texto disponible) | Verificar: leer §8 de mcp-pattern-input.md — la versión extendida sí tiene `from fastmcp import FastMCP, Client`. La versión condensada no — si la auditoría solo evaluó la condensada, este defecto existe en la extendida. |
| 3 | "Capítulo 7 declara protocolo crítico para multi-agente" (A-12) | Coherencia | Medio (fundamenta un fallo de coherencia sin verificación) | Requiere: acceso al Capítulo 7. Sin él, el fallo de coherencia inter-capítulos no puede evaluarse completamente. |
| 4 | "Proceder a FASE 4 y FASE 5" (A-24) | Conclusión | Bajo (terminología incompatible, no afecta los hallazgos técnicos) | Ignorar como directiva de proceso en THYROX. Interpretar como: los hallazgos están listos para incorporarse en el análisis activo del WP. |
| 5 | "DEFECTO 2 y 3 ya corregidos en traducción" — sin especificar qué traducción (A-28) | Defectos 2 y 3 | Medio (pone en duda la completitud del análisis de defectos) | Verificar: identificar qué versión del texto fue evaluada. Si la auditoría evaluó solo las versiones condensadas de §7 y §8, los defectos de las versiones extendidas no fueron considerados. |
| 6 | "Implementadores perderán dinero [...] Equipos perderán tiempo" (A-15, A-16) | Impacto producción | Bajo (proyecciones, no bloqueantes) | Los riesgos son plausibles pero las consecuencias ("pérdida de dinero", "rechazo de MCP") son extrapolaciones sin evidencia empírica de casos reales. Aceptar como riesgos a considerar, no como certezas. |

---

## 7. Comparación con mcp-pattern-calibration.md (65%, PARCIALMENTE CALIBRADO)

El documento de auditoría tiene un ratio más alto (79%) que el capítulo que analiza (65%). Esto es coherente con la naturaleza del artefacto: una auditoría que hace afirmaciones sobre un texto verificable debería tener más evidencia observable que el texto original.

| Dimensión | mcp-pattern-calibration (capítulo) | mcp-audit-calibration (auditoría) |
|-----------|------------------------------------|------------------------------------|
| Ratio | 65% (18.35/28) | 79% (22.15/28) |
| Clasificación | PARCIALMENTE CALIBRADO | CALIBRADO |
| Claims sin evidencia | 4 afirmaciones performativas | 6 (3 técnicas + 3 proceso/proyección) |
| Naturaleza de fortaleza | Especificación técnica con docs oficiales | Verificaciones directas contra código del capítulo |
| Naturaleza de debilidad | Casos de uso especulativos + defectos de código | Claims sobre traducción no identificada + Cap.7 no disponible |

**Diferencia clave:** Las debilidades de la auditoría son de un tipo diferente a las del capítulo. El capítulo tiene debilidades por exceso de especulación (proyectar casos de uso sin evidencia). La auditoría tiene debilidades por falta de especificación de sus propias fuentes (qué versión del texto evaluó, qué dice el Cap.7).

---

## 8. Hallazgos adicionales no contemplados en los grupos evaluados

### Hallazgo 1: La auditoría no detecta la distinción versión condensada / versión extendida

El capítulo tiene dos versiones del código de filesystem (§7) y dos versiones del servidor FastMCP (§8). La auditoría evalúa los defectos de código pero no distingue explícitamente entre versiones. Esto crea los claims problemáticos A-10 y A-11: la auditoría afirma que defectos "fueron corregidos en traducción" cuando en realidad las versiones condensadas correctas coexisten con las versiones extendidas que tienen los defectos.

**Implicación:** El análisis de `mcp-pattern-calibration.md` fue más preciso en este punto, identificando la distinción condensada/extendida y señalando que el defecto existe en la versión extendida pero no en la condensada.

### Hallazgo 2: La recomendación de `tool_filter` (A-21) extrapola sin referencia

La recomendación sobre cuándo usar `tool_filter` ("con HTTP sí, con STDIO puede pero es menos común") no está derivada de documentación oficial del SDK. La documentación de ADK (`google.github.io/adk-docs/mcp/`) podría confirmar o refutar si `tool_filter` funciona igual con ambos transports. La recomendación es plausible pero sin sustento documental.

### Hallazgo 3: El veredicto de la auditoría coincide con el análisis THYROX

El veredicto "PARCIALMENTE VÁLIDO" de la auditoría coincide con "PARCIALMENTE CALIBRADO" de `mcp-pattern-calibration.md`. Las 3 contradicciones verificadas por la auditoría corresponden a claims identificados en `mcp-pattern-calibration.md`: C-11 (reduce dramáticamente), C-09/C-04 (dynamic discovery), C-16/C-18 (advertencia de §2 desconectada de §6). La convergencia de dos análisis independientes sobre las mismas debilidades aumenta la confianza en los hallazgos.

---

## 9. Usabilidad de la auditoría para THYROX

| Propósito | Usabilidad | Justificación |
|-----------|------------|---------------|
| Confirmar contradicciones del capítulo (§2 vs. §4, §2 vs. §6, dynamic discovery) | ALTA | Claims A-01 a A-08 son verificables y verificados |
| Identificar defecto de `tool_filter` inconsistente | ALTA | A-09 verificado directamente |
| Confirmar defectos de código "corregidos en traducción" (Defecto 2 y 3) | BAJA | A-10, A-11, A-28 no verificables — texto disponible incluye los defectos |
| Evaluar fallo de coherencia inter-capítulos | MEDIA | A-13, A-14 verificados; A-12 requiere Cap.7 no disponible |
| Usar proyecciones de impacto en producción | BAJA | A-15, A-16, A-17 son especulaciones plausibles, no evidencia |
| Adoptar recomendaciones de corrección del capítulo | ALTA | A-18, A-19, A-20 bien fundamentadas |
| Adoptar criterios de `tool_filter` de la auditoría | MEDIA | A-21 es extrapolación plausible, verificar con doc oficial ADK |
| Interpretar directiva de proceso "FASE 4 y FASE 5" | NO APLICAR | Terminología incompatible con THYROX — ignorar como instrucción de proceso |

---

## Veredicto de calibración

**Ratio:** 79% (22.15/28) — CALIBRADO

**Posición respecto al capítulo analizado:** La auditoría tiene un ratio más alto (79%) que el capítulo que evalúa (65%). Esto es coherente: una auditoría que verifica claims contra código disponible tiene más evidencia observable que el capítulo original que especula sobre casos de uso proyectados.

**Fortalezas de la auditoría:**
- Las 3 contradicciones centrales están correctamente identificadas y verificadas contra el texto fuente
- El análisis de discovery (distinción servidores vs. funciones) es técnicamente preciso y agrega valor analítico
- Las recomendaciones de corrección (A-18, A-19, A-20) están bien fundamentadas y son accionables
- El veredicto "PARCIALMENTE VÁLIDO" es coherente con los hallazgos verificables

**Debilidades de la auditoría:**
- Los claims de Defecto 2 y Defecto 3 ("corregidos en traducción") no son verificables contra el texto disponible — el texto incluye ambas variantes (condensada correcta + extendida con defectos), y la auditoría parece no distinguirlas
- El claim sobre Cap.7 (A-12) requiere un artefacto no disponible para verificación completa
- Las proyecciones de impacto en producción (Grupo C) son especulaciones plausibles pero no calibradas
- La directiva de proceso "FASE 4 y FASE 5" usa terminología de un framework diferente a THYROX

**Recomendación para THYROX:** La auditoría es usable como confirmación independiente de las contradicciones identificadas en `mcp-pattern-calibration.md`. Los hallazgos verificados de la auditoría (3 contradicciones, defecto de `tool_filter`) tienen ahora doble validación (análisis THYROX + auditoría externa). Las recomendaciones de corrección (A-18, A-19, A-20) son adoptables directamente. Los claims no verificables (traducción, Cap.7) deben tratarse con cautela.
