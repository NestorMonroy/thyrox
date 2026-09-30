#!/usr/bin/env python3
"""Extrae el texto del PDF sin pasar por `cryptography`.

`pypdf` 6.18 importa `cryptography` para su proveedor de cifrado, y la build
41.0.7 del sistema revienta con `pyo3_runtime.PanicException` al cargar su
binding en Rust. El PDF no esta cifrado, asi que el proveedor no hace falta:
se bloquea el import y `pypdf` cae a su cadena de respaldo.

Metrica: el texto que `pypdf` extrae por pagina.
Ciega a: el texto que viva en imagenes (no hay OCR aqui) y al orden de
lectura de un layout a columnas, que pypdf aplana.
"""
from __future__ import annotations

import importlib.abc
import importlib.machinery
import sys
from pathlib import Path


class _BlockCryptography(importlib.abc.MetaPathFinder):
    """Hace invisible a `cryptography` para que pypdf use su respaldo."""

    def find_spec(self, fullname: str, path: object = None,
                  target: object = None) -> importlib.machinery.ModuleSpec | None:
        if fullname == "cryptography" or fullname.startswith("cryptography."):
            raise ModuleNotFoundError(f"bloqueado a proposito: {fullname}")
        return None


sys.meta_path.insert(0, _BlockCryptography())

from pypdf import PdfReader  # noqa: E402 — despues del bloqueo


def main(source: str, target: str) -> int:
    reader = PdfReader(source)
    pages = [page.extract_text() or "" for page in reader.pages]
    body = "\n\n".join(
        f"=== pagina {n} ===\n{text}" for n, text in enumerate(pages, 1)
    )
    Path(target).write_text(body, encoding="utf-8")
    print(f"paginas={len(pages)} caracteres={len(body)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1], sys.argv[2]))
