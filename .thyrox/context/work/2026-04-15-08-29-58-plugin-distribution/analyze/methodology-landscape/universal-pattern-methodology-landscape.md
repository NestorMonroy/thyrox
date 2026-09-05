```yml
created_at: 2026-04-15 09:45:00
project: THYROX
topic: Paisaje completo de metodologías — patrón universal + base probabilística/determinística
author: NestorMonroy
status: Validado v3.0
```

# Sub-análisis: 15 estructuras metodológicas + fundamento probabilístico de THYROX

---

## El problema que THYROX resuelve (reformulado)

Los LLMs son **sistemas probabilísticos**, no determinísticos:

- **Predicen la siguiente "respuesta probable"**, no la correcta
- **Hallucinations**: citas falsas, código con errores sutiles, referencias inventadas
- **Context window limitado**: "olvidan" información en sesiones largas
- **Sesgos**: reflejan patrones estadísticos de datos de entrenamiento

Las **cadenas de Markov** modelan exactamente este comportamiento:
```
P(estado_siguiente | estado_actual) = solo depende del estado actual
```

Un LLM en cada token predice `P(próximo_token | contexto_actual)`. La "memoria del pasado"
es solo lo que cabe en el context window — el mismo límite de las cadenas de Markov.

**THYROX compensa la naturaleza probabilística con estructura determinística:**

| Sin THYROX (probabilístico) | Con THYROX (determinístico) |
|-----------------------------|----------------------------|
| Claude puede saltar a implementar sin analizar | Gate Phase 1→2 obliga análisis antes de planificar |
| Claude puede olvidar decisiones previas | Artefactos en `.thyrox/context/` son persistencia externa |
| Claude puede alucinar requisitos no discutidos | Risk register + analysis.md documentan lo conocido |
| Claude no sabe "en qué paso está" | `now.md::phase` es el estado actual de la cadena |

**`now.md::phase` es la variable de estado de la cadena de Markov de THYROX.**

Cada metodología define su **matriz de transiciones** (qué fase sigue a cuál).

---

## Patrón universal validado en 15 estructuras metodológicas

**TODOS los marcos metodológicos comienzan con Identify/Define/Understand ANTES de Analyze.**

> *"No hay excepciones"*

| # | Marco | Primer paso | Tipo | Clasificación | Flexibilidad | YAML Type |
|---|-------|------------|------|---------------|-------------|-----------|
| 1 | SDLC | Planning (identificar objetivos) | Secuencial | MARCO | BAJA | `sequential` |
| 2 | PDCA | Plan (planificar/identificar problema) | Cíclico | MARCO | ALTA | `cyclic-adaptive` |
| 3 | DMAIC / Six Sigma | Define (identificar/clarificar) | Secuencial | MARCO | BAJA-MEDIA | `sequential` |
| 4 | Lean Six Sigma | Define (igual que DMAIC + desperdicios) | Secuencial | MARCO | MEDIA | `sequential-adaptive` |
| 5 | Problem Solving 8-step (Toyota) | Identify (detectar anomalías) | Secuencial | MARCO | BAJA-MEDIA | `conditional` |
| 6 | Strategic Planning | Identification (propósito, objetivos) | Secuencial | MARCO | MEDIA | `sequential-adaptive` |
| 7 | Strategic Management | Environmental Scanning | Cíclico | MARCO | MEDIA-ALTA | `adaptive-cyclic` |
| 8 | Consulting Process (General) | Initiation (diagnóstico preliminar) | Adaptable | MARCO | ALTA | `adaptive-free` |
| 9 | Consulting Process (Thoucentric) | Initial Understanding | Secuencial | MARCO | MEDIA-ALTA | `adaptive` |
| 10 | Business Analysis Process | Context & Understanding | Adaptable | MARCO | ALTA | `adaptive-contextual` |
| 11 | Business Process Analysis (BPA) | Identify (seleccionar proceso) | Iterativo | MARCO | MEDIA-ALTA | `iterative-adaptive` |
| 12 | (Vacante) | — | — | MARCO | — | — |
| T1 | RCA | Define Problem | Iterativo | TÉCNICA | MEDIA | N/A (no genera skill) |
| T2 | Framework Analysis | Familiarization | Flexible | TÉCNICA | MEDIA-ALTA | N/A |
| T3 | NASA Logical Decomposition | Establish System Architecture Model | Secuencial/Jerárquico | TÉCNICA* | BAJA | N/A |

