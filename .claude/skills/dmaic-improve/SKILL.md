---
name: dmaic-improve
description: "Use when implementing solutions in a DMAIC project. dmaic:improve — generate improvement alternatives, select optimal solution, implement pilot, validate improvement vs baseline."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-improve — DMAIC: Improve

Ejecuta la fase **Improve** de DMAIC. Implementa y valida soluciones que eliminan las causas raíz.

**Tollgate:** Mejora validada con datos post-implementación vs baseline de Measure.

---

## Actividades

1. **Generar alternativas de solución** — Para cada causa raíz, generar múltiples opciones
2. **Evaluar alternativas** — Matriz impacto/esfuerzo, costo/beneficio, riesgo
3. **Seleccionar solución** — DOE (Design of Experiments) si hay múltiples factores
4. **Implementar piloto** — En ámbito controlado, igual que PDCA:Do
5. **Recopilar datos post-implementación** — Mismas métricas que en Measure
6. **Validar mejora** — Comparar nuevo Sigma Level vs baseline; prueba de hipótesis

## Artefacto esperado

`{wp}/dmaic-improve.md` — Plan de mejora + validación con:
- Alternativas evaluadas y criterios de selección
- Solución seleccionada con justificación
- Datos del piloto
- Nuevo Sigma Level vs baseline
- Comparativa estadística (antes/después)

## Estado en now.md

```
methodology_step: dmaic:improve
flow: dmaic
```

## Siguiente paso

Cuando la mejora está validada estadísticamente → `dmaic:control`
