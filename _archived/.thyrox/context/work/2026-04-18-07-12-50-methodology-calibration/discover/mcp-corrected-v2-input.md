```yml
created_at: 2026-04-19 07:16:35
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "CAPÍTULO 10: PROTOCOLO DE CONTEXTO DE MODELO (MCP) — Versión Calibrada 2.0" (documento externo, 2026-04-19)
nota: |
  Tercera versión del capítulo analizado. Historial:
  - Original: 65% PARCIALMENTE CALIBRADO (mcp-pattern-input.md)
  - V1 Corregida: 79% CALIBRADO — PARCHE SOFISTICADO (mcp-corrected-input.md)
  - V2 Calibrada 2.0: Esta versión. Header declara "Resultado V1: 79% (SUPERA GATE) | V2: Fixes aplicados"

  Cambios documentados respecto a V1:
  1. Header cambia "CALIBRACIÓN OBJETIVO: 0.75+" a "Versión Calibrada 2.0" con scores históricos
  2. Sec.1: "reduce dramáticamente la COMPLEJIDAD" → "REDUCCIÓN DRAMÁTICA en ACOPLAMIENTO y REPETICIÓN, aunque NO en COMPLEJIDAD CONCEPTUAL"
  3. Sec.1 tabla cuantitativa más detallada: desglosada en TRABAJO/ACOPLAMIENTO/COMPLEJIDAD
  4. Tabla comparativa: fila "Descubrimiento de FUNCIONES" / "Descubrimiento de SERVIDORES" separadas
  5. Tabla comparativa: nuevas filas "Casos ideales" y "Tradeoff" con criterios explícitos
  6. Sec.2 agrega "Interpretación honesta" — cuando Tool Calling es SUPERIOR
  7. Sec.3 agrega "CLARIFICACIÓN: Parámetro tool_filter (FIX BUG 3)" completa
  8. Casos de uso en 3 categorías: A (Válidos), B (Con requisitos críticos), C (Anti-patrones)
  9. Servicios financieros: cada requisito explica POR QUÉ MCP no lo cumple + veredictos por fase
  10. Gap Desarrollo vs. Producción: agrega 8vo requisito (Rate Limiting) + allocación de esfuerzo 20-30%/60-70%
  11. Ejemplo 4: TypeVar T explícito en type hints del decorador; sin bug del original V1
  12. Conclusión: "VERDAD FUNDAMENTAL" con 3 afirmaciones precisas + "CUÁNDO MCP NO DEBE USARSE"

  Bugs declarados corregidos por el autor:
  - FIX BUG 1: Ejemplo 4 decorador async correcto (Awaitable en type hints, async_wrapper)
  - FIX BUG 2: Nota sobre discovery en Sec.1
  - FIX BUG 3: Clarificación tool_filter en Sec.3
```

# Input: Capítulo 10 — MCP Versión Calibrada 2.0 (texto completo, preservado verbatim)

---

## Header del documento

```
CAPÍTULO 10: PROTOCOLO DE CONTEXTO DE MODELO (MCP)
Versión Calibrada 2.0 — Calibración Objetivo: 0.75+
Resultado V1: 79% (SUPERA GATE) | V2: Fixes aplicados
```

---

## INTRODUCCIÓN

Para que los Modelos de Lenguaje Grande (LLMs) funcionen efectivamente como
agentes, sus capacidades deben extenderse más allá de la generación de contenido.
Los agentes necesitan acceso a información actualizada, capacidad de utilizar
sistemas externos y ejecutar tareas operacionales específicas.

El Protocolo de Contexto de Modelo (MCP) aborda esta necesidad proporcionando
una INTERFAZ ESTANDARIZADA para que LLMs se conecten a recursos externos de
manera consistente y predecible.

---

## SECCIÓN 1: DESCRIPCIÓN GENERAL DEL PATRÓN MCP

Considérese un adaptador universal que permite a cualquier LLM conectarse a
cualquier sistema externo, base de datos o herramienta sin necesidad de crear
una integración personalizada para cada caso de uso. Eso es esencialmente lo
que representa el Protocolo de Contexto de Modelo (MCP).

