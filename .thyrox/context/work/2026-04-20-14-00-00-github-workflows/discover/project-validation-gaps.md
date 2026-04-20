```yml
created_at: 2026-04-20 20:30:00
project: THYROX
work_package: 2026-04-20-14-00-00-github-workflows
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# Project Validation Gaps — Estado Actual

## Current CI/CD State

**Archivo actual:** `.github/workflows/validate.yml`

**Lo que valida:**
- Cambios en `.claude/skills/pm-thyrox/**` y `.claude/CLAUDE.md`
- Verificación de skill mapping
- SKILL.md tamaño <= 500 líneas
- YAML frontmatter en SKILL.md
- Conventional commits en PRs

**Limitaciones:**
- Trigger: Solo en push/PR a paths específicos (`.claude/skills/pm-thyrox/**`)
- Scope: SOLO validación de SKILL.md, NO valida artefactos WP

---

## Problemas Identificados (P-1, P-2, ...)

### P-1: Work Packages NOT Validated

**Estado:** Sin validación de CI/CD

WPs viven en `.thyrox/context/work/YYYY-MM-DD-HH-MM-SS-name/` pero:
- ❌ No se valida estructura de directorios de fase (discover/, analyze/, plan/, etc.)
- ❌ No se valida metadata standards (created_at, project, author, status)
- ❌ No se valida que YAML frontmatter sea válido en archivos `.md`
- ❌ No se valida naming conventions (contenido-tipo.md)
- ❌ No se valida que claims sean clasificados (PROVEN/INFERRED/SPECULATIVE)

**Precedente:** WP-ERR-001 pasó a merge (`.claude/context/` en lugar de `.thyrox/context/`) sin detección.

---

### P-2: Evidence Classification NOT Enforced

**Estado:** Sin validación

Los archivos en `.thyrox/context/work/*/discover/` y `analyze/` deben tener claims clasificados según:
- PROVEN: observable de tool_use ejecutado
- INFERRED: derivado con razonamiento documentado
- SPECULATIVE: sin observable (hipótesis)

**Actualmente:** No hay validación automática de esta clasificación.
- ❌ No se detectan claims SPECULATIVE que bloquean gates
- ❌ No se verifica ratio OBSERVABLE+INFERRED >= 75% en artefactos críticos

---

### P-3: Metadata Standards NOT Validated

**Estado:** Sin validación

Los archivos WP usan metadata en `\`\`\`yml` blocks según `.claude/rules/metadata-standards.md`:
- created_at (requerido)
- updated_at (solo en docs vivos)
- project, author, status (requerido)
- phase (en stage directories)

**Actualmente:** No hay validación de que estos campos estén presentes y sean válidos.

---

### P-4: Naming Conventions NOT Enforced

**Estado:** Sin validación

Según `.claude/rules/metadata-standards.md`:
- Patrón: `{contenido-descriptivo}.md` o `{contenido}-{subtipo}.md`
- Subtipo va al FINAL: `{contenido}-{subtipo}.md`
- PROHIBIDO: nombres como `deep-review-{contenido}.md` (tipo al principio)
- PROHIBIDO: sufijos temporales: `-final`, `-v2`, `-old`

**Actualmente:** No hay validación de convenciones de nombre.

---

### P-5: Artifact Paradox — No Validation Mechanism

**Estado:** Documentado pero no implementado

Del análisis en `methodology-calibration-directed-analysis.md`:
- "Users who produce AI artifacts are LESS likely to question reasoning" (Anthropic)
- WP-ERR-001 fue detectado DESPUÉS de merge sin mecanismo automático
- Propuesta: Stop hooks + Git hooks + GitHub Actions en paralelo

**Actualmente:** 
- ❌ No hay PreToolUse hooks en `.claude/scripts/` para validar WP
- ❌ No hay Git hooks (pre-commit) para validar antes de commit
- ❌ No hay GitHub Actions para validar en remoto

---

### P-6: Cross-file Reference Validation Missing

**Estado:** Sin validación

Los artefactos pueden:
- Referenciar ADRs que no existen
- Mencionar archivos que fueron movidos
- Importar skills que no se cargaron

**Actualmente:** No hay validación de referencias cruzadas.

---

### P-7: Error Registry NOT Validated

**Estado:** Documentado pero sin enforcement

En `.thyrox/context/errors/`:
- Errors deberían tener estructura estándar (qué pasó, por qué, prevención)
- Deberían ser clasificados (WP-ERR-NNN, CRITICALITY)
- Deberían tener lecciones aprendidas

**Actualmente:** No se valida estructura ni completitud de error reports.

---

### P-8: ADR Consistency NOT Validated

**Estado:** Sin validación

En `.thyrox/context/decisions/`:
- ADRs deberían seguir formato ADR (Context, Decision, Consequences)
- No deberían contradecir ADRs previos
- Deberían estar linkados desde guías/skills que los referencian

**Actualmente:** No hay validación de consistencia o linkage.

---

### P-9: Conventional Commits — Partial Coverage

**Estado:** Validado en PRs pero no en push directo

validate.yml valida commits conventionales PERO:
- ❌ Solo en PRs (`if: github.event_name == 'pull_request'`)
- ✓ En push también se valida (línea 4-6 del trigger)

**Sin embargo:**
- ❌ No valida que scope sea válido (debe ser nombre WP o componente)
- ❌ No valida que description NO mencione "WIP", "fix stuff", "changes"

---

### P-10: CLAUDE.md — No Validation

**Estado:** Sin validación

`.claude/CLAUDE.md` es fichero crítico (Level 2):
- ❌ No se valida YAML sintaxis
- ❌ No se valida que campos requeridos estén presentes
- ❌ No se valida que las referencias a directorios sean correctas

---

## Síntesis: 10 Problemas Identificados

| Problema | Estado | Severidad | Impacto |
|----------|--------|-----------|---------|
| P-1: WP structure | ❌ No validado | ALTA | WP-ERR-001 pasó a merge |
| P-2: Evidence classification | ❌ No validado | ALTA | Claims SPECULATIVE bloquean gates pero pasan inadvertidos |
| P-3: Metadata standards | ❌ No validado | MEDIA | Artefactos incompletos |
| P-4: Naming conventions | ❌ No validado | MEDIA | Inconsistencia en proyecto |
| P-5: Artifact Paradox | ❌ No implementado | ALTA | Documental sin mechanisms |
| P-6: Reference validation | ❌ No validado | MEDIA | Links rotos, archivos no encontrados |
| P-7: Error registry | ❌ No validado | BAJA | Inconsistencia en documentación |
| P-8: ADR consistency | ❌ No validado | MEDIA | Decisiones contradictorias |
| P-9: Conventional commits | ⚠️ Parcial | BAJA | Scope no validado |
| P-10: CLAUDE.md validation | ❌ No validado | MEDIA | Cambios accidentales en configuración |

---

## Siguiente: Decisión de Scope

**Preguntas para definir scope de ESTE WP:**

1. ¿Cuál(es) problema(s) se atienden en ESTE WP?
2. ¿Cuáles van al backlog (futuro WPs)?
3. ¿Qué mecanismos se implementan? (hooks, GitHub Actions, ambos)

**Opciones sugeridas:**
- **A) Minimal:** P-1 (WP structure) + P-2 (Evidence) — los más críticos
- **B) Comprehensive:** P-1 + P-2 + P-3 + P-4 + P-5 — validación completa de artefactos
- **C) Phased:** Phase 1 = P-1+P-2 (hooks), Phase 2 = resto (GitHub Actions)

