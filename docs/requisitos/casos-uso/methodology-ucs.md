```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 3.0.0
updated_at: 2026-06-03 05:05:00
```

# UCs de THYROX — Capa C: Coordinators de metodología

> FSM = capa de orquestación de metodología (11 metodologías × sus pasos = **61 procesos
> funcionales**). **Usuario funcional:** Claude/contexto. **Boundary:** señal de paso ↔ skill
> coordinator. **OOIs:** SessionState (`now.md::methodology_step`/`flow`), WorkPackage,
> Step-Artifact, prev-Step-Artifact (precondición), ROADMAP, Tollgate-result.
>
> **v3.0.0 — UC formal:** cada paso de coordinator es ahora un UC completo
> (precondición/flujo principal con E·X·R·W/alterno/excepción/postcondición/datos/criterios
> de aceptación), anclado en el SKILL real (`.claude/skills/{flow}-{paso}/SKILL.md`). La línea
> **COSMIC** conserva el CFP del baseline. Antes (v2.0.0) era un roster; ahora son 61 UCs
> individuales. `pm-thyrox` excluido (no tiene SKILL.md).
>
> **Corrección de baseline:** el subtotal de capa C baja de 378 → **376 CFP** (RUP = 25, no
> 27 — error aritmético del conteo ÉPICA 44 detectado al profundizar: 6+6+6+7=25). El total de
> THYROX pasa a **675 CFP**. Los CFP por-paso no cambiaron.

---

## UC-MET-BA-01 — ba:strategy (Strategy Analysis)
- **Actor (FU):** Claude/contexto · **Secundarios:** stakeholders del negocio (proveen estado actual), sponsor
- **Trigger:** "avanzar a ba:strategy" — hay un problema/oportunidad de negocio que analizar antes de definir requisitos
- **Precondición:** comprensión del dominio: `{wp}/ba-elicitation.md` con necesidades articuladas, O documentación del negocio (procesos, métricas, restricciones)
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `ba-elicitation.md`/docs de negocio (R) → 4) produce `{wp}/ba-strategy.md` (Current State + SWOT, Business Need cuantificado, Future State, Gap Analysis con métricas, Risk Assessment, recomendación ≥2 opciones) (W) → 5) actualiza now.md::methodology_step=`ba:strategy`, ba_ka=strategy_analysis (W) → 6) emite criterio de completitud: gaps con métricas + recomendación lista (X)
- **Flujo alterno:** BABOK no-secuencial — Routing Table: si falta info del estado actual → `ba:elicitation`; si lo más frecuente, transición a `ba:requirements-analysis` con gaps definidos
- **Flujo de excepción:** sin comprensión del dominio (ni elicitation ni docs) → no se puede analizar estado actual → retornar a `ba:elicitation`. Recomendación con una sola opción → red flag, gate bloqueado (no hubo análisis estratégico)
- **Postcondición:** `ba-strategy.md` con gap analysis cuantitativo y solución recomendada; now.md actualizado
- **Datos (OOIs):** SessionState (R/W), ba-elicitation.md/docs negocio (R), ba-strategy.md (W)
- **Criterios de aceptación:** Given necesidades/docs del dominio, When se ejecuta ba:strategy, Then existe ba-strategy.md con gap analysis con métricas, Business Need con impacto cuantificado y ≥2 opciones evaluadas
- **COSMIC:** 6 CFP

## UC-MET-BA-02 — ba:planning (Business Analysis Planning & Monitoring)
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor/cliente (define prioridades y nivel de formalidad)
- **Trigger:** "avanzar a ba:planning" — inicio de iniciativa de BA, antes de elicitar/analizar/especificar
- **Precondición:** WP activo con descripción inicial del dominio/necesidad; sponsor identificado; alcance inicial de BA acordado (preliminar)
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee descripción inicial del dominio/WP (R) → 4) produce `{wp}/ba-planning.md` (BA Plan: approach planificado/adaptativo + Stakeholder Engagement + RACI + Governance) y crea `ba-progress.md` con estado inicial de 6 KAs (W) → 5) actualiza now.md::methodology_step=`ba:planning`, ba_ka=business_analysis_planning (W) → 6) emite criterio de completitud + acuerdo de formalidad con sponsor (X)
- **Flujo alterno:** Routing Table desde planning — siguiente KA según contexto (dominio poco conocido→elicitation; problema claro→strategy; requisitos sin modelar→requirements-analysis). No hay siguiente fijo
- **Flujo de excepción:** proyecto muy pequeño/alcance conocido → planning formal es overhead → saltar a `ba:elicitation`/`ba:strategy`. `ba-progress.md` no creado → red flag (sin tracking multi-KA)
- **Postcondición:** `ba-planning.md` + `ba-progress.md` con 6 KAs; now.md actualizado
- **Datos (OOIs):** SessionState (R/W), descripción dominio/WP (R), ba-planning.md + ba-progress.md (W)
- **Criterios de aceptación:** Given WP con dominio y sponsor, When se ejecuta ba:planning, Then existe ba-planning.md con approach justificado, governance con sign-off y ba-progress.md inicializado con 6 KAs
- **COSMIC:** 6 CFP

## UC-MET-BA-03 — ba:elicitation (Elicitation & Collaboration)
- **Actor (FU):** Claude/contexto · **Secundarios:** stakeholders (entrevistados, talleres, observación) que confirman resultados
- **Trigger:** "avanzar a ba:elicitation" — se necesita entender el dominio, problemas o necesidades de stakeholders
- **Precondición:** `{wp}/ba-planning.md` con Stakeholder Engagement Approach, técnicas seleccionadas y Governance con proceso de confirmación
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `ba-planning.md` (R) → 4) produce `{wp}/ba-elicitation.md` (resultados por técnica, hallazgos confirmados, necesidades articuladas sin solución, gaps con plan) (W) → 5) actualiza now.md::methodology_step=`ba:elicitation`, ba_ka=elicitation_collaboration (W) → 6) emite criterio: resultados confirmados por stakeholders + gaps con plan (X)
- **Flujo alterno:** Routing Table — si reveló problema estratégico→strategy; si hay info suficiente→requirements-analysis; si insuficiente (gaps)→nueva ronda de `ba:elicitation`
- **Flujo de excepción:** resultados no confirmados por stakeholders → completitud no alcanzada, permanecer en elicitation. Una sola técnica usada → red flag (faltan perspectivas)
- **Postcondición:** `ba-elicitation.md` con resultados confirmados; now.md actualizado
- **Datos (OOIs):** SessionState (R/W), ba-planning.md (R), ba-elicitation.md (W)
- **Criterios de aceptación:** Given ba-planning con engagement y técnicas, When se ejecuta ba:elicitation, Then existe ba-elicitation.md con hallazgos confirmados por los stakeholders relevantes y gaps con plan
- **COSMIC:** 6 CFP

## UC-MET-BA-04 — ba:requirements-analysis (Requirements Analysis & Design Definition)
- **Actor (FU):** Claude/contexto · **Secundarios:** stakeholders clave (validan que los requisitos representan sus necesidades)
- **Trigger:** "avanzar a ba:requirements-analysis" — las necesidades están articuladas y deben convertirse en requisitos especificados
- **Precondición:** necesidades articuladas de al menos una: `{wp}/ba-elicitation.md` (needs confirmados) O `{wp}/ba-strategy.md` (gap analysis + capacidades)
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `ba-elicitation.md`/`ba-strategy.md` (R) → 4) produce `{wp}/ba-requirements-analysis.md` (Use Case Model con flujos, User Stories con INVEST + Given/When/Then, verificación 6 criterios, validación con stakeholders, MoSCoW Must≤60%, opciones de diseño alto nivel) (W) → 5) actualiza now.md::methodology_step=`ba:requirements-analysis`, ba_ka=requirements_analysis_design (W) → 6) emite criterio: requisitos verificados y validados (X)
- **Flujo alterno:** Routing Table — frecuente hacia `ba:requirements-lifecycle` (trazabilidad) o `ba:solution-evaluation` si ya está implementada. Brecha en revisión→nueva iteración de requirements-analysis
- **Flujo de excepción:** necesidades poco claras → ir primero a `ba:elicitation`/`ba:strategy`. Verificación sin validación o Must Have >60% → red flag, completitud no alcanzada
- **Postcondición:** `ba-requirements-analysis.md` con requisitos especificados, verificados y validados; now.md actualizado
- **Datos (OOIs):** SessionState (R/W), ba-elicitation.md/ba-strategy.md (R), ba-requirements-analysis.md (W)
- **Criterios de aceptación:** Given needs articuladas (elicitation o strategy), When se ejecuta ba:requirements-analysis, Then cada requisito tiene ID y criterios de aceptación, UC/User Stories cubren las capacidades del gap analysis y MoSCoW con Must≤60%
- **COSMIC:** 6 CFP

## UC-MET-BA-05 — ba:requirements-lifecycle (Requirements Life Cycle Management)
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor/CCB (decisión de governance sobre CRs), IT (análisis de impacto)
- **Trigger:** "avanzar a ba:requirements-lifecycle" — los requisitos empiezan a aprobarse y necesitan rastreo, o hay CRs sobre requisitos aprobados (KA continua)
- **Precondición:** requisitos documentados con ID único, descripción trazable y origen (stakeholder/necesidad)
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee requisitos documentados (`ba-requirements-analysis.md`) (R) → 4) produce/actualiza `{wp}/ba-requirements-lifecycle.md` (RTM con 10 estados, baseline con versión/aprobador, CRs con análisis de impacto, métricas de cobertura) (W) → 5) actualiza now.md::methodology_step=`ba:requirements-lifecycle`, ba_ka=requirements_lifecycle_management (W) → 6) emite criterio por ciclo: CR procesado + RTM actualizada + stakeholders notificados (X)
- **Flujo alterno:** KA continua — cada ciclo cierra según evento; Routing Table: cambios mayores→requirements-analysis; info para impacto→elicitation; todos los requisitos "Validado"→solution-evaluation; estable→continuar en esta KA
- **Flujo de excepción:** no hay requisitos documentados → ir a elicitation+requirements-analysis. Cambios verbales sin CR formal o RTM solo "en la cabeza del BA" → red flag (sin audit trail)
- **Postcondición:** `ba-requirements-lifecycle.md` con RTM viva y baseline controlado; now.md actualizado (ciclo completado)
- **Datos (OOIs):** SessionState (R/W), ba-requirements-analysis.md (R), ba-requirements-lifecycle.md (W)
- **Criterios de aceptación:** Given requisitos con ID/origen, When se ejecuta un ciclo de ba:requirements-lifecycle, Then la RTM traza cada requisito backward/forward, existe baseline versionado y los CRs activos tienen análisis de impacto
- **COSMIC:** 6 CFP

## UC-MET-BA-06 — ba:solution-evaluation (Solution Evaluation)
- **Actor (FU):** Claude/contexto · **Secundarios:** usuarios finales (encuestas/entrevistas), sponsor (veredicto de inversión)
- **Trigger:** "avanzar a ba:solution-evaluation" — la solución está en uso real; revisión post-implementación (30/60/90 días)
- **Precondición:** solución en producción/uso real; métricas baseline definidas en `ba:strategy`/`ba:planning`; mínimo 2-4 semanas de datos reales
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee baseline de `ba-strategy.md`/`ba-planning.md` + datos reales de uso (R) → 4) produce `{wp}/ba-solution-evaluation.md` (KPI Dashboard baseline/target/actual, Value Realization con veredicto, limitaciones por tipo, lecciones aprendidas por KA, recomendaciones) (W) → 5) actualiza now.md::methodology_step=`ba:solution-evaluation`, ba_ka=solution_evaluation (W) → 6) emite criterio: veredicto claro con evidencia cuantitativa + recomendación de próximos pasos (X)
- **Flujo alterno:** Routing Table — positiva+nueva necesidad→strategy (nueva iniciativa); parcial+gaps→requirements-analysis; negativa→elicitation+strategy; positiva sin necesidades→cierre BABOK
- **Flujo de excepción:** evaluación antes de uso real o sin baseline → solo proyección, no se ejecuta. Limitaciones de datos que impiden evaluar → `ba:elicitation` para obtener más datos
- **Postcondición:** `ba-solution-evaluation.md` con veredicto y recomendación; now.md actualizado
- **Datos (OOIs):** SessionState (R/W), ba-strategy.md/ba-planning.md + datos de uso (R), ba-solution-evaluation.md (W)
- **Criterios de aceptación:** Given solución en uso ≥2-4 semanas y baseline definido, When se ejecuta ba:solution-evaluation, Then el KPI Dashboard compara baseline/target/actual del Business Need y hay veredicto (Sí/Parcial/No) con recomendación clara
- **COSMIC:** 6 CFP

---

## Familia BPA (ciclo Identify → Map → Analyze → Design → Implement → Monitor)

## UC-MET-BPA-01 — bpa:identify (Identify)
- **Actor (FU):** Claude/contexto · **Secundarios:** Process Owners, ejecutores, management (validan inventario y datos)
- **Trigger:** "avanzar a bpa:identify" — inicio de proyecto de mejora de procesos con múltiples candidatos a priorizar
- **Precondición:** contexto del dominio de negocio disponible (área/cadena de valor); al menos una fuente de información sobre procesos (entrevistas, documentación, discovery)
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee contexto del dominio/fuentes de info (R) → 4) produce `{wp}/bpa-identify.md` (Process Inventory con datos, Priority Score, proceso seleccionado con límites trigger/output/scope) (W) → 5) actualiza now.md::methodology_step=`bpa:identify`, flow=bpa (W) → 6) emite tollgate: Inventory con ≥1 proceso con Priority Score ≥ threshold (X)
- **Flujo alterno:** si el proceso ya está identificado y acordado → saltar directo a `bpa:map`
- **Flujo de excepción:** Inventory sin datos reales o un solo stakeholder como fuente → red flag, tollgate no pasa. Proceso elegido por política con score bajo → documentar la razón explícitamente
- **Postcondición:** `bpa-identify.md` con proceso seleccionado y límites; now.md actualizado → listo para bpa:map
- **Datos (OOIs):** SessionState (R/W), contexto dominio/fuentes (R), bpa-identify.md (W)
- **Criterios de aceptación:** Given dominio y fuentes de info, When se ejecuta bpa:identify, Then existe Process Inventory priorizado validado con stakeholders y un proceso seleccionado con Priority Score ≥ threshold y límites definidos
- **COSMIC:** 6 CFP

