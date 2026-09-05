```yml
type: Análisis Arquitectónico
work_package: 2026-04-08-02-05-03-context-hygiene
created_at: 2026-04-08 02:05:03
purpose: Evaluar si la distinción SKILL vs AGENT es correcta y si aplica al estado actual del proyecto
```

# Análisis: SKILL vs AGENTE — ¿es correcta la distinción y qué implica?

## La distinción: ¿es correcta?

**Sí, es correcta en la teoría Anthropic.** Pero en Claude Code hay una capa adicional que cambia las implicaciones prácticas.

---

## Los 3 mecanismos en Claude Code (no 2)

El documento de referencia describe SKILL vs AGENTE. En Claude Code existen **3 mecanismos distintos**:

| Mecanismo | Ubicación | Cómo se activa | Qué hace |
|-----------|-----------|---------------|----------|
| **SKILL** | `.claude/skills/` | Skill tool — inyecta en contexto | Instrucciones + conocimiento de dominio |
| **AGENT nativo** | `.claude/agents/` | Agent tool — subproceso independiente | Ejecuta trabajo autónomamente |
| **COMMAND** | `.claude/commands/` | Slash command `/nombre` | Shortcut de usuario para operaciones comunes |

**La distinción del documento describe SKILL vs AGENT del SDK general.** En Claude Code, un SKILL no llama herramientas — es texto que se inyecta en el contexto de Claude. Un agente es un subproceso separado.

---

## ¿Dónde viola pm-thyrox la definición de SKILL?

Según la definición formal, un SKILL debería ser:

| Criterio | Definición | pm-thyrox actual |
|---------|-----------|-----------------|
| **Responsabilidad** | Una sola cosa | ✗ Orquesta 7 fases — múltiples responsabilidades |
| **Triggering** | Automático por descripción match | ✓ Se activa cuando el usuario quiere gestionar trabajo |
| **Entrada/Salida** | Bien definida | ✗ Acepta cualquier tarea de PM, produce cualquier artefacto |
| **Decisión** | No toma decisiones | ✗ Decide qué agente invocar, qué fase ejecutar, qué artefacto crear |
| **Reutilización** | Agnóstico del dominio | Parcial — funciona en cualquier proyecto pero no es atómico |

**pm-thyrox hace trabajo de AGENTE (orquestador) pero está implementado como SKILL (instrucciones inyectadas).** Esto es una mismatch arquitectónica real.

---

## Por qué ocurrió esta mismatch

En Claude Code, no existe un mecanismo nativo de "agente que llama a SKILLs via tool calls". Las opciones son:
- SKILL → texto inyectado en contexto de Claude principal
- AGENT → subproceso que Claude principal lanza con `Agent()`

Para tener lógica de orquestación accesible sin lanzar un subproceso por cada sesión, la única opción viable es un SKILL. Es una **limitación arquitectónica de Claude Code**, no un error de diseño del equipo.

---

## El hallazgo crítico: workflow_* ya existen

Al revisar el repositorio, se encontraron **8 comandos en `.claude/commands/`** que ya implementan fases específicas:

```
workflow_analyze.md    → Phase 1: ANALYZE
workflow_strategy.md   → Phase 2: SOLUTION_STRATEGY
workflow_plan.md       → Phase 3: PLAN
workflow_structure.md  → Phase 4: STRUCTURE
workflow_decompose.md  → Phase 5: DECOMPOSE
workflow_execute.md    → Phase 6: EXECUTE
workflow_track.md      → Phase 7: TRACK
workflow_init.md       → Bootstrap de Tech Skills
```

Estos commands son **phase-specific entry points** que ya hacen lo que TD-005 propone como "Agent-Phase-X". El proyecto **ya está parcialmente en la arquitectura correcta** sin haberlo formalizado.

---

## Estado real de la arquitectura actual

