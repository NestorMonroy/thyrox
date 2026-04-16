```yml
created_at: 2026-04-15 00:00:00
project: THYROX
work_package: 2026-04-15-08-29-58-plugin-distribution
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Aprobado — pendiente de implementación
```

# Reestructuración de fases THYROX: 7 → 12

> **Nota:** "SDLC" (Software Development Life Cycle) es una metodología propia con sus fases.
> Las fases que se describen aquí son **fases de THYROX** — el framework de gestión, no el SDLC.
> Ver `sdlc-phases.md` para la documentación del SDLC como metodología.

---

## Sección 1: El error estructural del THYROX actual (7 fases)

### Los 8 aspectos que cubre Phase 1 ANALYZE hoy

Según `workflow-analyze/SKILL.md`, Phase 1 investiga estos **8 aspectos**:

| # | Aspecto | Descripción |
|---|---------|-------------|
| 1 | Objetivo/Por qué | ¿qué se quiere lograr y por qué importa? |
| 2 | Stakeholders | ¿quiénes son los usuarios y qué necesitan? |
| 3 | Uso operacional | ¿cómo se usará el sistema en la práctica? |
| 4 | Atributos de calidad | ¿qué importa más: velocidad, seguridad, confiabilidad? |
| 5 | Restricciones | ¿qué limita la solución (tech, tiempo, presupuesto)? |
| 6 | Contexto/sistemas vecinos | ¿dónde se sitúa, qué lo rodea? |
| 7 | Fuera de alcance | ¿qué NO se va a hacer? |
| 8 | Criterios de éxito | ¿cómo sabremos que está bien hecho? |

### Mapping al patrón universal de 9 pasos (validado en 15 frameworks)

| Aspecto Phase 1 actual | Paso universal real | Justificación |
|------------------------|--------------------|-|
| 1. Objetivo/Por qué | IDENTIFY | Reconocimiento del problema — no es análisis |
| 2. Stakeholders | DEFINE | Delimitar quiénes están afectados — es scope, no análisis |
| 3. Uso operacional | UNDERSTAND | Cómo funciona hoy — comprensión del estado actual |
| 4. Atributos de calidad | DEFINE + MEASURE | Calidad deseada = DEFINE; calidad actual medida = MEASURE |
| 5. Restricciones | DEFINE | Boundaries del problema — delimitación, no análisis causal |
| 6. Contexto/sistemas vecinos | UNDERSTAND | Historia, arquitectura existente, procesos circundantes |
| 7. Fuera de alcance | DEFINE | Scope exclusions — parte de precisar qué ES el problema |
| 8. Criterios de éxito | MEASURE | Cuantificar la condición objetivo — requiere baseline |

**Conclusión:** 0 de los 8 aspectos es verdaderamente ANALYZE (causa raíz).
Phase 1 ejecuta IDENTIFY + DEFINE + UNDERSTAND + MEASURE bajo el nombre incorrecto "ANALYZE".

Además, el THYROX de 7 fases carece de:
- **CONSTRAINTS** como fase explícita (oculto dentro de Phase 1)
- **PILOT/VALIDATE** (no existe — se pasa directo de tareas a ejecución)
- **STANDARDIZE** (el cierre no incluye propagación del conocimiento)

---

## Sección 2: Por qué importa separar los pasos

### MEASURE es el paso más frecuentemente omitido

| Dominio | Sin MEASURE explícito |
|---------|----------------------|
| Desarrollo de software | Sin baseline de performance, no se puede demostrar mejora |
| Consultoría | Sin "Current State Assessment", el análisis de causa raíz carece de evidencia |
| Problem-solving | Sin cuantificar el impacto, la priorización es arbitraria |

### CONSTRAINTS antes de STRATEGY evita decisiones vacías

Si no se definen las restricciones (budget, equipo, tiempo, tecnologías permitidas) antes de elegir la arquitectura, se elige una STRATEGY que puede ser técnicamente correcta pero organizacionalmente imposible.

La secuencia correcta: `ANALYZE → CONSTRAINTS → STRATEGY`.
La secuencia incorrecta (actual): restricciones y estrategia mezcladas en Phase 1 y Phase 2.

### PILOT/VALIDATE cierra el loop antes del commit total

Sin un paso de validación entre la planificación y la ejecución completa, los riesgos de arquitectura se descubren tarde — cuando el costo de cambio es máximo. PILOT/VALIDATE permite validar la hipótesis con mínimo esfuerzo antes de construir todo.

---

## Sección 3: Las 12 fases THYROX (propuesta aprobada)

