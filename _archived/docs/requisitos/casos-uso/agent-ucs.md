```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 3.0.0
updated_at: 2026-06-03 05:05:00
```

# UCs de THYROX — Capa D: Agentes

> FSM = capa de sub-agentes (runtime de Claude vía Agent tool). 29 agentes = 29 procesos
> funcionales. **Usuario funcional:** Claude (orquestador). **Boundary:** llamada `Agent(...)`
> ↔ ejecución del sub-agente. **OOIs:** Input-Artifact, WorkPackage/contexto, schema `.yml`,
> Report (output escrito), Result (`output_key`/mensaje de retorno).
>
> **v3.0.0 — UC formal:** cada agente es ahora un UC completo (precondición/flujo principal
> con E·X·R·W/alterno/excepción/postcondición/datos/criterios de aceptación), anclado en su
> definición real (`.claude/agents/{nombre}.md`). Antes (v2.0.0) era un roster; ahora 29 UCs
> individuales. La línea **COSMIC** conserva el CFP del baseline ÉPICA 44.

---

## UC-AGT-AGENTIC-REASONING — agentic-reasoning (DEPRECATED)
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(agentic-reasoning, artefacto) — invocado por error; su funcionalidad fue absorbida por deep-dive (Capa 7 calibración). El orquestador lo invoca cuando una sesión antigua referencia el agente.
- **Precondición:** Existe un artefacto WP de THYROX a calibrar (análisis, estrategia, risk register, exit conditions).
- **Flujo principal:** 1) invocación + ref al artefacto (E) → 2) lee el artefacto + `context/now.md::current_work` (R, R) → 3) clasifica claims (Observación directa / Inferencia calibrada / Afirmación performativa / Especulación) y calcula ratio de calibración → 4) escribe `{current_work}/analyze/{topic}-calibration-review.md` (W) → 5) retorna ratio + clasificación CALIBRADO/PARCIALMENTE CALIBRADO/REALISMO PERFORMATIVO (X)
- **Flujo alterno:** Modo 2 (diseño de mecanismo de evidencia por campo) · Modo 3 (evaluación de P values en risk register: P derivada/estimada/inventada).
- **Flujo de excepción:** No hay WP activo → preguntar destino. Input es `input.md` comprimido → añadir ADVERTENCIA de completitud al reporte. Recomendación canónica: redirigir a deep-dive.
- **Postcondición:** Markdown de calibración en `analyze/` con ratio y clasificación; recomendación Avanzar/Iterar.
- **Datos (OOIs):** artefacto WP, now.md (R); `{topic}-calibration-review.md` (W)
- **Criterios de aceptación:** Given un artefacto WP, When se invoca, Then se produce el review con ratio (OBS+INF/total) y clasificación epistémica verificable.
- **COSMIC:** 5 CFP

## UC-AGT-AGENTIC-VALIDATOR — agentic-validator
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(agentic-validator, lista de archivos Python o glob) — cuando hay código Python agentic a validar contra el catálogo AP-01..AP-30.
- **Precondición:** Existen archivos `.py` agentic (callbacks ADK, agentes, tools, clasificadores) accesibles.
- **Flujo principal:** 1) invocación + lista/glob de archivos (E) → 2) lee los archivos Python objetivo (R) → 3) ejecuta Grep contra patrones de las 8 secciones del catálogo y aplica protocolo Fix Declarado≠Verificado → 4) escribe reporte de validación markdown (W) → 5) retorna tabla AP-ID/severidad/file:line/corrección + resumen CRITICAL/HIGH/MEDIUM (X)
- **Flujo alterno:** Si el código declara "Bugs corregidos/Fixed" → clasificar cada fix como fix-real / fix-textual / fix-performativo y buscar bugs no declarados.
- **Flujo de excepción:** Sin archivos Python en el alcance → reporte vacío con "Archivos limpios: 0/0" o nota de no-aplicabilidad.
- **Postcondición:** Reporte con anti-patrones localizados y correcciones prioritarias para CRITICAL/HIGH.
- **Datos (OOIs):** archivos `.py` (R); reporte de validación markdown (W)
- **Criterios de aceptación:** Given archivos Python agentic, When se invoca, Then cada hit reporta AP-ID + severidad + file:line + corrección aplicable.
- **COSMIC:** 4 CFP

## UC-AGT-BA-COORDINATOR — ba-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills ba-* (planning, elicitation, requirements-analysis, requirements-lifecycle, strategy, solution-evaluation)
- **Trigger:** Agent(ba-coordinator, contexto) — cuando la metodología BABOK está activa (flow=ba). Despacha el knowledge area, no es secuencial.
- **Precondición:** Existe `.thyrox/registry/methodologies/babok.yml` y `now.md` con flow=ba (o null para arranque).
- **Flujo principal:** 1) invocación (E) → 2) lee `babok.yml` + `now.md::methodology_step` (R, R) → 3) rutea no-secuencialmente: recomienda área por reglas de contexto → 4) actualiza `now.md` (flow/methodology_step) y `{wp}/ba-progress.md` (W) → 5) retorna área recomendada + las 6 opciones + razón (X)
- **Flujo alterno:** methodology_step=null → presentar las 6 áreas y recomendar punto de partida. Multi-área: mantener estado de cada área en ba-progress.md.
- **Flujo de excepción:** Falta babok.yml → no puede rutear; señalar ausencia del schema.
- **Postcondición:** now.md actualizado; ba-progress.md con estado de áreas; al cierre emite `[ba-coordinator COMPLETED]` con artefactos producidos.
- **Datos (OOIs):** babok.yml, now.md (R); now.md, ba-progress.md, artefactos ba-* (W)
- **Criterios de aceptación:** Given flow=ba, When se invoca, Then retorna área recomendada con razón y actualiza methodology_step a ba:{area}.
- **COSMIC:** 6 CFP

