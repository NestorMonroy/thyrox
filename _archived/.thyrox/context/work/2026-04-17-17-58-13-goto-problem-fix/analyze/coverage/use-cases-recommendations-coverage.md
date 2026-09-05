```yml
created_at: 2026-04-17 23:45:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 11 — TRACK/EVALUATE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Cobertura de Recomendaciones — use-cases-analysis.md v2.0.0

> Analiza si las 9 recomendaciones de corrección identificadas en
> `discover/use-cases-analysis.md#recomendaciones-de-corrección` fueron implementadas
> en el framework v2.8.0 (ÉPICA 41 + ÉPICA 40).

---

## Scope

**Fuente:** `discover/use-cases-analysis.md` — sección "Recomendaciones de corrección" (9 ítems)
**Documentos auditados:** `ARCHITECTURE.md`, `.thyrox/registry/routing-rules.yml`, `.claude/agents/*.md`
**Commits relevantes:** `75376be` (ARCHITECTURE.md), commit ÉPICA 40 (coordinators completos)

---

## Tabla de cobertura

| # | Recomendación | Estado | Documento / evidencia |
|---|---------------|--------|----------------------|
| R-1 | Corregir premisa central: coordinators ejecutan sus propias fases, no las 12 THYROX | ✅ PASS | `ARCHITECTURE.md` línea 47-54: "Cada coordinator gestiona su metodología, steps y artefactos" |
| R-2 | Reescribir sección BABOK: no-secuencial con 6 knowledge areas y routing contextual | ✅ PASS | `ARCHITECTURE.md` línea 91: "BABOK: 6 knowledge areas sin orden fijo — routing por contexto del WP" |
| R-3 | Reescribir sección RM: state machine con retornos condicionales | ✅ PASS | `ARCHITECTURE.md` línea 92: "RM/PPS: state machines con retornos condicionales (RM: validation→analysis si falla)" |
| R-4 | Completar RUP: milestones LCO/LCA/IOC/PD como tollgates formales | ✅ PASS | `ARCHITECTURE.md` línea 93: "milestones formales LCO/LCA/IOC/PD como tollgates entre iteraciones" |
| R-5 | Agregar SP: 8 fases con ciclo estratégico sp:adjust→sp:analysis | ✅ PASS | `ARCHITECTURE.md` línea 94: "SP: ciclo estratégico sp:adjust→sp:analysis" |
| R-6 | Agregar 4 secciones faltantes: lean, bpa, pps, cp con fases y artefactos | ⚠️ PARTIAL | `ARCHITECTURE.md` incluye los 4 en la tabla de 11 coordinators, pero sin fases ni artefactos detallados por coordinator |
| R-7 | Agregar sección "Mecanismos de estado": methodology_step, coordinators tracking, artifact-ready signals, isolation:worktree | ✅ PASS | `ARCHITECTURE.md` líneas 57-72: sección completa con ejemplos YAML de methodology_step y coordinators tracking; línea 49: worktree; línea 53-55: artifact-ready signals |
| R-8 | Corregir trigger keywords BA vs RM: separar claramente los dominios | ✅ PASS | `routing-rules.yml`: RM tiene "elicitación", "trazabilidad", "SRS", "BRD"; BA tiene "análisis de negocio", "necesidad de negocio", "business case" |
| R-9 | Corregir 7/12 stage names | ✅ PASS | `ARCHITECTURE.md` línea 165: DISCOVER→BASELINE→DIAGNOSE→CONSTRAINTS→STRATEGY→SCOPE→DESIGN→PLAN EXECUTION→PILOT→IMPLEMENT→TRACK→STANDARDIZE |

---

## Resumen

| Estado | Count | % |
|--------|-------|---|
| ✅ PASS | 8 | 89% |
| ⚠️ PARTIAL | 1 | 11% |
| ❌ FAIL | 0 | 0% |

**Score: 8.5/9 = 94.4%**

---

## Análisis del PARTIAL — R-6

### Lo que se implementó ✅

