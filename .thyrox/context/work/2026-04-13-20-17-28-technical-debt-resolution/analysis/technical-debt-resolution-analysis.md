```yml
created_at: 2026-04-13 20:17:28
project: thyrox-framework
wp: 2026-04-13-20-17-28-technical-debt-resolution
fase: FASE 34
analysis_version: 1.0
status: Aprobado
```

# Análisis — technical-debt-resolution (FASE 34)

## Objetivo

Resolver 7 de los 8 TDs activos en `technical-debt.md`. TD-010 (benchmark empírico) queda pendiente — su trigger no se ha activado. Los 7 TDs restantes tienen soluciones concretas implementables en esta FASE.

---

## Contexto y motivación

FASE 32 (technical-debt-audit) auditó 24 TDs y cerró/confirmó varios. FASE 33 cerró TD-025. Quedan 8 TDs activos, 7 de los cuales tienen soluciones de implementación directa identificadas (cambios en archivos del framework). TD-010 requiere un trigger externo (caso de uso real) que no se ha dado — se mantiene pendiente.

---

## Inventario de TDs a resolver

### TD-001 — Timestamps incompletos (severidad: media)

**Estado actual:** `[-]` — Regla en `conventions.md` ✓ — Falta detección automática en `validate-session-close.sh`

**Trabajo pendiente:**
- Agregar en `validate-session-close.sh` detección de `created_at: \d{4}-\d{2}-\d{2}$` (fecha sin hora) en archivos de `context/work/`
- Regex: `grep -rE "created_at: [0-9]{4}-[0-9]{2}-[0-9]{2}$"` en `context/work/**/*.md`

**Impacto de no-resolución:** Sin validación automática, el error puede seguir ocurriendo en nuevos WPs sin que nadie lo note.

---

### TD-003 — Templates huérfanos en assets/ (severidad: baja)

**Estado actual:** `[-]` — 5/6 templates referenciados ✓ — Falta `ad-hoc-tasks.md.template`

**Templates a auditar en** `.claude/skills/workflow-*/assets/`:
- `ad-hoc-tasks.md.template` → mapear a Phase 6 EXECUTE en SKILL.md (tareas fuera del task-plan)
- `analysis-phase.md.template` → verificar si duplica introduction.md.template → mover a legacy/
- `categorization-plan.md.template` → sin fase asignada → mover a legacy/
- `document.md.template` → template genérico → mover a legacy/
- `project.json.template` → JSON no Markdown → mover a legacy/ (no aplica al stack actual)
- `refactors.md.template` → posible uso en Phase 6 → evaluar

**Trabajo pendiente:** Decidir y ejecutar: mapear / mover a `assets/legacy/` / eliminar. Crear `assets/legacy/` si no existe.

---

### TD-009 — now-{agent-name}.md no implementado en agentes (severidad: media)

**Estado actual:** `[-]` — Convención en `conventions.md` + `CLAUDE.md` ✓ — Falta `agent-spec.md` campo `state_file` + instrucciones en `task-executor.md` y `task-planner.md`

**Trabajo pendiente:**
1. Actualizar `references/agent-spec.md` — añadir campo `state_file` con descripción de la convención `now-{agent-name}.md`
2. Actualizar `.claude/agents/task-executor.md` — instrucción de crear/actualizar `now-task-executor.md` al inicio de cada sesión
3. Actualizar `.claude/agents/task-planner.md` — instrucción de crear/actualizar `now-task-planner.md` al inicio

---

### TD-010 — Benchmark empírico (severidad: baja)

**Estado actual:** `[ ]` — Pendiente, trigger no activado

**Decisión FASE 34:** TD-010 **NO se implementa en esta FASE**. El trigger original es "caso de uso real que requiera datos empíricos propios para una decisión arquitectónica". Ese trigger no se ha activado. Mantener como `[ ]` pendiente.

---

### TD-018 — execution-log timestamps incorrectos (severidad: baja)

**Estado actual:** `[-]` — Template corregido ✓ — Falta corrección retroactiva de `framework-evolution-execution-log.md`

**Trabajo pendiente:** Corregir el frontmatter de `framework-evolution-execution-log.md` para que `created_at` use formato `YYYY-MM-DD HH:MM:SS`. Si no es posible determinar la hora exacta, usar `2026-04-08 00:00:00` con una nota.

**Impacto de resolución:** Consistencia con el resto de artefactos. Baja prioridad — corrección estética/convención.

---

