```yml
type: Análisis de Calidad
title: Análisis profundo de archivos de referencia — calidad de idioma y abstraccón
work_package: 2026-04-11-10-52-25-thyrox-commands-namespace
created_at: 2026-04-11 11:32:08
fase: FASE 31
phase: Phase 1 — ANALYZE
scope: .claude/references/*.md (12 archivos)
context: claude-howto (repo de referencia) — 10 archivos README comparativos
```

# Análisis de Calidad — Archivos de Referencia THYROX

Análisis profundo de los 12 archivos en `.claude/references/` para identificar:
correcciones de idioma (español técnico mexicano sin anglicismos), eliminación de
etiquetas informales, abstracción de contenido proyecto-específico.

Análisis comparativo con `luongnv89/claude-howto` (clonado en `/tmp/reference/claude-howto`).

---

## 1. Contexto comparativo — claude-howto

### Estructura del repositorio de referencia

El repositorio `claude-howto` organiza su documentación en **10 secciones temáticas**,
cada una con un `README.md` que actúa como referencia técnica:

| Sección | Tema |
|---------|------|
| `01-slash-commands/README.md` | Slash commands y skills |
| `02-memory/README.md` | CLAUDE.md y memoria |
| `03-skills/README.md` | Anatomía de skills, frontmatter |
| `04-subagents/README.md` | Subagentes nativos |
| `05-mcp/README.md` | Model Context Protocol |
| `06-hooks/README.md` | Hooks de ciclo de vida |
| `07-plugins/README.md` | Plugins y namespace de comandos |
| `08-checkpoints/README.md` | Checkpointing y rewind |
| `09-advanced-features/README.md` | Configuración avanzada y modos |
| `10-cli/README.md` | CLI y opciones de línea de comandos |

THYROX tiene **12 archivos** de referencia — los mismos temas de Claude Code más
dos archivos propios (`examples.md`, `conventions.md`).

### Principios que seguir (observados en claude-howto)

1. **Abstracción total** — los READMEs de claude-howto no contienen ejemplos ligados
   a ningún proyecto específico. Los ejemplos son genéricos o sintéticos.
2. **Idioma consistente** — toda la documentación está en un único idioma sin mezcla.
3. **Sin etiquetas informales** — los encabezados son descriptivos y técnicos,
   nunca coloquiales.
4. **Cobertura por tema** — cada archivo cubre un tema de la plataforma, no metodologías
   propias del equipo que usa la plataforma.

---

## 2. Catálogo de problemas — etiquetas

| Etiqueta | Descripción |
|----------|-------------|
| `[ENC]` | Corrupción de codificación UTF-8 (p.ej. `Ã³` en vez de `ó`) |
| `[ENG]` | Encabezados de sección o párrafos completos en inglés |
| `[LABEL]` | Etiqueta informal o coloquial (p.ej. "Regla de oro", "Reglas de oro") |
| `[PROYECT]` | Contenido ligado a un proyecto específico en vez de ser genérico |
| `[ADT]` | Ejemplos referenciando el proyecto ADT (Sphinx, architecture docs, RST) |
| `[THYROX]` | Detalles específicos del framework THYROX que limitan reutilización |
| `[ACCENT]` | Falta de acentos en texto español |
| `[TITLE]` | Título del archivo en inglés o con nombre de proyecto |

---

## 3. Análisis por archivo

### 3.1 `long-context-tips.md` — GRAVEDAD CRÍTICA

**Veredicto: Reescritura total requerida.**

| Problema | Instancias |
|----------|-----------|
| `[ENC]` | Todo el archivo — `Ã³`, `Ã¡`, `Ã©`, `Â¿`, `Â±` en lugar de `ó`, `á`, `é`, `¿`, `ñ` |
| `[ENG]` | Encabezados: "Essential Tips", "Ground Responses in Quotes" |
| `[PROYECT]` | "Adaptado para: THYROX" en cuerpo y pie del documento |
| `[ADT]` | Todos los ejemplos de código referencian proyecto "ADT" (Sphinx, architecture docs, RST) |
| `[TITLE]` | Título del H1: "Long Context Tips - Trabajar con Documentos Grandes" |

**Detalle de corrupción de codificación (muestra):**

```
# Archivo actual (roto):
## PropÃ³sito
CompilaciÃ³n de mejores prÃ¡cticas

# Corrección esperada:
## Propósito
Compilación de mejores prácticas
```

La corrupción es sistemática — el archivo fue guardado con codificación incorrecta
(probablemente Latin-1 interpretado como UTF-8). Toda instancia de vocal acentuada
está afectada.