*NASA asume que los requisitos de alto nivel YA están definidos — no es proceso end-to-end.

**El Patrón Universal de 9 pasos:**

```
1. IDENTIFY / RECOGNIZE / INITIATE  — detectar necesidad o problema
2. DEFINE / CLARIFY                 — precisar scope, propósito
3. UNDERSTAND CONTEXT              — historia, stakeholders, sistemas
4. MEASURE / ASSESS                — cuantificar estado actual
5. ANALYZE                         — causas raíz, dinámicas
6. PLAN / STRATEGY / PRIORITIZE    — diseñar solución
7. EXECUTE / IMPLEMENT             — poner en acción
8. MONITOR / TRACK / CHECK         — evaluar resultados
9. STANDARDIZE / UPDATE / SUSTAIN  — hacer permanente
```

**Implicación para THYROX SDLC:** La Phase 1 ANALYZE de THYROX ya implementa los pasos
1-3 implícitamente (los 8 aspectos del análisis incluyen Objetivo, Stakeholders,
Uso operacional, Restricciones, Contexto). El nombre "ANALYZE" es impreciso — debería
llamarse "UNDERSTAND" o "DISCOVER" para reflejar que incluye Identify+Define+Context+Analyze.

---

## Flexibilidad como dimensión arquitectónica

**¿Por qué la flexibilidad importa para el Skills Registry?**

No todos los frameworks se comportan igual en producción. Un coordinator que simplemente
"lee el YAML y propone el siguiente paso" funciona para frameworks secuenciales, pero FALLA
para frameworks adaptativos. La flexibilidad del framework determina:

1. **El tipo YAML del registry**: qué tipo de `next:` se define
2. **El modo del coordinator**: prescriptivo (dice) vs inquisitivo (pregunta)
3. **El criterio de completitud del skill**: hard (lista de artefactos) vs soft (objetivo cumplido)
4. **El tipo de gate**: obligatorio vs consultivo

**Los 6 tipos de flujo y su relación con flexibilidad:**

| YAML Type | Flexibilidad | Coordinator | Criterio completitud | Gate |
|-----------|-------------|-------------|---------------------|------|
| `sequential` | BAJA | "Siguiente: {next[0]}" | Hard: artefactos deben existir | Obligatorio |
| `sequential-adaptive` | MEDIA | "Siguiente: {next[0]}. Ajusta profundidad al contexto" | Soft: objetivo cumplido + artefactos mínimos | Consultivo |
| `conditional` | BAJA-MEDIA | "¿Condición X? Si sí: {A}. Si no: {B}" | Hard en branches | Condicional |
| `cyclic-adaptive` | ALTA | "¿Objetivo del ciclo cumplido? Opciones: {next}" | Soft: objetivo específico | Consultivo |
| `adaptive` / `adaptive-free` / `adaptive-contextual` | ALTA | "¿Qué lograste? ¿Suficiente para: {completion_question}?" | Soft: pregunta de competencia | Conversacional |
| `non-sequential` | Total | "¿Qué área corresponde al objetivo actual?" | Soft: área relevante abordada | Ninguno (flujo libre) |
| `iterative-adaptive` | MEDIA-ALTA | "¿KPI alcanzado? Si no, ¿qué iterar?" | Condicionado por KPI | Medición |