Se trata de un estándar abierto diseñado para estandarizar la comunicación
entre LLMs (Gemini, GPT, Mixtral, Claude) y aplicaciones externas, fuentes de
datos y herramientas.

**NOTA CRÍTICA (FIX BUG 2):**
MCP estandariza la COMUNICACIÓN con servidores ya configurados. No elimina
la necesidad de configuración previa de servidores. El "descubrimiento
dinámico" de MCP aplica a FUNCIONES dentro de servidores conocidos, no a
DESCUBRIMIENTO de nuevos servidores (que requiere configuración explícita).

### Beneficio Crítico: Reducción de Acoplamiento mediante Estandarización

Un beneficio significativo de MCP es la REDUCCIÓN DRAMÁTICA en ACOPLAMIENTO
y REPETICIÓN, aunque NO en COMPLEJIDAD CONCEPTUAL.

**Comparación cuantitativa:**

**ANTES (sin MCP):**
- Integración LLM + Herramienta A: 200-500 líneas de código único
- Integración LLM + Herramienta B: 200-500 líneas de código único (diferente)
- Integración LLM + Herramienta C: 200-500 líneas de código único (diferente)
- Acoplamiento: El LLM está fuertemente vinculado con cada herramienta
- Agregar herramienta N: Requiere modificación del código del LLM

**CON MCP:**
- Integración LLM + Servidor MCP A: 50 líneas (patrón genérico)
- Integración LLM + Servidor MCP B: 50 líneas (mismo patrón)
- Integración LLM + Servidor MCP C: 50 líneas (mismo patrón)
- Acoplamiento: El LLM es agnóstico respecto a cada herramienta
- Agregar herramienta N: NO requiere modificación del código del LLM

**Resultado:**
- TRABAJO REQUERIDO: Redujo de 600+ líneas a 150 líneas + patrón genérico
- ACOPLAMIENTO: Redujo significativamente
- COMPLEJIDAD CONCEPTUAL: Las 8 consideraciones técnicas siguen siendo 8

Por tanto, MCP "reduce dramáticamente" el TRABAJO Y ACOPLAMIENTO, aunque no
la COMPLEJIDAD ARQUITECTÓNICA fundamental (véase Sección 2: Consideraciones).

### Advertencias Honestas — Lo que MCP NO reemplaza

Es crítico reconocer que MCP NO reemplaza automáticamente los flujos de trabajo
deterministas existentes. De hecho, a menudo REQUIERE flujos deterministas más
robusto y bien diseñado para tener éxito.

**Ejemplo concreto: Sistema de gestión de tickets**

Un sistema de gestión de tickets expone una API que recupera COMPLETAMENTE un
ticket a la vez, sin opciones de filtrado o ordenamiento. Un agente encargado
de resumir tickets de alta prioridad usando esta API será INEFICIENTE e
IMPRECISO porque:

1. Problema concreto: API permite solo recuperación completa (1 ticket/llamada)
2. Consecuencia específica: Agente debe hacer N llamadas para procesamiento
3. Fallo resultante: Agente es lento (latencia) e impreciso (pérdida de contexto)
4. Razonamiento causal: Lento PORQUE debe hacer muchas llamadas

La solución NO es agregar MCP a un API débil. Es MEJORAR el API primero
agregando filtrado, ordenamiento y búsqueda. ENTONCES MCP es efectivo.

Además, MCP puede encapsular una API cuya salida no es inherentemente
comprensible para el agente. Una API es útil para agentes solo si su formato
de datos es compatible y consumible. Por ejemplo, un servidor MCP para un
almacén de documentos que devuelve archivos PDF es prácticamente inútil si el
agente no puede procesar PDF. Un enfoque superior sería que la API devuelva
Markdown legible.

**VEREDICTO CLAVE:** Los desarrolladores deben considerar NO SOLO la conexión
técnica (MCP), sino también la NATURALEZA FUNDAMENTAL de los datos y flujos
para asegurar compatibilidad verdadera.

---

## SECCIÓN 2: TABLA COMPARATIVA — MCP vs. TOOL CALLING

