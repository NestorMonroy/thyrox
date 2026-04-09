```yml
type: Especificación Técnica
created_at: 2026-04-09 06:45:00
wp: 2026-04-09-03-17-55-skill-references-restructure
phase: 4 - STRUCTURE
status: En revisión
```

# Requirements Spec — FASE 24: skill-references-restructure

## Resumen Ejecutivo

Redistribuir 24 referencias y 20 scripts desde el directorio centralizado `pm-thyrox/references/`
y `pm-thyrox/scripts/` hacia sus niveles arquitectónicos correctos. El objetivo es que cada
`workflow-*` skill sea autocontenido y que la infraestructura de Claude Code viva en `.claude/`.

**Objetivo:** Estado final verificable donde `detect_broken_references.py` pasa sin errores,
`settings.json` apunta a `.claude/scripts/`, y el diagrama de estructura en CLAUDE.md refleja
la realidad completa del proyecto.

---

## Mapeo Análisis → Especificación

| Hallazgo Phase 1 | ID Spec | Implementación técnica |
|-----------------|---------|----------------------|
| 15 refs con owner de fase en pm-thyrox/ | SPEC-001 | git mv → workflow-*/references/ |
| 9 refs globales de plataforma en pm-thyrox/ | SPEC-002 | git mv → .claude/references/ (nuevo dir) |
| 2 scripts de workflow-track mezclados | SPEC-003 | git mv → workflow-track/scripts/ (nuevo dir) |
| 13 scripts de infraestructura en pm-thyrox/ | SPEC-004 | git mv → .claude/scripts/ (nuevo dir) + settings.json |
| CLAUDE.md omite 4 dirs + 2 nuevos sin documentar | SPEC-005 | Actualizar ## Estructura + ADR-017 |

---

## SPEC-001: Redistribución de referencias de fase a workflow-*/references/

**ID:** SPEC-001
**Origen:** references-classification.md tabla 15/24 (filas workflow-*)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Mover los 15 archivos de `pm-thyrox/references/` que pertenecen a skills de fase específica
hacia los directorios `references/` de sus skills owner. Los skills no tenían estos directorios
— se crean como parte de esta spec.

### Criterios de Aceptación

```
Given que existen 15 archivos en pm-thyrox/references/ con owner declarado en workflow-*
When se ejecuta el Batch A (git mv + link updates en mismo commit)
Then cada archivo existe en .claude/skills/workflow-{phase}/references/{file}.md
  Y pm-thyrox/references/ no contiene ninguno de esos 15 archivos
  Y todos los links en pm-thyrox/SKILL.md y workflow-*/SKILL.md apuntan a los nuevos paths
  Y detect_broken_references.py pasa sin errores post-batch

Given que workflow-analyze/SKILL.md tiene links a scalability.md, introduction.md, etc.
When los archivos existen en workflow-analyze/references/
Then los links usan path relativo: [scalability](references/scalability.md)
  Y NO apuntan a pm-thyrox/references/

Given que pm-thyrox/SKILL.md tiene links a referencias de fase en otros skills
When los archivos están en workflow-analyze/references/
Then los links desde pm-thyrox/SKILL.md usan: [scalability](../workflow-analyze/references/scalability.md)
```

### Componentes Afectados

**Directorios nuevos:**
- `.claude/skills/workflow-analyze/references/` (9 archivos)
- `.claude/skills/workflow-execute/references/` (2 archivos)
- `.claude/skills/workflow-strategy/references/` (1 archivo)
- `.claude/skills/workflow-structure/references/` (1 archivo)
- `.claude/skills/workflow-track/references/` (2 archivos)

**Archivos modificados (links):** `pm-thyrox/SKILL.md`, `workflow-analyze/SKILL.md` línea 30, `workflow-strategy/SKILL.md` línea 34

**Esfuerzo:** 2 commits (A-01 + A-02 en ROADMAP)
**Complejidad:** Media (git mv con historial, 15 operaciones + link updates)

