```yml
type: Plan de Corrección
title: Orden de corrección — 12 archivos de referencia
work_package: 2026-04-11-10-52-25-thyrox-commands-namespace
created_at: 2026-04-11 17:20:53
fase: FASE 31
phase: Phase 1 — ANALYZE (suplemento)
input: references-quality-analysis.md
alimenta: FASE 32 (references-refactor) — Phase 5 task-plan
```

# Plan de Corrección — Archivos de Referencia

Orden de intervención y cambios concretos requeridos en cada uno de los 12
archivos de `.claude/references/`. Derivado del análisis [references-quality-analysis](references-quality-analysis.md).

Los cambios se aplican en grupos secuenciales: cada grupo puede ejecutarse en
paralelo dentro del grupo, pero el Grupo A debe completarse antes del Grupo B.

---

## Grupo A — Correcciones bloqueantes

**Precondición:** ninguna. Empezar aquí.
**Pueden ejecutarse en paralelo.**

---

### A-1: `long-context-tips.md` — Reescritura total

**Problema:** Codificación UTF-8 rota en todo el archivo + ejemplos de proyecto ADT
(Sphinx, architecture docs, RST) + encabezados en inglés.

**Acciones requeridas:**

1. **Recrear el archivo desde cero** — no editar el existente (la corrupción es
   sistemática y corregirla carácter a carácter sería más costoso que reescribir).

2. **Estructura del archivo nuevo:**

```markdown
# Manejo de contexto extenso — Mejores prácticas

## Propósito
[descripción genérica del tema]

## 1. Datos primero, consulta al final
## 2. Estructurar documentos con etiquetas XML
## 3. Anclar respuestas en citas del documento fuente
## 4. Puntos de verificación en documentos extensos
## 5. Metadatos en XML
## Antipatrones a evitar
## Síntesis de principios
```

3. **Reemplazar ejemplos ADT:** Todo ejemplo que mencione "architecture docs",
   "Sphinx", "RST", "ADT", `section-01..13` debe reemplazarse con equivalentes
   genéricos. Usar nombres de archivo sintéticos: `documento-fuente.md`,
   `sección-01`, `proyecto`.

4. **Encabezados a traducir:**

   | Encabezado actual (roto) | Encabezado correcto |
   |--------------------------|---------------------|
   | "Essential Tips" | "Principios fundamentales" |
   | "Ground Responses in Quotes" | "Anclar respuestas en citas" |
   | "Anti-Patterns (Evitar)" | "Antipatrones a evitar" |

5. **Actualizar frontmatter:**
   - Eliminar `Adaptado para: THYROX` del cuerpo
   - Eliminar pie de documento con "Adaptado para: THYROX con ejemplos Sphinx..."
   - Cambiar `type: Mejores Prácticas Anthropic` → `type: Reference`

---

### A-2: `examples.md` — Reubicación + reescritura

**Problema:** El archivo documenta el framework THYROX, no la plataforma Claude Code.
No es una referencia de plataforma — es documentación interna del skill.

**Decisión de arquitectura (registrar como ADR si se aprueba):**

`examples.md` debe moverse de `.claude/references/` a
`.claude/skills/thyrox/references/examples.md`.

**Razón:** Los 8 casos de uso documentan cómo usar el *skill thyrox* con la
metodología de 7 fases. Eso es documentación del skill, no de la plataforma Claude Code.

**Acciones requeridas:**

1. Mover a `.claude/skills/thyrox/references/examples.md`
2. Actualizar referencias en SKILL.md si las hubiera
3. En `.claude/references/`, dejar un archivo `examples.md` vacío o con redirección,
   o directamente no tener un `examples.md` en references/ si no hay contenido
   genérico que documentar.

**Alternativa (si se decide mantener en references/):** Reescribir con 8 casos de uso
de *Claude Code* genéricos (no THYROX), por ejemplo: cómo structurar un skill,
cómo configurar un hook, cómo usar subagentes, etc.

---

## Grupo B — Correcciones de abstracción (inglés → español técnico)

