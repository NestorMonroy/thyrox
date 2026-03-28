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
2. Crear work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`
3. Documentar hallazgos en `work/.../analysis/`
4. Si hay decisiones arquitectónicas, crear ADR en `context/decisions/` usando `assets/adr.md.template`

Las 8 subsecciones de análisis (leer cuando se necesite profundidad, usar `assets/introduction.md.template` como formato de output):
[introduction](references/introduction.md), [requirements-analysis](references/requirements-analysis.md), [use-cases](references/use-cases.md), [quality-goals](references/quality-goals.md), [stakeholders](references/stakeholders.md), [basic-usage](references/basic-usage.md), [constraints](references/constraints.md), [context](references/context.md)

**Salir cuando:** Los hallazgos están documentados y aprobados por el usuario.
**Siguiente:** Proponer Phase 2. Si no requiere decisiones arquitectónicas, proponer saltar a Phase 3.
**Detectar:** Si `work/.../analysis/` tiene hallazgos documentados, Phase 1 ya completó.

### Phase 2: SOLUTION_STRATEGY

Investigar alternativas antes de decidir previene decisiones sin evidencia.

1. **Key Ideas** — definir los conceptos centrales que guían la solución
2. **Research** — listar unknowns → investigar alternativas → documentar pros/cons por cada uno
3. **Pre-design check** — verificar que las decisiones respetan los principios del proyecto
4. **Decisions** — documentar decisiones fundamentales con justificación. Usar `assets/adr.md.template` para decisiones arquitectónicas
5. **Post-design re-check** — re-verificar después de diseñar (las decisiones pueden cambiar al profundizar)

Ver [solution-strategy](references/solution-strategy.md) para estructura completa (Tech Stack, Patterns, Quality Goals).

**Salir cuando:** Arquitectura aprobada con investigación documentada.
**Siguiente:** Proponer Phase 3: PLAN para definir scope y linkear work package en ROADMAP.
**Detectar:** Si `work/.../spec.md` tiene decisiones arquitectónicas, Phase 2 ya completó.

### Phase 3: PLAN

Definir scope antes de estructurar previene scope creep.

1. Brainstorm: ¿qué problema? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera?
2. Verificar que el work package existe (creado en Phase 1). Para trabajo grande que agrupa múltiples features, usar `assets/epic.md.template`
3. Actualizar ROADMAP.md con features y link al work package
4. Obtener aprobación del scope

**Salir cuando:** ROADMAP actualizado y scope aprobado.
**Siguiente:** Proponer Phase 4: STRUCTURE para especificar antes de descomponer.
**Detectar:** Si ROADMAP.md tiene el work package linkeado, Phase 3 ya completó.

### Phase 4: STRUCTURE

Especificar antes de descomponer previene ambigüedad en las tareas.

**Simple** (<10 tareas): Crear spec.md con overview, user stories, acceptance criteria.
**Complejo** (10+ tareas): Ver [spec-driven-development](references/spec-driven-development.md).

Verificar que no queden marcadores [NEEDS CLARIFICATION] sin resolver — la ambigüedad en specs se multiplica en la implementación. Usar `assets/spec-quality-checklist.md.template` como gate antes de avanzar a Phase 5.

**Salir cuando:** Specs aprobadas, checklist pasado, sin ambigüedades.
**Siguiente:** Proponer Phase 5: DECOMPOSE para crear tareas atómicas.
**Detectar:** Si `work/.../spec.md` tiene user stories y acceptance criteria, Phase 4 ya completó.

### Phase 5: DECOMPOSE

Tareas atómicas con trazabilidad previenen trabajo duplicado o perdido.

1. Leer spec.md del work package. Si el usuario pide descomposición directa sin spec previo,
   crear work package y descomponer desde la descripción del usuario — no cuestionar si el proyecto existe en el repo
2. Crear lista de tareas con IDs trazables — cada tarea necesita un ID y referencia a su requisito
   porque esto permite detectar tareas huérfanas (sin requisito) o requisitos sin cobertura.
   Formato: `- [ ] [T-NNN] Descripción (R-N)`
3. Marcar tareas paralelas [P]
4. Definir checkpoints de validación
5. Guardar en `work/.../plan.md` o `work/.../tasks.md`

**Salir cuando:** Tareas atómicas con orden definido.
**Siguiente:** Proponer Phase 6: EXECUTE para implementar.
**Detectar:** Si `work/.../plan.md` tiene checkboxes `- [ ] [T-NNN]`, Phase 5 ya completó.

### Phase 6: EXECUTE

Commits frecuentes con mensajes descriptivos crean un historial navegable.

1. Tomar siguiente tarea sin bloqueos
2. Implementar el cambio. Si falla, crear ERR-NNN antes de reintentar con otro approach
3. No commitear archivos temporales, binarios ni backups — usar /tmp/ para efímeros
4. Commit con [Conventional Commits](references/commit-helper.md): `type(scope): description`
5. Actualizar ROADMAP.md: `[ ]` → `[x]` con fecha
6. Repetir hasta completar todas las tareas

**Salir cuando:** Todas las tareas completadas y commiteadas.
**Siguiente:** Proponer Phase 7: TRACK para documentar lecciones.
**Detectar:** Si todas las checkboxes en `plan.md` están `[x]`, Phase 6 ya completó.

### Phase 7: TRACK

Documentar lecciones previene repetir los mismos errores.

- Revisar progreso desde ROADMAP.md + commits recientes. Si hay work package activo con plan.md,
  identificar la siguiente tarea incompleta y sugerirla como acción concreta
- Generar changelog desde commits → CHANGELOG.md
- Documentar lecciones aprendidas en `work/.../lessons.md`
- Si hay 100+ issues: ver [incremental-correction](references/incremental-correction.md)
- Validar integridad: ver [reference-validation](references/reference-validation.md)
- Gate soft antes de avanzar de fase: `bash scripts/validate-phase-readiness.sh <phase>`
- Verificar que no quedaron archivos temporales fuera de `context/work/`
- Validar cierre de sesión: `bash scripts/validate-session-close.sh`
- Resumen rápido del estado: `bash scripts/project-status.sh`

**Salir cuando:** Análisis completo y lecciones documentadas.

---

## Dónde viven los artefactos

| Fase | Artefacto | Ubicación |
|------|-----------|-----------|
| 1 | Análisis | `work/.../analysis/` |
| 1-2 | Decisiones | `context/decisions/adr-NNN.md` |
| 1 | Work package | `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` |
| 4 | Especificación | `work/.../spec.md` |
| 5 | Tareas | `work/.../plan.md` o `work/.../tasks.md` |
| 6 | Código | Repositorio (git) |
| 7 | Lecciones | `work/.../lessons.md` |
| — | Errores | `context/errors/ERR-NNN-descripcion.md` |
| — | Templates | `assets/*.md.template` (usar como base para nuevos artefactos) |
| — | Doc base | `assets/document.md.template` (template genérico para cualquier documento) |
| — | Principios | `assets/constitution.md.template` (principios inmutables del proyecto) |

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
