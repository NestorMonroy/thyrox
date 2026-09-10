```yml
created_at: 2026-04-19 06:31:27
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: Capítulo 10 — "Model Context Protocol (MCP)" (libro agentic design patterns, traducción profesional)
nota: Octavo patrón analizado. Capítulo con naturaleza diferente — MCP es un protocolo de infraestructura, no un patrón de comportamiento de agente. Incluye referencias a documentación oficial (MCP docs, ADK docs, FastMCP). Código de dos frameworks: Google ADK y FastMCP. Texto con duplicaciones detectadas (código aparece dos veces: versión condensada y versión extendida) — preservadas verbatim.
```

# Input: Capítulo 10 — Model Context Protocol (texto completo, preservado verbatim)

---

## Sección 1: Introducción

"Para habilitar que los LLMs funcionen efectivamente como agentes, sus capacidades deben extenderse más allá de la generación multimodal. Es necesaria la interacción con el entorno externo, incluyendo acceso a datos actuales, utilización de software externo y ejecución de tareas operacionales específicas. El Model Context Protocol (MCP) aborda esta necesidad proporcionando una interfaz estandarizada para que los LLMs se conecten con recursos externos. Este protocolo sirve como mecanismo clave para facilitar una integración consistente y predecible."

---

## Sección 2: MCP Pattern Overview

"Imagina un adaptador universal que permite a cualquier LLM conectarse a cualquier sistema externo, base de datos o herramienta sin una integración personalizada para cada uno. Eso es esencialmente lo que es el Model Context Protocol (MCP). Es un estándar abierto diseñado para estandarizar cómo los LLMs como Gemini, los modelos GPT de OpenAI, Mixtral y Claude se comunican con aplicaciones externas, fuentes de datos y herramientas. Piénsalo como un mecanismo de conexión universal que simplifica cómo los LLMs obtienen contexto, ejecutan acciones e interactúan con varios sistemas."

"MCP opera en una arquitectura cliente-servidor. Define cómo diferentes elementos — datos (denominados recursos), plantillas interactivas (que son esencialmente prompts) y funciones accionables (conocidas como herramientas) — son expuestos por un servidor MCP. Estos son consumidos por un cliente MCP, que podría ser una aplicación host LLM o un agente de IA en sí mismo. Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs en entornos operacionales diversos."

"Sin embargo, MCP es un contrato para una 'interfaz agéntica', y su efectividad depende en gran medida del diseño de las APIs subyacentes que expone. Existe el riesgo de que los desarrolladores simplemente envuelvan APIs existentes y heredadas sin modificación, lo que puede ser subóptimo para un agente. Por ejemplo, si la API de un sistema de tickets solo permite recuperar detalles completos del ticket uno por uno, un agente al que se le pide resumir tickets de alta prioridad será lento e inexacto en altos volúmenes. Para ser verdaderamente efectiva, la API subyacente debería mejorarse con características deterministas como filtrado y ordenación para ayudar al agente no determinista a trabajar eficientemente. Esto destaca que los agentes no reemplazan mágicamente los flujos de trabajo deterministas; a menudo requieren soporte determinista más sólido para tener éxito."

"Además, MCP puede envolver una API cuya entrada o salida aún no es inherentemente comprensible por el agente. Una API solo es útil si su formato de datos es amigable para el agente, una garantía que MCP en sí mismo no aplica. Por ejemplo, crear un servidor MCP para un almacén de documentos que devuelve archivos como PDFs es en su mayoría inútil si el agente consumidor no puede analizar contenido PDF. El mejor enfoque sería primero crear una API que devuelva una versión textual del documento, como Markdown, que el agente pueda realmente leer y procesar. Esto demuestra que los desarrolladores deben considerar no solo la conexión, sino la naturaleza de los datos que se intercambian para garantizar una compatibilidad real."

---

## Sección 3: MCP vs. Tool Function Calling