```
USUARIO
  │
  ├─ Activa: pm-thyrox SKILL      → orquestación completa (7 fases)
  │          (monolítico, ~422 líneas)
  │
  ├─ Invoca: /workflow_analyze    → Phase 1 específica (52 líneas)
  │          /workflow_plan       → Phase 3 específica (39 líneas)
  │          /workflow_execute    → Phase 6 específica (46 líneas)
  │          ... etc.
  │
  └─ Lanza:  task-executor AGENT  → ejecuta una tarea del plan
             task-planner AGENT   → descompone trabajo en tareas
             tech-detector AGENT  → detecta stack tecnológico
             Explore AGENT        → investiga el codebase
```

**Lo correcto:**
- Tech skills (react, nodejs, postgresql, webpack, mysql) → ✓ correctamente como SKILLs (atómicos, un dominio)
- task-executor, task-planner, tech-detector → ✓ correctamente como AGENTEs nativos (subprocesos independientes)
- workflow_* commands → ✓ correctamente como phase-specific commands (atómicos, una fase)

**Lo incorrecto:**
- pm-thyrox SKILL → ✗ hace trabajo de AGENTE orquestador, implementado como SKILL

---

## La arquitectura correcta para Claude Code

No es la que propone el documento (Agent-Phase-X como agentes nativos). Es la que **ya existe parcialmente**:

```
ARQUITECTURA OBJETIVO (ya 70% implementada)

Claude principal + pm-thyrox SKILL (thin orchestrator)
    │  pm-thyrox solo hace: orientar al usuario a la fase correcta
    │  No contiene lógica de cada fase
    │
    ├─ Usuario invoca: /workflow_analyze
    │     → Phase 1 completa con toda su lógica
    │
    ├─ Usuario invoca: /workflow_plan
    │     → Phase 3 completa con toda su lógica
    │
    ├─ Claude lanza: Agent(task-executor)
    │     → Ejecuta tarea T-NNN de forma autónoma
    │
    └─ Claude lanza: Agent(Explore)
          → Investiga codebase de forma autónoma
```

**El cambio pendiente:** pm-thyrox SKILL debería volverse un thin orchestrator que **délega** a workflow_* commands en lugar de contener toda la lógica de las 7 fases.

---

## Evaluación de las 5 alternativas con este contexto

| Alternativa | Estado | Evaluación |
|------------|--------|-----------|
| A) Monolithic SKILL (actual) | Implementado | Funciona pero viola definición de SKILL; crece con cada FASE |
| B) SKILL orquestador + Agent-Phase-X | Parcialmente implementado | workflow_* YA existen como commands; falta hacer pm-thyrox thin |
| C) Multi-Agent sin SKILL central | No implementado | Descartado — sin orquestador, ¿quién coordina? |
| D) Hybrid + CSP | No implementado | Overkill; CSP ya existe implícitamente en las instrucciones |
| E) Event-Driven | No implementado | Descartado — constraint Claude Code |

**La alternativa B ya está 70% implementada.** El 30% restante es hacer pm-thyrox más delgado.

---

## ¿Qué hay que corregir y cuándo?

### Corrección correcta (no un overhaul)

**Problema:** pm-thyrox SKILL contiene la lógica completa de las 7 fases.
**Solución:** pm-thyrox delega a workflow_* commands; la lógica de cada fase vive en el command correspondiente.

**Cambio concreto:**
- pm-thyrox SKILL: mantener solo la descripción, los principios core, la tabla de escalabilidad, y la referencia a workflow_* commands
- workflow_analyze.md: contiene la lógica completa de Phase 1 (actualmente en pm-thyrox)
- workflow_plan.md: contiene la lógica completa de Phase 3 (actualmente en pm-thyrox)
- ... etc.

**Resultado:** pm-thyrox pasa de 422 líneas a ~50 líneas (thin orchestrator). Las fases viven en commands atómicos de ~50-100 líneas cada una.

### ¿Cuándo hacerlo?

