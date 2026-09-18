#!/usr/bin/env python3
"""¿Hubo un cambio de regimen en la serie, y donde?

Construccion propia, no porte. **Medido**, no afirmado: sobre los dos corpus
que el ejecutor aporto —32 `.md` de analisis de texto y probabilidad aplicada
en shell, y 9 `.Rmd` de correlacion serial— los patrones ``cusum``,
``change point``, ``structural break``, ``breakpoint`` y ``chow`` dan
**0 de 32 y 0 de 9**. El instrumento no estaba ciego: su control positivo
—``regresion``/``correlacion``— da 2 de 32 y 8 de 9 sobre los mismos
archivos.

La primera version de este parrafo decia lo mismo **sin haberlo medido**: lo
heredaba de prosa propia. El ejecutor lo señalo — un docstring es una
afirmacion, no una ``Observation``, y citarlo como evidencia es el defecto
que el resto de este arbol existe para evitar.

El defecto que este modulo existe para evitar
-----------------------------------------------

La suma acumulada de desviaciones respecto de la media tiene un maximo
**siempre**: ``argmax`` devuelve un indice sobre ruido blanco, sobre una
serie plana y sobre cualquier cosa. Un modulo que solo acumulara y tomara el
maximo nombraria un punto de cambio en toda serie que se le diera, y su
respuesta se leeria como un hallazgo. Es el verde que no discrimina, con el
propio instrumento como sujeto.

Por eso el maximo **no es el veredicto**: es el candidato. El veredicto sale
de compararlo con lo que ese mismo dato produce cuando se le quita el orden
—permutando los valores— y viendo en que fraccion de esas permutaciones el
maximo queda por debajo. Si el orden no aportaba nada, el observado queda en
medio del monton y no hay evidencia de cambio.

Reproducible por construccion
-------------------------------

Las permutaciones salen de un generador con semilla fija. Un veredicto que
cambiara entre dos corridas sobre el mismo dato dependeria del azar de la
corrida y no del dato, y no se podria citar.

Que NO hace
------------

Encuentra **un** punto, el mas marcado; una serie con dos cambios devuelve
el mayor y calla el otro. No dice de que tipo es el cambio —nivel,
pendiente o varianza—: la acumulacion sobre la media ve sobre todo los de
nivel. Y «sin evidencia» no es «no hubo cambio»: con pocos puntos o con
mucho ruido el nulo no se rechaza casi nunca.
"""
from __future__ import annotations

import dataclasses
import enum
import random

from measurement import series as series_mod

MIN_POINTS = 8
DEFAULT_ITERATIONS = 1000
DEFAULT_ALPHA = 0.05
DEFAULT_SEED = 20260916


class Verdict(enum.Enum):
    """Lo que se concluye sobre el cambio de regimen."""

    CHANGED = "cambio de regimen"
    NO_EVIDENCE = "sin evidencia de cambio"


class CannotLocate(ValueError):
    """No hay serie suficiente para buscar un punto de cambio.

    Se levanta en vez de devolver el indice 0: un indice siempre existe, y
    devolverlo sin haber podido medir es exactamente el defecto que este
    modulo evita.
    """


@dataclasses.dataclass(frozen=True)
class Reading:
    """El candidato, su confianza y el veredicto."""

    index: int
    time: float
    amplitude: float
    confidence: float
    alpha: float
    iterations: int
    label: str = ""

    @property
    def verdict(self) -> Verdict:
        return (Verdict.CHANGED if self.confidence >= 1.0 - self.alpha
                else Verdict.NO_EVIDENCE)


def _cumulative_range(values: list[float]) -> tuple[float, int]:
    """Amplitud de la suma acumulada y el indice donde se aparta mas."""
    mean = sum(values) / len(values)
    running = 0.0
    sums = [0.0]
    for v in values:
        running += v - mean
        sums.append(running)
    amplitude = max(sums) - min(sums)
    peak = max(range(len(sums)), key=lambda i: abs(sums[i]))
    # `sums` lleva el cero inicial, asi que el indice de la serie es peak-1,
    # acotado a un punto real.
    return amplitude, min(max(peak - 1, 0), len(values) - 1)


def locate(s: series_mod.Series, iterations: int = DEFAULT_ITERATIONS,
           alpha: float = DEFAULT_ALPHA, seed: int = DEFAULT_SEED) -> Reading:
    """El punto de cambio, si el orden de los datos aporta algo."""
    values = s.values
    if len(values) < MIN_POINTS:
        raise CannotLocate(
            f"«{s.label or 'sin etiqueta'}» tiene {len(values)} punto(s); "
            f"hacen falta {MIN_POINTS}. No se emite indice: uno siempre "
            "existe, y devolverlo sin medir es el defecto que esto evita.")

    observed, index = _cumulative_range(values)
    # El umbral sale del propio dato SIN su orden. Si el orden no aportaba,
    # el observado no destaca entre las permutaciones.
    rng = random.Random(seed)
    shuffled = list(values)
    below = 0
    for _ in range(iterations):
        rng.shuffle(shuffled)
        if _cumulative_range(shuffled)[0] < observed:
            below += 1
    return Reading(index=index, time=s.times[index], amplitude=observed,
                   confidence=below / iterations, alpha=alpha,
                   iterations=iterations, label=s.label)


def report(reading: Reading) -> str:
    lines = [
        f"punto de cambio en «{reading.label or 'sin etiqueta'}» — "
        f"{reading.verdict.value}",
        f"  candidato        indice {reading.index}   t = {reading.time:.0f}",
        f"  amplitud acumulada {reading.amplitude:.6g}",
        f"  confianza        {reading.confidence:.3f}   sobre "
        f"{reading.iterations} permutaciones (umbral {1 - reading.alpha})",
    ]
    if reading.verdict is Verdict.NO_EVIDENCE:
        lines.append("  el indice se publica igual: el maximo existe siempre, "
                     "y por eso NO es el veredicto")
    return "\n".join(lines)
