```yml
Fecha estrategia: 2026-04-02-00-00-00
Proyecto: thyrox / pm-thyrox SKILL
Versión arquitectura: 1.0
Estado: Borrador
```

# Solution Strategy: Template Phase Integration

Problema raíz (Phase 1): El spec.md anterior resolvió activación y compatibilidad Haiku,
pero no formalizó qué template usar en cada fase ni cómo nombrar los outputs.
7 de 10 puntos de integración se ejecutaron ad-hoc sin work package ni decisiones documentadas.

---

## 1. Key Ideas

### Idea 1: Template por fase = contrato explícito entre fase y artefacto

El SKILL debe especificar por cada fase:
- **Qué template usar** (referencia a `assets/`)
- **Cómo nombrar el output** (patrón con Reveal Intent)
- **Cómo detectar que la fase ya completó** (verificable sin inferencia)

Sin este contrato, el modelo inventa nombres y estructuras. Con él, el artefacto es
predecible, buscable y verificable.

### Idea 2: Reveal Intent aplica al OUTPUT, no al template

Los templates tienen nombres genéricos porque son reutilizables entre proyectos
(`introduction.md.template`, `tasks.md.template`). Lo que varía por proyecto es el OUTPUT.

**Patrón:** `{nombre-wp}-{tipo}.md`
- `{nombre-wp}` = parte descriptiva del work package (sin timestamp)
- `{tipo}` = qué tipo de artefacto es (`analysis`, `solution-strategy`, `task-plan`, etc.)

Ejemplo: WP `2026-04-01-22-15-43-template-phase-integration`
→ `template-phase-integration-analysis.md` (no `introduction.md`)
→ [template-phase-integration-task-plan](template-phase-integration-task-plan.md) (no `plan.md`)

### Idea 3: Detección de fase = glob `*-{tipo}.md`, no nombre exacto

Para que el SKILL detecte fases completadas sin depender del nombre exacto:
- Buscar `*-analysis.md` en `analysis/` → Phase 1 completó
- Buscar `*-solution-strategy.md` → Phase 2 completó
- Buscar `*-task-plan.md` → Phase 5 completó

Esto es compatible con el nuevo patrón Y con el hecho de que proyectos distintos
tienen nombres distintos en sus WPs.

### Idea 4: WPs históricos son legacy — no retrocompatibilidad forzada

Los WPs anteriores (`spec.md`, `plan.md`, `lessons.md`) no se migran.
La convención nueva aplica a WPs creados desde esta sesión en adelante.
El SKILL documenta esta distinción para no confundir al modelo.

---

## 2. Research

### Unknown 1: ¿Todos los links de SKILL.md → assets/ existen?

**Verificación ejecutada:** 19/19 referencias válidas (R-001 cerrado).
No hay links rotos. Ninguna acción requerida.

---

### Unknown 2: ¿Los 3 templates nuevos siguen convenciones del proyecto?

Comparación de estructura contra templates maduros del proyecto:

| Aspecto | Templates maduros | lessons-learned | changelog | risk-register |
|---------|------------------|----------------|-----------|---------------|
| Frontmatter YAML | ✓ | ✓ | ✓ | ✓ |
| Sección Propósito | ✓ | ✓ | ✓ | ✓ |
| Diferenciación vs. doc similar | — | ✓ (vs. final-report) | ✓ | ✓ (vs. error-report) |
| Checklist de cierre | Algunos | ✓ | — | ✓ |
| Timestamps `YYYY-MM-DD-HH-MM-SS` | ✓ (actualizado) | ✓ | ✓ | ✓ |

**Brecha encontrada:** `changelog.md.template` no tiene checklist de cierre.
**Decisión:** Aceptable — el changelog es generativo (desde commits), no requiere checklist.

**Conclusión:** R-003 cerrado. Templates nuevos siguen convenciones del proyecto.

---

### Unknown 3: ¿El patrón {nombre-wp}-{tipo}.md cubre todos los casos de uso?

**Casos analizados:**

