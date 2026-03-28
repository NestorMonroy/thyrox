```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de SKILL según skill-creator guidelines
Work package: Reescritura de SKILL.md
```

# Análisis: Capture Intent del SKILL pm-thyrox

## 1. What should this skill enable Claude to do?

Basándome en la sesión anterior (110+ commits, 14 proyectos analizados, 24 errores documentados), el skill debe permitir a Claude:

**Gestionar trabajo de cualquier tamaño** siguiendo un flujo de 7 fases:
- Analizar antes de actuar (Phase 1: ANALYZE)
- Decidir arquitectura con investigación (Phase 2: SOLUTION_STRATEGY)
- Planificar con scope definido (Phase 3: PLAN)
- Estructurar especificaciones (Phase 4: STRUCTURE)
- Descomponer en tasks atómicas (Phase 5: DECOMPOSE)
- Ejecutar y trackear progreso (Phase 6: EXECUTE)
- Validar y documentar lecciones (Phase 7: TRACK)

**Organizar artefactos** en paquetes de trabajo con timestamp:
- `context/work/YYYY-MM-DD-HH-MM-SS-nombre/` con spec.md, plan.md, tasks.md, lessons.md

**Escalar** según complejidad:
- <2h: Fases 1, 2, 6, 7
- 2-8h: Todas las fases
- 8h+: Full structure con EXIT_CONDITIONS

---

## 2. When should this skill trigger? (user phrases/contexts)

**Triggers actuales del SKILL (lo que dice el description):**
```
"Project management with 7-phase SDLC for THYROX. Use when planning features,
breaking down work, tracking progress, documenting decisions, or managing project lifecycle."
```

**Problema:** Según skill-creator, la description debe ser "pushy" — incluir TODOS los contextos donde el skill es útil, incluso si el usuario no lo pide explícitamente.

**Triggers que DEBERÍAN activar el skill pero probablemente no lo hacen:**
- "Quiero empezar un proyecto nuevo" → debería activar (planificación)
- "¿Qué hago primero?" → debería activar (Phase 1 ANALYZE)
- "Necesito organizar este trabajo" → debería activar
- "¿Cómo documento esta decisión?" → debería activar (ADRs)
- "Tengo un bug que arreglar" → podría activar (work package + execute)
- "Revisa el estado del proyecto" → debería activar (Phase 7 TRACK)
- "Crea un análisis de X" → debería activar (Phase 1)
- "¿Cuál es el siguiente paso?" → debería activar (ROADMAP + focus.md)

**Description propuesta (más "pushy"):**
```
"Comprehensive project management with 7-phase SDLC methodology. Use this skill
whenever the user wants to plan, analyze, design, organize, track, or manage ANY
kind of work — features, bug fixes, refactoring, documentation, research, or
project setup. Also use when the user asks 'what should I do first?', 'how do I
organize this?', 'what's the status?', 'create a plan for X', 'analyze X',
'break down X into tasks', 'document this decision', or anything related to
project workflow, work tracking, decision records, or structured development."
```

---

## 3. What's the expected output format?

El skill produce diferentes outputs según la fase:

| Fase | Output format |
|------|--------------|
| ANALYZE | Markdown análisis en work/.../analysis/ |
| SOLUTION_STRATEGY | Markdown con decisiones + alternativas |
| PLAN | Work package directory + ROADMAP.md update |
| STRUCTURE | spec.md con acceptance criteria |
| DECOMPOSE | plan.md o tasks.md con `- [ ] [T-NNN] Description (R-N)` |
| EXECUTE | Código + commits convencionales + ROADMAP update |
| TRACK | lessons.md + CHANGELOG.md update |

**Formato de work package:**
```
context/work/YYYY-MM-DD-HH-MM-SS-nombre/
├── analysis/        ← Si necesitó análisis
├── spec.md          ← Qué y por qué
├── plan.md          ← Cómo (tasks con checkboxes)
├── tasks.md         ← Solo si 10+ tasks
└── lessons.md       ← Qué aprendimos
```

---

## 4. Should we set up test cases?

**SÍ.** Este skill tiene outputs verificables:
- ¿Se creó el work package con timestamp correcto?
- ¿El spec.md tiene acceptance criteria?
- ¿El plan.md tiene tasks con checkboxes?
- ¿Los commits siguen conventional commits?
- ¿ROADMAP.md se actualizó?
- ¿Se siguió el orden de fases correcto (ANALYZE first)?

**Test cases propuestos:**

```json
{
  "skill_name": "pm-thyrox",
  "evals": [
    {
      "id": 1,
      "prompt": "Quiero crear un nuevo endpoint de autenticación para la API. Ayúdame a organizarlo.",
      "expected_output": "Work package created with spec.md, plan.md with tasks, and ROADMAP updated",
      "files": []
    },
    {
      "id": 2,
      "prompt": "¿Cuál es el estado actual del proyecto? ¿Qué debería hacer primero?",
      "expected_output": "Reads focus.md + now.md + ROADMAP.md and provides status with next steps",
      "files": []
    },
    {
      "id": 3,
      "prompt": "Tenemos un problema de rendimiento en la base de datos. Necesito investigar y crear un plan de corrección.",
      "expected_output": "Starts with ANALYZE (investigation), then creates work package with analysis/ + spec.md + plan.md",
      "files": []
    }
  ]
}
```

---

## 5. Interview — Preguntas que necesito hacerte

Antes de reescribir el SKILL, necesito clarificar:

### Sobre el flujo
a) ¿Las 7 fases siempre se deben mencionar explícitamente, o el skill debe ser más fluido (detectar implícitamente en qué fase estamos)?

