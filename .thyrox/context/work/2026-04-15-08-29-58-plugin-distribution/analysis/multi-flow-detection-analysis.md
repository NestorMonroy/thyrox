```yml
created_at: 2026-04-15 09:00:00
project: THYROX
topic: Multi-metodología — detección de flujo y reuso de workflow-*
author: NestorMonroy
status: Borrador
```

# Sub-análisis: Detección de flujo multi-metodología

## Problema actual

El sistema de detección de fases está hardcodeado para SDLC de 7 fases.
Tres puntos de acoplamiento:

| Archivo | Acoplamiento | Valor actual |
|---------|-------------|-------------|
| `now.md` | campo `phase:` | `"Phase 1"` … `"Phase 7"` |
| `session-start.sh` | `_phase_to_command()` | `"Phase N"` → `/thyrox:*` |
| `workflow-*/SKILL.md` | hook UserPromptSubmit | `set-session-phase.sh 'Phase N'` |

Cuando el usuario activa `/thyrox:pm-init` (PMBOK), no hay ningún mecanismo que:
1. Escriba `phase: pm-init` en `now.md`
2. Muestre "PMBOK — Initiating" en el hook display
3. Sugiera `/thyrox:pm-init` como próximo comando

---

## Los 4 flujos y sus fases

### SDLC (existente — 7 fases)

```
analyze → strategy → plan → structure → decompose → execute → track
```

### PMBOK 8 (nuevo — 5 process groups)

```
pm-init → pm-plan → pm-execute → pm-monitor → pm-close
```

### RUP / Proceso Unificado (nuevo — 5 fases)

```
rup-inception → requirements → rup-elaboration → rup-construction → rup-transition
```

Nota: `requirements` sin prefijo — skill compartido entre RUP y RM (ver sección 5).

### Requirements Management — RM (nuevo — 7 pasos)

```
rm-inception → rm-elicitation → rm-elaboration → rm-negotiation
           → rm-specification → rm-validation → rm-management
```

Basado en: Inception, Elicitation, Elaboration, Negotiation, Specification,
Validation, Management + Use Case Modeling como técnica transversal.

---

## Propuesta de schema `now.md`

### Opción A (campo adicional `flow`)

```yaml
flow: rup           # sdlc | pmbok | rup | rm
phase: inception    # nombre dentro del flujo
```

Pros: flujo y fase separados, fácil de filtrar por metodología.
Contras: dos campos en lugar de uno, scripts necesitan leer ambos.

### Opción B (namespace en `phase`)

```yaml
phase: rup:inception    # flow:phase
```

Pros: un solo campo. Contras: parsing más complejo, `:` es raro en YAML.

### Opción C — Recomendada: `phase` == nombre del skill ✓

```yaml
phase: rup-inception    # idéntico al nombre del skill sin /thyrox:
```

Pros:
- `_phase_to_command()` se simplifica a: `/thyrox:{PHASE}` — sin lookup table
- `set-session-phase.sh` no cambia — solo pasan valores distintos
- Backward compat: "Phase 1"…"Phase 7" siguen funcionando como casos especiales

```bash
_phase_to_command() {
    case "$1" in
        # SDLC legacy (backward compat)
        "Phase 1") echo "/thyrox:analyze" ;;
        "Phase 2") echo "/thyrox:strategy" ;;
        "Phase 3") echo "/thyrox:plan" ;;
        "Phase 4") echo "/thyrox:structure" ;;
        "Phase 5") echo "/thyrox:decompose" ;;
        "Phase 6") echo "/thyrox:execute" ;;
        "Phase 7") echo "/thyrox:track" ;;
        # Todo lo demás: el phase ES el skill name
        *)         echo "/thyrox:${1}" ;;
    esac
}
```

Con Opción C, un nuevo flujo (ej: Scrum) solo requiere que el skill escriba
su nombre en `now.md::phase`. **Cero cambios en session-start.sh.**

---

## Display en session-start.sh

Agregar `_phase_to_display()` para mostrar nombre amigable:

