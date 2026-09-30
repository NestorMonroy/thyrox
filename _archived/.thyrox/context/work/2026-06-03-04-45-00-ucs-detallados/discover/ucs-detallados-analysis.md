```yml
created_at: 2026-06-03 04:45:00
project: THYROX
work_package: 2026-06-03-04-45-00-ucs-detallados
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# DISCOVER — Profundizar los 123 UCs de THYROX a detalle formal

## Problema (de la evaluación del ejecutor)

Los UCs en `docs/requisitos/casos-uso/` están a **granularidad COSMIC** (suficiente para
sizing), no a detalle de caso de uso formal. Verificado:

- **Cobertura:** 86 de 123 procesos (70%) solo existen como **fila de roster** (capas C
  metodología 59 + D agentes 27); no tienen UC individual escrito.
- **Profundidad:** los 37 escritos (20 interfaz + 13 motor + 4 ejemplos) son `FU·Trigger·Flujo`
  sin precondición/postcondición/flujo alterno+excepción/criterios de aceptación/datos por OOI.

## Objetivo

Llevar los **123** procesos funcionales a **UC formal completo**, manteniéndolos como product
docs durables en `docs/requisitos/casos-uso/`, **sin romper** la anotación COSMIC existente
(la sección de sizing se conserva; el UC formal la complementa).

## Inventario (ya conocido del baseline COSMIC — ÉPICA 44)

| Capa (FSM) | Archivo | Procesos | Hoy | Falta |
|------------|---------|----------|-----|-------|
| A — Interfaz | interface-ucs.md | 20 | 20 con flujo | profundidad formal |
| B — Motor | engine-ucs.md | 13 | 13 con flujo | profundidad formal |
| C — Coordinators metodología | methodology-ucs.md | 61 | 2 ejemplos + roster | 59 UCs + profundidad |
| D — Agentes | agent-ucs.md | 29 | 2 ejemplos + roster | 27 UCs + profundidad |
| **Total** | | **123** | 37 escritos | 86 nuevos + profundidad ×123 |

## Template de UC formal (a aplicar a los 123)

Cada UC tendrá esta estructura. Los campos OBSERVABLE se anclan en el flujo del comando/
SKILL/agente real (no se inventan); los campos de criterio se derivan del flujo.

```
## UC-XXX-NN — <nombre>
- **Actor (FU):** <usuario funcional> · **Actores secundarios:** <si aplica>
- **Trigger:** <evento desencadenante>
- **Precondición:** <qué debe ser verdad antes — estado/artefactos/fase requerida>
- **Flujo principal:** 1) … N) … (pasos atómicos, con (E/X/R/W) marcado para trazar a COSMIC)
- **Flujo alterno:** <variantes válidas — ej. escala reducida, ramas condicionales>
- **Flujo de excepción:** <qué pasa ante error/bloqueo/precondición no cumplida>
- **Postcondición:** <qué queda verdadero al terminar — artefactos/estado>
- **Datos (OOIs):** <data groups que entran/salen/lee/escribe>
- **Criterios de aceptación:** Given/When/Then verificables (≥1 por UC)
- **COSMIC:** <CFP del baseline ÉPICA 44 — se conserva la trazabilidad>
```

## Fuente de verdad por capa (para anclar OBSERVABLE)

- A: `.claude/commands/*.md` + `.claude/skills/workflow-*/SKILL.md`
- B: `.claude/scripts/*.{sh,py}` + hooks en `settings.json`
- C: `.claude/skills/{ba,bpa,cp,dmaic,lean,pdca,pm,pps,rm,rup,sp}-*/SKILL.md`
- D: `.claude/agents/*.md`

## Estrategia de ejecución

Decompose por capa/familia y delegar a agentes en paralelo (cada uno lee los archivos reales y
escribe los UCs según el template). Consolidar y commitear por capa. No-intrusión: la sección
COSMIC de cada archivo se conserva; el UC formal se integra arriba o reemplaza el roster por
UCs individuales que **incluyen** su línea COSMIC.

## Gate / claims

OBSERVABLE: inventario y gaps verificados con grep en ÉPICA 44. El detalle nuevo se anclará en
los archivos fuente reales (mismo método que el baseline). Criterios de aceptación = INFERRED
del flujo documentado (derivación explícita), nunca SPECULATIVE.

**Última actualización:** 2026-06-03 04:45:00