**Abstracción requerida:** Los ejemplos referenciando "ADT", "architecture docs",
"Sphinx", "RST", "section-01..13" deben reemplazarse por ejemplos genéricos
(p.ej. `<documento>`, `<sección>`) que apliquen a cualquier proyecto.

**Ejemplo de abstracción:**

```
# Antes (específico a ADT):
Traducir architecture docs section 10 de inglés a español.

# Después (genérico):
Traducir el documento técnico sección-10 al español.
```

---

### 3.2 `examples.md` — GRAVEDAD ALTA

**Veredicto: Reescritura total requerida.**

| Problema | Instancias |
|----------|-----------|
| `[TITLE]` | H1: "THYROX Use Cases & Examples" (inglés + nombre del framework) |
| `[ENG]` | Párrafo introductorio completo en inglés: "This document provides real-world examples..." |
| `[ENG]` | Encabezados de casos de uso en inglés: "Use Case 1: Simple Feature - Add Password Reset" |
| `[PROYECT]` | Todos los 8 casos de uso modelan el framework THYROX, no son genéricos |
| `[PROYECT]` | Comandos inexistentes: `/task:create`, `/task:show`, `/task:next`, `/task:complete` |
| `[PROYECT]` | Referencias a `ROADMAP.md`, `ad-hoc-tasks.md`, `.claude/prds/` como artefactos |

**Problema de fondo:** Este archivo no es documentación de la *plataforma* Claude Code —
es documentación de *cómo usar THYROX*. Cumple una función diferente al resto de
las referencias. Tiene dos opciones:

**Opción A:** Moverlo dentro de `.claude/skills/thyrox/references/` o `assets/`
como ejemplo de uso del skill, no como referencia de la plataforma.

**Opción B:** Reescribirlo como "Patrones de uso de Claude Code" con ejemplos abstractos
que demuestren los 7 tipos de trabajo (feature, bug fix, refactoring, etc.)
sin mencionar THYROX como nombre.

---

### 3.3 `conventions.md` — GRAVEDAD ALTA

**Veredicto: Reescritura moderada-alta requerida.**

| Problema | Instancias |
|----------|-----------|
| `[TITLE]` | H1: "THYROX Conventions" |
| `[ENG]` | Sección entera: "## File Locations" con "All THYROX workflow files are stored in..." |
| `[ENG]` | Sección "## ROADMAP.md Format" con estructura en inglés y comentarios en inglés |
| `[ENG]` | Sección "## Conventional Commits Format" — Type names, Scope, Examples, Benefits en inglés |
| `[ENG]` | Sección "## Task Management with Claude Code" con comandos `/task:create` inexistentes |
| `[ENG]` | Sección "## Progress Tracking" con subsecciones "Daily/Weekly/Monthly Updates" en inglés |
| `[ENG]` | Sección "## Blocking and Waiting" — "Standup Status" en inglés |
| `[ENG]` | Sección "## Best Practices" — lista de prácticas en inglés |
| `[ENG]` | Sección "## When to Update What" — tabla en inglés |
| `[PROYECT]` | Estructura de directorios THYROX-específica con `skills/thyrox/` hardcodeada |
| `[PROYECT]` | Comandos `/task:*` que no existen en Claude Code genérico |
| `[PROYECT]` | Referencias a `context/epics/`, `.claude/prds/` como estructura de THYROX |

**Secciones reutilizables sin cambio:** Timestamp Format, Metadata Keys, Traceability IDs,
Parallel Agent Execution, State files naming, Longevidad de archivos, Timestamps en artefactos WP.

**Secciones a eliminar o reescribir:** File Locations, ROADMAP.md Format (la parte
en inglés), Task Management with Claude Code, Progress Tracking, Common Workflows.

---

### 3.4 `prompting-tips.md` — GRAVEDAD MEDIA

**Veredicto: Reescritura moderada requerida.**

| Problema | Instancias |
|----------|-----------|
| `[ENG]` | Encabezados de sección: "Long-Horizon Reasoning", "Context Awareness", "State Management", "Communication Style", "Tool Usage Patterns" |
| `[PROYECT]` | "Adaptado para: THYROX" en el cuerpo |
| `[ADT]` | Ejemplos referenciando proyecto ADT (Sphinx, architecture docs, RST, `section-09.rst`) |
| `[ADT]` | Sección "Casos de Uso Específicos ADT" — completamente específica a ese proyecto |
| `[ENG]` | Pie del documento: "Adaptado para: THYROX con ejemplos Sphinx, architecture docs, RST" |

