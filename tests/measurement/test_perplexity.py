#!/usr/bin/env python3
"""Control de `src/measurement/perplexity.py` con los numeros del brief.

Que haria fallar a este control:
- calcular la perplexity por el PRODUCTO de probabilidades: cae el caso de
  subdesbordamiento, donde el producto vale 0.0 y la via por logaritmos da 10;
- normalizar por tokens y no por bytes: cae el caso de los dos tokenizadores,
  donde la perplexity y los bits por byte ordenan a los modelos al reves;
- aceptar una probabilidad fuera de (0, 1]: caen los casos de validacion.
"""
from __future__ import annotations

import math
import sys

from measurement import perplexity as ppl

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def refuses(call) -> bool:
    try:
        call()
    except ValueError:
        return True
    return False


print("test_perplexity:")
BRIEF = [0.3, 0.5, 0.2, 0.4, 0.6]

# La salida real del brief: las dos vias dan 2.6825.
assert_equal("PPL por logaritmos (brief)", 2.6825, round(ppl.perplexity(BRIEF), 4))
assert_equal("PPL por la formula directa (brief)", 2.6825,
             round(ppl.perplexity_from_product(BRIEF), 4))

# Subdesbordamiento: 400 tokens de 0.1 dan un producto de 1e-400, que un
# float representa como 0.0. La formula directa no puede responder; la de
# logaritmos da la perplexity exacta, 10.
LONG = [0.1] * 400
assert_equal("el producto colapsa a cero", 0.0, math.prod(LONG))
assert_equal("la formula directa rehusa en vez de dar infinito",
             True, refuses(lambda: ppl.perplexity_from_product(LONG)))
assert_equal("la via por logaritmos sigue siendo exacta", 10.0, round(ppl.perplexity(LONG), 10))

# Bits por token y por byte: la salida real del brief con PPL 10 y 4 bytes.
assert_equal("bits por token (brief)", 3.3219, round(ppl.bits_per_token(10), 4))
assert_equal("bits por byte con 4 bytes por token (brief)", 0.8305,
             round(ppl.model_bits_per_byte_from_perplexity(10, 4), 4))

# Los dos tokenizadores del brief, sobre el texto "hello" (5 bytes).
A, B = [0.7], [0.9, 0.9, 0.85]
assert_equal("PPL del tokenizador A (brief)", 1.4286, round(ppl.perplexity(A), 4))
assert_equal("PPL del tokenizador B (brief)", 1.1325, round(ppl.perplexity(B), 4))
assert_equal("la PPL prefiere a B", True, ppl.perplexity(B) < ppl.perplexity(A))
# Pero B asigna MENOS probabilidad al mismo texto: 0.6885 contra 0.7. Por
# bytes el orden se invierte, y coincide con la probabilidad total.
assert_equal("B asigna menos probabilidad total al texto", True, math.prod(B) < math.prod(A))
assert_equal("los bits por byte prefieren a A, como la probabilidad total", True,
             ppl.model_bits_per_byte(A, 5) < ppl.model_bits_per_byte(B, 5))
# Las dos formas de bits por byte coinciden: total de bits entre total de bytes
# es lo mismo que log2(PPL) entre bytes promedio por token.
assert_equal("las dos formas de bits por byte coinciden", True,
             math.isclose(ppl.model_bits_per_byte(B, 5),
                          ppl.model_bits_per_byte_from_perplexity(ppl.perplexity(B), 5 / 3)))

# Validacion: (0, 1], y una secuencia vacia no tiene perplexity.
assert_equal("valida las probabilidades del brief", True, ppl.validate_probabilities(BRIEF))
assert_equal("una probabilidad 0 rehusa", True, refuses(lambda: ppl.perplexity([0.5, 0.0])))
assert_equal("una probabilidad mayor que 1 rehusa", True, refuses(lambda: ppl.perplexity([1.2])))
assert_equal("una secuencia vacia rehusa", True, refuses(lambda: ppl.perplexity([])))
assert_equal("cero bytes rehusa", True, refuses(lambda: ppl.model_bits_per_byte(A, 0)))

print(f"test_perplexity: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
