```yml
created_at: 2026-04-17 17:02:50
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Stage 12 — STANDARDIZE
author: NestorMonroy
status: Aprobado
```

# Patterns — multi-methodology (ÉPICA 40)

---

## Patrones adoptados

### PAT-001: Tier-based task decomposition para trabajo multi-componente

**Contexto:** WPs que implementan múltiples capas con dependencias en cascada (ej: registry YAMLs → coordinators → correcciones → docs → arquitectura).

**Patrón:**
- Agrupar en Tiers ordenados por dependencia: Tier 1 (base) → Tier 2 (correcciones) → Tier 3 (docs) → Tier 4 (arquitectura mayor)
- Cada Tier cierra con commits atómicos por sub-grupo
- Tier con "arquitectura mayor" siempre tiene Stopping Point explícito + deep-review previo
- Ruta crítica explícita en el header del task-plan

**Artefacto:** `plan-execution/implementation-plan.md` de ÉPICA 40 como ejemplo de referencia.

**Cuándo usar:** WPs con >15 tareas y dependencias en más de 2 capas de abstracción.

---

### PAT-002: plan-execution.md.template — formato canónico adaptativo

**Contexto:** Sin template, 4 task-plans en el mismo WP usaron formatos incompatibles (Mermaid / texto / tiers / batches).

**Patrón:**
- Usar siempre `workflow-decompose/assets/plan-execution.md.template`
- El template ofrece 3 convenciones de tarea (elegir UNA por task-plan)
- DAG en texto para ≤3 grupos, Mermaid para >4 grupos o dependencias cruzadas
- Secciones opcionales: versioning, stopping points, out-of-scope, resumen de progreso

**Artefacto:** `.claude/skills/workflow-decompose/assets/plan-execution.md.template`

**Cuándo usar:** Todo task-plan en `plan-execution/` sin excepción.

---

### PAT-003: Deep-review gate antes de cualquier Tier de arquitectura mayor

**Contexto:** El gap analysis inicial no captura gaps arquitecturales que solo emergen después de ver la implementación de los tiers anteriores.

**Patrón:**
- En el Stopping Point Manifest del Stage 8: añadir SP explícito antes de cualquier tier marcado como "arquitectura mayor"
- El SP incluye: "ejecutar deep-review de tiers anteriores antes de continuar"
- Los gaps identificados en el deep-review se convierten en tareas del tier arquitectural

**Resultado en ÉPICA 40:** 10 tareas adicionales (T-022..T-031) emergieron del deep-review de Tiers 1-3.

**Cuándo usar:** Cuando el plan tiene un tier/batch etiquetado como "arquitectura mayor", "meta-framework" o "decisiones arquitectónicas".

---

### PAT-004: Checkbox-at-commit — marcar `[x]` en el commit que completa la tarea

**Contexto:** 30 checkboxes acumularon drift durante ÉPICA 40 porque se separó "hacer el trabajo" de "actualizar el tracking".

**Patrón:**
- Al hacer el commit que completa T-NNN, incluir en el mismo commit el `[x]` en el task-plan
- Si son múltiples tareas en un batch: marcar todos los `[x]` del batch en el commit de cierre del batch
- Nunca dejar una "sesión de auditoría" de checkboxes para después

**Cuándo usar:** En todo WP con task-plan, sin excepción. Es parte del protocolo de commit.

---

### PAT-005: Actualización atómica de archivos de estado al cerrar un Stage

**Contexto:** `now.md`, `focus.md` y `ROADMAP.md` divergen cuando se actualizan en momentos distintos.

**Patrón:**
- Al cerrar un Stage importante (especialmente Stage 10 IMPLEMENT y Stage 11 TRACK), actualizar `now.md` + `focus.md` + `ROADMAP.md` en el **mismo commit**
- `now.md::stage` debe reflejar el estado real: "Stage N done → pendiente gate Stage N+1"
- NO declarar ÉPICA completa hasta que Stage 12 STANDARDIZE esté commitado

**Cuándo usar:** Al cierre de cada Stage del ciclo THYROX. Especialmente crítico en Stage 10, 11 y 12.

---

## Updates a guidelines

Ninguna guideline de tech-stack requirió actualización en ÉPICA 40 (el WP fue puramente de framework metodológico, sin cambios en Node.js/React/PostgreSQL/etc.).

---

## Updates a skills

| Skill | Cambio | Commit |
|-------|--------|--------|
| `workflow-decompose/SKILL.md` | Referencia a `plan-execution.md.template` + cajón correcto | 2d2099e |
| `workflow-decompose/assets/plan-execution.md.template` | Creado — template canónico adaptativo | 2d2099e |
| `thyrox/SKILL.md` | Sección "Methodology skills" + orquestación + selección por necesidad | 088e041, 8c0993f |
| `workflow-discover/references/scalability.md` | Rows lean/pps/sp/cp/bpa + sección "Escalabilidad con flow activo" | 2b862c0 |
| `workflow-track/SKILL.md` | Agregar nota PAT-004 (checkbox-at-commit) — **esta sesión** | — |

---

## ADRs creados

**adr-meta-framework-orchestration.md** — decisión de arquitectura de 4 capas:
- Capa 1: `thyrox-coordinator` con 5 preguntas diagnósticas de intake
- Capa 2: `routing-rules.yml` como mapeo problema→coordinator
- Capa 3: Coordinators emiten `artifact-ready signal` estructurado al cerrar
- Capa 4: `now.md::coordinators` para tracking multi-coordinator

---

## Próximos WPs derivados

| ÉPICA | Nombre sugerido | Origen | Prioridad |
|-------|----------------|--------|-----------|
| **ÉPICA 41** | `goto-problem-fix` | L-131, L-135: múltiples archivos de estado inconsistentes | **Alta** |
| ÉPICA futura | `checkbox-enforcement` | L-132: PAT-004 requiere hook PreToolUse o CI check | Media |
| ÉPICA futura | `td-037-038-039` | TDs registry: model: prohibido, webpack-expert, sync A↔B | Baja |
