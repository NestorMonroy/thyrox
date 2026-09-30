```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 3.0.0
updated_at: 2026-06-03 04:50:00
```

# UCs de THYROX — Capa A: Interfaz (comandos/skills)

> FSM = capa de interfaz. **Usuario funcional:** Ejecutor (persona). **Boundary:** persona
> ↔ comando/Skill. **OOIs comunes:** WorkPackage, SessionState (now.md), ROADMAP,
> Phase-Artifact, ADR, CHANGELOG, gitlog. Cada UC = un proceso funcional (la invocación).
>
> **v3.0.0 — UC formal:** cada UC tiene precondición, flujo principal (con E/X/R/W para
> trazar a COSMIC), flujo alterno, flujo de excepción, postcondición, datos y criterios de
> aceptación (Given/When/Then). La línea **COSMIC** conserva el CFP del baseline ÉPICA 44.
> Fuente OBSERVABLE: `.claude/commands/*.md` + `.claude/skills/workflow-*/SKILL.md`.

---

## UC-INT-01 — DISCOVER (crear WP, explorar problema)
- **Actor (FU):** Ejecutor · **Secundarios:** git (persistencia)
- **Trigger:** "quiero empezar / analizar X"
- **Precondición:** repo THYROX inicializado; puede o no haber WP previo cerrado (`now.md::current_work` null o de otra ÉPICA).
- **Flujo principal:**
  1. Ejecutor describe el problema (E)
  2. lee `now.md` + ROADMAP para conocer estado (R, R)
  3. crea el WP con timestamp real `date +%Y-%m-%d-%H-%M-%S` (W)
  4. escribe `discover/*-analysis.md` + risk-register + exit-conditions (W, W, W)
  5. actualiza `now.md` + ROADMAP (W, W)
  6. devuelve resumen del WP creado (X)
- **Flujo alterno:** problema trivial (<2h) → escala reducida (un solo `*-analysis.md`, sin risk-register formal).
- **Flujo de excepción:** ya hay WP activo sin cerrar → NO crear otro; preguntar si continuar el activo o cerrarlo primero (I-011).
- **Postcondición:** existe `work/<ts>-<nombre>/` con análisis inicial; `now.md::current_work` apunta a él; ROADMAP tiene la ÉPICA en curso.
- **Datos (OOIs):** WorkPackage (W), SessionState (R/W), ROADMAP (R/W), Phase-Artifact·analysis/risk/exit (W).
- **Criterios de aceptación:**
  - *Given* no hay WP activo, *When* el Ejecutor describe un problema, *Then* se crea un WP con timestamp del sistema y al menos un `discover/*-analysis.md`.
  - *Given* ya hay WP activo, *When* se pide DISCOVER, *Then* el sistema NO crea un segundo WP sin confirmación.
- **COSMIC:** 10 CFP.

## UC-INT-02 — MEASURE/BASELINE
- **Actor (FU):** Ejecutor · **Trigger:** "medir baseline"
- **Precondición:** WP activo con Phase 1 DISCOVER completo (`discover/*-analysis.md` existe).
- **Flujo principal:** 1) pide baseline (E) → 2) lee WP/DISCOVER (R) → 3) recopila métricas/datos (cálculo, 0) → 4) escribe `measure/*.md` (W) → 5) actualiza `now.md` (W) → 6) devuelve baseline (X).
- **Flujo alterno:** ya existe baseline reciente y confiable → documentarlo y proponer avanzar a ANALYZE.
- **Flujo de excepción:** sin datos medibles → marcar baseline como `[ESTIMACIÓN]` y registrar el gap en risk-register.
- **Postcondición:** existe `measure/*.md` con baseline y métricas de éxito.
- **Datos (OOIs):** Phase-Artifact·discover (R), Phase-Artifact·measure (W), SessionState (W).
- **Criterios de aceptación:** *Given* DISCOVER completo, *When* se pide MEASURE, *Then* se produce `measure/*.md` con al menos una métrica de baseline y su método de obtención.
- **COSMIC:** 5 CFP.

