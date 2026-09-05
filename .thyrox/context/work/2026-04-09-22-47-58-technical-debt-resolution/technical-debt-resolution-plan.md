```yml
created_at: 2026-04-10 00:30:00
wp: 2026-04-09-22-47-58-technical-debt-resolution
phase: 3 - PLAN
status: Pendiente aprobación
```

# Plan — FASE 29: Resolución de Deuda Técnica del Framework THYROX

## Scope Statement

**Problema:** El framework THYROX acumuló 35 TDs durante FASEs 1–28, de los cuales 27 están pendientes. Los más críticos: 3 archivos vivos superan el límite del Read tool (technical-debt.md 176%, ROADMAP.md 140%, CHANGELOG.md 119%); el skill orquestador tiene nombre incorrecto (`pm-thyrox` en lugar de `thyrox`); y los workflows carecen de validaciones pre-gate que prevengan saltos de fase sin fundamento.

**Usuarios:** Claude Code (agente ejecutor del framework) y el mantenedor humano del framework THYROX.

**Criterios de éxito:**
- `pm-thyrox` renombrado a `thyrox` — sin referencias rotas en archivos activos
- Los 3 archivos sobredimensionados (technical-debt.md, ROADMAP.md, CHANGELOG.md) reducidos a < 25,000 bytes
- Los 7 `workflow-*/SKILL.md` tienen instrucciones de validación pre-gate explícitas
- `{wp}-changelog.md` y `{wp}-technical-debt-resolved.md` son artefactos oficiales de Phase 7
- REGLA-LONGEV-001 documentada en conventions.md — previene recurrencia del problema de crecimiento

---

## In-Scope

### Grupo 1: Renombrado `pm-thyrox` → `thyrox`

- Mover directorio `.claude/skills/pm-thyrox/` → `.claude/skills/thyrox/`
- Actualizar 6 referencias en CLAUDE.md (Level 2)
- Actualizar 5 scripts: `session-start.sh`, `session-resume.sh`, `update-state.sh`, `project-status.sh`, `commit-msg-hook.sh`
- Actualizar grep filter en `workflow-analyze/SKILL.md`, `workflow-strategy/SKILL.md`, `workflow-track/SKILL.md`
- Actualizar `owner:` frontmatter en ~10 archivos `references/*.md`
- Verificar `.claude/commands/` para referencias a `pm-thyrox` — actualizar si existen (consecuencia namespace `/thyrox:*`)
- Actualizar Locked Decision #5 en CLAUDE.md (Addendum thyrox rename)
- **Constraint (GAP-01):** Archivos históricos (WPs anteriores, ADRs) NO se modifican — son registros inmutables en git

### Grupo 2: Validaciones pre-gate en los 7 workflow-*/SKILL.md

- `workflow-analyze/SKILL.md`: agregar Step 0 END USER CONTEXT (TD-007)
- Todos los 7 `workflow-*/SKILL.md`: agregar instrucción de validación pre-gate (TD-029)
- Todos los 7 `workflow-*/SKILL.md`: agregar deep review de la phase anterior antes de continuar (TD-031)
  - **Nota (GAP-04):** Phase 2 D4 body dice TD-031 solo en workflow-execute, pero la tabla IN SCOPE dice "7 workflow-*/SKILL.md". El Plan sigue la tabla IN SCOPE — es la especificación correcta. Cada SKILL debe revisar la phase anterior antes de proceder.
- Todos los 7 `workflow-*/SKILL.md`: agregar `git add now.md` antes de commits y gates (TD-033)
- `workflow-strategy/SKILL.md`: agregar re-evaluación de tamaño de WP (TD-028)
- `workflow-execute/SKILL.md`: agregar criterio granular auto-write vs validación humana (TD-027 Plano A)
- `workflow-execute/SKILL.md`: mejorar pre-flight checklist (TD-032)

### Grupo 3: Mejoras a scripts existentes

