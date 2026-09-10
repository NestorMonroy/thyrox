```yml
created_at: 2026-06-03 04:04:43
project: THYROX
work_package: 2026-06-03-03-55-02-thyrox-ucs-cosmic
phase: Phase 2 — MEASURE
author: NestorMonroy
status: Borrador
```

# COSMIC — Measurement Strategy (THYROX self-sizing)

> Fase A del procedimiento COSMIC v5.0 (ISO/IEC 19761). FUR = los casos de uso en
> `docs/requisitos/casos-uso/{interface,engine}-ucs.md` (Regla 3: fuente exclusiva).

## Propósito

Establecer el **baseline de tamaño funcional** de THYROX en CFP — la primera medición
COSMIC del propio framework. Valida el skill `cosmic` sobre el sistema que lo hospeda y
da una cifra de referencia para futuras comparaciones (crecimiento por ÉPICA).

## Scope

Las **dos capas funcionales** de THYROX, medidas como **FSM independientes** (Principio 6):

| Capa (FSM) | Qué es | FUR fuente | Procesos |
|------------|--------|-----------|----------|
| **A — Interfaz** | Comandos `/thyrox:*` y skills que el Ejecutor invoca | `interface-ucs.md` | 20 (UC-INT-01..20) |
| **B — Motor** | Hooks, generadores y orquestación (runtime/CI) | `engine-ucs.md` | 13 (UC-ENG-01..13) |

Fuera de scope: tech-skills de dominio (python/react/…), coordinators de metodología
(pdca/dmaic/…) como software medible — son **contenido**, no procesos del framework core.
UC-ENG-14 (SubagentStop) excluido: aún en PR #4, no mergeado a la canónica.

## Usuarios funcionales y boundary

| Capa | Usuarios funcionales | Boundary |
|------|----------------------|----------|
| A | **Ejecutor** (persona) | persona ↔ comando/Skill |
| B | **harness** (eventos SessionStart/PreToolUse/PostToolUse/Stop/PostCompact), **Claude runtime**, **git**, **CI** | evento del harness/sesión ↔ script del motor |

**Principio 6:** A y B son capas distintas → **no se suman** como un único tamaño; se
reportan por separado. El agregado (Σ) se da solo como referencia, con esa salvedad.

## Persistent storage (OOIs comunes)

`SessionState` (now.md), `WorkPackage`, `ProjectState`, `ROADMAP`, `phase-history`,
`Phase-Artifact` (analysis/measure/plan/spec/task-plan/…), `ADR`, `CHANGELOG`, `gitlog`,
`AgentDef`, `SkillTemplate`, `Guideline`, `RoutingRules`, `Code`, `config`.

## Nivel de granularidad

**Un proceso funcional = un caso de uso elemental** (una invocación / un evento del harness),
el nivel en que están escritos los UC. Consistente en ambas capas (comparabilidad).

## Reglas de conteo aplicadas (del MM v5.0)

- Trigger del UC = **1 Entrada** siempre; cada proceso **≥ 2 CFP** (Regla 10c).
- Un `(tipo, OOI)` se cuenta **una vez por proceso** — leer/escribir N archivos del **mismo**
  OOI (p.ej. todos los `agents/*.md`) = 1 movimiento.
- **OOIs distintos** nombrados en el flujo = movimientos distintos (now.md ≠ ROADMAP ≠
  artefacto de fase).
- Navegación / cálculo / validación / re-mostrar = **0 CFP** (data-movements.md).
- NFR excluidos.

---

**Última actualización:** 2026-06-03 04:04:43
