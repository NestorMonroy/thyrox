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

- [x] [T-001] Escribir nuevo YAML frontmatter con description pushy (~80 palabras) (2026-03-28)
- [x] [T-002] Escribir intro del skill (qué es, para quién, principio core) — 10 líneas (2026-03-28)
- [x] [T-003] Escribir 7 fases con WHY + steps + gate + exit + refs — 8-9 líneas por fase (2026-03-28)
- [x] [T-004] Escribir tabla "Where Outputs Live" (2026-03-28)
- [x] [T-005] Escribir sección work package structure + naming (2026-03-28)
- [x] [T-006] Escribir sección scalability (thresholds) (2026-03-28)
- [x] [T-007] Escribir references agrupadas por dominio con "when to read" (2026-03-28)
- [x] [T-008] Verificar total < 500 líneas — resultado: 176 líneas (2026-03-28)
- [x] [T-009] Actualizar CLAUDE.md — no necesario, estructura no cambió (2026-03-28)
- [x] [T-010] Commit y push (2026-03-28)

## Acceptance Criteria

- [x] SKILL.md tiene YAML frontmatter con name + description
- [x] Description es "pushy" (~80 palabras, cubre edge cases de triggering)
- [x] Cada fase tiene 1 línea de WHY (8 líneas con "previene/evita/antes de")
- [x] References tienen "when to read" guidance (8 líneas "leer cuando/según")
- [x] Total < 500 líneas (ideal < 200) — resultado: 176 líneas
- [x] Imperative form en instrucciones
- [x] Sin "MUST" en mayúsculas — 0 ocurrencias

## Verification (Phase 7: TRACK)

- [x] 176 líneas (< 500 ✓)
- [x] 20/20 references linked (0 missing ✓)
- [x] 0 broken reference links ✓
- [x] YAML frontmatter parseable (name + description fields ✓)
- [x] 0 MUST/ALWAYS/NEVER en mayúsculas ✓
