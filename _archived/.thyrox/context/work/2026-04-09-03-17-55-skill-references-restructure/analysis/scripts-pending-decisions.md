```yml
type: Analysis Sub-document
work_package: 2026-04-09-03-17-55-skill-references-restructure
created_at: 2026-04-09 04:00:00
updated_at: 2026-04-09 04:00:00
purpose: Resolver 2 decisiones pendientes sobre scripts usando patrones de proyectos reales Claude Code
```

# Decisiones Pendientes: Scripts — Análisis con Patrones Reales

---

## Contexto: las 2 decisiones a resolver

1. **¿Crear `.claude/scripts/` como nivel global?**
   Afecta: `session-start.sh`, `session-resume.sh`, `stop-hook-git-check.sh`, `lint-agents.py`

2. **¿`update-state.sh` → `workflow-track/scripts/` o `.claude/scripts/`?**

---

## Patrones observados en proyectos reales

Los tres proyectos proporcionados como referencia usan `/scripts/` a nivel de raíz del
repositorio, **no `.claude/scripts/`**. Ninguno define `.claude/scripts/` como directorio.

| Proyecto | `/scripts/` contiene | `.claude/` contiene |
|----------|---------------------|---------------------|
| `claude-cookbooks` | Validación de notebooks (`validate_notebooks.py`, `test_notebooks.py`, `detect-secrets`) | Commands y skills |
| `claude-code` | Automatización de GitHub (`auto-close-duplicates.ts`, `issue-lifecycle.ts`, `gh.sh`) | Commands y skills |
| `claude-code-action` | Git hooks + infraestructura (`install-hooks.sh`, `pre-commit`, `git-push.sh`, `gh.sh`) | Commands y skills |

**Patrón consistente**: los scripts de infraestructura del proyecto viven en la raíz `/scripts/`.
Los skills en `.claude/` siguen la anatomía oficial: `skills/{nombre}/scripts/` — nunca `.claude/scripts/`.

---

## Analogía: hooks de git vs hooks de Claude Code

`claude-code-action` pone `install-hooks.sh` y `pre-commit` en `/scripts/` porque son
infraestructura del repositorio. La analogía con THYROX:

| Tipo | Equivalente en `claude-code-action` | Equivalente en THYROX |
|------|------------------------------------|-----------------------|
| Configuración de hooks | `.git/hooks/` (o configurado por `install-hooks.sh`) | `.claude/settings.json` |
| Scripts que ejecutan los hooks | `/scripts/pre-commit`, `/scripts/git-push.sh` | `session-start.sh`, `stop-hook-git-check.sh`, `session-resume.sh` |

Siguiendo la analogía: los scripts que ejecutan los Claude Code hooks deberían vivir en
la raíz del proyecto, no dentro de una skill.

---

## Estado actual de THYROX

```
THYROX/
├── (NO existe /scripts/ en la raíz)
├── .claude/
│   ├── settings.json          ← apunta a pm-thyrox/scripts/
│   └── skills/pm-thyrox/
│       └── scripts/           ← hooks aquí hoy
```

THYROX no tiene `/scripts/` en la raíz ni `.claude/scripts/`. Ambos serían nuevos.

---

## Decisión 1: ¿Crear `.claude/scripts/`?

### Opción D1-A: NO crear `.claude/scripts/` — hooks quedan en `pm-thyrox/scripts/`

**Razón**: `.claude/scripts/` no es un concepto en los docs oficiales ni en proyectos reales.
Los scripts dentro de `.claude/` siempre van dentro de una skill. Si la convención oficial
no lo define, no lo inventamos.

**Resultado**: hooks (`session-start.sh`, `session-resume.sh`, `stop-hook-git-check.sh`)
quedan en `pm-thyrox/scripts/`. `settings.json` no cambia. Riesgo cero.

**Desventaja**: los hooks del proyecto siguen en una skill, que conceptualmente no es su dueño.

---

### Opción D1-B: Crear `/scripts/` en la raíz del repositorio

**Razón**: sigue exactamente el patrón de `claude-code-action` — los hooks y scripts de
infraestructura van en la raíz `/scripts/`, no dentro de `.claude/`.

| Script | Path propuesto | `settings.json` nuevo path |
|--------|---------------|---------------------------|
| `session-start.sh` | `scripts/session-start.sh` | `bash scripts/session-start.sh` |
| `session-resume.sh` | `scripts/session-resume.sh` | `bash scripts/session-resume.sh` |
| `stop-hook-git-check.sh` | `scripts/stop-hook-git-check.sh` | `bash scripts/stop-hook-git-check.sh` |
| `commit-msg-hook.sh` | `scripts/commit-msg-hook.sh` | (git hook config) |

**Ventaja**: 100% alineado con los patrones observados. Los scripts de infraestructura del
proyecto salen de la skill y viven donde corresponde.

**Desventaja**: requiere crear un nuevo directorio y actualizar `settings.json`. Los scripts
referenciados en docs (`session-start.sh` aparece en `state-management.md` y `skill-vs-agent.md`)
también necesitan actualización de paths.

