```yml
created_at: 2026-04-15 12:30:00
project: THYROX
topic: Reestructuración del SDLC — de 7 fases incorrectas a 9 fases alineadas con el patrón universal
author: NestorMonroy
status: Borrador para decisión
```

# Sub-análisis: Reestructuración del SDLC de THYROX — 7 → 9 fases

---

## Sección 1: El error estructural del SDLC actual

### Los 8 aspectos que cubre Phase 1 ANALYZE hoy

Según `workflow-analyze/SKILL.md`, Phase 1 investiga estos **8 aspectos**:

| # | Aspecto | Descripción en el skill |
|---|---------|------------------------|
| 1 | Objetivo/Por qué | ¿qué se quiere lograr y por qué importa? |
| 2 | Stakeholders | ¿quiénes son los usuarios y qué necesitan? |
| 3 | Uso operacional | ¿cómo se usará el sistema en la práctica? |
| 4 | Atributos de calidad | ¿qué importa más: velocidad, seguridad, confiabilidad? |
| 5 | Restricciones | ¿qué limita la solución (tech, tiempo, presupuesto)? |
| 6 | Contexto/sistemas vecinos | ¿dónde se sitúa, qué lo rodea? |
| 7 | Fuera de alcance | ¿qué NO se va a hacer? |
| 8 | Criterios de éxito | ¿cómo sabremos que está bien hecho? |

### Mapping de los 8 aspectos al patrón universal de 9 pasos

| Aspecto Phase 1 | Paso universal real | Justificación |
|-----------------|--------------------|-|
| **1. Objetivo/Por qué** | IDENTIFY (paso 1) | Detectar por qué existe el problema — es reconocimiento, no análisis |
| **2. Stakeholders** | DEFINE (paso 2) | Precisar quiénes están afectados — es delimitación del scope, no análisis |
| **3. Uso operacional** | UNDERSTAND CONTEXT (paso 3) | Cómo funciona el sistema hoy — es comprensión del estado actual |
| **4. Atributos de calidad** | DEFINE (paso 2) + MEASURE (paso 4) | Calidad deseada = DEFINE; calidad actual medida = MEASURE |
| **5. Restricciones** | DEFINE (paso 2) | Boundaries del problema — es delimitación, no análisis causal |
| **6. Contexto/sistemas vecinos** | UNDERSTAND CONTEXT (paso 3) | Historia, arquitectura existente, procesos circundantes |
| **7. Fuera de alcance** | DEFINE (paso 2) | Scope exclusions — parte de precisar qué ES el problema |
| **8. Criterios de éxito** | MEASURE (paso 4) | Cuantificar la condición objetivo — requiere baseline para que tenga sentido |

### Resumen de la clasificación

| Paso universal | Aspectos de Phase 1 que lo cubren | Conteo |
|---------------|-----------------------------------|--------|
| IDENTIFY (paso 1) | Aspecto 1 (objetivo/por qué) | 1 |
| DEFINE (paso 2) | Aspectos 2, 4 (parcial), 5, 7 | 3–4 |
| UNDERSTAND CONTEXT (paso 3) | Aspectos 3, 6 | 2 |
| MEASURE (paso 4) | Aspecto 4 (parcial), 8 | 1–2 |
| ANALYZE (paso 5) | **Ninguno directamente** — los 8 aspectos son diagnóstico previo, no análisis causal | 0 |

### Conclusión: Phase 1 ANALYZE es conceptualmente incorrecta

Phase 1 hace los pasos 1-4 del patrón universal (IDENTIFY + DEFINE + UNDERSTAND + MEASURE) pero **ninguno de los 8 aspectos es verdaderamente ANALYZE** en el sentido de causa raíz, análisis de gaps o análisis de dinámicas del sistema.

El único momento donde ocurre algo cercano a ANALYZE en el flujo actual es al crear el `risk-register.md` — identificar riesgos es análisis de causa potencial. Pero eso tampoco es el ANALYZE del patrón universal (análisis de causas raíz del problema existente).

**El nombre "ANALYZE" describe el paso 5 pero la fase ejecuta los pasos 1-4. Es una mentira estructural.**