```
 1. DISCOVER          → ¿Qué problema existe? Contexto, stakeholders, síntomas
 2. MEASURE           → ¿Cuánto duele? Baseline + definir métricas de éxito
 3. ANALYZE           → ¿Por qué ocurre? Root cause real
 4. CONSTRAINTS       → ¿Qué nos limita? Budget, equipo, tech, tiempo
 5. STRATEGY          → ¿Cómo lo resolvemos? Arquitectura, enfoque técnico, ADRs
 6. PLAN              → ¿Qué entra en scope y cuándo? Roadmap, iteraciones
 7. DESIGN/SPECIFY    → ¿Qué construimos exactamente? Requirements spec, diseño técnico
 8. PLAN EXECUTION    → ¿Cómo lo dividimos? Tareas atómicas, DAG, T-NNN
 9. PILOT/VALIDATE    → ¿Funciona la hipótesis? PoC mínimo antes de commit total
10. EXECUTE           → Construir
11. TRACK/EVALUATE    → ¿Logramos lo que definimos en MEASURE? Lessons learned
12. STANDARDIZE       → Documentar, propagar, cerrar WP
```

### Feedback loops explícitos

```
PILOT/VALIDATE ──→ ANALYZE      (hipótesis de causa raíz incorrecta)
PILOT/VALIDATE ──→ STRATEGY     (enfoque técnico no funciona)
TRACK/EVALUATE ──→ MEASURE      (comparar resultado contra baseline del paso 2)
TRACK/EVALUATE ──→ DISCOVER     (emergen problemas nuevos → nuevo WP)
```

### Mapping desde las 7 fases actuales

| THYROX actual (7 fases) | THYROX nuevo (12 fases) | Tipo de cambio |
|-------------------------|-------------------------|----------------|
| Phase 1: ANALYZE | Phase 1: DISCOVER | Renombrar + refocalizar (IDENTIFY+DEFINE+UNDERSTAND) |
| — (no existía) | Phase 2: MEASURE | Nueva fase |
| — (no existía) | Phase 3: ANALYZE | Nueva fase (causa raíz real) |
| — (oculto en Phase 1) | Phase 4: CONSTRAINTS | Extraer de Phase 1 actual |
| Phase 2: SOLUTION STRATEGY | Phase 5: STRATEGY | Renombrar (mismo contenido) |
| Phase 3: PLAN | Phase 6: PLAN | Sin cambio de contenido |
| Phase 4: STRUCTURE | Phase 7: DESIGN/SPECIFY | Renombrar (mismo contenido) |
| Phase 5: DECOMPOSE | Phase 8: PLAN EXECUTION | Renombrar (mismo contenido) |
| — (no existía) | Phase 9: PILOT/VALIDATE | Nueva fase |
| Phase 6: EXECUTE | Phase 10: EXECUTE | Sin cambio de contenido |
| Phase 7: TRACK | Phase 11: TRACK/EVALUATE | Renombrar + agregar evaluación vs. MEASURE |
| — (no existía) | Phase 12: STANDARDIZE | Nueva fase |

**Resumen:** 7 fases → 12 fases. 4 fases nuevas (MEASURE, ANALYZE, PILOT/VALIDATE, STANDARDIZE). 1 fase extraída (CONSTRAINTS). 4 fases renombradas. 3 fases sin cambio de contenido.

---

## Sección 4: Escalabilidad — qué fases omitir según tamaño del WP

Las 12 fases son para WPs grandes y complejos. La escalabilidad es explícita:

| Tamaño | Fases activas | Fases omitidas |
|--------|--------------|----------------|
| Micro (<30 min, bug fix, script) | 1 → 3 → 5 → 10 → 11 | MEASURE, CONSTRAINTS, PLAN, DESIGN, PLAN EXECUTION, PILOT, STANDARDIZE |
| Pequeño (feature simple) | 1 → 3 → 5 → 6 → 10 → 11 | MEASURE, CONSTRAINTS, DESIGN, PLAN EXECUTION, PILOT, STANDARDIZE |
| Mediano (feature compleja) | 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 10 → 11 | PILOT, STANDARDIZE |
| Grande / complejo | Todas las 12 | Ninguna |

PILOT/VALIDATE y STANDARDIZE son los primeros en caer — son overhead real cuando el riesgo es bajo.

---

## Sección 5: Impacto en la infraestructura existente

| Componente | Cambio requerido | Nivel |
|-----------|-----------------|-------|
| `workflow-analyze/SKILL.md` | Renombrar → `workflow-discover/` | ALTO |
| `workflow-analyze/` (nueva) | Crear skill refocused en causa raíz | ALTO |
| `workflow-measure/` | Crear skill nuevo (baseline, métricas) | ALTO |
| `workflow-constraints/` | Crear skill nuevo (restricciones) | ALTO |
| `workflow-strategy/` | Renombrar desde `workflow-solution-strategy/` | MEDIO |
| `workflow-structure/` | Renombrar → `workflow-design/` | MEDIO |
| `workflow-decompose/` | Renombrar → `workflow-plan-execution/` | MEDIO |
| `workflow-pilot/` | Crear skill nuevo (PoC, validación) | ALTO |
| `workflow-track/` | Actualizar para incluir evaluación vs. MEASURE | MEDIO |
| `workflow-standardize/` | Crear skill nuevo (cierre + propagación) | ALTO |
| `thyrox/SKILL.md` — catálogo | Actualizar tabla 7 → 12 fases | MEDIO |
| `session-start.sh` | Agregar `_phase_to_display()` y `_phase_to_command()` para las 12 fases | MEDIO |
| `now.md::phase` | Agregar campo `phase_name` para compatibilidad semántica | MEDIO |
| `exit-conditions.md.template` | Agregar gates para 12 fases | MEDIO |
| `plugin.json` | Agregar commands `/thyrox:discover`, `:measure`, `:analyze`, `:constraints`, `:pilot`, `:standardize` | MEDIO |
| `scalability.md` | Reescribir tabla de 7 → 12 fases con reglas por tamaño | MEDIO |
| `CLAUDE.md` — glosario | Actualizar "Phase N" (1-7 → 1-12) | BAJO |
| Registry `sdlc.yml` | 12 steps con nombres correctos | BAJO |

