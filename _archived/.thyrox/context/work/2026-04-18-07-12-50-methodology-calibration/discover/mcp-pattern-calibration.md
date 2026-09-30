```yml
created_at: 2026-04-19 06:35:18
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: agentic-reasoning
topic: Capítulo 10 — Model Context Protocol (MCP)
ratio_calibracion: "18.35/28 = 65%"
clasificacion: PARCIALMENTE CALIBRADO
```

# Análisis de Calibración: Capítulo 10 — Model Context Protocol (MCP)

> Protocolo: Modo 1 — Detección de realismo performativo.
> Capítulo 10 del libro agentic design patterns. Input: `mcp-pattern-input.md`.
> Referencia de ratios anteriores: Cap. 8 Memoria (42%, REALISMO PERFORMATIVO), Cap. 9 Aprendizaje (77%, CALIBRADO).

---

## 1. Inventario de claims evaluados

| ID | Claim | Sección | Grupo | Tipo |
|----|-------|---------|-------|------|
| C-01 | MCP opera en arquitectura cliente-servidor | §2 | A | Técnico — protocolo |
| C-02 | MCP usa JSON-RPC sobre STDIO para comunicación local | §4 | A | Técnico — protocolo |
| C-03 | MCP usa Streamable HTTP y SSE para conexiones remotas | §4 | A | Técnico — protocolo |
| C-04 | MCP Client puede consultar dinámicamente un servidor para descubrir capacidades | §4, §5 | A | Técnico — protocolo |
| C-05 | Tool = función ejecutable, Resource = datos estáticos, Prompt = template | §4 | A | Técnico — protocolo |
| C-06 | FastMCP genera esquemas automáticamente desde type hints y docstrings | §8 | A | Técnico — framework |
| C-07 | Tool function calling es propietario y varía entre proveedores | §3 | B | Comparativo |
| C-08 | MCP es "open standard" que promueve interoperabilidad | §2, §3 | B | Comparativo |
| C-09 | MCP permite discovery dinámico; tool function calling requiere configuración explícita | §3 | B | Comparativo |
| C-10 | MCP fomenta servidores reutilizables; tool function calling está acoplado a la aplicación | §3 | B | Comparativo |
| C-11 | "Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs" | §2 | B | Comparativo cuantitativo |
| C-12 | IoT Device Control: "un agente podría usar MCP para enviar comandos a dispositivos IoT" | §6 | C | Caso de uso |
| C-13 | Financial Services: "ejecutar operaciones, generar asesoramiento financiero personalizado" | §6 | C | Caso de uso |
| C-14 | Reasoning-Based Information Extraction "supera sistemas convencionales de búsqueda" | §6 | C | Caso de uso cuantitativo |
| C-15 | "MCP dramáticamente reduce la complejidad de integrar LLMs en entornos operacionales diversos" | §10 | C | Afirmación de impacto |
| C-16 | "Agentes no reemplazan mágicamente flujos de trabajo deterministas" | §2 | D | Advertencia honesta |
| C-17 | "Los desarrolladores deben considerar la naturaleza de los datos que se intercambian" | §2 | D | Advertencia honesta |
| C-18 | "MCP es un contrato — su efectividad depende del diseño de las APIs subyacentes" | §2 | D | Advertencia honesta |
| C-19 | `tool_filter` dentro de `StdioServerParameters` donde no corresponde | §7 | E | Defecto de código |
| C-20 | `Client` importado pero nunca usado | §8 | E | Defecto de código |
| C-21 | Inconsistencia `StdioConnectionParams` (dict) vs `StdioServerParameters` (constructor) | §7 | E | Defecto de código |
| C-22 | Código de agente ADK con `MCPToolset` y `StdioServerParameters` es correcto (versión condensada) | §7 | E | Arquitectónico |
| C-23 | Flujo de interacción Discovery → Request Formulation → Client Communication → Server Execution → Response | §5 | A | Técnico — protocolo |
| C-24 | "La API de un sistema de tickets que solo permite recuperar detalles uno por uno será lenta e inexacta" (ejemplo concreto) | §2 | D | Advertencia con ejemplo |
| C-25 | Database Integration mediante MCP Toolbox for Databases para BigQuery | §6 | C | Caso de uso con herramienta citada |
| C-26 | Generative Media Orchestration vía MCP Tools for Genmedia Services (Imagen, Veo, Chirp 3 HD, Lyria) | §6 | C | Caso de uso con referencia oficial |
| C-27 | "FastMCP simplifica el desarrollo particularmente para herramientas implementadas en Python" (Key Takeaways) | §11 | A | Técnico — framework |
| C-28 | Advertencia de seguridad: "debe incluir autenticación y autorización para controlar qué clientes pueden acceder" | §4 | D | Advertencia honesta |

---

## 2. Evaluación por claim

### C-01: MCP opera en arquitectura cliente-servidor

**Texto exacto:** "MCP opera en una arquitectura cliente-servidor. Define cómo diferentes elementos — datos (denominados recursos), plantillas interactivas (que son esencialmente prompts) y funciones accionables (conocidas como herramientas) — son expuestos por un servidor MCP. Estos son consumidos por un cliente MCP." (§2)
**Tipo de claim:** Técnico — descripción de la arquitectura del protocolo.
**Evidencia presente:** La documentación oficial de MCP está listada explícitamente: `https://modelcontextprotocol.io`. El claim describe la arquitectura fundamental del protocolo.
**Análisis:** La arquitectura cliente-servidor de MCP está documentada en la especificación oficial del protocolo (modelcontextprotocol.io). Anthropic publicó MCP como protocolo abierto en noviembre 2023. El claim es verificable contra la documentación oficial referenciada.
**Calibración:** INFERENCIA CALIBRADA — derivado de documentación oficial citada en el capítulo (Referencias, §). La URL es verificable.
**Score:** 0.90 / 1.0

---

### C-02: MCP usa JSON-RPC sobre STDIO para comunicación local

**Texto exacto:** "Para interacciones locales, usa JSON-RPC sobre STDIO (entrada/salida estándar) para comunicación eficiente entre procesos." (§4)
**Tipo de claim:** Técnico específico sobre el mecanismo de transporte.
**Evidencia presente:** Documentación oficial MCP (`modelcontextprotocol.io`) citada. El código de §7 implementa exactamente esto: `StdioServerParameters(command='npx', args=[...])` — el mecanismo STDIO está instanciado en el código.
**Análisis:** El claim tiene doble respaldo: la documentación oficial citada Y el código funcional que usa `StdioServerParameters` como wrapper del transporte STDIO. El código confirma el claim de manera observable.
**Calibración:** OBSERVACIÓN DIRECTA — el mecanismo está tanto documentado (URL oficial) como implementado en el código del capítulo (§7).
**Score:** 1.0 / 1.0

---

### C-03: MCP usa Streamable HTTP y SSE para conexiones remotas

**Texto exacto:** "Para conexiones remotas, aprovecha protocolos web como Streamable HTTP y Server-Sent Events (SSE) para habilitar comunicación cliente-servidor persistente y eficiente." (§4)
**Tipo de claim:** Técnico sobre capas de transporte remotas.
**Evidencia presente:** Documentación oficial MCP (`modelcontextprotocol.io`) citada. El código de §9 implementa exactamente esto: `HttpServerParameters(url=FASTMCP_SERVER_URL)` como wrapper del transporte HTTP, y el servidor FastMCP se inicia con `transport="http"`.
**Análisis:** Respaldo doble: documentación oficial + código funcional de §8-§9 que implementa el transporte HTTP. El servidor FastMCP en §8 usa `mcp_server.run(transport="http", host="127.0.0.1", port=8000)` y el cliente en §9 usa `HttpServerParameters`. Coherencia código/documentación completa para el transporte remoto.
**Calibración:** OBSERVACIÓN DIRECTA — tanto documentado en la fuente oficial como demostrado en código ejecutable del capítulo.
**Score:** 1.0 / 1.0

