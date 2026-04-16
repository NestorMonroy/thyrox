---
name: pdca-act
description: "Use when deciding whether to standardize or adjust a PDCA improvement. pdca:act — standardize and scale if successful, or adjust and plan next cycle if not. Document lessons learned."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /pdca-act — PDCA: Act

Ejecuta el paso **Act** del ciclo PDCA. Estandariza si fue exitoso; ajusta y repite si no.

---

## Decisión basada en Check

### Si el piloto fue exitoso:
1. **Estandarizar** — Actualizar SOPs, procedimientos, documentación
2. **Escalar** — Aplicar la mejora en el ámbito completo
3. **Comunicar** — Informar a stakeholders del cambio implementado
4. **Documentar** — Registrar el nuevo estándar

### Si el piloto no fue exitoso:
1. **Analizar** — ¿Qué falló? ¿Fue el plan, la ejecución, o el contexto?
2. **Ajustar** — Modificar hipótesis o acciones
3. **Planificar siguiente ciclo** — Volver a Plan con las lecciones aprendidas

## Artefacto esperado

`{wp}/pdca-act.md` — Decisión y estandarización con:
- Decisión: estandarizar O nuevo ciclo
- Si estandarizar: qué cambios en procesos/docs
- Si nuevo ciclo: qué se ajusta en el Plan
- Lecciones aprendidas del ciclo

## Estado en now.md

Actualizar al completar:
```
methodology_step: pdca:act
flow: pdca
```

## Siguiente paso

Si ciclo exitoso → cierre del WP o nuevo objetivo de mejora (`pdca:plan`)
Si ciclo incompleto → `pdca:plan` con hipótesis ajustada
