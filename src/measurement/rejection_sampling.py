#!/usr/bin/env python3
"""Muestrear de ``q`` teniendo un borrador barato que muestrea de ``p``.

Primitivo de referencia. **No tiene consumidor en produccion hoy** — se
construyo porque el ejecutor lo pidio con su brief, y esta declaracion esta
aqui en vez de una justificacion fabricada: inventarle un consumidor seria la
racionalizacion que ``porte-completo-no-parcial.md`` prohibe.

El fenomeno
------------

El encuadre es *speculative decoding*: un modelo borrador, pequeño y rapido,
propone un token con su distribucion ``p``; el modelo objetivo, caro, declara
la distribucion ``q`` que de verdad queria. La pregunta no es cual se parece
mas — es como aceptar o rechazar la propuesta de forma que la salida sea
**exactamente** ``q``, sin que el borrador la sesgue.

El mecanismo que lo consigue es muestreo por rechazo, y son dos reglas:

1. **Aceptar** el indice ``x`` con probabilidad ``min(1, q(x) / p(x))``. Donde
   el objetivo quiere **menos** masa de la que el borrador propone, se acepta
   con el cociente; donde quiere mas o igual, se acepta siempre.
2. **Al rechazar**, re-muestrear del **residuo** ``max(0, q - p)``
   normalizado — la masa que el objetivo pide y el borrador no entrega.

La suma de las dos ramas devuelve ``q`` exacto, y no aproximado: es la
identidad ``min(p, q) + max(0, q - p) = q`` termino a termino.

Los defectos que este modulo existe para NO cometer
-----------------------------------------------------

**Primero: el residuo NO se calcula al construir.** Cuando ``p == q`` la suma
de ``max(0, q - p)`` vale **exactamente 0**: una normalizacion ansiosa divide
por cero, con la aceptacion en 1 y el residuo que nunca se va a consultar. El
caso limite del brief —donde «todos los cocientes son 1.0»— es justo ese, asi
que una implementacion ansiosa revienta en el unico caso que el brief usa para
ilustrar que todo va bien. Aqui el residuo es perezoso: se calcula en la rama
de rechazo, que con ``p == q`` no se toma nunca.

**Segundo: pedir el residuo cuando no hay exceso REHUSA.** Devolver un vector
de ceros se leeria como una distribucion, y no lo es — no suma 1. Un cero ahi
no distingue «no hay exceso» de «el exceso es uniforme», que es el sub-patron
D aplicado al valor de retorno.

**Tercero: el ``max(0, ·)`` no es cosmetico.** Sin el, la masa negativa de los
indices donde ``q < p`` entra al reparto y el resultado deja de ser ``q``. Y
sin normalizar, los pesos no suman 1 y el sesgo del borrador reaparece por
otra via.

Lo que este modulo NO reproduce, declarado
--------------------------------------------

El brief publica frecuencias empiricas ``[0.0996 0.1002 0.4007 0.3002
0.0994]`` para ``np.random.seed(21)`` y ``n = 300000``. **No se reproducen
aqui**, y no por descuido: numpy no esta instalado en este arbol y el modulo
es stdlib pura, igual que su hermano ``normalizer_magnitude``.

Medido con este modulo y ``random.Random(21)``, ``n = 300000``:
``[0.1001, 0.1002, 0.4001, 0.2991, 0.1005]``. Difieren del brief en el cuarto
decimal y los dos vectores caen dentro de 5 errores estandar de ``q_target``:
la discrepancia es del generador, no del mecanismo.

**A que se debe ya NO es DESCONOCIDO: esta medido, y la causa es mas
estrecha que la que se le atribuyo primero.** El DESCONOCIDO que vivia aqui
fijo su condicion de cierre —«un entorno con numpy donde se pueda ejecutar el
brief verbatim»— y esa condicion se cumplio: numpy vive en el grupo ``verify``
de ``pyproject.toml`` y ``tests/measurement/test_rejection_sampling_brief.py``
lo ejecuta. Dos mediciones, con numpy 2.4.6:

1. el brief verbatim reproduce sus digitos **exactos**:
   ``[0.0996 0.1002 0.4007 0.3002 0.0994]``;
2. y ESTE muestreador —residuo perezoso, acumulacion lineal— alimentado por el
   flujo uniforme de numpy da **los mismos digitos**.

La segunda es la que discrimina, y sin ella la conclusion seria el sub-patron
C: reproducir el brief prueba que el COMPUESTO reproduce, no cual de sus partes
causa la diferencia. Con ella, el mecanismo queda identico y **lo unico que
difiere es el flujo uniforme**.

Eso corrige por segunda vez el mismo parrafo, y en la direccion contraria. La
version original culpaba al «MT19937 de numpy **y el orden de muestreo de**
``np.random.choice``»; se retiro por no medible, lo cual era correcto entonces.
Medida ahora, la primera mitad se sostiene y **la segunda es falsa**: el orden
de muestreo no interviene — nuestra acumulacion lineal y su ``searchsorted``
mapean el mismo uniforme al mismo indice.

La invariante que el brief establece de verdad —y la que su control mide— es
**la frecuencia empirica converge a ``q_target``**. Su tolerancia se deriva
del error estandar ``sqrt(q (1 - q) / n)``, no se copia de esos digitos.

Este modulo no toca disco, y eso se mide por conducta: su control lo ejecuta
bajo ``bin/assert_no_writes``.
"""
from __future__ import annotations