| CARACTERÍSTICA | TOOL CALLING | MCP |
|---|---|---|
| Estandarización | Propietaria (cada proveedor LLM implementa diferente) | Abierta y estandarizada |
| Alcance | Directa: LLM → Función específica | Integral: Descubrimiento, comunicación, composición |
| Arquitectura | Uno-a-uno (LLM ↔ Aplicación) | Cliente-servidor (LLM ↔ Múltiples servidores) |
| Descubrimiento de FUNCIONES | Explícito (lista en contexto) | Dinámico (consulta manifiesto servidor) |
| Descubrimiento de SERVIDORES | Requiere configuración previa | Requiere configuración previa (igual) |
| Reutilización | Acoplada a aplicación específica | Reutilizable en múltiples aplicaciones |
| Casos ideales | Aplicaciones simples, conjunto FIJO de funciones | Ecosistemas complejos, conjunto CAMBIANTE de funciones |
| Tradeoff | Bajo overhead inicial; acoplamiento a largo plazo | Mayor overhead inicial; mejor escalabilidad |

### Interpretación honesta

**Tool calling es SUPERIOR para:**
- Aplicaciones con 1-5 funciones predefinidas
- Bajo overhead es prioritario
- Conjunto de funciones nunca cambia

**MCP es SUPERIOR para:**
- Ecosistemas con 10+ herramientas
- Reutilización entre aplicaciones es prioritaria
- Conjunto de funciones cambia regularmente

Ambos requieren configuración previa de SERVIDORES. La diferencia es en cómo
se descubren las FUNCIONES una vez el servidor está configurado.

---

## SECCIÓN 3: CONSIDERACIONES TÉCNICAS CRÍTICAS

Aunque MCP presenta un marco arquitectónico sólido, su implementación exitosa
requiere resolver estas 8 consideraciones:

1. **CLASIFICACIÓN DE COMPONENTES**
   - Recurso: Información estática (archivo, registro de BD)
   - Herramienta: Función ejecutable que realiza acción
   - Indicación: Plantilla que guía al LLM en interacción
   - Importancia: Confundir estos resulta en agentes ineficientes.

2. **DESCUBRIBILIDAD DINÁMICA DE FUNCIONES**
   - Ventaja: Cliente MCP consulta servidor para enumerar funciones disponibles
   - Limitación: El servidor mismo debe estar preconfigurado previamente
   - Relevancia: Esto permite adaptabilidad sin redesplegue del agente.

3. **REQUISITOS DE SEGURIDAD**
   - Necesidad: Autenticación (¿quién?) y autorización (¿qué puede?)
   - Crítico: Especialmente en entornos compartidos o multi-tenant
   - Implementación: Debe ser verificable y auditable.

4. **COMPLEJIDAD DE IMPLEMENTACIÓN**
   - Realidad: Implementar MCP correctamente es complejo
   - Mitigación: SDKs de proveedores reducen trabajo (Anthropic, OpenAI, Google)
   - Trade: Más complejidad inicial que tool calling simple.

5. **ESTRATEGIA DE GESTIÓN DE ERRORES**
   - Necesidad: Cómo se comunican errores (timeouts, fallos de servidor, etc.)
   - Crítico: El agente debe entender por qué falló para intentar alternativa
   - Patrón: Errores estructurados, no solo texto genérico.

6. **OPCIONES DE DESPLIEGUE**
   - Local: Servidor en misma máquina (mejor latencia y privacidad)
   - Remoto: Servidor en máquina distinta (escalabilidad, acceso compartido)
   - Hybrid: Ambos patrones en la misma arquitectura
   - Decisión: Depende de escala, latencia, y requisitos de datos.

7. **MODOS DE OPERACIÓN**
   - Interactivo: Respuestas bajo demanda en tiempo real
   - Batch: Procesamiento en lote a mayor escala
   - Elección: Depende de patrones de uso y latencia aceptable.

8. **MECANISMO DE TRANSPORTE**
   - Local: JSON-RPC sobre STDIO (entrada/salida estándar)
   - Remoto: HTTP/Eventos Enviados por Servidor (SSE)
   - Implicación: Cada uno tiene garantías y limitaciones distintas.