---

## SPEC-002: Creación de .claude/references/ con 9 referencias globales

**ID:** SPEC-002
**Origen:** references-classification.md tabla 9/24 (filas global)
**Prioridad:** High
**Estado:** Pendiente

### Descripción

Crear `.claude/references/` como nuevo directorio de primer nivel en el proyecto. Mover los
9 archivos de documentación de plataforma Claude Code que no pertenecen a ningún skill específico.
Eliminar `pm-thyrox/references/` una vez verificado vacío.

### Criterios de Aceptación

```
Given que existen 9 archivos en pm-thyrox/references/ clasificados como globales de plataforma
When se ejecuta el Batch B (git mv + link updates en mismo commit)
Then .claude/references/ existe con los 9 archivos
  Y pm-thyrox/SKILL.md apunta a los nuevos paths: ../../references/{file}.md
  Y detect_broken_references.py pasa sin errores post-batch

Given que Batch A y Batch B completaron (24/24 archivos en sus destinos)
When se ejecuta git rm -r .claude/skills/pm-thyrox/references/
Then pm-thyrox/references/ ya no existe en el repositorio
  Y ningún archivo en el repo apunta a pm-thyrox/references/ (verificado con grep)

Given que skill-vs-agent.md, agent-spec.md, conventions.md, etc. están en .claude/references/
When Claude lee un skill y necesita consultar una referencia global
Then puede acceder a .claude/references/{file}.md sin depender de pm-thyrox

Given que CLAUDE.md línea 105 tiene [conventions](skills/pm-thyrox/references/conventions.md)
  Y workflow-track/SKILL.md línea 69 tiene `references/state-management.md`
When se ejecuta Batch B
Then CLAUDE.md apunta a references/conventions.md (relativo a .claude/)
  Y workflow-track/SKILL.md apunta a ../../references/state-management.md
  Y ambos links son válidos inmediatamente después del commit
```

### Componentes Afectados

**Directorio nuevo:** `.claude/references/` (9 archivos)
**Directorio eliminado:** `.claude/skills/pm-thyrox/references/` (post-verificación)
**Archivos modificados (links):**
- `pm-thyrox/SKILL.md` — References por dominio (9 paths)
- `CLAUDE.md` línea 105 — `[conventions](skills/pm-thyrox/references/conventions.md)` → `[conventions](references/conventions.md)` ← gap encontrado en validación Phase 3→4
- `workflow-track/SKILL.md` línea 69 — `` `references/state-management.md` `` → `` `../../references/state-management.md` `` ← state-management.md es global, NO va a workflow-track/references/

**Esfuerzo:** 2 commits (B-01 + B-02 en ROADMAP)
**Complejidad:** Media

---

## SPEC-003: Redistribución de scripts de workflow-track + split de tests/

**ID:** SPEC-003
**Origen:** scripts-pending-decisions-v2.md filas 14-15 + fila 20 (tests/)
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Mover los 2 scripts exclusivos de Phase 7 a `workflow-track/scripts/`. Mover `test-phase-readiness.sh`
al nuevo directorio de tests del skill. Actualizar `run-all-tests.sh` en pm-thyrox/scripts/tests/
para que llame al test en su nueva ubicación.

### Criterios de Aceptación

```
Given que validate-phase-readiness.sh y validate-session-close.sh están en pm-thyrox/scripts/
When se ejecuta el Batch C (git mv + link updates en mismo commit)
Then ambos scripts existen en .claude/skills/workflow-track/scripts/
  Y workflow-track/SKILL.md (líneas 22, 25, 57, 58) apunta a .claude/skills/workflow-track/scripts/
  Y state-management.md (línea 17) apunta al nuevo path de validate-session-close.sh
  Y detect_broken_references.py pasa sin errores post-batch

Given que test-phase-readiness.sh está en pm-thyrox/scripts/tests/
When se mueve a workflow-track/scripts/tests/ en el mismo commit de Batch C
Then test-phase-readiness.sh existe en .claude/skills/workflow-track/scripts/tests/
  Y run-all-tests.sh (en pm-thyrox/scripts/tests/) llama al test con path actualizado
  Y bash .claude/skills/pm-thyrox/scripts/tests/run-all-tests.sh pasa sin errores de path
```

