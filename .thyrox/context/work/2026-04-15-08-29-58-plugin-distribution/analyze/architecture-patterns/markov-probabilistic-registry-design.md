---
created_at: 2026-04-15 10:33:00
project: THYROX
topic: Fundamento probabilístico-determinístico — Markov chains, LLMs, y Registry Design
author: NestorMonroy
status: Borrador
---

# Fundamento Probabilístico-Determinístico: Markov Chains, LLMs y Registry Design

Sub-análisis para THYROX FASE 39 (plugin-distribution). Establece el fundamento teórico
que justifica el diseño del Methodology Registry como máquina de estados determinística
para compensar la naturaleza probabilística inherente de los LLMs.

---

## Sección 1: El Problema Probabilístico de los LLMs

### LLMs como Sistemas Probabilísticos

Un Large Language Model no "sabe" respuestas — predice secuencias de tokens según una
distribución de probabilidad condicional:

```
P(token_siguiente | token_1, token_2, ..., token_n)
```

Donde `token_1..token_n` es exactamente el contenido del context window actual. El modelo
no tiene acceso a ninguna información fuera de esa ventana. Cada token generado se convierte
en parte del contexto para el siguiente. Esta cadena de predicciones es el mecanismo central
de inferencia en todos los modelos autoregresivos modernos: GPT-4, Claude 3.x, Gemini, Llama.

### La "Memoria" Como Ilusión de Continuidad

Lo que parece ser "memoria" en un LLM es en realidad el contenido literal de su context
window. El modelo no tiene estado interno persistente entre llamadas — cada request es
independiente. La sensación de continuidad surge porque la conversación completa se reinyecta
como contexto en cada turno.

```
Turno 1:  [sistema] [user: "hola"]                     → respuesta A
Turno 2:  [sistema] [user: "hola"] [A] [user: "¿qué?"] → respuesta B
Turno N:  [sistema] [...todo lo anterior...] [user: X]  → respuesta N
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
           Esto es la "memoria": reinyección explícita
```

Cuando la conversación supera el context window, los tokens más antiguos se truncan o
comprimen. El modelo literalmente deja de "ver" esa información — no hay recuperación posible
sin mecanismos externos.

### Las Tres Limitaciones Fundamentales

**1. Alucinaciones**

El modelo predice el token "más probable dado el contexto", no el token "más verdadero".
Cuando el contexto no contiene suficiente información para anclar la respuesta, el modelo
genera continuaciones que son estadísticamente coherentes pero factualmente incorrectas:
citas inventadas, fechas erróneas, referencias a funciones que no existen, código con bugs
sutiles que "parece correcto" a nivel sintáctico.

La causa raíz es que el modelo no tiene un registro de verdad separado de su distribución
de probabilidad. Verdad y probabilidad no son lo mismo.

**2. Context Window Limitado**

Los modelos actuales tienen ventanas de contexto que van de 8K a 128K tokens (algunos
experimentales hasta 1M). En conversaciones largas o proyectos complejos, esto se convierte
en un límite físico:

- La información "olvidada" no es recuperable sin persistencia externa
- La complejidad de mantener múltiples hilos de decisión dentro del contexto crece
- Las instrucciones al inicio de una conversación larga pierden peso relativo frente al
  texto reciente (attention dilution)

**3. Sesgos Probabilísticos**

Los pesos del modelo fueron aprendidos de datos de entrenamiento que reflejan distribuciones
culturales, lingüísticas y demográficas desiguales. El modelo no puede "no tener sesgos" —
sus sesgos son la distribución de probabilidad misma. Solo puede ser alineado para que los
sesgos problemáticos sean menos frecuentes en la distribución de salida.

### Por Qué Los Modelos Más Nuevos No Resuelven Esto Fundamentalmente

GPT-4, Claude 3.5/3.7, Gemini 2.0, y todos los modelos con arquitectura Transformer mejorada
mitigan estas limitaciones pero no las eliminan:

| Limitación | Mitigación actual | Por qué persiste |
|------------|-------------------|-----------------|
| Alucinaciones | RLHF, Constitutional AI, mejor alineación | El paradigma sigue siendo probabilístico — la alineación ajusta la distribución, no la reemplaza por verdad factual |
| Context window | 128K → 1M tokens | Aumentar la ventana no cambia que haya un límite; solo lo desplaza |
| Sesgos | Fine-tuning con datos balanceados | Los datos de pre-training siguen dominando; el fine-tuning ajusta los márgenes |

El paradigma probabilístico es intrínseco a la arquitectura autoregresiva. No es un bug
que se corrija en v5 — es la naturaleza del mecanismo de predicción.

