```yml
created_at: 2026-04-19 06:58:22
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Capítulo 10: Protocolo de Contexto de Modelo (MCP) — Versión Corregida Calibrada" (documento externo, 2026-04-19)
nota: Versión revisada del capítulo original. Diferencias clave vs. versión original: (1) claim de complejidad reformulado con tabla antes/después y estimación de líneas de código, (2) tabla comparativa corrige "dynamic discovery" → "descubrimiento de funciones dentro de servidores configurados", (3) servicios financieros re-etiquetado como ANTI-PATRÓN NO RECOMENDADO con patrón correcto propuesto, (4) IoT y flujos multi-paso con requisitos críticos explícitos, (5) Ejemplo 4 nuevo: código de producción con retry, timeout, logging, (6) sección nueva "Gap Desarrollo vs. Producción", (7) código de ejemplos 1-3 sin duplicados ni imports sin uso.
```

# Input: Cap.10 MCP — Versión Corregida Calibrada (texto completo, preservado verbatim)

---

## Sección 1: Introducción

"Para que los Modelos de Lenguaje Grande (LLMs) funcionen efectivamente como agentes de IA, sus capacidades deben extenderse más allá de la simple generación de contenido multimodal.

La interacción con el entorno externo es indispensable. Los agentes necesitan acceso a información actualizada en tiempo real, capacidad de utilizar software y sistemas externos, y la posibilidad de ejecutar tareas operacionales específicas del mundo real.

El Protocolo de Contexto de Modelo (MCP) aborda esta necesidad proporcionando una interfaz estandarizada para que los LLMs se conecten e interactúen de manera consistente con recursos externos.

Este protocolo actúa como un mecanismo central que facilita integración consistente y predecible."

---

## Sección 2: Descripción General del Patrón MCP

"Considérese un adaptador universal que permite a cualquier LLM conectarse a cualquier sistema externo, base de datos o herramienta sin necesidad de crear una integración personalizada para cada caso de uso. Eso es esencialmente lo que representa el Protocolo de Contexto de Modelo (MCP). Se trata de un estándar abierto diseñado para estandarizar la comunicación entre LLMs como Gemini, los modelos GPT de OpenAI, Mixtral y Claude con aplicaciones externas, fuentes de datos y herramientas. Considérese como un mecanismo de conexión universal que simplifica radicalmente cómo los LLMs obtienen contexto, ejecutan acciones e interactúan con diversos sistemas y plataformas."

---

## Sección 3: Reducción de Complejidad mediante Estandarización (NUEVO)

"Un beneficio crítico de MCP es la REDUCCIÓN DRAMÁTICA en complejidad de ACOPLAMIENTO, aunque no en complejidad conceptual.

ANTES (sin MCP):
• Cada integración LLM + Herramienta requiere código propietario único (200-500 líneas)
• El LLM está fuertemente acoplado con la lógica de cada herramienta
• Agregar una nueva herramienta requiere modificar el código del LLM

CON MCP:
• Cada integración sigue un patrón genérico reutilizable (50-100 líneas)
• El LLM está desacoplado de la lógica de cada herramienta (comunicación estandarizada)
• Agregar una nueva herramienta NO requiere modificar el código del LLM

El resultado es una reducción dramática en TRABAJO Y ACOPLAMIENTO, aunque las 8 consideraciones arquitectónicas (seguridad, error handling, etc.) siguen siendo necesarias. MCP estandariza CÓMO se resuelven, no que deban resolverse."

---

## Sección 4: Arquitectura Técnica

"MCP funciona bajo una arquitectura cliente-servidor. Define cómo diferentes componentes (datos estáticos denominados recursos, plantillas interactivas que son esencialmente indicaciones, y funciones ejecutables conocidas como herramientas) son expuestos por un servidor MCP. Estos son consumidos por un cliente MCP, que puede ser una aplicación anfitriona de LLM o un agente de IA independiente. Este enfoque estandarizado reduce dramáticamente la complejidad de integrar LLMs en entornos operacionales diversos y heterogéneos."