**Precondición:** Grupo A completo o en progreso (no hay dependencia técnica, sí lógica).
**Pueden ejecutarse en paralelo entre sí.**

---

### B-1: `conventions.md` — Eliminar secciones en inglés

**Problema:** El 40% del archivo está en inglés. Secciones enteras usan inglés como
idioma principal. El título H1 incluye el nombre del framework.

**Acciones requeridas:**

1. **Cambiar título H1:**
   ```
   Antes: # THYROX Conventions
   Después: # Convenciones del Proyecto
   ```

2. **Traducir sección "## File Locations":**
   ```
   Antes: ## File Locations
          All THYROX workflow files are stored in...
   Después: ## Ubicación de archivos
            Los archivos del framework se organizan en la siguiente estructura:
   ```
   Generalizar la estructura de directorios — eliminar `skills/thyrox/` hardcodeado.

3. **Eliminar sección "## Task Management with Claude Code"** — contiene comandos
   `/task:create`, `/task:show`, `/task:next`, `/task:complete` que no existen en
   Claude Code estándar. Esta funcionalidad no es de la plataforma.

4. **Traducir sección "## Conventional Commits Format":**
   - Mantener los tipos de commit en inglés (son un estándar — `feat`, `fix`, `docs`)
   - Traducir descripciones y subsecciones:
     ```
     Antes: ### Type / ### Scope / ### Benefits
     Después: ### Tipos / ### Alcance / ### Beneficios
     ```

5. **Eliminar o traducir secciones de gestión de proyecto en inglés:**
   - "Progress Tracking" → "Seguimiento de avance"
   - "Blocking and Waiting" → "Bloqueos y esperas"
   - "Standup Status" → eliminar (es THYROX-específico)
   - "Best Practices" → "Mejores prácticas"
   - "When to Update What" → "Cuándo actualizar qué"

6. **Tabla de contenidos:** regenerar en español.

---

### B-2: `prompting-tips.md` — Traducir encabezados y reemplazar ADT

**Problema:** 5 encabezados de sección en inglés. Todos los ejemplos referencian
proyecto ADT. "Adaptado para: THYROX" en cuerpo y pie.

**Acciones requeridas:**

1. **Traducir encabezados de sección:**

   | Antes | Después |
   |-------|---------|
   | `## Long-Horizon Reasoning` | `## Razonamiento de largo alcance` |
   | `## Context Awareness` | `## Consciencia de contexto` |
   | `## State Management` | `## Gestión de estado` |
   | `## Communication Style` | `## Estilo de comunicación` |
   | `## Tool Usage Patterns` | `## Patrones de uso de herramientas` |

2. **Reemplazar ejemplos ADT:**
   - "Traducir architecture docs section 10" → "Procesar documento-técnico sección 10"
   - "build de Sphinx con 230 warnings" → "compilación con 230 advertencias"
   - Referencias a `.rst`, `make html`, `conf.py` → referencias genéricas o eliminar

3. **Eliminar sección "## Casos de Uso Específicos ADT"** — es 100% específica al
   proyecto ADT. Reemplazar con una sección "## Escenarios de uso comunes" con
   ejemplos genéricos.

4. **Actualizar frontmatter y pie:**
   - Eliminar `Adaptado para: THYROX` del cuerpo del documento
   - Actualizar pie: eliminar "con ejemplos Sphinx, architecture docs, RST"

---

### B-3: `skill-authoring.md` — Eliminar "Regla de oro" y reemplazar ADT

**Problema:** Etiqueta informal "Regla de oro", ejemplos ADT en ~60% del documento,
2 encabezados en inglés.

**Acciones requeridas:**

1. **Eliminar "Regla de oro":**
   ```markdown
   Antes:
   **Regla de oro**: Solo agregar contexto que Claude NO tiene ya.

   Después:
   **Principio de economía de contexto**: Agregar únicamente el contexto
   que el modelo no puede inferir por sí mismo.
   ```

