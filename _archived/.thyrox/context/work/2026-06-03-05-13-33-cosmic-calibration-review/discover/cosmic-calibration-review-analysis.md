```yml
created_at: 2026-06-03 05:13:33
project: THYROX
work_package: 2026-06-03-05-13-33-cosmic-calibration-review
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# DISCOVER — Revisión de calibración COSMIC (esfuerzo/CFP)

## Problema

Revisión de `cosmic/references/{calibration,estimation}.md`. 4 hallazgos:

- **H-1 (coherencia, alta):** `estimation.md` dice "toda estimación es SPECULATIVE hasta
  medición real". Contradice `evidence-classification.md` (INFERRED = derivado de observables
  con razonamiento; avanza gate) y la práctica de ÉPICA 44 (Average-FP clasificado INFERRED).
  Un Average-FP anclado en muestras medidas es INFERRED, no SPECULATIVE.
- **H-2 (evidencia, media):** las references no usan los datos propios de THYROX (675 CFP,
  bandas por capa, validación Average-FP a ~1.3% error). Solo citan e-comerce.
- **H-3 (gap, media):** `calibration.md` invita a "horas/CFP" pero THYROX no tiene datos de
  esfuerzo; falta advertir: sin histórico de horas, NO convertir CFP a esfuerzo.
- **H-4 (claridad, baja):** "mide N procesos representativos" sin definir N ni criterio.

## Evidencia (OBSERVABLE)

- `evidence-classification.md:21-44`: INFERRED requiere observables+razonamiento (avanza gate);
  SPECULATIVE = sin observable de origen (bloquea gate).
- Baseline ÉPICA 44/45: bandas por capa A 5.4 · B 3.5 · C 6.16 · D 5.0; Average-FP estimó
  capa C ≈6 vs real 6.16 (error ~1.3%).

## Decisión / scope

Corregir los 4 hallazgos en las dos references. H-1 alinea con la definición canónica.
H-2 añade THYROX como ejemplo trabajado de calibración propia. H-3/H-4 cierran gaps de guía.

## Gate / claims

OBSERVABLE (definiciones leídas del repo + cifras del baseline propio). Mejora de skill, no
medición → no recorre todos los stages; DISCOVER → IMPLEMENT (edición refs) → STANDARDIZE.

**Última actualización:** 2026-06-03 05:13:33
