```yml
Fecha: 2026-03-28
Proyecto: THYROX — Corrección de directorios no usados
Tipo: Phase 2 (SOLUTION_STRATEGY)
Autor: Claude Code + Human
Estado: Borrador
```

# Solution Strategy: Corrección de directorios no usados

## Research Step

### Unknown 1: ¿Los ciclos de correcciones deberían ser epics?

**Alternativas:**
- A) Mover los 15 archivos de analysis/ a epics/ — rompe historial de git, pierde contexto
- B) Dejar analysis/ como está, crear epics para trabajo FUTURO — los análisis ya hechos son análisis, no epics
- C) Regla: si un trabajo tiene 7 fases completas → epic. Si es solo análisis → analysis/

**Decisión:** C) Definir regla clara.
**Justificación:** Los 15 archivos en analysis/ son mezcla de análisis puros (covariance-analysis.md) y planes de trabajo (covariance-tasks.md). No moverlos, pero definir la regla para el futuro.

**Regla:** Un analysis es un diagnóstico (Phase 1 output). Un epic es un plan de trabajo con fases completas (Phase 3+ output). Si el trabajo tiene epic.md + tasks.md → va en epics/. Si es solo hallazgos → va en analysis/.

### Unknown 2: ¿Crear ADRs retroactivos o solo para el futuro?

**Alternativas:**
- A) Crear 10 ADRs retroactivos — completo pero costoso en tiempo
- B) Crear solo los 3 más importantes — balance effort/value
- C) Solo para el futuro — las decisiones ya están documentadas en strategy files

**Decisión:** B) Las 3 decisiones más importantes como ADRs. El resto ya está en strategy files.
**Justificación:** Las 3 decisiones que más impacto tienen en cómo se usa el framework merecen ser buscables. Las otras son internas.

**Top 3 decisiones para ADR:**
1. ANALYZE primero (no PLAN) — afecta todo el flujo
2. Anatomía oficial (scripts/ + references/ + assets/) — afecta estructura
3. Work-log obligatorio por sesión — afecta cómo se trabaja

---

## Constitution Check

- ✅ Markdown only
- ✅ Git as persistence
- ✅ Single skill
- ✅ SKILL < 500 lines (no agrega líneas)

---

## Artefactos

| Artefacto | Acción |
|-----------|--------|
| `context/decisions/adr-010.md` | Crear: ANALYZE primero |
| `context/decisions/adr-011.md` | Crear: Anatomía oficial |
| `context/decisions/adr-012.md` | Crear: Work-log obligatorio |
| `context/decisions.md` | Actualizar índice |
| `references/conventions.md` | Agregar regla analysis vs epic |

---

## Siguiente Paso

→ Phase 3: PLAN
