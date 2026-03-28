```yml
Fecha: 2026-03-28
Tipo: Phase 7 (TRACK)
```

# Lecciones — Reference Errors Analysis + Evals

## Resultados de evals post-correcciones

### Multi-interaction evals (suite completa)
- **Antes:** 20/26 (76.9%)
- **Después:** 26/26 (100%) ✅
- **Mejora:** +23.1 puntos porcentuales

### Functional evals (3 escenarios)
| Eval | Resultado | Fallo |
|------|-----------|-------|
| 1: Project start | 4/5 | No menciona work package explícitamente |
| 2: Status check | 3/4 | No menciona archivos de estado por nombre |
| 3: Decompose | 4/5 | No sugiere guardar en plan.md/tasks.md |
| **Total** | **11/14 (78.6%)** | |

**Nota:** Los functional evals mantienen el mismo score que antes (78.6%). Los fallos son en detalles específicos (mencionar work package, sugerir guardar en plan.md) — no en el flujo general.

## Lecciones

### L-011: Las transiciones explícitas (Siguiente/Detectar) resuelven la ambigüedad multi-interacción

La mejora de 76.9%→100% en multi-interaction se debe a las líneas "Siguiente" y "Detectar" en cada fase. Sin ellas, Claude no sabía qué proponer al completar una fase.

### L-012: Los functional evals fallan en detalles que no son bugs del SKILL

Los 3 fallos del functional eval son Claude no mencionando un nombre exacto (work package, plan.md). El SKILL dice "crear work package" y "guardar en plan.md" — Claude lo hace pero no siempre lo verbaliza. Esto es un gap de verbosidad, no de metodología.

### L-013: Enforcement ejecutable > enforcement documental (confirmado por 14 proyectos)

El stop-hook ya existente (git check) demostró que funciona (nos bloqueó 1 vez en esta sesión). El nuevo validate-session-close.sh sigue el mismo patrón probado.

### L-014: El feedback loop error→prevención es el gap más peligroso

ERR-002 recurrió como ERR-006 porque no hubo campo "Prevención" en el error original. El nuevo template con "Prevención" obligatorio cierra este gap. Regla de escalación: si recurre 2+ veces → locked decision en CLAUDE.md.