"El Model Context Protocol (MCP) y el llamado a funciones de herramientas son mecanismos distintos que permiten a los LLMs interactuar con capacidades externas (incluyendo herramientas) y ejecutar acciones. Aunque ambos sirven para extender las capacidades de LLM más allá de la generación de texto, difieren en su enfoque y nivel de abstracción."

"El llamado a funciones de herramientas puede entenderse como una solicitud directa de un LLM a una herramienta o función específica predefinida. Nota que en este contexto usamos las palabras 'herramienta' y 'función' indistintamente. Esta interacción se caracteriza por un modelo de comunicación uno-a-uno, donde el LLM formatea una solicitud basada en su comprensión de la intención de un usuario que requiere acción externa. El código de la aplicación luego ejecuta esta solicitud y devuelve el resultado al LLM. Este proceso es a menudo propietario y varía entre diferentes proveedores de LLM."

"En contraste, el Model Context Protocol (MCP) opera como una interfaz estandarizada para que los LLMs descubran, se comuniquen y utilicen capacidades externas. Funciona como un protocolo abierto que facilita la interacción con una amplia gama de herramientas y sistemas, con el objetivo de establecer un ecosistema donde cualquier herramienta compatible pueda ser accedida por cualquier LLM compatible. Esto fomenta interoperabilidad, composabilidad y reutilización entre diferentes sistemas e implementaciones."

"Al adoptar un modelo federado, mejoramos significativamente la interoperabilidad y desbloqueamos el valor de los activos existentes. Esta estrategia nos permite incorporar servicios dispares y heredados a un ecosistema moderno simplemente envolviéndolos en una interfaz compatible con MCP. Estos servicios continúan operando de forma independiente, pero ahora pueden componerse en nuevas aplicaciones y flujos de trabajo, con su colaboración orquestada por LLMs. Esto fomenta la agilidad y reutilización sin requerir reescrituras costosas de sistemas fundamentales."

### Tabla comparativa: Tool Function Calling vs. MCP

| Feature | Tool Function Calling | Model Context Protocol (MCP) |
|---------|----------------------|------------------------------|
| Standardization | Propietario y específico del proveedor. El formato e implementación difieren entre proveedores de LLM. | Un protocolo estandarizado y abierto, promoviendo interoperabilidad entre diferentes LLMs y herramientas. |
| Scope | Un mecanismo directo para que un LLM solicite la ejecución de una función específica predefinida. | Un marco más amplio para cómo los LLMs y herramientas externas se descubren y comunican entre sí. |
| Architecture | Una interacción uno-a-uno entre el LLM y la lógica de manejo de herramientas de la aplicación. | Una arquitectura cliente-servidor donde aplicaciones con LLM (clientes) pueden conectarse a y utilizar varios servidores MCP (herramientas). |
| Discovery | El LLM es informado explícitamente qué herramientas están disponibles dentro del contexto de una conversación específica. | Habilita el descubrimiento dinámico de herramientas disponibles. Un cliente MCP puede consultar un servidor para ver qué capacidades ofrece. |
| Reusability | Las integraciones de herramientas a menudo están estrechamente acopladas con la aplicación y el LLM específico siendo usado. | Promueve el desarrollo de 'servidores MCP' reutilizables y autónomos que pueden ser accedidos por cualquier aplicación compatible. |

"Piensa en el llamado a funciones de herramientas como dar a una IA un conjunto específico de herramientas personalizadas, como una llave inglesa y un destornillador particulares. Esto es eficiente para un taller con un conjunto fijo de tareas. MCP (Model Context Protocol), por otro lado, es como crear un sistema de toma de corriente universal y estandarizado. No proporciona las herramientas en sí, sino que permite a cualquier herramienta compatible de cualquier fabricante conectarse y funcionar, habilitando un taller dinámico y en expansión constante."