---

## Sección 2: Por qué importa separar los pasos

### MEASURE/ASSESS es el paso más frecuentemente omitido

En el flujo actual, no existe un momento explícito para medir el estado actual antes de analizar. Esto tiene consecuencias concretas por dominio:

**En desarrollo de software:**
- Sin MEASURE: el equipo no sabe cuánta deuda técnica hay, ni cuáles son los módulos más problemáticos
- Sin baseline de performance, no se puede demostrar que la solución mejoró algo
- Sin métricas actuales de cobertura de tests, no se prioriza correctamente qué refactorizar

**En consultoría:**
- Sin MEASURE: el consultor no tiene datos del proceso as-is — solo opiniones del cliente
- Sin el "Current State Assessment", el análisis de causa raíz carece de evidencia
- El cliente no puede comparar Before/After sin el baseline documentado

**En problem-solving general:**
- Sin MEASURE: ¿qué tan grande es el problema? ¿Afecta a 10 usuarios o a 10.000?
- Sin cuantificar el impacto, no se puede priorizar correctamente qué problemas resolver primero
- El ANALYZE sin datos es pura especulación

**El problema raíz:** Sin una fase MEASURE explícita, el ANALYZE que ocurre en Phase 2 (SOLUTION STRATEGY) o Phase 3 (PLAN) no tiene datos sobre qué analizar — trabaja con suposiciones o información incompleta recogida informalmente durante el "análisis" del problema.

### Los gates intermedios se pierden

Con Phase 1 comprimiendo los pasos 1-4, no existe la posibilidad de hacer checkpoints granulares:

| Gate que no existe hoy | Valor que aportaría |
|------------------------|---------------------|
| IDENTIFY → DEFINE | "¿Estamos seguros de que este ES el problema real, no un síntoma?" |
| DEFINE → UNDERSTAND | "¿Tenemos definido el scope antes de ir a entender el contexto?" |
| UNDERSTAND → MEASURE | "¿Tenemos suficiente contexto para ir a medir con las métricas correctas?" |
| MEASURE → ANALYZE | "¿Tenemos los datos que necesitamos para hacer análisis de causa raíz?" |

El gate Phase 1→2 actual existe después de completar los 4 pasos comprimidos. Si hay que retroceder (ej: al medir se descubre que el problema está mal definido), no hay punto de retorno claro — hay que "rehacer Phase 1" completa.

### El mapping a otras metodologías es forzado

| Metodología | Sus fases equivalentes | Mapping al SDLC actual |
|-------------|----------------------|----------------------|
| DMAIC | Define + Measure + Analyze = 3 fases separadas | Los 3 colapsan en Phase 1 — imposible mapear |
| Problem Solving 8-step | Identify + Clarify + Analyze = 3 pasos separados | Colapsados en Phase 1 — mapping artificial |
| Consulting Thoucentric | Initial Understanding + Define Scope + Collect & Analyze | Colapsados — el coordinator no puede mapear |
| Business Analysis Process | Context & Understanding (separado de) Analysis | Indistinguibles en Phase 1 actual |
| Lean Six Sigma | Define + Measure + Analyze = 3 fases con entregables distintos | Colapsados — el YAML registry no puede representarlo |

El State Machine genérico con registry (propuesto en `markov-probabilistic-registry-design.md` y `universal-pattern-methodology-landscape.md`) necesita que los flujos comparables puedan mapearse entre sí. Si THYROX-SDLC colapsa 3 pasos en 1, el coordinator no puede hacer equivalencias correctas con DMAIC o Problem Solving 8-step.

---

## Sección 3: Propuesta de reestructuración — 3 opciones

### Opción A: Expandir a 9 fases (mapeo 1:1 con patrón universal)

