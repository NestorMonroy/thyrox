```yml
created_at: 2026-04-13 21:00:00
wp: 2026-04-13-20-17-28-technical-debt-resolution
fase: FASE 34
phase: 5 — DECOMPOSE
status: Pendiente aprobación SP-02
```

# Task Plan — technical-debt-resolution (FASE 34)

## Resumen

7 TDs → 8 commits → 18 tareas atómicas (T-001..T-017 + T-012b).
Orden: C1 (TD-027) → C2 (TD-028) → C3 (TD-009) → C4 (TD-001) → C5 (TD-003) → C6 (TD-018) → C7 (TD-035) → C8 (cierre).

**Correcciones post deep-review:**
- T-011: paths de origen/destino corregidos por skill (workflow-track, workflow-decompose, workflow-structure, workflow-analyze)
- T-012b: nueva tarea para `refactors.md.template` (sin disposición previa)
- T-003: nota operacional sobre Prompt ask independiente
- T-016: fecha dinámica (no hardcodeada)

---

## Commit C1 — TD-027: thyrox/SKILL.md + settings.json

### T-001 — Leer sección "Modelo de permisos" en thyrox/SKILL.md
- [ ] **T-001** Leer `.claude/skills/thyrox/SKILL.md` sección "Modelo de permisos" (tabla actual de Plano B)
- **Criterio:** Identificar exactamente qué categorías faltan (References, ADRs, Scripts operacionales)

### T-002 — Completar tabla de categorías en thyrox/SKILL.md
- [ ] **T-002** Editar `.claude/skills/thyrox/SKILL.md` — agregar filas faltantes a tabla "Comportamiento por categoría de archivo/operación": `References (.claude/references/**)`, `ADRs (.claude/context/decisions/**)`, `Scripts operacionales (.claude/scripts/**, .claude/skills/**/scripts/**)`, con columna "criterio: Auto/Prompt/Bloqueado"
- **Archivos:** `.claude/skills/thyrox/SKILL.md`
- **Referencia:** `analysis.md §TD-027`

### T-003 — Agregar Write(/.claude/references/**) en settings.json
- [ ] **T-003** Editar `.claude/settings.json` — agregar `"Write(/.claude/references/**)": "allow"` en el bloque `permissions.allow`
- **Archivos:** `.claude/settings.json`
- **Referencia:** `analysis.md §TD-027`, L-005 de FASE 33 (sub-agentes background no podían escribir en references/)
- **Nota operacional:** `settings.json` requiere Prompt (ask) independiente del de T-002. No batchar ambas ediciones — esperar aprobación entre T-002 y T-003.
- **Commit:** `fix(framework): completar tabla auto-write en SKILL.md + allow references en settings.json`

---

## Commit C2 — TD-028: workflow-strategy/SKILL.md

### T-004 — Agregar sección re-evaluación de tamaño en workflow-strategy/SKILL.md
- [ ] **T-004** Editar `.claude/skills/workflow-strategy/SKILL.md` — agregar sección `## Re-evaluación de tamaño post-estrategia` con tabla:

  ```
  | Si el scope cambió a...    | Siguiente fase | Fases a agregar |
  |---------------------------|----------------|-----------------|
  | Sigue siendo micro/pequeño | Phase 6       | Ninguna         |
  | Pasó a mediano/grande      | Phase 3 PLAN  | 3, 4, 5         |
  ```

  + instrucción: "Si el tamaño sube, actualizar `exit-conditions.md` con las fases adicionales."
- **Archivos:** `.claude/skills/workflow-strategy/SKILL.md`
- **Referencia:** `analysis.md §TD-028`
- **Commit:** `fix(workflow): agregar re-evaluación de tamaño WP en workflow-strategy/SKILL.md`

---

## Commit C3 — TD-009: agent-spec + task-executor + task-planner

### T-005 — Agregar campo state_file en agent-spec.md
- [ ] **T-005** Editar `.claude/references/agent-spec.md` — agregar campo `state_file` en la sección de campos del agente con descripción: "Archivo de estado del agente. Convención: `context/now-{agent-name}.md`. Crear/actualizar al inicio de cada sesión."
- **Archivos:** `.claude/references/agent-spec.md`
- **Referencia:** `analysis.md §TD-009`

