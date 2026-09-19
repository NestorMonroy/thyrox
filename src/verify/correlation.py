"""Correlación de Pearson — ¿dos series se mueven juntas?

TASK-THYROX-0043. De ``probabilityForComputerScientists``
(``chapters/part3/correlation``, contenido real verificado antes de portar
nada, no un *stub*), NO de ``ai-course-notes``.

Responde una pregunta distinta a la de ``bootstrap.py``: no si A es
diferente de B, sino si dos series ``xs``/``ys`` covarían — el otro
operando que ``metrica-decide-la-conclusion.md`` exige auditar antes de
afirmar que dos magnitudes están relacionadas.

Separado de ``bootstrap.py`` por responsabilidad única (SRP): el cambio
que afecta a la fórmula de covarianza no tiene por qué tocar el algoritmo
de remuestreo, y viceversa — son dos razones de cambio independientes.
"""
from __future__ import annotations

import statistics
from collections.abc import Sequence


def pearson_correlation(xs: Sequence[float], ys: Sequence[float]) -> float:
    """El coeficiente de correlación de Pearson entre ``xs`` y ``ys``.

    Rehúsa sobre longitudes distintas (no hay pares que correlacionar) y
    sobre una serie sin varianza (la correlación no está definida — sería
    una división por cero disfrazada de resultado).
    """
    if len(xs) != len(ys):
        raise ValueError(
            f"series de longitud distinta ({len(xs)} vs {len(ys)}): no hay "
            "pares que correlacionar.")
    if len(xs) < 2:
        raise ValueError("menos de 2 observaciones: no hay varianza que medir.")
    media_x, media_y = statistics.fmean(xs), statistics.fmean(ys)
    covariance = sum((x - media_x) * (y - media_y) for x, y in zip(xs, ys))
    variance_x = sum((x - media_x) ** 2 for x in xs)
    variance_and = sum((y - media_y) ** 2 for y in ys)
    if variance_x == 0 or variance_and == 0:
        raise ValueError(
            "una serie sin varianza (todos sus valores son iguales): la "
            "correlación no está definida ahí.")
    return covariance / (variance_x * variance_and) ** 0.5
