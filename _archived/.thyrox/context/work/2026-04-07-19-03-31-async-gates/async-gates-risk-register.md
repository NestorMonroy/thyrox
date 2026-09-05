```yml
type: Registro de Riesgos
work_package: 2026-04-07-19-03-31-async-gates
created_at: 2026-04-07 19:03:31
status: Activo
phase: Phase 1 — ANALYZE
```

# Risk Register: async-gates

| ID | Riesgo | Probabilidad | Impacto | Estado | Mitigación |
|----|--------|-------------|---------|--------|------------|
| R-01 | Gates async demasiado frecuentes → fatiga de aprobación del usuario | Media | Alto | Abierto | Calibrar según tipo de agente y reversibilidad del WP |
| R-02 | Stopping Point Manifest incompleto en Phase 1 (WP sin paralelos planificados) | Baja | Medio | Abierto | El manifest siempre tiene entradas mínimas (gate-fase son fijos) |
| R-03 | Claude no consulta el manifest en Phase 6 al recibir task-notification | Media | Alto | Abierto | Instrucción explícita en Phase 6 step 1 del SKILL.md |
| R-04 | task-notification llega durante otra operación activa | Baja | Bajo | Abierto | Completar operación actual, luego atender gate |
| R-05 | SKILL.md se vuelve demasiado largo con nuevas instrucciones | Media | Medio | Abierto | Extraer instrucciones detalladas a references/async-gates.md |
