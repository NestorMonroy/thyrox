```yml
name: pm-thyrox
description: "Framework de gestión de proyectos con metodología SDLC de 7 fases. Usar este skill cuando el usuario quiera planificar, analizar, diseñar, organizar, trackear o gestionar CUALQUIER tipo de trabajo — features, bug fixes, refactoring, documentación, investigación o setup de proyecto. También usar cuando el usuario pregunte '¿qué hago primero?', '¿cómo organizo esto?', '¿cuál es el estado?', 'crea un plan para X', 'analiza X', 'descompón X en tareas', 'documenta esta decisión', o cualquier cosa relacionada con workflow de proyecto, tracking de trabajo, registros de decisiones o desarrollo estructurado. Siempre empezar con ANALYZE antes de planificar."
```

# PM-THYROX: Gestión de Proyectos

Framework de gestión para organizar trabajo de cualquier tamaño con Claude Code. Sigue una metodología de 7 fases donde entender viene antes que planificar, y planificar viene antes que ejecutar.

**Principio core:** Analizar antes de actuar. Cada fase produce artefactos que alimentan la siguiente. Saltar fases produce trabajo sin fundamento.

**Escala según tamaño del trabajo:**

| Tamaño | Duración | Fases activas | Qué omitir |
|--------|----------|---------------|------------|
| Micro | <30 min | 1, 6, 7 | Phases 2, 3, 4, 5 (spec y plan opcionales) |
| Pequeño | 30 min – 2h | 1, 2, 6, 7 | Phases 3, 4, 5 (no requiere plan formal) |
| Mediano | 2h – 8h | 1, 2, 3, 4, 5, 6, 7 | Ninguna — seguir las 7 fases completas |
| Grande | >8h | 1, 2, 3, 4, 5, 6, 7 | Ninguna — usar epic.md para agrupar features |

Ver [escalabilidad](references/scalability.md) para detalles y casos de borde.

---

## Las 7 Fases

### Phase 1: ANALYZE

Entender el problema antes de proponer soluciones evita construir lo incorrecto.

1. Investigar estos 8 aspectos — preguntar al usuario lo que no esté claro:
   - **Objetivo/Por qué** — ¿qué se quiere lograr y por qué importa?
   - **Stakeholders** — ¿quiénes son los usuarios y qué necesitan?
   - **Uso operacional** — ¿cómo se usará el sistema en la práctica?
   - **Atributos de calidad** — ¿qué importa más: velocidad, seguridad, confiabilidad?
   - **Restricciones** — ¿qué limita la solución (tech, tiempo, presupuesto)?
   - **Contexto/sistemas vecinos** — ¿dónde se sitúa, qué lo rodea?
   - **Fuera de alcance** — ¿qué NO se va a hacer?
   - **Criterios de éxito** — ¿cómo sabremos que está bien hecho?
2. Crear work package: `context/work/YYYY-MM-DD-HH-MM-SS-nombre/`
3. REQUERIDO: Crear `work/.../analysis/introduction.md` usando [introduction.md.template](assets/introduction.md.template)
4. Si hay decisión arquitectónica (cambio de stack tecnológico, adopción de patrón nuevo como microservicios o event-driven, o reemplazo de componente principal), crear ADR en `context/decisions/` usando [adr.md.template](assets/adr.md.template)

Referencias de análisis por subsección (leer según necesidad):
[introduction](references/introduction.md) · [requirements-analysis](references/requirements-analysis.md) · [use-cases](references/use-cases.md) · [quality-goals](references/quality-goals.md) · [stakeholders](references/stakeholders.md) · [basic-usage](references/basic-usage.md) · [constraints](references/constraints.md) · [context](references/context.md)

**Salir cuando:** `work/.../analysis/introduction.md` existe, no contiene `[NEEDS CLARIFICATION]`, y el usuario aprobó los hallazgos.
**Siguiente:** Proponer Phase 2. Si no requiere decisiones arquitectónicas, proponer saltar a Phase 3.
**Detectar:** Si `work/.../analysis/introduction.md` existe sin `[NEEDS CLARIFICATION]`, Phase 1 ya completó.

