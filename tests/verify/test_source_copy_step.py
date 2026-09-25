#!/usr/bin/env python3
"""Control de `src/verify/source_copy_step.py`: copiar archivos de la fuente
vendorizada sobre sus pares del árbol, quedándose sólo con las copias que no
aportan ningún diagnóstico nuevo.

El verificador es un `tsc` falso y determinista sobre los `.ts` del destino:
`BAD<n>` da TS9001 en su archivo, y un archivo con `USES_API` da TS9003 si
algún otro declara `BROKEN_API` — un consumidor que la copia de otro rompe.

Qué haría fallar a este control:
- no revertir la copia que rompe su propio archivo;
- no bisecar cuando lo nuevo aparece en un consumidor: la copia culpable se
  quedaría, o se revertirían también las inocentes del mismo lote;
- no reescribir el alias de import de la fuente;
- volver a decidir un archivo que el registro ya decidió;
- tomar un `tsc` que no produjo nada como cero errores.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from verify import source_copy_step as step

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


FAKE_TSC = '''import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
files = sorted(root.glob("*.ts"))
broken = any("BROKEN_API" in p.read_text() for p in files)
lines = []
for path in files:
    for number, text in enumerate(path.read_text().splitlines(), 1):
        for match in re.finditer(r"BAD(\\d+)", text):
            lines.append(f"{path.name}({number},1): error TS9001: bad {match.group(1)}.")
        if "USES_API" in text and broken:
            lines.append(f"{path.name}({number},1): error TS9003: api broken.")
print("\\n".join(lines))
sys.exit(2 if lines else 0)
'''

DEST = {
    "clean.ts": "// nuestro comentario\nexport const a = 1\n",
    "own.ts": "export const b = 2\n",
    "provider.ts": "export const api = 1\n",
    "consumer.ts": "import { api } from './provider' // USES_API\n",
    "alias.ts": "import x from '@thyrox/config'\n",
    "same.ts": "export const s = 1\n",
    "fixes.ts": "export const f = BAD7\n",
}
SOURCE = {
    "clean.ts": "// source comment\nexport const a = 1\n",
    "own.ts": "export const b = BAD2\n",
    "provider.ts": "export const api = 1 // BROKEN_API\n",
    "alias.ts": "import x from '@claude-code-how-works/config'\nexport const y = 2\n",
    "same.ts": "export const s = 1\n",
    "fixes.ts": "export const f = 7\n",
}
FILES = ["clean.ts", "own.ts", "provider.ts", "alias.ts", "same.ts", "fixes.ts"]


def fixture(base: Path) -> tuple[Path, Path, list[str]]:
    dest, source = base / "dest", base / "source"
    dest.mkdir()
    source.mkdir()
    for name, text in DEST.items():
        (dest / name).write_text(text)
    for name, text in SOURCE.items():
        (source / name).write_text(text)
    (base / "fake_tsc.py").write_text(FAKE_TSC)
    return dest, source, [sys.executable, str(base / "fake_tsc.py"), str(dest)]


def before(command: list[str], dest: Path) -> list[str]:
    return step.run_tsc(dest, command, dest.parent / "before.log")


print("test_source_copy_step:")

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    dest, source, tsc = fixture(base)
    ledger = base / "copy-ledger.jsonl"
    report = step.run_copy_step(dest, source, FILES, before(tsc, dest), tsc, ledger, base / "bench",
                                rewrites=[("@claude-code-how-works/", "@thyrox/")], batch=10)
    outcomes = {row["file"]: row["outcome"] for row in map(json.loads, ledger.read_text().splitlines())}
    assert_equal("la copia limpia queda", SOURCE["clean.ts"], (dest / "clean.ts").read_text())
    assert_equal("la que rompe su archivo se revierte", DEST["own.ts"], (dest / "own.ts").read_text())
    assert_equal("la que rompe a un consumidor se revierte", DEST["provider.ts"],
                 (dest / "provider.ts").read_text())
    assert_equal("el alias de la fuente se reescribe",
                 "import x from '@thyrox/config'\nexport const y = 2\n", (dest / "alias.ts").read_text())
    assert_equal("la copia que quita un diagnóstico previo queda", SOURCE["fixes.ts"],
                 (dest / "fixes.ts").read_text())
    assert_equal("el registro lleva un veredicto por archivo", {
        "clean.ts": "copied", "own.ts": "rejected-own", "provider.ts": "rejected-consumer",
        "alias.ts": "copied", "same.ts": "identical", "fixes.ts": "copied",
    }, outcomes)
    assert_equal("el total final no sube", True, report["total_final"] <= report["total_before"])
    assert_equal("el log final queda en el banco", True, (base / "bench" / "final.log").exists())
    final = (base / "bench" / "final.log").read_text()
    assert_equal("el log final no trae el diagnóstico del consumidor", False, "TS9003" in final)

    again = step.run_copy_step(dest, source, FILES, final.splitlines(), tsc, ledger, base / "bench2",
                               rewrites=[("@claude-code-how-works/", "@thyrox/")], batch=10)
    assert_equal("lo ya decidido no se vuelve a decidir", [], again["decided"])

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    dest, source, _ = fixture(base)
    silent = [sys.executable, "-c", "import sys; sys.exit(3)"]
    try:
        step.run_tsc(dest, silent, base / "x.log")
        broke = False
    except RuntimeError:
        broke = True
    assert_equal("un tsc que sale distinto de 0 sin diagnósticos es una medición rota", True, broke)

print(f"\n{passed} ok, {failed} fallos")
sys.exit(1 if failed else 0)