```
Phase 1: IDENTIFY   — detectar el problema, context-free questions, objetivos iniciales
Phase 2: DEFINE     — scope, declaración del problema, stakeholders, restricciones, fuera de alcance
Phase 3: UNDERSTAND — historia, sistemas vecinos, uso operacional, arquitectura existente
Phase 4: MEASURE    — baseline, métricas actuales, performance, deuda técnica cuantificada
Phase 5: ANALYZE    — causa raíz, gaps, oportunidades, dinámicas del sistema
Phase 6: STRATEGY   — alternativas y decisión arquitectónica
Phase 7: PLAN       — scope statement, timeline, recursos
Phase 8: EXECUTE    — implementar (incluye STRUCTURE + DECOMPOSE + EXECUTE actual)
Phase 9: TRACK      — monitor + standardize + lecciones aprendidas
```

**Pros:**
- Alineación perfecta 1:1 con el patrón universal validado en 15 frameworks
- Cada fase tiene un entregable distinguible y un propósito único
- Gates granulares entre cada transición
- El coordinator del State Machine puede mapear THYROX-SDLC a DMAIC, Problem Solving, etc. con precisión
- Naming honesto — cada fase hace lo que su nombre dice

**Contras:**
- Phase 8 sigue siendo demasiado grande: comprime STRUCTURE + DECOMPOSE + EXECUTE (los 3 pasos más complejos) en una fase
- 9 fases con overhead completo es excesivo para WPs micro o pequeños
- Requiere crear 3 nuevos skills: `workflow-identify`, `workflow-define`, `workflow-understand`, además de `workflow-measure`
- Rompe la numeración de todos los WPs activos (Phase 1-7 → Phase 1-9)
- Los artefactos existentes (`exit-conditions.md.template` con 7 fases) necesitan reescritura completa

### Opción B: Expandir Phase 1 en 3 sub-fases, mantener estructura general

```
Phase 1: DISCOVER   — IDENTIFY + DEFINE + UNDERSTAND (los pasos de "qué es el problema")
Phase 2: MEASURE    — baseline y datos cuantificados (nueva fase explícita)
Phase 3: ANALYZE    — causa raíz, gaps, oportunidades (el ANALYZE real)
Phase 4: STRATEGY   — alternativas y decisión arquitectónica
Phase 5: PLAN       — scope statement y timeline
Phase 6: STRUCTURE  — especificación de requisitos y diseño
Phase 7: DECOMPOSE  — tareas atómicas y DAG
Phase 8: EXECUTE    — implementar
Phase 9: TRACK      — monitor + standardize
```

**Pros:**
- DISCOVER + MEASURE + ANALYZE = las 3 sub-fases de Phase 1 se vuelven fases propias
- Mapea limpiamente a DMAIC (Define+Measure+Analyze) y Problem Solving 8-step (Identify+Clarify+Analyze)
- Naming honesto en todas las fases
- Mantiene STRUCTURE y DECOMPOSE separados (fases de diseño y planificación de tareas son distintas)
- Gates explícitos entre DISCOVER→MEASURE y MEASURE→ANALYZE

**Contras:**
- 9 fases totales con overhead completo sigue siendo mucho para WPs pequeños
- Requiere crear `workflow-discover` (renombrar actual), `workflow-measure` (nuevo), `workflow-analyze` (refocused)
- La renumeración de Phase 4→9 implica actualizar todos los scripts y artefactos que usan "Phase 4", "Phase 5", etc.

### Opción C: Renombrar Phase 1 y agregar MEASURE como Phase 2 obligatoria (mínimo viable)

```
Phase 1: DISCOVER   — IDENTIFY + DEFINE + UNDERSTAND (renombrar el actual ANALYZE — mismo contenido)
Phase 2: MEASURE    — nueva fase: baseline, datos, métricas actuales, performance (NUEVA)
Phase 3: ANALYZE    — causa raíz real, gaps, dinámicas (nueva — antes no existía explícitamente)
Phase 4: STRATEGY   — sin cambio de contenido (antes Phase 2)
Phase 5: PLAN       — sin cambio de contenido (antes Phase 3)
Phase 6: STRUCTURE  — sin cambio de contenido (antes Phase 4)
Phase 7: DECOMPOSE  — sin cambio de contenido (antes Phase 5)
Phase 8: EXECUTE    — sin cambio de contenido (antes Phase 6)
Phase 9: TRACK      — sin cambio de contenido (antes Phase 7)
```

