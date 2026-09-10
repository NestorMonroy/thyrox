```yml
created_at: 2026-04-18 07:50:28
project: THYROX
work_package: 2026-04-18-07-12-50-methodology-calibration
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
fuente: Capítulo 1 — "Prompt Chaining" (libro agentic design patterns)
```

# Input: Capítulo 1 — Prompt Chaining como fundamento de sistemas agentes

## Texto fuente (transcripción fiel)

> Prompt chaining involves breaking down complex tasks into a series of simpler, sequential steps, where the **output of one step becomes the input for the next**.

> Rather than asking an LLM to solve a complex problem in one shot, which often results in errors or incomplete solutions, we can ask it to solve it step by step, **validating the results at each stage**.

> By breaking down the problem and **validating at each step**, we can catch errors early and adjust the approach if needed.

> One important consideration when implementing prompt chaining is the **management of context**. As you chain multiple prompts together, the accumulated context grows, which can affect both the performance and costs of your system.

---

## Conexiones con el problema del WP

### THYROX ya ES un sistema de prompt chaining — ese es el problema

Los 12 stages de THYROX son exactamente la estructura que describe el capítulo: output de Stage N → input de Stage N+1. La cadena completa es:

```
DISCOVER → MEASURE → ANALYZE → CONSTRAINTS → STRATEGY →
PLAN → DESIGN → PLAN EXECUTION → PILOT → EXECUTE → TRACK → STANDARDIZE
```

El capítulo dice que la clave del chaining es **"validating at each step"**. THYROX tiene la cadena pero no tiene la validación: los gates entre stages son afirmaciones, no predicados verificables.

### La propagación del error en prompt chaining sin validación

El capítulo menciona "catch errors early". Sin validación en cada gate, los errores de Stage 1 (afirmaciones sin evidencia) se propagan como hechos a Stage 2, 3, 4... Se amplifican porque cada stage siguiente los usa como input legítimo.

```
Stage 1: afirmación A (sin evidencia)
         ↓ pasa gate sin validación
Stage 3: análisis basado en A → afirmación B (hereda el error de A)
         ↓ pasa gate sin validación
Stage 5: estrategia basada en B → decisión C (error amplificado)
         ↓
Stage 10: implementación de C → trabajo real basado en premisas no validadas
```

Esto es realismo performativo propagado por la cadena: cada stage produce artefactos bien formateados que parecen derivados pero heredan afirmaciones no verificadas.

### Context management — la dimensión de costo ignorada

El capítulo advierte que "accumulated context grows, which can affect performance and costs." En THYROX esto tiene una implicación directa: los artefactos WP acumulan claims. Sin mecanismo de filtrado, el contexto de stages avanzados está saturado de afirmaciones no verificadas de stages anteriores.

Un sistema de calibración debe actuar también como **context pruning**: solo las afirmaciones con evidencia observable deben propagarse al siguiente stage.

---

## Tabla: Capítulo 1 vs estado actual de THYROX

| Principio del capítulo | Estado en THYROX | Gap |
|-----------------------|-----------------|-----|
| Output de paso N → input de paso N+1 | ✅ Implementado (12 stages) | — |
| Validación en cada paso | ❌ Ausente — gates son afirmaciones | **Gap crítico** |
| Catch errors early | ❌ Sin mecanismo de detección temprana | **Gap crítico** |
| Context management | ⚠️ Parcial — acumulación sin filtrado de evidencia | Gap medio |
| Loops y ramas condicionales | ⚠️ Existe en metodologías (PDCA, DMAIC) pero no en THYROX core | Gap menor |

---

## Síntesis con input del Capítulo 6

Combinando los dos capítulos:

- **Cap. 6 (Características agentes):** THYROX tiene 5/6 características — le falta Adaptation calibrada
- **Cap. 1 (Prompt Chaining):** THYROX tiene la cadena — le falta validación en cada eslabón

Ambas conclusiones convergen al mismo punto: **el sistema produce outputs pero no verifica si esos outputs cumplen los criterios que afirma cumplir**.

La solución de calibración debe insertar validación en los gates de stage — exactamente lo que el Capítulo 1 describe como el principio fundamental del prompt chaining confiable.

---

## Pendiente para Stage 3 ANALYZE

- Definir el "predicado de validación" mínimo para cada gate de stage (¿qué cuenta como evidencia que valida el paso?)
- Diseñar el mecanismo de context pruning: qué claims pasan al siguiente stage y en qué condiciones
- Evaluar si los loops condicionales del capítulo aplican a THYROX (ej: stage regresa a DISCOVER si el gate falla)