---

### C-04: MCP Client puede consultar dinámicamente un servidor para descubrir capacidades

**Texto exacto:** "Una ventaja clave de MCP es que un cliente MCP puede consultar dinámicamente un servidor para conocer qué herramientas y recursos ofrece. Este mecanismo de descubrimiento 'justo-a-tiempo' es poderoso para agentes que necesitan adaptarse a nuevas capacidades sin ser redesplegados." (§4)
**Tipo de claim:** Técnico — capacidad de discovery del protocolo.
**Evidencia presente:** Documentación oficial MCP citada. El flujo de interacción de §5 describe el paso 1 como "Discovery: El Cliente MCP, en nombre del LLM, consulta un Servidor MCP para preguntar qué capacidades ofrece. El servidor responde con un manifiesto que lista sus herramientas disponibles."
**Análisis:** El claim del discovery dinámico está articulado en la especificación del protocolo (URL citada) y desarrollado en el flujo de §5. La característica de discovery es una de las propiedades definitivas de MCP que lo diferencia del tool function calling. Es verificable contra la documentación oficial.
**Calibración:** INFERENCIA CALIBRADA — derivado de documentación oficial + descripción del flujo de protocolo coherente.
**Score:** 0.85 / 1.0

---

### C-05: Tool = función ejecutable, Resource = datos estáticos, Prompt = template

**Texto exacto:** "Un recurso es datos estáticos (ej., un archivo PDF, un registro de base de datos). Una herramienta es una función ejecutable que realiza una acción (ej., enviar un correo electrónico, consultar una API). Un prompt es una plantilla que guía al LLM sobre cómo interactuar con un recurso o herramienta." (§4)
**Tipo de claim:** Técnico — taxonomía de componentes del protocolo.
**Evidencia presente:** Documentación oficial MCP (`modelcontextprotocol.io`) citada. Las tres categorías son parte de la especificación oficial del protocolo.
**Análisis:** La taxonomía Tool / Resource / Prompt es parte de la especificación pública de MCP — no es una clasificación del capítulo sino la nomenclatura del protocolo mismo, verificable en `modelcontextprotocol.io`. El código de §7 implementa un `tool` (función `greet` decorada con `@mcp_server.tool`), confirmando la distinción operacional.
**Calibración:** OBSERVACIÓN DIRECTA — la taxonomía es parte de la especificación oficial citada. La distinción Tool es además demostrada en código.
**Score:** 0.90 / 1.0

---

### C-06: FastMCP genera esquemas automáticamente desde type hints y docstrings

**Texto exacto:** "Una ventaja significativa es su generación automática de esquemas, que interpreta inteligentemente las firmas de funciones Python, type hints y cadenas de documentación para construir las especificaciones de interfaz de modelo de IA necesarias." (§8)
**Tipo de claim:** Técnico — capacidad del framework FastMCP.
**Evidencia presente:** GitHub de FastMCP (`https://github.com/jlowin/fastmcp`) citado. El código de §8 demonstra exactamente esto: la función `greet(name: str) -> str` con docstring completo está decorada con `@mcp_server.tool` y FastMCP infiere el esquema de los type hints y el docstring.
**Análisis:** La generación automática de esquemas está demostrada en el código del capítulo: el `@mcp_server.tool` decorator y los type hints de `greet` son el mecanismo. La documentación de FastMCP en GitHub confirma esta capacidad como característica central del framework. Respaldo código + referencia oficial.
**Calibración:** OBSERVACIÓN DIRECTA — el mecanismo está implementado en el código del capítulo y respaldado por la referencia oficial de FastMCP.
**Score:** 1.0 / 1.0

---

### C-07: Tool function calling es propietario y varía entre proveedores

**Texto exacto:** "Este proceso es a menudo propietario y varía entre diferentes proveedores de LLM." (§3)
**Tipo de claim:** Comparativo — describe una limitación del tool function calling respecto a MCP.
**Evidencia presente:** Ninguna fuente citada para este claim específico.
**Análisis:** El claim es técnicamente correcto y verificable observacionalmente: OpenAI, Anthropic, Google y Cohere tienen formatos diferentes para tool calling (JSON schemas con diferentes estructuras, diferentes nombres de parámetros, diferentes convenciones de invocación). Es un hecho empíricamente observable comparando la documentación de cada proveedor — no requiere paper. Sin embargo, el calificador "a menudo" es el correcto (no todos los aspectos son propietarios — la estructura de JSON Schema que OpenAI usa fue adoptada por muchos proveedores).
**Calibración:** INFERENCIA CALIBRADA — el claim es observable comparando documentaciones de proveedores, el calificador "a menudo" es epistémicamente honesto. No requiere cita porque es conocimiento de dominio verificable.
**Score:** 0.75 / 1.0

---

### C-08: MCP es "open standard" que promueve interoperabilidad

**Texto exacto:** "Es un estándar abierto diseñado para estandarizar cómo los LLMs como Gemini, los modelos GPT de OpenAI, Mixtral y Claude se comunican con aplicaciones externas." (§2)
**Tipo de claim:** Comparativo — caracteriza a MCP como open standard.
**Evidencia presente:** La especificación MCP está publicada en `modelcontextprotocol.io` bajo licencia MIT. Los cuatro LLMs mencionados (Gemini, GPT, Mixtral, Claude) existen y son de proveedores distintos — el claim de multi-proveedor es observable.
**Análisis:** MCP fue publicado por Anthropic en noviembre 2023 como especificación abierta (no propietaria). La adopción por múltiples proveedores (incluyendo los mencionados en el texto) es verificable. El claim de "open standard" es factualmente correcto — la especificación es pública y el código de referencia es open source.
**Calibración:** OBSERVACIÓN DIRECTA — verificable en `modelcontextprotocol.io` (licencia MIT, especificación pública).
**Score:** 1.0 / 1.0

---

### C-09: MCP permite discovery dinámico; tool function calling requiere configuración explícita

**Texto exacto:** "Discovery: El LLM es informado explícitamente qué herramientas están disponibles dentro del contexto de una conversación específica [tool calling]. Habilita el descubrimiento dinámico de herramientas disponibles. Un cliente MCP puede consultar un servidor para ver qué capacidades ofrece. [MCP]" (§3, tabla comparativa)
**Tipo de claim:** Comparativo técnico — diferencia entre los dos mecanismos en discovery.
**Evidencia presente:** La tabla comparativa es una articulación del capítulo. El discovery dinámico de MCP está en la especificación oficial (`modelcontextprotocol.io`). El comportamiento de tool calling (herramientas definidas explícitamente en el request) es documentación estándar de cualquier proveedor.
**Análisis:** La distinción es técnicamente correcta: el tool calling requiere que el llamante defina las herramientas disponibles en cada llamada de API; MCP define un protocolo de discovery donde el cliente puede preguntar al servidor qué ofrece. Ambos comportamientos son verificables contra las documentaciones respectivas.
**Calibración:** INFERENCIA CALIBRADA — distinción técnica correcta derivable de documentaciones oficiales de ambos mecanismos.
**Score:** 0.80 / 1.0

---

### C-10: MCP fomenta servidores reutilizables; tool function calling está acoplado a la aplicación

