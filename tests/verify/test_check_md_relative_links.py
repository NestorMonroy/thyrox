#!/usr/bin/env python3
"""Control de `src/verify/check_md_relative_links.py`: un enlace relativo de
Markdown apunta a un archivo que existe.

Qué haría fallar a este control:
- que un enlace a un archivo ausente no se reportara, o se reportara sin
  nombrar el archivo que lo lleva y su destino;
- que se contara como roto lo que no es un enlace al disco: un enlace dentro
  de un bloque o de un tramo de código, una URL, un ancla sola o un destino
  con marcadores (`{nombre-wp}`);
- que el fragmento (`#seccion`) impidiera resolver el archivo;
- que una raíz ausente publicara un cero en vez de rehusar con exit 2.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import os
import sys
import tempfile
from pathlib import Path

# Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
MODULE = os.environ.get("CHECK_MD_LINKS_MODULE") or str(
    Path(__file__).resolve().parents[2] / "src" / "verify" / "check_md_relative_links.py")
spec = importlib.util.spec_from_file_location("check_md_relative_links", MODULE)
assert spec and spec.loader
links = importlib.util.module_from_spec(spec)
spec.loader.exec_module(links)

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def run(root: Path) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = links.main([str(root)])
    return code, out.getvalue(), err.getvalue()


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    skill = root / "skills" / "thyrox"
    skill.mkdir(parents=True)
    (root / "refs").mkdir()
    (root / "refs" / "conventions.md").write_text("# convenciones\n")
    (skill / "SKILL.md").write_text("\n".join([
        "[bien](../../refs/conventions.md)",
        "[con ancla](../../refs/conventions.md#seccion)",
        "[url](https://example.com/a.md)",
        "[ancla sola](#arriba)",
        "[marcador](../../work/{nombre-wp}/plan.md)",
        "en código `[no](../../falta.md)` no cuenta",
        "```",
        "[en bloque](../../falta-bloque.md)",
        "```",
        "",
    ]))
    code, out, _ = run(root)
    assert_equal("sin enlaces rotos sale 0", 0, code)
    assert_equal("publica el alcance medido: 2 enlaces en 2 archivos (el destino también es .md)",
                 True, "(alcance medido: 2 enlace(s) relativo(s) en 2 archivo(s))" in out)

    # El caso real del árbol: la ruta de antes de la mudanza a `_references/`.
    (skill / "SKILL.md").write_text("[conventions.md](../../references/conventions.md)\n")
    code, out, _ = run(root)
    assert_equal("un enlace a un archivo ausente sale 1", 1, code)
    assert_equal("nombra el archivo y el destino roto",
                 True, "skills/thyrox/SKILL.md:1: ../../references/conventions.md" in out)
    assert_equal("cuenta el enlace roto", True, "1 enlace(s) roto(s)" in out)

    code, out, err = run(root / "no-existe")
    assert_equal("una raíz ausente rehúsa con exit 2", 2, code)
    assert_equal("y no publica un conteo", False, "enlace(s) roto(s)" in out)
    assert_equal("nombra la raíz ausente", True, "no-existe" in err)

print(f"test_check_md_relative_links: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