## UC-AGT-BPA-COORDINATOR — bpa-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills bpa-* (identify, map, analyze, design, implement, monitor)
- **Trigger:** Agent(bpa-coordinator, contexto) — cuando la metodología BPA está activa (flow=bpa). Despacha las 6 fases con tollgates.
- **Precondición:** `now.md` con flow=bpa (o methodology_step=null para iniciar en bpa:identify).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) verifica tollgate de la fase actual (artefacto existe + elementos mínimos) y aplica ESIA en bpa:design → 4) actualiza `now.md` (flow/methodology_step) (W) → 5) retorna fase actual + tollgate cumplido/faltante + opción de avanzar (X)
- **Flujo alterno:** Tollgate incompleto → señalar qué falta antes de avanzar. Trazabilidad As-Is→To-Be→Comparison entre bpa:map/design/monitor.
- **Flujo de excepción:** Artefacto de fase ausente → bloquear avance hasta completar tollgate.
- **Postcondición:** now.md en bpa:{fase}; al cierre emite `[bpa-coordinator COMPLETED]` con Lead Time/VA%/Error rate before-after.
- **Datos (OOIs):** now.md (R); now.md, artefactos bpa-* (W)
- **Criterios de aceptación:** Given flow=bpa, When se invoca, Then verifica tollgate y retorna avance solo si el artefacto cumple elementos mínimos.
- **COSMIC:** 5 CFP

## UC-AGT-CP-COORDINATOR — cp-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills cp-* (initiation, diagnosis, structure, recommend, plan, implement, evaluate)
- **Trigger:** Agent(cp-coordinator, contexto) — cuando la metodología Consulting Process está activa (flow=cp). Despacha las 7 fases con tollgates.
- **Precondición:** `now.md` con flow=cp (o methodology_step=null para iniciar en cp:initiation).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) verifica tollgate y principios MECE/hypothesis-driven/Pyramid/So-What; checkpoint sponsor en cp:recommend → 4) actualiza `now.md` (W) → 5) retorna fase + tollgate + opción de avanzar (X)
- **Flujo alterno:** Tollgate incompleto → señalar faltante. Checkpoint de sponsor obligatorio antes de cp:plan.
- **Flujo de excepción:** Artefacto de fase ausente o checkpoint sponsor no realizado → bloquear avance.
- **Postcondición:** now.md en cp:{fase}; al cierre emite `[cp-coordinator COMPLETED]` con impacto vs KPIs + knowledge transfer.
- **Datos (OOIs):** now.md (R); now.md, artefactos cp-* (W)
- **Criterios de aceptación:** Given flow=cp, When se invoca, Then verifica tollgate y exige checkpoint sponsor antes de cp:plan.
- **COSMIC:** 5 CFP

## UC-AGT-DEEP-DIVE — deep-dive
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(deep-dive, artefacto) — cuando se necesita saber qué es verdadero/falso/incierto en cualquier artefacto (documento, código, arquitectura, decisión). NO usar para harvesting de corpus.
- **Precondición:** Existe el artefacto a analizar y un WP activo (o destino acordado).
- **Flujo principal:** 1) invocación + ref (E) → 2) lee el artefacto + `context/now.md::current_work` (R, R) → 3) ejecuta 6 capas adversariales mínimas (lectura, aislamiento, saltos lógicos, contradicciones, engaños estructurales, veredicto) + Capa 7 calibración si es artefacto WP THYROX → 4) escribe `{wp}/{stage}/{tema}-deep-dive.md` (W) → 5) retorna veredicto VERDADERO/FALSO/INCIERTO + patrón dominante (+ ratio de calibración si aplica) (X)
- **Flujo alterno:** Artefacto WP THYROX → añade Capa 7 (ratio OBSERVABLE+INFERRED/total ≥0.75). Nueva versión de doc ya analizado → tabla comparativa V(N-1) vs V(N) + ratio neto de mejora.
- **Flujo de excepción:** Input es `input.md` comprimido → ADVERTENCIA de completitud antes de Capa 1 + nota en veredicto. Sin WP activo → preguntar destino.
- **Postcondición:** Markdown de deep-dive en el stage directory con veredicto y patrón estructural.
- **Datos (OOIs):** artefacto, now.md (R); `{tema}-deep-dive.md` (W)
- **Criterios de aceptación:** Given un artefacto, When se invoca, Then produce veredicto en 3 categorías con cita exacta (sección/línea) y nombra el patrón dominante.
- **COSMIC:** 5 CFP

## UC-AGT-DEEP-REVIEW — deep-review
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(deep-review, fases o ref externa) — cuando se pide deep-review de cobertura antes de avanzar de Phase N a N+1, o análisis de patrones en doc/repo externo. NO usar para harvesting de corpus.
- **Precondición:** Modo 1: existen artefactos primarios de Phase N y N+1 + exit-conditions. Modo 2: existe el recurso externo (README/INDEX/repo).
- **Flujo principal:** 1) invocación + ref (E) → 2) lee ambos artefactos / índice del recurso + `now.md::current_work` (R, R) → 3) cross-reference sistemático item por item + grep real de inventarios → 4) escribe `{current_work}/{topic}-deep-review.md` (W) → 5) retorna gaps con origen/impacto/acción + recomendación Avanzar/Iterar (X)
- **Flujo alterno:** Modo 2 (Reference Analysis): leer todo el recurso sin filtrar, extraer patrones por categoría emergente, contrastar con references existentes al final, recomendar nuevo reference file.
- **Flujo de excepción:** `current_work` vacío → preguntar destino antes de crear. Regla anti-sesgo: nunca iniciar desde la hipótesis del usuario.
- **Postcondición:** Markdown de hallazgos de cobertura/patrones en el WP, autocontenido.
- **Datos (OOIs):** artefactos Phase N/N+1 o recurso externo, exit-conditions, now.md (R); `{topic}-deep-review.md` (W)
- **Criterios de aceptación:** Given dos fases consecutivas, When se invoca, Then cada item de Phase N se cruza contra Phase N+1 con grep real y se reportan gaps con impacto.
- **COSMIC:** 5 CFP

