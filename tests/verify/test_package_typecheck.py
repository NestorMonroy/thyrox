#!/usr/bin/env python3
"""Contrato del gate por paquete y de las piezas puras que lo sostienen.

No invoca `tsc`: cada medicion real cuesta ~28 s y los 43 paquetes son varios
minutos. Lo que se ejercita aqui son las decisiones que el gate toma ANTES y
DESPUES de medir —que son donde estaban los defectos— y sus dos caminos de
rehusa. La medicion contra el arbol real la hace el propio gate al correrse.
"""
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "src"))

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


def main():
    from verify import check_package_typecheck as gate
    from typescript import emit_declarations as mod

    # --- el reparto por dueño -------------------------------------------------
    #
    # Las DOS formas de ruta que el arbol real produce. 26 paquetes llevan
    # `node_modules/@thyrox` propio y 17 resuelven por la raiz del workspace:
    # los primeros salen como `node_modules/...` y los segundos con `..`
    # delante. Un clasificador por prefijo lee los segundos como PROPIOS.
    paquete = "/tmp/arbol/src/packages/consume"
    salida = "\n".join([
        "src/index.ts(1,14): error TS2322: propio",
        "node_modules/@thyrox/x/src/a.ts(2,1): error TS2322: hermano con enlace propio",
        "../../../node_modules/@thyrox/y/src/b.ts(3,1): error TS2322: hermano por la raiz",
        "../../paths/docs.ts(4,1): error TS2322: escapa del paquete",
        "error TS5083: un error de proyecto, sin archivo que lo ubique",
    ])
    cubos = mod.classify_errors(salida, paquete)
    check("el propio se atribuye al paquete", 1, cubos["own"])
    check("las DOS formas de hermano se atribuyen al hermano", 2, cubos["sibling"])
    check("el import que sale del paquete tiene cubo propio", 1, cubos["escaped"])
    total = len(mod._ERROR_LINE.findall(salida))
    check("y el error sin archivo no cae en ningun cubo", 1, total - sum(cubos.values()))

    # --- SIN MEDIR: dos codigos que dejan el conteo semantico en cero ---------
    check("TS18003 declara que no se pudo medir",
          "TS18003", mod.unmeasurable_reason("error TS18003: No inputs were found"))
    check("TS2688 tambien",
          "TS2688", mod.unmeasurable_reason("error TS2688: Cannot find type definition"))
    check("y un error de tipo normal NO lo declara",
          None, mod.unmeasurable_reason("src/a.ts(1,1): error TS2322: nope"))
    sin_medir = mod.EmitResult("p", False, 1, "error TS18003: No inputs were found",
                               checked=True)
    check("el veredicto de un paquete sin medir lo dice",
          True, "SIN MEDIR" in sin_medir.verdict())

    # --- la superficie declarada: main NO es la unica fuente -------------------
    #
    # `plan` no declara `main` ni `types`. Su superficie entera vive en
    # `exports`, y la version anterior caia al default `./index.ts`.
    solo_exports = {"exports": {"./mode": "./src/mode.ts", "./*": "./src/*.ts"}}
    check("los destinos salen tambien de exports",
          ["./src/mode.ts", "./src/*.ts"], mod.export_targets(solo_exports))
    condiciones = {"main": "./index.ts",
                   "exports": {".": {"types": "./dist/i.d.ts", "default": "./src/i.ts"}}}
    check("y de un exports con condiciones, en las dos ramas",
          ["./index.ts", "./dist/i.d.ts", "./src/i.ts"], mod.export_targets(condiciones))

    # --- el baseline ----------------------------------------------------------
    check("un baseline ausente no revienta: da el mapa vacio",
          {}, gate.read_baseline(Path("/nonexistent/baseline.txt")))

    # --- las dos rehusas ------------------------------------------------------
    #
    # LAS QUE DISCRIMINAN. Un gate que saliera 0 en cualquiera de las dos
    # publicaria un verde que no distingue «no hay errores» de «no pude medir».
    entorno = dict(os.environ, PYTHONPATH=str(ROOT / "src"))
    guion = str(ROOT / "src" / "verify" / "check_package_typecheck.py")

    vacio = ROOT / ".claude" / "jobs" / "_sin_bunx"
    vacio.mkdir(parents=True, exist_ok=True)
    corrida = subprocess.run([sys.executable, guion, "plan"], capture_output=True,
                             text=True, env=dict(entorno, PATH=str(vacio)))
    check("sin bunx rehusa con 2", 2, corrida.returncode)
    check("y NO emite un conteo", False, "error(es) propio(s)" in corrida.stdout)
    vacio.rmdir()

    corrida = subprocess.run(
        [sys.executable, guion, "--strict", "--baseline", "/nonexistent/b.txt", "plan"],
        capture_output=True, text=True, env=entorno)
    check("--strict sin baseline rehusa con 2", 2, corrida.returncode)
    check("y nombra como congelarlo",
          True, "--write-baseline" in corrida.stderr)

    print(f"\ntest_package_typecheck: {ok_count} ok, {fail_count} falla")
    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