2. **Traducir encabezados:**

   | Antes | Después |
   |-------|---------|
   | `## Progressive Disclosure Patterns` | `## Patrones de revelación progresiva` |
   | `## Content Guidelines` | `## Directrices de contenido` |

3. **Reemplazar ejemplos ADT:**
   Todos los ejemplos que referencian "ADT", "Sphinx", "RST", "architecture docs",
   `make html`, `section-08.rst` deben reemplazarse con ejemplos genéricos.

   Patrón de sustitución:
   - "Ejecutar build de Sphinx y analizar warnings" → "Ejecutar suite de pruebas y analizar fallos"
   - `make clean && make html 2>&1 | tee build-output.txt` → `npm test 2>&1 | tee test-output.txt`
   - "corrección de 230 warnings" → "corrección de N advertencias"
   - `source/architecture/section-08.rst` → `src/modulo-objetivo.py`

4. **Actualizar frontmatter y pie:**
   - Eliminar `Adaptado para: THYROX` del cuerpo
   - Actualizar pie: eliminar referencias ADT

---

## Grupo C — Correcciones de abstracción (THYROX-específico → genérico)

**Precondición:** Grupo A completo.
**Pueden ejecutarse en paralelo entre sí.**

---

### C-1: `skill-vs-agent.md` — Abstraer sección de capas THYROX

**Problema:** La sección "Las 5 capas y sus rutas de ejecución" documenta la
arquitectura interna de THYROX (ADR-015, TD-008, session-start.sh, FASE 13).

**Acciones requeridas:**

1. **Tabla "Ejemplos del proyecto THYROX":**
   Mantener como sección separada explícitamente marcada:
   ```markdown
   ## Ejemplos de implementación
   > Nota: los ejemplos siguientes corresponden a este proyecto.
   > En otros proyectos, los nombres y paths serán diferentes.
   ```

2. **Sección "Las 5 capas y sus rutas de ejecución":**
   Presentarla como *patrón de arquitectura* reutilizable, no como descripción
   de THYROX. Eliminar referencias a ADR-015, TD-008, sesión-start.sh por nombre.

3. **Evidencia de dogfooding FASE 13:**
   Eliminar la referencia específica a "FASE 13" y los números de timeout observados.
   Reemplazar con: "prompts extensos aumentan el riesgo de timeout en ejecución paralela".

4. **Tabla "rutas (hoy vs objetivo)":**
   Eliminar referencia a TD-008 y `/workflow_*` como nombres propios del framework.
   Generalizar a "comandos slash sincronizados" vs "desactualizados".

---

## Grupo D — Correcciones ligeras

**Precondición:** ninguna — pueden ejecutarse en cualquier momento.
**Pueden ejecutarse en paralelo entre sí.**

---

### D-1: `state-management.md` — Encabezado informal + acentos

**Acciones requeridas:**

1. **Cambiar encabezado "## Reglas de oro":**
   ```markdown
   Antes: ## Reglas de oro
   Después: ## Invariantes del sistema de estado
   ```

2. **Corregir acentos en frontmatter:**
   ```yaml
   Antes: type: Referencia — Gestión de Estado de Sesión
   # (verificar que no haya corrupción)
   ```

3. **Corregir acentos en cuerpo** (verificar con búsqueda de palabras sin tilde
   como "gestion", "actualizacion", "estan").

---

### D-2: `hooks.md` — Solo acentos

**Acciones requeridas:**

Corregir todas las palabras sin tilde en frontmatter y cuerpo del documento.
Lista de correcciones (no exhaustiva — buscar con grep):

| Antes | Después |
|-------|---------|
| `automatizacion` | `automatización` |
| `deterministico` | `determinístico` |
| `configuracion` | `configuración` |
| `tipico` | `típico` |
| `diseno` | `diseño` |
| `Ubicacion` | `Ubicación` |
| `Codigo` | `Código` |
| `especificos` | `específicos` |
| `Cuando usar` | `Cuándo usar` |
| `Limitaciones importantes` | ya tiene tilde — verificar |
| `Precedencia` | verificar |

