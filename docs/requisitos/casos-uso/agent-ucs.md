```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 1.0.0
updated_at: 2026-06-03 04:24:00
```

# UCs de THYROX — Capa D: Agentes

> FSM = capa de sub-agentes (runtime de Claude vía Agent tool). 29 agentes = 29 procesos
> funcionales. **Usuario funcional:** Claude (orquestador) que invoca el agente. **Boundary:**
> llamada `Agent(...)` ↔ ejecución del sub-agente. **OOIs:** Input-Artifact (artefacto/corpus
> a analizar), WorkPackage/contexto, Report (output escrito), Result (mensaje/`output_key`
> de retorno).

## Dos patrones (fundamentados por capacidad de herramientas — OBSERVABLE)

Clasificación verificada con `grep` de `tools:` en cada `.claude/agents/*.md`:

| Patrón | Movimientos | CFP | Justificación |
|--------|-------------|-----|---------------|
| **Agente que escribe** (tiene Write/Edit) | E(invocación+task) + R(input) + R(WP/contexto) + W(report) + X(retorno) | **5** | produce un artefacto persistente |
| **Agente read-only** (sin Write/Edit) | E(invocación+task) + R(input) + R(contexto) + X(retorno) | **4** | solo retorna `output_key`/mensaje |

> Clasificación **INFERRED** (patrón anclado en 3 agentes leídos: `deep-dive`, `task-planner`,
> `gate-consistency-evaluator`; el resto por capacidad de Write/Edit OBSERVABLE).

## Roster de los 29 agentes (29 procesos funcionales)

| Agente | Patrón | CFP |
|--------|--------|-----|
| agentic-reasoning | escribe | 5 |
| agentic-validator | escribe | 5 |
| ba-coordinator | escribe | 5 |
| bpa-coordinator | escribe | 5 |
| cp-coordinator | escribe | 5 |
| deep-dive | escribe | 5 |
| deep-review | read-only | 4 |
| diagrama-ishikawa | escribe | 5 |
| dmaic-coordinator | escribe | 5 |
| gate-consistency-evaluator | read-only | 4 |
| lean-coordinator | escribe | 5 |
| mysql-expert | escribe | 5 |
| nodejs-expert | escribe | 5 |
| pattern-harvester | escribe | 5 |
| pdca-coordinator | escribe | 5 |
| pm-coordinator | escribe | 5 |
| postgresql-expert | escribe | 5 |
| pps-coordinator | escribe | 5 |
| react-expert | escribe | 5 |
| rm-coordinator | escribe | 5 |
| rup-coordinator | escribe | 5 |
| skill-generator | escribe | 5 |
| sp-coordinator | escribe | 5 |
| task-executor | escribe | 5 |
| task-planner | escribe | 5 |
| task-synthesizer | escribe | 5 |
| tech-detector | read-only | 4 |
| thyrox-coordinator | escribe | 5 |
| webpack-expert | escribe | 5 |
| **Σ Capa D (29 agentes)** | 26 escribe + 3 read-only | **142** |

Σ = 26×5 + 3×4 = 130 + 12 = **142 CFP**.

## Ejemplos detallados (anclas — OBSERVABLE)

### UC-AGT-DEEP-DIVE — análisis adversarial de artefacto
- **FU:** Claude (orquestador) · **Trigger:** `Agent(deep-dive, artefacto)`
- **Flujo:** 1) invocación + ref del artefacto (E) → 2) lee el artefacto (R) → 3) lee
  WP/contexto de calibración (R) → 4) escribe el reporte de capas adversariales (W) →
  5) retorna veredicto verdadero/falso/incierto (X).
- **CFP:** 5 (tools: Read/Glob/Grep/Bash/**Write**).

### UC-AGT-GATE-CONSISTENCY — evaluador de gate (read-only)
- **FU:** Claude (gate de Stage) · **Trigger:** `Agent(gate-consistency-evaluator, artefacto)`
- **Flujo:** 1) invocación + ref (E) → 2) lee el artefacto (R) → 3) lee decisiones/artefactos
  previos (R) → 4) retorna `output_key=consistencia` {claims_contradictorios, gate_pasa, …} (X).
- **CFP:** 4 (tools: Read/Glob/Grep — **sin Write**).

## Relación con Capa C (nota de no doble-conteo)

11 de estos agentes son `*-coordinator` (ba/bpa/cp/dmaic/lean/pdca/pm/pps/rm/rup/sp). Son el
**despachador** (router) de cada metodología — FSM distinto de los 62 *pasos* de Capa C (que
son el trabajo). Principio 6 permite medirlos por separado; se documenta la relación para no
interpretarlos como duplicados.

---

**Nota de medición:** Capa D = **142 CFP** [INFERRED por patrón + capacidad OBSERVABLE].
Refinamiento a OBSERVABLE puro: leer cada agente y contar R adicionales (corpus multi-input
como `pattern-harvester`/`task-synthesizer` → +1 R). El orden (≈142) es estable.

**Última actualización:** 2026-06-03 04:24:00
