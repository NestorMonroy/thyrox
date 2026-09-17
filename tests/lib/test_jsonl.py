"""Prueba del mecanismo JSONL compartido.

El caso que carga el peso es el de DOS registros: con uno solo, `json.load`
sobre el archivo entero tambien pasa, asi que una suite de n=1 no distingue un
lector de lineas de uno de documento (sub-patron D).
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from lib.jsonl import (  # noqa: E402
    MalformedRecordError, dump_records, read_records, write_records,
)

OK = 0
FAILED = 0


def check(description: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok   {description}")
    else:
        FAILED += 1
        print(f"  FAIL {description}\n       esperaba {expected!r}, obtuvo {obtained!r}")


def test_two_records_are_two_lines() -> None:
    """El control que discrimina: DOS registros, y json.load tiene que fallar."""
    text = dump_records([{"id": "1"}, {"id": "2"}])
    check("dos registros dan dos lineas", 2, len(text.strip().splitlines()))
    try:
        json.loads(text)
        whole_document_parses = True
    except json.JSONDecodeError:
        whole_document_parses = False
    check("json.load sobre los dos NO parsea: no es documento unico",
          False, whole_document_parses)


def test_one_record_does_not_discriminate() -> None:
    """Declarado, no omitido: con n=1 el formato es ambiguo.

    Un JSONL de una linea ES un JSON valido. Este caso no prueba el mecanismo
    — prueba que el caso anterior era el necesario.
    """
    text = dump_records([{"id": "1"}])
    check("un solo registro TAMBIEN parsea como documento",
          {"id": "1"}, json.loads(text))


def test_round_trip_preserves_records() -> None:
    records = [{"task_id": "101", "verdict": "firme"},
               {"task_id": "114", "verdict": "re-encuadrar"}]
    with tempfile.TemporaryDirectory() as home:
        path = Path(home) / "baseline.jsonl"
        written = write_records(path, records)
        check("write_records devuelve su denominador", 2, written)
        check("ida y vuelta conserva los registros", records, read_records(path))


def test_blank_lines_are_skipped() -> None:
    with tempfile.TemporaryDirectory() as home:
        path = Path(home) / "con-blancos.jsonl"
        path.write_text('{"a": 1}\n\n{"a": 2}\n\n')
        check("las lineas en blanco no son registros",
              [{"a": 1}, {"a": 2}], read_records(path))


def test_malformed_line_names_its_number() -> None:
    """Un JSONDecodeError pelado da el desplazamiento, no cual de las lineas."""
    with tempfile.TemporaryDirectory() as home:
        path = Path(home) / "roto.jsonl"
        path.write_text('{"a": 1}\n{"a": 2\n{"a": 3}\n')
        try:
            read_records(path)
            message = "no reventó"
        except MalformedRecordError as error:
            message = str(error)
        check("el error nombra la linea rota", True, "linea 2" in message)


def test_key_order_is_stable() -> None:
    """Sin sort_keys el diff mide el orden del dict, no el cambio."""
    check("las claves salen ordenadas",
          dump_records([{"b": 1, "a": 2}]), dump_records([{"a": 2, "b": 1}]))


if __name__ == "__main__":
    for name, case in sorted(globals().items()):
        if name.startswith("test_") and callable(case):
            print(name)
            case()
    total = OK + FAILED
    print(f"\n{OK} ok, {FAILED} fallo(s)  (alcance medido: {total} asercion(es))")
    sys.exit(1 if FAILED else 0)