**Texto exacto:** "Las integraciones de herramientas a menudo están estrechamente acopladas con la aplicación y el LLM específico siendo usado. [tool calling]. Promueve el desarrollo de 'servidores MCP' reutilizables y autónomos que pueden ser accedidos por cualquier aplicación compatible. [MCP]" (§3, tabla comparativa)
**Tipo de claim:** Comparativo arquitectónico.
**Evidencia presente:** El capítulo cita MCP Toolbox for Databases y MCP Tools for Genmedia Services como ejemplos concretos de servidores reutilizables. Las referencias oficiales para ambos están en la tabla de referencias.
**Análisis:** La reutilización de servidores MCP está ilustrada en el capítulo con ejemplos concretos: MCP Toolbox for Databases (verificable en `google.github.io/adk-docs/mcp/databases/`) puede ser accedido por cualquier agente compatible. El acoplamiento del tool calling es observable en la práctica (las implementaciones de herramientas suelen incluir dependencias del SDK del proveedor). El calificador "a menudo" para el acoplamiento es epistémicamente apropiado.
**Calibración:** INFERENCIA CALIBRADA — la reutilización de servidores MCP está ilustrada con ejemplos concretos y referencias verificables. El claim sobre acoplamiento del tool calling usa el calificador correcto.
**Score:** 0.80 / 1.0

---

### C-11: "Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs"

**Texto exacto:** "Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs en entornos operacionales diversos." (§2)
**Tipo de claim:** Comparativo cuantitativo con adverbio de intensidad — "dramáticamente".
**Evidencia presente:** Ninguna evidencia empírica citada para "dramáticamente". El capítulo proporciona el argumento cualitativo pero no datos de reducción de complejidad medibles.
**Análisis:** "Dramáticamente" es un adverbio de intensidad sin criterio observable. ¿Comparado con qué baseline? ¿Medido cómo? La reducción de complejidad es plausible como argumento (un solo protocolo vs. N integraciones propietarias), pero "dramáticamente" implica una magnitud que no está derivada de ninguna evidencia empírica en el capítulo. Es el mismo tipo de afirmación que "completamente elimina" o "resuelve definitivamente" — intensificadores sin medición.
**Calibración:** AFIRMACIÓN PERFORMATIVA — el claim direccional (MCP reduce complejidad) es plausible, pero "dramáticamente" no tiene evidencia que lo sustente. Impacto: Medio (influye en decisión de adoptar MCP, pero el argumento cualitativo es suficiente sin el intensificador).
**Score:** 0.25 / 1.0

---

### C-12: IoT Device Control: "un agente podría usar MCP para enviar comandos a dispositivos IoT"

**Texto exacto:** "MCP puede facilitar la interacción de LLM con dispositivos del Internet de las Cosas (IoT). Un agente podría usar MCP para enviar comandos a electrodomésticos inteligentes, sensores industriales o robótica, habilitando el control por lenguaje natural y la automatización de sistemas físicos." (§6)
**Tipo de claim:** Caso de uso — aplicación futura especulativa.
**Evidencia presente:** Ninguna implementación de referencia citada. El capítulo usa "podría usar" (conditional) — el texto reconoce implícitamente que es proyección.
**Análisis:** El claim es especulativo sobre una aplicación futura. No hay implementación citada, no hay caso de uso en producción referenciado. El condicional "podría" es honesto pero insuficiente para convertir el claim en evidencia. La plausibilidad técnica es alta (MCP puede exponer cualquier función, incluyendo llamadas a APIs de IoT), pero el claim de que esto "puede facilitar" el control de IoT es una extensión del protocolo que el capítulo no demuestra.
**Calibración:** ESPECULACIÓN ÚTIL (explícitamente condicional) — el condicional "podría" lo califica como hipótesis, no como hecho. Es proyección razonable pero sin evidencia.
**Score:** 0.30 / 1.0

---

### C-13: Financial Services: "ejecutar operaciones, generar asesoramiento financiero personalizado"

**Texto exacto:** "En servicios financieros, MCP podría permitir a los LLMs interactuar con varias fuentes de datos financieros, plataformas de negociación o sistemas de cumplimiento. Un agente podría analizar datos de mercado, ejecutar operaciones, generar asesoramiento financiero personalizado o automatizar informes regulatorios." (§6)
**Tipo de claim:** Caso de uso — aplicación futura especulativa, con contenido de alta sensibilidad.
**Evidencia presente:** Ninguna. El condicional "podría permitir" marca la especulación.
**Análisis:** El caso de uso es proyección. "Ejecutar operaciones" (trading execution) es una afirmación de alto impacto que mezcla la capacidad técnica de MCP (puede exponer un endpoint de trading como herramienta) con la idoneidad de hacerlo (que involucra regulación, latencia, riesgo financiero — ninguno de los cuales se aborda). El capítulo no cita ninguna implementación financiera en producción ni evaluación de riesgos para este caso.
**Calibración:** ESPECULACIÓN ÚTIL CON CAVEATS INSUFICIENTES — el condicional es correcto pero el caso de uso incluye actividades reguladas (trading, asesoramiento financiero) sin mencionar las restricciones regulatorias relevantes. Impacto: Alto si se toma como guía de diseño sin considerar el contexto regulatorio.
**Score:** 0.20 / 1.0

---

### C-14: Reasoning-Based Information Extraction "supera sistemas convencionales de búsqueda"

**Texto exacto:** "Aprovechando las fuertes habilidades de razonamiento de un LLM, MCP facilita la extracción de información efectiva y dependiente de consultas que supera los sistemas convencionales de búsqueda y recuperación." (§6)
**Tipo de claim:** Cuantitativo comparativo — "supera" implica una métrica de comparación.
**Evidencia presente:** Ninguna. El claim afirma superioridad sobre "sistemas convencionales de búsqueda" sin benchmark, métrica ni referencia.
**Análisis:** "Supera" es un claim comparativo que requiere: (1) definición de "sistemas convencionales de búsqueda" (BM25, TF-IDF, elasticsearch, etc.), (2) métrica de comparación (precision@k, recall@k, MRR), (3) evidencia empírica. Ninguno de los tres está presente. El mecanismo descrito (un agente analiza el texto y extrae la cláusula precisa) es plausible pero no hay benchmark que sustente "supera". El claim es en la forma de "X es mejor que Y" sin evidencia comparativa.
**Calibración:** AFIRMACIÓN PERFORMATIVA — claim comparativo de superioridad sin evidencia cuantitativa. Impacto: Alto (puede guiar decisiones de reemplazo de sistemas de búsqueda sin evidencia).
**Score:** 0.0 / 1.0

---

### C-15: "MCP dramáticamente reduce la complejidad" (Key Takeaways / Conclusión)

**Texto exacto:** "Este enfoque estandarizado fomenta un ecosistema de componentes interoperables y reutilizables, simplificando dramáticamente el desarrollo de flujos de trabajo agénticos complejos." (§10)
**Tipo de claim:** Afirmación de impacto — variante de C-11.
**Evidencia presente:** Ninguna evidencia empírica para "dramáticamente".
**Análisis:** Misma estructura que C-11. "Simplificando dramáticamente" repite el intensificador sin evidencia adicional. El argumento cualitativo (un estándar vs. N integraciones) sigue siendo plausible pero "dramáticamente" no tiene sustento medible.
**Calibración:** AFIRMACIÓN PERFORMATIVA — idéntico análisis a C-11. La repetición del claim en la conclusión sin agregar evidencia confirma el patrón.
**Score:** 0.25 / 1.0

---

### C-16: "Agentes no reemplazan mágicamente flujos de trabajo deterministas"