---

## Sección 2: Transformers y Atención — La Arquitectura Subyacente

### El Cambio de Paradigma: Attention Is All You Need (2017)

Antes de los Transformers, los modelos de lenguaje procesaban texto secuencialmente
(RNNs, LSTMs). El problema: las dependencias a larga distancia se degradaban porque
la información debía viajar paso a paso por la cadena. Para relacionar token 1 con
token 100, la señal pasaba por 99 operaciones intermedias, acumulando ruido.

El paper "Attention Is All You Need" (Vaswani et al., 2017) propuso una arquitectura
radicalmente diferente: calcular directamente la relevancia entre TODOS los pares de
tokens simultáneamente, sin procesamiento secuencial.

### Self-Attention: Relaciones Directas Entre Tokens Distantes

El mecanismo de self-attention calcula, para cada token, qué tan relevante es cada
otro token del contexto:

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V
```

Donde Q (queries), K (keys) y V (values) son proyecciones lineales de los embeddings.
El resultado es una representación de cada token ponderada por su relación con todos
los demás.

```
Texto: "El gato que perseguía al ratón estaba cansado"
         |                              |         |
         └──────── attention alta ──────┘         |
         └─────────────── attention alta ──────────┘
```

Esto permite que "estaba cansado" se relacione directamente con "El gato" aunque haya
7 tokens de distancia. La dependencia no se degrada con la distancia.

### Por Qué Attention No Hace al Modelo Determinístico

Self-attention es una operación determinística — dadas las mismas entradas y pesos,
produce exactamente las mismas activaciones internas. Sin embargo, la generación de texto
no termina en attention:

```
tokens_entrada → [Transformer Layers] → logits (distribución sobre vocabulario)
                                             ↓
                                     sampling(temperature=T)
                                             ↓
                                     token_siguiente (probabilístico)
```

El paso de **sampling** es inherentemente probabilístico. Con `temperature > 0`, el modelo
samplea de la distribución — el mismo input puede producir outputs diferentes. Incluso con
`temperature = 0` (greedy decoding), el modelo selecciona el token de máxima probabilidad,
pero esa probabilidad sigue siendo aprendida, no calculada a partir de verdad factual.

### Context Window Como Límite Físico de Attention

La razón técnica por la que el context window tiene un límite es el costo computacional
de self-attention. Para un contexto de n tokens:

```
Complejidad temporal: O(n²)
Complejidad espacial: O(n²)
```

Con 128K tokens, la matriz de attention tiene 128K × 128K = ~16 billones de entradas.
Con 1M tokens: ~1 trillón de entradas. El hardware actual no puede calcular esto en
tiempo razonable sin aproximaciones.

### Mejoras de Eficiencia: Flash Attention y Sparse Attention

**Flash Attention** (Dao et al., 2022): reorganiza el cálculo de attention para maximizar
el uso del cache de memoria del GPU, reduciendo accesos a DRAM. Misma matemática, mucho
más eficiente en hardware. Permite ventanas más grandes sin cambiar la complejidad
algorítmica O(n²).

**Sparse Attention**: en lugar de calcular attention entre TODOS los pares, limita el
cálculo a pares "importantes" según algún criterio (local attention, strided attention,
longformer patterns). Reduce la complejidad a O(n·k) donde k es el número de tokens
"relevantes" por token.

**La ironía arquitectónica:** Estas mejoras permiten context windows más grandes —
mejor "memoria a corto plazo". Pero la naturaleza probabilística de la predicción persiste:

```
Más attention = mejor P(token | contexto_actual)
                        ↑
               Sigue siendo una probabilidad condicional,
               no una función de verdad determinística
```

---

## Sección 3: Cadenas de Markov — Formalización

### Definición Formal

Una **cadena de Markov** es un proceso estocástico {X_n, n ≥ 0} sobre un espacio de
estados S, que satisface la **propiedad de Markov**:

```
P(X_{n+1} = j | X_0 = i_0, X_1 = i_1, ..., X_n = i) = P(X_{n+1} = j | X_n = i)
```

El futuro del proceso depende SOLO del estado presente, no del historial completo.
Esta es la propiedad "sin memoria" o **propiedad de Markov**.

### Componentes Formales

**Espacio de estados S:** Conjunto de todos los estados posibles. Puede ser finito,
contablemente infinito, o continuo.

**Matriz de transición P:** Donde P[i][j] = P(X_{n+1} = j | X_n = i)

```
           Estado j=0  j=1  j=2