## UC-INT-03 — DIAGNOSE/ANALYZE
- **Actor (FU):** Ejecutor · **Trigger:** "analizar causa raíz"
- **Precondición:** WP activo con DISCOVER (y normalmente MEASURE) completos.
- **Flujo principal:** 1) pide análisis (E) → 2) lee DISCOVER + MEASURE (R, R) → 3) produce análisis causal (cálculo, 0) → 4) escribe `analyze/*.md` (W) → 5) actualiza `now.md` (W) → 6) devuelve hallazgos (X).
- **Flujo alterno:** múltiples dominios de análisis → domain subdirectories (`analyze/{dominio}/*.md`).
- **Flujo de excepción:** causa raíz no determinable con la evidencia → registrar como claim SPECULATIVE y NO usarlo de fundamento de gate (I-012).
- **Postcondición:** existe `analyze/*.md` con causas raíz clasificadas (PROVEN/INFERRED/SPECULATIVE).
- **Datos (OOIs):** Phase-Artifact·discover/measure (R), Phase-Artifact·analyze (W), SessionState (W).
- **Criterios de aceptación:** *Given* DISCOVER/MEASURE disponibles, *When* se pide ANALYZE, *Then* cada causa raíz tiene clasificación de evidencia.
- **COSMIC:** 6 CFP.

## UC-INT-04 — CONSTRAINTS
- **Actor (FU):** Ejecutor · **Trigger:** "documentar restricciones"
- **Precondición:** WP activo con al menos DISCOVER completo.
- **Flujo principal:** 1) pide constraints (E) → 2) lee fases previas (R) → 3) escribe `constraints/*.md` (W) → 4) actualiza `now.md` (W) → 5) devuelve restricciones (X).
- **Flujo alterno:** sin restricciones nuevas → documentar "sin constraints adicionales" y avanzar.
- **Flujo de excepción:** una restricción invalida el scope previsto → escalar a STRATEGY/PLAN para re-evaluar.
- **Postcondición:** existe `constraints/*.md` (técnicas, negocio, plataforma).
- **Datos (OOIs):** Phase-Artifact·previas (R), Phase-Artifact·constraints (W), SessionState (W).
- **Criterios de aceptación:** *Given* fases previas, *When* se pide CONSTRAINTS, *Then* cada restricción indica su categoría (técnica/negocio/plataforma) y su origen.
- **COSMIC:** 5 CFP.

## UC-INT-05 — STRATEGY
- **Actor (FU):** Ejecutor · **Trigger:** "decidir arquitectura"
- **Precondición:** WP activo con CONSTRAINTS completo.
- **Flujo principal:** 1) pide estrategia (E) → 2) lee constraints (R) → 3) investiga alternativas (cálculo, 0) → 4) escribe `solution-strategy.md` (W) → 5) actualiza `now.md` (W) → 6) devuelve decisión (X).
- **Flujo alterno:** decisión permanente del proyecto → además escribir un ADR en `decisions/` (+1 W).
- **Flujo de excepción:** alternativas equivalentes sin criterio de desempate → documentar trade-offs y pedir decisión al Ejecutor.
- **Postcondición:** existe `solution-strategy.md` con Key Ideas, Research y Decisions; ADR si aplica.
- **Datos (OOIs):** Phase-Artifact·constraints (R), Phase-Artifact·strategy (W), ADR (W opcional), SessionState (W).
- **Criterios de aceptación:** *Given* constraints documentados, *When* se pide STRATEGY, *Then* la decisión cita las alternativas evaluadas y el criterio de selección.
- **COSMIC:** 5 CFP (6 con ADR).

## UC-INT-06 — SCOPE/PLAN
- **Actor (FU):** Ejecutor · **Trigger:** "definir scope"
- **Precondición:** WP activo con STRATEGY aprobado.
- **Flujo principal:** 1) pide plan (E) → 2) lee strategy (R) → 3) escribe `plan.md` con in-scope/out-of-scope (W) → 4) actualiza ROADMAP (W) → 5) pide aprobación de scope (X) → 6) devuelve scope (re-display, 0).
- **Flujo alterno:** scope grande → dividir en sub-WPs o iteraciones.
- **Flujo de excepción:** scope rechazado en la aprobación → volver a STRATEGY.
- **Postcondición:** existe `plan.md` con in/out-scope explícitos; ROADMAP refleja el scope; gate de aprobación pendiente o aprobado.
- **Datos (OOIs):** Phase-Artifact·strategy (R), Phase-Artifact·plan (W), ROADMAP (W).
- **Criterios de aceptación:** *Given* STRATEGY aprobado, *When* se pide PLAN, *Then* `plan.md` lista explícitamente qué está fuera de scope.
- **COSMIC:** 5 CFP.

