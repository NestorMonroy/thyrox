```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
Tema: Escenarios de interacción multi-sesión que faltan en los evals
```

# Análisis: Escenarios Multi-Interacción

## El problema

Los 3 functional evals y 28 trigger evals solo cubren la PRIMERA interacción — el "cold start." Pero un proyecto real con THYROX tiene decenas o cientos de interacciones a lo largo del tiempo. El SKILL debe funcionar en TODOS estos escenarios.

## Escenarios que faltan

### Categoría 1: Continuidad entre sesiones

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-01 | **Reanudar trabajo interrumpido** — "Ayer estábamos trabajando en la migración de la base de datos, ¿dónde quedamos?" | Leer focus.md + now.md. Identificar work package activo. Mostrar estado de tasks en plan.md. NO empezar de nuevo. |
| MI-02 | **Cold boot en proyecto existente** — Nueva sesión de Claude, proyecto ya tiene 5 work packages, ROADMAP actualizado | Leer focus.md + now.md. Orientarse con lo que hay. NO proponer crear estructura desde cero. |
| MI-03 | **Retomar después de días sin trabajar** — "Hace una semana que no toco esto, ¿qué quedó pendiente?" | Leer focus.md + ROADMAP. Resumir estado. Identificar blockers. Sugerir por dónde retomar. |

### Categoría 2: Trabajo a mitad de fase

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-04 | **Phase 1 incompleta** — Hicimos requirements y stakeholders pero faltan constraints y context | Identificar qué subsecciones faltan. Continuar desde donde se quedó. NO repetir lo que ya se hizo. |
| MI-05 | **Phase 6 interrumpida** — Completamos tasks T-001 a T-005, faltan T-006 a T-010 | Leer plan.md. Ver checkboxes [x] vs [ ]. Continuar con T-006. NO releer spec ni redescomponer. |
| MI-06 | **Phase 4 con feedback** — "El spec que hiciste tiene un problema: no consideraste el caso de usuarios offline" | Actualizar spec.md con el nuevo requisito. NO rehacer todo. Solo agregar lo que falta. |

### Categoría 3: Cambios de dirección

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-07 | **Scope creep** — "Ah, también necesitamos que soporte multi-idioma" durante Phase 6 | Evaluar impacto. Si es grande → nuevo work package o regresar a Phase 4. Si es pequeño → agregar task. Documentar el cambio. |
| MI-08 | **Pivote** — "Ya no vamos a hacer la migración, cambió la prioridad. Ahora necesitamos un sistema de caché." | Cerrar work package actual (status: cancelled). Crear nuevo work package. NO perder el trabajo del anterior (puede servir después). |
| MI-09 | **Decisión revertida** — "La decisión de usar PostgreSQL no funcionó, volvemos a MongoDB" | Crear nuevo ADR que revierte el anterior. Documentar por qué. Actualizar work package activo. |

### Categoría 4: Escalado de complejidad

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-10 | **Fix se convierte en epic** — Empezó como "arregla este bug" pero resulta que requiere refactoring de 3 módulos | Escalar: crear work package si no existe. Agregar spec.md si no hay. Descomponer en tasks. Documentar por qué escaló. |
| MI-11 | **Múltiples work packages activos** — Tenemos work/migración-db/ en Phase 6 y work/cache-system/ en Phase 3 | Saber cuál es el activo (focus.md). No mezclar. Si el usuario cambia de tema, preguntar: "¿Cambiamos de work package o es parte del mismo?" |
| MI-12 | **Trabajo paralelo** — "Mientras espero el review del PR de migración, quiero empezar con el caché" | Crear segundo work package. Mantener el primero como "en progreso." focus.md refleja ambos. |

### Categoría 5: Errores y recuperación

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-13 | **Implementación falló** — "Los tests no pasan después de implementar T-003. Algo está mal." | NO seguir con T-004. Investigar fallo. Documentar en lessons.md si es aprendizaje. Puede requerir volver a Phase 4 si el spec era incorrecto. |
| MI-14 | **Spec era incorrecto** — Descubrimos en Phase 6 que un requisito no era real | Documentar error (ERR-NNN). Actualizar spec.md. Re-evaluar tasks afectadas. NO tirar todo — solo lo afectado. |
| MI-15 | **Work package abandonado** — "Este trabajo ya no tiene sentido, pero quiero guardar lo que aprendimos" | Cerrar work package (status: abandoned). Crear lessons.md con lo aprendido. Mover lecciones útiles a errors/ si son transversales. |

### Categoría 6: Interacciones de seguimiento

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-16 | **Review de trabajo hecho** — "Revisa el spec que creé en el work package de autenticación" | Leer el spec.md del work package indicado. Dar feedback. Sugerir mejoras. NO crear nuevo work package. |
| MI-17 | **Pedir detalle de una decisión** — "¿Por qué decidimos usar PostgreSQL?" | Buscar en decisions/adr-NNN.md. Si no hay ADR → señalar que falta. NO inventar justificación. |
| MI-18 | **Comparar opciones** — "Tenemos dos approaches en el spec. ¿Cuál recomiendas?" | Analizar ambos. Documentar pros/cons. Recomendar con justificación. Si no hay suficiente info → sugerir Phase 2 research. |

