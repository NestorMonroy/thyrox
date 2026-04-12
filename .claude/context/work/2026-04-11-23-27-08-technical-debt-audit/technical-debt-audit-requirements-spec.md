```yml
type: Especificación Técnica
status: Pendiente aprobación
created_at: 2026-04-11 23:27:08
wp: 2026-04-11-23-27-08-technical-debt-audit
fase: FASE 32
```

# Especificación de Requisitos — technical-debt-audit (FASE 32)

## Resumen ejecutivo

Auditoría y resolución de deuda técnica del framework THYROX. Hallazgo clave de Phase 4: TD-029, TD-031, TD-032 y TD-033 **ya están implementados** en todos los `workflow-*/SKILL.md` (descubierto al leer los archivos reales). El scope real es más pequeño que lo planeado en Phase 3.

**Scope corregido:**
- **Grupo A (status updates):** 7 TDs con status `[ ] Pendiente` pero ya implementados
- **Grupo B (implementar):** TD-038, TD-039, TD-040 únicamente
- **REGLA-LONGEV-001:** cleanup de `technical-debt.md`

---

## Mapeo Plan → Spec

| Ítem del Plan | SPEC | Archivos afectados |
|---------------|------|--------------------|
| Grupo A — status 7 TDs | SPEC-001 | `technical-debt.md` |
| TD-039 — async_suitable | SPEC-002 | `agents/deep-review.md`, `agents/task-planner.md` |
| TD-038 — Edit rules redundantes | SPEC-003 | `settings.json`, `references/tool-execution-model.md` |
| TD-040A — workflow-plan Gate humano | SPEC-004 | `skills/workflow-plan/SKILL.md` |
| TD-040B — workflow-strategy artefact update | SPEC-005 | `skills/workflow-strategy/SKILL.md` |
| TD-040C — workflow-structure artefact update + template | SPEC-006 | `skills/workflow-structure/SKILL.md`, `skills/workflow-structure/assets/requirements-specification.md.template` |
| REGLA-LONGEV-001 — create resolved file + cleanup | SPEC-007 | WP resolved file + `technical-debt.md` |

---

## SPEC-001: Marcar TDs implementados como [x] en technical-debt.md

**Prioridad:** High
**TDs afectados:** TD-006, TD-007, TD-008, TD-029, TD-031, TD-032, TD-033

### Descripción

Siete TDs tienen status `[ ] Pendiente` en `technical-debt.md` pero el código ya los implementa (verificado en Phase 4 leyendo los archivos reales):

| TD | Evidencia de implementación |
|----|----------------------------|
| TD-007 | `workflow-analyze/SKILL.md` líneas 46-53: sección "Step 0 — Contexto del usuario final (TD-007)" |
| TD-008 | `workflow-*/SKILL.md` tienen lógica completa, `thyrox/SKILL.md` es catálogo (209 líneas), `COMMANDS_SYNCED=true` en `session-start.sh` |
| TD-006 | Trigger era TD-008. `thyrox/SKILL.md` = catálogo sin lógica de fase. Arquitectura lograda en FASEs 23/29/31 |
| TD-029 | Todos los 7 `workflow-*/SKILL.md` tienen sección "Validaciones pre-gate" con "TD-029 criterios" |
| TD-031 | Todos los 7 `workflow-*/SKILL.md` tienen "TD-031 deep review" en sus validaciones pre-gate |
| TD-032 | `workflow-execute/SKILL.md` líneas 92-103: "Validaciones pre-gate 6→7" con checklist completo de Phase 6 |
| TD-033 | Todos los 7 `workflow-*/SKILL.md` tienen "TD-033 now.md: git add .claude/context/now.md antes de commits y gates" |

### Criterios de aceptación

```
Given technical-debt.md tiene entradas con Estado: "[ ] Pendiente" para TD-006, TD-007, TD-008, TD-029, TD-031, TD-032, TD-033
When se ejecuta SPEC-001
Then cada entrada tiene Estado: "[x] Resuelto YYYY-MM-DD (FASE 32, auditado)"
AND el campo estado refleja la fecha real de auditoría
```

**Formato de cambio en cada TD:**
```
Estado: "[ ] Pendiente"
→
Estado: "[x] Resuelto 2026-04-11 (FASE 32, auditado — implementado en FASEs anteriores)"
```

---

## SPEC-002: TD-039 — Añadir anotación async_suitable a 2 agentes

**Prioridad:** Medium
**Archivos:** `.claude/agents/deep-review.md`, `.claude/agents/task-planner.md`

### Descripción

Añadir campo `async_suitable: true` al frontmatter de los agentes candidatos para invocación background. Este campo no es reconocido por Claude Code (se ignora a nivel de plataforma) pero sirve como documentación para desarrolladores del framework.

**Agentes candidatos:**
- `deep-review.md`: solo lectura/análisis, sin efectos secundarios → ideal para background
- `task-planner.md`: genera artefactos de planificación, puede ejecutar sin supervisión continua

### Criterios de aceptación

