```yml
created_at: 2026-04-17 22:15:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Análisis: PAT-004 — Cuándo y por qué no se ejecutó

> Análisis de P4 antes de implementar la sincronización de checkboxes.
> PAT-004 (Checkbox-at-commit): "Al hacer el commit del T-NNN, incluir en ese mismo
> commit el `[x]` en el task plan."

---

## Estado actual

**Síntoma:** Todos los 25 T-NNN del task plan de ÉPICA 41 muestran `[ ]` a pesar de que
la implementación está completa y commitada en 7 batches (1f6986f → a0fe13b).

---

## ¿Cuándo debió ejecutarse PAT-004?

PAT-004 define el momento exacto: **en el mismo commit** que implementa cada T-NNN.

| Batch | Commit | T-NNNs cubiertos | Checkboxes que debían ir en ese commit |
|-------|--------|-----------------|----------------------------------------|
| B1 | 1f6986f (fix scripts) | T-001, T-002, T-003, T-004, T-005 | `[x]` T-001..T-005 en task-plan |
| B2 | f33207c (state-management) | T-006, T-007, T-008 | `[x]` T-006..T-008 |
| B3 | 657ee67 (README) | T-009, T-010 | `[x]` T-009..T-010 |
| B4 | 75376be (ARCHITECTURE) | T-011, T-012, T-021, T-022 | `[x]` T-011, T-012, T-021, T-022 |
| B5 | 4086161 (DECISIONS+guides) | T-013, T-014, T-015, T-016 | `[x]` T-013..T-016 |
| B7 | cbc261f (templates) | T-023, T-024, T-025 | `[x]` T-023..T-025 |
| Cierre | a0fe13b | T-017, T-018, T-019, T-020 | `[x]` T-017..T-020 |

El momento ya pasó para todos estos commits. Lo que queda es un commit de sincronización retroactivo.

---

## ¿Por qué no se ejecutó?

### Causa raíz directa: El task plan no estaba en el directorio raíz

El task plan vive en `plan-execution/goto-problem-fix-task-plan.md` (subdirectorio),
mientras que `session-start.sh` lo busca con:

```bash
find "$WP_DIR" -maxdepth 1 -name "*task-plan*"  # solo busca en raíz del WP
```

El task plan no aparecía en el output del script de sesión, lo que reducía su visibilidad
como artefacto activo. La desconexión visual entre "lo que estoy ejecutando" y "el checklist
que debo actualizar" es el mecanismo que generó el drift.

### Causa raíz sistémica: PAT-004 no tiene enforcement

PAT-004 está documentado en `workflow-track/SKILL.md` como nota informativa, pero:
- No hay hook ni validación que lo recuerde al hacer un commit
- No hay verificación pre-gate que compruebe consistencia entre commits y checkboxes
- El skill `workflow-implement/SKILL.md` no lo menciona explícitamente — es donde más importa

### Causa raíz contextual: Sesión larga de ejecución en lotes

Los 7 batches se ejecutaron en una sesión extensa. Con múltiples commits consecutivos,
el flujo fue: implementar → verificar → commitear → siguiente batch. El paso de "actualizar
checkbox en task-plan antes del commit" se saltó sistemáticamente porque no hay fricción
(ninguna herramienta lo pregunta).

---

## ¿Por qué no se hace? — Análisis de fricción

| Factor | Impacto |
|--------|---------|
| El task-plan está en `plan-execution/` — no es el primer archivo que se lee en sesión | Baja visibilidad |
| `session-start.sh` muestra la siguiente tarea pendiente `[ ]` pero no verifica si la anterior fue commiteada | Sin feedback loop |
| Hacer 2 cosas en un commit (implementación + checkbox) requiere disciplina extra sin recordatorio | Costo cognitivo en momento de alta actividad |
| PAT-004 está en `workflow-track/SKILL.md` pero el trabajo ocurre en `workflow-implement` | Documentado en lugar equivocado |

---

## ¿Cuándo ejecutar el fix ahora?

**Opción A — Commit retroactivo único (recomendada):**
Un solo commit sincroniza todos los checkboxes:
```
chore(goto-problem-fix): sync task plan checkboxes — PAT-004 retroactivo
```
Ventaja: limpio, trazable. Desventaja: no preserva la granularidad de "qué se completó cuándo".

**Opción B — No sincronizar, documentar como deuda:**
Dejar el task plan como está y documentar en lessons-learned que PAT-004 no se aplicó.
Ventaja: no reescribe historia. Desventaja: el task plan permanece como fuente de verdad falsa.

**Recomendación:** Opción A. El task plan es un artefacto vivo que debe reflejar realidad.
La historia de los commits individuales ya está en `git log` — el task plan no necesita
preservar esa granularidad, solo el estado final.

---

## Mejora al framework (la parte "realizarlo" del P4)

### Fix 1: Mover PAT-004 a workflow-implement/SKILL.md

PAT-004 debe estar donde ocurre la acción (Phase 10 IMPLEMENT), no en Phase 11 TRACK.

Agregar en `workflow-implement/SKILL.md` bajo la sección de commits:

```markdown
**PAT-004 — Checkbox-at-commit (OBLIGATORIO):**
En el mismo commit que implementa T-NNN, incluir el `[x]` en el task-plan.
NUNCA acumular checkboxes para después.

\`\`\`bash
# Correcto: implementation + checkbox en un commit
git add src/feature.ts plan-execution/wp-task-plan.md
git commit -m "feat(wp): implement T-042 feature X"
\`\`\`
```

### Fix 2: session-start.sh debe encontrar task-plan en subdirectorios

Cambiar `find "$WP_DIR" -maxdepth 1` → `find "$WP_DIR" -maxdepth 2` para incluir `plan-execution/`.

```bash
# Actual (roto para plan-execution/):
TASK_PLAN=$(find "$WP_DIR" -maxdepth 1 -name "*task-plan*" 2>/dev/null | head -1)

# Corregido:
TASK_PLAN=$(find "$WP_DIR" -maxdepth 2 -name "*task-plan*" 2>/dev/null | head -1)
```

### Fix 3: validate-session-close.sh debe verificar consistencia

Agregar verificación: si hay commits de T-NNN en el log que no tienen `[x]` en el task-plan,
emitir advertencia antes del cierre.

---

## Cuándo ejecutar estas mejoras

| Fix | Cuándo | Por qué ese momento |
|-----|--------|-------------------|
| Fix 1 (PAT-004 en workflow-implement) | Esta sesión — Stage 11 | Bajo costo, alto impacto preventivo |
| Fix 2 (session-start.sh maxdepth 2) | Esta sesión | Requiere cambio de script + test |
| Fix 3 (validate-session-close.sh) | ÉPICA siguiente o TD | Complejo, requiere análisis de git log |

**Fix 3 → TD:** Agregar a `technical-debt.md` como TD-042: "validate-session-close.sh: verificar PAT-004 antes de cierre de WP (consistencia commit↔checkbox)".