## UC-MET-BPA-02 — bpa:map (Map)
- **Actor (FU):** Claude/contexto · **Secundarios:** Process Owner + ejecutores (sesión de mapeo y validación del As-Is)
- **Trigger:** "avanzar a bpa:map" — documentar el proceso tal como es hoy (As-Is) antes de cualquier rediseño
- **Precondición:** `bpa:identify` completado — Process Inventory aprobado con proceso seleccionado y límites; Process Owner + ≥2 ejecutores disponibles
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `bpa-identify.md` (proceso + límites) (R) → 4) produce `{wp}/bpa-map.md` (As-Is Process Map con swimlanes, flujo nominal BPMN, variantes/excepciones/workarounds, tiempos tarea/espera/ciclo) (W) → 5) actualiza now.md::methodology_step=`bpa:map`, flow=bpa (W) → 6) emite tollgate: As-Is validado con Process Owner y ≥1 ejecutor (X)
- **Flujo alterno:** si ya existe mapa As-Is reciente (<6 meses) validado → revisar vigencia en vez de re-mapear; proceso nuevo sin As-Is → ir directo a `bpa:design`
- **Flujo de excepción:** scope >40 pasos → dividir en subprocesos. Mapa solo con management (sin ejecutores) o sin tiempos → red flag, tollgate no pasa (mapa ideal, no real; sin base para VA/NVA)
- **Postcondición:** `bpa-map.md` con As-Is validado y datos de tiempo; now.md actualizado → listo para bpa:analyze
- **Datos (OOIs):** SessionState (R/W), bpa-identify.md (R), bpa-map.md (W)
- **Criterios de aceptación:** Given proceso seleccionado con límites, When se ejecuta bpa:map, Then existe As-Is Process Map con swimlanes y tiempos, validado por Process Owner y al menos un ejecutor
- **COSMIC:** 6 CFP

## UC-MET-BPA-03 — bpa:analyze (Analyze)
- **Actor (FU):** Claude/contexto · **Secundarios:** Process Owner (valida clasificación VA/NVA y Gap Analysis)
- **Trigger:** "avanzar a bpa:analyze" — As-Is completo y se necesita identificar qué mejorar y por qué
- **Precondición:** `bpa:map` completado — As-Is Process Map validado con datos de tiempo por actividad (sin tiempos → clasificación cualitativa, documentar limitación)
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `bpa-map.md` (R) → 4) produce `{wp}/bpa-analyze.md` (Activity Value Analysis VA/BVA/NVA, % tiempo VA/NVA, cuellos de botella con 5 Whys, Gap Analysis As-Is/To-Be con causa raíz, priorización impacto/esfuerzo) (W) → 5) actualiza now.md::methodology_step=`bpa:analyze`, flow=bpa (W) → 6) emite tollgate: Activity Value Analysis y Gap Analysis validados con Process Owner (X)
- **Flujo alterno:** si el objetivo era solo documentar (no mejorar) → bpa:map era suficiente, no se ejecuta analyze
- **Flujo de excepción:** sin As-Is validado → análisis especulativo, no se ejecuta. Gap Analysis sin causa raíz o cuello de botella sin 5 Whys → red flag, tollgate no pasa
- **Postcondición:** `bpa-analyze.md` con VA/NVA, gaps con causa raíz y oportunidades priorizadas; now.md actualizado → listo para bpa:design
- **Datos (OOIs):** SessionState (R/W), bpa-map.md (R), bpa-analyze.md (W)
- **Criterios de aceptación:** Given As-Is validado con tiempos, When se ejecuta bpa:analyze, Then cada actividad está clasificada VA/BVA/NVA, los cuellos de botella tienen causa raíz (5 Whys) y existe Gap Analysis As-Is/To-Be priorizado
- **COSMIC:** 6 CFP

## UC-MET-BPA-04 — bpa:design (Design)
- **Actor (FU):** Claude/contexto · **Secundarios:** Process Owner + sponsor (aprueban To-Be), ejecutores/IT/compliance (validan viabilidad)
- **Trigger:** "avanzar a bpa:design" — análisis As-Is aprobado, listo para diseñar el proceso mejorado
- **Precondición:** `bpa:analyze` completado — Activity Value Analysis y Gap Analysis aprobados; oportunidades priorizadas; restricciones técnicas/regulatorias documentadas
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `bpa-analyze.md` (AVA, Gap, restricciones, oportunidades) (R) → 4) produce `{wp}/bpa-design.md` (To-Be Process Map aplicando Eliminate/Simplify/Integrate/Automate, impacto As-Is vs To-Be, Change Rationale por cambio) (W) → 5) actualiza now.md::methodology_step=`bpa:design`, flow=bpa (W) → 6) emite tollgate: To-Be Map aprobado por Process Owner y sponsor (X)
- **Flujo alterno:** mejora menor sin cambio de flujo → documentar en SOP en bpa:implement; cambio 100% tecnológico sin rediseño → implementación técnica directa. To-Be en versiones (v1 quick wins / v2 proyectos mayores)
- **Flujo de excepción:** sin bpa:analyze completo → diseño sobre problema mal definido, no se ejecuta. To-Be que automatiza sin eliminar primero o que no cierra el Gap → red flag, tollgate no pasa
- **Postcondición:** `bpa-design.md` con To-Be aprobado y Change Rationale; now.md actualizado → listo para bpa:implement
- **Datos (OOIs):** SessionState (R/W), bpa-analyze.md (R), bpa-design.md (W)
- **Criterios de aceptación:** Given AVA y Gap Analysis aprobados, When se ejecuta bpa:design, Then existe To-Be Process Map con principios ESIA aplicados que cierra el Gap, con Change Rationale, aprobado por Process Owner y sponsor
- **COSMIC:** 6 CFP

## UC-MET-BPA-05 — bpa:implement (Implement)
- **Actor (FU):** Claude/contexto · **Secundarios:** equipo ejecutor (training y piloto), Process Owner (aprueba Go-Live)
- **Trigger:** "avanzar a bpa:implement" — To-Be aprobado y listo para operacionalizar
- **Precondición:** `bpa:design` completado — To-Be aprobado por Process Owner y sponsor; requisitos de implementación documentados; plan de rollout definido
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `bpa-design.md` (To-Be + Change Rationale) (R) → 4) produce `{wp}/bpa-implement.md` (plan de piloto con criterios Go/No-Go, training, SOP, log de incidentes, resultados, Go-Live) (W) → 5) actualiza now.md::methodology_step=`bpa:implement`, flow=bpa (W) → 6) emite tollgate: piloto con métricas validadas + SOP publicado y adoptado (X)
- **Flujo alterno:** cambio cosmético sin cambio de flujo → actualizar SOP existente directamente; sin piloto si cambio menor de un solo actor con rollback inmediato
- **Flujo de excepción:** sin bpa:design aprobado → genera variantes/confusión, no se ejecuta. Piloto falla criterios Go/No-Go → activar plan de rollback al As-Is. Go-Live sin piloto en proceso complejo o SOP sin revisión del ejecutor → red flag
- **Postcondición:** `bpa-implement.md` con piloto aprobado, SOP publicado y Go-Live; now.md actualizado → listo para bpa:monitor
- **Datos (OOIs):** SessionState (R/W), bpa-design.md (R), bpa-implement.md (W)
- **Criterios de aceptación:** Given To-Be aprobado, When se ejecuta bpa:implement, Then el piloto cumple sus criterios de éxito, el SOP está publicado y adoptado y el Go-Live está completado
- **COSMIC:** 6 CFP

## UC-MET-BPA-06 — bpa:monitor (Monitor)
- **Actor (FU):** Claude/contexto · **Secundarios:** Process Owner + management (revisión de dashboard), sponsor (revisión trimestral)
- **Trigger:** "avanzar a bpa:monitor" — Go-Live ejecutado, el monitoreo comienza el primer día
- **Precondición:** `bpa:implement` completado — To-Be en producción con Go-Live; baseline As-Is de `bpa:analyze`; fuentes de datos identificadas
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `bpa-implement.md` (To-Be en prod) **y el baseline As-Is de `bpa-analyze.md`** (2º artefacto de comparación) (R) → 4) produce `{wp}/bpa-monitor.md` (KPI dashboard baseline/target/current/trend/owner, log de desviaciones con plan, ciclo de mejora continua) (W) → 5) actualiza now.md::methodology_step=`bpa:monitor`, flow=bpa (W) → 6) emite tollgate: dashboard activo con ≥4 semanas de datos reales + desviaciones con plan de acción (X)
- **Flujo alterno:** KA continua — puntos de decisión: desviación tendencial→nuevo ciclo `bpa:analyze`; nuevas oportunidades score ≥4.0→`bpa:identify`; 12 meses sin revisión→ciclo BPA completo
- **Flujo de excepción:** antes del Go-Live (sin datos de producción) o sin fuentes de datos → no se ejecuta. Dashboard sin actualización, KPIs sin owner o desviaciones sin plan → red flag
- **Postcondición:** `bpa-monitor.md` con dashboard vivo y desviaciones gestionadas; now.md actualizado (ciclo activo)
- **Datos (OOIs):** SessionState (R/W), bpa-implement.md (R) + bpa-analyze.md baseline As-Is (R), bpa-monitor.md (W)
- **Criterios de aceptación:** Given To-Be en producción y baseline As-Is, When se ejecuta bpa:monitor, Then el dashboard compara KPIs contra baseline y target con ≥4 semanas de datos y las desviaciones tienen plan de acción
- **COSMIC:** 7 CFP

---

## Familia Consulting (McKinsey-style: Initiation → Diagnosis → Structure → Recommend → Plan → Implement → Evaluate)

## UC-MET-CP-01 — cp:initiation (Initiation)
- **Actor (FU):** Claude/contexto · **Secundarios:** client sponsor (firma el Problem Definition Document), stakeholders (mapeo)
- **Trigger:** "avanzar a cp:initiation" — inicio de engagement; un challenge de negocio requiere análisis estructurado
- **Precondición:** contacto con cliente establecido; ≥1 conversación con el sponsor antes de completar; sponsor nombrado que puede aprobar el PDD
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee contexto del engagement/conversación con cliente (R) → 4) produce `{wp}/cp-initiation.md` (Problem Definition Document: diagnostic question, stakeholder power/interest map, scope in/out, success criteria medibles, engagement structure, 2-3 hipótesis iniciales) (W) → 5) actualiza now.md::methodology_step=`cp:initiation`, flow=cp (W) → 6) emite gate: PDD firmado por el client sponsor (X)
- **Flujo alterno:** si problem statement ya acordado y existe workplan → ir a `cp:structure`; re-entrada mid-stream → leer PDD existente primero
- **Flujo de excepción:** sin sponsor sign-off → riesgo de resolver el problema equivocado, gate no pasa. Diagnostic question que menciona una solución, scope no escrito o success criteria solo cualitativos → red flag
- **Postcondición:** `cp-initiation.md` con PDD firmado; now.md actualizado → listo para cp:diagnosis
- **Datos (OOIs):** SessionState (R/W), contexto del engagement (R), cp-initiation.md (W)
- **Criterios de aceptación:** Given contacto con cliente y sponsor nombrado, When se ejecuta cp:initiation, Then existe Problem Definition Document con diagnostic question testeable, scope in/out, success criteria medibles e hipótesis iniciales, firmado por el sponsor
- **COSMIC:** 6 CFP

## UC-MET-CP-02 — cp:diagnosis (Diagnosis)
- **Actor (FU):** Claude/contexto · **Secundarios:** engagement lead (aprueba Issue Tree), stakeholders (≥3 entrevistas)
- **Trigger:** "avanzar a cp:diagnosis" — problema framed, hay que descomponerlo en componentes analizables
- **Precondición:** `cp:initiation` completo — PDD firmado por el sponsor; diagnostic question documentada; ≥3 stakeholder interviews completadas
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `cp-initiation.md` (diagnostic question + hipótesis) (R) → 4) produce `{wp}/cp-diagnosis.md` (Issue Tree MECE top-down/bottom-up, data gathering plan por leaf node, client interview plan, MECE audit) (W) → 5) actualiza now.md::methodology_step=`cp:diagnosis`, flow=cp (W) → 6) emite gate: Issue Tree revisado y aprobado por el engagement lead (X)
- **Flujo alterno:** si el problema es simple y la causa ya se conoce → ir a `cp:structure` con esa hipótesis; re-entrada para revisar árbol → leer Issue Tree existente primero
- **Flujo de excepción:** sin PDD firmado → no se ejecuta. Branch "Other", branches que se solapan o MECE audit omitido → red flag, gate no pasa (rompe ME/CE)
- **Postcondición:** `cp-diagnosis.md` con Issue Tree MECE aprobado y data gathering plan; now.md actualizado → listo para cp:structure
- **Datos (OOIs):** SessionState (R/W), cp-initiation.md (R), cp-diagnosis.md (W)
- **Criterios de aceptación:** Given PDD firmado y ≥3 entrevistas, When se ejecuta cp:diagnosis, Then existe Issue Tree que pasa el MECE audit en cada nivel con leaf nodes answerable y data gathering plan, aprobado por el engagement lead
- **COSMIC:** 6 CFP

## UC-MET-CP-03 — cp:structure (Structure)
- **Actor (FU):** Claude/contexto · **Secundarios:** engagement lead (aprueba Workplan), cliente (alineación en kickoff)
- **Trigger:** "avanzar a cp:structure" — Issue Tree aprobado, convertir leaf nodes en hipótesis y análisis
- **Precondición:** `cp:diagnosis` completo — Issue Tree MECE aprobado por engagement lead; data gathering plan asignado (owners/deadlines); datos iniciales de leaf nodes prioritarios empezando a llegar
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `cp-diagnosis.md` (Issue Tree + leaf nodes) (R) → 4) produce `{wp}/cp-structure.md` (Consulting Workplan: hipótesis falsables con kill condition, priorización P1/P2/P3, análisis diseñado por hipótesis, workstreams MECE con owner, milestone plan, structural integrity check) (W) → 5) actualiza now.md::methodology_step=`cp:structure`, flow=cp (W) → 6) emite gate: Workplan aprobado por engagement lead y compartido con cliente (X)
- **Flujo alterno:** engagement muy pequeño (<2 sem, 1 consultor) → workplan simplificado sin estructura de workstreams; siguiente paso real es `cp:recommend` cuando los análisis estén completos
- **Flujo de excepción:** sin Issue Tree aprobado → planificación sin estructura, no se ejecuta. Hipótesis no falsables, análisis diseñado después de los datos o workstreams por persona (no por tema) → red flag, gate no pasa
- **Postcondición:** `cp-structure.md` con Workplan aprobado; now.md actualizado → análisis en ejecución → listo para cp:recommend
- **Datos (OOIs):** SessionState (R/W), cp-diagnosis.md (R), cp-structure.md (W)
- **Criterios de aceptación:** Given Issue Tree aprobado, When se ejecuta cp:structure, Then cada leaf node tiene una hipótesis falsable con análisis diseñado, owner y deadline, los workstreams son MECE y el Workplan está aprobado y compartido con el cliente
- **COSMIC:** 6 CFP

