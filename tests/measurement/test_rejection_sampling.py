#!/usr/bin/env python3
"""Control de ``src/measurement/rejection_sampling.py``.

Lo que tiene que poder fallar:

* **la regla de aceptacion corrige el sesgo del borrador**. Es LA mitad. Con
  ``aceptar siempre`` el muestreador sigue devolviendo indices validos y
  sigue pareciendo sano: lo que cambia es la DISTRIBUCION, y solo se ve
  midiendo frecuencias. El control positivo es el indice 0, donde ``p`` y
  ``q`` difieren en 0.25 — veinte veces la tolerancia.
* **el residuo se normaliza sobre ``max(0, q - p)``, no sobre ``q - p``**.
  Sin el ``max`` la masa negativa entra al reparto y el resultado deja de ser
  ``q``; sin normalizar, ``choices`` reparte con pesos que no suman 1 y el
  sesgo reaparece por otra via.
* **el residuo es PEREZOSO**. Cuando ``p == q`` la suma de
  ``max(0, q - p)`` vale **exactamente 0**, asi que una normalizacion ansiosa
  divide por cero al CONSTRUIR — con la aceptacion en 1 y el residuo que
  nunca se consulta. El caso limite no es decorativo: es el unico que
  distingue «se calcula cuando hace falta» de «se calcula siempre».
* **todo indice re-muestreado satisface ``q[i] > p[i]``**. Es estructural y
  barato, e independiente de la convergencia: un residuo mal construido falla
  aqui aunque las frecuencias salieran por casualidad dentro de tolerancia.

Lo que este control NO mide, declarado
---------------------------------------

Las frecuencias empiricas que el brief publica —``[0.0996 0.1002 0.4007
0.3002 0.0994]`` con ``np.random.seed(21)``— **no se reproducen aqui**, y no
por descuido: numpy no esta instalado en este arbol y el modulo es stdlib
pura, como su hermano ``normalizer_magnitude``. Esos digitos son un artefacto
del MT19937 de numpy y del orden de muestreo de ``np.random.choice``; la
invariante que el brief establece de verdad es **empirico converge a
``q_target``**, y es esa la que se mide.

La tolerancia se DERIVA de ``n``, no se copia del brief: el error estandar de
una frecuencia es ``sqrt(q (1 - q) / n)``, que para ``q = 0.4`` y
``n = 300000`` vale ~0.00089. Se admite ``5`` errores estandar. Fijar los
digitos del brief como valor esperado seria fabricar un control.
"""
from __future__ import annotations

import math
import random
import subprocess
import sys

from measurement import rejection_sampling as rs
from paths import reach

ROOT = reach.thyrox_root()

#: El sujeto como ARCHIVO — el ultimo caso lo ejecuta bajo el tracer.
SUBJECT = ROOT / "src" / "measurement" / "rejection_sampling.py"

passed = failed = 0

#: Las dos distribuciones del brief, verbatim: son la evidencia fechada
#: contra la que se verifico el porte.
DRAFT = [0.35, 0.30, 0.15, 0.10, 0.10]
TARGET = [0.10, 0.10, 0.40, 0.30, 0.10]

SAMPLES = 300_000
#: Cinco errores estandar de la frecuencia mas dispersa (q = 0.4).
TOLERANCE = 5 * math.sqrt(0.4 * 0.6 / SAMPLES)


def check(label, expected, obtained):
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {label}")
    else:
        failed += 1
        print(f"  FALLA {label}")
        print(f"        esperado=[{expected}] obtenido=[{obtained}]")


def frequencies(samples, size):
    counts = [0] * size
    for index in samples:
        counts[index] += 1
    return [count / len(samples) for count in counts]


print("== 1. la aceptacion es min(1, q/p), y se publica por indice ==")
accept = rs.acceptance_probabilities(DRAFT, TARGET)
check("el indice donde q < p acepta con el cociente", True,
      abs(accept[0] - 0.10 / 0.35) < 1e-12)
check("el indice donde q > p acepta siempre", 1.0, accept[2])
check("y ninguna probabilidad pasa de 1", True, all(a <= 1.0 for a in accept))

print()
print("== 2. el residuo vive sobre max(0, q - p) y suma 1 ==")
residual = rs.residual_distribution(DRAFT, TARGET)
check("los indices con q <= p reciben masa 0", [0.0, 0.0, 0.0],
      [residual[0], residual[1], residual[4]])
check("el residuo suma 1", True, abs(sum(residual) - 1.0) < 1e-12)
check("y reparte en proporcion al exceso", True,
      abs(residual[2] / residual[3] - 0.25 / 0.20) < 1e-12)

