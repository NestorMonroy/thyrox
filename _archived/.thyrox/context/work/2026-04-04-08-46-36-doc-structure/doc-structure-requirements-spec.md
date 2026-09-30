```yml
Tipo: Especificación Técnica
Versión: 1.0
Fecha actualización: 2026-04-04
Estado: Aprobado
```

# Especificación de Requisitos — doc-structure

## Resumen Ejecutivo

Separar los artefactos efímeros de Claude (`.claude/`) de los artefactos permanentes
del proyecto (`docs/`) mediante un campo `adr_path` configurable en CLAUDE.md.
Adicionalmente, limpiar CLAUDE.md de referencias a IDs de ADRs externos y crear el
stub del tech skill `sphinx` siguiendo ADR-012.

**Objetivo:** SKILL.md portátil entre proyectos + ADRs accesibles para el equipo + base
para documentación con Sphinx.

---

## Mapeo Plan → Especificación

| Tarea del plan | ID Spec | Descripción técnica |
|---------------|---------|-------------------|
| Sección `adr_path` en CLAUDE.md | SPEC-001 | Nueva sección H2 con campo configurable |
| Limpiar Locked Decisions | SPEC-002 | Eliminar referencias a ADR IDs; reglas auto-contenidas |
| SKILL.md Phase 1 Step 8 SI/NO | SPEC-003 | Regla condicional para ruta de ADRs |
| [README](docs/architecture/decisions/README.md) | SPEC-004 | Placeholder que señala propósito del directorio |
| Stub sphinx skill | SPEC-005 | SKILL.md mínimo con secciones `[PENDIENTE]` |
| ADR-013 | SPEC-006 | Registro de la decisión de separación .claude/ vs docs/ |

---

## SPEC-001: Campo adr_path en CLAUDE.md

**ID:** SPEC-001
**Prioridad:** Critical
**Estado:** Aprobado

### Descripción

Añadir sección `## Configuración del Proyecto` en [CLAUDE](.claude/CLAUDE.md) con el campo
`adr_path` que indica dónde escribe Claude los ADRs del proyecto.

### Criterios de Aceptación

```
Given CLAUDE.md del proyecto tiene la nueva sección
When Claude en Phase 1 decide crear un ADR
Then escribe el ADR en el path indicado por adr_path

Given CLAUDE.md NO tiene la sección Configuración del Proyecto
When Claude en Phase 1 decide crear un ADR
Then escribe el ADR en docs/architecture/decisions/ (default)

Given un proyecto existente declara adr_path: .claude/context/decisions/
When Claude en Phase 1 decide crear un ADR
Then escribe en .claude/context/decisions/ (retrocompatibilidad)
```

### Consideraciones Técnicas

- La sección debe ser un H2 (`##`) para que Haiku la encuentre con grep
- El campo `adr_path` es una línea YAML inline, no un bloque
- Incluir comentario con el default para que sea auto-documentado
- THYROX declara `adr_path: .claude/context/decisions/` para retrocompatibilidad

### Implementación

**Archivos a modificar:**
- [CLAUDE](.claude/CLAUDE.md) — añadir sección antes de `## Para más contexto`

**Contenido exacto a añadir:**
```markdown
## Configuración del Proyecto

adr_path: .claude/context/decisions/   # THYROX mantiene ADRs en .claude/ — retrocompat
# Default para nuevos proyectos: docs/architecture/decisions/
```

**Complejidad:** Baja

---

## SPEC-002: Limpiar referencias a IDs de ADRs en Locked Decisions

**ID:** SPEC-002
**Prioridad:** High
**Estado:** Aprobado

### Descripción

La sección "Locked Decisions" en CLAUDE.md referencia IDs específicos de ADRs de
THYROX (ADR-010, ADR-011, etc.). Esto rompe la portabilidad: en otro proyecto esos
IDs no existen. Las reglas deben ser auto-contenidas.

### Criterios de Aceptación

```
Given CLAUDE.md Locked Decisions modificado
When se ejecuta: grep "ADR-0[0-9][0-9]" .claude/CLAUDE.md
Then resultado es 0 líneas

Given las reglas siguen siendo las mismas 7
When un desarrollador lee Locked Decisions
Then entiende cada regla sin necesidad de leer los ADRs referenciados
```

### Consideraciones Técnicas

- Eliminar solo la referencia entre paréntesis `(ADR-NNN)`, no la regla completa
- La tabla `SKILL vs ADR` en CLAUDE.md que referencia `context/decisions/` es diferente
  — esa referencia es a la ubicación actual de THYROX, no a un ADR ID
- No eliminar ADRs reales; solo sus menciones en la lista de Locked Decisions

### Implementación

**Archivos a modificar:**
- [CLAUDE](.claude/CLAUDE.md) — sección `## Locked Decisions`

**Transformación:**
```
ANTES: 1. **ANALYZE first** — No planificar sin entender primero (ADR-010)
DESPUÉS: 1. **ANALYZE first** — No planificar sin entender primero
```
(repetir para cada ítem que tenga referencia a ADR-NNN)

**Complejidad:** Baja

---

## SPEC-003: SKILL.md Phase 1 Step 8 con regla SI/NO para adr_path

**ID:** SPEC-003
**Prioridad:** Critical
**Estado:** Aprobado

### Descripción

Phase 1 Step 8 en SKILL.md hardcodea `context/decisions/adr-NNN.md`. Debe cambiarse
para que lea `adr_path` de CLAUDE.md del proyecto y use ese valor como destino.

### Criterios de Aceptación

