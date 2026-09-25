#!/usr/bin/env python3
"""Control de `src/corpus/pdf_to_text.py`.

El episodio: el renombre de identificadores de `d3673b1b` tradujo `destino`
a `out_file` y dejó sin traducir la ocurrencia de dentro del f-string final.
La extracción escribía el `.txt` y la herramienta salía con `NameError`, así
que un llamador la leía como fallida. Hasta Python 3.11 el interior de un
f-string es un solo token: un renombre por tokens no lo ve (H-API-607).

Qué haría fallar a este control:
- que la CLI no termine con 0 tras escribir su salida;
- que el reporte no nombre el archivo que escribió.
"""
from __future__ import annotations

import contextlib
import io
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import pdf_to_text as ptt  # noqa: E402

passed = failed = 0


def check(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_pdf_to_text:")
with tempfile.TemporaryDirectory() as directory:
    base = pathlib.Path(directory)
    source = base / "doc.pdf"
    source.write_bytes(b"%PDF-1.4 fixture")
    target = base / "out" / "doc.txt"
    ptt._pdftotext_bin = lambda: "/usr/bin/pdftotext"
    ptt.extract_with_pdftotext = lambda path, *, layout=True: "Hola\n\fAdios\n"
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            code = ptt.main([str(source), str(target)])
    except NameError as error:
        code = f"NameError: {error}"
    check("la CLI termina con 0 tras escribir", 0, code)
    check("el texto quedó escrito", "Hola\n\fAdios\n", target.read_text() if target.exists() else None)
    check("el reporte nombra el archivo escrito", True, f"escrito: {target}" in out.getvalue())

# Sin ningun extractor, el rechazo nombra el instalador que el arbol trae
# (`thyrox_toolchain_require_pdf_text`, opt-in THYROX_INSTALL_PDF_TEXT): un
# remedio que sólo dice `apt-get` deja la instalación fuera del instrumento.
with tempfile.TemporaryDirectory() as directory:
    source = pathlib.Path(directory) / "doc.pdf"
    source.write_bytes(b"%PDF-1.4 fixture")
    ptt._pdftotext_bin = lambda: None
    def _sin_biblioteca(path):
        raise ImportError("pdfplumber")
    ptt.extract_with_library = _sin_biblioteca
    try:
        ptt.main([str(source), str(pathlib.Path(directory) / "x.txt")])
        message = ""
    except SystemExit as exit_:
        message = str(exit_.code)
    check("el rechazo nombra el opt-in del instalador", True, "THYROX_INSTALL_PDF_TEXT=1" in message)
    check("el rechazo nombra la funcion del arbol", True, "thyrox_toolchain_require_pdf_text" in message)

print(f"test_pdf_to_text: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
