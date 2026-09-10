"""Pruebas de ``transcript.cache_probe`` — ¿el servidor acertó el prefijo?

El material de estos casos es REAL, no fabricado
--------------------------------------------------

Los cinco turnos del caso 6 son los del transcript de esta sesión, medidos
el 2026-09-10T02:53:52 y copiados verbatim con sus ``message.id``
abreviados. Se usan como **control positivo del repo** —no un incumplidor
inventado por quien escribió el patrón— por la misma razón que
``hallazgo-abierto-genera-sucesor.md`` lo exige para un gate: un caso
fabricado hereda el encuadre del autor y confirma el instrumento en vez de
probarlo.

Los mismos cinco turnos aparecen **dos veces cada uno** en el archivo real,
que es el fragmento de streaming. Esa duplicación es el insumo del caso 11.

Qué DISCRIMINA esta suite
---------------------------

- El caso 7 tiene que ver un enlace ROTO con su ``delta`` exacto. Sin él, una
  implementación que devolviera ``matched=True`` siempre pasaría todo lo demás.
- El caso 8 tiene que ver la REHÚSA ante cero enlaces. Sin él, un tramo vacío
  publicaría «0 incumplimientos», que es el verde que no distingue «el
  prefijo se reconoció» de «no había nada que medir» — sub-patrón D.

La anulación (11)
-------------------

Retira la deduplicación por ``message.id`` y vuelve a medir los MISMOS cinco
turnos duplicados. Tienen que aparecer incumplimientos falsos —uno por cada
fragmento repetido— y el conteo con dedupe tiene que seguir en cero. Si la
anulación no cambiara nada, la dedupe no estaría haciendo el trabajo que su
docstring declara.
"""
import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from transcript.cache_probe import (NoLinksError, Turn, links, main, probe,
                                    select, turns)

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")


def assistant(message_id, timestamp, read, write, *, uuid="", parent=None,
              output=255) -> dict:
    """Una línea ``assistant`` con su uso, en la forma que el JSONL declara."""
    return {"type": "assistant", "uuid": uuid or message_id,
            "parentUuid": parent, "timestamp": timestamp,
            "message": {"role": "assistant", "id": message_id,
                        "usage": {"input_tokens": 2,
                                  "cache_creation_input_tokens": write,
                                  "cache_read_input_tokens": read,
                                  "output_tokens": output}}}


#: Los cinco turnos reales, con su encadenamiento. Cada uno aparece dos veces
#: en el archivo original (streaming); aquí se declara la serie una vez y el
#: caso 11 la duplica para ejercitar la anulación.
REAL_TURNS = [("tDwuKB3W", "2026-09-10T02:50:40.982Z", 35365, 375840),
              ("hwf2UdAt", "2026-09-10T02:50:44.168Z", 411205, 2216),
              ("UTrQoMgN", "2026-09-10T02:50:48.492Z", 413421, 1816),
              ("drnghppw", "2026-09-10T02:51:07.662Z", 415237, 882),
              ("CaANMEA5", "2026-09-10T02:51:27.946Z", 416119, 1236)]


def real_series(duplicate: bool = False) -> list[dict]:
    """La serie real como líneas de JSONL; ``duplicate`` repite cada turno."""
    out, previous = [], None
    for message_id, timestamp, read, write in REAL_TURNS:
        for repetition in range(2 if duplicate else 1):
            out.append(assistant(message_id, timestamp, read, write,
                                 uuid=f"{message_id}-{repetition}",
                                 parent=previous))
            previous = f"{message_id}-{repetition}"
    return out


print("== 1. turns — extrae los cuatro componentes y la marca de tiempo ==")
series = turns([assistant("m1", "2026-09-10T00:00:00Z", 100, 10)])
check("un turno", 1, len(series))
check("cache_read", 100, series[0].cache_read)
check("cache_creation", 10, series[0].cache_creation)
check("timestamp", "2026-09-10T00:00:00Z", series[0].timestamp)

print("== 2. turns — deduplica por message.id ==")
repeated = [assistant("m1", "t", 100, 10, uuid="a"),
            assistant("m1", "t", 100, 10, uuid="b"),
            assistant("m1", "t", 100, 10, uuid="c")]
check("tres fragmentos cuentan UN turno", 1, len(turns(repeated)))

print("== 3. turns — un turno SIN id no se deduplica, se cuenta igual ==")
without_id = [assistant(None, "t", 100, 10, uuid="a"),
              assistant(None, "t", 100, 10, uuid="b")]
check("los dos cuentan", 2, len(turns(without_id)))

print("== 4. turns — lo que no es assistant con usage no entra en la serie ==")
check("un user no aporta", 0, len(turns([{"type": "user"}])))
check("un assistant sin usage tampoco", 0,
      len(turns([{"type": "assistant", "message": {"role": "assistant"}}])))

