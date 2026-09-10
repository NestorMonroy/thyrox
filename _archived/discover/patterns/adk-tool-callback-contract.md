# ADK Tool Callback Contract — AP-02

## Anti-patrón
```python
# INCORRECTO
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext  # ← tipo incorrecto
from google.adk.tools import BaseTool

class MyAgent(LlmAgent):
    def before_tool_callback(
        self,
        tool: BaseTool,
        args: dict,
        ctx: CallbackContext,  # ← ERROR: tipo incorrecto para tool callbacks
    ) -> dict | None:
        # Validar o modificar args antes de ejecutar la tool
        if "query" in args and len(args["query"]) > 1000:
            args["query"] = args["query"][:1000]
        return None
```

**Por qué falla:** El ADK define dos tipos de contexto distintos para callbacks: `CallbackContext` para callbacks de modelo (before/after model) y `ToolContext` para callbacks de herramientas (before/after tool). Usar `CallbackContext` en `before_tool_callback` provoca un `TypeError` en runtime porque el framework pasa una instancia de `ToolContext` que no es compatible con la firma declarada. En Python con type checking estricto, esto falla en la llamada; sin type checking, puede fallar más adelante al intentar acceder a atributos específicos de `ToolContext`.

## Patrón correcto
```python
# CORRECTO
from google.adk.agents import LlmAgent
from google.adk.tools import BaseTool
from google.adk.tools.tool_context import ToolContext  # ← importar el tipo correcto

class MyAgent(LlmAgent):
    def before_tool_callback(
        self,
        tool: BaseTool,
        args: dict,
        tool_context: ToolContext,  # ← tipo correcto
    ) -> dict | None:
        # Validar o modificar args antes de ejecutar la tool
        if "query" in args and len(args["query"]) > 1000:
            args["query"] = args["query"][:1000]
        return args  # retornar los args modificados (o None para usar los originales)
```

**Por qué funciona:** `ToolContext` expone atributos específicos de la ejecución de tools: acceso al `state` de la sesión, a las `actions` disponibles, y al contexto de invocación de la herramienta. Al usar el tipo correcto, el framework puede pasar el objeto apropiado y el código puede acceder a todos los atributos disponibles en ese contexto.

## Ejemplo mínimo ejecutable
```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.tools import BaseTool, FunctionTool
from google.adk.tools.tool_context import ToolContext
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

def buscar_en_db(query: str) -> str:
    """Busca información en la base de datos."""
    return f"Resultado para: {query}"

class ValidatingAgent(LlmAgent):
    """Agente que valida y trunca queries antes de pasarlas a tools."""

    def before_tool_callback(
        self,
        tool: BaseTool,
        args: dict,
        tool_context: ToolContext,  # ← tipo correcto
    ) -> dict | None:
        if tool.name == "buscar_en_db" and "query" in args:
            original_len = len(args["query"])
            if original_len > 100:
                args["query"] = args["query"][:100]
                print(f"Query truncada: {original_len} → 100 chars")
        return args  # retornar args (modificados o no)

async def main():
    session_service = InMemorySessionService()
    search_tool = FunctionTool(func=buscar_en_db)

    agent = ValidatingAgent(
        name="validating_agent",
        model="gemini-2.0-flash",
        tools=[search_tool],
    )
    runner = Runner(
        agent=agent,
        app_name="ap02_demo",
        session_service=session_service,
    )
    session = await session_service.create_session(
        app_name="ap02_demo", user_id="user1"
    )
    async for event in runner.run_async(
        user_id="user1",
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text="Busca información sobre Python")]
        )
    ):
        if event.is_final_response():
            print(event.content.parts[0].text)

if __name__ == "__main__":
    asyncio.run(main())
```

## Severidad
ALTO — Cap.13 del libro analizado

El error es detectable en tests si se usa type checking (mypy/pyright), pero en código sin anotaciones o sin CI con type checking, pasa a producción y falla solo cuando el framework invoca el callback con la instancia de `ToolContext`.
