```yml
Tipo: Especificación Técnica
Versión: 1.0
Fecha actualización: 2026-04-04-04-16-29
WP: 2026-04-04-04-16-29-technical-debt-resolution
Fase: 4 - STRUCTURE
Estado: Aprobado
```

# Especificación de Requisitos — Technical Debt Resolution

## Resumen Ejecutivo

El framework PM-THYROX tiene deuda técnica acumulada en 4 áreas: 6 templates en `assets/` sin referencia al flujo, referencias rotas en `references/`, 8 WPs históricos con checkboxes sin marcar, y ausencia de validación automática de timestamps. Esta spec define los cambios exactos para resolver cada área.

**Objetivo:** Cualquier modelo Claude que lea el flujo de PM-THYROX puede encontrar, activar y usar cada template en contexto. Los scripts de validación detectan configuraciones incorrectas automáticamente.

---

## Mapeo Análisis → Especificación

| Categoría (análisis) | ID Spec | Descripción técnica |
|---|---|---|
| 6 templates huérfanos | SPEC-001 | Headers `Fase:` + mapeo en SKILL.md + referencias cruzadas |
| D-001: examples.md | SPEC-002 | Reescribir con nomenclatura de 7 fases actuales |
| D-002: scalability.md | SPEC-003 | Corregir referencias `project.json` y nombre de archivo |
| TD-001: timestamp | SPEC-004 | Regla en conventions.md + check en validate-session-close.sh |
| TD-002: phase readiness | SPEC-005 | validate-phase-readiness.sh verifica `*-plan.md` en Phase 3 |
| 8 WPs históricos | SPEC-006 | Marcar `[x]` en todos los checkboxes de task-plans |

---

## SPEC-001: Mapeo completo de 6 templates huérfanos

**ID:** SPEC-001
**Prioridad:** High
**Estado:** Aprobado

### Descripción

Los templates `ad-hoc-tasks.md`, `analysis-phase.md`, `categorization-plan.md`, `document.md`, `project.json`, `refactors.md` existen en `assets/` pero no tienen:
- Header `Fase:` que indique en qué fase del flujo se usan
- Referencia en SKILL.md (ni en la tabla de artefactos ni en la fase correspondiente)
- Condición de activación explícita (cuándo usarlos vs. cuándo no)

### Criterios de Aceptación

```
Given un template en assets/ sin header Fase:
When se agrega el header `Fase: N - NOMBRE` al frontmatter YAML
Then grep -r "^Fase:" assets/ad-hoc-tasks.md devuelve resultado

Given SKILL.md sin referencia a un template huérfano
When se agrega link al template en la sección de la fase correcta con condición de activación
Then grep -n "ad-hoc-tasks\|analysis-phase\|categorization-plan\|document.md\|project.json\|refactors" SKILL.md devuelve 6+ resultados

Given references/scalability.md sin mención a templates opcionales
When se agregan los templates con threshold de activación
Then la sección de "artefactos opcionales" es correcta y completa
```

### Implementación

**Archivos a modificar:**
- `assets/ad-hoc-tasks.md.template` — agregar `Fase: 5 - DECOMPOSE / 6 - EXECUTE`
- `assets/analysis-phase.md.template` — agregar `Fase: 1 - ANALYZE`
- `assets/categorization-plan.md.template` — agregar `Fase: 5 - DECOMPOSE`
- `assets/document.md.template` — agregar `Fase: 4 - STRUCTURE`
- `assets/project.json.template` — agregar `Fase: 1 - ANALYZE`
- `assets/refactors.md.template` — agregar `Fase: 5 - DECOMPOSE / 6 - EXECUTE`
- `SKILL.md` — tabla de artefactos + sección por fase para cada template (con condición)
- `references/scalability.md` — agregar categorization-plan + project.json como opcionales
- `references/incremental-correction.md` — agregar analysis-phase.md

**Complejidad:** Media (9 archivos, cambios aditivos)

---

## SPEC-002: D-001 — examples.md nomenclatura de 7 fases

**ID:** SPEC-002
**Prioridad:** High
**Estado:** Aprobado

### Descripción

`references/examples.md` usa nomenclatura de un sistema de fases anterior (e.g., "Phase 3: PLAN" con nombres distintos, o fases que ya no existen). Cualquier modelo que lo lea recibe información contradictoria con SKILL.md.

### Criterios de Aceptación

```
Given references/examples.md con nomenclatura desactualizada
When se reescribe usando las 7 fases oficiales (ANALYZE, SOLUTION_STRATEGY, PLAN, STRUCTURE, DECOMPOSE, EXECUTE, TRACK)
Then grep -n "ANALYZE\|SOLUTION_STRATEGY\|PLAN\|STRUCTURE\|DECOMPOSE\|EXECUTE\|TRACK" references/examples.md devuelve ≥7 resultados
AND grep -n "Phase [0-9]: " references/examples.md muestra solo los nombres oficiales actuales
```

### Implementación

**Archivos a modificar:**
- `references/examples.md` — reescribir sección de nomenclatura de fases con los 7 nombres oficiales

**Complejidad:** Baja (1 archivo)

---

## SPEC-003: D-002 — scalability.md referencias rotas

