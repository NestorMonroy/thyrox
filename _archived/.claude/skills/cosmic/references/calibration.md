# Calibración de benchmarks y umbrales

> COSMIC da **tamaño** (CFP); convertir a **esfuerzo** o a **umbral de atomicidad**
> requiere calibración con datos del propio proyecto. **No extrapoles entre capas.**

## Qué calibrar

1. **CFP promedio por banda** (Small/Medium/Large) por capa, a partir de procesos medidos.
2. **Umbral de atomicidad** (CFP máximo de un proceso implementable en una unidad de trabajo).
3. **Productividad** (horas/CFP) si se estima esfuerzo — con histórico propio.

## Procedimiento

1. Mide N procesos representativos de la capa (método estándar, movimiento a movimiento).
   - **N mínimo:** al menos 5–8 procesos por capa, o ~20% de la capa si tiene <25 procesos.
     Deben cubrir el rango (no solo los simples): incluye el proceso más grande y el más chico.
   - Por debajo de ese N, la media es **SPECULATIVE** (muestra no representativa) — no fijes umbral.
2. Calcula media/distribución → fija bandas y umbral con evidencia.
3. Documenta el alcance: el umbral **vale solo para esa capa**.

## Tamaño ≠ esfuerzo — requisito para convertir a horas

`Productividad (horas/CFP)` **solo** se calcula con **histórico de horas reales** del propio
equipo/capa. **Si no tienes ese histórico, NO conviertas CFP a esfuerzo** — el CFP es una
medida de tamaño funcional, no de horas. Una conversión sin datos de esfuerzo propios es
SPECULATIVE (I-012) y no debe fundamentar estimaciones de cronograma.

> THYROX, p.ej., tiene su tamaño medido (675 CFP) pero **cero datos de esfuerzo** → no puede
> (todavía) dar horas/CFP. Reconocerlo es parte de la calibración honesta.

## Ejemplo trabajado — calibración propia de THYROX (ÉPICA 44/45)

Bandas por capa medidas (media CFP/proceso), útiles como **referencia interna** (no extrapolar
a otro sistema):

| Capa | Procesos | Media CFP | Rango | Lectura |
|------|----------|-----------|-------|---------|
| A interfaz | 20 | 5.4 | 3–10 | outliers: DISCOVER 10, STANDARDIZE 8 |
| B motor | 13 | 3.5 | 2–5 | hooks finos (banda Small) |
| C metodología | 61 | 6.16 | 6–7 | muy homogénea (pasos de coordinator) |
| D agentes | 29 | 5.0 | 4–7 | write 5–7, read-only 4 |

**Validación del Average-FP:** en capa C se estimó ≈6 CFP/paso (Average-FP anclado en 2
coordinators) y el conteo OBSERVABLE dio 6.16 → **error ~1.3%**. La técnica funciona cuando la
capa es homogénea y el promedio está anclado en muestras medidas (estimación INFERRED, no
SPECULATIVE — ver [estimation.md](estimation.md)).

## Precedente e-comerce (NO copiar valores — calibrar los tuyos)

- Umbral atomicidad capa **api = 8 CFP** (calibrado con UC-INV-02 = 7 CFP, UC-AUTH-02 = 8 CFP).
- Decisión explícita de **no extrapolar** ese umbral a ui/db/server (DEC-COSMIC-002/006).
- Benchmarks **calibrados** preferidos sobre los genéricos de industria (DEC-COSMIC-003).

---
**Última actualización:** 2026-06-03T05:13:33Z
