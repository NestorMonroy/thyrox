---
name: pdca-check
description: "Use when reviewing results of a PDCA pilot. pdca:check — compare actual results against Plan objectives, identify gaps, and analyze causes of success or failure."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-check — PDCA: Check

Ejecuta el paso **Check** del ciclo PDCA. Verifica resultados del piloto vs objetivos del Plan.

---

## Actividades

1. **Comparar resultados con objetivos** — ¿Se alcanzó el objetivo SMART definido en Plan?
2. **Identificar desviaciones** — Qué salió diferente y en qué magnitud
3. **Analizar causas** — ¿Por qué se logró o no se logró el objetivo?
4. **Documentar aprendizajes** — Qué funcionó, qué no, qué fue inesperado

## Artefacto esperado

`{wp}/pdca-check.md` — Análisis de resultados con:
- Comparativa objetivo vs resultado (tabla)
- Brecha identificada (si existe)
- Análisis de causas de éxito/fracaso
- Conclusión: ¿Fue exitoso el piloto?

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:check
flow: pdca
```

## Siguiente paso

Cuando el análisis de resultados está completo → `pdca:act`