## UC-MET-CP-04 — cp:recommend (Recommend)
- **Actor (FU):** Claude/contexto · **Secundarios:** engagement lead (revisa el storyline antes de finalizar para el cliente)
- **Trigger:** "avanzar a cp:recommend" — análisis completos, sintetizar findings en una recomendación ejecutiva
- **Precondición:** `cp:structure` completo — Workplan aprobado, análisis P1/P2 ejecutados; findings de ≥80% de los análisis disponibles; ≥1 hipótesis confirmada como driver primario
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `cp-structure.md` (workplan + findings de análisis) (R) → 4) produce `{wp}/cp-recommend.md` (recommendation deck: SCQA, Pyramid Principle con answer-first + 3-5 argumentos MECE con vertical/horizontal logic, executive summary slide standalone, impacto cuantificado, riesgos) (W) → 5) actualiza now.md::methodology_step=`cp:recommend`, flow=cp (W) → 6) emite gate: storyline revisado por el engagement lead (X)
- **Flujo alterno:** comunicación operacional (working sessions) → formatos más simples; si el cliente ya decidió → verificar si el engagement es advisory o decisional
- **Flujo de excepción:** sin análisis completos → recomendación débil, no se ejecuta. Answer enterrado al final, argumentos que se repiten o sin impacto cuantificado ($/%) → red flag, gate no pasa
- **Postcondición:** `cp-recommend.md` con deck aprobado por engagement lead; now.md actualizado → listo para cp:plan
- **Datos (OOIs):** SessionState (R/W), cp-structure.md (R), cp-recommend.md (W)
- **Criterios de aceptación:** Given análisis completos con ≥1 hipótesis confirmada, When se ejecuta cp:recommend, Then el deck establece la answer en la primera slide con 3-5 argumentos MECE soportados por evidencia e impacto cuantificado, revisado por el engagement lead
- **COSMIC:** 6 CFP

## UC-MET-CP-05 — cp:plan (Plan)
- **Actor (FU):** Claude/contexto · **Secundarios:** client sponsor (aprueba el Implementation Plan), workstream owners client-side
- **Trigger:** "avanzar a cp:plan" — el cliente aprobó la recomendación, traducirla a roadmap de ejecución
- **Precondición:** `cp:recommend` completo — recommendation deck presentado y aprobado por el sponsor; decisión formal de proceder; recomendación primaria inequívoca
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `cp-recommend.md` (argumentos de la recomendación) (R) → 4) produce `{wp}/cp-plan.md` (Implementation Plan: workstreams MECE mapeados a argumentos, quick wins ≤90 días, roadmap en 3 fases, resource/investment plan con ROI, change management ADKAR, risk register, governance) (W) → 5) actualiza now.md::methodology_step=`cp:plan`, flow=cp (W) → 6) emite gate: Implementation Plan aprobado por el sponsor (X)
- **Flujo alterno:** si la implementación será gestionada 100% por el cliente sin soporte → entregar el plan y transicionar a rol de monitoreo (el engagement puede terminar en cp:plan)
- **Flujo de excepción:** sin aprobación del sponsor de la recomendación → planificar antes de aprobar desperdicia recursos, no se ejecuta. Sin quick wins en 90 días, workstreams no owned client-side o change management como una sola slide → red flag, gate no pasa
- **Postcondición:** `cp-plan.md` con Implementation Plan aprobado; now.md actualizado → listo para cp:implement
- **Datos (OOIs):** SessionState (R/W), cp-recommend.md (R), cp-plan.md (W)
- **Criterios de aceptación:** Given recomendación aprobada por el sponsor, When se ejecuta cp:plan, Then existe Implementation Plan con workstreams MECE owned client-side, quick wins ≤90 días, resource plan con ROI y change management formal, aprobado por el sponsor
- **COSMIC:** 6 CFP

## UC-MET-CP-06 — cp:implement (Implement)
- **Actor (FU):** Claude/contexto · **Secundarios:** workstream owners (ejecutan), sponsor/steering committee (decisiones y blockers)
- **Trigger:** "avanzar a cp:implement" — engagement con soporte de implementación; el cliente necesita program management estructurado
- **Precondición:** `cp:plan` completo — Implementation Plan aprobado por sponsor; workstream owners nombrados y comprometidos; budget/recursos asignados; governance cadence agendada
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `cp-plan.md` (workstreams + governance) (R) → 4) produce `{wp}/cp-implement.md` (implementation tracker: kickoff, ritmo semanal con RAG, steering committee deck + decision log, blocker log con escalation, adoption tracking, course corrections) (W) → 5) actualiza now.md::methodology_step=`cp:implement`, flow=cp (W) → 6) emite gate: workstream owners confirman ejecución completa O termina el contrato del engagement (X)
- **Flujo alterno:** engagement advisory only → termina en cp:plan; PMO interno fuerte del cliente → transicionar y solo monitorear; implementación <4 semanas → task tracker simplificado
- **Flujo de excepción:** sin steering committee en los primeros 30 días o blockers envejeciendo >2 semanas sin escalar → red flag (governance no real). Course correction necesaria (milestone P1 >30 días, <50% del beneficio en mid-point) → proceso formal con steering committee
- **Postcondición:** `cp-implement.md` con ejecución completada o contrato finalizado; now.md actualizado → listo para cp:evaluate
- **Datos (OOIs):** SessionState (R/W), cp-plan.md (R), cp-implement.md (W)
- **Criterios de aceptación:** Given Implementation Plan aprobado con owners y budget, When se ejecuta cp:implement, Then existe tracker con RAG semanal, steering committee facilitado, blocker log con escalation y adoption tracking, hasta que los workstreams se completan o termina el contrato
- **COSMIC:** 6 CFP

## UC-MET-CP-07 — cp:evaluate (Evaluate)
- **Actor (FU):** Claude/contexto · **Secundarios:** client sponsor (revisa impact assessment, cierre formal), Finance (datos de impacto)
- **Trigger:** "avanzar a cp:evaluate" — implementación completa o checkpoint de evaluación acordado; el cliente quiere validar el beneficio proyectado
- **Precondición:** `cp:implement` completo — workstreams en completion planeada o contrato finalizado; tiempo suficiente transcurrido (3-6 meses operacional, 12 meses financiero); baseline de `cp:structure`/`cp:plan` disponible
- **Flujo principal:** 1) recibe señal (E) → 2) lee now.md (R) → 3) lee `cp-implement.md` (outcomes de workstreams) **y el baseline de `cp:structure`/`cp:plan`** (2º artefacto de comparación) (R) → 4) produce `{wp}/cp-evaluate.md` (impact measurement realized vs projected con attribution, workstream-level evaluation, sustainability assessment, lessons learned por fase, closure checklist, client feedback) (W) → 5) actualiza now.md::methodology_step=`cp:evaluate`, flow=cp (W) → 6) emite gate: impact assessment revisado con el sponsor y engagement cerrado formalmente (X)
- **Flujo alterno:** si existen residual opportunities → el cliente puede iniciar un nuevo engagement en `cp:initiation` (ciclo CP cerrado)
- **Flujo de excepción:** medir demasiado pronto (sin tiempo para efecto) o sin baseline → resultados engañosos, no se ejecuta. Atribuir toda la mejora al engagement o saltar sustainability assessment → red flag, gate no pasa
- **Postcondición:** `cp-evaluate.md` con impact assessment y engagement cerrado; now.md actualizado → CP cycle CLOSED
- **Datos (OOIs):** SessionState (R/W), cp-implement.md (R) + baseline cp-structure/cp-plan (R), cp-evaluate.md (W)
- **Criterios de aceptación:** Given implementación completa, tiempo suficiente y baseline disponible, When se ejecuta cp:evaluate, Then existe impact assessment realized vs projected con attribution conservadora, sustainability assessment y lessons learned, revisado con el sponsor y con cierre formal del engagement
- **COSMIC:** 7 CFP

## UC-MET-DMAIC-01 — dmaic:define (Define)
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor (aprueba charter)
- **Trigger:** inicio de un proyecto Six Sigma — work package activo con descripción del problema y sponsor identificado
- **Precondición:** WP activo con problema inicial y sponsor; VOC recopilado con al menos una técnica de elicitación directa antes de completar Define
- **Flujo principal:** 1) recibe señal de iniciar DMAIC (E) → 2) lee `now.md` (R) → 3) lee descripción del problema del WP (R) → 4) produce `{wp}/dmaic-define.md` (Project Charter: VOC→CTQs, VOB, Problem Statement sin causas, SIPOC, Goal Statement, Business Case, Scope, RACI) (W) → 5) actualiza `now.md::methodology_step = dmaic:define`, `flow = dmaic` (W) → 6) emite tollgate "Project Charter aprobado por sponsor" (X)
- **Flujo alterno:** si durante Measure/Analyze el scope cambia significativamente, regresar a revisar el charter (define iterado)
- **Flujo de excepción:** sin sponsor real o CTQs sin VOC → charter no aprobable; el step permanece en define hasta corregir Problem Statement/VOC
- **Postcondición:** `dmaic-define.md` con charter aprobado por sponsor; listo para dmaic:measure
- **Datos (OOIs):** SessionState (R/W), problem description del WP (R), dmaic-define.md (W)
- **Criterios de aceptación:** Given WP con problema y sponsor, When se ejecuta Define, Then existe Project Charter con CTQs derivados de VOC, SIPOC, Goal Statement y aprobación del sponsor
- **COSMIC:** 6 CFP

## UC-MET-DMAIC-02 — dmaic:measure (Measure)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Measure tras charter aprobado
- **Precondición:** `{wp}/dmaic-define.md` con charter aprobado, CTQs con métricas/especificaciones, SIPOC
- **Flujo principal:** 1) recibe señal de avanzar (E) → 2) lee `now.md` (R) → 3) lee `dmaic-define.md` (charter, CTQs, SIPOC) (R) → 4) produce `{wp}/dmaic-measure.md` (Process Map/VSM, plan de medición, tipo de dato, MSA Gauge R&R/Kappa, baseline DPU/DPMO/Sigma o Cp/Cpk) (W) → 5) actualiza `now.md::methodology_step = dmaic:measure` (W) → 6) emite tollgate "Baseline con Sigma Level calculado y MSA realizado" (X)
- **Flujo alterno:** datos históricos sin MSA → documentar fuente y limitaciones (MSA retrospectivo) antes de avanzar
- **Flujo de excepción:** MSA falla (%GR&R≥30% o Kappa<0.7) → datos no confiables; corregir sistema de medición antes de continuar a Analyze
- **Postcondición:** `dmaic-measure.md` con baseline cuantitativo y MSA aceptado; listo para dmaic:analyze
- **Datos (OOIs):** SessionState (R/W), dmaic-define.md (R), dmaic-measure.md (W)
- **Criterios de aceptación:** Given charter aprobado con CTQs, When se ejecuta Measure, Then existe baseline (Sigma Level/Cpk) con MSA validado y datos estratificados
- **COSMIC:** 6 CFP

## UC-MET-DMAIC-03 — dmaic:analyze (Analyze)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Analyze tras baseline establecido y MSA validado
- **Precondición:** `{wp}/dmaic-measure.md` con baseline (DPMO/Sigma o Cp/Cpk), MSA aceptado, datos estratificados por subgrupos
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `dmaic-measure.md` (baseline, datos estratificados) (R) → 4) produce `{wp}/dmaic-analyze.md` (VSM waste, Ishikawa 6M, Pareto, 5 Whys, validación estadística H0/H1 con p<0.05, criterios de causalidad, causas priorizadas) (W) → 5) actualiza `now.md::methodology_step = dmaic:analyze` (W) → 6) emite tollgate "Causas raíz validadas con datos" (X)
- **Flujo alterno:** solo correlación sin mecanismo causal → documentar "causa candidata" y diseñar experimento de confirmación en Improve
- **Flujo de excepción:** datos sin suficiente estratificación o causa decidida sin análisis real (teatro) → no se valida; permanece en analyze
- **Postcondición:** `dmaic-analyze.md` con causas raíz confirmadas estadísticamente y priorizadas; listo para dmaic:improve
- **Datos (OOIs):** SessionState (R/W), dmaic-measure.md (R), dmaic-analyze.md (W)
- **Criterios de aceptación:** Given baseline con MSA, When se ejecuta Analyze, Then cada causa raíz tiene H0/H1 declarada y validación con p-value<0.05, priorizada por impacto/esfuerzo
- **COSMIC:** 6 CFP

## UC-MET-DMAIC-04 — dmaic:improve (Improve)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Improve tras causas raíz validadas
- **Precondición:** `{wp}/dmaic-analyze.md` con causas raíz confirmadas, lista priorizada por impacto/esfuerzo, mecanismo causal documentado
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `dmaic-analyze.md` (causas priorizadas) (R) → 4) produce `{wp}/dmaic-improve.md` (alternativas, herramientas Lean, cuadrante Impacto×Esfuerzo, FMEA/RPN, criterio piloto vs full, diseño y ejecución del piloto, validación estadística vs baseline, nuevo Sigma Level) (W) → 5) actualiza `now.md::methodology_step = dmaic:improve` (W) → 6) emite tollgate "Mejora validada con datos post-implementación vs baseline de Measure" (X)
- **Flujo alterno:** RPN>100 → implementar en piloto primero (limitar blast radius); RPN>200 → acción preventiva obligatoria antes del piloto
- **Flujo de excepción:** mejora sin p<0.05 o comparada contra objetivo del charter en vez de baseline → tollgate falla; permanece en improve
- **Postcondición:** `dmaic-improve.md` con mejora validada estadísticamente y nuevo Sigma Level documentado; listo para dmaic:control
- **Datos (OOIs):** SessionState (R/W), dmaic-analyze.md (R), dmaic-improve.md (W)
- **Criterios de aceptación:** Given causas raíz validadas, When se ejecuta Improve, Then existe solución implementada en piloto con validación estadística (p<0.05) vs baseline de Measure
- **COSMIC:** 6 CFP