**Texto exacto:** "Esto destaca que los agentes no reemplazan mágicamente los flujos de trabajo deterministas; a menudo requieren soporte determinista más sólido para tener éxito." (§2)
**Tipo de claim:** Advertencia honesta — limitación del patrón.
**Evidencia presente:** El capítulo provee un ejemplo concreto: el sistema de tickets que solo recupera uno a la vez — un agente que necesita resumir tickets de alta prioridad "será lento e inexacto en altos volúmenes". El ejemplo es un caso de uso concreto y plausible.
**Análisis:** La advertencia es una limitación real articulada con un ejemplo específico y razonado. No requiere fuente externa porque es una observación sobre el comportamiento de sistemas no deterministas (LLMs) que dependen de APIs deterministas subyacentes. El razonamiento es: API ineficiente → agente ineficiente (lógica causal directa). El ejemplo del sistema de tickets ilustra exactamente el mecanismo.
**Calibración:** INFERENCIA CALIBRADA — advertencia técnicamente correcta con ejemplo razonado. El razonamiento es derivable lógicamente del diseño de los sistemas.
**Score:** 0.90 / 1.0

---

### C-17: "Los desarrolladores deben considerar la naturaleza de los datos que se intercambian"

**Texto exacto:** "los desarrolladores deben considerar no solo la conexión, sino la naturaleza de los datos que se intercambian para garantizar una compatibilidad real." (§2)
**Tipo de claim:** Advertencia honesta — recomendación de diseño.
**Evidencia presente:** El capítulo provee el ejemplo del servidor MCP para un almacén de documentos que devuelve PDFs — "en su mayoría inútil si el agente consumidor no puede analizar contenido PDF". El ejemplo ilustra directamente el problema.
**Análisis:** La advertencia es técnicamente correcta y el ejemplo (PDFs vs. Markdown) es un caso concreto y verificable. Si un servidor MCP devuelve contenido que el LLM no puede procesar, la integración no sirve — es una limitación real documentada con un caso específico. El razonamiento es causal y directo.
**Calibración:** INFERENCIA CALIBRADA — advertencia con ejemplo concreto y razonamiento causal claro.
**Score:** 0.90 / 1.0

---

### C-18: "MCP es un contrato — su efectividad depende del diseño de las APIs subyacentes"

**Texto exacto:** "MCP es un contrato para una 'interfaz agéntica', y su efectividad depende en gran medida del diseño de las APIs subyacentes que expone." (§2)
**Tipo de claim:** Advertencia honesta — limitación fundamental del patrón.
**Evidencia presente:** El capítulo desarrolla esta advertencia con el ejemplo del sistema de tickets (APIs que no tienen filtrado/ordenación) como caso concreto.
**Análisis:** Es la advertencia más importante del capítulo. "MCP es un contrato" es una metáfora arquitectónica precisa: el protocolo define la interfaz, no la calidad de lo que está detrás. El claim de que "su efectividad depende del diseño de las APIs subyacentes" es lógicamente derivable de la naturaleza de MCP como wrapper protocol. El capítulo ilustra el punto con el sistema de tickets de manera concreta.
**Calibración:** INFERENCIA CALIBRADA — advertencia técnicamente correcta, razonada con ejemplo específico. Es el claim de mayor valor epistémico del capítulo.
**Score:** 0.95 / 1.0

---

### C-19: `tool_filter` dentro de `StdioServerParameters` donde no corresponde

**Texto exacto:** El código de la versión extendida tiene `# tool_filter=['list_directory', 'read_file']` comentado dentro del bloque `StdioServerParameters`, con el comentario "Optional: You can filter which tools from the MCP server are exposed." (§7)
**Tipo de claim:** Defecto de código — `tool_filter` en lugar incorrecto.
**Evidencia presente:** La versión condensada de §7 (sin `tool_filter`) y el código de §9 donde `tool_filter` aparece correctamente en `HttpServerParameters` (dentro de `MCPToolset`). La comparación entre los dos bloques de código del mismo capítulo evidencia la inconsistencia.
**Análisis:** En §9 (cliente FastMCP), `tool_filter=['greet']` aparece correctamente como argumento de `MCPToolset`, no de `HttpServerParameters`. En la versión extendida de §7, el parámetro equivalente está comentado y colocado dentro de `StdioServerParameters`, que es el tipo incorrecto según la coherencia interna del capítulo. El defecto es verificable comparando ambos bloques de código sin necesidad de consultar la documentación externa.
**Calibración:** CONTRADICCIÓN INTERNA — verificable por comparación de §7 y §9 del mismo capítulo. El código de §9 actúa como evidencia de la ubicación correcta de `tool_filter`.
**Score:** 0.0 / 1.0 (defecto confirmado)

---

### C-20: `Client` importado pero nunca usado (versión extendida FastMCP)

**Texto exacto:** `from fastmcp import FastMCP, Client` en la versión extendida del servidor FastMCP (§8). `Client` no aparece en ningún otro lugar del código del servidor.
**Tipo de claim:** Defecto de código — import no utilizado.
**Evidencia presente:** El código es observable directamente. La versión condensada de §8 usa únicamente `from fastmcp import FastMCP`, confirmando que `Client` es superfluo.
**Análisis:** El import de `Client` en la versión extendida no tiene uso correspondiente en el cuerpo del código. La versión condensada sin `Client` funciona correctamente. Es un artifact del texto fuente — probablemente un import que quedó de una versión de código con cliente y servidor juntos.
**Calibración:** DEFECTO DE CÓDIGO CONFIRMADO — verificable por comparación de versión condensada (correcta) vs. versión extendida (con import superfluo).
**Score:** 0.0 / 1.0 (defecto confirmado)

---

### C-21: Inconsistencia `StdioConnectionParams` (dict) vs `StdioServerParameters` (constructor)

**Texto exacto:** Los ejemplos Python3/UVX usan `StdioConnectionParams(server_params={"command": "python3", "args": [...], "env": {...}})` (dict). Los ejemplos principales ADK usan `StdioServerParameters(command='npx', args=[...])` (constructor con kwargs). (§7)
**Tipo de claim:** Defecto de código — inconsistencia de API.
**Evidencia presente:** Ambos bloques de código son observables en el mismo capítulo (§7).
**Análisis:** Los dos nombres de clase (`StdioConnectionParams` vs `StdioServerParameters`) y las dos signaturas (dict vs. kwargs) sugieren que el capítulo mezcla código de versiones distintas del SDK o de SDKs diferentes (el ADK de Google tiene `StdioServerParameters`; otros SDKs MCP pueden tener `StdioConnectionParams`). El texto reconoce la inconsistencia en la nota editorial: "Pueden ser APIs distintas o versiones distintas del SDK — el texto no lo clarifica."
**Calibración:** DEFECTO DE CÓDIGO CONFIRMADO — la inconsistencia es observable. La falta de explicación sobre qué API corresponde a qué contexto es un defecto de documentación.
**Score:** 0.0 / 1.0 (defecto confirmado)

---

### C-22: Código de agente ADK con `MCPToolset` y `StdioServerParameters` es correcto (versión condensada)

**Texto exacto:** La versión condensada de §7 usa `MCPToolset(connection_params=StdioServerParameters(command='npx', args=["-y", "@modelcontextprotocol/server-filesystem", TARGET_FOLDER_PATH]))`.
**Tipo de claim:** Arquitectónico — el código de la versión condensada es correcto y ejecutable.
**Evidencia presente:** La documentación oficial de ADK (`google.github.io/adk-docs/mcp/`) citada. El código es coherente con la API de `MCPToolset` descrita en la documentación oficial.
**Análisis:** A diferencia de Cap. 8 (donde el código de referencia ejecutaba un algoritmo diferente al descrito) y Cap. 9 (donde el código de OpenEvolve tenía un `NameError`), el código de la versión condensada de §7 es arquitectónicamente correcto: `MCPToolset` recibe `connection_params` como `StdioServerParameters` con `command` y `args`. El patrón es coherente con la documentación de ADK referenciada.
**Calibración:** OBSERVACIÓN DIRECTA — código coherente con la documentación oficial referenciada. El defecto existe en la versión *extendida* (C-19), no en la condensada.
**Score:** 0.90 / 1.0

