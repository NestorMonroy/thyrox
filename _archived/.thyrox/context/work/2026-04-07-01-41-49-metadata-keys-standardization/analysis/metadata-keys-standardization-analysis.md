```yml
type: Analysis
category: Framework Standardization
work_package_id: 2026-04-07-01-41-49-metadata-keys-standardization
created_at: 2026-04-07 01:41:49
phase: 1 - ANALYZE
status: draft
```

# Análisis: Estandarización de Keys de Metadata YAML

## Objetivo

Reemplazar todos los keys de metadata YAML en el framework THYROX de español (con espacios,
tildes y caracteres especiales) a inglés en snake_case, manteniendo los valores en español.

## Por qué importa

Los keys de YAML con espacios y caracteres especiales producen problemas reales:

```python
# Problema 1 — acceso por atributo imposible
data.Fecha creación    # SyntaxError
data.fecha_creacion    # OK

# Problema 2 — parsers que normalizan keys
pyyaml:   {"Fecha creación": "..."} vs {"fecha_creacion": "..."}
js-yaml:  key con espacio → acceso solo vía data["Fecha creación"]
          key snake_case  → data.fecha_creacion o data["fecha_creacion"]

# Problema 3 — tildes según encoding del entorno
# En sistemas ASCII-only: "Categoría" puede corromperse
# En UTF-8: funciona pero la tilde es parte del key
```

El estándar propuesto:
- **Keys**: inglés, snake_case, sin tildes, sin espacios → máxima compatibilidad
- **Valores**: español completo, con tildes → legibilidad para el equipo

---

## Scope real: qué se afecta

### Capa 1 — Templates (35 archivos) — MIGRAR

```
.claude/skills/pm-thyrox/assets/*.template
.claude/skills/pm-thyrox/assets/*.md.template
```

Son la fuente de todos los artefactos futuros. **Prioridad máxima.**

### Capa 2 — Framework activo (archivos leídos cada sesión) — MIGRAR

```
.claude/CLAUDE.md
.claude/context/focus.md
.claude/context/now.md
.claude/context/project-state.md
.claude/context/technical-debt.md
.claude/context/decisions.md
.claude/skills/pm-thyrox/references/*.md        (~20 archivos)
.claude/skills/pm-thyrox/SKILL.md
.claude/skills/pm-thyrox/references/conventions.md
CHANGELOG.md
ROADMAP.md
```

Son leídos activamente. La inconsistencia aquí confunde el modelo.

### Capa 3 — ADRs y errores (documentos activos) — MIGRAR

```
.claude/context/decisions/adr-*.md              (13 archivos)
.claude/context/errors/ERR-*.md                  (28 archivos)
```

Se consultan ocasionalmente. Vale la pena migrarlos.

### Capa 4 — Artefactos históricos en context/work/ — NO MIGRAR

```
.claude/context/work/2026-03-*/...               (~100 archivos legacy)
```

Son registros históricos inmutables. El riesgo de migración es alto (sed en masa
puede corromper contenido), el beneficio es bajo (no se parsean programáticamente),
y el historial git muestra la evolución del proyecto. **Decisión: dejar como legacy.**

Agregar nota en conventions.md: "WPs anteriores a 2026-04-07 usan keys en español (legacy)."

### Capa 5 — Work package actual (thyrox-capabilities-integration) — MIGRAR OPCIONALMENTE

Los artefactos del WP activo sí tienen valor de consistencia. Se pueden migrar al final
del proceso como tarea opcional de bajo riesgo.

---

## Inventario completo de keys a migrar

### Grupo A — Keys universales (presentes en casi todos los templates)

| Key español actual | Key inglés propuesto | Notas |
|--------------------|---------------------|-------|
| `Tipo` | `type` | |
| `Categoría` | `category` | |
| `Versión` | `version` | |
| `Propósito` | `purpose` | |
| `Objetivo` | `goal` | |
| `Fase` | `phase` | |
| `Estado` | `status` | |
| `Autor` | `author` | |
| `Proyecto` | `project` | |
| `Activar si` | `activate_if` | espacio + condicional |
| `ID` | `id` | |

