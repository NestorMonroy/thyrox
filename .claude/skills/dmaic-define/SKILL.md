---
name: dmaic-define
description: "Use when starting a DMAIC Six Sigma project. dmaic:define — define project scope, create Project Charter, identify CTQs, map SIPOC, and get stakeholder alignment."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-define — DMAIC: Define

Ejecuta la fase **Define** de DMAIC. Produce el Project Charter aprobado.

**Tollgate:** Project Charter aprobado por sponsor antes de avanzar a Measure.

---

## Actividades

1. **Problem Statement** — Descripción objetiva del problema (sin asumir causas)
2. **CTQs** — Critical to Quality: qué es crítico para el cliente
3. **SIPOC** — Suppliers-Inputs-Process-Outputs-Customers (mapa de alto nivel del proceso)
4. **Business Case** — ¿Por qué este proyecto? ¿Cuál es el beneficio esperado?
5. **Scope** — Qué está IN y qué está OUT del proyecto
6. **Project Charter** — Documento formal con todos los elementos anteriores

## Artefacto esperado

`{wp}/dmaic-define.md` — Project Charter con:
- Problem statement (sin causas asumidas)
- Business case (impacto en dinero, calidad, tiempo)
- Goal statement (objetivo medible)
- SIPOC diagram
- CTQs del cliente
- Scope in/out
- Team y sponsor

## Estado en now.md

```
methodology_step: dmaic:define
flow: dmaic
```

## Siguiente paso

Cuando el Project Charter está aprobado por el sponsor → `dmaic:measure`