### CLARIFICACIÓN: Parámetro tool_filter (FIX BUG 3)

`tool_filter` es un parámetro OPCIONAL que restringe las herramientas
disponibles a un agente a un subconjunto específico.

**USO TÍPICO:**
- En `HttpServerParameters` (servidores remotos) — más recomendado
- En `StdioServerParameters` (servidores locales) — menos necesario

**CUÁNDO ES RECOMENDADO:**
- ✓ Múltiples herramientas en servidor, agente solo necesita algunas
- ✓ Control de acceso (agente A usa herramientas 1,2; agente B usa 3,4)
- ✓ Reducir complejidad exponiendo solo lo relevante

**CUÁNDO NO ES NECESARIO:**
- ✓ Servidor expone una sola herramienta
- ✓ Agente tiene acceso a todas las herramientas
- ✓ Configuración de desarrollo (localhost)

**NOTA:** `tool_filter` es FILTRADO DE ACCESO, no descubrimiento de servidores.

---

## SECCIÓN 4: ARQUITECTURA TÉCNICA

MCP funciona bajo arquitectura cliente-servidor estandarizada.

**COMPONENTES:**

1. **Modelo de Lenguaje Grande (LLM)**
   Rol: Procesa solicitudes, formula planes, determina cuándo usar herramientas

2. **Cliente MCP**
   Rol: Encapsula LLM; traduce intención a solicitud MCP; gestiona conexiones

3. **Servidor MCP**
   Rol: Expone herramientas, recursos, indicaciones a clientes autorizados

4. **Servicio Externo**
   Rol: Punto de ejecución final (BD, API, servicio)

**FLUJO DE INTERACCIÓN:**

- Descubrimiento: Cliente consulta servidor → servidor responde con manifiesto
- Formulación: LLM decide qué herramienta usar con qué parámetros
- Transmisión: Cliente traduce a llamada MCP estándar y transmite al servidor
- Ejecución: Servidor autentica, valida, ejecuta herramienta en servicio externo
- Respuesta: Servidor devuelve resultado estándar → cliente pasa a LLM → LLM actualiza estado

---

## SECCIÓN 5: APLICACIONES OPERACIONALES — CASOS DE USO CLASIFICADOS

MCP amplía significativamente capacidades de IA. Sin embargo, cada caso de uso
tiene requisitos específicos.

### CATEGORÍA A: CASOS VÁLIDOS Y RECOMENDADOS

**Integración de Bases de Datos**
- Descripción: LLM accede a datos en BD (BigQuery, SQL Server, PostgreSQL)
- Ejemplo: Agente consulta BD de clientes, genera reporte analítico
- Validez: SÍ — Los datos en BD son estáticos, no requieren garantías transaccionales
- Calibración: 0.75 (bien definido, aplicable)

**Orquestación de Generación de Medios**
- Descripción: Agente orquesta flujo de síntesis de imagen, video, audio
- Ejemplo: Generar imagen para marketing + redactar descripción
- Validez: SÍ — Servicios están disponibles (Gemini Image, Veo, etc.)
- Validez CONDICIONAL: Debe reconocerse que no hay reversibilidad después de generación
- Calibración: 0.65 (válido pero con limitaciones)

**Integración de APIs Externas**
- Descripción: Agente invoca APIs arbitrarias (clima, precios, CRM)
- Ejemplo: Recuperar datos meteorológicos, consultar precios
- Validez: SÍ — APIs son deterministas y sin estado
- Calibración: 0.70 (bien definido)

**Extracción de Información**
- Descripción: Agente analiza contenido usando razonamiento para extraer datos
- Ejemplo: Extraer cláusula específica de documento
- Validez: SÍ — Análisis es una capacidad central del LLM
- Calibración: 0.68 (válido)

### CATEGORÍA B: CASOS CON REQUISITOS CRÍTICOS

**Orquestación de Flujos Multi-Paso**
- Descripción: Agente ejecuta secuencia: recupera datos → genera imagen → redacta → envía
- Validez: CONDICIONAL

REQUISITOS CRÍTICOS (SIN ESTOS, NO RECOMENDADO):

