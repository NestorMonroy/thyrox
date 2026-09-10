```yml
type: Requirements Specification
category: Framework Standardization
version: 1.0
created_at: 2026-04-07 01:57:44
updated_at: 2026-04-07 01:57:44
status: Aprobado
```

# Especificación: Estandarización de Keys de Metadata YAML

## Resumen

Migrar todos los keys de metadata YAML del framework THYROX de español
(con espacios, tildes, caracteres especiales) a inglés snake_case, conservando
los valores en español. La transformación se realiza vía un script Python con
dry-run, selección por capa y verificación integrada.

---

## Mapeo Análisis → Spec

| Decisión (Phase 2) | SPEC | Descripción técnica |
|--------------------|------|---------------------|
| D-01: Python sobre sed | SPEC-001 | Script `migrate-metadata-keys.py` |
| D-02: Migración por capas | SPEC-002..SPEC-009 | Una spec por capa |
| D-03: conventions.md como contrato | SPEC-010 | Sección nueva en conventions.md |
| D-04: Nota legacy | SPEC-010 | Incluida en SPEC-010 |
| D-05: Dos formatos de fecha | SPEC-011 | SKILL.md + conventions.md |

---

## SPEC-001: Script `migrate-metadata-keys.py`

**Prioridad:** Critical — es la herramienta de todas las demás specs
**Estado:** Aprobado

### Descripción

Script Python en `scripts/migrate-metadata-keys.py` que transforma keys de
metadata YAML en frontmatter markdown. Opera sobre archivos individuales o
directorios completos, con modo dry-run y selección por capa.

### Comportamiento del script

```
Uso:
  python scripts/migrate-metadata-keys.py --layer 1 [--dry-run]
  python scripts/migrate-metadata-keys.py --file path/to/file.md [--dry-run]
  python scripts/migrate-metadata-keys.py --all [--dry-run]

Flags:
  --layer N      Ejecutar solo la capa N (1-8)
  --file PATH    Ejecutar sobre un archivo específico
  --all          Ejecutar todas las capas en orden
  --dry-run      Mostrar cambios sin aplicar (REQUERIDO probar antes de aplicar)
  --verify-only  Solo ejecutar el grep de verificación, sin migrar
```

### Lógica de transformación

1. Leer el archivo
2. Detectar el bloque frontmatter: entre la primera línea ` ```yml ` y el
   siguiente ` ``` ` de cierre
3. Dentro del bloque, aplicar el KEY_MAP: reemplazar cada key en español por
   su equivalente en inglés
4. **NO modificar nada fuera del bloque frontmatter**
5. Si `--dry-run`: imprimir el diff sin escribir
6. Si no dry-run: escribir el archivo modificado

### KEY_MAP completo

