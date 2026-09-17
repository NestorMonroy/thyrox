#!/usr/bin/env python3
"""Control de ``src/measurement/normalizer_magnitude.py``.

Lo que tiene que poder fallar:

* **el maximo se resta ANTES de exponenciar**. Es LA mitad: una
  implementacion ingenua —``log(sum(exp(v)))``— da el mismo resultado en
  todos los vectores pequeños y **revienta** con ``OverflowError`` en cuanto
  un logit pasa de ~710. Un control que solo usara los vectores del brief no
  podria fallar nunca, porque ninguno de los dos lo alcanza.
* **el colapso a cero es de IMPRESION, no de float64**. El brief declara que
  dos probabilidades de ``[10, 25, 5, 30]`` «colapsaron a 0.0». Medido, valen
  2.047e-09 y 1.379e-11: representables las dos. Sin este caso, el modulo
  podria devolver ceros de verdad y nadie lo notaria.
* **el underflow REAL existe, y se alcanza por otra brecha**. Es el control
  positivo del fenomeno que el brief atribuye a la brecha equivocada: con
  **746** de separacion la probabilidad si es 0.0 exacto. Sin el, «nunca hay
  underflow» pasaria igual de verde que «lo hay a los 25».
* **el piso NO es el normalizado, y la primera version de este control lo
  daba por bueno**. Dos aserciones de la seccion 4 se escribieron desde el
  brief sin medirlas y fallaron al correr el modulo: ``745`` todavia devuelve
  ``5e-324``, y ``log(FLOAT64_MIN_NORMAL)`` vale ``-708.3964185322641``, no
  el ``-708.3964517265479`` del brief — ese es el log de la constante
  **redondeada** ``2.225e-308``. Se conservan las dos correcciones con su
  medicion porque el defecto era del control, no del sujeto.
* **la penalizacion crece CUADRATICAMENTE**. Un termino lineal daria el mismo
  signo y el mismo orden; lo que lo separa es el factor entre los dos
  vectores, que tiene que ser el cuadrado del cociente de sus log Z.
* **el gradiente empuja hacia ABAJO y en proporcion a la probabilidad**. Un
  signo invertido sigue siendo un gradiente, y uno uniforme sigue reduciendo
  log Z. Lo que discrimina es que el logit que mas contribuye a Z sea el que
  mas se corrige.
"""
from __future__ import annotations

import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
import normalizer_magnitude as nm  # noqa: E402

passed = failed = 0

#: Los dos vectores del brief. Se conservan verbatim porque son la evidencia
#: fechada contra la que se verifico el porte.
NORMAL_LOGITS = [1.0, 2.0, 0.5, 3.0]
LARGE_LOGITS = [10.0, 25.0, 5.0, 30.0]


def check(label, expected, obtained):
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {label}")
    else:
        failed += 1
        print(f"  FALLA {label}")
        print(f"        esperado=[{expected}] obtenido=[{obtained}]")


def close(label, expected, obtained, tolerance=1e-4):
    check(f"{label} (~{expected})", True, abs(expected - obtained) < tolerance)


print("test_normalizer_magnitude:")
print()
print("== 1. log Z y softmax reproducen el brief ==")
close("log Z de los logits normales", 3.4608, nm.log_sum_exp(NORMAL_LOGITS))
close("log Z de los logits grandes", 30.0067, nm.log_sum_exp(LARGE_LOGITS))

probabilities = nm.softmax(NORMAL_LOGITS)
for index, expected in enumerate([0.085369, 0.232057, 0.051779, 0.630796]):
    close(f"probabilidad normal [{index}]", expected, probabilities[index], 1e-6)
close("las probabilidades suman 1", 1.0, sum(probabilities), 1e-12)

print()
print("== 2. LA MITAD: el maximo se resta antes de exponenciar ==")
# Una implementacion ingenua revienta aqui. `math.exp(1000)` es OverflowError,
# asi que este caso separa las dos implementaciones sin ambiguedad.
huge = [1000.0, 1001.0, 999.0]
close("log Z de logits de orden 1000 no desborda", 1001.4076,
      nm.log_sum_exp(huge), 1e-3)
check("y sus probabilidades siguen sumando 1", True,
      abs(sum(nm.softmax(huge)) - 1.0) < 1e-12)

