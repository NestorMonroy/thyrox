```yml
created_at: 2026-04-16 19:32:39
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 5 — STRATEGY
author: NestorMonroy
status: Aprobado
```

# Solution Strategy — multi-methodology (ÉPICA 40)

---

## Problema que resuelve

THYROX soporta únicamente el flujo SDLC (12 stages propios). El usuario necesita
aplicar otras metodologías (PDCA, DMAIC, PMBOK, BABOK, RUP, RM) con la misma
infraestructura de WPs, artefactos, commits y observabilidad que ya tiene THYROX.

**Restricción central:** La plataforma Claude Code no permite hardcodear 79+ skills en
un solo agente coordinator — el overflow de contexto lo hace inviable (365k tokens vs
200k de ventana). La solución requiere distribución inteligente.

---

## Key Ideas

### KI-1 — Dos capas ortogonales: gestión vs ejecución

```
Capa A — GESTIÓN (THYROX, inmutable):
  ÉPICA N → WP → Stage 1..12 → T-NNN
  Responde a: "¿cómo organizamos el trabajo?"

Capa B — EJECUCIÓN (metodología activa, intercambiable):
  flow: pdca → pdca:plan → pdca:do → pdca:check → pdca:act
  Responde a: "¿qué pasos sigue la metodología?"
```

Un WP siempre vive en una Stage THYROX. Dentro de Stage 10 IMPLEMENT, la
metodología activa (Capa B) dicta qué pasos ejecutar. Las dos capas no se mezclan.

### KI-2 — Contrato de compatibilidad Patrón 3 → Patrón 5

El contrato que hace migrable la arquitectura sin reescribir skills:

```yaml
# now.md — estructura extendida
epic: ÉPICA 40 — multi-methodology
stage: Stage 10 — IMPLEMENT       # etapa THYROX del WP
flow: pdca                         # metodología activa
methodology_step: pdca:do          # paso actual de la metodología
```

**Regla:** `methodology_step` siempre tiene formato `{flow}:{step-id}`.
El coordinator (Patrón 3 o Patrón 5) lee este campo para saber dónde está.
Los skills individuales no necesitan conocer este campo — solo el coordinator lo usa.

### KI-3 — Patrón Markov aplicado al registry

Un LLM es formalmente equivalente a una cadena de Markov de orden k.
Sin THYROX: transiciones probabilísticas (el usuario puede hacer cualquier paso).
Con Registry YAML: transiciones determinísticas declaradas explícitamente.

```
LLM (Markov probabilístico)
  + methodology.yml (matriz de transición)
  + now.md::methodology_step (variable de estado)
  + artefactos WP (memoria externa)
  = Ejecución determinística de la metodología
```

### KI-4 — `monitors:` como enabler del Patrón 5

Descubierto en deep-review v2.1.111: `monitors:` en `plugin.json` permite que un
coordinator se auto-arme al inicio de sesión sin invocación explícita. Esto habilita
que el coordinator genérico del Patrón 5 esté siempre disponible como monitor de
background leyendo el YAML de la metodología activa en `now.md::flow`.

---

## Arquitectura elegida

### Corto plazo — Patrón 3: coordinator por metodología

```
.claude/agents/
├── sdlc-coordinator.md      ← ya existe implícitamente (thyrox skill)
├── pdca-coordinator.md      ← nuevo (Stage 2 de esta ÉPICA)
├── dmaic-coordinator.md     ← nuevo
├── pmbok-coordinator.md     ← nuevo
├── babok-coordinator.md     ← nuevo (flujo no-secuencial — lógica especial)
├── rup-coordinator.md       ← nuevo
└── rm-coordinator.md        ← nuevo
```

Cada coordinator:
- Declara sus skills de metodología en `skills:` (Level 1, ~100 tokens/skill)
- Tiene `isolation: worktree` para desarrollo paralelo real
- Tiene `background: true` para las metodologías de larga duración
- Usa `now.md::methodology_step` como variable de estado

**Fit por metodología:**

| Metodología | Tipo de flujo | Coordinator |
|-------------|--------------|-------------|
| PDCA | Cíclico (sin fin) | `pdca-coordinator` |
| DMAIC | Secuencial | `dmaic-coordinator` |
| PMBOK | Secuencial con fases superpuestas | `pmbok-coordinator` |
| BABOK | No-secuencial (grafo completo) | `babok-coordinator` ← lógica especial |
| RUP | Iterativo (4 fases × N iteraciones) | `rup-coordinator` |
| RM | Secuencial con retorno | `rm-coordinator` |

### Largo plazo — Patrón 5: State Machine con Registry YAML

```
.thyrox/registry/methodologies/
├── pdca.yml
├── dmaic.yml
├── pmbok.yml
├── babok.yml
├── rup.yml
└── rm.yml

.claude/agents/
└── thyrox-coordinator.md    ← UN coordinator genérico que lee los YAMLs
```