"Sin embargo, MCP representa un contrato para una 'interfaz agentica', y su efectividad depende en gran medida del diseño de las APIs subyacentes que expone. Existe un riesgo significativo de que los desarrolladores simplemente encapsulen APIs existentes y heredadas sin realizar mejoras, lo que puede resultar en un rendimiento subóptimo del agente. Por ejemplo, si la API de un sistema de gestión de tickets solo permite recuperar detalles completos de un ticket a la vez, un agente encargado de resumir tickets de alta prioridad será ineficiente e impreciso cuando deba procesar grandes volúmenes de datos. Para ser verdaderamente efectivo, la API subyacente debe mejorarse agregando características deterministas como filtrado y ordenamiento, lo que permitirá que el agente no-determinista trabaje de manera eficiente. Esto subraya un aspecto crítico: los agentes no reemplazan automáticamente los flujos de trabajo deterministas existentes; de hecho, a menudo requieren soporte determinista más robusto y bien diseñado para tener éxito."

"Además, MCP puede encapsular una API cuya entrada o salida aún no es inherentemente comprensible para el agente. Una API es útil solo si su formato de datos es compatible y consumible por agentes, una garantía que MCP en sí no asegura. Por ejemplo, crear un servidor MCP para un almacén de documentos que devuelve archivos en formato PDF es prácticamente inútil si el agente que lo consume no puede procesar ni interpretar contenido PDF. Un enfoque superior sería crear primero una API que devuelva una representación textual legible del documento, como Markdown, que el agente pueda realmente leer y procesar de manera efectiva. Esto demuestra que los desarrolladores deben considerar no solo la conexión técnica, sino también la naturaleza fundamental de los datos intercambiados para asegurar compatibilidad verdadera entre sistemas y agentes."

---

## Sección 5: Comparación: MCP versus Llamadas a Función de Herramientas

"El Protocolo de Contexto de Modelo (MCP) y las llamadas a funciones de herramientas son mecanismos distintos que permiten a los LLMs interactuar con capacidades externas (incluyendo herramientas) y ejecutar acciones en sistemas remotos.

Aunque ambos mecanismos sirven para extender las capacidades de los LLMs más allá de la generación simple de texto, se diferencian fundamentalmente en su enfoque arquitectónico y en el nivel de abstracción que proporcionan."

**Tabla Comparativa: Análisis Detallado (versión corregida)**

| Característica | Llamadas a Función de Herramienta | Protocolo de Contexto de Modelo (MCP) |
|---|---|---|
| Estandarización | Propietaria y específica del proveedor. El formato e implementación difieren significativamente entre proveedores de LLM. | Protocolo abierto y estandarizado, promoviendo interoperabilidad entre LLMs y herramientas diferentes. |
| Alcance | Mecanismo directo para que un LLM solicite la ejecución de una función específica y predefinida. | Marco integral para la forma en que LLMs y herramientas externas se descubren y comunican. |
| Arquitectura | Interacción uno-a-uno entre el LLM y la lógica de manejo de herramientas de la aplicación. | Arquitectura cliente-servidor donde aplicaciones potenciadas por LLM (clientes) pueden conectarse y utilizar múltiples servidores MCP (herramientas). |
| Descubrimiento | El LLM recibe información explícita sobre qué herramientas están disponibles dentro del contexto de una conversación específica. | **El cliente MCP puede descubrir funciones disponibles DENTRO de servidores previamente configurados consultando su manifiesto. Nota: El descubrimiento de servidores mismos requiere configuración explícita previa.** |
| Reutilización | Las integraciones de herramientas frecuentemente están acopladas fuertemente con la aplicación específica y el LLM que se está utilizando. | Promueve el desarrollo de "servidores MCP" reutilizables y autónomos que pueden ser accedidos por cualquier aplicación conforme. |
| Casos de Uso Ideales | **Aplicaciones simples con un número limitado y fijo de funciones predefinidas. Overhead bajo.** | **Ecosistemas grandes con múltiples herramientas, necesidad de escalabilidad y reutilización entre aplicaciones.** |
| Tradeoff | **Menor complejidad inicial; mayor acoplamiento a largo plazo.** | **Mayor complejidad inicial; menor acoplamiento y mayor escalabilidad a largo plazo.** |

**Nota editorial:** La columna "Descubrimiento" para MCP en esta versión corregida incluye explícitamente: "El descubrimiento de servidores mismos requiere configuración explícita previa." Esto corrige el claim de "dynamic discovery" de la versión original. La tabla también agrega filas nuevas: "Casos de Uso Ideales" y "Tradeoff" — ausentes en la versión original.