### T-006 — Agregar instrucción state_file en task-executor.md
- [ ] **T-006** Editar `.claude/agents/task-executor.md` — agregar instrucción de crear/actualizar `context/now-task-executor.md` al inicio de cada sesión con: tarea activa, T-NNN en curso, próximo paso
- **Archivos:** `.claude/agents/task-executor.md`
- **Referencia:** `analysis.md §TD-009`

### T-007 — Agregar instrucción state_file en task-planner.md
- [ ] **T-007** Editar `.claude/agents/task-planner.md` — agregar instrucción de crear/actualizar `context/now-task-planner.md` al inicio de cada sesión con: WP activo, fase del plan, última decisión
- **Archivos:** `.claude/agents/task-planner.md`
- **Referencia:** `analysis.md §TD-009`
- **Commit:** `fix(agents): agregar state_file en agent-spec + now-{agent-name} en task-executor y task-planner`

---

## Commit C4 — TD-001: validate-session-close.sh

### T-008 — Leer validate-session-close.sh para entender estructura actual
- [ ] **T-008** Leer `.claude/scripts/validate-session-close.sh` — identificar dónde agregar la nueva validación de timestamps incompletos

### T-009 — Agregar detección de timestamps incompletos
- [ ] **T-009** Editar `.claude/scripts/validate-session-close.sh` — agregar bloque que ejecute:
  ```bash
  grep -rE "created_at: [0-9]{4}-[0-9]{2}-[0-9]{2}$" .claude/context/work/**/*.md
  ```
  Si hay matches → imprimir advertencia con lista de archivos afectados y retornar exit code no-cero
- **Archivos:** `.claude/scripts/validate-session-close.sh`
- **Referencia:** `analysis.md §TD-001`
- **Commit:** `fix(scripts): detectar timestamps sin hora en validate-session-close.sh`

---

## Commit C5 — TD-003: templates audit

### T-010 — Listar y verificar todos los templates en assets/
- [ ] **T-010** Glob `.claude/skills/workflow-*/assets/*.template` — listar todos los templates y verificar cuáles están referenciados vs huérfanos

### T-011 — Crear directorios assets/legacy/ y mover 4 templates
- [ ] **T-011** Crear `legacy/` en cada skill correspondiente y mover cada template a su propio legacy:
  - `workflow-track/assets/legacy/` ← `workflow-track/assets/analysis-phase.md.template` (duplica `introduction.md.template`)
  - `workflow-decompose/assets/legacy/` ← `workflow-decompose/assets/categorization-plan.md.template` (sin fase asignada)
  - `workflow-structure/assets/legacy/` ← `workflow-structure/assets/document.md.template` (template genérico sin uso)
  - `workflow-analyze/assets/legacy/` ← `workflow-analyze/assets/project.json.template` (JSON, no aplica stack actual)
- **Nota:** Mover, no eliminar — conservar en `legacy/` del skill original para referencia histórica.

### T-012 — Mapear ad-hoc-tasks.md.template a Phase 6 en SKILL.md
- [ ] **T-012** Editar `.claude/skills/workflow-execute/SKILL.md` — agregar referencia a `ad-hoc-tasks.md.template` en la sección correspondiente (tareas fuera del task-plan formal)
- **Archivos:** `.claude/skills/workflow-execute/SKILL.md`
- **Referencia:** `analysis.md §TD-003`

### T-012b — Evaluar y disponer refactors.md.template
- [ ] **T-012b** Leer `.claude/skills/workflow-track/assets/refactors.md.template` y `.claude/skills/workflow-track/SKILL.md` — determinar si tiene uso documentado en Phase 7 TRACK:
  - Si tiene referencia activa en SKILL.md → dejar en su lugar y documentar su uso
  - Si no tiene referencia → mover a `workflow-track/assets/legacy/`
- **Archivos:** `.claude/skills/workflow-track/assets/refactors.md.template`, `.claude/skills/workflow-track/SKILL.md`
- **Referencia:** `analysis.md §TD-003` ("refactors.md.template → posible uso en Phase 6 → evaluar")
- **Commit:** `fix(templates): mapear ad-hoc-tasks a Phase 6 + mover 4 templates huérfanos a legacy/ + disponer refactors`

---

## Commit C6 — TD-018: execution-log timestamp fix

