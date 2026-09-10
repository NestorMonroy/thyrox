---
created_at: 2026-04-15 10:31:00
project: THYROX
topic: Sub-análisis detallado — Categorías 4-6 (Planeación Estratégica, Consultoría, Análisis de Negocios)
author: NestorMonroy
status: Borrador
---

# Sub-análisis: Categorías 4-6 — Planeación Estratégica, Consultoría, Análisis de Negocios

## Tabla Resumen — Frameworks de Categorías 4-6

| # | Framework | Categoría | Tipo | Flexibilidad | Primer Paso | Fases | Skills THYROX propuestos |
|---|-----------|-----------|------|--------------|-------------|-------|--------------------------|
| 6 | Strategic Planning | Planeación Estratégica | Secuencial | MEDIA | Identification | 5 | sp-identify, sp-prioritize, sp-develop, sp-implement, sp-update |
| 7 | Strategic Management | Planeación Estratégica | Secuencial/Cíclico | MEDIA-ALTA | Environmental Scanning | 4 | sm-scan, sm-formulate, sm-implement, sm-evaluate |
| 8 | Consulting Process General | Consultoría | Secuencial adaptable | ALTA | Initiation | 5 | cp-initiation, cp-diagnosis, cp-planning, cp-implementation, cp-evaluation |
| 9 | Consulting Process Thoucentric | Consultoría | Secuencial adaptable | MEDIA-ALTA | Initial Understanding | 7 | ct-understand, ct-scope, ct-analyze, ct-solutions, ct-plan, ct-implement, ct-monitor |
| 10 | Business Analysis Process | Análisis de Negocios | Secuencial contextual | ALTA | Context & Understanding | 7 | ba-context, ba-elicitation, ba-analysis, ba-design, ba-implementation, ba-testing, ba-evaluation |
| 11 | Business Process Analysis (BPA) | Análisis de Negocios | Secuencial/Iterativo | MEDIA-ALTA | Identify | 6 | bpa-identify, bpa-map, bpa-analyze, bpa-improve, bpa-implement, bpa-monitor |

---

## El problema de la flexibilidad adaptativa

Los frameworks en Cat4-6 comparten una característica que los hace fundamentalmente distintos de Cat1-3: **las fases son guías, no mandatos**. El nivel de profundidad, la duración, y en algunos casos el orden, dependen del contexto del proyecto, cliente u organización.

Esto rompe el modelo simple de registry `type: sequential` donde `next:` es determinístico. Un coordinator que dice "tu siguiente paso es X" es **correcto para SDLC (BAJA flexibilidad) pero INCORRECTO para Consulting General (ALTA flexibilidad)**, donde las fases varían en duración, profundidad, y a veces en orden, según el cliente.

### Tipos de registry necesarios para Cat4-6

| Framework | Tipo actual | Tipo correcto | Por qué |
|-----------|------------|---------------|---------|
| Strategic Planning | sequential | sequential-adaptive | "Update" es continuo — no hay end state fijo |
| Strategic Management | cyclic | adaptive-cyclic | Puede entrar en cualquier fase según las condiciones del mercado |
| Consulting General | sequential | adaptive-free | Fases varían en profundidad y orden por cliente |
| Consulting Thoucentric | sequential | adaptive | 7 pasos pero duración y profundidad variables |
| Business Analysis Process | sequential | adaptive-contextual | Se adapta a la metodología del proyecto (Waterfall/Agile) |
| BPA | iterative | iterative-adaptive | Número de iteraciones no está predefinido |

Esta distinción determina no solo la estructura YAML del registry sino también el comportamiento del coordinator: si hace transiciones determinísticas o si hace preguntas de estado antes de avanzar.

---

## Categoría 4: Planeación Estratégica

### Strategic Planning

**Tipo:** Secuencial
**Subtipo:** Planeación periódica de dirección organizacional
**Flexibilidad:** MEDIA

**Primer paso:** Identification — identificar propósito, objetivos, desafíos y oportunidades

#### Nota de Corrección V3.0

La documentación web incompleta sobre este framework sugería que comenzaba con "Analyze". Esto es incorrecto. La investigación primaria confirma que Strategic Planning comienza con **IDENTIFICACIÓN** del propósito organizacional, objetivos y desafíos. El análisis (SWOT, PESTEL) ocurre como herramienta dentro de las fases, no como primer paso del marco.

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Identification | Identificar el propósito de la organización, objetivos estratégicos, problemas actuales, desafíos y oportunidades; usar Portfolio Plans para estructurar la identificación |
| 2 | Prioritization | Priorizar iniciativas usando portafolios de trabajo; evaluar impacto vs. esfuerzo; alinear con capacidad organizacional |
| 3 | Development | Elaborar plan detallado con iniciativas específicas y tareas concretas; vincular cada iniciativa a objetivos estratégicos definidos en fase 1 |
| 4 | Implementation | Ejecutar tareas, proyectos e iniciativas del plan; automatizar flujos de trabajo donde sea posible; mantener alineación estratégica durante ejecución |
| 5 | Update | Revisar y ajustar el plan continuamente con feedback operativo; monitoreo de KPIs; ciclos de revisión periódicos (trimestral/semestral) |

