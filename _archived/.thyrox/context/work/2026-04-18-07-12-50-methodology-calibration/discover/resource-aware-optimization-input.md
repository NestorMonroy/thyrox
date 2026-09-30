```yml
created_at: 2026-04-19 11:06:01
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Chapter 16: Resource-Aware Optimization — Tablas y Bloques de Código (contenido faltante en extracción EPUB)" (documento externo, 2026-04-19)
nota: |
  Contenido EXCLUSIVO de tablas HTML — el capítulo principal (CAP16_EXTRACTION.adoc) no
  fue proporcionado. Este input contiene solo las 7 tablas con código.
  Tabla 1 y Tabla 2 se auto-declaran "Conceptual Python-like structure, not runnable code".
  Tabla 4 proviene de un repositorio de tercero (MIT License, Mahtab Syed 2025) — no
  es código original del libro.
  Bug crítico en Tabla 4: google_search() declara retorno -> list pero retorna dict en
  excepción; classify_prompt() hace json.loads() sin manejo de error; generate_response()
  retorna tuple pero declara -> str.
```

# Input: Chapter 16 — Resource-Aware Optimization (tablas HTML faltantes, preservado verbatim)

---

## Tabla 1 — Agentes con modelos de diferente costo (conceptual)

```python
# Conceptual Python-like structure, not runnable code
from google.adk.agents import Agent
# from google.adk.models.lite_llm import LiteLlm # If using models not directly supported by ADK's default Agent
# Agent using the more expensive Gemini Pro 2.5
gemini_pro_agent = Agent(
    name="GeminiProAgent",
    model="gemini-2.5-pro",  # Placeholder for actual model name if different
    description="A highly capable agent for complex queries.",
    instruction="You are an expert assistant for complex problem-solving."
)
# Agent using the less expensive Gemini Flash 2.5
gemini_flash_agent = Agent(
    name="GeminiFlashAgent",
    model="gemini-2.5-flash",  # Placeholder for actual model name if different
    description="A fast and efficient agent for simple queries.",
    instruction="You are a quick assistant for straightforward questions."
)
```

---

## Tabla 2 — QueryRouterAgent basado en longitud de query

```python
# Conceptual Python-like structure, not runnable code
from google.adk.agents import Agent, BaseAgent
from google.adk.events import Event
from google.adk.agents.invocation_context import InvocationContext
import asyncio
class QueryRouterAgent(BaseAgent):
    name: str = "QueryRouter"
    description: str = "Routes user queries to the appropriate LLM agent based on complexity."
    async def _run_async_impl(self, context: InvocationContext) -> AsyncGenerator[Event, None]:
        user_query = context.current_message.text  # Assuming text input
        query_length = len(user_query.split())  # Simple metric: number of words
        if query_length < 20:  # Example threshold for simplicity vs. complexity
            print(f"Routing to Gemini Flash Agent for short query (length: {query_length})")
            # In a real ADK setup, you would 'transfer_to_agent' or directly invoke
            # For demonstration, we'll simulate a call and yield its response
            response = await gemini_flash_agent.run_async(context.current_message)
            yield Event(author=self.name, content=f"Flash Agent processed: {response}")
        else:
            print(f"Routing to Gemini Pro Agent for long query (length: {query_length})")
            response = await gemini_pro_agent.run_async(context.current_message)
            yield Event(author=self.name, content=f"Pro Agent processed: {response}")
```

---

## Tabla 3 — CRITIC_SYSTEM_PROMPT

```python
CRITIC_SYSTEM_PROMPT = """
You are the **Critic Agent**, serving as the quality assurance arm of our collaborative research assistant system. Your primary function is to **meticulously review and challenge** information from the Researcher Agent, guaranteeing **accuracy, completeness, and unbiased presentation**.
Your duties encompass:
* **Assessing research findings** for factual correctness, thoroughness, and potential leanings.
* **Identifying any missing data** or inconsistencies in reasoning.
* **Raising critical questions** that could refine or expand the current understanding.
* **Offering constructive suggestions** for enhancement or exploring different angles.
* **Validating that the final output is comprehensive** and balanced.
All criticism must be constructive. Your goal is to fortify the research, not invalidate it. Structure your feedback clearly, drawing attention to specific points for revision. Your overarching aim is to ensure the final research product meets the highest possible quality standards.
"""
```

