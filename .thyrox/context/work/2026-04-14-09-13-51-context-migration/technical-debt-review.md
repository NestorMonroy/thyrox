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

## TDs pendientes de revisión

| ID | Descripción | Estado declarado |
|----|-------------|-----------------|
| TD-010 | Benchmark empírico SKILL vs CLAUDE.md vs baseline | `[ ]` Pendiente |
| TD-009 | Patrón now-{agent-name}.md no implementado | `[x]` Resuelto |
| TD-018 | execution-log no respeta timestamp completo | `[x]` Resuelto |
| TD-025 | skill-authoring.md desactualizado | `[x]` Cerrado |
| TD-027 | Criterio auto-write vs validación humana | `[x]` Resuelto |
| TD-028 | Sin mecanismo para reclasificación de tamaño de WP | `[x]` Resuelto |
| TD-035 | Sin regla de longevidad para archivos vivos | `[x]` Resuelto |
