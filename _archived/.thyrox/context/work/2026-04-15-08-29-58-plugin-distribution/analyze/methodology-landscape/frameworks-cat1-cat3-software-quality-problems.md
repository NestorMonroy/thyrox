---
created_at: 2026-04-15 10:30:00
project: THYROX
topic: Sub-análisis detallado — Categorías 1-3 (Software Development, Mejora de Calidad, Resolución de Problemas)
author: NestorMonroy
status: Borrador
---

# Sub-análisis: Categorías 1-3 — Software Development, Mejora de Calidad, Resolución de Problemas

## Tabla Resumen — Frameworks de Categorías 1-3

| # | Framework | Categoría | Tipo | Flexibilidad | Primer Paso | Fases | Skills THYROX propuestos |
|---|-----------|-----------|------|--------------|-------------|-------|--------------------------|
| 1 | SDLC | Software Development | Secuencial/Waterfall | BAJA | Planning | 7 | analyze, strategy, plan, structure, decompose, execute, track |
| 2 | PDCA | Mejora de Procesos | Cíclico/Iterativo | ALTA | Plan | 4 | pdca-plan, pdca-do, pdca-check, pdca-act |
| 3 | DMAIC (Six Sigma) | Mejora de Calidad | Secuencial | BAJA-MEDIA | Define | 5 | dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control |
| 4 | Lean Six Sigma | Mejora de Calidad | Secuencial (Lean+DMAIC) | MEDIA | Define | 5 | lss-define, lss-measure, lss-analyze, lss-improve, lss-control |
| 5 | Problem Solving 8-step (Toyota) | Resolución de Problemas | Secuencial | BAJA-MEDIA | Identify | 8 | ps-identify, ps-clarify, ps-target, ps-analyze, ps-implement, ps-check, ps-standardize, ps-reflect |
| — | VACANTE (#12 en lista) | Resolución de Problemas | TBD | TBD | TBD | TBD | TBD |

---

## Taxonomía de flexibilidad y arquitectura de coordinación

La flexibilidad de un framework determina directamente el tipo YAML del registry y el comportamiento del coordinator. Un coordinator que simplemente dice "tu siguiente paso es X" es correcto para SDLC (BAJA) pero **incorrecto para PDCA (ALTA)**, donde el "Do" es experimentación a pequeña escala y puede volver a "Plan" antes de completar "Check".

| Nivel | Tipo YAML | Comportamiento del Coordinator | Ejemplos en Cat1-3 |
|-------|-----------|-------------------------------|-------------------|
| **BAJA** | `sequential` | "Tu siguiente paso es: {next[0]}" — determinístico | SDLC, DMAIC |
| **BAJA-MEDIA** | `sequential-conditional` | "Siguiente: {next[0]}. Si la condición X, puede volver a {step_back}" | Problem Solving 8-step |
| **MEDIA** | `sequential-adaptive` | "Siguiente: {next[0]}. La profundidad de esta fase depende del contexto" | Lean Six Sigma |
| **MEDIA-ALTA** | `adaptive` | "Opciones: {next}. Elige según tu contexto actual" | — (no en Cat1-3) |
| **ALTA** | `adaptive-free` | "Fase completada cuando el objetivo se cumple, no cuando se completan actividades fijas" | PDCA |
| **No-secuencial** | `non-sequential` | "Todas las áreas disponibles: {all_steps}" | — (BA/BABOK, fuera de Cat1-3) |

**Consecuencia arquitectónica clave:** El tipo YAML del registry no es solo metadata — define qué lógica usa el coordinator para generar su próximo mensaje. Un `sequential` no necesita lógica condicional; un `sequential-conditional` necesita evaluar predicados; un `adaptive-free` necesita preguntar al usuario sobre su estado en lugar de presumir el siguiente paso.

---

## Categoría 1: Software Development

### SDLC — Software Development Life Cycle

**Tipo:** Secuencial / Waterfall
**Subtipo:** Ciclo de vida completo de software
**Flexibilidad:** BAJA

**Primer paso:** Planning — identificar objetivos, alcance, viabilidad

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Planning | Identificar objetivos del proyecto, definir alcance, evaluar viabilidad técnica y económica, asignar recursos |
| 2 | Analysis / Requirements Analysis | Determinar qué debe hacer el software; recopilar y documentar requisitos funcionales y no funcionales con stakeholders |
| 3 | Design | Definir arquitectura del sistema, diseño de base de datos, interfaces, especificaciones técnicas detalladas |
| 4 | Development / Implementation / Coding | Construir el software según especificaciones de diseño; escritura de código, integración de módulos |
| 5 | Testing | Verificar que el software funciona correctamente; pruebas unitarias, integración, sistema, aceptación |
| 6 | Deployment | Poner el software en producción; migración de datos, capacitación de usuarios, go-live |
| 7 | Maintenance | Mantener y mejorar el sistema post-lanzamiento; corrección de bugs, actualizaciones, soporte continuo |

#### Características Clave

- **Lineal y predecible:** cada fase debe completarse antes de comenzar la siguiente
- **Documentación extensa:** produce artefactos formales en cada fase (SRS, SDD, Test Plans)
- **Control de cambios estricto:** difícil adaptar a cambios de requisitos una vez iniciado
- **Visibilidad clara:** los stakeholders conocen el estado exacto del proyecto en todo momento
- **Aplicación:** desarrollo con requisitos bien conocidos, proyectos gubernamentales, sistemas críticos

#### Verificación del Patrón Universal

Comienza con **Planning** = identificación de objetivos, alcance y viabilidad. El problema/necesidad queda claramente articulado antes de proceder. ✓

#### Mapeo a Skills de THYROX

Los 7 skills actuales de THYROX mapean directamente a las 7 fases del SDLC:

| Fase SDLC | Skill THYROX | Comando |
|-----------|-------------|---------|
| Planning | analyze | `/thyrox:analyze` |
| Analysis/Requirements | strategy | `/thyrox:strategy` |
| Design | plan + structure | `/thyrox:plan`, `/thyrox:structure` |
| Development | execute | `/thyrox:execute` |
| Testing | (integrado en execute/structure) | — |
| Deployment | execute | `/thyrox:execute` |
| Maintenance | track | `/thyrox:track` |

**Nota:** SDLC ya está implementado como el flujo base de THYROX. No requiere nuevos skills.

#### Implicaciones para el coordinator y el skill

- **Coordinator:** lineal estricto — el `next` es siempre el paso inmediatamente siguiente. No hay bifurcaciones ni loops.
- **Skill:** instrucciones de completar todos los entregables definidos antes de pasar a la fase siguiente.
- **Gate:** hard gate — los artefactos deben existir antes de continuar (SRS antes de Design, etc.).
- **Registry YAML:** `type: sequential`

```yaml
type: sequential
steps:
  - id: sdlc-planning
    next: [sdlc-analysis]
  - id: sdlc-analysis
    next: [sdlc-design]
  # … cada paso apunta exactamente al siguiente
```

---

## Categoría 2: Mejora de Procesos y Calidad

### PDCA — Plan-Do-Check-Act

**Tipo:** Cíclico / Iterativo
**Subtipo:** Mejora continua de procesos
**Flexibilidad:** ALTA

**Primer paso:** Plan — planificar mejoras, identificar problema

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Plan | Planificar cambios o mejoras; identificar el problema o área de mejora, establecer objetivos, diseñar solución hipotética |
| 2 | Do | Implementar el plan a pequeña escala (experimentación controlada); ejecutar cambio piloto, recopilar datos |
| 3 | Check | Evaluar resultados del piloto contra los objetivos planificados; analizar datos, identificar desviaciones |
| 4 | Act | Ajustar e implementar permanentemente si resultados son positivos; estandarizar o volver a Plan si no lo son |

#### Características Clave

- **Infinitamente repetible:** el ciclo continúa indefinidamente para mejora continua
- **Bajo riesgo:** la implementación a pequeña escala en Do minimiza impacto de errores
- **Escalable:** aplica desde mejoras individuales hasta transformaciones organizacionales
- **Simple:** solo 4 pasos, fácil de entender y adoptar en cualquier nivel organizacional
- **Adapta a descubrimientos:** los hallazgos en Check pueden reiniciar el ciclo con nueva información

#### Diferencia con DMAIC

| Aspecto | PDCA | DMAIC |
|---------|------|-------|
| Cuándo usar | Causa del problema YA conocida; implementar y probar solución | Causa del problema DESCONOCIDA; identificar y analizar causas |
| Complejidad | Simple, ágil | Riguroso, estadístico |
| Certificación | No requiere | Requiere (Cinturones) |
| Ciclo | Continuo, iterativo | Proyecto con inicio y fin |
| Riesgo | Bajo (piloto pequeño) | Medio-Alto (análisis exhaustivo) |

**Regla práctica:** Si ya sabes qué está mal → PDCA. Si no sabes por qué está mal → DMAIC.

#### Verificación del Patrón Universal

Comienza con **Plan** que incluye explícitamente identificación del problema y planificación de mejoras. ✓

#### Mapeo a Skills de THYROX

Skills propuestos: 4 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Plan | pdca-plan | `/thyrox:pdca-plan` |
| Do | pdca-do | `/thyrox:pdca-do` |
| Check | pdca-check | `/thyrox:pdca-check` |
| Act | pdca-act | `/thyrox:pdca-act` |

#### Implicaciones para el coordinator y el skill

PDCA es el caso **más complejo** de Cat1-3 por su flexibilidad ALTA y naturaleza cíclica.

- **Do** es EXPERIMENTACIÓN A PEQUEÑA ESCALA — puede durar 1 hora o 1 semana; no hay duración predeterminada.
- **Check** puede revelar que el **Plan** era incorrecto → el ciclo vuelve a Plan sin completar Act. Este no es un fallo; es el mecanismo esperado del framework.
- El ciclo completo puede ejecutarse en minutos (kaizen rápido) o meses (transformación organizacional).
- **Coordinator:** pregunta al usuario sobre sus hallazgos en lugar de presumir el siguiente paso.

  > "¿Qué encontraste en esta fase? ¿El resultado sugiere continuar al siguiente paso o ajustar el Plan?"

- **Gate:** soft gate — "¿Tienes suficiente información/resultado para avanzar?" No hay lista de entregables obligatoria.
- **Registry YAML:** `type: cyclic-adaptive` (no solo `cyclic` — la naturaleza adaptativa es parte del tipo)

```yaml
type: cyclic-adaptive
steps:
  - id: pdca-plan
    next:
      - default: [pdca-do]
  - id: pdca-do
    next:
      - default: [pdca-check]
  - id: pdca-check
    next:
      - condition: "resultado_positivo"
        then: [pdca-act]
      - condition: "plan_incorrecto"
        then: [pdca-plan]   # loop explícito de vuelta a Plan
  - id: pdca-act
    next:
      - condition: "mejora_completa"
        then: [__end__]
      - condition: "mejora_continua"
        then: [pdca-plan]   # nuevo ciclo
```

- **Skill:** "Esta fase es completa cuando el objetivo específico se cumple, no cuando se completan actividades predeterminadas. Las actividades son guías, no mandatos."

---

### DMAIC — Define, Measure, Analyze, Improve, Control

**Tipo:** Secuencial
**Subtipo:** Six Sigma (son lo mismo — DMAIC IS Six Sigma)
**Flexibilidad:** BAJA-MEDIA

**Primer paso:** Define — identificar y clarificar el problema

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Define | Establecer el problema claramente; definir objetivos del proyecto, identificar stakeholders, crear Project Charter |
| 2 | Measure | Medir el performance actual con indicadores específicos; establecer baseline, validar sistema de medición |
| 3 | Analyze | Identificar causas raíz usando herramientas estadísticas; separar causas de síntomas, priorizar causas |
| 4 | Improve | Generar, probar y optimizar soluciones; diseñar experimentos (DOE), implementar mejoras seleccionadas |
| 5 | Control | Asegurar permanencia de mejoras; desarrollar SOPs, implementar monitoreo, transferir a proceso operativo |

#### Características Clave

- **Data-driven:** toda decisión basada en datos y estadística, no en intuición
- **Estructura rígida:** las fases deben seguirse en orden; no se puede saltear
- **Reducción de variabilidad:** objetivo primario reducir defectos y variación en procesos
- **Herramientas estadísticas:** control charts, capability analysis, regression, hypothesis testing
- **Certificación por niveles:** Cinturón Blanco, Amarillo, Verde, Negro (Black Belt), Master Black Belt

#### Nota Crítica: DMAIC = Six Sigma

DMAIC no es "una metodología de Six Sigma" — DMAIC **es** Six Sigma. El nombre "Six Sigma" refiere al objetivo estadístico (3.4 defectos por millón de oportunidades); DMAIC es la metodología para alcanzarlo. Documentación que los separa como frameworks distintos es incorrecta.

#### Variante: DMADV

Para procesos **nuevos** existe DMADV (Define-Measure-Analyze-Design-Verify):
- DMAIC = **optimizar** procesos existentes con defectos
- DMADV = **diseñar** procesos o productos nuevos con Six Sigma desde el inicio

#### Verificación del Patrón Universal

Comienza con **Define** = identificar y clarificar el problema, definir objetivos. ✓

#### Mapeo a Skills de THYROX

Skills propuestos: 5 skills nuevos (uno por fase)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Define | dmaic-define | `/thyrox:dmaic-define` |
| Measure | dmaic-measure | `/thyrox:dmaic-measure` |
| Analyze | dmaic-analyze | `/thyrox:dmaic-analyze` |
| Improve | dmaic-improve | `/thyrox:dmaic-improve` |
| Control | dmaic-control | `/thyrox:dmaic-control` |

#### Implicaciones para el coordinator y el skill

- **Control** puede durar semanas o meses dependiendo del proceso — el coordinator no puede presumir que se completa rápido.
- **Analyze** puede iterarse si las causas raíz no quedan claramente identificadas tras el primer análisis estadístico.
- **Coordinator:** mayormente lineal, pero con preguntas de verificación en Analyze ("¿Las causas raíz identificadas explican el problema?") y en Control ("¿El proceso se ha estabilizado?").
- **Gate:**
  - Hard gate en Define y Measure — el Project Charter debe existir; la baseline de datos debe estar validada antes de continuar.
  - Soft gate en Analyze — continuar cuando "suficientes" causas raíz están identificadas (juicio experto, no lista predefinida).
  - Soft gate en Control — continuar (cerrar el proyecto) cuando el proceso demuestra estabilidad estadística.
- **Registry YAML:** `type: sequential` con `gate: conditional` en Analyze y Control.

```yaml
type: sequential
steps:
  - id: dmaic-define
    gate: hard
    next: [dmaic-measure]
  - id: dmaic-measure
    gate: hard
    next: [dmaic-analyze]
  - id: dmaic-analyze
    gate: conditional          # soft: "¿causas raíz identificadas?"
    next:
      - condition: "causas_identificadas"
        then: [dmaic-improve]
      - condition: "causas_insuficientes"
        then: [dmaic-analyze]  # re-iteración interna
  - id: dmaic-improve
    gate: hard
    next: [dmaic-control]
  - id: dmaic-control
    gate: conditional          # soft: "¿proceso estabilizado?"
    next: [__end__]
```

---

### Lean Six Sigma

**Tipo:** Secuencial (fusión de Lean Manufacturing + Six Sigma/DMAIC)
**Subtipo:** Mejora de calidad y eficiencia combinadas
**Flexibilidad:** MEDIA

**Primer paso:** Define — identificar problema/oportunidad Y desperdicios

#### Fases

| # | Fase | Descripción | Herramientas Lean | Herramientas Six Sigma |
|---|------|-------------|-------------------|------------------------|
| 1 | Define | Identificar problema/oportunidad; mapear desperdicios iniciales; definir VOC (Voice of Customer) | SIPOC, VSM (alto nivel) | Project Charter, RACI |
| 2 | Measure | Medir rendimiento actual; mapear flujo de valor completo (As-Is); identificar desperdicios cuantificados | Value Stream Map, tiempo de ciclo | Baseline data, MSA |
| 3 | Analyze | Identificar causas raíz de ineficiencias Y fuentes de variación estadística | Spaghetti diagrams, 5S audit | Fishbone, 5 Whys, estadística |
| 4 | Improve | Eliminar desperdicios (Lean) + reducir variación (Six Sigma); implementar flujo continuo | Kanban, Kaizen events, 5S | DOE, piloto controlado |
| 5 | Control | Monitorear resultados combinados; crear SOPs integrados; sustituir desperdicio por estándar | Visual management, Poka-yoke | Control charts, SOP |

#### Características Clave y Diferencias

| Dimensión | Lean | Six Sigma | Lean Six Sigma |
|-----------|------|-----------|----------------|
| Objetivo | Velocidad/eficiencia | Precisión/calidad | Velocidad + calidad |
| Problema que ataca | Tiempos muertos, desperdicios | Defectos, variación | Ambos simultáneamente |
| Filosofía | Eliminar lo que no agrega valor | Reducir defectos a 3.4 ppm | Flujo rápido y sin defectos |
| Herramientas principales | VSM, 5S, Kanban, Kaizen | Control charts, Pareto, estadística | Ambos sets de herramientas |

**Los 8 desperdicios Lean (DOWNTIME):** Defects, Overproduction, Waiting, Non-utilized talent, Transportation, Inventory, Motion, Extra-processing.

#### Verificación del Patrón Universal

Comienza con **Define** = identificación del problema/oportunidad y desperdicios iniciales. ✓

#### Mapeo a Skills de THYROX

Skills propuestos: 5 skills nuevos (mismo patrón DMAIC + extensión Lean)

| Fase | Skill propuesto | Comando |
|------|----------------|---------|
| Define | lss-define | `/thyrox:lss-define` |
| Measure | lss-measure | `/thyrox:lss-measure` |
| Analyze | lss-analyze | `/thyrox:lss-analyze` |
| Improve | lss-improve | `/thyrox:lss-improve` |
| Control | lss-control | `/thyrox:lss-control` |

#### Implicaciones para el coordinator y el skill

- Las herramientas Lean dentro de cada fase (5S, Kanban, VSM) varían según el tipo de desperdicio identificado — el skill no puede prescribir una herramienta fija.
- La profundidad de **Improve** depende del gap entre el estado As-Is y To-Be: un gap pequeño requiere menos iteración que uno estructural.
- **Coordinator:** lineal en secuencia pero con preguntas de profundidad en cada fase.

  > "¿Qué desperdicios específicos identificaste en esta fase? ¿Cuál es el impacto cuantificado?"

- **Gate:** soft gate en Improve — "¿Es suficiente la mejora alcanzada para proceder a Control?" La respuesta depende del objetivo establecido en Define.
- **Registry YAML:** `type: sequential-adaptive` con `depth_variable: true`

```yaml
type: sequential-adaptive
depth_variable: true          # la profundidad de cada fase varía por contexto
steps:
  - id: lss-define
    next: [lss-measure]
  - id: lss-measure
    next: [lss-analyze]
  - id: lss-analyze
    next: [lss-improve]
  - id: lss-improve
    gate: conditional          # soft: "¿mejora suficiente?"
    next: [lss-control]
  - id: lss-control
    next: [__end__]
```

---

## Categoría 3: Resolución de Problemas

### Problem Solving 8-Step — Toyota Way

**Tipo:** Secuencial
**Subtipo:** Resolución rigurosa de problemas operativos
**Flexibilidad:** BAJA-MEDIA

**Primer paso:** Identify — detectar anomalías o desviaciones

**Responsable histórico:** Taiichi Ohno (Toyota Production System)
**Filosofía central:** "Go see, ask why 5 times"

#### Fases

| # | Fase | Descripción |
|---|------|-------------|
| 1 | Identify | Detectar anomalías, desviaciones o problemas en producción/procesos; hacer visible lo que está mal |
| 2 | Clarify | Precisar el problema con exactitud: scope, ubicación, frecuencia, impacto cuantificado |
| 3 | Set Target | Establecer fecha objetivo y métricas de éxito para la resolución; qué significa "resuelto" |
| 4 | Analyze Root Cause | Usar 5 Whys para llegar a la causa fundamental (no síntoma); validar causa con datos |
| 5 | Implement | Desarrollar e implementar correcciones dirigidas a la causa raíz identificada |
| 6 | Check | Evaluar resultados contra el target definido en paso 3; medir si el problema fue resuelto |
| 7 | Standardize | Crear procedimientos estándar para prevenir recurrencia; actualizar SOPs y entrenar equipo |
| 8 | Reflect | Documentar aprendizajes; compartir conocimiento con equipo; celebrar logros |

#### Características Clave

- **Riguroso y disciplinado:** los 8 pasos deben seguirse en secuencia
- **Enfocado en causa raíz:** no acepta soluciones a síntomas
- **Prevención de recurrencia:** la estandarización (paso 7) es obligatoria, no opcional
- **Go to Gemba:** el análisis se hace en el lugar donde ocurre el problema
- **Aplicación original:** manufacturing y operaciones; adaptable a cualquier dominio

#### Relación con Otras Metodologías

| Aspecto | Problem Solving 8-Step | DMAIC |
|---------|----------------------|-------|
| Origen | Toyota (manufactura) | Motorola/GE (procesos) |
| Herramienta principal | 5 Whys | Estadística avanzada |
| Complejidad | Media | Alta |
| Certificación | No formal | Sí (Cinturones) |
| Tiempo típico | Días-semanas | Semanas-meses |
| Scope | Problema específico | Proceso completo |

#### Verificación del Patrón Universal

Comienza con **Identify** = detectar anomalías y hacer visible el problema. ✓

#### Mapeo a Skills de THYROX

Skills propuestos: 8 skills nuevos (uno por paso)

| Paso | Skill propuesto | Comando |
|------|----------------|---------|
| Identify | ps-identify | `/thyrox:ps-identify` |
| Clarify | ps-clarify | `/thyrox:ps-clarify` |
| Set Target | ps-target | `/thyrox:ps-target` |
| Analyze Root Cause | ps-analyze | `/thyrox:ps-analyze` |
| Implement | ps-implement | `/thyrox:ps-implement` |
| Check | ps-check | `/thyrox:ps-check` |
| Standardize | ps-standardize | `/thyrox:ps-standardize` |
| Reflect | ps-reflect | `/thyrox:ps-reflect` |

#### Implicaciones para el coordinator y el skill

El paso **Check** (paso 6) tiene un loop explícito: si el resultado no alcanza el target definido en el paso 3 → volver al paso 4 "Analyze Root Cause". Este es un flujo **condicional**, no solo secuencial.

- **Coordinator:**

  > "¿El resultado del Check alcanza el target establecido en 'Set Target'? Si sí, procedemos a Standardize. Si no, volvemos a Analyze Root Cause."

- **Gate:** conditional gate en Check → bifurcación a Analyze o a Standardize según el resultado.
- **Registry YAML:** `type: sequential-conditional`

```yaml
type: sequential-conditional
steps:
  - id: ps-identify
    next: [ps-clarify]
  - id: ps-clarify
    next: [ps-target]
  - id: ps-target
    next: [ps-analyze]
  - id: ps-analyze
    next: [ps-implement]
  - id: ps-implement
    next: [ps-check]
  - id: ps-check
    display: "PS8 — Check"
    next:
      - condition: "resultado >= target"
        then: [ps-standardize]
      - condition: "resultado < target"
        then: [ps-analyze]     # loop back a causa raíz
  - id: ps-standardize
    next: [ps-reflect]
  - id: ps-reflect
    next: [__end__]
```

- **Skill:** las instrucciones de `ps-check` deben incluir explícitamente la comparación contra el target y el criterio de decisión para el loop de vuelta.

---

### VACANTE — Slot #12 en Lista de 12 MARCOS

**Categoría:** Resolución de Problemas
**Estado:** Reservado para investigación futura

Este slot corresponde al segundo marco metodológico en la categoría de Resolución de Problemas. La lista confirmada tiene 12 MARCOS en total; Problem Solving 8-Step ocupa uno de los dos slots de esta categoría.

**Candidatos potenciales para investigación:**

| Candidato | Descripción breve | Por qué es candidato |
|-----------|-------------------|----------------------|
| 8D Problem Solving | Ford Motor Company; 8 Disciplines for team-based problem solving | Popular en automotive, complementa Toyota Way |
| A3 Problem Solving | Toyota; una página de A3 para estructurar problema completo | Herramienta visual compacta, muy usada en Lean |
| Kepner-Tregoe | Análisis sistemático de problemas y decisiones | Framework maduro, ampliamente adoptado |
| Design Thinking | IDEO/Stanford d.school; centrado en usuario | Alternativa creativa para problemas no técnicos |

**Acción requerida:** Investigar y confirmar cuál de los candidatos fue el marco #12 original en la lista del usuario. Actualizar este archivo cuando se confirme.

---

## Implicaciones para el Skills Registry de THYROX

### Conteo de Skills Propuestos — Categorías 1-3

| Categoría | Framework | Skills nuevos | Coordinator requerido |
|-----------|-----------|---------------|----------------------|
| Cat 1 — Software Dev | SDLC | 0 (ya implementado) | No (base THYROX) |
| Cat 2 — Mejora Calidad | PDCA | 4 | Sí (pdca-coordinator) |
| Cat 2 — Mejora Calidad | DMAIC / Six Sigma | 5 | Sí (dmaic-coordinator) |
| Cat 2 — Mejora Calidad | Lean Six Sigma | 5 | Sí (lss-coordinator) |
| Cat 3 — Resolución Problemas | Problem Solving 8-step | 8 | Sí (ps-coordinator) |
| Cat 3 — Resolución Problemas | VACANTE | TBD | TBD |
| **TOTAL Cat 1-3** | **5 frameworks (1 vacante)** | **22 skills nuevos** | **4 coordinators** |

### Estimado de Tokens de Contexto

Asumiendo ~2,000 tokens promedio por SKILL.md (basado en skills actuales de THYROX):

| Componente | Skills | Tokens estimados |
|------------|--------|-----------------|
| Skills Cat 1 (SDLC — ya existe) | 7 existentes | ~14,000 (ya en contexto) |
| Skills Cat 2 PDCA | 4 nuevos + 1 coordinator | ~10,000 |
| Skills Cat 2 DMAIC | 5 nuevos + 1 coordinator | ~12,000 |
| Skills Cat 2 LSS | 5 nuevos + 1 coordinator | ~12,000 |
| Skills Cat 3 Problem Solving | 8 nuevos + 1 coordinator | ~18,000 |
| **Subtotal Cat 1-3** | **26 skills (sin vacante)** | **~52,000 tokens** |

### Patrón de Composición Aplicable

Todos los frameworks de Cat 2 y Cat 3 presentan fases secuenciales con transiciones definidas — aplica **Pattern 3: Multi-Phase Sequential** del análisis de composición del WP.

Para cada framework multi-fase se requiere:
1. Un coordinator skill que orqueste las fases
2. N phase-skills individuales (uno por fase)
3. El coordinator decide qué phase-skill activar según el estado actual

**Ejemplo para DMAIC:**
```
/thyrox:dmaic                    ← coordinator
/thyrox:dmaic-define             ← phase 1
/thyrox:dmaic-measure            ← phase 2
/thyrox:dmaic-analyze            ← phase 3
/thyrox:dmaic-improve            ← phase 4
/thyrox:dmaic-control            ← phase 5
```

---

## Skills adaptativos vs skills determinísticos

La flexibilidad del framework determina cómo se escriben los criterios de completitud en el SKILL.md. Esta distinción es arquitectónica: un skill con criterios incorrectos (hard para un framework flexible, soft para uno rígido) producirá un coordinator que bloquea innecesariamente o que avanza prematuramente.

### Para BAJA flexibilidad (SDLC, DMAIC)

Los criterios son explícitos y verificables. El coordinator puede confirmar completitud sin preguntar.

```markdown
# En el SKILL.md:
## Criterios de completitud (hard)
Esta fase está completa cuando TODOS los siguientes entregables existen:
- [ ] {entregable-1.md}
- [ ] {entregable-2.md}
No continuar hasta que todos estén presentes y aprobados.
```

**Comportamiento resultante:** el coordinator verifica artefactos y bloquea el avance hasta que existan. Predecible, auditable.

### Para ALTA flexibilidad (PDCA)

Los criterios son orientados a objetivo, no a lista de entregables. El coordinator debe preguntar, no presumir.

```markdown
# En el SKILL.md:
## Criterios de completitud (adaptive)
Esta fase está completa cuando el OBJETIVO de la fase se cumple, no cuando se completan
actividades predeterminadas. Pregunta clave: ¿Tienes suficiente información/resultado
para avanzar al siguiente paso?

Las actividades listadas son guías, no mandatos. Adapta la profundidad al contexto:
- Problema simple → menos actividades, ciclo más rápido
- Problema complejo → más iteraciones dentro de la fase antes de avanzar
```

**Comportamiento resultante:** el coordinator hace preguntas abiertas sobre el estado del usuario, no verifica listas. El avance lo decide el usuario con su juicio.

### Para BAJA-MEDIA flexibilidad (Problem Solving 8-step, DMAIC parcial)

Los criterios son mixtos: hard en la mayoría de pasos, condicional en los de loop.

```markdown
# En el SKILL.md — sección para ps-check:
## Criterios de completitud (conditional)
Esta fase requiere comparar el resultado medido contra el target establecido en ps-target.

- Si resultado >= target: fase completa, avanzar a Standardize.
- Si resultado < target: la causa raíz no fue correctamente identificada. Volver a
  Analyze Root Cause con nueva información del resultado fallido como entrada.

Documentar siempre: resultado medido, target, decisión tomada y justificación.
```

**Comportamiento resultante:** el coordinator evalúa un predicado explícito y elige el siguiente paso según el resultado. La lógica de bifurcación es parte del skill, no del coordinator.

### Tabla resumen — Tipo de criterio por framework

| Framework | Tipo de criterio | Razón |
|-----------|-----------------|-------|
| SDLC | Hard (todos los entregables) | Secuencial estricto; los artefactos de una fase son entrada obligatoria de la siguiente |
| PDCA | Adaptive (objetivo cumplido) | Alta flexibilidad; la duración y profundidad son variables; el piloto puede durar minutos o semanas |
| DMAIC | Mixto: hard en Define/Measure, conditional en Analyze/Control | Rigor estadístico requiere baseline sólida; pero "suficientes causas raíz" es un juicio |
| Lean Six Sigma | Sequential-adaptive (profundidad variable) | Las herramientas Lean varían por tipo de desperdicio; la profundidad de Improve depende del gap |
| Problem Solving 8-step | Conditional en Check | El loop Check → Analyze es el mecanismo central del framework; requiere evaluación explícita |
