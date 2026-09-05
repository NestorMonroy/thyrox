```yml
Tipo: Análisis de Referencias
Categoría: Revisión de Coherencia
Versión: 1.0
Fecha: 2026-03-27
Propósito: Análisis detallado de los 20 archivos en references/
Relacionado: project-analysis.md
```

# Análisis de References - THYROX

## Resumen

20 archivos en `.claude/skills/pm-thyrox/references/` analizados.
Organizados por fase del framework y función.

---

## 1. Phase 1: ANALYZE (9 archivos)

### Flujo documentado en introduction.md

```
introduction → requirements-analysis → quality-goals → stakeholders
→ basic-usage → constraints → context
```

**Veredicto:** El flujo es lógico y cada archivo apunta correctamente al siguiente.

### Archivo por archivo

| Archivo | Contenido | Transición | Estado |
|---------|-----------|------------|--------|
| introduction.md | Meta-guía que explica las 7 subsecciones de ANALYZE | → requirements-analysis | OK, pero mezcla "PHASE 1" y "PHASE 2" en su texto |
| requirements-analysis.md | Requisitos en 2 niveles (general + específico), matriz de trazabilidad | → quality-goals | OK |
| requirements.md | **Copia idéntica** de requirements-analysis.md | → quality-goals | RESIDUO (ver sección 4) |
| quality-goals.md | Objetivos de calidad priorizados (Critical/Important/Desirable) | → stakeholders | OK |
| stakeholders.md | Identificación de roles, necesidades, conflictos | → basic-usage | OK |
| basic-usage.md | Cómo funciona el sistema desde perspectiva usuario | → constraints | OK |
| constraints.md | 5 tipos de limitaciones (técnicas, plataforma, org, regulatorio, negocio) | → context | OK |
| context.md | Límites del sistema y sistemas externos | → PHASE 2: SOLUTION | OK, pero metadata dice "PHASE 2: SOLUTION_STRATEGY" cuando pertenece a PHASE 1 |
| use-cases.md | Formato de casos de uso (actor, flujo, postcondiciones) | sin transición | HUÉRFANO: no está integrado en el flujo de introduction.md |

### Problemas detectados en Phase 1

1. **introduction.md** mezcla "PHASE 1" y "PHASE 2" para referirse a ANALYZE
2. **context.md** tiene metadata que dice "PHASE 2: SOLUTION_STRATEGY" pero es parte de PHASE 1
3. **use-cases.md** existe pero introduction.md no lo menciona en su flujo de 7 subsecciones
4. **requirements.md** es residuo de un renombrado incompleto (ver sección 4)

---

## 2. Phase 2-7: Estrategia, Estructura, Ejecución (6 archivos)

| Archivo | Phase | Contenido | Estado |
|---------|-------|-----------|--------|
| solution-strategy.md | Phase 2: SOLUTION_STRATEGY | Plan arquitectónico, decisiones, tech stack | OK (fecha interna inconsistente) |
| spec-driven-development.md | Phase 4: STRUCTURE | Metodología spec-driven con 4 sub-fases | HEADER INCORRECTO (ver sección 5) |
| conventions.md | General (todas las phases) | Convenciones de archivos, commits, ROADMAP | OK (duplica algo de SKILL.md) |
| examples.md | General (todas las phases) | 8 casos de uso prácticos del framework | OK |
| incremental-correction.md | Phase 7: TRACK | Metodología para corregir 100+ issues | HEADER INCORRECTO (ver sección 5) |
| commit-convention.md | Phase 6: EXECUTE | Especificación de Conventional Commits | OK |
| commit-helper.md | Phase 6: EXECUTE | Guía práctica de commits en PM-THYROX | OK |

### commit-convention.md vs commit-helper.md

**No son duplicados.** Son complementarios:
- **commit-convention.md** = la especificación (qué es un commit convencional)
- **commit-helper.md** = la guía práctica (cómo hacer commits en THYROX)

---

## 3. Archivos genéricos Anthropic/ADT (3 archivos)