"En síntesis, las llamadas a función proporcionan acceso directo a funciones específicas con bajo overhead inicial, mientras que MCP es el marco de comunicación estandarizado que permite a los LLMs descubrir y utilizar una amplia gama de recursos externos con mejor escalabilidad. Para aplicaciones simples con requisitos limitados, las herramientas específicas son suficientes y preferibles; para sistemas de IA complejos e interconectados que requieren adaptabilidad y reutilización entre equipos, un estándar universal como MCP es esencial."

---

## Sección 6: Consideraciones Técnicas Críticas

"Aunque MCP presenta un marco arquitectónico sólido, una evaluación completa requiere considerar varios aspectos técnicos y operacionales cruciales."

**Clasificación de Componentes:** "Un recurso constituye información estática (un archivo PDF, un registro de base de datos). Una herramienta es una función ejecutable que realiza una acción (enviar correo electrónico, consultar una API). Una indicación es una plantilla que orienta al LLM sobre cómo interactuar con un recurso o herramienta."

**Descubribilidad Dinámica de Funciones:** "Una ventaja significativa de MCP es que un cliente MCP puede consultar dinámicamente un servidor para determinar qué funciones y recursos ofrece. Este mecanismo de descubrimiento 'bajo demanda' resulta especialmente valioso para agentes que requieren adaptarse a nuevas funciones sin ser redesplegados o reconfigurados. Sin embargo, el descubrimiento de servidores mismos requiere configuración previa."

**Nota editorial:** La frase "Sin embargo, el descubrimiento de servidores mismos requiere configuración previa" es nueva respecto a la versión original — corrección directa del problema identificado.

**Requisitos de Seguridad:** "Exponer herramientas y datos a través de cualquier protocolo requiere medidas de seguridad robustas y verificables. Una implementación de MCP debe incorporar mecanismos de autenticación y autorización para controlar qué clientes pueden acceder a qué servidores y qué acciones específicas se les permite realizar."

**Complejidad de Implementación:** "Aunque MCP es un estándar abierto, su implementación puede presentar complejidad considerable. Sin embargo, los proveedores principales están simplificando este proceso progresivamente. Por ejemplo, proveedores de modelos como Anthropic y OpenAI ofrecen SDKs que abstraen una porción significativa del código repetitivo."

**Estrategia de Gestión de Errores:** "Una estrategia integral de gestión de errores es crítica para la confiabilidad operacional. El protocolo debe definir explícitamente cómo se comunican los errores de vuelta al LLM para que pueda comprender el fallo e intentar potencialmente una estrategia alternativa."

**Opciones de Despliegue:** "Los servidores MCP pueden ser desplegados localmente en la misma máquina que el agente o remotamente en un servidor distinto."

**Modos de Operación:** "MCP puede soportar tanto sesiones bajo demanda interactivas como procesamiento en lote a mayor escala."

**Mecanismo de Transporte:** "El protocolo especifica las capas de transporte subyacentes para comunicación. Para interacciones locales, utiliza JSON-RPC sobre STDIO (entrada/salida estándar) para comunicación eficiente entre procesos. Para conexiones remotas, aprovecha protocolos compatibles con web como HTTP de flujo continuo y Eventos Enviados por el Servidor (SSE)."

---

## Sección 7: Flujo de Interacción MCP

Los 5 pasos del flujo (Discovery → Request Formulation → Client Communication → Server Execution → Response and Context Update) — idénticos a la versión original.

---

## Sección 8: Aplicaciones Operacionales — Casos de Uso Válidos y Limitaciones (REVISADO)

"MCP amplía significativamente las capacidades de IA/LLM, haciéndolas más versátiles y computacionalmente potentes. Sin embargo, cada caso de uso tiene requisitos específicos que deben cumplirse para que sea operacionalmente viable."

### Casos marcados como VÁLIDOS:

1. **Integración de Bases de Datos:** "Este caso es VÁLIDO y recomendable cuando los datos no requieren garantías transaccionales críticas."

2. **Orquestación de Generación de Medios:** "Este caso es VÁLIDO cuando no se requiere edición posterior o reversibilidad."

3. **Integración de APIs Externas:** "Este caso es VÁLIDO cuando la API tiene manejo de errores y reintentos incorporado."

