```yml
created_at: 2026-04-19 10:39:58
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: "Chapter 11: Goal Setting and Monitoring — Tablas y Bloques de Código (contenido faltante en extracción EPUB)" (documento externo, 2026-04-19)
nota: |
  Contenido COMPLEMENTARIO al ya analizado en:
  - goal-monitoring-original-input.md (texto principal EPUB)
  - goal-monitoring-pattern-input.md (traducción española)
  Este archivo contiene únicamente el contenido de las tablas HTML que no fue
  capturado por CAP11_EXTRACTION.adoc. Incluye:
  - Tabla 1: instrucciones de instalación
  - Tabla 2: código Python completo (Iteration 2, LangChain + OpenAI)
  - Tabla 3: system prompt del Expert Code Reviewer
  El análisis previo (goal-monitoring-original-deep-dive.md, 60.6% calibración)
  fue ejecutado SIN este contenido. Este suplemento permite verificar si los
  hallazgos previos se confirman, se agravan, o se mitigan.
```

# Input: Chapter 11 — Goal Setting and Monitoring (tablas HTML faltantes, preservado verbatim)

---

## Tabla 1 — Instalación

```bash
pip install langchain_openai openai python-dotenv
 .env file with key in OPENAI_API_KEY
```

---

## Tabla 2 — Código Python completo (Iteration 2)