```python
KEY_MAP = {
    # Grupo A — universales
    "Tipo": "type",
    "Categoría": "category",
    "Versión": "version",
    "Propósito": "purpose",
    "Objetivo": "goal",
    "Fase": "phase",
    "Estado": "status",
    "Autor": "author",
    "Proyecto": "project",
    "Activar si": "activate_if",
    "ID": "id",
    "Sistema": "system",
    "Uso": "usage",
    "Herramientas": "tools",
    "Formato": "format",
    "Ejemplos": "examples",
    "WP": "wp",
    "Scope": "scope",
    "Epic": "epic",
    "Feature": "feature",
    "Rama": "branch",

    # Grupo B — fechas
    "Fecha creación": "created_at",
    "Fecha creación tareas": "created_at",
    "Fecha actualización": "updated_at",
    "Última actualización": "updated_at",
    "Fecha última actualización": "updated_at",
    "Fecha análisis": "created_at",
    "Fecha diseño": "created_at",
    "Fecha estrategia": "created_at",
    "Fecha plan": "created_at",
    "Fecha documento": "created_at",
    "Fecha identificación": "created_at",
    "Fecha": "created_at",
    "Fecha cierre": "closed_at",
    "Fecha inicio sesión": "session_started_at",
    "Fecha fin sesión": "session_ended_at",
    "Fecha inicio correcciones": "started_at",
    "Fecha fin correcciones": "ended_at",
    "Fecha inicio": "started_at",
    "Fecha fin": "ended_at",
    "Fecha inicio prevista": "planned_start",
    "Fecha fin prevista": "planned_end",
    "Fecha inicio estimada": "estimated_start",
    "Fecha fin estimada": "estimated_end",
    "Fecha inicio categorización": "started_at",
    "Fecha completación": "completed_at",

    # Grupo C — contadores
    "Total lecciones": "total_lessons",
    "Total tareas": "total_tasks",
    "Total stakeholders": "total_stakeholders",
    "Total issues a categorizar": "total_issues",
    "Total issues encontrados": "total_issues_found",
    "Requisitos totales": "total_requirements",
    "Estimacion total": "total_estimate",
    "Riesgos abiertos": "open_risks",
    "Riesgos cerrados": "closed_risks",
    "Riesgos mitigados": "mitigated_risks",

    # Grupo D — roles
    "Responsable": "owner",
    "Responsable análisis": "analysis_owner",
    "Responsable implementación": "implementation_owner",
    "Responsable proceso": "process_owner",
    "Revisor": "reviewer",
    "Revisor designado": "assigned_reviewer",
    "Aprobado por": "approved_by",
    "Validado por": "validated_by",
    "Corregido por": "fixed_by",
    "Reportado por": "reported_by",
    "Ejecutor": "executor",
    "Planificador": "planner",
    "Diseñador": "designer",
    "Arquitecto": "architect",
    "Creador tareas": "tasks_creator",
    "Coordinación con": "coordination_with",

    # Grupo E — versiones y tracking
    "Versión análisis": "analysis_version",
    "Versión arquitectura": "architecture_version",
    "Versión Quality Goals": "quality_goals_version",
    "Versión stakeholder map": "stakeholder_map_version",
    "Versión constraints": "constraints_version",
    "Versión contexto": "context_version",
    "Versión diseño": "design_version",
    "Versión requisitos": "requirements_version",
    "Versión breakdown": "breakdown_version",
    "Versión categorización": "categorization_version",
    "Versión reporte": "report_version",
    "Versión flujo": "flow_version",
    "Versión constitution": "constitution_version",
    "Versión docs": "docs_version",
    "Fase actual": "current_phase",
    "Fase de origen": "source_phase",
    "Fases activas": "active_phases",
    "ID work package": "work_package_id",
    "Stack versión": "stack_version",

    # Grupo F — específicos
    "Severidad": "severity",
    "Clasificación": "classification",
    "Siguiente sesión": "next_session",
    "Tiempo total sesión": "total_session_time",
    "Issues resueltos": "resolved_issues",
    "Issues en progreso": "in_progress_issues",
    "Issues demorados": "delayed_issues",
    "Issues pendientes": "pending_issues",
    "Issues tratados hoy": "issues_handled_today",
    "Tasa resolución": "resolution_rate",
    "Budget utilizado": "budget_used",
    "Horas dedicadas": "hours_spent",
    "Período evaluación": "evaluation_period",
    "Período vigencia": "validity_period",
    "Recurrencia": "recurrence",
    "Componente": "component",
    "Componentes": "components",
    "Dependencias críticas": "critical_dependencies",
    "Dependencias externas": "external_dependencies",
}
```

### Orden de aplicación del KEY_MAP

**Crítico:** Los keys más largos deben aplicarse ANTES que los más cortos para
evitar sustituciones parciales. Ejemplo: `"Fecha creación"` debe reemplazarse
antes que `"Fecha"`, o `"Fecha"` matchearía el prefijo y dejaría `" creación:"`.

Implementación: ordenar `KEY_MAP.items()` por longitud de key descendente antes
de iterar.

