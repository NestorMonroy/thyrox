# ADK Model Callback Contract — AP-01

## Anti-patrón
```python
# INCORRECTO
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

class MyAgent(LlmAgent):
    def before_model_callback(
        self,
        callback_context: CallbackContext,
        llm_request: types.GenerateContentRequest
    ) -> types.GenerateContentRequest | None:
        # Modificar el objeto directamente
        llm_request.contents.append(
            types.Content(role="user", parts=[types.Part(text="Responde en JSON")])
        )
        return None  # ← ERROR: el framework usa el objeto ORIGINAL, no el modificado
```

**Por qué falla:** El contrato del callback en ADK especifica que el valor de retorno es el objeto que el framework usará para la llamada al modelo. Cuando se retorna `None`, el framework interpreta que no hay override y continúa con el objeto recibido — el que existía ANTES de las modificaciones. Las mutaciones en `llm_request` se pierden porque el framework no observa el estado interno del objeto mutado; solo hace branching sobre el valor de retorno.

## Patrón correcto
```python
# CORRECTO
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

class MyAgent(LlmAgent):
    def before_model_callback(
        self,
        callback_context: CallbackContext,
        llm_request: types.GenerateContentRequest
    ) -> types.GenerateContentRequest | None:
        # Modificar el objeto directamente
        llm_request.contents.append(
            types.Content(role="user", parts=[types.Part(text="Responde en JSON")])
        )
        return llm_request  # ← CORRECTO: retornar el objeto modificado
```

**Por qué funciona:** El framework ADK evalúa el valor de retorno del callback. Si no es `None`, usa ese valor como el request real al modelo. Retornar el objeto modificado (incluso si es el mismo objeto mutado) hace que el framework lo tome como el input efectivo.

## Ejemplo mínimo ejecutable
```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

class JsonEnforcerAgent(LlmAgent):
    """Agente que inyecta instrucción de formato JSON antes de cada llamada al modelo."""

    def before_model_callback(
        self,
        callback_context: CallbackContext,
        llm_request: types.GenerateContentRequest
    ) -> types.GenerateContentRequest | None:
        instruction = types.Content(
            role="user",
            parts=[types.Part(text="[Instrucción del sistema: responde siempre en JSON válido]")]
        )
        llm_request.contents.insert(0, instruction)
        return llm_request  # ← retornar, no None

async def main():
    session_service = InMemorySessionService()
    agent = JsonEnforcerAgent(
        name="json_enforcer",
        model="gemini-2.0-flash",
    )
    runner = Runner(
        agent=agent,
        app_name="ap01_demo",
        session_service=session_service,
    )
    session = await session_service.create_session(
        app_name="ap01_demo", user_id="user1"
    )
    async for event in runner.run_async(
        user_id="user1",
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text="¿Cuántos planetas hay en el sistema solar?")]
        )
    ):
        if event.is_final_response():
            print(event.content.parts[0].text)

if __name__ == "__main__":
    asyncio.run(main())
```

## Severidad
CRÍTICO — Cap.13 del libro analizado

El error es silencioso: el agente no lanza excepción, simplemente ignora la modificación. En producción esto significa que las instrucciones de sistema, guardrails o context injection nunca se aplican, sin ninguna señal de falla.