"En resumen, el llamado a funciones proporciona acceso directo a unas pocas funciones específicas, mientras que MCP es el marco de comunicación estandarizado que permite a los LLMs descubrir y usar una vasta gama de recursos externos. Para aplicaciones simples, las herramientas específicas son suficientes; para sistemas de IA complejos e interconectados que necesitan adaptarse, un estándar universal como MCP es esencial."

---

## Sección 4: Consideraciones adicionales para MCP

"Aunque MCP presenta un marco poderoso, una evaluación exhaustiva requiere considerar varios aspectos cruciales que influyen en su idoneidad para un caso de uso dado."

**Tool vs. Resource vs. Prompt:** "Es importante entender los roles específicos de estos componentes. Un recurso es datos estáticos (ej., un archivo PDF, un registro de base de datos). Una herramienta es una función ejecutable que realiza una acción (ej., enviar un correo electrónico, consultar una API). Un prompt es una plantilla que guía al LLM sobre cómo interactuar con un recurso o herramienta, asegurando que la interacción esté estructurada y sea efectiva."

**Discoverability:** "Una ventaja clave de MCP es que un cliente MCP puede consultar dinámicamente un servidor para conocer qué herramientas y recursos ofrece. Este mecanismo de descubrimiento 'justo-a-tiempo' es poderoso para agentes que necesitan adaptarse a nuevas capacidades sin ser redesplegados."

**Security:** "Exponer herramientas y datos a través de cualquier protocolo requiere medidas de seguridad robustas. Una implementación MCP debe incluir autenticación y autorización para controlar qué clientes pueden acceder a qué servidores y qué acciones específicas tienen permitido realizar."

**Implementation:** "Aunque MCP es un estándar abierto, su implementación puede ser compleja. Sin embargo, los proveedores están comenzando a simplificar este proceso. Por ejemplo, algunos proveedores de modelos como Anthropic o FastMCP ofrecen SDKs que abstraen gran parte del código de boilerplate, facilitando a los desarrolladores crear y conectar clientes y servidores MCP."

**Error Handling:** "Una estrategia de manejo de errores integral es crítica. El protocolo debe definir cómo los errores (ej., fallo en ejecución de herramienta, servidor no disponible, solicitud inválida) son comunicados de vuelta al LLM para que pueda entender el fallo y potencialmente intentar un enfoque alternativo."

**Local vs. Remote Server:** "Los servidores MCP pueden desplegarse localmente en la misma máquina que el agente o remotamente en un servidor diferente. Un servidor local puede elegirse por velocidad y seguridad con datos sensibles, mientras que una arquitectura de servidor remoto permite acceso compartido y escalable a herramientas comunes en toda una organización."

**On-demand vs. Batch:** "MCP puede soportar tanto sesiones interactivas bajo demanda como procesamiento por lotes a mayor escala. La elección depende de la aplicación, desde un agente conversacional en tiempo real que necesita acceso inmediato a herramientas hasta un pipeline de análisis de datos que procesa registros en lotes."

**Transportation Mechanism:** "El protocolo también define las capas de transporte subyacentes para la comunicación. Para interacciones locales, usa JSON-RPC sobre STDIO (entrada/salida estándar) para comunicación eficiente entre procesos. Para conexiones remotas, aprovecha protocolos web como Streamable HTTP y Server-Sent Events (SSE) para habilitar comunicación cliente-servidor persistente y eficiente."

---

## Sección 5: Flujo de interacción MCP (componentes)

"El Model Context Protocol utiliza un modelo cliente-servidor para estandarizar el flujo de información. Entender la interacción de componentes es clave para el comportamiento agéntico avanzado de MCP."

**Large Language Model (LLM):** "La inteligencia central. Procesa solicitudes del usuario, formula planes y decide cuándo necesita acceder a información externa o realizar una acción."

**MCP Client:** "Esta es una aplicación o envoltorio alrededor del LLM. Actúa como el intermediario, traduciendo la intención del LLM en una solicitud formal que conforma el estándar MCP. Es responsable de descubrir, conectarse a y comunicarse con Servidores MCP."

