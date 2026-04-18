```yml
created_at: 2026-04-18 16:49:14
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: Capítulo 6 — "Planificación" (libro agentic design patterns, traducción profesional)
nota: Cuarto patrón agentic del libro. Complementa Cap.1 Chaining, Cap.2 Routing, Cap.3 Parallelization.
```

# Input: Capítulo 6 — Deep-Review Completo de Planificación

---

## 1. Posición del capítulo en la secuencia del libro

El capítulo se posiciona como el cuarto patrón agentic, complementando los anteriores:
- Cap. 1 Chaining → secuencia lineal con validación por eslabón
- Cap. 2 Routing → lógica condicional dinámica
- Cap. 3 Parallelization → ejecución concurrente con merger grounded
- **Cap. 6 Planning → descomposición autónoma de objetivos en secuencias de acciones**

La síntesis del capítulo:
> "El patrón de planificación proporciona el puente esencial entre la intención humana y la ejecución automatizada para problemas complejos."

---

## 2. El problema que motiva el patrón — formulación precisa

> "El comportamiento inteligente a menudo implica más que solo reaccionar a la entrada inmediata. Requiere previsión, descomposición de tareas complejas en pasos más pequeños y manejables, y estrategia sobre cómo lograr un resultado deseado."

La distinción clave respecto a los patrones anteriores:
- Chaining/Routing/Parallelization → el flujo de trabajo **ya se conoce** de antemano
- **Planning → el "cómo" debe ser descubierto autónomamente**

> "La decisión de usar un agente de planificación versus un agente simple de ejecución de tareas depende de una única pregunta: ¿necesita el 'cómo' ser descubierto, o ya se conoce?"

---

## 3. Definición técnica del patrón

> "El patrón de planificación es un proceso computacional fundamental en sistemas autónomos, que permite a un agente sintetizar una secuencia de acciones para lograr un objetivo especificado, particularmente en entornos dinámicos o complejos. Este proceso transforma un objetivo de alto nivel en un plan estructurado compuesto de pasos discretos y ejecutables."

**Elementos del plan:**
- **Estado inicial**: condiciones actuales del problema (presupuesto, participantes, fechas disponibles)
- **Estado objetivo**: resultado deseado (reunión organizada exitosamente)
- **Secuencia de acciones**: pasos discretos que conectan estado inicial con objetivo
- **Adaptabilidad**: el plan inicial es un punto de partida, no un guion rígido

---

## 4. Principio de equilibrio: flexibilidad vs. predictibilidad

El capítulo introduce una tensión explícita que diferencia Planning de los otros patrones:

> "Es crucial reconocer el equilibrio entre flexibilidad y predictibilidad. La planificación dinámica es una herramienta específica, no una solución universal. Cuando la solución de un problema ya se comprende bien y es repetible, es más efectivo limitar al agente a un flujo de trabajo fijo predeterminado."

**Regla de selección del patrón:**

| Situación | Patrón correcto |
|-----------|----------------|
| "Cómo" ya se conoce, solución repetible | Chaining / Routing / Parallelization |
| "Cómo" debe ser descubierto, entorno dinámico | **Planning** |

---

## 5. Casos de uso documentados

| Dominio | Aplicación | Característica planning |
|---------|-----------|------------------------|
| Automatización procedimental | Onboarding de empleado: crear cuentas, asignar capacitaciones, coordinar departamentos | Dependencias ordenadas, herramientas externas |
| Robótica/navegación | Ruta de robot con obstáculos, restricciones de tráfico | Optimización de métricas (tiempo, energía) |
| Síntesis de información | Informe de investigación: recopilación → resumen → estructuración → refinamiento iterativo | Fases diferenciadas con bucle iterativo |
| Soporte al cliente | Diagnóstico → solución → escalamiento | Plan sistemático multi-paso |

---

## 6. Implementación con CrewAI

```python
from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4-turbo")

planner_writer_agent = Agent(
    role="Article Planner and Writer",
    goal="Plan and then write a concise, engaging summary on a specified topic.",
    backstory="You are an expert technical writer and content strategist with strength in planning.",
    allow_delegation=False,
    llm=llm
)

topic = "The importance of Reinforcement Learning in AI"

high_level_task = Task(
    description=f"Create a plan and write a summary on: {topic}",
    expected_output="A report with bullet points and a 200-word summary.",
    agent=planner_writer_agent
)

crew = Crew(
    agents=[planner_writer_agent],
    tasks=[high_level_task],
    process=Process.sequential,
    verbose=True
)

result = crew.kickoff()
```