4. **Extracción de Información:** "Este caso es VÁLIDO para análisis de contenido estático."

5. **Desarrollo de Herramientas Especializadas:** "Este caso es VÁLIDO cuando las herramientas tienen interfaces claramente definidas."

6. **Comunicación Estandarizada LLM-Aplicación:** "Este caso es VÁLIDO como beneficio transversal."

### Caso con REQUISITO CRÍTICO EXPLÍCITO:

7. **Orquestación de Flujos de Trabajo Multi-Paso:**

"REQUISITO CRÍTICO PARA ESTE CASO: Aislamiento transaccional entre pasos.
• Si el paso 2 (generación de imagen) falla, ¿qué ocurre con el paso 1 (datos recuperados)?
• Si se reintenta el flujo, ¿ocurren todos los pasos de nuevo (idempotencia)?
• ¿Puede revertirse el flujo después de iniciarse (compensación)?

RECOMENDACIÓN: Este caso es VÁLIDO SOLO si se implementan garantías de aislamiento. Sin ellas, el cliente puede recibir correo sin imagen, generando insatisfacción."

8. **Control de Dispositivos IoT:**

"REQUISITOS CRÍTICOS PARA ESTE CASO:
• Confirmación de entrega: ¿Se recibió el comando en el dispositivo?
• Reintentos exponenciales: La latencia de red es variable; se necesita reintentos
• Verificación de estado anterior: ¿En qué estado estaba el dispositivo antes del comando?
• Timeout explícito: ¿Cuánto tiempo espera antes de considerarlo fallido?
• Logging completo: Auditoría de cada comando ejecutado

RECOMENDACIÓN: Este caso es VÁLIDO SOLO si se implementan estos requisitos. Sin ellos, los comandos pueden perderse o el agente puede asumir estados incorrectos."

### Caso re-clasificado como ANTI-PATRÓN (NUEVO):

9. **Automatización en Servicios Financieros — ANTI-PATRÓN NO RECOMENDADO:**

"MCP NO DEBE SER NUNCA el ejecutor directo de transacciones financieras sin garantías específicas.

CLAIM PROBLEMÁTICO: 'Un agente podría analizar datos de mercado, ejecutar operaciones, generar asesoramiento financiero personalizado o automatizar reportes regulatorios.'

REALIDAD: Si MCP ejecuta transacciones directamente, se pierden garantías críticas.

REQUISITOS QUE MCP NO PUEDE CUMPLIR POR SÍ SOLO:
• Transacciones ACID: Atomicidad (todo o nada), Consistencia, Aislamiento, Durabilidad
• Auditoría completa: Cada movimiento debe registrarse para reguladores
• Firma digital del usuario: No es el agente quien autoriza, es el usuario
• Reversibilidad: ¿Puede cancelarse una transacción después de 24 horas?
• Compliance: Límites de operación, prohibiciones regulatorias

PATRÓN CORRECTO para servicios financieros:

Fase 1 (AGENTE VÍA MCP): Análisis
  └─ Agente analiza datos de mercado usando MCP
  └─ Agente formula propuesta de transacción (recomendación)
  └─ Agente PROPONE pero NO ejecuta

Fase 2 (USUARIO): Autorización
  └─ Usuario revisa propuesta
  └─ Usuario FIRMA digitalmente (no agente)
  └─ Usuario confirma la transacción

Fase 3 (SISTEMA): Ejecución
  └─ Sistema ejecuta transacción (garantías ACID)
  └─ Sistema registra para auditoría
  └─ Sistema verifica compliance

RECOMENDACIÓN FINAL: MCP es EXCELENTE para Fase 1 (análisis). MCP es COMPLETAMENTE INADECUADO para Fase 3 (ejecución) sin capas adicionales de garantía."

---

## Sección 9: Código — Ejemplos Corregidos

### Ejemplo 1: Filesystem Agent (sin duplicados, con nota de DESARROLLO)

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

TARGET_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_managed_files")

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='filesystem_assistant_agent',
    instruction='Ayuda al usuario a gestionar sus archivos. Puedes listar archivos, leer archivos y escribir archivos.',
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

