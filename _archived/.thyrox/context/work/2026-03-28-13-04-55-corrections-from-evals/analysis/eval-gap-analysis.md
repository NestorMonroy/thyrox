```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
Tema: Análisis de gaps revelados por los evals
```

# Análisis: Correcciones necesarias según resultados de evals

## Fuentes de datos

### Functional Evals (primera interacción): 11/14 (78.6%)

| Eval | Score | Gap identificado |
|------|-------|-----------------|
| FE-01 | 4/5 | E2: No propone work package en primera interacción |
| FE-02 | 3/4 | E3: No sugiere siguiente paso explícito |
| FE-03 | 4/5 | E1: No usa formato [T-NNN] para tareas |

### Multi-Interaction Evals: 20/26 (76.9%)

| Eval | Score | Gap identificado |
|------|-------|-----------------|
| MI-01 | 3/4 | No dice "T-003" explícitamente como siguiente tarea |
| MI-02 | 4/4 | — (perfecto) |
| MI-05 | 4/4 | — (perfecto) |
| MI-13 | 3/3 | — (perfecto) |
| MI-21 | 2/3 | No propone avance de fase explícitamente |
| MI-22 | 0/4 | Bug en script (no es gap del SKILL) |
| MI-23 | 4/4 | — (perfecto) |

### Lessons aprendidas

| Lesson | Hallazgo |
|--------|----------|
| L-004 | Script path bug invalida MI-22 |
| L-005 | Claude lee contexto SIN SKILL.md — estructura auto-explicativa |
| L-006 | cd al workspace es suficiente, --add-dir innecesario |
| L-007 | Multi-interaction ≈ first-interaction — gaps son del SKILL no del contexto |

---

## Categorización de correcciones

### Corrección 1: Bug en run-multi-evals.sh (técnico, no del SKILL)

**Problema:** Path doble `.claude/.claude/` al copiar SKILL.md y CLAUDE.md.

**Causa:** En `setup_workspace()`, `SKILL_DIR` ya incluye `.claude/` y el script agrega otro `.claude/`.

**Fix exacto:**
```bash
# Antes (bug):
cp "$SKILL_DIR/SKILL.md" "$dir/.claude/skills/pm-thyrox/"
cp "${PROJECT_ROOT}/.claude/CLAUDE.md" "$dir/.claude/"

# Después (fix):
cp "${PROJECT_ROOT}/.claude/skills/pm-thyrox/SKILL.md" "$dir/.claude/skills/pm-thyrox/"
cp "${PROJECT_ROOT}/.claude/CLAUDE.md" "$dir/.claude/"
```

**Impacto:** Corregir y re-ejecutar MI-22 aislado. Si pasa, el score sube de 20/26 a ~24/26.

**Severidad:** Alta (invalida un eval completo).

---

### Corrección 2: SKILL.md no indica cuándo proponer work package (gap FE-01 E2, MI-21)

**Problema:** Claude empieza con ANALYZE correctamente pero nunca propone "vamos a crear un work package." En FE-01 pregunta y pregunta. En MI-21 (segunda interacción con análisis completado) sigue sin proponer avance.

**Análisis:**

SKILL.md Phase 3: PLAN dice:
```
1. Brainstorm: problem, users, success criteria, out of scope
2. Create work package: context/work/YYYY-MM-DD-HH-MM-SS-nombre/
3. Update ROADMAP.md with features + link to work package
4. Get scope approval
```

El paso 2 está ahí pero no dice CUÁNDO hacer la transición de Phase 1 a Phase 3. El "Salir cuando" de Phase 1 dice "Los hallazgos están documentados y aprobados" pero no indica QUÉ HACER DESPUÉS.

**Causa raíz:** Las transiciones entre fases son pasivas ("Salir cuando X") en vez de activas ("Cuando X, proponer al usuario pasar a Phase Y").

**Fix propuesto:** Agregar transición activa al final de cada fase:
```
**Salir cuando:** Los hallazgos están documentados y aprobados.
**Siguiente:** Proponer al usuario pasar a Phase 2: SOLUTION_STRATEGY.
  Si el problema es simple y no requiere decisiones arquitectónicas, proponer saltar a Phase 3: PLAN.
```

**Impacto:** Afecta SKILL.md (7 secciones de fases). ~7 líneas adicionales.

**Severidad:** Media (el flujo funciona pero el usuario tiene que pedir el avance).

---

### Corrección 3: SKILL.md no fuerza formato [T-NNN] (gap FE-03 E1)

**Problema:** Claude descompone tareas correctamente pero no siempre usa el formato `[T-NNN] Description (R-N)`.

**Análisis:**

SKILL.md Phase 5: DECOMPOSE dice:
```
2. Create task list: `- [ ] [T-NNN] Description (R-N)` — each task references its requirement
```

Lo muestra como formato pero no explica POR QUÉ es importante. Según skill-creator: "explain WHY in lieu of heavy-handed MUSTs."