---

### C-23: Flujo de interacción de 5 pasos (Discovery → Response)

**Texto exacto:** El flujo de §5: "1. Discovery... 2. Request Formulation... 3. Client Communication... 4. Server Execution... 5. Response and Context Update." (§5)
**Tipo de claim:** Técnico — descripción del flujo de interacción del protocolo.
**Evidencia presente:** Documentación oficial MCP (`modelcontextprotocol.io`) citada. El flujo es la descripción del ciclo estándar de comunicación MCP.
**Análisis:** Los 5 pasos describen el flujo de mensajes en una interacción MCP estándar. Cada paso tiene descripción concreta (Discovery: el cliente consulta el servidor para obtener el manifiesto de capacidades; Server Execution: el servidor autentica, valida y ejecuta; etc.). Es coherente con la especificación del protocolo y con los ejemplos de código del capítulo (§7, §9).
**Calibración:** INFERENCIA CALIBRADA — flujo derivado de la especificación oficial citada, coherente con los ejemplos de código del capítulo.
**Score:** 0.85 / 1.0

---

### C-24: Ejemplo concreto del sistema de tickets

**Texto exacto:** "si la API de un sistema de tickets solo permite recuperar detalles completos del ticket uno por uno, un agente al que se le pide resumir tickets de alta prioridad será lento e inexacto en altos volúmenes." (§2)
**Tipo de claim:** Advertencia con ejemplo concreto — ilustra la limitación de C-18.
**Evidencia presente:** Es un ejemplo hipotético pero técnicamente razonado (no una referencia empírica). El razonamiento es: API sin filtrado → múltiples llamadas síncronas → latencia alta → resultado inexacto en altos volúmenes.
**Análisis:** El ejemplo es un caso de uso plausible y el razonamiento causal es directo. Un agente que debe resumir tickets de alta prioridad sin un endpoint de filtrado tendría que recuperar todos los tickets y filtrarlos localmente — comportamiento que es lento e inexacto de manera derivable (no especulativa). El ejemplo ilustra el principio de diseño de §2 con concreción.
**Calibración:** INFERENCIA CALIBRADA — razonamiento causal correcto con ejemplo específico. La plausibilidad no requiere evidencia empírica cuando el mecanismo es directamente observable.
**Score:** 0.85 / 1.0

---

### C-25: Database Integration mediante MCP Toolbox for Databases para BigQuery

**Texto exacto:** "usando el MCP Toolbox for Databases, un agente puede consultar conjuntos de datos de Google BigQuery para recuperar información en tiempo real, generar informes o actualizar registros." (§6)
**Tipo de claim:** Caso de uso con herramienta citada.
**Evidencia presente:** La referencia `https://google.github.io/adk-docs/mcp/databases/` está en la tabla de referencias del capítulo.
**Análisis:** A diferencia de los casos de uso de IoT (C-12) y Financial Services (C-13), este tiene una herramienta concreta citada: MCP Toolbox for Databases. La URL es verificable y corresponde a documentación oficial de Google ADK. El caso de uso de BigQuery con lenguaje natural es una aplicación directa de la herramienta referenciada.
**Calibración:** INFERENCIA CALIBRADA — la herramienta existe y está referenciada oficialmente. El caso de uso es una aplicación directa de la herramienta, no especulación sobre lo que podría hacerse.
**Score:** 0.80 / 1.0

---

### C-26: Generative Media Orchestration vía MCP Tools for Genmedia Services

**Texto exacto:** "A través de MCP Tools for Genmedia Services, un agente puede orquestar flujos de trabajo que involucren Imagen de Google para generación de imágenes, Veo de Google para creación de video, Chirp 3 HD de Google para voces realistas, o Lyria de Google para composición musical." (§6)
**Tipo de claim:** Caso de uso con referencia oficial.
**Evidencia presente:** La referencia `https://google.github.io/adk-docs/mcp/#mcp-servers-for-google-cloud-genmedia` está en la tabla de referencias del capítulo. Los cuatro servicios (Imagen, Veo, Chirp 3 HD, Lyria) son productos reales de Google Cloud.
**Análisis:** Los cuatro servicios de medios generativos de Google (Imagen, Veo, Chirp 3 HD, Lyria) son productos verificables. La herramienta MCP Tools for Genmedia Services está referenciada con URL oficial. El caso de uso es una aplicación directa de las herramientas existentes — no es especulación sobre lo que podría hacerse, es descripción de lo que la herramienta hace.
**Calibración:** INFERENCIA CALIBRADA — los servicios y la herramienta son verificables, el caso de uso es una aplicación directa.
**Score:** 0.85 / 1.0

---

### C-27: "FastMCP simplifica el desarrollo particularmente para herramientas implementadas en Python"

**Texto exacto:** "FastMCP simplifica el desarrollo y gestión de servidores MCP, particularmente para exponer herramientas implementadas en Python." (§11, Key Takeaways)
**Tipo de claim:** Técnico — caracterización del rol de FastMCP.
**Evidencia presente:** GitHub de FastMCP (`https://github.com/jlowin/fastmcp`) citado. El código de §8 demuestra la simplificación: con solo `@mcp_server.tool` y una función Python, se obtiene un servidor MCP funcional.
**Análisis:** "Simplifica" es un claim relativo que está respaldado por el código del capítulo: el código de FastMCP (§8) es significativamente más conciso que un servidor MCP implementado desde la especificación base. El calificador "particularmente para Python" es correcto (FastMCP es un framework Python). La demostración en código es evidencia directa de la simplificación.
**Calibración:** OBSERVACIÓN DIRECTA — la simplificación está demostrada en el código del capítulo vs. la complejidad esperada de implementar MCP desde la especificación base.
**Score:** 0.85 / 1.0

---

### C-28: Advertencia de seguridad sobre autenticación y autorización

**Texto exacto:** "Exponer herramientas y datos a través de cualquier protocolo requiere medidas de seguridad robustas. Una implementación MCP debe incluir autenticación y autorización para controlar qué clientes pueden acceder a qué servidores y qué acciones específicas tienen permitido realizar." (§4)
**Tipo de claim:** Advertencia honesta — requisito de seguridad.
**Evidencia presente:** La afirmación sobre autenticación/autorización es un principio estándar de seguridad en protocolos de red — no requiere cita específica. El claim está correctamente calificado: "debe incluir", no "incluye automáticamente".
**Análisis:** El claim de seguridad es correcto y relevante: cualquier servicio que exponga herramientas con acceso a datos o capacidades de escritura necesita controles de acceso. El capítulo señala la necesidad sin proveer implementación de referencia (lo cual es honesto — la implementación de seguridad es específica del contexto). Es una advertencia estándar y técnicamente correcta.
**Calibración:** INFERENCIA CALIBRADA — principio de seguridad estándar, correctamente articulado como requisito. No requiere cita cuando el principio es conocimiento de dominio.
**Score:** 0.85 / 1.0

---

## 3. Tabla resumen