```
Given deep-review.md tiene frontmatter con name, description, tools
When se aplica SPEC-002
Then deep-review.md frontmatter incluye:
  async_suitable: true  # Read-only analysis — safe for run_in_background=true invocation

Given task-planner.md tiene frontmatter
When se aplica SPEC-002
Then task-planner.md frontmatter incluye:
  async_suitable: true  # Planning-only — writes WP artefacts, safe for background

Given technical-debt.md tiene TD-039 como "[ ] Parcialmente implementado"
When se aplica SPEC-002
Then TD-039 se marca "[x] Resuelto 2026-04-11 (FASE 32)"
```

---

## SPEC-003: TD-038 — Eliminar reglas Edit redundantes de settings.json

**Prioridad:** High
**Archivos:** `.claude/settings.json`, `.claude/references/tool-execution-model.md`

### Descripción

`settings.json` tiene `"defaultMode": "acceptEdits"` que auto-aprueba **todos** los Edit. Las 3 reglas `Edit(...)` en `allow` son redundantes — ya cubiertas por defaultMode.

**Reglas a eliminar de `allow`:**
```json
"Edit(/.claude/context/now.md)",    ← línea 5
"Edit(/.claude/context/focus.md)",  ← línea 7
"Edit(/.claude/context/work/**)",   ← línea 9
```

**Reglas `Write(...)` que PERMANECEN** (acceptEdits NO cubre Write):
```json
"Write(/.claude/context/now.md)",
"Write(/.claude/context/focus.md)",
"Write(/.claude/context/work/**)",
```

**Cambio en tool-execution-model.md** (líneas 64-82 — sección "Estructura de settings.json"):
El ejemplo canónico muestra `Edit(/.claude/context/now.md)` → actualizar para no mostrar reglas Edit redundantes.

### Criterios de aceptación

```
Given settings.json tiene 3 reglas Edit(...) en allow
When se aplica SPEC-003
Then settings.json.allow NO contiene ninguna regla "Edit(...)"
AND settings.json.allow contiene Write(/.claude/context/now.md)
AND settings.json.allow contiene Write(/.claude/context/focus.md)
AND settings.json.allow contiene Write(/.claude/context/work/**)

Given tool-execution-model.md tiene ejemplo con Edit(/.claude/context/now.md) en settings.json
When se aplica SPEC-003
Then el ejemplo en tool-execution-model.md NO muestra reglas Edit redundantes
AND el ejemplo muestra solo Write(/.claude/context/work/**) u otra Write como ejemplo de path

Given bash .claude/scripts/session-start.sh es ejecutable
When se aplica SPEC-003
Then session-start.sh ejecuta sin errores (smoke test)
```

---

## SPEC-004: TD-040A — Añadir sección ## Gate humano a workflow-plan/SKILL.md

**Prioridad:** High
**Archivo:** `.claude/skills/workflow-plan/SKILL.md`

### Descripción

`workflow-plan/SKILL.md` es el único de los 7 `workflow-*/SKILL.md` sin sección `## Gate humano`. Solo tiene `## Validaciones pre-gate` y `## Exit criteria` — el gate está implícito pero sin instrucción de ⏸ STOP ni de actualización de artefacto.

**Scope de TD-040 (justificación de exclusiones):** TD-040 afecta solo 3 de los 7 workflow-* skills. Los 4 restantes son aceptables sin cambio:
- `workflow-analyze`: gate 1→2 no tiene artefacto principal aprobable explícito (`*-analysis.md` no tiene campo `status`). Aceptable per TD-040.
- `workflow-decompose`: gate 5→6 usa `exit-conditions.md` como artefacto de gate, no `task-plan.md`. Aceptable per TD-040.
- `workflow-execute`: no tiene gate humano de transición de fase (tiene gates internos de GATE OPERACIÓN, no de artefacto).
- `workflow-track`: Phase 7 no tiene gate de transición hacia otra fase; es el cierre.

Solo `workflow-plan` (falta gate completo), `workflow-strategy` (falta artefact update), y `workflow-structure` (falta artefact update) requieren cambio.

**Ubicación:** Entre `## Validaciones pre-gate` y `## Exit criteria`.

**Contenido exacto a insertar:**

```markdown
## Gate humano

⏸ STOP — Presentar scope statement (problema, in-scope, out-of-scope, criterios de éxito) al usuario.
Esperar confirmación explícita. NO continuar sin respuesta.
Al aprobar:
1. Actualizar `context/now.md::phase` a `Phase 4`
2. Actualizar `{nombre-wp}-plan.md::status` a `Aprobado — {fecha}`
3. Marcar `[x] Scope aprobado por usuario — {fecha}` en `{nombre-wp}-plan.md`
```

### Criterios de aceptación

```
Given workflow-plan/SKILL.md no tiene sección ## Gate humano
When se aplica SPEC-004
Then workflow-plan/SKILL.md contiene sección ## Gate humano con ⏸ STOP
AND la sección incluye actualización de now.md::phase a Phase 4
AND la sección incluye actualización de plan.md::status
AND la sección está ubicada DESPUÉS de ## Validaciones pre-gate y ANTES de ## Exit criteria
```

---

## SPEC-005: TD-040B — Añadir artefact update al gate de workflow-strategy/SKILL.md