#### Características Clave

- **Horizonte temporal:** 3-5 años típicamente; revisiones anuales o semestrales
- **Alcance multi-departamental:** involucra a toda la organización o unidades de negocio completas
- **Herramientas de alineación:** OKRs (Objectives and Key Results), Balanced Scorecard, V2MOM (Vision, Values, Methods, Obstacles, Measures)
- **Requisitos:** Stakeholder buy-in desde fases tempranas; comunicación clara y consistente
- **Iterativo y dinámico:** la fase Update permite adaptar el plan a cambios del entorno sin reiniciar desde cero

#### Diferencia con Strategic Management

| Aspecto | Strategic Planning | Strategic Management |
|---------|-------------------|---------------------|
| Naturaleza | Periódico, estructurado | Continuo, adaptativo |
| Horizonte | 3-5 años con revisiones | Ciclo perpetuo |
| Foco | Crear el plan | Gestionar la ejecución del plan |
| Flexibilidad | MEDIA (plan más rígido) | MEDIA-ALTA (más adaptable) |
| Actividad principal | Diseñar dirección futura | Monitorear y ajustar estrategia activa |

**Regla práctica:** Strategic Planning produce el plan. Strategic Management lo ejecuta y mantiene vivo.

#### Verificación del Patrón Universal

Comienza con **Identification** = identificar propósito organizacional, objetivos, problemas y oportunidades antes de cualquier acción. ✓

#### Registry YAML y comportamiento del coordinator

```yaml
type: sequential-adaptive
steps:
  - id: sp-identify
    display: "Strategic Planning — Identification"
    next: [sp-prioritize]
    depth: adaptive
    duration_hint: "días a semanas"
  - id: sp-prioritize
    display: "Strategic Planning — Prioritization"
    next: [sp-develop]
    depth: adaptive
  - id: sp-develop
    display: "Strategic Planning — Development"
    next: [sp-implement]
    depth: adaptive
  - id: sp-implement
    display: "Strategic Planning — Implementation"
    next: [sp-update]
    depth: adaptive
  - id: sp-update
    display: "Strategic Planning — Update"
    next: [sp-identify]  # puede reiniciar todo el ciclo
    trigger: "revisión periódica (trimestral/anual) o cambio de contexto significativo"
```

**Coordinator:** "¿La identificación refleja el estado actual? ¿Hay cambios en el contexto organizacional desde la última revisión?"

La fase `sp-update` no es terminal — es el punto de reentrada al ciclo. El coordinator no asume que el plan está "terminado"; pregunta si el contexto organizacional ha cambiado suficientemente para justificar revisión del ciclo completo.

#### Mapeo a Skills de THYROX

Skills propuestos: 5 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Identification | sp-identify | `/thyrox:sp-identify` |
| Prioritization | sp-prioritize | `/thyrox:sp-prioritize` |
| Development | sp-develop | `/thyrox:sp-develop` |
| Implementation | sp-implement | `/thyrox:sp-implement` |
| Update | sp-update | `/thyrox:sp-update` |

---

### Strategic Management

**Tipo:** Secuencial / Cíclico
**Subtipo:** Gestión continua de estrategia organizacional
**Flexibilidad:** MEDIA-ALTA

**Primer paso:** Environmental Scanning — analizar factores internos y externos

#### Contexto de Primer Paso

Environmental Scanning asume que **ya se identificó** que se necesita gestión estratégica (es decir, la organización existe y tiene dirección). El análisis del entorno es el punto de partida operativo del ciclo de gestión. No es un proceso de fundación organizacional sino de gestión continua de una estrategia existente o en desarrollo.

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Environmental Scanning | Analizar factores internos y externos que afectan a la organización; usar SWOT (Strengths, Weaknesses, Opportunities, Threats) y PESTEL (Political, Economic, Social, Technological, Environmental, Legal) |
| 2 | Strategy Formulation | Formular o reformular la estrategia basada en el análisis; definir objetivos, metas y planes de acción; seleccionar entre alternativas estratégicas |
| 3 | Strategy Implementation | Ejecutar la estrategia formulada; asignar recursos, estructurar procesos, alinear cultura organizacional, gestionar el cambio |
| 4 | Evaluation and Control | Evaluar continuamente el rendimiento estratégico contra objetivos; identificar desviaciones; ajustar y retroalimentar al ciclo |

#### Características Clave