**ID:** SPEC-003
**Prioridad:** Medium
**Estado:** Aprobado

### Descripción

`references/scalability.md` tiene dos problemas:
1. Lista `project.json` como artefacto **obligatorio** cuando es opcional (solo para proyectos con >50 issues)
2. Referencia `exit_conditions.md` (guión bajo) en lugar de `exit-conditions.md.template` (guión medio, extensión template)

### Criterios de Aceptación

```
Given references/scalability.md con project.json como obligatorio
When se cambia a opcional con condición ">50 issues"
Then el texto indica "Opcional — activar si >50 issues"

Given references/scalability.md con "exit_conditions.md"
When se corrige a "exit-conditions.md.template"
Then grep -n "exit_conditions" references/scalability.md no devuelve resultados
```

### Implementación

**Archivos a modificar:**
- `references/scalability.md` — 2 correcciones de texto

**Complejidad:** Baja (1 archivo, 2 líneas)

---

## SPEC-004: TD-001 — Regla de timestamp en conventions.md + validate-session-close.sh

**ID:** SPEC-004
**Prioridad:** High
**Estado:** Aprobado

### Descripción

El formato de timestamp `YYYY-MM-DD-HH-MM-SS` se usa en WP names, frontmatter, y filenames, pero no está documentado como convención explícita en `conventions.md`. El script `validate-session-close.sh` no valida timestamps al cierre de sesión.

### Criterios de Aceptación

```
Given conventions.md sin regla de timestamp
When se agrega sección "Timestamp Format" con formato YYYY-MM-DD-HH-MM-SS y ejemplos
Then grep -n "YYYY-MM-DD-HH-MM-SS" references/conventions.md devuelve ≥1 resultado

Given validate-session-close.sh sin check de timestamp
When se agrega validación que detecta frontmatter con "[YYYY-MM-DD" sin resolver
Then el script emite warning si encuentra "[YYYY-MM-DD-HH-MM-SS]" literal en now.md
```

### Implementación

**Archivos a modificar:**
- `references/conventions.md` — agregar sección de timestamp
- `scripts/validate-session-close.sh` — agregar check de timestamp

**Complejidad:** Baja (2 archivos, cambios aditivos)

---

## SPEC-005: TD-002 — validate-phase-readiness.sh verifica Phase 3

**ID:** SPEC-005
**Prioridad:** Medium
**Estado:** Aprobado

### Descripción

`scripts/validate-phase-readiness.sh` puede no verificar la existencia de `*-plan.md` al entrar en Phase 3. Esto permite avanzar a Phase 4 sin haber completado el plan y sin aprobación de scope.

### Criterios de Aceptación

```
Given validate-phase-readiness.sh llamado con argumento 3 (Phase 3 check)
When no existe *-plan.md en el WP activo
Then el script devuelve exit code != 0 y mensaje "plan.md requerido para Phase 3"

Given validate-phase-readiness.sh llamado con argumento 3
When existe *-plan.md con "Scope aprobado" marcado [x]
Then el script devuelve exit code 0
```

### Implementación

**Archivos a modificar:**
- `scripts/validate-phase-readiness.sh` — verificar/agregar case para Phase 3

**Complejidad:** Baja (1 archivo)

---

## SPEC-006: Cierre formal de 8 WPs históricos

**ID:** SPEC-006
**Prioridad:** Low
**Estado:** Aprobado

### Descripción

8 WPs completados tienen task-plans con checkboxes `[ ]` sin marcar. El estado visual del repositorio es incorrecto: parece que hay trabajo pendiente cuando no lo hay.

WPs afectados:
- `2026-03-27-*-coherencia-unificacion-fases/`
- `2026-03-27-*-covariancia/`
- `2026-03-28-*-spec-kit-adoption/`
- `2026-03-28-*-spec-kit-deep-adoption/`
- `2026-03-28-*-cicd-setup/`
- `2026-03-28-*-multi-interaction-evals/`
- `2026-03-31-*-skill-flow-analysis/`
- `2026-03-31-*-skill-consistency/`

### Criterios de Aceptación

```
Given un WP histórico con checkboxes [ ] en su task-plan
When se marcan todos como [x]
Then grep -rn "^\- \[ \]" context/work/2026-03-2*/ context/work/2026-03-31*/ no devuelve resultados
```

### Implementación

**Archivos a modificar:** task-plan de cada uno de los 8 WPs (8 archivos)

**Complejidad:** Baja (8 archivos, solo cambiar `[ ]` → `[x]`)

---

## Dependencias entre requisitos

```
SPEC-001 independiente
SPEC-002 independiente
SPEC-003 independiente (toca mismo archivo que SPEC-001 — coordinar orden)
SPEC-004 independiente
SPEC-005 independiente
SPEC-006 independiente
```

Todos los SPEC son paralelizables. SPEC-001 y SPEC-003 modifican `scalability.md` — ejecutar secuencialmente.

---

## Plan de implementación

### Batch A (paralelo): SPEC-002, SPEC-004, SPEC-005, SPEC-006
### Batch B (paralelo): SPEC-001 headers de templates
### Batch C (secuencial): SPEC-001 SKILL.md + SPEC-003 scalability.md

---

**Versión:** 1.0
**Última actualización:** 2026-04-04-04-16-29
