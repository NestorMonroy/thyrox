```yml
type: Estrategia de Solución
work_package: 2026-04-09-07-15-48-assets-restructure
fase: FASE 25
phase: Phase 2 — SOLUTION_STRATEGY
created_at: 2026-04-09 07:30:00
```

# Estrategia de Solución — assets-restructure

## Decisión central

**Distribuir** los 38 templates de `pm-thyrox/assets/` a sus `workflow-*/assets/` correspondientes, usando **commits atómicos por grupo de fases**. Un asset permanece en `pm-thyrox/assets/` (error-report.md.template — cross-phase).

## Por qué este enfoque

La estrategia es idéntica a FASE 24 (referencias y scripts) con una diferencia favorable: **los archivos `workflow-*/` ya usan los paths correctos**. No hay cross-batch reference issues ni 2-step fixes. Cada batch de `git mv` repara referencias rotas automáticamente.

## Alternativas descartadas

| Alternativa | Razón del descarte |
|-------------|-------------------|
| Copiar (no mover) templates | Genera duplicados, confusión de cuál es canónica. Git mv es la operación correcta. |
| Un solo commit masivo | 38 git mv + 25 link updates = commit difícil de revisar y de revertir si algo falla |
| Crear `.claude/assets/` como nivel global | No existe precedente en la arquitectura. error-report es el único candidato y se maneja mejor en pm-thyrox/ |
| Duplicar categorization-plan.md.template en 2 workflows | Dos fuentes de verdad → divergencia. Una copia, un owner (workflow-decompose) |

## Estructura de batches

| Batch | Archivos | Commit | Link updates propios |
|-------|----------|--------|---------------------|
| **A** | 14 → workflow-analyze/assets/ | C-A | Ninguno (workflow-analyze ya usa paths correctos) |
| **B** | 7 → workflow-strategy/plan/structure/assets/ | C-B | Ninguno |
| **C** | 11 → workflow-decompose/execute/assets/ | C-C | Ninguno |
| **D** | 5 → workflow-track/assets/ | C-D | Ninguno |
| **E (final)** | pm-thyrox/SKILL.md tabla + externos | C-E | 14+10 = ~24 links en 7 archivos |

## Decisiones tomadas

1. **categorization-plan.md.template** → `workflow-decompose/assets/` (owner primario). `workflow-track/references/incremental-correction.md` actualiza 1 link en Batch E.
2. **error-report.md.template** → permanece en `pm-thyrox/assets/` (cross-phase, sin owner de fase clara).
3. **adr.md.template** → `workflow-analyze/assets/` (Phase 1 es el primer usuario; workflow-strategy/SKILL.md usa `assets/adr.md.template` relativo — se auto-repara al crear workflow-analyze/assets/).

   > **Nota:** `workflow-strategy/SKILL.md` referencia `assets/adr.md.template` que resuelve a `workflow-strategy/assets/adr.md.template`. Si adr.md.template va a workflow-analyze, ese link quedará roto. **Decisión:** mover `adr.md.template` a workflow-analyze Y actualizar workflow-strategy/SKILL.md en Batch E para usar `../workflow-analyze/assets/adr.md.template`.

4. **Corrección FASE 24 side-effects:** `references/conventions.md` y `references/examples.md` tienen links `../assets/X.md` rotos (apuntan a `.claude/assets/` inexistente). Corregir en Batch E.

## Validación

```bash
# Baseline pre-batch (ver cuántos rotos existen hoy):
python3 .claude/scripts/detect_broken_references.py

# Post-batch (cada uno debe reducir el conteo de rotos):
python3 .claude/scripts/detect_broken_references.py

# Grep adicional (assets no escaneados en .sh):
grep -r "pm-thyrox/assets" . --include="*.sh"
```