Estado i=0 [ 0.7   0.2   0.1 ]
Estado i=1 [ 0.3   0.4   0.3 ]
Estado i=2 [ 0.0   0.5   0.5 ]
```

Propiedades de la matriz: cada fila suma 1 (distribución de probabilidad válida).

**Distribución inicial:** π_0 = P(X_0 = i) — con qué probabilidad empieza en cada estado.

**Distribución en tiempo n:** π_n = π_0 · P^n

### Clasificación de Estados

| Tipo de estado | Definición | Implicación |
|----------------|------------|-------------|
| **Absorbente** | Una vez alcanzado, no se puede salir: P[i][i] = 1 | El proceso termina ahí |
| **Transitorio** | Probabilidad de no regresar > 0 | El proceso lo visita finito número de veces |
| **Recurrente** | Se regresa con probabilidad 1 | El proceso lo visita infinitas veces |
| **Ergódico** | Recurrente + aperiódico | Existe distribución estacionaria única |

### Cadenas Homogéneas vs No-Homogéneas

**Homogénea:** La matriz de transición P es constante en el tiempo.
`P(X_{n+1} = j | X_n = i)` no depende de n. La mayoría de modelos teóricos asumen esto.

**No-homogénea:** La matriz de transición cambia con el tiempo P_n.
`P(X_{n+1} = j | X_n = i)` depende de n. Ejemplo: mercados financieros con regímenes
cambiantes.

### Distribución Estacionaria

Para una cadena ergódica, existe π* tal que:
```
π* · P = π*
```

El proceso "converge" a esta distribución sin importar el estado inicial. KNIME y
herramientas similares automatizan el cálculo de π* resolviendo el sistema de ecuaciones
lineales, y el cálculo de distribuciones en tiempo n mediante exponenciación matricial.

### Aplicaciones Multidisciplinarias

**Economía:** Movimiento de precios entre estados (bull/bear market), cadenas de ratings
crediticios (AAA → AA → A → default).

**Biología:** Evolución de poblaciones, estados de células, modelos epidemiológicos
SIR (Susceptible → Infectado → Recuperado).

**NLP (modelos n-gram):** P(palabra_siguiente | n-1 palabras anteriores). El modelo
n-gram ES una cadena de Markov de orden n-1.

**Ingeniería:** Fiabilidad de sistemas (estados: funcionando → degradado → fallido),
análisis de colas (número de clientes en espera como estado).

**PageRank (Google):** El web como cadena de Markov sobre páginas; la distribución
estacionaria = importancia de cada página.

---

## Sección 4: La Conexión LLM ↔ Cadena de Markov

### La Equivalencia Conceptual

Un LLM autoregresivo es formalmente equivalente a una cadena de Markov de orden k,
donde k es el tamaño del context window:

```
Cadena de Markov de orden k:
P(X_{n+1} | X_{n-k+1}, ..., X_n)   ← depende de los últimos k estados

