```yml
type: Auditoría de cobertura cc-best-practice vs +989
created_at: 2026-06-03T01:06:19
referencia: github.com/shanraisshan/claude-code-best-practice
```

# cc-best-practice → +989: cobertura

## Resultado: +989 ya implementa todo lo valioso

| Patrón | +989 | Nota |
|--------|------|------|
| Commands | ✓ 21 | 12 fases + /audit + … |
| Hooks | ✓ 6 eventos | SessionStart, Stop, PostCompact, PreToolUse, PostToolUse, SubagentStop |
| Agent preload (`skills:`) | ✓ 11 agents | |
| Rules always-on | ✓ 6 | + ISO + agent-reports (PR #4) |
| Permissions | ✓ allow:18 ask:2 deny:4 | |
| `when_to_use` | ✓ en `description` | "Usar cuando…"; `paths` descartado (restrictivo) |
| `/goal` + loop | ✓ `bin/thyrox-loop.sh` + skill `/loop` | |
| MCP | ✓ `.mcp.json` (2 servers) | |
| Plugin `/thyrox:*` | ✓ `plugin.json` | |
| CI | ✓ `.github/workflows/validate.yml` | |
| ancestor/descendant memory | ✓ CLAUDE.md (Level 2) + @imports | |

## No presente (no se recomienda forzar)

- `.claude/memory/` (auto-memory): +989 usa CLAUDE.md; opcional.
- statusline / output-styles: cosméticos, específicos del usuario/entorno.
- power-ups / scheduled-tasks / agent-teams / cross-model: features de entorno o ya
  cubiertos (agent-teams ≈ coordinators; cross-model ≈ campo `model` por agente;
  scheduled ≈ `/loop`).

## Conclusión

**No hay huecos reales que implementar.** Implementar algo de cc-best-practice en +989
sería re-derivar lo ya presente (ERR-026) o añadir cosmético. La adopción A1-A8 que esta
sesión hizo en la rama lean fue, otra vez, una validación de lo que +989 ya tenía.

**Acción:** ninguna implementación nueva. Las 2 reglas que sí faltaban (ISO, agent-reports)
ya van en PR #4.