**Pros:**
- Corrige el error de naming sin reescribir el contenido de las fases existentes
- Agrega el paso MEASURE explícitamente — el más frecuentemente omitido
- Agrega ANALYZE como fase propia con propósito honesto (causa raíz)
- STRATEGY, PLAN, STRUCTURE, DECOMPOSE, EXECUTE, TRACK no cambian de contenido — solo se renumeran
- Compatibilidad máxima: el contenido de los skills actuales migra casi sin cambios
- Escalabilidad preservada: WPs micro pueden hacer DISCOVER → EXECUTE directo; WPs pequeños pueden saltar MEASURE
- El mapping al patrón universal es correcto aunque no sea 1:1 perfecto (DISCOVER cubre pasos 1-3)

**Contras:**
- DISCOVER sigue comprimiendo 3 pasos (IDENTIFY + DEFINE + UNDERSTAND) — no es granularidad total
- La renumeración Phase 2-7 → Phase 4-9 requiere actualizar scripts, templates y documentación
- Los WPs activos con `phase: Phase 2` a `phase: Phase 7` necesitan mapeo de compatibilidad

**Reglas de escalabilidad por tamaño de WP con Opción C:**

| Tamaño | Fases obligatorias | Fases opcionales |
|--------|-------------------|-----------------|
| Micro (<30 min) | DISCOVER, EXECUTE | MEASURE, ANALYZE, STRATEGY, PLAN, STRUCTURE, DECOMPOSE, TRACK |
| Pequeño (30 min–2h) | DISCOVER, STRATEGY, EXECUTE, TRACK | MEASURE, ANALYZE, PLAN, STRUCTURE, DECOMPOSE |
| Mediano (2h–8h) | DISCOVER, MEASURE, ANALYZE, STRATEGY, PLAN, EXECUTE, TRACK | STRUCTURE, DECOMPOSE |
| Grande (>8h) | Todas las 9 fases | Ninguna |

---

## Sección 4: Impacto en la infraestructura existente

| Componente | Impacto con Opción C | Nivel de cambio |
|-----------|---------------------|----------------|
| `workflow-analyze/SKILL.md` | Renombrar → `workflow-discover/SKILL.md`; crear `workflow-measure/SKILL.md` (nuevo); crear `workflow-analyze/SKILL.md` refocused (causa raíz, no 8 aspectos) | ALTO — 2 archivos nuevos, 1 renombrado |
| `thyrox/SKILL.md` — catálogo de fases | Actualizar tabla de 7 → 9 fases; renombrar Phase 1→DISCOVER, agregar Phase 2→MEASURE, Phase 3→ANALYZE; renumerar Phase 2-7 → Phase 4-9 | MEDIO — edición de tabla y catálogo |
| `thyrox/SKILL.md` — referencias por dominio | Actualizar sección "Phase 1: ANALYZE" → "Phase 1: DISCOVER", agregar "Phase 2: MEASURE", "Phase 3: ANALYZE" | BAJO — edición de links |
| `session-start.sh` — `_phase_to_display()` | Agregar casos: `"Phase 1"→"DISCOVER"`, `"Phase 2"→"MEASURE"`, `"Phase 3"→"ANALYZE"`; renumerar `"Phase 2"→"Phase 4"` etc. | MEDIO — editar función de mapeo |
| `session-start.sh` — `_phase_to_command()` | Agregar: `"discover"→/thyrox:discover`, `"measure"→/thyrox:measure`, `"analyze"→/thyrox:analyze`; renumerar comandos Phase 2-7 | MEDIO — editar función de comandos |
| `now.md::phase` (WPs activos) | `"Phase 1"` → legacy compatible si DISCOVER = Phase 1; `"Phase 2"-"Phase 7"` necesitan mapeo → `"Phase 4"-"Phase 9"` | ALTO — migración de WPs activos |
| `scalability.md` (references) | Actualizar reglas de qué fases omitir: nueva tabla con 9 fases y reglas por tamaño | MEDIO — reescribir tabla de escalabilidad |
| `exit-conditions.md.template` | Agregar gates: DISCOVER→MEASURE, MEASURE→ANALYZE, ANALYZE→STRATEGY; renumerar gates existentes | MEDIO — extender template |
| `introduction.md.template` | Agregar sección "Tipo de WP y fases activas" que refleje las 9 fases | BAJO — adición de sección |
| Registry `sdlc.yml` (si existe) | Actualizar de 7 steps a 9 steps; agregar `discover`, `measure`, `analyze` | MEDIO — editar YAML |
| `ROADMAP.md` | Nota de cambio de arquitectura de fases; actualizar cualquier referencia a "7 fases" | BAJO |
| `CLAUDE.md` — glosario | Actualizar descripción de "Phase N" (1-7 → 1-9) | BAJO |
| `workflow-analyze/references/scalability.md` | Migrar a `workflow-discover/references/` o moverlo a thyrox/references/ como crossphase | BAJO |
| ADRs existentes que mencionen "7 fases" | Agregar nota de actualización (no modificar el ADR — agregar ADR nuevo) | BAJO |
| `.claude-plugin/plugin.json` | Agregar comandos `/thyrox:discover`, `/thyrox:measure`, `/thyrox:analyze` al namespace del plugin | MEDIO |

