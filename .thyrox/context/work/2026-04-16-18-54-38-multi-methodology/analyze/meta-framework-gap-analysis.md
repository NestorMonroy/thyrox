```yml
created_at: 2026-04-17 03:55:09
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
```

# Gap Analysis: THYROX Como Meta-Framework Orquestador

**Propósito:** Identificar la brecha entre la arquitectura actual (THYROX como ciclo de vida de 12 fases universal) y la arquitectura correcta (THYROX como Orchestration Layer + State Machine heterogéneo).

---

## 1. Estado Actual

### Cómo se posiciona THYROX hoy

THYROX se describe en `SKILL.md` como "Framework de gestión que sigue 12 fases propias (DISCOVER → STANDARDIZE)." Las 12 fases son la estructura organizadora principal, y todo WP las atraviesa. Los methodology skills (pdca, dmaic, rup, rm, pm, ba) se anidan *dentro* de esas 12 fases como sub-procesos opcionales. El encuadre actual es: THYROX ES el ciclo de vida; los methodology skills son add-ons que anclan a stages THYROX específicos.

La sección "Arquitectura de orquestación" establece explícitamente una jerarquía de dos niveles:
- **Level 1:** Workflow stages (los 12 stages THYROX) — ciclo de vida maestro
- **Level 2:** Methodology skills — sub-proceso opcional dentro de un stage

### Cómo se trackea el estado hoy

`now.md` tiene esta estructura plana:
```
stage: Stage 10 — IMPLEMENT
flow: null
methodology_step: null
```

Un campo `stage` para el stage THYROX. Un campo `flow` para la única metodología activa. Un campo `methodology_step` para el paso actual dentro de ese flow. **No hay estado por-coordinador. No hay grafo de dependencias de artefactos. No hay tracking multi-flow concurrente.**

### Cómo funcionan los coordinators hoy

Los 6 coordinators (`pmbok-coordinator`, `babok-coordinator`, `dmaic-coordinator`, `pdca-coordinator`, `rup-coordinator`, `rm-coordinator`) siguen el mismo patrón:
1. Leen `now.md` para ver `methodology_step`
2. Enrutan dentro de sus fases nativas
3. Escriben de vuelta `flow: {namespace}` y `methodology_step: {namespace}:{step}` a `now.md`
4. Al completar, proponen "Stage 11 TRACK/EVALUATE" — devuelven control a la secuencia THYROX

Los YAMLs en `.thyrox/registry/methodologies/` no tienen `native_phase_count` explícito, ni campos `produces:`, `consumes:`, ni `activation_trigger:`.

---

## 2. Estado Objetivo (Arquitectura Correcta)

```
THYROX = Deterministic Orchestrator
├── Orchestration Unit
│   ├── Task Planning: qué coordinator activar
│   ├── Phase Routing: respetar fases nativas (no imponer 12)
│   ├── State Machine Management: transiciones heterogéneas
│   └── Dependency Resolution: artifact BA ready → PM consumes
│
├── Coordinators (heterogeneous agents, native phases)
│   ├── pmbok-coordinator (5 fases nativas)
│   ├── babok-coordinator (6+ áreas, no-secuencial)
│   ├── dmaic-coordinator (5 fases, secuencial)
│   ├── pdca-coordinator (4 fases, cíclico)
│   ├── rup-coordinator (4 fases, iterativo)
│   └── rm-coordinator (5 fases, condicional)
│
└── Shared State Machine
    ├── Per-coordinator phase state (no estado THYROX-único)
    ├── Artifact registry (draft→review→approved→complete)
    ├── Dependency graph (artifact X ready → coordinator Y activa)
    └── Orchestration log (decisiones de ruteo)
```

**Principios clave:**
1. **State Machines > DAGs** para workflows heterogéneos (2026 research)
2. El orchestrator decide transiciones; los coordinators solo ejecutan
3. Comunicación phase-agnostic: "artifact listo → coordinator puede consumir" (no alineación de fases)
4. Cada metodología rastrea su propio conteo de fases nativo

---

## 3. Gaps (Delta)