## UC-AGT-DIAGRAMA-ISHIKAWA — diagrama-ishikawa
- **Actor (FU):** Claude (orquestador) · **Secundarios:** sub-agentes Explore/general-purpose (solo si no es invocado como sub-agente)
- **Trigger:** Agent(diagrama-ishikawa, problema/efecto) — cuando se necesita análisis de causa raíz (RCA) de un problema técnico/organizacional/calidad/ventas/investigación; proactivamente ante errores recurrentes o metas no alcanzadas.
- **Precondición:** Hay un efecto específico y observable a analizar y un WP activo (o destino acordado).
- **Flujo principal:** 1) invocación + efecto (E) → 2) detecta dominio y lee `now.md::current_work` (R) → 3) selecciona 6M apropiadas, brainstorming por categoría, 5 Porqués, genera diagrama Mermaid y tabla de acciones correctivas → 4) escribe `{current_work}/{efecto-kebab}-ishikawa.md` (W) → 5) retorna síntesis con causas raíz y acción de mayor impacto (X)
- **Flujo alterno:** Puede delegar investigación a sub-agentes (Explore/general-purpose); si él mismo es sub-agente, NO puede anidar. 6M se adaptan al dominio (estándar/Software-LLM/Ventas/Custom).
- **Flujo de excepción:** Sin WP activo → preguntar destino. Si el problema es timeout de sesión actual → recomendar sesión nueva; máx 2 Ishikawa/sesión.
- **Postcondición:** Markdown Ishikawa con diagrama Mermaid, 5 Porqués y tabla de acciones priorizadas.
- **Datos (OOIs):** descripción del efecto, now.md (R); `{efecto}-ishikawa.md` (W)
- **Criterios de aceptación:** Given un efecto observable, When se invoca, Then produce diagrama con ≥2 sub-causas por M, causas raíz accionables destacadas y tabla correctiva.
- **COSMIC:** 4 CFP

## UC-AGT-DMAIC-COORDINATOR — dmaic-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills dmaic-* (define, measure, analyze, improve, control)
- **Trigger:** Agent(dmaic-coordinator, contexto) — cuando la metodología DMAIC (Six Sigma) está activa (flow=dmaic). Despacha las 5 fases con tollgates formales.
- **Precondición:** `now.md` con flow=dmaic (o methodology_step=null para iniciar en dmaic:define).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) verifica tollgate de la fase (Charter / Baseline+MSA / RCA con datos / mejora validada / Control Plan) → 4) actualiza `now.md` (W) → 5) retorna fase + tollgate + opción de avanzar (X)
- **Flujo alterno:** Tollgate incompleto → señalar faltante antes de avanzar.
- **Flujo de excepción:** Artefacto de fase ausente → bloquear avance.
- **Postcondición:** now.md en dmaic:{fase}; al cierre emite `[dmaic-coordinator COMPLETED]` con Sigma Level baseline→final y DPMO antes→después.
- **Datos (OOIs):** now.md (R); now.md, artefactos dmaic-* (W)
- **Criterios de aceptación:** Given flow=dmaic, When se invoca, Then verifica el tollgate de la fase y solo permite avanzar si los elementos mínimos existen.
- **COSMIC:** 5 CFP

## UC-AGT-GATE-CONSISTENCY-EVALUATOR — gate-consistency-evaluator
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(gate-consistency-evaluator, rutas) — cuando un gate de Stage THYROX requiere evaluación de consistencia de claims contra decisiones y stages previos.
- **Precondición:** Existen el artefacto del stage actual, el directorio decisions/ del WP y artefactos de stages anteriores relevantes. (Read-only — sin Write/Edit.)
- **Flujo principal:** 1) invocación + rutas (E) → 2) lee artefacto actual + decisions/ + artefactos previos (R, R, R) → 3) identifica claims con Origen=heredado, verifica re-verificación y contradicción contra ADRs → 4) (no escribe) → 5) retorna output_key='consistencia' con {claims_contradictorios, claims_heredados_sin_verificar, gate_pasa, notas} (X)
- **Flujo alterno:** Artefacto sin clasificación PROVEN/INFERRED/SPECULATIVE → unclear-handler retorna gate_pasa=false con nota "aplicar evidence-classification.md primero".
- **Flujo de excepción:** Falta decisions/ o artefactos previos → no puede verificar herencia; reflejar en notas.
- **Postcondición:** Schema `consistencia` retornado al gate; sin artefacto persistente (W=0).
- **Datos (OOIs):** artefacto actual, decisions/, artefactos previos (R); ninguno (W=0)
- **Criterios de aceptación:** Given un artefacto de stage + decisions/, When se invoca, Then retorna gate_pasa con lista de claims contradictorios y heredados sin verificar.
- **COSMIC:** 5 CFP

