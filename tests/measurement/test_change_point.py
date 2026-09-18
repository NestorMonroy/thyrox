#!/usr/bin/env python3
"""Control de ``src/measurement/change_point.py``.

Lo que tiene que poder fallar:

* **el ruido sin cambio NO debe declarar uno**. Es LA mitad: un ``argmax``
  siempre devuelve un indice, asi que sin umbral el modulo nombra un punto
  de cambio en CUALQUIER serie — incluido el ruido blanco. Un control que
  solo le diera series con escalon no podria fallar nunca.
* **el escalon real se localiza donde esta**. Sin este caso el umbral
  podria estar tan alto que nunca declare nada, y el caso nulo seguiria
  verde.
* **el veredicto es reproducible**. El umbral sale de permutaciones; con
  la semilla fija, dos corridas dan lo mismo. Si no, el veredicto depende
  del azar de la corrida y no del dato.
"""
from __future__ import annotations

import pathlib
import random
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
import change_point as cp  # noqa: E402
import series  # noqa: E402

passed = failed = 0
DAY = 86400.0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def main() -> int:
    # --- EL CASO NULO: ruido sin cambio. Sin umbral, argmax nombra uno igual.
    rng = random.Random(20260916)
    ruido = series.level([(i * DAY, rng.gauss(100.0, 5.0)) for i in range(80)],
                         label="ruido sin cambio")
    nulo = cp.locate(ruido)
    check("el ruido sin cambio NO declara punto de cambio",
          nulo.verdict is cp.Verdict.NO_EVIDENCE,
          f"conf={nulo.confidence:.3f} en indice {nulo.index}")
    check("aun asi publica el indice del maximo, para que se pueda mirar",
          0 <= nulo.index < ruido.count, str(nulo.index))
    check("el veredicto se llama «sin evidencia», no «sin cambio»",
          nulo.verdict.value.startswith("sin evidencia"), nulo.verdict.value)

    # --- una serie PLANA: el caso mas extremo del nulo
    plana = series.level([(i * DAY, 50.0) for i in range(40)])
    check("una serie plana tampoco declara cambio",
          cp.locate(plana).verdict is cp.Verdict.NO_EVIDENCE)

    # --- el positivo: un escalon real, y se localiza donde esta
    corte = 30
    escalon = series.level(
        [(i * DAY, (100.0 if i < corte else 140.0) + rng.gauss(0.0, 3.0))
         for i in range(70)], label="escalon en 30")
    hallado = cp.locate(escalon)
    check("un escalon real SI se declara", hallado.verdict is cp.Verdict.CHANGED,
          f"conf={hallado.confidence:.3f}")
    check("y se localiza a menos de tres puntos del corte real",
          abs(hallado.index - corte) <= 3,
          f"{hallado.index} contra {corte}")
    check("el tiempo del cambio sale de la serie, no del indice suelto",
          hallado.time == escalon.times[hallado.index],
          f"{hallado.time} != {escalon.times[hallado.index]}")

    # --- reproducible: el umbral sale de permutaciones con semilla fija
    check("dos corridas sobre la misma serie dan el mismo veredicto",
          cp.locate(escalon).confidence == hallado.confidence,
          "el veredicto depende del azar de la corrida")

    # --- rehusa lo que no se puede mirar
    check("rehusa una serie demasiado corta",
          _raises(lambda: cp.locate(series.level([(0.0, 1.0), (DAY, 2.0)]))))

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: change_point.py)")
    return 1 if failed else 0


def _raises(fn) -> bool:
    try:
        fn()
    except cp.CannotLocate:
        return True
    except Exception:
        return False
    return False


if __name__ == "__main__":
    raise SystemExit(main())
