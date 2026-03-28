```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: Correcciones de evals

## Research Step

### Unknown 1: ¿Dónde agregar "Phase Detection" sin romper la estructura del SKILL?

**Alternativas:**
- A) Sección nueva "Phase Detection" después de las 7 fases — agrega sección al body
- B) Dentro de Phase 7: TRACK como "orientation" — buried, difícil de encontrar
- C) Al inicio del SKILL como "How to orient" antes de las fases — visible, pero mezcla navegación con metodología
- D) En cada fase como parte de "Salir cuando" — distribuido, natural

**Evidencia de 14 proyectos:**
- agentic-framework: STATUS.md se lee al inicio de sesión, no dentro de fases
- Cortex: focus.md + now.md son lo primero que se lee
- valet: .beans/ status field es metadata, no dentro del workflow

**Decisión:** D) Distribuido en cada fase como "Siguiente" después de "Salir cuando."
**Justificación:** La detección de fase es parte de la transición. Ponerla distribuida hace que cada fase sepa qué viene después y cómo detectar si ya pasó. No necesita sección nueva.

### Unknown 2: ¿Cómo agregar transiciones sin que SKILL.md crezca demasiado?

**Formato corto (1 línea por fase):**
```
**Siguiente:** Proponer Phase 2. Si no requiere arquitectura, saltar a Phase 3.
```

**Formato largo (3 líneas por fase):**
```
**Siguiente:** Proponer Phase 2: SOLUTION_STRATEGY.
  Si el trabajo es simple y no requiere decisiones arquitectónicas, proponer Phase 3: PLAN.
  Detectar: si `work/.../analysis/` tiene hallazgos, Phase 1 ya completó.
```

**Decisión:** Formato corto. 1 línea de "Siguiente" + 1 línea de detección = 2 líneas por fase × 7 = 14 líneas.
**Justificación:** SKILL-creator dice "keep lean." Las transiciones son guía, no instrucciones detalladas.

### Unknown 3: ¿Aplicar las 5 correcciones juntas o una por una?

**Decisión:** Todas juntas en un commit.
**Justificación:** Son 5 cambios pequeños (~24 líneas total) en 2 archivos (SKILL.md + script). Hacer 5 commits separados para ~5 líneas cada uno es overhead.

---

## Strategy

Aplicar las 5 correcciones en orden de prioridad:

1. **Script bug fix** — 2 líneas en run-multi-evals.sh
2. **Transiciones activas** — 1 línea "Siguiente" por fase (7 líneas)
3. **Phase detection** — 1 línea por fase de detección (7 líneas)
4. **WHY para [T-NNN]** — 2 líneas en Phase 5
5. **Status → tarea concreta** — 1 línea en Phase 7

Después: re-ejecutar MI-22 aislado para verificar que el fix funciona.

---

## Siguiente Paso

→ Phase 3: PLAN → Phase 6: EXECUTE (trabajo <2h, saltar a ejecutar)