**Trigger correcto:** Cuando pm-thyrox SKILL llegue a ~600 líneas (TD-004) o cuando agregar una nueva instrucción de fase cause conflicto de contexto.

**No ahora** — porque:
1. workflow_* commands existen pero están desactualizados respecto a SKILL.md (no incluyen gates, Stopping Point Manifest, etc.)
2. Sincronizar los dos sistemas requiere un WP formal
3. context-hygiene tiene prioridad (afecta cada sesión)

**Sí registrar como TD-006:** "Hacer pm-thyrox thin orchestrator — mover lógica de fases a workflow_* commands"

---

## Resumen

| Pregunta | Respuesta |
|---------|-----------|
| ¿Es correcta la distinción SKILL vs AGENTE? | ✓ Sí, en la teoría Anthropic |
| ¿pm-thyrox viola la definición de SKILL? | ✓ Sí — hace trabajo de orquestador |
| ¿Es un problema urgente? | No — funciona con fricciones menores, no con fallas |
| ¿Existe ya una solución parcial? | ✓ Sí — workflow_* commands en `.claude/commands/` |
| ¿Qué falta para la arquitectura correcta? | Hacer pm-thyrox thin + sincronizar workflow_* |
| ¿Cuándo hacerlo? | Cuando pm-thyrox llegue a ~600 líneas (trigger TD-004) |
| ¿Nueva deuda técnica? | TD-006: pm-thyrox thin orchestrator |

---

## Corrección — 2026-04-08 (FASE 21)

Este análisis fue revisado en FASE 21 (WP: `2026-04-08-03-51-36-skill-architecture-review`) con
evidencia externa que invalida 3 de sus conclusiones. Las correcciones están documentadas en
[ADR-015](../../decisions/adr-015.md). Se registran aquí para preservar la trazabilidad.

### Conclusión 1 — "SKILL única opción viable" → INCORRECTA

**Lo que decía este análisis:**
> La arquitectura correcta es un SKILL — es la única opción viable en Claude Code.

**Por qué es incorrecto:**
CLAUDE.md es una alternativa más confiable: siempre se carga, sin triggering probabilístico.
El análisis ignoró CLAUDE.md como opción arquitectónica (error de framing por omisión).

**Corrección:** CLAUDE.md + hooks son más confiables para instrucciones que deben ejecutarse siempre.
SKILL es correcto para metodología on-demand. Son complementarios, no excluyentes.

### Conclusión 2 — "Limitación arquitectónica de Claude Code" → INCORRECTA

**Lo que decía este análisis:**
> La razón por la que pm-thyrox no puede ser un agente es una limitación arquitectónica de Claude Code.

**Por qué es incorrecto:**
PTC (Programmatic Tool Calling) existe en la API y es ortogonal a la arquitectura de 5 capas.
La ausencia de PTC en Claude Code es un **tradeoff de producto** (Anthropic eligió no incluirlo),
no una limitación arquitectónica. La arquitectura de 5 capas es correcta independientemente de PTC.

**Corrección:** La arquitectura de 5 capas (Hooks / CLAUDE.md / SKILLs / commands / agentes)
es PTC-proof por diseño — PTC solo mejoraría la eficiencia interna de Capa 4.

### Conclusión 3 — "Trigger por tamaño (~600 líneas)" → INCORRECTA

**Lo que decía este análisis:**
> Hacer pm-thyrox thin orchestrator cuando llegue a ~600 líneas (trigger TD-006).

**Por qué es incorrecto:**
Reducir pm-thyrox SKILL a catálogo SIN sincronizar primero los /workflow_* commands
produce un sistema peor: Ruta 1 (SKILL) sin lógica + Ruta 2 (/workflow_*) outdated.
El trigger correcto es confiabilidad, no tamaño.

**Corrección:** El trigger es **TD-008 completado** (sync /workflow_* commands), no ~600 líneas.
Ver ADR-015 D-02 y sección "Estado Actual vs Objetivo" para la secuencia correcta.