`ARCHITECTURE.md` tabla "Los 11 coordinators" lista correctamente lean, bpa, pps, sp, cp con su metodología, tipo de flujo y namespace. El gap de "5 coordinators ausentes" del análisis v1 está cerrado a nivel de existencia y flujo.

### Lo que falta ⚠️

`ARCHITECTURE.md` no tiene una sección dedicada por cada coordinator con:
- **Fases propias numeradas** (ej: lean: define→measure→analyze→improve→control)
- **Artefactos por fase** (ej: `lean-define.md`, `lean-measure.md`, VSM como artefacto transversal)
- **Retornos condicionales** más allá de la mención de RM y PPS

Esta información SÍ existe en los archivos `.claude/agents/{coordinator}.md` y en `.thyrox/registry/methodologies/*.yml`, pero no está consolidada en `ARCHITECTURE.md` como referencia rápida.

### Evaluación de impacto

El gap es de **documentación**, no de implementación. Los coordinators funcionan correctamente con sus fases y artefactos. La falta está en la referencia central (ARCHITECTURE.md) que no enumera detalladamente las fases de los 4 coordinators "nuevos".

---

## Hallazgo adicional — Agent naming incorrecto

Detectado durante la auditoría de cobertura:

| Archivo actual | Correcto | Namespace usado | Estado |
|----------------|---------|-----------------|--------|
| `.claude/agents/babok-coordinator.md` | `ba-coordinator.md` | `ba:` | ❌ Inconsistente |
| `.claude/agents/pmbok-coordinator.md` | `pm-coordinator.md` | `pm:` | ❌ Inconsistente |

**Evidencia:**
- `babok-coordinator.md` interno usa `ba:planning`, `ba:elicitation`, etc.
- `pmbok-coordinator.md` interno usa `pm:initiating`, `pm:planning`, etc.
- `routing-rules.yml` líneas 120 y 166 referencian `pmbok-coordinator` y `babok-coordinator`
- `methodology-selection-guide.md` líneas 114, 122, 148, 151 referencian los nombres viejos

Mencionado como hallazgo en `use-cases-analysis.md`: "Agent naming incorrecto (ba-coordinator vs babok-coordinator, etc.) — 🟡 Medio"

**Acción requerida:**
- `git mv .claude/agents/babok-coordinator.md .claude/agents/ba-coordinator.md`
- `git mv .claude/agents/pmbok-coordinator.md .claude/agents/pm-coordinator.md`
- Actualizar `name:` field en ambos archivos
- Actualizar `routing-rules.yml` (2 referencias)
- Actualizar `ARCHITECTURE.md` (2 referencias en tabla)
- Actualizar `methodology-selection-guide.md` (4 referencias)

---

## Action Plan

### P1 — Rename agentes (inconsistencia namespace:filename)

- [ ] `git mv babok-coordinator.md ba-coordinator.md` + update `name: babok-coordinator` → `name: ba-coordinator`
- [ ] `git mv pmbok-coordinator.md pm-coordinator.md` + update `name: pmbok-coordinator` → `name: pm-coordinator`
- [ ] Actualizar `routing-rules.yml`: `babok-coordinator` → `ba-coordinator`, `pmbok-coordinator` → `pm-coordinator`
- [ ] Actualizar `ARCHITECTURE.md` tabla: 2 referencias
- [ ] Actualizar `methodology-selection-guide.md`: 4 referencias

### P2 — Completar R-6: fases y artefactos de lean/bpa/pps/cp en ARCHITECTURE.md

- [ ] Agregar subsección "Fases por coordinator" en ARCHITECTURE.md para los 4 coordinators con fases reales y artefactos principales
- [ ] Alternativa más ligera: link desde ARCHITECTURE.md a `.claude/agents/{coordinator}.md` para detalle

---

## Commits de referencia

- `75376be` — docs(goto-problem-fix): update ARCHITECTURE.md coordinator pattern + hooks B-10 + B6 (cubre R-1..R-5, R-7, R-9)
- ÉPICA 40 commits — creación de los 11 coordinators completos con fases y artefactos en `.claude/agents/`