El coordinator genérico:
1. Lee `now.md::flow` → identifica metodología (ej: `pdca`)
2. Carga `.thyrox/registry/methodologies/pdca.yml`
3. Lee `now.md::methodology_step` → paso actual (ej: `pdca:do`)
4. Busca transiciones válidas en el YAML
5. Presenta al usuario el estado actual y los pasos siguientes
6. Al confirmar → actualiza `now.md::methodology_step`

**Agregar metodología #7:** crear 1 YAML. Zero cambios en infraestructura.

---

## Schema YAML del Registry

### Tipos de flujo y su schema

```yaml
# pdca.yml — tipo: cíclico
id: pdca
type: cyclic
display: "PDCA — Plan-Do-Check-Act"
steps:
  - id: pdca:plan
    display: "Plan — Identificar problema y planificar mejora"
    next: [pdca:do]
  - id: pdca:do
    display: "Do — Ejecutar el plan (escala pequeña)"
    next: [pdca:check]
  - id: pdca:check
    display: "Check — Verificar resultados vs objetivos"
    next: [pdca:act]
  - id: pdca:act
    display: "Act — Estandarizar o ajustar"
    next: [pdca:plan]   # ciclo sin fin
```

```yaml
# dmaic.yml — tipo: secuencial
id: dmaic
type: sequential
display: "DMAIC — Define-Measure-Analyze-Improve-Control"
steps:
  - id: dmaic:define
    display: "Define — Alcance del problema y objetivos"
    next: [dmaic:measure]
  - id: dmaic:measure
    display: "Measure — Baseline cuantitativo del proceso"
    next: [dmaic:analyze]
  - id: dmaic:analyze
    display: "Analyze — Causas raíz estadísticas"
    next: [dmaic:improve]
  - id: dmaic:improve
    display: "Improve — Implementar soluciones validadas"
    next: [dmaic:control]
  - id: dmaic:control
    display: "Control — Sostener las mejoras"
    next: []   # estado absorbente
```

```yaml
# babok.yml — tipo: no-secuencial (todas las áreas accesibles desde cualquier otra)
id: babok
type: non-sequential
display: "BABOK v3 — Business Analysis Body of Knowledge"
note: "No hay orden prescrito. El BA puede operar en cualquier knowledge area."
steps:
  - id: babok:planning
    display: "BA Planning & Monitoring"
    next: [babok:elicitation, babok:lifecycle, babok:strategy, babok:analysis, babok:evaluation]
  - id: babok:elicitation
    display: "Elicitation & Collaboration"
    next: [babok:planning, babok:lifecycle, babok:strategy, babok:analysis, babok:evaluation]
  - id: babok:lifecycle
    display: "Requirements Life Cycle Management"
    next: [babok:planning, babok:elicitation, babok:strategy, babok:analysis, babok:evaluation]
  - id: babok:strategy
    display: "Strategy Analysis"
    next: [babok:planning, babok:elicitation, babok:lifecycle, babok:analysis, babok:evaluation]
  - id: babok:analysis
    display: "Requirements Analysis & Design Definition"
    next: [babok:planning, babok:elicitation, babok:lifecycle, babok:strategy, babok:evaluation]
  - id: babok:evaluation
    display: "Solution Evaluation"
    next: [babok:planning, babok:elicitation, babok:lifecycle, babok:strategy, babok:analysis]
```

```yaml
# problema-solving-8.yml — tipo: condicional (si falla, regresa)
id: ps8
type: conditional
display: "Problem Solving 8-Step"
steps:
  - id: ps8:clarify
    display: "Clarify — Entender el problema"
    next: [ps8:breakdown]
  - id: ps8:breakdown
    display: "Breakdown — Descomponer el problema"
    next: [ps8:target]
  - id: ps8:target
    display: "Target — Establecer objetivo de mejora"
    next: [ps8:rootcause]
  - id: ps8:rootcause
    display: "Root Cause — Análisis de causa raíz"
    next: [ps8:countermeasure]
  - id: ps8:countermeasure
    display: "Countermeasure — Desarrollar contramedidas"
    next: [ps8:implement]
  - id: ps8:implement
    display: "Implement — Ejecutar contramedidas"
    next: [ps8:evaluate]
  - id: ps8:evaluate
    display: "Evaluate — Verificar resultados"
    next:
      on_success: [ps8:standardize]
      on_failure: [ps8:rootcause]   # regresa si no resuelve
  - id: ps8:standardize
    display: "Standardize — Estandarizar la solución"
    next: []
```

---

## Decisions

### D-1: Patrón 3 primero, Patrón 5 cuando haya ≥3 coordinators funcionando