## UC-MET-DMAIC-05 — dmaic:control (Control) · paso de cierre
- **Actor (FU):** Claude/contexto · **Secundarios:** dueño del proceso (acepta transferencia)
- **Trigger:** avanzar a Control tras mejora validada estadísticamente
- **Precondición:** `{wp}/dmaic-improve.md` con mejora validada (nuevo Sigma Level), piloto completado con datos post-implementación, solución estable; dueño del proceso identificado
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `dmaic-improve.md` (mejora validada) (R) → 4) produce `{wp}/dmaic-control.md` (Control Plan con responsable nombrado, SPC con UCL/LCL desde datos de Improve, 8 reglas Western Electric, Plan de Reacción, gestión visual, SOPs actualizados, training, lecciones aprendidas, cierre formal con resultados vs business case) (W) → 5) actualiza `now.md::methodology_step = dmaic:control` (W) → 6) emite tollgate "Control Plan activo y proceso transferido al dueño" + escribe baseline/SOP estandarizado (X)
- **Flujo alterno:** proceso inestable (causas especiales activas) → estabilizar antes de Control; cierre no se ejecuta por inferencia (I-011)
- **Flujo de excepción:** Control Plan sin responsable, sin límites de control o sin aceptación formal del dueño → transferencia no real; permanece en control
- **Postcondición:** `dmaic-control.md` con Control Plan activo, proceso transferido, proyecto DMAIC cerrado; siguiente: THYROX Stage 11 TRACK/EVALUATE
- **Datos (OOIs):** SessionState (R/W), dmaic-improve.md (R), dmaic-control.md (W)
- **Criterios de aceptación:** Given mejora validada, When se ejecuta Control, Then existe Control Plan con responsable, SPC con UCL/LCL, Plan de Reacción y sign-off formal del dueño del proceso
- **COSMIC:** 7 CFP

---

## Familia Lean (5 UCs)

## UC-MET-LEAN-01 — lean:define (Define)
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor (aprueba Lean Charter)
- **Trigger:** inicio de un proyecto Lean de eliminación de waste — WP activo con problema de desperdicio observable y sponsor
- **Precondición:** WP activo con problema relacionado a waste observable (no variación estadística); VOC recopilado con al menos una técnica de elicitación directa antes de completar Define
- **Flujo principal:** 1) recibe señal de iniciar Lean (E) → 2) lee `now.md` (R) → 3) lee descripción del problema del WP (R) → 4) produce `{wp}/lean-define.md` (Lean Project Charter: VOC→definición de valor, TIMWOOD con 2-3 wastes dominantes, Problem Statement orientado a waste, Goal Statement, SIPOC con marcado VA/NVA, Business Case, RACI) (W) → 5) actualiza `now.md::methodology_step = lean:define`, `flow = lean` (W) → 6) emite tollgate "Lean Project Charter aprobado por sponsor" (X)
- **Flujo alterno:** si el problema resulta ser variación estadística (CTQs de Cp/Cpk) → cambiar a DMAIC en Define
- **Flujo de excepción:** Problem Statement que menciona herramienta (5S/Kanban) o TIMWOOD sin priorizar → charter no aprobable; permanece en define
- **Postcondición:** `lean-define.md` con Lean Charter aprobado y wastes dominantes priorizados; listo para lean:measure
- **Datos (OOIs):** SessionState (R/W), problem description del WP (R), lean-define.md (W)
- **Criterios de aceptación:** Given WP con waste observable y sponsor, When se ejecuta Define, Then existe Lean Charter con definición de valor (VOC), 2-3 wastes TIMWOOD dominantes y aprobación del sponsor
- **COSMIC:** 6 CFP

## UC-MET-LEAN-02 — lean:measure (Measure)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Measure tras Lean Charter aprobado
- **Precondición:** `{wp}/lean-define.md` con Lean Charter aprobado; scope del flujo de valor delimitado (inicio/fin); acceso al proceso real para Gemba
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `lean-define.md` (charter, scope, TIMWOOD) (R) → 4) produce `{wp}/lean-measure.md` + `{wp}/lean-vsm-as-is.md` (Gemba walk derecha→izquierda, métricas de flujo CT/LT/Takt/PE/WIP, VSM As-Is con timeline VA/NVA, checklist TIMWOOD sobre el mapa, baseline As-Is) (W) → 5) actualiza `now.md::methodology_step = lean:measure` (W) → 6) emite tollgate "VSM As-Is aprobado con métricas de flujo documentadas" (X)
- **Flujo alterno:** proceso de conocimiento (software/servicios) con items poco visibles → usar tickets/issues como proxy de items y tiempos
- **Flujo de excepción:** VSM construido desde reuniones sin Gemba, o sin timeline VA/NVA (PE no calculable) → mapa inútil; permanece en measure
- **Postcondición:** `lean-measure.md`/`lean-vsm-as-is.md` con VSM As-Is y métricas de flujo (Lead Time, PE, WIP, Takt); listo para lean:analyze
- **Datos (OOIs):** SessionState (R/W), lean-define.md (R), lean-measure.md / lean-vsm-as-is.md (W)
- **Criterios de aceptación:** Given Lean Charter aprobado, When se ejecuta Measure, Then existe VSM As-Is con Lead Time, Process Efficiency, WIP y Takt Time medidos vía Gemba
- **COSMIC:** 6 CFP

## UC-MET-LEAN-03 — lean:analyze (Analyze)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Analyze tras VSM As-Is aprobado
- **Precondición:** `{wp}/lean-measure.md` con VSM As-Is aprobado, baseline (Lead Time, PE, WIP, Takt), wastes TIMWOOD localizados en el proceso
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `lean-measure.md`/VSM As-Is (R) → 4) produce `{wp}/lean-analyze.md` (TIMWOOD Diagnostic Checklist, matriz de priorización Impacto/Esfuerzo, 5 Whys aplicado a waste priorizado, Fishbone 6M, validación de causas raíz con evidencia) (W) → 5) actualiza `now.md::methodology_step = lean:analyze` (W) → 6) emite tollgate "Causas raíz de los 2-3 wastes dominantes validadas y priorizadas" (X)
- **Flujo alterno:** si el waste dominante difiere del identificado en Define → actualizar el Charter antes de continuar
- **Flujo de excepción:** 5 Whys que termina en "la gente no hace su trabajo" o causa = una persona (no sistémica), o causas sin validación → no avanza; permanece en analyze
- **Postcondición:** `lean-analyze.md` con causas raíz sistémicas validadas de los 2-3 wastes dominantes; listo para lean:improve
- **Datos (OOIs):** SessionState (R/W), lean-measure.md (R), lean-analyze.md (W)
- **Criterios de aceptación:** Given VSM As-Is aprobado, When se ejecuta Analyze, Then cada waste dominante tiene causa raíz sistémica validada (5 Whys/Fishbone) y priorizada
- **COSMIC:** 6 CFP

## UC-MET-LEAN-04 — lean:improve (Improve)
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor (aprueba VSM To-Be), Process Owner
- **Trigger:** avanzar a Improve tras causas raíz validadas
- **Precondición:** `{wp}/lean-analyze.md` aprobado con causas raíz de 2-3 wastes dominantes validadas; priorización con impacto/esfuerzo; sponsor y Process Owner disponibles
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `lean-analyze.md` (causas raíz priorizadas) (R) → 4) produce `{wp}/lean-improve.md` + `kaizen-event-charter.md` + `5s-audit-checklist.md` (VSM To-Be diseñado al Takt Time, Kaizen events 2-5 días, selección de herramienta Lean por waste 5S/Kanban/SMED/Jidoka, Standard Work, comparación As-Is vs To-Be) (W) → 5) actualiza `now.md::methodology_step = lean:improve` (W) → 6) emite tollgate "VSM To-Be aprobado por sponsor e implementación completada" (X)
- **Flujo alterno:** si las causas raíz apuntan a variación estadística → implementar soluciones DMAIC (SPC/MSA) en vez de herramientas Lean
- **Flujo de excepción:** Kaizen sin charter, VSM To-Be diseñado en sala sin Gemba, o resultados no medidos vs As-Is → no se valida; permanece en improve
- **Postcondición:** `lean-improve.md` con VSM To-Be aprobado, Kaizen events ejecutados y Standard Work documentado; listo para lean:control
- **Datos (OOIs):** SessionState (R/W), lean-analyze.md (R), lean-improve.md / kaizen-event-charter.md / 5s-audit-checklist.md (W)
- **Criterios de aceptación:** Given causas raíz validadas, When se ejecuta Improve, Then existe VSM To-Be aprobado, mejoras implementadas vía Kaizen y Standard Work documentado con métricas post-evento
- **COSMIC:** 6 CFP

## UC-MET-LEAN-05 — lean:control (Control) · paso de cierre
- **Actor (FU):** Claude/contexto · **Secundarios:** Process Owner (mantiene disciplina)
- **Trigger:** avanzar a Control tras VSM To-Be implementado
- **Precondición:** `{wp}/lean-improve.md` aprobado (VSM To-Be implementado, Kaizen ejecutados, Standard Work documentado); métricas post-mejora con ≥1 semana de datos; Standard Work publicado
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `lean-improve.md` (VSM To-Be, Standard Work) (R) → 4) produce `{wp}/lean-control.md` (verificación resultados vs baseline As-Is, controles visuales, auditorías 5S con frecuencia y escala de madurez, adherencia a Standard Work, log de desviaciones con 5 Whys de regresión, A3 de sostenibilidad, Yokoten) (W) → 5) actualiza `now.md::methodology_step = lean:control` (W) → 6) emite tollgate "Plan de sostenibilidad activo con métricas en objetivo ≥4 semanas" + Yokoten/Standard Work como base estandarizada (X)
- **Flujo alterno:** métricas sin mejora o regresión sostenida → regresar a lean:analyze (la causa raíz pudo no ser la correcta)
- **Flujo de excepción:** sin Standard Work documentado o sin Process Owner comprometido → no hay referencia que sostener; permanece en control
- **Postcondición:** `lean-control.md` con plan de sostenibilidad activo y métricas en objetivo 4 semanas; siguiente: cerrar WP y documentar en THYROX Stage 12 STANDARDIZE
- **Datos (OOIs):** SessionState (R/W), lean-improve.md (R), lean-control.md (W)
- **Criterios de aceptación:** Given VSM To-Be implementado, When se ejecuta Control, Then existen auditorías 5S, controles visuales y A3 con métricas sostenidas en objetivo durante ≥4 semanas
- **COSMIC:** 6 CFP

---

## Familia PDCA (4 UCs) — ciclo iterativo

## UC-MET-PDCA-01 — pdca:plan (Plan)
- **Actor (FU):** Claude/contexto
- **Trigger:** iniciar ciclo PDCA nuevo (primer ciclo) o ciclo ajustado tras pdca:act
- **Precondición:** primer ciclo: WP activo con descripción inicial del problema. Ciclos subsiguientes: `{wp}/pdca-act.md` del ciclo anterior con lecciones y la hipótesis ajustada
- **Flujo principal:** 1) recibe señal de iniciar/reiniciar ciclo (E) → 2) lee `now.md` (R) → 3) lee descripción del problema (primer ciclo) o `pdca-act.md` previo (R) → 4) produce `{wp}/pdca-plan.md` (IS/IS NOT, baseline numérico, objetivo SMART, una hipótesis Si/entonces/porque, plan de acción) (W) → 5) actualiza `now.md::methodology_step = pdca:plan`, `flow = pdca` (W) → 6) emite tollgate "Plan aprobado con baseline + objetivo SMART + hipótesis" (X)
- **Flujo alterno:** ciclo cíclico — si el ciclo anterior no alcanzó el objetivo, el nuevo Plan incorpora la lección de pdca:act (no copiar el objetivo sin ajustar)
- **Flujo de excepción:** objetivo sin número/sin baseline o múltiples hipótesis en un Plan → Check no podría verificar; permanece en plan hasta corregir
- **Postcondición:** `pdca-plan.md` con baseline, objetivo SMART y una hipótesis verificable; listo para pdca:do
- **Datos (OOIs):** SessionState (R/W), problem description o pdca-act.md previo (R), pdca-plan.md (W)
- **Criterios de aceptación:** Given problema definido o lección del ciclo previo, When se ejecuta Plan, Then existe baseline numérico, objetivo SMART y una sola hipótesis formulada
- **COSMIC:** 6 CFP

## UC-MET-PDCA-02 — pdca:do (Do)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Do tras Plan completo
- **Precondición:** `{wp}/pdca-plan.md` con baseline numérico, objetivo SMART, hipótesis formulada y plan de acción con responsables/fechas
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `pdca-plan.md` (baseline, hipótesis, plan) (R) → 4) produce `{wp}/pdca-do.md` (diseño del piloto con scope/duración/rollback/criterio de parada, baseline del piloto, registro de implementación con una variable a la vez, datos con las mismas métricas del Plan, desviaciones y observaciones) (W) → 5) actualiza `now.md::methodology_step = pdca:do` (W) → 6) emite tollgate "Piloto terminado y datos recopilados" (X)
- **Flujo alterno:** proceso operacional no-técnico → el Do puede incluir Gemba Walk para observar la implementación directa
- **Flujo de excepción:** degradación >X% o error crítico imprevisto → activar criterio de parada y revertir (rollback); cambios múltiples simultáneos invalidan aislamiento
- **Postcondición:** `pdca-do.md` con piloto ejecutado a escala controlada y datos comparables al baseline; listo para pdca:check
- **Datos (OOIs):** SessionState (R/W), pdca-plan.md (R), pdca-do.md (W)
- **Criterios de aceptación:** Given Plan con baseline, When se ejecuta Do, Then el piloto cambió una sola variable y recopiló las mismas métricas que el baseline con rollback definido
- **COSMIC:** 6 CFP

## UC-MET-PDCA-03 — pdca:check (Check)
- **Actor (FU):** Claude/contexto
- **Trigger:** avanzar a Check tras piloto completo
- **Precondición:** `{wp}/pdca-do.md` con baseline del piloto, datos recopilados (mismas métricas que el baseline del Plan), registro de desviaciones
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `pdca-do.md` (datos del piloto) (R) → 4) produce `{wp}/pdca-check.md` (comparativa vs objetivo SMART, verificación de tamaño mínimo de muestra, magnitud de mejora, significancia vía Run Chart/regla de 8 corridas o T-test, análisis de causas, conclusión directa hipótesis confirmada/refutada/mixta) (W) → 5) actualiza `now.md::methodology_step = pdca:check` (W) → 6) emite tollgate "Análisis de resultados con conclusión directa" (X)
- **Flujo alterno:** ciclo cíclico — la conclusión (confirmada/parcial/refutada) determina la rama de pdca:act (estandarizar vs nuevo Plan)
- **Flujo de excepción:** datos insuficientes (muestra/duración) o condiciones del piloto distintas al baseline → no comparable; documentar y reiniciar Do
- **Postcondición:** `pdca-check.md` con veredicto basado en datos y análisis de causas; listo para pdca:act
- **Datos (OOIs):** SessionState (R/W), pdca-do.md (R), pdca-check.md (W)
- **Criterios de aceptación:** Given datos del piloto, When se ejecuta Check, Then existe comparativa contra baseline+objetivo SMART con significancia evaluada y conclusión directa con número
- **COSMIC:** 6 CFP