1. **Aislamiento Transaccional**
   - Pregunta: Si paso 2 falla, ¿qué sucede con resultado del paso 1?
   - Requisito: Decidir: TODO_O_NADA vs. PARCIAL
   - Implementación: Agregar lógica de compensación (reversal de pasos)

2. **Idempotencia**
   - Pregunta: Si se reintenta el flujo, ¿ocurren todos los pasos de nuevo?
   - Requisito: Cada paso debe ser idempotente (múltiples ejecuciones = misma salida)
   - Implementación: Usar IDs únicos, deduplicación, verificación de estado previo

3. **Logging Auditable**
   - Pregunta: ¿Qué ocurrió en cada paso?
   - Requisito: Log completo con timestamps, entrada, salida, errores
   - Implementación: Logging centralizado con rastreabilidad

- Calibración sin requisitos: 0.30 (especulativa)
- Calibración con requisitos: 0.70 (clara y verificable)

**Control de Dispositivos IoT**
- Descripción: Agente transmite comandos a dispositivos (domótica, robótica)
- Validez: CONDICIONAL

REQUISITOS CRÍTICOS (SIN ESTOS, NO RECOMENDADO):

1. **Confirmación de Entrega**
   - Pregunta: ¿Se recibió el comando en el dispositivo?
   - Requisito: Dispositivo debe responder confirmando recepción
   - Riesgo sin esto: Comando se "pierde silenciosamente"

2. **Reintentos Exponenciales**
   - Pregunta: ¿Qué pasa si falla la primera transmisión?
   - Requisito: Reintentos automáticos con backoff exponencial
   - Parámetros: max_retries=3, base=2s (espera 2s, 4s, 8s)

3. **Verificación de Estado Previo**
   - Pregunta: ¿En qué estado estaba el dispositivo ANTES del comando?
   - Requisito: Consultar estado actual antes de enviar comando
   - Razón: Algunos comandos solo son válidos en ciertos estados

4. **Timeout Explícito**
   - Pregunta: ¿Cuánto tiempo máximo esperar respuesta?
   - Requisito: Definir timeout (5s, 10s, etc.)
   - Riesgo sin esto: Agente espera indefinidamente

5. **Logging Completo**
   - Pregunta: ¿Qué comandos se enviaron y cuándo?
   - Requisito: Log auditable de cada comando, respuesta, error
   - Razón: Debugging y compliance

- Calibración sin requisitos: 0.20 (peligrosa)
- Calibración con requisitos: 0.60 (segura y verificable)

### CATEGORÍA C: ANTI-PATRONES — NO RECOMENDADO

**Automatización de Transacciones Financieras**

Descripción (del capítulo original): "Un agente podría ejecutar operaciones,
generar asesoramiento financiero, automatizar reportes"

**VEREDICTO: MCP NUNCA debe ser EJECUTOR DIRECTO de transacciones financieras**

RAZÓN: MCP no puede garantizar requisitos críticos:

1. **Transacciones ACID**
   - Necesidad: Atomicidad (todo o nada), Consistencia, Aislamiento, Durabilidad
   - Por qué MCP no lo cumple: Es protocolo de comunicación, no motor transaccional
   - Riesgo sin esto: Dinero se transfiere parcialmente; inconsistencias de datos

2. **Auditoría Completa**
   - Necesidad: Cada movimiento debe registrarse para reguladores
   - Por qué MCP no lo cumple: No especifica logging regulatorio
   - Riesgo sin esto: No se puede probar qué sucedió para compliance

3. **Firma Digital del Usuario**
   - Necesidad: No es el AGENTE quien autoriza, es el USUARIO
   - Por qué MCP no lo cumple: MCP estandariza función, no autorización
   - Riesgo sin esto: Transacción no autorizada por usuario

4. **Reversibilidad**
   - Necesidad: Capacidad de cancelar transacción después de iniciada
   - Por qué MCP no lo cumple: No tiene mecanismo de rollback transaccional
   - Riesgo sin esto: Transacción se queda "pegada"

