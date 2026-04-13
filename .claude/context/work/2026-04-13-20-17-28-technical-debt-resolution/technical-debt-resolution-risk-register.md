```yml
project: thyrox-framework
work_package: 2026-04-13-20-17-28-technical-debt-resolution
created_at: 2026-04-13 20:17:28
current_phase: Phase 1 — ANALYZE
open_risks: 4
mitigated_risks: 0
closed_risks: 0
```

# Risk Register — technical-debt-resolution (FASE 34)

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:------------:|:-------:|:---------:|--------|
| R-01 | Write a `thyrox/SKILL.md` y `settings.json` requiere aprobación interactiva (Prompt mode) | media | bajo | baja | abierto |
| R-02 | `project-status.sh` con alerta de tamaño produce false positives en proyectos nuevos | baja | medio | baja | abierto |
| R-03 | `ad-hoc-tasks.md.template` referenciado en Phase 6 puede confundirse con task-plan formal | baja | bajo | baja | abierto |
| R-04 | Corrección retroactiva de `framework-evolution-execution-log.md` (TD-018) cambia timestamp en historial commiteado | baja | bajo | baja | abierto |

---

## Detalle de riesgos

### R-01: Permisos para archivos de configuración del framework

**Descripción:** `thyrox/SKILL.md`, `settings.json` y `.claude/agents/*.md` están en categoría "Prompt (ask)" según el permission model del framework. Editar estos archivos puede requerir confirmación interactiva del usuario en cada Write/Edit.

**Mitigación:** Ejecutar los cambios secuencialmente — solicitar aprobación archivo por archivo. El usuario puede aprobar globalmente antes de iniciar (como en FASEs anteriores).

**Plan de contingencia:** Si alguna aprobación es denegada, documentar el TD como "requiere aprobación manual" y proceder con el resto.

---

### R-02: False positives en alerta de tamaño (project-status.sh)

**Descripción:** La alerta de REGLA-LONGEV-001 (>25,000 bytes) puede activarse en proyectos nuevos que tienen archivos vacíos o muy pequeños, produciendo mensajes confusos.

**Mitigación:** Agregar condición `[ -f archivo ]` antes de `wc -c`. Solo alertar si el archivo existe Y supera el umbral.

**Plan de contingencia:** Si la alerta produce ruido, agregar variable de entorno `THYROX_SKIP_SIZE_CHECK=1` para desactivarla.

---

### R-03: ad-hoc-tasks confundido con task-plan

**Descripción:** Mapear `ad-hoc-tasks.md.template` a Phase 6 podría confundir a futuros usuarios que piensen que es un sustituto del task-plan formal.

**Mitigación:** Agregar nota explícita en la referencia de Phase 6: "para tareas puntuales NO incluidas en el task-plan; no sustituye task-plan".

**Plan de contingencia:** Si genera confusión, mover a `assets/legacy/` en la siguiente revisión.

---

### R-04: Corrección retroactiva de execution-log

**Descripción:** `framework-evolution-execution-log.md` tiene timestamps incorrectos commiteados. Corregirlos modifica un artefacto histórico.

**Mitigación:** La corrección es válida — el framework usa "Git as persistence" (ADR-008) y la corrección se commitea con mensaje explicativo. El historial de git preserva el estado anterior.

**Plan de contingencia:** Si hay resistencia a modificar artefactos históricos, marcar TD-018 como "no retroactivo" y solo aplicar la regla a nuevos execution-logs.
