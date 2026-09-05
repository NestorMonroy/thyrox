```yml
Fecha: 2026-03-28
Tipo: Phase 7 (TRACK)
```

# Lecciones — Correcciones de evals

## L-008: Las transiciones explícitas eliminan ambigüedad entre fases

Sin "Siguiente" y "Detectar", el agente no sabe qué proponer al completar una fase.
Agregar 2 líneas por fase (14 total) resuelve el problema sin violar el límite de 500 líneas.

## L-009: Los WHY inline previenen uso mecánico de formatos

Sin explicar POR QUÉ el formato `[T-NNN] (R-N)`, el agente puede omitir las referencias
a requisitos. Una línea de justificación inline es más efectiva que documentación externa.

## L-010: Cambios perdidos por conflictos de branch requieren re-verificación

Al cambiar de branch con stash, los conflictos pueden causar pérdida silenciosa de cambios.
Siempre verificar el estado del archivo después de operaciones de branch.

## Resumen de correcciones

| # | Corrección | Líneas | Archivo |
|---|-----------|--------|---------|
| 1 | Fix PROJECT_ROOT path | 1 | run-multi-evals.sh |
| 2 | Siguiente + Detectar (7 fases) | 14 | SKILL.md |
| 3 | WHY para [T-NNN] | 2 | SKILL.md |
| 4 | Next task en Phase 7 | 1 | SKILL.md |
| 5 | (merged into #2) | — | — |
| **Total** | | **18** | **2 archivos** |