### Categoría 7: Mantenimiento del framework

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-19 | **Limpiar work packages viejos** — "Hay work packages de hace 2 meses que ya terminamos" | Verificar status. Si completed → OK, son registro histórico. Si abandoned → verificar que lessons están documentadas. NO borrar nada (git is persistence). |
| MI-20 | **Actualizar ROADMAP** — "Necesito actualizar el ROADMAP para reflejar lo que realmente hicimos" | Leer work packages y sus plan.md. Reconciliar con ROADMAP.md. Marcar completados, agregar nuevos, actualizar fechas. |

---

## Resumen de escenarios por categoría

| Categoría | Cantidad | Complejidad |
|-----------|----------|-------------|
| Continuidad entre sesiones | 3 | Media |
| Trabajo a mitad de fase | 3 | Media |
| Cambios de dirección | 3 | Alta |
| Escalado de complejidad | 3 | Alta |
| Errores y recuperación | 3 | Alta |
| Interacciones de seguimiento | 3 | Baja |
| Mantenimiento del framework | 2 | Baja |
| **Total** | **20** | — |

## Priorización para evals

**Prioridad 1 (deben pasar siempre):**
- MI-01 (reanudar trabajo)
- MI-02 (cold boot existente)
- MI-05 (Phase 6 interrumpida)
- MI-13 (implementación falló)

**Prioridad 2 (importantes):**
- MI-04 (Phase 1 incompleta)
- MI-07 (scope creep)
- MI-10 (fix → epic)
- MI-17 (pedir detalle de decisión)

**Prioridad 3 (nice to have):**
- MI-03, MI-06, MI-08, MI-09, MI-11, MI-12, MI-14, MI-15, MI-16, MI-18, MI-19, MI-20

---

## Hallazgos de functional evals anteriores (2026-03-28-11-05-52)

Los 3 functional evals de primera interacción revelaron 3 gaps específicos que los escenarios multi-interacción deben verificar:

### Gap 1: Work package no mencionado en primera interacción (FE-01 E2)

Claude empieza con ANALYZE correctamente pero no propone crear work package en la primera respuesta. Pregunta primero.

**Hipótesis:** El work package se propone en la SEGUNDA interacción, después de que el usuario responde las preguntas de análisis.

**Escenario de verificación adicional:**

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-21 | **Segunda interacción de FE-01** — Usuario responde las preguntas de análisis del inventario. "La tienda es de ropa, 500 productos, 2 empleados, necesito stock + alertas + reportes, solo web." | Con las respuestas, Claude debería: (1) proponer crear work package, (2) comenzar spec.md o pasar a Phase 3: PLAN. Ya no más preguntas — actuar. |

### Gap 2: No sugiere siguiente paso explícito (FE-02 E3)

Claude lee archivos de estado e identifica fase, pero no dice "haz esto ahora."

**Hipótesis:** focus.md y now.md no tienen suficiente información sobre qué tarea específica está pendiente. Claude reporta estado pero no puede recomendar sin tasks concretas.

**Escenario de verificación adicional:**

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-22 | **Status check con plan.md activo** — Existe un work package con plan.md que tiene tasks `- [ ] T-004`, `- [x] T-003`, `- [x] T-002`, `- [x] T-001` | Claude debería leer plan.md, identificar T-004 como siguiente, y decir explícitamente "la siguiente tarea es T-004: [descripción]." |

### Gap 3: No usa formato [T-NNN] en tareas (FE-03 E1)

Claude descompone correctamente pero no usa el formato de IDs que SKILL.md muestra.

**Hipótesis:** El SKILL.md muestra el formato pero no explica POR QUÉ es importante. Sin WHY, Claude lo trata como sugerencia opcional.

**Escenario de verificación adicional:**

| ID | Escenario | Qué debería pasar |
|----|-----------|-------------------|
| MI-23 | **Descomposición con contexto de trazabilidad** — "Descompón esto en tareas. Necesito poder rastrear cada tarea hasta su requisito original." | Con la petición explícita de trazabilidad, Claude debería usar [T-NNN] Description (R-N) porque el usuario PIDIÓ trazabilidad. |

### Insight: Los gaps de primera interacción se resuelven en interacciones siguientes

Los 3 misses de FE-01/02/03 no son fallos del SKILL — son comportamiento correcto de "pedir antes de actuar." El SKILL dice ANALYZE first, y eso es lo que Claude hace. Los outputs completos (work packages, task IDs, next steps explícitos) aparecen cuando hay suficiente contexto.

**Esto confirma que los multi-interaction evals son más importantes que los first-interaction evals** para verificar que el SKILL funciona end-to-end.

---

## Resumen actualizado

| Tipo | Cantidad | Cobertura |
|------|----------|-----------|
| Trigger evals (primera interacción) | 28 | ¿Se activa el SKILL? |
| Functional evals (primera interacción) | 3 | ¿Sigue la metodología al inicio? |
| Multi-interaction evals (continuidad) | 23 (20 + 3 nuevos) | ¿Funciona end-to-end? |
| **Total** | **54** | — |

---

**Última actualización:** 2026-03-28