```python
# MIT License
# Copyright (c) 2025 Mahtab Syed
# https://www.linkedin.com/in/mahtabsyed/
"""
Hands-On Code Example - Iteration 2
- To illustrate the Goal Setting and Monitoring pattern, we have an example using LangChain and OpenAI APIs:
Objective: Build an AI Agent which can write code for a specified use case based on specified goals:
- Accepts a coding problem (use case) in code or can be as input.
- Accepts a list of goals (e.g., "simple", "tested", "handles edge cases") in code or can be input.
- Uses an LLM (like GPT-4o) to generate and refine Python code until the goals are met. (I am using max 5 iterations, this could be based on a set goal as well)
- To check if we have met our goals I am asking the LLM to judge this and answer just True or False which makes it easier to stop the iterations.
- Saves the final code in a .py file with a clean filename and a header comment.
"""
import os
import random
import re
from pathlib import Path
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv, find_dotenv
# 🔐 Load environment variables
_ = load_dotenv(find_dotenv())
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise EnvironmentError("❌ Please set the OPENAI_API_KEY environment variable.")
# ✅ Initialize OpenAI model
print("📡 Initializing OpenAI LLM (gpt-4o)...")
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.3,
    openai_api_key=OPENAI_API_KEY,
)
# --- Utility Functions ---
def generate_prompt(
    use_case: str, goals: list[str], previous_code: str = "", feedback: str = ""
) -> str:
    print("📝 Constructing prompt for code generation...")
    base_prompt = f"""
You are an AI coding agent. Your job is to write Python code based on the following use case:
Use Case: {use_case}
Your goals are:
{chr(10).join(f"- {g.strip()}" for g in goals)}
"""
    if previous_code:
        print("🔄 Adding previous code to the prompt for refinement.")
        base_prompt += f"\nPreviously generated code:\n{previous_code}"
    if feedback:
        print("📋 Including feedback for revision.")
        base_prompt += f"\nFeedback on previous version:\n{feedback}\n"
    base_prompt += "\nPlease return only the revised Python code. Do not include comments or explanations outside the code."
    return base_prompt

def get_code_feedback(code: str, goals: list[str]) -> str:
    print("🔍 Evaluating code against the goals...")
    feedback_prompt = f"""
You are a Python code reviewer. A code snippet is shown below. Based on the following goals:
{chr(10).join(f"- {g.strip()}" for g in goals)}
Please critique this code and identify if the goals are met. Mention if improvements are needed for clarity, simplicity, correctness, edge case handling, or test coverage.
Code:
{code}
"""
    return llm.invoke(feedback_prompt)

def goals_met(feedback_text: str, goals: list[str]) -> bool:
    """
    Uses the LLM to evaluate whether the goals have been met based on the feedback text.
    Returns True or False (parsed from LLM output).
    """
    review_prompt = f"""
You are an AI reviewer.
Here are the goals:
{chr(10).join(f"- {g.strip()}" for g in goals)}
Here is the feedback on the code:
\"\"\"
{feedback_text}
\"\"\"
Based on the feedback above, have the goals been met?
Respond with only one word: True or False.
"""
    response = llm.invoke(review_prompt).content.strip().lower()
    return response == "true"

def clean_code_block(code: str) -> str:
    lines = code.strip().splitlines()
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()

def add_comment_header(code: str, use_case: str) -> str:
    comment = f"# This Python program implements the following use case:\n# {use_case.strip()}\n"
    return comment + "\n" + code

def to_snake_case(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9 ]", "", text)
    return re.sub(r"\s+", "_", text.strip().lower())

def save_code_to_file(code: str, use_case: str) -> str:
    print("💾 Saving final code to file...")
    summary_prompt = (
        f"Summarize the following use case into a single lowercase word or phrase, "
        f"no more than 10 characters, suitable for a Python filename:\n\n{use_case}"
    )
    raw_summary = llm.invoke(summary_prompt).content.strip()
    short_name = re.sub(r"[^a-zA-Z0-9_]", "", raw_summary.replace(" ", "_").lower())[:10]
    random_suffix = str(random.randint(1000, 9999))
    filename = f"{short_name}_{random_suffix}.py"
    filepath = Path.cwd() / filename
    with open(filepath, "w") as f:
        f.write(code)
    print(f"✅ Code saved to: {filepath}")
    return str(filepath)

# --- Main Agent Function ---
def run_code_agent(use_case: str, goals_input: str, max_iterations: int = 5) -> str:
    goals = [g.strip() for g in goals_input.split(",")]
    print(f"\n🎯 Use Case: {use_case}")
    print("🎯 Goals:")
    for g in goals:
        print(f"  - {g}")
    previous_code = ""
    feedback = ""
    for i in range(max_iterations):
        print(f"\n=== 🔁 Iteration {i + 1} of {max_iterations} ===")
        prompt = generate_prompt(use_case, goals, previous_code, feedback if isinstance(feedback, str) else feedback.content)
        print("🚧 Generating code...")
        code_response = llm.invoke(prompt)
        raw_code = code_response.content.strip()
        code = clean_code_block(raw_code)
        print("\n🧾 Generated Code:\n" + "-" * 50 + f"\n{code}\n" + "-" * 50)
        print("\n📤 Submitting code for feedback review...")
        feedback = get_code_feedback(code, goals)
        feedback_text = feedback.content.strip()
        print("\n📥 Feedback Received:\n" + "-" * 50 + f"\n{feedback_text}\n" + "-" * 50)
        if goals_met(feedback_text, goals):
            print("✅ LLM confirms goals are met. Stopping iteration.")
            break
        print("🛠️ Goals not fully met. Preparing for next iteration...")
        previous_code = code
    final_code = add_comment_header(code, use_case)
    return save_code_to_file(final_code, use_case)

# --- CLI Test Run ---
if __name__ == "__main__":
    print("\n🧠 Welcome to the AI Code Generation Agent")
    # Example 1
    use_case_input = "Write code to find BinaryGap of a given positive integer"
    goals_input = "Code simple to understand, Functionally correct, Handles comprehensive edge cases, Takes positive integer input only, prints the results with few examples"
    run_code_agent(use_case_input, goals_input)
    # Example 2
    # use_case_input = "Write code to count the number of files in current directory and all its nested sub directories, and print the total count"
    # goals_input = (
    #     "Code simple to understand, Functionally correct, Handles comprehensive edge cases, Ignore recommendations for performance, Ignore recommendations for test suite use like unittest or pytest"
    # )
    # run_code_agent(use_case_input, goals_input)
    # Example 3
    # use_case_input = "Write code which takes a command line input of a word doc or docx file and opens it and counts the number of words, and characters in it and prints all"
    # goals_input = "Code simple to understand, Functionally correct, Handles edge cases"
    # run_code_agent(use_case_input, goals_input)
```

---

## Tabla 3 — Expert Code Reviewer (system prompt)

