#!/usr/bin/env python3
"""Cierra el DESCONOCIDO de H-THYROX-145 ejecutando el brief verbatim.

El hallazgo declaro que las frecuencias que el brief publica —``[0.0996 0.1002
0.4007 0.3002 0.0994]`` con ``np.random.seed(21)``— no se reproducen con el
generador de la biblioteca estandar, y dejo por escrito su condicion de cierre:
*«un entorno con numpy donde se pueda ejecutar el brief verbatim»*. Este control
es esa condicion.

Por que hacen falta DOS casos y no uno
--------------------------------------
Reproducir el brief prueba que el COMPUESTO —generador, orden de muestreo y
forma del residuo— reproduce. No aisla cual de los tres lo causa. El caso 2
resuelve esa pregunta pasandole a NUESTRO muestreador el flujo uniforme de
numpy: si con el mismo flujo da los mismos digitos, el mecanismo es identico y
lo unico que difiere es el flujo.

Sin el caso 2, la conclusion «la diferencia es el generador» seria el
sub-patron C — medir el compuesto y concluir sobre una de sus partes.

La precondicion se declara, no se asume
----------------------------------------
``numpy`` NO es dependencia de producto: ``src/**/*.py`` no lo importa en
ningun sitio, medido por AST. Vive en el grupo ``verify`` de ``pyproject.toml``
y NO en ``default-groups``, asi que un ``uv sync`` corriente no lo trae. Cuando
falta, este control REHUSA con exit 2 y sin publicar conteo: un verde aqui no
distinguiria «el brief reproduce» de «no habia con que medirlo».

    uv sync --group verify
    PYTHONPATH=src .venv/bin/python tests/measurement/test_rejection_sampling_brief.py

Metrica: frecuencia empirica de 300000 extracciones, redondeada a cuatro
decimales, contra el vector que el brief publica.
Ciega a: si OTRA version de numpy da los mismos digitos. El flujo de MT19937
bajo ``np.random.seed`` es estable entre versiones por contrato de
``RandomState``, pero eso es una promesa leida, no una medicion nuestra: aqui
se mide la version instalada y su numero se publica junto al veredicto.
"""

import sys

#: NO hay aritmetica de ruta: la raiz la declara `tests/run.sh` con
#: `export PYTHONPATH="$PWD/src"`, la misma forma que `bin/` ya ejercia. El
#: `sys.path.insert(0, ... parent.parent.parent)` es la deuda de
#: TASK-THYROX-0018 y este archivo nace sin ella.
try:
    import numpy
except ModuleNotFoundError:
    print(
        "test_rejection_sampling_brief: falta `numpy`, que vive en el grupo\n"
        "                               `verify` de pyproject.toml.\n"
        "                               Instalalo con `uv sync --group verify`.\n"
        "                               NO se emite conteo: un cero aqui seria\n"
        "                               un verde falso.",
        file=sys.stderr,
    )
    raise SystemExit(2)

from measurement.rejection_sampling import sample  # noqa: E402

DRAFT = [0.35, 0.30, 0.15, 0.10, 0.10]
TARGET = [0.10, 0.10, 0.40, 0.30, 0.10]
SAMPLES = 300_000
SEED = 21
OUTCOMES = len(DRAFT)

#: El vector que el brief publica. Es evidencia fechada de un episodio —lo que
#: aquel codigo imprimio— asi que se transcribe verbatim y no se deriva.
BRIEF_FREQUENCIES = [0.0996, 0.1002, 0.4007, 0.3002, 0.0994]

passed = 0
failed = 0


def check(label, actual, expected):
    global passed, failed
    if actual == expected:
        passed += 1
        print(f"  ok    {label}")
    else:
        failed += 1
        print(f"  FALLO {label}: esperaba {expected}, dio {actual}")


def empirical(counts):
    """Frecuencia redondeada a los cuatro decimales que el brief publica."""
    return [round(int(c) / SAMPLES, 4) for c in counts]


def brief_verbatim():
    """La forma canonica del brief: `choice` + `rand`, residuo ansioso."""
    draft = numpy.array(DRAFT)
    target = numpy.array(TARGET)
    numpy.random.seed(SEED)
    residual = numpy.maximum(0.0, target - draft)
    residual = residual / residual.sum()
    drawn = numpy.empty(SAMPLES, dtype=int)
    for index in range(SAMPLES):
        proposed = numpy.random.choice(OUTCOMES, p=draft)
        if numpy.random.rand() < min(1.0, target[proposed] / draft[proposed]):
            drawn[index] = proposed
        else:
            drawn[index] = numpy.random.choice(OUTCOMES, p=residual)
    return numpy.bincount(drawn, minlength=OUTCOMES)


class NumpyUniformSource:
    """Expone ``.random()`` sobre el flujo uniforme de numpy.

    Es el instrumento que AISLA la causa: nuestro muestreador no sabe de donde
    sale su uniforme, asi que cambiarle la fuente deja el mecanismo intacto y
    cambia solo el flujo.
    """

    @staticmethod
    def random():
        return float(numpy.random.rand())


def ours_on_numpy_stream():
    numpy.random.seed(SEED)
    counts = [0] * OUTCOMES
    for _ in range(SAMPLES):
        counts[sample(DRAFT, TARGET, rng=NumpyUniformSource)] += 1
    return counts


print(f"numpy {numpy.__version__} · n = {SAMPLES} · seed = {SEED}")

# Caso 1 — el brief reproduce verbatim. Es la condicion de cierre que
# H-THYROX-145 escribio, y su veredicto cierra el DESCONOCIDO en un sentido o
# en el otro: si NO reprodujera, la causa no seria el generador.
check("el brief reproduce sus digitos con numpy", empirical(brief_verbatim()), BRIEF_FREQUENCIES)

# Caso 2 — EL QUE DISCRIMINA. Nuestro muestreador, con el flujo de numpy, da
# los mismos digitos. Si fallara, la diferencia estaria en el mecanismo —el
# residuo perezoso o la acumulacion lineal— y no en el generador.
check(
    "nuestro muestreador con el flujo de numpy da los mismos digitos",
    empirical(ours_on_numpy_stream()),
    BRIEF_FREQUENCIES,
)

print(f"\n{passed + failed} casos: {passed} ok, {failed} fallos")
raise SystemExit(1 if failed else 0)