Sin embargo, MI-23 (donde el usuario PIDIÓ trazabilidad explícitamente) pasó 4/4 con IDs y referencias. El formato aparece cuando el usuario lo pide.

**Causa raíz:** El SKILL muestra el formato pero no explica su valor. Claude lo trata como sugerencia, no como convención importante.

**Fix propuesto:** Agregar WHY al formato:
```
2. Create task list with traceable IDs — each task needs an ID and a requirement reference
   because this enables tracking which requirement each task satisfies and detecting
   orphan tasks (tasks without requirements) or uncovered requirements (requirements without tasks).
   Format: `- [ ] [T-NNN] Description (R-N)`
```

**Impacto:** 2-3 líneas adicionales en Phase 5.

**Severidad:** Baja (el formato aparece cuando el usuario lo pide, y la descomposición es correcta sin él).

---

### Corrección 4: SKILL.md no indica siguiente tarea específica en status check (gap FE-02 E3, MI-01)

**Problema:** Cuando el usuario pregunta "¿qué hago ahora?" o "¿dónde quedamos?", Claude lee el estado pero no dice explícitamente "tu siguiente tarea es T-NNN: [descripción]."

**Análisis:**

SKILL.md Phase 7: TRACK dice:
```
- **Status:** Show progress from ROADMAP.md + recent commits
```

Pero no dice "identify the next incomplete task from plan.md." Claude reporta estado general pero no señala la acción concreta.

Sin embargo, MI-05 (Phase 6 interrumpida con prompt directo "¿cuál es la siguiente?") pasó 4/4. Y MI-22 falló por bug del script, no por el SKILL.

**Causa raíz:** Phase 7 describe "show progress" pero no "identify next action." Es descriptivo, no prescriptivo.

**Fix propuesto:** Agregar a Phase 7:
```
- **Status:** Show progress from ROADMAP.md + recent commits.
  If there's an active work package with plan.md, identify the next incomplete task
  and suggest it as the concrete next action.
```

**Impacto:** 2 líneas adicionales en Phase 7.

**Severidad:** Baja (funciona cuando el prompt es directo, como MI-05).

---

### Corrección 5: Transición Phase 1 → Phase 2 confusa para Claude (gap MI-21)

**Problema:** En MI-21, el análisis está completado (spec con R-01 a R-04) y el usuario dice "¿Qué sigue?" Pero Claude hace más preguntas sobre tecnología en vez de proponer Phase 2 o Phase 3.

**Análisis:**

El SKILL dice "Salir cuando: Los hallazgos están documentados y aprobados." Pero:
1. Claude no sabe si los hallazgos están "aprobados" — el usuario no dijo "apruebo"
2. Las preguntas de tecnología son razonables (podrían ser Phase 2: SOLUTION_STRATEGY)
3. El SKILL no distingue entre "preguntas de análisis" y "preguntas de diseño"

**Causa raíz:** El SKILL no tiene lógica de detección de fase. No dice "si ya existe analysis/requirements.md con requisitos, estás en Phase 2, no Phase 1."

**Fix propuesto:** Agregar orientación basada en archivos existentes:
```
**Detecting current phase from existing files:**
- Si `work/.../analysis/` tiene hallazgos → Phase 1 completado, proponer Phase 2
- Si `work/.../spec.md` existe → Phase 4 completado, proponer Phase 5
- Si `work/.../plan.md` tiene checkboxes → Phase 5 completado, estamos en Phase 6
- Si `focus.md` tiene blocker → resolver antes de avanzar
```

**Impacto:** ~5 líneas adicionales, probablemente como sección nueva "Phase Detection."

**Severidad:** Media (afecta la experiencia de continuidad entre fases).

---

## Resumen de correcciones

| # | Corrección | Tipo | Severidad | Líneas | Archivos |
|---|-----------|------|-----------|--------|----------|
| 1 | Fix path bug en run-multi-evals.sh | Script | Alta | 2 | scripts/run-multi-evals.sh |
| 2 | Transiciones activas entre fases | SKILL body | Media | ~14 | SKILL.md |
| 3 | WHY para formato [T-NNN] | SKILL body | Baja | ~3 | SKILL.md |
| 4 | Status check → siguiente tarea concreta | SKILL body | Baja | ~2 | SKILL.md |
| 5 | Phase detection por archivos existentes | SKILL body | Media | ~5 | SKILL.md |

**Total cambios en SKILL.md:** ~24 líneas adicionales (176 → ~200, aún dentro de <500).

---

## Priorización

**Hacer primero (bloquea otras verificaciones):**
1. Fix bug en script (invalida MI-22)

**Hacer segundo (mayor impacto en experiencia):**
2. Transiciones activas entre fases
5. Phase detection por archivos

**Hacer tercero (mejora de calidad):**
3. WHY para [T-NNN]
4. Status check → tarea concreta

---

**Última actualización:** 2026-03-28
