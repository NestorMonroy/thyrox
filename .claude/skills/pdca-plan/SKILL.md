---
name: pdca-plan
description: "Use when starting a PDCA cycle or planning an improvement. pdca:plan — define the problem, analyze current state, establish measurable objectives, and design the improvement plan."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-plan — PDCA: Plan

Ejecuta el paso **Plan** del ciclo PDCA. Produce un plan de mejora con objetivos medibles.

---

## Actividades

1. **Definir el problema** — ¿Qué está mal? ¿Qué síntomas hay? (IS/IS-NOT si aplica)
2. **Analizar la situación actual** — Datos del estado presente: métricas, KPIs, frecuencia
3. **Establecer objetivos medibles** — SMART: específico, medible, alcanzable, relevante, temporal
4. **Diseñar el plan de mejora** — Acciones concretas, responsables, recursos, hipótesis de mejora

## Artefacto esperado

`{wp}/pdca-plan.md` — Plan de mejora con:
- Problem statement
- Estado actual (datos)
- Objetivo SMART
- Hipótesis de mejora
- Acciones planificadas con responsables

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:plan
flow: pdca
```

## Siguiente paso

Cuando el plan esté definido y aprobado → `pdca:do`