## UC-MET-PDCA-04 — pdca:act (Act) · paso de cierre / reinicio de ciclo
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor/dueño del proceso, equipo operativo
- **Trigger:** avanzar a Act tras veredicto claro de Check
- **Precondición:** `{wp}/pdca-check.md` con veredicto claro (éxito/parcial/falla) respaldado por datos, análisis de causas y recomendación
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `pdca-check.md` (veredicto, causas) (R) → 4) produce `{wp}/pdca-act.md` — rama ESTANDARIZAR: actualizar SOPs, poka-yoke, Yokoten, escalar al ámbito completo, comunicar, nuevo baseline; rama NUEVO CICLO: analizar qué ajustar, documentar aprendizaje; lecciones aprendidas siempre (W) → 5) actualiza `now.md::methodology_step = pdca:act` (W) → 6) emite tollgate "Decisión tomada, documentada y comunicada" + escribe nuevo baseline/SOP estandarizado (X)
- **Flujo alterno:** ciclo cíclico — si requiere ajuste, act→nuevo pdca:plan con hipótesis ajustada y lecciones incorporadas; si exitoso+estandarizado, cerrar WP o nuevo objetivo
- **Flujo de excepción:** ajustar el objetivo para que "parezca éxito" o cerrar con "parcial" sin definir qué sigue → prohibido; concluir con acción clara. WP no se cierra por inferencia (I-011)
- **Postcondición:** `pdca-act.md` con decisión documentada y comunicada; nuevo baseline establecido (estandarizar) o ciclo reiniciado (ajustar)
- **Datos (OOIs):** SessionState (R/W), pdca-check.md (R), pdca-act.md (W)
- **Criterios de aceptación:** Given veredicto de Check, When se ejecuta Act, Then existe decisión estandarizar/nuevo-ciclo documentada con SOP+poka-yoke (si estandariza) o lección+plan ajustado (si nuevo ciclo) y comunicación a stakeholders
- **COSMIC:** 7 CFP

---

## Familia RUP (4 UCs) — iterativa con milestones LCO/LCA/IOC/PD

## UC-MET-RUP-01 — rup:inception (Inception)
- **Actor (FU):** Claude/contexto · **Secundarios:** sponsor (aprueba business case), stakeholders clave (validan Vision)
- **Trigger:** inicio de proyecto RUP nuevo, o nueva iteración de Inception si el LCO anterior no se alcanzó
- **Precondición:** WP activo con descripción inicial del sistema; sponsor con autoridad para aprobar el business case. Iteración subsiguiente: lección del LCO anterior
- **Flujo principal:** 1) recibe señal de iniciar RUP (E) → 2) lee `now.md` (R) → 3) lee descripción del sistema del WP (R) → 4) produce `{wp}/rup-inception.md` (Vision Document sin implementación, Use Case Model ~10% UC críticos nombrados, Risk List risk-driven, Business Case cuantificado, plan inicial rough ±50% con milestones LCA/IOC/PD) (W) → 5) actualiza `now.md::methodology_step = rup:inception`, `flow = rup`, `rup_phase = inception`, `rup_iteration = N` (W) → 6) emite milestone "LCO (Lifecycle Objectives)" verificando los 5 criterios (X)
- **Flujo alterno:** iterativo — LCO no alcanzado (stakeholders no alineados, business case rechazado, riesgo crítico cancelante) → nueva iteración de rup:inception con lecciones (límite: Inception ≤10% del esfuerzo total)
- **Flujo de excepción:** Vision Document que describe la arquitectura (BDUF) o Risk List vacía → criterios LCO no cumplidos; permanece en inception
- **Postcondición:** `rup-inception.md` con LCO alcanzado (Vision aprobada, business case validado, riesgos con plan); listo para rup:elaboration
- **Datos (OOIs):** SessionState (R/W), system description del WP (R), rup-inception.md (W)
- **Criterios de aceptación:** Given WP con sistema y sponsor, When se ejecuta Inception, Then Vision aprobada por stakeholders, business case aprobado, Risk List con planes y ≥10% del UC Model nombrado (LCO)
- **COSMIC:** 6 CFP

## UC-MET-RUP-02 — rup:elaboration (Elaboration)
- **Actor (FU):** Claude/contexto · **Secundarios:** arquitecto/Tech Lead, sponsor (sign-off Quality Attributes)
- **Trigger:** avanzar a Elaboration tras LCO alcanzado, o nueva iteración si el LCA anterior no se alcanzó
- **Precondición:** `{wp}/rup-inception.md` con LCO alcanzado, Use Case Model al 10%, Risk List con top riesgos y planes
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `rup-inception.md` (Vision, UC 10%, Risk List) (R) → 4) produce `{wp}/rup-elaboration.md` (SAD con decisiones justificadas, Architecture Prototype ejecutable que prueba escenarios de mayor riesgo, Use Case Model al 80% con happy/alternate/exception, Risk List actualizada, plan de Construction ±20%) (W) → 5) actualiza `now.md::methodology_step = rup:elaboration`, `rup_phase = elaboration`, `rup_iteration = N` (W) → 6) emite milestone "LCA (Lifecycle Architecture)" verificando los 5 criterios (X)
- **Flujo alterno:** iterativo — LCA no alcanzado (prototype falla bajo carga crítica, riesgos técnicos abiertos, plan de Construction rechazado) → nueva iteración de rup:elaboration con lecciones
- **Flujo de excepción:** LCA declarado sin Architecture Prototype ejecutable, o SAD sobrediseñado (Architecture Astronaut), o UC al 100% prematuro → criterios LCA no cumplidos; permanece en elaboration
- **Postcondición:** `rup-elaboration.md` con LCA alcanzado (arquitectura estable, 80% UC especificado, riesgos top-5 mitigados); listo para rup:construction
- **Datos (OOIs):** SessionState (R/W), rup-inception.md (R), rup-elaboration.md (W)
- **Criterios de aceptación:** Given LCO alcanzado, When se ejecuta Elaboration, Then Architecture Prototype ejecutable estable, SAD completo, ≥80% UC especificado y riesgos técnicos top-5 mitigados (LCA)
- **COSMIC:** 6 CFP

## UC-MET-RUP-03 — rup:construction (Construction)
- **Actor (FU):** Claude/contexto · **Secundarios:** QA Lead, Product Owner, usuarios beta (representantes)
- **Trigger:** avanzar a Construction tras LCA alcanzado; repetir por cada iteración hasta IOC
- **Precondición:** `{wp}/rup-elaboration.md` con LCA alcanzado, plan de Construction con iteraciones, Risk List con top-5 mitigados
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `rup-elaboration.md` (plan de Construction, UC, SAD) (R) → 4) produce `{wp}/rup-construction.md` (plan por iteración, implementación incremental de UC por prioridad Must/Should/Could, Definition of Done, gestión de deuda técnica documentada, testing por iteración, retrospectiva, especificación del 20% UC restante) (W) → 5) actualiza `now.md::methodology_step = rup:construction`, `rup_phase = construction`, `rup_iteration = N` (W) → 6) emite milestone "IOC (Initial Operational Capability)" verificando los 5 criterios (X)
- **Flujo alterno:** iterativo — IOC no alcanzado (funcionalidad insuficiente para beta, Severity 1 pendientes, performance no cumple NFR en staging) → nueva iteración de rup:construction
- **Flujo de excepción:** Construction sin iteraciones (waterfall disfrazado), deuda sin documentar, o tests acumulados al final → IOC no aprobable; permanece en construction
- **Postcondición:** `rup-construction.md` con IOC alcanzado (funcionalidad beta, Severity 1=0, deuda acotada, performance en staging); listo para rup:transition
- **Datos (OOIs):** SessionState (R/W), rup-elaboration.md (R), rup-construction.md (W)
- **Criterios de aceptación:** Given LCA alcanzado, When se ejecuta Construction, Then existe funcionalidad beta evaluable, Severity 1=0, deuda técnica documentada/acotada y performance cumpliendo NFR en staging (IOC)
- **COSMIC:** 6 CFP

## UC-MET-RUP-04 — rup:transition (Transition) · paso de cierre
- **Actor (FU):** Claude/contexto · **Secundarios:** usuarios finales (UAT + sign-off), equipo de operaciones, sponsor
- **Trigger:** avanzar a Transition tras IOC alcanzado; repetir por cada ciclo de corrección post-beta hasta PD
- **Precondición:** `{wp}/rup-construction.md` con IOC alcanzado (funcionalidad beta, Severity 1=0), deuda documentada y acotada, performance cumpliendo NFR en staging
- **Flujo principal:** 1) recibe señal (E) → 2) lee `now.md` (R) → 3) lee `rup-construction.md` (IOC, funcionalidad beta) (R) → 4) produce `{wp}/rup-transition.md` (Deployment/Rollback/Communication Plan, beta release + UAT con usuarios reales, defect log con severidad y priorización intra-severidad, training y transferencia, lecciones aprendidas del RUP completo, cierre formal con Product Acceptance Sign-off) (W) → 5) actualiza `now.md::methodology_step = rup:transition`, `rup_phase = transition`, `rup_iteration = N` (W) → 6) emite milestone "PD (Product Release)" verificando los 5 criterios + archivado de artefactos estandarizados (X)
- **Flujo alterno:** iterativo — PD no alcanzado (Severity 1/2 significativos post-beta, nueva beta requerida, sign-off rechazado) → nueva iteración de rup:transition con lecciones
- **Flujo de excepción:** UAT sin usuarios reales, PD sin Product Acceptance Sign-off formal, o training pospuesto → PD no aprobable; permanece en transition. WP no se cierra por inferencia (I-011)
- **Postcondición:** `rup-transition.md` con PD alcanzado (sistema en producción, Severity 1=0, sign-off formal, training completo, documentación entregada); siguiente: THYROX Stage 11/12 TRACK·STANDARDIZE
- **Datos (OOIs):** SessionState (R/W), rup-construction.md (R), rup-transition.md (W)
- **Criterios de aceptación:** Given IOC alcanzado, When se ejecuta Transition, Then sistema desplegado en producción con Severity 1=0, Product Acceptance Sign-off formal, training completo y documentación entregada (PD)
- **COSMIC:** 7 CFP

## UC-MET-PM-01 — pm:initiating (Initiating)
- **Actor (FU):** Claude/contexto · **Secundarios:** Sponsor (firma del Charter)
- **Trigger:** Inicio de proyecto PMBOK nuevo o re-initiating de fase / cambio significativo de sponsor o alcance.
- **Precondición:** WP activo con descripción inicial del proyecto; sponsor identificado con autoridad para firmar; business need / problem statement definido (aunque preliminar).
- **Flujo principal:** 1) recibe señal "avanzar a initiating" (E) → 2) lee now.md (R) → 3) lee descripción del proyecto + business need (R) → 4) desarrolla Project Charter (purpose, objetivos SMART, high-level requirements/description/risks, milestone schedule, summary budget) + Stakeholder Register con Power/Interest Grid en `{wp}/pm-initiating.md` (W) → 5) actualiza now.md::methodology_step=pm:initiating, pm_process_group=initiating (W) → 6) emite tollgate "Charter firmado + Stakeholder Register" (X).
- **Flujo alterno:** Re-initiating de nueva fase de proyecto multi-fase: reusa Charter previo como baseline y genera Charter de fase.
- **Flujo de excepción:** Sponsor no disponible para firmar / business need no claro / conflicto de objetivos entre stakeholders clave → permanecer en pm:initiating (no avanzar a planning).
- **Postcondición:** Project Charter firmado por el sponsor; Stakeholder Register con stakeholders de Poder Alto identificados; PM asignado.
- **Datos (OOIs):** SessionState (R/W), descripción del proyecto/business need (R), pm-initiating.md (Charter + Stakeholder Register) (W).
- **Criterios de aceptación:** Given WP con business need y sponsor con autoridad, When se ejecuta pm:initiating, Then existe pm-initiating.md con Charter firmado, objetivos con criterio de éxito verificable y al menos un riesgo por categoría principal.
- **COSMIC:** 6 CFP

## UC-MET-PM-02 — pm:planning (Planning)
- **Actor (FU):** Claude/contexto · **Secundarios:** Sponsor (aprueba el Project Management Plan)
- **Trigger:** Charter firmado y equipo listo para planificar / nueva fase / cambio aprobado que requiere re-planificación.
- **Precondición:** `{wp}/pm-initiating.md` con Project Charter firmado, Stakeholder Register inicial completo y PM asignado con autoridad delegada.
- **Flujo principal:** 1) recibe señal "avanzar a planning" (E) → 2) lee now.md (R) → 3) lee pm-initiating.md (Charter, stakeholders) (R) → 4) desarrolla Project Management Plan con WBS+Dictionary, schedule baseline + Critical Path (CPM/PERT), cost baseline, risk register (top 10), RACI (1 A por actividad), communications plan en `{wp}/pm-planning.md` (W) → 5) actualiza now.md::methodology_step=pm:planning, pm_process_group=planning (W) → 6) emite tollgate "Project Management Plan aprobado por sponsor" (X).
- **Flujo alterno:** Plan no aprobado → más iteración de pm:planning con gaps documentados (schedule/cost excede Charter sin acuerdo, stakeholders de Poder Alto no alineados).
- **Flujo de excepción:** Aspectos del negocio aún no claros → regresar a pm:initiating; riesgos críticos cancelables identificados → investigar antes de continuar.
- **Postcondición:** WBS completo, Critical Path identificado, Cost Baseline dentro de budget, Risk Register con planes de respuesta, RACI completo, plan aprobado por sponsor.
- **Datos (OOIs):** SessionState (R/W), pm-initiating.md (R), pm-planning.md (W).
- **Criterios de aceptación:** Given Charter firmado, When se ejecuta pm:planning, Then existe pm-planning.md con WBS multinivel, Critical Path identificado y RACI con exactamente 1 Accountable por actividad.
- **COSMIC:** 6 CFP