## UC-INT-07 — DESIGN/SPECIFY  (comando: `/thyrox:design`; alias `/thyrox:structure`)
- **Actor (FU):** Ejecutor · **Trigger:** "especificar requisitos"
- **Precondición:** WP activo con Phase 6 PLAN aprobado.
- **Flujo principal:** 1) pide spec (E) → 2) lee plan (R) → 3) escribe `requirements-spec.md` con Given/When/Then (W) → 4) corre spec-checklist (validación, 0) → 5) actualiza `now.md` (W) → 6) devuelve spec (X).
- **Flujo alterno:** WP complejo → además `design.md` (+1 W); WP simple → solo requirements-spec.
- **Flujo de excepción:** requisito ambiguo → marcar `[NEEDS CLARIFICATION]` y NO avanzar el gate hasta resolverlo.
- **Postcondición:** existe `requirements-spec.md` sin `[NEEDS CLARIFICATION]` y con spec-checklist al 100%.
- **Datos (OOIs):** Phase-Artifact·plan (R), Phase-Artifact·spec/design (W), SessionState (W).
- **Criterios de aceptación:** *Given* PLAN aprobado, *When* se pide DESIGN, *Then* cada requisito tiene acceptance criteria verificable; *And* `/thyrox:structure` produce el mismo artefacto que `/thyrox:design` (alias).
- **COSMIC:** 5 CFP.

## UC-INT-08 — PLAN EXECUTION/DECOMPOSE
- **Actor (FU):** Ejecutor · **Trigger:** "descomponer en tareas"
- **Precondición:** WP activo con Phase 7 DESIGN/SPECIFY aprobado.
- **Flujo principal:** 1) pide descomposición (E) → 2) lee spec (R) → 3) escribe `*-task-plan.md` con T-NNN + DAG + trazabilidad SPEC→tarea (W) → 4) actualiza `now.md` (W) → 5) devuelve tareas (X).
- **Flujo alterno:** tareas con dependencias paralelas → marcar el DAG con ramas concurrentes.
- **Flujo de excepción:** spec incompleta para descomponer → volver a DESIGN.
- **Postcondición:** existe `plan-execution/*-task-plan.md` (usando `plan-execution.md.template`) con T-NNN y su trazabilidad.
- **Datos (OOIs):** Phase-Artifact·spec (R), Phase-Artifact·task-plan (W), SessionState (W).
- **Criterios de aceptación:** *Given* DESIGN aprobado, *When* se pide DECOMPOSE, *Then* cada T-NNN traza a un SPEC y declara sus dependencias.
- **COSMIC:** 5 CFP.

## UC-INT-09 — PILOT/VALIDATE
- **Actor (FU):** Ejecutor · **Trigger:** "validar con piloto"
- **Precondición:** WP activo con Phase 8 PLAN EXECUTION aprobado (o spec con supuestos críticos).
- **Flujo principal:** 1) pide piloto (E) → 2) lee plan + spec (R, R) → 3) ejecuta PoC (cálculo, 0) → 4) escribe `pilot/*.md` (W) → 5) actualiza `now.md` (W) → 6) devuelve veredicto (X).
- **Flujo alterno:** PoC confirma supuesto → avanzar a EXECUTE; refuta → volver a STRATEGY.
- **Flujo de excepción:** PoC no concluyente → registrar riesgo y decidir con el Ejecutor si avanzar.
- **Postcondición:** existe `pilot/*.md` con veredicto (confirma/refuta) de los supuestos críticos.
- **Datos (OOIs):** Phase-Artifact·plan/spec (R), Phase-Artifact·pilot (W), SessionState (W).
- **Criterios de aceptación:** *Given* supuestos críticos, *When* se ejecuta PILOT, *Then* el veredicto indica confirma/refuta con evidencia OBSERVABLE.
- **COSMIC:** 6 CFP.

