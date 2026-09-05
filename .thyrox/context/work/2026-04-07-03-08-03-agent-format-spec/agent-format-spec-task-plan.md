```yml
type: Plan de Tareas
work_package: 2026-04-07-03-08-03-agent-format-spec
created_at: 2026-04-07 05:19:42
status: Pendiente ejecución
phase: Phase 5 — DECOMPOSE
```

# Plan de Tareas: agent-format-spec

## Propósito

Desglose en tareas atómicas para implementar la especificación de formato de agentes nativos de Claude Code en THYROX. Cada tarea es independiente o tiene dependencias explícitas documentadas.

Basado en: `agent-format-spec-requirements-spec.md`

---

## Resumen

Total de tareas: 6
Estimación total: ~2.5h
Fecha inicio estimada: 2026-04-07

---

## Fases de Implementación

### FASE 1 — Especificación y Fundación

- [ ] [T-001] Crear `references/agent-spec.md` con tabla de campos obligatorios, prohibidos y naming (R-001, R-002, R-003)
- [ ] [T-003] [P] Crear `references/skill-vs-agent.md` con tabla comparativa y regla de decisión (R-006)

> T-001 y T-003 no tienen dependencias entre sí y pueden ejecutarse en paralelo [P].
> T-001 es el gate del WP: hasta que esté aprobado, las tareas T-002, T-004, T-005 y T-006 no deben iniciarse.

### FASE 2 — Linter

- [x] [T-002] Crear `scripts/lint-agents.py` con validación de campos obligatorios, prohibidos y calidad de description (R-007)

> Depende de T-001 (necesita spec aprobada para implementar reglas).

### FASE 3 — Correcciones de agentes

- [x] [T-004] Corregir `nodejs-expert.md`: eliminar `model`, completar `description` con patrón `{qué hace}. Usar cuando {condición}.` (R-004)
- [x] [T-005] Corregir `react-expert.md`: eliminar `model`, completar `description` con patrón `{qué hace}. Usar cuando {condición}.` (R-004)

> T-004 y T-005 dependen de T-001 (spec aprobada). Pueden ejecutarse en paralelo [P] entre sí.

### FASE 4 — Generador

- [x] [T-006] Actualizar `skill-generator.md`: agregar instrucción explícita para no propagar el campo `model` al generar agentes nativos (R-005)

> Depende de T-001 (spec aprobada).

---

## Orden de Ejecución

```
T-001 (spec)        T-003 [P] (skill-vs-agent)
   |
   | [GATE: T-001 aprobado]
   |
   +---> T-002 (linter)
   |         |
   |         | [CHECKPOINT post-T-002]
   |         v
   +---> T-004 [P] (corregir nodejs-expert)
   +---> T-005 [P] (corregir react-expert)
   +---> T-006 (actualizar skill-generator)
```

Secuencia recomendada:

1. T-001 y T-003 (paralelo, sin dependencias)
2. **Gate de T-001:** esperar aprobación antes de continuar
3. T-002 (linter, requiere T-001)
4. **Checkpoint post-T-002** (ver más abajo)
5. T-004, T-005, T-006 (pueden ejecutarse en paralelo, todas requieren T-001)

---

## Gate de WP-1

**Condición:** T-001 (`references/agent-spec.md`) aprobado por el usuario.

**Desbloquea:** WP-1 (parallel-agent-conventions) puede ejecutar sus T-010 y T-011, que modifican `task-executor.md` y `task-planner.md`, con certeza del formato que deben respetar.

**Acción requerida:** Notificar a WP-1 cuando T-001 esté marcado como aprobado.

---

## Checkpoints

**CHECKPOINT — Después de T-002 (antes de T-004, T-005)**

Ejecutar el linter sobre los agentes aún sin corregir para verificar que detecta los errores esperados:

```bash
python3 .claude/skills/pm-thyrox/scripts/lint-agents.py .claude/agents/nodejs-expert.md
python3 .claude/skills/pm-thyrox/scripts/lint-agents.py .claude/agents/react-expert.md
```

Resultado esperado (ambos archivos):
- `[ERROR] ... prohibited field 'model' found in frontmatter`
- `[ERROR] ... missing required field 'description'` o description vacía detectada
- Exit code 1

Si el linter NO detecta estos errores, T-002 está incompleto. No continuar a T-004/T-005 hasta que el checkpoint pase.

---

## Archivos Afectados

| Tarea | Archivo | Operación |
|-------|---------|-----------|
| T-001 | `.claude/skills/pm-thyrox/references/agent-spec.md` | NUEVO |
| T-002 | `.claude/skills/pm-thyrox/scripts/lint-agents.py` | NUEVO |
| T-003 | `.claude/skills/pm-thyrox/references/skill-vs-agent.md` | NUEVO |
| T-004 | `.claude/agents/nodejs-expert.md` | MODIFICADO |
| T-005 | `.claude/agents/react-expert.md` | MODIFICADO |
| T-006 | `.claude/agents/skill-generator.md` | MODIFICADO |

> Ninguna tarea modifica archivos compartidos entre work packages.

---

## Criterios de Éxito por Tarea

**T-001:** `agent-spec.md` contiene tabla de campos obligatorios (`name`, `description`, `tools`), tabla de campos prohibidos (`model`, `category`, `skill_template`, `system_prompt`), y convención de naming (kebab-case, coincide con nombre de archivo).

**T-002:** Script ejecutable. `python3 lint-agents.py` retorna código 1 con estado actual del repo (2 agentes rotos). Acepta path opcional. Imprime `✓`/`✗` por archivo y resumen final. Sin dependencias externas fuera de stdlib + `pyyaml`.

**T-003:** `skill-vs-agent.md` tiene tabla comparativa con ≥5 filas, ≥2 ejemplos de SKILLs y ≥2 ejemplos de agentes de THYROX, y una regla de decisión accionable.

**T-004:** `nodejs-expert.md` pasa `python3 lint-agents.py` con 0 errores, 0 warnings. Campo `model` eliminado. `description` ≥20 chars con patrón. Body intacto.

**T-005:** `react-expert.md` pasa `python3 lint-agents.py` con 0 errores, 0 warnings. Campo `model` eliminado. `description` ≥20 chars con patrón. Body intacto.

**T-006:** `skill-generator.md` contiene instrucción explícita visible de no incluir `model` en el agente generado. Un agente generado desde `nodejs-expert.yml` no tiene campo `model`.

---

## Aprobación

- [ ] Tasks revisadas
- [ ] Orden de ejecución verificado
- [ ] Gate de WP-1 documentado
- [ ] Aprobado por:
- [ ] Fecha aprobación:
```
