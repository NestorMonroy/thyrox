```yml
Fecha: 2026-03-28
Proyecto: THYROX — Correcciones de Covariancia
Tipo: Phase 2 (SOLUTION_STRATEGY)
Autor: Claude Code + Human
Estado: Borrador
```

# Solution Strategy: Correcciones de Covariancia

## Propósito

Definir CÓMO hacer que las 5 leyes de THYROX sean invariantes en todos los marcos de referencia.

---

## Key Idea: Fuente Canónica + Referencia

Cada ley debe tener **una fuente canónica** (donde se define completamente) y los demás archivos **referencian** esa fuente sin redefinir. Si una ley se redefine en cada archivo, hay más superficie para que diverjan.

```
SKILL.md define la ley → otros archivos la referencian o resumen
```

Si un archivo necesita mencionar una ley, debe:
1. Dar un resumen mínimo (1-3 líneas)
2. Apuntar a la fuente canónica con link

Nunca copiar la definición completa.

---

## Decisiones por Ley

### LAW 2 — Estructura de archivos

**Fuente canónica:** SKILL.md (sección "File Structure")

**Acciones:**
- SKILL.md: Agregar `scripts/` al diagrama (actualmente omitido)
- CLAUDE.md: Eliminar referencia a `.claude/prds/` (no existe)
- conventions.md: Actualizar estructura completa (le falta analysis/, epics/, scripts/)

### LAW 3 — Convenciones de nombrado

**Fuente canónica:** SKILL.md (nueva subsección en File Structure, o link a conventions.md)

**Decisión:** Las convenciones de nombrado viven en conventions.md (reference). SKILL.md solo las resume y enlaza.

**Acciones:**
- SKILL.md: Agregar resumen de naming (kebab-case, lowercase, YYYY-MM-DD) + link a conventions.md
- conventions.md: Ya las tiene, verificar completitud

### LAW 4 — Jerarquía (la más rota)

**Fuente canónica:** SKILL.md (debe definirla al inicio como el Level 1)

**Decisión:** La jerarquía se define en SKILL.md porque es el motor. Cada nivel se auto-identifica.

**Acciones:**
- SKILL.md: Agregar al inicio "This is Level 1 of THYROX hierarchy"
- CLAUDE.md: Agregar "This is Level 2 — bridge between SKILL and project"
- README.md: Ya la tiene (tabla), solo verificar consistencia

### LAW 5 — Dónde van los outputs

**Fuente canónica:** SKILL.md (sección "Where Outputs Live")

**Decisión sobre doble uso:**
- `context/analysis/` — se usa en Phase 1 Y Phase 7. Esto es correcto porque ambas fases producen análisis. La distinción se hace por **nombre del archivo**, no por subcarpeta.
- `context/work-logs/` — se usa en Phase 6. No en Phase 1 (Phase 1 produce analysis, no work-logs).

**Acciones:**
- Clarificar en SKILL.md que analysis/ es para Phase 1 + Phase 7
- Clarificar que work-logs/ es solo Phase 6 (ejecución)

---

## Patrón de corrección

Para cada violación:
1. Corregir la **fuente canónica** (SKILL.md) primero
2. Propagar a los archivos secundarios (CLAUDE.md, README.md, etc.)
3. Verificar con grep que no queden formas inconsistentes

---

## Siguiente Paso

→ Phase 3: PLAN — Definir el plan concreto de cambios en ROADMAP.md