### GAP-001: THYROX identity es "lifecycle" en lugar de "orchestrator"
**Severity: CRITICAL**
**Current:** `SKILL.md` abre con "Sigue 12 fases propias" como identidad primaria. Las 12 fases son el ciclo de vida maestro que contiene a las metodologías como sub-procesos.
**Needed:** THYROX se auto-describe como Orchestration Layer + State Machine. Los 12 stages se convierten en categorías de ruteo, no un lifecycle impuesto.
**Files:** `.claude/skills/thyrox/SKILL.md`, `.claude/CLAUDE.md`
**Effort:** M

---

### GAP-002: Modelo "methodology skills anclan a THYROX stages"
**Severity: CRITICAL**
**Current:** La tabla de methodology skills tiene columna "Stages de anclaje" (DMAIC→stages 2,3,10,11,12). `scalability.md` extiende esto con "Stages obligatorios por flow activo." Esto significa que DMAIC no puede correr si el WP no traversa esos stages THYROX.
**Needed:** Los coordinators se activan por el orchestrator basado en necesidades del proyecto + artifact readiness, no por qué stage THYROX está activo.
**Files:** `.claude/skills/thyrox/SKILL.md` (columna Stages de anclaje), `.claude/skills/workflow-discover/references/scalability.md` (tabla Stages obligatorios)
**Effort:** L

---

### GAP-003: `now.md` es una state machine flat de un solo flow
**Severity: CRITICAL**
**Current:** `now.md` tiene `stage`, `flow`, `methodology_step` como escalares planos. Solo una metodología puede estar "activa" a la vez. Si PMBOK está en `pm:planning` y BA necesita correr `ba:elicitation` simultáneamente, la estructura actual no puede representarlo.
**Needed:** Estructura que rastrea estado por-coordinador independientemente. Mínimo: una sección `coordinators:` con entradas como `pm: {step: pm:planning, status: active}` y `ba: {step: ba:elicitation, status: active}`.
**Files:** `.thyrox/context/now.md` (extensión de schema), nuevo `.thyrox/context/orchestration-state.md`
**Effort:** M

---

### GAP-004: No hay grafo de dependencias de artefactos ni signals de readiness
**Severity: HIGH**
**Current:** Los coordinators operan independientemente. No existe mecanismo para "BA elicitation artifact está ready → PM planning coordinator puede activarse."
**Needed:** Sistema de tracking de estado de artefactos. Cada artefacto producido tiene un estado: `draft → review → approved → complete`. Un coordinator que consume un artefacto verifica su estado antes de activarse.
**Files:** Nuevo `.thyrox/registry/artifact-dependencies.yml`, nuevo `{wp}/artifact-registry.md`, actualizaciones a coordinator agents
**Effort:** XL

---

### GAP-005: Los coordinators no saben que los otros existen
**Severity: HIGH**
**Current:** Cada coordinator lee `now.md`, hace su trabajo, escribe `now.md`, y propone "Stage 11 TRACK/EVALUATE." No tienen awareness de otros coordinators.
**Needed:** El orchestrator (thyrox-coordinator mejorado) conoce todos los coordinators registrados, su estado actual y sus outputs de artefactos.
**Files:** `.claude/agents/thyrox-coordinator.md` (rework mayor)
**Effort:** L

---

### GAP-006: YAMLs de metodología sin `native_phase_count`, `produces:`, `consumes:`
**Severity: HIGH**
**Current:** Los YAML definen `id`, `type`, `display`, `note`, `steps`/`areas`. Sin campos de interfaz con el orchestrator.
**Needed:** Cada YAML declara: `native_phase_count` (explícito), `produces:` (lista de artifact IDs que crea), `consumes:` (lista de artifact IDs que lee de otros coordinators), opcionalmente `activation_trigger:`.
**Files:** Los 7 YAML en `.thyrox/registry/methodologies/`
**Effort:** M

---

### GAP-007: `scalability.md` codifica el modelo de anclaje como regla dura
**Severity: HIGH**
**Current:** Tabla "Stages obligatorios por flow activo" (líneas 198-211) — producto directo del modelo de anclaje.
**Needed:** Reemplazar con política de activación de coordinators sin referencia a stages THYROX mandatorios.
**Files:** `.claude/skills/workflow-discover/references/scalability.md`
**Effort:** S

