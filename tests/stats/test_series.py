#!/usr/bin/env python3
"""Control de ``src/stats/series.py``.

La capa que faltaba: cinco de las siete series censadas en
:ref:`h-thyrox-19` son **procesos de llegada** —solo sellos de tiempo— y
ninguno de los tres instrumentos corre sobre eso. Hay que agregarlos por
ventana primero, y esa conversion es el sujeto de este modulo.

Lo que tiene que poder fallar:

* **la ventana vacia**. Agregar contando las claves observadas parece
  correcto y borra en silencio los dias sin llegadas: una serie irregular
  sale densa, y toda pendiente calculada sobre ella esta sesgada. Es el
  caso discriminante de este modulo.
* **la serie de menos de dos puntos**. Un solo punto no tiene pendiente ni
  autocorrelacion; emitir una cifra ahi seria el verde que no distingue.
* **el orden**. Los sellos llegan como vengan; una serie desordenada
  produce residuos falsos sin que nada lo delate.
"""
from __future__ import annotations

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/stats"))
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
    # --- una serie de nivel se conserva tal cual, ordenada
    s = series.level([(3.0, 30.0), (1.0, 10.0), (2.0, 20.0)], label="nivel")
    check("la serie de nivel ordena por tiempo",
          [t for t, _ in s.points] == [1.0, 2.0, 3.0], str(s.points))
    check("conserva los valores", [y for _, y in s.points] == [10.0, 20.0, 30.0])
    check("declara su tipo", s.kind is series.Kind.LEVEL, str(s.kind))
    check("n y ventana salen de los puntos",
          s.count == 3 and s.span_seconds == 2.0, f"{s.count} {s.span_seconds}")

    # --- LA MITAD DE JUICIO 1: la ventana vacia cuenta como cero
    # Dos llegadas el dia 0, ninguna el dia 1, una el dia 2.
    stamps = [0.0, 100.0, 2 * DAY + 5]
    a = series.bin_arrivals(stamps, window_seconds=DAY, label="llegadas")
    check("agregar una llegada da una serie de NIVEL",
          a.kind is series.Kind.LEVEL, str(a.kind))
    check("el dia sin llegadas aparece como cero, no se omite",
          [y for _, y in a.points] == [2.0, 0.0, 1.0],
          f"{[y for _, y in a.points]} — contar claves observadas daria [2,1]")
    check("la ventana vacia no desplaza el tiempo de las demas",
          [t for t, _ in a.points] == [0.0, DAY, 2 * DAY],
          str([t for t, _ in a.points]))

    # --- el caso que hace visible el sesgo: sin el cero, la media miente
    con_cero = sum(y for _, y in a.points) / len(a.points)
    sin_cero = sum(y for _, y in a.points if y) / len([1 for _, y in a.points if y])
    check("el cero cambia la media (1.0 contra 1.5)",
          abs(con_cero - 1.0) < 1e-9 and abs(sin_cero - 1.5) < 1e-9,
          f"{con_cero} {sin_cero}")

    # --- LA MITAD DE JUICIO 2: rehusar sin emitir cifra
    for bad, why in [([], "vacia"), ([(1.0, 1.0)], "un solo punto")]:
        try:
            series.level(bad, label="mala")
        except series.NotASeries as e:
            check(f"rehusa una serie {why}", "punto" in str(e).lower(), str(e))
        else:
            check(f"rehusa una serie {why}", False, "no levanto NotASeries")

    check("la ventana tiene que ser positiva",
          _raises(lambda: series.bin_arrivals([0.0, 1.0], window_seconds=0)))

    # --- residuos: la entrada del segundo instrumento
    r = series.residuals(series.level([(0.0, 1.0), (1.0, 2.0), (2.0, 9.0)]),
                         fitted=[1.0, 2.0, 3.0])
    check("los residuos son observado menos ajustado",
          r == [0.0, 0.0, 6.0], str(r))
    check("residuos con largo distinto rehusan",
          _raises(lambda: series.residuals(
              series.level([(0.0, 1.0), (1.0, 2.0)]), fitted=[1.0])))

    # --- control positivo REAL del arbol, no fabricado: el store de agentes
    store = ROOT / "agent-results/agent_store.sqlite3"
    if store.exists():
        import sqlite3
        import datetime
        c = sqlite3.connect(store)
        raw = [r[0] for r in c.execute(
            "select created_at from tasks where created_at is not null")]
        parse = lambda s: datetime.datetime.fromisoformat(
            s.replace("Z", "+00:00")).timestamp()
        real = series.bin_arrivals([parse(x) for x in raw], window_seconds=DAY,
                                   label="tasks.created_at")
        check("el proceso de llegada real se agrega a nivel",
              real.kind is series.Kind.LEVEL and real.count > 1, str(real.count))
        check("la suma de los conteos es el total de llegadas",
              sum(y for _, y in real.points) == len(raw),
              f"{sum(y for _, y in real.points)} != {len(raw)}")
        check("y aparecen dias en cero (el arbol no trabaja todos los dias)",
              any(y == 0 for _, y in real.points),
              "si no hay ninguno, el caso vacio no esta ejercitado por lo real")
    else:
        check("control positivo del arbol", False, "no hay store que medir")

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: series.py)")
    return 1 if failed else 0


def _raises(fn) -> bool:
    try:
        fn()
    except series.NotASeries:
        return True
    except Exception:
        return False
    return False


if __name__ == "__main__":
    raise SystemExit(main())