**MCP Server:** "Esta es la puerta de entrada al mundo externo. Expone un conjunto de herramientas, recursos y prompts a cualquier Cliente MCP autorizado. Cada servidor es típicamente responsable de un dominio específico, como una conexión a la base de datos interna de una empresa, un servicio de correo electrónico o una API pública."

**Optional Third-Party (3P) Service:** "Esto representa la herramienta externa real, aplicación o fuente de datos que el Servidor MCP gestiona y expone. Es el endpoint final que realiza la acción solicitada, como consultar una base de datos propietaria, interactuar con una plataforma SaaS o llamar a una API pública de clima."

**Flujo de interacción:**

1. **Discovery:** "El Cliente MCP, en nombre del LLM, consulta un Servidor MCP para preguntar qué capacidades ofrece. El servidor responde con un manifiesto que lista sus herramientas disponibles (ej., send_email), recursos (ej., customer_database) y prompts."

2. **Request Formulation:** "El LLM determina que necesita usar una de las herramientas descubiertas. Por ejemplo, decide enviar un correo electrónico. Formula una solicitud, especificando la herramienta a usar (send_email) y los parámetros necesarios (destinatario, asunto, cuerpo)."

3. **Client Communication:** "El Cliente MCP toma la solicitud formulada del LLM y la envía como una llamada estandarizada al Servidor MCP apropiado."

4. **Server Execution:** "El Servidor MCP recibe la solicitud. Autentica al cliente, valida la solicitud y luego ejecuta la acción especificada interfiriendo con el software subyacente (ej., llamando a la función send() de una API de correo electrónico)."

5. **Response and Context Update:** "Después de la ejecución, el Servidor MCP envía una respuesta estandarizada de vuelta al Cliente MCP. Esta respuesta indica si la acción fue exitosa e incluye cualquier salida relevante (ej., un ID de confirmación para el correo enviado). El cliente luego pasa este resultado de vuelta al LLM, actualizando su contexto y habilitándolo para proceder con el siguiente paso de su tarea."

---

## Sección 6: Aplicaciones prácticas y casos de uso

"MCP amplía significativamente las capacidades de IA/LLM, haciéndolos más versátiles y poderosos. Aquí hay nueve casos de uso clave:"

1. **Database Integration:** "MCP permite a los LLMs y agentes acceder de manera fluida e interactuar con datos estructurados en bases de datos. Por ejemplo, usando el MCP Toolbox for Databases, un agente puede consultar conjuntos de datos de Google BigQuery para recuperar información en tiempo real, generar informes o actualizar registros, todo impulsado por comandos en lenguaje natural."

2. **Generative Media Orchestration:** "MCP permite a los agentes integrarse con servicios avanzados de medios generativos. A través de MCP Tools for Genmedia Services, un agente puede orquestar flujos de trabajo que involucren Imagen de Google para generación de imágenes, Veo de Google para creación de video, Chirp 3 HD de Google para voces realistas, o Lyria de Google para composición musical, permitiendo la creación dinámica de contenido dentro de aplicaciones de IA."

3. **External API Interaction:** "MCP proporciona una forma estandarizada para que los LLMs llamen y reciban respuestas de cualquier API externa. Esto significa que un agente puede obtener datos meteorológicos en vivo, extraer precios de acciones, enviar correos electrónicos o interactuar con sistemas CRM, extendiendo sus capacidades mucho más allá de su modelo de lenguaje central."

4. **Reasoning-Based Information Extraction:** "Aprovechando las fuertes habilidades de razonamiento de un LLM, MCP facilita la extracción de información efectiva y dependiente de consultas que supera los sistemas convencionales de búsqueda y recuperación. En lugar de que una herramienta de búsqueda tradicional devuelva un documento completo, un agente puede analizar el texto y extraer la cláusula precisa, figura o declaración que responde directamente a la pregunta compleja de un usuario."