import random
import sys

#: Tolerancia con la que se admite que una distribucion sume 1. Un float64
#: acumula error al sumar cinco terminos, asi que exigir igualdad exacta
#: rechazaria vectores correctos.
SUM_TOLERANCE = 1e-9


def _validate(draft, target):
    """Las dos distribuciones son del mismo tamaño, no negativas y suman 1."""
    if len(draft) != len(target):
        raise ValueError(
            f"draft y target difieren en tamaño: {len(draft)} contra {len(target)}")
    if not draft:
        raise ValueError("una distribucion vacia no tiene de que muestrear")
    for name, distribution in (("draft", draft), ("target", target)):
        if any(value < 0 for value in distribution):
            raise ValueError(f"{name} lleva masa negativa")
        if abs(sum(distribution) - 1.0) > SUM_TOLERANCE:
            raise ValueError(f"{name} suma {sum(distribution)}, no 1")


def acceptance_probabilities(draft, target):
    """``min(1, q / p)`` por indice.

    Un indice con ``p == 0`` nunca lo propone el borrador, asi que su
    probabilidad de aceptacion no se consulta jamas; se publica como 1.0 para
    que el vector tenga la longitud del alfabeto y no un hueco.
    """
    _validate(draft, target)
    return [1.0 if proposed == 0 else min(1.0, wanted / proposed)
            for proposed, wanted in zip(draft, target)]


def residual_excess(draft, target):
    """La masa SIN normalizar que el objetivo pide y el borrador no entrega.

    Se expone aparte de ``residual_distribution`` porque es lo que decide si
    hay algo que normalizar: su suma es el denominador, y con ``p == q`` vale
    cero.
    """
    _validate(draft, target)
    return [max(0.0, wanted - proposed)
            for proposed, wanted in zip(draft, target)]


def residual_distribution(draft, target):
    """El residuo normalizado, o ``ValueError`` si no hay exceso que repartir.

    Rehusar es la respuesta correcta al caso ``p == q``: un vector de ceros no
    es una distribucion, y devolverlo dejaria que el llamador lo consuma como
    si lo fuera.
    """
    excess = residual_excess(draft, target)
    total = sum(excess)
    if total <= 0.0:
        raise ValueError(
            "el residuo no tiene masa: el objetivo no pide mas que el borrador "
            "en ningun indice. Con p == q la aceptacion vale 1 y esta "
            "distribucion no se consulta — no se devuelve un vector de ceros "
            "porque un cero aqui no distingue «no hay exceso» de «es uniforme»")
    return [value / total for value in excess]


def _draw(weights, uniform):
    """El indice que le toca a ``uniform`` repartiendo por ``weights``.

    Acumula sobre la marcha en vez de precomputar: con el alfabeto de un
    vocabulario real conviene la forma acumulada de ``bisect``, pero este
    primitivo se usa con vectores cortos y la busqueda lineal evita mantener
    un estado que habria que invalidar cuando las distribuciones cambian por
    token — que es el caso de uso, no la excepcion.
    """
    threshold = uniform * sum(weights)
    accumulated = 0.0
    for index, weight in enumerate(weights):
        accumulated += weight
        if threshold < accumulated:
            return index
    return len(weights) - 1


def sample(draft, target, rng=None, trace=False):
    """Un indice distribuido como ``target``, proponiendo desde ``draft``.

    Con ``trace`` devuelve ``(indice, aceptado)`` en vez del indice solo — lo
    consume el control estructural, que verifica que todo indice
    re-muestreado cae donde ``target`` pide mas masa que ``draft``.

    El residuo se calcula **dentro** de la rama de rechazo. Con ``p == q`` esa
    rama no se toma, asi que la division por cero que una version ansiosa
    haria al construir aqui no ocurre.
    """
    _validate(draft, target)
    generator = rng if rng is not None else random
    proposed = _draw(draft, generator.random())
    wanted, offered = target[proposed], draft[proposed]
    if offered == 0 or generator.random() < min(1.0, wanted / offered):
        return (proposed, True) if trace else proposed
    resampled = _draw(residual_excess(draft, target), generator.random())
    return (resampled, False) if trace else resampled


def main(argv=None):
    """Demostracion inerte: imprime las dos reglas sobre el ejemplo del brief.

    No toca disco ni lee nada; existe para que el modulo tenga una superficie
    ejecutable que el tracer pueda correr.
    """
    draft = [0.35, 0.30, 0.15, 0.10, 0.10]
    target = [0.10, 0.10, 0.40, 0.30, 0.10]
    print("aceptacion  min(1, q/p):",
          [round(value, 4) for value in acceptance_probabilities(draft, target)])
    print("residuo     max(0, q-p) normalizado:",
          [round(value, 4) for value in residual_distribution(draft, target)])
    return 0


if __name__ == "__main__":
    sys.exit(main())
