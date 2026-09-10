```yml
type: Registro de Riesgos
created_at: 2026-04-10 03:32:38
project: thyrox-framework
feature: uv-adoption
fase: FASE 30
```

# Risk Register — uv-adoption

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|------------|
| R-01 | MCP server no arranca tras cambio a `uv run` (deps faltantes) | Media | Crítico | Probar en ambiente limpio antes de commitear `.mcp.json`. Gate SP-05. |
| R-02 | `uv.lock` genera conflicto entre memory_server y executor_server si comparten deps con versiones distintas | Baja | Medio | Revisar compatibilidad de versiones antes de unificar en un solo `pyproject.toml`. Alternativa: inline metadata por script. |
| R-03 | Hooks de Claude Code que invocan `python3` dejan de funcionar tras migración | Media | Alto | Inventariar todas las invocaciones Python en hooks antes de migrar. Migrar gradualmente. |
| R-04 | `uv` no disponible en la máquina donde se usa THYROX | Baja | Alto | Añadir verificación de instalación en `session-start.sh`. Documentar prerequisito en README. |
| R-05 | Tamaño del entorno uv para memory_server demasiado grande (faiss-cpu + sentence-transformers) | Media | Bajo | Es el mismo tamaño que hoy con pip. Primer `uv run` será lento; siguientes usan caché. |
