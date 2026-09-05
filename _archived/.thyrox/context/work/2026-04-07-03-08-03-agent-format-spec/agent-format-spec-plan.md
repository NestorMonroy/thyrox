```yml
type: Plan
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 04:34:26
status: Pendiente aprobación
phase: Phase 3 — PLAN
```

# Plan — agent-format-spec

## Scope Statement

**Problema:** Los agentes nativos de Claude Code carecen de una spec formal de campos, convención de naming y linter ejecutable, lo que produce agentes invisibles al routing (description vacío), con campos prohibidos (model, category) y sin distinción documentada respecto a los SKILL.

**Usuarios:** Desarrolladores que crean o modifican agentes en `.claude/agents/` y el generador `skill-generator.md` que produce agentes a partir del registry.

**Criterios de éxito:**
- `references/agent-spec.md` existe con tabla de campos obligatorio/opcional/prohibido y tabla de 3 patrones de naming.
- `scripts/lint-agents.py` ejecuta sin errores en los 4 agentes de workflow y falla con mensaje claro en `nodejs-expert.md` y `react-expert.md` (antes de su corrección).
- `nodejs-expert.md` y `react-expert.md` tienen `description` con patrón `{qué hace}. Usar cuando {condición}.` y sin campo `model`.
- `skill-generator.md` no incluye `model` en el frontmatter del agente que genera.
- `references/skill-vs-agent.md` documenta la distinción entre SKILL y agente nativo.

---

## In-Scope

- `references/agent-spec.md` (CREAR) — spec formal con tabla de campos (obligatorio/opcional/prohibido), patrón de description y tabla de 3 patrones de naming.
- `scripts/lint-agents.py` (CREAR) — linter Python que valida: presencia de `name`/`description`/`tools`, longitud mínima de description (≥20 chars), ausencia de bloque vacío `>`, ausencia de campos prohibidos (`model`, `category`, `skill_template`, `system_prompt` en frontmatter).
- `references/skill-vs-agent.md` (CREAR) — documento de distinción SKILL vs agente nativo: propósito, formato, cuándo usar cada uno.
- `.claude/agents/nodejs-expert.md` (MODIFICAR) — corregir `description` con patrón correcto + eliminar campo `model`.
- `.claude/agents/react-expert.md` (MODIFICAR) — corregir `description` con patrón correcto + eliminar campo `model`.
- `.claude/agents/skill-generator.md` (MODIFICAR) — filtrar `model` del frontmatter del agente generado en el output del template.

---

## Out-of-Scope

| Excluido | Razón |
|---|---|
| Modificar `task-executor.md` y `task-planner.md` | Pertenece a WP-1 (`parallel-agent-conventions`); bloqueado hasta aprobación de este WP |
| Convenciones de ejecución paralela entre agentes | Scope de WP-1; no es parte de la spec de formato de campos |
| Modificar `ROADMAP.md`, `now.md`, `SKILL.md`, `conventions.md` | Explícitamente excluido de Phase 3 |
| Validación de campos opcionales del registry (category, skill_template) | El registry es un formato separado; este WP sólo especifica agentes nativos |
| Schema YAML ejecutable (jsonschema) | Decisión D-01: la spec es markdown; el linter cubre la validación ejecutable |

---

## Estimación de esfuerzo

| Componente | Tareas estimadas |
|---|---|
| Crear `references/agent-spec.md` | 1 |
| Crear `scripts/lint-agents.py` | 1 |
| Crear `references/skill-vs-agent.md` | 1 |
| Corregir `nodejs-expert.md` | 1 |
| Corregir `react-expert.md` | 1 |
| Actualizar `skill-generator.md` | 1 |
| **Total** | **6 tareas** |

Clasificación: micro
Fases activas: Phase 3 → Phase 4 (STRUCTURE) → Phase 6 (EXECUTE)

---

## Gate que desbloquea

Al aprobar este plan y ejecutar las 6 tareas, WP-1 (`parallel-agent-conventions`) queda desbloqueado para modificar `task-executor.md` y `task-planner.md` con certeza sobre:
- Qué campos pueden agregar (solo los declarados en la spec como obligatorio u opcional).
- Qué campos están prohibidos (model, category, skill_template, system_prompt en frontmatter).
- Qué patrón debe seguir el `description` de cada agente modificado.

**Gate output:** `references/agent-spec.md` aprobado por el usuario.

---

## Trazabilidad GAP → Tarea

| GAP | Tarea | Archivo |
|-----|-------|---------|
| GAP-1: Sin spec formal de campos | Crear spec con tabla obligatorio/opcional/prohibido | `references/agent-spec.md` |
| GAP-2: Sin convención para description de calidad | Documentar patrón `{qué hace}. Usar cuando {condición}.` + regla linter ≥20 chars | `references/agent-spec.md` + `scripts/lint-agents.py` |
| GAP-3: Sin linter | Crear script Python con validaciones de campos | `scripts/lint-agents.py` |
| GAP-4: Sin reference SKILL vs Agente | Crear documento de distinción | `references/skill-vs-agent.md` |
| GAP-5: Campo `model` en generador y en agentes existentes | Filtrar `model` del output del generador; eliminar de nodejs/react | `.claude/agents/skill-generator.md`, `nodejs-expert.md`, `react-expert.md` |
| GAP-6: Sin naming convention | Documentar 3 patrones con tabla en la spec | `references/agent-spec.md` |

---

## Estado de aprobación

- [ ] Scope aprobado por usuario — PENDIENTE
