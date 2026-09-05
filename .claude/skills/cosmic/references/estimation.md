# Estimación temprana (early sizing)

> Cuando los FUR no tienen granularidad para identificar cada movimiento. NO fuerces una
> medición parcial: estima y marca `[ESTIMACIÓN TEMPRANA]`. Fuente:
> [manual/early-sizing-practitioners-guide.md](manual/early-sizing-practitioners-guide.md) +
> tutoriales [M1](manual/tutorial-early-sizing-m1-techniques.md)/[M2](manual/tutorial-early-sizing-m2-selection.md)/[M3](manual/tutorial-early-sizing-m3-nfr.md).

## Técnicas (elegir según detalle disponible — M2 selección)

| Técnica | Cuándo | Cómo |
|---------|--------|------|
| **Average Functional Process** | conoces nº de procesos funcionales, no sus movimientos | nº procesos × CFP promedio (calibrado) |
| **Equal-size bands** | puedes clasificar procesos por tamaño | clasificar en Small/Medium/Large y aplicar CFP de banda |
| **Analogía** | hay un sistema/medición previa parecida | escalar desde el análogo |
| **Fixed-size / scaled** | muy poco detalle | rangos amplios documentando incertidumbre |

## Benchmarks genéricos (ilustrativos — calibrar)

`cosmices` (manual): Small ≈ 3.9 CFP, Medium ≈ 6.9 CFP (referenciales). **Calibra con tus datos**
(ver [calibration.md](calibration.md)).

## Clasificación de evidencia de una estimación (INFERRED vs SPECULATIVE)

Una estimación **no es automáticamente SPECULATIVE**. Depende de si tiene observables de origen
(ver `thyrox/references/evidence-classification.md`):

| La estimación… | Clasificación | ¿Avanza gate? |
|----------------|---------------|----------------|
| Average-FP / banda **anclado en procesos ya medidos** del mismo tipo (muestra observable + razonamiento documentado) | **INFERRED** | Sí — si se documentan los observables de origen |
| Número **sin muestra de origen** (analogía a ojo, "suele ser ~X", fixed-size sin datos) | **SPECULATIVE** | No — bloquea gate (I-012) |

Marca siempre `[ESTIMACIÓN TEMPRANA]` y declara el origen. Una estimación INFERRED debe citar
**qué procesos medidos** la anclan. Si no puedes citarlos, es SPECULATIVE.

> **Precedente (ÉPICA 44):** la estimación Average-FP de capa C de THYROX se clasificó INFERRED
> porque se ancló en 2 coordinators leídos y el patrón homogéneo; resultó a ~1.3% del conteo
> OBSERVABLE posterior. Eso es INFERRED bien hecho, no SPECULATIVE.

## NFR

Los requisitos no funcionales **no aportan CFP**, pero afectan esfuerzo. Tratamiento:
[manual/tutorial-early-sizing-m3-nfr.md](manual/tutorial-early-sizing-m3-nfr.md).

---
**Última actualización:** 2026-06-03T05:13:33Z