5. **Custom Tool Development:** "Los desarrolladores pueden construir herramientas personalizadas y exponerlas a través de un servidor MCP (ej., usando FastMCP). Esto permite que funciones internas especializadas o sistemas propietarios estén disponibles para LLMs y otros agentes en un formato estandarizado y fácilmente consumible, sin necesidad de modificar el LLM directamente."

6. **Standardized LLM-to-Application Communication:** "MCP garantiza una capa de comunicación consistente entre LLMs y las aplicaciones con las que interactúan. Esto reduce la sobrecarga de integración, promueve la interoperabilidad entre diferentes proveedores de LLM y aplicaciones host, y simplifica el desarrollo de sistemas agénticos complejos."

7. **Complex Workflow Orchestration:** "Al combinar varias herramientas y fuentes de datos expuestos por MCP, los agentes pueden orquestar flujos de trabajo altamente complejos y de múltiples pasos. Un agente podría, por ejemplo, recuperar datos de clientes de una base de datos, generar una imagen de marketing personalizada, redactar un correo electrónico personalizado y luego enviarlo, todo interactuando con diferentes servicios MCP."

8. **IoT Device Control:** "MCP puede facilitar la interacción de LLM con dispositivos del Internet de las Cosas (IoT). Un agente podría usar MCP para enviar comandos a electrodomésticos inteligentes, sensores industriales o robótica, habilitando el control por lenguaje natural y la automatización de sistemas físicos."

9. **Financial Services Automation:** "En servicios financieros, MCP podría permitir a los LLMs interactuar con varias fuentes de datos financieros, plataformas de negociación o sistemas de cumplimiento. Un agente podría analizar datos de mercado, ejecutar operaciones, generar asesoramiento financiero personalizado o automatizar informes regulatorios, todo manteniendo una comunicación segura y estandarizada."

"En resumen, el Model Context Protocol (MCP) permite a los agentes acceder a información en tiempo real de bases de datos, APIs y recursos web. También permite a los agentes realizar acciones como enviar correos electrónicos, actualizar registros, controlar dispositivos y ejecutar tareas complejas integrando y procesando datos de varias fuentes. Adicionalmente, MCP soporta herramientas de generación de medios para aplicaciones de IA."

---

## Sección 7: Código práctico — ADK con MCP Toolset (filesystem)

"Esta sección describe cómo conectarse a un servidor MCP local que proporciona operaciones del sistema de archivos, habilitando a un agente ADK para interactuar con el sistema de archivos local."

**Versión condensada:**

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Create a reliable absolute path to a folder named 'mcp_managed_files'
# within the same directory as this agent script.
TARGET_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_managed_files")

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='filesystem_assistant_agent',
    instruction='Help the user manage their files. You can list files, read files, and write files.',
    tools=[
        MCPToolset(
            connection_params=StdioServerParameters(
                command='npx',
                args=["-y", "@modelcontextprotocol/server-filesystem", TARGET_FOLDER_PATH]
            )
        )
    ]
)
```

**Versión extendida (con `os.makedirs` y comentarios adicionales):**

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# Create a reliable absolute path to a folder named 'mcp_managed_files'
# within the same directory as this agent script.
# This ensures the agent works out-of-the-box for demonstration.
# For production, you would point this to a more persistent and secure location.
TARGET_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_managed_files")

# Ensure the target directory exists before the agent needs it.
os.makedirs(TARGET_FOLDER_PATH, exist_ok=True)

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='filesystem_assistant_agent',
    instruction=('Help the user manage their files. You can list files, read files, and write files. '
                 f'You are operating in the following directory: {TARGET_FOLDER_PATH}'),
    tools=[
        MCPToolset(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",  # Argument for npx to auto-confirm install
                    "@modelcontextprotocol/server-filesystem",
                    # This MUST be an absolute path to a folder.
                    TARGET_FOLDER_PATH,
                ],
                # Optional: You can filter which tools from the MCP server are exposed.
                # For example, to only allow reading:
                # tool_filter=['list_directory', 'read_file']
            )
        )
    ]
)
```