print("== 5. links — n turnos dan n-1 enlaces; menos de dos dan cero ==")
series = turns(real_series())
check("cinco turnos", 5, len(series))
check("cuatro enlaces", 4, len(links(series)))
check("un turno solo no tiene enlace", [], links(series[:1]))
check("cero turnos tampoco", [], links([]))

print("== 6. LA INVARIANTE sobre los cinco turnos REALES: 4 de 4 ==")
measured = links(turns(real_series()))
check("todos reconocidos", [True, True, True, True],
      [link.matched for link in measured])
check("el primer esperado es read+write del anterior", 35365 + 375840,
      measured[0].expected)
check("y coincide con el read observado", 411205, measured[0].observed)
check("delta cero en todos", [0, 0, 0, 0], [link.delta for link in measured])

print("== 7. DISCRIMINA: un enlace ROTO se ve, con su delta exacto ==")
broken_series = turns([assistant("m1", "t1", 1000, 100),
                       assistant("m2", "t2", 900, 50, parent="m1")])
link = links(broken_series)[0]
check("no reconocido", False, link.matched)
check("esperado", 1100, link.expected)
check("observado", 900, link.observed)
check("delta negativo: no se reconoció ese tramo", -200, link.delta)

print("== 8. DISCRIMINA: cero enlaces REHÚSA, no publica «0 incumplimientos» ==")
with tempfile.TemporaryDirectory() as tmp:
    single = Path(tmp) / "one.jsonl"
    single.write_text(json.dumps(assistant("m1", "t", 100, 10)) + "\n",
                      encoding="utf-8")
    refusal = ""
    try:
        probe(single)
    except NoLinksError as failure:
        refusal = str(failure)
    check("rehúsa con NoLinksError", True, bool(refusal))
    check("y el motivo nombra el riesgo del cero", True,
          "no había nada que medir" in refusal)

    print("== 9. probe sobre un hilo real de disco: 4 de 4 ==")
    full = Path(tmp) / "thread.jsonl"
    full.write_text("\n".join(json.dumps(line) for line in real_series(True))
                    + "\n", encoding="utf-8")
    check("cuatro enlaces desde el archivo (con fragmentos duplicados)", 4,
          len(probe(full)))
    check("los cuatro reconocidos", True,
          all(link.matched for link in probe(full)))

    print("== 10. main — códigos de salida 0 / 1 / 2 ==")
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exit_all_matched = main(["--transcript", str(full)])
    check("0 cuando todos reconocen", 0, exit_all_matched)
    check("publica el denominador", True, "de 4 enlaces" in output.getvalue())

    broken_path = Path(tmp) / "broken.jsonl"
    broken_path.write_text("\n".join(json.dumps(line) for line in
                                     [assistant("m1", "t1", 1000, 100, uuid="a"),
                                      assistant("m2", "t2", 900, 50, uuid="b",
                                                parent="a")]) + "\n",
                           encoding="utf-8")
    with contextlib.redirect_stdout(io.StringIO()):
        exit_broken = main(["--transcript", str(broken_path)])
    check("1 cuando hay un enlace roto", 1, exit_broken)

    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exit_refusal = main(["--transcript", str(single)])
    check("2 cuando rehúsa", 2, exit_refusal)
    check("y NO publica ningún conteo de enlaces", False,
          "enlaces con el prefijo" in output.getvalue())

print("== 11. ANULACIÓN: sin la dedupe, los fragmentos fabrican falsos rotos ==")


def turns_without_dedupe(lines) -> list[Turn]:
    """La versión ANULADA: la misma extracción, sin el guard de message.id."""
    from transcript.usage import usage_of
    out = []
    for line in lines:
        usage = usage_of(line)
        if usage is None:
            continue
        out.append(Turn(message_id=(line.get("message") or {}).get("id"),
                        timestamp=str(line.get("timestamp") or ""), **usage))
    return out


duplicated = real_series(True)
with_dedupe = [link.matched for link in links(turns(duplicated))]
without_dedupe = [link.matched
                  for link in links(turns_without_dedupe(duplicated))]
check("con dedupe: 4 enlaces, 0 rotos", (4, 0),
      (len(with_dedupe), with_dedupe.count(False)))
check("sin dedupe: 9 enlaces, 5 rotos falsos", (9, 5),
      (len(without_dedupe), without_dedupe.count(False)))
check("la anulación SÍ cambia el veredicto", True,
      with_dedupe != without_dedupe)

print("== 12. select — el tramo centrado; sin --around devuelve la serie ==")
series = turns(real_series())
check("sin around, la serie entera", 5, len(select(series)))
check("around con span 1 da tres turnos", 3,
      len(select(series, around="2026-09-10T02:50:48.492Z", span=1)))
check("y el del centro es el pedido", "UTrQoMgN",
      select(series, around="2026-09-10T02:50:48.492Z", span=1)[1].message_id)
check("span 0 da un turno solo — que NO tiene enlace", 1,
      len(select(series, around="2026-09-10T02:50:48.492Z", span=0)))
check("sobre una serie vacía no falla", [], select([], around="t", span=2))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
