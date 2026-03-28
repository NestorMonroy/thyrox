```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE) — Corrección de ERR-024
Tema: Definición correcta de work/ y sus componentes
```

# Definición: Estructura de work/ y sus componentes

## Qué es work/

`work/` es el directorio donde vive TODO el trabajo producido, organizado por paquete de trabajo con timestamp. Cada paquete contiene los artefactos que ESE trabajo necesitó.

**work/ NO reemplaza nada.** Es el contenedor. Lo que está DENTRO de cada paquete depende del trabajo:

```
work/
└── YYYY-MM-DD-HH-MM-SS-nombre/
    ├── analysis/        ← Si este trabajo necesitó análisis
    ├── epic.md          ← Si este trabajo es un epic (scope grande)
    ├── spec.md          ← Especificación (qué y por qué)
    ├── plan.md          ← Plan de implementación (tasks con checkboxes)
    ├── tasks.md         ← Tareas descompuestas (si hay muchas)
    └── lessons.md       ← Lecciones aprendidas
```

No todos los paquetes tienen todos los archivos. Un fix rápido puede tener solo `plan.md`. Un proyecto grande puede tener `analysis/`, `epic.md`, `spec.md`, `plan.md`, `tasks.md`, y `lessons.md`.

---

## Definiciones

### analysis/ (dentro de un work package)

Diagnósticos y hallazgos que este trabajo necesitó ANTES de actuar. Es la Phase 1 (ANALYZE) del trabajo.

Ejemplo: El análisis de covariancia, la comparación con spec-kit, el diagnóstico de directorios no usados — todo esto fue analysis/ del trabajo de consolidación.

**No es un directorio global.** Es POR TRABAJO. Si dos trabajos diferentes necesitan análisis, cada uno tiene su propio `analysis/`.

### epic.md

Un epic es un trabajo GRANDE que:
- Tiene scope amplio (múltiples features o cambios)
- Puede durar varios días o semanas
- Necesita descomponerse en tareas más pequeñas
- Tiene criterios de aceptación formales

**Formato (inspirado en valet .beans/ + spec-kit):**
```yaml
---
title: "Nombre del epic"
status: todo | in_progress | done
type: epic
priority: high | medium | low
created_at: YYYY-MM-DDTHH:MM:SSZ
---
```

Seguido de: Problem, Scope (in/out), Features, Acceptance Criteria.

**No todo trabajo es un epic.** Un fix, una mejora pequeña, un análisis — no son epics. Solo trabajos con scope amplio.

### spec.md

QUÉ vamos a hacer y POR QUÉ. El diseño del trabajo.

Contiene: Problem statement, approach, data model si aplica, API si aplica, boundary rules (qué cubre y qué NO cubre).

**Inspirado en:** spec-kit spec-template, valet design docs, claude-pipe PRD.

### plan.md

CÓMO vamos a hacerlo, paso a paso. Tasks con checkboxes.

Contiene: Tareas numeradas con `- [ ]`, archivos a modificar, verificación, commit messages.

**Inspirado en:** valet implementation plans, clawpal impl-plans, agentic-framework plans/.

### tasks.md

Cuando el plan tiene MUCHAS tareas (10+), se separan en tasks.md con:
- IDs (T-NNN)
- Dependencias
- Estimaciones
- Referencia al requirement que satisfacen (R-N)

**Solo para trabajos grandes.** Si el plan tiene 5 tareas, van en plan.md directamente.

### lessons.md

Qué aprendimos al hacer este trabajo. Formato L-NNNN:
- What happened
- Why it happened
- What to do next time
- Key insight

**Inspirado en:** agentic-framework L-NNNN, tu .mywork/ LECCIONES-APRENDIDAS.

---

## Ejemplo: Cómo se vería el trabajo que ya hicimos

### Trabajo 1: Limpieza arc42 y markdown links

```
work/2026-03-27-100000-limpieza-arc42-markdown/
├── spec.md          ← "Eliminar arc42, convertir backtick refs a links"
├── plan.md          ← Tasks: detectar → reemplazar → convertir → validar
└── lessons.md       ← "Siempre verificar con script antes de declarar completo"
```

### Trabajo 2: Análisis de coherencia y unificación de fases

