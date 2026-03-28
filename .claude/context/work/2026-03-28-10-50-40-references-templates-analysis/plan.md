```yml
Fecha: 2026-03-28
Tipo: Phase 3 (PLAN)
Work: Tests + verificación de references/templates
```

# Plan: Tests y Verificación

## Tasks

- [ ] [T-001] Crear evals/evals.json con 3 functional evals en formato skill-creator
- [ ] [T-002] Crear evals/trigger-evals.json con 28 trigger evals
- [ ] [T-003] Crear script verify-skill-mapping.sh que verifique references enlazadas + detecte >300 líneas sin TOC
- [ ] [T-004] Ejecutar script y documentar resultados
- [ ] [T-005] Actualizar focus.md + now.md

## Acceptance Criteria

- [ ] evals.json tiene 3 evals con id, prompt, expected_output, expectations
- [ ] trigger-evals.json tiene 28 queries con should_trigger boolean
- [ ] Script detecta las 10 references >300 líneas sin TOC
- [ ] Script verifica que las 20 references están enlazadas en SKILL.md
- [ ] Todos los archivos commiteados
