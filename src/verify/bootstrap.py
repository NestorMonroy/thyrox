"""Bootstrap CI — ¿la diferencia medida entre dos muestras es real o es ruido?

TASK-THYROX-0043. De ``probabilityForComputerScientists``
(``chapters/part4/bootstrapping``, contenido real verificado antes de portar
nada, no un *stub*), NO de ``ai-course-notes``.

Sirve directamente al sub-patrón D-bis de ``metrica-decide-la-conclusion.md``
— *"el denominador sin auditar: un cociente tiene DOS operandos"*, cuyo
episodio de origen es real: una comparación de cinco modos de despacho
publicó un **4.07×** que, medido con una línea base honesta, era en
realidad **2.1×-2.7×**. Este módulo mecaniza la pregunta que esa regla ya
exige hacerse a mano antes de publicar un cociente o una comparación:
¿la diferencia observada sobrevive al ruido de muestreo, o es del mismo
tamaño que él?

Separado de ``correlation.py`` por responsabilidad única (SRP): éste
responde *"¿A es distinto de B?"* por remuestreo; el otro responde *"¿X y Y
se mueven juntos?"* por covarianza. Son dos preguntas estadísticas
independientes, cada una con su propia razón de cambio — el mismo criterio
por el que la referencia de ``ai-course-notes`` mantiene
``build_lecture_manifest.py`` separado de ``check_note_coverage.py`` en vez
de fundirlos en un solo script.
"""
from __future__ import annotations

import random
import statistics
from collections.abc import Sequence


def bootstrap_difference(
    sample_a: Sequence[float],
    sample_b: Sequence[float],
    *,
    n_resamples: int = 2000,
    confidence: float = 0.95,
    seed: int | None = None,
) -> dict:
    """¿La diferencia de medias entre ``sample_a`` y ``sample_b`` es real?

    Remuestrea con reemplazo cada muestra ``n_resamples`` veces, calcula la
    diferencia de medias de cada remuestreo, y toma el intervalo de
    confianza percentil de esa distribución. Si el intervalo NO cruza
    cero, la diferencia se considera real (``significant=True``).

    Rehúsa sobre una muestra de un solo elemento: el bootstrap remuestrea
    CON reemplazo, así que N=1 siempre da la misma "muestra" — no hay
    variación de la que aprender nada, y publicar un resultado ahí sería
    una `Observation` fabricada, no medida.
    """
    if len(sample_a) < 2 or len(sample_b) < 2:
        raise ValueError(
            "muestra con menos de 2 observaciones: el bootstrap no tiene "
            "variación de la que aprender — un resultado aquí no sería "
            "medido, sería inventado.")
    rng = random.Random(seed)
    diffs = []
    for _ in range(n_resamples):
        resampling_to = [rng.choice(sample_a) for _ in sample_a]
        resampling_b = [rng.choice(sample_b) for _ in sample_b]
        diffs.append(statistics.fmean(resampling_to) - statistics.fmean(resampling_b))
    diffs.sort()
    alpha = (1 - confidence) / 2
    index_low = int(alpha * n_resamples)
    index_high = min(n_resamples - 1, int((1 - alpha) * n_resamples))
    ci_low, ci_high = diffs[index_low], diffs[index_high]
    return {
        "observed_diff": statistics.fmean(sample_a) - statistics.fmean(sample_b),
        "ci_low": ci_low,
        "ci_high": ci_high,
        "significant": not (ci_low <= 0 <= ci_high),
    }
