```yml
Fecha: 2026-03-28
Tipo: Phase 3 (PLAN)
Work: Reescritura de SKILL.md según skill-creator guidelines
```

# Plan: Reescritura de SKILL.md

## Scope

Reescribir SKILL.md siguiendo skill-creator guidelines. Incluye:
- Nuevo YAML frontmatter con description "pushy"
- Body en español con WHY por fase
- References agrupadas por dominio con "when to read"
- Actualizar CLAUDE.md si la estructura cambia

**Out of scope:**
- Reorganizar references/ (se mantienen como están)
- Crear nuevos scripts
- Modificar assets/templates
- Test cases (siguiente fase después de tener el draft)

## Tasks

- [ ] [T-001] Escribir nuevo YAML frontmatter con description pushy (~80 palabras)
- [ ] [T-002] Escribir intro del skill (qué es, para quién, principio core) — 10 líneas
- [ ] [T-003] Escribir 7 fases con WHY + steps + gate + exit + refs — 8-9 líneas por fase
- [ ] [T-004] Escribir tabla "Where Outputs Live"
- [ ] [T-005] Escribir sección work package structure + naming
- [ ] [T-006] Escribir sección scalability (thresholds)
- [ ] [T-007] Escribir references agrupadas por dominio con "when to read"
- [ ] [T-008] Verificar total < 500 líneas
- [ ] [T-009] Actualizar CLAUDE.md si hay cambios en estructura
- [ ] [T-010] Commit y push

## Acceptance Criteria

- [ ] SKILL.md tiene YAML frontmatter con name + description
- [ ] Description es "pushy" (~80 palabras, cubre edge cases de triggering)
- [ ] Cada fase tiene 1 línea de WHY
- [ ] References tienen "when to read" guidance
- [ ] Total < 500 líneas (ideal < 200)
- [ ] Imperative form en instrucciones
- [ ] Sin "MUST" en mayúsculas — explicar WHY en vez de gritar

## Siguiente Paso

→ Phase 4: STRUCTURE (ya cubierto en spec.md)
→ Phase 5: DECOMPOSE (tasks arriba)
→ Phase 6: EXECUTE
