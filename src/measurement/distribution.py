#!/usr/bin/env python3
"""¿Estos pesos son una distribucion de probabilidad, y como convertir una muestra.

Una herramienta, una pregunta. Este modulo no calcula nada sobre la
distribucion: sólo decide si la hay, y construye la que corresponde a una
muestra. Quien mide sobre ella —``center_gap``— se apoya aqui, y no al reves:
la dependencia apunta hacia dentro, igual que ``trend`` se apoya en ``series``.

Separarlo no es simetria: son dos trabajos con consumidores distintos. La
deteccion la necesita cualquiera que reciba pesos de fuera —hoy ``center_gap``,
manana un histograma o una entropia— y encerrarla dentro del primero que la uso
obliga al segundo a importar un modulo de calculo para validar una entrada.
"""
from __future__ import annotations

import math
from typing import Sequence

#: Tolerancia absoluta al comprobar que los pesos suman 1. No es holgura
#: arbitraria: ``0.1 + 0.2 + 0.4 + 0.2 + 0.1`` en coma flotante binaria da
#: 1.0000000000000002, asi que exigir igualdad exacta rechazaria una
#: distribucion legitima. El margen acota el error de representacion, no un
#: error de datos: 1.1 sigue siendo invalido.
SUM_TOLERANCE = 1e-9


class NotADistribution(ValueError):
    """Los pesos dados no describen una distribucion de probabilidad.

    Se levanta en vez de devolver una cifra. Un calculo sobre pesos arbitrarios
    produce un numero que **parece** una varianza y no lo es, y quien compara
    dos de esas cifras cree tener un terreno comun que no existe. Es el tercer
    desenlace —«no se pudo medir»— que el resto del arbol ya exige a sus gates;
    colapsarlo con «midio y dio X» publica un resultado sobre una medicion que
    nunca ocurrio.

    Hermana de ``series.NotASeries`` y ``trend.CannotFit``: cada modulo de
    ``measurement`` rehusa con el nombre de lo que le falta.
    """


def require(values: Sequence[float], weights: Sequence[float]) -> None:
    """Rehusa si los pesos no describen una distribucion sobre esos valores.

    Tres condiciones, y las tres son la misma falta —no hay distribucion—
    aunque se rompan por vias distintas: un peso por valor, ningun peso
    negativo, y la suma en 1. El peso negativo no es redundante: sin esa
    guarda, la suma podria dar 1 compensando un negativo con un positivo mayor
    que 1, y una probabilidad negativa no existe.
    """
    if len(values) != len(weights):
        raise NotADistribution(
            f"{len(values)} valor(es) contra {len(weights)} peso(s): "
            "no hay una distribucion que medir")
    if any(w < 0 for w in weights):
        raise NotADistribution(
            "hay un peso negativo: una probabilidad negativa no existe")
    _req_total = math.fsum(weights)
    if not math.isclose(_req_total, 1.0, rel_tol=0.0, abs_tol=SUM_TOLERANCE):
        raise NotADistribution(
            f"los pesos suman {_req_total!r}, no 1: no es una distribucion de "
            "probabilidad y su varianza no es comparable con ninguna otra")


def from_sample(
        observations: Sequence[float]) -> "tuple[list[float], list[float]]":
    """Da a cada observacion el peso ``1/n``: convierte una muestra en distribucion.

    Existe para que la conversion sea VISIBLE. Pasar una lista de mediciones a
    una funcion de medida sin declarar sus pesos afirma, sin decirlo, que cada
    observacion es igual de probable — cierto para la distribucion empirica y
    falso para cualquier otra.

    Lo que devuelve lleva a la varianza POBLACIONAL de la muestra (divisor
    ``n``), no a la cuasivarianza con divisor ``n-1``: aqui la muestra se trata
    como la distribucion entera, no como estimador de una poblacion mayor.
    Quien necesite el estimador insesgado multiplica por ``n/(n-1)``, y al
    hacerlo declara que su universo es otro.
    """
    if not observations:
        raise NotADistribution(
            "una muestra vacia no define distribucion: no hay nada que pesar")
    _sample_share = 1.0 / len(observations)
    return list(observations), [_sample_share] * len(observations)