**Verificación:** después de corregir, ejecutar:
```bash
grep -n "[a-z]on\b\|[a-z]al\b\|[a-z]el\b" .claude/references/hooks.md | grep -v "```"
```
(ayuda a encontrar palabras como "configuracion" que debieran ser "configuración")

---

### D-3: `permission-model.md` — Solo acentos

**Acciones requeridas:**

Corregir acentos en todo el documento. Lista principal:

| Antes | Después |
|-------|---------|
| `decision` | `decisión` |
| `funcion` | `función` |
| `Proposito` | `Propósito` |
| `Despues` | `Después` |
| `diseno` | `diseño` |
| `Configuracion` | `Configuración` |
| `operacion` | `operación` |
| `ejecucion` | `ejecución` |

**Sección "Principios de diseno (L-106..L-109)":**
- Cambiar "diseno" → "diseño"
- La nomenclatura L-106..L-109 es interna — puede mantenerse o eliminarse

---

### D-4: `checkpointing.md` — Solo acentos

**Acciones requeridas:**

Corregir acentos en frontmatter y cuerpo:

| Antes | Después |
|-------|---------|
| `gestion` (frontmatter title) | `gestión` |
| `recomendacion` | `recomendación` |
| `automaticamente` | `automáticamente` |
| `Limitacion critica` | `Limitación crítica` |

---

## Grupo E — Correcciones mínimas

**Precondición:** ninguna. Pueden ejecutarse en cualquier momento.**Pueden ejecutarse en paralelo entre sí.**

---

### E-1: `agent-spec.md` — Eliminar referencia a WP interno

**Acciones requeridas:**

1. **Frontmatter:** eliminar o generalizar el campo:
   ```yaml
   Antes: work_package: 2026-04-07-03-08-03-agent-format-spec
   Después: (eliminar este campo — es metadata interna de proyecto)
   ```

2. **Línea 13:** Generalizar la referencia al gate:
   ```markdown
   Antes:
   Este documento es el **gate de WP-1** (`parallel-agent-conventions`).
   Ninguna tarea que modifique agentes existentes debe iniciar hasta que esta spec esté aprobada.

   Después:
   Este documento define los estándares de formato para agentes nativos.
   Validar contra esta especificación antes de modificar o crear agentes.
   ```

---

### E-2: `claude-code-components.md` — Sin cambios requeridos

Verificación de acentos como única acción (lectura superficial indica limpieza aceptable).
Si se encuentra algún acento faltante, corregir. Sin cambios de contenido requeridos.

---

## Resumen ejecutivo — Orden de ejecución

```
Grupo A (bloqueantes)
  └── A-1: long-context-tips.md    → reescritura total
  └── A-2: examples.md             → reubicación + decisión ADR

Grupo B (abstracción — iniciar en paralelo con Grupo C y D)
  ├── B-1: conventions.md          → eliminar secciones inglés
  ├── B-2: prompting-tips.md       → traducir encabezados + reemplazar ADT
  └── B-3: skill-authoring.md      → eliminar "Regla de oro" + reemplazar ADT

Grupo C (abstracción THYROX)
  └── C-1: skill-vs-agent.md       → abstraer sección de capas

Grupo D (acentos — pueden hacerse en cualquier momento)
  ├── D-1: state-management.md     → "Reglas de oro" + acentos
  ├── D-2: hooks.md                → solo acentos
  ├── D-3: permission-model.md     → solo acentos
  └── D-4: checkpointing.md        → solo acentos

Grupo E (mínimos — pueden hacerse en cualquier momento)
  ├── E-1: agent-spec.md           → 2 cambios puntuales
  └── E-2: claude-code-components.md → verificación de acentos
```

**Tiempo estimado por grupo:**
- Grupo A: 1-2 sesiones (reescrituras totales)
- Grupo B: 1 sesión (ediciones moderadas, ejecutables en paralelo)
- Grupo C: ~30 min (una sección a modificar)
- Grupo D: ~20 min (búsqueda y reemplazo de acentos)
- Grupo E: ~5 min (cambios puntuales)

**Total estimado: 2-3 sesiones de trabajo.**
