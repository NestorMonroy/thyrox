```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
Resuelve: ERR-026 + ERR-027
```

# Análisis: Mapeo de References y Templates

## 20 References — Cuándo se usa cada una

### Phase 1: ANALYZE (8 references)

| Reference | Líneas | Cuándo leer | Qué resuelve |
|-----------|--------|-------------|-------------|
| introduction.md | 181 | Al iniciar Phase 1 — es el router a las 7 subsecciones | Entender la estructura de análisis |
| requirements-analysis.md | 233 | Cuando se documentan requisitos funcionales/no-funcionales | Formato de requisitos en 2 niveles (general + específico) |
| use-cases.md | 124 | Cuando se documentan flujos usuario-sistema | Formato de casos de uso (actor, flujo, postcondiciones) |
| quality-goals.md | 230 | Cuando se definen objetivos de calidad | Priorización Critical/Important/Desirable con scenarios |
| stakeholders.md | 328 | Cuando se identifican roles y necesidades | Matriz de stakeholders con conflictos y resoluciones |
| basic-usage.md | 318 | Cuando se documenta cómo funciona el sistema | Flujo operacional desde perspectiva usuario |
| constraints.md | 322 | Cuando se identifican limitaciones | 5 tipos: técnico, plataforma, org, regulatorio, negocio |
| context.md | 326 | Cuando se definen límites y sistemas externos | Business context + technical context + diagrama |

**Solapamiento:** Ninguno. Cada una cubre una subsección distinta de ANALYZE.
**Legacy:** Ninguna. Todas son activas y necesarias para Phase 1 completa.

### Phase 2: SOLUTION_STRATEGY (1 reference)

| Reference | Líneas | Cuándo leer | Qué resuelve |
|-----------|--------|-------------|-------------|
| solution-strategy.md | 428 | Cuando se toman decisiones arquitectónicas | Research step + decisiones + tech stack + patterns |

**Necesita TOC:** Sí (428 líneas > 300).

### Phase 4: STRUCTURE (1 reference)

| Reference | Líneas | Cuándo leer | Qué resuelve |
|-----------|--------|-------------|-------------|
| spec-driven-development.md | 619 | Cuando un feature es complejo (10+ tareas) | Metodología de 4 pasos para specs complejas |

**Necesita TOC:** Sí (619 líneas > 300).

### Phase 6: EXECUTE (2 references)

| Reference | Líneas | Cuándo leer | Qué resuelve |
|-----------|--------|-------------|-------------|
| commit-helper.md | 323 | Cuando se hacen commits | Guía práctica de Conventional Commits + templates |
| commit-convention.md | 295 | Cuando se necesita la especificación formal | Estándar completo de Conventional Commits |

**Solapamiento:** SÍ. commit-helper es la guía práctica y commit-convention es la especificación. Podrían consolidarse pero cumplen roles diferentes (helper = cómo, convention = qué).

### Phase 7: TRACK (2 references)

| Reference | Líneas | Cuándo leer | Qué resuelve |
|-----------|--------|-------------|-------------|
| reference-validation.md | 232 | Cuando se valida integridad de referencias | Guía del script validate-references |
| incremental-correction.md | 542 | Cuando hay 100+ issues que corregir | Metodología de corrección a gran escala |

**Necesita TOC:** incremental-correction.md sí (542 líneas > 300).

### Cross-phase (3 references)

| Reference | Líneas | Cuándo leer | Qué resuelve |
|-----------|--------|-------------|-------------|
| conventions.md | 452 | Cuando se necesitan convenciones de archivos, commits, ROADMAP | Naming, estructura, priority mapping, traceability IDs |
| scalability.md | 183 | Cuando se elige qué fases usar según complejidad | Quick/Standard/Full modes + sub-agents + metrics |
| examples.md | 558 | Cuando se buscan ejemplos prácticos de uso | 8 casos de uso reales del framework |

**Necesita TOC:** conventions.md (452) y examples.md (558) sí.

