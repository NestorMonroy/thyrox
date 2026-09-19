#!/usr/bin/env python3
"""Control de ``src/measurement/residual_structure.py``.

Lo que tiene que poder fallar:

* **el ruido blanco NO se rechaza**. Es LA mitad del control: un test que
  solo recibe residuos autocorrelacionados no puede fallar — siempre dira
  «hay estructura» y nadie lo notara. El caso nulo es el que discrimina.
* **la correccion de Ljung (1979)**. El factor ``(n+2)/(n-k)`` es lo que
  separa este estadistico del Box-Pierce llano, y pesa justo donde importa:
  con n pequeño. Si retirarlo no cambia ningun veredicto, el modulo no lo
  esta usando.
* **mas rezagos que pares**. La autocorrelacion en el rezago k necesita
  ``n-k`` pares; pedir ``m >= n`` no tiene con que calcularse, y devolver
  un numero ahi seria inventarlo.
"""
from __future__ import annotations

import math
import pathlib
import random
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
import residual_structure as rs  # noqa: E402
import series  # noqa: E402
import trend  # noqa: E402

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
    # --- EL CASO NULO: ruido blanco no se rechaza.
    # Sin este caso el modulo podria decir «hay estructura» SIEMPRE y las
    # demas aserciones seguirian verdes.
    rng = random.Random(20260916)
    blank = [rng.gauss(0.0, 1.0) for _ in range(200)]
    null = rs.inspect(blank, lags=10)
    check("el ruido blanco NO se declara estructurado",
          null.verdict is rs.Verdict.NO_EVIDENCE,
          f"Q={null.statistic:.2f} critico={null.critical:.2f}")
    check("y su Q queda por debajo del critico",
          null.statistic < null.critical,
          f"{null.statistic:.2f} !< {null.critical:.2f}")
    check("el veredicto se llama «sin evidencia», no «aleatorio»",
          null.verdict.value.startswith("sin"), null.verdict.value)

    # --- el positivo: una caminata aleatoria tiene memoria por construccion
    walk, acc = [], 0.0
    for _ in range(200):
        acc += rng.gauss(0.0, 1.0)
        walk.append(acc)
    with_memory = rs.inspect(walk, lags=10)
    check("una caminata aleatoria SI se declara estructurada",
          with_memory.verdict is rs.Verdict.STRUCTURED,
          f"Q={with_memory.statistic:.2f}")
    check("su Q supera el critico por mucho",
          with_memory.statistic > 10 * with_memory.critical,
          f"{with_memory.statistic:.2f} vs {with_memory.critical:.2f}")

    # --- la autocorrelacion de rezago 1 de una alternante es ~ -1
    alternate = [(-1.0) ** i for i in range(60)]
    r = rs.inspect(alternate, lags=5)
    check("la autocorrelacion de rezago 1 de una alternante es negativa",
          r.autocorrelations[0] < -0.9, str(r.autocorrelations[0]))

    # --- LA CORRECCION DE LJUNG (1979) cambia el veredicto con n pequeño.
    # Es EL caso que la separa del Box-Pierce llano: con n grande los dos
    # coinciden y el control no podria fallar. Medido aqui: Ljung = 12.065
    # rechaza, Box-Pierce = 9.050 no, contra un critico de 9.456.
    short, x = [], 0.0
    r12 = random.Random(7)
    for _ in range(12):
        x = 0.8 * x + r12.gauss(0.0, 1.0)
        short.append(x)
    with_fix = rs.inspect(short, lags=4)
    plain = len(short) * sum(
        rs.autocorrelation(short, k) ** 2 for k in range(1, 5))
    check("con n pequeño la correccion de Ljung SI rechaza",
          with_fix.verdict is rs.Verdict.STRUCTURED,
          f"Q={with_fix.statistic:.3f} critico={with_fix.critical:.3f}")
    check("y el Box-Pierce llano sobre los MISMOS datos no rechazaria",
          plain <= with_fix.critical,
          f"llano={plain:.3f} critico={with_fix.critical:.3f}")

    # --- rehusa cuando no hay pares con que calcular.
    # La serie tiene 12 puntos —por encima del minimo— para que el rechazo
    # venga de la guarda de REZAGOS y no de la de longitud: si viniera de la
    # otra, este control pasaria con la guarda de rezagos retirada.
    for lags, why in [(0, "cero rezagos"), (12, "tantos rezagos como puntos"),
                      (20, "mas rezagos que puntos")]:
        try:
            rs.inspect(short, lags=lags)
        except rs.CannotInspect as e:
            check(f"rehusa con {why}", "rezago" in str(e).lower(), str(e))
        else:
            check(f"rehusa con {why}", False, "emitio una cifra igual")

    check("rehusa una serie de residuos demasiado corta",
          _raises(lambda: rs.inspect([1.0], lags=1)))

    # --- control positivo REAL del arbol: los residuos del ajuste lineal
    # sobre la historia del store. Medido antes de escribir esto: Q >> critico.
    import subprocess
    out = subprocess.run(
        ["git", "log", "--follow", "--format=%H %ct", "--",
         "agent-results/agent_store.sqlite3"],
        cwd=ROOT, capture_output=True, text=True).stdout.split("\n")
    pts = []
    for line in out:
        if not line.strip():
            continue
        h, ts = line.split()
        size = subprocess.run(
            ["git", "cat-file", "-s", f"{h}:agent-results/agent_store.sqlite3"],
            cwd=ROOT, capture_output=True, text=True)
        if size.returncode == 0:
            pts.append((float(ts), float(size.stdout.strip())))
    if len(pts) > 20:
        real = series.level(pts, label="store")
        fit = trend.fit_linear(real)
        residual = series.residuals(real, fit.predicted)
        read = rs.inspect(residual, lags=10)
        check("el ajuste lineal sobre el sujeto real deja estructura",
              read.verdict is rs.Verdict.STRUCTURED,
              f"Q={read.statistic:.1f}")
        check("aun con un R2 mediocre, el Q lo supera con holgura",
              read.statistic > 5 * read.critical,
              f"R2={fit.r_squared:.4f} Q={read.statistic:.1f} "
              f"critico={read.critical:.1f}")

    else:
        check("control positivo del arbol", False, f"solo {len(pts)} puntos")

    # El R2 NO determina el veredicto, y esto lo demuestra sin depender de
    # ninguna poblacion: una recta con residuos en rampa tiene R2 altisimo y
    # memoria completa; una con residuos alternantes tiene el mismo R2 y no
    # la tiene. Si el modulo leyera el R2, los dos saldrian igual.
    n = 60
    rng2 = random.Random(31415)
    ramp = series.level([(i * DAY, 100.0 + 10.0 * i + (i - n / 2) * 0.9)
                          for i in range(n)])
    noisy = series.level([(i * DAY, 100.0 + 10.0 * i + rng2.gauss(0.0, 7.0))
                            for i in range(n)])
    fr = trend.fit_linear(ramp)
    fz = trend.fit_linear(noisy)
    vr = rs.inspect(series.residuals(ramp, fr.predicted), lags=10)
    vz = rs.inspect(series.residuals(noisy, fz.predicted), lags=10)
    check("dos series con R2 casi igual dan veredictos OPUESTOS",
          vr.verdict is not vz.verdict,
          f"R2 {fr.r_squared:.4f}/{fz.r_squared:.4f} -> "
          f"{vr.verdict.value} / {vz.verdict.value}")
    check("la de residuos en rampa es la estructurada",
          vr.verdict is rs.Verdict.STRUCTURED, str(vr.statistic))
    check("y la de residuos sin memoria no lo es",
          vz.verdict is rs.Verdict.NO_EVIDENCE,
          f"Q={vz.statistic:.2f} critico={vz.critical:.2f}")

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: residual_structure.py)")
    return 1 if failed else 0


def _raises(fn) -> bool:
    try:
        fn()
    except rs.CannotInspect:
        return True
    except Exception:
        return False
    return False


if __name__ == "__main__":
    raise SystemExit(main())