## UC-AGT-LEAN-COORDINATOR — lean-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills lean-* (define, measure, analyze, improve, control)
- **Trigger:** Agent(lean-coordinator, contexto) — cuando la metodología Lean Six Sigma está activa (flow=lean). Despacha las 5 fases con tollgates; el VSM es transversal.
- **Precondición:** `now.md` con flow=lean (o methodology_step=null para iniciar en lean:define).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) verifica tollgate (Charter+VOC / Current State VSM / Future State VSM+RCA / mejoras pre-post / SOPs) → 4) actualiza `now.md` (W) → 5) retorna fase + tollgate + opción de avanzar (X)
- **Flujo alterno:** VSM evoluciona Current→Future→post-implementación entre lean:measure/analyze/improve. Tollgate incompleto → señalar faltante.
- **Flujo de excepción:** Artefacto de fase ausente → bloquear avance.
- **Postcondición:** now.md en lean:{fase}; al cierre emite `[lean-coordinator COMPLETED]` con reducción Lead Time, eficiencia de flujo y desperdicios eliminados.
- **Datos (OOIs):** now.md (R); now.md, artefactos lean-* (W)
- **Criterios de aceptación:** Given flow=lean, When se invoca, Then verifica el tollgate y mantiene la trazabilidad del VSM entre fases.
- **COSMIC:** 5 CFP

## UC-AGT-MYSQL-EXPERT — mysql-expert
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(mysql-expert, tarea SQL) — cuando se trabaja con queries MySQL, schema design, migrations, índices u optimización.
- **Precondición:** Existe un esquema/proyecto MySQL o requerimiento de modelado relacional.
- **Flujo principal:** 1) invocación + tarea (E) → 2) lee archivos SQL/schema/migrations del proyecto (R) → 3) aplica convenciones (naming snake_case, InnoDB+utf8mb4, índices en FK, EXPLAIN ANALYZE) → 4) escribe/edita SQL o migrations (W) → 5) retorna SQL/migración + justificación (X)
- **Flujo alterno:** Ejecuta comandos vía mcp__thyrox_executor__exec_cmd (mysql, knex/prisma migrate, mysqldump); recupera contexto vía mcp__thyrox_memory__retrieve.
- **Flujo de excepción:** Requerimiento ambiguo de schema → pedir aclaración antes de generar DDL irreversible (no DROP COLUMN sin deprecación).
- **Postcondición:** Archivo SQL/migration creado o editado siguiendo convenciones MySQL.
- **Datos (OOIs):** schema/migrations/queries (R); SQL/migration (W)
- **Criterios de aceptación:** Given una tarea MySQL, When se invoca, Then produce SQL/migración con naming, índices en FK e InnoDB/utf8mb4 conforme a convenciones.
- **COSMIC:** 4 CFP

## UC-AGT-NODEJS-EXPERT — nodejs-expert
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(nodejs-expert, tarea) — cuando se necesita implementar APIs REST, middlewares, gestión de paquetes o depurar código Node.js.
- **Precondición:** Existe un proyecto Node.js/Express o requerimiento de backend.
- **Flujo principal:** 1) invocación + tarea (E) → 2) lee código fuente del proyecto (routes/controllers/services) (R) → 3) aplica convenciones (ESM, async/await, estructura por capas, validación Zod/Joi) → 4) escribe/edita código (W) → 5) retorna implementación + notas de seguridad (X)
- **Flujo alterno:** Ejecuta tests/instalación vía mcp__thyrox_executor__exec_cmd (npm test, npm install); recupera contexto vía mcp__thyrox_memory__retrieve.
- **Flujo de excepción:** Requerimiento ambiguo → pedir aclaración; no capturar y silenciar errores.
- **Postcondición:** Código Node.js/Express creado o editado con manejo de errores en límites del sistema.
- **Datos (OOIs):** código fuente del proyecto (R); archivos `.ts`/`.js` (W)
- **Criterios de aceptación:** Given una tarea Node.js, When se invoca, Then produce código ESM con async/await, validación de input y try/catch en controllers.
- **COSMIC:** 4 CFP

## UC-AGT-PATTERN-HARVESTER — pattern-harvester
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(pattern-harvester, directorio de corpus) — cuando se consolidan outputs de análisis (calibration/deep-dive) en mejoras implementables. NO usar para cobertura fase-a-fase.
- **Precondición:** Existe un corpus de archivos de análisis (pares `{tema}-calibration.md` + `{tema}-deep-dive.md`) y un task-plan activo.
- **Flujo principal:** 1) invocación + directorio (E) → 2) lista e inventaría el corpus + lee pares calibration/deep-dive + task-plan activo (R, R, R) → 3) extrae hallazgos verificables, los mapea a componentes THYROX (skill/hook/agent/guideline/template/script) y verifica contra task-plan → 4) escribe harvest report (W) → 5) retorna hallazgos por componente + propuestas de task CRÍTICO/ALTO + descartados (X)
- **Flujo alterno:** Archivos huérfanos (solo calibration o solo deep-dive) se reportan aparte; hallazgos parcialmente cubiertos se reportan solo si tienen ángulo no cubierto.
- **Flujo de excepción:** Hallazgo sin componente THYROX concreto → descartar (no accionable). Máx 5 CRÍTICOS + 5 ALTOS por corpus de 10 archivos.
- **Postcondición:** Harvest report con hallazgos mapeados y propuestas de task trazables a fuente.
- **Datos (OOIs):** corpus de análisis, task-plan (R); harvest report markdown (W)
- **Criterios de aceptación:** Given un corpus de calibration+deep-dive, When se invoca, Then cada hallazgo cita línea de fuente, mapea a un componente real y marca si ya está en task-plan.
- **COSMIC:** 5 CFP

