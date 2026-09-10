```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: Multi-Interaction Evals

## Research Step

### Unknown 1: ¿Cómo ejecutar evals multi-interacción con `claude -p`?

**Problema:** `claude -p` es single-turn — envías un prompt, recibes una respuesta. Los escenarios MI-01 a MI-23 son multi-turn (dependen de contexto previo, archivos existentes, estado de work packages).

**Alternativas:**
- A) Simular contexto: crear archivos temporales (focus.md, plan.md con tasks marcadas) antes de ejecutar `claude -p` — determinístico, reproducible
- B) Usar `claude` interactivo con input scripted — más realista pero difícil de automatizar
- C) Solo documentar como test manual — más fácil pero no verificable automáticamente

**Decisión:** A) Simular contexto con archivos temporales.
**Justificación:** Podemos crear un directorio temporal con estado simulado (focus.md, now.md, work package con plan.md parcialmente completado) y ejecutar `claude -p` contra ese directorio. Es reproducible y automatizable.

### Unknown 2: ¿Cuáles de los 23 escenarios son ejecutables con `claude -p`?

**Análisis por prioridad:**

**Ejecutables con setup de contexto:**
- MI-01 (reanudar trabajo) — crear work package con plan.md parcial
- MI-02 (cold boot existente) — crear estructura con varios work packages
- MI-05 (Phase 6 interrumpida) — crear plan.md con checkboxes parciales
- MI-13 (implementación falló) — crear plan.md + error message
- MI-21 (segunda interacción FE-01) — crear spec con respuestas del usuario
- MI-22 (status con plan.md activo) — crear plan.md con tasks
- MI-23 (descomposición con trazabilidad) — prompt explícito

**No ejecutables con `claude -p`** (requieren interacción real):
- MI-07 (scope creep) — requiere conversación en curso
- MI-08 (pivote) — requiere decisión de cambio
- MI-09 (decisión revertida) — requiere historial de conversación
- MI-11 (múltiples work packages) — requiere contexto acumulado
- MI-12 (trabajo paralelo) — requiere múltiples sesiones

**Decisión:** Ejecutar los 7 ejecutables como evals automatizados. Documentar los restantes 16 como test cases manuales.

### Unknown 3: ¿Dónde crear el estado simulado?

**Decisión:** En `/tmp/thyrox-eval-workspace/` — directorio temporal que se limpia después.
**Justificación:** No contaminar el proyecto real. Cada eval crea su propio estado, ejecuta, verifica, limpia.

---

## Strategy

### Ejecutar 7 evals automatizados (Prioridad 1 + gaps)

Cada eval:
1. Crea directorio temporal con estado simulado
2. Ejecuta `claude -p` con prompt del escenario
3. Verifica expectations contra la respuesta
4. Limpia

### Documentar 16 evals manuales

Agregar a `evals/multi-interaction-evals.json` como test cases documentados con `"automated": false`.

### Artefactos

| Artefacto | Tipo |
|-----------|------|
| `evals/multi-interaction-evals.json` | JSON con 23 escenarios |
| `scripts/run-multi-evals.sh` | Script que ejecuta los 7 automatizados |
| Resultados en plan.md | Documentación de resultados |

---

## Siguiente Paso

→ Phase 3: PLAN
