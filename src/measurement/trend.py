#!/usr/bin/env python3
"""¿La serie crece, a que ritmo, y que forma la describe?

Responde tres preguntas de una vez, y por eso el modulo se llama por lo que
concluye y no por el mecanismo: «regresion por minimos cuadrados» es COMO
esta hecho. Un nombre asi ata el modulo al procedimiento y no dice nada a
quien lo busca (:ref:`h-thyrox-19`).

Las dos formas, y por que no basta con ajustar las dos
--------------------------------------------------------

La recta —``y = a + b·x``— y la exponencial —``y = a·e^(b·x)``, ajustada
regresando ``log y`` sobre ``x``. El corpus de estadistica en shell trae la
**transformacion** y no el ajuste: es media pieza.

**Los dos R2 no son comparables tal cual**, y ese es el defecto que este
modulo evita. El de la regresion sobre ``log y`` mide cuanto explica del
LOGARITMO, que es otra respuesta; casi siempre sale mas alto, y elegir por
esa comparacion es un cociente con un operando sin auditar. Aqui los dos se
miden en la **escala original**: el exponencial se destransforma y su R2 se
calcula sobre ``y``, contra la misma suma total de cuadrados.

El valor no positivo se rehusa, no se descarta
------------------------------------------------

``log 0`` no existe y ``log(-x)`` tampoco. Saltar esos puntos en silencio
ajusta OTRA serie —una con menos puntos y otra media— sin que nada lo
delate. ``fit_exponential`` levanta ``CannotFit``; ``better_fit`` lo recoge
y se queda con la recta, que es la respuesta honesta cuando la forma
exponencial no es aplicable.

Que NO hace
------------

No dice si el ajuste es el correcto: un R2 alto convive con residuos llenos
de estructura, y eso lo mide ``residual_structure``. Tampoco detecta un
cambio de regimen —para eso esta ``change_point``— ni declara significancia
estadistica de la pendiente.
"""
from __future__ import annotations

import dataclasses
import enum
import math

from measurement import series as series_mod

DAY = 86400.0


class Shape(enum.Enum):
    """La forma que se le supuso a la serie."""

    LINEAR = "recta"
    EXPONENTIAL = "exponencial"


class CannotFit(ValueError):
    """La forma pedida no es aplicable a esta serie.

    Se levanta en vez de ajustar sobre un subconjunto: un ajuste calculado
    tras descartar puntos describe otra serie, y su R2 no lo delata.
    """


@dataclasses.dataclass(frozen=True)
class Fit:
    """Un ajuste, con su R2 SIEMPRE medido en la escala original."""

    shape: Shape
    intercept: float
    slope_per_day: float
    r_squared: float
    predicted: tuple[float, ...]
    label: str = ""

    @property
    def growth_per_day(self) -> float:
        """La tasa ``b`` de ``a·e^(b·x)``. Solo tiene sentido si es exponencial."""
        if self.shape is not Shape.EXPONENTIAL:
            raise CannotFit("la tasa de crecimiento es del ajuste exponencial; "
                            f"este es {self.shape.value}")
        return self.slope_per_day


def _least_squares(xs: list[float], ys: list[float]) -> tuple[float, float]:
    """Ordenada y pendiente por minimos cuadrados. Pendiente 0 si x es constante."""
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return my, 0.0
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx
    return my - slope * mx, slope


def _r_squared(observed: list[float], predicted: list[float]) -> float:
    """R2 en la escala de ``observed``. Cero cuando no hay varianza que explicar."""
    mean = sum(observed) / len(observed)
    total = sum((y - mean) ** 2 for y in observed)
    if total == 0:
        # Una serie plana no tiene varianza: declarar 0 es honesto, y un
        # `nan` rio abajo se leeria como «no se midio».
        return 0.0
    residual = sum((y - p) ** 2 for y, p in zip(observed, predicted))
    return 1.0 - residual / total


def _days_from_origin(s: series_mod.Series) -> list[float]:
    """El eje x en dias desde el primer punto, no en epoch.

    Regresar sobre el epoch pierde precision: los valores son del orden de
    1e9 y la varianza de la ventana, de 1e6.
    """
    origin = s.times[0]
    return [(t - origin) / DAY for t in s.times]


def fit_linear(s: series_mod.Series) -> Fit:
    """``y = a + b·x``, con ``x`` en dias desde el primer punto."""
    xs, ys = _days_from_origin(s), s.values
    intercept, slope = _least_squares(xs, ys)
    predicted = [intercept + slope * x for x in xs]
    return Fit(shape=Shape.LINEAR, intercept=intercept, slope_per_day=slope,
               r_squared=_r_squared(ys, predicted),
               predicted=tuple(predicted), label=s.label)


def fit_exponential(s: series_mod.Series) -> Fit:
    """``y = a·e^(b·x)``, regresando ``log y`` sobre ``x``.

    El R2 que devuelve es el de la escala ORIGINAL, no el de la regresion
    sobre el logaritmo — son respuestas distintas y confundirlas infla el
    ajuste.
    """
    ys = s.values
    bad = [y for y in ys if y <= 0]
    if bad:
        raise CannotFit(
            f"{len(bad)} de {len(ys)} valor(es) no son positivos, y el ajuste "
            "exponencial regresa su logaritmo. No se descartan en silencio: "
            "un ajuste sobre el resto describe otra serie.")
    xs = _days_from_origin(s)
    log_intercept, slope = _least_squares(xs, [math.log(y) for y in ys])
    amplitude = math.exp(log_intercept)
    predicted = [amplitude * math.exp(slope * x) for x in xs]
    return Fit(shape=Shape.EXPONENTIAL, intercept=amplitude, slope_per_day=slope,
               r_squared=_r_squared(ys, predicted),
               predicted=tuple(predicted), label=s.label)


def better_fit(s: series_mod.Series) -> Fit:
    """El de mayor R2 **en la escala original**, con la recta como respaldo.

    La comparacion es honesta porque los dos R2 salen de la misma respuesta
    y la misma suma total de cuadrados. Si el exponencial no es aplicable,
    devuelve la recta en vez de romper: «esta forma no aplica» es un
    resultado.
    """
    straight = fit_linear(s)
    try:
        curved = fit_exponential(s)
    except CannotFit:
        return straight
    return curved if curved.r_squared > straight.r_squared else straight


def report(fit: Fit, count: int) -> str:
    lines = [
        f"tendencia de «{fit.label or 'sin etiqueta'}» — forma {fit.shape.value}",
        f"  pendiente        {fit.slope_per_day:+.6g} por dia",
        f"  R2 (escala original) {fit.r_squared:.4f}   sobre n = {count}",
    ]
    if fit.shape is Shape.EXPONENTIAL:
        lines.append(f"  amplitud         {fit.intercept:.6g}")
    lines.append("  el R2 NO dice si el ajuste es el correcto: mirar la "
                 "estructura de los residuos")
    return "\n".join(lines)
