```yml
type: Plan de Tareas
work_package: 2026-04-07-05-41-41-flow-corrections
created_at: 2026-04-07 05:41:41
status: En ejecución
phase: Phase 5 — DECOMPOSE
```

# Plan de Tareas: flow-corrections

## Archivos afectados (pre-flight scope check)

| Archivo | Tareas | Conflicto con WP activo |
|---------|--------|------------------------|
| `SKILL.md` | T-001, T-002, T-003, T-004 | Ninguno |
| `references/conventions.md` | T-005, T-006, T-007 | Ninguno |

## Tareas

### SKILL.md — 4 correcciones

- [x] [T-001] Phase 6: agregar bloque "Rol coordinador en ejecución paralela" (G-001)
- [x] [T-002] Phase 6: agregar pre-flight scope check antes de lanzar agentes (G-002)
- [x] [T-003] Phase 6: marcar claim `[~]` como paso obligatorio antes de ejecutar tarea (G-006)
- [x] [T-004] Phase 7: agregar nota "single-agent por diseño en ejecución paralela" (G-007)

### conventions.md — 3 correcciones

- [x] [T-005] Sección "Parallel Agent Execution": agregar límite 800 palabras para prompts (G-003)
- [x] [T-006] Sección "Parallel Agent Execution": agregar sufijo -a/-b para WPs en mismo segundo (G-008)
- [x] [T-007] Sección "Parallel Agent Execution": agregar protocolo cuando Write está bloqueado (G-004)

## Orden

T-001..T-004 en SKILL.md → T-005..T-007 en conventions.md
T-001..T-004 son paralelas entre sí (secciones distintas de SKILL.md).
T-005..T-007 son paralelas entre sí (subsecciones distintas de conventions.md).
