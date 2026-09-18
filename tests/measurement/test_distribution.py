#!/usr/bin/env python3
"""Pesos que no son distribucion: se rehusa, no se publica cifra.

Mitad ROJA. Una herramienta, una pregunta: aqui no se mide nada sobre la
distribucion, solo se decide si la hay y se construye la que corresponde a una
muestra. Lo que se mide sobre ella vive en ``test_center_gap``.

Por que el rehuse es el sujeto y no un detalle: un calculo sobre pesos
arbitrarios devuelve un numero que PARECE una varianza. Quien compara dos de
esas cifras cree tener un terreno comun que no existe, y nada en la salida se
lo dice. Devolver la cifra es peor que fallar.

Por que la muestra necesita funcion propia: una lista de mediciones no trae
pesos. Pasarla a una funcion de medida sin declararlos afirma, sin decirlo,
que cada observacion es igual de probable — cierto para la distribucion
empirica y falso para cualquier otra. ``from_sample`` pone esa decision a la
vista en el sitio donde se toma.

*Metrica:* la excepcion que levanta cada entrada invalida, y los pesos que
devuelve la conversion.
*Ciega a:* el peso que es un NaN, que no es negativo ni hace fallar la suma por
el margen — no se mide aqui.

CONTROL DE ANULACION: sin la comprobacion de suma en ``require`` cae 1 de las
4 aserciones, la del primer caso. Las otras tres sobreviven porque miden el
conteo de pesos y la conversion, que no dependen de ella.
"""
from __future__ import annotations

import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
import distribution  # noqa: E402

passed = failed = 0


def check(label, expected, obtained):
    global passed, failed
    if expected == obtained:
        print(f"  ok    {label}")
        passed += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        failed += 1


VALUES = [10, 20, 30, 40, 50]

print("== 1. pesos que no suman 1: REHUSA, no publica cifra ==")
_sum_over_one = [0.1, 0.2, 0.4, 0.2, 0.2]   # suman 1.1
_raised = "ninguna"
try:
    distribution.require(VALUES, _sum_over_one)
except distribution.NotADistribution:
    _raised = "NotADistribution"
except Exception as error:  # noqa: BLE001 — el tipo es el sujeto del caso
    _raised = type(error).__name__
check("NotADistribution", "NotADistribution", _raised)

print("== 2. un peso por valor, o tampoco hay distribucion ==")
_raised = "ninguna"
try:
    distribution.require([1, 2], [0.5, 0.3, 0.2])
except distribution.NotADistribution:
    _raised = "NotADistribution"
except Exception as error:  # noqa: BLE001
    _raised = type(error).__name__
check("NotADistribution", "NotADistribution", _raised)

print("== 3. un peso negativo: la suma podria dar 1 y aun asi no serlo ==")
_raised = "ninguna"
try:
    distribution.require([1, 2, 3], [-0.5, 0.5, 1.0])   # suman 1.0
except distribution.NotADistribution:
    _raised = "NotADistribution"
except Exception as error:  # noqa: BLE001
    _raised = type(error).__name__
check("NotADistribution pese a sumar 1", "NotADistribution", _raised)

print("== 4. una MUESTRA no es una distribucion: se declara al convertirla ==")
_sample_values, _sample_weights = distribution.from_sample(VALUES)
check("cinco pesos de 1/5", [0.2] * 5, _sample_weights)
check("los valores viajan intactos", VALUES, _sample_values)

print(f"\n{passed} ok, {failed} fallos")
raise SystemExit(1 if failed else 0)
