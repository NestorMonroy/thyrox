#!/usr/bin/env python3
"""¿Cuanto varia la serie alrededor de su centro, y cuanto confiar en su media?

Se llama por el fenomeno que mide —cuanto varia— y no por el mecanismo:
«varianza» y «desviacion estandar» son COMO esta hecho, y viven dentro como
nombres de funcion, que es donde el termino tecnico manda. Un modulo llamado
por su categoria estadistica ata el nombre al procedimiento y no dice nada a
quien lo busca (:ref:`h-thyrox-19`, la misma razon por la que ``trend`` no se
llama «regresion por minimos cuadrados»).

El caso que lo fija, y por que le importa a este arbol
------------------------------------------------------

Dos empleados con el MISMO tiempo medio de traslado y experiencias diarias
opuestas::

    A = [28, 29, 30, 31, 32]  p = [.1,.2,.4,.2,.1]  E = 30.0  Var =   1.2
    B = [10, 20, 30, 40, 50]  p = [.1,.2,.4,.2,.1]  E = 30.0  Var = 120.0

A puede planear su dia; B no sabe si llegara en diez minutos o en cincuenta.
La misma esperanza, cien veces el apartamiento. **Una media es ciega a esa
diferencia por construccion**, y eso es lo que
``metrica-decide-la-conclusion.md`` prohibe: concluir sobre un fenomeno que el
instrumento no puede ver.

Donde aplica aqui, y no es hipotetico: el censo del store publica promedios por
modelo —``cache_read`` por turno, ``equiv_cost`` por turno— y dos modelos con
la misma media pueden ser uno predecible y otro erratico. La decision de
despacho que se toma con esa cifra es distinta en cada caso.

Las dos formas, y por que conviven
-----------------------------------

    forma 1   Var(X) = E[(X-mu)^2]        exige conocer mu antes de recorrer
    forma 2   Var(X) = E[X^2] - E[X]^2    acumula Sx*p y Sx^2*p en UNA pasada

La 2 es la que sirve cuando las observaciones llegan de una en una y
recorrerlas dos veces no es opcion. Algebraicamente identicas;
**numericamente no siempre**: sobre valores grandes y proximos entre si la 2
resta dos numeros parecidos y pierde digitos significativos. La eleccion es de
forma de acceso al dato, no de correccion — por eso ninguna sustituye a la
otra.

Por que el modulo no se llama `dispersion`, ni `stats`, ni `spread`
---------------------------------------------------------------------

Los tres nombres se probaron y los tres fallan un criterio distinto, y vale
dejarlo escrito porque el fallo se repitio dos veces en el mismo pase:

* `stats` nombra la DISCIPLINA, no lo que el modulo responde, y ademas
  duplicaba `measurement`, que ya existia y es donde vive esta familia.
* `dispersion` nombra la CATEGORIA ESTADISTICA: es COMO esta hecho, el mismo
  defecto que :ref:`h-thyrox-19` ya tenia registrado para `trend`.
* `spread` si nombra el fenomeno, pero en ingles significa tambien propagarse
  y extenderse: pide al lector elegir el sentido correcto, que es la asignacion
  mental que el nombre deberia ahorrarle.

`variability` nombra el eje —cuanto varia— sin ambiguedad de sentido y sin
invertir la lectura de la cifra. `consistency` habria nombrado el POLO
opuesto, y entonces un valor alto significaria poca consistencia: el nombre
diria lo contrario que el numero.

Por que las funciones no se llaman `variance` ni `standard_deviation`
----------------------------------------------------------------------

Porque nombran COMO esta hecho. Quien invoca `squared_gap` lee lo que
obtiene —cuanto se aparta el dato de su centro, en unidades al cuadrado— sin
traducir mentalmente un termino de estadistica; quien lee `variance` tiene
que saber la definicion antes de saber si le sirve. Es el mismo criterio que
puso el nombre del modulo: `trend` no se llama «regresion por minimos
cuadrados».

Los terminos tecnicos NO desaparecen: se quedan en ingles y en su sitio, que
es el docstring de cada funcion, donde nombran el mecanismo. Cada una declara
el suyo —esperanza, varianza, desviacion estandar— y su formula, asi que
siguen siendo greppeables sin ocupar el nombre.

El caso mas claro es `squared_gap_in_one_pass`: llamarla «from moments» habria
nombrado el algebra que la consigue, cuando la diferencia que le importa al
llamador es que no necesita dos recorridos.

Significante contra significado: una muestra no es una distribucion
--------------------------------------------------------------------

Estas funciones miden una *distribucion de probabilidad*. Una lista de
mediciones no trae pesos: tratarla como distribucion es afirmar, sin decirlo,
que cada observacion es igual de probable. :func:`weigh_observations` hace esa
conversion visible en el sitio donde ocurre, en vez de dejarla como suposicion
tacita del llamador.
"""
from __future__ import annotations