---

### GAP-008: Coordinators devuelven control a stages THYROX al completar
**Severity: MEDIUM**
**Current:** Cada coordinator termina con "Proponer Stage 11 TRACK/EVALUATE." Hardcodea dependencia del cierre del coordinator al ruteo de stages THYROX.
**Needed:** Coordinators reportan completion al orchestrator emitiendo un artifact-ready signal. El orchestrator decide qué sigue.
**Files:** Todos los coordinator agents en `.claude/agents/`
**Effort:** M

---

### GAP-009: No hay orchestration decision log
**Severity: MEDIUM**
**Current:** `now.md` captura el estado actual pero no las decisiones de ruteo del orchestrator — ¿por qué se activó PM antes que BA?
**Needed:** Log de orquestación ligero que registra activaciones de coordinators, eventos de artifact readiness, y decisiones de ruteo.
**Files:** Nuevo `{wp}/orchestration-log.md`
**Effort:** S

---

### GAP-010: `now.md::stage` acopla el progreso del WP a la secuencia de 12 stages
**Severity: MEDIUM**
**Current:** `stage: Stage 10 — IMPLEMENT` como indicador primario de progreso.
**Needed:** Separar el WP lifecycle tracking (`stage`) del coordinator execution tracking. Reportar progreso en términos significativos al usuario sin forzar mapeo a números de stage THYROX.
**Files:** `.thyrox/context/now.md`, `SKILL.md`
**Effort:** M

---

### GAP-011: No hay routing rules a nivel de registry
**Severity: MEDIUM**
**Current:** `.thyrox/registry/` no tiene reglas de ruteo. No existe archivo que diga "si tipo de proyecto es software iterativo → activar rup-coordinator."
**Needed:** `.thyrox/registry/routing-rules.yml` que el orchestrator lee para tomar decisiones de activación.
**Files:** Nuevo `.thyrox/registry/routing-rules.yml`
**Effort:** L

---

### GAP-012: `thyrox-coordinator` es un fallback genérico, no un orchestration engine
**Severity: MEDIUM**
**Current:** Maneja un solo flow activo, resuelve transiciones dentro de ese flow, actualiza los mismos campos planos de `now.md`. Es un runner genérico de un-solo-flow, no un orchestrator multi-coordinator.
**Needed:** El thyrox-coordinator necesita: (a) mantener estado para múltiples coordinators simultáneamente, (b) evaluar artifact readiness para decidir próxima activación, (c) manejar resolución de dependencias inter-coordinator, (d) presentar una vista unificada al usuario.
**Files:** `.claude/agents/thyrox-coordinator.md` (rewrite mayor)
**Effort:** L

---

### GAP-013: No hay artifact bus compartido con aislamiento por-coordinator
**Severity: LOW**
**Current:** Los coordinators usan `isolation: worktree`. No existe "shared artifact bus" — un coordinator en un worktree no tiene manera estructurada de señalar artifact readiness al contexto principal.
**Needed:** Convención de artifact bus: `{wp}/artifact-registry.md` con filas por artefacto (coordinator, archivo, estado, timestamp). Coordinators escriben completion signals; orchestrator lee.
**Files:** Nueva convención documentada en reference file, updates a coordinator agents
**Effort:** M

---

## 4. Roadmap de Implementación

### Fase 1: Core Architecture (state machine + orchestration engine)
- **1.1** Definir nuevo schema para `now.md` / `orchestration-state.md` (GAP-003, GAP-010)
- **1.2** Reescribir `thyrox-coordinator.md` como orchestration engine real (GAP-005, GAP-012)
- **1.3** Reescribir identidad de THYROX en `SKILL.md` y `CLAUDE.md` (GAP-001)

### Fase 2: Refactoring de Coordinators (fases nativas vs fases THYROX)
- **2.1** Remover "Proponer Stage N" de todos los coordinators → emitir artifact-ready signal (GAP-008)
- **2.2** Remover columna "Stages de anclaje" de la tabla de methodology skills (GAP-002)
- **2.3** Actualizar startup protocol de cada coordinator: leer estado por-coordinator + verificar artifact readiness (GAP-004, GAP-005)