Implementar Patrón 3 (coordinators individuales) antes de Patrón 5 (coordinator genérico)
porque permite validar el contrato `methodology_step` con casos reales antes de abstraerlo.
El Patrón 5 se inicia en Stage 8 PLAN EXECUTION de esta misma ÉPICA — se diseña en paralelo,
no después.

### D-2: PDCA + DMAIC como primer par de implementación

PDCA y DMAIC son los más simples (flujo secuencial/cíclico, sin ramificación) y los más
utilizados. Implementarlos primero valida la infraestructura base. BABOK va al final por
su lógica no-secuencial que requiere el coordinator más complejo.

**Orden de implementación:**
1. PDCA (cíclico, 4 pasos) — más simple
2. DMAIC (secuencial, 5 pasos) — valida flujo lineal
3. RUP (iterativo, 4 fases × iteraciones) — valida loops
4. RM (secuencial con retorno, 5 pasos) — valida condicionales simples
5. PMBOK (secuencial con fases superpuestas, 5 fases) — valida complejidad media
6. BABOK (no-secuencial, 6 knowledge areas) — el más complejo, último

### D-3: Registry YAML se diseña en Stage 6 SCOPE, no en Stage 10 IMPLEMENT

El schema YAML del registry debe estar definido antes de implementar el primer coordinator.
Los coordinators del Patrón 3 son diseñados para ser reemplazables por el coordinator
genérico del Patrón 5 sin cambios en los skills. Esto requiere que el schema sea estable
desde el inicio.

### D-4: `WorktreeCreate` hook antes de los coordinators

GAP-007 (`WorktreeCreate`/`WorktreeRemove` no en hooks.json) bloquea el testing de
idempotencia de coordinators con `isolation: worktree`. Se implementa en Stage 10
IMPLEMENT como primera tarea, antes de cualquier coordinator.

### D-5: `now.md` mantiene retrocompatibilidad con campo `phase`

El campo `phase` existente en `now.md` se renombra a `stage` de forma incremental.
Durante la transición, ambos campos coexisten. Los hooks que leen `phase` se actualizan
cuando se toca ese componente.

---

## Infraestructura nueva requerida

| Componente | Cambio | Prioridad |
|-----------|--------|-----------|
| `now.md` | Agregar `stage`, `flow`, `methodology_step` | Alta — Stage 6 SCOPE |
| `.thyrox/registry/methodologies/` | Crear directorio + YAMLs iniciales | Alta — Stage 6 SCOPE |
| `hooks/hooks.json` | Agregar `WorktreeCreate`/`WorktreeRemove` | Alta — Stage 10 primera tarea |
| `.claude/agents/pdca-coordinator.md` | Coordinator PDCA con `isolation: worktree` | Alta — Stage 10 |
| `.claude/agents/dmaic-coordinator.md` | Coordinator DMAIC | Alta — Stage 10 |
| `.claude/agents/pmbok-coordinator.md` | Coordinator PMBOK | Media — Stage 10 |
| `.claude/agents/babok-coordinator.md` | Coordinator BABOK (lógica especial) | Media — Stage 10 |
| `.claude/agents/rup-coordinator.md` | Coordinator RUP | Media — Stage 10 |
| `.claude/agents/rm-coordinator.md` | Coordinator RM | Media — Stage 10 |
| `.claude/agents/thyrox-coordinator.md` | Coordinator genérico Patrón 5 | Baja — Stage 10 last |
| `session-start.sh` | Soporte para `methodology_step` en display | Media — Stage 10 |

---

## Riesgos actualizados

| ID | Riesgo | Mitigación en esta estrategia |
|----|--------|-------------------------------|
| R-001 | `skills:` en agente no documentado en plugin-dev | Testear con coordinator PDCA antes de escalar. Usar solo campos confirmados por CHANGELOG. |
| R-002 | 79 skills sin descriptions precisas → routing falla | Escribir 1 coordinator completo (PDCA) como plantilla antes de los demás. Validar auto-triggering. |
| R-003 | Contrato `methodology_step` roto al migrar Patrón 3 → 5 | D-3: schema YAML definido en Stage 6, antes de cualquier coordinator. |
| R-004 | BABOK no-secuencial rompe modelo lineal | D-2: BABOK es el último. Coordinator especial con lógica de routing en lenguaje natural. |

---

## Referencia cruzada

- `discover/multi-methodology-analysis.md` — contexto y análisis de referencia
- `adr-thyrox-terminology-epic-stage.md` — decisión de naming ÉPICA/Stage
- `architecture-patterns/multi-methodology-patterns-analysis.md` (ÉPICA 39) — análisis v2.0 de los 5 patrones
- `architecture-patterns/markov-probabilistic-registry-design.md` (ÉPICA 39) — fundamento Markov chains