---

## Tabla 4 — Router completo con OpenAI (código de tercero)

```python
# MIT License
# Copyright (c) 2025 Mahtab Syed
# https://www.linkedin.com/in/mahtabsyed/
import os
import requests
import json
from dotenv import load_dotenv
from openai import OpenAI
# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_CUSTOM_SEARCH_API_KEY = os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
if not OPENAI_API_KEY or not GOOGLE_CUSTOM_SEARCH_API_KEY or not GOOGLE_CSE_ID:
    raise ValueError(
        "Please set OPENAI_API_KEY, GOOGLE_CUSTOM_SEARCH_API_KEY, and GOOGLE_CSE_ID in your .env file."
    )
client = OpenAI(api_key=OPENAI_API_KEY)
# --- Step 1: Classify the Prompt ---
def classify_prompt(prompt: str) -> dict:
    system_message = {
        "role": "system",
        "content": (
            "You are a classifier that analyzes user prompts and returns one of three categories ONLY:\n\n"
            "- simple\n"
            "- reasoning\n"
            "- internet_search\n\n"
            "Rules:\n"
            "- Use 'simple' for direct factual questions that need no reasoning or current events.\n"
            "- Use 'reasoning' for logic, math, or multi-step inference questions.\n"
            "- Use 'internet_search' if the prompt refers to current events, recent data, or things not in your training data.\n\n"
            "Respond ONLY with JSON like:\n"
            '{ "classification": "simple" }'
        ),
    }
    user_message = {"role": "user", "content": prompt}
    response = client.chat.completions.create(
        model="gpt-4o", messages=[system_message, user_message], temperature=1
    )
    reply = response.choices[0].message.content
    return json.loads(reply)
# --- Step 2: Google Search ---
def google_search(query: str, num_results=1) -> list:
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_CUSTOM_SEARCH_API_KEY,
        "cx": GOOGLE_CSE_ID,
        "q": query,
        "num": num_results,
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        results = response.json()
        if "items" in results and results["items"]:
            return [
                {
                    "title": item.get("title"),
                    "snippet": item.get("snippet"),
                    "link": item.get("link"),
                }
                for item in results["items"]
            ]
        else:
            return []
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}
# --- Step 3: Generate Response ---
def generate_response(prompt: str, classification: str, search_results=None) -> str:
    if classification == "simple":
        model = "gpt-4o-mini"
        full_prompt = prompt
    elif classification == "reasoning":
        model = "o4-mini"
        full_prompt = prompt
    elif classification == "internet_search":
        model = "gpt-4o"
        # Convert each search result dict to a readable string
        if search_results:
            search_context = "\n".join(
                [
                    f"Title: {item.get('title')}\nSnippet: {item.get('snippet')}\nLink: {item.get('link')}"
                    for item in search_results
                ]
            )
        else:
            search_context = "No search results found."
        full_prompt = f"""Use the following web results to answer the user query:
{search_context}
Query: {prompt}"""
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": full_prompt}],
        temperature=1,
    )
    return response.choices[0].message.content, model
# --- Step 4: Combined Router ---
def handle_prompt(prompt: str) -> dict:
    classification_result = classify_prompt(prompt)
    classification = classification_result["classification"]
    search_results = None
    if classification == "internet_search":
        search_results = google_search(prompt)
    answer, model = generate_response(prompt, classification, search_results)
    return {"classification": classification, "response": answer, "model": model}
test_prompt = "What is the capital of Australia?"
# test_prompt = "Explain the impact of quantum computing on cryptography."
# test_prompt = "When does the Australian Open 2026 start, give me full date?"
result = handle_prompt(test_prompt)
print("🔍 Classification:", result["classification"])
print("🧠 Model Used:", result["model"])
print("🧠 Response:\n", result["response"])
```