5. **Límites Regulatorios**
   - Necesidad: Cumplir límites de operación, prohibiciones específicas
   - Por qué MCP no lo cumple: Es agnóstico de reglas de negocio
   - Riesgo sin esto: Violación regulatoria, multas

**PATRÓN CORRECTO para servicios financieros:**

```
Fase 1 - ANÁLISIS (Agente vía MCP) ✓
  └─ Agente analiza datos de mercado
  └─ Agente identifica oportunidad
  └─ Agente PROPONE transacción (recomendación)
  └─ MCP es APROPIADO para esta fase

Fase 2 - AUTORIZACIÓN (Usuario) ✓
  └─ Usuario revisa propuesta
  └─ Usuario FIRMA digitalmente
  └─ Usuario autoriza ejecución
  └─ MCP NO está involucrado

Fase 3 - EJECUCIÓN (Sistema con garantías) ✓
  └─ Sistema ejecuta transacción
  └─ Sistema garantiza ACID (rollback si falla)
  └─ Sistema registra para auditoría
  └─ Sistema valida compliance
  └─ MCP es COMPLETAMENTE INAPROPIADO
```

**VEREDICTO:** MCP es EXCELENTE (0.85) para Fase 1.
MCP es COMPLETAMENTE INAPROPIADO (0.0) para Fase 3.

Usar MCP en Fase 3 sin las capas de garantía resulta en
pérdida de dinero y demandas regulatorias.

---

## SECCIÓN 6: GAP DESARROLLO vs. PRODUCCIÓN (CRÍTICO)

Los ejemplos de código que siguen funcionan en DESARROLLO LOCAL.
En PRODUCCIÓN, se requieren capas adicionales NO mencionadas en ejemplos básicos.

**DESARROLLO (ejemplos siguientes):**
- ✓ Servidor hardcodeado (command='npx', url="localhost")
- ✓ Error handling básico
- ✓ Timeout NO especificado (espera indefinida)
- ✓ Sin logging persistente

**PRODUCCIÓN (requisitos reales):**

1. **Service Discovery:** ¿Dónde están los servidores MCP?
   - Solución: Consul, etcd, Kubernetes service discovery

2. **Load Balancing:** ¿Cómo distribuir carga entre múltiples servidores?
   - Solución: HAProxy, nginx, cloud load balancer

3. **Health Checks:** ¿El servidor está vivo?
   - Solución: Liveness probes, heartbeats, timeouts

4. **Logging Centralizado:** ¿Dónde se guardan logs?
   - Solución: ELK stack, CloudLogging, Datadog

5. **Monitoreo de Errores:** ¿Alertas en caso de fallo?
   - Solución: Prometheus, CloudMonitoring, Sentry

6. **Política de Reintentos:** ¿Cuándo y cómo reintentar?
   - Solución: Exponential backoff con jitter, circuit breaker

7. **Circuit Breaker:** ¿Cuándo dejar de intentar?
   - Solución: Si falla 3 veces consecutivas, pausar 30s

8. **Rate Limiting:** ¿Cuántas solicitudes por segundo?
   - Solución: Límites per-client, per-endpoint, global

**ALLOCACIÓN DE ESFUERZO (realista):**
- Código MCP básico: 20-30% del esfuerzo
- Capas de producción: 60-70% del esfuerzo

RECOMENDACIÓN: Al adoptar MCP en producción, presupuestar significativamente
más tiempo para estas capas que para el código MCP central.

---

## SECCIÓN 7: EJEMPLOS DE CÓDIGO

Los siguientes 3 ejemplos demuestran MCP en DESARROLLO.
El ejemplo 4 muestra qué se necesita para PRODUCCIÓN.

### EJEMPLO 1: Cliente Local — Interacción con Sistema de Archivos

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

TARGET_FOLDER_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 
    "mcp_managed_files"
)

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='filesystem_assistant_agent',
    instruction='Ayuda al usuario a gestionar archivos. Puedes listar, leer y escribir archivos.',
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

Nota: Este código funciona para DESARROLLO. No incluye error handling robusto.

### EJEMPLO 2: Servidor MCP — Exposición de Herramienta Simple

