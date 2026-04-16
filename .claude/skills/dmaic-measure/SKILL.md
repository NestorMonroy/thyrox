---
name: dmaic-measure
description: "Use when establishing a quantitative baseline in a DMAIC project. dmaic:measure — define measurement plan, collect process data, calculate Sigma Level baseline, and validate measurement system."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-measure — DMAIC: Measure

Ejecuta la fase **Measure** de DMAIC. Establece el baseline cuantitativo del proceso.

**Tollgate:** Baseline con Sigma Level calculado y MSA realizado.

---

## Actividades

1. **Plan de medición** — Qué medir, cómo, cuándo, quién, fuente de datos
2. **MSA (Measurement System Analysis)** — Validar que el sistema de medición es confiable
3. **Recopilar datos** — Muestreo estadístico representativo del proceso actual
4. **Calcular métricas baseline**:
   - DPU (Defects Per Unit)
   - DPMO (Defects Per Million Opportunities)
   - Sigma Level (tabla sigma o fórmula)
   - Cp/Cpk si aplica (para variables continuas)
5. **Capability analysis** — ¿Qué tan capaz es el proceso actual?

## Artefacto esperado

`{wp}/dmaic-measure.md` — Baseline cuantitativo con:
- Plan de medición
- Resultados de MSA
- Datos recopilados (resumen estadístico)
- DPU, DPMO, Sigma Level baseline
- Proceso baseline documentado

## Estado en now.md

```
methodology_step: dmaic:measure
flow: dmaic
```

## Siguiente paso

Cuando el baseline está establecido y MSA validado → `dmaic:analyze`
