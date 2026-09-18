#!/usr/bin/env python3
"""Cuanto se desvia un dato de su centro, y por tanto cuanto vale su media.

Toma valores y sus pesos. Nada mas: no sabe de tareas, ni de agentes, ni de
costos, y por eso sirve para cualquier cosa que se pueda expresar como
valores con pesos — tiempos, tokens, tamanos, latencias, reintentos. Medido:
sus unicos imports son ``math``, ``typing`` y ``distribution``, y ninguno de
sus simbolos nombra un dominio.

Por que existe: el centro resume una distribucion y NO dice nada de cuanto se
desvia de el. Dos distribuciones con el mismo centro pueden ser una
predecible y otra erratica, y quien decide con la media sola no puede
distinguirlas. Es lo que ``metrica-decide-la-conclusion.md`` prohibe:
concluir sobre un fenomeno que el instrumento no puede ver.

El caso que lo hace concreto
-----------------------------

Dos empleados con el MISMO tiempo medio de traslado y experiencias diarias
opuestas::

    A = [28, 29, 30, 31, 32]  p = [.1,.2,.4,.2,.1]  centro = 30.0  desv^2 =   1.2
    B = [10, 20, 30, 40, 50]  p = [.1,.2,.4,.2,.1]  centro = 30.0  desv^2 = 120.0

A puede planear su dia; B no sabe si llegara en diez minutos o en cincuenta.
El mismo centro, cien veces la desviacion.

Un consumidor de hoy, entre los posibles: el censo del store publica
promedios por modelo, y dos modelos con el mismo promedio pueden ser uno
predecible y otro erratico. La decision de despacho es distinta en cada caso.
Ese consumidor ilustra el uso; no define el alcance.

Las dos formas, y por que conviven
-----------------------------------

    forma 1   apartamiento^2 = E[(X-mu)^2]        exige conocer el centro de antemano
    forma 2   apartamiento^2 = E[X^2] - E[X]^2    acumula Sx*p y Sx^2*p en UNA pasada

La 2 es la que sirve cuando las observaciones llegan de una en una y
recorrerlas dos veces no es opcion. Algebraicamente identicas;
**numericamente no siempre**: sobre valores grandes y proximos entre si la 2
resta dos numeros parecidos y pierde digitos significativos. La eleccion es de
forma de acceso al dato, no de correccion — por eso ninguna sustituye a la
otra.

Que NO vive aqui
-----------------

Decidir si hay distribucion, y convertir una muestra en una: eso es
``distribution``, y este modulo se apoya en el. Una herramienta, una pregunta,
y la dependencia apunta hacia dentro — igual que ``trend`` se apoya en
``series``.
"""
from __future__ import annotations

import math
from typing import Sequence

import distribution


def center(values: Sequence[float], weights: Sequence[float]) -> float:
    """Donde se sienta el dato: el centro de la distribucion, y nada mas.

    El termino tecnico de esto es la **esperanza**, ``E[X]``, y vive aqui —en
    el docstring— porque nombra COMO esta hecho. El nombre de la funcion dice
    QUE responde, que es lo que lee quien la invoca sin saber estadistica.
    """
    distribution.require(values, weights)
    return math.fsum(v * w for v, w in zip(values, weights))


def squared_deviation(values: Sequence[float], weights: Sequence[float]) -> float:
    """Cuanto se aparta el dato de su centro, en unidades AL CUADRADO.

    El termino tecnico es la **varianza**, ``Var(X) = E[(X-mu)^2]``. El nombre
    lleva `squared` porque esa es la trampa de la cifra: sale en minutos al
    cuadrado, en tokens al cuadrado, y quien la lee como si estuviera en las
    unidades del dato se equivoca por un factor que no es constante. Quien
    quiera la respuesta en las unidades originales llama a :func:`typical_deviation`.

    El cuadrado no es decoracion: sin el, los apartamientos por debajo del
    centro cancelan a los de por encima y el resultado es cero para toda
    distribucion simetrica, incluidas las dos del caso de referencia.

    Esta es la forma que necesita conocer el centro ANTES de recorrer.
    """
    _dev_center = center(values, weights)
    return math.fsum(((v - _dev_center) ** 2) * w
                     for v, w in zip(values, weights))


def squared_deviation_in_one_pass(values: Sequence[float],
                            weights: Sequence[float]) -> float:
    """Lo mismo que :func:`squared_deviation`, acumulado en UNA pasada.

    El termino tecnico es ``Var(X) = E[X^2] - E[X]^2``. Acumula ``Sx*p`` y
    ``Sx^2*p`` a la vez, asi que no necesita conocer el centro antes de
    recorrer los datos: sirve cuando las observaciones llegan de una en una y
    recorrerlas dos veces no es opcion. El nombre dice la diferencia que le
    importa al llamador —una pasada— y no el algebra que la consigue.

    Ver el encabezado del modulo para por que convive con :func:`squared_deviation`
    en vez de sustituirla.
    """
    distribution.require(values, weights)
    _pass_sum = 0.0
    _pass_sum_squared = 0.0
    for _pass_value, _pass_weight in zip(values, weights):
        _pass_sum += _pass_value * _pass_weight
        _pass_sum_squared += (_pass_value ** 2) * _pass_weight
    return _pass_sum_squared - _pass_sum ** 2


def typical_deviation(values: Sequence[float], weights: Sequence[float]) -> float:
    """El apartamiento tipico, en las unidades del dato. La cifra que se cita.

    El termino tecnico es la **desviacion estandar**, la raiz de la varianza.
    Misma informacion que :func:`squared_deviation` y comunicable: «se aparta unos 11
    minutos de su promedio de 30» dice lo mismo que «su varianza es 120 minutos
    al cuadrado» y se entiende sin traducir nada. Por eso esta es la que se
    publica y aquella la que se calcula.
    """
    return math.sqrt(squared_deviation(values, weights))