```
work/2026-03-27-120000-coherencia-unificacion-fases/
├── analysis/
│   ├── project-analysis.md
│   └── references-analysis.md
├── spec.md          ← "Unificar orden de fases, corregir headers"
├── plan.md          ← Tasks con checkboxes
└── lessons.md       ← ERR-001, ERR-002
```

### Trabajo 3: Reorganización según anatomía oficial

```
work/2026-03-27-140000-anatomia-oficial/
├── spec.md          ← "templates→assets, scripts consolidados, tracking→assets"
├── plan.md          ← 6 tasks de renaming/moving
└── lessons.md       ← "Actualizar TODAS las referencias al mover archivos"
```

### Trabajo 4: Covariancia

```
work/2026-03-28-100000-covariancia/
├── analysis/
│   └── covariance-analysis.md
├── spec.md          ← "Las leyes deben ser invariantes en todos los marcos"
├── plan.md          ← 7 tasks (C01-C07)
└── lessons.md       ← ERR-006 (saltar fases de nuevo)
```

### Trabajo 5: Adopción de spec-kit (primera ronda)

```
work/2026-03-28-120000-spec-kit-adoption/
├── analysis/
│   └── spec-kit-comparison.md
├── spec.md          ← "Adoptar constitution, checklists, research step"
├── plan.md          ← 9 tasks (S01-S09)
└── lessons.md       ← ERR-003 a ERR-005
```

### Trabajo 6: Adopción profunda de spec-kit

```
work/2026-03-28-140000-spec-kit-deep-adoption/
├── analysis/
│   └── spec-kit-deep-analysis.md
├── spec.md          ← "[NEEDS CLARIFICATION], double check, trazabilidad"
├── plan.md          ← 8 tasks (D01-D08)
└── lessons.md       ← (sin lecciones nuevas)
```

### Trabajo 7: Investigación de proyectos de referencia

```
work/2026-03-28-160000-investigacion-referencias/
├── analysis/
│   ├── spec-kit-comparison.md
│   ├── claude-pipe-analysis.md
│   ├── claude-mlx-tts-analysis.md
│   ├── oh-my-claude-analysis.md
│   ├── conv-temp-analysis.md
│   ├── clawpal-analysis.md
│   ├── cortex-template-analysis.md
│   ├── trae-agent-analysis.md
│   ├── build-ledger-analysis.md
│   ├── agentic-framework-analysis.md
│   ├── almanack-analysis.md
│   ├── claudeviewer-analysis.md
│   ├── cc-warp-analysis.md
│   └── valet-analysis.md
├── epic.md          ← Epic: "Investigar 14 proyectos para definir patrones"
├── spec.md          ← "Analizar cada proyecto, extraer meta-patrones"
└── lessons.md       ← Síntesis de 10 patrones + ERR-022 a ERR-024
```

### Trabajo 8: Reorganización de context/ (este trabajo actual)

```
work/2026-03-28-200000-reorganizacion-context/
├── analysis/
│   ├── synthesis-14-projects.md
│   ├── work-directory-pattern-analysis.md
│   ├── naming-and-state-pattern-analysis.md
│   └── log-outputs-levels-analysis.md
├── spec.md          ← "Organizar context/ según patrones convergentes"
├── plan.md          ← Tasks de migración
└── lessons.md       ← ERR-024 (archivar en vez de organizar)
```

---

## Lo que analysis/ global NO es

`analysis/` global (el que tenemos ahora con 25+ archivos) es un error de organización. Los análisis pertenecen a su trabajo, no a un bucket global.

Pero los análisis de ERRORES (errors/) son diferentes — son transversales. Un error puede aplicar a múltiples trabajos. ¿Dónde van?

**Opción:** Los errors quedan como `lessons.md` dentro de cada work package. Si un error es transversal (aplica a todo el proyecto), va en un archivo global:

```
context/
├── lessons-learned.md    ← Lecciones globales (transversales)
└── work/
    └── .../lessons.md    ← Lecciones específicas de ese trabajo
```

O mejor: las lecciones globales se convierten en REGLAS en constitution.md o CLAUDE.md (patrón del almanack: "cada corrección → nueva regla").

---

**Última actualización:** 2026-03-28