**Lo que es reutilizable:** Los principios son universales. Los ejemplos solo necesitan
reemplazar referencias ADT con ejemplos genéricos (cualquier archivo de código o documento).

**Traducción de encabezados requerida:**

| Encabezado actual | Encabezado corregido |
|-------------------|---------------------|
| "Long-Horizon Reasoning" | "Razonamiento de largo alcance" |
| "Context Awareness" | "Consciencia de contexto" |
| "State Management" | "Gestión de estado" |
| "Communication Style" | "Estilo de comunicación" |
| "Tool Usage Patterns" | "Patrones de uso de herramientas" |

---

### 3.5 `skill-authoring.md` — GRAVEDAD MEDIA

**Veredicto: Reescritura moderada requerida.**

| Problema | Instancias |
|----------|-----------|
| `[LABEL]` | Línea 37: `**Regla de oro**: Solo agregar contexto que Claude NO tiene ya.` |
| `[PROYECT]` | "Adaptado para: THYROX" en el cuerpo y pie del documento |
| `[ADT]` | Múltiples ejemplos referenciando proyecto ADT (Sphinx, make html, architecture docs, RST) |
| `[ADT]` | Estructura de directorios `incremental-correction-methodology/` específica a ADT |
| `[ADT]` | Sección "Evaluaciones" con JSON de evaluación específico a Sphinx |
| `[ENG]` | "Progressive Disclosure Patterns" — encabezado en inglés |
| `[ENG]` | "Content Guidelines" — encabezado en inglés |

**Instancia específica de "Regla de oro":**

```markdown
# Antes:
**Regla de oro**: Solo agregar contexto que Claude NO tiene ya.

# Después (opción técnica):
**Principio de economía de contexto**: Agregar únicamente el contexto
que el modelo no puede inferir por sí mismo.
```

**Traducción de encabezados requerida:**

| Encabezado actual | Encabezado corregido |
|-------------------|---------------------|
| "Progressive Disclosure Patterns" | "Patrones de revelación progresiva" |
| "Content Guidelines" | "Directrices de contenido" |

---

### 3.6 `skill-vs-agent.md` — GRAVEDAD MEDIA-BAJA

**Veredicto: Corrección moderada requerida.**

| Problema | Instancias |
|----------|-----------|
| `[THYROX]` | Sección "Ejemplos del proyecto THYROX" — agentes activos con paths y propósitos de THYROX |
| `[THYROX]` | Sección "Las 5 capas y sus rutas de ejecución" — arquitectura específica de THYROX (ADR-015, TD-008, session-start.sh) |
| `[THYROX]` | Tabla de decisión menciona `/workflow_*` commands específicos de THYROX |
| `[THYROX]` | "Evidencia de dogfooding" con citas de FASE 13 de este proyecto |
| `[THYROX]` | Referencias a `thyrox` skill y rutas de archivos de este proyecto |

**Estrategia de abstracción:** Las secciones de arquitectura de capas son valiosas pero
deben presentarse como *patrón de diseño* genérico en vez de documentar la arquitectura
de THYROX específicamente. Los ejemplos deben usar nombres de agentes ficticios.

**Secciones reutilizables sin cambio:** Tabla comparativa SKILL vs Agente, Regla de
decisión, Señales de confusión frecuente, Tabla de capas (como patrón), Naturaleza
de cada mecanismo.

---

### 3.7 `hooks.md` — GRAVEDAD BAJA

**Veredicto: Corrección ligera — solo acentos y algunas referencias.**

| Problema | Instancias |
|----------|-----------|
| `[ACCENT]` | Frontmatter y cuerpo sin tildes: "Automatizacion", "deterministico", "tipico", "configuracion", "Ubicacion", "especificos", "diseno", "bloquear", "Cuando" |
| `[THYROX]` | Sección "Patrones de uso para thyrox" — específica al proyecto, pero claramente delimitada |

**Muestra de correcciones de acentos requeridas (no exhaustiva):**

```
automatizacion → automatización
deterministico → determinístico
configuracion → configuración
tipico → típico
diseno → diseño
Cuando → Cuándo (en encabezados interrogativos)
Ubicacion → Ubicación
Codigo → Código
especificos → específicos
```

**Nota:** La sección "Patrones de uso para thyrox" puede mantenerse como una sección
delimitada con comentario `<!-- SECTION OWNER: thyrox-project -->`, o abstraerse con
nombres de script genéricos. El resto del archivo es reutilizable.

