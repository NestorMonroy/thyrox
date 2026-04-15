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