### Phase 2: SOLUTION_STRATEGY

Investigar alternativas antes de decidir previene decisiones sin evidencia.

0. REQUERIDO: Leer [solution-strategy](references/solution-strategy.md) antes de empezar esta fase. Basar las Key Ideas en los hallazgos de `work/.../analysis/`.
1. **Key Ideas** — definir los conceptos centrales que guían la solución (basarse en analysis/ de Phase 1)
2. **Research** — listar unknowns → investigar alternativas → documentar pros/cons por cada uno
3. **Pre-design check** — verificar que las decisiones respetan los principios del proyecto
4. **Decisions** — documentar decisiones fundamentales con justificación. Usar [adr.md.template](assets/adr.md.template) para decisiones arquitectónicas
5. **Post-design re-check** — re-verificar después de diseñar (las decisiones pueden cambiar al profundizar)

Ver [solution-strategy](references/solution-strategy.md) para estructura completa (Tech Stack, Patterns, Quality Goals).

**Salir cuando:** Arquitectura aprobada con investigación documentada.
**Siguiente:** Proponer Phase 3: PLAN para definir scope y linkear work package en ROADMAP.
**Detectar:** Si `work/.../spec.md` tiene decisiones arquitectónicas, Phase 2 ya completó.

### Phase 3: PLAN

Definir scope antes de estructurar previene scope creep.

1. Brainstorm: ¿qué problema? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera?
2. Verificar que el work package existe: `ls context/work/`. Si no existe, volver a Phase 1 antes de continuar. Para trabajo grande que agrupa múltiples features, usar [epic.md.template](assets/epic.md.template)
3. Actualizar ROADMAP.md con features y link al work package
4. Obtener aprobación del scope

**Salir cuando:** ROADMAP actualizado y scope aprobado.
**Siguiente:** Proponer Phase 4: STRUCTURE para especificar antes de descomponer.
**Detectar:** Si ROADMAP.md tiene el work package linkeado, Phase 3 ya completó.

### Phase 4: STRUCTURE

Especificar antes de descomponer previene ambigüedad en las tareas.

**Simple** (<10 tareas): Crear spec.md con overview, user stories, acceptance criteria.
**Complejo** (10+ tareas): Ver [spec-driven-development](references/spec-driven-development.md).

REQUERIDO: Completar [spec-quality-checklist.md.template](assets/spec-quality-checklist.md.template) ANTES de Phase 5. NO avanzar si quedan ítems sin ✓ o marcadores `[NEEDS CLARIFICATION]` sin resolver — la ambigüedad en specs se multiplica en la implementación.

**Salir cuando:** `work/.../spec.md` existe, no contiene `[NEEDS CLARIFICATION]`, y checklist completado al 100%.
**Siguiente:** Proponer Phase 5: DECOMPOSE para crear tareas atómicas.
**Detectar:** Si `work/.../spec.md` tiene user stories y acceptance criteria sin `[NEEDS CLARIFICATION]`, Phase 4 ya completó.

### Phase 5: DECOMPOSE

Tareas atómicas con trazabilidad previenen trabajo duplicado o perdido.

1. Leer spec.md del work package activo (= directorio más reciente en `context/work/`). Si el usuario pide descomposición directa sin spec previo,
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

1. Tomar siguiente tarea pendiente de `work/.../plan.md` (checkbox `- [ ]`) sin bloqueos
2. Implementar el cambio
3. Si la implementación falla, crear `context/errors/ERR-NNN-descripcion.md` usando [error-report.md.template](assets/error-report.md.template) antes de reintentar con otro approach
4. No commitear archivos temporales, binarios ni backups — usar /tmp/ para efímeros
5. Commit con [Conventional Commits](references/commit-helper.md): `type(scope): description`
6. Actualizar ROADMAP.md: `[ ]` → `[x]` con fecha
7. Repetir hasta completar todas las tareas

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
| — | Doc base | [document.md.template](assets/document.md.template) (template genérico para cualquier documento) |
| — | Principios | [constitution.md.template](assets/constitution.md.template) (principios inmutables del proyecto) |

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
