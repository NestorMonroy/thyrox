#!/usr/bin/env python3
"""Extrae el texto de un PDF, con el extractor mas ligero que haya.

Existe porque el arbol recibe PDF como fuente —el portafolio de un
competidor, unas instrucciones academicas— y ``source/`` solo acepta ``.rst``.
Sin instrumento, la unica alternativa es transcribir a mano, que no es
reproducible ni auditable.

Por que ``pdftotext`` y no una biblioteca
=========================================

Medido en este contenedor, sobre el mismo PDF de 8 paginas:

===================  ====================  =================
Eje                  ``pdftotext -layout``  ``pdfplumber``
===================  ====================  =================
peso instalado       **718 KB**            8 paquetes, 53 MB
texto extraido       **12 901 bytes**      6107 bytes
columnas             **alineadas**         aplanadas en una fila
===================  ====================  =================

Y su dependencia pesada, ``libpoppler``, ya estaba instalada. Es 70x mas
ligero, saca mas del doble de texto y conserva el trazado, que en un
documento de tres columnas es la diferencia entre legible e inutil.

La biblioteca solo gana cuando hace falta la **tabla como filas y celdas**,
que no es la necesidad por defecto de este arbol. Por eso es el camino de
respaldo y no el primario.

Lo que NO hace, declarado
=========================

**OCR.** Un PDF cuyo texto sea imagen o contorno vectorial sale vacio, y el
instrumento lo **declara pagina por pagina** en vez de devolver un archivo
corto sin decir por que. Los dos casos estan medidos: la lista de clientes de
un portafolio eran logotipos y no salio un solo nombre; y unas instrucciones
academicas devolvieron contornos vectoriales.

Esa frontera es el eje 2 de ``thyrox_toolchain_require_pdf_text``, y su
remedio es otro: ``apt-get install tesseract-ocr``.

*Metrica:* caracteres extraidos por pagina.
*Ciega a:* si el texto extraido es **correcto** — un PDF mal generado puede
dar texto legible y desordenado, y esto no lo distingue.

Uso
---

    bash bin/pdf_to_text ENTRADA.pdf SALIDA.txt
    bash bin/pdf_to_text ENTRADA.pdf SALIDA.txt --raw   # sin preservar trazado
"""
from __future__ import annotations

import argparse
import pathlib
import re
import shutil
import subprocess
import sys

PAGE_BREAK = "\f"
MARKER = "thyrox-pdf-ok"


def _pdftotext_bin() -> str | None:
    """El binario declarado, si resuelve. Declarado para que un control pueda
    apuntar a un nombre ausente, igual que en ``toolchain.sh``."""
    import os
    binary = os.environ.get("THYROX_TOOLCHAIN_PDFTOTEXT_BIN", "pdftotext")
    return shutil.which(binary)


def extract_with_pdftotext(source: pathlib.Path, *, layout: bool = True) -> str:
    binary = _pdftotext_bin()
    if binary is None:
        raise FileNotFoundError("pdftotext no resuelve")
    argv = [binary]
    if layout:
        argv.append("-layout")
    argv += [str(source), "-"]
    completed = subprocess.run(argv, capture_output=True, check=True)
    return completed.stdout.decode("utf-8", errors="replace")


def extract_with_library(source: pathlib.Path) -> str:
    """Respaldo. Solo se usa si ``pdftotext`` no esta."""
    import pdfplumber  # noqa: PLC0415 — respaldo opcional, no dependencia dura

    parts: list[str] = []
    with pdfplumber.open(source) as pdf:
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    return PAGE_BREAK.join(parts)


def pages(text: str) -> list[str]:
    """Las paginas, separadas por el salto de pagina que ``pdftotext`` emite.

    El ultimo trozo se descarta cuando esta vacio: ``pdftotext`` cierra el
    documento con un salto de pagina, asi que un ``split`` llano inventa una
    pagina final que no existe. Medido sobre un PDF de 8 paginas: reportaba
    9, declaraba la 9 "sin texto" y recomendaba instalar OCR para leerla.
    """
    chunks = text.split(PAGE_BREAK)
    if chunks and not chunks[-1].strip():
        chunks.pop()
    return chunks


def report(text: str) -> tuple[int, list[int]]:
    """``(caracteres, paginas sin texto)``.

    Las paginas vacias se **enumeran**, no se cuentan: saber que "hay 3
    vacias" no dice cual, y la que importa suele ser una concreta.
    """
    chunks = pages(text)
    blank_ones = [n for n, p in enumerate(chunks, 1) if not p.strip()]
    return (len(text), blank_ones)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Extrae el texto de un PDF con el extractor mas ligero disponible.")
    parser.add_argument("entrada", help="el PDF de origen")
    parser.add_argument("salida", help="el .txt de destino")
    parser.add_argument("--raw", action="store_true",
                        help="no preservar el trazado (sin -layout)")
    args = parser.parse_args(argv)

    source = pathlib.Path(args.entrada)
    if not source.is_file():
        raise SystemExit(f"pdf_to_text: no existe: {source}")

    if _pdftotext_bin() is not None:
        via = "pdftotext" + ("" if args.raw else " -layout")
        text = extract_with_pdftotext(source, layout=not args.raw)
    else:
        try:
            text = extract_with_library(source)
            via = "pdfplumber (respaldo)"
        except ImportError:
            raise SystemExit(
                "pdf_to_text: no hay extractor.\n"
                "  Remedio, el ligero: apt-get install -y poppler-utils (718 KB)\n"
                "  Lo comprueba: bash bin/check-toolchain-ready"
            ) from None

    out_file = pathlib.Path(args.salida)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(text, encoding="utf-8")

    chars, blank_ones = report(text)
    total = len(pages(text))
    print(f"via: {via}")
    print(f"paginas: {total}")
    print(f"caracteres: {chars}")
    print(f"paginas SIN texto: {len(blank_ones)}" + (f" -> {blank_ones}" if blank_ones else ""))
    if blank_ones:
        print("  Una pagina sin texto suele ser imagen o contorno vectorial.")
        print("  Esto NO hace OCR. Eje 2: bash bin/check-toolchain-ready, y")
        print("  su remedio es apt-get install -y tesseract-ocr.")
    print(f"escrito: {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