---

### 3.8 `permission-model.md` — GRAVEDAD BAJA

**Veredicto: Corrección ligera — acentos y un label informal.**

| Problema | Instancias |
|----------|-----------|
| `[ACCENT]` | "decision" → "decisión", "funcion" → "función", "Proposito" → "Propósito", "Despues" → "Después", "diseno" → "diseño", "Proposito" → "Propósito", "tecnica" → "técnica" |
| `[THYROX]` | Configuración vigente en `settings.json` es THYROX-específica (útil como ejemplo, pero debe marcarse como tal) |
| `[THYROX]` | "Principios de diseno (L-106..L-109)" — nomenclatura interna de este proyecto |

**El archivo es abstracto en su mayor parte.** La tabla de comportamiento y los modos
disponibles son documentación genérica de Claude Code. La sección de configuración
vigente es útil como ejemplo, pero debería marcarse explícitamente como "ejemplo del
proyecto actual" o moverse a un archivo de configuración del proyecto.

---

### 3.9 `checkpointing.md` — GRAVEDAD BAJA

**Veredicto: Corrección ligera — acentos y referencias.**

| Problema | Instancias |
|----------|-----------|
| `[ACCENT]` | Frontmatter: "gestion", "Rewind". Cuerpo: "automaticamente", "checkpoint" (ya es anglicismo técnico), "Secuenciales", "Limitacion", "grafico", "recomendacion" |
| `[THYROX]` | Ejemplo "Impacto en thyrox" con `sync-wp-state.sh` y `now.md` — útil pero específico |

**El archivo es mayormente abstracto.** La comparación "Checkpointing vs Git" y las
tablas de acciones son documentación genérica. El ejemplo de impacto en hooks puede
abstraerse a nombres de script genéricos.

---

### 3.10 `state-management.md` — GRAVEDAD BAJA

**Veredicto: Corrección ligera — label informal y acentos.**

| Problema | Instancias |
|----------|-----------|
| `[LABEL]` | Líneas 101-108: sección `## Reglas de oro` como encabezado formal |
| `[ACCENT]` | Frontmatter: "Gestion", "actualizacion". Cuerpo: algunos "estan" sin tilde |
| `[THYROX]` | Contenido es THYROX-específico por diseño (describe los archivos `now.md`, `focus.md`) — aceptable en este caso |

**Instancia de "Reglas de oro":**

```markdown
# Antes:
## Reglas de oro

> `now.md` es la fuente de verdad para `session-start.sh`.

# Después (opción técnica):
## Invariantes del sistema de estado

> `now.md` es la fuente de verdad para `session-start.sh`.
```

**Nota:** `state-management.md` es inherentemente THYROX-específico (describe los
archivos internos del framework), por lo que el contenido específico es aceptable.
Solo requiere corregir el label y los acentos.

---

### 3.11 `agent-spec.md` — GRAVEDAD MÍNIMA

**Veredicto: Corrección mínima.**

| Problema | Instancias |
|----------|-----------|
| `[THYROX]` | Frontmatter: `work_package: 2026-04-07-03-08-03-agent-format-spec` — ID de WP de este proyecto |
| `[THYROX]` | Línea 13: "Este documento es el **gate de WP-1** (`parallel-agent-conventions`)" — referencia a WP interno |
| `[THYROX]` | Path `.claude/scripts/lint-agents.py` es específico de este proyecto (válido como ejemplo) |

**El contenido técnico es genérico y reutilizable.** Solo requiere generalizar el
párrafo del gate WP-1 para que no sea una referencia a un WP de THYROX.

---

### 3.12 `claude-code-components.md` — GRAVEDAD MÍNIMA

**Veredicto: Sin cambios requeridos o mínimos.**

Este archivo es documentación técnica de la plataforma Claude Code. No presenta
problemas de Spanglish, etiquetas informales, corrupción de codificación ni contenido
específico de THYROX. Es el archivo de referencia con menor deuda de calidad.

Posibles mejoras menores: verificar que todos los acentos estén presentes en el
cuerpo del documento (lectura superficial sugiere limpieza aceptable).

---

## 4. Resumen por gravedad

| Gravedad | Archivos | Tipo de intervención |
|----------|----------|---------------------|
| **Crítica** | `long-context-tips.md` | Reescritura total (codificación rota + contenido ADT + inglés) |
| **Alta** | `examples.md`, `conventions.md` | Reescritura total o reubicación |
| **Media** | `prompting-tips.md`, `skill-authoring.md`, `skill-vs-agent.md` | Reescritura moderada |
| **Baja** | `hooks.md`, `permission-model.md`, `checkpointing.md`, `state-management.md` | Corrección ligera (acentos + labels) |
| **Mínima** | `agent-spec.md`, `claude-code-components.md` | Una o dos líneas |