## UC-INT-10 — IMPLEMENT/EXECUTE
- **Actor (FU):** Ejecutor · **Secundarios:** git
- **Trigger:** "implementar tareas"
- **Precondición:** WP activo con Phase 8 (o 9) aprobado; existe `*-task-plan.md` con T-NNN pendientes.
- **Flujo principal:** 1) pide ejecutar (E) → 2) lee `task-plan` (R) → 3) toma siguiente T-NNN sin bloqueos (cálculo, 0) → 4) implementa el cambio (W Code) → 5) commitea Conventional (W gitlog) → 6) marca `[x]` en ROADMAP + execution-log (W, W) → 7) devuelve progreso (X).
- **Flujo alterno:** tarea bloqueada → marca `[-]` + registra el bloqueo en execution-log; toma la siguiente desbloqueada.
- **Flujo de excepción:** el cambio rompe un test/validación → revertir o corregir antes de commitear; no marcar `[x]`.
- **Postcondición:** el cambio de la T-NNN está commiteado; ROADMAP y execution-log reflejan el avance.
- **Datos (OOIs):** Phase-Artifact·task-plan (R), Code (W), gitlog (W), ROADMAP (W), execution-log (W).
- **Criterios de aceptación:** *Given* task-plan con T pendientes, *When* se ejecuta IMPLEMENT, *Then* el commit sigue Conventional Commits y el checkbox correspondiente queda `[x]` solo si el cambio existe.
- **COSMIC:** 7 CFP.

## UC-INT-11 — TRACK/EVALUATE
- **Actor (FU):** Ejecutor · **Trigger:** "¿cómo vamos? / cerrar"
- **Precondición:** WP activo con trabajo ejecutado (commits, artefactos).
- **Flujo principal:** 1) pide estado (E) → 2) lee ROADMAP + gitlog (R, R) → 3) calcula progreso/métricas (cálculo, 0) → 4) deriva/actualiza CHANGELOG (W) → 5) devuelve estado (X).
- **Flujo alterno:** evaluación vs baseline MEASURE → comparar métricas y documentar el delta.
- **Flujo de excepción:** progreso divergente del plan → registrar varianza y proponer ajuste de scope.
- **Postcondición:** CHANGELOG/estado reflejan el progreso real medible.
- **Datos (OOIs):** ROADMAP (R), gitlog (R), CHANGELOG (W).
- **Criterios de aceptación:** *Given* trabajo ejecutado, *When* se pide TRACK, *Then* el estado se calcula de gitlog/ROADMAP reales (no estimado).
- **COSMIC:** 5 CFP.

## UC-INT-12 — STANDARDIZE
- **Actor (FU):** Ejecutor · **Trigger:** "estandarizar / cerrar WP"
- **Precondición:** WP activo con TRACK completo y orden explícita de cierre (I-011).
- **Flujo principal:** 1) pide cierre (E) → 2) lee WP (R) → 3) escribe lessons + propaga a guidelines (W, W) → 4) actualiza ARCHITECTURE/decisiones (W, W) → 5) cierra WP: reset `now.md` (W) → 6) devuelve cierre (X).
- **Flujo alterno:** patrón reusable detectado → propagarlo como PAT-NNN a las guidelines.
- **Flujo de excepción:** sin orden explícita de cierre → NO cerrar (I-011); solo escribir lessons y esperar.
- **Postcondición:** lessons escritas; aprendizajes propagados; `now.md` reseteado; ROADMAP marca la ÉPICA completa.
- **Datos (OOIs):** WorkPackage (R), lessons (W), Guideline (W), ARCHITECTURE (W), decisions (W), SessionState (W).
- **Criterios de aceptación:** *Given* orden explícita de cierre, *When* se ejecuta STANDARDIZE, *Then* `now.md::current_work` queda null y existe el artefacto de lessons.
- **COSMIC:** 8 CFP.

## UC-INT-13 — AUDIT
- **Actor (FU):** Ejecutor · **Trigger:** "auditar el WP"
- **Precondición:** WP activo con trabajo a auditar.
- **Flujo principal:** 1) pide auditoría (E) → 2) lee task-plan + artefactos + gitlog (R, R, R) → 3) evalúa PASS/FAIL/PARTIAL (cálculo, 0) → 4) escribe `track/*-audit-report.md` (W) → 5) devuelve score + action plan (X).
- **Flujo alterno:** auditoría de cierre vs auditoría de cobertura → distinto foco, mismo formato.
- **Flujo de excepción:** hallazgo FAIL crítico → documentar (NO corregir; la corrección es tarea separada del Ejecutor).
- **Postcondición:** existe `track/*-audit-report.md` con score, grade y action plan ordenado.
- **Datos (OOIs):** Phase-Artifact·task-plan/artefactos (R), gitlog (R), audit-report (W).
- **Criterios de aceptación:** *Given* un WP, *When* se ejecuta AUDIT, *Then* cada FAIL/PARTIAL cita el path o commit que falta (verificar, no inferir).
- **COSMIC:** 6 CFP.

