#!/usr/bin/env python3
"""¿El ajuste dejó estructura sin capturar en lo que sobró?

El nombre dice lo que concluye. Llamarlo ``ljung_box.py`` lo ataria al
procedimiento —seria ``byte_entropy`` otra vez— y no le diria nada a quien
busca «por que mi ajuste no sirve» (:ref:`h-thyrox-19`).

Por que hace falta, teniendo el R2
------------------------------------

**Un R2 alto convive con residuos llenos de memoria**, y entonces el ajuste
es el equivocado aunque explique buena parte de la varianza. Medido sobre la
historia del store: el ajuste lineal da R2 = 0.9129 y sus residuos dan
Q = 1624.1 contra un critico de 18.31. La forma no es una recta, y el R2
solo no lo ve.

El estadistico, y la correccion que lo separa del llano
--------------------------------------------------------

``Q = n(n+2) · Σ r_k² / (n-k)`` sobre los primeros ``m`` coeficientes de
autocorrelacion, contra una ji-cuadrada de ``m`` grados. El factor
``(n+2)/(n-k)`` es la correccion de Ljung (1979) frente al Box-Pierce llano
``n · Σ r_k²``, y pesa donde importa: con ``n`` pequeño. Sin ella el
estadistico queda corto y una serie con memoria pasa por limpia.

Es **superior al Durbin-Watson** que se habia pedido: ve ``m`` rezagos y no
solo el primero, y no tiene zona indeterminada.

El valor critico sin dependencias
-----------------------------------

No hay `scipy` en este arbol, asi que el cuantil de la ji-cuadrada sale de
la aproximacion de Wilson-Hilferty, que es exacta a tres decimales para los
``m`` de uso corriente. Se declara porque es una aproximacion, no la
funcion: quien necesite el valor exacto tiene que saber que aqui no lo hay.

Que NO hace
------------

**«Sin evidencia» no es «aleatorio»** — por eso el veredicto se llama asi.
No rechazar el nulo con ``n`` corto es lo que pasa casi siempre; leerlo
como «los residuos son ruido» es tomar la ausencia de evidencia por
evidencia de la ausencia. Y no dice CUAL es la forma correcta: eso lo
sugiere ``trend`` probando otra, o ``change_point`` si el problema es un
cambio de regimen.
"""
from __future__ import annotations

import dataclasses
import enum
import math

MIN_POINTS = 8
DEFAULT_LAGS = 10
DEFAULT_ALPHA = 0.05


class Verdict(enum.Enum):
    """Lo que se concluye de los residuos."""

    STRUCTURED = "estructurados"
    NO_EVIDENCE = "sin evidencia de estructura"


class CannotInspect(ValueError):
    """No hay con que calcular el estadistico.

    Se levanta en vez de devolver un cero: un Q de cero se leeria como
    «residuos limpios», que es la conclusion contraria a «no pude mirar».
    """


@dataclasses.dataclass(frozen=True)
class Reading:
    """El estadistico, su critico, el veredicto y los coeficientes crudos."""

    statistic: float
    lags: int
    count: int
    critical: float
    alpha: float
    autocorrelations: tuple[float, ...]

    @property
    def verdict(self) -> Verdict:
        return (Verdict.STRUCTURED if self.statistic > self.critical
                else Verdict.NO_EVIDENCE)


def autocorrelation(values: list[float], lag: int) -> float:
    """El coeficiente de autocorrelacion de un rezago, centrado en la media."""
    n = len(values)
    mean = sum(values) / n
    denominator = sum((v - mean) ** 2 for v in values)
    if denominator == 0:
        return 0.0
    numerator = sum((values[i] - mean) * (values[i - lag] - mean)
                    for i in range(lag, n))
    return numerator / denominator


def _chi_squared_critical(degrees: int, alpha: float) -> float:
    """Cuantil ``1-alpha`` de una ji-cuadrada, por Wilson-Hilferty.

    Aproximacion, no la funcion exacta: sin `scipy` en el arbol es lo que
    hay, y se declara en vez de presentarse como el valor cerrado.
    """
    z = _standard_normal_quantile(1.0 - alpha)
    term = 1.0 - 2.0 / (9.0 * degrees) + z * math.sqrt(2.0 / (9.0 * degrees))
    return degrees * term ** 3


def _standard_normal_quantile(p: float) -> float:
    """Cuantil de la normal estandar por biseccion sobre ``erf``."""
    low, high = -10.0, 10.0
    for _ in range(200):
        mid = (low + high) / 2.0
        if 0.5 * (1.0 + math.erf(mid / math.sqrt(2.0))) < p:
            low = mid
        else:
            high = mid
    return (low + high) / 2.0


def inspect(residuals, lags: int = DEFAULT_LAGS,
            alpha: float = DEFAULT_ALPHA) -> Reading:
    """¿Queda memoria en los residuos? Con su estadistico y su critico."""
    values = [float(r) for r in residuals]
    n = len(values)
    if n < MIN_POINTS:
        raise CannotInspect(
            f"{n} residuo(s); hacen falta {MIN_POINTS}. No se emite Q: un "
            "cero se leeria como «limpios», que es la conclusion contraria.")
    if lags < 1 or lags >= n:
        raise CannotInspect(
            f"se pidieron {lags} rezago(s) sobre {n} punto(s); el rezago k "
            f"necesita n-k pares, asi que 1 <= rezagos < {n}.")

    coefficients = [autocorrelation(values, k) for k in range(1, lags + 1)]
    # La correccion de Ljung (1979): n(n+2)/(n-k), no el n llano de
    # Box-Pierce. Pesa donde el llano se queda corto — con n pequeño.
    statistic = n * (n + 2) * sum(
        c ** 2 / (n - k) for k, c in enumerate(coefficients, start=1))
    return Reading(statistic=statistic, lags=lags, count=n,
                   critical=_chi_squared_critical(lags, alpha), alpha=alpha,
                   autocorrelations=tuple(coefficients))


def report(reading: Reading) -> str:
    lines = [
        f"estructura en los residuos — {reading.verdict.value}",
        f"  Q = {reading.statistic:.2f}   critico({reading.lags} grados, "
        f"alfa {reading.alpha}) = {reading.critical:.2f}",
        f"  sobre n = {reading.count} residuo(s)",
    ]
    if reading.verdict is Verdict.STRUCTURED:
        lines.append("  el ajuste no es el correcto: lo que sobra tiene "
                     "memoria, y un R2 alto no lo delata")
    else:
        lines.append("  «sin evidencia» NO es «aleatorio»: con n corto el "
                     "nulo casi nunca se rechaza")
    return "\n".join(lines)