**La "trampa de flexibilidad"**: Tratar un framework ALTA flexibilidad (Consulting General)
como si fuera `sequential` produce un coordinator que frustra al usuario ("pero este cliente
ya hizo el Diagnosis, no necesita hacerlo"). Tratar un framework BAJA flexibilidad (SDLC)
como `adaptive` produce un coordinator que no garantiza la completitud necesaria para cada fase.

---

## Inventario completo: 12 MARCOS + 3 TÉCNICAS

### MARCOS METODOLÓGICOS (12, con #12 Vacante)

Procesos completos con fases secuenciales/cíclicas que van de detección del problema hasta
resolución y aprendizaje. Son candidatos directos para skills en el registry de THYROX.

---

#### Categoría 1: Software Development (1 marco)

| Flujo | Skills | Tipo | Flexibilidad | YAML Type |
|-------|--------|------|-------------|-----------|
| SDLC | analyze, strategy, plan, structure, decompose, execute, track | Secuencial | BAJA | `sequential` |

**#1 — SDLC**
- **Tipo:** Secuencial/Waterfall
- **Flexibilidad:** BAJA
- **YAML Type:** `sequential`
- **Primer paso:** Planning (identificar objetivos, alcance, viabilidad)
- **Fases:** Planning → Analysis/Requirements → Design → Development/Implementation → Testing → Deployment → Maintenance
- **Características clave:** Proceso formal con entregables por fase; cada fase debe completarse antes de continuar; documentación extensiva; cambios de requisitos son costosos una vez iniciado.
- **Verificación:** Primer paso = Planning = identificar. Cumple patrón universal.

---

#### Categoría 2: Mejora de Procesos y Calidad (3 marcos)

| Flujo | Skills | Tipo | Flexibilidad | YAML Type |
|-------|--------|------|-------------|-----------|
| PDCA | pdca-plan, pdca-do, pdca-check, pdca-act | Cíclico | ALTA | `cyclic-adaptive` |
| DMAIC | dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control | Secuencial | BAJA-MEDIA | `sequential` |
| Lean Six Sigma | lss-define, lss-measure, lss-analyze, lss-improve, lss-control | Secuencial | MEDIA | `sequential-adaptive` |

**#2 — PDCA (Plan-Do-Check-Act)**
- **Tipo:** Cíclico/Iterativo
- **Flexibilidad:** ALTA
- **YAML Type:** `cyclic-adaptive`
- **Primer paso:** Plan (identificar el problema, planificar mejora)
- **Fases:** Plan → Do → Check → Act (infinitamente repetible)
- **Características clave:** El ciclo no termina — Act lleva de vuelta a Plan; cada ciclo mejora el proceso; diseñado para mejora continua; Deming/Shewhart; aplicable a cualquier proceso.
- **Verificación:** Primer paso = Plan = identificar problema. Cumple patrón universal.

---

**#3 — DMAIC (= Six Sigma)**
- **Tipo:** Secuencial
- **Flexibilidad:** BAJA-MEDIA
- **YAML Type:** `sequential`
- **Primer paso:** Define (identificar/clarificar el problema)
- **Fases:** Define → Measure → Analyze → Improve → Control
- **Características clave:** DMAIC ES Six Sigma — no son diferentes metodologías; DMADV es la variante para procesos/productos nuevos (Design for Six Sigma); herramientas estadísticas intensivas; reduce variación en procesos existentes; 3.4 defectos por millón de oportunidades como objetivo.
- **Verificación:** Primer paso = Define = identificar. Cumple patrón universal.

---

**#4 — Lean Six Sigma**
- **Tipo:** Secuencial (Lean + DMAIC integrados)
- **Flexibilidad:** MEDIA
- **YAML Type:** `sequential-adaptive`
- **Primer paso:** Define (problema + desperdicios identificados)
- **Fases:** Define (problema + desperdicios) → Measure (rendimiento + flujo de valor) → Analyze (causas raíz + variación + flujo) → Improve (herramientas Lean + Six Sigma) → Control
- **Características clave:** Combina dos enfoques distintos: Lean = velocidad/eficiencia/eliminación de desperdicios (7 tipos: sobreproducción, espera, transporte, procesamiento, inventario, movimiento, defectos); Six Sigma = precisión/calidad/reducción de variación. Lean Six Sigma ≠ DMAIC puro — las fases tienen contenido diferente.
- **Verificación:** Primer paso = Define = identificar. Cumple patrón universal.

---

#### Categoría 3: Resolución de Problemas (2 marcos — #12 Vacante)

| Flujo | Skills | Tipo | Flexibilidad | YAML Type |
|-------|--------|------|-------------|-----------|
| Problem Solving 8-step | ps8-identify, ps8-clarify, ps8-target, ps8-analyze, ps8-implement, ps8-check, ps8-standardize, ps8-reflect | Secuencial | BAJA-MEDIA | `conditional` |
| (Vacante #12) | TBD | — | — | — |

**#5 — Problem Solving 8-step (Toyota Way)**
- **Tipo:** Secuencial
- **Flexibilidad:** BAJA-MEDIA
- **YAML Type:** `conditional`
- **Primer paso:** Identify (detectar la anomalía o gap)
- **Fases:** Identify → Clarify → Set Target → Analyze Root Cause (5 Whys) → Implement → Check → Standardize → Reflect
- **Características clave:** Origen: Taiichi Ohno / Toyota Production System; diseñado para manufacturing y operaciones; Reflect (paso 8) como aprendizaje organizacional explícito; usa 5 Whys integrado en el análisis de causa raíz; separar Identify de Clarify evita saltar a soluciones prematuramente.
- **Verificación:** Primer paso = Identify = identificar. Cumple patrón universal.

---

**#12 — (Vacante)**
- **Estado:** Slot reservado para Resolución de Problemas #2 — pendiente de investigación y validación.
- **Candidatos posibles:** A determinar en investigación futura. RCA fue reclasificado como TÉCNICA (no marco completo), lo que deja este slot vacante.

---

#### Categoría 4: Planeación Estratégica (2 marcos)

| Flujo | Skills | Tipo | Flexibilidad | YAML Type |
|-------|--------|------|-------------|-----------|
| Strategic Planning | sp-identification, sp-prioritization, sp-development, sp-implementation, sp-update | Secuencial | MEDIA | `sequential-adaptive` |
| Strategic Management | sm-scanning, sm-formulation, sm-implementation, sm-evaluation | Cíclico | MEDIA-ALTA | `adaptive-cyclic` |

**#6 — Strategic Planning**
- **Tipo:** Secuencial
- **Flexibilidad:** MEDIA
- **YAML Type:** `sequential-adaptive`
- **Primer paso:** Identification (propósito, objetivos, desafíos actuales)
- **Fases:** Identification → Prioritization → Development → Implementation → Update
- **Características clave:** Proceso periódico (revisión cada 3-5 años); el paso de Identification precede explícitamente al análisis — documentación web frecuentemente omite este paso inicial, mostrando "Analyze" como primero (error de documentación). CORRECCIÓN v3.0: comienza con IDENTIFICACIÓN, no con análisis.
- **Verificación:** Primer paso = Identification = identificar. Cumple patrón universal.

---

**#7 — Strategic Management**
- **Tipo:** Secuencial/Cíclico (continuo)
- **Flexibilidad:** MEDIA-ALTA
- **YAML Type:** `adaptive-cyclic`
- **Primer paso:** Environmental Scanning (SWOT, PESTEL, análisis del entorno)
- **Fases:** Environmental Scanning → Strategy Formulation → Strategy Implementation → Evaluation and Control
- **Características clave:** Diferencia clave con Strategic Planning: Planning = periódico (ciclo 3-5 años); Management = continuo, adaptativo, monitoreo permanente. Environmental Scanning incluye análisis externo (oportunidades/amenazas) e interno (fortalezas/debilidades).
- **Verificación:** Primer paso = Environmental Scanning = entender contexto antes de formular. Cumple patrón universal.

---

#### Categoría 5: Consultoría (2 marcos)

| Flujo | Skills | Tipo | Flexibilidad | YAML Type |
|-------|--------|------|-------------|-----------|
| Consulting Process General | cp-initiation, cp-diagnosis, cp-action-planning, cp-implementation, cp-evaluation | Adaptable | ALTA | `adaptive-free` |
| Consulting Process Thoucentric | ct-understanding, ct-scope, ct-collect-analyze, ct-solutions, ct-action-plan, ct-implementation, ct-monitoring | Secuencial | MEDIA-ALTA | `adaptive` |

**#8 — Consulting Process General**
- **Tipo:** Secuencial altamente adaptable
- **Flexibilidad:** ALTA
- **YAML Type:** `adaptive-free`
- **Primer paso:** Initiation (diagnóstico preliminar, entender necesidad del cliente)
- **Fases:** Initiation → Diagnosis → Action Planning → Implementation → Evaluation
- **Características clave:** Marco genérico aplicable a cualquier tipo de consultoría; alta adaptabilidad permite expandir o comprimir fases según contexto; Diagnosis como fase separada de Initiation distingue "conocer el cliente" de "entender el problema a fondo".
- **Verificación:** Primer paso = Initiation = identificar necesidad. Cumple patrón universal.

---

**#9 — Consulting Process Thoucentric (7 pasos)**
- **Tipo:** Secuencial adaptable
- **Flexibilidad:** MEDIA-ALTA
- **YAML Type:** `adaptive`
- **Primer paso:** Initial Understanding (context framing, stakeholder mapping)
- **Fases:** Initial Understanding → Define Scope & Objectives → Collect & Analyze Data → Develop Solutions → Create Action Plan → Implementation → Monitoring & Adjustment
- **Características clave:** Versión más detallada que el proceso general; separa explícitamente "Define Scope" de "Initial Understanding"; incluye Monitoring & Adjustment como fase final activa (no solo evaluación pasiva); 7 pasos vs 5 del proceso general.
- **Verificación:** Primer paso = Initial Understanding = identificar. Cumple patrón universal.

---

#### Categoría 6: Análisis de Negocios (2 marcos)

| Flujo | Skills | Tipo | Flexibilidad | YAML Type |
|-------|--------|------|-------------|-----------|
| Business Analysis Process | ba-context, ba-elicitation, ba-analysis, ba-design, ba-implementation, ba-testing, ba-evaluation | Adaptable | ALTA | `adaptive-contextual` |
| Business Process Analysis | bpa-identify, bpa-map, bpa-analyze, bpa-improve, bpa-implement, bpa-monitor | Iterativo | MEDIA-ALTA | `iterative-adaptive` |

**#10 — Business Analysis Process**
- **Tipo:** Secuencial contextual
- **Flexibilidad:** ALTA
- **YAML Type:** `adaptive-contextual`
- **Primer paso:** Context & Understanding (entender el problema de negocio, stakeholders, entorno)
- **Fases:** Context & Understanding → Elicitation → Analysis → Design → Implementation → Testing → Evaluation
- **Características clave:** Diferencia clave con BPA: BA = análisis de requisitos para NUEVAS soluciones o sistemas; BPA = análisis de procesos EXISTENTES para optimizarlos. BA incluye diseño e implementación de la solución. Nota: BA/BABOK es un framework independiente con 6 knowledge areas no-secuenciales — fue analizado en multi-methodology-patterns-analysis.md como flujo separado para THYROX, pero NO pertenece a esta taxonomía de 12 marcos.
- **Verificación:** Primer paso = Context & Understanding = identificar. Cumple patrón universal.

---

**#11 — Business Process Analysis (BPA)**
- **Tipo:** Secuencial/Iterativo
- **Flexibilidad:** MEDIA-ALTA
- **YAML Type:** `iterative-adaptive`
- **Primer paso:** Identify (seleccionar el proceso a analizar, definir alcance)
- **Fases:** Identify → Map (As-Is) → Analyze → Improve (To-Be) → Implement → Monitor
- **Características clave:** Foco en procesos EXISTENTES (vs BA que trabaja con soluciones nuevas); As-Is mapping como paso explícito — documentar cómo funciona actualmente antes de proponer mejoras; la fase Improve genera el modelo To-Be como contraste al As-Is; iterativo porque el Monitor puede detectar necesidad de reiniciar.
- **Verificación:** Primer paso = Identify = identificar. Cumple patrón universal.

---

### FRAMEWORKS / TÉCNICAS (3)

No son marcos completos end-to-end. Son técnicas de descomposición, análisis o investigación
que asumen contexto previo ya definido. Son sub-herramientas dentro de skills, no skills independientes.

---

**Técnica T1 — Root Cause Analysis (RCA)**
- **Categoría:** Resolución de Problemas
- **Tipo:** Iterativo
- **Flexibilidad:** MEDIA
- **Primer paso:** Define Problem (el problema ya fue identificado en otra fase/proceso)
- **Fases:** Define Problem → Collect Data → Identify Causal Factors → Identify Root Cause → Recommend & Implement Solutions
- **Técnicas disponibles:** 5 Whys, Fishbone/Ishikawa, RCA Pro, Fault Tree Analysis
- **Por qué es TÉCNICA y no MARCO:** RCA se activa cuando ya existe un problema definido — no detecta ni identifica el problema, lo recibe como input. No cubre implementación estratégica ni seguimiento post-solución como proceso completo.

---

**Técnica T2 — Framework Analysis (Investigación Cualitativa)**
- **Categoría:** Investigación
- **Tipo:** Secuencial flexible
- **Flexibilidad:** MEDIA-ALTA
- **Primer paso:** Familiarization (inmersión en el material de investigación)
- **Fases:** Familiarization → Indexing → Charting → Mapping & Interpretation → Analysis
- **Aplicación:** Healthcare, education, policy research, marketing — contextos de investigación cualitativa estructurada
- **Por qué es TÉCNICA y no MARCO:** Es una técnica de análisis de datos cualitativos, no un proceso de gestión end-to-end. No incluye definición de problema, implementación de soluciones ni seguimiento.

---

**Técnica T3 — NASA Logical Decomposition**
- **Categoría:** Ingeniería de Sistemas
- **Tipo:** Secuencial/Jerárquico
- **Flexibilidad:** BAJA
- **Primer paso:** Establish System Architecture Model (asume que los requisitos de alto nivel YA existen)
- **Fases:** Establish System Architecture Model → Functional Analysis → Decompose Requirements → Define Interfaces → Design Solution Definition
- **Por qué es TÉCNICA y no MARCO:** CRÍTICO — asume que los requisitos de alto nivel ya están definidos antes de comenzar. No es un proceso end-to-end: no incluye identificación del problema, elicitación de requisitos de stakeholders, ni evaluación post-implementación. Es una técnica de descomposición jerárquica de sistemas complejos, útil dentro de un proceso mayor (como SDLC o DMAIC).

---

## V3.0 CAMBIOS

### Eliminaciones validadas

| Metodología | Motivo de eliminación |
|-------------|----------------------|
| **Six-Step Solution** | "Assessment" como primer paso es ambiguo — no cumple patrón universal con claridad suficiente para ser validado |
| **Future Problem Solving** | Método educativo (K-12, competencias estudiantiles) — no es marco metodológico empresarial |

### Adiciones

| Metodología | Motivo de adición |
|-------------|------------------|
| **Lean Six Sigma (#4)** | Combinación documentada de Lean (velocidad/eficiencia) + Six Sigma (precisión/calidad) — es distinto a DMAIC puro y merece entrada separada |

### Aclaraciones terminológicas

- **DMAIC = Six Sigma:** No son metodologías diferentes. DMAIC es la metodología que Six Sigma utiliza para mejorar procesos existentes. DMADV es la variante para diseño de nuevos procesos (Design for Six Sigma / DFSS).
- **Lean Six Sigma ≠ DMAIC puro:** Las fases tienen el mismo nombre pero contenido diferente — Lean Six Sigma incorpora herramientas de eliminación de desperdicios en cada fase.
- **BA/BABOK no pertenece a esta taxonomía de 12 marcos:** Es un framework independiente con 6 knowledge areas no-secuenciales, analizado en `multi-methodology-patterns-analysis.md` como flujo separado para THYROX. El usuario no lo incluyó en la lista de 15 estructuras metodológicas.

### Reclasificaciones mantenidas desde versiones previas

| Metodología | Clasificación anterior | Clasificación correcta |
|-------------|----------------------|----------------------|
| NASA Logical Decomposition | Marco completo (Categoría 7) | TÉCNICA — asume requisitos previos |
| Root Cause Analysis | Marco de Resolución de Problemas | TÉCNICA — recibe problema como input |

---

## Errores de investigación detectados y corregidos

| # | Error | Tipo | Estado |
|---|-------|------|--------|
| 1 | **Strategic Planning — primer paso incorrecto** | Error de fuente | CORREGIDO |
| 2 | **NASA Logical Decomposition — clasificación incorrecta** | Error de clasificación | RECLASIFICADO |
| 3 | **Six-Step Solution — Assessment ambiguo** | Validación fallida | ELIMINADO |
| 4 | **Future Problem Solving — contexto educativo** | Fuera de scope | ELIMINADO |

**Detalle de cada corrección:**

**Error 1 — Strategic Planning:** Múltiples fuentes web mostraban "Analyze" como primer paso visible de Strategic Planning, omitiendo el paso de Identification previo. La investigación profunda reveló que Identification (propósito, objetivos actuales, desafíos) precede explícitamente al análisis. Corrección: primer paso = IDENTIFICACIÓN.

**Error 2 — NASA Logical Decomposition:** Era listado como marco metodológico completo en versiones anteriores del documento (Categoría 7: Ingeniería de Sistemas). Revisión profunda de la metodología NASA Systems Engineering Handbook confirmó que Logical Decomposition asume que los Mission/System Requirements de alto nivel ya existen como input. No detecta el problema, no elicita requisitos de stakeholders, no evalúa post-implementación. Clasificación correcta: TÉCNICA de descomposición jerárquica.

**Error 3 — Six-Step Solution:** El primer paso "Assessment" fue analizado como potencialmente cumpliendo el patrón universal, pero la ambigüedad del término (puede significar análisis, no necesariamente identificación) hizo que no superara el criterio de validación. Eliminado del inventario.

**Error 4 — Future Problem Solving:** Investigación reveló que es un programa de competencia educativa para estudiantes K-12, diseñado para desarrollar habilidades de pensamiento crítico en contextos académicos. No es un marco metodológico empresarial u organizacional. Eliminado del inventario.

---

## Implicación para el Skills Registry de THYROX

### MARCOS → Candidatos directos para skills

Los 11 marcos confirmados (+ 1 vacante) son candidatos directos para skills del registry.
Cada marco = un flujo navegable con coordinator dedicado o state machine entry.

| Marco | Skill ID propuesto | Coordinador |
|-------|-------------------|-------------|
| SDLC | `sdlc` | `sdlc-coordinator` |
| PDCA | `pdca` | `pdca-coordinator` |
| DMAIC / Six Sigma | `dmaic` | `dmaic-coordinator` |
| Lean Six Sigma | `lean-six-sigma` | `lss-coordinator` |
| Problem Solving 8-step (Toyota) | `toyota-ps8` | `ps8-coordinator` |
| Strategic Planning | `strategic-planning` | `sp-coordinator` |
| Strategic Management | `strategic-management` | `sm-coordinator` |
| Consulting Process (General) | `consulting-general` | `cp-coordinator` |
| Consulting Process (Thoucentric) | `consulting-thoucentric` | `ct-coordinator` |
| Business Analysis Process | `business-analysis` | `ba-coordinator` |
| Business Process Analysis | `bpa` | `bpa-coordinator` |
| (Vacante #12) | TBD | TBD |

### TÉCNICAS → Sub-herramientas dentro de skills (no skills independientes)

Las 3 técnicas no justifican coordinators propios. Son invocadas como herramientas auxiliares
dentro de un marco mayor:

| Técnica | Uso dentro de marco | Integración |
|---------|--------------------|----|
| RCA | Paso de análisis en DMAIC, Problem Solving, BPA | Sub-skill o prompt auxiliar |
| Framework Analysis | Fase de análisis en Consulting, BA | Técnica documentada en references/ |
| NASA Logical Decomposition | Fase de diseño en SDLC, sistemas complejos | Técnica documentada en references/ |

### Vacante en Resolución de Problemas

El slot #12 en Categoría 3 (Resolución de Problemas) quedó vacante tras la reclasificación
de RCA como técnica. Candidatos a investigar:

- **TRIZ** (Theory of Inventive Problem Solving) — metodología rusa de innovación
- **Design Thinking** — proceso centrado en el usuario (Ideo/Stanford d.school)
- **A3 Problem Solving** (Toyota) — variante del 8-step en formato A3
- **Creative Problem Solving (CPS)** — Osborn-Parnes, 6 etapas

La investigación futura debe validar que el candidato sea marco end-to-end (no técnica)
y que su primer paso cumpla el patrón universal Identify/Define/Understand.

---

## El problema de escala: Patrón 3 no escala a 15 estructuras

El análisis anterior recomendó **un coordinator por metodología (Patrón 3)**.
Con 5 metodologías era razonable. Con 12+ marcos:

- 12 coordinators en `.claude/agents/`
- ~85 skills nuevos en `.claude/skills/`
- Cada coordinador es un archivo SKILL.md con instrucciones específicas
- Mantener 12 coordinators × 85 skills = mantenimiento exponencial

**El patrón 3 no escala — por cantidad Y por heterogeneidad de tipos.**

El problema no es solo cuantitativo. Es también de **heterogeneidad de tipos de flujo**:

- Los 12 marcos cubren 6 YAML types distintos (`sequential`, `cyclic-adaptive`, `conditional`,
  `sequential-adaptive`, `adaptive-free`, `adaptive-contextual`, `iterative-adaptive`)
- Un coordinator hardcodeado con lógica "propone el siguiente paso" solo funciona para `sequential`
- Un coordinator para `cyclic-adaptive` (PDCA) necesita preguntar si el objetivo del ciclo fue cumplido
- Un coordinator para `adaptive-free` (Consulting General) necesita modo inquisitivo, no prescriptivo
- Un coordinator para `iterative-adaptive` (BPA) necesita verificar KPIs antes de avanzar

**Un coordinator hardcodeado único no puede manejar los 6 tipos de flujo.**
El State Machine genérico necesita **lógica por tipo**, no lógica por metodología.
Esto refuerza la necesidad del Patrón 5 (State Machine + Registry): el registry
declara el `type:` de cada metodología, y el coordinator aplica la lógica correspondiente
al tipo, sin hardcodear instrucciones por metodología específica.

---

## Nueva propuesta: Arquitectura de State Machine genérica

Dado el patrón universal de 9 pasos y la naturaleza de cadena de Markov del sistema,
la arquitectura correcta es un **state machine configurable**, no coordinators hardcodeados.

### Concepto: Methodology Registry

```yaml
# .thyrox/registry/methodologies/pdca.yml
name: PDCA
type: cyclic
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
    next: [pdca-plan]  # cíclico — regresa al inicio
```

```yaml
# .thyrox/registry/methodologies/lean-six-sigma.yml
name: Lean Six Sigma
type: sequential
steps:
  - id: lss-define
    display: "LSS — Define (problema + desperdicios)"
    next: [lss-measure]
  - id: lss-measure
    display: "LSS — Measure (rendimiento + flujo de valor)"
    next: [lss-analyze]
  - id: lss-analyze
    display: "LSS — Analyze (causas raíz + variación + flujo)"
    next: [lss-improve]
  - id: lss-improve
    display: "LSS — Improve (Lean + Six Sigma tools)"
    next: [lss-control]
  - id: lss-control
    display: "LSS — Control"
    next: []  # terminal
```

### Un solo coordinator genérico

```yaml
# .claude/agents/thyrox-coordinator.md
description: "Coordinador de metodología activa. Lee .thyrox/context/now.md::phase
              y .thyrox/registry/methodologies/ para determinar flujo y próximos pasos."
skills: thyrox
tools: Read, Bash
```

El coordinator lee:
1. `now.md::phase` → estado actual (ej: `pdca-do`)
2. `registry/methodologies/pdca.yml` → qué sigue (`pdca-check`)
3. Muestra display name + sugiere next step

### session-start.sh con registry

```bash
# En lugar de _phase_to_command() hardcodeado:
_phase_to_command() {
    local phase="$1"
    # Buscar en registry el methodology que contiene esta fase
    local cmd
    cmd=$(python3 .claude/scripts/resolve-phase.py "$phase" 2>/dev/null)
    echo "${cmd:-/thyrox:analyze}"
}
```

`resolve-phase.py` lee todos los `.thyrox/registry/methodologies/*.yml` y
encuentra el comando para la fase dada. **Agregar una metodología = crear un .yml.**

---

## Tipos de flujo y su state machine

| Tipo | Característica | Ejemplo | Estado siguiente |
|------|---------------|---------|-----------------|
| **Secuencial** | A→B→C siempre | SDLC, DMAIC, Lean Six Sigma | Un solo next |
| **Cíclico** | A→B→C→A | PDCA, Strategic Management | Regresa al inicio |
| **Iterativo** | Puede repetir fases | BPA, RCA | next incluye la misma fase |
| **Adaptable/Alta** | Orden flexible según cliente | Consulting General, BA Process | next configurable por contexto |
| **Condicional** | Depende de resultado | Problem Solving 8-step (si no resuelto → volver a Analyze) | next depende de condición |

---

## Corrección al análisis anterior

**`multi-flow-detection-analysis.md` debe actualizarse:**

La sección "Recomendación: Patrón 3" queda reemplazada por:

- **Patrón 3** (un coordinator por metodología) → válido para 5 metodologías, no para 12+
- **Nueva recomendación:** Patrón 3 como transición, con objetivo final de State Machine + Registry
- **Implementación incremental:** Empezar con Patrón 3 para las 4-5 metodologías prioritarias,
  diseñar el registry desde el inicio para que sea extensible

---

## Implicación directa para Phase 2 SOLUTION STRATEGY

La decisión arquitectónica central de Phase 2 será:

> **¿Hardcoded coordinators (Patrón 3) o State Machine genérica con Registry?**

**Consideraciones:**
- Patrón 3 hardcoded: implementable en FASE 39, entrega valor inmediato para 5 metodologías
- State Machine con registry: correcto a largo plazo para 12+ metodologías, más complejo
- **Compromiso viable:** Implementar Patrón 3 con interfaz de registry desde el inicio,
  migrar a state machine puro en FASE posterior

El patrón universal de 9 pasos valida que **todos los flujos son instancias del mismo
meta-proceso**. Esto sugiere que un solo SKILL.md genérico (`workflow-methodology-step`)
con el contexto del paso específico inyectado via registry podría servir a todos los flujos.