```
Act as an expert code reviewer with a deep commitment to producing clean, correct, and simple code. Your core mission is to eliminate code "hallucinations" by ensuring every suggestion is grounded in reality and best practices.
When I provide you with a code snippet, I want you to:
-- Identify and Correct Errors: Point out any logical flaws, bugs, or potential runtime errors.
-- Simplify and Refactor: Suggest changes that make the code more readable, efficient, and maintainable without sacrificing correctness.
-- Provide Clear Explanations: For every suggested change, explain why it is an improvement, referencing principles of clean code, performance, or security.
-- Offer Corrected Code: Show the "before" and "after" of your suggested changes so the improvement is clear.
Your feedback should be direct, constructive, and always aimed at improving the quality of the code.
```

---

## Notas editoriales del orquestador

**Nota 1 — `to_snake_case` es código muerto (confirmado en código completo):**
La función `to_snake_case(text: str)` está definida en el módulo pero **nunca es llamada** en ninguna parte del código. `save_code_to_file` construye el nombre del archivo usando `re.sub` inline directamente sobre `raw_summary`, no usando `to_snake_case`. La función existe, está correctamente implementada, pero es dead code. Ya detectado en el análisis del EPUB, ahora confirmado con el código completo.

**Nota 2 — `UnboundLocalError` cuando `max_iterations=0` (confirmado):**
En `run_code_agent`, si `max_iterations=0` el bucle `for i in range(0)` no ejecuta ninguna iteración. La variable `code` nunca es asignada. Las líneas que siguen al bucle:
```python
final_code = add_comment_header(code, use_case)
return save_code_to_file(final_code, use_case)
```
referencian `code` que no existe → `UnboundLocalError: local variable 'code' referenced before assignment`. Esto no está protegido con un guard ni documentado como prerequisito. La firma de la función permite `max_iterations: int = 5`, lo cual implica que valores arbitrarios son aceptables.

**Nota 3 — `feedback` type inconsistency (confirmado con código completo):**
`feedback` se inicializa como `""` (str). Tras la primera iteración, `get_code_feedback` retorna `llm.invoke(feedback_prompt)` que es un objeto `AIMessage` (BaseMessage), no un str.
El código en `generate_prompt` maneja esto con:
```python
feedback if isinstance(feedback, str) else feedback.content
```
Pero hay un problema más sutil: en la segunda iteración, `generate_prompt` recibe el AIMessage y llama `.content` — correcto. Sin embargo, la condición `if feedback:` en `generate_prompt` evalúa un AIMessage como truthy siempre (incluso si `.content` es ""), lo cual es distinto de un str vacío. El comportamiento en la iteración 1 (feedback="") y en la iteración 2+ (feedback=AIMessage) es asimétrico.

**Nota 4 — `goals_met` es LLM-as-judge (confirmado en docstring):**
El docstring explícito:
```
Uses the LLM to evaluate whether the goals have been met based on the feedback text.
Returns True or False (parsed from LLM output).
```
El capítulo describe esto como "To check if we have met our goals I am asking the LLM to judge this and answer just True or False which makes it easier to stop the iterations." Esta es una elección de diseño explícitamente documentada por el autor — no es un bug, es la decisión de implementación. Sin embargo, el capítulo no menciona las limitaciones de LLM-as-judge: sycophancy (el LLM tiende a decir True para ser complaciente), inconsistencia entre invocaciones del mismo prompt, y ausencia de métricas objetivas. El monitoring mencionado en el título del capítulo es delegado a otro LLM.

**Nota 5 — Tabla 3 (Expert Code Reviewer) NO está integrada en el código de Tabla 2:**
El system prompt de Tabla 3 ("Act as an expert code reviewer...eliminate code hallucinations") NO aparece en ninguna función de Tabla 2. El código de Iteration 2 usa:
- `generate_prompt` para generar código (prompt propio)
- `get_code_feedback` para revisar código (prompt propio distinto)
- `goals_met` para evaluar si los objetivos fueron alcanzados (prompt propio distinto)

