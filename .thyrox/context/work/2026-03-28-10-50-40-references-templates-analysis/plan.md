```yml
Fecha: 2026-03-28
Tipo: Phase 3 (PLAN)
Work: Tests + verificación de references/templates
```

# Plan: Tests y Verificación

## Tasks

- [x] [T-001] Crear evals/evals.json con 3 functional evals en formato skill-creator (2026-03-28)
- [x] [T-002] Crear evals/trigger-evals.json con 28 trigger evals (2026-03-28)
- [x] [T-003] Crear script verify-skill-mapping.sh (2026-03-28)
- [x] [T-004] Ejecutar script — resultado: 29 passed, 0 failed, 7 warnings (2026-03-28)
- [x] [T-005] Actualizar focus.md + now.md + plan.md (2026-03-28)

## Acceptance Criteria

- [x] evals.json tiene 3 evals con id, prompt, expected_output, expectations
- [x] trigger-evals.json tiene 28 queries con should_trigger boolean
- [x] Script detecta references >300 líneas sin TOC (7 detectadas)
- [x] Script verifica que las 20 references están enlazadas en SKILL.md (20/20)
- [x] Todos los archivos commiteados

## Verification Results

```
29 passed, 0 failed, 7 warnings
- 20/20 references linked ✅
- YAML frontmatter valid ✅
- 176 lines < 500 ✅
- 7 references need TOC (future work)
```
