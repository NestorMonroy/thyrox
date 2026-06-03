```yml
created_at: 2026-06-03T04:00:00Z
project: THYROX
work_package: 2026-06-03-03-55-02-thyrox-ucs-cosmic
phase: Phase 7 — DESIGN/SPECIFY
author: NestorMonroy
status: Borrador
```

# UCs de THYROX — Capa A: Interfaz (comandos/skills)

> FSM = capa de interfaz. **Usuario funcional:** Ejecutor (persona). **Boundary:** persona
> ↔ comando/Skill. **OOIs (data groups) comunes:** WorkPackage, now.md (SessionState),
> ROADMAP, Artefacto-de-fase, ADR, gitlog. Cada UC = un proceso funcional (la invocación).
> Formato COSMIC-ready: pasos atómicos para mapear E/X/R/W después.

## UC-INT-01 — DISCOVER (crear WP, explorar problema)
- **FU:** Ejecutor · **Trigger:** "quiero empezar / analizar X"
- **Flujo:** 1) Ejecutor describe el problema → 2) lee `now.md`/ROADMAP (estado) → 3) crea
  el WP con timestamp → 4) escribe `discover/*-analysis.md` + risk-register + exit-conditions
  → 5) actualiza `now.md`/ROADMAP → 6) devuelve resumen del WP creado.
- **Alt:** problema trivial (<2h) → escala reducida.

## UC-INT-02 — MEASURE/BASELINE
- **FU:** Ejecutor · **Trigger:** "medir baseline"
- **Flujo:** 1) Ejecutor pide baseline → 2) lee WP/DISCOVER → 3) recopila métricas/datos →
  4) escribe `measure/*.md` → 5) actualiza estado → 6) devuelve baseline.

## UC-INT-03 — DIAGNOSE/ANALYZE
- **FU:** Ejecutor · **Trigger:** "analizar causa raíz"
- **Flujo:** 1) pide análisis → 2) lee DISCOVER/MEASURE → 3) produce análisis causal →
  4) escribe `analyze/*.md` → 5) actualiza estado → 6) devuelve hallazgos.

## UC-INT-04 — CONSTRAINTS
- **FU:** Ejecutor · **Trigger:** "documentar restricciones"
- **Flujo:** 1) pide constraints → 2) lee fases previas → 3) escribe `constraints/*.md` →
  4) actualiza estado → 5) devuelve restricciones.

## UC-INT-05 — STRATEGY
- **FU:** Ejecutor · **Trigger:** "decidir arquitectura"
- **Flujo:** 1) pide estrategia → 2) lee constraints → 3) investiga alternativas →
  4) escribe `solution-strategy.md` (+ ADR si aplica) → 5) actualiza estado → 6) devuelve decisión.

## UC-INT-06 — SCOPE/PLAN
- **FU:** Ejecutor · **Trigger:** "definir scope"
- **Flujo:** 1) pide plan → 2) lee strategy → 3) escribe `plan.md` (in/out scope) →
  4) actualiza ROADMAP → 5) pide aprobación de scope → 6) devuelve scope.

## UC-INT-07 — DESIGN/SPECIFY
- **FU:** Ejecutor · **Trigger:** "especificar requisitos"
- **Flujo:** 1) pide spec → 2) lee plan → 3) escribe `requirements-spec.md` (Given/When/Then)
  → 4) corre checklist → 5) actualiza estado → 6) devuelve spec.

## UC-INT-08 — PLAN EXECUTION/DECOMPOSE
- **FU:** Ejecutor · **Trigger:** "descomponer en tareas"
- **Flujo:** 1) pide descomposición → 2) lee spec → 3) escribe `task-plan.md` (T-NNN + DAG)
  → 4) actualiza estado → 5) devuelve tareas.

## UC-INT-09 — PILOT/VALIDATE
- **FU:** Ejecutor · **Trigger:** "validar con piloto"
- **Flujo:** 1) pide piloto → 2) lee plan/spec → 3) ejecuta PoC → 4) escribe `pilot/*.md`
  → 5) actualiza estado → 6) devuelve veredicto del piloto.

