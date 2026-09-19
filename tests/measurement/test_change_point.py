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
    noise = series.level([(i * DAY, rng.gauss(100.0, 5.0)) for i in range(80)],
                         label="ruido sin cambio")
    null = cp.locate(noise)
    check("el ruido sin cambio NO declara punto de cambio",
          null.verdict is cp.Verdict.NO_EVIDENCE,
          f"conf={null.confidence:.3f} en indice {null.index}")
    check("aun asi publica el indice del maximo, para que se pueda mirar",
          0 <= null.index < noise.count, str(null.index))
    check("el veredicto se llama «sin evidencia», no «sin cambio»",
          null.verdict.value.startswith("sin evidencia"), null.verdict.value)

    # --- una serie PLANA: el caso mas extremo del nulo
    flat = series.level([(i * DAY, 50.0) for i in range(40)])
    check("una serie plana tampoco declara cambio",
          cp.locate(flat).verdict is cp.Verdict.NO_EVIDENCE)

    # --- el positivo: un escalon real, y se localiza donde esta
    cut = 30
    tier = series.level(
        [(i * DAY, (100.0 if i < cut else 140.0) + rng.gauss(0.0, 3.0))
         for i in range(70)], label="escalon en 30")
    found = cp.locate(tier)
    check("un escalon real SI se declara", found.verdict is cp.Verdict.CHANGED,
          f"conf={found.confidence:.3f}")
    check("y se localiza a menos de tres puntos del corte real",
          abs(found.index - cut) <= 3,
          f"{found.index} contra {cut}")
    check("el tiempo del cambio sale de la serie, no del indice suelto",
          found.time == tier.times[found.index],
          f"{found.time} != {tier.times[found.index]}")

    # --- reproducible: el umbral sale de permutaciones con semilla fija
    check("dos corridas sobre la misma serie dan el mismo veredicto",
          cp.locate(tier).confidence == found.confidence,
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
