#!/usr/bin/env python3
"""Suite de ``hallazgo/hallazgo_ids.py`` — el siguiente ``H-<PREFIJO>-N`` libre.

Se escribió tras dos verificaciones manuales fallidas en la misma sesión: la
primera acotó el escaneo a una sola iniciativa (coincidió por suerte con el
número real); la segunda repitió el ``ls`` a mano sobre todo el árbol, que es
exactamente el trabajo que este módulo automatiza y que un `ls`/`grep` a mano
puede volver a acotar mal la próxima vez.

Lo que la suite mide, y por qué cada bloque existe:

1. Forma del literal. ``H-<PREFIJO>-<dígitos>``, con límite de palabra en los
   dos extremos — sin eso, ``PH-API-5`` contaría como ``H-API-5``.
2. El escaneo mira CONTENIDO, no sólo nombre de archivo. Un monolito
   ``audits/hallazgos-<slug>.rst`` cita varios números dentro del mismo
   archivo, sin que ninguno aparezca en su nombre; un escaneo por nombre de
   archivo sería ciego a ésos.
3. El prefijo DISCRIMINA. ``H-API-9`` no cuenta para ``DOCS``, ni al revés.
4. Árbol vacío para el prefijo → nace en 1, no revienta.
5. Un archivo binario no aborta el escaneo — se salta, no tira la excepción.
6. ``is_free`` da el veredicto inverso de ``next_id`` sobre el mismo árbol:
   el número que ``next_id`` acaba de proponer siempre está libre, y el
   máximo ya usado nunca lo está.
7. ANULACIÓN: sin el ancla de prefijo (aceptando cualquier prefijo como si
   fuera el pedido), el conteo de ``API`` se contamina con los de ``DOCS`` —
   tiene que caer **exactamente** la aserción 3, ninguna otra.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from hallazgo import hallazgo_ids  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


TMP = Path(tempfile.mkdtemp(prefix="hallazgo-ids-"))

# --- 1. forma del literal, con límite de palabra -----------------------------
print("== 1. el literal se reconoce con límite de palabra en los dos extremos ==")
(TMP / "uno").mkdir()
(TMP / "uno" / "a.rst").write_text(
    "cita a PH-API-5 (no cuenta) y a H-API-7 (sí cuenta) y H-API-70X (no, "
    "sigue con letra)\n", encoding="utf-8")
numbers = hallazgo_ids.used_numbers(TMP / "uno", "API")
check("sólo el 7 cuenta", [7], sorted(numbers))

# --- 2. escaneo por CONTENIDO, no por nombre de archivo ----------------------
print("== 2. un monolito con varios números en el mismo archivo, todos cuentan ==")
(TMP / "dos").mkdir()
(TMP / "dos" / "hallazgos-migrar-algo.rst").write_text(
    "H-API-100 -- resuelto\nH-API-101 -- resuelto\nH-API-102 -- documentado\n",
    encoding="utf-8")
numbers = hallazgo_ids.used_numbers(TMP / "dos", "API")
check("los tres números del monolito, ninguno en el nombre del archivo",
      [100, 101, 102], sorted(numbers))

# --- 3. el prefijo discrimina -------------------------------------------------
print("== 3. H-DOCS-9 no cuenta para el prefijo API ==")
(TMP / "tres").mkdir()
(TMP / "tres" / "a.rst").write_text("H-API-3\nH-DOCS-9\nH-API-4\n", encoding="utf-8")
numbers_api = hallazgo_ids.used_numbers(TMP / "tres", "API")
numbers_docs = hallazgo_ids.used_numbers(TMP / "tres", "DOCS")
check("API ve 3 y 4, no el 9 de DOCS", [3, 4], sorted(numbers_api))
check("DOCS ve sólo el 9", [9], sorted(numbers_docs))

# --- 4. árbol vacío para el prefijo -> nace en 1 -----------------------------
print("== 4. sin ninguna cita del prefijo, el siguiente es H-<PREFIJO>-1 ==")
(TMP / "cuatro").mkdir()
(TMP / "cuatro" / "a.rst").write_text("nada que ver aquí\n", encoding="utf-8")
check("nace en 1, con relleno", "H-UI-01",
      hallazgo_ids.next_id(TMP / "cuatro", "UI", store_path=hallazgo_ids.NO_STORE))

# --- 5. un binario no aborta el escaneo --------------------------------------
print("== 5. CONTROL: un archivo no-UTF-8 se salta, no revienta el escaneo ==")
(TMP / "cinco").mkdir()
(TMP / "cinco" / "a.rst").write_text("H-API-1\n", encoding="utf-8")
(TMP / "cinco" / "binario.bin").write_bytes(b"\xff\xfe\x00H-API-999\xff")
numbers = hallazgo_ids.used_numbers(TMP / "cinco", "API")
check("el binario no se cuenta y el escaneo no revienta", [1], sorted(numbers))

# --- 6. is_free es el inverso de next_id sobre el mismo árbol ----------------
print("== 6. is_free concuerda con next_id ==")
(TMP / "seis").mkdir()
(TMP / "seis" / "a.rst").write_text("H-API-5\nH-API-6\n", encoding="utf-8")
following = hallazgo_ids.next_id(TMP / "seis", "API",
                                 store_path=hallazgo_ids.NO_STORE)
check("el siguiente propuesto está libre", True,
      hallazgo_ids.is_free(TMP / "seis", following,
                           store_path=hallazgo_ids.NO_STORE))
check("el máximo ya usado NO está libre", False,
      hallazgo_ids.is_free(TMP / "seis", "H-API-6",
                           store_path=hallazgo_ids.NO_STORE))

# --- 7. ANULACIÓN: sin el ancla de prefijo, DOCS contamina a API -------------
print("== 7. ANULACIÓN: un patrón sin ancla de prefijo mezcla los dos ==")
import re as _re  # noqa: E402  -- sólo para el patrón anulado de este bloque

_PATRON_WITHOUT_ANCHOR = _re.compile(r'H-[A-Z]+-(?P<numero>\d+)')


def _numbers_without_anchor(folder: Path) -> list[int]:
    """La misma lógica de recorrido de ``used_numbers``, con el patrón
    anulado: acepta CUALQUIER prefijo como si coincidiera con el pedido."""
    numbers = []
    for file in folder.rglob('*'):
        if not file.is_file():
            continue
        try:
            text = file.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        numbers.extend(int(m.group('numero')) for m in _PATRON_WITHOUT_ANCHOR.finditer(text))
    return numbers


numbers_nulled = _numbers_without_anchor(TMP / "tres")
check("SIN el ancla de prefijo, API se contamina con el 9 de DOCS",
      [3, 9, 4], numbers_nulled)
check("y con el ancla (caso 3), el 9 no aparece — el control DISCRIMINA",
      True, 9 not in numbers_api and 9 in numbers_nulled)

# --- 8. relleno a 2 digitos por debajo de 10, medido contra el arbol real ---
print("== 8. bajo 10 lleva cero de relleno, igual que el arbol real "
      "(H-API-01..H-API-09, H-API-10 sin relleno) ==")
(TMP / "ocho").mkdir()
check("un solo digito nace como '01'", "H-UI-01",
      hallazgo_ids.next_id(TMP / "ocho", "UI",
                           store_path=hallazgo_ids.NO_STORE))
(TMP / "ocho" / "a.rst").write_text("H-UI-08\n", encoding="utf-8")
check("el 9 tambien lleva el cero", "H-UI-09",
      hallazgo_ids.next_id(TMP / "ocho", "UI",
                           store_path=hallazgo_ids.NO_STORE))
(TMP / "ocho" / "a.rst").write_text("H-UI-09\n", encoding="utf-8")
check("el 10 YA NO lleva relleno — el arbol real lo escribe 'H-API-10', no "
      "'H-API-010'", "H-UI-10",
      hallazgo_ids.next_id(TMP / "ocho", "UI",
                           store_path=hallazgo_ids.NO_STORE))

# --- 9. el DEFAULT consulta el store; el opt-out es explicito ---------------
print("== 9. el default une arbol + store — el opt-out mide solo el arbol ==")
import sqlite3 as _sqlite3  # noqa: E402  -- sólo para el store sintético

(TMP / "nueve").mkdir()
(TMP / "nueve" / "a.rst").write_text("H-TESTDEF-04\n", encoding="utf-8")
_STORE = TMP / "nueve" / "store.sqlite3"
_conn = _sqlite3.connect(_STORE)
_conn.execute("CREATE TABLE findings_history (finding_id TEXT)")
_conn.execute("INSERT INTO findings_history VALUES ('H-TESTDEF-09')")
_conn.commit()
_conn.close()

check("con el opt-out, sólo ve el .rst y propone el 5", "H-TESTDEF-05",
      hallazgo_ids.next_id(TMP / "nueve", "TESTDEF",
                           store_path=hallazgo_ids.NO_STORE))
check("con el store declarado, ve la fila 09 y propone el 10", "H-TESTDEF-10",
      hallazgo_ids.next_id(TMP / "nueve", "TESTDEF", store_path=_STORE))
check("is_free dice NO libre sobre un número que sólo existe como fila", False,
      hallazgo_ids.is_free(TMP / "nueve", "H-TESTDEF-9", store_path=_STORE))
check("y el mismo número SÍ está libre si se declara el opt-out — el control "
      "DISCRIMINA las dos fuentes", True,
      hallazgo_ids.is_free(TMP / "nueve", "H-TESTDEF-9",
                           store_path=hallazgo_ids.NO_STORE))
check("el DEFAULT no es el opt-out: RESOLVE_STORE es el valor por omisión",
      hallazgo_ids.RESOLVE_STORE,
      hallazgo_ids.next_id.__defaults__[0])

# La aserción de arriba mide el CENTINELA; ésta mide la CONDUCTA. Sin las dos,
# un default que apunta a RESOLVE_STORE y no resuelve nada pasaría igual — el
# sub-patrón C aplicado al propio control. `env_value` declara que el proceso
# gana sobre el .env, así que exportar la variable redirige la resolución real.
import os as _os  # noqa: E402

_previous = _os.environ.get("THYROX_AGENT_STORE")
_os.environ["THYROX_AGENT_STORE"] = str(_STORE)
try:
    check("SIN declarar store_path, el default resuelve y ve la fila 09",
          "H-TESTDEF-10", hallazgo_ids.next_id(TMP / "nueve", "TESTDEF"))
finally:
    if _previous is None:
        _os.environ.pop("THYROX_AGENT_STORE", None)
    else:
        _os.environ["THYROX_AGENT_STORE"] = _previous


# --- 10. el prefijo se VALIDA: el acuñador antepone `H-`, no lo acepta -------
# Medido por conducta 2026-09-17 al acuñar H-THYROX-73: `acunar H-THYROX`
# devolvia `H-H-THYROX-01` — un id malformado que entra al corpus si nadie lo
# mira. El argumento correcto es la capa desnuda; el guion lo tiene que decir
# en vez de componer el doble prefijo.
print("\n== 10. el prefijo malformado se rehusa, no se compone ==")
(TMP / "diez").mkdir()


def _refuses(prefix):
    """(rehuso, lo_que_devolvio) — SystemExit cuenta como rehuso."""
    try:
        return False, hallazgo_ids.next_id(TMP / "diez", prefix,
                                           store_path=hallazgo_ids.NO_STORE)
    except SystemExit as exc:
        return True, str(exc)


_refused, _returned = _refuses("H-THYROX")
check("`H-THYROX` (prefijo ya con H-) se rehusa", True, _refused)
check("y NO devuelve el doble prefijo", False, str(_returned).startswith("H-H-"))
check("el mensaje nombra el argumento correcto", True,
      _refused and "THYROX" in str(_returned))

# Control positivo: la capa desnuda sigue acuñando. Sin esta asercion, un guard
# que rehusara SIEMPRE pasaria las tres de arriba — el sub-patron D.
check("`THYROX` desnudo sigue acuñando", "H-THYROX-01",
      hallazgo_ids.next_id(TMP / "diez", "THYROX",
                           store_path=hallazgo_ids.NO_STORE))
check("y la minuscula tambien, como antes", "H-THYROX-01",
      hallazgo_ids.next_id(TMP / "diez", "thyrox",
                           store_path=hallazgo_ids.NO_STORE))

# El prefijo no es `[A-Za-z]+`: la misma forma que `is_free` ya rehusa para el
# id completo, aplicada al argumento del acuñador.
_refused_odd, _ = _refuses("API-2")
check("un prefijo con no-letras se rehusa", True, _refused_odd)

# ANULACION: retirando `validated_prefix` de `next_id`, caen exactamente las
# cuatro aserciones de rehuso (H-THYROX x3 y API-2) y NINGUNA de las dos de
# control positivo — medido al escribirlas.

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
