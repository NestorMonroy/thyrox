#!/usr/bin/env python3
"""El centro no distingue «consistente» de «erratico». El apartamiento si.

Mitad ROJA. El caso que lo fija es el del ejecutor, y es el control positivo de
esta suite porque sus cifras estan dadas de antemano: dos empleados con el
MISMO tiempo medio de traslado y experiencias diarias opuestas.

    A = [28, 29, 30, 31, 32]   p = [.1, .2, .4, .2, .1]   ->  apartamiento^2 =   1.2
    B = [10, 20, 30, 40, 50]   p = [.1, .2, .4, .2, .1]   ->  apartamiento^2 = 120.0

Cien veces el apartamiento con el mismo centro. Por que le importa a este arbol y no
es un ejercicio: el censo del store publica promedios por modelo, y dos
modelos con el mismo promedio pueden ser uno predecible y otro no.
``metrica-decide-la-conclusion.md`` prohibe concluir sobre un fenomeno que el
instrumento no puede ver, y una media es ciega al apartamiento por construccion.

Lo que esta suite cubre, y por que cada caso existe
-----------------------------------------------------

* **el mismo centro** para las dos distribuciones. Sin este caso, el resto no
  significa nada: la gracia es que difieran teniendo el mismo centro.
* **las dos formas**, una verificando a la otra. Que coincidan no prueba que
  ambas sean correctas, pero una discrepancia probaria que alguna no lo es.

Lo que NO cubre, porque no vive aqui: decidir si hay distribucion y convertir
una muestra en una. Eso es ``distribution``, y lo mide ``test_distribution``.

*Metrica:* el valor que devuelve cada funcion sobre distribuciones declaradas.
*Ciega a:* el error de redondeo acumulado de ``E[X^2] - E[X]^2`` sobre valores
grandes y proximos entre si. No se mide aqui; por eso la forma 1 se conserva.

CONTROL DE ANULACION: sin el cuadrado en ``squared_deviation`` —midiendo el apartamiento
medio con signo— caen 5 de las 7 aserciones: las dos del caso 2, la del 3 y las
dos del 4. Sobreviven las dos del caso 1, que son de centro. La anulacion no
tumba la suite entera, y eso es lo que la hace util: nombra el subconjunto que
depende de ella.
"""
from __future__ import annotations

import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
import deviation  # noqa: E402

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
check("centro del estable = 30.0", 30.0, deviation.center(STEADY, WEIGHTS))
check("centro del erratico = 30.0", 30.0, deviation.center(ERRATIC, WEIGHTS))

print("== 2. el apartamiento SI las distingue — forma 1 ==")
check("apartamiento del estable = 1.2", 1.2, deviation.squared_deviation(STEADY, WEIGHTS))
check("apartamiento del erratico = 120.0", 120.0,
      deviation.squared_deviation(ERRATIC, WEIGHTS))

print("== 3. el apartamiento tipico, en las unidades originales ==")
check("apartamiento tipico del erratico ~ 10.954451150103322", 120.0 ** 0.5,
      deviation.typical_deviation(ERRATIC, WEIGHTS))

print("== 4. la forma 2 da lo mismo, en una sola pasada ==")
check("una pasada sobre el erratico",
      deviation.squared_deviation(ERRATIC, WEIGHTS),
      deviation.squared_deviation_in_one_pass(ERRATIC, WEIGHTS))
check("una pasada sobre el estable",
      deviation.squared_deviation(STEADY, WEIGHTS),
      deviation.squared_deviation_in_one_pass(STEADY, WEIGHTS))

print(f"\n{passed} ok, {failed} fallos")
raise SystemExit(1 if failed else 0)