"NOTA IMPORTANTE: Este ejemplo es válido para DESARROLLO LOCAL. En PRODUCCIÓN, se requieren consideraciones adicionales (véase sección 'Gap Desarrollo-Producción')."

### Ejemplo 2: Servidor FastMCP (sin importación Client sin uso)

```python
# fastmcp_server.py
from fastmcp import FastMCP

mcp_server = FastMCP()

@mcp_server.tool
def greet(name: str) -> str:
    """
    Genera un saludo personalizado.
    
    Args:
        name: El nombre de la persona a saludar.
    
    Returns:
        Una cadena de saludo.
    """
    return f"¡Hola, {name}! Mucho gusto."

if __name__ == "__main__":
    mcp_server.run(transport="http", host="127.0.0.1", port=8000)
```

### Ejemplo 3: Cliente ADK con FastMCP (tool_filter en MCPToolset — posición correcta)

```python
# ./adk_agent_samples/fastmcp_client_agent/agent.py

import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, HttpServerParameters

FASTMCP_SERVER_URL = "http://localhost:8000"

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='fastmcp_greeter_agent',
    instruction='Eres un asistente amigable que puede saludar a personas por su nombre. Usa la herramienta "greet".',
    tools=[
        MCPToolset(
            connection_params=HttpServerParameters(
                url=FASTMCP_SERVER_URL,
                tool_filter=['greet']  # Solo exponer la herramienta greet
            )
        )
    ]
)
```

### Ejemplo 4: Código Robusto para Producción (NUEVO)

```python
# fastmcp_production_client.py

import asyncio
import logging
from functools import wraps
from typing import Any, Callable, TypeVar
import aiohttp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

T = TypeVar('T')

def with_retry_and_logging(
    max_retries: int = 3,
    timeout_sec: float = 5.0,
    backoff_base: float = 2.0
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorador para manejar reintentos, timeout y logging en llamadas MCP."""
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    logger.info(f'[{func.__name__}] Intento {attempt+1}/{max_retries}')
                    
                    result = await asyncio.wait_for(
                        func(*args, **kwargs),
                        timeout=timeout_sec
                    )
                    
                    logger.info(f'[{func.__name__}] Éxito en intento {attempt+1}')
                    return result
                    
                except asyncio.TimeoutError as e:
                    last_error = e
                    logger.warning(f'[{func.__name__}] Timeout en intento {attempt+1}')
                    
                    if attempt < max_retries - 1:
                        wait_time = backoff_base ** attempt
                        logger.info(f'[{func.__name__}] Esperando {wait_time}s antes de reintentar')
                        await asyncio.sleep(wait_time)
                    
                except Exception as e:
                    last_error = e
                    logger.error(f'[{func.__name__}] Error en intento {attempt+1}: {type(e).__name__}: {e}')
                    
                    if attempt < max_retries - 1:
                        wait_time = backoff_base ** attempt
                        await asyncio.sleep(wait_time)
            
            logger.error(f'[{func.__name__}] Falló después de {max_retries} intentos. Error final: {last_error}')
            raise RuntimeError(f'{func.__name__} falló después de {max_retries} intentos') from last_error
        
        return wrapper
    return decorator

class MCP_ProductionClient:
    """Cliente MCP con garantías de producción."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    @with_retry_and_logging(max_retries=3, timeout_sec=5.0)
    async def call_tool(self, tool_name: str, **params) -> dict:
        """Llamar herramienta con reintentos y timeout."""
        if not self.session:
            raise RuntimeError("Session no inicializada. Usa 'async with'")
        
        payload = {
            'jsonrpc': '2.0',
            'method': tool_name,
            'params': params,
            'id': 1
        }
        
        async with self.session.post(
            f'{self.base_url}/rpc',
            json=payload
        ) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                raise RuntimeError(f'HTTP {resp.status}: {await resp.text()}')
```

"Este ejemplo demuestra patrones CRÍTICOS para código de PRODUCCIÓN:
• Logging completo de cada operación
• Reintentos exponenciales con backoff
• Timeout explícito
• Context managers para gestión de recursos
• Manejo estructurado de errores

SIN estos patrones, el código de ejemplo 1-3 fallará silenciosamente en producción."

---

## Sección 10: Gap Desarrollo vs. Producción (NUEVO)

"Los ejemplos 1-3 funcionan para DESARROLLO LOCAL. En PRODUCCIÓN, se requieren capas adicionales que NO se mencionan en el capítulo original:

DESARROLLO (ejemplos del capítulo):
  ✓ Servidor hardcodeado (command='npx', url='http://localhost:8000')
  ✓ Error handling básico
  ✓ Timeout no especificado (espera indefinida)
  ✓ Sin logging persistente

PRODUCCIÓN (requisitos):
  ✗ Service discovery: ¿Dónde están los servidores?
  ✗ Load balancing: ¿Cómo distribuir carga?
  ✗ Health checks: ¿Está el servidor vivo?
  ✗ Logging centralizado: ¿Dónde se guardan logs?
  ✗ Monitoreo de errores: ¿Alertas en caso de fallo?
  ✗ Política de reintentos: Exponencial con backoff
  ✗ Circuit breaker: ¿Cuándo dejar de intentar?

RECOMENDACIÓN: Al adoptar MCP en producción, asignar 60-70% del esfuerzo a estas capas, no solo al código de MCP básico."

---

## Sección 11: Síntesis y Conclusiones

"Para funcionar como agentes efectivos, los LLMs deben transcender la generación simple de texto. Requieren capacidad de interactuar con el entorno externo para acceder a información contemporánea y utilizar software externo. Sin un método de comunicación estandarizado, cada integración entre un LLM y una herramienta o fuente de datos externa se convierte en un esfuerzo personalizado, complejo y no reutilizable."

"El Protocolo de Contexto de Modelo (MCP) es aplicable cuando se construyen sistemas agenticos complejos, escalables o de nivel empresarial que requieren interactuar con un conjunto diverso y en evolución de herramientas externas, fuentes de datos y APIs. Resulta particularmente valioso cuando la interoperabilidad entre LLMs y herramientas distintas es una prioridad crítica, y cuando los agentes requieren capacidad de descubrir dinámicamente nuevas funciones sin necesidad de redesplegarse.

Para aplicaciones simples con requisitos limitados y un número fijo de funciones predefinidas, las llamadas directas a funciones de herramientas pueden resultar suficientes y preferibles por su menor overhead inicial."

---

## Referencias

| Fuente | URL | Tipo |
|--------|-----|------|
| MCP Documentation | https://modelcontextprotocol.io/ | Documentación oficial |
| FastMCP Documentation | https://github.com/jlowin/fastmcp | GitHub |
| MCP Tools para Genmedia Services | https://google.github.io/adk-docs/mcp/#mcp-servers-for-google-cloud-genmedia | Documentación Google |
| MCP Toolbox para Databases | https://google.github.io/adk-docs/mcp/databases/ | Documentación Google |

**Naturaleza de las referencias:** Idéntica a la versión original — documentación oficial y código abierto, sin papers revisados por pares.

---

## Resumen de cambios vs. versión original (mcp-pattern-input.md)

| Elemento | Versión original | Esta versión corregida |
|----------|-----------------|------------------------|
| Claim de complejidad | "reduce dramáticamente" sin cuantificar | Tabla ANTES/DESPUÉS con estimación de líneas (200-500 → 50-100) |
| Tabla comparativa — Descubrimiento | "descubrimiento dinámico" (implica servidores) | Corregido: "funciones dentro de servidores configurados; servidores requieren config. explícita" |
| Tabla comparativa | Sin filas Tradeoff ni Casos de Uso Ideales | Agrega ambas filas con tradeoffs explícitos |
| Servicios financieros | Caso de uso genérico como los demás | Re-clasificado como ANTI-PATRÓN con patrón correcto de 3 fases |
| IoT | Caso genérico | VÁLIDO SOLO CON 5 requisitos críticos explícitos |
| Flujos multi-paso | Caso genérico | VÁLIDO SOLO CON aislamiento transaccional |
| Código de producción | Ausente | Ejemplo 4 nuevo con retry, timeout, logging, context manager |
| Gap desarrollo/producción | Ausente | Nueva sección con 7 requisitos de producción explícitos |
| Duplicaciones de código | 2 versiones de cada ejemplo (condensada + extendida) | Una sola versión por ejemplo |
| Imports sin uso | `Client` importado en versión extendida FastMCP | Eliminado |
| StdioConnectionParams | Presente en ejemplos Python3/UVX | No incluido en esta versión |
