```yml
created_at: 2026-04-17 19:30:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Stage 6 — SCOPE
author: NestorMonroy
status: Aprobado
```

# Plan — goto-problem-fix (ÉPICA 41)

## Scope statement

Corregir los 30 problemas identificados en ÉPICA 41: 6 bugs en scripts de hooks
(session-start.sh, session-resume.sh, close-wp.sh), 11 ítems desactualizados en README,
y 4 documentos faltantes o incompletos (state-management.md, methodology_step docs,
methodology-selection-guide, coordinator-integration guide). La causa raíz es migración
parcial acumulada en ÉPICAs 29, 31, 35 y 39. El resultado es un framework con scripts,
README y documentación internamente consistentes.

---

## In-scope

### Cluster A — Bugs en scripts de hooks (6 bugs)

- **A-1** `session-start.sh` líneas 61-63: eliminar fallback que activa cuando `current_work: null`
- **A-2** `session-resume.sh` línea 36: corregir lectura de `phase:` → `stage:` (con fallback retrocompat)
- **A-3** `session-resume.sh` líneas 46-48: eliminar fallback idéntico al de A-1
- **A-4** `close-wp.sh` línea 18: agregar patrones sed para `stage:`, `flow:`, `methodology_step:`
- **A-5** `close-wp.sh`: agregar limpieza de body `# Contexto` en bash pura (sin python3)
- **A-6** `close-wp.sh`: agregar llamada a `update-state.sh` al cierre
- **GAP-02** `session-start.sh`: comprimir 6 líneas de comentarios para cumplir límite ≤120

### Cluster B — README desactualizado (11 ítems)

- **B-1** Renombrar `pm-thyrox` → `thyrox` (5 ocurrencias en README)
- **B-2** Quick Start: documentar migración de `setup-template.sh` + alternativa correcta
- **B-3** Fase actual: corregir "Phase 1: ANALYZE" → "Stage 1: DISCOVER"
- **B-4** Comandos obsoletos: reemplazar `/task:show`, `/task:next` por equivalentes actuales
- **B-5** Metadata de header: actualizar
- **B-6** Árbol de directorios: `.claude/context/` → `.thyrox/context/`
- **B-7** Sección Metodología: "7 fases SDLC" → "12 stages THYROX" + descripción actualizada
- **B-8** Sección Coordinators: agregar sección nueva con 11 coordinators disponibles
- **B-9** Versión y fecha del documento: actualizar a v2.8.0+
- **B-10** `ARCHITECTURE.md`: actualizar para reflejar arquitectura de coordinators (ÉPICA 40)
- **B-11** `DECISIONS.md`: agregar índice de ADRs de coordinators creados en ÉPICA 40

### Cluster D — Documentación faltante (4 ítems)

- **D-1** `state-management.md`: documentar body `# Contexto` y campos `flow`, `methodology_step`
- **D-2** Crear `methodology-selection-guide`: cuándo usar cada metodología
- **D-3** Crear `coordinator-integration guide`: cómo invocar coordinators, contrato now.md
- **D-4** Docs `methodology_step`: documentar namespacing (dmaic:define, ba:planning, etc.)

---

## Out-of-scope

| Item | Razón | Destino |
|------|-------|---------|
| Índice de referencias (47) y agents (23) | Identificado en GAP-06 durante diagnose — no es parte del problema GO-TO original | ÉPICA 42 |
| Migración big-bang FASE→ÉPICA en docs históricos | Retrocompatibilidad — no rompe nada | Incremental al tocar cada archivo |
| Reescritura completa de scripts | Fixes quirúrgicos son suficientes — sin refactoring | No aplica |
| Nuevo mecanismo de detección de WP | El problema es el fallback, no el mecanismo de detección primario | No aplica |
| Crear guías para ÉPICAs futuras de metodología (Cat 2-6) | Fuera del scope de ÉPICA 41 | ÉPICAs futuras de metodología |

---

## Entregables por Stage

| Stage | Entregable | Criterio de éxito |
|-------|-----------|------------------|
| 5 STRATEGY | `strategy/goto-problem-fix-strategy.md` | Decisiones DS-01..DS-05 aprobadas |
| 6 SCOPE | Este documento | Scope aprobado, in/out-of-scope claro |
| 8 PLAN EXECUTION | `plan-execution/goto-problem-fix-task-plan.md` | 5 batches con T-NNN, DAG completo |
| 10 IMPLEMENT — B1 | 3 scripts corregidos | `bash -n` sin errores; session-start.sh ≤ 120 líneas |
| 10 IMPLEMENT — B2 | `state-management.md` + methodology_step docs | Campos flow/methodology_step documentados |
| 10 IMPLEMENT — B3 | `README.md` reescrito | Cero referencias a pm-thyrox, .claude/context, 7 fases |
| 10 IMPLEMENT — B4 | `ARCHITECTURE.md` actualizado | Coordinator pattern documentado |
| 10 IMPLEMENT — B5 | `DECISIONS.md` + 2 guías nuevas | methodology-selection-guide y coordinator guide creados |
| 11 TRACK | Lessons learned | Patrón "migración parcial" documentado para evitar recurrencia |

---

## Dependencias

```
Batch 1 (scripts)
    ↓
Batch 2 (state docs) ──────┐
Batch 3 (README)           │ Independientes entre sí
Batch 4 (ARCHITECTURE.md) ─┤ después de Batch 1
Batch 5 (guides)  ─────────┘
    ↓
Stage 11 TRACK
```

---

## Impacto en ROADMAP

ÉPICA 41 consolida 4 ÉPICAs de deuda acumulada (29, 31, 35, 39) en un fix definitivo.
Post-ÉPICA 41, el framework tiene scripts, README y documentación 100% consistentes.
ÉPICA 42 (por declarar): índice de referencias y agents.
