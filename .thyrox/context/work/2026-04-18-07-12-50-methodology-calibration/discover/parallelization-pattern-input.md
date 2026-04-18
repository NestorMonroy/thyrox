```yml
created_at: 2026-04-18 08:51:42
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
fuente: Capítulo 3 — "Paralelización" (traducción profesional completa, libro agentic design patterns)
```

# Input: Capítulo 3 — Deep-Review Completo de Paralelización

---

## Conceptos del capítulo — lectura exhaustiva

### 1. El problema que motiva el patrón

El capítulo parte del mismo punto que Cap. 2 (Routing): el procesamiento secuencial es insuficiente para escenarios adaptativos. Pero la motivación es distinta:
- Cap. 2 Routing → el problema es la **rigidez** (una sola ruta)
- Cap. 3 Paralelización → el problema es la **latencia acumulada** (tareas independientes ejecutadas en serie)

> "El patrón de paralelización es vital para mejorar la **eficiencia y capacidad de respuesta** de los sistemas agentes, especialmente cuando se trata de tareas que implican múltiples operaciones independientes o débilmente acopladas."

**Principio de eficiencia fundamental:**
> "Tiempo total = tiempo del componente más lento, en lugar del tiempo total requerido para hacerlo secuencialmente."

Este principio aplica directamente a los gates de calibración THYROX: si un gate ejecuta N evaluadores en serie, el tiempo total es la suma. Si los ejecuta en paralelo, el tiempo total es el del evaluador más lento.

---

### 2. El patrón Fan-out → Fan-in

El capítulo presenta una arquitectura central implícita en ambos ejemplos de código:

```
Input
  ↓
Fan-out (paralelo) — N tareas independientes ejecutándose simultáneamente
  ├─ Tarea A → resultado_A
  ├─ Tarea B → resultado_B
  └─ Tarea C → resultado_C
  ↓
Fan-in (síntesis) — un merger que combina los N resultados
  ↓
Output sintetizado
```

En LangChain: `RunnableParallel({"a": chain_A, "b": chain_B, "c": chain_C}) → synthesis_prompt → LLM`
En ADK: `ParallelAgent([agent_A, agent_B, agent_C])` → estado compartido → `merger_agent`

Este patrón Fan-out/Fan-in es la arquitectura de un gate de validación multi-perspectiva.

---

### 3. Los 7 casos de uso — análisis para THYROX

| Caso de uso | Patrón | Relevancia para calibración THYROX |
|------------|--------|-------------------------------------|
| **1. Recopilación de información** | N fuentes en paralelo → síntesis | Stage 1 DISCOVER: buscar evidencia en múltiples fuentes simultáneamente |
| **2. Procesamiento y análisis de datos** | N técnicas de análisis en paralelo sobre el mismo dataset | Gate ANALYZE: ejecutar análisis de cobertura + naming + arquitectura en paralelo |
| **3. Interacción multi-API** | N llamadas a APIs independientes | Sub-análisis de un stage que requieren múltiples herramientas |
| **4. Generación de contenido multi-componente** | N componentes en paralelo → ensamblaje | Generar múltiples secciones de un artefacto WP simultáneamente |
| **5. Validación y verificación** | N comprobaciones independientes en paralelo | **Gate calibrado**: ejecutar N predicados de validación en paralelo |
| **6. Procesamiento multi-modal** | Texto + imagen + audio en paralelo | No aplica directamente a THYROX (solo texto) |
| **7. Prueba A/B / múltiples opciones** | N variaciones en paralelo → selección de la mejor | Generar N versiones del exit criterion → elegir la más verificable |

**Casos 5 y 7 son directamente aplicables al sistema de calibración.**

---

### 4. Caso de uso 5 — Validación en paralelo: el más relevante

> "Caso de uso: Un agente que verifica la entrada del usuario puede ejecutar múltiples validaciones en paralelo."
> "Tareas paralelas: Verificar formato, validar número, verificar dirección, detectar contenido inapropiado — simultáneamente."

Aplicado a un gate THYROX calibrado:

```
Input: artefacto de Stage N
Fan-out:
  ├─ Evaluador-1: completitud estructural (¿tiene todos los campos requeridos?)
  │               → tipo: rule-based, output: {completo: true/false, campos_faltantes: []}
  ├─ Evaluador-2: presencia de evidencia (¿cada claim tiene ancla observable?)
  │               → tipo: LLM-based con prompt forzado, output: {claims_sin_evidencia: N}
  ├─ Evaluador-3: consistencia con estado acumulado (¿contradice constraints previos?)
  │               → tipo: LLM-based, input: artefacto + artifacts de stages anteriores
  │               → output: {contradicciones: [], consistente: true/false}
  └─ Evaluador-4: verificabilidad de exit criteria (¿son predicados booleanos?)
                  → tipo: LLM-based con checklist, output: {criterios_verificables: N/M}
Fan-in:
  Merger: sintetiza los 4 outputs → decision: pass | rework | escalate | unclear
          context: lista específica de qué falló y en qué evaluador
```

Este es el gate calibrado completo — no una sola llamada LLM que evalúa todo, sino N evaluadores especializados en paralelo con un merger que sintetiza la decisión.

---

### 5. Caso de uso 7 — A/B de exit criteria: aplicación de calibración indirecta

> "Generar tres titulares diferentes para un artículo simultáneamente usando indicaciones o modelos ligeramente diferentes. Beneficio: selección más rápida del contenido de mejor calidad."

Aplicado a THYROX: cuando el ejecutor escribe un exit criterion, el sistema puede generar en paralelo 3 versiones con distintos niveles de verificabilidad:

```
Input: "El análisis debe ser completo"
Fan-out:
  ├─ Versión-A (literal): "El análisis debe ser completo"
  │                        → evaluación: no verificable (subjetivo)
  ├─ Versión-B (cuantificada): "El análisis cubre ≥80% de los aspectos definidos en el template"
  │                        → evaluación: parcialmente verificable (depende del template)
  └─ Versión-C (booleana): "Cada sección del template tiene al menos 1 claim con evidencia citada"
                           → evaluación: verificable (predicado booleano)
Fan-in:
  Selector: presenta las 3 versiones al ejecutor con su nivel de verificabilidad
```

Este mecanismo convierte la redacción de exit criteria en un proceso guiado de calibración.

---

### 6. Análisis del código — principios arquitectónicos extraíbles

**LangChain — `RunnableParallel`:**
```python
map_chain = RunnableParallel({
    "summary": summarize_chain,
    "questions": questions_chain,
    "key_terms": terms_chain,
    "topic": RunnablePassthrough()  # Pass-through del input original
})
full_chain = map_chain | synthesis_prompt | LLM | StrOutputParser()
```

Principios:
1. Los runners paralelos son independientes — no tienen dependencias entre sí
2. `RunnablePassthrough()` permite que el input original llegue al merger
3. La síntesis recibe TODOS los outputs como un dict estructurado — no como texto plano

**Google ADK — `ParallelAgent` + `SequentialAgent`:**
```python
# output_key almacena resultado en estado compartido de sesión
researcher_agent_1 = LlmAgent(..., output_key="renewable_energy_result")
researcher_agent_2 = LlmAgent(..., output_key="ev_technology_result")

# ParallelAgent ejecuta los N agentes concurrentemente
parallel_agent = ParallelAgent(sub_agents=[agent_1, agent_2, agent_3])

# SequentialAgent: primero paralelo, luego merger
pipeline = SequentialAgent(sub_agents=[parallel_agent, merger_agent])
```

Principios:
1. `output_key` es el mecanismo de estado compartido entre agentes paralelos y el merger
2. `SequentialAgent` envuelve el paralelo + el merger — el paralelo completa antes de que el merger inicie
3. El merger lee del estado compartido con `{renewable_energy_result}` — no del output directo

---

### 7. El principio de grounding del merger — el más relevante para calibración

El merger en el ADK tiene esta instrucción explícita:
> "**Tu respuesta DEBE estar basada EXCLUSIVAMENTE en la información proporcionada en las 'Entradas'. NO agregues conocimiento externo, hechos o detalles no presentes en estos resúmenes específicos.**"

Esta es la definición operacional de anti-realismo-performativo aplicada a una síntesis:
- El merger NO puede afirmar más de lo que los evaluadores reportaron
- Si los evaluadores encontraron que el artefacto es incompleto, el merger no puede suavizar esa conclusión
- El merger es un **agregador de evidencia**, no un generador de nueva evaluación

