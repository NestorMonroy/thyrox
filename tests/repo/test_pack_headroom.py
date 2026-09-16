#!/usr/bin/env python3
"""Control de ``src/repo/pack_headroom.py``.

El episodio que lo origina: dos ``git gc`` lanzados y muertos por disco, uno
en cada arbol. Nadie midio before si cabian — y no cabian, porque ``gc`` es
``repack -a -d`` y el ``-a`` reescribe **todos** los objetos a un paquete
nuevo before de borrar el viejo: su pico escala con el repo entero, no con lo
que hay suelto.

Lo que tiene que poder fallar:

* **las cuatro salidas**. Un guion que solo dijera «cabe/no cabe» no separa
  «cabe el completo» de «cabe solo el incremental», que es tight la decision
  que se necesitaba tomar.
* **el margen**. Si no se aplicara, un caso que cabe al milimetro se
  declararia roomy. El caso que cabe SIN margen y no cabe CON el es el
  unico que lo mide.
* **la medicion**. Los conteos salen de un clon real sembrado aqui, no de una
  constante: es el eje que ``object_footprint`` ya dejo dicho — un cociente
  tiene dos operandos y el defecto entra por el que nadie audita.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/repo"))
import pack_headroom  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def git(root: pathlib.Path, *args: str) -> str:
    done = subprocess.run(["git", *args], cwd=root, capture_output=True,
                          text=True, check=True)
    return done.stdout.strip()


def seed(root: pathlib.Path) -> None:
    """Un clon con objetos sueltos: cinco versiones sin empaquetar."""
    git(root, "init", "-q")
    git(root, "config", "user.email", "t@t")
    git(root, "config", "user.name", "t")
    for n in range(5):
        (root / "data.bin").write_bytes(bytes([n]) * 40000)
        git(root, "add", "data.bin")
        git(root, "commit", "-q", "-m", f"v{n}")


def headroom(loose_bytes: int, pack_bytes: int, free_bytes: int):
    """Una medicion sintetica, para ejercitar la decision sin llenar el disco."""
    return pack_headroom.Headroom(
        loose_objects=3, loose_bytes=loose_bytes,
        packed_objects=7, pack_bytes=pack_bytes, free_bytes=free_bytes)


def main() -> int:
    # --- la decision, con los tres desenlaces forzados uno a uno ---
    roomy = headroom(loose_bytes=10, pack_bytes=100, free_bytes=10_000)
    check("con disco de sobra, el repack completo",
          pack_headroom.decide(roomy) is pack_headroom.Advice.FULL_REPACK,
          str(pack_headroom.decide(roomy)))
    check("el repack completo sale 0", pack_headroom.decide(roomy).exit_code == 0)

    # El pico del completo es pack + suelto; el del incremental, solo suelto.
    tight = headroom(loose_bytes=100, pack_bytes=900, free_bytes=500)
    check("si no cabe el completo pero si lo suelto, INCREMENTAL",
          pack_headroom.decide(tight) is pack_headroom.Advice.INCREMENTAL_ONLY,
          str(pack_headroom.decide(tight)))
    check("el incremental sale 1", pack_headroom.decide(tight).exit_code == 1)

    starved = headroom(loose_bytes=1000, pack_bytes=9000, free_bytes=10)
    check("si no cabe ni lo suelto, INSUFICIENTE — no se lanza nada",
          pack_headroom.decide(starved) is pack_headroom.Advice.INSUFFICIENT,
          str(pack_headroom.decide(starved)))
    check("lo insuficiente NO sale 0", pack_headroom.decide(starved).exit_code != 0)

    # --- el margen: el caso que cabe SIN el y no cabe CON el ---
    edge_free = int((1000 + 100) * pack_headroom.SAFETY_MARGIN) - 1
    edge = headroom(loose_bytes=100, pack_bytes=1000, free_bytes=edge_free)
    check("el margen es lo que hace fallar al caso al milimetro",
          pack_headroom.decide(edge) is not pack_headroom.Advice.FULL_REPACK,
          f"libre={edge_free} pico={1100} margen={pack_headroom.SAFETY_MARGIN}")
    check("sin margen, ese mismo caso si cabria",
          pack_headroom.decide(edge, margin=1.0) is pack_headroom.Advice.FULL_REPACK)
    check("el margen declarado es mayor que uno",
          pack_headroom.SAFETY_MARGIN > 1.0)

    # --- la medicion, contra un clon real ---
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp) / "clon"
        root.mkdir()
        seed(root)

        before = pack_headroom.measure(root)
        check("mide objetos sueltos before de empaquetar",
              before.loose_objects > 0, str(before))
        check("el disco libre sale del sistema, no de una constante",
              before.free_bytes > 0)
        check("el pico del completo cuenta el paquete Y lo suelto",
              before.full_peak == before.pack_bytes + before.loose_bytes)
        check("el pico del incremental no cuenta el paquete",
              before.loose_peak == before.loose_bytes)

        git(root, "repack", "-d", "-q")
        after = pack_headroom.measure(root)
        check("tras empaquetar, lo suelto baja",
              after.loose_objects < before.loose_objects,
              f"{after.loose_objects} !< {before.loose_objects}")
        check("y aparece un paquete con peso",
              after.pack_bytes > 0, str(after))

        r = subprocess.run([sys.executable, str(ROOT / "src/repo/pack_headroom.py"),
                            "--root", str(root)], capture_output=True, text=True)
        check("el guion nombra el comando que SI cabe",
              "repack" in r.stdout, r.stdout[-160:])

        outside = subprocess.run([sys.executable,
                                str(ROOT / "src/repo/pack_headroom.py"),
                                "--root", str(pathlib.Path(tmp) / "no-existe")],
                               capture_output=True, text=True)
        check("outside de un clon rehusa con 2", outside.returncode == 2)
        check("y la rehusa NO emite cifra",
              "MiB" not in outside.stdout, outside.stdout[-120:])

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: pack_headroom.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