```python
# fastmcp_server.py
from fastmcp import FastMCP

mcp_server = FastMCP()

@mcp_server.tool
def greet(name: str) -> str:
    """
    Genera un saludo personalizado.
    
    Args:
        name: Nombre de la persona
    
    Returns:
        Saludo personalizado
    """
    return f"¡Hola, {name}!"

if __name__ == "__main__":
    mcp_server.run(transport="http", host="127.0.0.1", port=8000)
```

Nota: Servidor funciona pero es MINIMALISTA.

### EJEMPLO 3: Cliente Remoto — Consumiendo Servidor MCP

```python
# agent_client.py
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, HttpServerParameters

FASTMCP_SERVER_URL = "http://localhost:8000"

root_agent = LlmAgent(
    model='gemini-2.0-flash',
    name='fastmcp_greeter_agent',
    instruction='Eres asistente que saluda a personas por su nombre. Usa la herramienta greet.',
    tools=[
        MCPToolset(
            connection_params=HttpServerParameters(
                url=FASTMCP_SERVER_URL,
                tool_filter=['greet']
            )
        )
    ]
)
```

Nota: Cliente funciona pero es MINIMALISTA.

### EJEMPLO 4: Cliente Robusto para PRODUCCIÓN (FIX BUG 1)

```python
# mcp_production_client.py
import asyncio
import logging
from typing import Optional, Awaitable, TypeVar, Callable, Any
import aiohttp
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

T = TypeVar('T')

def with_retry_and_logging(
    max_retries: int = 3,
    timeout_sec: float = 5.0,
    backoff_base: float = 2.0
):
    """Decorador para funciones async con reintentos, timeout y logging."""
    
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    logger.info(f'[{func.__name__}] Intento {attempt + 1}/{max_retries}')
                    
                    result = await asyncio.wait_for(
                        func(*args, **kwargs),
                        timeout=timeout_sec
                    )
                    
                    logger.info(f'[{func.__name__}] Éxito en intento {attempt + 1}')
                    return result
                    
                except asyncio.TimeoutError:
                    last_error = f'Timeout después de {timeout_sec}s'
                    logger.warning(f'[{func.__name__}] Timeout en intento {attempt + 1}')
                    
                    if attempt < max_retries - 1:
                        wait_time = backoff_base ** attempt
                        logger.info(f'[{func.__name__}] Esperando {wait_time}s antes de reintentar')
                        await asyncio.sleep(wait_time)
                    
                except Exception as e:
                    last_error = str(e)
                    logger.error(f'[{func.__name__}] Error en intento {attempt + 1}: {e}')
                    
                    if attempt < max_retries - 1:
                        wait_time = backoff_base ** attempt
                        await asyncio.sleep(wait_time)
            
            logger.error(f'[{func.__name__}] Falló después de {max_retries} intentos. Error final: {last_error}')
            raise RuntimeError(f'{func.__name__} falló después de {max_retries} intentos: {last_error}')
        
        return async_wrapper
    return decorator

class MCPProductionClient:
    """Cliente MCP con garantías de PRODUCCIÓN: reintentos, timeout, logging."""
    
    def __init__(self, base_url: str, max_retries: int = 3, timeout_sec: float = 5.0):
        self.base_url = base_url
        self.max_retries = max_retries
        self.timeout_sec = timeout_sec
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    @with_retry_and_logging(max_retries=3, timeout_sec=5.0)
    async def call_tool(self, tool_name: str, **params) -> dict:
        """Llamar herramienta con reintentos exponenciales, timeout y logging."""
        
        if not self.session:
            raise RuntimeError("Session no inicializada. Usar 'async with'")
        
        payload = {'jsonrpc': '2.0', 'method': tool_name, 'params': params, 'id': 1}
        
        async with self.session.post(
            f'{self.base_url}/rpc',
            json=payload,
            timeout=aiohttp.ClientTimeout(total=self.timeout_sec)
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                logger.info(f'[call_tool] HTTP {resp.status} OK')
                return result
            else:
                error_text = await resp.text()
                raise RuntimeError(f'HTTP {resp.status}: {error_text}')

# USO EN PRODUCCIÓN:
# async with MCPProductionClient("http://localhost:8000", max_retries=3, timeout_sec=5) as client:
#     result = await client.call_tool("greet", name="Juan")
#     print(result)
```