### TD-027 — Criterio auto-write vs validación humana (severidad: alta)

**Estado actual:** `[-]` — Plano A/B documentado en `thyrox/SKILL.md` ✓ — Falta tabla metodológica explícita de categorías de archivo + linkage SP→archivo

**Trabajo pendiente:**
1. Actualizar `thyrox/SKILL.md` — en la sección "Modelo de permisos" reemplazar la tabla actual por la tabla completa de categorías de archivo con criterio auto-write/gate explícito
2. Agregar `Write(/.claude/references/**)` al allow list en `settings.json` — deuda identificada en FASE 33 (L-005): sub-agentes en background no podían escribir en `.claude/references/`

**Nota:** La tabla actual en `thyrox/SKILL.md` ya existe pero no incluye todas las categorías (References, ADRs, Scripts operacionales están ausentes). Completar, no reemplazar.

---

### TD-028 — Sin reclasificación tamaño WP entre fases (severidad: media)

**Estado actual:** `[-]` — Bullet de re-evaluación en `workflow-strategy/SKILL.md` ✓ — Falta tabla formal de decisión

**Trabajo pendiente:** Agregar sección `## Re-evaluación de tamaño post-estrategia` en `workflow-strategy/SKILL.md` con la tabla:

```
| Si el scope cambió a... | Siguiente fase | Fases a agregar |
|------------------------|----------------|-----------------|
| Sigue siendo micro/pequeño | Phase 6   | Ninguna |
| Pasó a mediano/grande  | Phase 3 PLAN   | 3, 4, 5 |
```

Incluir instrucción: actualizar `exit-conditions.md` si el tamaño sube.

---

### TD-035 — Sin alerta de tamaño en project-status.sh (severidad: media)

**Estado actual:** `[-]` — REGLA-LONGEV-001 en `conventions.md` ✓ — Falta alerta de tamaño en `project-status.sh`

**Trabajo pendiente:** Agregar en `project-status.sh` bloque de validación de tamaño para archivos vivos clave:
```bash
# Archivos a monitorear: ROADMAP.md, CHANGELOG.md, technical-debt.md, conventions.md
wc -c ROADMAP.md CHANGELOG.md .claude/context/technical-debt.md .claude/references/conventions.md
# Si > 25000 bytes → imprimir advertencia REGLA-LONGEV-001
```

---

## Clasificación de tamaño

| Criterio | Valor |
|----------|-------|
| TDs a implementar | 7 (TD-001, TD-003, TD-009, TD-018, TD-027, TD-028, TD-035) |
| Archivos a modificar | ~10 (scripts, SKILL.md, agent specs, settings.json, templates) |
| Complejidad | Media — cambios quirúrgicos en archivos existentes, sin nueva arquitectura |
| **WP size** | **pequeño** |

**Justificación small:** No hay nuevos componentes, no hay nueva arquitectura, no hay diseño que requiera aprobación separada. Cada TD tiene solución identificada. Se pueden saltar Phase 2 (SOLUTION_STRATEGY) y Phase 4 (STRUCTURE) con aprobación del usuario.

Fases activas: 1 → 3 → 5 → 6 → 7 (omitir 2 y 4).

---

## Riesgos preliminares

| Riesgo | Probabilidad | Impacto |
|--------|:----------:|:-------:|
| TD-027 modifica `thyrox/SKILL.md` — requiere Prompt (ask) según permission model | media | bajo |
| `settings.json` también requiere Prompt (ask) para Write | media | bajo |
| `ad-hoc-tasks.md.template` mapeo a Phase 6 puede confundir con task-plan | baja | bajo |
| `project-status.sh` alerta de tamaño produce false positives en repos nuevos | baja | medio |

---

## Stopping Point Manifest

| SP | Momento | Acción requerida |
|----|---------|-----------------|
| SP-01 | Gate Phase 1 → 3 | Usuario aprueba hallazgos + clasificación small + omisión Phase 2 |
| SP-02 | Gate Phase 5 → 6 | Usuario aprueba task-plan antes de ejecutar |
| SP-03 | Gate Phase 6 → 7 | Usuario valida resultado de ejecución |

---

## Out of scope

- TD-010 (benchmark empírico) — trigger no activado
- Corrección retroactiva de WPs históricos cerrados (solo `framework-evolution-execution-log.md` por TD-018, que sigue abierto)
- Nuevas validaciones más allá de las especificadas en cada TD
- Cambios arquitectónicos en el Stopping Point Manifest