### Fase 3: YAML / Registry
- **3.1** Agregar `native_phase_count` a todos los YAMLs (GAP-006)
- **3.2** Agregar `produces:` y `consumes:` a todos los YAMLs (GAP-006)
- **3.3** Crear `.thyrox/registry/routing-rules.yml` (GAP-011)
- **3.4** Actualizar `scalability.md` — remover tabla de Stages obligatorios (GAP-007)

### Fase 4: Communication Layer (artifact routing phase-agnostic)
- **4.1** Definir convención artifact bus: `{wp}/artifact-registry.md` (GAP-013)
- **4.2** Agregar orchestration log: `{wp}/orchestration-log.md` (GAP-009)
- **4.3** Actualizar coordinators para escribir a artifact-registry.md al completar (GAP-013, GAP-008)

---

## 5. Qué NO Debe Cambiar

Lo siguiente es arquitectónicamente correcto y debe preservarse:

1. **Taxonomía `type` en YAMLs** — `sequential`, `cyclic`, `iterative`, `non-sequential`, `conditional` — correcto.
2. **Fases nativas dentro de cada coordinator** — PDCA 4-step, RUP 4-phase con milestones LCO/LCA/IOC/PD, DMAIC 5-phase con tollgates, BABOK 6-area non-sequential, RM condicional, PMBOK 5 process groups — todos correctamente representan sus metodologías.
3. **`isolation: worktree` para coordinators** — Patrón correcto para ejecución paralela. Solo falta el artifact bus.
4. **Declaraciones `skills:` en coordinator agents** — `dmaic-coordinator.md` y `pdca-coordinator.md` declaran sus methodology skills vía arrays `skills:`. Patrón correcto.
5. **Conventional Commits, WP structure, timestamp conventions** — Infraestructura methodology-neutral, correcta.
6. **`thyrox-coordinator` como dynamic YAML reader** — El patrón core de leer un methodology YAML dinámicamente y resolver transiciones por `type` es sólido. El problema es el scope (single flow), no el patrón.
7. **Los 12 stages THYROX como vocabulario de ruteo** — Los stages pueden permanecer como etiquetas (DISCOVER, ANALYZE, STRATEGY, etc.) que el orchestrator usa para categorizar el tipo de trabajo, aunque ya no sean una secuencia mandatory.
8. **Gate model (Plano A) vs tool permissions (Plano B)** — El modelo de dos planos es correcto y methodology-neutral.
9. **Patrón `ba-progress.md` para metodologías no-secuenciales** — El coordinator BABOK manteniendo un `ba-progress.md` separado para trackear estado multi-área es exactamente el enfoque correcto. Debe generalizarse.
10. **`bootstrap.py` y `_generator.sh`** — Tooling interno del framework, no afectado por el cambio arquitectural.

---

## Resumen Ejecutivo de Gaps

| # | Severity | Descripción | Effort |
|---|----------|-------------|--------|
| GAP-001 | CRITICAL | THYROX identity = "lifecycle" no "orchestrator" | M |
| GAP-002 | CRITICAL | Methodology skills "anclan" a THYROX stages | L |
| GAP-003 | CRITICAL | `now.md` es flat single-flow, no per-coordinator | M |
| GAP-004 | HIGH | Sin grafo de dependencias de artefactos | XL |
| GAP-005 | HIGH | Coordinators no se conocen entre sí | L |
| GAP-006 | HIGH | YAMLs sin `native_phase_count`, `produces:`, `consumes:` | M |
| GAP-007 | HIGH | `scalability.md` hardcodea el modelo de anclaje | S |
| GAP-008 | MEDIUM | Coordinators devuelven control a THYROX stages | M |
| GAP-009 | MEDIUM | Sin orchestration decision log | S |
| GAP-010 | MEDIUM | `now.md::stage` acopla progreso a secuencia de 12 | M |
| GAP-011 | MEDIUM | Sin routing rules en registry | L |
| GAP-012 | MEDIUM | `thyrox-coordinator` es runner genérico, no orchestrator | L |
| GAP-013 | LOW | Sin artifact bus compartido | M |

**Total: 3 CRITICAL + 3 HIGH + 5 MEDIUM + 1 LOW = 12 gaps arquitecturales**
