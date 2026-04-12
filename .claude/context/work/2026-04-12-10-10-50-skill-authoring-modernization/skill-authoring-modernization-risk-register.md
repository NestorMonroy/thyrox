```yml
project: thyrox-framework
work_package: 2026-04-12-10-10-50-skill-authoring-modernization
created_at: 2026-04-12 10:12:32
current_phase: Phase 1 — ANALYZE
open_risks: 4
mitigated_risks: 0
closed_risks: 0
```

# Risk Register — skill-authoring-modernization (FASE 33)

## Matriz de riesgos

| ID | Descripción | Probabilidad | Impacto | Severidad | Estado |
|----|-------------|:------------:|:-------:|:---------:|--------|
| R-01 | skill-authoring.md reescrito incompatible con la sección Avanzado de thyrox/SKILL.md | baja | medio | media | abierto |
| R-02 | Benchmark TD-010 mal diseñado produce evidencia no replicable | media | alto | alta | abierto |
| R-03 | Scope creep: análisis del repo genera trabajo de implementación no planificado | media | medio | media | abierto |
| R-04 | Regla SKILL vs CLAUDE.md vs Agente contradice decisiones existentes (ADR-015, ADR-016) | baja | alto | alta | abierto |

---

## Detalle de riesgos

### R-01: skill-authoring.md reescrito incompatible con SKILL.md
**Descripción:** Actualizar `skill-authoring.md` con nuevos campos de frontmatter podría contradecir instrucciones en `thyrox/SKILL.md` o `agent-spec.md`.
**Mitigación:** Leer ADR-015 y ADR-016 antes de escribir. Verificar cross-references con grep.
**Plan de contingencia:** Si hay conflicto, documentar en el ADR correspondiente y resolver en ese nivel.

### R-02: Benchmark TD-010 mal diseñado
**Descripción:** El benchmark SKILL vs CLAUDE.md vs baseline requiere condiciones equivalentes. Si las 3 tareas no son comparables, los resultados no son válidos.
**Mitigación:** Diseñar benchmark antes de ejecutar. Revisar con usuario antes de correr las 9 ejecuciones.
**Plan de contingencia:** Si el diseño es insuficiente, documentar las limitaciones en el reporte final.

### R-03: Scope creep del análisis del repo
**Descripción:** El repo `claude-howto` tiene 119 artefactos. El análisis puede expandirse indefinidamente.
**Mitigación:** Limitar análisis a las tres preguntas definidas en Phase 1. No implementar nada del repo.
**Plan de contingencia:** Si hay hallazgos adicionales interesantes, registrarlos como TDs nuevos para FASEs futuras.

### R-04: Regla de decisión contradice ADRs existentes
**Descripción:** La nueva regla SKILL vs CLAUDE.md vs Agente podría contradecir ADR-015 (arquitectura 5 capas) o ADR-016 (excepción workflow-*).
**Mitigación:** Leer ADR-015 y ADR-016 completos durante Phase 1. La nueva regla debe ser complementaria, no sustitutiva.
**Plan de contingencia:** Si hay contradicción real, abrir nuevo ADR en lugar de modificar ADR existente.
