---
name: pdca-do
description: "Use when executing a PDCA improvement plan. pdca:do — implement the plan at small scale (pilot), collect data during execution, and document observations and deviations."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-do — PDCA: Do

Ejecuta el paso **Do** del ciclo PDCA. Implementa el plan a escala pequeña (piloto).

---

## Actividades

1. **Implementar en ámbito limitado** — No en producción completa; piloto controlado
2. **Recopilar datos durante la ejecución** — Medir exactamente lo que se definió en Plan
3. **Documentar observaciones** — Qué salió según lo esperado, qué fue diferente
4. **Registrar desviaciones** — Cualquier desviación del plan original con causa

## Artefacto esperado

`{wp}/pdca-do.md` — Registro de ejecución con:
- Scope del piloto (qué, quién, dónde, cuándo)
- Datos recopilados (tabla o métricas)
- Observaciones durante la ejecución
- Desviaciones del plan original

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:do
flow: pdca
```

## Siguiente paso

Cuando el piloto está completo y los datos recopilados → `pdca:check`