---

## 5. Inventario de problemas por tipo

| Tipo | Archivos afectados | Cantidad estimada de instancias |
|------|-------------------|--------------------------------|
| `[ENC]` Codificación rota | `long-context-tips.md` | ~150+ instancias |
| `[ENG]` Inglés en secciones | `conventions.md`, `examples.md`, `prompting-tips.md`, `skill-authoring.md`, `long-context-tips.md` | ~30 encabezados / párrafos |
| `[LABEL]` Etiquetas informales | `skill-authoring.md`, `state-management.md` | 2 instancias (`Regla de oro`, `Reglas de oro`) |
| `[PROYECT]` Ligado a THYROX | `examples.md`, `conventions.md`, `skill-vs-agent.md`, `agent-spec.md` | ~20 secciones |
| `[ADT]` Ejemplos ADT/Sphinx | `long-context-tips.md`, `prompting-tips.md`, `skill-authoring.md` | ~40+ ejemplos de código |
| `[ACCENT]` Faltan acentos | `hooks.md`, `permission-model.md`, `checkpointing.md`, `state-management.md` | ~60 palabras |

---

## 6. Prioridad de corrección propuesta

### Fase A — Correcciones críticas (bloquean reutilización)

1. `long-context-tips.md` — reescritura completa (encoding + contenido)
2. `examples.md` — decisión de reubicación o reescritura

### Fase B — Correcciones de abstracción

3. `conventions.md` — eliminar secciones en inglés y adaptar estructura genérica
4. `prompting-tips.md` — traducir encabezados y reemplazar ejemplos ADT
5. `skill-authoring.md` — traducir encabezados, eliminar "Regla de oro", reemplazar ejemplos ADT

### Fase C — Correcciones ligeras (sin cambio de contenido)

6. `hooks.md` — acentos
7. `permission-model.md` — acentos
8. `checkpointing.md` — acentos
9. `state-management.md` — "Reglas de oro" → "Invariantes del sistema de estado"
10. `skill-vs-agent.md` — abstraer sección de capas THYROX
11. `agent-spec.md` — eliminar referencia al WP-1 interno

---

## 7. Comparación final THYROX vs claude-howto

| Dimensión | THYROX `.claude/references/` | claude-howto |
|-----------|------------------------------|-------------|
| Cantidad de archivos | 12 | 10 READMEs temáticos |
| Idioma | Español con mezcla inglés | Inglés uniforme |
| Codificación | 1 archivo corrupto | Sin problemas |
| Abstracción | 3-5 archivos con ejemplos de proyectos específicos | Ejemplos genéricos |
| Etiquetas informales | 2 instancias | Sin instancias |
| Cobertura de plataforma | Amplia + convenciones propias | Solo plataforma Claude Code |

**Conclusión:** El problema raíz no es la cantidad de archivos ni el idioma, sino que
varios archivos son adaptaciones de documentación de proyectos específicos (ADT, THYROX
como nombre propio) en vez de documentación abstracta de la plataforma. La corrección
debe primero decidir si cada archivo es documentación de la *plataforma* (debe ser
genérico) o documentación del *framework THYROX* (puede ser específico pero debe estar
en la ubicación correspondiente dentro del skill).

---

## Archivos analizados

| Archivo | Líneas | Gravedad | Veredicto |
|---------|--------|----------|-----------|
| `long-context-tips.md` | 672 | Crítica | Reescritura total |
| `examples.md` | 580 | Alta | Reescritura total / reubicar |
| `conventions.md` | 765 | Alta | Reescritura moderada-alta |
| `prompting-tips.md` | 662 | Media | Reescritura moderada |
| `skill-authoring.md` | 840 | Media | Reescritura moderada |
| `skill-vs-agent.md` | 145 | Media-baja | Corrección moderada |
| `hooks.md` | 309 | Baja | Corrección ligera (acentos) |
| `permission-model.md` | 218 | Baja | Corrección ligera (acentos) |
| `checkpointing.md` | 160 | Baja | Corrección ligera (acentos) |
| `state-management.md` | 107 | Baja | Corrección ligera (label) |
| `agent-spec.md` | 142 | Mínima | 1-2 líneas |
| `claude-code-components.md` | 402 | Mínima | Sin cambios o mínimos |