### Grupo B — Campos de fecha (el detonador de este WP)

| Key español actual | Key inglés propuesto | Contexto |
|--------------------|---------------------|---------|
| `Fecha` (genérico) | `created_at` | la mayoría de los usos son de creación |
| `Fecha creación` | `created_at` | |
| `Fecha creación tareas` | `created_at` | en tasks.md.template |
| `Fecha actualización` | `updated_at` | |
| `Fecha última actualización` | `updated_at` | en requirements-analysis.md.template |
| `Fecha análisis` | `created_at` | punto de creación del análisis |
| `Fecha diseño` | `created_at` | punto de creación del diseño |
| `Fecha estrategia` | `created_at` | punto de creación de la estrategia |
| `Fecha plan` | `created_at` | punto de creación del plan |
| `Fecha documento` | `created_at` | punto de creación del documento |
| `Fecha identificación` | `created_at` | en stakeholders.md.template |
| `Fecha cierre` | `closed_at` | en lessons-learned.md.template |
| `Fecha inicio sesión` | `session_started_at` | en execution-log.md.template |
| `Fecha fin sesión` | `session_ended_at` | en execution-log.md.template |
| `Fecha inicio correcciones` | `started_at` | en final-report.md.template |
| `Fecha fin correcciones` | `ended_at` | en final-report.md.template |
| `Fecha inicio` | `started_at` | en task-completion.template |
| `Fecha fin` | `ended_at` | en task-completion.template |
| `Fecha inicio prevista` | `planned_start` | en tasks.md.template |
| `Fecha fin prevista` | `planned_end` | en tasks.md.template |
| `Fecha inicio estimada` | `estimated_start` | en tasks.md.template (body) |
| `Fecha fin estimada` | `estimated_end` | en tasks.md.template (body) |
| `Fecha inicio categorización` | `started_at` | en categorization-plan.md.template |
| `Fecha completación` | `completed_at` | en task-completion.template |

### Grupo C — Contadores y totales

| Key español actual | Key inglés propuesto |
|--------------------|---------------------|
| `Total lecciones` | `total_lessons` |
| `Total tareas` | `total_tasks` |
| `Total stakeholders` | `total_stakeholders` |
| `Total issues a categorizar` | `total_issues` |
| `Total issues encontrados` | `total_issues_found` |
| `Requisitos totales` | `total_requirements` |
| `Estimacion total` | `total_estimate` |
| `Riesgos abiertos` | `open_risks` |
| `Riesgos cerrados` | `closed_risks` |
| `Riesgos mitigados` | `mitigated_risks` |

### Grupo D — Roles y responsabilidades

| Key español actual | Key inglés propuesto |
|--------------------|---------------------|
| `Responsable` | `owner` |
| `Responsable análisis` | `analysis_owner` |
| `Responsable implementación` | `implementation_owner` |
| `Responsable proceso` | `process_owner` |
| `Revisor` | `reviewer` |
| `Revisor designado` | `assigned_reviewer` |
| `Aprobado por` | `approved_by` |
| `Validado por` | `validated_by` |
| `Corregido por` | `fixed_by` |
| `Reportado por` | `reported_by` |
| `Ejecutor` | `executor` |
| `Planificador` | `planner` |
| `Diseñador` | `designer` |
| `Arquitecto` | `architect` |
| `Creador tareas` | `tasks_creator` |
| `Coordinación con` | `coordination_with` |

### Grupo E — Keys de versión y tracking

