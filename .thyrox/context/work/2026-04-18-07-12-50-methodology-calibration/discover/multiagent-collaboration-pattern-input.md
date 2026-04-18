```yml
created_at: 2026-04-18 17:32:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: Capítulo 7 — "Colaboración Multiagente" (libro agentic design patterns, traducción profesional)
nota: Quinto patrón analizado. Complementa Cap.1 Chaining, Cap.2 Routing, Cap.3 Parallelization, Cap.6 Planning.
```

# Input: Capítulo 7 — Colaboración Multiagente

---

## 1. Posición del capítulo en la secuencia del libro

El capítulo se posiciona como el quinto patrón analizado, que opera a un nivel de abstracción superior:
- Cap. 1 Chaining → secuencia lineal predeterminada
- Cap. 2 Routing → lógica condicional dinámica
- Cap. 3 Parallelization → ejecución concurrente con merger
- Cap. 6 Planning → generación autónoma del workflow
- **Cap. 7 Multi-Agent Collaboration → arquitectura de múltiples agentes especializados**

La tesis del capítulo:
> "Aunque una arquitectura monolítica de agentes puede ser efectiva para problemas bien definidos, sus capacidades a menudo se ven limitadas cuando se enfrenta a tareas complejas y multidominio."

---

## 2. El problema que motiva el patrón

**Limitación del agente único:** Las capacidades de un agente monolítico están limitadas por el alcance y los recursos del agente individual. Un objetivo de alto nivel complejo y multidominio requiere conocimiento especializado que ningún agente único puede cubrir óptimamente.

**Solución propuesta:**
> "El patrón de Colaboración Multiagente aborda estas limitaciones al estructurar un sistema como un conjunto cooperativo de agentes distintos y especializados."

**Principio fundacional:** descomposición de tareas — un objetivo de alto nivel se desglosa en subproblemas discretos, cada uno asignado al agente con las herramientas, datos o capacidades de razonamiento más adecuadas.

---

## 3. Las 5 formas de colaboración

| Forma | Descripción | Análogo a |
|-------|-------------|-----------|
| **Secuencial** | Un agente completa y pasa su salida al siguiente | Chaining (Cap.1) con agentes distintos |
| **Paralela** | Múltiples agentes trabajan simultáneamente; resultados se combinan | Parallelization (Cap.3) con agentes distintos |
| **Consenso** | Agentes con perspectivas variadas discuten y llegan a decisión informada | Nuevo — sin equivalente en caps anteriores |
| **Basada en herramientas** | Cada agente maneja un grupo relevante de herramientas | Especialización funcional del agente |
| **Especialización por dominio** | Agentes con conocimiento de dominio distinto (investigador, escritor, editor) | Especialización disciplinar del agente |

---

## 4. Los 5 modelos de interrelación y comunicación

El capítulo distingue un espectro desde el más simple hasta el más complejo:

### 4.1 Agente Único
- Opera autónomamente sin interacción con otras entidades
- Adecuado para subproblemas independientes y autosuficientes
- Limitación: capacidades acotadas por un único agente

### 4.2 Red
- Múltiples agentes interactúan directamente entre sí de forma descentralizada
- Comunicación "de persona a persona" (peer-to-peer)
- Ventaja: resiliencia ante fallo de un agente
- Desafío: gestión de sobrecarga de comunicación y coherencia en red grande

### 4.3 Supervisor
- Un agente supervisor coordina a agentes subordinados
- Estructura jerárquica: centro para comunicación, asignación y resolución de conflictos
- Ventaja: líneas claras de autoridad
- Riesgo: **punto único de falla** + cuello de botella si abrumado

### 4.4 Supervisor como Herramienta
- El supervisor provee recursos, orientación o soporte analítico (no mando y control)
- Habilita a los agentes sin dictar cada acción
- Busca capacidades del supervisor sin control rígido de arriba hacia abajo

### 4.5 Jerárquico
- Estructura multicapa: múltiples niveles de supervisores
- Supervisores de nivel superior supervisan a los de nivel inferior
- Base: agentes operacionales
- Adecuado para: problemas descomponibles en subproblemas con gestión por capa

**Regla de selección de modelo:**

| Situación | Modelo recomendado |
|-----------|-------------------|
| Problemas simples y bien estructurados | Agente Único o Supervisor |
| Entornos complejos y dinámicos | Red o Jerárquico |

---

## 5. Requisitos fundamentales del sistema

> "Un sistema multiagente fundamentalmente comprende:
> 1. La delineación de roles y responsabilidades de agentes
> 2. El establecimiento de canales de comunicación a través de los cuales los agentes intercambien información
> 3. La formulación de un flujo de tareas o protocolo de interacción que dirija sus esfuerzos colaborativos"

**Condición técnica crítica:**
> "Es crítica respecto a los mecanismos de comunicación entre agentes. Esto requiere un protocolo de comunicación estandarizado y una ontología compartida, permitiendo que los agentes intercambien datos, deleguen subtareas y coordinen sus acciones."