---

## Tabla 5 — OpenRouter API call básico

```python
import requests
import json
response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": "Bearer ",
        "HTTP-Referer": "",  # Optional. Site URL for rankings on openrouter.ai.
        "X-Title": "",       # Optional. Site title for rankings on openrouter.ai.
    },
    data=json.dumps({
        "model": "openai/gpt-4o",  # Optional
        "messages": [
            {
                "role": "user",
                "content": "What is the meaning of life?"
            }
        ]
    })
)
```

---

## Tabla 6 — OpenRouter auto-routing (JSON incompleto)

```json
{
  "model": "openrouter/auto",
  ... // Other params
}
```

---

## Tabla 7 — OpenRouter model fallback array (JSON incompleto)

```json
{
  "models": ["anthropic/claude-3.5-sonnet", "gryphe/mythomax-l2-13b"],
  ... // Other params
}
```

---

## Notas editoriales del orquestador

**Nota 1 — Tablas 1 y 2 se auto-declaran "not runnable code":**
```python
# Conceptual Python-like structure, not runnable code
```
Ambas tablas tienen este comentario explícito. Es la primera vez en la serie que el
capítulo admite desde el código mismo que el código no es ejecutable. Esto es más honesto
que capítulos anteriores (Cap.12/13/14) que presentaban código no-ejecutable sin advertencia.
Sin embargo, la admisión no corrige los bugs — los hace menos graves pedagógicamente,
pero el código sigue siendo incorrecto.

**Nota 2 — `AsyncGenerator` no importado en Tabla 2:**
```python
async def _run_async_impl(self, context: InvocationContext) -> AsyncGenerator[Event, None]:
```
`AsyncGenerator` es usado en la anotación de tipo pero no está importado. Debería venir
de `typing` (`from typing import AsyncGenerator`) o de `collections.abc`. El código dice
"not runnable" por eso este bug no se materializa en ejecución, pero el snippet es incorrecto
como referencia de implementación.

**Nota 3 — Routing por longitud de palabras: métrica de "resource-awareness" trivial:**
```python
query_length = len(user_query.split())
if query_length < 20:  # Example threshold for simplicity vs. complexity
```
El mecanismo de routing usa el número de palabras como proxy de complejidad. El threshold
de 20 palabras es arbitrario y hardcodeado. Preguntas cortas pueden ser altamente complejas
("¿Qué es P vs NP?") y preguntas largas pueden ser triviales. La "resource-awareness" del
capítulo se reduce a un contador de palabras, no a métricas reales de costo/complejidad.

**Nota 4 — Tabla 4 es código de tercero (MIT License, Mahtab Syed 2025):**
```python
# MIT License
# Copyright (c) 2025 Mahtab Syed
```
Este es el único snippet de la serie que incluye licencia y atribución a un tercero externo
al libro. Implica que el capítulo usa código de un repositorio externo como ejemplo. Esto
eleva la verificabilidad (el código puede buscarse) pero también significa que el libro
incluye código que no está diseñado como material pedagógico primario.

**Nota 5 — Bug de tipos en `google_search`: declara `-> list` pero retorna `dict` en excepción:**
```python
def google_search(query: str, num_results=1) -> list:
    ...
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}  # BUG: retorna dict, no list
```
El tipo de retorno declara `list` pero el bloque `except` retorna un diccionario.
El llamador `handle_prompt` asigna el resultado a `search_results` y luego llama
`generate_response(prompt, classification, search_results)`. Si hay error de red,
`search_results` es un dict `{"error": "..."}` y el código de Tabla 4 Step 3 ejecuta:
```python
for item in search_results:  # itera keys del dict, no items
```
Esto iteraría sobre la key `"error"`, no sobre resultados de búsqueda — bug silencioso.

