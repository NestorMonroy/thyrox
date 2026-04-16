---
name: dmaic-analyze
description: "Use when identifying root causes in a DMAIC project. dmaic:analyze — perform root cause analysis using statistical tools (Pareto, Ishikawa, regression), validate causes with data."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-analyze — DMAIC: Analyze

Ejecuta la fase **Analyze** de DMAIC. Identifica causas raíz con evidencia estadística.

**Tollgate:** Causas raíz validadas con datos (no solo opiniones).

---

## Actividades

1. **Análisis de Pareto** — Identificar el 20% de causas que generan el 80% del problema
2. **Diagrama de Ishikawa (5M/6M)** — Brainstorming estructurado: Máquina, Método, Material, Mano de obra, Medio ambiente (+Medición)
3. **5 Whys** — Para cada causa potencial, profundizar hasta causa raíz
4. **Análisis estadístico** (según complejidad):
   - Correlación/regresión
   - Prueba de hipótesis (t-test, ANOVA, chi-cuadrado)
   - DOE exploratorio
5. **Validar causas** — Confirmar con datos que la causa explica la variación observada

## Artefacto esperado

`{wp}/dmaic-analyze.md` — Root cause analysis con:
- Diagrama de Ishikawa o tabla de causas potenciales
- Análisis de Pareto (si aplica)
- Causas raíz confirmadas con evidencia estadística
- Lista priorizada de causas a atacar

## Estado en now.md

```
methodology_step: dmaic:analyze
flow: dmaic
```

## Siguiente paso

Cuando las causas raíz están validadas con datos → `dmaic:improve`