## UC-INT-14 — LOOP (ejecución continua)
- **Actor (FU):** Ejecutor · **Secundarios:** git
- **Trigger:** "/loop — auto-avanzar"
- **Precondición:** WP activo con `*-task-plan.md` y T-NNN pendientes ejecutables.
- **Flujo principal:** 1) activa loop (E) → 2) lee task-plan (R) → 3) ejecuta siguiente T-NNN (W Code) → 4) commitea (W gitlog) → 5) repite hasta gate humano (cálculo, 0) → 6) devuelve estado / para en gate (X).
- **Flujo alterno:** todas las T completas → reporta fin y propone TRACK/cierre.
- **Flujo de excepción:** gate humano alcanzado (SP-NNN) → STOP automático y esperar al Ejecutor.
- **Postcondición:** se ejecutaron N tareas hasta el primer gate; estado reportado.
- **Datos (OOIs):** Phase-Artifact·task-plan (R), Code (W), gitlog (W).
- **Criterios de aceptación:** *Given* un gate humano definido, *When* el loop lo alcanza, *Then* se detiene automáticamente sin ejecutar más allá del gate.
- **COSMIC:** 5 CFP.

## UC-INT-15 — INIT tech skills  (comando: `/thyrox:init`; alias `/workflow_init`)
- **Actor (FU):** Ejecutor · **Trigger:** "bootstrap del stack"
- **Precondición:** proyecto con archivos de configuración/dependencias detectables; ejecutar una sola vez por proyecto.
- **Flujo principal:** 1) pide init (E) → 2) detecta stack leyendo config del proyecto (R) → 3) genera tech skills (W) → 4) actualiza guidelines (W) → 5) devuelve skills generados (X).
- **Flujo alterno:** skills ya existen → preguntar si regenerar con `--force`.
- **Flujo de excepción:** tech sin template en el registry → advertir y usar solo `system_prompt` (ver TD-043).
- **Postcondición:** existen los tech skills del stack en `.claude/skills/` y sus guidelines.
- **Datos (OOIs):** config (R), tech-skill (W), Guideline (W).
- **Criterios de aceptación:** *Given* un stack detectable, *When* se ejecuta INIT, *Then* se generan skills solo para las techs detectadas.
- **COSMIC:** 5 CFP.

## UC-INT-16 — Spec-Driven Development
- **Actor (FU):** Ejecutor · **Trigger:** "especificar con DbC"
- **Precondición:** existe un requisito/UC con lógica de negocio a especificar.
- **Flujo principal:** 1) pide spec-driven (E) → 2) lee requisitos (R) → 3) escribe spec con tests (Given/When/Then) + contratos (precond/postcond/invariantes) (W) → 4) devuelve especificación (X).
- **Flujo alterno:** 3 niveles de rigor (Spec-First / Spec-Anchored / Spec-as-Source) según criticidad.
- **Flujo de excepción:** lógica trivial sin contratos aplicables → degradar a TDD puro (UC-INT-17).
- **Postcondición:** existe una spec con capa de tests y capa contractual.
- **Datos (OOIs):** requisitos (R), spec (W).
- **Criterios de aceptación:** *Given* lógica compleja, *When* se ejecuta spec-driven, *Then* la spec incluye precondiciones, postcondiciones e invariantes.
- **COSMIC:** 4 CFP.