### Componentes Afectados

**Directorios nuevos:** `workflow-track/scripts/`, `workflow-track/scripts/tests/`
**Archivos movidos:** validate-phase-readiness.sh, validate-session-close.sh, test-phase-readiness.sh
**Archivos modificados:** `workflow-track/SKILL.md` ×4, `state-management.md` ×1, `run-all-tests.sh` ×1

**Esfuerzo:** 2 commits (C-01 + C-02 en ROADMAP)
**Complejidad:** Media (atomicidad crítica: state-management.md actualiza en mismo commit)

---

## SPEC-004: Migración de scripts de infraestructura a .claude/scripts/

**ID:** SPEC-004
**Origen:** scripts-pending-decisions-v2.md filas 1-13 + decisión D1-B
**Prioridad:** High (impacta hooks activos)
**Estado:** Pendiente

### Descripción

Crear `.claude/scripts/` y mover los 13 scripts de infraestructura Claude Code. Actualizar
`settings.json` en el mismo commit para que los hooks no tengan tiempo de downtime.

### Criterios de Aceptación

```
Given que session-start.sh, session-resume.sh, stop-hook-git-check.sh están en pm-thyrox/scripts/
  Y settings.json apunta a .claude/skills/pm-thyrox/scripts/{script}.sh
When se ejecuta el Batch D (git mv + settings.json + links en mismo commit)
Then los 3 scripts de hooks existen en .claude/scripts/
  Y settings.json apunta a .claude/scripts/{script}.sh
  Y NO hay ningún momento donde settings.json apunte a un path inexistente
  Y detect_broken_references.py pasa sin errores post-batch

Given que commit-msg-hook.sh se instala manualmente en .git/hooks/
When commit-msg-hook.sh se mueve a .claude/scripts/
Then se ejecuta: cp .claude/scripts/commit-msg-hook.sh .git/hooks/commit-msg
  Y git commit verifica el mensaje con el hook en su nueva ubicación

Given que lint-agents.py está en pm-thyrox/scripts/ y agent-spec.md lo referencia
When lint-agents.py se mueve a .claude/scripts/
Then agent-spec.md (en .claude/references/ por SPEC-002) tiene path actualizado ×3

Given que los 6 scripts de validación se mueven a .claude/scripts/
When reference-validation.md referencia esos scripts
Then reference-validation.md (en workflow-track/references/ por SPEC-001) tiene paths actualizados ×5
  Y state-management.md (en .claude/references/) tiene paths de update-state.sh actualizados ×3
```

### Componentes Afectados

**Directorio nuevo:** `.claude/scripts/` (13 scripts)
**Archivos modificados:** `settings.json` ×3, `workflow-track/SKILL.md` ×2, `agent-spec.md` ×3, `reference-validation.md` ×5, `state-management.md` ×3

**Esfuerzo:** 2 commits + 1 acción manual (D-01 + D-02 + D-03)
**Complejidad:** Alta (hooks en producción, acción manual post-commit)

---

## SPEC-005: Actualización de CLAUDE.md + ADR-017

**ID:** SPEC-005
**Origen:** phase1-review-supplement.md + commands-vs-skills-analysis.md
**Prioridad:** Medium
**Estado:** Pendiente

### Descripción

Actualizar el diagrama `## Estructura` en CLAUDE.md para reflejar los 9 directorios reales
de `.claude/`. Crear ADR-017 documentando los 3 niveles de artefactos. Cerrar TD-020
documentando `.claude/commands/`.

### Criterios de Aceptación