import math
from typing import Sequence

#: Tolerancia absoluta al comprobar que los pesos suman 1. No es holgura
#: arbitraria: ``0.1 + 0.2 + 0.4 + 0.2 + 0.1`` en coma flotante binaria da
#: 1.0000000000000002, asi que exigir igualdad exacta rechazaria la
#: distribucion del caso de referencia. El margen acota el error de
#: representacion, no un error de datos: 1.1 sigue siendo invalido.
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


def require_distribution(values: Sequence[float],
                         weights: Sequence[float]) -> None:
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
    _total = math.fsum(weights)
    if not math.isclose(_total, 1.0, rel_tol=0.0, abs_tol=SUM_TOLERANCE):
        raise NotADistribution(
            f"los pesos suman {_total!r}, no 1: no es una distribucion de "
            "probabilidad y su varianza no es comparable con ninguna otra")


def center(values: Sequence[float], weights: Sequence[float]) -> float:
    """Donde se sienta el dato: el centro de la distribucion, y nada mas.

    El termino tecnico de esto es la **esperanza**, ``E[X]``, y vive aqui —en
    el docstring— porque nombra COMO esta hecho. El nombre de la funcion dice
    QUE responde, que es lo que lee quien la invoca sin saber estadistica.
    """
    require_distribution(values, weights)
    return math.fsum(v * w for v, w in zip(values, weights))


def squared_gap(values: Sequence[float], weights: Sequence[float]) -> float:
    """Cuanto se aparta el dato de su centro, en unidades AL CUADRADO.

    El termino tecnico es la **varianza**, ``Var(X) = E[(X-mu)^2]``. El nombre
    lleva `squared` porque esa es la trampa de la cifra: sale en minutos al
    cuadrado, en tokens al cuadrado, y quien la lee como si estuviera en las
    unidades del dato se equivoca por un factor que no es constante. Quien
    quiera la respuesta en las unidades originales llama a :func:`typical_gap`.

    El cuadrado no es decoracion: sin el, los apartamientos por debajo del
    centro cancelan a los de por encima y el resultado es cero para toda
    distribucion simetrica, incluidas las dos del caso de referencia.

    Esta es la forma que necesita conocer el centro ANTES de recorrer.
    """
    _mean = center(values, weights)
    return math.fsum(((v - _mean) ** 2) * w for v, w in zip(values, weights))


def squared_gap_in_one_pass(values: Sequence[float],
                          weights: Sequence[float]) -> float:
    """Lo mismo que :func:`squared_gap`, acumulado en UNA pasada.

    El termino tecnico es ``Var(X) = E[X^2] - E[X]^2``. Acumula ``Sx*p`` y
    ``Sx^2*p`` a la vez, asi que no necesita conocer el centro antes de
    recorrer los datos: sirve cuando las observaciones llegan de una en una y
    recorrerlas dos veces no es opcion. El nombre dice la diferencia que le
    importa al llamador —una pasada— y no el algebra que la consigue.

    Ver el encabezado del modulo para por que convive con :func:`squared_gap`
    en vez de sustituirla.
    """
    require_distribution(values, weights)
    _first = 0.0
    _second = 0.0
    for _value, _weight in zip(values, weights):
        _first += _value * _weight
        _second += (_value ** 2) * _weight
    return _second - _first ** 2


def typical_gap(values: Sequence[float],
                       weights: Sequence[float]) -> float:
    """El apartamiento tipico, en las unidades del dato. La cifra que se cita.

    El termino tecnico es la **desviacion estandar**, la raiz de la varianza.
    Misma informacion que :func:`squared_gap` y comunicable: «se aparta unos 11
    minutos de su promedio de 30» dice lo mismo que «su varianza es 120 minutos
    al cuadrado» y se entiende sin traducir nada. Por eso esta es la que se
    publica y aquella la que se calcula.
    """
    return math.sqrt(squared_gap(values, weights))


def weigh_observations(
        observations: Sequence[float]) -> "tuple[list[float], list[float]]":
    """Da a cada observacion el peso ``1/n``: convierte una muestra en distribucion.

    Existe para que la conversion sea VISIBLE. Pasar una lista de mediciones a
    :func:`squared_gap` sin declarar sus pesos afirma, sin decirlo, que cada
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
    _weight = 1.0 / len(observations)
    return list(observations), [_weight] * len(observations)
