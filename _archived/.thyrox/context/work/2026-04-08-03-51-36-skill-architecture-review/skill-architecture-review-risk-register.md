```yml
type: Risk Register
work_package: 2026-04-08-03-51-36-skill-architecture-review
created_at: 2026-04-08 03:51:36
phase: Phase 1 — ANALYZE
```

# Risk Register: skill-architecture-review

| ID | Riesgo | P | I | Nivel | Mitigación | Estado |
|----|--------|---|---|-------|-----------|--------|
| R-01 | Migración rompe el flujo actual de pm-thyrox | M | A | Alto | Migración gradual; SKILL activa durante transición | Abierto |
| R-02 | workflow_* desactualizados producen regresión vs SKILL actual | A | M | Alto | Sincronizar commands ANTES de reducir SKILL | Abierto |
| R-03 | CLAUDE.md sobrecargado si se añade demasiado contenido PM | M | M | Medio | Límite explícito de líneas; lógica de fase → workflow_* | Abierto |
| R-04 | Decisión arquitectónica sin evaluación empírica | M | M | Medio | Benchmarking mínimo (3 tareas con/sin SKILL) antes de ADR | Abierto |
| R-05 | PTC llega a Claude Code y invalida la arquitectura elegida | B | A | Medio | Cláusula de revisión en ADR cuando PTC esté disponible | Abierto |
| R-06 | Pérdida del contexto cross-fase si pm-thyrox SKILL desaparece | M | A | Alto | CLAUDE.md mantiene referencias a workflow_* commands | Abierto |

**Leyenda:** P = Probabilidad (A=Alta/M=Media/B=Baja), I = Impacto (A=Alto/M=Medio/B=Bajo)