## UC-AGT-PDCA-COORDINATOR — pdca-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills pdca-* (plan, do, check, act)
- **Trigger:** Agent(pdca-coordinator, contexto) — cuando la metodología PDCA (mejora continua) está activa (flow=pdca). Despacha las 4 etapas del ciclo.
- **Precondición:** `now.md` con flow=pdca (o methodology_step=null/vacío para iniciar en pdca:plan).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) activa skill de la etapa, produce artefacto de fase, actualiza methodology_step → 4) actualiza `now.md` (flow/methodology_step) (W) → 5) retorna etapa + opción de avanzar a la siguiente (X)
- **Flujo alterno:** En pdca:act preguntar: ¿ciclo exitoso (estandarizar) o nuevo ciclo (volver a pdca:plan)?
- **Flujo de excepción:** Artefacto de etapa ausente → completar antes de avanzar.
- **Postcondición:** now.md en pdca:{step}; al cierre emite `[pdca-coordinator COMPLETED]` con ciclo N, objetivo alcanzado/no y siguiente paso.
- **Datos (OOIs):** now.md (R); now.md, artefactos pdca-* (W)
- **Criterios de aceptación:** Given flow=pdca, When se invoca, Then guía la etapa actual y al cerrar pdca:act ofrece estandarizar o reiniciar ciclo.
- **COSMIC:** 5 CFP

## UC-AGT-PM-COORDINATOR — pm-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills pm-* (initiating, planning, executing, monitoring, closing)
- **Trigger:** Agent(pm-coordinator, contexto) — cuando la metodología PMBOK (PMI) está activa (flow=pm). Despacha los 5 grupos de proceso y sus knowledge areas.
- **Precondición:** Existe `.thyrox/registry/methodologies/pmbok.yml` y `now.md` con flow=pm (o methodology_step=null).
- **Flujo principal:** 1) invocación (E) → 2) lee `pmbok.yml` + `now.md::methodology_step` (R, R) → 3) presenta procesos del grupo + knowledge areas relevantes, verifica entregable principal → 4) actualiza `now.md` (flow/methodology_step) (W) → 5) retorna grupo + opción de avanzar (X)
- **Flujo alterno:** methodology_step=null → iniciar en pm:initiating. M&C (pm:monitoring) puede activarse en cualquier momento si hay desviaciones.
- **Flujo de excepción:** Entregable principal del grupo incompleto → señalar antes de avanzar.
- **Postcondición:** now.md en pm:{grupo}; al cierre emite `[pm-coordinator COMPLETED]` con proyecto cerrado y entregables X/Y.
- **Datos (OOIs):** pmbok.yml, now.md (R); now.md, artefactos pm-* (W)
- **Criterios de aceptación:** Given flow=pm, When se invoca, Then presenta el grupo de proceso con sus KAs y verifica el entregable principal antes de avanzar.
- **COSMIC:** 6 CFP

## UC-AGT-POSTGRESQL-EXPERT — postgresql-expert
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(postgresql-expert, tarea SQL) — cuando se trabaja con queries PostgreSQL, schema design, migrations, índices o transacciones.
- **Precondición:** Existe un esquema/proyecto PostgreSQL o requerimiento de modelado.
- **Flujo principal:** 1) invocación + tarea (E) → 2) lee archivos SQL/schema/migrations del proyecto (R) → 3) aplica convenciones (snake_case, TIMESTAMPTZ, gen_random_uuid, índice parcial WHERE deleted_at IS NULL, EXPLAIN ANALYZE) → 4) escribe/edita SQL o migrations (W) → 5) retorna SQL/migración + justificación (X)
- **Flujo alterno:** Ejecuta comandos vía mcp__thyrox_executor__exec_cmd (psql, knex/alembic migrate); recupera contexto vía mcp__thyrox_memory__retrieve.
- **Flujo de excepción:** Migración irreversible en producción → planificar; no DROP COLUMN sin deprecación.
- **Postcondición:** Archivo SQL/migration creado o editado siguiendo convenciones PostgreSQL.
- **Datos (OOIs):** schema/migrations/queries (R); SQL/migration (W)
- **Criterios de aceptación:** Given una tarea PostgreSQL, When se invoca, Then produce SQL/migración con índice en cada FK e índices parciales selectivos conforme a convenciones.
- **COSMIC:** 4 CFP

## UC-AGT-PPS-COORDINATOR — pps-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills pps-* (clarify, target, analyze, countermeasures, implement, evaluate)
- **Trigger:** Agent(pps-coordinator, contexto) — cuando la metodología PPS (Toyota TBP) está activa (flow=pps). Despacha las 6 fases; el A3 Report es central.
- **Precondición:** `now.md` con flow=pps (o methodology_step=null para iniciar en pps:clarify).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) verifica tollgate y principio Gemba (Go-and-See) en clarify/analyze → 4) actualiza `now.md` (W) → 5) retorna fase + sección A3 + opción de avanzar (X)
- **Flujo alterno:** Retorno condicional: en pps:evaluate, si los resultados NO alcanzan el target → no cerrar WP, actualizar methodology_step a pps:analyze con nuevas hipótesis.
- **Flujo de excepción:** Análisis basado en suposiciones (no Gemba) → bloquear; evidencia debe ser cuantificada.
- **Postcondición:** now.md en pps:{fase}; al cierre emite `[pps-coordinator COMPLETED]` con A3 completo, target alcanzado y Yokoten.
- **Datos (OOIs):** now.md (R); now.md, artefactos pps-* (W)
- **Criterios de aceptación:** Given flow=pps, When se invoca, Then verifica Gemba en clarify/analyze y reabre análisis si evaluate no alcanza el target.
- **COSMIC:** 5 CFP

