```yml
created_at: 2026-04-11 18:05:14
wp: thyrox-commands-namespace
phase: 3 - PLAN
status: Aprobado — 2026-04-11
```

# Plan — Namespace /thyrox:* mediante Plugin Claude Code (FASE 31)

## Scope Statement

**Problema:** THYROX no tiene un namespace de comandos slash propio. Los comandos actuales
(`/workflow-analyze`, etc.) no están agrupados, colisionan con cualquier proyecto que use
el prefijo `workflow-`, y no permiten distribución como plugin. El separador `:` en
`/thyrox:analyze` solo existe en la arquitectura de plugins de Claude Code.

**Usuarios:** Desarrolladores que usan THYROX como framework de gestión en sus proyectos.
Se benefician al tener un namespace `/thyrox:*` limpio y agrupar visualmente todos los
comandos del framework en el menú `/`.

**Criterios de éxito:**

- `/thyrox:analyze` (y los 7 comandos equivalentes) aparecen en el menú `/` de Claude Code
- `bash .claude/scripts/session-start.sh` muestra `/thyrox:analyze` en la opción B
- `grep -ri "/workflow-analyze\|/workflow-strategy\|/workflow-plan\|/workflow-structure\|/workflow-decompose\|/workflow-execute\|/workflow-track" .claude/scripts/ .claude/references/ .claude/commands/ .claude/skills/thyrox/SKILL.md` → 0 resultados
- `workflow-analyze/SKILL.md` tiene el paso 1.5 ⏸ STOP pre-creación WP
- Los `workflow-*` skills internos siguen funcionando sin cambios

---

## In-Scope

**Archivos nuevos a crear (no existen):**

- `.claude-plugin/plugin.json` — manifest del plugin (name, description, version, author)
- `commands/analyze.md` → `/thyrox:analyze` (thin wrapper sobre `workflow-analyze`)
- `commands/strategy.md` → `/thyrox:strategy` (thin wrapper sobre `workflow-strategy`)
- `commands/plan.md` → `/thyrox:plan` (thin wrapper sobre `workflow-plan`)
- `commands/structure.md` → `/thyrox:structure` (thin wrapper sobre `workflow-structure`)
- `commands/decompose.md` → `/thyrox:decompose` (thin wrapper sobre `workflow-decompose`)
- `commands/execute.md` → `/thyrox:execute` (thin wrapper sobre `workflow-execute`)
- `commands/track.md` → `/thyrox:track` (thin wrapper sobre `workflow-track`)
- `commands/init.md` → `/thyrox:init` (thin wrapper sobre `workflow_init` skill)
- `thyrox-commands-namespace-execution-log.md` — log de ejecución de Phase 6
- ADR-019 (borrador creado en Phase 2 → formalizar como Accepted al completar)

**Archivos existentes a modificar:**

- `.claude/scripts/session-start.sh` — 5 cambios concretos:
  1. Función `_phase_to_command()` (líneas 18–25): 8 returns `/workflow-*` → `/thyrox:*`
  2. Línea 91: echo opción B display `/workflow-analyze` → `/thyrox:analyze`
  3. Línea 93: remover echo "outdated TD-008" (TD-008 ya completado en FASE 22)
  4. Línea 113: `/workflow_init` → `/thyrox:init`
  5. Comentarios de encabezado (líneas 10–15): actualizar referencias `workflow-*` → `thyrox:*`
- `.claude/skills/workflow-analyze/SKILL.md` — agregar paso 1.5 ⏸ STOP pre-creación WP (TD-036)
- `.claude/skills/thyrox/SKILL.md` — actualizar tabla de fases (columna Skill: `/workflow-*` → `/thyrox:*`)
- `.claude/context/decisions/adr-019.md` — cambiar `status: Draft` → `status: Accepted`
- `.claude/context/decisions/adr-016.md` — agregar Addendum FASE 31 (interfaz pública `/thyrox:*` vs implementación `workflow-*`)
- `.claude/CLAUDE.md` — agregar Addendum FASE 31 en Locked Decision #5 (plugin namespace como interfaz pública)
- `ROADMAP.md` — agregar entrada FASE 31 (este WP) ← ya hecho en Phase 3
- `technical-debt.md` — marcar TD-036 como resuelto; actualizar texto TDs afectados (TD-008, TD-030)
- [thyrox-commands-namespace-exit-conditions](thyrox-commands-namespace-exit-conditions.md) — marcar checkboxes de Phase 6 y 7