### Criterios de aceptación

```
Given un archivo con frontmatter YAML con keys en español
When ejecuto el script con --dry-run
Then muestra el diff de cambios sin modificar el archivo

Given un archivo con frontmatter YAML con keys en español
When ejecuto el script sin --dry-run
Then el archivo queda con todos los keys en inglés snake_case
And el contenido fuera del frontmatter no se modifica

Given un key largo como "Fecha creación" y uno corto como "Fecha" en el mismo frontmatter
When el script aplica el KEY_MAP
Then "Fecha creación" → "created_at" correctamente (no "created_at creación")

Given un archivo sin frontmatter YAML (sin ```yml al inicio)
When ejecuto el script
Then el archivo no se modifica y se emite un warning

Given --verify-only
When ejecuto el script sobre un directorio ya migrado
Then imprime "OK: cero keys en español" o lista los archivos con keys restantes
```

### Archivos a crear

- `scripts/migrate-metadata-keys.py` (nuevo)

---

## SPEC-002: Capa 1 — Migración de templates (`assets/`)

**Prioridad:** Critical
**Archivos:** 35 en `.claude/skills/pm-thyrox/assets/`

### Criterios de aceptación

```
Given ejecutar: python scripts/migrate-metadata-keys.py --layer 1
Then todos los frontmatter de *.template y *.md.template tienen keys en inglés

Given verificación post-migración:
  grep -r "^Tipo:\|^Versión:\|^Fecha \|^Categoría:\|^Propósito:" assets/