| Key español actual | Key inglés propuesto |
|--------------------|---------------------|
| `Versión análisis` | `analysis_version` |
| `Versión arquitectura` | `architecture_version` |
| `Versión Quality Goals` | `quality_goals_version` |
| `Versión stakeholder map` | `stakeholder_map_version` |
| `Versión constraints` | `constraints_version` |
| `Versión contexto` | `context_version` |
| `Versión diseño` | `design_version` |
| `Versión requisitos` | `requirements_version` |
| `Versión breakdown` | `breakdown_version` |
| `Versión categorización` | `categorization_version` |
| `Versión reporte` | `report_version` |
| `Versión flujo` | `flow_version` |
| `Versión constitution` | `constitution_version` |
| `Versión docs` | `docs_version` |
| `Fase actual` | `current_phase` |
| `Fase de origen` | `source_phase` |
| `Fases activas` | `active_phases` |
| `ID work package` | `work_package_id` |

### Grupo F — Keys específicos de templates singulares

| Key español actual | Key inglés propuesto | Template |
|--------------------|---------------------|---------|
| `Severidad` | `severity` | error-report, categorization |
| `Clasificación` | `classification` | categorization |
| `Siguiente sesión` | `next_session` | execution-log |
| `Tiempo total sesión` | `total_session_time` | execution-log |
| `Issues resueltos` | `resolved_issues` | execution-log |
| `Issues en progreso` | `in_progress_issues` | execution-log |
| `Issues demorados` | `delayed_issues` | execution-log |
| `Issues pendientes` | `pending_issues` | execution-log |
| `Issues tratados hoy` | `issues_handled_today` | execution-log |
| `Tasa resolución` | `resolution_rate` | categorization |
| `Budget utilizado` | `budget_used` | final-report |
| `Horas dedicadas` | `hours_spent` | execution-log, final-report |
| `Período evaluación` | `evaluation_period` | quality-goals |
| `Período vigencia` | `validity_period` | constitution |

---

## Fuera de alcance

- **Artefactos en context/work/ anteriores a 2026-04-07** — legacy, no se migran
- **Keys en cuerpo de documentos markdown** (`**Responsable:**`, tablas, etc.) — solo se migran los frontmatter YAML
- **Archivos `.claude/agents/*.md`** — ya usan formato Claude Code nativo (name, description, tools) — no tienen keys en español
- **`registry/agents/*.yml`** — ya están en inglés

---

## Restricciones

1. **Retrocompatibilidad de artefactos legacy** — los archivos históricos en context/work/2026-03-* y parte de 2026-04-* quedan con keys en español. Se documenta como norma en conventions.md.
2. **Scope de la migración de body**: solo frontmatter YAML. Los campos en negrita del cuerpo markdown (`**Fecha Creación:**`) son presentación, no metadata parseada — quedan en español.
3. **Scripts de validación existentes** — `scripts/validate-phase-readiness.sh` y `scripts/validate-session-close.sh` pueden buscar keys en español. Verificar antes de migrar.
4. **Formato de valor de fecha**: `YYYY-MM-DD HH:MM:SS` (ISO 8601 local, colons en tiempo) — para metadata values. Los nombres de directorio mantienen `YYYY-MM-DD-HH-MM-SS` (todo guiones — colons no válidos en filesystems).
   - Comandos `date`: valores → `date '+%Y-%m-%d %H:%M:%S'` / directorios → `date +%Y-%m-%d-%H-%M-%S`
   - Nota YAML 1.1: PyYAML puede parsear `2026-04-07 01:41:49` como datetime en lugar de string. Para estos archivos leídos por Claude como texto, no es un problema. Si se parsea programáticamente, usar comillas: `"2026-04-07 01:41:49"`.

---

## Criterios de éxito

- [ ] Cero keys en español en los 35 templates (verificable con grep)
- [ ] Cero keys en español en framework activo (conventions.md, SKILL.md, CLAUDE.md, references/)
- [ ] conventions.md documenta el mapeo completo español → inglés
- [ ] conventions.md tiene nota de legacy para artefactos pre-2026-04-07
- [ ] Scripts de validación actualizados si buscaban keys en español
- [ ] SKILL.md Phase 1 step 2 actualizado con el nuevo comando de fecha para valores
