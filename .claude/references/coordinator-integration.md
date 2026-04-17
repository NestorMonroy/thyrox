```yml
type: Referencia — Integración de Coordinators
category: Cross-phase
version: 1.0.0
purpose: Contrato de invocación, ciclo de vida y artefactos de los coordinators THYROX
updated_at: 2026-04-17 20:00:00
owner: thyrox (cross-phase)
```

# Coordinator Integration — Contrato y Ciclo de Vida

---

## Contrato de invocación

```
Invocación explícita:  @dmaic-coordinator
Invocación por skill:  /thyrox:dmaic  (si el command existe)
Routing automático:    routing-rules.yml detecta señales → activa coordinator
```

Al activarse, el coordinator:
1. Lee `now.md::stage` para verificar que el WP está en el stage correcto
2. Escribe `now.md::flow = {namespace}` y `now.md::methodology_step = {namespace}:primer-paso`
3. Crea un worktree aislado (`isolation: worktree`) para su ejecución
4. Emite los artefactos de su primer paso y espera confirmación para avanzar

---

## Campos `now.md` gestionados por coordinators

| Campo | Qué contiene | Ejemplo |
|-------|--------------|---------|
| `flow` | Namespace de la metodología activa | `dmaic` |
| `methodology_step` | Paso actual con prefijo namespace | `dmaic:analyze` |
| `coordinators` | Tracking de todos los coordinators activos/completados | ver formato abajo |

**Formato `coordinators` en `now.md`:**
```yaml
coordinators:
  dmaic-coordinator:
    status: active          # active | completed | paused
    started_at: 2026-04-17 10:00:00
    current_step: dmaic:analyze
    artifacts_produced:
      - dmaic-define.md
      - dmaic-measure.md
```

---

## Ciclo de vida de un coordinator

```
activate
  → coordinator escribe flow: + methodology_step: en now.md
  → crea worktree aislado (isolation: worktree)
  
steps (loop)
  → ejecuta el paso actual (methodology_step)
  → produce artefacto del paso
  → actualiza methodology_step al siguiente paso
  → espera confirmación humana (gate) si aplica
  
artifact-ready signal
  → coordinator emite señal cuando completa todos sus steps
  → orquestador puede activar otro coordinator o continuar con stages THYROX
  → coordinator actualiza status: completed en now.md::coordinators
  
cierre
  → flow: null
  → methodology_step: null
  → worktree se integra o descarta según resultado
```

---

## `isolation: worktree` — qué significa

Cada coordinator corre en un worktree de git separado del branch principal:
- Cambios del coordinator no contaminan el trabajo principal hasta integrarse
- Si el coordinator falla, el worktree se descarta sin efecto en main
- Múltiples coordinators pueden correr en paralelo en worktrees distintos
- Ver `advanced-features.md` para detalles de git worktrees

---

## Comportamientos no-lineales

### BABOK — No-secuencial
Las 6 knowledge areas de BABOK v3 no tienen orden fijo. El coordinator selecciona
la knowledge area más relevante según el contexto del WP, o presenta las 6 para que
el usuario elija.

```
Knowledge areas (cualquier orden):
  ba:planning              → Business Analysis Planning
  ba:elicitation           → Elicitation & Collaboration
  ba:requirements-lifecycle → Requirements Lifecycle Management
  ba:strategy              → Strategy Analysis
  ba:requirements-analysis → Requirements Analysis & Design Definition
  ba:solution-evaluation   → Solution Evaluation
```

### RM — State machine con retornos condicionales
```
elicitation → analysis → specification → validation → management
                ↑                              |
                └─── si gaps en análisis ──────┘ (validation→analysis si falla)
                                               |
                                    change requests → re-elicitation
```

### PPS — State machine con retornos condicionales
```
clarify → analyze → target → countermeasures → implement → evaluate
                                                               |
                            ←── si target no alcanzado ────────┘ (evaluate→analyze)
```