Then cero resultados
```

---

## SPEC-003: Capa 2 — Migración de references (`references/`)

**Prioridad:** High
**Archivos:** ~20 en `.claude/skills/pm-thyrox/references/`

### Criterios de aceptación

```
Given ejecutar: python scripts/migrate-metadata-keys.py --layer 2
Then todos los frontmatter de references/*.md tienen keys en inglés

Given grep de verificación sobre references/
Then cero keys en español en frontmatter
```

---

## SPEC-004: Capa 3 — SKILL.md + conventions.md (manual)

**Prioridad:** Critical — son los archivos más leídos
**Archivos:** `SKILL.md`, `conventions.md`

### Cambios en SKILL.md

1. Frontmatter propio (si tiene) → keys en inglés
2. Phase 1 step 2: actualizar instrucción de timestamp con ambos comandos:
   - Directorios: `date +%Y-%m-%d-%H-%M-%S`
   - Valores de metadata: `date '+%Y-%m-%d %H:%M:%S'`

### Cambios en conventions.md

1. Frontmatter → keys en inglés
2. Actualizar sección `## Timestamp Format` con los dos comandos y formatos
3. Agregar sección `## Metadata Keys` con:
   - El mapa completo español→inglés (tabla referencia)
   - Nota legacy: `context/work/` pre-2026-04-07 usa keys en español

### Criterios de aceptación

```
Given SKILL.md y conventions.md migrados
When grep "^Tipo:\|^Versión:\|^Fecha " SKILL.md conventions.md
Then cero resultados

Given SKILL.md Phase 1 step 2
Then contiene ambos comandos date diferenciados por propósito

Given conventions.md
Then contiene sección ## Metadata Keys con mapa español→inglés
Then contiene nota de legacy para artefactos pre-2026-04-07
```

---

## SPEC-005: Capa 4 — Context activo

**Prioridad:** High
**Archivos:** `focus.md`, `now.md`, `project-state.md`, `technical-debt.md`,
             `decisions.md`

### Criterios de aceptación

```
Given los 5 archivos de context/ migrados
When grep "^Tipo:\|^Versión:\|^Fecha " sobre esos archivos
Then cero resultados
```

---

## SPEC-006: Capa 5 — ADRs

**Prioridad:** Medium
**Archivos:** 13 en `context/decisions/adr-*.md`

### Criterios de aceptación

```
Given ejecutar: python scripts/migrate-metadata-keys.py --layer 5
When grep "^Tipo:\|^Versión:\|^Fecha " context/decisions/adr-*.md
Then cero resultados
```

---

## SPEC-007: Capa 6 — Error reports

**Prioridad:** Medium
**Archivos:** 28 en `context/errors/ERR-*.md`

### Criterios de aceptación

```
Given ejecutar: python scripts/migrate-metadata-keys.py --layer 6
When grep "^Tipo:\|^Versión:\|^Fecha \|^Severidad:" context/errors/ERR-*.md
Then cero resultados
```

---

## SPEC-008: Capa 7 — WP activo thyrox-capabilities-integration

**Prioridad:** Low (cosmético — WP ya cerrado)
**Archivos:** ~10 en `context/work/2026-04-05-01-09-22-thyrox-capabilities-integration/`

### Criterios de aceptación

```
Given ejecutar: python scripts/migrate-metadata-keys.py --layer 7
When grep sobre el directorio del WP activo
Then cero keys en español en frontmatter
```

---

## SPEC-009: Capa 8 — project-status.sh

**Prioridad:** High — sin este fix el script muestra metadata en el output
**Archivo:** `scripts/project-status.sh`

### Cambio específico (línea 35)

```bash
# Antes:
sed -n '/^# Focus/,/^##/{/^#/d; /^$/d; /^```/d; /^Tipo:/d; /^Versión:/d; /^Última/d; p;}'

# Después:
sed -n '/^# Focus/,/^##/{/^#/d; /^$/d; /^```/d; /^type:/d; /^version:/d; /^updated_at:/d; p;}'
```

### Criterios de aceptación

```
Given project-status.sh ejecutado después de migrar focus.md
When bash scripts/project-status.sh
Then el output NO muestra líneas de metadata (type:, version:, updated_at:)
Then el output muestra el contenido de focus.md correctamente
```

---

## SPEC-010: conventions.md — sección Metadata Keys

**Prioridad:** Critical — es el contrato del estándar
**Archivo:** `references/conventions.md`

### Contenido requerido

La sección `## Metadata Keys` debe contener:

1. **Regla general**: keys en inglés snake_case, valores en español
2. **Tabla de mapeo** con todos los grupos A-F del análisis
3. **Nota de legacy**:
   > Artefactos en `context/work/` anteriores a 2026-04-07 usan keys en español.
   > No se migran. Ambos formatos son entendidos por Claude.
4. **Ejemplo**:
   ```yaml
   # Antes (legacy):
   Tipo: Análisis
   Fecha creación: 2026-03-28
   
   # Después (estándar):
   type: Análisis
   created_at: 2026-03-28 10:15:32
   ```

---

## SPEC-011: CLAUDE.md + SKILL.md — frontmatter propio

**Prioridad:** High
**Archivos:** `.claude/CLAUDE.md`, `.claude/skills/pm-thyrox/SKILL.md`

### CLAUDE.md — frontmatter actual

```yaml
# Antes:
Tipo: Contexto Persistente
Versión: 3.0
Fecha actualización: 2026-03-28

# Después:
type: Contexto Persistente
version: 3.0
updated_at: 2026-04-07 01:57:44
```

### Criterios de aceptación

```
Given CLAUDE.md y SKILL.md con frontmatter migrado
When grep "^Tipo:\|^Versión:\|^Fecha " .claude/CLAUDE.md .claude/skills/pm-thyrox/SKILL.md
Then cero resultados
```

---

## Checklist de calidad de spec

- [x] Cada spec tiene criterios de aceptación en formato Given/When/Then
- [x] KEY_MAP tiene orden de aplicación documentado (longitud descendente)
- [x] Casos edge documentados (archivo sin frontmatter, keys parciales)
- [x] Sin `[NEEDS CLARIFICATION]` pendientes
- [x] SPEC-001 (script) tiene criterios de aceptación verificables sin ejecución manual
