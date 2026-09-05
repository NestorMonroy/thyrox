```yml
created_at: 2026-04-18 08:36:06
updated_at: 2026-04-18 08:52:00
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 2.0.0
fuente: Capítulo 2 — "Enrutamiento" (traducción profesional completa, libro agentic design patterns)
```

# Input: Capítulo 2 — Deep-Review Completo de Enrutamiento

---

## Conceptos del capítulo — lectura exhaustiva

### 1. El problema que motiva el patrón

> "El procesamiento secuencial a través del encadenamiento de prompts es fundamental para flujos determinísticos y lineales, **pero su aplicabilidad es limitada en escenarios que requieren respuestas adaptativas**."

El capítulo parte de reconocer que el chaining (Cap. 1) es insuficiente cuando el sistema debe arbitrar entre múltiples acciones basadas en factores contingentes:
- **Estado del entorno**
- **Entrada del usuario**
- **Resultado de una operación anterior**

Estos tres factores son exactamente los que un gate THYROX debe evaluar para decidir si un artefacto puede avanzar.

---

### 2. Los 4 mecanismos de routing — análisis diferencial completo

| Mecanismo | Determinismo | Flexibilidad | Cuándo usar |
|-----------|-------------|--------------|-------------|
| **LLM-based** | Probabilístico — el modelo emite un identificador de ruta en tiempo de inferencia | Alta — maneja entradas matizadas y novedosas | Clasificación semántica, intención ambigua |
| **Rule-based** | Determinístico — if-else, switch, regex | Baja — no maneja casos no previstos | Palabras clave, patrones, datos estructurados. Más rápido |
| **Embedding-based** | Probabilístico — similaridad vectorial | Media — depende de la calidad del espacio de embeddings | Enrutamiento semántico: el significado importa más que las palabras |
| **ML classifier** | Determinístico post-entrenamiento — lógica codificada en pesos | Media — limitado al espacio de entrenamiento | Corpus etiquetado disponible; la lógica de routing no debe cambiar frecuentemente |

**Distinción clave ML classifier vs LLM-based:**
- LLM-based: modelo generativo tomando decisión en tiempo real con prompt → **probabilístico cada vez**
- ML classifier: decisión codificada en pesos por ajuste fino supervisado → **determinístico después de entrenar**
- LLMs pueden usarse en preprocesamiento para generar datos sintéticos de entrenamiento del classifier

---

### 3. Los 3 puntos de aplicación dentro del ciclo operativo — dimensión que faltaba

> "Los mecanismos de enrutamiento se pueden implementar en **múltiples puntos** dentro del ciclo operativo de un agente."

El capítulo es explícito sobre tres niveles de aplicación:

```
NIVEL 1 — Al principio: clasificar la tarea principal
  ↓ (determina qué cadena activar)
NIVEL 2 — En puntos intermedios: dentro de una cadena en procesamiento
  ↓ (determina la siguiente acción dentro del flujo)
NIVEL 3 — Durante una subrutina: seleccionar la herramienta más apropiada
```

**Implicación para THYROX que el análisis previo omitió:**
El routing no solo aplica en los **gates entre stages** (nivel 1) — también aplica **dentro de un stage** (nivel 2) y **al seleccionar qué sub-análisis ejecutar** (nivel 3).

Ejemplo concreto en THYROX:
```
Stage 3 ANALYZE:
  NIVEL 1: ¿el artefacto de Stage 1 es suficiente para comenzar? → route: begin/return
  NIVEL 2: dentro de analyze, ¿qué dominio requiere análisis? → route: coverage/naming/architecture
  NIVEL 3: al generar diagnóstico, ¿usar ishikawa, 5-whys, o deep-review? → route por tipo de causa
```

---

### 4. LangGraph vs ADK — dos arquitecturas de routing con implicaciones diferentes

El capítulo presenta ambas implementaciones porque son filosóficamente distintas:

**LangGraph (grafo basado en estado):**
> "Particularmente adecuado para escenarios de enrutamiento complejos **donde las decisiones dependen del estado acumulado de todo el sistema**."

- Las decisiones de routing no dependen solo del input inmediato — dependen del estado acumulado
- Esto implica que el gate entre Stage 5 y Stage 6 puede (y debe) evaluar artefactos de Stage 1, 2, 3, 4

