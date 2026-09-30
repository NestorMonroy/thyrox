```yml
created_at: 2026-04-17 22:01:55
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# References Analysis — workflow-audit Design

## Propósito

Análisis de referencias relevantes en `.thyrox/context/research/` para informar el diseño del skill `workflow-audit`. Este documento sintetiza patrones encontrados y define las decisiones de diseño del auditor.

---

## Fuentes analizadas

| Referencia | Relevancia | Patrones clave |
|------------|------------|----------------|
| `universal-flow-critical-analysis.md` | Alta | Per-step critical review format, problem→correction structure |
| `reference-validation.md` | Alta | 3-category classification, CI/CD exit codes |
| `howto/architecture/architecture.md` | Media | Skill progressive disclosure, hook events para audit triggers |
| `root-cause-analysis-methodology.md` | Media | RCA techniques para WHY items fallaron |
| `incremental-correction.md` | Alta | Structured approach para issues a escala |
| `workflow-track/SKILL.md` | Alta | Anatomía exacta de skills existentes |

---

## Patrones encontrados

### 1. Per-step critical analysis (universal-flow-critical-analysis.md)

El patrón más relevante para el auditor. Por cada ítem del trabajo:

```
Paso N — [Nombre del ítem]
  Estado esperado: [qué debería existir o estar correcto]
  Estado actual:   [qué existe realmente]
  Veredicto:       ✅ PASS | ❌ FAIL | ⚠ PARTIAL | ⏭ SKIP
  Evidencia:       [path, contenido, commit hash]
  Corrección:      [acción concreta si FAIL o PARTIAL]
```

**Insight clave:** El análisis crítico debe ser explícito sobre lo que encontró vs. lo que esperaba. No inferir — verificar. El documento de la referencia evaluaba cada paso de un flow con exactamente este formato.

### 2. Validación en 3 categorías (reference-validation.md)

Sistema de clasificación para referencias y artefactos:

| Categoría | Criterio | Acción |
|-----------|---------|--------|
| **PASS** | Existe, correcto, cumple spec | Documentar — sin acción |
| **DOCUMENTARY** | Existe pero con problema menor (typo, metadata faltante) | Registrar para fix |
| **BROKEN** | No existe, malformado, o contradice spec | Bloquear avance — fix requerido |

**Para el auditor:** estas categorías se extienden a `PARTIAL` (existe pero incompleto) que es más granular que DOCUMENTARY.

**Exit codes para CI/CD integration:**
- `0` = Todo PASS
- `1` = Al menos un FAIL o BROKEN
- `2` = PARTIAL (warnings — no bloquean por defecto)

### 3. Progressive disclosure de skills (howto/architecture.md)

Los skills de Claude Code usan carga progresiva: nivel 1 (SKILL.md — siempre cargado) → nivel 2 (references/ — bajo demanda) → nivel 3 (assets/ — templates).

**Para workflow-audit:**
- `SKILL.md`: instrucciones de auditoría (cuándo y cómo auditar)
- `references/audit-checklist.md`: qué verificar por categoría
- `references/audit-scoring.md`: criterios PASS/FAIL/PARTIAL con ejemplos
- `assets/audit-report.md.template`: output estructurado

### 4. Incremental correction para issues a escala (incremental-correction.md)

Cuando el audit encuentra muchos problemas, el enfoque debe ser:
1. **Clasificar primero** — agrupar issues por tipo y severidad
2. **Priorizar por bloqueo** — FAIL > PARTIAL > DOCUMENTARY
3. **Batches por categoría** — no mezclar tipos de fixes en un mismo commit
4. **Verificar después de cada batch** — no asumir que el fix resolvió

**Para el auditor:** el `audit-report.md` debe incluir una sección de "Action Plan" ordenada por prioridad, no solo un listado plano de issues.

### 5. RCA para causas de fallo (root-cause-analysis-methodology.md)

Para items FAIL, el auditor no solo registra "falta el archivo" — usa 5 Whys para determinar si es:
- **Omisión sistemática**: el proceso no lo requería explícitamente
- **Omisión puntual**: el ejecutor lo olvidó en este WP
- **Definición incorrecta**: el criterio de éxito era ambiguo

Esta distinción informa si la corrección es un fix de instancia o una mejora al framework.

---

## Decisiones de diseño

### D-1: Dimensiones de auditoría

El auditor cubre 5 dimensiones, evaluadas independientemente:

| Dimensión | Qué verifica | Peso |
|-----------|-------------|------|
| **Task Plan** | T-NNN checkboxes vs implementación real | 30% |
| **Artifacts** | Existencia, naming, metadata standards | 25% |
| **Commits** | Conventional commits, scope correcto | 20% |
| **Scripts** | Sintaxis bash, chmod +x, paths | 15% |
| **State** | now.md, focus.md, ROADMAP.md consistencia | 10% |

### D-2: Sistema de scoring

```
Score = Σ(items PASS) / Σ(items totales) × 100

GRADE A: 90-100% — WP excelente, puede cerrar
GRADE B: 75-89%  — WP aceptable, issues menores
GRADE C: 60-74%  — WP con gaps, revisión recomendada
GRADE F: < 60%   — WP deficiente, revisión obligatoria
```

Cada ítem PARTIAL cuenta como 0.5 (no 0 ni 1).

### D-3: Output estructurado

El `audit-report.md` tiene secciones fijas:
1. **Executive Summary** — score global, grade, fecha
2. **Dimension Scores** — score por dimensión
3. **Critical Failures** — FAIL items que bloquean cierre
4. **Partial Items** — PARTIAL items con corrección sugerida
5. **Action Plan** — pasos ordenados para resolver issues
6. **Passed Items** — documentación de lo que funcionó correctamente

### D-4: Invocación

El skill se invoca cuando:
- El ejecutor dice "audita el WP" / "verifica el trabajo" / "revisa que todo esté correcto"
- Antes de Stage 12 STANDARDIZE (gate de calidad)
- Después de una sesión larga con muchos cambios

**Trigger phrase** para descripción: "Use when... verifying work quality before closing a WP."

### D-5: No auto-fix

El auditor **documenta** — no corrige automáticamente. La corrección es una tarea separada del ejecutor. Esto evita correcciones en cadena sin supervisión.

---

## Anatomía propuesta del skill

```
.claude/skills/workflow-audit/
├── SKILL.md                              ← Instrucciones (cuándo, cómo, output)
├── references/
│   ├── audit-checklist.md               ← Qué verificar por dimensión
│   └── audit-scoring.md                 ← Criterios PASS/FAIL/PARTIAL + ejemplos
└── assets/
    └── audit-report.md.template         ← Template de output
```

---

## Síntesis

El `workflow-audit` skill debe ser un auditor crítico que:
1. **Verifica** cada dimensión del trabajo contra criterios explícitos
2. **Clasifica** cada ítem en PASS/FAIL/PARTIAL/SKIP con evidencia
3. **Puntúa** el WP con un grade (A/B/C/F)
4. **Propone** un action plan ordenado por prioridad
5. **No corrige** — solo documenta para que el ejecutor decida

El formato per-step de `universal-flow-critical-analysis.md` es el modelo a seguir para la estructura del reporte. La clasificación 3-categorías de `reference-validation.md` informa el sistema PASS/FAIL/PARTIAL.