---

### Opción D1-C: Crear `.claude/scripts/` (no recomendado)

No tiene precedente en los proyectos de referencia ni en la documentación oficial.
Crea un directorio que no es parte de la anatomía oficial de Claude Code.

**Esta opción no se recomienda.**

---

### Recomendación D1

**D1-B: Crear `/scripts/` en la raíz.** Sigue el patrón de `claude-code-action`.
Los hooks de Claude Code son infraestructura del repositorio, no de la skill pm-thyrox.

Archivos que se mueven a `/scripts/`:
- `session-start.sh`, `session-resume.sh`, `stop-hook-git-check.sh` (hooks de sesión)
- `commit-msg-hook.sh` (git hook)

Archivos que se podrían mover a `/scripts/` (validación general del proyecto):
- `detect_broken_references.py`, `validate-broken-references.py`, `convert-broken-references.py`
- `validate-missing-md-links.sh`, `detect-missing-md-links.sh`, `convert-missing-md-links.sh`

Estos scripts de validación son similares a los `validate_notebooks.py` de `claude-cookbooks`
— herramientas de salud del proyecto, no de una skill específica.

Archivos que quedan en sus skills:
- Scripts de fase específica → `workflow-track/scripts/`
- Scripts del framework pm-thyrox → `pm-thyrox/scripts/`

---

## Decisión 2: ¿Dónde va `update-state.sh`?

`update-state.sh` regenera `context/project-state.md` con el estado actual del framework.

**Referencias externas:**
- `workflow-track/SKILL.md` línea 67 (Phase 7)
- `state-management.md` líneas 28-30, 69, 78-81 (cross-phase: "nuevo agente", "nueva versión")

**Análisis de uso cross-phase:**

```bash
# Cuándo se invoca update-state.sh (state-management.md):
# Phase 7: WP cerrado          → ejecutar update-state.sh
# Nuevo agente añadido         → ejecutar update-state.sh
# Nueva versión en CHANGELOG   → ejecutar update-state.sh
```

El script se invoca en Phase 7 Y fuera de cualquier fase. No es exclusivo de workflow-track.

**Comparación con claude-cookbooks**: los scripts de validación en `/scripts/` de cookbooks
se pueden ejecutar en cualquier momento, no solo durante una fase específica. `update-state.sh`
tiene el mismo perfil — es una herramienta de mantenimiento del proyecto.

**Opción D2-A**: `workflow-track/scripts/` — sigue al skill que más lo referencia.
Actualizar: `workflow-track/SKILL.md` ×1 + `state-management.md` ×3.

**Opción D2-B**: `/scripts/` (raíz) — sigue el patrón de `claude-cookbooks` para scripts
de mantenimiento. Actualizar: los mismos docs + el nuevo path en settings o docs.

**Opción D2-C**: queda en `pm-thyrox/scripts/` — sin cambios. Válido si los hooks
también se quedan ahí (D1-A).

### Recomendación D2

Depende de D1:
- Si D1-A (hooks quedan en pm-thyrox) → **D2-C**: `update-state.sh` queda en pm-thyrox/scripts/
- Si D1-B (hooks a `/scripts/`) → **D2-B**: `update-state.sh` también va a `/scripts/`
  (es mantenimiento del proyecto, mismo perfil que los scripts de claude-cookbooks)

---

## Resumen de recomendaciones

| Decisión | Opción recomendada | Cambios requeridos |
|----------|-------------------|-------------------|
| D1: ¿Nivel para hooks? | **D1-B: `/scripts/` raíz** | Crear dir; mover 4 scripts; actualizar `settings.json`; actualizar paths en docs |
| D2: `update-state.sh` | **D2-B: `/scripts/` raíz** (si D1-B) | Actualizar `workflow-track/SKILL.md` ×1; `state-management.md` ×3 |

**Alternativa conservadora completa**: D1-A + D2-C — todo queda en pm-thyrox/scripts/,
sin riesgo, sin cambios en settings.json. Costo: hooks siguen en una skill que no los debería tener.

---

## Impacto en pm-thyrox/scripts/ según decisión tomada

| Escenario | Contenido final de pm-thyrox/scripts/ |
|-----------|--------------------------------------|
| D1-A + D2-C (conservador) | hooks ×4, evals ×2, lint-agents.py, legacy ×2, tests/ |
| D1-B + D2-B (recomendado) | evals ×2, lint-agents.py, legacy ×2, tests/ |

**En ambos escenarios pm-thyrox/scripts/ existe y tiene contenido.**

---

## lint-agents.py — decisión derivada

`agent-spec.md` (que migra a `.claude/references/`) referencia `lint-agents.py` con path completo.

- Si D1-B: podría ir a `/scripts/lint-agents.py` (infraestructura del proyecto)
- Si D1-A: queda en `pm-thyrox/scripts/` y se actualiza el path en `agent-spec.md`

En ambos casos, `agent-spec.md` necesita actualización del path referenciado.