**Prioridad:** Medium
**Archivo:** `.claude/skills/workflow-strategy/SKILL.md`

### Descripción

El gate de `workflow-strategy/SKILL.md` (línea 72) solo dice:
```
Al aprobar: actualizar `context/now.md::phase` a `Phase 3`.
```

Falta actualizar `solution-strategy.md::status` al momento de la aprobación.

**Cambio exacto:**
```markdown
# Antes:
Al aprobar: actualizar `context/now.md::phase` a `Phase 3`.

# Después:
Al aprobar:
1. Actualizar `context/now.md::phase` a `Phase 3`
2. Actualizar `{nombre-wp}-solution-strategy.md::status` a `Aprobado — {fecha}`
```

### Criterios de aceptación

```
Given workflow-strategy/SKILL.md gate dice solo "Al aprobar: actualizar now.md::phase a Phase 3"
When se aplica SPEC-005
Then la sección Gate humano incluye paso para actualizar solution-strategy.md::status
AND el formato es "Aprobado — {fecha}" (fecha ISO)
```

---

## SPEC-006: TD-040C — workflow-structure gate + template

**Prioridad:** Medium
**Archivos:** `.claude/skills/workflow-structure/SKILL.md`, `.claude/skills/workflow-structure/assets/requirements-specification.md.template`

### Descripción

**SPEC-006A — workflow-structure/SKILL.md gate** (línea 69) solo dice:
```
Al aprobar: actualizar `context/now.md::phase` a `Phase 5`.
```

Falta actualizar `requirements-spec.md::status`.

**Cambio:**
```markdown
# Antes:
Al aprobar: actualizar `context/now.md::phase` a `Phase 5`.

# Después:
Al aprobar:
1. Actualizar `context/now.md::phase` a `Phase 5`
2. Actualizar `{nombre-wp}-requirements-spec.md::status` a `Aprobado — {fecha}`
```

**SPEC-006B — requirements-specification.md.template**: No tiene campo `status` en frontmatter.

Añadir campo `status` al frontmatter:
```yml
status: [Pendiente aprobación | Aprobado — YYYY-MM-DD]
```
Ubicación: después del campo `updated_at` existente.

### Criterios de aceptación

```
Given workflow-structure/SKILL.md gate no incluye artefact update
When se aplica SPEC-006A
Then el gate incluye paso para actualizar requirements-spec.md::status

Given requirements-specification.md.template no tiene campo status
When se aplica SPEC-006B
Then el frontmatter del template incluye:
  status: [Pendiente aprobación | Aprobado — YYYY-MM-DD]
```

---

## SPEC-007: REGLA-LONGEV-001 — Crear resolved file y limpiar technical-debt.md

**Prioridad:** High
**Archivos:** `context/work/2026-04-11-23-27-08-technical-debt-audit/technical-debt-audit-technical-debt-resolved.md`, `.claude/context/technical-debt.md`

### Descripción

**SPEC-007A — Crear FASE 32 resolved file** con todos los TDs cerrados en esta FASE:
- Grupo A: TD-006, TD-007, TD-008, TD-029, TD-031, TD-032, TD-033 (auditados)
- Grupo B (al cierre de Phase 6): TD-038, TD-039, TD-040

**SPEC-007B — Eliminar entradas [x] de technical-debt.md**:

| Entradas a eliminar | Ya en resolved de... |
|--------------------|---------------------|
| TD-002, TD-004, TD-011, TD-016, TD-017, TD-021, TD-019, TD-020, TD-023, TD-024 | FASE 29 WP |
| TD-036, TD-037 | FASE 31 WP |
| TD-006, TD-007, TD-008, TD-029, TD-031, TD-032, TD-033, TD-038, TD-039, TD-040 | FASE 32 WP (este) |

### Criterios de aceptación

```
Given technical-debt.md tiene 70,360 bytes con entradas [x]
When se aplica SPEC-007
Then technical-debt-audit-technical-debt-resolved.md existe con todos los TDs de FASE 32
AND technical-debt.md < 25,000 bytes
AND technical-debt.md solo contiene entradas "[ ] Pendiente" (TDs activos)
AND wc -c .claude/context/technical-debt.md < 25000
```

---

## Inventario verificado de archivos afectados

| Archivo | SPEC | Existe? |
|---------|------|---------|
| `.claude/context/technical-debt.md` | SPEC-001, SPEC-007B | ✓ |
| `.claude/agents/deep-review.md` | SPEC-002 | ✓ |
| `.claude/agents/task-planner.md` | SPEC-002 | ✓ |
| `.claude/settings.json` | SPEC-003 | ✓ |
| `.claude/references/tool-execution-model.md` | SPEC-003 | ✓ |
| `.claude/skills/workflow-plan/SKILL.md` | SPEC-004 | ✓ |
| `.claude/skills/workflow-strategy/SKILL.md` | SPEC-005 | ✓ |
| `.claude/skills/workflow-structure/SKILL.md` | SPEC-006A | ✓ |
| `.claude/skills/workflow-structure/assets/requirements-specification.md.template` | SPEC-006B | ✓ |
| WP resolved file (crear) | SPEC-007A | Crear |
