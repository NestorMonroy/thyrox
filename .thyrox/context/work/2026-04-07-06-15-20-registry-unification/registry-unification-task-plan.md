```yml
type: Plan de Tareas
work_package: 2026-04-07-06-15-20-registry-unification
created_at: 2026-04-07 06:15:20
status: Completado
phase: Phase 7 — TRACK
```

# Plan de Tareas: registry-unification

- [x] [T-001] Mover `registry/agents/` → `.claude/registry/agents/` (2026-04-07)
- [x] [T-002] Mover `registry/mcp/` → `.claude/registry/mcp/` (2026-04-07)
- [x] [T-003] Mover `registry/bootstrap.py` → `.claude/registry/bootstrap.py` y actualizar paths internos (2026-04-07)
- [x] [T-004] Actualizar `.mcp.json` — paths `registry/mcp/` → `.claude/registry/mcp/` (2026-04-07)
- [x] [T-005] Eliminar `registry/` (raíz) — solo después de T-001..T-004 (2026-04-07)
- [x] [T-006] Verificar MCP servers arrancan con nuevos paths (2026-04-07)
- [x] [T-007] Crear `context/work/INDEX.md` — índice de WPs por FASE (2026-04-07)
- [x] [T-008] Corregir `skill_template:` en 3 YMLs — paths rotos tras eliminar `registry/` (2026-04-07)