## UC-AGT-REACT-EXPERT — react-expert
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(react-expert, tarea) — cuando se necesita implementar componentes, gestionar estado, configurar bundlers o depurar apps React.
- **Precondición:** Existe un proyecto React/TypeScript o requerimiento de frontend.
- **Flujo principal:** 1) invocación + tarea (E) → 2) lee código fuente (components/hooks/pages) (R) → 3) aplica convenciones (functional components TS, hooks con deps explícitas, Zustand/React Query, evitar any) → 4) escribe/edita componentes (W) → 5) retorna implementación + notas (X)
- **Flujo alterno:** Ejecuta tests vía mcp__thyrox_executor__exec_cmd (yarn test, coverage); recupera contexto vía mcp__thyrox_memory__retrieve.
- **Flujo de excepción:** Lógica de negocio en componente → mover a custom hook/servicio; useEffect para sync derivada → usar useMemo/useCallback.
- **Postcondición:** Componente/hook React creado o editado con TypeScript y convenciones de estado.
- **Datos (OOIs):** código fuente React (R); archivos `.tsx`/`.ts` (W)
- **Criterios de aceptación:** Given una tarea React, When se invoca, Then produce functional component tipado, un componente por archivo y hooks con array de deps explícito.
- **COSMIC:** 4 CFP

## UC-AGT-RM-COORDINATOR — rm-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills rm-* (elicitation, analysis, specification, validation, management)
- **Trigger:** Agent(rm-coordinator, contexto) — cuando la metodología Requirements Management está activa (flow=rm). Despacha el flujo condicional con retornos.
- **Precondición:** Existe `.thyrox/registry/methodologies/rm.yml` y `now.md` con flow=rm (o methodology_step=null).
- **Flujo principal:** 1) invocación (E) → 2) lee `rm.yml` + `now.md::methodology_step` (R, R) → 3) resuelve transición condicional según estado (on_success/on_gaps_found/on_corrections_needed/on_change_request) → 4) actualiza `now.md` (W) → 5) retorna paso + condición disponible (X)
- **Flujo alterno:** Retornos condicionales: gaps en analysis → re-elicitation; correcciones en validation → analysis; change request en management → analysis.
- **Flujo de excepción:** Falta rm.yml → no puede rutear. on_stable en management → proponer cierre.
- **Postcondición:** now.md en rm:{paso}; al cierre emite `[rm-coordinator COMPLETED]` con N requisitos gestionados y conteo de retornos.
- **Datos (OOIs):** rm.yml, now.md (R); now.md, artefactos rm-* (W)
- **Criterios de aceptación:** Given flow=rm, When se invoca, Then resuelve la transición condicional correcta y dispara retornos cuando hay gaps/correcciones/change requests.
- **COSMIC:** 6 CFP

## UC-AGT-RUP-COORDINATOR — rup-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills rup-* (inception, elaboration, construction, transition)
- **Trigger:** Agent(rup-coordinator, contexto) — cuando la metodología RUP está activa (flow=rup). Despacha las 4 fases iterativas con milestones LCO/LCA/IOC/PD.
- **Precondición:** Existe `.thyrox/registry/methodologies/rup.yml` y `now.md` con flow=rup (o methodology_step=null).
- **Flujo principal:** 1) invocación (E) → 2) lee `rup.yml` + `now.md::methodology_step` (R, R) → 3) presenta milestone objetivo + criterios; evalúa avanzar vs nueva iteración → 4) actualiza `now.md` (registra iteración) (W) → 5) retorna fase + milestone + opción A (avanzar) / B (nueva iteración) (X)
- **Flujo alterno:** Nueva iteración → mantener methodology_step en la misma fase, registrar número de iteración y qué falta.
- **Flujo de excepción:** Falta rup.yml → no puede rutear. Milestone no cumplido → no avanzar.
- **Postcondición:** now.md en rup:{fase}; al cierre emite `[rup-coordinator COMPLETED]` con N iteraciones y milestones LCO/LCA/IOC/PD.
- **Datos (OOIs):** rup.yml, now.md (R); now.md, artefactos rup-* (W)
- **Criterios de aceptación:** Given flow=rup, When se invoca, Then muestra milestone+criterios y ofrece avanzar solo si el milestone se cumple, o nueva iteración.
- **COSMIC:** 6 CFP

## UC-AGT-SKILL-GENERATOR — skill-generator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** bootstrap.py (invocador alterno)
- **Trigger:** Agent(skill-generator, lista de tecnologías) — cuando se quiere agregar soporte para una nueva tecnología o bootstrap.py inicializa el proyecto.
- **Precondición:** Existen YAML `registry/agents/{tech}-expert.yml` y template `registry/{categoria}/{tech}.skill.template.md`.
- **Flujo principal:** 1) invocación + lista de techs (E) → 2) lee YAML del agente + template + project-state.md (R, R, R) → 3) verifica idempotencia (skip si existe sin --force), extrae name/description/tools, sustituye PROJECT_NAME → 4) escribe `.claude/agents/{tech}-expert.md` (W) → 5) retorna resumen de creados/skipped (X)
- **Flujo alterno:** Archivo existe sin --force → reportar skip. Con --force → sobreescribir.
- **Flujo de excepción:** YAML no encontrado → mensaje de tech no soportada. Template no encontrado → crear sin sección de convenciones. PROJECT_NAME no encontrado → usar placeholder y advertir. Omitir siempre model/category/skill_template/system_prompt.
- **Postcondición:** Archivo(s) de agente generado(s) con frontmatter (name/description/tools) + body del template.
- **Datos (OOIs):** `{tech}-expert.yml`, template, project-state.md (R); `.claude/agents/{tech}-expert.md` (W)
- **Criterios de aceptación:** Given un YAML+template existentes, When se invoca, Then genera el agente (idempotente) omitiendo model/category/skill_template/system_prompt.
- **COSMIC:** 5 CFP

