```yml
type: Execution Log
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 05:22:12
status: En progreso
phase: Phase 6 — EXECUTE
```

# Execution Log: agent-format-spec

## Sesión 2026-04-07 05:22:12

### T-001 — Crear `references/agent-spec.md`

- **Estado:** Completado
- **Path:** `.claude/skills/pm-thyrox/references/agent-spec.md`
- **Commit:** `docs(ref): add agent-spec.md — formal spec for native Claude Code agents`
- **Contenido entregado:**
  - Frontmatter con type, title, work_package, created_at, status, covers
  - Tabla de campos: 3 REQUERIDOS (`name`, `description`, `tools`) + 4 PROHIBIDOS (`model`, `category`, `skill_template`, `system_prompt`)
  - Reglas de `description`: patrón `{qué hace}. Usar cuando {condición}.`, mínimo 20 chars, no bloque vacío `>`
  - Tabla de severidades del linter (ERROR vs WARN)
  - Tabla de 3 patrones de naming con ejemplos
  - Ejemplo antes/después: agente mal formado vs bien formado
  - Referencia al linter `scripts/lint-agents.py`
- **Gate WP-1:** Listo para aprobación. Contiene R-001, R-002, R-003.

### T-003 — Crear `references/skill-vs-agent.md`

- **Estado:** Completado
- **Path:** `.claude/skills/pm-thyrox/references/skill-vs-agent.md`
- **Commit:** `docs(ref): add skill-vs-agent.md — distinction reference`
- **Contenido entregado:**
  - Frontmatter con type, title, work_package, created_at, status, covers
  - Tabla comparativa con 7 filas: qué es, dónde vive, cómo se activa, acceso a tools, paralelismo, formato, cuándo modificar
  - Regla de decisión accionable (una oración)
  - 2 SKILLs del proyecto: pm-thyrox, python-mcp
  - 4 agentes del proyecto: task-executor, task-planner, tech-detector, skill-generator
  - Sección de señales de confusión frecuente

---

## Tareas pendientes en este WP

| Tarea | Estado | Depende de |
|-------|--------|------------|
| T-001 | Completada | — |
| T-002 | Pendiente | T-001 aprobado |
| T-003 | Completada | — |
| T-004 | Pendiente | T-001 aprobado |
| T-005 | Pendiente | T-001 aprobado |
| T-006 | Pendiente | T-001 aprobado |

**Próximo paso:** Esperar aprobación de T-001 (`agent-spec.md`) para desbloquear T-002, T-004, T-005, T-006.