**Nota editorial:** La versión extendida tiene un syntax error: el parámetro `tool_filter` está colocado dentro de `StdioServerParameters` como comentario, pero según la versión condensada y la documentación de ADK, `tool_filter` es un argumento de `MCPToolset`, no de `StdioServerParameters`.

**Sobre npx:** "`npx` (Node Package Execute), incluido con npm (Node Package Manager) versiones 5.2.0 y posteriores, es una utilidad que permite la ejecución directa de paquetes Node.js desde el registro npm. Esto elimina la necesidad de instalación global. En esencia, `npx` sirve como ejecutor de paquetes npm, y se usa comúnmente para ejecutar muchos servidores MCP comunitarios, que se distribuyen como paquetes Node.js."

**Archivo `__init__.py`:** "Crear un archivo `__init__.py` es necesario para garantizar que el archivo `agent.py` sea reconocido como parte de un paquete Python descubrible para el Agent Development Kit (ADK)."

```python
# ./adk_agent_samples/mcp_agent/__init__.py
from . import agent
```

**Conexión con Python3:**

```python
connection_params = StdioConnectionParams(server_params={
    "command": "python3",
    "args": ["./agent/mcp_server.py"],
    "env": {
        "SERVICE_ACCOUNT_PATH": SERVICE_ACCOUNT_PATH,
        "DRIVE_FOLDER_ID": DRIVE_FOLDER_ID
    }
})
```

**Conexión con UVX (Python, entorno temporal aislado):**

```python
connection_params = StdioConnectionParams(server_params={
    "command": "uvx",
    "args": ["mcp-google-sheets@latest"],
    "env": {
        "SERVICE_ACCOUNT_PATH": SERVICE_ACCOUNT_PATH,
        "DRIVE_FOLDER_ID": DRIVE_FOLDER_ID
    }
})
```

**Nota sobre StdioConnectionParams vs StdioServerParameters:** El texto usa `StdioConnectionParams` con `server_params` como dict en los ejemplos Python3/UVX, pero `StdioServerParameters` directamente en los ejemplos principales ADK. Pueden ser APIs distintas o versiones distintas del SDK — el texto no lo clarifica.

---

## Sección 8: Creación de servidor MCP con FastMCP

"FastMCP es un framework Python de alto nivel diseñado para agilizar el desarrollo de servidores MCP. Proporciona una capa de abstracción que simplifica las complejidades del protocolo, permitiendo a los desarrolladores enfocarse en la lógica central. La biblioteca habilita la definición rápida de herramientas, recursos y prompts usando simples decoradores Python. Una ventaja significativa es su generación automática de esquemas, que interpreta inteligentemente las firmas de funciones Python, type hints y cadenas de documentación para construir las especificaciones de interfaz de modelo de IA necesarias. Esta automatización minimiza la configuración manual y reduce el error humano. Más allá de la creación básica de herramientas, FastMCP facilita patrones arquitectónicos avanzados como composición y proxying de servidores. Esto habilita el desarrollo modular de sistemas complejos y de múltiples componentes y la integración fluida de servicios existentes en un marco accesible para IA. Adicionalmente, FastMCP incluye optimizaciones para aplicaciones de IA eficientes, distribuidas y escalables."

**Versión condensada del servidor FastMCP:**

```python
# fastmcp_server.py
from fastmcp import FastMCP

# Initialize the FastMCP server.
mcp_server = FastMCP()

# Define a simple tool function.
# The @mcp_server.tool decorator registers this Python function as an MCP tool.
# The docstring becomes the tool's description for the LLM.
@mcp_server.tool
def greet(name: str) -> str:
    """
    Generates a personalized greeting.
    
    Args:
        name: The name of the person to greet.
    
    Returns:
        A greeting string.
    """
    return f"Hello, {name}! Nice to meet you."

# Run the server
if __name__ == "__main__":
    mcp_server.run(transport="http", host="127.0.0.1", port=8000)
```