### Avanzado (3 references — genéricos Anthropic)

| Reference | Líneas | Cuándo leer | Qué resuelve | ¿Es específico de PM? |
|-----------|--------|-------------|-------------|----------------------|
| prompting-tips.md | 645 | Cuando Claude no entiende instrucciones | Best practices de prompting | NO — genérico |
| long-context-tips.md | 658 | Cuando se trabaja con docs >5000 palabras | Manejo de contexto largo | NO — genérico |
| skill-authoring.md | 839 | Cuando se crea o mejora un skill | Guía de creación de skills | NO — genérico |

**Necesitan TOC:** Las 3 (>300 líneas).
**Son legacy del proyecto ADT:** Sí, adaptadas a THYROX pero el contenido es genérico de Anthropic.
**¿Eliminar?** NO — son útiles como referencia avanzada. Pero no son core del PM skill.

---

## Resumen de references

| Categoría | Cantidad | Líneas total | Necesitan TOC |
|-----------|----------|-------------|---------------|
| Phase 1: ANALYZE | 8 | 2,062 | 1 (stakeholders 328) |
| Phase 2: SOLUTION | 1 | 428 | 1 |
| Phase 4: STRUCTURE | 1 | 619 | 1 |
| Phase 6: EXECUTE | 2 | 618 | 1 (commit-helper 323) |
| Phase 7: TRACK | 2 | 774 | 1 (incremental 542) |
| Cross-phase | 3 | 1,193 | 2 (conventions 452, examples 558) |
| Avanzado (genérico) | 3 | 2,142 | 3 |
| **Total** | **20** | **7,836** | **10 necesitan TOC** |

**Solapamiento identificado:** commit-helper + commit-convention (complementarios, no duplicados).
**Legacy:** prompting-tips, long-context-tips, skill-authoring (genéricos pero útiles).

---

## 32 Templates — Cuándo se usa cada uno

### Templates de Phase 1: ANALYZE (8 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| introduction.md.template | 59 | Al iniciar Phase 1 | Copiar a work/.../spec.md o work/.../analysis/ |
| requirements-analysis.md.template | 102 | Cuando se documentan requisitos | Copiar y llenar tabla de requisitos R-N |
| use-cases.md.template | 89 | Cuando se documentan casos de uso | Copiar y llenar UC-NNN |
| quality-goals.md.template | 103 | Cuando se definen quality goals | Copiar y llenar Priority 1/2/3 |
| stakeholders.md.template | 138 | Cuando se identifican stakeholders | Copiar y llenar matriz de roles |
| basic-usage.md.template | 171 | Cuando se documenta uso operacional | Copiar y llenar flujo + modos |
| constraints.md.template | 147 | Cuando se identifican constraints | Copiar y llenar 5 categorías |
| context.md.template | 157 | Cuando se define contexto externo | Copiar y llenar business + technical context |

### Templates de Phase 2: SOLUTION_STRATEGY (1 template)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| solution-strategy.md.template | 252 | Cuando se crea plan arquitectónico | Copiar y llenar key ideas + decisions + stack |

### Templates de Phase 4: STRUCTURE (3 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| requirements-specification.md.template | 149 | Para specs técnicas detalladas | Copiar y llenar SPEC-NNN |
| design.md.template | 285 | Para documento de diseño | Copiar y llenar decisiones + componentes |
| tasks.md.template | 371 | Para descomposición de tareas | Copiar y llenar TASK-NNN por fase |

### Templates de Phase 6: EXECUTE — Commits (7 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| commit-message-main.template | 127 | Referencia completa de formato de commit | Consultar formato, no copiar |
| feature.template | 33 | Commit de nueva feature | Seguir formato `feat(scope): desc` |
| bugfix.template | 41 | Commit de bug fix | Seguir formato `fix(scope): desc` |
| refactor.template | 43 | Commit de refactoring | Seguir formato `refactor(scope): desc` |
| documentation.template | 38 | Commit de documentación | Seguir formato `docs(scope): desc` |
| task-completion.template | 59 | Commit que completa tarea PM-THYROX | Seguir formato con referencia a task |
| multiple-files.template | 55 | Commit con múltiples archivos | Seguir formato con lista de cambios |