| Caso | ¿El patrón funciona? | Nota |
|------|---------------------|------|
| WP con nombre largo | ✓ | kebab-case, sin límite práctico |
| Sub-análisis (stakeholders, constraints) | ✓ | `{nombre-wp}-stakeholders.md` |
| Múltiples ADRs | ✓ | usan `adr-NNN.md` (convención propia) |
| Errores | ✓ | usan `ERR-NNN-descripcion.md` (convención propia) |
| CHANGELOG global | ✓ | excepción documentada: es [CHANGELOG](CHANGELOG.md) (convención universal) |
| WP de hotfix (<30min) | ✓ | solo `{nombre}-analysis.md` + `{nombre}-task-plan.md` |

**Conclusión:** El patrón cubre todos los casos. CHANGELOG es la única excepción
justificada por convención universal (Keep a Changelog).

---

## 3. Pre-design check

| Locked Decision | ¿Respetada? | Nota |
|----------------|-------------|------|
| ANALYZE first | ✓ | Phase 1 completada con introduction + risk-register |
| Markdown only | ✓ | Solo cambios en .md |
| Git as persistence | ✓ | Sin backups |
| Single skill | ✓ | No se crean skills nuevos |
| Conventional Commits | ✓ | No cambia |
| Work packages with timestamp | ✓ | WP con timestamp real |

Sin violaciones. Seguir.

---

## 4. Decisions

### Decisión 1: Formalizar el contrato fase→template→output en SKILL.md

**Qué:** Cada fase tiene instrucción REQUERIDO con template + output filename explícito.
**Patrón output:** `{nombre-wp}-{tipo}.md`
**Estado:** Ya implementado en sesión anterior. Esta decisión lo formaliza retroactivamente.

### Decisión 2: Detección de fases usa glob, no nombre exacto

**Qué:** Los "Detectar:" en SKILL.md usan `*-{tipo}.md` en lugar de nombre fijo.
**Estado:** Ya implementado. Esta decisión lo formaliza.

### Decisión 3: Naming convention documentada en sección SKILL.md "Naming"

**Qué:** Agregar en la sección Naming del SKILL.md la regla explícita del patrón.
**Estado:** Parcialmente — la estructura del WP lo menciona. Falta en la sección Naming.
**Acción requerida:** Actualizar sección Naming del SKILL.md.

### Decisión 4: WPs históricos = legacy, sin migración

**Qué:** Nota explícita en SKILL.md que el nuevo naming aplica desde este WP en adelante.
**Estado:** No documentado aún.
**Acción requerida:** Agregar nota en sección Naming.

### Decisión 5: CHANGELOG es excepción al patrón (nombre global, no por WP)

**Qué:** [CHANGELOG](CHANGELOG.md) en raíz del proyecto, no `{nombre-wp}-changelog.md`.
**Justificación:** Convención universal de proyectos (Keep a Changelog, semver).
**Estado:** Ya implementado. Esta decisión lo formaliza.

---

## 5. Post-design re-check

| Riesgo Phase 1 | Estado | Resolución |
|---------------|--------|------------|
| R-001: Links rotos en SKILL.md | ✓ cerrado | 19/19 válidos |
| R-002: Naming nuevo rompe WPs históricos | ✓ mitigado | Decisión 4: legacy explícito |
| R-003: Templates nuevos fuera de convención | ✓ cerrado | Verificación Unknown 2 |

**Trabajo pendiente identificado:**
- D3: Actualizar sección Naming de SKILL.md con regla explícita del patrón
- D4: Agregar nota de compatibilidad WPs históricos en SKILL.md

**Trabajo ya completo (validado):**
- 19 referencias template en SKILL.md → todas válidas
- 3 templates nuevos → siguen convenciones del proyecto
- Reveal Intent en output filenames → implementado
- Timestamps estandarizados → implementado

---

## Checklist de validación

- [x] Key Ideas identificadas y articuladas
- [x] Research con verificación por cada unknown
- [x] Pre-design check contra Locked Decisions
- [x] Decisiones documentadas con justificación
- [x] Post-design re-check: todos los riesgos resueltos
- [x] Scope acotado: 2 acciones pendientes (D3, D4), resto validado
