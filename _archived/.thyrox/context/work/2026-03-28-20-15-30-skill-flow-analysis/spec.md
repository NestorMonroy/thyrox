```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: 8 Problemas de Flujo del SKILL

---

## 1. Key Ideas

```
Idea 1: Un solo punto de creación por artefacto
  Descripción: Cada artefacto (work package, ADR, spec) se crea en UNA fase.
    Las otras fases lo referencian, no lo re-crean.
  Impacto: Elimina ambigüedad de "¿cuándo creo el work package?"

Idea 2: Los assets son herramientas de las fases — cada uno pertenece a una
  Descripción: Si un asset no está referenciado en ninguna fase, el usuario
    no sabe que existe. Cada asset debe tener un "momento" en el flujo.
  Impacto: Elimina los 6 huérfanos conectándolos a su fase natural

Idea 3: La estructura de Phase 2 debe ser explícita, no delegada
  Descripción: "Ver guía completa" no funciona como instrucción operativa.
    Los pasos de Phase 2 deben nombrar las secciones clave.
  Impacto: Previene ERR-029 (Phase 2 sin estructura)
```

---

## 1b. Research Step

### Unknown 1: ¿Dónde debe vivir la creación del work package?

**Contexto:** Actualmente se crea en Phase 1 (paso 2), Phase 3 (paso 2 condicional), y Phase 5 (paso 1 condicional). La tabla de artefactos dice Phase 3.

**Análisis del flujo real de THYROX:**
- En esta sesión se crearon 5 work packages. Todos se crearon al INICIO del trabajo (antes de documentar análisis)
- Phase 1 necesita el directorio `work/.../analysis/` para documentar (paso 3)
- Phase 3 es "definir scope" — el work package ya debe existir para linkear en ROADMAP
- Phase 5 lo crea solo si el usuario viene "directo" sin contexto previo

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Solo en Phase 1 (eliminar de Phase 3 y 5) | Un solo punto, claro | Phase 5 necesita crear si no hay contexto |
| B | Phase 1 como regla, Phase 5 como excepción | Cubre ambos casos | Dos puntos, pero uno es excepción |
| C | Sección "Antes de empezar" pre-fases | Siempre primero | Agrega sección nueva al SKILL |

**Decisión: B — Phase 1 como regla principal, Phase 5 como excepción**
- Phase 1 paso 2: "Crear work package" (REGLA)
- Phase 3 paso 2: ELIMINAR la creación — solo "Verificar que el work package existe"
- Phase 5 paso 1: MANTENER la excepción para descomposición directa
- Tabla de artefactos: cambiar de Phase 3 a Phase 1
- **Justificación:** El work package se necesita desde Phase 1 para documentar análisis. Phase 5 es caso edge legítimo (usuario llega sin contexto).

### Unknown 2: ¿Dónde encajan los 6 assets huérfanos en el flujo?

**Análisis por asset:**

| Asset | Contenido | Fase natural | Justificación |
|-------|-----------|-------------|---------------|
| `adr.md.template` | Template de ADR con Context, Alternatives, Decision, Implications | Phase 1-2 | Phase 1 paso 4 dice "crear ADR" sin template |
| `constitution.md.template` | Principios inmutables del proyecto con enforcement | Phase 1 | Se define al inicio del proyecto como "locked decisions" |
| `spec-quality-checklist.md.template` | 30+ checkboxes para validar specs antes de descomponer | Phase 4 | Gate entre Phase 4→5 — valida spec antes de tasks |
| `document.md.template` | Template genérico con Propósito, Resumen, TOC | Cross-phase | Template base para cualquier documento nuevo |
| `epic.md.template` | Epic con user stories, acceptance criteria, tasks | Phase 3-4 | Para trabajo grande que agrupa múltiples work packages |
| `introduction.md.template` | Introduction & Goals con Visión, Quality Goals | Phase 1 | Es la subsección "introduction" del análisis |

**Decisión por asset:**

1. **adr.md.template** → Referenciar en Phase 1 paso 4 y Phase 2 paso 3
2. **constitution.md.template** → Referenciar en sección "Cuándo crear un work package" como opcional para proyectos con principios
3. **spec-quality-checklist.md.template** → Referenciar en Phase 4 como gate de calidad
4. **document.md.template** → Referenciar en sección "Templates" de la tabla de artefactos como template base genérico
5. **epic.md.template** → Referenciar en Phase 3 para trabajo que agrupa múltiples features
6. **introduction.md.template** → Referenciar en Phase 1 las 8 subsecciones (ya tiene `[introduction](references/introduction.md)` — el template es el formato de output)

### Unknown 3: ¿Cómo hacer Phase 2 más explícita sin bloat?

**Estado actual (4 pasos genéricos):**
```
1. Listar unknowns → investigar alternativas → documentar pros/cons
2. Verificar que las decisiones respetan los principios del proyecto
3. Documentar decisiones con justificación
4. Re-verificar después de diseñar
```

**Lo que solution-strategy.md requiere (5 secciones + checks):**
Key Ideas, Research Step, Fundamental Decisions, Tech Stack, Patterns, Quality Goals, pre/post design checks

**Alternativas:**

| # | Alternativa | Pros | Contras |
|---|------------|------|---------|
| A | Listar las 5 secciones en los pasos | Explícito, previene ERR-029 | Agrega ~3 líneas |
| B | Solo decir "Seguir estructura de solution-strategy.md" | Lean | Ya tenemos "Ver guía completa" y no funciona |
| C | Mover las secciones al "Salir cuando" | Natural gate | Mezcla exit con instrucción |

**Decisión: A — Listar secciones clave en los pasos**
- Reescribir Phase 2 para nombrar: Key Ideas, Research (unknowns→alternatives→pros/cons), Decisions con justificación, pre-design + post-design checks
- NO listar Tech Stack y Patterns (son opcionales para proyectos no técnicos)
- **Justificación:** ERR-029 demostró que "Ver guía completa" no funciona. Nombrar las secciones cuesta ~3 líneas pero previene el error.

---

## 2. Fundamental Decisions

```
Decision 1: Work package se crea en Phase 1, no en Phase 3
  Alternatives: Phase 3 (original), pre-fases, any phase
  Justification: Phase 1 paso 3 necesita work/.../analysis/ que no existe
    sin work package. La tabla de artefactos estaba mal.
  Implications: Phase 3 ya no crea — solo verifica y linkea en ROADMAP.
    Phase 5 mantiene excepción para descomposición directa.

