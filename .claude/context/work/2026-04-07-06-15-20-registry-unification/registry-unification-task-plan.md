```yml
type: Plan de Tareas
work_package: 2026-04-07-06-15-20-registry-unification
created_at: 2026-04-07 06:15:20
status: En ejecución
phase: Phase 5 — DECOMPOSE
```

# Plan de Tareas: registry-unification

- [ ] [T-001] Mover `registry/agents/` → `.claude/registry/agents/`
- [ ] [T-002] Mover `registry/mcp/` → `.claude/registry/mcp/`
- [ ] [T-003] Mover `registry/bootstrap.py` → `.claude/registry/bootstrap.py` y actualizar paths internos
- [ ] [T-004] Actualizar `.mcp.json` — paths `registry/mcp/` → `.claude/registry/mcp/`
- [ ] [T-005] Eliminar `registry/` (raíz) — solo después de T-001..T-004
- [ ] [T-006] Verificar MCP servers arrancan con nuevos paths
- [ ] [T-007] Crear `context/work/INDEX.md` — índice de WPs por FASE
