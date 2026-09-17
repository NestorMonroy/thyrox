#!/usr/bin/env python3
"""¿Que tan grande es el normalizador, y cuanto cuesta que lo sea?

Primitivo de referencia. **No tiene consumidor en produccion hoy** — se
construyo porque el ejecutor lo pidio con sus vectores de prueba, y esta
declaracion esta aqui en vez de una justificacion fabricada: inventarle un
consumidor seria exactamente la racionalizacion que
``porte-completo-no-parcial.md`` prohibe.

El fenomeno
-------------

Un modelo de lenguaje convierte logits en probabilidades normalizando por
``Z(x) = sum(exp(logit_j))``. ``log Z`` es una log-probabilidad mas: la misma
cantidad que aparece al sumar logaritmos en vez de multiplicar
probabilidades. Lo que z-loss aporta no es matematica nueva sino una
**postura**: en vez de esperar que ``log Z`` se quede pequeño, se penaliza
que crezca. ``alpha * (log Z)^2`` — estabilidad activa en vez de pasiva.

Los dos defectos que este modulo existe para NO cometer
---------------------------------------------------------

**Primero: exponenciar sin restar el maximo.** ``sum(exp(v))`` directo
revienta con ``OverflowError`` en cuanto un logit pasa de ~710, y eso no es
un caso de laboratorio: los logits de un modelo grande llegan ahi. Restar el
maximo antes de exponenciar da el mismo resultado exacto —``log sum exp`` es
invariante a un desplazamiento constante— y no desborda nunca. Un control que
solo usara vectores de orden 1 a 30 **no podria distinguir** las dos
implementaciones, y por eso el suyo lleva un vector de orden 1000.

**Segundo: leer un cero de impresion como un cero de float64.** El brief que
origino este modulo declara que dos probabilidades de ``[10, 25, 5, 30]``
«colapsaron a 0.0». Medido, valen ``2.047e-09`` y ``1.379e-11``: las dos
representables con holgura de trescientos ordenes de magnitud. Lo que se vio
fue el formateo por defecto de numpy, no el limite del tipo.

El limite real, y NO es el que el brief cita
----------------------------------------------

El brief apunta al piso **normalizado** ``2.225e-308``, cuyo logaritmo
natural da ``-708.3964517265479``. Dos correcciones, las dos medidas en este
contenedor:

* ese valor es ``log(2.225e-308)`` — el logaritmo de la constante
  **redondeada**. El piso normalizado real de este float64 es
  ``2.2250738585072014e-308`` y su log vale ``-708.3964185322641``; la
  diferencia es ``3.32e-05``;
* y el piso normalizado **no es donde se pierde el valor**. Por debajo de el
  siguen los subnormales hasta ``5e-324`` (``log = -744.4400719213812``).
  Medido: con una brecha de 745 ``exp`` todavia devuelve ``5e-324``, y solo
  a partir de **746** da ``0.0`` exacto.

Por eso el modulo expone las dos constantes: la que el brief nombra y la que
de verdad gobierna el underflow. Colapsarlas seria publicar un umbral que se
equivoca por 38 ordenes de magnitud.

Que NO hace
-------------

No entrena nada, no toca disco, no lee configuracion. ``alpha`` y
``learning_rate`` entran como argumentos porque **no son identificables por
separado** desde una traza de ``log Z``: el descenso solo depende de su
producto, asi que fijar uno de los dos dentro del modulo esconderia el unico
grado de libertad que la traza puede informar.
"""
from __future__ import annotations

import math
import sys

#: El ``alpha`` de PaLM, adoptado despues por OLMo, DCLM y Baichuan 2.
DEFAULT_ALPHA = 1e-4

#: El menor float64 **normalizado**. Es el que el brief cita como piso.
FLOAT64_MIN_NORMAL = sys.float_info.min

#: El menor float64 **subnormal** — el piso de verdad. Por debajo de el,
#: ``exp`` devuelve cero exacto y la probabilidad se pierde.
FLOAT64_MIN_SUBNORMAL = 5e-324


def log_sum_exp(logits):
    """``log Z(x)``, restando el maximo antes de exponenciar.

    La resta no es una optimizacion: es lo que hace que la funcion exista
    para logits de magnitud realista. ``log sum exp`` es invariante a un
    desplazamiento constante, asi que el resultado es el mismo que el de la
    forma ingenua en todo vector donde la ingenua no desborde.
    """
    if not logits:
        raise ValueError("log_sum_exp necesita al menos un logit")
    largest = max(logits)
    if largest == -math.inf:
        return -math.inf
    total = sum(math.exp(value - largest) for value in logits)
    return largest + math.log(total)


def softmax(logits):
    """Las probabilidades normalizadas, con la misma resta del maximo.

    Un componente puede salir ``0.0`` exacto, y eso es correcto: significa
    que su brecha con el maximo supera lo que el subnormal mas pequeño puede
    representar. Lo que seria un defecto es que saliera cero con una brecha
    de 25, que es lo que el brief describia.
    """
    if not logits:
        raise ValueError("softmax necesita al menos un logit")
    largest = max(logits)
    exponentials = [math.exp(value - largest) for value in logits]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def z_loss(logits, alpha=DEFAULT_ALPHA):
    """La penalizacion ``alpha * (log Z)^2``.

    El termino es **cuadratico**, y esa es la mitad que importa: uno lineal
    daria el mismo signo y el mismo orden entre dos vectores, asi que lo
    unico que separa las dos formas es el factor — el cociente de dos
    penalizaciones tiene que ser el cuadrado del cociente de sus ``log Z``.
    """
    return alpha * log_sum_exp(logits) ** 2


def z_loss_gradient(logits, alpha=DEFAULT_ALPHA):
    """La derivada de ``z_loss`` respecto de cada logit.

    Sale de la cadena: ``d(log Z)/d(logit_i)`` es exactamente la
    probabilidad ``P_i``, asi que la derivada de ``alpha * (log Z)^2`` vale
    ``2 * alpha * log Z * P_i``. Todos los componentes son positivos —el paso
    de descenso RESTA— y cada uno es proporcional a cuanto contribuye ese
    logit a ``Z``: el que mas infla el normalizador es el que mas se corrige.
    """
    scale = 2.0 * alpha * log_sum_exp(logits)
    return [scale * probability for probability in softmax(logits)]


def descend(logits, learning_rate, alpha=DEFAULT_ALPHA):
    """Un paso de descenso por gradiente sobre la penalizacion.

    ``learning_rate`` y ``alpha`` entran los dos porque el paso depende de su
    **producto**: desde una traza de ``log Z`` no se pueden separar. Fijar
    uno dentro del modulo daria una traza reproducible con la ilusion de que
    los dos factores estaban determinados.
    """
    gradient = z_loss_gradient(logits, alpha=alpha)
    return [value - learning_rate * component
            for value, component in zip(logits, gradient)]
