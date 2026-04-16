---
name: pdca-plan
description: "Use when starting a PDCA cycle or planning an improvement. pdca:plan — define the problem, analyze current state, establish measurable objectives, and design the improvement plan."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-plan — PDCA: Plan

> *"You can't improve what you haven't defined. You can't define without data."*

Ejecuta el paso **Plan** del ciclo PDCA. Produce un plan de mejora con objetivos medibles y una hipótesis verificable.

---

## Cuándo usar este paso

- Al iniciar un ciclo PDCA nuevo (primer ciclo o ciclo ajustado)
- Cuando hay un problema recurrente sin causa raíz identificada
- Cuando una métrica de proceso está fuera del objetivo
- Al recibir un requerimiento de mejora de un stakeholder

## Cuándo NO usar este paso

- Si el problema ya está definido y el equipo tiene consenso → ir directo a `pdca:do`
- Si el problema requiere análisis estadístico profundo → considerar DMAIC en su lugar
- Si no hay datos disponibles del proceso → recopilar datos primero, luego planificar

---

## Actividades

### 1. Definir el problema (sin asumir causas)

Usar la técnica **IS / IS NOT** para delimitar con precisión:

| Dimensión | IS (lo que sí es el problema) | IS NOT (lo que NO es el problema) |
|-----------|-------------------------------|-----------------------------------|
| Qué | ¿Qué está fallando? | ¿Qué no está fallando? |
| Dónde | ¿En qué parte del proceso? | ¿Dónde no ocurre? |
| Cuándo | ¿Desde cuándo? ¿Con qué frecuencia? | ¿Cuándo no ocurre? |
| Magnitud | ¿Cuánto afecta? | ¿Qué no está siendo afectado? |

**Criterio de calidad del Problem Statement:**
- ✅ Describe el síntoma observable con datos: *"El tiempo de respuesta de la API supera 2s en el 30% de requests desde el 2026-03-01"*
- ❌ Asume causa: *"La base de datos está lenta"* — esto es hipótesis, no problema
- ❌ Implica solución: *"Necesitamos escalar los servidores"* — aún no sabemos

### 2. Analizar la situación actual

Recopilar datos objetivos del estado presente. Mínimo necesario:

| Dato | Propósito |
|------|-----------|
| Métrica actual (con número) | Establece baseline para comparar en Check |
| Frecuencia / volumen del problema | Define magnitud real |
| Tendencia (mejorando / empeorando / estable) | Orienta urgencia |
| Impacto en el cliente / negocio | Justifica el esfuerzo |

> Sin baseline numérico, el paso Check no puede funcionar. Si no tienes datos, la primera acción del Plan es *recopilarlos*.

### 3. Establecer objetivo SMART

| Criterio | Descripción | Ejemplo |
|----------|-------------|---------|
| **S**pecífico | Qué métrica exacta se mueve | Tiempo de respuesta p95 de la API /orders |
| **M**edible | Valor numérico objetivo | De 2.1s a menos de 800ms |
| **A**lcanzable | Realista dado el contexto | Validado con el equipo técnico |
| **R**elevante | Conectado al impacto de negocio | Afecta tasa de conversión en checkout |
| **T**emporal | Fecha límite | Para el 2026-05-01 |

**Objetivo completo:** *"Reducir el tiempo de respuesta p95 del endpoint /orders de 2.1s a menos de 800ms para el 2026-05-01, sin degradar p99."*

### 4. Formular hipótesis de mejora

La hipótesis es la teoría que el Do va a probar. Formato recomendado:

```
Si [acción concreta], entonces [resultado esperado], porque [mecanismo causal].
```

Ejemplo: *"Si agregamos índice compuesto en orders(user_id, created_at), entonces el p95 bajará a < 800ms, porque el query actual hace full table scan sobre 2M registros."*

### 5. Diseñar el plan de mejora

Para cada acción del plan, definir:

| Acción | Responsable | Fecha | Recursos | Criterio de éxito |
|--------|-------------|-------|----------|-------------------|
| Acción 1 | Quién | Cuándo | Qué necesita | Cómo saber que está lista |

---

## Técnicas de apoyo

| Técnica | Usar cuando... |
|---------|---------------|
| **5 Whys** | El síntoma es claro pero la causa no |
| **Fishbone / Ishikawa** | Múltiples causas potenciales; equipo necesita brainstorm estructurado |
| **Pareto 80/20** | Hay muchos defectos/causas; identificar las pocas vitales |
| **5W2H** | El problema es difuso y necesita delimitación completa |
| **Diagrama de flujo** | El proceso es complejo o poco conocido por el equipo |

---

## Artefacto esperado

`{wp}/pdca-plan.md` — Estructura mínima:

```markdown
## Problem Statement
[IS / IS NOT completado — sin causas asumidas]

## Situación actual
- Métrica baseline: [valor actual con fecha]
- Frecuencia: [veces/período]
- Impacto: [en cliente/negocio]

## Objetivo SMART
[Texto completo del objetivo]

## Hipótesis de mejora
[Si... entonces... porque...]

## Plan de acción
| Acción | Responsable | Fecha | Recursos |
```

---

## Red Flags — señales de que el Plan está mal

- **"Sabemos cuál es la causa"** sin datos que lo confirmen — es hipótesis, no hecho
- **Objetivo sin número** ("mejorar la velocidad") — no se puede verificar en Check
- **Objetivo sin baseline** — sin punto de partida, no hay referencia para medir mejora
- **Múltiples hipótesis en un solo Plan** — cada ciclo prueba *una* hipótesis; más de una contamina los resultados
- **Acciones = solución directa** (ej: "escalar servidores") antes de validar la causa raíz

---

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:plan
flow: pdca
```

## Siguiente paso

Cuando el plan esté definido con baseline + objetivo SMART + hipótesis → `pdca:do`

---

## Limitaciones

- Este skill guía el proceso de planificación; no reemplaza el juicio experto del dominio
- Para problemas con variabilidad estadística compleja, DMAIC ofrece herramientas más robustas
- Si no hay datos históricos disponibles, la primera iteración de Plan puede ser solo *"definir cómo recopilar datos"*