- `project-status.sh`: alerta si ROADMAP.md no tiene entry del WP activo (B-08)
- `session-start.sh`: alerta si execution-log falta cuando Phase 6 está activa (B-09)

### Grupo 4: Nuevos artefactos de Phase 7

- Crear template `workflow-track/assets/wp-changelog.md.template`
- Crear template `workflow-track/assets/technical-debt-resolved.md.template`
- Actualizar `workflow-track/SKILL.md` [D2]: cambiar target de root CHANGELOG.md → `{wp}-changelog.md`
- Actualizar `workflow-track/SKILL.md` [D3]: agregar paso "mover TDs cerrados a `{wp}-technical-debt-resolved.md`" ← **GAP-03 corregido**
- Actualizar `thyrox/SKILL.md`: agregar ambos artefactos (`{wp}-changelog.md`, `{wp}-technical-debt-resolved.md`) a tabla de Phase 7
- Agregar procedimiento de cierre de TD en `technical-debt.md`

### Grupo 5: Reglas de longevidad y timestamps

- `conventions.md`: agregar REGLA-LONGEV-001 (umbral 25,000 bytes → mover contenido histórico)
- `conventions.md`: agregar regla de timestamps en artefactos (TD-001)
- `validate-session-close.sh`: agregar verificación de timestamps (TD-018)

### Grupo 6: Splits de archivos sobredimensionados

- `ROADMAP.md`: verificar con grep recursivo todos los archivos que referencian ROADMAP.md (mitigación R-03), luego mover FASEs 1–26 a `ROADMAP-history.md` ← **GAP-06 corregido**
- `CHANGELOG.md`: convertir a `[Unreleased]` only; archivar versiones históricas en `CHANGELOG-archive.md`; documentar en `conventions.md` que root CHANGELOG.md solo se actualiza en releases a main ← **GAP-07 corregido**
- `technical-debt.md` — dos operaciones distintas:
  - **Cerrar + mover** (Grupo 7): TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 — implementados pero sin marcar
  - **Solo mover** (este Grupo 6): TD-019, TD-020, TD-021 (parte), TD-023, TD-024 — ya marcados `[-]` en FASE 23, mover al primer `{wp}-technical-debt-resolved.md` de FASE 29 ← **GAP-08 corregido**

### Grupo 7: Cerrar TDs ya implementados

- Marcar como `[x]` en `technical-debt.md`: TD-002, TD-004, TD-011, TD-016, TD-017, TD-021
- Mover sus entradas al primer `{wp}-technical-debt-resolved.md` de FASE 29

---

## Constraints de ejecución

Aplican durante Phase 6 EXECUTE — sin excepción:

| Constraint | Origen | Aplicación |
|-----------|--------|-----------|
| SKILL.md ≤ 200 líneas | R-02 (Phase 2) | Medir `wc -l` antes y después de cada edición a SKILL.md. Si supera 200 líneas → mover detalle a `references/` y dejar solo checklist en el SKILL |
| Archivos históricos intocables | D1 (Phase 2) | WPs anteriores, ADRs: NO se modifican bajo ninguna circunstancia |
| Commits convencionales | CLAUDE.md | 1 commit por archivo o grupo lógico de cambios. `type(scope): description` |
| Secuencia SKILL.md | R-01 (Phase 2) | Editar un SKILL.md a la vez, commit entre cada uno — no en paralelo |
| grep antes del split | R-03 (Phase 2) | Verificar referencias antes de mover contenido en splits |
| GATE OPERACION (SP-02) | Phase 2 | Requerido antes de editar SKILL.md y scripts — aprobación explícita |

---

## Out-of-Scope