```bash
_phase_to_display() {
    case "$1" in
        # SDLC
        "Phase 1"|"analyze")    echo "SDLC — Phase 1: ANALYZE" ;;
        "Phase 2"|"strategy")   echo "SDLC — Phase 2: SOLUTION STRATEGY" ;;
        "Phase 3"|"plan")       echo "SDLC — Phase 3: PLAN" ;;
        "Phase 4"|"structure")  echo "SDLC — Phase 4: STRUCTURE" ;;
        "Phase 5"|"decompose")  echo "SDLC — Phase 5: DECOMPOSE" ;;
        "Phase 6"|"execute")    echo "SDLC — Phase 6: EXECUTE" ;;
        "Phase 7"|"track")      echo "SDLC — Phase 7: TRACK" ;;
        # PMBOK
        "pm-init")    echo "PMBOK — Initiating" ;;
        "pm-plan")    echo "PMBOK — Planning" ;;
        "pm-execute") echo "PMBOK — Executing" ;;
        "pm-monitor") echo "PMBOK — Monitoring & Control" ;;
        "pm-close")   echo "PMBOK — Closing" ;;
        # RUP
        "rup-inception")    echo "RUP — Inception" ;;
        "requirements")     echo "RUP/RM — Requirements" ;;
        "rup-elaboration")  echo "RUP — Elaboration" ;;
        "rup-construction") echo "RUP — Construction" ;;
        "rup-transition")   echo "RUP — Transition" ;;
        # RM
        "rm-inception")     echo "RM — Inception" ;;
        "rm-elicitation")   echo "RM — Elicitation" ;;
        "rm-elaboration")   echo "RM — Elaboration" ;;
        "rm-negotiation")   echo "RM — Negotiation" ;;
        "rm-specification") echo "RM — Specification" ;;
        "rm-validation")    echo "RM — Validation" ;;
        "rm-management")    echo "RM — Management" ;;
        *) echo "$1" ;;  # fallback: mostrar raw
    esac
}
```

Output del hook con flujo PMBOK activo:

```
=== THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ===

  Work package activo: context/work/2026-04-15-12-00-00-mi-proyecto/
  Fase actual: PMBOK — Initiating

  Opciones de ejecución:
    A (calidad alta HOY):    invocar thyrox SKILL → PMBOK — Initiating
    B (determinístico):      /thyrox:pm-init
```

---

## Reuso de `workflow-*` como motores de ejecución

Los 7 `workflow-*` skills son motores genéricos. Los nuevos skills de metodología
son **thin wrappers** que:
1. Inyectan contexto específico de la metodología
2. Delegan a `workflow-*` para la ejecución real
3. Escriben su propio nombre en `now.md::phase`

### Mapa de delegación

| Skill público | Motor `workflow-*` | Contexto adicional |
|--------------|--------------------|--------------------|
| `/thyrox:pm-init` | `workflow-analyze` | Project Charter, Business Case, Stakeholder Register, Kick-off |
| `/thyrox:pm-plan` | `workflow-plan` + `workflow-structure` | WBS, Schedule baseline, Budget, Risk register PMBOK |
| `/thyrox:pm-execute` | `workflow-execute` | QA plan, Communications matrix, Procurement |
| `/thyrox:pm-monitor` | *(nuevo — sin equivalente)* | Change Control Board, EVM, Performance reports |
| `/thyrox:pm-close` | `workflow-track` | Formal acceptance, Archive, Lessons learned PMBOK |
| `/thyrox:rup-inception` | `workflow-analyze` | Vision doc, Business case, Risk list, UCR inicial |
| `/thyrox:requirements` | `workflow-structure` | Use Cases, SRS, Elicitation técnicas, UML |
| `/thyrox:rup-elaboration` | `workflow-strategy` + `workflow-plan` | Architecture baseline, UCR completo |
| `/thyrox:rup-construction` | `workflow-execute` | Iteraciones, Unit tests, Integración continua |
| `/thyrox:rup-transition` | `workflow-track` | Beta, Deployment, Training, Handoff |
| `/thyrox:rm-inception` | `workflow-analyze` | Stakeholder ID, Problem framing, context-free questions |
| `/thyrox:rm-elicitation` | *(nuevo — sin equivalente)* | Entrevistas, workshops, use case modeling |
| `/thyrox:rm-elaboration` | `workflow-structure` | Analysis model, technical specification |
| `/thyrox:rm-negotiation` | *(nuevo — sin equivalente)* | Priority points, conflict resolution |
| `/thyrox:rm-specification` | `workflow-structure` | SRS, graphical models, UML |
| `/thyrox:rm-validation` | *(nuevo — sin equivalente)* | Requirements review, quality checks |
| `/thyrox:rm-management` | `workflow-track` | Change control, traceability matrix |