b) ¿El skill debe SIEMPRE crear un work package, o solo para trabajos >30 minutos?

c) ¿El skill debe exigir ROADMAP.md update, o es opcional?

### Sobre los assets
d) De los 32 templates en assets/, ¿cuáles se usan realmente? Los de commit (bugfix.template, feature.template, etc.) ¿se usan?

e) De las 20 references/, ¿cuáles son esenciales y cuáles son legacy del proyecto ADT que ya no aplican?

### Sobre la audiencia
f) ¿El skill es para UN proyecto (THYROX) o es un template genérico que se copia a cualquier proyecto?

g) ¿El skill debe funcionar en español, inglés, o ambos?

### Sobre los scripts
h) Los 7 scripts en scripts/ — ¿se usan activamente o fueron experimentos de la sesión anterior?

---

## 6. Evaluación del SKILL actual vs skill-creator guidelines

### ✅ Lo que cumple

| Guideline | Estado |
|-----------|--------|
| YAML frontmatter con name + description | ✅ Presente |
| SKILL.md body < 500 lines | ✅ 101 líneas |
| Bundled resources (scripts/, references/, assets/) | ✅ Presente |
| References clearly referenced from SKILL.md | ✅ Links presentes |
| Imperative form in instructions | ✅ Parcial ("Read spec.md", "Create task list") |

### ❌ Lo que NO cumple

| Guideline | Problema |
|-----------|---------|
| Description must be "pushy" for triggering | ❌ Description actual es genérica, no cubre edge cases |
| "When to Use" info in description, not body | ❌ No hay triggers específicos en description |
| Explain WHY, not just WHAT | ❌ Fases dicen QUÉ hacer pero no POR QUÉ es importante |
| Examples pattern | ❌ No hay ejemplos de input/output |
| Test cases | ❌ No existe evals/evals.json |
| Large reference files need TOC | ❌ References >300 líneas sin TOC |

### ⚠️ Lo que necesita mejora

| Aspecto | Mejora necesaria |
|---------|-----------------|
| "Level 1/2/3" hierarchy | Concepto interno, no relevante para un skill genérico |
| Mixed Spanish/English | Debería ser consistente |
| References no organizadas por dominio | 20 archivos flat, podrían agruparse |
| No progressive disclosure guidance | SKILL.md no dice "read X WHEN Y" — solo lista links |

---

## 7. Comparación con skills de referencia

### spec-kit: 9 command files como skills

spec-kit NO tiene un SKILL.md único. Tiene 9 archivos de comando, cada uno es un skill independiente (specify.md, plan.md, tasks.md, etc.). Cada uno:
- Tiene steps numerados
- Tiene hooks pre/post
- Tiene validación
- Es self-contained

**Lección:** ¿pm-thyrox debería ser 7 skills (uno por fase) en vez de 1 skill monolítico?

### valet: skills por plugin

valet tiene `packages/plugin-*/skills/*.md` — cada plugin tiene sus propios skills. Los skills son instrucciones para el agente sobre CÓMO usar las herramientas del plugin.

**Lección:** Los skills de valet son más pequeños y enfocados que nuestro SKILL.md.

### agentic-framework: three-layer architecture

```
Layer 1: CONSTITUTION (CLAUDE.md) — always loaded, <100 lines
Layer 2: PLAYBOOKS (skills/) — loaded when needed
Layer 3: STATE (STATUS.md, FEATURES.md) — read at decision points
```

**Lección:** Nuestro SKILL.md es Layer 2, pero intenta ser también Layer 1 (principios) y Layer 3 (estado).

### Anthropic skill-creator: progressive disclosure

```
Level 1: Metadata (name + description) — ~100 words, always in context
Level 2: SKILL.md body — <500 lines, loaded when triggered
Level 3: Bundled resources — as needed, unlimited
```

**Lección:** Nuestro Level 1 (description) es demasiado corto. Nuestro Level 2 (body) está bien en tamaño pero le falta WHY. Nuestro Level 3 (references) necesita mejor guidance sobre CUÁNDO leer cada uno.

---

## 8. Propuesta de reescritura

### Cambios en description (Level 1)

**Antes (32 palabras):**
```
"Project management with 7-phase SDLC for THYROX. Use when planning features,
breaking down work, tracking progress, documenting decisions, or managing project lifecycle."
```

**Después (~80 palabras, "pushy"):**
```
"Comprehensive project management with 7-phase SDLC methodology for organizing ANY
kind of work — features, bug fixes, research, refactoring, documentation, or project setup.
Use this skill whenever the user mentions planning, analyzing, designing, organizing,
tracking progress, creating tasks, documenting decisions, asking 'what should I do first?',
'what's the status?', 'break this down', 'create a plan', or anything related to structured
work management. Always start with ANALYZE before planning."
```

### Cambios en body (Level 2)

1. **Agregar WHY** a cada fase — por qué es importante, no solo qué hacer
2. **Agregar examples** — input/output para cada fase
3. **Agregar "When to read" guidance** para references
4. **Remover Level 1/2/3 hierarchy** — concepto interno, no para el skill
5. **Consistencia de idioma** — elegir uno (inglés para el skill, español para contenido del proyecto)

### Cambios en references (Level 3)

1. **Agregar TOC** a references >300 líneas
2. **Agregar "When to read"** al inicio de cada reference
3. **Evaluar** cuáles son realmente necesarias (¿las 20? ¿o menos?)

---

**Última actualización:** 2026-03-28