| Excluido | Razón |
|----------|-------|
| TD-003: Templates huérfanos | Baja prioridad — FASE 31+ |
| TD-005, TD-006: Investigación arquitectónica | Requieren WP propio — FASE 31+ |
| TD-008: Sync de `/workflow_*` commands | WP completo en sí mismo — FASE 30 |
| TD-009: now-{agent-name} para ejecución paralela | Scope separado — FASE 31+ |
| TD-010: Benchmark empírico de tamaño óptimo WP | Requiere datos empíricos — FASE 31+ |
| TD-022, TD-025: Baja severidad | No bloquean nada — FASE 31+ |
| TD-027 Plano B: Hook automático de auto-write | Más complejo, FASE 30+ |
| TD-030: Meta-comandos `/thyrox:next`, `:sync`, `:prime`, `:review` | Dependen de TD-008 commands — FASE 30 |
| Hooks nuevos de automatización | Plano A es suficiente para esta FASE |

---

## Estimación de esfuerzo

| Grupo | Componente | Tareas estimadas |
|-------|-----------|-----------------|
| 1 | Renombrado pm-thyrox → thyrox (+ commands/ check) | 7 |
| 2 | Validaciones pre-gate en 7 SKILL.md (+ wc -l checks) | 14 |
| 3 | Mejoras a scripts existentes (B-08, B-09) | 2 |
| 4 | Nuevos artefactos Phase 7 (templates + 2 updates SKILL.md) | 7 |
| 5 | Reglas de longevidad y timestamps | 3 |
| 6 | Splits + grep pre-verificación + documentar CHANGELOG rule | 7 |
| 7 | Cerrar TDs ya implementados | 2 |
| — | Commits, validaciones, tests | 4 |
| **Total** | | **~46 tareas** |

Clasificación: **grande**
Fases activas: 1 → 2 → 3 → 4 → 5 → 6 → 7 (ciclo completo)

---

## Trazabilidad TD → Grupo

| TD / Item | Grupo | Descripción |
|-----------|-------|-------------|
| TD-030 (renombrado) | 1 | pm-thyrox → thyrox |
| TD-007 | 2 | Step 0 END USER CONTEXT en workflow-analyze |
| TD-029 | 2 | Validación pre-gate en 7 SKILL.md |
| TD-031 | 2 | Deep review phase anterior en 7 SKILL.md |
| TD-033 | 2 | `git add now.md` en 7 SKILL.md |
| TD-028 | 2 | Re-evaluación tamaño WP en workflow-strategy |
| TD-027 Plano A | 2 | Criterio auto-write en workflow-execute |
| TD-032 | 2 | Pre-flight checklist mejorado en workflow-execute |
| B-08 | 3 | project-status.sh alerta ROADMAP entry |
| B-09 | 3 | session-start.sh alerta execution-log faltante |
| TD-034 (nuevos artefactos) | 4 | wp-changelog.md + technical-debt-resolved.md templates; dos updates a workflow-track/SKILL.md (D2+D3) |
| TD-001 | 5 | Timestamps en artefactos (conventions.md) |
| TD-018 | 5 | Timestamps en validate-session-close.sh |
| TD-035 | 5 | REGLA-LONGEV-001 en conventions.md |
| TD-026 | 6 | Split ROADMAP.md → ROADMAP-history.md |
| TD-034 (split) | 6 | Split CHANGELOG.md → CHANGELOG-archive.md |
| — (split TD) | 6 | Move resolved TDs de technical-debt.md |
| TD-002, TD-004, TD-011, TD-016, TD-017, TD-021 | 7 | Cerrar TDs ya implementados |

---

## Stopping Points (SP-*)

| SP | Gate | Acción requerida |
|----|------|-----------------|
| SP-01 | Phase 2→3 | **[SUPERADO]** — Gate aprobado implícitamente |
| SP-02 | Phase 5→6 | GATE OPERACION — Aprobar antes de editar SKILL.md y scripts |
| SP-03 | Phase 6→7 | Confirmar que todos los cambios son correctos antes de TRACK |

---

## Link ROADMAP

Ver tracking: [ROADMAP.md — FASE 29](../../../../../ROADMAP.md#fase-29-technical-debt-resolution)

---

## Estado de aprobación

- [ ] Scope aprobado por usuario — PENDIENTE