Decision 2: Cada asset huérfano se conecta a su fase natural
  Alternatives: Eliminar los huérfanos, crear índice separado
  Justification: Los assets existen por algo — tienen contenido útil.
    El problema es que no están referenciados, no que sobren.
  Implications: Phase 1 gana refs a adr + constitution + introduction templates.
    Phase 3 gana ref a epic. Phase 4 gana ref a spec-quality-checklist.

Decision 3: Phase 2 nombra secciones clave de solution-strategy
  Alternatives: Mantener "Ver guía completa", mover estructura a CLAUDE.md
  Justification: ERR-029 es evidencia directa de que la delegación no funciona.
  Implications: Phase 2 crece ~3 líneas. Aceptable.

Decision 4: No se elimina ningún asset
  Alternatives: Eliminar document, epic, introduction por "sin caso de uso"
  Justification: Todos tienen contenido útil y un lugar en el flujo.
    El problema era la desconexión, no la existencia.
  Implications: Todos los 33 assets quedan conectados al flujo.
```

---

## 3. Technology Stack

```
No requiere tech stack adicional. Solo ediciones a SKILL.md y conventions.md.
```

---

## 4. Patterns

```
Structural: Single point of creation (un artefacto se crea en una sola fase)
Behavioral: Connect-not-delete (assets desconectados se reconectan, no se eliminan)
Architectural: Explicit over implicit (nombrar secciones > "ver guía completa")
```

---

## 5. Quality Goals → Solution

```
Quality Goal: Eliminar ambigüedad de "¿cuándo creo el work package?"
  Approach: Un solo punto de creación (Phase 1) + excepción (Phase 5)
  Mechanisms: Tabla de artefactos corregida + Phase 3 sin creación
  Medición: Solo 1 fase dice "Crear work package" como regla

Quality Goal: Conectar los 33 assets al flujo de fases
  Approach: Cada asset referenciado desde la fase donde se usa
  Mechanisms: References inline en los pasos de cada fase
  Medición: 0 assets huérfanos (de 6 a 0)

Quality Goal: Prevenir ERR-029 (Phase 2 incompleta)
  Approach: Nombrar secciones clave de solution-strategy en Phase 2
  Mechanisms: Pasos explícitos: Key Ideas → Research → Decisions → Checks
  Medición: Phase 2 spec.md siempre tiene las secciones nombradas
```

---

## Pre-design check

| Principio | ¿Respetado? |
|-----------|------------|
| ANALYZE first | ✅ Se analizaron los 8 problemas antes de decidir |
| Anatomía oficial | ✅ No se agregan archivos nuevos |
| Git as persistence | ✅ N/A |
| Markdown only | ✅ N/A |
| Single skill | ✅ Todo en pm-thyrox |
| Work packages | ✅ Este análisis está en work package timestamped |
| Conventional commits | ✅ Se seguirá |

## Post-design re-check

| Decisión | ¿Viola algún principio? |
|----------|----------------------|
| WP en Phase 1 | No — fortalece "ANALYZE first" |
| Assets conectados | No — fortalece "anatomía oficial" |
| Phase 2 explícita | No — L-0002 OK (3 líneas) |
| No eliminar assets | No — los assets son parte de la anatomía |

---

## Siguiente

→ Phase 3+5: PLAN + DECOMPOSE