- **Evaluación continua:** la fase 4 no termina el ciclo — retroalimenta directamente a la fase 1
- **Adaptable a cambios del mercado:** el ciclo cíclico permite responder a disrupciones sin reiniciar
- **Herramientas de análisis:** SWOT, PESTEL, Five Forces (Porter), Balanced Scorecard
- **Cíclico por naturaleza:** a diferencia de Strategic Planning que produce un documento, Strategic Management es un proceso perpetuo
- **Multinivel:** aplica a nivel corporativo, de unidad de negocio y funcional simultáneamente

#### Verificación del Patrón Universal

Comienza con **Environmental Scanning** = análisis sistemático del contexto (identificación implícita de dónde está la organización y qué la rodea). La identificación de la necesidad de gestión estratégica es prerrequisito implícito. ✓

#### Registry YAML y comportamiento del coordinator

Strategic Management es **continuo y adaptativo** — puede entrar en cualquier fase sin recorrer las anteriores. Environmental Scanning puede dispararse por un evento externo (crisis, oportunidad) incluso si el ciclo anterior no ha terminado.

```yaml
type: adaptive-cyclic
entry_point: any  # puede entrar en cualquier fase
steps:
  - id: sm-scan
    display: "Strategic Management — Environmental Scanning"
    next: [sm-formulate, sm-evaluate]  # puede ir a formular O a evaluar directamente
    trigger: "cambio en SWOT/PESTEL, evento de mercado, resultado de evaluación"
  - id: sm-formulate
    display: "Strategic Management — Strategy Formulation"
    next: [sm-implement, sm-scan]  # puede necesitar más datos
  - id: sm-implement
    display: "Strategic Management — Strategy Implementation"
    next: [sm-evaluate]
  - id: sm-evaluate
    display: "Strategic Management — Evaluation and Control"
    next: [sm-scan, sm-formulate]  # retroalimenta a scan o reformulación directa
    trigger: "resultados de implementación, KPIs, cambio de contexto"
```

**Coordinator:** "¿Qué cambio desencadenó esta sesión? Basado en eso, ¿estamos en Scanning o directamente en Formulation?"

A diferencia de frameworks secuenciales, el coordinator de Strategic Management NO dice "completaste scan, ahora formula". En su lugar, diagnostica el disparador de la sesión actual y determina el punto de entrada apropiado.

#### Mapeo a Skills de THYROX

Skills propuestos: 4 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Environmental Scanning | sm-scan | `/thyrox:sm-scan` |
| Strategy Formulation | sm-formulate | `/thyrox:sm-formulate` |
| Strategy Implementation | sm-implement | `/thyrox:sm-implement` |
| Evaluation and Control | sm-evaluate | `/thyrox:sm-evaluate` |

---

## Categoría 5: Consultoría

### Consulting Process General

**Tipo:** Secuencial altamente adaptable
**Subtipo:** Proceso genérico de consultoría profesional
**Flexibilidad:** ALTA

**Primer paso:** Initiation — contacto inicial y diagnóstico preliminar

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Initiation | Contacto inicial con el cliente; diagnóstico preliminar de la situación; elaborar propuesta; negociar y formalizar contrato de consultoría |
| 2 | Diagnosis | Definir y medir el problema en profundidad; investigar causas, contexto e impacto; analizar datos internos y externos del cliente |
| 3 | Action Planning | Desarrollar soluciones y alternativas viables; crear plan de implementación detallado; presentar y validar con cliente |
| 4 | Implementation | Poner el plan en acción; colaborar activamente con equipo del cliente; gestionar cambio y resistencia organizacional |
| 5 | Evaluation | Monitorear resultados post-implementación; analizar efectividad; documentar lecciones aprendidas; evaluar satisfacción del cliente |

#### Características Clave

- **Customizable por cliente:** las fases varían en duración y profundidad según el proyecto específico
- **Modos de interacción:** advisory (solo recomendaciones), consultativo (co-diseño), colaborativo (implementación conjunta)
- **Contexto amplio:** el consultor entiende el entorno económico, tecnológico, político y social del cliente
- **Fases flexibles:** Diagnosis puede ser extensa para problemas complejos o breve para diagnósticos directos
- **Gestión de relación:** la confianza cliente-consultor es un activo que se construye desde Initiation

#### Verificación del Patrón Universal

Comienza con **Initiation** = diagnóstico preliminar que identifica el problema o necesidad del cliente antes de proponer soluciones. ✓

#### Registry YAML y comportamiento del coordinator

Consulting Process General es el framework con **mayor complejidad adaptativa** del inventario. Cada cliente requiere una configuración diferente: la fase Diagnosis puede tomar 2 días o 3 meses; Action Planning puede omitirse si el cliente ya tiene un plan claro; Implementation puede ser solo advisory (el consultor NO implementa).

