```yml
Fecha: 2026-03-28
Tipo: Análisis de fallos
```

# Análisis de los 3 Fallos en Functional Evals

## Fallo 1: Eval 1 — No propone crear work package

### Expectativa
> "Se propone crear un work package o directorio de trabajo"

### Qué hizo Claude
Ejecutó Phase 1: ANALYZE correctamente. Hizo 6 preguntas de análisis excelentes (tipo de app, acceso, alertas, trazabilidad, integración, restricciones). Pero al final dijo:

> "Con esas respuestas paso directo a Phase 2 (stack) y Phase 3 (plan concreto con tareas)"

### Diagnóstico
**Es un error real del SKILL, no de verbalización.** El SKILL.md en Phase 1 dice:

```
1. Investigar requisitos, stakeholders, constraints y contexto
2. Documentar hallazgos en `work/.../analysis/`
3. Si hay decisiones arquitectónicas, crear ADR en `context/decisions/`
```

El paso 2 dice "documentar hallazgos en work/" pero NO dice explícitamente "crear un work package primero". La creación del work package está en Phase 3: PLAN (paso 2: "Crear work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`").

**Problema:** Hay una dependencia circular: Phase 1 dice "documentar en work/" pero el work package se crea en Phase 3. ¿Dónde documenta Phase 1 si el work package no existe?

**Causa raíz:** El SKILL asume que el work package ya existe cuando Phase 1 documenta, pero no hay instrucción de crearlo en Phase 1.

### Corrección propuesta
Agregar en Phase 1, paso 2: "Crear work package `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` y documentar hallazgos en `work/.../analysis/`"

O mover la creación del work package de Phase 3 a Phase 1 (donde se necesita primero).

---

## Fallo 2: Eval 2 — No menciona que leyó archivos de estado

### Expectativa
> "Se leen archivos de estado del proyecto (focus.md, now.md, o ROADMAP.md)"

### Qué hizo Claude
Reportó el estado del proyecto CON DATOS CORRECTOS extraídos de ROADMAP.md y focus.md:
- FASE 1-3d con porcentajes correctos
- 3 tareas pendientes de validación exactas del ROADMAP
- Mencionó "pendiente de focus.md"

Claramente LEYÓ los archivos (los datos son correctos), pero no dijo explícitamente "leí focus.md" o "revisé ROADMAP.md".

### Diagnóstico
**Es un fallo del eval, no del SKILL.** La expectativa verifica si Claude DICE que leyó archivos, no si los LEYÓ realmente. El grep busca palabras como "focus", "now.md", "ROADMAP" — y la respuesta sí menciona "focus.md" al final (el grep encontró una coincidencia parcial).

De hecho, en la segunda ejecución el eval PASÓ parcialmente (encontró "focus.md" en el texto). El fallo es inconsistente entre ejecuciones.

**Causa raíz:** La expectativa del eval está mal diseñada. Debería verificar si los datos son correctos, no si Claude verbaliza el nombre del archivo que leyó.

### Corrección propuesta
Cambiar la expectativa del eval de "Se leen archivos de estado" a "La respuesta contiene datos específicos del proyecto (nombres de fases, porcentajes, tareas pendientes reales)".

---

## Fallo 3: Eval 3 — No sugiere guardar en plan.md/tasks.md

### Expectativa
> "Se sugiere guardar en plan.md o tasks.md"

### Qué hizo Claude
NO descompuso las tareas. En lugar de eso, detectó que el repositorio es un framework de PM (no una app con pantallas) y preguntó al usuario qué quiso decir:

> "El repositorio no es una aplicación con pantallas — es un framework de gestión de proyectos. ¿Podrías aclarar?"

### Diagnóstico
**Es un error real y el más grave de los 3.** Claude priorizó el análisis del repositorio actual sobre la petición del usuario. El eval simula un escenario donde el usuario TIENE una app y pide descomposición — Claude debería descomponer, no cuestionar si la app existe en el repo.

El SKILL Phase 5: DECOMPOSE dice:
```
1. Leer spec.md del work package
2. Crear lista de tareas con IDs trazables...
```

Pero Phase 5 asume que hay un spec.md previo (de Phase 4). Cuando el usuario viene directo con "descompón esto", no hay spec ni work package. El SKILL no tiene instrucción para el caso donde el usuario pide descomposición sin contexto previo.

**Causa raíz dual:**
1. **SKILL gap:** No hay instrucción para manejar peticiones de descomposición directa sin spec.md previo
2. **Contexto contaminado:** Claude leyó el repo real (.claude/) y decidió que la petición no tiene sentido para este proyecto, en vez de tratar la petición como un proyecto externo

### Corrección propuesta
En Phase 5, agregar nota: "Si el usuario pide descomposición sin work package previo, crear uno y descomponer directamente. No cuestionar si el proyecto existe en el repo — el usuario puede estar describiendo un proyecto externo."

---

## Resumen

| Fallo | Tipo | Causa raíz | Severidad |
|-------|------|-----------|-----------|
| 1: No crea work package | **Gap en SKILL** | Phase 1 dice "documentar en work/" pero no dice "crear work package" — eso está en Phase 3 | Alta |
| 2: No verbaliza que leyó archivos | **Fallo del eval** | La expectativa verifica verbalización, no comportamiento real | Baja |
| 3: No descompone, cuestiona | **Gap en SKILL + contexto** | No hay instrucción para descomposición directa sin spec previo | Alta |

### Conclusión

**2 de 3 fallos son gaps reales del SKILL, no "detalles de verbalización".** Mi diagnóstico anterior fue incorrecto.

- Fallo 1: La creación del work package debe estar en Phase 1, no en Phase 3
- Fallo 3: Phase 5 necesita manejar peticiones directas sin contexto previo
- Fallo 2: El eval necesita mejor diseño (verificar datos, no verbalización)
