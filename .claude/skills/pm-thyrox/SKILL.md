```yml
name: pm-thyrox
description: "Framework de gestión de proyectos con metodología SDLC de 7 fases. Usar este skill cuando el usuario quiera planificar, analizar, diseñar, organizar, trackear o gestionar CUALQUIER tipo de trabajo — features, bug fixes, refactoring, documentación, investigación o setup de proyecto. También usar cuando el usuario pregunte '¿qué hago primero?', '¿cómo organizo esto?', '¿cuál es el estado?', 'crea un plan para X', 'analiza X', 'descompón X en tareas', 'documenta esta decisión', o cualquier cosa relacionada con workflow de proyecto, tracking de trabajo, registros de decisiones o desarrollo estructurado. Siempre empezar con ANALYZE antes de planificar."
```

# PM-THYROX: Gestión de Proyectos

Framework de gestión para organizar trabajo de cualquier tamaño con Claude Code. Sigue una metodología de 7 fases donde entender viene antes que planificar, y planificar viene antes que ejecutar.

**Principio core:** Analizar antes de actuar. Cada fase produce artefactos que alimentan la siguiente. Saltar fases produce trabajo sin fundamento.

**Escala:** Trabajos <2h usan fases 1, 2, 6, 7. Trabajos de 2-8h usan las 7. Ver [escalabilidad](references/scalability.md) para detalles.

---

## Las 7 Fases

### Phase 1: ANALYZE

Entender el problema antes de proponer soluciones evita construir lo incorrecto.

1. Investigar requisitos, stakeholders, constraints y contexto
2. Documentar hallazgos en `work/.../analysis/`
3. Si hay decisiones arquitectónicas, crear ADR en `context/decisions/`

Las 8 subsecciones de análisis (leer cuando se necesite profundidad):
[introduction](references/introduction.md), [requirements-analysis](references/requirements-analysis.md), [use-cases](references/use-cases.md), [quality-goals](references/quality-goals.md), [stakeholders](references/stakeholders.md), [basic-usage](references/basic-usage.md), [constraints](references/constraints.md), [context](references/context.md)

**Salir cuando:** Los hallazgos están documentados y aprobados por el usuario.

### Phase 2: SOLUTION_STRATEGY

Investigar alternativas antes de decidir previene decisiones sin evidencia.

1. Listar unknowns → investigar alternativas → documentar pros/cons
2. Verificar que las decisiones respetan los principios del proyecto
3. Documentar decisiones con justificación
4. Re-verificar después de diseñar (las decisiones pueden cambiar al profundizar)

Ver [solution-strategy](references/solution-strategy.md) para la guía completa.

**Salir cuando:** Arquitectura aprobada con investigación documentada.

### Phase 3: PLAN

Definir scope antes de estructurar previene scope creep.

