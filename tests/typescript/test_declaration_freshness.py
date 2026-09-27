#!/usr/bin/env python3
"""Frescura del build de un paquete: ¿su ``dist/`` corresponde a su fuente?

El defecto que cierra: el consumidor tipa contra ``dist/*.d.ts`` (la
condición ``types`` de ``exports``), y nada decía si ese ``dist/`` estaba
viejo. Medido el 2026-09-27: ``app-host`` falló con TS2305 porque el
``platform.d.ts`` de ``config`` no traía ``primePlatform``, que la fuente ya
exportaba. ``check_exports_types`` declara esa ceguera («un ``dist/`` viejo
resuelve igual»), y el único arreglo era reconstruir los 48.

El mecanismo: al emitir con éxito, el emisor deja en ``dist/`` la huella de lo
que compiló (``source_digest``). Un paquete está viejo si la huella falta o
no coincide. ``--list-stale`` publica los viejos, uno por línea, para que el
pool los construya en paralelo.

Controles de anulación, medidos: una huella que incluya las pruebas cae el
caso 3 y nada más; un ``is_stale`` que sólo mire la existencia de ``dist/``
cae los casos 1, 2 y 4 —los tres que exigen distinguir un ``dist/`` presente
de uno que corresponde a su fuente— y deja en pie el 3 y el 5.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from typescript import emit_declarations as ed

ok_count = 0
fail_count = 0


def check(label, expected, seen):
    global ok_count, fail_count
    if expected == seen:
        ok_count += 1
        print(f"  ok   {label}")
    else:
        fail_count += 1
        print(f"  FALLO {label}\n       esperado: {expected!r}\n       obtenido: {seen!r}")


def package(root: Path) -> Path:
    pkg = root / "src" / "packages" / "demo"
    (pkg / "src").mkdir(parents=True)
    (pkg / "package.json").write_text('{"name":"@thyrox/demo","exports":{".":"./src/index.ts"}}\n')
    (pkg / "tsconfig.build.json").write_text('{"compilerOptions":{}}\n')
    (pkg / "src" / "index.ts").write_text("export const a = 1\n")
    (pkg / "dist").mkdir()
    (pkg / "dist" / "index.d.ts").write_text("export declare const a = 1;\n")
    return pkg


with tempfile.TemporaryDirectory() as tmp:
    pkg = package(Path(tmp))

    print("\n1. sin huella, el dist/ no se sabe fresco: viejo")
    check("viejo", True, ed.is_stale(pkg))

    print("\n2. con la huella de su fuente, fresco; al cambiar la fuente, viejo")
    ed.write_digest(pkg)
    check("fresco tras sellar", False, ed.is_stale(pkg))
    (pkg / "src" / "index.ts").write_text("export const a = 2\n")
    check("viejo tras cambiar la fuente", True, ed.is_stale(pkg))

    print("\n3. una prueba no cambia la declaración: sigue fresco")
    ed.write_digest(pkg)
    (pkg / "src" / "__tests__").mkdir()
    (pkg / "src" / "__tests__" / "x.test.ts").write_text("test('x', () => {})\n")
    (pkg / "src" / "index.test.ts").write_text("// prueba\n")
    check("fresco con pruebas nuevas", False, ed.is_stale(pkg))

    print("\n4. el tsconfig del build también es entrada")
    (pkg / "tsconfig.build.json").write_text('{"compilerOptions":{"strict":true}}\n')
    check("viejo tras cambiar el tsconfig", True, ed.is_stale(pkg))

    print("\n5. --list-stale publica sólo los viejos, sin emitir")
    ed.write_digest(pkg)
    other = pkg.parent / "other"
    (other / "src").mkdir(parents=True)
    (other / "package.json").write_text('{"name":"@thyrox/other","exports":{".":"./src/index.ts"}}\n')
    (other / "src" / "index.ts").write_text("export const b = 1\n")
    import contextlib
    import io
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = ed.main(["--list-stale", "--root", tmp])
    check("sale 0", 0, code)
    check("sólo el viejo", ["other"], out.getvalue().split())
    check("no emitió", False, (other / "dist").exists())

print(f"\ntest_declaration_freshness: {ok_count} ok, {fail_count} falla(s)")
sys.exit(1 if fail_count else 0)
