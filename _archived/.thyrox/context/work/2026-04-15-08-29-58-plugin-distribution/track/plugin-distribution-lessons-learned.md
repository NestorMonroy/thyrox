```yml
created_at: 2026-04-16 17:24:02
project: THYROX
work_package: 2026-04-15-08-29-58-plugin-distribution
phase: Phase 11 — TRACK/EVALUATE
author: NestorMonroy
status: Borrador
```

# Lessons Learned: plugin-distribution

## Resumen del WP

**Objetivo original:** Migrar THYROX de "git clone + setup-template.sh" a plugin puro de Claude Code.

**Resultado:** Implementado. `plugin.json` funcional, `hooks/hooks.json` con SessionStart idempotente, `bin/thyrox-init.sh` que reemplaza `setup-template.sh` completamente. Script validado en directorio vacío e idempotencia confirmada.

**Nota:** R-002 (safety invariant en `.thyrox/` desde hook) y R-003 (marketplace) quedan como riesgos abiertos para validar en uso real. La implementación usa el workaround documentado (bash desde hook, no Write tool del LLM).

---

## Qué salió bien

1. **Guard de idempotencia simple y efectivo** — el check `[ -d .thyrox/context ]` al inicio del script fue suficiente para garantizar que ninguna ejecución subsiguiente sobrescribe estado. T-014 lo confirmó en segundos.

2. **Separación plugin vs proyecto destino clara** — GAP-006 se resolvió naturalmente: el plugin provee skills/agents/hooks, el proyecto destino recibe solo `.thyrox/context/` y `.claude/settings.json` mínimo. No hubo ambigüedad.

3. **Eliminación total de setup-template.sh** — el script tenía 4 bugs acumulados (paths pre-FASE-35, naming pre-FASE-29). En lugar de parcharlo, se eliminó completamente. `thyrox-init.sh` hace lo necesario sin los bagajes del modelo template.

4. **Análisis previo de calidad (Phase 1)** — los 6 GAPs identificados en Phase 1 cubrieron exactamente las tareas de ejecución. No hubo sorpresas durante Phase 10.

---

## Qué salió mal / qué haría diferente

1. **Loop CLI no disponible en este entorno** — el comando `/thyrox:loop` para auto-avanzar tareas T-NNN no pudo configurarse con `ScheduleWakeup` (no disponible). Para WPs con muchas tareas secuenciales, explorar si Desktop Claude Code lo soporta antes de planificar.

2. **Fases intermedias omitidas** — el task-plan se generó directamente desde Phase 1 sin pasar por Phase 5 STRATEGY, Phase 6 PLAN, Phase 7 DESIGN. Funcionó porque el análisis era completo y el scope pequeño. Para WPs más grandes, no atajar.

3. **R-002 sin validar en entorno real** — no se probó que `hooks/hooks.json` + `bin/thyrox-init.sh` funcione en una instalación real de plugin. El script funciona ejecutado manualmente, pero el hook de plugin tiene un entorno distinto (`$PLUGIN_DIR`). Pendiente de validación.

---

## Patrones reutilizables

1. **Guard de idempotencia con directorio como semáforo** — `[ -d directorio ] && exit 0` al inicio de cualquier script de bootstrap es suficiente y legible. No necesita lockfiles ni estado adicional.

2. **Logging prefijado por script** — `log()` con `[nombre-script]` hace trivial identificar qué script emite qué cuando hay múltiples hooks activos en la misma sesión.

3. **Separación "plugin provee / proyecto recibe"** — para cualquier herramienta distribuible como plugin: el plugin contiene el código (skills, agents, scripts), el proyecto destino recibe solo su estado (context, settings). Nunca mezclar.

---

## Riesgos materializados

Ninguno durante Phase 10 — todos los riesgos identificados en Phase 1 se previeron con las mitigaciones propuestas o quedaron abiertos para validación futura (R-002, R-003).
