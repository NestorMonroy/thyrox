```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
```

# Análisis del Flujo del SKILL

## Metodología

Verifiqué:
1. Todos los links markdown del SKILL.md (35 links)
2. Scripts referenciados (3 scripts)
3. Assets referenciados desde references (12 assets)
4. Assets huérfanos (no referenciados desde SKILL ni references)
5. Flujo lógico de creación del work package
6. Numeración de pasos
7. Estructura de Phase 2 vs solution-strategy.md

---

## Problemas encontrados

### P-01: Work package se crea en 3 lugares diferentes (CONTRADICCIÓN)

**Evidencia:**

| Lugar | Línea | Qué dice |
|-------|-------|----------|
| Phase 1 paso 2 | 23 | "Crear work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`" |
| Phase 3 paso 2 | 54 | "Si no se creó en Phase 1, crear work package..." |
| Phase 5 paso 1 | 79-80 | "Si el usuario pide descomposición directa sin spec previo, crear work package..." |
| Tabla artefactos | 132 | "Phase 3 → Work package" |

**Problema:** La tabla dice que el work package se crea en Phase 3, pero el paso está en Phase 1. Phase 5 también puede crearlo. Son 3 puntos de creación sin regla clara de cuál tiene prioridad.

**Causa raíz:** En la sesión anterior moví la creación de Phase 3 a Phase 1 (para resolver el fallo del eval FE-01) pero no actualicé la tabla de artefactos. Y Phase 5 tiene su propio caso de creación para descomposición directa.

**Impacto:** Claude no sabe si crear el work package en Phase 1, esperar a Phase 3, o dejarlo para Phase 5. El flujo es ambiguo.

---

### P-02: Numeración duplicada en Phase 6

**Evidencia (líneas 96-101):**
```
1. Tomar siguiente tarea sin bloqueos
2. Implementar el cambio. Si falla, crear ERR-NNN antes de reintentar
3. No commitear archivos temporales, binarios ni backups
4. Commit con Conventional Commits
4. Actualizar ROADMAP.md: [ ] → [x] con fecha    ← DUPLICADO
5. Repetir hasta completar todas las tareas
```

Hay dos pasos numerados "4". Falta el "5" original (ahora es 6).

---

### P-03: 6 assets huérfanos (sin referencia desde el flujo)

| Asset | ¿Referenciado? | Debería estar en |
|-------|----------------|-----------------|
| `adr.md.template` | Solo en decisions.md y trigger-evals.json | Phase 1 paso 4 (crear ADR) o Phase 2 |
| `constitution.md.template` | Solo en EXIT_CONDITIONS.md.template | No hay mención de constitution en el flujo |
| `document.md.template` | En ningún lugar | ¿Cuándo se usa? |
| `epic.md.template` | En ningún lugar | ¿Cuándo se usa? (ROADMAP no menciona epics) |
| `introduction.md.template` | En ningún lugar | ¿Phase 1 para documentar introducción? |
| `spec-quality-checklist.md.template` | Solo en EXIT_CONDITIONS.md.template | Phase 4 (verificar specs) — debería estar ahí |

**Impacto:** Un usuario del template no sabe cuándo usar estos 6 templates. No aparecen en ninguna fase del SKILL.

---

### P-04: Phase 2 no referencia la estructura de solution-strategy.md

**Evidencia (líneas 34-47):**
```
1. Listar unknowns → investigar alternativas → documentar pros/cons
2. Verificar que las decisiones respetan los principios del proyecto
3. Documentar decisiones con justificación
4. Re-verificar después de diseñar

Ver [solution-strategy](references/solution-strategy.md) para la guía completa.
```

**Problema:** La reference `solution-strategy.md` define una estructura de 5 secciones (Key Ideas, Fundamental Decisions, Tech Stack, Patterns, Quality Goals) + Research Step + pre/post design checks. Pero Phase 2 del SKILL no menciona esa estructura — solo dice "listar unknowns" y "documentar decisiones".

**Impacto:** Exactamente ERR-029: yo mismo hice Phase 2 sin seguir la estructura porque el SKILL no la referencia explícitamente. El "Ver solution-strategy.md para la guía completa" es fácil de ignorar.

---

### P-05: Phase 4 no referencia spec-quality-checklist.md.template

**Evidencia (líneas 62-73):**
```
**Simple** (<10 tareas): Crear spec.md con overview, user stories, acceptance criteria.
**Complejo** (10+ tareas): Ver spec-driven-development.md.

Verificar que no queden marcadores [NEEDS CLARIFICATION] sin resolver.
```

**Problema:** Existe `assets/spec-quality-checklist.md.template` para verificar calidad de specs, pero Phase 4 no lo menciona. Solo EXIT_CONDITIONS.md.template lo referencia.

**Impacto:** El checklist de calidad de specs no se usa porque nadie sabe que existe.

---

### P-06: Phase 1 no referencia adr.md.template

**Evidencia (línea 25):**
```
4. Si hay decisiones arquitectónicas, crear ADR en `context/decisions/`
```

Dice "crear ADR" pero no dice "usar `assets/adr.md.template`". El template existe y tiene la estructura correcta (Decision, Alternatives, Justification, Implications) pero Phase 1 no apunta a él.

---

### P-07: 3 assets sin caso de uso claro

| Asset | Contenido | Problema |
|-------|-----------|---------|
| `document.md.template` | Template genérico para documentar | No hay fase que diga "crear un documento" |
| `epic.md.template` | Template para epic con user stories | ROADMAP usa work packages, no epics — ¿cuándo se usa? |
| `introduction.md.template` | Template para introducción del proyecto | Phase 1 tiene 8 subsecciones pero no dice "crear introduction.md" |

---

### P-08: SKILL.md Phase 2 "Siguiente" dice "crear work package" pero debería decir "definir scope"

**Evidencia (línea 46):**
```
**Siguiente:** Proponer Phase 3: PLAN para definir scope y crear work package.
```

Pero si el work package se creó en Phase 1, Phase 3 no lo crea. El texto es misleading.

---

## Resumen

| # | Problema | Severidad | Tipo |
|---|---------|-----------|------|
| P-01 | Work package se crea en 3 lugares (Phase 1, 3, 5) | **Alta** | Contradicción de flujo |
| P-02 | Numeración duplicada (dos "4") en Phase 6 | **Media** | Bug cosmético |
| P-03 | 6 assets huérfanos sin referencia | **Alta** | Desconexión template↔flujo |
| P-04 | Phase 2 no referencia estructura de solution-strategy.md | **Alta** | Gap que causó ERR-029 |
| P-05 | Phase 4 no referencia spec-quality-checklist | **Media** | Asset útil invisible |
| P-06 | Phase 1 no referencia adr.md.template | **Media** | Asset útil invisible |
| P-07 | 3 assets sin caso de uso (document, epic, introduction) | **Baja** | Posibles candidatos a eliminar |
| P-08 | Phase 2 "Siguiente" misleading sobre work package | **Baja** | Texto inconsistente |

**Total:** 8 problemas (3 altos, 3 medios, 2 bajos)