```
Given que CLAUDE.md ## Estructura muestra solo 3 dirs (.claude/) pero existen 9 realmente
When se ejecuta el commit final
Then CLAUDE.md muestra los 9 dirs: agents/, commands/, context/, guidelines/, memory/,
  references/, registry/, scripts/, skills/
  Y cada directorio tiene descripción correcta en el diagrama
  Y .claude/commands/ incluye nota "sin frontmatter, sin disparo automático"

Given que se crean .claude/references/ y .claude/scripts/ en FASE 24
When se crea ADR-017
Then el ADR documenta: por qué .claude/references/, por qué .claude/scripts/,
  por qué .claude/guidelines/ es diferente (siempre-cargado vs on-demand),
  por qué pm-thyrox/references/ se elimina y pm-thyrox/scripts/ se conserva,
  evidencia de 6 proyectos que confirman .claude/scripts/ como patrón establecido
```

### Componentes Afectados

**Archivos modificados:** `CLAUDE.md`, `pm-thyrox/SKILL.md` (si referencia references/)
**Archivos nuevos:** `ADR-017`

**Esfuerzo:** 2 commits (F-01 + F-02 en ROADMAP)
**Complejidad:** Baja

---

## Dependencias Entre Specs

```
SPEC-001 (Batch A) → SPEC-002 depende (Batch B puede ver las refs de fase ya movidas)
SPEC-002 (Batch B) → SPEC-003 depende (state-management.md en .claude/references/ para actualizar)
SPEC-003 (Batch C) → SPEC-004 depende (validate-session-close path ya actualizado)
SPEC-004 (Batch D) → SPEC-005 depende (estructura final estabilizada para documentar)
```

---

## Estructura de Archivos Final

```
.claude/
├── references/              ← NUEVO (SPEC-002)
│   ├── agent-spec.md
│   ├── claude-code-components.md
│   ├── conventions.md
│   ├── examples.md
│   ├── long-context-tips.md
│   ├── prompting-tips.md
│   ├── skill-authoring.md
│   ├── skill-vs-agent.md
│   └── state-management.md
├── scripts/                 ← NUEVO (SPEC-004)
│   ├── session-start.sh
│   ├── session-resume.sh
│   ├── stop-hook-git-check.sh
│   ├── commit-msg-hook.sh
│   ├── lint-agents.py
│   ├── update-state.sh
│   ├── project-status.sh
│   ├── detect_broken_references.py
│   ├── validate-broken-references.py
│   ├── convert-broken-references.py
│   ├── validate-missing-md-links.sh
│   ├── detect-missing-md-links.sh
│   └── convert-missing-md-links.sh
└── skills/
    ├── pm-thyrox/
    │   ├── references/      ← ELIMINADO (SPEC-002)
    │   └── scripts/         ← CONSERVADO (4 scripts + tests)
    ├── workflow-analyze/
    │   └── references/      ← NUEVO (SPEC-001, 9 archivos)
    ├── workflow-execute/
    │   └── references/      ← NUEVO (SPEC-001, 2 archivos)
    ├── workflow-strategy/
    │   └── references/      ← NUEVO (SPEC-001, 1 archivo)
    ├── workflow-structure/
    │   └── references/      ← NUEVO (SPEC-001, 1 archivo)
    └── workflow-track/
        ├── references/      ← NUEVO (SPEC-001, 2 archivos)
        └── scripts/         ← NUEVO (SPEC-003, 2 scripts + tests/)
```

---

## Plan de Rollback

Si algún batch falla después de commit:
1. `git revert HEAD` — el commit de batch se revierte (links + git mv se deshacen juntos)
2. Verificar: `detect_broken_references.py` debe pasar tras el revert
3. El estado anterior es recuperable porque los commits son atómicos

Si settings.json se actualiza pero los scripts no se movieron:
- No puede ocurrir — Batch D mueve scripts y actualiza settings.json en el mismo commit

---

## Estado de aprobación

- [ ] Spec aprobada — PENDIENTE gate humano Phase 4