```yaml
type: adaptive-free
steps:
  - id: cp-initiation
    display: "Consulting — Initiation"
    next: [cp-diagnosis, cp-action-planning]  # puede saltar Diagnosis
    depth: client-variable
    deliverable_required: ["engagement-letter"]  # mínimo siempre requerido
  - id: cp-diagnosis
    display: "Consulting — Diagnosis"
    next: [cp-action-planning, cp-diagnosis]  # puede iterar
    depth: client-variable
    skip_condition: "cliente tiene diagnóstico propio validado"
  - id: cp-action-planning
    display: "Consulting — Action Planning"
    next: [cp-implementation, cp-evaluation]  # puede saltar a evaluation si es advisory
    depth: client-variable
    skip_condition: "cliente tiene plan de implementación propio"
  - id: cp-implementation
    display: "Consulting — Implementation"
    next: [cp-evaluation]
    depth: client-variable  # advisory | consultative | collaborative
  - id: cp-evaluation
    display: "Consulting — Evaluation"
    next: []  # terminal, pero puede reiniciar todo el engagement
    reengagement_possible: true
```

**Coordinator:** NO dice "tu siguiente paso es X". Dice: "¿Qué entregable de esta fase existe? ¿El cliente está listo para la siguiente fase? ¿Hay factores que justifiquen ajustar la profundidad?"

Este es el caso más extremo de coordinator adaptativo: las preguntas de estado reemplazan completamente las transiciones determinísticas. El coordinator debe determinar el modo de interacción (advisory/consultativo/colaborativo) al inicio del engagement y configurar las expectativas de profundidad en consecuencia.

#### Mapeo a Skills de THYROX

Skills propuestos: 5 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Initiation | cp-initiation | `/thyrox:cp-initiation` |
| Diagnosis | cp-diagnosis | `/thyrox:cp-diagnosis` |
| Action Planning | cp-planning | `/thyrox:cp-planning` |
| Implementation | cp-implementation | `/thyrox:cp-implementation` |
| Evaluation | cp-evaluation | `/thyrox:cp-evaluation` |

---

### Consulting Process Thoucentric — 7 Pasos

**Tipo:** Secuencial adaptable
**Subtipo:** Variante estructurada de consultoría con énfasis en colaboración cliente
**Flexibilidad:** MEDIA-ALTA

**Primer paso:** Initial Understanding — entender necesidades del cliente

#### Contexto

Thoucentric es una variante específica del Consulting Process general, más estructurada y con énfasis explícito en la colaboración cliente-consultor durante toda la ejecución. Introduce pasos separados para scope definition y action planning que en la versión general están integrados en fases más amplias.

#### Fases

| # | Fase | Descripción | Equivalente en Consulting General |
|---|------|-------------|----------------------------------|
| 1 | Initial Understanding | Entender las necesidades, problemas y objetivos del cliente en profundidad (IDENTIFICACIÓN) | Parte de Initiation |
| 2 | Define Scope & Objectives | Definir alcance exacto del proyecto; establecer objetivos medibles y criterios de éxito (CLARIFICACIÓN) | Parte de Initiation/Diagnosis |
| 3 | Collect & Analyze Data | Recopilar información relevante; analizar datos internos y externos; identificar patrones | Diagnosis |
| 4 | Develop Solutions | Crear soluciones tailored para el contexto específico del cliente; validar con stakeholders | Action Planning |
| 5 | Create Action Plan | Preparar plan de ejecución detallado con responsables, timelines y recursos requeridos | Action Planning |
| 6 | Implementation | Implementar la solución en colaboración activa con el equipo del cliente | Implementation |
| 7 | Monitoring & Adjustment | Monitorear resultados continuamente; ajustar según feedback; evaluar impacto final | Evaluation |

#### Características Clave

- **Colaboración intensiva cliente-consultor:** el equipo del cliente no es receptor pasivo sino co-ejecutor
- **Separación explícita de scope y planning:** evita ambigüedad sobre qué se entrega y cómo
- **Énfasis en medición:** los objetivos definidos en paso 2 son la vara de medición en paso 7
- **Flexible pero estructurado:** 7 pasos claros pero con duración variable según complejidad
- **Mayor granularidad que versión general:** los 5 pasos del General equivalen a 7 en Thoucentric

#### Diferencia con Consulting Process General