## UC-INT-10 — IMPLEMENT/EXECUTE
- **FU:** Ejecutor · **Trigger:** "implementar tareas"
- **Flujo:** 1) pide ejecutar → 2) lee `task-plan` → 3) toma siguiente T-NNN sin bloqueos →
  4) implementa el cambio → 5) commitea (Conventional) → 6) marca `[x]` en ROADMAP +
  execution-log → 7) devuelve progreso.
- **Alt:** tarea bloqueada → marca `[-]` + registra bloqueo.

## UC-INT-11 — TRACK/EVALUATE
- **FU:** Ejecutor · **Trigger:** "¿cómo vamos? / cerrar"
- **Flujo:** 1) pide estado → 2) lee ROADMAP + gitlog → 3) calcula progreso/métricas →
  4) deriva/actualiza CHANGELOG → 5) devuelve estado.

## UC-INT-12 — STANDARDIZE
- **FU:** Ejecutor · **Trigger:** "estandarizar / cerrar WP"
- **Flujo:** 1) pide cierre → 2) lee WP → 3) escribe lessons + propaga a guidelines →
  4) actualiza ARCHITECTURE/decisiones → 5) cierra WP (reset now.md) → 6) devuelve cierre.

## UC-INT-13 — AUDIT
- **FU:** Ejecutor · **Trigger:** "auditar el WP"
- **Flujo:** 1) pide auditoría → 2) lee task-plan + artefactos + gitlog → 3) evalúa
  PASS/FAIL/PARTIAL → 4) escribe `audit-report.md` → 5) devuelve score + action plan.

## UC-INT-14 — LOOP (ejecución continua)
- **FU:** Ejecutor · **Trigger:** "/loop — auto-avanzar"
- **Flujo:** 1) activa loop → 2) lee task-plan → 3) ejecuta siguiente T-NNN → 4) commitea →
  5) repite hasta gate humano → 6) devuelve estado / para en gate.

## UC-INT-15 — INIT tech skills
- **FU:** Ejecutor · **Trigger:** "bootstrap del stack"
- **Flujo:** 1) pide init → 2) detecta stack (lee config del proyecto) → 3) genera tech
  skills → 4) actualiza guidelines → 5) devuelve skills generados.

## UC-INT-16 — Spec-Driven Development
- **FU:** Ejecutor · **Trigger:** "especificar con DbC"
- **Flujo:** 1) pide spec-driven → 2) lee requisitos → 3) escribe spec (tests + contratos)
  → 4) devuelve especificación.

## UC-INT-17 — Test-Driven Development
- **FU:** Ejecutor · **Trigger:** "specs Given/When/Then"
- **Flujo:** 1) pide TDD → 2) lee requisito → 3) escribe collaborative specs → 4) devuelve specs.

## UC-INT-18 — DEEP-REVIEW
- **FU:** Ejecutor · **Trigger:** "revisar cobertura/referencias"
- **Flujo:** 1) pide deep-review → 2) lee artefactos de fases consecutivas / referencia externa
  → 3) analiza cobertura/patrones → 4) escribe review → 5) devuelve hallazgos.

## UC-INT-19 — Sugerir permisos
- **FU:** Ejecutor · **Trigger:** "reducir prompts"
- **Flujo:** 1) pide sugerencias → 2) lee transcript de sesión → 3) propone allowlist →
  4) devuelve entradas para settings.json.

## UC-INT-20 — COSMIC sizing
- **FU:** Ejecutor · **Trigger:** "medir tamaño funcional"
- **Flujo:** 1) pide medición → 2) lee FUR/UCs → 3) mapea procesos funcionales + movimientos
  → 4) escribe tabla COSMIC Format + total → 5) devuelve CFP.
- **Alt:** sin granularidad → estimación temprana `[ESTIMACIÓN TEMPRANA]`.

---

**Nota de medición:** la mayoría de UC-INT comparten el patrón **E**(petición) + **R**(estado/
WP) + **W**(artefacto de fase) + **W**(now/ROADMAP) + **X**(resumen) → ~5 CFP base; los que
commitean (UC-INT-10/14) añaden movimientos. Se medirá con el skill `cosmic` por proceso.

**Última actualización:** 2026-06-03T04:00:00Z
