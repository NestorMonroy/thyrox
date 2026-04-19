```yml
type: Estado de Sesión
version: 1.1
updated_at: 2026-04-19 11:28:01
cold_boot: false
last_session: 2026-04-19
current_work: .thyrox/context/work/2026-04-18-07-12-50-methodology-calibration
stage: Stage 3 — DIAGNOSE
flow: null
methodology_step: null
blockers: []
coordinators: {}
```

<!-- coordinators: tracking de estado por coordinator activo
Formato cuando hay coordinators activos:
coordinators:
  dmaic-coordinator:
    status: active          # active | completed | paused
    started_at: YYYY-MM-DD HH:MM:SS
    current_step: dmaic:analyze
    artifacts_produced:
      - dmaic-define.md
      - dmaic-measure.md
  lean-coordinator:
    status: completed
    started_at: YYYY-MM-DD HH:MM:SS
    completed_at: YYYY-MM-DD HH:MM:SS
    artifacts_produced:
      - lean-define.md
      - lean-measure.md
      - lean-analyze.md
      - lean-improve.md
      - lean-control.md
-->

# Contexto

ÉPICA 42 methodology-calibration — **Stage 3 DIAGNOSE completado**. Stage 1 DISCOVER: 90+ artefactos, Cap.9-20, 30 AP en 8 categorías, promedio 63.3%. Stage 2 BASELINE: 0/30 cobertura. Stage 3 DIAGNOSE: causa raíz = scope drift (python-mcp.instructions.md MCP-only). 3 ejes causales con árbol 5-Whys. Solución: (1) agentic-python.instructions.md, (2) agentic-validator.md agent, (3) patrones consultables. Próximo: Stage 5 STRATEGY → decidir diseño de implementación.