## UC-INT-17 — Test-Driven Development
- **Actor (FU):** Ejecutor · **Trigger:** "specs Given/When/Then"
- **Precondición:** existe un requisito a convertir en acceptance criteria.
- **Flujo principal:** 1) pide TDD (E) → 2) lee requisito (R) → 3) escribe collaborative specs con flujos nominal/alterno/error (W) → 4) devuelve specs (X).
- **Flujo alterno:** infraestructura/config → specs de comportamiento traza sin contratos.
- **Flujo de excepción:** requisito sin comportamiento verificable → pedir clarificación antes de escribir.
- **Postcondición:** existen collaborative specs con los tres flujos.
- **Datos (OOIs):** requisito (R), specs (W).
- **Criterios de aceptación:** *Given* un requisito, *When* se ejecuta TDD, *Then* cada spec cubre flujo nominal, alterno y de error.
- **COSMIC:** 4 CFP.

## UC-INT-18 — DEEP-REVIEW
- **Actor (FU):** Ejecutor · **Secundarios:** agente deep-review
- **Trigger:** "revisar cobertura/referencias"
- **Precondición:** existen artefactos de fases consecutivas o una referencia externa a analizar; WP activo (para destino del review).
- **Flujo principal:** 1) pide deep-review (E) → 2) lee artefactos de fases N y N+1 / referencia externa (R, R) → 3) analiza cobertura/patrones (cálculo, 0) → 4) escribe review (W) → 5) devuelve hallazgos (X).
- **Flujo alterno:** Modo 2 (referencia externa) → extrae patrones sin sesgo de hipótesis previa.
- **Flujo de excepción:** sin WP activo → preguntar destino antes de escribir el review.
- **Postcondición:** existe `{current_work}/{topic}-deep-review.md` con gaps y recomendación.
- **Datos (OOIs):** Phase-Artifact·N/N+1 (R), review (W).
- **Criterios de aceptación:** *Given* dos fases consecutivas, *When* se ejecuta DEEP-REVIEW, *Then* cada gap cita archivo:línea de origen.
- **COSMIC:** 5 CFP.

## UC-INT-19 — Sugerir permisos
- **Actor (FU):** Ejecutor · **Trigger:** "reducir prompts"
- **Precondición:** existe transcript de la sesión actual con tool_uses de solo lectura repetidos.
- **Flujo principal:** 1) pide sugerencias (E) → 2) lee transcript de sesión (R) → 3) propone allowlist (cálculo, 0) → 4) devuelve entradas para `settings.json` (X).
- **Flujo alterno:** ya existe allowlist amplia → proponer solo entradas nuevas.
- **Flujo de excepción:** sin patrones repetidos suficientes → reportar que no hay recomendaciones.
- **Postcondición:** el Ejecutor recibe entradas propuestas para `permissions.allow` (no se auto-aplican).
- **Datos (OOIs):** transcript (R) → no persiste (solo X).
- **Criterios de aceptación:** *Given* tool_uses de solo lectura repetidos, *When* se ejecuta el comando, *Then* las entradas propuestas son solo de herramientas de solo lectura.
- **COSMIC:** 3 CFP.

## UC-INT-20 — COSMIC sizing
- **Actor (FU):** Ejecutor · **Trigger:** "medir tamaño funcional"
- **Precondición:** existen FUR/UCs o un SKILL/artefacto con flujo identificable.
- **Flujo principal:** 1) pide medición (E) → 2) lee FUR/UCs (R) → 3) mapea procesos funcionales + movimientos (cálculo, 0) → 4) escribe tabla COSMIC Format + total (W) → 5) devuelve CFP (X).
- **Flujo alterno:** sin granularidad para contar cada movimiento → estimación temprana `[ESTIMACIÓN TEMPRANA]` (Average FP).
- **Flujo de excepción:** mezcla de capas/niveles → separar por FSM (Principio 6) antes de contar.
- **Postcondición:** existe la tabla COSMIC con CFP por proceso y total por capa.
- **Datos (OOIs):** FUR/UCs (R), cosmic-table (W).
- **Criterios de aceptación:** *Given* FUR con granularidad, *When* se ejecuta COSMIC sizing, *Then* cada CFP se ancla en un paso del UC o sección del fuente (OBSERVABLE).
- **COSMIC:** 4 CFP.

---

**Resumen capa A:** 20 procesos funcionales · 108 CFP (baseline ÉPICA 44, conservado).
Fuente OBSERVABLE: `.claude/commands/` + `.claude/skills/workflow-*/`. Aliases verificados:
`structure`=`design` (UC-INT-07), `workflow_init`=`init` (UC-INT-15).

**Última actualización:** 2026-06-03 04:50:00