## UC-AGT-SP-COORDINATOR — sp-coordinator
- **Actor (FU):** Claude (orquestador) · **Secundarios:** skills sp-* (context, analysis, gaps, formulate, plan, execute, monitor, adjust)
- **Trigger:** Agent(sp-coordinator, contexto) — cuando la metodología Strategic Planning está activa (flow=sp). Despacha las 8 fases con tollgates y ciclos estratégicos.
- **Precondición:** `now.md` con flow=sp (o methodology_step=null para iniciar en sp:context).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `methodology_step` (R) → 3) verifica tollgate (mandato / PESTEL+SWOT+Five Forces / brechas / Strategy Map / BSC+Roadmap / hitos / review / ajustes) → 4) actualiza `now.md` (W) → 5) retorna fase + tollgate + opción de avanzar (X)
- **Flujo alterno:** En sp:adjust preguntar: Opción A cierre (Stage 11) o Opción B nuevo ciclo (retornar a sp:analysis, documentar en sp-cycle-history.md).
- **Flujo de excepción:** Artefacto de fase ausente → bloquear avance.
- **Postcondición:** now.md en sp:{fase}; al cierre emite `[sp-coordinator COMPLETED]` con N ciclos, KPIs X/Y e iniciativas completadas.
- **Datos (OOIs):** now.md (R); now.md, artefactos sp-* + sp-cycle-history.md (W)
- **Criterios de aceptación:** Given flow=sp, When se invoca, Then verifica tollgate y en sp:adjust ofrece cerrar o iniciar nuevo ciclo estratégico.
- **COSMIC:** 5 CFP

## UC-AGT-TASK-EXECUTOR — task-executor
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(task-executor, task-plan) — cuando hay un task-plan con checkboxes T-NNN y se quiere implementar la siguiente tarea pendiente.
- **Precondición:** Existe un task-plan.md en el WP activo con tareas `- [ ] [T-NNN]` sin bloqueos.
- **Flujo principal:** 1) invocación (E) → 2) escribe `now-task-executor.md` (status running) y lee el task-plan del WP más reciente (R) → 3) reclama la tarea (`[~]` + commit del claim), implementa el cambio → 4) edita archivos del proyecto + marca `[x]` en el task-plan (W) → 5) retorna estado de tareas completadas / errores (X)
- **Flujo alterno:** Ejecución paralela: si tarea en `[~]` (otro agente), pasar a la siguiente `[ ]`. Lecciones instructivas → mcp__thyrox-memory__store. Shell vía mcp__thyrox-executor__exec_cmd/exec_python.
- **Flujo de excepción:** Tarea falla → diagnosticar causa raíz, approach alternativo; si persiste → crear `context/errors/ERR-NNN-descripcion.md`. Tarea ambigua → preguntar antes de implementar.
- **Postcondición:** Cambios implementados, checkboxes `[x]` actualizados; al terminar el batch elimina `now-task-executor.md`.
- **Datos (OOIs):** task-plan, código del proyecto (R); código del proyecto, task-plan, now-task-executor.md, ERR-NNN (W)
- **Criterios de aceptación:** Given un task-plan con T-NNN pendientes, When se invoca, Then implementa exactamente la tarea, marca `[x]` y commitea claim+completion.
- **COSMIC:** 6 CFP

## UC-AGT-TASK-PLANNER — task-planner
- **Actor (FU):** Claude (orquestador) · **Secundarios:** sub-agentes vía Agent (delegación de análisis)
- **Trigger:** Agent(task-planner, trabajo nuevo) — cuando se planifica trabajo NUEVO desde cero (feature, bug fix, refactoring). NUNCA ejecuta. NO usar para consolidar análisis existente.
- **Precondición:** Existe un WP activo con `*-requirements-spec.md` o una descripción del trabajo del usuario.
- **Flujo principal:** 1) invocación (E) → 2) escribe `now-task-planner.md` y lee el WP activo + requirements-spec (R, R) → 3) descompone en tareas atómicas (5 criterios), identifica DAG y marca `[P]` paralelas → 4) crea/actualiza `{nombre-wp}-task-plan.md` (W) → 5) retorna task-plan con T-NNN trazables (X)
- **Flujo alterno:** Sin spec → usar descripción del usuario. Awareness de claims: solo sugerir tareas en `[ ]`, nunca `[~]`/`[x]`.
- **Flujo de excepción:** Trabajo ambiguo → preguntar antes de descomponer. Tarea >2h → subdividir. NUNCA escribir código ni modificar archivos del proyecto.
- **Postcondición:** task-plan.md con tareas atómicas, IDs únicos T-NNN, referencias (SPEC-N/R-N/ADR-N) y checkpoints de validación.
- **Datos (OOIs):** WP activo, requirements-spec (R); task-plan.md, now-task-planner.md (W)
- **Criterios de aceptación:** Given un spec o descripción, When se invoca, Then produce task-plan con tareas que cumplen los 5 criterios de atomicidad y DAG de dependencias, sin ejecutar nada.
- **COSMIC:** 6 CFP

## UC-AGT-TASK-SYNTHESIZER — task-synthesizer
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(task-synthesizer, outputs de análisis) — cuando se consolidan outputs de pattern-harvester/deep-dive en bloques listos para ejecutar. NO usar para planificación inicial desde cero.
- **Precondición:** Existen N archivos de análisis con propuestas de task y un task-plan actual con T-NNN.
- **Flujo principal:** 1) invocación + inputs (E) → 2) lee los archivos de análisis + task-plan actual (R, R) → 3) extrae propuestas, deduplica, asigna prioridad consolidada, construye DAG (detecta ciclos) y numera desde T-(N_max+1) en orden topológico → 4) escribe bloques de task-plan listos para insertar (W) → 5) retorna Sección A (bloques), B (DAG), C (descartados) (X)
- **Flujo alterno:** Propuestas complementarias al mismo archivo → mantener ambas en una sola edición. Ciclo A→B→A → romper por dependencia más débil.
- **Flujo de excepción:** Propuesta sin fuente de análisis → no agregar (no inventar). Nunca renumerar T-001..T-N existentes.
- **Postcondición:** Bloques de task-plan deduplicados, con T-NNN continuos, DAG completo y trazabilidad a fuentes.
- **Datos (OOIs):** archivos de análisis, task-plan actual (R); bloques de task-plan markdown (W)
- **Criterios de aceptación:** Given outputs de análisis, When se invoca, Then deduplica, numera continuando el plan existente y entrega DAG sin ciclos con fuentes citadas.
- **COSMIC:** 5 CFP

