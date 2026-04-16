---
name: dmaic-control
description: "Use when sustaining improvements in a DMAIC project. dmaic:control — create Control Plan, update SOPs, configure ongoing monitoring, and transfer process ownership."
allowed-tools: Read Glob Grep Bash Write Edit
effort: medium
updated_at: 2026-04-16 00:00:00
---

# /dmaic-control — DMAIC: Control

Ejecuta la fase **Control** de DMAIC. Sostiene las mejoras en el tiempo.

**Tollgate:** Control Plan activo, proceso transferido a dueño del proceso.

---

## Actividades

1. **Control Plan** — Documento que define qué monitorear, cómo, con qué frecuencia, y quién actúa si hay desvío
2. **SPC (Statistical Process Control)** — Cartas de control si aplica (variables continuas críticas)
3. **Actualizar SOPs** — Documentar los nuevos métodos de trabajo
4. **Training** — Capacitar a los operadores/usuarios del proceso
5. **Transition plan** — Cómo se transfiere el proceso al dueño
6. **Cierre del proyecto** — Documentar beneficios logrados vs objetivo del Charter

## Artefacto esperado

`{wp}/dmaic-control.md` — Control Plan + cierre con:
- Control Plan (qué, cómo, frecuencia, responsable, acción ante desvío)
- SOPs actualizados (o referencias a ellos)
- Sigma Level final vs baseline
- Beneficios logrados vs business case
- Plan de transición al dueño del proceso

## Estado en now.md

```
methodology_step: dmaic:control
flow: dmaic
```

## Siguiente paso

DMAIC completado. Iniciar Stage 11 TRACK/EVALUATE del WP o cerrar el proyecto.