**Google ADK (herramientas + Auto-Flow):**
> "El ADK de Google proporciona componentes para estructurar las capacidades de un agente y modelos de interacción, que sirven como base para implementar lógica de enrutamiento."

- Routing implícito: el modelo decide qué herramienta llamar según su descripción
- Simpler para agentes con acciones discretas bien definidas
- Más frágil cuando las herramientas tienen descripciones similares o ambiguas

**Cuál aplica a THYROX:**
La arquitectura LangGraph es isomórfica a THYROX: 12 nodos (stages), transiciones con lógica de estado, y la decisión de avanzar depende del estado acumulado de WPs previos. El ADK Auto-Flow es más parecido al modelo actual de THYROX (el modelo decide probabilísticamente basado en descripciones de skills) — y eso es exactamente el problema.

---

### 5. "De un Vistazo" — el diseño intent completo del patrón

El capítulo estructura la justificación en tres partes que revelan el diseño intent completo:

**Qué (el problema):**
> "Un flujo de trabajo secuencial simple carece de la capacidad de tomar decisiones basadas en contexto. Sin un mecanismo para elegir la herramienta o sub-proceso correcto para una tarea específica, el sistema permanece **rígido y no adaptativo**."

**Por qué (la solución):**
> "El enrutamiento transforma una ruta de ejecución estática y predeterminada en un flujo de trabajo flexible y consciente del contexto capaz de seleccionar **la mejor acción posible**."

**Regla de Oro (trigger condition preciso):**
> "Usa el patrón de enrutamiento cuando un agente debe decidir entre múltiples flujos de trabajo distintos, herramientas o sub-agentes **basándose en la entrada del usuario o el estado actual**."

La "Regla de Oro" define exactamente cuándo THYROX necesita routing en sus gates: cuando hay múltiples destinos posibles (advance/rework/escalate) que dependen del estado del artefacto evaluado.

---

### 6. El caso "unclear" — la cuarta ruta que el análisis previo ignoró

En el ejemplo del capítulo, el sistema clasifica en `'booker'`, `'info'`, **y `'unclear'`**.

El handler unclear hace:
> "Coordinator could not delegate request. Please clarify."

Esto señala una cuarta ruta que el análisis previo (solo 3: advance/rework/escalate) no consideró:

```
Gate calibrado THYROX:
  ├─ pass       → avanzar a Stage N+1
  ├─ rework     → regresar a Stage N con diagnóstico específico
  ├─ escalate   → SP humano (decisión irreducible a predicado)
  └─ unclear    → el artefacto no es evaluable con los criterios actuales
                  (indica que los criterios del gate están mal definidos)
```

**La ruta `unclear` es un meta-signal:** si el gate frecuentemente no puede clasificar, el problema no es el artefacto — es que los criterios de evaluación son insuficientes. Esto crea un feedback loop de calibración del propio sistema de calibración.

---

### 7. Optimización de recursos — dimensión omitida en el análisis previo

> "Los desarrolladores pueden construir sistemas que no solo respondan a la entrada del usuario, sino que también sean capaces de **optimizar la asignación de recursos** y elegir la ruta de procesamiento más eficiente."

El routing no es solo sobre corrección — es sobre eficiencia. Aplicado a THYROX:

- Un gate que enruta a `rework` debe especificar el **delta mínimo** a corregir, no pedir repetir todo el stage
- Un gate que enruta a `escalate` debe hacerlo solo cuando el costo del error supera el costo del SP humano
- Un gate que puede decidir entre deep-review (costoso) vs checklist (barato) debe elegir el mínimo suficiente

El routing calibrado en THYROX también optimiza el uso de context window — no se ejecuta análisis profundo donde un predicado booleano es suficiente.

---

## Gaps adicionales identificados vs análisis previo

| Concepto del capítulo | Estado en análisis anterior | Corrección |
|----------------------|---------------------------|------------|
| 3 niveles de aplicación (task/chain/subroutine) | ❌ Solo cubrí gates entre stages | Routing también aplica dentro de stages y en selección de sub-análisis |
| Estado acumulado del sistema (LangGraph) | ❌ No mencionado | Gate N puede evaluar artefactos de stages anteriores, no solo el inmediato previo |
| LangGraph vs ADK como filosofías distintas | ❌ No mencionado | ADK Auto-Flow ≈ modelo actual THYROX (probabilístico) — ese es el problema |
| Cuarta ruta `unclear` | ❌ Solo 3 rutas | `unclear` = meta-signal de criterios de gate mal definidos |
| Optimización de recursos | ❌ No mencionado | El gate debe elegir el instrumento de evaluación mínimo suficiente |
| ML classifier vs LLM-based distinción precisa | ⚠️ Mencionado superficialmente | ML classifier: lógica en pesos post-entrenamiento, no en inferencia |

