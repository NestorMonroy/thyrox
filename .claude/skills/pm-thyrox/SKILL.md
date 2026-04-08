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

**Nomenclatura:** "FASE" y "Phase" son niveles distintos — no confundir.
`FASE N` = número secuencial global del proyecto (cada WP ocupa una FASE).
`Phase N` = etapa interna del ciclo SDLC dentro de ese WP (1–7, se reinicia en cada FASE).
Ejemplo: "FASE 20 está en Phase 6" = el WP #20 del proyecto está ejecutándose.
Ver glosario completo en [CLAUDE.md](../../../CLAUDE.md#glosario).

```mermaid
flowchart LR
    P1([ANALYZE]) --> P2([SOLUTION\nSTRATEGY])
    P2 --> P3([PLAN])
    P3 --> P4([STRUCTURE])
    P4 --> P5([DECOMPOSE])
    P5 --> P6([EXECUTE])
    P6 --> P7([TRACK])
    P6 -->|más tareas| P6

    P1 -.->|micro: saltar 2-5| P6
    P2 -.->|pequeño: saltar 3-5| P6
```

---

## Limitaciones conocidas y arquitectura objetivo

**Triggering probabilístico:** Este SKILL puede no activarse en sesiones con muchos skills simultáneos
(H1/H3 — ver [skill-vs-agent.md](references/skill-vs-agent.md)). Compensado por:
- `session-start.sh` (Capa 0, 100% determinístico) — recuerda al usuario activar el SKILL
- `CLAUDE.md` (Capa 1, siempre cargado) — instrucciones mínimas de flujo siempre presentes

**Arquitectura objetivo (post-TD-008):** Este SKILL se reducirá a ~40 líneas (catálogo + tabla de
/workflow_* commands) cuando TD-008 esté completo. La lógica de cada fase vivirá en su /workflow_*
command correspondiente (Capa 3). Decisión completa: [ADR-015](../../context/decisions/adr-015.md).

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
2. Crear work package: obtener timestamp real → crear `context/work/{timestamp}-nombre/`
   — NUNCA inventar ni estimar el timestamp. SIEMPRE obtenerlo del sistema.
   — Dos formatos, dos propósitos:
     - Directorios: `date +%Y-%m-%d-%H-%M-%S` → `2026-04-07-01-41-49` (todo guiones)
     - Metadata values (`created_at`, `updated_at`, etc.): `date '+%Y-%m-%d %H:%M:%S'` → `2026-04-07 01:41:49` (ISO 8601)
   — Keys de metadata en inglés snake_case. Ver [conventions](references/conventions.md#metadata-keys).
   — REQUERIDO al crear WP: actualizar `context/now.md` con `current_work: context/work/{timestamp}-nombre/` y `phase: Phase 1`. Ver [state-management](references/state-management.md).
   — Clasificar reversibilidad del WP en el frontmatter:
     - `reversibility: documentation` — solo crea/modifica archivos en context/work/ o docs/
     - `reversibility: reversible` — modifica código o config, recuperable vía git
     - `reversibility: irreversible` — elimina archivos, modifica infraestructura activa, no se deshace con git revert
3. REQUERIDO: Crear `work/.../analysis/{nombre-wp}-analysis.md` usando [introduction.md.template](assets/introduction.md.template)
   — el nombre del archivo debe revelar QUÉ se analiza. Ejemplo: `skill-activation-analysis.md`, no `introduction.md`
4. REQUERIDO: Crear `work/../{nombre-wp}-risk-register.md` usando [risk-register.md.template](assets/risk-register.md.template) — identificar riesgos desde el inicio. Actualizar en cada fase.
5. Si el análisis es complejo, crear sub-documentos en `work/.../analysis/` según necesidad:
   [stakeholders.md.template](assets/stakeholders.md.template) · [requirements-analysis.md.template](assets/requirements-analysis.md.template) · [use-cases.md.template](assets/use-cases.md.template) · [quality-goals.md.template](assets/quality-goals.md.template) · [constraints.md.template](assets/constraints.md.template) · [context.md.template](assets/context.md.template) · [basic-usage.md.template](assets/basic-usage.md.template)
   Si el análisis involucra >20 issues con severidades: [analysis-phase.md.template](assets/analysis-phase.md.template)
   Si el proyecto requiere metadata JSON estructurada (>50 issues): [project.json.template](assets/project.json.template) — opcional
6. Para proyectos medianos/grandes: Crear `work/../{nombre-wp}-exit-conditions.md` usando [exit-conditions.md.template](assets/exit-conditions.md.template) — checklist vivo de gates para las 7 fases. Actualizar al cerrar cada fase.
7. Si el proyecto define principios arquitectónicos globales que otras features deben respetar, crear/actualizar `constitution.md` en la raíz usando [constitution.md.template](assets/constitution.md.template)
8. ADR: **Dónde crear el ADR:**
   - SI CLAUDE.md del proyecto tiene campo `adr_path` → crear en ese path
   - SI NO → crear en `docs/architecture/decisions/` (default)

   Usar [adr.md.template](assets/adr.md.template) SOLO SI aplica alguno de estos casos:
   - SI: cambio de stack tecnologico (lenguaje, base de datos, framework principal)
   - SI: adopcion de nuevo patron arquitectonico (microservicios, event-driven, CQRS)
   - SI: reemplazo de componente principal del sistema
   - SI: decision que afecta todos los work packages futuros del proyecto
   - NO: convencion de naming, formato de archivo, o template nuevo
   - NO: decision que solo afecta el WP actual
   - NO: cambios a la metodologia de gestion (eso va en SKILL.md, no en un ADR)

9. REQUERIDO: Añadir sección `## Stopping Point Manifest` al final del `*-analysis.md`:
   — Registrar los gate-fase obligatorios (siempre aplican: 1→2, 2→3, 4→5, 5→6 y 6→7)
   — Si el WP planifica agentes async: añadir fila SP-NNN por cada agente background
   — Si hay ambigüedades de scope no resolubles: añadir gate-decision correspondiente
   — Formato de tabla: `ID | Fase | Tipo | Evento | Acción requerida`
   — Tipos válidos: `gate-fase` | `async-completion` | `gate-operacion` | `gate-decision`
   — El manifest es un documento vivo: se actualiza en Phase 5 (pre-flight) y Phase 6 (al marcar ✓)

Referencias de análisis por subsección (leer según necesidad):
[introduction](references/introduction.md) · [requirements-analysis](references/requirements-analysis.md) · [use-cases](references/use-cases.md) · [quality-goals](references/quality-goals.md) · [stakeholders](references/stakeholders.md) · [basic-usage](references/basic-usage.md) · [constraints](references/constraints.md) · [context](references/context.md)

**⏸ GATE HUMANO — STOP antes de continuar:**
Presentar al usuario un resumen de los hallazgos del análisis (objetivos, gaps, riesgos principales, criterios de éxito).
Esperar confirmación explícita antes de avanzar a Phase 2.
NO continuar hasta recibir respuesta — un "SI" previo no autoriza esta fase.
Al recibir aprobación: actualizar `context/now.md::phase` a `Phase 2`.

**Salir cuando:** `work/.../analysis/{nombre-wp}-analysis.md` existe, no contiene `[NEEDS CLARIFICATION]`, y el usuario confirmó los hallazgos explícitamente en esta sesión.
**Siguiente:** Proponer Phase 2. Si no requiere decisiones arquitectónicas, proponer saltar a Phase 3.
**Detectar:** Si `work/.../analysis/` contiene al menos un `*-analysis.md` sin `[NEEDS CLARIFICATION]`, Phase 1 ya completó.

### Phase 2: SOLUTION_STRATEGY

Investigar alternativas antes de decidir previene decisiones sin evidencia.

0. REQUERIDO: Leer [solution-strategy](references/solution-strategy.md) antes de empezar esta fase. Basar las Key Ideas en los hallazgos de `work/.../analysis/`.
1. REQUERIDO: Crear `work/../{nombre-wp}-solution-strategy.md` usando [solution-strategy.md.template](assets/solution-strategy.md.template)
   — Ejemplo: `skill-activation-solution-strategy.md`, no `solution-strategy.md`
2. **Key Ideas** — definir los conceptos centrales que guían la solución (basarse en analysis/ de Phase 1)
3. **Research** — listar unknowns → investigar alternativas → documentar pros/cons por cada uno
4. **Pre-design check** — verificar que las decisiones respetan los principios del proyecto
5. **Decisions** — documentar decisiones fundamentales con justificación. Usar [adr.md.template](assets/adr.md.template) para decisiones arquitectónicas
6. **Post-design re-check** — re-verificar después de diseñar (las decisiones pueden cambiar al profundizar)

Ver [solution-strategy](references/solution-strategy.md) para estructura completa (Tech Stack, Patterns, Quality Goals).

**⏸ GATE HUMANO — STOP antes de continuar:**
Presentar al usuario las decisiones clave de la solución (Key Ideas, Decisions, alternativas descartadas).
Esperar confirmación explícita antes de avanzar a Phase 3.
NO continuar hasta recibir respuesta — un "SI" previo no autoriza esta fase.
Al recibir aprobación: actualizar `context/now.md::phase` a `Phase 3`.

**Salir cuando:** `work/.../*-solution-strategy.md` existe con decisiones documentadas y el usuario las confirmó explícitamente en esta sesión.
**Siguiente:** Proponer Phase 3: PLAN para definir scope y linkear work package en ROADMAP.
**Detectar:** Si `work/.../*-solution-strategy.md` existe con decisiones documentadas, Phase 2 ya completó.

### Phase 3: PLAN

Definir scope antes de estructurar previene scope creep.

> **Nota metodológica:** Phase 2 define el *cómo* — estrategia, alternativas investigadas, decisiones arquitectónicas. Phase 3 define el *qué* — scope statement, in-scope y out-of-scope explícitos. Phase 2 puede orientar el scope (las decisiones acotan lo que entra), pero el scope formal es un artefacto de Phase 3.

1. Brainstorm: ¿qué problema? ¿quiénes son los usuarios? ¿qué es éxito? ¿qué está fuera?
2. Verificar que el work package existe: `ls context/work/`. Si no existe, volver a Phase 1 antes de continuar. Para trabajo grande que agrupa múltiples features, usar [epic.md.template](assets/epic.md.template)
3. REQUERIDO: Crear `work/../{nombre-wp}-plan.md` usando [plan.md.template](assets/plan.md.template) — scope statement, in-scope, out-of-scope explícito, estimación de esfuerzo
4. Actualizar ROADMAP.md con features y link al work package
5. SI el plan deriva de `analysis/` con RC formales → REQUERIDO: incluir tabla de trazabilidad RC→tarea en el plan antes de presentarlo al usuario. Cada RC de prioridad Alta o Media debe tener al menos una fila. NO presentar el plan si la tabla está incompleta.
   SI el plan no tiene RC formales (trabajo mecánico) → omitir la tabla.
6. Obtener aprobación del scope — NO declarar Phase 3 completa hasta confirmación explícita del usuario

**Nota DECOMPOSE:** SI el plan deriva de RC con prioridades distintas (Alta, Media, Baja) → Phase 5: DECOMPOSE NO puede saltarse, independientemente de la clasificación de tamaño en la tabla de escalabilidad. El criterio de tamaño aplica solo a WPs sin RC formales.

**Salir cuando:** `work/../{nombre-wp}-plan.md` existe con scope aprobado Y ROADMAP actualizado. SI hay RC formales: la tabla de trazabilidad RC→tarea existe y cada RC Alta/Media tiene al menos una tarea asignada.
**Siguiente:** Proponer Phase 4: STRUCTURE para especificar antes de descomponer.
**Detectar:** Si `work/.../*-plan.md` existe con `[x] Scope aprobado`, Phase 3 ya completó.

### Phase 4: STRUCTURE

Especificar antes de descomponer previene ambigüedad en las tareas.

**Simple** (<10 tareas): Crear `work/../{nombre-wp}-requirements-spec.md` usando [requirements-specification.md.template](assets/requirements-specification.md.template) con overview, user stories, acceptance criteria.
   — Ejemplo: `skill-activation-requirements-spec.md`, no `requirements-spec.md`
**Complejo** (10+ tareas): Ver [spec-driven-development](references/spec-driven-development.md). Además, crear `work/../{nombre-wp}-design.md` usando [design.md.template](assets/design.md.template) — visión arquitectónica, componentes afectados, decisiones de diseño.

REQUERIDO: Completar [spec-quality-checklist.md.template](assets/spec-quality-checklist.md.template) ANTES de Phase 5. NO avanzar si quedan ítems sin ✓ o marcadores `[NEEDS CLARIFICATION]` sin resolver — la ambigüedad en specs se multiplica en la implementación.
Para documentos técnicos que no tienen template específico: [document.md.template](assets/document.md.template)

**⏸ GATE HUMANO — STOP antes de continuar:**
Presentar al usuario la especificación completa (user stories, acceptance criteria, diseño si aplica).
Esperar confirmación explícita antes de avanzar a Phase 5 (DECOMPOSE).
NO continuar hasta recibir respuesta.
Excepción: si el WP es `reversibility: documentation` y la spec no tiene ambigüedades, el gate puede ser ligero (mencionar que se va a descomponer y dar oportunidad de objetar).
Al recibir aprobación: actualizar `context/now.md::phase` a `Phase 5`.

**Salir cuando:** `work/.../*-requirements-spec.md` existe, no contiene `[NEEDS CLARIFICATION]`, checklist completado al 100%, y el usuario confirmó la spec.
**Siguiente:** Proponer Phase 5: DECOMPOSE para crear tareas atómicas.
**Detectar:** Si `work/.../*-requirements-spec.md` tiene user stories y acceptance criteria sin `[NEEDS CLARIFICATION]`, Phase 4 ya completó.

### Phase 5: DECOMPOSE

Tareas atómicas con trazabilidad previenen trabajo duplicado o perdido.

1. Leer `work/.../*-requirements-spec.md` del work package activo (= directorio más reciente en `context/work/`). Si el usuario pide descomposición directa sin spec previo,
   crear work package y descomponer desde la descripción del usuario — no cuestionar si el proyecto existe en el repo
2. REQUERIDO: Crear `work/../{nombre-wp}-task-plan.md` usando [tasks.md.template](assets/tasks.md.template)
   — Ejemplo: `skill-activation-task-plan.md`, no `task-plan.md`
3. Crear lista de tareas con IDs trazables — cada tarea necesita un ID y referencia a su requisito
   porque esto permite detectar tareas huérfanas (sin requisito) o requisitos sin cobertura.
   Formato: `- [ ] [T-NNN] Descripción (R-N)`
4. Marcar tareas paralelas [P]
<!-- SECTION OWNER: parallel-agent-conventions -->
   En ejecución paralela: usar estado `[~]` para reclamar tareas antes de ejecutarlas. Ver [conventions](references/conventions.md#parallel-agent-execution).
<!-- END SECTION: parallel-agent-conventions -->
5. Definir checkpoints de validación
   Si hay >50 issues antes de descomponer: [categorization-plan.md.template](assets/categorization-plan.md.template) — categorizar primero para identificar grupos naturales

**⏸ GATE HUMANO CRÍTICO — STOP obligatorio antes de Phase 6:**
Presentar al usuario el task-plan completo con TODAS las tareas listadas.
Esperar confirmación explícita antes de ejecutar CUALQUIER tarea.
Este gate NO tiene excepciones — incluso WPs `documentation` deben pasar por aquí.
Razón: Phase 6 modifica el repositorio. El usuario debe aprobar el plan antes de que se ejecute.
Al recibir aprobación: actualizar `context/now.md::phase` a `Phase 6`.

**Salir cuando:** `work/.../*-task-plan.md` existe con tareas atómicas, orden definido, y el usuario aprobó el plan explícitamente en esta sesión.
**Siguiente:** Proponer Phase 6: EXECUTE para implementar.
**Detectar:** Si `work/.../*-task-plan.md` tiene checkboxes `- [ ] [T-NNN]`, Phase 5 ya completó.

### Phase 6: EXECUTE

Commits frecuentes con mensajes descriptivos crean un historial navegable.

**Al recibir `<task-notification>` (agente background completó):**
1. Identificar el SP-NNN correspondiente en el Stopping Point Manifest del `*-analysis.md`
2. Presentar al usuario: qué agente completó + resumen del resultado
3. ⏸ GATE ASYNC — STOP: esperar confirmación antes de usar el output para la siguiente decisión o lanzar el siguiente agente
4. Intensidad del gate según calibración (ver tabla abajo)
5. Si el usuario aprueba: marcar SP-NNN como `✓` en el manifest y continuar
6. Si el usuario señala un problema: crear `context/errors/ERR-NNN.md` y ajustar el plan

**Calibración de gates async:**

| Reversibilidad del WP | Tipo de agente | Nivel de gate |
|----------------------|----------------|--------------|
| `irreversible` | cualquiera | **Fuerte** — diff completo + "SI" explícito |
| `reversible` | `task-executor` | **Fuerte** — diff completo + "SI" explícito |
| `reversible` | `Explore` / investigación para decisión | **Estándar** — resumen + confirmación |
| `reversible` | `Explore` / validación mecánica | **Ligero** — mencionar resultado + opción de objetar |
| `documentation` | `task-executor` | **Estándar** — resumen + confirmación |
| `documentation` | `Explore` / cualquiera | **Ligero** — mencionar resultado + opción de objetar |

> Ausencia de respuesta del usuario ≠ aprobación. Si el usuario no responde, esperar — no auto-continuar.

1. Tomar siguiente tarea pendiente de `work/.../*-task-plan.md` (checkbox `- [ ]`) sin bloqueos
<!-- SECTION OWNER: parallel-agent-conventions -->
   En ejecución paralela: escribir estado en `context/now-{agent-id}.md`, no en `now.md`. Ver [conventions](references/conventions.md#parallel-agent-execution).
<!-- END SECTION: parallel-agent-conventions -->
   En ejecución paralela: ANTES de ejecutar, cambiar tarea a `[~] @agent-id (claimed: timestamp)` y hacer commit del claim. Ver [conventions](references/conventions.md#parallel-agent-execution).
2. REQUERIDO al inicio de sesión: Crear o actualizar `work/../{nombre-wp}-execution-log.md` usando [execution-log.md.template](assets/execution-log.md.template)
3. Implementar el cambio
   **⚠ GATE OPERACIÓN** — antes de ejecutar operaciones destructivas o de alto impacto, STOP y describir al usuario qué se va a hacer:
   - Eliminar archivos o directorios (`rm`, `rmdir`, borrar con Write)
   - Sobreescribir archivos de configuración existentes con `--force`
   - Modificar `.mcp.json`, `CLAUDE.md`, o archivos que afectan todas las sesiones futuras
   - `git push --force` o cualquier operación que reescriba historia
   - Cualquier operación que NO sea reversible con `git revert`
   Para WPs `reversibility: irreversible`: aplicar este gate en CADA operación destructiva individualmente.
   Para WPs `reversibility: reversible`: aplicar el gate para operaciones fuera de git (delete de archivos no trackeados, modificación de infraestructura).
   Para WPs `reversibility: documentation`: no se esperan operaciones destructivas — si aparece una, es una señal de que la clasificación fue incorrecta.
4. Si la implementación falla, crear `context/errors/ERR-NNN-descripcion.md` usando [error-report.md.template](assets/error-report.md.template) antes de reintentar con otro approach
5. No commitear archivos temporales, binarios ni backups — usar /tmp/ para efímeros
6. Commit con [Conventional Commits](references/commit-helper.md): `type(scope): description`
7. Actualizar ROADMAP.md: `[ ]` → `[x]` con fecha
8. Repetir hasta completar todas las tareas
   Para trabajo micro (<30 min) sin WP: [ad-hoc-tasks.md.template](assets/ad-hoc-tasks.md.template) — registrar sin crear work package completo

**Pre-flight para paralelo (hacer ANTES de lanzar agentes):**
1. Listar archivos que toca cada agente
2. Detectar intersecciones → resolver scope collision antes de lanzar
3. Asignar section owners para archivos compartidos
4. Definir gates explícitos (quién desbloquea a quién)
5. REQUERIDO: Por cada agente que se lanzará en background, registrar SP-NNN en el Stopping Point Manifest del `*-analysis.md`:
   — Qué agente, qué produce, qué presentar al usuario al completar
   — Hacer commit del manifest actualizado ANTES de lanzar el primer agente

**En ejecución paralela (N agentes):**
- El agente coordinador (Claude principal) es responsable de: lanzar agentes, manejar failures, escribir archivos cuando Write esté bloqueado, actualizar ROADMAP/CHANGELOG en Phase 7.
- Antes de lanzar agentes: definir scope de cada uno, identificar archivos compartidos, asignar section owners, documentar gates cross-WP.
- Ver [conventions](references/conventions.md#parallel-agent-execution) para protocolo completo.

**Validación pre-Phase 7 — REQUERIDO antes de proponer TRACK:**
Verificar que los siguientes artefactos están actualizados y consistentes:
- [ ] `*-task-plan.md` — todas las tareas completadas tienen `[x]` (no `[ ]`)
- [ ] `*-execution-log.md` — estado final de cada tarea registrado
- [ ] `ROADMAP.md` — todos los checkboxes de la FASE actual en `[x]`
- [ ] Stopping Point Manifest — SP-NNN de Phase 6 marcados como `✓`
- [ ] No quedan artefactos con estado desactualizado respecto a la ejecución real
Si algún ítem falla → corregir antes de avanzar. No delegar esta validación al usuario.

**Salir cuando:** Todas las tareas completadas, commiteadas, y validación pre-Phase 7 pasada.
**Siguiente:** Proponer Phase 7: TRACK para documentar lecciones.
**Detectar:** Si todas las checkboxes en `*-task-plan.md` están `[x]`, Phase 6 ya completó.

### Phase 7: TRACK

**En ejecución paralela:** Phase 7 es single-agent por diseño. El coordinador consolida lecciones de todos los WPs, actualiza ROADMAP y CHANGELOG como único escritor, y cierra los `now-{agent-id}.md` de todos los agentes.

Documentar lecciones previene repetir los mismos errores.

- Revisar progreso desde ROADMAP.md + commits recientes. Si hay work package activo con task-plan.md,
  identificar la siguiente tarea incompleta y sugerirla como acción concreta
- REQUERIDO: Crear `work/../{nombre-wp}-lessons-learned.md` usando [lessons-learned.md.template](assets/lessons-learned.md.template)
  — Ejemplo: `skill-activation-lessons-learned.md`, no `lessons-learned.md`
- REQUERIDO: Generar [CHANGELOG](CHANGELOG.md) desde commits usando [changelog.md.template](assets/changelog.md.template)
- Actualizar `work/.../risk-register.md`: cerrar riesgos resueltos, documentar los que se materializaron
- Para proyectos grandes o con métricas relevantes: crear `work/../{nombre-wp}-final-report.md` usando [final-report.md.template](assets/final-report.md.template) — resumen ejecutivo, estimado vs real, métricas
- Para tracking de deuda técnica identificada: [refactors.md.template](assets/refactors.md.template)
- Si hay 100+ issues: ver [incremental-correction](references/incremental-correction.md)
- Validar integridad: ver [reference-validation](references/reference-validation.md)
- Gate soft antes de avanzar de fase: `bash scripts/validate-phase-readiness.sh <phase>`
- Verificar que no quedaron archivos temporales fuera de `context/work/`
- Validar cierre de sesión: `bash scripts/validate-session-close.sh`
- Resumen rápido del estado: `bash scripts/project-status.sh`

**REQUERIDO al cerrar WP — actualizar archivos de estado:**

| Archivo | Contenido mínimo requerido |
|---------|---------------------------|
| `context/now.md` | `current_work: null` · `phase: null` · `updated_at: timestamp` |
| `context/focus.md` | Sección `## Completado`: FASE N + nombre-wp + qué se logró. Sección `## Sin WP activo`: versión actual + próximo paso en ROADMAP |
| `context/project-state.md` | Ejecutar `bash .claude/skills/pm-thyrox/scripts/update-state.sh` — el script regenera el archivo desde el estado real del repo |

Ver [state-management](references/state-management.md) para tabla de triggers completa.

**Salir cuando:** Análisis completo, lecciones documentadas, y archivos de estado actualizados.

---

## Dónde viven los artefactos

| Fase | Artefacto | Ubicación | Template |
|------|-----------|-----------|----------|
| 1 | Síntesis de análisis | `work/.../analysis/{nombre-wp}-analysis.md` | [introduction.md.template](assets/introduction.md.template) |
| 1 | Registro de riesgos | `work/../{nombre-wp}-risk-register.md` | [risk-register.md.template](assets/risk-register.md.template) |
| 1 | Sub-análisis (opcional) | `work/.../analysis/*.md` | stakeholders, requirements-analysis, use-cases, quality-goals, constraints, context, basic-usage |
| 1 | Gates de 7 fases (mediano/grande) | `work/../{nombre-wp}-exit-conditions.md` | [exit-conditions.md.template](assets/exit-conditions.md.template) |
| 1 | Principios globales del proyecto | `constitution.md` (raíz) | [constitution.md.template](assets/constitution.md.template) |
| 1–2 | Decisiones arquitectónicas | `{adr_path}/adr-NNN.md` (ver CLAUDE.md o default `docs/architecture/decisions/`) | [adr.md.template](assets/adr.md.template) |
| 1 | Work package | `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` | — |
| 2 | Estrategia de solución | `work/../{nombre-wp}-solution-strategy.md` | [solution-strategy.md.template](assets/solution-strategy.md.template) |
| 3 | Scope del trabajo | `work/../{nombre-wp}-plan.md` | [plan.md.template](assets/plan.md.template) |
| 4 | Especificación de requisitos | `work/../{nombre-wp}-requirements-spec.md` | [requirements-specification.md.template](assets/requirements-specification.md.template) |
| 4 | Diseño técnico (complejo) | `work/../{nombre-wp}-design.md` | [design.md.template](assets/design.md.template) |
| 5 | Plan de tareas | `work/../{nombre-wp}-task-plan.md` | [tasks.md.template](assets/tasks.md.template) |
| 6 | Log de ejecución | `work/../{nombre-wp}-execution-log.md` | [execution-log.md.template](assets/execution-log.md.template) |
| 6 | Código | Repositorio (git) | — |
| 7 | Lecciones aprendidas | `work/../{nombre-wp}-lessons-learned.md` | [lessons-learned.md.template](assets/lessons-learned.md.template) |
| 7 | Changelog | [CHANGELOG](CHANGELOG.md) | [changelog.md.template](assets/changelog.md.template) |
| 7 | Reporte final (grande) | `work/../{nombre-wp}-final-report.md` | [final-report.md.template](assets/final-report.md.template) |
| 1 | Análisis por severidad (>20 issues) | `work/.../analysis/{nombre}-analysis-phase.md` | [analysis-phase.md.template](assets/analysis-phase.md.template) — opcional |
| 1 | Metadata JSON del proyecto (>50 issues) | `work/../project.json` | [project.json.template](assets/project.json.template) — opcional |
| 4 | Documento técnico genérico | `work/../{nombre}-document.md` | [document.md.template](assets/document.md.template) — cuando no aplica template específico |
| 5 | Categorización de issues (>50) | `work/../{nombre}-categorization-plan.md` | [categorization-plan.md.template](assets/categorization-plan.md.template) — opcional |
| 5/6 | Tareas ad-hoc (<2h, sin WP) | `ad-hoc-tasks.md` | [ad-hoc-tasks.md.template](assets/ad-hoc-tasks.md.template) — opcional |
| 5/6 | Tracking de deuda técnica | `refactors.md` | [refactors.md.template](assets/refactors.md.template) — opcional |
| — | Errores | `context/errors/ERR-NNN-descripcion.md` | [error-report.md.template](assets/error-report.md.template) |

## Estructura de un work package

```
context/work/YYYY-MM-DD-HH-MM-SS-nombre/
├── analysis/
│   ├── {nombre}-analysis.md          ← Síntesis del análisis (Phase 1) — REQUERIDO
│   └── {nombre}-{subtema}.md         ← Sub-análisis opcionales (stakeholders, constraints, etc.)
├── {nombre}-risk-register.md         ← Riesgos vivos Phase 1→6 — REQUERIDO
├── {nombre}-exit-conditions.md       ← Gates de las 7 fases (Phase 1, mediano/grande)
├── {nombre}-solution-strategy.md     ← Estrategia arquitectónica (Phase 2)
├── {nombre}-plan.md                  ← Scope aprobado (Phase 3)
├── {nombre}-requirements-spec.md     ← Especificación de requisitos (Phase 4)
├── {nombre}-design.md                ← Diseño técnico (Phase 4, complejo)
├── {nombre}-task-plan.md             ← Tareas con checkboxes (Phase 5) — REQUERIDO
├── {nombre}-execution-log.md         ← Log de sesiones de ejecución (Phase 6)
├── {nombre}-lessons-learned.md       ← Lecciones aprendidas (Phase 7) — REQUERIDO
└── {nombre}-final-report.md          ← Reporte final con métricas (Phase 7, grande)
```

**Convención de nombres — OBLIGATORIO:**
`{nombre}` = parte descriptiva del work package (sin timestamp).
Ejemplo: WP `2026-04-01-22-15-43-template-phase-integration` → `{nombre}` = `template-phase-integration`
El nombre del archivo debe revelar QUÉ contiene, no solo QUÉ tipo es.

No todos los paquetes necesitan todos los archivos. Un fix rápido puede tener solo plan.md.

**Cuándo crear un work package:**
- Trabajo involucra múltiples archivos o fases
- Tiene consecuencias de decisión
- Dura más de 30 minutos
- Produce lecciones

## Naming

```
Archivos:        kebab-case.md
Work packages:   YYYY-MM-DD-HH-MM-SS-nombre/   ← timestamp real: `date +%Y-%m-%d-%H-%M-%S`
Commits:         type(scope): description
ADRs:            adr-NNN.md
Tareas:          [T-NNN] Descripción (R-N)
Errores:         ERR-NNN-descripcion.md
```

**Artefactos de work package — patrón `{nombre-wp}-{tipo}.md`:**

```
{nombre-wp} = parte descriptiva del WP (sin timestamp)
{tipo}      = analysis | solution-strategy | plan | requirements-spec | design |
              task-plan | execution-log | lessons-learned | risk-register |
              exit-conditions | final-report | spec-checklist

Ejemplo: WP "2026-04-02-10-00-00-pagos-stripe"
  → analysis/pagos-stripe-analysis.md
  → pagos-stripe-solution-strategy.md
  → pagos-stripe-task-plan.md
  → pagos-stripe-lessons-learned.md

Excepción: CHANGELOG.md — nombre global, convención universal (Keep a Changelog)
```

> WPs anteriores a 2026-04-02 usan naming legacy (`spec.md`, `plan.md`, `lessons.md`).
> No se migran. El patrón `{nombre-wp}-{tipo}.md` aplica a WPs nuevos.

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
[conventions](references/conventions.md) — Convenciones de archivos, commits, ROADMAP, ejecución paralela
[scalability](references/scalability.md) — Cómo escalar el framework según complejidad
[examples](references/examples.md) — 8 casos de uso reales
[agent-spec](references/agent-spec.md) — Spec formal de agentes nativos Claude Code (campos obligatorios/prohibidos, naming)
[skill-vs-agent](references/skill-vs-agent.md) — Cuándo crear un SKILL vs un agente nativo

### Avanzado (leer cuando Claude tiene dificultades)
[prompting-tips](references/prompting-tips.md) — Cuando Claude no entiende instrucciones
[long-context-tips](references/long-context-tips.md) — Documentos >5,000 palabras
[skill-authoring](references/skill-authoring.md) — Crear o mejorar skills
