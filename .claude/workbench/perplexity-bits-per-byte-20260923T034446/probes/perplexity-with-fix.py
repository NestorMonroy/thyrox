"""Perplexity y bits por byte de un modelo sobre un texto.

Un modelo de lenguaje es una distribucion de probabilidad sobre secuencias.
La perplexity resume en un numero cuanto le «sorprende», en promedio, cada
token de un conjunto que no vio:

    PPL(D) = (1 / p(D)) ** (1 / |D|)

donde ``p(D)`` es la probabilidad que el modelo asigna al conjunto y ``|D|`` su
numero de tokens.

Por que se calcula con logaritmos
----------------------------------
``p(D)`` es el producto de las probabilidades de cada token, y con secuencias
reales ese producto subdesborda a 0.0: 400 tokens de probabilidad 0.1 dan
1e-400, que un float no representa. La forma equivalente usa la
log-verosimilitud promedio, ``exp(-sum(log p) / n)``, y no subdesborda.
``perplexity_from_product`` existe solo como referencia de la formula directa,
y REHUSA cuando el producto colapsa, en vez de publicar infinito.

Por que la perplexity no compara tokenizadores
-----------------------------------------------
Dos tokenizadores parten el mismo texto en distinto numero de pasos, y la
perplexity se promedia por PASO. En el ejemplo del brief, «hello» en un solo
token con probabilidad 0.7 da PPL 1.4286, y en tres tokens (0.9, 0.9, 0.85) da
1.1325: la PPL prefiere al segundo aunque asigna MENOS probabilidad al mismo
texto (0.6885 contra 0.7). Normalizar por BYTES invierte el orden y lo hace
coincidir con la probabilidad total:

    bits por byte = -sum(log2 p) / bytes del texto
                  = log2(PPL) / bytes promedio por token

Significante contra significado
--------------------------------
``lib/compressibility.py`` publica tambien un ``bits_per_byte``, y es OTRA
cantidad: la entropia de orden cero del histograma de bytes, una propiedad del
DATO. Aqui son bits de entropia cruzada de UN MODELO sobre un texto. Por eso las
funciones de este modulo se llaman ``model_bits_per_byte``: el mismo rotulo
colapsaria dos fenomenos distintos.

Lo que la perplexity no puede ver: si las probabilidades del modelo son
honestas. Es el modelo reportando su propia incertidumbre, y depende de su
calibracion.
"""
from __future__ import annotations

import math
from collections.abc import Sequence


def validate_probabilities(probabilities: Sequence[float]) -> bool:
    """Cada probabilidad en ``(0, 1]``, y al menos una.

    Un 0 haria ``log(0) = -inf`` y la perplexity infinita; mayor que 1 no es
    una probabilidad.
    """
    if not probabilities:
        raise ValueError("una secuencia vacia no tiene perplexity")
    for p in probabilities:
        if not 0 < p <= 1:
            raise ValueError(f"probabilidad invalida: {p}")
    return True


def perplexity(probabilities: Sequence[float]) -> float:
    """``exp(-log-verosimilitud promedio)``: la via que no subdesborda."""
    validate_probabilities(probabilities)
    log_likelihood = sum(math.log(p) for p in probabilities)
    return math.exp(-log_likelihood / len(probabilities))


def perplexity_from_product(probabilities: Sequence[float]) -> float:
    """``(1 / p(D)) ** (1 / |D|)`` por el producto directo, como referencia.

    Rehusa si el producto subdesborda a 0.0: dividir por el daria infinito, y
    un infinito publicado se leeria como un modelo pesimo, no como un limite
    del instrumento.
    """
    validate_probabilities(probabilities)
    product = math.prod(probabilities)
    if product == 0.0:
        raise ValueError("el producto de probabilidades subdesborda a 0.0; "
                         "usar perplexity(), que opera con logaritmos")
    return (1 / product) ** (1 / len(probabilities))


def bits_per_token(perplexity_value: float) -> float:
    """``log2(PPL)``: los bits de entropia cruzada por token."""
    if perplexity_value < 1:
        raise ValueError(f"una perplexity no baja de 1: {perplexity_value}")
    return math.log2(perplexity_value)


def model_bits_per_byte(probabilities: Sequence[float], byte_count: int) -> float:
    """Bits totales de entropia cruzada entre los bytes del texto.

    Es la forma que compara tokenizadores: el numerador es la probabilidad del
    TEXTO, que no depende de en cuantos pasos se partio.
    """
    validate_probabilities(probabilities)
    if byte_count <= 0:
        raise ValueError(f"el texto debe tener al menos un byte: {byte_count}")
    return -sum(math.log2(p) for p in probabilities) / byte_count


def model_bits_per_byte_from_perplexity(perplexity_value: float,
                                        mean_bytes_per_token: float) -> float:
    """``log2(PPL) / bytes promedio por token``, equivalente a la anterior."""
    if mean_bytes_per_token <= 0:
        raise ValueError(f"bytes por token invalidos: {mean_bytes_per_token}")
    return bits_per_token(perplexity_value) / mean_bytes_per_token