**Versión extendida del servidor FastMCP (con `Client` importado):**

```python
# fastmcp_server.py
from fastmcp import FastMCP, Client

# Initialize the FastMCP server.
mcp_server = FastMCP()

@mcp_server.tool
def greet(name: str) -> str:
    """
    Generates a personalized greeting.
    
    Args:
        name: The name of the person to greet.
    
    Returns:
        A greeting string.
    """
    return f"Hello, {name}! Nice to meet you."

# Or if you want to run it from the script:
if __name__ == "__main__":
    mcp_server.run(transport="http",
                   host="127.0.0.1",
                   port=8000)
```

**Nota editorial:** La versión extendida importa `Client` pero no lo usa en ningún lugar del código del servidor. Posible artifact del texto fuente.

---

## Sección 9: Consumir el servidor FastMCP con un agente ADK

**Versión condensada del cliente ADK:**

```python
# ./adk_agent_samples/fastmcp_client_agent/agent.py

import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, HttpServerParameters

# Define the FastMCP server's address.
# Make sure your fastmcp_server.py is running on this port.
FASTMCP_SERVER_URL = "http://localhost:8000"

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='fastmcp_greeter_agent',
    instruction='You are a friendly assistant that can greet people by their name. Use the "greet" tool.',
    tools=[
        MCPToolset(
            connection_params=HttpServerParameters(
                url=FASTMCP_SERVER_URL,
                tool_filter=['greet']  # Only expose the greet tool
            )
        )
    ]
)
```

"Esto requiere configurar `HttpServerParameters` con la dirección de red del servidor FastMCP, que generalmente es `http://localhost:8000`. Se puede incluir un parámetro `tool_filter` para restringir el uso de herramientas del agente a herramientas específicas ofrecidas por el servidor, como 'greet'. Cuando se le solicita con una petición como 'Saluda a John Doe', el LLM integrado del agente identifica la herramienta 'greet' disponible vía MCP, la invoca con el argumento 'John Doe' y devuelve la respuesta del servidor."

---

## Sección 10: At a Glance (What / Why / Rule of Thumb)

**What (problema):** "Para funcionar como agentes efectivos, los LLMs deben ir más allá de la simple generación de texto. Requieren la capacidad de interactuar con el entorno externo para acceder a datos actuales y utilizar software externo. Sin un método de comunicación estandarizado, cada integración entre un LLM y una herramienta o fuente de datos externa se convierte en un esfuerzo personalizado, complejo y no reutilizable. Este enfoque ad-hoc dificulta la escalabilidad y hace difícil y poco eficiente la construcción de sistemas de IA complejos e interconectados."

**Why (solución):** "El Model Context Protocol (MCP) ofrece una solución estandarizada actuando como una interfaz universal entre LLMs y sistemas externos. Establece un protocolo abierto y estandarizado que define cómo se descubren y usan las capacidades externas. Operando en un modelo cliente-servidor, MCP permite a los servidores exponer herramientas, recursos de datos y prompts interactivos a cualquier cliente compatible. Las aplicaciones con LLM actúan como estos clientes, descubriendo e interactuando dinámicamente con recursos disponibles de manera predecible. Este enfoque estandarizado fomenta un ecosistema de componentes interoperables y reutilizables, simplificando dramáticamente el desarrollo de flujos de trabajo agénticos complejos."

**Rule of thumb:** "Utiliza el Model Context Protocol (MCP) cuando construyas sistemas agénticos complejos, escalables o de grado empresarial que necesiten interactuar con un conjunto diverso y en evolución de herramientas externas, fuentes de datos y APIs. Es ideal cuando la interoperabilidad entre diferentes LLMs y herramientas es una prioridad, y cuando los agentes requieren la capacidad de descubrir dinámicamente nuevas capacidades sin ser redesplegados. Para aplicaciones más simples con un número fijo y limitado de funciones predefinidas, el llamado directo a funciones de herramientas puede ser suficiente."