**Archivos de trazabilidad a actualizar en Phase 6:**

- `.claude/context/technical-debt.md` — TD-008 (rutas /workflow_* → /thyrox:*), TD-030 (colisión IDs), texto de TDs afectados
- `.claude/references/skill-vs-agent.md` — tabla de decisión con rutas actualizadas

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| Meta-comandos `/thyrox:next`, `/thyrox:sync`, `/thyrox:review`, `/thyrox:prime` | UC-003 — diferido a FASE 32+. Requieren spec individual por comando |
| Corrección de 12 archivos `.claude/references/*.md` | D-4 — separado en FASE 32 (references-refactor). Plan detallado ya documentado en `references-correction-plan.md` |
| Renombrado de directorios `workflow-*/` a `thyrox-*/` | Rompe proyectos bootstrapped con THYROX (R-06 cerrado). Opción D es aditiva, no destructiva |
| Modificación de hooks del sistema o `settings.json` | TD-036 se resuelve con instrucción en SKILL.md, no con hook (D-3) |
| Plugin Marketplace / publicación externa | Fuera de alcance técnico — la estructura queda lista para distribución pero no se publica |
| Modificación de `workflow-*/SKILL.md` (salvo workflow-analyze) | Los 6 restantes no mencionan `/workflow-*` en interfaz pública — sin cambio necesario |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|-----------|-----------------|
| Plugin manifest (`.claude-plugin/plugin.json`) | 1 |
| 8 command files (`commands/*.md`) | 8 |
| `session-start.sh` — actualización de strings | 1 |
| `workflow-analyze/SKILL.md` — paso 1.5 TD-036 | 1 |
| `thyrox/SKILL.md` — tabla de fases | 1 |
| Referencias de trazabilidad (technical-debt.md, skill-vs-agent.md) | 2 |
| ADR-019 formalizar | 1 |
| ADR-016 addendum FASE 31 | 1 |
| CLAUDE.md addendum FASE 31 | 1 |
| Verification grep + test session-start.sh | 1 |
| **Total** | **~18 tareas atómicas** |

Clasificación: mediano
Fases activas: 7 (todas, per exit-conditions.md)

---

## Trazabilidad UC → Componente

| UC / TD | Descripción | Componente(s) en scope |
|---------|-------------|------------------------|
| UC-001 | Invocar `/thyrox:analyze` para iniciar Phase 1 | `commands/analyze.md` + `plugin.json` |
| UC-002 | Continuar con `/thyrox:strategy` al completar Phase 1 | `commands/strategy.md` |
| UC-003 | Meta-comandos `/thyrox:next` etc. | **OUT-OF-SCOPE** → FASE 32 |
| UC-004 | Inicializar tech skills con `/thyrox:init` | `commands/init.md` |
| UC-005 | TD-030 colisión IDs + TDs legacy | `technical-debt.md` (actualizar texto de TDs) |
| UC-006 | `skill-vs-agent.md` referencias `/workflow_*` | `skill-vs-agent.md` (actualizar tabla) |
| UC-007 | Plugin THYROX implementado | `plugin.json` + 8 `commands/*.md` |
| UC-008 | Investigar confirmación `mkdir` ante Write | Observar durante Phase 6, sin cambios previos |
| TD-036 | Gate pre-creación WP en workflow-analyze | `workflow-analyze/SKILL.md` (paso 1.5) |

Todos los UCs Alta/Media tienen componente asignado. UC-003 explícitamente excluido.

---

## Link ROADMAP

Ver tracking: [ROADMAP](../../../../ROADMAP.md) — sección FASE 31

---

## Estado de aprobación

- [x] Scope aprobado por usuario — 2026-04-11