### RUP — Iterativo con milestones formales
```
inception   → [milestone LCO: Life Cycle Objectives]
elaboration → [milestone LCA: Life Cycle Architecture]
construction → [milestone IOC: Initial Operational Capability]
transition  → [milestone PD: Product Release]

Cada fase puede tener múltiples iteraciones antes de alcanzar su milestone.
```

### SP — Ciclo estratégico
```
context → analysis → formulate → plan → execute → monitor → gaps → adjust
                         ↑                                           |
                         └──────────────────── sp:adjust → sp:analysis ─┘
```

---

## Ejemplo paso a paso con dmaic-coordinator

```
1. Usuario: "Necesito reducir defectos en el proceso de facturación"

2. Routing automático detecta señal "defecto" + "proceso" → activa dmaic-coordinator

3. Coordinator escribe en now.md:
   flow: dmaic
   methodology_step: dmaic:define
   coordinators:
     dmaic-coordinator:
       status: active
       current_step: dmaic:define

4. Stage dmaic:define:
   → Produce: dmaic-define.md (project charter, SIPOC, problem statement)
   → Gate: confirmar scope antes de medir

5. Stage dmaic:measure:
   → methodology_step: dmaic:measure
   → Produce: dmaic-measure.md (data collection plan, baseline σ)

6. Stage dmaic:analyze:
   → methodology_step: dmaic:analyze
   → Produce: dmaic-analyze.md (fishbone, 5 whys, root causes)

7. Stage dmaic:improve:
   → methodology_step: dmaic:improve
   → Produce: dmaic-improve.md (solution design, pilot results)

8. Stage dmaic:control:
   → methodology_step: dmaic:control
   → Produce: dmaic-control.md (control plan, SPC charts)
   → Emite artifact-ready signal

9. Coordinator completa:
   flow: null
   methodology_step: null
   coordinators.dmaic-coordinator.status: completed
```

---

## Nota sobre YAMLs de registry

El campo interno en los archivos `.thyrox/registry/methodologies/*.yml` es `steps:` (no `phases:`).
Los steps listados en cada YAML corresponden exactamente a los valores válidos de `methodology_step`
para esa metodología.

```yaml
# Ejemplo: .thyrox/registry/methodologies/dmaic.yml
flow_type: sequential
namespace: dmaic
steps:
  - define
  - measure
  - analyze
  - improve
  - control
```

---

## Tabla de artefactos por coordinator

| Coordinator | Artefactos producidos |
|-------------|----------------------|
| `dmaic-coordinator` | dmaic-define.md, dmaic-measure.md, dmaic-analyze.md, dmaic-improve.md, dmaic-control.md |
| `pdca-coordinator` | pdca-plan.md, pdca-do.md, pdca-check.md, pdca-act.md |
| `pmbok-coordinator` | pm-initiating.md, pm-planning.md, pm-executing.md, pm-monitoring.md, pm-closing.md |
| `babok-coordinator` | ba-planning.md, ba-elicitation.md, ba-requirements-lifecycle.md, ba-strategy.md, ba-requirements-analysis.md, ba-solution-evaluation.md |
| `rup-coordinator` | rup-inception.md, rup-elaboration.md, rup-construction.md, rup-transition.md |
| `rm-coordinator` | rm-elicitation.md, rm-analysis.md, rm-specification.md, rm-validation.md, rm-management.md |
| `lean-coordinator` | lean-define.md, lean-measure.md, lean-analyze.md, lean-improve.md, lean-control.md |
| `bpa-coordinator` | bpa-identify.md, bpa-map.md, bpa-analyze.md, bpa-design.md, bpa-implement.md, bpa-monitor.md |
| `pps-coordinator` | pps-clarify.md, pps-analyze.md, pps-target.md, pps-countermeasures.md, pps-implement.md, pps-evaluate.md |
| `sp-coordinator` | sp-context.md, sp-analysis.md, sp-formulate.md, sp-plan.md, sp-execute.md, sp-monitor.md, sp-gaps.md, sp-adjust.md |
| `cp-coordinator` | cp-initiation.md, cp-structure.md, cp-diagnosis.md, cp-plan.md, cp-recommend.md, cp-implement.md, cp-evaluate.md |