| Aspecto | Consulting General | Consulting Thoucentric |
|---------|-------------------|----------------------|
| Pasos | 5 fases amplias | 7 pasos más granulares |
| Scope Definition | Parte de Initiation | Paso explícito propio (#2) |
| Action Planning | Una fase única | Dos pasos separados (#4 y #5) |
| Foco | Genérico, universalmente aplicable | Énfasis en colaboración y medición |
| Adaptabilidad | ALTA | MEDIA-ALTA |

#### Verificación del Patrón Universal

Comienza con **Initial Understanding** = identificación explícita de necesidades, problemas y objetivos del cliente. ✓

#### Registry YAML y comportamiento del coordinator

Thoucentric tiene 7 pasos claros pero la duración por paso varía enormemente. El paso "Collect & Analyze Data" puede iterar si los datos son insuficientes; "Monitoring & Adjustment" puede durar semanas o años.

```yaml
type: adaptive
steps:
  - id: ct-understand
    display: "Consulting Thoucentric — Initial Understanding"
    next: [ct-scope]
    depth: client-variable
  - id: ct-scope
    display: "Consulting Thoucentric — Define Scope & Objectives"
    next: [ct-analyze]
    depth: client-variable
  - id: ct-analyze
    display: "Consulting Thoucentric — Collect & Analyze Data"
    next: [ct-solutions, ct-analyze]  # puede volver a analizar más datos
    depth: data-driven  # profundidad determinada por suficiencia de datos
    loop_condition: "¿Los datos recopilados son suficientes para desarrollar soluciones?"
  - id: ct-solutions
    display: "Consulting Thoucentric — Develop Solutions"
    next: [ct-plan, ct-analyze]  # puede necesitar más datos
  - id: ct-plan
    display: "Consulting Thoucentric — Create Action Plan"
    next: [ct-implement]
  - id: ct-implement
    display: "Consulting Thoucentric — Implementation"
    next: [ct-monitor]
  - id: ct-monitor
    display: "Consulting Thoucentric — Monitoring & Adjustment"
    next: [ct-analyze, ct-solutions]  # puede revelar nuevos gaps
    duration_hint: "semanas a años según el engagement"
```

**Coordinator:** "¿Los datos recopilados en ct-analyze son suficientes para desarrollar soluciones robustas? Si hay gaps de información, iterar ct-analyze antes de avanzar."

#### Mapeo a Skills de THYROX

Skills propuestos: 7 skills nuevos (uno por paso)

| Paso | Skill propuesto | Comando |
|------|----------------|---------|
| Initial Understanding | ct-understand | `/thyrox:ct-understand` |
| Define Scope & Objectives | ct-scope | `/thyrox:ct-scope` |
| Collect & Analyze Data | ct-analyze | `/thyrox:ct-analyze` |
| Develop Solutions | ct-solutions | `/thyrox:ct-solutions` |
| Create Action Plan | ct-plan | `/thyrox:ct-plan` |
| Implementation | ct-implement | `/thyrox:ct-implement` |
| Monitoring & Adjustment | ct-monitor | `/thyrox:ct-monitor` |

---

## Categoría 6: Análisis de Negocios

### Business Analysis Process

**Tipo:** Secuencial contextual
**Subtipo:** Análisis de requisitos para nuevas soluciones de negocio
**Flexibilidad:** ALTA

**Primer paso:** Context & Understanding — entender historia, sistemas y contexto

#### Distinción Crítica: BA vs BPA

Esta distinción es fundamental para el Skills Registry:

| Dimensión | Business Analysis (BA) | Business Process Analysis (BPA) |
|-----------|----------------------|--------------------------------|
| Objeto de análisis | Requisitos para soluciones NUEVAS | Procesos EXISTENTES en operación |
| Pregunta central | "¿Qué necesitamos construir o implementar?" | "¿Cómo mejoramos lo que ya tenemos?" |
| Punto de partida | Necesidad nueva o problema de sistema | Proceso existente seleccionado |
| Entregable principal | Documento de requisitos validados | Proceso mejorado (As-Is → To-Be) |
| Herramienta clave | Elicitation (entrevistas, workshops) | Value Stream Mapping, mapeo de proceso |

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Context & Understanding | Entender la historia, los sistemas existentes, los procesos actuales y el contexto organizacional; identificar stakeholders clave (IDENTIFICACIÓN DEL CONTEXTO) |
| 2 | Elicitation | Recopilar requisitos de todos los stakeholders relevantes usando múltiples técnicas (entrevistas, workshops, observación, prototipado, cuestionarios) |
| 3 | Analysis | Analizar, modelar y validar los requisitos recopilados; identificar conflictos, ambigüedades y brechas; priorizar con stakeholders |
| 4 | Design | Diseñar la solución que satisface los requisitos validados; crear modelos, prototipos o especificaciones funcionales |
| 5 | Implementation | Implementar la solución diseñada; colaborar con equipo técnico; gestionar cambios de requisitos durante ejecución |
| 6 | Testing | Probar que la solución implementada satisface los requisitos definidos; validar funcionalidad, performance y usabilidad |
| 7 | Evaluation | Evaluar y validar que la solución entregada cumple los objetivos de negocio originales; medir ROI y beneficios realizados |

#### Características Clave

- **Adapta a metodologías:** funciona con Waterfall (requisitos completos al inicio), Agile (requisitos por sprint) o híbrido
- **Técnicas de elicitation variadas:** la fase 2 usa la técnica más adecuada según el tipo de stakeholder y requisito
- **Personalizable:** el nivel de detalle en cada fase varía según complejidad del proyecto
- **Orientado a valor de negocio:** la fase 7 cierra el ciclo validando que se logró lo prometido
- **BA como rol:** el Business Analyst es el puente entre stakeholders de negocio y equipo técnico

#### Verificación del Patrón Universal

Comienza con **Context & Understanding** = identificación del contexto, historia y sistemas existentes antes de recopilar requisitos. ✓

#### Registry YAML y comportamiento del coordinator

Business Analysis Process se adapta a la metodología del proyecto host. En Agile, Elicitation ocurre por sprint (no una sola vez). En Waterfall, la secuencia es más lineal, pero con regresos a Analysis desde Testing. La metodología host configura el flujo completo.

```yaml
type: adaptive-contextual
host_methodology: variable  # waterfall | agile | iterative | other
steps:
  - id: ba-context
    display: "Business Analysis — Context & Understanding"
    next: [ba-elicitation]
  - id: ba-elicitation
    display: "Business Analysis — Elicitation"
    next: [ba-analysis]
    iteration_policy:
      agile: "por sprint — se repite cada iteración"
      waterfall: "una vez por fase de requirements"
      iterative: "por iteración, con profundidad creciente"
  - id: ba-analysis
    display: "Business Analysis — Analysis"
    next: [ba-design, ba-elicitation]  # puede necesitar más elicitation
  - id: ba-design
    display: "Business Analysis — Design"
    next: [ba-implementation]
  - id: ba-implementation
    display: "Business Analysis — Implementation"
    next: [ba-testing]
  - id: ba-testing
    display: "Business Analysis — Testing"
    next: [ba-evaluation, ba-analysis]  # puede revelar requisitos faltantes
  - id: ba-evaluation
    display: "Business Analysis — Evaluation"
    next: []  # terminal para este ciclo
```

**Coordinator:** "¿Bajo qué metodología está trabajando el proyecto? Basado en eso, ¿cómo se configura el flujo de Business Analysis?"

La pregunta de contexto metodológico es obligatoria al inicio. La respuesta (waterfall/agile/iterative) determina el `iteration_policy` de `ba-elicitation` y los posibles `next` de `ba-testing`.

#### Mapeo a Skills de THYROX

Skills propuestos: 7 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Context & Understanding | ba-context | `/thyrox:ba-context` |
| Elicitation | ba-elicitation | `/thyrox:ba-elicitation` |
| Analysis | ba-analysis | `/thyrox:ba-analysis` |
| Design | ba-design | `/thyrox:ba-design` |
| Implementation | ba-implementation | `/thyrox:ba-implementation` |
| Testing | ba-testing | `/thyrox:ba-testing` |
| Evaluation | ba-evaluation | `/thyrox:ba-evaluation` |

---

### Business Process Analysis (BPA)

**Tipo:** Secuencial / Iterativo
**Subtipo:** Optimización de procesos existentes
**Flexibilidad:** MEDIA-ALTA

**Primer paso:** Identify — identificar necesidad de análisis y seleccionar proceso

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Identify | Identificar la necesidad de análisis; seleccionar el proceso específico a analizar; definir alcance y stakeholders del proceso |
| 2 | Map | Mapear el proceso actual (As-Is) con documentación detallada; involucrar a ejecutores del proceso y stakeholders; crear diagramas de flujo |
| 3 | Analyze | Analizar el proceso mapeado para identificar ineficiencias, bottlenecks, redundancias, pasos sin valor agregado y puntos de falla |
| 4 | Improve | Crear la versión mejorada (To-Be) del proceso con optimizaciones concretas; validar mejoras con stakeholders |
| 5 | Implement | Implementar el proceso mejorado; gestionar la transición desde As-Is a To-Be; capacitar a ejecutores |
| 6 | Monitor | Monitorear continuamente el performance del proceso mejorado con KPIs definidos; identificar oportunidades de mejora adicional |

#### Características Clave

- **Produce As-Is y To-Be:** el contraste entre estado actual y futuro es el artefacto central
- **Universalmente aplicable:** ventas, HR, operaciones, IT, finanzas, cualquier proceso organizacional
- **Mejora continua:** la fase Monitor puede revelar nuevas oportunidades que reinician el ciclo
- **KPIs obligatorios:** el Monitor sin métricas definidas es inútil — los KPIs se establecen en Identify
- **Herramientas de mapeo:** BPMN, flowcharts, swimlane diagrams, Value Stream Maps

#### Relación con otras metodologías

BPA comparte herramientas con Lean Six Sigma (VSM, identificación de desperdicios) pero BPA es más general y no requiere el rigor estadístico de Six Sigma. BPA puede ser el punto de entrada que lleva a un proyecto DMAIC o LSS cuando se detectan problemas de variabilidad.

#### Verificación del Patrón Universal

Comienza con **Identify** = identificar la necesidad de análisis y seleccionar el proceso objetivo. ✓

#### Registry YAML y comportamiento del coordinator

El ciclo Improve→Implement→Monitor puede repetirse N veces. Monitor puede revelar que Improve fue insuficiente y volver a Improve, o que los problemas son más profundos y volver al inicio completo (Identify). No hay un número predefinido de iteraciones.

```yaml
type: iterative-adaptive
steps:
  - id: bpa-identify
    display: "BPA — Identify"
    next: [bpa-map]
  - id: bpa-map
    display: "BPA — Map"
    next: [bpa-analyze]
  - id: bpa-analyze
    display: "BPA — Analyze"
    next: [bpa-improve, bpa-map]  # puede necesitar re-mapeo si el proceso es complejo
  - id: bpa-improve
    display: "BPA — Improve"
    next: [bpa-implement]
  - id: bpa-implement
    display: "BPA — Implement"
    next: [bpa-monitor]
  - id: bpa-monitor
    display: "BPA — Monitor"
    next: [bpa-identify, bpa-improve]  # puede volver a inicio completo O solo a Improve
    loop_condition: "¿El proceso alcanzó los KPIs objetivo?"
    max_iterations: null  # sin límite predefinido
```

**Coordinator:** "¿El proceso mejorado alcanzó los KPIs definidos en bpa-identify? Si no, ¿el gap es de implementación (→ bpa-improve) o de identificación del problema raíz (→ bpa-identify)?"

La distinción entre volver a `bpa-improve` vs `bpa-identify` es la decisión clave del coordinator en cada ciclo de Monitor.

#### Mapeo a Skills de THYROX

Skills propuestos: 6 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Identify | bpa-identify | `/thyrox:bpa-identify` |
| Map | bpa-map | `/thyrox:bpa-map` |
| Analyze | bpa-analyze | `/thyrox:bpa-analyze` |
| Improve | bpa-improve | `/thyrox:bpa-improve` |
| Implement | bpa-implement | `/thyrox:bpa-implement` |
| Monitor | bpa-monitor | `/thyrox:bpa-monitor` |

---

## Coordinator adaptativo vs determinístico — diferencia de implementación

Para frameworks con flexibilidad ALTA, el coordinator necesita un modelo de interacción fundamentalmente diferente al de frameworks BAJA/MEDIA.

### 1. Preguntas de estado en lugar de comandos de transición

| Modelo | Ejemplo |
|--------|---------|
| Determinístico | "Has completado analyze, el siguiente paso es strategy" |
| Adaptativo | "¿Qué encontraste en esta fase? ¿Estás listo para avanzar?" |

El coordinator determinístico (SDLC, DMAIC) conoce el siguiente paso antes de que el usuario termine la fase actual. El coordinator adaptativo (Consulting General, BA Process) necesita información del estado actual para determinar si avanzar, iterar, o saltar una fase.

### 2. Deliverable-based completion en lugar de step-based

| Modelo | Ejemplo |
|--------|---------|
| Determinístico | "Completa estas 5 actividades y luego avanza" |
| Adaptativo | "La fase está completa cuando tienes suficiente información para tomar la siguiente decisión" |

Los frameworks ALTA no tienen un checklist fijo de actividades por fase. La completitud es una función del contexto: en un cliente con diagnóstico propio validado, cp-diagnosis puede completarse en horas; en otro, puede tomar semanas.

### 3. Context injection en el skill

El skill debe preguntar al inicio: "¿Qué tipo de proyecto/cliente/organización es este?"

La respuesta configura:
- La profundidad de las actividades dentro de la fase
- Las condiciones de skip de fases opcionales
- El modo de interacción (advisory/consultativo/colaborativo para Consulting)
- La metodología host (para BA Process)

### 4. Soft gates en lugar de hard gates

| Tipo | Descripción | Aplicable a |
|------|-------------|-------------|
| Hard gate | "El artefacto X DEBE existir antes de continuar" | SDLC, DMAIC, frameworks BAJA flexibilidad |
| Soft gate | "¿Tienes suficiente para continuar? ¿Qué te falta?" | Consulting, BA Process, frameworks ALTA flexibilidad |

Los soft gates no bloquean el avance — orientan la conversación sobre si el avance es apropiado dado el contexto actual.

### Skills adaptativos — plantilla de instrucciones

Para cualquier skill en un framework de flexibilidad ALTA, la estructura de SKILL.md debe seguir esta plantilla:

```markdown
# [nombre-skill]/SKILL.md para frameworks ALTA flexibilidad

## Contexto adaptativo
Antes de comenzar, determina:
- ¿Qué tipo de proyecto/cliente/organización?
- ¿Qué profundidad requiere este contexto?
- ¿Hay fases anteriores que se pueden omitir dado el contexto?

## Actividades (guías, no mandatos)
Las siguientes actividades son referencia. Adapta según el contexto:
...

## Criterio de completitud (soft)
Esta fase está completa cuando PUEDES responder:
[pregunta específica de la fase]
No cuando todas las actividades están checked.

## Actualizar phase al completar
bash .claude/scripts/set-session-phase.sh '[siguiente-fase]'
```

La diferencia clave con skills de frameworks BAJA flexibilidad: el criterio de completitud es una pregunta de capacidad decisional ("¿puedes responder X?"), no un checklist de actividades.

---

## Implicaciones para el Skills Registry de THYROX

### Conteo de Skills Propuestos — Categorías 4-6

| Categoría | Framework | Skills nuevos | Coordinator requerido |
|-----------|-----------|---------------|----------------------|
| Cat 4 — Planeación Estratégica | Strategic Planning | 5 | Sí (sp-coordinator) |
| Cat 4 — Planeación Estratégica | Strategic Management | 4 | Sí (sm-coordinator) |
| Cat 5 — Consultoría | Consulting Process General | 5 | Sí (cp-coordinator) |
| Cat 5 — Consultoría | Consulting Process Thoucentric | 7 | Sí (ct-coordinator) |
| Cat 6 — Análisis de Negocios | Business Analysis Process | 7 | Sí (ba-coordinator) |
| Cat 6 — Análisis de Negocios | Business Process Analysis | 6 | Sí (bpa-coordinator) |
| **TOTAL Cat 4-6** | **6 frameworks** | **34 skills nuevos** | **6 coordinators** |

### Tipos de Registry — Resumen actualizado

Los tipos YAML necesarios para soportar la flexibilidad de Cat4-6 van más allá del `type: sequential` estándar:

| Framework | Tipo registry | Coordinator | Complejidad |
|-----------|--------------|-------------|-------------|
| Strategic Planning | `sequential-adaptive` | Preguntas de revisión periódica | Baja-Media |
| Strategic Management | `adaptive-cyclic` | `entry_point: any`, diagnóstico de disparador | Media-Alta |
| Consulting General | `adaptive-free` | Sin transiciones determinísticas — solo preguntas de estado | Alta |
| Consulting Thoucentric | `adaptive` | Iterable en ct-analyze por suficiencia de datos | Media-Alta |
| Business Analysis Process | `adaptive-contextual` | Pregunta obligatoria de metodología host al inicio | Media-Alta |
| Business Process Analysis | `iterative-adaptive` | `max_iterations: null`, decisión Improve vs Identify en Monitor | Media |

### Estimado de Tokens de Contexto

Asumiendo ~2,000 tokens promedio por SKILL.md (skills adaptativos pueden ser ~2,500 por la lógica adicional):

| Componente | Skills | Tokens estimados |
|------------|--------|-----------------|
| Strategic Planning (5 + coordinator) | 6 | ~12,000 |
| Strategic Management (4 + coordinator) | 5 | ~10,000 |
| Consulting General (5 + coordinator) | 6 | ~15,000 |
| Consulting Thoucentric (7 + coordinator) | 8 | ~16,000 |
| Business Analysis (7 + coordinator) | 8 | ~16,000 |
| Business Process Analysis (6 + coordinator) | 7 | ~14,000 |
| **Subtotal Cat 4-6** | **40 skills** | **~83,000 tokens** |

### Patrón de Composición Aplicable

Todos los frameworks de Cat 4-6 presentan fases con transiciones entre fases, pero el patrón varía:

- **Pattern 3: Multi-Phase Sequential** — aplica a Strategic Planning (con la variante `sequential-adaptive`)
- **Pattern 4: Cyclic** — aplica a Strategic Management (con `adaptive-cyclic`, `entry_point: any`)
- **Pattern 5: Adaptive-Free** — nuevo patrón requerido para Consulting General
- **Pattern 6: Adaptive-Contextual** — nuevo patrón requerido para BA Process (configurable por metodología host)
- **Pattern 7: Iterative-Adaptive** — nuevo patrón requerido para BPA (iteraciones sin límite predefinido)

**Consideración adicional para consultoría:** Los frameworks de Cat 5 (Consulting) tienen alta flexibilidad en duración de fases. El coordinator de consultoría necesita lógica de estado más robusta que frameworks rígidos como DMAIC, ya que el tiempo en cada fase puede variar significativamente por proyecto. Esto implica SKILL.md más largos con más lógica condicional.

**Consideración para BA vs BPA:** Aunque ambos son de Cat 6 y tienen estructuras similares (6-7 fases), sus coordinators deben ser completamente independientes dado que atienden casos de uso distintos (nuevo vs existente). No se deben compartir phase-skills entre ba-* y bpa-* aunque haya fases con nombres similares (ej: ba-analysis ≠ bpa-analyze).

### Totales Acumulados (Cat 1-6 incluyendo este documento)

| Categorías | Skills nuevos | Coordinators | Total skills |
|------------|---------------|--------------|-------------|
| Cat 1-3 (documento anterior) | 22 | 4 | 26 |
| Cat 4-6 (este documento) | 34 | 6 | 40 |
| **TOTAL acumulado Cat 1-6** | **56 skills nuevos** | **10 coordinators** | **66 skills** |
