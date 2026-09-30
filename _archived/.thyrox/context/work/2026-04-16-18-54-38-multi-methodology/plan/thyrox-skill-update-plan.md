```yml
created_at: 2026-04-17 02:08:53
project: THYROX
work_package: 2026-04-16-18-54-38-multi-methodology
phase: Phase 6 — PLAN
author: NestorMonroy
status: Borrador
```

# Plan — Actualización de thyrox/SKILL.md post ÉPICA 40

> **Análisis de base:**
> - `analyze/thyrox-skill-problem-statement.md` — definición del problema (2 capas)
> - `analyze/thyrox-skill-update-review.md` — deep-review 1: gaps de terminología y visibilidad (Capa A)
> - `analyze/thyrox-skill-escalability-review.md` — deep-review 2: mapa de anclaje completo y lógica de escalabilidad (Capa B)
> - `analyze/methodology-landscape-analysis.md` — origen V3.1: los 6 namespaces son subset de 15 frameworks; extensibilidad requerida

---

## Problema a resolver

`thyrox/SKILL.md` es el punto de entrada del framework pero describe solo el ciclo THYROX base (12 workflow stages). ÉPICA 40 construyó 29 methodology skills que operan en dos capas simultáneas con el ciclo THYROX. El SKILL no documenta:

- **Capa A (visibilidad):** que existen 29 methodology skills, cuáles son, cómo se eligen, y cómo se relacionan con los workflow stages
- **Capa B (coherencia):** que la lógica de escalabilidad (micro/pequeño/mediano/grande) cambia cuando hay un `flow:` activo — algunos stages se vuelven no-saltables

---

## Scope

### In-scope

| # | Archivo | Tipo de cambio |
|---|---------|---------------|
| A1 | `thyrox/SKILL.md` | Nueva sección "Methodology skills" con tabla corregida de 6 metodologías × stages reales |
| A2 | `thyrox/SKILL.md` | Nueva sección "Arquitectura de orquestación" (Nivel 1 workflow stages + Nivel 2 methodology skills) |
| A3 | `thyrox/SKILL.md` | Adición en "References por dominio" — subsección "Methodology skills" |
| A4 | `thyrox/SKILL.md` | Nota bajo tabla de escalabilidad: "Con flow activo, stages con anclaje son no-saltables" |
| A5 | `thyrox/SKILL.md` | Adición en tabla de artefactos: fila con artefactos de methodology skills vs artefactos THYROX |
| A6 | `workflow-discover/references/scalability.md` | Nueva sección "Escalabilidad con methodology skill activo" — reglas detalladas |
| A7 | `thyrox/SKILL.md` | Nota de extensibilidad en sección "Methodology skills" — el set de 6 es estado actual, no conjunto cerrado |

### Out-of-scope

- No se reescriben secciones existentes del SKILL.md — solo adiciones
- No se crea un skill nuevo `workflow-anatomy` — se documenta "framework patterns" como nota, no como skill
- No se modifican los SKILL.md de los 29 methodology skills — ya declaran correctamente su `THYROX Stage:`
- No se toca `CLAUDE.md` — el glosario ya documenta `flow:` y `methodology_step:`

---

## Contenido de cada adición

### A1 — Sección "Methodology skills"

**Ubicación:** después de la tabla "Catálogo de fases" (después de línea ~57 del SKILL.md actual)

**Contenido clave:**
- Tabla de 6 metodologías con: namespace, metodología, skills disponibles (lista), stages de anclaje **completos** (no simplificados — usar la tabla maestra del deep-review 2, Sección A)
- Regla de selección por necesidad (6 bullets: PDCA, DMAIC, RUP, RM, PMBOK, BABOK)
- Instrucción de activación: invocar directamente el skill, ej. `/dmaic-define`

**Tabla de anclaje corregida (datos de escalability-review.md, Sección A):**

| Namespace | Skills | Stages de anclaje reales |
|-----------|--------|--------------------------|
| `pdca:` | pdca-plan, pdca-do, pdca-check, pdca-act | 3, 10, 11, 12 |
| `dmaic:` | dmaic-define, dmaic-measure, dmaic-analyze, dmaic-improve, dmaic-control | 2, 3, 10, 11, 12 |
| `rup:` | rup-inception, rup-elaboration, rup-construction, rup-transition | 1, 3, 5, 7, 10, 11, 12 |
| `rm:` | rm-elicitation, rm-analysis, rm-specification, rm-validation, rm-management | 1, 3, 5, 7, 9, 10, 11 |
| `pm:` | pm-initiating, pm-planning, pm-executing, pm-monitoring, pm-closing | 1, 3, 5, 6, 7, 10, 11, 12 |
| `ba:` | ba-planning, ba-elicitation, ba-requirements-analysis, ba-requirements-lifecycle, ba-solution-evaluation, ba-strategy | 1, 2, 3, 5, 6, 7, 10, 11, 12 |

### A2 — Sección "Arquitectura de orquestación"

**Ubicación:** antes de "Modelo de permisos"

**Contenido:**
- Diagrama conceptual de dos niveles (Nivel 1: workflow stages, Nivel 2: methodology skills)
- Definición de ambos niveles con el campo de `now.md` que los rastrea
- Ejemplo concreto: `flow: dmaic` en Stage 3 — qué campos activos en now.md, qué artefacto produce
- Nota sobre "Framework patterns": trabajo sin `flow:` (ej: skill-anatomy-task-plan) — no requiere skill dedicado