### Templates de Phase 7: TRACK — Corrección incremental (4 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| analysis-phase.md.template | 253 | Cuando se analizan 100+ issues | Copiar para fase de análisis |
| categorization-plan.md.template | 383 | Cuando se categorizan issues en lotes | Copiar para plan de categorización |
| execution-log.md.template | 391 | Cuando se ejecutan correcciones | Copiar para log de ejecución |
| final-report.md.template | 447 | Cuando se cierra corrección incremental | Copiar para reporte final |

### Templates de proceso (5 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| EXIT_CONDITIONS.md.template | 289 | Para proyectos >8h que necesitan gates formales | Copiar al inicio del proyecto |
| constitution.md.template | 91 | Cuando un proyecto define principios inmutables | Copiar y llenar principios + constraints |
| epic.md.template | 267 | Cuando un trabajo es grande (multi-feature) | Copiar a work/.../epic.md |
| spec-quality-checklist.md.template | 78 | En Phase 4 para validar specs | Copiar y verificar items |
| project.json.template | 141 | Para proyectos que trackean métricas por fase | Copiar y llenar por fase |

### Templates de tracking (2 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| AD_HOC_TASKS.md.template | 77 | Para tareas ad-hoc fuera del flujo formal | Copiar cuando hay tasks sueltas |
| REFACTORS.md.template | 102 | Para registrar tech debt y refactors pendientes | Copiar cuando se identifica tech debt |

### Templates generales (2 templates)

| Template | Líneas | Cuándo usar | Cómo usar |
|----------|--------|-------------|-----------|
| adr.md.template | 185 | Cuando se toma una decisión arquitectónica | Copiar a context/decisions/adr-NNN.md |
| document.md.template | 133 | Para cualquier documento que no tenga template específico | Copiar como base genérica |

---

## Resumen de templates

| Categoría | Cantidad | Líneas total |
|-----------|----------|-------------|
| Phase 1: ANALYZE | 8 | 966 |
| Phase 2: SOLUTION | 1 | 252 |
| Phase 4: STRUCTURE | 3 | 805 |
| Phase 6: Commits | 7 | 396 |
| Phase 7: Corrección | 4 | 1,474 |
| Proceso | 5 | 866 |
| Tracking | 2 | 179 |
| Generales | 2 | 318 |
| **Total** | **32** | **5,256** |

---

## Tests adicionales derivados de este análisis

### Trigger tests para references

| ID | Query | Should trigger? | Reference esperada |
|----|-------|----------------|-------------------|
| TE-21 | "Tengo que documentar los requisitos del nuevo módulo de pagos" | Sí | requirements-analysis.md |
| TE-22 | "¿Cuáles son las limitaciones técnicas que tenemos?" | Sí | constraints.md |
| TE-23 | "Necesito hacer un commit de esta feature" | No (directo, no PM) | — |
| TE-24 | "Tenemos 200 warnings en el build, cómo los corrijo organizadamente?" | Sí | incremental-correction.md |

### Trigger tests para templates

| ID | Query | Should trigger? | Template esperado |
|----|-------|----------------|------------------|
| TE-25 | "Tomamos la decisión de usar PostgreSQL en vez de MongoDB, documéntala" | Sí | adr.md.template |
| TE-26 | "Este feature de notificaciones es complejo, necesito una spec detallada" | Sí | design.md.template + requirements-specification.md.template |
| TE-27 | "El proyecto necesita definir sus principios antes de empezar" | Sí | constitution.md.template |
| TE-28 | "Hay muchas tareas pendientes sin organizar" | Sí | AD_HOC_TASKS.md.template |

---

**Última actualización:** 2026-03-28