---

## Síntesis acumulada — 3 capítulos completos

| Capítulo | Principio central | Aplicación a THYROX | Gap que resuelve |
|----------|------------------|---------------------|-----------------|
| Cap. 1 — Chaining | Output N → input N+1; validar cada eslabón | 12 stages son la cadena; gates son puntos de validación | Sin validación, errores se propagan amplificados |
| Cap. 6 — Agente | 6 características; Adaptation requiere feedback observable | THYROX tiene 5/6 — le falta Adaptation calibrada | Sin feedback externo → adaptation ciega |
| Cap. 2 — Routing | Lógica condicional; múltiples rutas; 3 niveles; estado acumulado | Gates con 4 rutas (pass/rework/escalate/unclear); routing a 3 niveles dentro de stages | Sin routing → una sola ruta (avanzar) → realismo performativo |

---

## Implicaciones de diseño — revisadas y ampliadas

### Arquitectura del gate calibrado (4 rutas)

```
Input: artefacto de Stage N + estado acumulado del WP
  │
  ▼
Gate Router (tipo a determinar por tipo de gate)
  │
  ├─ pass    → Stage N+1 (advance-handler)
  │            contexto: artefacto validado + evidencia que lo sustenta
  │
  ├─ rework  → Stage N (rework-handler)
  │            contexto: delta específico faltante, no "repetir el stage"
  │
  ├─ escalate → SP humano (escalation-handler)
  │            contexto: qué decisión es irreducible a predicado automático
  │
  └─ unclear  → revisión de criterios del gate (calibration-handler)
               contexto: el gate no puede clasificar → los criterios están mal definidos
```

### Routing a 3 niveles en THYROX

```
NIVEL 1 — Inter-stage gate:
  Evalúa si el output del stage cumple criterios para avanzar
  Tipo: rule-based para estructural, LLM-based para semántico

NIVEL 2 — Intra-stage routing:
  Dentro de un stage, elige qué análisis ejecutar según el contexto
  Ejemplo: Stage 3 ANALYZE → routing entre coverage/naming/architecture/causal
  Tipo: LLM-based (el dominio del análisis es semántico)

NIVEL 3 — Tool/sub-análisis selection:
  Dentro de un análisis, elige qué instrumento usar
  Ejemplo: ¿ishikawa, 5-whys, o deep-review?
  Tipo: rule-based por tipo de causa
```

### Determinismo del mecanismo por tipo de artefacto

| Artefacto evaluado | Tipo de router | Salida |
|-------------------|---------------|--------|
| risk-register (campos completos) | Rule-based | booleano: pass/rework |
| exit-conditions (criterios derivados) | Rule-based + LLM | pass/rework/unclear |
| discover-synthesis (análisis cualitativo) | LLM-based con ancla | pass/rework/escalate |
| strategy (decisión arquitectónica) | Human SP | escalate obligatorio |

### Estado acumulado como input del gate (dimensión LangGraph)

El gate de Stage 6 PLAN no solo evalúa el output de Stage 5 STRATEGY — evalúa el estado acumulado:
- ¿Los constraints de Stage 4 están reflejados en la estrategia?
- ¿Las hipótesis del análisis Stage 3 tienen soporte en la estrategia elegida?
- ¿El baseline de Stage 2 es compatible con los plazos del plan?

Sin estado acumulado, el gate es miope — puede aprobar una estrategia que contradice constraints establecidos tres stages antes.

---

## Pendiente para Stage 3 ANALYZE

- Definir cuándo usar cada tipo de router para cada uno de los 12 gates principales
- Diseñar el `unclear-handler`: ¿qué protocolo sigue cuando el gate no puede clasificar?
- Determinar qué constituye "estado acumulado" relevante para cada gate (qué artefactos previos evalúa)
- Evaluar si el routing de Nivel 2 (intra-stage) ya existe implícitamente en los workflow-* skills y cómo hacerlo explícito
- Definir el instrumento mínimo suficiente por tipo de artefacto (optimización de recursos)
