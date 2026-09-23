#!/usr/bin/env python3
"""Suite de ``verify/check_rst_toctree.py``.

Los bloques 5 y 6 son los que importan: fijan por anulacion las **dos
cegueras reales** que este instrumento tuvo mientras vivia en un banco de
trabajo, y que le hicieron publicar 568 huerfanos donde habia 0.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import check_rst_toctree as crt  # noqa: E402

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


TEMPLATE = """Plantilla
=========

Asi se declara:

.. code-block:: rst

   .. toctree::

      un-hijo-que-solo-existe-al-materializar

Fin.
"""

print("=== 1. toctree_entries ===")
DOC = ".. toctree::\n   :maxdepth: 2\n   :glob:\n\n   a\n   sub/b\n   */index\n\nTexto\n"
entries = [e for _, e in crt.toctree_entries(DOC)]
check("lee las entradas y no las opciones", ["a", "sub/b", "*/index"], entries)
check("la prosa posterior no entra", False, "Texto" in entries)

print("=== 2. el bloque literal NO aporta entradas ===")
check("una plantilla no declara toctree real", [], crt.toctree_entries(TEMPLATE))

print("=== 3. resolve: archivo, index y glob ===")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "index.rst").write_text(".. toctree::\n\n   a\n   dir\n", encoding="utf-8")
    (root / "a.rst").write_text("A\n=\n", encoding="utf-8")
    (root / "dir").mkdir()
    (root / "dir" / "index.rst").write_text("D\n=\n", encoding="utf-8")
    (root / "dir" / "x.rst").write_text("X\n=\n", encoding="utf-8")
    check("resuelve <nombre>.rst", 1, len(crt.resolve(root, root / "index.rst", "a")))
    check("resuelve <dir>/index.rst", 1, len(crt.resolve(root, root / "index.rst", "dir")))
    check("no resuelve lo inexistente", [], crt.resolve(root, root / "index.rst", "nada"))
    check("el glob alcanza los dos de dir/",
          2, len(crt.resolve(root, root / "dir" / "index.rst", "*")))

print("=== 4. audit: rota y huerfano son fenomenos distintos ===")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "index.rst").write_text(".. toctree::\n\n   vivo\n   fantasma\n", encoding="utf-8")
    (root / "vivo.rst").write_text("V\n=\n", encoding="utf-8")
    (root / "solo.rst").write_text("S\n=\n", encoding="utf-8")
    broken, huerfanos, reachable, total = crt.audit(root)
    check("una entrada rota", 1, len(broken))
    check("la rota nombra la entrada", True, "fantasma" in broken[0])
    check("un huerfano", [Path("solo.rst")], huerfanos)
    check("alcanzables: index + vivo", 2, reachable)
    check("total: los tres", 3, total)

print("=== 5. ANULACION — sin expandir :glob:, los hijos son huerfanos ===")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "index.rst").write_text(".. toctree::\n\n   ini/index\n", encoding="utf-8")
    ini = root / "ini"
    ini.mkdir()
    (ini / "index.rst").write_text(".. toctree::\n   :glob:\n\n   */index\n", encoding="utf-8")
    child = ini / "uno"
    child.mkdir()
    (child / "index.rst").write_text("U\n=\n", encoding="utf-8")

    broken, huerfanos, _, _ = crt.audit(root)
    check("con expansion: cero huerfanos", [], huerfanos)
    check("y cero entradas rotas", [], broken)

    original = crt.resolve

    def resolve_without_glob(root_, origin, entry):
        """La version ANULADA: trata `*/index` como una ruta literal.

        Llama al ORIGINAL capturado, no a `crt.resolve`: rebindear el nombre
        del modulo y luego leerlo desde dentro del shim es una recursion
        infinita, no una anulacion.
        """
        if "*" in entry:
            return []
        return original(root_, origin, entry)

    crt.resolve = resolve_without_glob
    try:
        broken_disabled, orphans_disabled, _, _ = crt.audit(root)
    finally:
        crt.resolve = original
    check("anulacion: sin expandir, el hijo aparece como huerfano",
          [Path("ini/uno/index.rst")], orphans_disabled)
    check("anulacion: y la entrada glob se reporta como rota",
          1, len(broken_disabled))

print("=== 6. ANULACION — sin saltar el literal, la plantilla se marca rota ===")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "index.rst").write_text(".. toctree::\n\n   tpl\n", encoding="utf-8")
    (root / "tpl.rst").write_text(TEMPLATE, encoding="utf-8")
    broken, huerfanos, _, _ = crt.audit(root)
    check("con el salto: la plantilla no rompe nada", ([], []), (broken, huerfanos))

    import re
    original = crt.LITERAL_DIRECTIVE
    crt.LITERAL_DIRECTIVE = re.compile(r"^(\s*)\.\.\s+(?:NADA-QUE-CASE)::")
    try:
        broken_disabled, _, _, _ = crt.audit(root)
    finally:
        crt.LITERAL_DIRECTIVE = original
    check("anulacion: sin el salto, la entrada de la plantilla se marca rota",
          1, len(broken_disabled))
    check("anulacion: y nombra el hijo que solo existe al materializar",
          True, "un-hijo-que-solo-existe-al-materializar" in broken_disabled[0])

print(f"\nOK={OK} FAILED={FAILED}")
raise SystemExit(1 if FAILED else 0)
