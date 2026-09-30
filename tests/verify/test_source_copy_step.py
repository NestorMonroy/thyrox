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
broken = {m for p in files for m in re.findall(r"BROKEN_API(\\d*)", p.read_text())}
lines = []
for path in files:
    for number, text in enumerate(path.read_text().splitlines(), 1):
        for match in re.finditer(r"BAD(\\d+)", text):
            lines.append(f"{path.name}({number},1): error TS9001: bad {match.group(1)}.")
        if any(m in broken for m in re.findall(r"USES_API(\\d*)", text)):
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
    # batch + confirm (tras revertir lo propio) + imports: sin bisección.
    assert_equal("el grafo de imports culpa sin bisecar", 3, report["tsc_runs"])

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

# Dos culpables: uno importado directo por su consumidor y otro que rompe a
# un consumidor a través de un módulo no copiado. El grafo de imports explica
# el primero; sólo el segundo se biseca, y las inocentes quedan.
TWO_DEST = {
    "p1.ts": "export const q = 1\n", "p2.ts": "export const q = 2\n",
    "mid.ts": "import { q } from './p2.js'\n",
    "c1.ts": "import { q } from './p1.js' // USES_API1\n",
    "c2.ts": "import { m } from './mid.js' // USES_API2\n",
    "a.ts": "export const a = 1\n", "b.ts": "export const b = 1\n", "index.ts": "export {}\n",
    "c3.ts": "import '@pkg/index.js'\n",
}
TWO_SOURCE = {
    "p1.ts": "export const q = 1 // BROKEN_API1\n", "p2.ts": "export const q = 2 // BROKEN_API2\n",
    "a.ts": "export const a = 10\n", "b.ts": "export const b = 10\n", "index.ts": "export {} // x\n",
}
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    dest, source = base / "dest", base / "source"
    dest.mkdir(); source.mkdir()
    for name, text in TWO_DEST.items():
        (dest / name).write_text(text)
    for name, text in TWO_SOURCE.items():
        (source / name).write_text(text)
    (base / "fake_tsc.py").write_text(FAKE_TSC)
    tsc = [sys.executable, str(base / "fake_tsc.py"), str(dest)]
    ledger = base / "ledger.jsonl"
    report = step.run_copy_step(dest, source, sorted(TWO_SOURCE), before(tsc, dest), tsc, ledger,
                                base / "bench", rewrites=[], batch=10)
    assert_equal("dos culpables: cada uno rechazado y las inocentes copiadas", {
        "p1.ts": "rejected-consumer", "p2.ts": "rejected-consumer",
        "a.ts": "copied", "b.ts": "copied", "index.ts": "copied",
    }, report["outcomes"])
    assert_equal("el import de `index` no culpa por el nombre", set(),
                 step.imported_copies(dest, {"c3.ts"}, {"index.ts"}, dest))
    (dest / "c4.ts").write_text("import { q } from './sub/p1.js'\n")
    assert_equal("un import relativo culpa a su ruta, no a la homónima", {"sub/p1.ts"},
                 step.imported_copies(dest, {"c4.ts"}, {"p1.ts", "sub/p1.ts"}, dest))
    # batch + imports (retira p1) + una pasada sobre p2, la única copia a la
    # que c2 llega por la cadena de imports + confirm.
    assert_equal("el residuo se biseca sólo entre lo alcanzable", 4, report["tsc_runs"])
    # La cadena cruza un paquete: su `exports` resuelve el subpath al archivo.
    pkg = dest / "pkg"
    (pkg / "lib").mkdir(parents=True)
    (pkg / "package.json").write_text(json.dumps({"name": "@t/pkg", "exports": {
        "./types.js": {"types": "./dist/types.d.ts", "default": "./lib/types.ts"}}}))
    (pkg / "lib" / "types.ts").write_text("export type { Q } from '../../a.js'\n")
    (dest / "c5.ts").write_text("import type { Q } from '@t/pkg/types.js'\n")
    assert_equal("la cadena de imports cruza el `exports` de un paquete", {"a.ts"},
                 step.reachable_copies(dest, {"c5.ts"}, {"a.ts", "b.ts"}, dest))

print(f"\n{passed} ok, {failed} fallos")
sys.exit(1 if failed else 0)