| Archivo | Origen | Contenido | Relación con THYROX |
|---------|--------|-----------|---------------------|
| prompting-tips.md | Anthropic Best Practices | Tips de prompting para Claude, todos los ejemplos son del proyecto "ADT" | Ninguna directa |
| long-context-tips.md | Anthropic Best Practices | Manejo de documentos largos, ejemplos de ADT (Sphinx, traducción) | Ninguna directa |
| skill-authoring.md | Anthropic Best Practices | Cómo crear skills de calidad, 20+ referencias a ADT | Ninguna directa |

**Observación:** Estos 3 archivos (~54,000 caracteres) son guías genéricas de Anthropic adaptadas a un proyecto llamado "ADT" (Architecture Documentation Template). No mencionan THYROX. Están en la carpeta de THYROX porque se usaron para construir el framework, pero no son parte de la metodología.

**No son inútiles** — contienen buenas prácticas reales. Pero su ubicación dentro de `references/` sugiere que son guías específicas de THYROX cuando no lo son.

---

## 4. Caso requirements.md: Residuo de renombrado

### Historia (documentada en work-log template)

Se decidió separar `requirements.md` en dos documentos:

| Documento | Phase | Propósito |
|-----------|-------|-----------|
| requirements-analysis.md | Phase 1: ANALYZE | QUÉ necesita el sistema |
| requirements-specification.md | Phase 4: STRUCTURE | CÓMO se especifica técnicamente |

### Estado de la separación

| Elemento | Acción planeada | Estado |
|----------|----------------|--------|
| requirements-analysis.md (referencia) | Crear | Hecho |
| requirements-analysis.md.template | Crear | Hecho |
| requirements-specification.md.template | Crear | Hecho |
| requirements.md (referencia) | Eliminar | **No se hizo** |
| requirements.md.template | Eliminar | **No se hizo** |

### Resultado

`requirements.md` y `requirements.md.template` son residuos. El contenido de `requirements.md` es idéntico byte a byte a `requirements-analysis.md`.

---

## 5. Numeración de fases inconsistente en headers

### El problema

Tres archivos tienen metadata YAML que indica una fase incorrecta:

| Archivo | Header dice | Debería decir | Por qué |
|---------|------------|---------------|---------|
| spec-driven-development.md | "PHASE 4" | "Opción dentro de Phase 4: STRUCTURE" | Tiene sub-fases "FASE 1-4" que confunden con el framework principal |
| incremental-correction.md | "PHASE 7" | "Phase 7: TRACK" (pero el texto interno dice "PHASE 5") | Conflicto entre header y contenido |
| context.md | "PHASE 2: SOLUTION_STRATEGY" | "PHASE 1: ANALYZE" | Es la 7ma subsección de ANALYZE, no parte de SOLUTION_STRATEGY |
| introduction.md | Mezcla "PHASE 1" y "PHASE 2" | "PHASE 1: ANALYZE" | Debería ser consistente |

### Sub-fases de spec-driven-development.md

Este archivo usa "FASE 1-4" para su workflow interno:
```
FASE 1: Requirements (QUÉ necesitas)
FASE 2: Design (CÓMO lo implementarás)
FASE 3: Tasks (PASOS exactos)
FASE 4: Implementation (EJECUTA)
```

Esto NO son las 7 fases del framework principal, pero la numeración idéntica genera confusión.

---

## 6. Acciones correctivas

### Prioridad 1: Limpiar residuos
- [x] Eliminar `requirements.md` (residuo de renombrado)
- [x] Eliminar `requirements.md.template` (residuo de renombrado)

### Prioridad 2: Corregir headers de fases
- [x] context.md: Cambiar metadata de "PHASE 2: SOLUTION_STRATEGY" a "PHASE 1: ANALYZE"
- [x] introduction.md: Unificar a "PHASE 1: ANALYZE"
- [x] incremental-correction.md: Resolver conflicto PHASE 7 vs PHASE 5
- [x] spec-driven-development.md: Clarificar que es opción dentro de Phase 4

### Prioridad 3: Integrar use-cases.md
- [x] Decidir: ¿Agregar al flujo de introduction.md o mantener como referencia independiente?

### Prioridad 4: Resolver posición de genéricos
- [x] Decidir: ¿Mover prompting-tips, long-context-tips, skill-authoring a otra ubicación?
- [x] O: ¿Adaptarlos con ejemplos de THYROX?

---

**Última actualización:** 2026-03-27
