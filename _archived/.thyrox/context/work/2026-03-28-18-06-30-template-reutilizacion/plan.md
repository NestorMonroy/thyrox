```yml
Fecha: 2026-03-28
Tipo: Phase 3+5 (PLAN + DECOMPOSE)
```

# Plan: Template Reutilizable

## Scope

**In:**
- Script `setup-template.sh` que personaliza el template
- Guía en README.md de cómo usar el template
- Verificar que el script funcione en un directorio limpio

**Out:**
- CI/CD (GitHub Actions) — futuro
- Pre-commit hooks — futuro
- Publicación en GitHub como template repo — futuro

## Tareas

- [x] [T-001] Crear `setup-template.sh` con find-and-replace interactivo (R-D1) (2026-03-28)
- [x] [T-002] Crear archivos "estado inicial" para reset: project-state, ROADMAP, CHANGELOG (R-D2) (2026-03-28)
- [x] [T-003] Agregar sección "Quick Start" en README.md con instrucciones de uso del template (R-D2) (2026-03-28)
- [x] [T-004] Testear: copiar repo a /tmp, ejecutar script, verificar que funcione (R-D3) (2026-03-28)
- [x] [T-005] Actualizar ROADMAP.md con FASE 4 completada + métricas finales (R-TRACK) (2026-03-28)
- [x] [T-006] Actualizar focus.md + now.md para cierre (R-TRACK) (2026-03-28)

## Orden

T-001 → T-002 [P] → T-003 [P] → T-004 → T-005 → T-006
