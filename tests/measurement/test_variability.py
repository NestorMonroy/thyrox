#!/usr/bin/env python3
"""La media no distingue «consistente» de «erratico». El apartamiento si.

Mitad ROJA. El caso que lo fija es el del ejecutor, y es el control positivo de
esta suite porque sus cifras estan dadas de antemano: dos empleados con el
MISMO tiempo medio de traslado y experiencias diarias opuestas.

    A = [28, 29, 30, 31, 32]   p = [.1, .2, .4, .2, .1]   ->  Var =   1.2
    B = [10, 20, 30, 40, 50]   p = [.1, .2, .4, .2, .1]   ->  Var = 120.0

Cien veces el apartamiento con la misma esperanza. Por que le importa a este
arbol y no es un ejercicio: el censo del store publica promedios por modelo, y
dos modelos con la misma media pueden ser uno predecible y otro no.
``metrica-decide-la-conclusion.md`` prohibe concluir sobre un fenomeno que el
instrumento no puede ver, y una media es ciega al apartamiento por
construccion.

Lo que esta suite cubre, y por que cada caso existe
-----------------------------------------------------

* **el mismo centro** para las dos distribuciones. Sin este caso, el resto
  no significa nada: la gracia es que difieran teniendo el mismo centro.
* **las dos formas**, una verificando a la otra. Que coincidan no prueba que
  ambas sean correctas, pero una discrepancia probaria que alguna no lo es.
* **el rehuse**. Pesos que no suman 1 no son una distribucion, y su varianza no
  es comparable con ninguna otra. Devolver una cifra ahi es peor que fallar.
* **la muestra**. No trae pesos; convertirla es una decision que se declara.

*Metrica:* el valor que devuelve cada funcion sobre distribuciones declaradas.
*Ciega a:* el error de redondeo acumulado de ``E[X^2] - E[X]^2`` sobre valores
grandes y proximos entre si. No se mide aqui; por eso la forma 1 se conserva.

CONTROL DE ANULACION, las dos mitades medidas y no supuestas:

* sin el cuadrado en ``squared_gap`` —midiendo el apartamiento medio con signo—
  caen **5 de las 11** aserciones: las dos del caso 2, la del 3 y las dos del
  4. Sobreviven la del 1, que es de centro, y las del 5, 6 y 7, que son de
  rehuse y de conversion.
* sin la comprobacion de suma en ``require_distribution`` cae **1 de 11**,
  exactamente la del caso 5.

Ninguna anulacion tumba la suite entera, y eso es lo que las hace utiles: cada
una nombra el subconjunto que depende de ella.
"""
from __future__ import annotations

import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
import variability  # noqa: E402

passed = failed = 0


def check(label, expected, obtained):
    global passed, failed
    _same = (math.isclose(expected, obtained, rel_tol=1e-12)
             if isinstance(expected, float) and isinstance(obtained, float)
             else expected == obtained)
    if _same:
        print(f"  ok    {label}")
        passed += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        failed += 1


STEADY = [28, 29, 30, 31, 32]      # el empleado con horario fijo
ERRATIC = [10, 20, 30, 40, 50]     # el que depende del trafico
WEIGHTS = [0.1, 0.2, 0.4, 0.2, 0.1]

print("== 1. el mismo centro para las dos distribuciones ==")
check("centro del estable = 30.0", 30.0, variability.center(STEADY, WEIGHTS))
check("centro del erratico = 30.0", 30.0, variability.center(ERRATIC, WEIGHTS))

print("== 2. el apartamiento SI las distingue — forma 1 ==")
check("apartamiento del estable = 1.2", 1.2, variability.squared_gap(STEADY, WEIGHTS))
check("apartamiento del erratico = 120.0", 120.0, variability.squared_gap(ERRATIC, WEIGHTS))

print("== 3. la desviacion estandar, en las unidades originales ==")
check("apartamiento tipico del erratico ~ 10.954451150103322", 120.0 ** 0.5,
      variability.typical_gap(ERRATIC, WEIGHTS))

print("== 4. la forma 2 da lo mismo, en una sola pasada ==")
check("una pasada sobre el erratico", variability.squared_gap(ERRATIC, WEIGHTS),
      variability.squared_gap_in_one_pass(ERRATIC, WEIGHTS))
check("una pasada sobre el estable", variability.squared_gap(STEADY, WEIGHTS),
      variability.squared_gap_in_one_pass(STEADY, WEIGHTS))

print("== 5. pesos que no suman 1: REHUSA, no publica cifra ==")
_invalid = [0.1, 0.2, 0.4, 0.2, 0.2]   # suman 1.1
_raised = "ninguna"
try:
    variability.squared_gap(ERRATIC, _invalid)
except variability.NotADistribution:
    _raised = "NotADistribution"
except Exception as error:  # noqa: BLE001 — el tipo es el sujeto del caso
    _raised = type(error).__name__
check("NotADistribution", "NotADistribution", _raised)

print("== 6. un peso por valor, o tampoco hay distribucion ==")
_raised = "ninguna"
try:
    variability.center([1, 2], [0.5, 0.3, 0.2])
except variability.NotADistribution:
    _raised = "NotADistribution"
except Exception as error:  # noqa: BLE001
    _raised = type(error).__name__
check("NotADistribution", "NotADistribution", _raised)

print("== 7. una MUESTRA no es una distribucion: se declara al convertirla ==")
_values, _weights = variability.weigh_observations([10, 20, 30, 40, 50])
check("cinco pesos de 1/5", [0.2] * 5, _weights)
check("la media muestral es la esperanza empirica", 30.0,
      variability.center(_values, _weights))

print(f"\n{passed} ok, {failed} fallos")
raise SystemExit(1 if failed else 0)
