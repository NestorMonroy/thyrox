#!/usr/bin/env python3
"""Suite de ``verify/check_meta_timestamps.py``.

Lo que cada bloque mide, y por que existe:

1. ``meta_date_fields`` ve SOLO el bloque ``.. meta::``. Una cita en prosa o
   dentro de un bloque literal es evidencia de otro documento: reescribirla
   destruiria la evidencia, que es peor que el defecto que persigue.
2. Los tres veredictos: MARCADOR, FABRICADO, MALFORMADO.
3. La fecha sin hora NO es incumplimiento. Es la cara dificil del gate: un
   valor mas completo (``T00:00:00``) es MENOS verdadero que uno mas corto,
   porque afirma una hora que nadie midio.
4. El marcador de plantilla es correcto en ``tpl-*`` y defecto fuera.
5. ANULACION del corte de meta: sin el, la cita en prosa cuenta como campo.
6. ANULACION de la excepcion de plantilla: sin ella, cae la plantilla.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import check_meta_timestamps as cmt  # noqa: E402

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


DOC = """.. meta::
   :artefacto: X
   :fecha_creacion: 2026-09-20T03:17:56
   :ultimo_cambio: 2026-05-05

Titulo
======

En otro documento se leia ``:fecha_creacion: __TS__``, que es la cita de un
defecto ajeno y no un campo de este archivo.

.. code-block:: rst

   .. meta::
      :fecha_creacion: T00:00:00

Fin.
"""

print("=== 1. meta_date_fields ve solo el bloque meta ===")
fields = cmt.meta_date_fields(DOC)
check("dos campos, no cuatro", 2, len(fields))
check("son los del bloque meta", ["fecha_creacion", "ultimo_cambio"], [c[1] for c in fields])
check("la cita en prosa no entra", False, any("__TS__" in c[2] for c in fields))
check("el bloque literal no entra", False, any(c[2] == "T00:00:00" for c in fields))

print("=== 2. los tres veredictos ===")
flat = Path("cualquiera.rst")
check("andamio sin expandir -> MARCADOR",
      True, (cmt.verdict("__TS__", flat) or "").startswith("MARCADOR"))
check("date sin correr -> MARCADOR",
      True, (cmt.verdict('$(date -u +"%Y")', flat) or "").startswith("MARCADOR"))
check("medianoche -> FABRICADO",
      True, (cmt.verdict("2026-05-05T00:00:00", flat) or "").startswith("FABRICADO"))
check("basura -> MALFORMADO",
      True, (cmt.verdict("ayer por la tarde", flat) or "").startswith("MALFORMADO"))
check("vacio -> MALFORMADO",
      True, (cmt.verdict("", flat) or "").startswith("MALFORMADO"))

print("=== 3. la fecha sin hora NO es incumplimiento ===")
check("fecha sola pasa", None, cmt.verdict("2026-05-05", flat))
check("fecha con hora pasa", None, cmt.verdict("2026-05-05T16:18:17", flat))
check("con zona pasa", None, cmt.verdict("2026-06-02T08:23:10Z", flat))
check("y la medianoche, que es MAS larga, NO pasa — es el eje del gate",
      True, cmt.verdict("2026-05-05T00:00:00", flat) is not None)

print("=== 4. el marcador de plantilla depende del archivo ===")
check("<YYYY...> en tpl-* pasa", None, cmt.verdict("<YYYY-MM-DDTHH:MM:SS>", Path("tpl-uc.rst")))
check("<YYYY...> en plantilla-* pasa", None, cmt.verdict("<YYYY-MM-DDTHH:MM:SS>", Path("plantilla-adr.rst")))
check("el mismo marcador fuera de una plantilla es defecto",
      True, cmt.verdict("<YYYY-MM-DDTHH:MM:SS>", Path("index.rst")) is not None)

print("=== 5. audit sobre un arbol sintetico ===")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "sano.rst").write_text(DOC, encoding="utf-8")
    (root / "roto.rst").write_text(
        ".. meta::\n   :fecha_creacion: __TS__\n   :fecha: 2026-01-01T00:00:00\n\nT\n=\n",
        encoding="utf-8")
    (root / "tpl-x.rst").write_text(
        ".. meta::\n   :fecha_creacion: <YYYY-MM-DDTHH:MM:SS>\n\nT\n=\n", encoding="utf-8")
    offenders, census, total = cmt.audit(sorted(root.rglob("*.rst")))
    check("cinco campos vistos en total", 5, total)
    check("dos incumplidores, los dos del mismo archivo",
          ["roto.rst", "roto.rst"], [p.name for p, *_ in offenders])
    check("la plantilla no incumple", False, any(p.name == "tpl-x.rst" for p, *_ in offenders))
    check("censo: 1 con hora, 1 solo fecha, 1 marcador",
          {"con hora": 1, "solo fecha": 1, "marcador de plantilla": 1}, census)

print("=== 6. ANULACION — sin el corte de meta, la cita en prosa cuenta ===")
import re  # noqa: E402

RAW = re.compile(r":(fecha_creacion|ultimo_cambio):\s*(\S+)")
check("anulacion: un barrido sin bloque ve 4 campos, no 2",
      4, len(RAW.findall(DOC)))
check("y el gate real ve 2 — la diferencia es el corte", 2, len(cmt.meta_date_fields(DOC)))

print("=== 7. ANULACION — sin la excepcion de plantilla, cae la plantilla ===")


def verdict_without_template_exception(value: str) -> str | None:
    """La version ANULADA: no consulta si el archivo es una plantilla."""
    if cmt.TEMPLATE_MARK.match(value):
        return "MARCADOR (marcador de plantilla fuera de una plantilla)"
    return cmt.verdict(value, Path("x.rst"))


check("anulacion: el marcador legitimo de tpl-uc.rst se reporta",
      True, verdict_without_template_exception("<YYYY-MM-DDTHH:MM:SS>") is not None)
check("y con la excepcion, no", None, cmt.verdict("<YYYY-MM-DDTHH:MM:SS>", Path("tpl-uc.rst")))

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