print()
print("== 3. el colapso a 0.0 del brief es de IMPRESION, no de float64 ==")
large_probabilities = nm.softmax(LARGE_LOGITS)
close("P(logit=10) vale 2.047e-09, no cero", 2.047359e-09,
      large_probabilities[0], 1e-14)
close("P(logit=5) vale 1.379e-11, no cero", 1.379499e-11,
      large_probabilities[2], 1e-16)
check("NINGUNA de las cuatro es 0.0 exacto", 0,
      sum(1 for p in large_probabilities if p == 0.0))

print()
print("== 4. el underflow REAL: control positivo del fenomeno ==")
# Hay DOS pisos y el brief solo nombra uno. El normalizado es el limite de la
# representacion con mantisa completa; por debajo siguen los subnormales, y es
# ahi —no antes— donde la probabilidad se pierde de verdad.
close("el piso NORMALIZADO tiene log natural -708.3964185",
      -708.3964185322641, math.log(nm.FLOAT64_MIN_NORMAL), 1e-9)
# El brief cita -708.3964517265479, que es el log de la constante REDONDEADA
# `2.225e-308`. La diferencia es 3.32e-05: pequeña, y suficiente para que una
# tolerancia de 1e-9 la separe.
close("y el del brief es el de la constante redondeada",
      -708.3964517265479, math.log(2.225e-308), 1e-9)
# El piso normalizado NO es donde se pierde el valor: por debajo siguen los
# subnormales hasta 5e-324, 36 ordenes de magnitud mas abajo.
close("el piso SUBNORMAL tiene log natural -744.44",
      -744.4400719213812, math.log(nm.FLOAT64_MIN_SUBNORMAL), 1e-9)
check("con brecha de 746 la probabilidad SI es 0.0 exacto", True,
      nm.softmax([746.0, 0.0])[1] == 0.0)
check("con 745 TODAVIA no — devuelve el subnormal mas pequeño", False,
      nm.softmax([745.0, 0.0])[1] == 0.0)
check("y con brecha de 25 NO lo es", False,
      nm.softmax([25.0, 0.0])[1] == 0.0)

print()
print("== 5. la penalizacion crece cuadraticamente ==")
close("z_loss de los normales", 0.001198, nm.z_loss(NORMAL_LOGITS), 1e-6)
close("z_loss de los grandes", 0.090040, nm.z_loss(LARGE_LOGITS), 1e-6)
# Lo que separa cuadratico de lineal: el cociente de las penalizaciones tiene
# que ser el CUADRADO del cociente de los log Z.
ratio_of_log_z = nm.log_sum_exp(LARGE_LOGITS) / nm.log_sum_exp(NORMAL_LOGITS)
ratio_of_loss = nm.z_loss(LARGE_LOGITS) / nm.z_loss(NORMAL_LOGITS)
close("el cociente de penalizaciones es el cuadrado del de log Z",
      ratio_of_log_z ** 2, ratio_of_loss, 1e-6)

print()
print("== 6. el gradiente: signo y proporcionalidad ==")
gradient = nm.z_loss_gradient(LARGE_LOGITS)
check("el gradiente tiene un componente por logit", len(LARGE_LOGITS),
      len(gradient))
check("todos los componentes son positivos (el paso RESTA)", True,
      all(g > 0 for g in gradient))
# La proporcionalidad es lo que discrimina un gradiente uniforme: el logit que
# mas contribuye a Z tiene que ser el que mas se corrige.
check("el componente mayor corresponde al logit mayor", 3,
      gradient.index(max(gradient)))
close("grad[3]/grad[1] es P[3]/P[1]",
      large_probabilities[3] / large_probabilities[1],
      gradient[3] / gradient[1], 1e-9)

print()
print("== 7. un paso de descenso REDUCE log Z ==")
before = nm.log_sum_exp(LARGE_LOGITS)
after = nm.log_sum_exp(nm.descend(LARGE_LOGITS, learning_rate=50.0))
check("log Z baja tras el paso", True, after < before)
# El producto lr*alpha es lo unico identificable desde la traza: con 50 * 1e-4
# el primer paso reproduce el 29.7110 del brief.
close("y reproduce el primer valor de la traza", 29.7110, after, 5e-3)

print()
print(f"resultado: {passed} de {passed + failed} aserciones en verde")
sys.exit(0 if failed == 0 else 1)