---

## 6. Casos de uso documentados

| Dominio | Agentes especializados |
|---------|----------------------|
| Investigación | búsqueda BD académicas + resumidor + identificador de tendencias + sintetizador |
| Desarrollo de software | analista de requisitos + generador de código + probador + escritor de documentación |
| Marketing | investigación de mercado + copywriter + diseño gráfico + programación RRSS |
| Finanzas | datos de acciones + análisis de sentimiento de noticias + análisis técnico + recomendaciones |
| Cadena de suministro | proveedores + fabricantes + distribuidores (nodos representados por agentes) |
| Operaciones autónomas | diagnóstico de fallas + clasificación + remediación + integración con ML tradicional |

---

## 7. Implementación con CrewAI

```python
from crewai import Agent, Task, Crew, Process

# Tres agentes especializados con herramientas distintas
researcher_agent = Agent(
    role="Research Analyst",
    goal="Conduct thorough research and gather relevant information",
    backstory="Expert researcher with strong analytical skills.",
    tools=[web_search_tool, database_query_tool],
    allow_delegation=False
)

writer_agent = Agent(
    role="Content Writer",
    goal="Write clear, engaging content based on research findings",
    backstory="Professional writer specializing in technical documentation.",
    tools=[word_processor_tool],
    allow_delegation=False
)

editor_agent = Agent(
    role="Editor",
    goal="Review and refine content for clarity and coherence",
    backstory="Experienced editor ensuring quality and consistency.",
    tools=[review_tool, grammar_check_tool],
    allow_delegation=False
)

# Tareas encadenadas: cada tarea tiene un agente específico
research_task = Task(
    description="Research the topic and compile findings",
    expected_output="Comprehensive research document",
    agent=researcher_agent
)

writing_task = Task(
    description="Write content based on the research",
    expected_output="Well-structured document",
    agent=writer_agent
)

editing_task = Task(
    description="Review and refine the document",
    expected_output="Polished, publication-ready document",
    agent=editor_agent
)

# Crew con proceso secuencial
crew = Crew(
    agents=[researcher_agent, writer_agent, editor_agent],
    tasks=[research_task, writing_task, editing_task],
    process=Process.sequential
)

result = crew.kickoff()
```

**Principios arquitectónicos del código:**
1. Tres agentes con `role` y `tools` distintos → especialización
2. `allow_delegation=False` en todos → sin re-delegación lateral
3. `Process.sequential` → ejecución en orden: researcher → writer → editor
4. Cada tarea tiene un `agent` asignado explícitamente → contrato claro

---

## 8. Ventajas declaradas de la arquitectura multiagente

| Ventaja | Descripción |
|---------|-------------|
| **Modularidad** | Cada agente es un componente independiente y reemplazable |
| **Escalabilidad** | Se pueden agregar agentes sin rediseñar el sistema completo |
| **Robustez** | Fallo de un agente no causa falla total del sistema |
| **Sinergia** | "El desempeño colectivo supera las capacidades potenciales de cualquier agente individual" |

---

## 9. Relación con los patrones anteriores

El capítulo posiciona Multi-Agent Collaboration como una capa sobre los patrones individuales:

```
Multi-Agent Collaboration (organización y roles)
├── Secuencial → usa Chaining internamente
├── Paralela → usa Parallelization internamente
├── Con workflow dinámico → usa Planning internamente
└── Con decisiones condicionales → usa Routing internamente
```

Diferencia clave respecto a Parallelization (Cap.3):
- Cap.3: múltiples invocaciones del **mismo** contexto de agente, resultados se fusionan
- Cap.7: múltiples **agentes distintos** con roles, herramientas y conocimiento diferente

---

## 10. Implicaciones directas para THYROX

| Concepto del capítulo | Aplicación THYROX | Notas |
|----------------------|------------------|-------|
| Modelo Supervisor | Gate calibrado: evaluadores paralelos → merger grounded | Ya implementado en el análisis de Cap.3 |
| Modelo Jerárquico | WP con sub-WPs: coordinator → workflow stages → agentes especializados | ÉPICA 40 ya implementó coordinators |
| Especialización por dominio | Agentes `deep-dive`, `agentic-reasoning`, `task-executor` como agentes especializados | Ya existentes en el sistema |
| "Ontología compartida" | `now.md` como estado compartido entre agentes + `output_key` como contrato | Ya implementado con `now-{agent}.md` |
| `allow_delegation=False` | Evaluadores en gate no delegan — producen su evaluación directamente | Contrato del merger (grounded exclusively) |
| Resiliencia: fallo de un agente | Router → ruta `unclear` si evaluador no puede clasificar | Ya documentado en arquitectura del gate |
| Modelo Consenso | Múltiples evaluadores con perspectivas distintas → merger produce decisión | Equivale al Merger grounded del gate THYROX |
| Punto único de falla en Supervisor | El merger del gate es un punto de síntesis — mitigación: merger con prompt verificable | Pendiente de definición formal |