**DIFERENCIAS CLAVE respecto a Ejemplo 3:**
- ✓ Decorador async correcto (Awaitable en type hints, async_wrapper)
- ✓ Reintentos exponenciales (2^attempt segundos)
- ✓ Timeout explícito (5 segundos)
- ✓ Logging estructurado en cada intento
- ✓ Context manager para gestión de recursos
- ✓ Manejo detallado de errores

SIN estos patrones, el código falla silenciosamente en producción.

---

## SECCIÓN 8: SÍNTESIS Y CONCLUSIÓN

El Protocolo de Contexto de Modelo proporciona una interfaz estandarizada
para que LLMs se conecten a sistemas externos de manera predecible y
composable.

**CUÁNDO MCP ES RECOMENDADO:**
- ✓ Ecosistemas con múltiples herramientas (10+)
- ✓ Herramientas cambian regularmente
- ✓ Reutilización entre aplicaciones es prioridad
- ✓ Descubrimiento dinámico de funciones es valioso
- ✓ Necesidad de desacoplamiento entre componentes

**CUÁNDO TOOL CALLING ES SUFICIENTE:**
- ✓ Aplicaciones simples (1-5 funciones)
- ✓ Conjunto de funciones es FIJO
- ✓ Bajo overhead es prioritario
- ✓ Arquitectura es monolítica

**CUÁNDO MCP NO DEBE USARSE:**
- ✗ Como ejecutor directo de transacciones financieras (sin ACID, auditoría, firma)
- ✗ Para control crítico (IoT, robótica) sin confirmación de entrega
- ✗ Para flujos multi-paso sin aislamiento transaccional
- ✗ En producción sin service discovery, health checks, logging centralizado

**REQUERIMIENTOS CRÍTICOS POR CASO:**
- Financiero: MCP SOLO para análisis (Fase 1), NO para ejecución (Fase 3)
- IoT: REQUIERE confirmación, reintentos, timeout, logging
- Multi-paso: REQUIERE aislamiento, idempotencia, compensación
- Código: DEBE implementar error handling, timeouts, reintentos

**VERDAD FUNDAMENTAL:**
- MCP estandariza COMUNICACIÓN, no CORRECTITUD.
- MCP reduce ACOPLAMIENTO, no COMPLEJIDAD CONCEPTUAL.
- MCP simplifica INTEGRACIÓN, no GARANTÍAS OPERACIONALES.

Implementar MCP correctamente requiere comprender estos límites y aplicar
capas adicionales según el caso de uso.

---

## REFERENCIAS

- Documentación del Protocolo de Contexto de Modelo: https://modelcontextprotocol.io/
- FastMCP — Framework Python para servidores MCP: https://github.com/jlowin/fastmcp
- MCP Tools para Servicios de Generación de Medios: https://google.github.io/adk-docs/mcp/#mcp-servers-for-google-cloud-genmedia
- MCP Toolbox para Bases de Datos: https://google.github.io/adk-docs/mcp/databases/

---

## Footer del documento

```
FIN DEL CAPÍTULO 10 (VERSIÓN CALIBRADA 2.0)
Versión 1: 79% (SUPERA GATE)
Versión 2: Fixes aplicados — Bugs corregidos
Calibración Objetivo: 0.75+
```

---

## Nota editorial — Bug identificado en V1 que persiste en V2

**BUG JSON-RPC (identificado en análisis de V1):**
El payload en `call_tool` usa `method: tool_name` directamente:
```python
payload = {'jsonrpc': '2.0', 'method': tool_name, 'params': params, 'id': 1}
```
En el protocolo MCP real, las llamadas a herramientas usan `method: "tools/call"`
con el nombre en `params.name`. Este defecto de protocolo persiste en V2.

**BUG DISCOVERY Sec.8 (identificado en análisis de V1):**
Verificar si "Descubrimiento dinámico de funciones es valioso" en Sec.8 aplica
el caveat de configuración previa de servidores, o si la V2 lo corrigió aquí.