---

## Sección 11: Key Takeaways y Conclusión

**Key Takeaways:**
- "El Model Context Protocol (MCP) es un estándar abierto que facilita la comunicación estandarizada entre LLMs y aplicaciones externas, fuentes de datos y herramientas."
- "Emplea una arquitectura cliente-servidor, definiendo los métodos para exponer y consumir recursos, prompts y herramientas."
- "El Agent Development Kit (ADK) soporta tanto utilizar servidores MCP existentes como exponer herramientas ADK a través de un servidor MCP."
- "FastMCP simplifica el desarrollo y gestión de servidores MCP, particularmente para exponer herramientas implementadas en Python."
- "MCP Tools for Genmedia Services permite a los agentes integrarse con las capacidades de medios generativos de Google Cloud (Imagen, Veo, Chirp 3 HD, Lyria)."
- "MCP permite a los LLMs y agentes interactuar con sistemas del mundo real, acceder a información dinámica y realizar acciones más allá de la generación de texto."

**Conclusión:** "El Model Context Protocol (MCP) es un estándar abierto que facilita la comunicación entre Modelos de Lenguaje Grande (LLMs) y sistemas externos. Emplea una arquitectura cliente-servidor, permitiendo a los LLMs acceder a recursos, utilizar prompts y ejecutar acciones a través de herramientas estandarizadas. MCP permite a los LLMs interactuar con bases de datos, gestionar flujos de trabajo de medios generativos, controlar dispositivos IoT y automatizar servicios financieros. Ejemplos prácticos demuestran cómo configurar agentes para comunicarse con servidores MCP, incluyendo servidores de sistema de archivos y servidores construidos con FastMCP, ilustrando su integración con el Agent Development Kit (ADK). MCP es un componente clave para desarrollar agentes de IA interactivos que se extienden más allá de las capacidades básicas del lenguaje."

---

## Referencias

| Fuente | URL | Tipo |
|--------|-----|------|
| Model Context Protocol (MCP) Documentation | https://modelcontextprotocol.io | Documentación oficial — sin paper |
| ADK MCP Documentation | https://google.github.io/adk-docs/mcp/ | Documentación oficial Google ADK |
| FastMCP Documentation | https://github.com/jlowin/fastmcp | GitHub — sin paper |
| MCP Tools for Genmedia Services | https://google.github.io/adk-docs/mcp/#mcp-servers-for-google-cloud-genmedia | Documentación Google |
| MCP Toolbox for Databases | https://google.github.io/adk-docs/mcp/databases/ | Documentación Google |

**Naturaleza de las referencias:** Todas las referencias son documentación oficial o código abierto — ninguna es paper revisado por pares. El capítulo es el primero en describir infraestructura de protocolo activa (MCP existe y se usa en producción) en lugar de resultados de investigación.

---

## Notas editoriales sobre defectos del texto fuente

1. **Código duplicado (ADK filesystem):** El código del agente ADK para filesystem aparece dos veces — versión condensada y versión extendida con `os.makedirs` y comentarios adicionales.

2. **Código duplicado (FastMCP servidor):** El servidor FastMCP también aparece dos veces — versión condensada y versión extendida (con `Client` importado pero no usado).

3. **Inconsistencia `StdioConnectionParams` vs `StdioServerParameters`:** Los ejemplos Python3/UVX usan `StdioConnectionParams(server_params={...})` (dict), mientras los ejemplos principales usan `StdioServerParameters(command=..., args=...)` — posiblemente APIs distintas del SDK.

4. **`tool_filter` en lugar incorrecto:** En la versión extendida del ADK filesystem, `tool_filter` aparece comentado dentro de `StdioServerParameters` donde no corresponde — es argumento de `MCPToolset`.

5. **`Client` importado sin uso:** En la versión extendida del servidor FastMCP, `from fastmcp import FastMCP, Client` importa `Client` que no se usa en el código del servidor.