| ID | Claim | Score | Estado |
|----|-------|-------|--------|
| C-01 | MCP opera en arquitectura cliente-servidor | 0.90 | Inferencia calibrada (doc oficial) |
| C-02 | JSON-RPC sobre STDIO para comunicación local | 1.0 | Observación directa (doc + código) |
| C-03 | Streamable HTTP y SSE para conexiones remotas | 1.0 | Observación directa (doc + código) |
| C-04 | MCP Client consulta dinámicamente capacidades | 0.85 | Inferencia calibrada (doc oficial) |
| C-05 | Tool / Resource / Prompt — taxonomía del protocolo | 0.90 | Observación directa (especificación + código) |
| C-06 | FastMCP genera esquemas desde type hints y docstrings | 1.0 | Observación directa (GitHub + código) |
| C-07 | Tool function calling propietario y varía entre proveedores | 0.75 | Inferencia calibrada (observable en documentaciones) |
| C-08 | MCP es open standard que promueve interoperabilidad | 1.0 | Observación directa (licencia MIT, URL pública) |
| C-09 | MCP discovery dinámico vs. tool calling explícito | 0.80 | Inferencia calibrada (ambas documentaciones) |
| C-10 | MCP fomenta servidores reutilizables | 0.80 | Inferencia calibrada (ejemplos concretos con URL) |
| C-11 | "Reduce dramáticamente la complejidad" (§2) | 0.25 | Afirmación performativa — intensificador sin evidencia |
| C-12 | IoT Device Control (condicional) | 0.30 | Especulación útil — sin implementación de referencia |
| C-13 | Financial Services trading y asesoramiento | 0.20 | Especulación con caveats insuficientes (actividad regulada) |
| C-14 | Reasoning extraction "supera sistemas convencionales" | 0.0 | Afirmación performativa — comparativo sin benchmark |
| C-15 | "Simplificando dramáticamente" (§10, conclusión) | 0.25 | Afirmación performativa — repetición de C-11 sin evidencia |
| C-16 | "Agentes no reemplazan mágicamente flujos deterministas" | 0.90 | Inferencia calibrada (advertencia con ejemplo razonado) |
| C-17 | "Considerar la naturaleza de los datos intercambiados" | 0.90 | Inferencia calibrada (advertencia con ejemplo PDF/Markdown) |
| C-18 | "MCP es un contrato — efectividad depende de APIs subyacentes" | 0.95 | Inferencia calibrada (advertencia con ejemplo concreto) |
| C-19 | `tool_filter` en `StdioServerParameters` (lugar incorrecto) | 0.0 | Contradicción interna verificable en §9 |
| C-20 | `Client` importado sin uso | 0.0 | Defecto de código confirmado |
| C-21 | `StdioConnectionParams` vs `StdioServerParameters` — inconsistencia | 0.0 | Defecto de código confirmado |
| C-22 | Código ADK versión condensada correcto | 0.90 | Observación directa (coherente con doc ADK) |
| C-23 | Flujo de 5 pasos de interacción MCP | 0.85 | Inferencia calibrada (derivado de especificación oficial) |
| C-24 | Ejemplo sistema de tickets (ilustración de C-18) | 0.85 | Inferencia calibrada (razonamiento causal directo) |
| C-25 | Database Integration con MCP Toolbox for Databases | 0.80 | Inferencia calibrada (herramienta con URL oficial) |
| C-26 | Genmedia Orchestration con MCP Tools for Genmedia Services | 0.85 | Inferencia calibrada (productos Google verificables) |
| C-27 | FastMCP simplifica desarrollo para Python | 0.85 | Observación directa (demostrado en código del capítulo) |
| C-28 | Advertencia de seguridad: autenticación y autorización | 0.85 | Inferencia calibrada (principio estándar de seguridad) |

**Suma de scores:** 18.35 / 28
**Ratio de calibración:** **18.35/28 = 65%**

---

## 4. Ratio de calibración y clasificación

```
Ratio = 18.35 / 28 = 65%

Clasificación: PARCIALMENTE CALIBRADO

Umbral para artefacto de exploración: ≥ 0.50   ✓ superado
Umbral para artefacto de gate: ≥ 0.75           ✗ no alcanzado
Resultado: por encima del umbral de exploración, por debajo del umbral de gate
```

**Distribución de claims por tipo:**

| Tipo | Cantidad | Suma scores | Ratio interno |
|------|----------|-------------|---------------|
| Calibrados (score ≥ 0.75) | 20 | 17.35 | 71% del total |
| Parcialmente calibrados (0.25-0.74) | 4 | 1.30 | 14% del total |
| Sin evidencia / refutados (< 0.25) | 4 | 0.0 | 14% del total |

**Excluyendo defectos de código (C-19, C-20, C-21 — categoría separada):** Ratio = 18.35/25 = 73%

**Excluyendo además especulaciones de casos de uso (C-12, C-13, C-14):** Ratio = 17.85/22 = 81%

---

## 5. Respuestas a las preguntas específicas

### Pregunta 1: ¿El salto de Cap.9 (77%) sube o baja en Cap.10?

**Baja: 77% → 65%**

El descenso es explicable por la estructura del capítulo: MCP tiene una sección de casos de uso (§6) con 9 aplicaciones de las cuales 3 son especulativas sin evidencia (IoT, Financial Services, Reasoning extraction) y 2 tienen referencia verificable (Database Integration, Genmedia). Los claims especulativos de §6 reducen el ratio.

Sin la sección de casos de uso especulativos, el ratio de los claims arquitectónicos del protocolo (Grupo A) y las advertencias honestas (Grupo D) sería considerablemente más alto (~85%). El capítulo tiene dos naturalezas distintas: una parte de especificación técnica (bien calibrada) y una parte de marketing de aplicaciones (menos calibrada).

### Pregunta 2: ¿Las advertencias honestas (Grupo D) elevan el ratio?

**Sí — y son la contribución más valiosa del capítulo.**

Los cuatro claims del Grupo D (C-16, C-17, C-18, C-24) tienen scores de 0.85-0.95 — los más altos del capítulo junto con los claims de transporte (C-02, C-03). Las advertencias elevan el ratio porque:

1. Están articuladas con ejemplos concretos (sistema de tickets, PDF vs. Markdown)
2. El razonamiento causal es directo y derivable sin fuente externa
3. Limitan el alcance del patrón honestamente ("MCP es un contrato")

En comparación con Cap. 6-8 donde las conclusiones eran retóricas ("comprensión genuina", "eleva a entidades"), Cap. 10 cierra con advertencias de limitación en lugar de aspiraciones filosóficas — lo cual eleva la calibración del cierre del capítulo.

Sin embargo, las advertencias del Grupo D no son suficientes por sí solas para elevar el ratio global por encima del umbral de gate. Son necesarias pero no compensan los defectos de código (Grupo E, 3 claims con score 0) y las especulaciones de aplicación (Grupo C, 3 claims con score < 0.30).

### Pregunta 3: ¿Los defectos de código (Grupo E) afectan el ratio o se clasifican separadamente?

**Afectan el ratio (a diferencia de Cap. 9 donde se sugirió excluirlos).**

La razón es estructural: en Cap. 10, los defectos de código (C-19, C-20, C-21) son inconsistencias internas del capítulo — el mismo capítulo provee en §9 la evidencia de que `tool_filter` va en `MCPToolset`, no en `StdioServerParameters`. Los defectos son detectables por comparación interna, lo que los convierte en afirmaciones que el capítulo mismo refuta.

Sin embargo, hay una diferencia importante respecto a Cap. 8 (EFsA-Implementación): los defectos de Cap. 10 son **errores de documentación** (código de demostración con parámetros en el lugar incorrecto o imports superfluos), no errores de algoritmo. El código conceptualmente correcto (versión condensada) existe en el mismo capítulo. En Cap. 8, el código de referencia ejecutaba un algoritmo diferente al descrito; en Cap. 10, existe una versión correcta junto a la versión con defectos.

