# Calibración de benchmarks y umbrales

> COSMIC da **tamaño** (CFP); convertir a **esfuerzo** o a **umbral de atomicidad**
> requiere calibración con datos del propio proyecto. **No extrapoles entre capas.**

## Qué calibrar

1. **CFP promedio por banda** (Small/Medium/Large) por capa, a partir de procesos medidos.
2. **Umbral de atomicidad** (CFP máximo de un proceso implementable en una unidad de trabajo).
3. **Productividad** (horas/CFP) si se estima esfuerzo — con histórico propio.

## Procedimiento

1. Mide N procesos representativos de la capa (método estándar, movimiento a movimiento).
2. Calcula media/distribución → fija bandas y umbral con evidencia.
3. Documenta el alcance: el umbral **vale solo para esa capa**.

## Precedente e-comerce (NO copiar valores — calibrar los tuyos)

- Umbral atomicidad capa **api = 8 CFP** (calibrado con UC-INV-02 = 7 CFP, UC-AUTH-02 = 8 CFP).
- Decisión explícita de **no extrapolar** ese umbral a ui/db/server (DEC-COSMIC-002/006).
- Benchmarks **calibrados** preferidos sobre los genéricos de industria (DEC-COSMIC-003).

---
**Última actualización:** 2026-06-03T03:44:23Z
