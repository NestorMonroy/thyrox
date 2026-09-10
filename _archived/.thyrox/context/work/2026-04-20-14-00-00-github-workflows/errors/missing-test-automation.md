```yml
id: WP-ERR-002
created_at: 2026-04-20 18:30:00
phase: Phase 1 — DISCOVER
severity: alta
recurrence: primera
```

# WP-ERR-002: Missing Test Automation in CI/CD

## Qué pasó

No existe workflow que ejecute test suites automáticamente en PR o push. La infraestructura CI/CD actual solo valida SKILL.md y commits. Bugs en código de agents, coordinators o scripts permanecen sin detectar hasta merge.

Esto crea un riesgo: cambios a `.claude/agents/` pueden romper coordinators sin que el repositorio lo valide.

## Por qué

El workflow `validate.yml` fue creado específicamente para SKILL.md. Nunca se extendió para cubrir tests generales del proyecto. La asunción implícita fue que el mantenedor prueba localmente, pero esto escala mal con múltiples contribuidores.

## Prevención

Crear workflow `tests.yml` que:

1. En PR: ejecuta test suite contra cambios
2. En push a main: ejecuta full test suite
3. Reporta cobertura
4. Bloquea merge si tests fallan

Script de validación: `.thyrox/scripts/validate-tests-coverage.sh`

## Insight

Cuando un proyecto tiene "solo validación estática", es porque no ha experimentado aún un bug silencioso que llegó a production. La primera vez que ocurra, el costo de agregar test automation decrece dramáticamente.