---

## Sección 5: Compatibilidad hacia atrás

La reestructuración no puede romper WPs activos. Los WPs existentes tienen valores `phase: Phase 1` a `phase: Phase 7` en sus `now.md`.

### Análisis de riesgo de compatibilidad

| Escenario | Riesgo | Mitigación |
|-----------|--------|-----------|
| WP activo con `phase: Phase 1` | BAJO — Phase 1 se renombra DISCOVER pero el contenido es idéntico | `"Phase 1"` sigue siendo válido como alias de DISCOVER |
| WP activo con `phase: Phase 2` | ALTO — Phase 2 antes era STRATEGY, ahora Phase 2 es MEASURE | Requiere mapeo explícito o campo adicional `phase_name` |
| WP activo con `phase: Phase 3`-`Phase 7` | ALTO — renumeración desplaza todos estos valores | Requieren actualización o alias |

### Estrategias de compatibilidad

**Estrategia 1 — Legacy aliases en session-start.sh:**
```bash
_phase_to_command() {
    case "$1" in
        # Nuevo scheme (9 fases)
        "Phase 1"|"discover") echo "/thyrox:discover" ;;
        "Phase 2"|"measure")  echo "/thyrox:measure"  ;;
        "Phase 3"|"analyze")  echo "/thyrox:analyze"  ;;
        "Phase 4"|"strategy") echo "/thyrox:strategy" ;;
        "Phase 5"|"plan")     echo "/thyrox:plan"      ;;
        "Phase 6"|"structure") echo "/thyrox:structure" ;;
        "Phase 7"|"decompose") echo "/thyrox:decompose" ;;
        "Phase 8"|"execute")  echo "/thyrox:execute"  ;;
        "Phase 9"|"track")    echo "/thyrox:track"    ;;
        # Legacy aliases (7 fases — WPs existentes)
        "Phase 2 (legacy)"|"strategy-legacy") echo "/thyrox:strategy" ;;
        *) echo "/thyrox:discover" ;;
    esac
}
```

**Estrategia 2 — Migración incremental:**
- Los WPs activos terminan con el scheme de 7 fases (Phase 1-7) sin cambios
- Los WPs nuevos creados después de la reestructuración usan Phase 1-9
- `session-start.sh` detecta el scheme por presencia de `phase_scheme: legacy-7` vs `phase_scheme: v2-9` en `now.md`

**Estrategia 3 — Campo `phase_name` en now.md (recomendada):**
Agregar campo `phase_name` al frontmatter de `now.md`:
```yaml
phase: "Phase 3"          # número de fase (compatibilidad)
phase_name: "strategy"    # nombre semántico (nuevo — resuelve ambigüedad)
```
El `session-start.sh` prioriza `phase_name` si existe, cae a `phase` si no. Los WPs existentes sin `phase_name` mantienen comportamiento legacy.

**Opción C es la más compatible** porque el contenido de la Phase 1 actual (los 8 aspectos) pasa íntegro a DISCOVER. Los WPs que están en "Phase 1" siguen funcionando. Los WPs en "Phase 2"-"Phase 7" necesitan migración pero su contenido no cambia — solo se renumeran.