### A3 — Subsección en "References por dominio"

**Ubicación:** nueva subsección al inicio de la sección "References por dominio"

**Contenido:**
- Título "Methodology skills (selección por contexto)"
- Referencia a la tabla de la sección A1
- 2-3 links de entrada rápida por namespace (link al SKILL.md del primer paso de cada metodología)

### A4 — Nota bajo tabla de escalabilidad

**Ubicación:** inmediatamente después de la tabla micro/pequeño/mediano/grande

**Contenido (nota breve):**
```
> **Con `flow:` activo:** los stages donde el flow tiene methodology skills anclados
> son **no-saltables**, independientemente del tamaño del WP.
> Ver reglas detalladas en [scalability.md → Escalabilidad con flow activo].
```

### A5 — Fila en tabla de artefactos

**Ubicación:** en la tabla "Dónde viven los artefactos", agregar fila transversal

**Contenido:**
```
| Con flow activo | Artefacto del methodology skill | `work/{wp}/{methodology}-{step}.md` | Template del skill de metodología |
```

Ejemplo inline: "Con `flow: dmaic` en Stage 3: artefacto es `{wp}/dmaic-define.md`, no solo `analyze/*.md`"

### A6 — Sección en scalability.md

**Ubicación:** al final del archivo `workflow-discover/references/scalability.md`

**Contenido:**
- Sección "Escalabilidad con methodology skill activo"
- Regla de precedencia: "stages con anclaje son no-saltables"
- Tabla: `flow: dmaic` → stages obligatorios (2, 3, 10, 11, 12) vs opcionales
- Tabla: `flow: pdca` → stages obligatorios (3, 10, 11, 12) vs opcionales
- Tabla: `flow: rm` → stages obligatorios (1, 3, 5, 7, 9, 10, 11) vs opcionales
- Regla de convivencia: workflow stage + methodology skill son complementarios, no excluyentes
- Referencia al campo `flow:` en `now.md` como fuente de verdad

### A7 — Nota de extensibilidad en sección "Methodology skills"

**Ubicación:** inmediatamente después de la tabla de 6 metodologías en la sección A1

**Origen:** `analyze/methodology-landscape-analysis.md` — los 6 namespaces son la implementación actual de un universo de 15 frameworks investigados en V3.1. El framework no es de conjunto cerrado.

**Contenido:**

```markdown
> **Framework extensible:** Los 6 namespaces listados son los methodology skills
> implementados actualmente (ÉPICA 40). El framework soporta incorporar cualquier
> marco metodológico adicional siguiendo el patrón `{metodología}-{paso}` con
> declaración de `THYROX Stage:` en su SKILL.md y anatomía completa
> (SKILL.md + assets/ + references/).
>
> Frameworks del landscape original (V3.1) pendientes de implementación:
> SDLC, Lean Six Sigma, Problem Solving 8-step, Strategic Planning,
> Strategic Management, Consulting Process, Business Process Analysis.
```

---

## Evaluación de tamaño

| Criterio | Valor |
|----------|-------|
| Archivos modificados | 2 (`thyrox/SKILL.md`, `scalability.md`) — A7 va dentro de A1, sin archivo nuevo |
| Tipo de cambio | Adiciones de texto (no reescrituras) — bajo riesgo de regresión |
| Fuente de contenido | Derivado directamente de los dos deep-reviews — no hay investigación pendiente |
| Sesiones estimadas | 1 sesión corta |

**Tamaño: Pequeño.** Las 6 adiciones están completamente especificadas en este plan — no hay ambigüedad sobre qué escribir, solo dónde insertarlo. No se requiere `plan-execution/` con task-plan: se puede ejecutar directamente con este plan como referencia.

---

## Criterio de completitud

El trabajo está completo cuando:

1. `thyrox/SKILL.md` tiene sección "Methodology skills" con tabla de 6 metodologías y stages reales (A1)
2. `thyrox/SKILL.md` tiene nota de extensibilidad con frameworks pendientes de V3.1 (A7, dentro de A1)
3. `thyrox/SKILL.md` tiene sección "Arquitectura de orquestación" con los dos niveles y ejemplo concreto (A2)
4. `thyrox/SKILL.md` tiene nota bajo la tabla de escalabilidad referenciando stages no-saltables (A4)
5. `thyrox/SKILL.md` tiene fila en artefactos documentando artefactos con flow activo (A5)
6. `thyrox/SKILL.md` tiene subsección en "References por dominio" para methodology skills (A3)
7. `scalability.md` tiene sección "Escalabilidad con methodology skill activo" con reglas detalladas y tablas por flow (A6)

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| La tabla de anclaje A1 queda desactualizada si se agregan nuevas metodologías | Baja | A7 aclara que es estado actual, no conjunto cerrado; cada skill declara su `THYROX Stage:` como fuente de verdad |
| La nota A4 es insuficiente y un usuario igual salta stages incorrectamente | Media | La referencia a scalability.md (A6) provee el detalle — el SKILL.md señala, scalability.md explica |
| La lista de frameworks pendientes en A7 genera expectativas de implementación | Baja | La nota aclara que son "pendientes de implementación" — no compromisos |