1. Brainstorm: ¿qué problema? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera?
2. Crear work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`
3. Actualizar ROADMAP.md con features y link al work package
4. Obtener aprobación del scope

**Salir cuando:** ROADMAP actualizado y scope aprobado.

### Phase 4: STRUCTURE

Especificar antes de descomponer previene ambigüedad en las tareas.

**Simple** (<10 tareas): Crear spec.md con overview, user stories, acceptance criteria.
**Complejo** (10+ tareas): Ver [spec-driven-development](references/spec-driven-development.md).

Verificar que no queden marcadores [NEEDS CLARIFICATION] sin resolver — la ambigüedad en specs se multiplica en la implementación.

**Salir cuando:** Specs aprobadas y sin ambigüedades.

### Phase 5: DECOMPOSE

Tareas atómicas con trazabilidad previenen trabajo duplicado o perdido.

1. Leer spec.md del work package
2. Crear lista de tareas: `- [ ] [T-NNN] Descripción (R-N)` — cada tarea referencia su requisito
3. Marcar tareas paralelas [P]
4. Definir checkpoints de validación
5. Guardar en `work/.../plan.md` o `work/.../tasks.md`

**Salir cuando:** Tareas atómicas con orden definido.

### Phase 6: EXECUTE

Commits frecuentes con mensajes descriptivos crean un historial navegable.

1. Tomar siguiente tarea sin bloqueos
2. Implementar el cambio
3. Commit con [Conventional Commits](references/commit-helper.md): `type(scope): description`
4. Actualizar ROADMAP.md: `[ ]` → `[x]` con fecha
5. Repetir hasta completar todas las tareas

**Salir cuando:** Todas las tareas completadas y commiteadas.

### Phase 7: TRACK

Documentar lecciones previene repetir los mismos errores.

- Revisar progreso desde ROADMAP.md + commits recientes
- Generar changelog desde commits → CHANGELOG.md
- Documentar lecciones aprendidas en `work/.../lessons.md`
- Si hay 100+ issues: ver [incremental-correction](references/incremental-correction.md)
- Validar integridad: ver [reference-validation](references/reference-validation.md)

**Salir cuando:** Análisis completo y lecciones documentadas.

---

## Dónde viven los artefactos

| Fase | Artefacto | Ubicación |
|------|-----------|-----------|
| 1 | Análisis | `work/.../analysis/` |
| 1-2 | Decisiones | `context/decisions/adr-NNN.md` |
| 3 | Work package | `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` |
| 4 | Especificación | `work/.../spec.md` |
| 5 | Tareas | `work/.../plan.md` o `work/.../tasks.md` |
| 6 | Código | Repositorio (git) |
| 7 | Lecciones | `work/.../lessons.md` |
| — | Errores | `context/errors/ERR-NNN-descripcion.md` |

## Estructura de un work package

```
context/work/YYYY-MM-DD-HH-MM-SS-nombre/
├── analysis/        ← Si necesitó análisis (Phase 1)
├── spec.md          ← Qué y por qué (Phase 4)
├── plan.md          ← Tareas con checkboxes (Phase 5)
├── tasks.md         ← Solo si hay 10+ tareas
└── lessons.md       ← Lecciones aprendidas (Phase 7)
```

No todos los paquetes necesitan todos los archivos. Un fix rápido puede tener solo plan.md.

**Cuándo crear un work package:**
- Trabajo involucra múltiples archivos o fases
- Tiene consecuencias de decisión
- Dura más de 30 minutos
- Produce lecciones

## Naming

```
Archivos:        kebab-case.md
Work packages:   YYYY-MM-DD-HH-MM-SS-nombre/
Commits:         type(scope): description
ADRs:            adr-NNN.md
Tareas:          [T-NNN] Descripción (R-N)
Errores:         ERR-NNN-descripcion.md
```

Ver [conventions](references/conventions.md) para detalles completos.

---

## References por dominio

### Phase 1: ANALYZE (leer cuando se investiga un problema)
[introduction](references/introduction.md) · [requirements-analysis](references/requirements-analysis.md) · [use-cases](references/use-cases.md) · [quality-goals](references/quality-goals.md) · [stakeholders](references/stakeholders.md) · [basic-usage](references/basic-usage.md) · [constraints](references/constraints.md) · [context](references/context.md)

### Phase 2: SOLUTION (leer cuando se toman decisiones arquitectónicas)
[solution-strategy](references/solution-strategy.md)

### Phase 4: STRUCTURE (leer cuando se crean especificaciones complejas)
[spec-driven-development](references/spec-driven-development.md)

### Phase 6: EXECUTE (leer cuando se hacen commits)
[commit-helper](references/commit-helper.md) · [commit-convention](references/commit-convention.md)

### Phase 7: TRACK (leer cuando se valida o corrige)
[reference-validation](references/reference-validation.md) · [incremental-correction](references/incremental-correction.md)

### Cross-phase (leer según necesidad)
[conventions](references/conventions.md) — Convenciones de archivos, commits, ROADMAP
[scalability](references/scalability.md) — Cómo escalar el framework según complejidad
[examples](references/examples.md) — 8 casos de uso reales

### Avanzado (leer cuando Claude tiene dificultades)
[prompting-tips](references/prompting-tips.md) — Cuando Claude no entiende instrucciones
[long-context-tips](references/long-context-tips.md) — Documentos >5,000 palabras
[skill-authoring](references/skill-authoring.md) — Crear o mejorar skills
