"""Una señal de la memoria que acepta TODOS los diagnósticos de su código no
discrimina causa, y no puede gobernar el gate 4.

Medido sobre la corrida 20260924T175031 (paso 146): 131 patrones con
instancias vivas sobre 54 archivos, y buena parte de sus señales eran el
código más el texto fijo que el compilador pone a ese código
(``TS2769: No overload matches this call``). Barrerlas manda aplicar un
arreglo a archivos cuya causa es otra.

El criterio es el control del sub-patrón D aplicado a la señal: discrimina si
RECHAZA al menos un diagnóstico de su mismo código en el log. Con una
población pequeña, «acepta todos» también lo cumple una señal precisa: por eso
hay umbral de instancias y de archivos, y por debajo el patrón queda abierto.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from verify import tsc_reflect, tsc_sweep  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
passed = failed = 0


def check(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


LOG = [
    "src/a.ts(1,1): error TS2769: No overload matches this call.",
    "src/a.ts(2,1): error TS2769: No overload matches this call.",
    "src/b.ts(1,1): error TS2769: No overload matches this call.",
    "src/b.ts(3,1): error TS2769: No overload matches this call.",
    "src/c.ts(1,1): error TS2769: No overload matches this call.",
    "src/c.ts(4,1): error TS2769: No overload matches this call.",
    "src/d.ts(1,1): error TS2677: A type predicate's type must be assignable to its parameter's type.",
    "src/d.ts(2,1): error TS2677: A type predicate's type must be assignable to its parameter's type.",
    "src/e.ts(1,1): error TS2345: Argument of type 'Foo' is not assignable to parameter of type 'Bar'.",
    "src/f.ts(1,1): error TS2345: Argument of type 'Baz' is not assignable to parameter of type 'Qux'.",
    "src/g.ts(1,1): error TS2345: Argument of type 'Foo' is not assignable to parameter of type 'Bar'.",
    "src/h.ts(1,1): error TS2345: Argument of type 'Zip' is not assignable to parameter of type 'Zap'.",
    "src/i.ts(1,1): error TS2345: Argument of type 'Zip' is not assignable to parameter of type 'Zap'.",
    "src/j.ts(1,1): error TS2345: Argument of type 'Foo' is not assignable to parameter of type 'Bar'.",
    "src/k.ts(1,1): error TS2345: Argument of type 'Foo' is not assignable to parameter of type 'Bar'.",
    "src/x.ts(1,1): error TS2551: Property 'a' does not exist on type 'T'. Did you mean 'b'?",
    "src/y.ts(1,1): error TS2551: Property 'a' does not exist on type 'T'. Did you mean 'b'?",
    "src/z.ts(1,1): error TS2551: Property 'a' does not exist on type 'T'. Did you mean 'b'?",
]

with tempfile.TemporaryDirectory() as directory:
    run = Path(directory)
    for name, signal in {
        "overload-generic": r"TS2769: No overload matches this call",
        "predicate-small": r"TS2677",
        "foo-to-bar": r"TS2345: Argument of type 'Foo'",
        "already-closed": r"TS2769",
        "foo-or-zip": r"TS2345: Argument of type '(Foo|Zip)'",
        "did-you-mean-few": r"TS2551",
    }.items():
        tsc_sweep.add_pattern(run, {"name": name, "signal": signal, "fix": "x"})
    tsc_sweep.close_pattern(run, "already-closed", "cerrado antes")

    broad = tsc_sweep.undiscriminating(run, LOG)
    check("la señal que acepta los 6 TS2769 de 3 archivos no discrimina", True,
          "overload-generic" in broad)
    check("la que rechaza parte de sus TS2345 sí discrimina", False, "foo-to-bar" in broad)
    check("pasa los umbrales (6 en 6 archivos) y rechaza 1 de 7: discrimina", False,
          "foo-or-zip" in broad)
    check("3 instancias en 3 archivos no bastan para decidir: queda abierta", False,
          "did-you-mean-few" in broad)
    check("con 2 instancias en 1 archivo no se puede decidir: queda abierta", False,
          "predicate-small" in broad)
    check("un patrón ya cerrado no se vuelve a evaluar", False, "already-closed" in broad)
    check("publica población y archivos de la decisión", {"matched": 6, "population": 6, "files": 3},
          broad.get("overload-generic"))

    log_file = run / "before.log"
    log_file.write_text("\n".join(LOG) + "\n")
    out = subprocess.run([sys.executable, "-m", "verify.tsc_sweep", "close-broad", "--run", str(run),
                          "--log", str(log_file), "--step", "step-146"],
                         capture_output=True, text=True, cwd=ROOT,
                         env={"PYTHONPATH": str(ROOT / "src"), "PATH": "/usr/bin:/bin"})
    check("close-broad sale 0", 0, out.returncode)
    row = tsc_sweep.load_patterns(run)["overload-generic"]
    check("cierra el patrón que no discrimina", "closed", row.get("status"))
    check("y su razón cita el paso y las cifras", True,
          "step-146" in row.get("closed_reason", "") and "6 de 6" in row.get("closed_reason", ""))
    check("el que discrimina sigue abierto", None, tsc_sweep.load_patterns(run)["foo-to-bar"].get("status"))
    check("el gate 4 deja de contar el patrón cerrado", False,
          "overload-generic" in tsc_reflect.blocking_pending(run, LOG, []))
    check("close-broad publica cuántos cerró sobre cuántos evaluó", True,
          "1 cerrado(s)" in out.stdout and "de 5 evaluado(s)" in out.stdout)

print(f"test_tsc_sweep_breadth: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