LLM con context window de k tokens:
P(token_{n+1} | token_{n-k+1}, ..., token_n)   ← exactamente lo mismo
```

La única diferencia práctica: k es enorme (miles a millones de tokens) y el espacio
de estados (vocabulario × posibles contextos) es exponencialmente grande. Pero la
estructura probabilística es idéntica.

### Tabla de Correspondencias

| Concepto Markov | Equivalente en LLM | Equivalente en THYROX |
|-----------------|-------------------|----------------------|
| Estado X_n | Contexto actual (tokens en context window) | `now.md::phase` |
| Transición P(X_{n+1} \| X_n) | P(próximo_token \| contexto_actual) | Regla "qué fase sigue" |
| Matriz de transición P | Weights del modelo (aprendidos en training) | `.thyrox/registry/methodologies/*.yml` |
| Estado absorbente | Context window lleno / fin de sesión | Phase 7: TRACK (cierre del WP) |
| Estado transitorio | Fase intermedia no repetible | Phase 2: PLAN (ocurre una vez por WP) |
| Estado recurrente | Fase que puede repetirse | Phase 3: DESIGN (revisable) |
| Cadena de Markov de orden k | Context window de k tokens | Memoria efectiva del LLM |
| Distribución estacionaria | Comportamiento de largo plazo del modelo | Patrón estable de trabajo del equipo |
| Distribución inicial π_0 | Estado al inicio de la conversación | Fase inicial de la metodología activa |

### Implicación Crítica: La Cadena Sin Estructura Externa

Un LLM sin estructura externa opera como una cadena de Markov con:

```
Estados = todos los posibles contextos
        = vocabulario^(tamaño_context_window)
        = espacio exponencialmente grande, no enumerable en práctica

Transiciones = distribución de probabilidad aprendida en training
             = 500B+ parámetros codificando estas probabilidades

Memoria garantizada = NINGUNA más allá del context window actual
```

Las consecuencias son predecibles formalmente:

1. Si el estado (contexto) no incluye información sobre una decisión pasada, la transición
   siguiente no puede depender de ella — propiedad de Markov obliga que el pasado fuera
   del contexto sea irrelevante.

2. Las transiciones son probabilísticas — el mismo estado puede llevar a estados siguientes
   diferentes en diferentes ejecuciones.

3. No hay garantía de que el proceso visite los estados "correctos" en el orden "correcto"
   — solo en el orden "más probable según training".

### El LLM Como Cadena No-Homogénea

Hay un matiz importante: los LLMs son técnicamente cadenas **no-homogéneas** porque la
distribución de probabilidad efectiva cambia con el contexto acumulado. La "matriz de
transición" (los pesos) es constante, pero la distribución de salida para el mismo token
en posición n depende de todo el contexto previo — haciendo que el comportamiento sea
no-estacionario en la práctica.

Esto es precisamente por qué las cadenas de Markov de orden k son una mejor analogía:
capturan que el estado "relevante" es el contexto de k tokens, no un estado atómico.

---

## Sección 5: THYROX Como Compensación Determinística

### El Problema Fundamental

Si un LLM es una cadena de Markov probabilística, y el proyecto requiere comportamiento
determinístico (seguir fases en orden, recordar decisiones, mantener contexto entre
sesiones), entonces se necesita un mecanismo externo que:

1. Defina explícitamente los estados posibles
2. Defina explícitamente las transiciones válidas
3. Persista el estado actual fuera del context window
4. Persista las decisiones históricas fuera del context window

THYROX es ese mecanismo.

### Tabla de Compensaciones

| Sin THYROX (probabilístico) | Con THYROX (determinístico) |
|-----------------------------|----------------------------|
| Claude puede saltar a implementar sin analizar | Gate Phase 1→2 obliga análisis antes de planificar |
| Claude puede "olvidar" decisiones previas cuando el context window se satura | Artefactos en `.thyrox/context/` son persistencia externa al LLM |
| Claude puede alucinar requisitos no discutidos | `analysis.md` + risk register documentan lo conocido — ancla factual |
| Claude no sabe "en qué paso está" entre sesiones | `now.md::phase` es el estado actual de la cadena, persistido en git |
| Las transiciones entre fases son probabilísticas | El registry YAML define transiciones explícitas y exhaustivas |
| El "pasado" se pierde cuando el context se satura | Los artefactos WP persisten en git — memoria externa duradera |
| El comportamiento varía entre sesiones | El flujo SDLC es determinístico: siempre Phase 1→2→3→...→7 |
| Claude puede proponer soluciones incompatibles con decisiones previas | ADRs en `.thyrox/context/decisions/` son el registro inmutable |

### `now.md::phase` Como Variable de Estado

En términos formales de cadenas de Markov:

```
Estado de la cadena THYROX = now.md::phase

Posibles valores (para metodología SDLC):
  { sdlc-analyze, sdlc-plan, sdlc-design, sdlc-execute,
    sdlc-verify, sdlc-release, sdlc-track }

Transiciones válidas (definidas en registry YAML, NO probabilísticas):
  sdlc-analyze  → sdlc-plan     (única transición válida)
  sdlc-plan     → sdlc-design   (única transición válida)
  sdlc-design   → sdlc-execute  (única transición válida)
  ...
```

El coordinator lee `now.md::phase`, consulta el registry, y determina exactamente qué
sigue. No es una predicción probabilística — es una lookup en una tabla de transiciones
determinística.

### La Cadena de Markov de THYROX vs La del LLM

```
LLM solo:
  Estado: contexto_actual (probabilístico, puede perderse)
  Transición: P(siguiente | contexto) — probabilística
  Memoria: limitada al context window

THYROX:
  Estado: now.md::phase (determinístico, persistido en git)
  Transición: registry YAML — determinística
  Memoria: git history + artefactos WP — ilimitada
```

La arquitectura THYROX convierte una cadena de Markov probabilística con memoria efímera
en una máquina de estados determinística con memoria persistente.

---

## Sección 6: Diseño del Methodology Registry

### El Problema de Escala: De 1 a 15 Metodologías

Con una sola metodología (SDLC), el flujo puede hardcodearse. Con 15 metodologías (SDLC,
PDCA, DMAIC, Lean Six Sigma, Problem Solving 8-Step, Strategic Planning, Strategic
Management, Consulting General, Consulting Thoucentric, Business Analysis, BPA, y más),
el hardcoding no escala:

```
Opción A — Hardcoding por metodología:
  15 coordinators separados × costo de mantenimiento
  Agregar metodología 16 = modificar infraestructura
  
Opción B — Registry configurable:
  1 coordinator genérico
  Agregar metodología 16 = crear 1 archivo YAML
  El coordinator no necesita cambios
```

El Registry es la solución de escala.

### Estructura del Registry

```
.thyrox/registry/methodologies/
├── sdlc.yml                  ← Secuencial
├── pdca.yml                  ← Cíclico
├── dmaic.yml                 ← Secuencial
├── lean-six-sigma.yml        ← Secuencial con sub-fases
├── problem-solving-8step.yml ← Secuencial con condicional
├── strategic-planning.yml    ← Secuencial largo plazo
├── strategic-management.yml  ← Cíclico (revisión continua)
├── consulting-general.yml    ← Secuencial adaptable
├── consulting-thoucentric.yml← Específica Thoucentric
├── business-analysis.yml     ← Iterativo
└── bpa.yml                   ← Iterativo (ciclo mejora)

NOTA: Frameworks y técnicas (SWOT, Canvas, Porter, etc.) NO tienen yml propio —
son herramientas que se usan DENTRO de las fases de una metodología, no metodologías
con ciclo de vida propio.
```

### Schema YAML: Seis Tipos de Flujo

La taxonomía de tipos de flujo cubre todos los patrones de las 15 metodologías:

#### Tipo 1 — Secuencial (A→B→C siempre)

Ejemplo: DMAIC (Six Sigma). Las fases tienen un orden fijo y no se repiten.

```yaml
name: DMAIC
type: sequential
display: "DMAIC / Six Sigma"
steps:
  - id: dmaic-define
    display: "DMAIC — Define"
    next: [dmaic-measure]
  - id: dmaic-measure
    display: "DMAIC — Measure"
    next: [dmaic-analyze]
  - id: dmaic-analyze
    display: "DMAIC — Analyze"
    next: [dmaic-improve]
  - id: dmaic-improve
    display: "DMAIC — Improve"
    next: [dmaic-control]
  - id: dmaic-control
    display: "DMAIC — Control"
    next: []  # terminal — estado absorbente
```

#### Tipo 2 — Cíclico (A→B→C→A)

Ejemplo: PDCA. El último estado regresa al primero — no hay estado absorbente.

```yaml
name: PDCA
type: cyclic
display: "PDCA — Plan-Do-Check-Act"
steps:
  - id: pdca-plan
    display: "PDCA — Plan"
    next: [pdca-do]
  - id: pdca-do
    display: "PDCA — Do"
    next: [pdca-check]
  - id: pdca-check
    display: "PDCA — Check"
    next: [pdca-act]
  - id: pdca-act
    display: "PDCA — Act"
    next: [pdca-plan]  # estado recurrente: regresa al inicio
```

#### Tipo 3 — Iterativo (puede repetir fases o reiniciar el ciclo)

Ejemplo: BPA (Business Process Analysis). El monitor puede reiniciar el ciclo de mejora.

```yaml
name: BPA
type: iterative
display: "Business Process Analysis"
steps:
  - id: bpa-identify
    display: "BPA — Identify"
    next: [bpa-map]
  - id: bpa-map
    display: "BPA — Map (As-Is)"
    next: [bpa-analyze]
  - id: bpa-analyze
    display: "BPA — Analyze"
    next: [bpa-improve]
  - id: bpa-improve
    display: "BPA — Improve (To-Be)"
    next: [bpa-implement]
  - id: bpa-implement
    display: "BPA — Implement"
    next: [bpa-monitor]
  - id: bpa-monitor
    display: "BPA — Monitor"
    next: [bpa-identify]  # puede reiniciar ciclo si hay nuevas mejoras
```

#### Tipo 4 — No-Secuencial (cualquier transición es válida)

Ejemplo: BA/BABOK. El estándar BABOK explícitamente define que las áreas de conocimiento
no tienen orden fijo — se accede según necesidad del proyecto.

```yaml
name: BA-BABOK
type: non-sequential
display: "Business Analysis (BABOK)"
steps:
  - id: ba-planning
    display: "BABOK — BA Planning & Monitoring"
    next: [ba-elicitation, ba-lifecycle, ba-strategy, ba-analysis, ba-evaluation]
  - id: ba-elicitation
    display: "BABOK — Elicitation & Collaboration"
    next: [ba-planning, ba-lifecycle, ba-strategy, ba-analysis, ba-evaluation]
  - id: ba-lifecycle
    display: "BABOK — Requirements Lifecycle Management"
    next: [ba-planning, ba-elicitation, ba-strategy, ba-analysis, ba-evaluation]
  - id: ba-strategy
    display: "BABOK — Strategy Analysis"
    next: [ba-planning, ba-elicitation, ba-lifecycle, ba-analysis, ba-evaluation]
  - id: ba-analysis
    display: "BABOK — Requirements Analysis & Design"
    next: [ba-planning, ba-elicitation, ba-lifecycle, ba-strategy, ba-evaluation]
  - id: ba-evaluation
    display: "BABOK — Solution Evaluation"
    next: [ba-planning, ba-elicitation, ba-lifecycle, ba-strategy, ba-analysis]
```

#### Tipo 5 — Condicional (siguiente estado depende del resultado)

Ejemplo: Problem Solving 8-Step. Si la verificación falla, regresa a Analyze.

```yaml
name: PS8
type: conditional
display: "Problem Solving 8-Step"
steps:
  - id: ps8-define
    display: "PS8 — Define the Problem"
    next: [ps8-interim]
  - id: ps8-interim
    display: "PS8 — Interim Containment"
    next: [ps8-rootcause]
  - id: ps8-rootcause
    display: "PS8 — Root Cause Analysis"
    next: [ps8-corrective]
  - id: ps8-corrective
    display: "PS8 — Corrective Actions"
    next: [ps8-verify]
  - id: ps8-verify
    display: "PS8 — Verify & Validate"
    next:
      on_success: [ps8-prevent]
      on_failure: [ps8-rootcause]   # regresa a root cause si no resuelve
  - id: ps8-prevent
    display: "PS8 — Prevent Recurrence"
    next: [ps8-close]
  - id: ps8-close
    display: "PS8 — Congratulate the Team"
    next: []  # terminal
```

#### Tipo 6 — Adaptive (fases son guías, profundidad variable por contexto)

Ejemplo: Consulting Process General. Las fases existen pero su duración, profundidad y
si se ejecutan depende del cliente/contexto. El coordinator no prescribe — pregunta.

```yaml
# Tipo 6 — Adaptive (Consulting Process General)
name: Consulting Process General
type: adaptive
display: "Consulting — General Process"
coordinator_mode: "inquiry"  # no prescribe, pregunta
completion_criteria: deliverable_based  # no activity_based

steps:
  - id: cp-initiation
    display: "Consulting — Initiation"
    next: [cp-diagnosis, cp-action-planning]  # puede saltar Diagnosis
    depth: client-variable
    deliverables_required: [engagement-letter]  # mínimo siempre
    skip_condition: "cliente ya tiene diagnóstico validado"

  - id: cp-diagnosis
    display: "Consulting — Diagnosis"
    next: [cp-action-planning, cp-diagnosis]  # puede iterar
    depth: client-variable
    completion_question: "¿Entiendes el problema lo suficiente para proponer soluciones?"

  - id: cp-action-planning
    display: "Consulting — Action Planning"
    next: [cp-implementation, cp-diagnosis]  # puede volver si plan requiere más info
    depth: client-variable

  - id: cp-implementation
    display: "Consulting — Implementation"
    next: [cp-evaluation]
    mode: variable  # advisory | collaborative | full-implementation

  - id: cp-evaluation
    display: "Consulting — Evaluation"
    next: []  # terminal, pero puede reiniciar engagement
    reengagement: possible
```

Subtipo `adaptive-contextual`: el host_methodology varía (el proceso se adapta a la
metodología del cliente — Waterfall, Agile, Iterative).

```yaml
# Subtipo: adaptive-contextual
name: Business Analysis Process
type: adaptive-contextual
display: "Business Analysis Process"
host_methodology: variable  # waterfall | agile | iterative

steps:
  - id: ba-elicitation
    display: "BA — Elicitation"
    next: [ba-analysis]
    iteration_policy:
      agile: "se repite cada sprint — no es un paso único"
      waterfall: "una vez por fase de requisitos"
      iterative: "según cada iteración de desarrollo"
```

### Tabla de Tipos de Flujo y Su State Machine

| Tipo | Característica | Ejemplo | Estado siguiente | YAML type |
|------|---------------|---------|-----------------|-----------|
| Secuencial | A→B→C siempre | SDLC, PMBOK, DMAIC | Un solo `next` | `sequential` |
| Cíclico | A→B→C→A | PDCA, Strategic Mgmt | Regresa al inicio | `cyclic` |
| Iterativo | Puede repetir fases | RUP, BPA | `next` incluye misma fase | `iterative` |
| No-secuencial | Cualquier orden | BA/BABOK | `next = todos` | `non-sequential` |
| Condicional | Depende de resultado | PS8 (Check→Analyze si falla) | `next` depende de condición | `conditional` |
| **Adaptive** | **Fases son guías, profundidad variable** | **Consulting, BA Process** | **Coordinator pregunta el estado, no prescribe** | **`adaptive`** |

### Por Qué "Adaptive" No Es Solo "Non-Sequential"

La distinción es crítica para el diseño del coordinator:

| Característica | Non-sequential (BA/BABOK) | Adaptive (Consulting General) |
|---------------|--------------------------|-------------------------------|
| Orden | Completamente libre | Existe un orden preferido pero flexible |
| Profundidad | Igual en todas las áreas | Variable por contexto |
| Skip de fases | Sí (cualquiera) | Condicional (si ya existe el deliverable) |
| Repetición | Sí (cualquiera) | En fases específicas (Diagnosis puede iterar) |
| Coordinator | "¿Qué área?" | "¿Qué encontraste? ¿Suficiente para avanzar?" |
| Deliverables | Cada área tiene los suyos | Mínimos requeridos + opcionales por contexto |

**Non-sequential = libertad total de ORDEN.**
**Adaptive = libertad de PROFUNDIDAD y DURACIÓN dentro de un orden sugerido.**

### El Coordinator Genérico

Un único coordinator lee el registry y determina el flujo sin conocer las metodologías:

```
.claude/agents/thyrox-coordinator.md
```

Algoritmo del coordinator por tipo de flujo:

```
Para type: sequential / cyclic / iterative:
  1. Leer now.md → extraer phase (ej: "pdca-do")
  2. Extraer prefijo de metodología (ej: "pdca")
  3. Cargar .thyrox/registry/methodologies/pdca.yml
  4. Buscar step con id = "pdca-do"
  5. Leer campo next → ["pdca-check"]
  6. Mostrar: "Has completado {phase}. Siguiente: {next[0]}"
  7. Al confirmar → actualizar now.md::phase = "pdca-check"

Para type: conditional:
  Mismo flujo base, pero en paso 6:
  "¿Se cumplió la condición? Si sí: {next_if_true}. Si no: {next_if_false}"

Para type: non-sequential:
  Mismo flujo base, pero en paso 6:
  "Áreas disponibles: {all_steps}. ¿Cuál corresponde al objetivo actual?"

Para type: adaptive / adaptive-contextual / adaptive-cyclic:
  1-5 igual que sequential
  6. Mostrar: "¿Qué lograste en {phase}? ¿Tienes suficiente para responder:
              {completion_question}? Si sí: opciones disponibles son {next}.
              Si no: ¿qué te falta en {phase}?"
  7. Al confirmar → actualizar now.md::phase según elección
```

El coordinator NO hardcodea ninguna metodología. Todo el conocimiento de flujo está en
los YAMLs del registry.

### Diagrama de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    THYROX State Machine                         │
│                                                                 │
│  ┌──────────────┐    lee     ┌─────────────────────────────┐   │
│  │   now.md     │ ─────────► │  thyrox-coordinator         │   │
│  │  phase: X_n  │            │  (agente genérico único)    │   │
│  └──────────────┘            └──────────┬──────────────────┘   │
│         ▲                               │                       │
│         │ actualiza                     │ consulta              │
│         │ X_{n+1}                       ▼                       │
│  ┌──────┴─────────────────────────────────────────────────┐    │
│  │            registry/methodologies/                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ sdlc.yml │ │ pdca.yml │ │dmaic.yml │ │  bpa.yml │  │    │
│  │  │ type:    │ │ type:    │ │ type:    │ │ type:    │  │    │
│  │  │sequential│ │ cyclic   │ │sequential│ │iterative │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │           Matriz de transiciones determinísticas        │    │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

Memoria externa (git):
  .thyrox/context/decisions/  ← ADRs inmutables
  .thyrox/context/work/WP/    ← Artefactos de la FASE actual
  ROADMAP.md                  ← Historial de FASEs completadas
```

---

## Sección 7: Implicaciones de Diseño

### Los Skills Como Estados de Su Cadena

Cada skill de metodología no es solo documentación — es la definición del comportamiento
del LLM cuando está en ese estado. Cuando `now.md::phase = "sdlc-analyze"`, el skill
`thyrox/SKILL.md` define exactamente:

- Qué artefactos producir en este estado
- Qué criterios de salida hay que cumplir para transicionar
- Qué hace el LLM en este estado

Los states de la cadena son los skills. Las transiciones son el registry. El coordinator
es el intérprete.

### El Registry Como Fuente de Verdad

Las transiciones NO deben vivir en:
- El código del coordinator (hardcoding no escalable)
- El SKILL.md de cada metodología (mezcla concerns)
- La memoria del LLM (probabilística, no garantizada)

Las transiciones DEBEN vivir en:
- Los YAMLs del registry (declarativo, versionable en git, legible por humanos y LLMs)

Esto garantiza que la "matriz de transición" de la cadena de Markov de THYROX sea:
1. Explícita (no implícita en los pesos del LLM)
2. Determinística (no probabilística)
3. Persistente (no efímera)
4. Extensible (agregar metodología = crear 1 YAML)
5. Auditable (git history de los YAMLs)

### La Persistencia en Git Como Solución al Context Window

La limitación del context window de los LLMs (equivalente a la memoria de orden k en
la cadena de Markov) se resuelve con persistencia externa:

```
Problema:  Claude "olvida" lo que pasó hace 3 sesiones
Solución:  Los artefactos WP en git NO se olvidan

Problema:  Claude puede proponer algo contradictorio a una decisión del mes pasado
Solución:  Los ADRs en .thyrox/context/decisions/ son inmutables e inyectables como contexto

Problema:  Claude no sabe "en qué FASE está" cuando se inicia una nueva sesión
Solución:  now.md::phase + focus.md + ROADMAP.md definen el estado completamente
```

El paradigma es: **git como memoria externa de la cadena de Markov del LLM**.

### Extensibilidad del Sistema

Para agregar la metodología 16 (ej: Design Thinking):

```
1. Crear .thyrox/registry/methodologies/design-thinking.yml
2. Definir type: iterative (DT es iterativo por naturaleza)
3. Definir steps con sus transiciones
4. El coordinator genérico la soporta automáticamente
5. Zero cambios en infraestructura
```

Para cambiar las transiciones de una metodología existente:

```
1. Editar el YAML del registry
2. Commit en git
3. El cambio está versionado y auditable
4. Zero cambios en infraestructura
```

### Conexión Con FASE 39: Plugin Distribution

El análisis de Markov chains es relevante para FASE 39 porque el sistema de distribución
de plugins necesita mantener coherencia en el ciclo de vida de los plugins:

```
Plugin lifecycle (potencial state machine):
  registered → validated → published → deprecated → retired

Transiciones válidas:
  registered  → validated    (si pasa validación)
  registered  → rejected     (si falla validación)
  validated   → published    (cuando se distribuye)
  published   → deprecated   (nueva versión disponible)
  deprecated  → retired      (ya no soportado)
```

El mismo patrón Registry YAML → Coordinator → `now.md::phase` aplica al ciclo de vida
de plugins. La arquitectura es isomórfica: solo cambia el dominio (metodologías vs plugins),
no el patrón de diseño.

---

## Resumen: La Ecuación Fundamental de THYROX

```
LLM (cadena Markov probabilística, memoria efímera)
  +
Registry YAML (matriz de transición determinística)
  +
now.md::phase (variable de estado persistida en git)
  +
Artefactos WP (memoria externa ilimitada)
  =
Sistema determinístico con memoria persistente
que usa un LLM probabilístico como motor de ejecución
pero no depende de su probabilismo para su corrección.
```

Expresado con la dimensión de flexibilidad descubierta en el análisis de frameworks reales:

```
THYROX = {
  registry: YAML con 6 tipos de flujo
            (sequential | cyclic | iterative | non-sequential | conditional | adaptive),
  skills:   determinísticos para flexibilidad BAJA + adaptativos para flexibilidad ALTA,
  coordinator: prescriptivo para sequential ("siguiente: X")
               + inquisitivo para adaptive ("¿qué encontraste? ¿suficiente para avanzar?"),
  state:    now.md::phase + phase-history.jsonl (observabilidad de transiciones),
  memory:   artefactos en git + CLAUDE.md compartido en worktrees
}
```

THYROX no elimina la naturaleza probabilística del LLM — la usa para generación de texto,
análisis, y razonamiento, donde el probabilismo es una ventaja (creatividad, adaptabilidad).
THYROX elimina el probabilismo donde es un problema: en el flujo de trabajo, las decisiones
de estado, y la memoria de largo plazo.

La cadena de Markov del LLM corre dentro de los guardianes determinísticos de THYROX.