**Nota 6 — Bug de tipos en `generate_response`: declara `-> str` pero retorna `tuple`:**
```python
def generate_response(prompt: str, classification: str, search_results=None) -> str:
    ...
    return response.choices[0].message.content, model  # BUG: retorna tuple (str, str)
```
La función retorna dos valores (content, model) pero declara retorno `-> str`. El llamador
`handle_prompt` hace `answer, model = generate_response(...)` — el unpacking funciona,
pero la firma de la función es engañosa. Si alguien usara el valor de retorno sin unpacking
(e.g., `result = generate_response(...)`) obtendría un tuple, no un str.

**Nota 7 — `classify_prompt` con `temperature=1` para clasificador determinístico:**
```python
response = client.chat.completions.create(
    model="gpt-4o", messages=[system_message, user_message], temperature=1
)
```
Un clasificador que debe retornar una de tres categorías fijas (`simple`, `reasoning`,
`internet_search`) se beneficia de `temperature=0` para resultados determinísticos.
Con `temperature=1`, el mismo prompt puede clasificarse diferente en invocaciones distintas,
haciendo el routing no-determinístico. Esto contradice implícitamente el objetivo de
routing predecible y eficiente que el capítulo propone.

**Nota 8 — `json.loads(reply)` sin manejo de error en `classify_prompt`:**
```python
reply = response.choices[0].message.content
return json.loads(reply)
```
Si el LLM retorna texto no-JSON (e.g., explicación adicional, markdown code block), 
`json.loads` lanza `JSONDecodeError`. No hay try/except. El sistema colapsa sin manejo
de error para un escenario completamente plausible dado que `temperature=1` aumenta
la variabilidad del output.

**Nota 9 — Tabla 5: `Authorization: "Bearer "` con token vacío:**
```python
"Authorization": "Bearer ",
```
El header de autorización tiene el token vacío. Toda request a OpenRouter con este header
retornará 401 Unauthorized. Es un placeholder sin señalización explícita de que debe ser
completado — a diferencia del patrón `os.getenv()` usado en Tabla 4 que al menos fuerza
la configuración via variables de entorno.

**Nota 10 — Tablas 6 y 7: JSON inválido con `...` como ellipsis:**
```json
{
  "model": "openrouter/auto",
  ... // Other params
}
```
`...` no es JSON válido. Los comentarios `//` tampoco son JSON válido. Estos snippets
son pseudo-JSON ilustrativo — igual que el patrón de "conceptual code" de Tablas 1 y 2,
pero sin la advertencia explícita. Un parser JSON rechazaría estos snippets.

**Nota 11 — `CRITIC_SYSTEM_PROMPT` (Tabla 3) sin integración en el código:**
La Tabla 3 define `CRITIC_SYSTEM_PROMPT` como un string standalone. No hay código en las
tablas que muestre cómo este prompt se integra con un agente, runner, o pipeline. Es un
artefacto conceptual — igual que la `Tabla 3` de Cap.11 (`EXPERT_CODE_REVIEWER_PROMPT`)
que tampoco estaba integrada en el código ejecutable. Patrón repetido: prompts de sistema
presentados como componentes de diseño sin integración demostrable.

**Nota 12 — Patrón "Named Mechanism vs. Implementation" (sexto capítulo consecutivo):**
Cap.16 se titula "Resource-Aware Optimization". El único mecanismo de routing demostrado
(Tabla 2) usa `len(user_query.split()) < 20` — un contador de palabras. No hay:
- Métricas de costo real (tokens, latencia, pricing)
- Feedback loop de optimización
- Configuración dinámica de threshold
- Monitoring de uso de recursos
La "resource awareness" es nominal. El capítulo continúa el patrón de Cap.10-15 donde
el mecanismo nombrado en el título es el menos implementado en el código.