---

## Sección 6: Recomendación

**Recomendación: Opción C con campo `phase_name` para compatibilidad.**

### Justificación

**1. Honestidad estructural con costo mínimo:**
Opción C corrige el error fundamental — el naming incorrecto de Phase 1 — sin reescribir el contenido de las fases existentes. El contenido de STRATEGY, PLAN, STRUCTURE, DECOMPOSE, EXECUTE y TRACK es correcto; solo están mal numerados. La corrección principal es: (a) renombrar Phase 1→DISCOVER, (b) agregar MEASURE como fase explícita, (c) agregar ANALYZE como fase de causa raíz real.

**2. MEASURE es el valor diferencial:**
El patrón universal validado en 15 frameworks muestra que MEASURE es el paso más frecuentemente omitido. Agregar MEASURE como fase explícita en THYROX es la corrección de mayor valor para usuarios del plugin — es el paso que distingue un análisis basado en datos de un análisis basado en opiniones.

**3. Alineación con DMAIC (el framework más usado en calidad):**
Opción C produce: DISCOVER (Define) + MEASURE + ANALYZE + STRATEGY/PLAN (Improve) + TRACK (Control). El mapping a DMAIC es directo. Un usuario que conoce DMAIC puede aprender THYROX en minutos. Esto es relevante para el plugin — reduce la curva de adopción.

**4. Backward compatibility preservada:**
Opción A y B requieren renumerar fases y reescribir contenido de skills — riesgo de regresión en un sistema en producción. Opción C preserva el contenido existente y propone aliases para los WPs activos.

**5. El patrón universal valida 9 pasos, Opción C cumple en espíritu:**
DISCOVER cubre IDENTIFY + DEFINE + UNDERSTAND (pasos 1-3). No es granularidad perfecta, pero el patrón universal no requiere que cada fase = exactamente 1 paso — PDCA tiene "Plan" que cubre múltiples actividades. La granularidad de DISCOVER es razonable para WPs medianos y pequeños; WPs grandes pueden usar sub-documentos dentro de DISCOVER para documentar IDENTIFY, DEFINE y UNDERSTAND por separado.

**6. Overhead de implementación:**
- Opción A: 4 nuevos skills + reescritura completa de templates + migración de todos los WPs activos
- Opción B: 3 nuevos skills + renumeración completa + migración de todos los WPs activos
- Opción C: 2 nuevos skills (`workflow-measure`, `workflow-analyze` refocused) + 1 skill renombrado (`workflow-discover`) + aliases de compatibilidad

Opción C tiene el menor overhead manteniendo la corrección conceptual.

### Lo que Opción C NO resuelve

Para ser transparentes, Opción C tiene limitaciones conocidas:

- DISCOVER sigue siendo cognitivamente denso (3 pasos comprimidos) — si el WP es grande, el usuario puede sentir que hay "demasiado" en Phase 1
- No hay gate entre IDENTIFY y DEFINE dentro de DISCOVER — si el problema está mal identificado, hay que rehacer DISCOVER completa
- El mapeo 1:1 con Problem Solving 8-step (Toyota) que tiene Identify + Clarify + Set Target separados no es posible con DISCOVER como fase única

Estas limitaciones justifican que Opción A o B se evalúen en una FASE futura si el feedback de usuarios del plugin indica que DISCOVER sigue siendo demasiado grande.

---

## Sección 7: Implicación para FASE 39 (plugin-distribution)

### El plugin debe distribuir la versión correcta del SDLC

La distribución del plugin es la oportunidad para establecer el SDLC correcto como estándar. Una vez que usuarios adopten THYROX con "7 fases y Phase 1 ANALYZE", la corrección posterior genera friction de migración.

**Recomendación:** La reestructuración (Opción C) debe completarse ANTES de la distribución del plugin. Los archivos distribuidos deben tener ya los nombres correctos: `workflow-discover`, `workflow-measure`, `workflow-analyze`.

### Impacto en artefactos del plugin

