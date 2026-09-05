```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
Work: Reescritura de SKILL.md según skill-creator guidelines
```

# Solution Strategy: Reescritura de SKILL.md

## Research Step

### Unknown 1: ¿Monolítico (1 SKILL.md) o distribuido (1 por fase)?

**Alternativas:**
- A) Monolítico: 1 SKILL.md con todo (<500 líneas) — como ahora
- B) Distribuido: 7 archivos en references/ (1 por fase) + SKILL.md como router
- C) Híbrido: SKILL.md con resumen + references/ con detalles por fase

**Evidencia de 14 proyectos:**
- spec-kit: distribuido (9 command files)
- valet: distribuido (skills por plugin)
- agentic-framework: distribuido (three-layer)
- trae-agent: monolítico (system prompt ~100 líneas)
- claude-pipe: monolítico (PRD + BUILD_SPEC)

**Decisión:** C) Híbrido. SKILL.md como router (<500 líneas) con references/ para detalles.
**Justificación:** El skill-creator dice "<500 lines ideal" para el body. Nuestras 20 references ya existen. SKILL.md debe ser el router que dice CUÁNDO leer cada reference, no repetir su contenido.

### Unknown 2: ¿La description debe listar triggers en español o inglés?

**Evidencia:**
- Anthropic skill-creator: examples en inglés
- Usuario dijo: español para el skill
- La description es lo que Claude usa para decidir si activar el skill

**Decisión:** Description en inglés (es lo que Claude procesa para triggering). Body en español (es lo que el usuario ve).
**Justificación:** Claude procesa triggers internamente en inglés. La description debe estar en el idioma que Claude entiende mejor para matching. El contenido visible puede estar en español.

### Unknown 3: ¿Cómo manejar los 32 assets y 20 references sin bloat?

**Alternativas:**
- A) Listar todos en SKILL.md — bloat, 50+ líneas solo de links
- B) Agrupar por dominio y listar grupos — medio
- C) No listar, solo mencionar directorios — pierde discoverability

**Decisión:** B) Agrupar por dominio con "when to read" guidance.
**Justificación:** Skill-creator dice "Reference files clearly from SKILL.md with guidance on when to read them." Agrupar por fase/dominio da contexto sin bloat.

**Grupos de references:**
```
Phase 1 ANALYZE (8 refs):
  introduction, requirements-analysis, use-cases, quality-goals,
  stakeholders, basic-usage, constraints, context

Phase 2 SOLUTION (1 ref):
  solution-strategy

Phase 4 STRUCTURE (1 ref):
  spec-driven-development

Phase 6 EXECUTE (2 refs):
  commit-helper, commit-convention

Phase 7 TRACK (2 refs):
  reference-validation, incremental-correction

Cross-phase (4 refs):
  conventions, scalability, examples, prompting-tips

Advanced (2 refs):
  long-context-tips, skill-authoring
```

### Unknown 4: ¿Cómo incorporar WHY sin explotar las líneas?

**Decisión:** Una línea de WHY por fase, no un párrafo.
**Ejemplo:**
```
### Phase 1: ANALYZE
Understanding before acting prevents wasted effort on wrong problems.
```

En vez de:
```
### Phase 1: ANALYZE
This phase is important because if you don't understand the requirements first,
you risk building the wrong thing. Many projects fail because they skip analysis
and jump straight to planning or implementation...
```

---

## Strategy

### Estructura del nuevo SKILL.md

```
Líneas 1-5:    YAML frontmatter (name + pushy description)
Líneas 6-15:   Intro (qué es, para quién, principio core)
Líneas 16-80:  7 fases (8-9 líneas por fase: WHY + steps + gate + exit + refs)
Líneas 81-95:  Where outputs live (tabla)
Líneas 96-110: Work package structure + naming
Líneas 111-125: Scalability (thresholds)
Líneas 126-145: References grouped by domain with "when to read"
Líneas 146-155: Advanced references
```

**Total estimado: ~155 líneas.** Bien dentro de <500.

### Description (pushy, en inglés)

```yaml
name: pm-thyrox
description: "Framework de gestión de proyectos con metodología SDLC de 7 fases. Usar este skill cuando el usuario quiera planificar, analizar, diseñar, organizar, trackear o gestionar CUALQUIER tipo de trabajo — features, bug fixes, refactoring, documentación, investigación o setup de proyecto. También usar cuando el usuario pregunte '¿qué hago primero?', '¿cómo organizo esto?', '¿cuál es el estado?', 'crea un plan para X', 'analiza X', 'descompón X en tareas', 'documenta esta decisión', o cualquier cosa relacionada con workflow de proyecto, tracking de trabajo, registros de decisiones o desarrollo estructurado. Siempre empezar con ANALYZE antes de planificar."
```

### Principios de escritura (de skill-creator)

1. **Imperative form** — "Create work package", not "You should create"
2. **Explain WHY** — Una línea por fase explicando la razón
3. **Examples** — Al menos 1 ejemplo de input/output
4. **When to read references** — Guidance explícita
5. **No heavy MUSTs** — Explicar la razón en vez de gritar

---

## Siguiente Paso

→ Phase 3: PLAN
