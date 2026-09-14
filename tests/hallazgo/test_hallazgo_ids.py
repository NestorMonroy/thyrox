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
numeros = hallazgo_ids.used_numbers(TMP / "uno", "API")
check("sólo el 7 cuenta", [7], sorted(numeros))

# --- 2. escaneo por CONTENIDO, no por nombre de archivo ----------------------
print("== 2. un monolito con varios números en el mismo archivo, todos cuentan ==")
(TMP / "dos").mkdir()
(TMP / "dos" / "hallazgos-migrar-algo.rst").write_text(
    "H-API-100 -- resuelto\nH-API-101 -- resuelto\nH-API-102 -- documentado\n",
    encoding="utf-8")
numeros = hallazgo_ids.used_numbers(TMP / "dos", "API")
check("los tres números del monolito, ninguno en el nombre del archivo",
      [100, 101, 102], sorted(numeros))

# --- 3. el prefijo discrimina -------------------------------------------------
print("== 3. H-DOCS-9 no cuenta para el prefijo API ==")
(TMP / "tres").mkdir()
(TMP / "tres" / "a.rst").write_text("H-API-3\nH-DOCS-9\nH-API-4\n", encoding="utf-8")
numeros_api = hallazgo_ids.used_numbers(TMP / "tres", "API")
numeros_docs = hallazgo_ids.used_numbers(TMP / "tres", "DOCS")
check("API ve 3 y 4, no el 9 de DOCS", [3, 4], sorted(numeros_api))
check("DOCS ve sólo el 9", [9], sorted(numeros_docs))

# --- 4. árbol vacío para el prefijo -> nace en 1 -----------------------------
print("== 4. sin ninguna cita del prefijo, el siguiente es H-<PREFIJO>-1 ==")
(TMP / "cuatro").mkdir()
(TMP / "cuatro" / "a.rst").write_text("nada que ver aquí\n", encoding="utf-8")
check("nace en 1, con relleno", "H-UI-01", hallazgo_ids.next_id(TMP / "cuatro", "UI"))

# --- 5. un binario no aborta el escaneo --------------------------------------
print("== 5. CONTROL: un archivo no-UTF-8 se salta, no revienta el escaneo ==")
(TMP / "cinco").mkdir()
(TMP / "cinco" / "a.rst").write_text("H-API-1\n", encoding="utf-8")
(TMP / "cinco" / "binario.bin").write_bytes(b"\xff\xfe\x00H-API-999\xff")
numeros = hallazgo_ids.used_numbers(TMP / "cinco", "API")
check("el binario no se cuenta y el escaneo no revienta", [1], sorted(numeros))

# --- 6. is_free es el inverso de next_id sobre el mismo árbol ----------------
print("== 6. is_free concuerda con next_id ==")
(TMP / "seis").mkdir()
(TMP / "seis" / "a.rst").write_text("H-API-5\nH-API-6\n", encoding="utf-8")
siguiente = hallazgo_ids.next_id(TMP / "seis", "API")
check("el siguiente propuesto está libre", True,
      hallazgo_ids.is_free(TMP / "seis", siguiente))
check("el máximo ya usado NO está libre", False,
      hallazgo_ids.is_free(TMP / "seis", "H-API-6"))

# --- 7. ANULACIÓN: sin el ancla de prefijo, DOCS contamina a API -------------
print("== 7. ANULACIÓN: un patrón sin ancla de prefijo mezcla los dos ==")
import re as _re  # noqa: E402  -- sólo para el patrón anulado de este bloque

_PATRON_SIN_ANCLA = _re.compile(r'H-[A-Z]+-(?P<numero>\d+)')


def _numeros_sin_ancla(carpeta: Path) -> list[int]:
    """La misma lógica de recorrido de ``used_numbers``, con el patrón
    anulado: acepta CUALQUIER prefijo como si coincidiera con el pedido."""
    numeros = []
    for archivo in carpeta.rglob('*'):
        if not archivo.is_file():
            continue
        try:
            texto = archivo.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        numeros.extend(int(m.group('numero')) for m in _PATRON_SIN_ANCLA.finditer(texto))
    return numeros


numeros_anulado = _numeros_sin_ancla(TMP / "tres")
check("SIN el ancla de prefijo, API se contamina con el 9 de DOCS",
      [3, 9, 4], numeros_anulado)
check("y con el ancla (caso 3), el 9 no aparece — el control DISCRIMINA",
      True, 9 not in numeros_api and 9 in numeros_anulado)

# --- 8. relleno a 2 digitos por debajo de 10, medido contra el arbol real ---
print("== 8. bajo 10 lleva cero de relleno, igual que el arbol real "
      "(H-API-01..H-API-09, H-API-10 sin relleno) ==")
(TMP / "ocho").mkdir()
check("un solo digito nace como '01'", "H-UI-01",
      hallazgo_ids.next_id(TMP / "ocho", "UI"))
(TMP / "ocho" / "a.rst").write_text("H-UI-08\n", encoding="utf-8")
check("el 9 tambien lleva el cero", "H-UI-09",
      hallazgo_ids.next_id(TMP / "ocho", "UI"))
(TMP / "ocho" / "a.rst").write_text("H-UI-09\n", encoding="utf-8")
check("el 10 YA NO lleva relleno — el arbol real lo escribe 'H-API-10', no "
      "'H-API-010'", "H-UI-10", hallazgo_ids.next_id(TMP / "ocho", "UI"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