---

## Sección 6: Compatibilidad hacia atrás

### Campo `phase_name` en now.md (estrategia recomendada)

Agregar campo `phase_name` al frontmatter de `now.md`:

```yaml
phase: "Phase 2"          # número (compatibilidad legacy)
phase_name: "strategy"    # nombre semántico (nuevo — resuelve ambigüedad)
```

`session-start.sh` prioriza `phase_name` si existe, cae a `phase` si no.
Los WPs existentes sin `phase_name` mantienen comportamiento legacy.

### Alias legacy en session-start.sh

```bash
_phase_to_command() {
    case "$1" in
        # Scheme v2 — 12 fases THYROX
        "Phase 1"|"discover")       echo "/thyrox:discover"       ;;
        "Phase 2"|"measure")        echo "/thyrox:measure"        ;;
        "Phase 3"|"analyze")        echo "/thyrox:analyze"        ;;
        "Phase 4"|"constraints")    echo "/thyrox:constraints"    ;;
        "Phase 5"|"strategy")       echo "/thyrox:strategy"       ;;
        "Phase 6"|"plan")           echo "/thyrox:plan"           ;;
        "Phase 7"|"design")         echo "/thyrox:design"         ;;
        "Phase 8"|"plan-execution") echo "/thyrox:plan-execution" ;;
        "Phase 9"|"pilot")          echo "/thyrox:pilot"          ;;
        "Phase 10"|"execute")       echo "/thyrox:execute"        ;;
        "Phase 11"|"track")         echo "/thyrox:track"          ;;
        "Phase 12"|"standardize")   echo "/thyrox:standardize"    ;;
        # Alias legacy — scheme v1 (7 fases)
        "Phase 2 (legacy)"|"solution-strategy") echo "/thyrox:strategy"  ;;
        "Phase 3 (legacy)")                     echo "/thyrox:plan"       ;;
        "Phase 4 (legacy)")                     echo "/thyrox:design"     ;;
        "Phase 5 (legacy)")                     echo "/thyrox:plan-execution" ;;
        "Phase 6 (legacy)")                     echo "/thyrox:execute"    ;;
        "Phase 7 (legacy)")                     echo "/thyrox:track"      ;;
        *) echo "/thyrox:discover" ;;
    esac
}
```

---

## Sección 7: Implicación para FASE 39 (plugin-distribution)

El plugin debe distribuir las 12 fases correctas desde el día 1. Una vez que usuarios adopten THYROX con las 7 fases incorrectas, la corrección posterior genera friction de migración.

### GAP-011 actualizado

```
GAP-011: THYROX actual tiene 7 fases con naming incorrecto y fases ausentes
Riesgo: El plugin distribuiría la versión incorrecta del framework
Impacto: ALTO — afecta la propuesta de valor y la alineación con 15 metodologías soportadas
Mitigación: Completar reestructuración 7→12 fases como prerequisito de distribución
Estado: ABIERTO
```

### Secuencia de implementación (sub-tareas dentro de FASE 39)

```
1.  Crear ADR: adr-thyrox-12-fases.md
2.  Crear workflow-discover/ (renombrar workflow-analyze/ actual)
3.  Crear workflow-measure/ (nuevo)
4.  Crear workflow-analyze/ (nuevo — causa raíz, no los 8 aspectos)
5.  Crear workflow-constraints/ (nuevo)
6.  Renombrar workflow-solution-strategy/ → workflow-strategy/
7.  Renombrar workflow-structure/ → workflow-design/
8.  Renombrar workflow-decompose/ → workflow-plan-execution/
9.  Crear workflow-pilot/ (nuevo)
10. Actualizar workflow-track/ para incluir evaluación vs. MEASURE
11. Crear workflow-standardize/ (nuevo)
12. Actualizar thyrox/SKILL.md — catálogo de 12 fases
13. Actualizar session-start.sh — aliases y nuevas fases
14. Actualizar exit-conditions.md.template — 12 gates
15. Actualizar plugin.json — commands para las 12 fases
16. Actualizar scalability.md — tabla de 12 fases por tamaño
17. Migrar WPs activos — agregar phase_name a now.md
```
