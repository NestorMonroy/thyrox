#!/usr/bin/env python3
"""Control de ``src/measurement/trend.py``.

Lo que tiene que poder fallar:

* **el logaritmo de un valor no positivo**. El ajuste exponencial regresa
  ``log y`` sobre ``x``; con un cero o un negativo en la serie, descartarlo
  en silencio cambia la poblacion y el ajuste describe otra serie. Rehusar
  es la conducta; descartar callado es el defecto.
* **comparar dos ajustes en escalas distintas**. El R2 de la regresion
  sobre ``log y`` NO es comparable con el de la regresion sobre ``y``: son
  respuestas distintas, y el del log casi siempre sale mas alto. Elegir por
  esa comparacion es un cociente con un operando sin auditar. La comparacion
  honesta vuelve a la escala original.
* **la serie plana**. Pendiente cero es un resultado, no un fallo.
"""
from __future__ import annotations

import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/measurement"))
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
    # --- una recta exacta se recupera exacta
    recta = series.level([(i * DAY, 3.0 + 2.0 * i) for i in range(6)], label="recta")
    f = trend.fit_linear(recta)
    check("recupera la pendiente por dia", abs(f.slope_per_day - 2.0) < 1e-9,
          str(f.slope_per_day))
    check("recupera la ordenada", abs(f.intercept - 3.0) < 1e-9, str(f.intercept))
    check("R2 de un ajuste exacto es 1", abs(f.r_squared - 1.0) < 1e-12,
          str(f.r_squared))
    check("declara su forma", f.shape is trend.Shape.LINEAR, str(f.shape))
    check("entrega el ajustado, que es la entrada de los residuos",
          len(f.predicted) == recta.count)

    # --- plana: pendiente cero es resultado, no fallo
    plana = series.level([(i * DAY, 7.0) for i in range(5)])
    fp = trend.fit_linear(plana)
    check("una serie plana da pendiente cero sin romper",
          abs(fp.slope_per_day) < 1e-12, str(fp.slope_per_day))
    check("y su R2 se declara cero, no nan",
          fp.r_squared == 0.0, str(fp.r_squared))

    # --- exponencial exacta
    expo = series.level([(i * DAY, 2.0 * math.exp(0.5 * i)) for i in range(6)])
    fe = trend.fit_exponential(expo)
    check("recupera la tasa de crecimiento por dia",
          abs(fe.growth_per_day - 0.5) < 1e-9, str(fe.growth_per_day))
    check("declara forma exponencial", fe.shape is trend.Shape.EXPONENTIAL)
    check("su R2 se mide en la escala ORIGINAL, y es ~1 aqui",
          abs(fe.r_squared - 1.0) < 1e-9, str(fe.r_squared))

    # --- MITAD DE JUICIO 1: no se toma log de un valor no positivo
    con_cero = series.level([(0.0, 1.0), (DAY, 0.0), (2 * DAY, 4.0)])
    try:
        trend.fit_exponential(con_cero)
    except trend.CannotFit as e:
        check("rehusa el exponencial con un valor no positivo",
              "positiv" in str(e).lower(), str(e))
    else:
        check("rehusa el exponencial con un valor no positivo", False,
              "ajusto descartando el punto en silencio")

    # --- MITAD DE JUICIO 2: elegir compara en la escala original
    # Serie exponencial con ruido: el R2 del log-ajuste supera al del lineal
    # EN SU PROPIA escala, y eso no autoriza a elegirlo.
    ruidosa = series.level([(i * DAY, 2.0 * math.exp(0.4 * i) + (1 if i % 2 else -1))
                            for i in range(9)])
    elegido = trend.better_fit(ruidosa)
    check("sobre una exponencial ruidosa elige el exponencial",
          elegido.shape is trend.Shape.EXPONENTIAL, str(elegido.shape))
    check("y su R2 comparado es el de la escala original (<= 1)",
          0.0 <= elegido.r_squared <= 1.0, str(elegido.r_squared))

    # EL caso que separa los dos criterios, y el unico que puede fallar:
    # una exponencial cuyo punto MAYOR se desvia por factor. En log ese
    # residuo es moderado (R2_log = 0.984); en la escala original domina la
    # suma (R2_orig = 0.758) y la recta lo gana (0.835). Comparar en log
    # elige exponencial; comparar honesto elige recta.
    cola_caida = [(i * DAY, 2.0 * math.exp(0.6 * i)) for i in range(9)]
    cola_caida[-1] = (cola_caida[-1][0], cola_caida[-1][1] * 0.5)
    torcida = series.level(cola_caida, label="exponencial con la cola caida")
    veredicto = trend.better_fit(torcida)
    check("con el punto mayor desviado elige la RECTA, no el exponencial",
          veredicto.shape is trend.Shape.LINEAR,
          f"{veredicto.shape} — comparar el R2 del log daria exponencial")
    check("y el R2 que publica es el de la escala original",
          abs(veredicto.r_squared - 0.8350) < 0.01, str(veredicto.r_squared))
    check("el exponencial ajusta PEOR en escala original aunque el log diga 0.98",
          trend.fit_exponential(torcida).r_squared < veredicto.r_squared,
          f"{trend.fit_exponential(torcida).r_squared} vs {veredicto.r_squared}")

    lineal_ruidosa = series.level([(i * DAY, 5.0 + 3.0 * i + (0.5 if i % 2 else -0.5))
                                   for i in range(9)])
    check("sobre una lineal ruidosa elige la recta",
          trend.better_fit(lineal_ruidosa).shape is trend.Shape.LINEAR)
    check("y si el exponencial no se puede ajustar, elige la recta sin romper",
          trend.better_fit(con_cero).shape is trend.Shape.LINEAR)

    # --- control positivo REAL: la historia del store de agentes
    store = ROOT / "agent-results/agent_store.sqlite3"
    if store.exists():
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
                ["git", "cat-file", "-s",
                 f"{h}:agent-results/agent_store.sqlite3"],
                cwd=ROOT, capture_output=True, text=True)
            if size.returncode == 0:
                pts.append((float(ts), float(size.stdout.strip())))
        real = series.level(pts, label="store en la historia")
        fr = trend.fit_linear(real)
        check("el sujeto real crece: pendiente positiva",
              fr.slope_per_day > 0, f"{fr.slope_per_day} sobre n={real.count}")
        check("y su R2 esta en [0,1]", 0.0 <= fr.r_squared <= 1.0,
              str(fr.r_squared))
    else:
        check("control positivo del arbol", False, "no hay store que medir")

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: trend.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
