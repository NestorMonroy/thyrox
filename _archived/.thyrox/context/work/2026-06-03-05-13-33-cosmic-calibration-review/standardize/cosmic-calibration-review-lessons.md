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

## Segundo frente — review del skill cosmic (F-1..F-5)

Tras la calibración, el Ejecutor pidió revisar el skill en sí. 5 hallazgos; aplicados F-1/F-2/F-3:

- **F-1 (anatomía):** faltaba `scripts/`. Creado `scripts/tally-cfp.py` — suma CFP y valida
  invariantes (≥2 CFP/proceso, ≥1 Entrada), con `--expect N` para gate de reconciliación.
  Verificado: 123 procesos / 675 CFP. **Habría detectado** los subtotales mal sumados de los
  agentes en ÉPICA 45 (110 vs 116; 144 vs 145).
- **F-2 (consistencia):** `allowed-tools` no tenía `Write Edit` pese a que el skill escribe
  artefactos (misma clase que TD-044). Corregido.
- **F-3 (fidelidad):** SKILL.md no cubría el dimensionamiento de **cambios** (mantenimiento =
  movimientos añadidos+modificados+borrados). Añadida la sección + ejemplo UC-ENG-14.
- **F-4 / F-5:** refs delgadas (data-movements/layers) y ruido PDF del manual → TD-045 / TD-046.

### L-4 — Un skill de medición sin script de verificación arrastra el error que pretende evitar
COSMIC existe para dar números defendibles, pero el conteo manual del propio skill produjo
sumas equivocadas (ÉPICA 45). Un skill cuya salida es numérica **debe** traer un verificador
determinístico en `scripts/`. **Lección:** la anatomía `scripts/` no es decorativa; para skills
cuantitativos es donde vive la garantía de correctitud.

## Propagación

- `cosmic/references/estimation.md` (tabla INFERRED/SPECULATIVE).
- `cosmic/references/calibration.md` (N mínimo, tamaño≠esfuerzo, ejemplo THYROX).
- `cosmic/SKILL.md` (allowed-tools +Write/Edit; sección cambios; ref a scripts/).
- `cosmic/scripts/tally-cfp.py` (nuevo).
- TD-045 (refs delgadas) + TD-046 (ruido PDF) abiertos.

**Última actualización:** 2026-06-03 05:13:33