## UC-AGT-TECH-DETECTOR — tech-detector
- **Actor (FU):** Claude (orquestador) · **Secundarios:** bootstrap.py (invocador alterno)
- **Trigger:** Agent(tech-detector, proyecto) — cuando se quiere inicializar skills para un proyecto o bootstrap.py necesita conocer el stack presente.
- **Precondición:** Existe un repositorio con archivos de configuración/dependencias. (Read-only — sin Write/Edit.)
- **Flujo principal:** 1) invocación (E) → 2) Glob de archivos clave + lee archivos de dependencias + consulta `registry/agents/` (R, R, R) → 3) verifica señales por tecnología (confirmar/descartar) y lógica de skip → 4) (no escribe) → 5) retorna lista de tecnologías detectadas + skills disponibles/configurados + recomendación de bootstrap (X)
- **Flujo alterno:** Skill ya configurado (`.claude/agents/{tech}-expert.md` existe) → reportar skip. Señal ambigua → `? {tech} — señal débil`.
- **Flujo de excepción:** Sin archivos de configuración → lista vacía con archivos analizados.
- **Postcondición:** Lista de tecnologías detectadas y recomendación; sin artefacto persistente (W=0).
- **Datos (OOIs):** package.json/requirements.txt/docker-compose/tsconfig/registry/agents (R); ninguno (W=0)
- **Criterios de aceptación:** Given un repositorio, When se invoca, Then reporta cada tecnología con su señal de detección y lista qué archivos analizó.
- **COSMIC:** 4 CFP

## UC-AGT-THYROX-COORDINATOR — thyrox-coordinator
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(thyrox-coordinator, contexto) — cuando hay una metodología THYROX registrada activa que NO tiene coordinator dedicado (despachador genérico Patrón 5).
- **Precondición:** Existe `.thyrox/registry/methodologies/{flow}.yml`; `now.md` con flow (o null para intake).
- **Flujo principal:** 1) invocación (E) → 2) lee `now.md::flow` + `{flow}.yml` + `now.md::methodology_step` (R, R) → 3) resuelve transición según tipo de flujo (cyclic/sequential/iterative/non-sequential/conditional) → 4) actualiza `now.md` (flow/methodology_step) (W) → 5) retorna presentación estándar del paso + opciones disponibles (X)
- **Flujo alterno:** flow=null → Diagnóstico de Intake (5 preguntas) + lee `routing-rules.yml` → propone coordinator dedicado. Match múltiple → conflict_resolution; ambiguo → methodology-selection-guide.md.
- **Flujo de excepción:** Falta {flow}.yml o routing-rules.yml → no puede resolver transición/ruteo.
- **Postcondición:** now.md en {flow}:{step}; transición resuelta según el tipo de flujo del YAML.
- **Datos (OOIs):** now.md, {flow}.yml, routing-rules.yml (R); now.md (W)
- **Criterios de aceptación:** Given un flow registrado sin coordinator dedicado, When se invoca, Then lee el YAML dinámicamente y resuelve la transición según el tipo de flujo declarado.
- **COSMIC:** 7 CFP

## UC-AGT-WEBPACK-EXPERT — webpack-expert
- **Actor (FU):** Claude (orquestador)
- **Trigger:** Agent(webpack-expert, tarea) — cuando se trabaja con Webpack: configuración, optimización de bundles o resolución de módulos.
- **Precondición:** Existe un proyecto con Webpack o requerimiento de bundling.
- **Flujo principal:** 1) invocación + tarea (E) → 2) lee `webpack.config.*` y archivos relacionados (R) → 3) aplica convenciones (merge common/dev/prod, contenthash, loaders, splitChunks, HtmlWebpackPlugin/MiniCssExtractPlugin) → 4) escribe/edita config (W) → 5) retorna configuración + notas de optimización (X)
- **Flujo alterno:** Ejecuta build/analyze vía mcp__thyrox_executor__exec_cmd (webpack-bundle-analyzer, webpack --mode production); recupera contexto vía mcp__thyrox_memory__retrieve.
- **Flujo de excepción:** Errores comunes (Module not found, bundle grande, CSS prod, HMR) → diagnosticar según tabla de errores.
- **Postcondición:** webpack.config creado o editado con code splitting y resolución de módulos conforme a convenciones.
- **Datos (OOIs):** webpack.config.* (R); webpack.config.* (W)
- **Criterios de aceptación:** Given una tarea Webpack, When se invoca, Then produce config con mode explícito, contenthash en prod y splitChunks conforme a convenciones.
- **COSMIC:** 4 CFP

---

## Resumen capa D (29 agentes · 145 CFP)

26 agentes con Write (4–7 CFP) + 3 read-only (deep-review*, gate-consistency-evaluator,
tech-detector). Coordinators con schema `.yml` = 6 CFP; `thyrox-coordinator` = 7 (lee now.md +
`{flow}.yml` + routing-rules); tech-experts = 4. (*deep-review ya tiene Write tras TD-044.)

Fuente OBSERVABLE: los 29 agentes leídos uno a uno. CFP del baseline ÉPICA 44.

**Última actualización:** 2026-06-03 05:05:00
