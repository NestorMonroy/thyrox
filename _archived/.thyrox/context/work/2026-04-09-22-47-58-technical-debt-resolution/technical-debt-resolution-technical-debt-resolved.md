```yml
created_at: 2026-04-10 04:00:00
feature: technical-debt-resolution
wp: 2026-04-09-22-47-58-technical-debt-resolution
fase: FASE 29
tds_resueltos: 10
```

# TDs Resueltos — technical-debt-resolution

> Registro de deudas técnicas cerradas o movidas durante FASE 29.
> Fuente: `.claude/context/technical-debt.md` — entradas marcadas `[x]` o `[-]` en este WP.

---

## TDs cerrados en este WP

> `[x]` = implementado y verificado en FASE 29.

| TD | Descripción | FASE que lo implementó | Notas |
|----|-------------|------------------------|-------|
| TD-002 | Git como persistencia — SKILL.md debe mencionar explícitamente que no se usan DBs | FASE 12+ | Locked Decision #3 en CLAUDE.md — verificado implementado |
| TD-004 | Template de ADR incompleto | FASE 9/10 | adr.md.template en assets/ completo — verificado |
| TD-011 | validate-session-close.sh: verificar timestamps en artefactos WP | FASE 29 | Implementado en T-030 (PARCIAL — implementado suficiente) |
| TD-016 | Stopping Point Manifest faltante en Phase 1 análisis | FASE 18/19 | Campo registrado en analysis templates — verificado |
| TD-017 | Gates async sin instrucción de commit previo al lanzamiento | FASE 19 | workflow-execute SKILL.md lo menciona — verificado |
| TD-021 | Terminología Phase N debe mapear explícitamente a /workflow_* | FASE 23/28 | Tabla en thyrox/SKILL.md + workflow-* commands — verificado |

---

## TDs archivados (ya marcados en fases anteriores)

> `[-]` = ya marcado antes de este WP; se mueve aquí para reducir el tamaño de technical-debt.md.

| TD | Descripción | FASE que lo implementó | Fecha marcado |
|----|-------------|------------------------|---------------|
| TD-019 | Nomenclatura de workflow_*.md — subdirectorios vs flat files | FASE 23 (workflow-restructure) | 2026-04-09 |
| TD-020 | Escalabilidad no distribuida en workflow_* skills | FASE 23 (T-013: tabla en workflow-analyze/SKILL.md) | 2026-04-09 |
| TD-023 | References sin asignación de propietario | FASE 23 (T-014: owner añadido a 24 archivos) | 2026-04-09 |
| TD-024 | agent-spec.md desactualizado vs docs oficiales Claude Code | FASE 23 (T-015: model Opcional, tools Opcional) | 2026-04-09 |

---

## Notas

- TD-011 cerrado como PARCIAL: la verificación de timestamps en validate-session-close.sh cubre el caso principal. No se requiere acción adicional en FASE 29.
- TD-019, TD-020, TD-023, TD-024 estaban marcados `[-]` desde FASE 23. Se mueven aquí para reducir technical-debt.md por REGLA-LONGEV-001.
- TD-021: verificado implementado — thyrox/SKILL.md tiene tabla Phase→/workflow-* command; workflow-*/SKILL.md tienen `name:` correspondiente.