Para efectos de usabilidad: los defectos de Cap. 10 son corregibles con referencia al código correcto del mismo capítulo. Los defectos de Cap. 8 requerían implementación desde cero.

---

## 6. Patrón identificado: Calibración Asimétrica por Dominio (CAD)

### Identificación del patrón

El Capítulo 10 exhibe un patrón diferente a los anteriores:

> **CAD (Calibración Asimétrica por Dominio):** Un capítulo tiene ratios de calibración significativamente distintos entre sus dominios internos. La parte de especificación técnica (Grupo A — claims del protocolo) tiene calibración alta; la parte de aplicaciones proyectadas (Grupo C — casos de uso sin implementación) tiene calibración baja. El ratio global es la mezcla de ambas.

### Anatomía del patrón CAD en Cap. 10

```
Dominio                   | Claims  | Score promedio | Calibración interna
─────────────────────────────────────────────────────────────────────────
A — Protocolo MCP         | 8       | 0.91/1.0       | Alta
B — MCP vs Tool calling   | 5       | 0.72/1.0       | Media-alta
C — Casos de uso          | 5       | 0.43/1.0       | Media-baja (3 especulativos)
D — Advertencias honestas | 4       | 0.90/1.0       | Alta
E — Defectos de código    | 4       | 0.23/1.0       | Baja (3 defectos reales)
```

### Comparación con patrones anteriores

| Capítulo | Ratio | Clasificación | Patrón |
|----------|-------|---------------|--------|
| Cap. 6 — Planning | 44% | REALISMO PERFORMATIVO | EFsA |
| Cap. 7 — Multi-Agent | ~44% | REALISMO PERFORMATIVO | EFsA-Estructural |
| Cap. 8 — Memoria | 42% | REALISMO PERFORMATIVO | EFsA-Implementación |
| Cap. 9 — Aprendizaje | 77% | CALIBRADO | CCV (Calibración por Citas Verificables) |
| **Cap. 10 — MCP** | **65%** | **PARCIALMENTE CALIBRADO** | **CAD (Calibración Asimétrica por Dominio)** |

### Por qué MCP tiene CAD y no CCV (como Cap. 9)

Cap. 9 cita papers arXiv verificables (PPO: arXiv:1707.06347, SICA: arXiv:2504.15228v2, DPO: arXiv:2305.18290 implícito). Las referencias para Cap. 10 son documentación oficial activa (URLs verificables de protocolos en producción), lo cual debería producir calibración similar. La diferencia está en que Cap. 10 incluye una sección extensa de casos de uso proyectados (§6 con 9 casos) donde tres no tienen implementación de referencia ni condición o evidencia observable.

Cap. 9 no tiene una sección equivalente de casos de uso proyectados — sus "aplicaciones" son los sistemas concretos (SICA, AlphaEvolve) que ya existen y están referenciados.

---

## 7. Afirmaciones performativas: 4

| # | Texto | Sección | Impacto | Evidencia propuesta |
|---|-------|---------|---------|---------------------|
| 1 | "reduce dramáticamente la complejidad de integrar LLMs" (C-11) | §2 | Medio (argumento de adopción) | Medir: N de líneas de código de integración ad-hoc vs. N de líneas con MCP para el mismo caso de uso. Reemplazar "dramáticamente" con el ratio observado. |
| 2 | "supera los sistemas convencionales de búsqueda y recuperación" (C-14) | §6 | Alto (puede guiar reemplazo de sistemas de búsqueda) | Benchmark de precision@10 entre LLM+MCP vs. elasticsearch en un corpus específico. Sin ese benchmark, reformular a: "puede recuperar la cláusula específica que responde a la pregunta" (claim de capacidad, no de superioridad). |
| 3 | "simplificando dramáticamente el desarrollo de flujos de trabajo agénticos" (C-15) | §10 | Medio (conclusión de adopción) | Idéntico a C-11. El intensificador "dramáticamente" requiere medición comparativa. |
| 4 | Financial Services: "ejecutar operaciones, generar asesoramiento financiero personalizado" (C-13) | §6 | Alto (actividades reguladas) | Señalar explícitamente que trading execution y asesoramiento financiero personalizado son actividades reguladas (MiFID II, SEC, etc.) que requieren supervisión humana independientemente de la capacidad técnica de MCP. |

---

## 8. Defectos de código: categoría separada

| # | Defecto | Sección | Severidad | Corrección |
|---|---------|---------|-----------|------------|
| 1 | `tool_filter` comentado dentro de `StdioServerParameters` — lugar incorrecto (C-19) | §7, versión extendida | Media (comentado, no activo) | Verificar en §9 del mismo capítulo: `tool_filter` va en `MCPToolset`, no en `StdioServerParameters`. |
| 2 | `from fastmcp import FastMCP, Client` — `Client` sin uso (C-20) | §8, versión extendida | Baja (no afecta ejecución del servidor) | Eliminar `Client` del import. La versión condensada de §8 tiene el import correcto. |
| 3 | `StdioConnectionParams` vs `StdioServerParameters` — inconsistencia sin explicación (C-21) | §7 | Media (genera confusión sobre qué API usar) | Verificar en `google.github.io/adk-docs/mcp/` la API correcta para cada contexto. La versión condensada usa `StdioServerParameters` directamente. |

**Diferencia respecto a Cap. 8:** Los defectos de Cap. 10 son errores de documentación con código correcto disponible en el mismo capítulo. En Cap. 8, el código de referencia ejecutaba un algoritmo diferente al descrito sin versión correcta disponible. Los defectos de Cap. 10 son corregibles con referencia al mismo texto.

---

## 9. Claims adoptables sin validación adicional (score ≥ 0.75)

| Claim | Score | Por qué es adoptable |
|-------|-------|---------------------|
| C-02: JSON-RPC sobre STDIO para local | 1.0 | Documentación oficial + código funcional |
| C-03: Streamable HTTP y SSE para remoto | 1.0 | Documentación oficial + código funcional |
| C-06: FastMCP esquemas desde type hints | 1.0 | GitHub oficial + demostrado en código |
| C-08: MCP como open standard (MIT) | 1.0 | Verificable en `modelcontextprotocol.io` |
| C-18: "MCP es un contrato" (limitación fundamental) | 0.95 | Advertencia con ejemplo concreto, correcto |
| C-16: Agentes no reemplazan flujos deterministas | 0.90 | Advertencia con ejemplo razonado |
| C-17: Considerar naturaleza de datos intercambiados | 0.90 | Advertencia con ejemplo PDF/Markdown |
| C-01: Arquitectura cliente-servidor de MCP | 0.90 | Documentación oficial |
| C-05: Tool / Resource / Prompt — taxonomía oficial | 0.90 | Especificación oficial + código |
| C-22: Código ADK versión condensada correcto | 0.90 | Coherente con documentación ADK |
| C-04: Discovery dinámico de capacidades | 0.85 | Documentación oficial |
| C-23: Flujo de interacción de 5 pasos | 0.85 | Derivado de especificación oficial |
| C-24: Ejemplo sistema de tickets | 0.85 | Razonamiento causal directo |
| C-26: Genmedia Orchestration | 0.85 | Productos Google verificables |
| C-27: FastMCP simplifica desarrollo Python | 0.85 | Demostrado en código del capítulo |
| C-28: Advertencia de seguridad (auth/authz) | 0.85 | Principio estándar de seguridad |
| C-09: Discovery dinámico vs. explícito | 0.80 | Derivable de ambas documentaciones |
| C-10: Servidores MCP reutilizables | 0.80 | Ejemplos con URL oficiales |
| C-25: Database Integration con MCP Toolbox | 0.80 | Herramienta con URL oficial |
| C-07: Tool calling propietario | 0.75 | Observable en documentaciones de proveedores |

