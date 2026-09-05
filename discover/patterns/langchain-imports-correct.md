# LangChain Imports Correctos — AP-18

## Anti-patrón
```python
# INCORRECTO — AP-18: importación desde módulo incorrecto
from langchain_core.tools import Tool  # ← ImportError o clase equivocada

# AP-19: cadenas de LLM deprecadas
from langchain.chains import LLMChain  # ← deprecado en LangChain v0.2+

# AP-20: callbacks deprecados
from langchain.callbacks import StdOutCallbackHandler  # ← movido en v0.2

# AP-21: memoria deprecada
from langchain.memory import ConversationBufferMemory  # ← API legacy
```

**Por qué falla:** LangChain reorganizó su arquitectura de paquetes en múltiples versiones, especialmente con la división entre `langchain-core` (abstracciones base), `langchain` (implementaciones de alto nivel) y paquetes de integración (`langchain-openai`, `langchain-anthropic`, etc.). `langchain_core.tools` no exporta la clase `Tool` utilitaria — esa vive en `langchain.tools`. `langchain_core` exporta las abstracciones base (`BaseTool`, `StructuredTool`). Las importaciones deprecadas (AP-19 a AP-21) pueden funcionar pero emiten `DeprecationWarning` y serán eliminadas en versiones futuras.

## Patrón correcto
```python
# CORRECTO — AP-18: importar Tool desde el paquete correcto
from langchain.tools import Tool  # ← correcto para Tool de alto nivel

# Para abstracciones base (cuando se subclasea):
from langchain_core.tools import BaseTool, StructuredTool

# AP-19: usar LCEL (LangChain Expression Language) en lugar de LLMChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
# chain = prompt | llm | parser  ← sintaxis LCEL reemplaza LLMChain

# AP-20: callbacks actualizados
from langchain_core.callbacks import StdOutCallbackHandler  # ← en core
# O usar callbacks del paquete de integración correspondiente

# AP-21: memoria actualizada (LangChain v0.3+)
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
# En v0.3: usar RunnableWithMessageHistory o LangGraph para state management
```

**Por qué funciona:** Los paquetes `langchain-core` y `langchain` tienen responsabilidades distintas y bien definidas desde la refactorización. `langchain-core` contiene las interfaces y abstracciones puras (sin dependencias de terceros). `langchain` contiene implementaciones concretas que usan esas abstracciones. Las importaciones correctas respetan esta separación y no dependen de rutas internas que pueden cambiar entre versiones menores.

## Ejemplo mínimo ejecutable
```python
"""
Ejemplo que demuestra las importaciones correctas para LangChain.
Requiere: pip install langchain langchain-core langchain-openai
"""
from langchain.tools import Tool
from langchain_core.tools import BaseTool, StructuredTool
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage, AIMessage
from typing import Any, Optional, Type
from pydantic import BaseModel

# AP-18: Tool correcto
def multiply(a: float, b: float) -> float:
    return a * b

multiply_tool = Tool(
    name="multiply",
    description="Multiplica dos números",
    func=lambda x: multiply(*map(float, x.split(","))),
)

# BaseTool para subclasing
class CustomTool(BaseTool):
    name: str = "custom"
    description: str = "Herramienta personalizada"

    def _run(self, query: str) -> str:
        return f"Resultado para: {query}"

    async def _arun(self, query: str) -> str:
        return self._run(query)

# AP-20: Callback correcto
class LoggingCallback(BaseCallbackHandler):
    def on_llm_start(self, serialized: dict, prompts: list, **kwargs: Any) -> None:
        print(f"[LOG] LLM llamado con {len(prompts)} prompts")

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        print(f"[LOG] LLM completado")

# AP-19: LCEL en lugar de LLMChain (solo estructura, sin invocar LLM real)
prompt = ChatPromptTemplate.from_messages([
    ("system", "Eres un asistente útil."),
    ("human", "{input}"),
])
parser = StrOutputParser()
# chain = prompt | llm | parser  ← así se usa (LLM omitido aquí por brevedad)

print("Importaciones correctas — sin ImportError ni DeprecationWarning")
print(f"Tool: {multiply_tool.name}")
print(f"CustomTool: {CustomTool().name}")
print(f"Prompt: {type(prompt).__name__}")
```

## Severidad
CRÍTICO — Cap.20

Los errores de importación son inmediatos y bloquean la ejecución del sistema completo. A diferencia de otros anti-patrones que fallan silenciosamente, un `ImportError` detiene toda la aplicación en startup. En proyectos que dependen de LangChain, las importaciones incorrectas son la causa de fallo más frecuente al actualizar versiones de paquetes. La fragmentación del namespace de LangChain (langchain-core / langchain / langchain-community / langchain-{integration}) es una fuente de confusion sistémica en la comunidad.

### Tabla de correcciones AP-18 a AP-21

| AP | Anti-patrón | Corrección |
|----|-------------|------------|
| AP-18 | `from langchain_core.tools import Tool` | `from langchain.tools import Tool` |
| AP-19 | `from langchain.chains import LLMChain` | LCEL: `prompt \| llm \| parser` |
| AP-20 | `from langchain.callbacks import StdOutCallbackHandler` | `from langchain_core.callbacks import StdOutCallbackHandler` |
| AP-21 | `from langchain.memory import ConversationBufferMemory` | `from langchain_community.chat_message_histories import ChatMessageHistory` |