print()
print("== 3. el muestreador converge a q_target, no a p_draft ==")
# EL caso. Con `aceptar siempre` las frecuencias salen p_draft y el indice 0
# se va a 0.35 — 0.25 de error contra una tolerancia de 0.0045.
rng = random.Random(21)
drawn = [rs.sample(DRAFT, TARGET, rng) for _ in range(SAMPLES)]
observed = frequencies(drawn, len(TARGET))
for index, (target, got) in enumerate(zip(TARGET, observed)):
    check(f"indice {index}: {got:.4f} converge a {target}", True,
          abs(got - target) < TOLERANCE)

print()
print("== 4. todo indice RE-MUESTREADO satisface q > p ==")
# Estructural y barato: no depende de cuantas muestras se tomen. Un residuo
# mal construido falla aqui aunque las frecuencias salieran por casualidad
# dentro de tolerancia.
rng = random.Random(7)
resampled = [rs.sample(DRAFT, TARGET, rng, trace=True) for _ in range(20_000)]
rejected = [index for index, accepted in resampled if not accepted]
check("hubo rechazos que medir", True, len(rejected) > 0)
# `len(rejected) > 0` dentro de la asercion NO es redundante con la de
# arriba: `all([])` es True, asi que con cero rechazos esta pasaria por
# vacuidad — dejaria de discriminar justo bajo la anulacion escrita para
# medirla (es la leccion del `-n` en `tests/lib/test-toolchain-gawk.sh`).
check("y todos caen donde el objetivo pide mas masa", True,
      len(rejected) > 0
      and all(TARGET[index] > DRAFT[index] for index in rejected))

print()
print("== 5. el caso limite p == q: el residuo es 0/0 y NO debe calcularse ==")
# El brief no lo nombra. Con p == q la suma de max(0, q - p) vale exactamente
# 0: una normalizacion ansiosa divide por cero al construir, aunque la
# aceptacion sea 1 y el residuo nunca se consulte.
same = list(DRAFT)
check("la aceptacion es 1 en los cinco indices", [1.0] * 5,
      rs.acceptance_probabilities(same, same))
rng = random.Random(3)
# Se captura `Exception`, no `ZeroDivisionError`: la forma ansiosa puede
# morir por cualquiera de las dos —division por cero si normaliza a pelo, o
# el `ValueError` con que `residual_distribution` rehusa— y un `except`
# estrecho convertiria la anulacion en un crash de la suite en vez de en una
# asercion roja. Lo que se mide es «no levanta», no «no levanta ESA».
try:
    limit = [rs.sample(same, same, rng) for _ in range(20_000)]
    raised = None
except Exception as error:  # noqa: BLE001 — ver el comentario de arriba
    limit, raised = [], type(error).__name__
check("muestrear con p == q no levanta ninguna excepcion", None, raised)
if limit:
    limit_observed = frequencies(limit, len(same))
    for index, (expected, got) in enumerate(zip(same, limit_observed)):
        check(f"indice {index}: {got:.4f} se queda en {expected}", True,
              abs(got - expected) < 5 * math.sqrt(
                  expected * (1 - expected) / len(limit)))

print()
print("== 6. el residuo REHUSA cuando no hay masa que repartir ==")
# La otra mitad de la perezosa: si alguien lo pide explicitamente con p == q,
# la respuesta correcta no es un vector de ceros —que se leeria como una
# distribucion— sino rehusar. Un cero ahi no distingue «no hay exceso» de
# «el exceso es uniforme».
try:
    rs.residual_distribution(same, same)
    refused = False
except ValueError:
    refused = True
check("pedirlo con p == q levanta ValueError", True, refused)

print()
print("== 7. el modulo NO escribe — medido por CONDUCTA, no por docstring ==")
# El veredicto de `assert_no_writes` tiene TRES estados y los tres se
# consumen: 0 = midio y no hubo escritura · 1 = hubo · 2 = NO se pudo medir.
tracer = ROOT / "bin" / "assert_no_writes"
verdict = subprocess.run(
    ["bash", str(tracer), "--", sys.executable, str(SUBJECT)],
    capture_output=True, text=True)
if verdict.returncode == 2:
    print(f"  SIN MEDIR  el tracer rehuso: {verdict.stderr.strip().splitlines()[-1:]}")
else:
    check("el sujeto no intenta ninguna escritura", 0, verdict.returncode)
    check("y el tracer publica su alcance medido", True,
          "alcance medido" in verdict.stdout)

print()
print(f"resultado: {passed} de {passed + failed} aserciones en verde")
sys.exit(0 if failed == 0 else 1)