**Claims NO adoptables sin corrección:**

| Claim | Problema | Corrección |
|-------|---------|------------|
| C-11, C-15: "Dramáticamente" | Intensificador sin evidencia cuantitativa | Reemplazar por claim de capacidad: "puede reducir la complejidad de integración al proveer una interfaz estándar" |
| C-12: IoT Device Control | Sin implementación de referencia | Marcar explícitamente como caso de uso proyectado, no demostrado |
| C-13: Financial Services trading | Actividad regulada sin mencionar regulación | Agregar: "sujeto a requisitos regulatorios de la jurisdicción" |
| C-14: Reasoning extraction "supera" | Claim comparativo sin benchmark | Reformular: "puede extraer información específica de documentos" (eliminando el comparativo) |
| C-19: `tool_filter` en lugar incorrecto | Defecto en versión extendida | Usar versión condensada de §7 o verificar en §9 la ubicación correcta |
| C-20: `Client` import superfluo | Import sin uso | Usar versión condensada de §8 |
| C-21: `StdioConnectionParams` inconsistente | API no clarificada | Verificar en `google.github.io/adk-docs/mcp/` |

---

## 10. Brechas críticas para THYROX

### Brecha 1: El claim de superioridad sobre sistemas de búsqueda (C-14) no tiene evidencia

**Descripción:** El capítulo afirma que MCP + LLM "supera sistemas convencionales de búsqueda y recuperación" sin ningún benchmark.
**Impacto en THYROX:** ALTO — si un diseñador de agentes THYROX usa este claim para justificar el reemplazo de un sistema de búsqueda (elasticsearch, Solr, etc.) con un agente vía MCP, tomará una decisión de arquitectura sin evidencia. Las implementaciones de búsqueda convencional tienen métricas establecidas (precision@k, recall@k, latencia, costo por consulta) que el claim de "superación" no aborda.
**Evidencia observable para cerrar:** Benchmark sobre un corpus definido: precision@10 de LLM+MCP vs. elasticsearch para el tipo específico de consulta. O reformular el claim como "puede recuperar información dependiente de contexto que los sistemas de búsqueda por palabras clave no pueden" (claim de capacidad diferencial, no de superioridad general).

### Brecha 2: Los casos de uso de alta sensibilidad (IoT, Financial) carecen de advertencias de dominio

**Descripción:** Los casos de uso de IoT (C-12) y Financial Services (C-13) son proyecciones técnicas que no mencionan los contextos no-técnicos que los condicionan: control industrial requiere certificaciones de seguridad (IEC 61508); trading execution y asesoramiento financiero son actividades reguladas (MiFID II, SEC Reg BI).
**Impacto en THYROX:** ALTO para cualquier WP que use estos casos como referencia de aplicación. El capítulo presenta estos casos como extensiones naturales del protocolo, omitiendo que la viabilidad técnica no implica viabilidad regulatoria o de seguridad en esos dominios.
**Evidencia observable para cerrar:** Para cada caso de uso de alta sensibilidad, el artefacto de análisis THYROX debe agregar explícitamente: (1) si el dominio tiene regulación aplicable, (2) si hay implementaciones en producción referenciadas, (3) si los riesgos de IA no determinista son aceptables para ese dominio.

### Brecha 3: Los defectos de código crean confusión sobre qué API es canónica

**Descripción:** Los dos ejemplos de código con defectos (`tool_filter` en lugar incorrecto, `StdioConnectionParams` vs `StdioServerParameters`) no tienen señalización clara en el capítulo original. Un implementador que use la versión extendida en lugar de la condensada puede introducir código incorrecto.
**Impacto en THYROX:** MEDIO — los defectos son corregibles con referencia al código correcto del mismo capítulo o a la documentación oficial. No hay un error de algoritmo (como en Cap. 8) sino errores de documentación con la versión correcta disponible.
**Evidencia observable para cerrar:** Para cada bloque de código, usar la versión condensada como referencia canónica. Para `StdioConnectionParams`, verificar en `google.github.io/adk-docs/mcp/` qué clase corresponde al contexto ADK vs. otros contextos.

---

## 11. Usabilidad del capítulo para THYROX

| Propósito THYROX | Usabilidad | Justificación |
|-----------------|------------|---------------|
| Comprensión de la arquitectura MCP (cliente-servidor, transports) | ALTA | Claims del Grupo A son calibrados, con documentación oficial |
| Implementación de servidor FastMCP con herramientas Python | ALTA | Código de §8 versión condensada + FastMCP GitHub |
| Integración de agente ADK con servidor MCP local (filesystem) | ALTA | Código de §7 versión condensada + documentación ADK |
| Comparación MCP vs. Tool Function Calling para decisión de arquitectura | MEDIA-ALTA | Tabla comparativa bien articulada, claims del Grupo B calibrados |
| Evaluación de casos de uso aplicables | MEDIA | Casos verificables (Database, Genmedia) vs. especulativos (IoT, Financial, Reasoning) |
| Definición de advertencias de diseño para agentes con MCP | ALTA | Grupo D (advertencias) es el más calibrado del capítulo |
| Implementación de memoria semántica o mecanismos de aprendizaje | NO APLICA | Cap. 10 describe protocolo de integración, no estos patrones |

---

## Veredicto de calibración

**Ratio:** 65% (18.35/28) — PARCIALMENTE CALIBRADO

**Posición en la trayectoria:** Cap.8 42% → Cap.9 77% → Cap.10 65%. El descenso de 77% a 65% no representa una regresión a los niveles de Cap.6-8. El capítulo tiene un núcleo técnico bien calibrado (Grupo A con documentación oficial verificable) degradado por una sección de casos de uso proyectados (Grupo C) y defectos de código que son verificables internamente.

**Patrón dominante:** CAD (Calibración Asimétrica por Dominio) — primer capítulo del libro donde el ratio global está determinado por la mezcla de dominios internos con calibración significativamente distinta. Los claims del protocolo (Grupo A, ~91%) y las advertencias (Grupo D, ~90%) son el contenido de mayor calidad epistémica; los casos de uso proyectados sin evidencia (parte del Grupo C) y los defectos de código (Grupo E) reducen el ratio global.

**El capítulo ES usable para:**
- Comprensión de la especificación técnica de MCP (arquitectura, transports, taxonomía)
- Implementación de servidores MCP con FastMCP (código condensado de §8)
- Integración de agentes ADK con servidores MCP (código condensado de §7)
- Argumentos de diseño basados en las advertencias del Grupo D ("MCP es un contrato")
- Decisión entre MCP y tool function calling para sistemas complejos y escalables

**El capítulo NO es usable para:**
- Afirmar que MCP "supera" sistemas de búsqueda convencionales (sin benchmark)
- Planificar implementaciones IoT o Financial Services sin análisis regulatorio separado
- Usar los bloques de código extendidos de §7 y §8 sin verificar contra las versiones condensadas
- Justificar adopción de MCP con "reduce dramáticamente la complejidad" como argumento cuantitativo

**Recomendación para THYROX:** El capítulo no alcanza el umbral de gate (65% < 75%) pero supera el de exploración (65% > 50%). Para avanzar con implementaciones basadas en este capítulo, los claims del Grupo A y D son directamente adoptables. Los del Grupo C requieren verificación caso por caso (Database Integration y Genmedia son adoptables; IoT, Financial, y Reasoning extraction requieren validación adicional). Los defectos del Grupo E se resuelven usando las versiones condensadas de código del mismo capítulo.