## UC-MET-PM-03 — pm:executing (Executing)
- **Actor (FU):** Claude/contexto · **Secundarios:** Equipo del proyecto, stakeholders
- **Trigger:** Project Management Plan aprobado y equipo listo para trabajar / cambio aprobado que requiere ejecución.
- **Precondición:** `{wp}/pm-planning.md` con Project Management Plan aprobado (scope/schedule/cost baselines), RACI definido y plan de calidad con estándares.
- **Flujo principal:** 1) recibe señal "avanzar a executing" (E) → 2) lee now.md (R) → 3) lee pm-planning.md (baselines, RACI, quality plan) (R) → 4) dirige el trabajo (Direct and Manage), conduce Quality Assurance, gestiona equipo y stakeholder engagement, mantiene Issue Log y genera Change Requests en `{wp}/pm-executing.md` (status report) (W) → 5) actualiza now.md::methodology_step=pm:executing, pm_process_group=executing (W) → 6) emite tollgate "deliverables producidos + Issue Log/QA actualizados" (X).
- **Flujo alterno:** Monitoring & Controlling corre en paralelo continuo → now.md::methodology_step=pm:executing+monitoring.
- **Flujo de excepción:** Sin plan aprobado o alcance no definido → no ejecutar; issue que materializa un riesgo → trasladar del Risk Register al Issue Log y activar plan de respuesta.
- **Postcondición:** Deliverables del WBS en progreso/completados, Issue Log mantenido, QA ejecutada, sin issues críticos abiertos al cierre.
- **Datos (OOIs):** SessionState (R/W), pm-planning.md (R), pm-executing.md (deliverables, Issue Log, status report) (W).
- **Criterios de aceptación:** Given plan aprobado, When se ejecuta pm:executing, Then existe pm-executing.md con status report (RAG), Issue Log y resultados de Quality Assurance.
- **COSMIC:** 6 CFP

## UC-MET-PM-04 — pm:monitoring (Monitoring & Controlling)
- **Actor (FU):** Claude/contexto · **Secundarios:** CCB (decisión de change requests), Sponsor (escalación)
- **Trigger:** Periodo de reporte (semanal/quincenal/mensual) durante la ejecución / varianza significativa detectada respecto a baselines.
- **Precondición:** `{wp}/pm-planning.md` con baselines aprobadas (scope/schedule/cost) y EAC inicial calculado; datos de trabajo completado disponibles.
- **Flujo principal:** 1) recibe señal "avanzar a monitoring" (E) → 2) lee now.md (R) → 3) lee pm-planning.md (baselines, EAC) + datos de desempeño (R) → 4) calcula EVM (SV/CV/SPI/CPI/EAC/TCPI), controla schedule/QC/riesgos, gestiona Integrated Change Control y define acciones correctivas/preventivas en `{wp}/pm-monitoring.md` (performance report) (W) → 5) actualiza now.md::methodology_step=pm:monitoring, pm_process_group=monitoring_controlling (W) → 6) emite tollgate "Work Performance Report + acciones correctivas/CR" (X).
- **Flujo alterno:** Proceso continuo sin completitud propia; corre en paralelo con Executing (pm:executing+monitoring).
- **Flujo de excepción:** SPI/CPI < 0.85 → acción correctiva inmediata + Change Request + escalación al sponsor, continuar Monitoring; sin baselines o sin datos reales → no calcular EVM.
- **Postcondición:** Métricas EVM calculadas, varianzas evaluadas contra umbrales, CRs procesados por CCB; al verificar todos los deliverables → activar pm:closing.
- **Datos (OOIs):** SessionState (R/W), pm-planning.md (R), pm-monitoring.md (EVM, CRs, acciones) (W).
- **Criterios de aceptación:** Given baselines aprobadas y datos reales, When se ejecuta pm:monitoring, Then existe pm-monitoring.md con SV/CV/SPI/CPI/EAC calculados y acción correctiva definida para toda varianza con SPI/CPI < 0.85.
- **COSMIC:** 6 CFP

## UC-MET-PM-05 — pm:closing (Closing)
- **Actor (FU):** Claude/contexto · **Secundarios:** Sponsor/cliente (Final Acceptance sign-off), proveedores (cierre de contratos)
- **Trigger:** Todos los deliverables completados y verificados / cierre de fase (phase gate) / terminación prematura del proyecto.
- **Precondición:** `{wp}/pm-executing.md` o `{wp}/pm-monitoring.md` con todos los deliverables verificados contra scope baseline, defectos críticos resueltos o aceptados, performance dentro de umbrales EVM.
- **Flujo principal:** 1) recibe señal "avanzar a closing" (E) → 2) lee now.md (R) → 3) lee pm-executing.md/pm-monitoring.md (deliverables verificados, EVM final) (R) → 4) obtiene Final Acceptance, documenta lecciones aprendidas por Knowledge Area, archiva artefactos, libera equipo, cierra contratos y produce Final Project Report en `{wp}/pm-closing.md` (W) → 5) actualiza now.md::methodology_step=pm:closing, pm_process_group=closing (W) → 6) emite tollgate "Final Acceptance firmado + Lessons Learned + Project Archives" (X).
- **Flujo alterno:** Cierre de fase (proyecto multi-fase) → Final Acceptance de la fase + autorización de la siguiente fase → nuevo pm:initiating.
- **Flujo de excepción:** Deliverables pendientes o contratos abiertos → no cerrar; sponsor no disponible para aceptación → solo cierre administrativo, no del proyecto.
- **Postcondición:** Final Acceptance Document firmado, lecciones por KA documentadas, artefactos archivados, equipo liberado, contratos cerrados, Final Project Report entregado.
- **Datos (OOIs):** SessionState (R/W), pm-executing.md/pm-monitoring.md (R), pm-closing.md (Final Acceptance, Lessons Learned) (W).
- **Criterios de aceptación:** Given deliverables verificados, When se ejecuta pm:closing, Then existe pm-closing.md con Final Acceptance firmado por el sponsor y lecciones aprendidas documentadas por Knowledge Area.
- **COSMIC:** 6 CFP

---

## Familia PPS Toyota (pps:*) — 6 UCs

## UC-MET-PPS-01 — pps:clarify (Clarify + Break Down)
- **Actor (FU):** Claude/contexto · **Secundarios:** Dueño del proceso, personas del Gemba
- **Trigger:** Inicio de un proyecto de resolución estructurada de problemas con TBP / problema recurrente que necesita análisis profundo.
- **Precondición:** WP activo con descripción inicial del problema; sponsor o dueño del proceso identificado; acceso al Gemba (físico o equivalente digital).
- **Flujo principal:** 1) recibe señal "avanzar a clarify" (E) → 2) lee now.md (R) → 3) lee descripción inicial del problema (R) → 4) ejecuta Go-and-See, define estado ideal vs actual con brecha cuantificada, redacta Problem Statement con datos, descompone en sub-problemas y prioriza en `{wp}/pps-clarify.md` (Hoja de Clarificación) (W) → 5) actualiza now.md::methodology_step=pps:clarify, flow=pps (W) → 6) emite tollgate "problema clarificado con brecha cuantificada + sub-problema priorizado" (X).
- **Flujo alterno:** La priorización puede re-evaluarse si pps:analyze descubre nueva información (regreso permitido a re-priorizar).
- **Flujo de excepción:** Sin acceso al Gemba ni datos reales → instrumentar el proceso primero; Problem Statement que asume causa o solución → reescribir antes de avanzar.
- **Postcondición:** Hoja de Clarificación con estado ideal vs actual, brecha medible, impacto, descomposición y sub-problema priorizado.
- **Datos (OOIs):** SessionState (R/W), descripción del problema (R), pps-clarify.md (W).
- **Criterios de aceptación:** Given WP con problema y acceso al Gemba, When se ejecuta pps:clarify, Then existe pps-clarify.md con brecha cuantificada y un Problem Statement con magnitud y período (sin asumir causa).
- **COSMIC:** 6 CFP

## UC-MET-PPS-02 — pps:target (Set a Target)
- **Actor (FU):** Claude/contexto · **Secundarios:** Dueño del proceso (aprueba la Target Sheet)
- **Trigger:** Clarificación completa con sub-problema priorizado; momento de acordar qué significa "éxito" antes del análisis.
- **Precondición:** pps:clarify completado: `{wp}/pps-clarify.md` con sub-problema priorizado y brecha cuantificada; datos históricos o capacidad para establecer baseline.
- **Flujo principal:** 1) recibe señal "avanzar a target" (E) → 2) lee now.md (R) → 3) lee pps-clarify.md (brecha, sub-problema priorizado) (R) → 4) establece baseline cuantificado, define meta SMART, verifica alcanzabilidad con benchmarks y define método de confirmación de efecto en `{wp}/pps-target.md` (Target Sheet) (W) → 5) actualiza now.md::methodology_step=pps:target, flow=pps (W) → 6) emite tollgate "Target Sheet con baseline + meta SMART + deadline aprobada" (X).
- **Flujo alterno:** El target puede ajustarse con justificación si pps:analyze revela una causa raíz de mayor complejidad que la anticipada.
- **Flujo de excepción:** Sin baseline (no hay datos históricos) → instrumentar y pausar la fijación del target; target predefinido por contrato → documentar y verificar alcanzabilidad.
- **Postcondición:** Target Sheet con baseline, meta SMART, métricas secundarias, método y período de confirmación, deadline.
- **Datos (OOIs):** SessionState (R/W), pps-clarify.md (R), pps-target.md (W).
- **Criterios de aceptación:** Given sub-problema priorizado, When se ejecuta pps:target, Then existe pps-target.md con baseline real medido y meta SMART con métrica, número, unidad y fecha.
- **COSMIC:** 6 CFP

## UC-MET-PPS-03 — pps:analyze (Analyze Root Cause)
- **Actor (FU):** Claude/contexto · **Secundarios:** Equipo con conocimiento del proceso
- **Trigger:** Target Sheet aprobada; necesidad de confirmar causa raíz antes de proponer contramedidas.
- **Precondición:** pps:target completado: `{wp}/pps-target.md` con baseline y meta SMART; datos del Gemba disponibles.
- **Flujo principal:** 1) recibe señal "avanzar a analyze" (E) → 2) lee now.md (R) → 3) lee pps-target.md + datos del Gemba (R) → 4) ejecuta Fishbone (6M/4P) + 5 Whys, confirma causa raíz con datos y documenta la cadena causal en `{wp}/pps-analyze.md`; inicia A3 Report (secciones 1-4) en `{wp}/a3-report.md` (W) → 5) actualiza now.md::methodology_step=pps:analyze, flow=pps (W) → 6) emite tollgate "causa raíz confirmada con datos + A3 secciones 1-4" (X).
- **Flujo alterno:** Los 5 Whys pueden bifurcarse en múltiples cadenas causales → documentar todas las ramas relevantes.
- **Flujo de excepción:** Sin acceso a datos para confirmar → retornar a pps:clarify a instrumentar; causa raíz fuera del alcance del proyecto → documentar y escalar antes de continuar.
- **Postcondición:** Root Cause Analysis Worksheet con Fishbone, 5 Whys y causa raíz confirmada con datos; A3 con secciones 1-4 completadas.
- **Datos (OOIs):** SessionState (R/W), pps-target.md (R), pps-analyze.md (W), a3-report.md (secciones 1-4) (W).
- **Criterios de aceptación:** Given Target Sheet aprobada y datos del Gemba, When se ejecuta pps:analyze, Then existe pps-analyze.md con causa raíz sistémica confirmada con evidencia y a3-report.md con secciones 1-4.
- **COSMIC:** 7 CFP

## UC-MET-PPS-04 — pps:countermeasures (Develop Countermeasures)
- **Actor (FU):** Claude/contexto · **Secundarios:** Equipo con autoridad para proponer/validar contramedidas
- **Trigger:** Causa raíz confirmada; necesidad de generar contramedidas trazables a cada causa.
- **Precondición:** pps:analyze completado: causa raíz confirmada con datos; `{wp}/a3-report.md` con secciones 1-4 completadas.
- **Flujo principal:** 1) recibe señal "avanzar a countermeasures" (E) → 2) lee now.md (R) → 3) lee pps-analyze.md + a3-report.md (causa raíz) (R) → 4) genera contramedidas por causa raíz, las evalúa con matriz factibilidad/impacto, prioriza y crea Action Plan (responsable + deadline + métrica) en `{wp}/pps-countermeasures.md`; completa A3 sección 5 en `{wp}/a3-report.md` (W) → 5) actualiza now.md::methodology_step=pps:countermeasures, flow=pps (W) → 6) emite tollgate "Action Plan aprobado con responsable/deadline + A3 sección 5" (X).
- **Flujo alterno:** Contramedida trivialmente obvia y ya acordada → documentarla directamente en el Action Plan y avanzar.
- **Flujo de excepción:** Sin causa raíz confirmada → no desarrollar contramedidas (desperdicio); recursos limitados → documentar qué causas raíz quedan sin atender (deuda de proceso).
- **Postcondición:** Matriz de contramedidas evaluada + Action Plan con un responsable por contramedida, deadline específico y métrica de verificación; A3 sección 5 completada.
- **Datos (OOIs):** SessionState (R/W), pps-analyze.md (R), a3-report.md (R/W), pps-countermeasures.md (W).
- **Criterios de aceptación:** Given causa raíz confirmada, When se ejecuta pps:countermeasures, Then existe pps-countermeasures.md con Action Plan donde cada contramedida traza a una causa raíz y tiene un responsable único.
- **COSMIC:** 7 CFP

## UC-MET-PPS-05 — pps:implement (See Countermeasures Through)
- **Actor (FU):** Claude/contexto · **Secundarios:** Responsables de contramedidas, afectados (comunicación del cambio)
- **Trigger:** Action Plan aprobado y momento de ejecutar.
- **Precondición:** pps:countermeasures completado: Action Plan aprobado; `{wp}/a3-report.md` con secciones 1-5; equipo con autoridad y mecanismo de medición listo.
- **Flujo principal:** 1) recibe señal "avanzar a implement" (E) → 2) lee now.md (R) → 3) lee pps-countermeasures.md (Action Plan) + a3-report.md (R) → 4) ejecuta contramedidas por secuencia de dependencias, observa efecto en el Gemba, mantiene Implementation Log y recopila datos preliminares en `{wp}/pps-implement.md`; actualiza A3 sección 6 preliminar en `{wp}/a3-report.md` (W) → 5) actualiza now.md::methodology_step=pps:implement, flow=pps (W) → 6) emite tollgate "todas las contramedidas ejecutadas (o bloqueadas con justificación) + A3 sección 6 con datos preliminares" (X).
- **Flujo alterno:** Contramedida ejecutada completa con efecto menor al esperado → regresar a pps:analyze (posible causa raíz adicional); bloqueador externo → escalar y ajustar timeline en el Action Plan.
- **Flujo de excepción:** Causa raíz cambió durante la planificación → regresar a pps:analyze primero; contramedida no ejecutable como diseñada → regresar a pps:countermeasures a rediseñarla (no simplificar sin análisis).
- **Postcondición:** Implementation Log con estado de cada contramedida, observaciones y ajustes; A3 sección 6 con tendencia preliminar.
- **Datos (OOIs):** SessionState (R/W), pps-countermeasures.md (R), a3-report.md (R/W), pps-implement.md (W).
- **Criterios de aceptación:** Given Action Plan aprobado, When se ejecuta pps:implement, Then existe pps-implement.md con Implementation Log completo y a3-report.md con sección 6 y datos de tendencia preliminar.
- **COSMIC:** 7 CFP