**Principios del código CrewAI:**
1. Un solo agente tiene el rol combinado de planner + writer — el plan emerge del propio LLM
2. El objetivo de alto nivel (`topic`) se delega sin especificar los pasos intermedios
3. `Process.sequential` — el agente crea y luego ejecuta su propio plan internamente

---

## 7. Google DeepResearch — Planning avanzado asíncrono

Gemini DeepResearch ejemplifica el patrón en su forma más sofisticada:

**Fases del pipeline agentico:**
1. **Deconstrucción**: convierte la solicitud del usuario en un plan de investigación multipunto
2. **Revisión colaborativa**: el plan se presenta al usuario para modificación antes de ejecutar
3. **Bucle iterativo**: el agente reformula consultas dinámicamente según brechas de conocimiento
4. **Síntesis asíncrona**: procesamiento resiliente — el usuario puede desconectarse
5. **Informe estructurado**: narrativa coherente con secciones lógicas + citas verificables

**Características arquitectónicas clave:**
- **Asincronismo**: resiliente a fallos de punto único, notificación al completarse
- **Integración de documentos privados**: combina fuentes web con documentos del usuario
- **Evaluación crítica**: identifica temas principales, organiza contenido, no concatena hallazgos
- **Output interactivo**: resumen de audio, gráficos, links a fuentes originales

---

## 8. OpenAI Deep Research — implementación con API

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_OPENAI_API_KEY")

system_message = "You are a professional researcher preparing a structured, data-driven report."
user_query = "Research the economic impact of semaglutide on global healthcare systems."

response = client.responses.create(
    model="o3-deep-research-2025-06-26",
    messages=[
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_query}
    ],
    reasoning={"type": "enabled", "budget_tokens": 10000},
    tools=[{"type": "web_search"}]
)

final_report = response.content[-1].text
```

**Principios del código OpenAI:**
1. `reasoning={"budget_tokens": 10000}` — tokens dedicados al proceso de planificación interno
2. `tools=[{"type": "web_search"}]` — herramientas disponibles para el agente durante ejecución
3. El agente descompone autónomamente `user_query` en subpreguntas y ejecuta el plan

---

## 9. Síntesis: los cuatro patrones como arquitectura completa

| Patrón | Función principal | Cómo combina con los otros |
|--------|-----------------|--------------------------|
| Chaining | Secuencia predeterminada con validación | Eslabones del plan |
| Routing | Decisión condicional en cada nodo | Rama del plan según estado |
| Parallelization | Evaluación concurrente | Pasos del plan sin dependencia mutua |
| **Planning** | **Generación autónoma del flujo de trabajo** | **Produce el chaining/routing/parallelization a seguir** |

La relación jerárquica es clave:
> Planning → genera el workflow → que se ejecuta mediante Chaining + Routing + Parallelization

---

## Implicaciones directas para THYROX

| Concepto del capítulo | Aplicación THYROX | Notas |
|----------------------|------------------|-------|
| "¿Necesita el cómo ser descubierto?" | Criterio de selección Stage 8 PLAN EXECUTION vs. Stage 1 DISCOVER | Distingue WPs que necesitan exploración de los que tienen path claro |
| Plan = estado inicial + objetivo + secuencia | Exit conditions = estado objetivo con predicados verificables | Cada EC debe tener estado inicial implícito |
| Plan inicial es punto de partida, no guion rígido | Gates con routing 4 rutas (pass/rework/escalate/unclear) | El routing implementa la adaptabilidad del plan |
| Revisión colaborativa antes de ejecutar | Gate SP-N humano antes de Stage 10 IMPLEMENT | Aprobar el plan antes de la ejecución irreversible |
| Asincronismo + notificación al completar | Agentes en background con task-notifications | Patrón ya implementado en el sistema THYROX actual |
| Budget de reasoning tokens | `reasoning={"budget_tokens": N}` en llamadas de alto nivel | Relevar para Stage 9 PILOT si se usa Claude API directamente |
