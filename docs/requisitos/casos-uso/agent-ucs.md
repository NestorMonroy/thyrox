```yml
Tipo: Requisitos — Casos de Uso (FUR)
project: THYROX
status: Borrador
version: 2.0.0
updated_at: 2026-06-03 04:40:00
```

# UCs de THYROX — Capa D: Agentes

> FSM = capa de sub-agentes (runtime de Claude vía Agent tool). 29 agentes = 29 procesos
> funcionales. **Usuario funcional:** Claude (orquestador) que invoca el agente. **Boundary:**
> llamada `Agent(...)` ↔ ejecución del sub-agente. **OOIs:** Input-Artifact (artefacto/corpus
> a analizar), WorkPackage/contexto, schema `.yml`, Report (output escrito), Result
> (mensaje/`output_key` de retorno).

> **v2.0.0 — medición OBSERVABLE:** se leyó cada agente uno a uno (frontmatter `tools:` +
> cuerpo). El conteo **no es uniforme**: rango **4–7 CFP** según cuántos inputs distintos
> lee y cuántos outputs escribe. Total **145 CFP** (antes 142 [estimado]).

## Movimientos por agente (conteo real)

- **E** = invocación con la tarea/ref (1, siempre). **X** = retorno al orquestador (1, siempre).
- **R** = cada input persistente distinto (artefacto/corpus, WP/`now.md`, schema `.yml`,
  decisiones). Un corpus multi-archivo del mismo OOI = 1 R.
- **W** = cada output persistente distinto (reporte + estado), **solo si** el agente tiene
  Write/Edit en `tools:`.

## Roster de los 29 agentes (29 procesos funcionales — OBSERVABLE)

| Agente | Write? | E·R·W·X | CFP |
|--------|--------|---------|-----|
| agentic-reasoning | sí | 1·2·1·1 | 5 |
| agentic-validator | sí | 1·1·1·1 | 4 |
| ba-coordinator | sí | 1·2·2·1 | 6 |
| bpa-coordinator | sí | 1·1·2·1 | 5 |
| cp-coordinator | sí | 1·1·2·1 | 5 |
| deep-dive | sí | 1·2·1·1 | 5 |
| deep-review | **no** ⚠ | 1·3·0·1 | 5 |
| diagrama-ishikawa | sí | 1·1·1·1 | 4 |
| dmaic-coordinator | sí | 1·1·2·1 | 5 |
| gate-consistency-evaluator | no | 1·3·0·1 | 5 |
| lean-coordinator | sí | 1·1·2·1 | 5 |
| mysql-expert | sí | 1·1·1·1 | 4 |
| nodejs-expert | sí | 1·1·1·1 | 4 |
| pattern-harvester | sí | 1·2·1·1 | 5 |
| pdca-coordinator | sí | 1·1·2·1 | 5 |
| pm-coordinator | sí | 1·2·2·1 | 6 |
| postgresql-expert | sí | 1·1·1·1 | 4 |
| pps-coordinator | sí | 1·1·2·1 | 5 |
| react-expert | sí | 1·1·1·1 | 4 |
| rm-coordinator | sí | 1·2·2·1 | 6 |
| rup-coordinator | sí | 1·2·2·1 | 6 |
| skill-generator | sí | 1·2·1·1 | 5 |
| sp-coordinator | sí | 1·1·2·1 | 5 |
| task-executor | sí | 1·2·2·1 | 6 |
| task-planner | sí | 1·2·2·1 | 6 |
| task-synthesizer | sí | 1·2·1·1 | 5 |
| tech-detector | no | 1·2·0·1 | 4 |
| thyrox-coordinator | sí | 1·3·2·1 | 7 |
| webpack-expert | sí | 1·1·1·1 | 4 |
| **Σ Capa D (29 agentes)** | 26 sí + 3 no | | **145** |

**Notas del conteo OBSERVABLE:**
- Coordinators con schema externo (`ba`,`pm`,`rm`,`rup`) leen `{x}.yml` + `now.md` = 2 R → 6 CFP.
  `thyrox-coordinator` lee 3 (`now.md` + `{flow}.yml` + `routing-rules.yml`) → 7 CFP.
- Agentes de corpus (`pattern-harvester`, `task-synthesizer`) leen corpus(1 OOI) + task-plan(1) = 2 R.
- ⚠ **`deep-review` defecto:** el cuerpo pide "escribir review" pero `tools:` NO incluye
  Write/Edit (solo Read/Glob/Grep/Bash) → W=0. Inconsistencia real del agente, registrada
  como deuda técnica. Medido según lo declarado en `tools:` (W=0, los 3 R lo dejan en 5 CFP).

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

**Nota de medición:** Capa D = **145 CFP** [OBSERVABLE] en 29 agentes (media 5.0 CFP/agente,
rango 4–7). Conteo verificado leyendo cada agente. La estimación previa (142) quedó a −3 del
real. Hallazgo colateral: `deep-review` con `tools:` incompleto (deuda técnica).

**Última actualización:** 2026-06-03 04:40:00