## UC-MET-PPS-06 — pps:evaluate (Monitor Results + Standardize)
- **Actor (FU):** Claude/contexto · **Secundarios:** Dueño del proceso, equipos con problemas similares (Yokoten)
- **Trigger:** Transcurrido el período de medición post-implementación definido en pps:target.
- **Precondición:** pps:implement completado: contramedidas ejecutadas, Implementation Log actualizado; `{wp}/a3-report.md` con secciones 1-6; período de medición transcurrido.
- **Flujo principal:** 1) recibe señal "avanzar a evaluate" (E) → 2) lee now.md (R) → 3) lee pps-implement.md + pps-target.md (baseline/target) + a3-report.md (R) → 4) confirma efecto vs baseline y target, analiza sostenibilidad y efectos secundarios, estandariza contramedidas exitosas y comparte aprendizajes en `{wp}/pps-evaluate.md`; cierra A3 (secciones 6-7) en `{wp}/a3-report.md` (W) → 5) actualiza now.md::methodology_step=pps:evaluate, flow=pps (W) → 6) emite tollgate "efecto confirmado + contramedidas estandarizadas + A3 cerrado" (X).
- **Flujo alterno (state-machine):** Mejora parcial (50-80%) → documentar y iniciar nuevo ciclo PS8 desde pps:clarify para la brecha residual; sin mejora → regresar a pps:analyze con nueva información; regresión → regreso urgente a pps:analyze.
- **Flujo de excepción:** Período de medición no transcurrido → no declarar éxito (datos insuficientes); contramedidas no implementadas completamente → completar pps:implement primero.
- **Postcondición:** Reporte de confirmación de efecto con análisis de sostenibilidad y plan de estandarización; A3 Report completo y cerrado (7 secciones).
- **Datos (OOIs):** SessionState (R/W), pps-implement.md (R), pps-target.md (R), a3-report.md (R/W), pps-evaluate.md (W).
- **Criterios de aceptación:** Given período de medición transcurrido, When se ejecuta pps:evaluate, Then existe pps-evaluate.md con resultado real vs target y a3-report.md cerrado con las 7 secciones; si target no alcanzado, el flujo retorna a pps:analyze o pps:clarify según la magnitud de la brecha.
- **COSMIC:** 7 CFP

---

## Familia RM (rm:*) — 5 UCs (state-machine con retornos condicionales)

## UC-MET-RM-01 — rm:elicitation (Elicitation)
- **Actor (FU):** Claude/contexto · **Secundarios:** Stakeholders (entrevistas, workshops, confirmación)
- **Trigger:** Inicio del ciclo RM / gaps identificados en rm:analysis (`on_gaps_found`) / nuevas necesidades por cambio de scope.
- **Precondición:** WP activo con contexto inicial del problema/sistema; stakeholders identificados (lista inicial). Para re-elicitaciones: `{wp}/rm-analysis.md` con gaps específicos a cubrir.
- **Flujo principal:** 1) recibe señal "avanzar a elicitation" (E) → 2) lee now.md (R) → 3) lee contexto del WP (y gaps de rm-analysis.md si re-elicitación) (R) → 4) planifica la elicitación, selecciona técnicas, conduce sesiones y confirma resultados (member checking) en `{wp}/rm-elicitation.md` (W) → 5) actualiza now.md::methodology_step=rm:elicitation, flow=rm (W) → 6) emite tollgate "hallazgos confirmados con stakeholders" (X).
- **Flujo alterno (state-machine):** Re-elicitación enfocada disparada por `on_gaps_found` desde rm:analysis — cubre solo la lista específica de gaps, no repite toda la elicitación.
- **Flujo de excepción:** Sin stakeholders disponibles → programar sesiones primero; requisitos no confirmados → no avanzar a análisis (los hallazgos serían interpretación del analista).
- **Postcondición:** Reporte de elicitación con requisitos candidatos confirmados, conflictos identificados y gaps pendientes documentados.
- **Datos (OOIs):** SessionState (R/W), contexto del WP / rm-analysis.md (gaps) (R), rm-elicitation.md (W).
- **Criterios de aceptación:** Given WP con stakeholders identificados, When se ejecuta rm:elicitation, Then existe rm-elicitation.md con requisitos candidatos confirmados con stakeholders mediante al menos una técnica directa y una de validación.
- **COSMIC:** 6 CFP

## UC-MET-RM-02 — rm:analysis (Analysis)
- **Actor (FU):** Claude/contexto · **Secundarios:** Stakeholders (resolución de conflictos), Sponsor (escalación de conflictos de negocio)
- **Trigger:** Elicitación completa y confirmada; necesidad de evaluar calidad y priorizar antes de especificar.
- **Precondición:** `{wp}/rm-elicitation.md` con lista de requisitos candidatos confirmados, conflictos identificados y gaps documentados.
- **Flujo principal:** 1) recibe señal "avanzar a analysis" (E) → 2) lee now.md (R) → 3) lee rm-elicitation.md (requisitos candidatos, conflictos) (R) → 4) aplica checklist IEEE 830, resuelve conflictos, prioriza con MoSCoW (y Kano opcional) y toma decisión de flujo en `{wp}/rm-analysis.md` (W) → 5) actualiza now.md::methodology_step=rm:analysis, flow=rm (W) → 6) emite tollgate "calidad verificada + priorización + decisión de flujo" (X).
- **Flujo alterno (state-machine):** `on_gaps_found` (gaps en áreas no cubiertas, stakeholders clave ausentes, Must Have sin owner, >30% fallan verifiability) → retornar a rm:elicitation con lista específica de gaps.
- **Flujo de excepción:** Sin elicitación completa/confirmada → no analizar (se analizarían supuestos); si todo es Must Have → la priorización falló, repetir con criterios estrictos.
- **Postcondición:** Artefacto de análisis con calidad IEEE 830 ≥80%, conflictos resueltos o escalados, MoSCoW completo y decisión `on_success` / `on_gaps_found`.
- **Datos (OOIs):** SessionState (R/W), rm-elicitation.md (R), rm-analysis.md (W).
- **Criterios de aceptación:** Given elicitación confirmada, When se ejecuta rm:analysis, Then existe rm-analysis.md con ≥80% de requisitos pasando IEEE 830, Must Have con stakeholder owner y la decisión de avanzar a rm:specification o retornar a rm:elicitation documentada.
- **COSMIC:** 6 CFP

## UC-MET-RM-03 — rm:specification (Specification)
- **Actor (FU):** Claude/contexto · **Secundarios:** Sponsor/PO/cliente (sign-off del baseline)
- **Trigger:** Análisis completo con requisitos priorizados y calidad verificada; momento de formalizar y establecer baseline.
- **Precondición:** `{wp}/rm-analysis.md` con requisitos priorizados MoSCoW, IEEE 830 ≥80%, conflictos resueltos/escalados y stakeholder owner por cada Must Have.
- **Flujo principal:** 1) recibe señal "avanzar a specification" (E) → 2) lee now.md (R) → 3) lee rm-analysis.md (requisitos priorizados) (R) → 4) elige formato (SRS/BRD/User Stories), escribe requisitos funcionales con acceptance criteria, NFR cuantitativos, trazabilidad inicial y establece baseline v1.0 con sign-off en `{wp}/rm-specification.md` (W) → 5) actualiza now.md::methodology_step=rm:specification, flow=rm (W) → 6) emite tollgate "especificación con baseline v1.0 + sign-off" (X).
- **Flujo alterno:** Formato híbrido SRS + User Stories para sistemas técnicos complejos con equipo mixto.
- **Flujo de excepción:** Sin análisis completado → no especificar (propaga defectos); conflictos no resueltos → no especificar (no puede haber dos versiones de la misma funcionalidad).
- **Postcondición:** Documento de especificación con acceptance criteria por Must Have, NFR medibles, IDs únicos, baseline versionado con sign-off formal.
- **Datos (OOIs):** SessionState (R/W), rm-analysis.md (R), rm-specification.md (W).
- **Criterios de aceptación:** Given análisis completo, When se ejecuta rm:specification, Then existe rm-specification.md con baseline v1.0, acceptance criteria verificables por Must Have y NFR con métrica cuantitativa.
- **COSMIC:** 6 CFP

## UC-MET-RM-04 — rm:validation (Validation)
- **Actor (FU):** Claude/contexto · **Secundarios:** Stakeholders/usuario final (sign-off), equipo técnico (verificación NFR)
- **Trigger:** Especificación completa con baseline establecido; necesidad de confirmar corrección y pertinencia antes de gestión.
- **Precondición:** `{wp}/rm-specification.md` con baseline versionado y sign-off del autor, acceptance criteria por Must Have y trazabilidad inicial.
- **Flujo principal:** 1) recibe señal "avanzar a validation" (E) → 2) lee now.md (R) → 3) lee rm-specification.md (baseline, AC) (R) → 4) ejecuta verificación + validación (técnica según contexto: walkthrough/Fagan/prototipo/UAT), registra defect log y completa sign-off matrix con decisión de flujo en `{wp}/rm-validation.md` (W) → 5) actualiza now.md::methodology_step=rm:validation, flow=rm (W) → 6) emite tollgate "sign-off formal obtenido" (X).
- **Flujo alterno (state-machine):** `on_corrections_needed` (defectos Wrong/Inconsistent, Must Have sin AC verificables, sign-off rechazado con justificación) → retornar a rm:analysis con la lista específica de defectos.
- **Flujo de excepción:** Sin baseline de especificación → no validar; stakeholders clave no disponibles → programar sesiones primero.
- **Postcondición:** Reporte de validación con defect log, sign-off matrix de Must Haves y decisión `on_approved` / `on_corrections_needed`.
- **Datos (OOIs):** SessionState (R/W), rm-specification.md (R), rm-validation.md (W).
- **Criterios de aceptación:** Given baseline establecido, When se ejecuta rm:validation, Then existe rm-validation.md con cero defectos Wrong/Inconsistent sin resolver y sign-off de todos los Must Have; si hay defectos Wrong, el flujo retorna a rm:analysis.
- **COSMIC:** 6 CFP

## UC-MET-RM-05 — rm:management (Management)
- **Actor (FU):** Claude/contexto · **Secundarios:** CCB (analista RM + PM + representante de negocio + Tech Lead)
- **Trigger:** Baseline aprobado y desarrollo iniciado / llegada de un change request / review de trazabilidad por sprint / cierre del ciclo RM.
- **Precondición:** `{wp}/rm-validation.md` con baseline con sign-off formal (`on_approved`), especificación v1.0 aprobada y trazabilidad inicial establecida.
- **Flujo principal:** 1) recibe señal "avanzar a management" (E) → 2) lee now.md (R) → 3) lee rm-validation.md (baseline aprobado, trazabilidad) (R) → 4) procesa change requests por CCB (impact analysis), mantiene matriz de trazabilidad forward/backward, versiona el baseline y gestiona el Kanban de CRs en `{wp}/rm-management.md` (W) → 5) actualiza now.md::methodology_step=rm:management, flow=rm (W) → 6) emite tollgate "baseline estable + trazabilidad completa" (X).
- **Flujo alterno (state-machine):** `on_change_request` (nuevo CR aprobado que requiere análisis) → retornar a rm:analysis; CR con >10 requisitos o esfuerzo >30% → nuevo work package/proyecto.
- **Flujo de excepción:** Sin baseline aprobado → no hay gestión de cambios posible; cambio al baseline sin CCB → invalida el baseline.
- **Postcondición:** Baseline gobernado con CRs cerrados/diferidos formalmente, matriz de trazabilidad actualizada y versionado comunicado; `on_stable` cierra el ciclo RM.
- **Datos (OOIs):** SessionState (R/W), rm-validation.md (R), rm-management.md (CR log, traceability matrix) (W).
- **Criterios de aceptación:** Given baseline aprobado, When se ejecuta rm:management, Then existe rm-management.md con todo CR pasando por CCB con impact analysis y matriz de trazabilidad forward/backward; un nuevo CR aprobado retorna el flujo a rm:analysis.
- **COSMIC:** 6 CFP

---

## Familia Strategic Planning (sp:*) — 8 UCs (ciclo, con retorno sp:adjust→sp:context/sp:execute)

## UC-MET-SP-01 — sp:context (Context)
- **Actor (FU):** Claude/contexto · **Secundarios:** Sponsor/liderazgo (aprueba el contexto)
- **Trigger:** Inicio de un ciclo de planificación estratégica formal / cambio de liderazgo, fusión, expansión o pivote.
- **Precondición:** WP activo con descripción inicial del desafío estratégico; sponsor/liderazgo con autoridad para aprobar el rumbo; acceso a documentos fundacionales.
- **Flujo principal:** 1) recibe señal "avanzar a context" (E) → 2) lee now.md (R) → 3) lee descripción del desafío + documentos fundacionales (R) → 4) define misión/visión/valores, mapa de stakeholders (poder-interés), posición estratégica actual, horizonte, contexto histórico y restricciones, y sintetiza la Declaración de Contexto Estratégico en `{wp}/sp-context.md` (W) → 5) actualiza now.md::methodology_step=sp:context, flow=sp (W) → 6) emite tollgate "Declaración de Contexto aprobada por sponsor/liderazgo" (X).
- **Flujo alterno:** Si el contexto fue documentado y aprobado hace <12 meses → ir directamente a sp:analysis a actualizar el baseline.
- **Flujo de excepción:** Sin sponsor con autoridad real → el proceso no tiene tracción, no iniciar; problema operacional sin implicación estratégica → usar PDCA/DMAIC.
- **Postcondición:** Documento de contexto con misión/visión/valores, stakeholders analizados, posición actual con datos, horizonte y restricciones conocidas.
- **Datos (OOIs):** SessionState (R/W), descripción del desafío + documentos fundacionales (R), sp-context.md (W).
- **Criterios de aceptación:** Given WP con desafío estratégico y liderazgo comprometido, When se ejecuta sp:context, Then existe sp-context.md con visión con horizonte temporal y stakeholders analizados por influencia e interés.
- **COSMIC:** 6 CFP

