```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-05-41-41-flow-corrections
created_at: 2026-04-07 05:41:41
status: Completado
phase: Phase 7 — TRACK
total_lessons: 3
```

# Lecciones Aprendidas: flow-corrections

### L-050 — El dogfooding inmediato valida la corrección

**Contexto:** Los agentes de T-001..T-007 usaron prompts cortos (<800 palabras) por primera vez, inmediatamente después de documentar ese límite en T-005.

**Aprendizaje:** Aplicar la corrección en el mismo WP donde se documenta es la prueba más rápida de que funciona. Ambos agentes completaron sin timeout — la corrección es válida.

**Acción:** Cuando se documenta una convención nueva, aplicarla inmediatamente en el WP actual.

---

### L-051 — Phases 2-4 son comprimibles cuando el análisis es completo

**Contexto:** Este WP ejecutó Phases 1-5 en minutos sin WPs separados por fase, porque los 8 gaps ya estaban completamente documentados del post-mortem.

**Aprendizaje:** La escala del framework (micro/pequeño/mediano/grande) funciona correctamente: cuando el análisis es claro y el scope es pequeño, no hace falta un WP separado por fase.

**Acción:** Ninguna — el framework ya documenta esto en la tabla de escalabilidad.

---

### L-052 — Los gaps de proceso tienen correcciones puntuales, no reestructuras

**Contexto:** Los 8 gaps identificados se corrigieron con adiciones mínimas a SKILL.md y conventions.md — sin reestructurar el flujo de 7 fases.

**Aprendizaje:** La arquitectura de 7 fases es sólida. Los gaps eran ausencias de instrucciones, no defectos estructurales. Correcciones quirúrgicas son preferibles a rewrites.

**Acción:** Ninguna — aplicado en este WP.
