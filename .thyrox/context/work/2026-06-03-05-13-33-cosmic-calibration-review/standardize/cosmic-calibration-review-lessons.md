```yml
created_at: 2026-06-03 05:13:33
project: THYROX
work_package: 2026-06-03-05-13-33-cosmic-calibration-review
phase: Phase 12 — STANDARDIZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Lessons learned — cosmic-calibration-review

## Resultado

Revisión y corrección de la calibración esfuerzo/CFP del skill `cosmic`. 4 hallazgos resueltos
en `cosmic/references/{estimation,calibration}.md`.

## Correcciones aplicadas

- **H-1 (estimation.md):** se reemplazó "toda estimación es SPECULATIVE" por la tabla
  INFERRED-vs-SPECULATIVE alineada con `evidence-classification.md`: Average-FP anclado en
  procesos medidos = INFERRED (avanza gate si cita los observables); estimación sin muestra de
  origen = SPECULATIVE. Precedente ÉPICA 44 documentado.
- **H-2 (calibration.md):** añadido el ejemplo trabajado con las bandas propias de THYROX
  (A 5.4 · B 3.5 · C 6.16 · D 5.0) y la validación del Average-FP (~1.3% error).
- **H-3 (calibration.md):** sección "Tamaño ≠ esfuerzo": sin histórico de horas propio NO se
  convierte CFP a esfuerzo (sería SPECULATIVE). THYROX como ejemplo (mide tamaño, no horas).
- **H-4 (calibration.md):** definido N mínimo (5–8 procesos o ~20% de la capa, cubriendo el rango).

## Lecciones

### L-1 — "Estimación = SPECULATIVE" es un atajo incorrecto
La clasificación de evidencia no depende de si algo es estimación o medición, sino de si hay
**observable de origen + razonamiento**. Un atajo ("todo estimado es especulativo") rompe la
coherencia con `evidence-classification.md` y habría bloqueado estimaciones legítimamente
INFERRED. **Lección:** clasificar por origen de evidencia, no por etiqueta de "estimación".

### L-2 — Medir THYROX generó datos de calibración propios reutilizables
Las bandas por capa (ÉPICA 44/45) convierten `calibration.md` de "calibra con tus datos"
(abstracto) a un ejemplo trabajado con cifras. **Lección:** la primera medición de un sistema
es también su primer dato de calibración — citarlo.

### L-3 — Nombrar los gaps honestamente vale tanto como llenarlos
H-3: THYROX no tiene datos de esfuerzo. La reference ahora lo dice explícitamente en vez de
invitar a una conversión horas/CFP sin insumo. **Lección:** una guía debe advertir qué NO
hacer cuando falta el dato, no solo cómo hacerlo cuando está.

## Propagación

- `cosmic/references/estimation.md` v actualizada (tabla INFERRED/SPECULATIVE).
- `cosmic/references/calibration.md` v actualizada (N mínimo, tamaño≠esfuerzo, ejemplo THYROX).
- Sin cambios en SKILL.md (las references son carga on-demand; el procedimiento no cambió).

**Última actualización:** 2026-06-03 05:13:33
