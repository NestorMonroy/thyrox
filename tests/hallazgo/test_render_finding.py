#!/usr/bin/env python3
"""Suite de `render_finding.py`: el .rst de un hallazgo sale de su fila.

Los .rst de H-THYROX-202..207 se escribieron a mano, con la misma plantilla
repetida en heredocs. La fila del store ya tiene el identificador, la
severidad, la capa, la iniciativa, el resumen y la fuente; lo que faltaba es
quien la renderice.

Controles de anulación: sin rehusar un archivo existente cae el caso 4; sin
la guarda de idempotencia del índice cae el caso 6.
"""
from __future__ import annotations

import contextlib
import io
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from hallazgo import render_finding

PASS = 0
FAIL = 0


def check(label, expected, got):
    global PASS, FAIL
    if expected == got:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {got!r}")


def run(*argv: str) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = render_finding.main(list(argv))
    return code, out.getvalue(), err.getvalue()


work = Path(tempfile.mkdtemp(prefix="render-finding-"))
store = work / "store" / ".claude"
store.mkdir(parents=True)
pm = work / "pm"
findings_folder = pm / "thyrox" / "iniciativas" / "resolve-all-thyrox-errors" / "hallazgos"
findings_folder.mkdir(parents=True)
(findings_folder / "index.rst").write_text(
    "Hallazgos\n=========\n\n.. list-table::\n   :header-rows: 1\n\n"
    "   * - ID\n     - Severidad\n     - Estado\n"
    "   * - :ref:`h-thyrox-1`\n     - BAJA\n     - RESUELTO\n\n"
    ".. toctree::\n   :maxdepth: 1\n\n   hallazgo-H-THYROX-1-previo\n", encoding="utf-8")
subprocess.run(
    ["bash", str(ROOT / "bin" / "agent_store"), "agregar-hallazgo", "--claude-dir", str(store),
     "--finding-id", "H-THYROX-9", "--submodule", "thyrox", "--initiative", "resolve-all-thyrox-errors",
     "--severity", "MEDIA", "--summary", "El pool lanzaba claude aunque thyrox -p existía",
     "--content", "El ejecutor por defecto seguía siendo claude.",
     "--source-ref", "src/session/headless-pool.sh"],
    check=True, capture_output=True)
COMMON = ("--claude-dir", str(store), "--root", str(pm))

print("\n1. rst: el archivo sale de la fila, en la ruta de su capa e iniciativa")
body = work / "body.rst"
body.write_text("Qué estaba mal\n--------------\n\nEl texto largo del cuerpo.\n", encoding="utf-8")
code, out, _ = run("rst", "H-THYROX-9", "--resolved-in", "thyrox@abc1234", "--body", str(body), *COMMON)
written = findings_folder / "hallazgo-H-THYROX-9-el-pool-lanzaba-claude-aunque-thyrox-p-existia.rst"
check("sale 0", 0, code)
check("en la ruta derivada del resumen, sin acentos", True, written.is_file())
text = written.read_text(encoding="utf-8") if written.is_file() else ""
check("con su etiqueta", True, ".. _h-thyrox-9:" in text)
check("con la capa y la iniciativa en el meta", True,
      ":submodulo: thyrox" in text and ":iniciativa: resolve-all-thyrox-errors" in text)
check("resuelto, con su commit", True, ":estado: resuelto" in text and "RESUELTO en ``thyrox@abc1234``" in text)
check("con la severidad y la fuente", True, "**Severidad:** MEDIA" in text and "``thyrox: src/session/headless-pool.sh``" in text)
check("con el cuerpo tal cual", True, "El texto largo del cuerpo." in text)
lines = text.splitlines()
title = next((i for i, line in enumerate(lines) if line.startswith("H-THYROX-9 —")), None)
check("subrayado al menos tan largo como el título", True,
      title is not None and len(lines[title + 1]) >= len(lines[title]) and set(lines[title + 1]) == {"="})
check("la fecha es real, UTC al segundo", True,
      re.search(r":fecha_creacion: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\n", text) is not None)

print("\n2. sin commit que lo resuelva: documentado")
code, _, _ = run("rst", "H-THYROX-9", "--output", str(work / "sin-commit.rst"), *COMMON)
check("estado documentado", True, ":estado: documentado" in (work / "sin-commit.rst").read_text(encoding="utf-8"))

print("\n3. un identificador que el store no tiene: exit 2 y nada escrito")
before = sorted(p.name for p in findings_folder.iterdir())
code, _, err = run("rst", "H-THYROX-404", *COMMON)
check("sale 2", 2, code)
check("lo nombra", True, "H-THYROX-404" in err)
check("no escribe", before, sorted(p.name for p in findings_folder.iterdir()))

print("\n4. no pisa un archivo que ya existe")
written.write_text("contenido previo\n", encoding="utf-8")
code, _, _ = run("rst", "H-THYROX-9", *COMMON)
check("sale 1", 1, code)
check("el archivo queda intacto", "contenido previo\n", written.read_text(encoding="utf-8"))

print("\n5. index: añade la fila y la entrada del toctree")
code, _, _ = run("index", "H-THYROX-9", *COMMON)
index = (findings_folder / "index.rst").read_text(encoding="utf-8")
check("sale 0", 0, code)
check("la fila va tras la última", True,
      "   * - :ref:`h-thyrox-1`\n     - BAJA\n     - RESUELTO\n   * - :ref:`h-thyrox-9`\n     - MEDIA\n" in index)
check("la entrada va tras la última del toctree", True,
      "   hallazgo-H-THYROX-1-previo\n   hallazgo-H-THYROX-9-el-pool-lanzaba-claude-aunque-thyrox-p-existia" in index)

print("\n6. index es idempotente: una segunda vez no duplica")
run("index", "H-THYROX-9", *COMMON)
index = (findings_folder / "index.rst").read_text(encoding="utf-8")
check("una sola fila", 1, index.count(":ref:`h-thyrox-9`"))
check("una sola entrada", 1, index.count("hallazgo-H-THYROX-9-"))

print(f"\ntest_render_finding: {PASS} ok, {FAIL} falla(s)")
sys.exit(1 if FAIL else 0)