```
Given SKILL.md actualizado y CLAUDE.md con adr_path: docs/architecture/decisions/
When Claude ejecuta Phase 1 Step 8 y aplica criterios de ADR
Then crea el ADR en docs/architecture/decisions/adr-NNN.md

Given SKILL.md actualizado y CLAUDE.md sin sección Configuración del Proyecto
When Claude ejecuta Phase 1 Step 8 y aplica criterios de ADR
Then crea el ADR en docs/architecture/decisions/adr-NNN.md (default)

Given SKILL.md actualizado y CLAUDE.md con adr_path: .claude/context/decisions/
When Claude ejecuta Phase 1 Step 8 y aplica criterios de ADR
Then crea el ADR en .claude/context/decisions/adr-NNN.md
```

### Consideraciones Técnicas

- La regla SI/NO debe ser la primera instrucción del Step 8, antes de los criterios SI/NO de cuándo crear ADR
- Debe ser parseable por Haiku: frase imperativa corta, no narrativa
- El default `docs/architecture/decisions/` debe estar explícito

### Implementación

**Archivos a modificar:**
- [SKILL](.claude/skills/pm-thyrox/SKILL.md) — Phase 1 Step 8

**Texto a añadir al inicio del Step 8:**
```markdown
   **Dónde crear el ADR:**
   - SI CLAUDE.md tiene `adr_path` → crear en ese path
   - SI NO → crear en `docs/architecture/decisions/` (default)
```

**Complejidad:** Baja

---

## SPEC-004: docs/architecture/decisions/README.md

**ID:** SPEC-004
**Prioridad:** Medium
**Estado:** Aprobado

### Descripción

Crear la estructura mínima `docs/architecture/decisions/` con un README que señala
el propósito del directorio. THYROX declara `adr_path: .claude/context/decisions/`
así que este directorio queda preparado para futuros ADRs o migración.

### Criterios de Aceptación

```
Given docs/architecture/decisions/README.md creado
When se ejecuta: ls docs/architecture/decisions/
Then aparece README.md en el listado

Given README.md creado
When un desarrollador lo lee
Then entiende que ahí van los ADRs del proyecto
Then entiende que THYROX usa .claude/context/decisions/ por retrocompatibilidad
```

### Consideraciones Técnicas

- El README es un placeholder — no tiene lógica, solo descripción
- No crear ADRs reales aquí; solo documentar el propósito
- Debe mencionar `adr_path` para que el directorio sea auto-explicativo

### Implementación

**Archivos a crear:**
- [README](docs/architecture/decisions/README.md)

**Complejidad:** Baja

---

## SPEC-005: Stub del tech skill sphinx

**ID:** SPEC-005
**Prioridad:** High
**Estado:** Aprobado

### Descripción

Crear [SKILL](.claude/skills/sphinx/SKILL.md) como stub siguiendo ADR-012 (tech skills
separados). El stub declara el propósito y las secciones futuras, marcadas con
`[PENDIENTE]`. El contenido completo es un WP separado.

### Criterios de Aceptación

```
Given .claude/skills/sphinx/SKILL.md creado
When se ejecuta: ls .claude/skills/sphinx/
Then aparece SKILL.md

Given SKILL.md del stub leído
When Claude busca instrucciones de Sphinx
Then encuentra el propósito del skill y las secciones marcadas [PENDIENTE]
Then entiende que el skill existe pero no está implementado
Then no intenta usar el skill para guiar configuración de Sphinx
```

### Consideraciones Técnicas

- Frontmatter YAML con `name: sphinx` y `status: stub`
- Secciones: Propósito, Estructura docs/, Convenciones RST/MD, Integración pm-thyrox
- Cada sección con `[PENDIENTE — WP sphinx-implementation]`
- No crear `references/` ni `assets/` vacíos — solo el SKILL.md

### Implementación

**Archivos a crear:**
- [SKILL](.claude/skills/sphinx/SKILL.md)

**Complejidad:** Baja

---

## SPEC-006: ADR-013 — docs/ como documentación canónica del proyecto

**ID:** SPEC-006
**Prioridad:** High
**Estado:** Aprobado

### Descripción

Crear `context/decisions/adr-013.md` que registra la decisión de separar
`.claude/` (contexto Claude) de `docs/` (documentación del proyecto), y el
mecanismo `adr_path` como solución de portabilidad.

### Criterios de Aceptación

```
Given adr-013.md creado
When se ejecuta: ls .claude/context/decisions/ | grep adr-013
Then aparece adr-013.md

Given adr-013.md leído
When un nuevo desarrollador lo lee
Then entiende por qué docs/ existe como directorio separado
Then entiende el campo adr_path y su default
Then entiende que .claude/ es efímero y docs/ es permanente
```

### Consideraciones Técnicas

- Usar `adr.md.template` existente
- Estado: Aprobado (decisión tomada en este WP)
- Referencia a H-001, H-004 del análisis

### Implementación

**Archivos a crear:**
- [adr-013](.claude/context/decisions/adr-013.md)

**Complejidad:** Baja

---

## Dependencias entre SPECs

```
SPEC-001 (adr_path en CLAUDE.md)
    ↓ requiere para ser útil
SPEC-003 (SKILL.md lee adr_path)

SPEC-001
    ↓ declara dónde van los ADRs de THYROX
SPEC-006 (ADR-013 se escribe en context/decisions/)

SPEC-004 (docs/ creado)
    ↓ justifica la existencia de
SPEC-006 (ADR-013 documenta la separación)
```

SPEC-002 y SPEC-005 son independientes.

---

## Sin ítems [NEEDS CLARIFICATION]

Todos los criterios son verificables con comandos concretos.
Las transformaciones exactas están documentadas en cada SPEC.