Tabla 3 es el prompt de un "Expert Code Reviewer" que se presenta en el EPUB como concepto, pero cuya integración en el código no está mostrada. La arquitectura del agente real usa 3 prompts internos; el Expert Code Reviewer es un 4to artefacto de prompt que existe como concepto editorial sin implementación en el snippet.

Consecuencia: el deep-dive previo encontró "C-6: Expert Code Review describes bug-catching reviewer; `goals_met` answers True/False — no overlap" — confirmado ahora con el código completo. El capítulo presenta la Expert Code Review como feature del patrón pero el código usa un reviewer interno diferente.

**Nota 6 — "eliminate code hallucinations" en Tabla 3 es un claim verificable en el sistema completo:**
"Act as an expert code reviewer with a deep commitment to producing clean, correct, and simple code. Your core mission is to **eliminate code hallucinations**."
Si este prompt es aplicado sobre el código generado por el LLM, puede reducir alucinaciones específicas. Sin embargo:
a) No está integrado en el código de Tabla 2 (Nota 5)
b) El sistema usa LLM-as-judge (Nota 4) que puede aceptar código con alucinaciones si el LLM revisor es sycophantic
c) La palabra "eliminate" es un claim absoluto — el sistema puede *reducir* alucinaciones, no eliminarlas
El claim de "eliminate hallucinations" en Tabla 3 tiene el mismo problema que claims performativos de otros capítulos: promete más de lo que el mecanismo puede verificar.

**Nota 7 — El código completo confirma que el loop termina silenciosamente por exhaustión:**
El bucle:
```python
for i in range(max_iterations):
    ...
    if goals_met(feedback_text, goals):
        print("✅ LLM confirms goals are met. Stopping iteration.")
        break
    print("🛠️ Goals not fully met. Preparing for next iteration...")
    previous_code = code
```
Si `goals_met` nunca retorna True en 5 iteraciones, el loop se agota y la ejecución continúa con `final_code = add_comment_header(code, use_case)` — usando el código de la **última iteración** sin ningún mensaje de que los objetivos NO fueron alcanzados. El usuario recibe el archivo final sin saber si los goals fueron met o no.

Esta es exactamente la contradicción detectada en el deep-dive previo: el capítulo se titula "Goal Setting and **Monitoring**" — el monitoring de si se alcanzaron los goals produce el mismo output (guardar el archivo) independientemente del resultado. El sistema no distingue entre éxito y fracaso en su output final.

**Nota 8 — Diferencia entre Iteration 1 y Iteration 2:**
El EPUB menciona "Iteration 2" en el comentario del archivo. Tabla 2 es el código de Iteration 2. Iteration 1 (no incluida en las tablas) probablemente era una versión anterior/más simple. El capítulo presentó la evolución del código, pero solo la versión final (Iteration 2) está en las tablas. Esto no es un defecto — es la versión final que el capítulo considera correcta.

**Nota 9 — `save_code_to_file` hace una llamada LLM para el nombre del archivo:**
```python
summary_prompt = (
    f"Summarize the following use case into a single lowercase word or phrase, "
    f"no more than 10 characters, suitable for a Python filename:\n\n{use_case}"
)
raw_summary = llm.invoke(summary_prompt).content.strip()
```
Una llamada LLM para generar un nombre de archivo introduce: latencia, costo, y posibilidad de que el LLM genere algo que `re.sub(r"[^a-zA-Z0-9_]", "", ...)[:10]` reduzca a una cadena vacía (resultando en un filename de `_NNNN.py`). Este edge case no está manejado.

**Nota 10 — Relación con los análisis previos (goal-monitoring-original-*):**
Los hallazgos del deep-dive previo (9 saltos, 7 contradicciones, 5 engaños, 60.6% calibración) fueron realizados SIN el código completo de Tabla 2. Con el código completo:
- Los bugs de Notas 1-3 ya habían sido detectados (excepto la inconsistencia de `feedback` type que es nueva)
- La contradicción C-6 (Expert Code Review no integrada) ahora está CONFIRMADA con evidencia directa
- El mecanismo de silent loop termination (Nota 7) confirma la contradicción principal del capítulo
El código completo NO cambia el veredicto previo — lo confirma y agrega 2 observaciones nuevas (Nota 3 feedback type, Nota 9 LLM para filename).
