```yml
type: Technical Debt Review Log
created_at: 2026-04-14 18:03:26
fase: FASE 35
proposito: Verificación uno a uno de technical-debt.md antes de migración .claude/context/ → .thyrox/context/
```

# Technical Debt Review — FASE 35

Revisión ítem por ítem de `.claude/context/technical-debt.md`.
Criterio: verificar si la resolución marcada está efectivamente implementada
o si el TD sigue siendo relevante.

---

## TDs verificados y eliminados

### TD-001: Timestamps incompletos en metadatos de artefactos

```
Severidad: media | Estado original: [x] Resuelto — FASE 34 (2026-04-14)
Verificado: 2026-04-14 18:03:26
```

**Evidencia de implementación:**

1. `validate-session-close.sh` — existe en `.claude/scripts/` y contiene:
   ```bash
   # TD-001: detectar created_at con fecha sin hora (YYYY-MM-DD sin HH:MM:SS)
   INCOMPLETE=$(grep -rlE "^created_at: [0-9]{4}-[0-9]{2}-[0-9]{2}$" .claude/context/work/)
   ```

2. `references/conventions.md` — contiene la regla:
   > "NUNCA usar solo `YYYY-MM-DD` — siempre incluir la hora."
   > `created_at: YYYY-MM-DD HH:MM:SS  # timestamp real del sistema — NO estimar`

3. `stop-hook-git-check.sh` — existe, integración con Stop hook activa.

**Veredicto:** Resuelto y verificado. Eliminado del backlog activo.

---

### TD-003: Templates huérfanos en assets/ no referenciados en ningún flujo

```
Severidad: baja | Estado original: [x] Resuelto — FASE 34 (2026-04-14)
Verificado: 2026-04-14 18:03:26
```

**Evidencia de implementación:**

Templates del listado original y su estado actual:

| Template | Estado actual | Referencia |
|----------|---------------|------------|
| `ad-hoc-tasks.md.template` | Activo en `workflow-execute/assets/` | `workflow-execute/SKILL.md:27` |
| `analysis-phase.md.template` | `workflow-track/assets/legacy/` | — |
| `categorization-plan.md.template` | `workflow-decompose/assets/legacy/` | — |
| `document.md.template` | `workflow-structure/assets/legacy/` | — |
| `project.json.template` | `workflow-analyze/assets/legacy/` | — |
| `refactors.md.template` | Activo en `workflow-track/assets/` | `workflow-track/SKILL.md:59` |

**Veredicto:** Resuelto y verificado. Eliminado del backlog activo.

---

## TDs en revisión

### TD-010: Benchmark empírico — SKILL vs CLAUDE.md vs baseline

```
Estado anterior: [ ] Pendiente
Estado nuevo:    [-] En progreso — trigger activado FASE 35 (2026-04-14)
```

**Decisión:** La migración `.claude/context/` → `.thyrox/context/` cumple el trigger
original (≥1 semana de trabajo, decisión arquitectónica real). El formato del benchmark
cambia de sintético (3×3) a instrumentación de la migración en curso.

- Artefacto de salida: `references/benchmark-skill-vs-claude.md` al cerrar FASE 35
- Se instrumenta la migración misma como caso de estudio empírico

### TD-009: Patrón now-{agent-name}.md no implementado

```
Estado declarado: [x] Resuelto — FASE 34 (2026-04-14)
Verificado: 2026-04-14
```

**Evidencia de implementación:**

1. `references/agent-spec.md:29` — campo `state_file` documentado:
   `context/now-{agent-name}.md`, instrucciones de crear/actualizar al inicio de sesión.

2. `agents/task-executor.md:22,31` — instrucciones explícitas de crear y actualizar
   `now-task-executor.md` con tarea activa, próximo paso y WP.

3. `agents/task-planner.md:21` — instrucciones explícitas de crear
   `now-task-planner.md` con WP activo y fase del plan.

4. `references/conventions.md` — tabla completa de qué entidad escribe en qué
   archivo de estado, ciclo de vida y protocolo de recovery de claims abandonados.

**Nota para FASE 35:** `task-executor.md:22` y `task-planner.md:21` tienen rutas
hardcodeadas a `.claude/context/`. Se actualizan durante la migración.

**Veredicto:** Resuelto y verificado.

### TD-018: execution-log no respeta formato de timestamp completo

```
Estado declarado: [x] Resuelto — FASE 34 (2026-04-14)
Verificado: 2026-04-14
```

**Evidencia de implementación:**

1. `framework-evolution-execution-log.md:4` — corregido a `created_at: 2026-04-08 17:04:20` ✅
2. Execution-logs recientes tienen timestamp completo:
   - `technical-debt-audit-execution-log.md` → `2026-04-12 00:00:00` ✅
   - `thyrox-commands-namespace-execution-log.md` → `2026-04-11 22:05:00` ✅

**Hallazgo adicional:** 12 artefactos de WPs cerrados (task-plans, specs) tienen `created_at`
sin hora — son deuda histórica aceptada en el cierre de TD-001, no scope de TD-018.

**Nota menor:** `auto-operations-execution-log.md` usa guiones en lugar de espacio ISO 8601
(`2026-04-09-20-00-00` vs `2026-04-09 20:00:00`). Inconsistencia de formato menor.

**Veredicto:** Resuelto y verificado para su alcance (execution-logs).

## TDs pendientes de revisión

| ID | Descripción | Estado declarado |
|----|-------------|-----------------|
| TD-025 | skill-authoring.md desactualizado | `[x]` Cerrado |
| TD-027 | Criterio auto-write vs validación humana | `[x]` Resuelto |
| TD-028 | Sin mecanismo para reclasificación de tamaño de WP | `[x]` Resuelto |
| TD-035 | Sin regla de longevidad para archivos vivos | `[x]` Resuelto |