### T-013 — Corregir timestamps en framework-evolution-execution-log.md
- [ ] **T-013** Leer y editar `.claude/context/work/2026-04-08-02-05-03-context-hygiene/framework-evolution-execution-log.md` — corregir frontmatter `created_at` a formato `YYYY-MM-DD HH:MM:SS`. Si hora desconocida → usar `2026-04-08 00:00:00` con nota `# hora aproximada`
- **Archivos:** `.claude/context/work/2026-04-08-02-05-03-context-hygiene/framework-evolution-execution-log.md`
- **Referencia:** `analysis.md §TD-018`
- **Commit:** `fix(artefactos): corregir timestamps en framework-evolution-execution-log.md`

---

## Commit C7 — TD-035: project-status.sh alerta de tamaño

### T-014 — Leer project-status.sh para entender estructura actual
- [ ] **T-014** Leer `.claude/scripts/project-status.sh` — identificar sección donde agregar el bloque de alerta de tamaño

### T-015 — Agregar bloque de validación REGLA-LONGEV-001
- [ ] **T-015** Editar `.claude/scripts/project-status.sh` — agregar bloque:
  ```bash
  # REGLA-LONGEV-001: alertar si archivo vivo supera 25000 bytes
  for f in ROADMAP.md CHANGELOG.md .claude/context/technical-debt.md .claude/references/conventions.md; do
    [ -f "$f" ] || continue
    size=$(wc -c < "$f")
    if [ "$size" -gt 25000 ]; then
      echo "⚠ REGLA-LONGEV-001: $f supera 25,000 bytes ($size bytes)"
    fi
  done
  ```
- **Archivos:** `.claude/scripts/project-status.sh`
- **Referencia:** `analysis.md §TD-035`
- **Commit:** `fix(scripts): agregar alerta REGLA-LONGEV-001 en project-status.sh`

---

## Commit C8 — Cierre: technical-debt.md 7 TDs [x]

### T-016 — Marcar 7 TDs resueltos en technical-debt.md
- [ ] **T-016** Editar `.claude/context/technical-debt.md` — marcar `[x]` con la fecha del día de ejecución (no hardcodear 2026-04-13 — usar `date +%Y-%m-%d`):
  - TD-001, TD-003, TD-009, TD-018, TD-027, TD-028, TD-035
- **Archivos:** `.claude/context/technical-debt.md`

### T-017 — Actualizar exit-conditions.md con Phase 6 completada
- [ ] **T-017** Editar `technical-debt-resolution-exit-conditions.md` — marcar Phase 5 y Phase 6 completadas
- **Archivos:** `context/work/2026-04-13-20-17-28-technical-debt-resolution/technical-debt-resolution-exit-conditions.md`
- **Commit:** `chore(technical-debt): marcar 7 TDs resueltos [x] + exit-conditions Phase 6`

---

## Trazabilidad

| T-NNN | TD | Commit | Archivo principal |
|-------|----|--------|-------------------|
| T-001 | TD-027 | C1 | `skills/thyrox/SKILL.md` (lectura) |
| T-002 | TD-027 | C1 | `skills/thyrox/SKILL.md` |
| T-003 | TD-027 | C1 | `settings.json` ⚠ Prompt ask independiente |
| T-004 | TD-028 | C2 | `skills/workflow-strategy/SKILL.md` |
| T-005 | TD-009 | C3 | `references/agent-spec.md` |
| T-006 | TD-009 | C3 | `agents/task-executor.md` |
| T-007 | TD-009 | C3 | `agents/task-planner.md` |
| T-008 | TD-001 | C4 | `scripts/validate-session-close.sh` (lectura) |
| T-009 | TD-001 | C4 | `scripts/validate-session-close.sh` |
| T-010 | TD-003 | C5 | glob assets/ (lectura) |
| T-011 | TD-003 | C5 | `workflow-track/`, `workflow-decompose/`, `workflow-structure/`, `workflow-analyze/` assets/legacy/ |
| T-012 | TD-003 | C5 | `skills/workflow-execute/SKILL.md` |
| T-012b | TD-003 | C5 | `skills/workflow-track/assets/refactors.md.template` |
| T-013 | TD-018 | C6 | `framework-evolution-execution-log.md` |
| T-014 | TD-035 | C7 | `scripts/project-status.sh` (lectura) |
| T-015 | TD-035 | C7 | `scripts/project-status.sh` |
| T-016 | cierre | C8 | `context/technical-debt.md` (fecha dinámica) |
| T-017 | cierre | C8 | `exit-conditions.md` |