## UC-MET-SP-02 — sp:analysis (Environmental Analysis)
- **Actor (FU):** Claude/contexto · **Secundarios:** Stakeholders clave (validación de hallazgos)
- **Trigger:** Contexto aprobado / cambios significativos del entorno (nuevo competidor, cambio regulatorio, crisis).
- **Precondición:** sp:context completado: contexto organizacional documentado; acceso a datos de mercado/competencia/internos; al menos un stakeholder clave para validar.
- **Flujo principal:** 1) recibe señal "avanzar a analysis" (E) → 2) lee now.md (R) → 3) lee sp-context.md (misión, posición, restricciones) (R) → 4) ejecuta SWOT, PESTEL, Porter's Five Forces y baseline interno (capacidades/recursos/cultura) en `{wp}/analyze/environmental-analysis.md` (W) → 5) actualiza now.md::methodology_step=sp:analysis, flow=sp (W) → 6) emite tollgate "SWOT + PESTEL + Five Forces validados con stakeholders" (X).
- **Flujo alterno:** Análisis completado en los últimos 6 meses y entorno sin cambios → reutilizar y documentar supuestos vigentes.
- **Flujo de excepción:** Sin datos suficientes → completar recopilación primero; proyecto operacional sin componente estratégico → usar DMAIC/PDCA.
- **Postcondición:** Diagnóstico externo e interno con SWOT (con evidencia), PESTEL (significancia priorizada), Five Forces (intensidad 1-5) y baseline interno con benchmark.
- **Datos (OOIs):** SessionState (R/W), sp-context.md (R), analyze/environmental-analysis.md (W).
- **Criterios de aceptación:** Given contexto aprobado, When se ejecuta sp:analysis, Then existe analyze/environmental-analysis.md con SWOT respaldado por evidencia y Five Forces con intensidad cuantificada (1-5).
- **COSMIC:** 6 CFP

## UC-MET-SP-03 — sp:gaps (Gap Analysis)
- **Actor (FU):** Claude/contexto · **Secundarios:** Liderazgo (valida la matriz de priorización)
- **Trigger:** Análisis ambiental completo; necesidad de priorizar entre áreas de mejora antes de formular.
- **Precondición:** sp:analysis completado: SWOT, PESTEL y baseline interno documentados; estado futuro deseado (visión) definido en sp:context; métricas de baseline disponibles.
- **Flujo principal:** 1) recibe señal "avanzar a gaps" (E) → 2) lee now.md (R) → 3) lee analyze/environmental-analysis.md (baseline) + sp-context.md (visión) (R) → 4) define estado futuro deseado, calcula brechas absolutas/relativas, cuantifica impacto, analiza causa raíz estratégica y prioriza (Score I×U) en `{wp}/analyze/strategic-gap-analysis.md` (W) → 5) actualiza now.md::methodology_step=sp:gaps, flow=sp (W) → 6) emite tollgate "brechas cuantificadas + priorizadas con causa raíz" (X).
- **Flujo alterno:** Brechas interdependientes → documentar que cerrar la brecha de capacidad es requisito para cerrar la de resultado.
- **Flujo de excepción:** Estado futuro no definido → clarificar visión en sp:context primero; sin baseline → medir estado actual antes de calcular brechas.
- **Postcondición:** Análisis de brechas con estado actual vs futuro cuantificado, causas raíz documentadas y matriz de priorización validada.
- **Datos (OOIs):** SessionState (R/W), analyze/environmental-analysis.md (R), sp-context.md (R), analyze/strategic-gap-analysis.md (W).
- **Criterios de aceptación:** Given análisis ambiental completo, When se ejecuta sp:gaps, Then existe analyze/strategic-gap-analysis.md con brechas en métricas y causa raíz por brecha prioritaria (no todas en prioridad "alta").
- **COSMIC:** 6 CFP

## UC-MET-SP-04 — sp:formulate (Strategy Formulation)
- **Actor (FU):** Claude/contexto · **Secundarios:** Liderazgo (aprueba BSC/Strategy Map/OKRs)
- **Trigger:** Brechas cuantificadas y priorizadas; necesidad de traducir la visión en objetivos medibles.
- **Precondición:** sp:gaps completado: brechas cuantificadas y priorizadas con causa raíz; misión/visión claras; liderazgo disponible para validar.
- **Flujo principal:** 1) recibe señal "avanzar a formulate" (E) → 2) lee now.md (R) → 3) lee analyze/strategic-gap-analysis.md (brechas) (R) → 4) define objetivos estratégicos, construye Balanced Scorecard (4 perspectivas), Strategy Map causal, OKRs de primer nivel y tabla de KPIs (owner+fuente) en `{wp}/strategy/strategy-formulation.md` (W) → 5) actualiza now.md::methodology_step=sp:formulate, flow=sp (W) → 6) emite tollgate "BSC + Strategy Map + OKRs aprobados por liderazgo" (X).
- **Flujo alterno:** Organización <20 personas → usar directamente OKRs sin el aparato completo del BSC.
- **Flujo de excepción:** Gap analysis incompleto → formular sería planificación ciega, no avanzar; mejora operacional sin componente estratégico → usar PDCA/DMAIC.
- **Postcondición:** BSC con 3-5 objetivos por perspectiva, Strategy Map con flechas de causalidad, OKRs con KRs medibles (no tareas), KPIs con owner y fuente de datos.
- **Datos (OOIs):** SessionState (R/W), analyze/strategic-gap-analysis.md (R), strategy/strategy-formulation.md (W).
- **Criterios de aceptación:** Given brechas priorizadas, When se ejecuta sp:formulate, Then existe strategy/strategy-formulation.md con BSC en 4 perspectivas, Strategy Map causal y OKRs cuyos KRs son resultados medibles.
- **COSMIC:** 6 CFP

## UC-MET-SP-05 — sp:plan (Strategic Plan)
- **Actor (FU):** Claude/contexto · **Secundarios:** Equipo directivo (aprueba el plan)
- **Trigger:** Estrategia formulada y aprobada; necesidad de traducir OKRs en iniciativas concretas.
- **Precondición:** sp:formulate completado: BSC, Strategy Map y OKRs aprobados; presupuesto estratégico disponible o en aprobación; owners potenciales identificados.
- **Flujo principal:** 1) recibe señal "avanzar a plan" (E) → 2) lee now.md (R) → 3) lee strategy/strategy-formulation.md (BSC, OKRs) (R) → 4) traduce objetivos en iniciativas con owner/presupuesto/timeline/KPI, crea roadmap por horizontes, identifica quick wins, define recursos y plan de comunicación en `{wp}/plan/strategic-plan.md` y actualiza ROADMAP.md (W) → 5) actualiza now.md::methodology_step=sp:plan, flow=sp (W) → 6) emite tollgate "plan estratégico aprobado con owners y presupuesto" (X).
- **Flujo alterno:** Presupuesto incierto → documentar supuestos y rangos sin fabricar cifras precisas.
- **Flujo de excepción:** OKRs no aprobados → planificar produciría iniciativas desconectadas, no avanzar; iniciativa operacional de rutina → usar el backlog del área, no el plan estratégico.
- **Postcondición:** Plan estratégico con iniciativas priorizadas (owner único, presupuesto, timeline, KPI), quick wins identificados y plan de comunicación; ROADMAP.md actualizado.
- **Datos (OOIs):** SessionState (R/W), strategy/strategy-formulation.md (R), plan/strategic-plan.md (W), ROADMAP.md (W).
- **Criterios de aceptación:** Given OKRs aprobados, When se ejecuta sp:plan, Then existe plan/strategic-plan.md con cada iniciativa con owner único y presupuesto, quick wins ≤90 días identificados y ROADMAP.md actualizado con hitos estratégicos.
- **COSMIC:** 7 CFP

## UC-MET-SP-06 — sp:execute (Strategy Execution)
- **Actor (FU):** Claude/contexto · **Secundarios:** Owners de iniciativas, directores/managers (cascadeo de OKRs), equipos
- **Trigger:** Plan estratégico aprobado; iniciativas que necesitan kick-off y cascadeo.
- **Precondición:** sp:plan completado: plan estratégico aprobado con owners, presupuesto y roadmap; owners comprometidos con recursos; plan de comunicación definido.
- **Flujo principal:** 1) recibe señal "avanzar a execute" (E) → 2) lee now.md (R) → 3) lee plan/strategic-plan.md (iniciativas, owners, plan de comunicación) (R) → 4) realiza kick-offs, cascadea OKRs a departamentos/equipos, ejecuta plan de gestión del cambio (ADKAR) y establece seguimiento temprano en `{wp}/execute/strategy-execution-log.md` y `{wp}/execute/cascade.md` (W) → 5) actualiza now.md::methodology_step=sp:execute, flow=sp (W) → 6) emite tollgate "kick-offs + OKRs cascadeados + primer check-in" (X).
- **Flujo alterno:** Cascadeo en org >200 personas → coordinación extensa de 4-6 semanas, documentada como tal.
- **Flujo de excepción:** Sin plan aprobado → no ejecutar; equipo no conoce la estrategia → completar plan de comunicación antes del kick-off; ejecución táctica day-to-day → usar Jira/Linear del equipo.
- **Postcondición:** Iniciativas con kick-off, OKRs cascadeados (negociados, no mandatados), plan de gestión del cambio activo y primer check-in completado.
- **Datos (OOIs):** SessionState (R/W), plan/strategic-plan.md (R), execute/strategy-execution-log.md (W), execute/cascade.md (W).
- **Criterios de aceptación:** Given plan aprobado, When se ejecuta sp:execute, Then existe execute/cascade.md con OKRs alineados org→depto→equipo y execute/strategy-execution-log.md con kick-offs y primer check-in.
- **COSMIC:** 6 CFP

## UC-MET-SP-07 — sp:monitor (Strategy Monitoring)
- **Actor (FU):** Claude/contexto · **Secundarios:** Owners de iniciativas, C-suite (decisión sobre iniciativas en rojo)
- **Trigger:** Tras las primeras 4-6 semanas de ejecución / inicio de cada ciclo de revisión (mensual/trimestral/anual) / señal de alerta.
- **Precondición:** sp:execute completado: iniciativas en marcha, OKRs cascadeados, primer check-in realizado; KPIs con owners y fuentes; cadencia de revisión acordada.
- **Flujo principal:** 1) recibe señal "avanzar a monitor" (E) → 2) lee now.md (R) → 3) lee execute/strategy-execution-log.md + strategy/strategy-formulation.md (KPIs) (R) → 4) revisa KPIs de proceso y del BSC, ejecuta OKR check-in, asigna RAG status, identifica iniciativas de bajo rendimiento y define acciones de corrección en `{wp}/track/strategy-review-[YYYY-QN].md` (W) → 5) actualiza now.md::methodology_step=sp:monitor, flow=sp (W) → 6) emite tollgate "≥1 ciclo de revisión con RAG status + acciones para las rojas" (X).
- **Flujo alterno:** Primeros 30 días → enfocarse en KPIs de proceso (no de resultado), documentar monitoreo cualitativo.
- **Flujo de excepción:** Sin datos reales → documentar "sin datos aún" y fijar fecha de primera medición; iniciativa en rojo por dos períodos → activar revisión profunda (replanificar/pivotar/discontinuar).
- **Postcondición:** Reporte de revisión con KPIs evaluados, RAG status por iniciativa y acciones de corrección definidas para las rojas.
- **Datos (OOIs):** SessionState (R/W), execute/strategy-execution-log.md (R), strategy/strategy-formulation.md (R), track/strategy-review-[YYYY-QN].md (W).
- **Criterios de aceptación:** Given iniciativas en marcha, When se ejecuta sp:monitor, Then existe track/strategy-review con RAG status documentado y acción de corrección para cada iniciativa en rojo.
- **COSMIC:** 6 CFP

## UC-MET-SP-08 — sp:adjust (Strategy Adjustment)
- **Actor (FU):** Claude/contexto · **Secundarios:** Liderazgo/board (decisión del próximo ciclo)
- **Trigger:** Final del ciclo estratégico / monitoreo detecta supuestos del Strategy Map incorrectos / cambio de entorno material que invalida supuestos clave.
- **Precondición:** sp:monitor completado: al menos un ciclo de revisión con KPIs, RAG status y acciones documentadas; datos suficientes para evaluar supuestos; liderazgo disponible.
- **Flujo principal:** 1) recibe señal "avanzar a adjust" (E) → 2) lee now.md (R) → 3) lee track/strategy-review-[YYYY-QN].md + strategy/strategy-formulation.md (supuestos) (R) → 4) evalúa qué funcionó vs no (ejecución vs supuesto vs entorno), actualiza supuestos, refresca OKRs y BSC con nuevo baseline, documenta aprendizajes y decide el próximo ciclo (A/B/C) en `{wp}/standardize/strategy-adjustment-[YYYY].md` (W) → 5) actualiza now.md::methodology_step=sp:adjust, flow=sp (W) → 6) emite tollgate "aprendizajes documentados + decisión del próximo ciclo" (X).
- **Flujo alterno (ciclo):** Opción A/B (>40% supuestos confirmados) → refrescar OKRs/BSC y regresar a sp:execute para el nuevo período; Opción C (<40% confirmados o entorno cambió) → regresar a sp:analysis con entorno actualizado; objetivo logrado y sin nuevo ciclo → cerrar el WP.
- **Flujo de excepción:** Ajustes tácticos menores → gestionar en sp:monitor con RAG; primeros 6 meses del ciclo → datos insuficientes para evaluar supuestos; reacción a un solo trimestre malo → no invalida la estrategia.
- **Postcondición:** Aprendizajes estratégicos documentados, supuestos actualizados, OKRs/BSC refrescados y decisión explícita del próximo ciclo tomada.
- **Datos (OOIs):** SessionState (R/W), track/strategy-review-[YYYY-QN].md (R), strategy/strategy-formulation.md (R), standardize/strategy-adjustment-[YYYY].md (W).
- **Criterios de aceptación:** Given ≥1 ciclo de revisión completo, When se ejecuta sp:adjust, Then existe standardize/strategy-adjustment con supuestos clasificados (confirmado/incorrecto/entorno) y decisión A/B/C; Opción C retorna el ciclo a sp:context y A/B a sp:execute.
- **COSMIC:** 6 CFP

---

## Resumen capa C (61 procesos · 376 CFP — corregido)

| Metodología | Pasos | CFP |
|-------------|-------|-----|
| BABOK (ba) | 6 | 36 |
| BPA (bpa) | 6 | 37 |
| Consulting (cp) | 7 | 43 |
| DMAIC (dmaic) | 5 | 31 |
| Lean (lean) | 5 | 30 |
| PDCA (pdca) | 4 | 25 |
| PMBOK (pm) | 5 | 30 |
| PPS Toyota (pps) | 6 | 40 |
| RM (rm) | 5 | 30 |
| RUP (rup) | 4 | 25 |
| Strategic Planning (sp) | 8 | 49 |
| **Σ Capa C** | **61** | **376** |

Fuente OBSERVABLE: los 61 SKILL leídos uno a uno. CFP por-paso del baseline ÉPICA 44
(corrección RUP 27→25). 51 pasos = 6 CFP, 10 pasos = 7 CFP (2º precondición o 2º artefacto:
a3-report en PPS, ROADMAP en sp-plan, cierre en dmaic-control/pdca-act/rup-transition,
2º baseline en bpa-monitor/cp-evaluate).

**Última actualización:** 2026-06-03 05:05:00
