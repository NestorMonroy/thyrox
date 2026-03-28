```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: 5 Correcciones al SKILL desde errores de grokputer

## C1: Regla contra archivos temporales/binarios

### Unknown: ¿Dónde poner la regla?

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | En Phase 6: EXECUTE como paso adicional | Se lee cuando se commitea — momento justo | Agrega líneas al SKILL |
| B | En CLAUDE.md como locked decision #8 | Siempre visible, immutable | CLAUDE.md crece (52→54 líneas) |
| C | En conventions.md como regla de commits | No agrega al SKILL, en el lugar "correcto" | Claude no la lee a menos que consulte conventions |
| D | En Phase 6 + .gitignore template | Doble protección: regla + enforcement | Requiere 2 cambios |

**Decisión: D — Phase 6 + .gitignore**
- La regla en Phase 6 es la guía (soft)
- El .gitignore es el enforcement (hard) — previene incluso si Claude ignora la regla
- **Justificación:** Graduated enforcement (AP-01) — lo mismo que decidimos para los otros riesgos

## C2: Documentar ERR antes de reintentar fix fallido

### Unknown: ¿Es una regla de Phase 6 o Phase 7?

**Análisis:** El fix-script cycling ocurre DURANTE la ejecución (Phase 6), no durante el tracking (Phase 7). El usuario implementa algo, falla, y reintenta sin documentar.

**Decisión: Phase 6 como nota en paso 2**
- Agregar después de "Implementar el cambio": "Si la implementación falla, documentar en ERR-NNN antes de reintentar con otro approach"
- **Justificación:** Es una regla de ejecución, no de tracking. Se lee en el momento preciso.

## C3: Cleanup al cerrar work package

### Unknown: ¿Es Phase 7 o validate-session-close.sh?

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Instrucción en Phase 7 | Se lee al cerrar | Solo soft |
| B | Check en validate-session-close.sh | Automated | No sabe qué es "temporal" |
| C | Instrucción en Phase 7 + manual check | Pragmático, el humano decide qué es temporal | No automated |

**Decisión: C — Instrucción en Phase 7**
- Agregar: "Verificar que no quedaron archivos temporales fuera de context/work/"
- No automatizar porque "temporal" es subjetivo — un script no sabe si `test.py` es temporal o permanente
- **Justificación:** Pragmatismo > overengineering

## C4: .gitignore robusto en template

### Unknown: ¿Agregar al repo actual o al setup-template.sh?

**Decisión: Al repo actual + setup-template.sh lo preserva**
- El `.gitignore` actual solo tiene `_archived/`. Necesita patrones para deps, binarios, backups, coverage.
- setup-template.sh NO toca .gitignore (no lo resetea), así que solo hay que mejorar el existente.
- **Justificación:** Enforcement real — git rechaza los archivos peligrosos sin importar si Claude lee la regla.

## C5: Buscar refs antes de borrar

### Unknown: ¿Es una regla del SKILL o de conventions.md?

**Decisión: conventions.md**
- Es una convención de mantenimiento, no un paso de una fase específica
- No se ejecuta en una fase particular — puede pasar en cualquier momento
- **Justificación:** No agregar peso al SKILL para un caso edge. conventions.md es el lugar natural.

---

## Resumen de decisiones

| Corrección | Dónde | Tipo | Líneas estimadas |
|-----------|-------|------|-----------------|
| C1: No temp/binarios | Phase 6 (1 línea) + .gitignore (~20 líneas) | Regla + enforcement | ~21 |
| C2: ERR antes de retry | Phase 6 paso 2 (1 línea) | Regla | ~1 |
| C3: Cleanup al cerrar | Phase 7 (1 línea) | Regla | ~1 |
| C4: .gitignore robusto | .gitignore del repo | Enforcement | ~20 |
| C5: Refs antes de borrar | conventions.md (2 líneas) | Convención | ~2 |

**SKILL.md:** 198 → ~201 líneas (bajo límite 500)

## Verificación contra principios

- [x] No agrega instruction bloat (3 líneas en SKILL)
- [x] Enforcement donde posible (.gitignore)
- [x] No duplica info (conventions.md para reglas de mantenimiento)
- [x] Graduated: hard (.gitignore) + soft (instrucciones)

## Siguiente

→ Phase 3+5: PLAN + DECOMPOSE
