#!/usr/bin/env python3
"""Control de ``src/repo/object_footprint.py``.

Lo que tiene que poder fallar, y por eso son los casos centrales:

* el **denominador medido**. El comando manual del que nace este modulo
  codificaba ``982.6`` a mano. Un cociente tiene dos operandos y el defecto se
  cuela por el que nadie audita (sub-patron D-bis). El control pide la cuota y
  comprueba que sale de contar, no de una constante.
* la **separacion suelto / empaquetado**. Es la que decide si ``repack`` tiene
  algo que hacer; colapsarla deja la cifra sin la mitad accionable.
* la **rehusa**. Un directorio que no es clon no produce «0 versiones»:
  produce codigo 2. Un cero ahi no distingue «no hay» de «no mire».
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/repo"))
import object_footprint  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def git(root: pathlib.Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, capture_output=True, check=True)


def seed(root: pathlib.Path, versions: int) -> None:
    """Un clon con ``versions`` versiones de ``data.bin`` y un archivo ajeno."""
    git(root, "init", "-q")
    git(root, "config", "user.email", "t@t")
    git(root, "config", "user.name", "t")
    (root / "otro.txt").write_text("no es el sujeto\n")
    git(root, "add", "otro.txt")
    git(root, "commit", "-q", "-m", "seed")
    for i in range(versions):
        (root / "data.bin").write_bytes(b"x" * 4096 + str(i).encode())
        git(root, "add", "data.bin")
        git(root, "commit", "-q", "-m", f"v{i}")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        seed(root, 5)

        report = object_footprint.measure(root, "data.bin")

        check("cuenta las 5 versiones del pathspec", report.versions == 5,
              f"versions={report.versions}")
        check("no cuenta el archivo ajeno",
              report.versions == 5 and report.clear_bytes > 0)
        check("el total de blobs es MAYOR que el del pathspec",
              report.total_disk_bytes > report.disk_bytes,
              f"total={report.total_disk_bytes} sujeto={report.disk_bytes}")
        check("la cuota se deriva de los dos medidos",
              abs(report.share - report.disk_bytes / report.total_disk_bytes) < 1e-9,
              f"share={report.share}")
        check("separa suelto de empaquetado",
              report.loose + report.packed == report.versions,
              f"loose={report.loose} packed={report.packed}")

        # Recien commiteado y sin empaquetar: todo suelto. Es la condicion que
        # hace que `repack -d` tenga trabajo, y la que el reporte debe exponer.
        check("sin repack previo, todas las versiones estan sueltas",
              report.loose == report.versions,
              f"loose={report.loose}")

        git(root, "repack", "-d", "-q")
        after = object_footprint.measure(root, "data.bin")
        check("tras repack -d ya no quedan sueltas del sujeto",
              after.loose == 0, f"loose={after.loose}")
        check("el repack no pierde versiones",
              after.versions == report.versions)

    with tempfile.TemporaryDirectory() as tmp:
        script = str(ROOT / "src/repo/object_footprint.py")
        r = subprocess.run([sys.executable, script, "data.bin", "--root", tmp],
                           capture_output=True, text=True)
        check("rehusa con codigo 2 fuera de un clon", r.returncode == 2,
              f"rc={r.returncode} {r.stderr[-120:]}")
        check("la rehusa NO emite conteo",
              "versiones" not in r.stdout.lower(), r.stdout[-120:])

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: object_footprint.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
