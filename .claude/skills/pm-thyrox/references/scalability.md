```yml
Tipo: Referencia General
Categoría: Escalabilidad
Versión: 1.0
Propósito: Guía de cómo adaptar PM-THYROX según complejidad del proyecto.
Objetivo: Decidir qué estructura y fases usar según tamaño del trabajo.
Fecha actualización: 2026-03-27
```

# Escalabilidad por Complejidad

## Propósito

PM-THYROX se adapta al tamaño del proyecto. Esta guía explica qué estructura usar.

---

## Decision Framework

- **< 30 minutos:** Solo work-log
- **30 min - 2 horas:** Work-log + documento simple
- **2 - 8 horas:** Work-logs + epics/ (MEDIUM)
- **8+ horas:** FULL STRUCTURE con sub-agents

---

## Proyectos Pequeños (<2 horas)

**Estructura simplificada:**
- 1 work-log (snapshot inicial)
- 1 documento mutable (donde se captura todo)

**Fases activas:** 1, 2, 6, 7
**Sin:** Sub-agents, JSON metadata

**Ejemplo:**
```
work-logs/2026-03-26-10-00-quick-fix-typo.md
documento: TASK-FIX-TYPO.md (todo en uno)
```

---

## Proyectos Medianos (2-8 horas)

**Estructura balanceada:**
- work-logs/ granulares (1 por STEP importante)
- epics/YYYY-MM-DD-HH-MM-nombre/ con estructura PHASE-based
- project.json simple

**Fases activas:** 1, 2, 3, 4, 5, 6, 7
**Con:** Algunas fases pueden ser rápidas
**Sub-agents:** Validación manual entre PHASEs

**Ejemplo:**
```
work-logs/
  2026-03-26-10-00-decision-feature-x.md
  2026-03-26-10-15-analisis-requisitos.md
  2026-03-26-11-00-design-aprobado.md

epics/2026-03-26-10-00-feature-x/
  project.json
  PLAN.md
  analisis/
  specification/
  tasks/
  implementation/
```

---

## Proyectos Grandes (8+ horas)

**Estructura completa:**
- work-logs/ muy granulares (1 por STEP)
- epics/YYYY-MM-DD-HH-MM-nombre/ completo
- project.json con timing data
- EXIT_CONDITIONS.md rigurosas
- sub-agents para validación automática

**Fases activas:** 1-7 con rigor completo
**Con:** Iteraciones, validaciones, análisis cuantitativos
**Sub-agents:** Validación automática entre PHASEs

**Ejemplo:**
```
work-logs/
  2026-03-26-10-00-decision-big-project.md
  2026-03-26-10-15-step1-inventario.md
  2026-03-26-10-30-step2-conflictos.md
  2026-03-26-11-00-estrategia-aprobada.md

epics/2026-03-26-10-00-big-project/
  project.json (timing data)
  EXIT_CONDITIONS.md (100% compliance)
  PLAN.md, analisis/, estrategia/, specification/, tasks/, implementation/
```

---

## Sub-Agents para Validación

Para proyectos MEDIANOS y GRANDES, usar sub-agents para validación entre PHASEs:

### Validación After PHASE 1 (ANALYZE)

Sub-agent revisa:
- [ ] Requisitos están claros?
- [ ] Documentación está completa?
- [ ] Stakeholders aprobaron?
- [ ] Referencias al 100%?

Feedback: "Ready for PHASE 2" o "Missing: [X]"

### Validación After PHASE 4 (STRUCTURE)

Sub-agent revisa:
- [ ] Design es implementable?
- [ ] Tasks pueden ejecutarse atómicamente?
- [ ] Estimaciones son realistas?
- [ ] Criterios de éxito son verificables?

Feedback: "Ready for PHASE 5" o "Refine: [X]"

### Validación After PHASE 6 (EXECUTE)

Sub-agent revisa:
- [ ] Todos los tasks completados?
- [ ] Tests pasados?
- [ ] Code quality OK?
- [ ] Commits siguen convención?

Feedback: "Ready for PHASE 7" o "Fix: [X]"

### Cómo Invocar Sub-Agents

```
"Sub-agent, valida que completamos PHASE 1.
Checkea: exit_conditions.md y project.json"
```

---

## Tracking & Metrics

### JSON Metadata

Cada proyecto tiene `project.json` que captura:

```json
{
  "phases": {
    "phase_1": { "status": "completed", "duration_minutes": 15 },
    "phase_2": { "status": "in_progress", "duration_minutes": 30 }
  },
  "timing": {
    "total_duration_minutes": 45,
    "breakdown_by_phase": { ... }
  }
}
```

### Work-Logs

Cada work-log tiene metadata:
```
phase: 2
step: step-1-inventario
duration_minutes: 15
status: completed
```

### Analysis

Después de PHASE 7, puedes:
- Comparar: Estimado vs Real
- Analizar: Cuáles PHASEs toman más tiempo
- Optimizar: Patrones para proyectos futuros

---

**Última actualización:** 2026-03-27
