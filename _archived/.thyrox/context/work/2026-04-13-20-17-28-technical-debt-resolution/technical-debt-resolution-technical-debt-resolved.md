```yml
created_at: 2026-04-14 00:00:00
wp: 2026-04-13-20-17-28-technical-debt-resolution
fase: FASE 34
phase: 7 — TRACK
```

# TDs Resueltos — technical-debt-resolution (FASE 34)

| TD | Descripción | Commit | Resolución |
|----|-------------|--------|-----------|
| **TD-001** | Timestamps incompletos en artefactos | `14571ec` | `validate-session-close.sh` detecta `created_at` sin hora e integrado en stop hook |
| **TD-003** | Templates huérfanos en assets/ | `b34d593` + `9928fdb` | 4 → `assets/legacy/`; `ad-hoc-tasks` mapeado en workflow-execute/SKILL.md; `refactors` conservado (referencia activa) |
| **TD-009** | `now-{agent-name}.md` no implementado en agentes | `baddfea` | Campo `state_file` en `agent-spec.md`; instrucciones en `task-executor.md` y `task-planner.md` |
| **TD-018** | Timestamp incompleto en execution-log | `b84ae02` | `framework-evolution-execution-log.md`: `2026-04-08` → `2026-04-08 17:04:20` |
| **TD-027** | Tabla auto-write incompleta + references sin permiso | `e2a5a47` | Tabla Plano B +3 filas; `Write(/.claude/references/**)` en allow list |
| **TD-028** | Sin reclasificación de tamaño WP entre fases | `92d7004` | Sección `## Re-evaluación de tamaño post-estrategia` en `workflow-strategy/SKILL.md` |
| **TD-035** | Sin alerta de longitud en archivos vivos | `4e71ca8` | Bloque REGLA-LONGEV-001 en `project-status.sh` para 4 archivos (umbral 25,000 bytes) |

## TDs no resueltos en esta FASE

| TD | Razón |
|----|-------|
| **TD-010** | Benchmark empírico — trigger (caso de uso real) no activado. Permanece `[ ]` pendiente. |
