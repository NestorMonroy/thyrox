```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-17-20-33-mise-reference-analysis
created_at: 2026-04-07 17:20:33
status: Completado
phase: Phase 7 — TRACK
```

# Lecciones Aprendidas: mise-reference-analysis

## L-061 — Los análisis de referencia deben versionarse desde el inicio

**Contexto:** El análisis de mise fue generado en `/tmp` durante la FASE 16. Al llegar a FASE 17, el usuario pidió crear el WP. Si la sesión hubiera terminado antes, el análisis se habría perdido.

**Lección:** Cualquier análisis de referencia con valor para el proyecto debe guardarse en `docs/references/` o en un WP inmediatamente, no en `/tmp`. `/tmp` es para trabajo efímero; el análisis es un artefacto de diseño.

**Prevención:** Añadir a las convenciones: "Análisis de referencias externas → `docs/references/{nombre}.md` antes de terminar la sesión."

---

## L-062 — El WP de análisis de referencia tiene Phase 6 trivial pero el artefacto es Phase 1

**Contexto:** En este WP, Phase 6 EXECUTE consistió en copiar un archivo. Pero el análisis real (el trabajo costoso — 38 tool uses, 411 segundos) ocurrió antes de que existiera el WP.

**Lección:** Para WPs de investigación donde el análisis precede al WP, Phase 1 ANALYZE es retroactiva — el WP formaliza trabajo ya hecho. Esto es válido y correcto. La fase más valiosa fue la generación del análisis; el WP es la envoltura que lo hace persistente.

---

## L-063 — `docs/references/` como directorio estándar para fuentes de inspiración

**Contexto:** Al mover el análisis a `/docs`, se creó un nuevo directorio `docs/references/`. Este patrón es útil para futuros análisis (shadcn, astro, nx, etc.).

**Lección:** `docs/references/` es el lugar canónico para análisis de herramientas externas que informan decisiones de diseño de THYROX. No van en `context/` (que es trabajo activo) ni en `docs/architecture/` (que son decisiones tomadas). Son fuentes de inspiración pre-decisión.

---

## Resumen de inspiraciones priorizadas

| ID | Inspiración | Impacto | Esfuerzo | Prioridad |
|----|------------|---------|---------|-----------|
| I-1 | `skill.toml` por skill | Alto | Medio | Alta |
| I-6 | `thyrox doctor` | Alto | Medio | Alta |
| I-3 | Auto-detection por `detect` | Medio | Bajo | Media |
| I-4 | `package.toml` por WP | Medio | Bajo | Media |
| I-5 | JSON Schema | Medio | Medio | Media |
| I-2 | Merge semántico en CLAUDE.md | Bajo | Bajo | Baja |
| I-7 | Hooks declarativos | Bajo | Alto | Baja |
| I-8 | Modularización SKILL.md | Bajo | Alto | Baja |