**Hallazgo:** 4 pasos de RM no tienen equivalente en `workflow-*`:
`rm-elicitation`, `rm-negotiation`, `rm-validation`, `rm-management`.
Estos necesitan SKILL.md nuevos o extensión de workflow existentes.

### Patrón de implementación de thin wrapper

Ejemplo para `pm-init/SKILL.md`:

```yaml
---
name: pm-init
description: "PMBOK 8 — Initiating Process Group. Project Charter, stakeholders, kick-off."
---

# /thyrox:pm-init — PMBOK Initiating

Carga contexto PMBOK Initiating y delega a workflow-analyze.

## Artefactos PMBOK (en lugar de los SDLC genéricos)

- Project Charter (en lugar de analysis.md genérico)
- Stakeholder Register
- Business Case

## Invocar workflow-analyze

Seguir todas las instrucciones de workflow-analyze/SKILL.md con estas adaptaciones:
- Los "8 aspectos SDLC" se mapean a los 40 procesos del grupo Initiating de PMBOK 8
- El artefacto principal es `{wp}-project-charter.md` (no `{wp}-analysis.md`)

## Actualizar phase al completar

bash .claude/scripts/set-session-phase.sh 'pm-plan'
```

---

## `requirements` como skill compartido

El skill `/thyrox:requirements` no tiene prefijo de metodología porque los
principios de Requirements Engineering (Jacobson, UML, use cases) aplican tanto
a RUP como a RM y parcialmente a SDLC.

En RUP es una fase secuencial (después de Inception).
En RM es la columna vertebral de todo el proceso.
En SDLC equivale a Phase 4 STRUCTURE.

**Decisión pendiente (para Phase 2):** ¿Es `requirements` una fase de RUP que
también usan otros flujos, o un skill transversal que se puede invocar en cualquier
metodología? Impacta en si pertenece al namespace `rup-*` o es independiente.

---

## Cambios necesarios en infraestructura

### `session-start.sh`

1. Reemplazar `_phase_to_command()` con la versión extendida (Opción C)
2. Agregar `_phase_to_display()` para mostrar nombres amigables
3. Sustituir `echo "Fase actual: ${PHASE}"` por `echo "Fase actual: $(_phase_to_display "$PHASE")"`

### `set-session-phase.sh`

Sin cambios — ya acepta cualquier string como fase.

### `workflow-*/SKILL.md` (los 7 existentes)

Sin cambios — los workflow-* no escriben su fase en now.md directamente.
Son los skills de metodología (pm-*, rup-*, rm-*) quienes escriben la fase.

### SKILL.md del skill `thyrox` (maestro)

Agregar sección de "Flujos disponibles" reemplazando la sección
"Catálogo de fases" actual (que solo lista las 7 fases SDLC).

---

## Resumen: lo que cambia y lo que no

| Componente | Cambio |
|-----------|--------|
| `now.md` schema | Agregar opcionalmente `flow:` o usar phase == skill name (Opción C) |
| `session-start.sh` | 2 funciones nuevas: `_phase_to_command()` extendida + `_phase_to_display()` |
| `set-session-phase.sh` | **Sin cambios** |
| `workflow-*/SKILL.md` (7 existentes) | **Sin cambios** |
| `thyrox/SKILL.md` | Sección "Catálogo de fases" → "Flujos disponibles" |
| Skills nuevos (pm-*, rup-*, rm-*) | Thin wrappers que delegan a workflow-* |
| `plugin.json` | Listado de skills actualizado |