**Este principio debe transferirse al merger del gate calibrado THYROX:**
El merger del gate sintetiza solo lo que los evaluadores encontraron — no puede emitir `pass` si algún evaluador reportó un gap, a menos que el gap esté explícitamente bajo umbral.

---

### 8. Implicación para la arquitectura de THYROX: SequentialAgent es ya el modelo

```python
pipeline = SequentialAgent(sub_agents=[parallel_agent, merger_agent])
```

Este es exactamente el modelo de un stage THYROX calibrado:

```
Stage N:
  SequentialAgent:
    ├─ Paso 1: ejecución del stage (trabajo del stage)
    └─ Paso 2: gate calibrado
                 └─ ParallelAgent (evaluadores independientes)
                      ├─ Evaluador estructural
                      ├─ Evaluador de evidencia
                      └─ Evaluador de consistencia histórica
                 └─ Merger (sintetiza → pass/rework/escalate/unclear)
```

La arquitectura del capítulo 3 no es solo una optimización de velocidad — es un modelo de validación multi-perspectiva que reduce el riesgo de falso positivo en el gate.

---

## Gaps adicionales para el WP

| Concepto del capítulo | Aplicación a calibración THYROX |
|----------------------|--------------------------------|
| Fan-out de evaluadores paralelos | Gate con N predicados independientes ejecutados simultáneamente — tiempo = más lento, no suma |
| `output_key` en estado compartido | Cada evaluador produce un resultado estructurado, no prosa — el merger lee campos, no texto libre |
| Merger grounded exclusively on inputs | El merger del gate NO puede suavizar ni agregar — solo agrega resultados de evaluadores |
| A/B de exit criteria en paralelo | Generar múltiples formulaciones de un criterio y seleccionar la más verificable |
| SequentialAgent(parallel + merger) | Modelo directo para la arquitectura de gate calibrado en THYROX |

---

## Síntesis acumulada — 4 capítulos

| Capítulo | Principio central | Gap que resuelve en THYROX |
|----------|------------------|---------------------------|
| Cap. 1 Chaining | Output N→N+1; validar cada eslabón | Cadena sin validación → errores propagados |
| Cap. 6 Agente | 6 características; Adaptation requiere feedback | THYROX tiene 5/6 — adaptation ciega |
| Cap. 2 Routing | Lógica condicional; 3+ rutas; estado acumulado | Gate con una sola ruta → no adaptativo |
| **Cap. 3 Paralelización** | **Fan-out → Fan-in; N evaluadores → merger grounded** | **Gate con un solo evaluador → falso positivo probable** |

---

## Implicaciones de diseño — ampliadas con Cap. 3

### Arquitectura completa del gate calibrado

```
Input: artefacto Stage N + estado acumulado del WP
  │
  ▼
ParallelAgent — evaluadores independientes
  ├─ Evaluador estructural  → {completo: bool, gaps: []}
  ├─ Evaluador de evidencia → {claims_sin_ancla: N, ratio: float}
  ├─ Evaluador histórico    → {contradicciones: [], consistente: bool}
  └─ Evaluador verificable  → {criterios_booleanos: N/M, ratio: float}
  │
  ▼
Merger (grounded exclusively on evaluator outputs)
  → decision: pass | rework | escalate | unclear
  → context: {evaluador, finding, severidad} por cada gap
```

### Reglas del merger

1. `pass` solo si TODOS los evaluadores reportan dentro del umbral
2. `rework` si algún evaluador reporta gap recoverable — incluye qué evaluador y qué gap
3. `escalate` si evaluador histórico detecta contradicción con decisión de Stage anterior (requiere juicio humano)
4. `unclear` si ≥1 evaluador no puede clasificar (los criterios del evaluador están mal definidos)

---

## Pendiente para Stage 3 ANALYZE

- Definir los evaluadores mínimos necesarios para cada tipo de gate (no todos los stages necesitan los 4)
- Diseñar el contrato de salida de cada evaluador (`output_key` equivalente en THYROX)
- Definir el umbral de `pass` para el merger: ¿100% evaluadores pass? ¿N de M?
- Evaluar si el A/B de exit criteria debe ser automático (siempre proponer 3 versiones) o solo cuando el criterio no es verificable
- Determinar qué evaluadores aplican a qué stages (tabla de cobertura mínima por stage)
