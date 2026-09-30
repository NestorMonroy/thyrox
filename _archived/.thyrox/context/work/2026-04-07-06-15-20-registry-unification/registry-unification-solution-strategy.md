```yml
type: Estrategia de Solución
work_package: 2026-04-07-06-15-20-registry-unification
created_at: 2026-04-07 06:15:20
status: Aprobado
phase: Phase 2 — SOLUTION_STRATEGY
```

# Estrategia de Solución: registry-unification

## Decisión central

**Unificar todo en `.claude/registry/`** — THYROX es un meta-framework template replicable. La separación operacional vs framework es un feature futuro que depende de lógica más amplia de deployment. Por ahora, un solo registry.

## Mapa de migración

| Origen | Destino | Acción |
|--------|---------|--------|
| `registry/agents/*.yml` | `.claude/registry/agents/` | MOVER |
| `registry/mcp/` | `.claude/registry/mcp/` | MOVER |
| `registry/bootstrap.py` | `.claude/registry/bootstrap.py` | MOVER + actualizar paths |
| `registry/backend/nodejs.skill.template.md` | `.claude/registry/backend/nodejs.template.md` | MERGE → canónico es `.claude/registry/` |
| `registry/frontend/react.skill.template.md` | `.claude/registry/frontend/react.template.md` | MERGE → canónico es `.claude/registry/` |
| `registry/database/postgresql.skill.template.md` | `.claude/registry/db/postgresql.template.md` | MERGE → canónico es `.claude/registry/` |
| `registry/` (raíz) | — | ELIMINAR después de migración |

## Cambios en archivos de configuración

`.mcp.json`:
```json
// Antes:
"args": ["registry/mcp/memory_server.py"]
// Después:
"args": [".claude/registry/mcp/memory_server.py"]
```

`bootstrap.py` (después de mover a `.claude/registry/`):
- Todos los paths `registry/...` → `.claude/registry/...`
- El script se invoca como: `python .claude/registry/bootstrap.py --stack ...`

## Templates — resolución de duplicados

Los templates en `.claude/registry/` tienen el formato documentado en su README (marcadores `<!-- SKILL_START -->`, placeholders `{{PROJECT_NAME}}`). Son la versión canónica. Los `*.skill.template.md` de `registry/` son versiones sin esos marcadores — se descartan.

## Fuera de alcance

- Separación operacional vs framework → feature futuro
- Actualizar docs de usuario que mencionen `python registry/bootstrap.py` → se documenta el cambio en CHANGELOG