| Artefacto del plugin | Cambio requerido |
|---------------------|-----------------|
| `.claude-plugin/plugin.json` — commands | Agregar `/thyrox:discover`, `/thyrox:measure`, `/thyrox:analyze`; mantener alias `/thyrox:analyze` para backward compat del skill existente |
| Skills distribuidos | Incluir `workflow-discover/`, `workflow-measure/`, `workflow-analyze/` en el bundle; deprecar `workflow-analyze/` con el contenido actual |
| `thyrox/SKILL.md` — catálogo | Mostrar las 9 fases correctas a los nuevos usuarios desde el día 1 |
| Registry `sdlc.yml` | 9 steps con nombres correctos: `discover`, `measure`, `analyze`, `strategy`, `plan`, `structure`, `decompose`, `execute`, `track` |
| Templates distribuidos | `exit-conditions.md.template` con gates para 9 fases |
| Documentación del plugin | Onboarding que enseña las 9 fases con la explicación del patrón universal |

### GAP-011: Reestructuración del SDLC como prerequisito del plugin

Esta reestructuración debe registrarse como **GAP-011** en el risk register del WP `plugin-distribution`:

```
GAP-011: SDLC actual tiene 7 fases con naming incorrecto (Phase 1 ANALYZE hace IDENTIFY+DEFINE+UNDERSTAND+MEASURE)
Riesgo: El plugin distribuiría la versión incorrecta del framework — difícil de corregir post-distribución
Impacto: ALTO — afecta la propuesta de valor del plugin y su alineación con metodologías estándar (DMAIC, Problem Solving)
Probabilidad: CERTEZA — el error estructural está documentado
Mitigación: Completar reestructuración (Opción C) como prerequisito de la distribución del plugin
Responsable: FASE 39 sub-tarea: "reestructuración SDLC 7→9 fases"
Estado: ABIERTO — requiere decisión sobre Opción A, B o C antes de continuar
```

### Secuencia recomendada dentro de FASE 39

```
1. Aprobar Opción C (esta decisión)
2. Crear ADR: adr-sdlc-9fases-restructuring.md
3. Crear workflow-measure/SKILL.md (nueva fase)
4. Renombrar workflow-analyze → workflow-discover; actualizar contenido mínimo
5. Crear workflow-analyze/SKILL.md refocused (causa raíz, no los 8 aspectos)
6. Actualizar thyrox/SKILL.md — catálogo de 9 fases
7. Actualizar session-start.sh — agregar aliases y nuevas fases
8. Actualizar exit-conditions.md.template — 9 gates
9. Actualizar plugin.json — agregar commands para las nuevas fases
10. Actualizar scalability.md — tabla de 9 fases por tamaño
11. Migrar WPs activos (agregar phase_name al now.md)
12. Actualizar sdlc.yml en registry
```

Esta secuencia puede ejecutarse en una sub-FASE de FASE 39 o como FASE independiente (FASE 40: sdlc-restructuring) antes del lanzamiento del plugin.

---

## Tabla resumen: Comparación de opciones

| Criterio | Opción A (9 fases 1:1) | Opción B (9 fases agrupadas) | Opción C (mínimo viable) |
|----------|----------------------|------------------------------|--------------------------|
| Alineación con patrón universal | Perfecta (1:1) | Alta (3+6) | Buena (DISCOVER cubre 1-3) |
| Corrección de naming | Completa | Completa | Completa |
| MEASURE como fase explícita | Sí (Phase 4) | Sí (Phase 2) | Sí (Phase 2) |
| ANALYZE honesto | Sí (Phase 5) | Sí (Phase 3) | Sí (Phase 3) |
| Backward compatibility | BAJA | BAJA-MEDIA | ALTA |
| Nuevos skills a crear | 4 | 3 | 2 |
| Overhead de implementación | MUY ALTO | ALTO | MEDIO |
| WPs activos afectados | Todos | Todos | Parcialmente |
| Adecuado para plugin v1 | No — demasiado cambio | Posible — pero costoso | Sí — corrección sin ruptura |
| Recomendación | FASE futura (v2) | FASE futura (v1.5) | **AHORA (v1)** |
