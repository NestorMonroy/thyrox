#!/usr/bin/env python3
"""Control de ``src/lib/byte_entropy.py``.

Lo que tiene que poder fallar:

* **el rotulo**. La entropia de orden cero acota un codificador SIN memoria.
  En el episodio que origina este modulo se rotulo su derivado como «cota
  inferior teorica» de la compresion y ``gzip -9`` lo batio por 2.9x. El
  control exige que esa palabra no aparezca en la salida, porque una cifra
  correcta con rotulo falso pasa cualquier gate de verificacion.
* **los dos extremos**. Un archivo de un solo byte repetido tiene H0 = 0; uno
  con los 256 valores equiprobables tiene H0 = 8. Si el calculo se rompe, uno
  de los dos deja de dar su valor exacto.
* **la rehusa**. Un archivo que no existe no produce «entropia 0».
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/lib"))
import byte_entropy  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)

        flat = root / "flat.bin"
        flat.write_bytes(b"\x00" * 4096)
        uniform = root / "uniform.bin"
        uniform.write_bytes(bytes(range(256)) * 16)

        low = byte_entropy.measure(flat)
        high = byte_entropy.measure(uniform)

        check("un solo byte repetido da H0 = 0", low.bits_per_byte == 0.0,
              f"H0={low.bits_per_byte}")
        check("256 valores equiprobables dan H0 = 8",
              abs(high.bits_per_byte - 8.0) < 1e-9, f"H0={high.bits_per_byte}")
        check("H0 nunca excede 8 bits", 0 <= high.bits_per_byte <= 8)
        check("el ratio de gzip se mide, no se deriva de H0",
              0 < low.gzip_ratio < 1, f"ratio={low.gzip_ratio}")
        check("un archivo plano se comprime mucho mas que su H0 sugiere",
              low.gzip_ratio < 0.05, f"ratio={low.gzip_ratio}")

        script = str(ROOT / "src/lib/byte_entropy.py")
        r = subprocess.run([sys.executable, script, str(flat)],
                           capture_output=True, text=True)
        check("la salida NO contiene «cota inferior»",
              "cota inferior" not in r.stdout.lower(), r.stdout[-160:])
        check("la salida NO contiene «lower bound»",
              "lower bound" not in r.stdout.lower(), r.stdout[-160:])
        check("la salida declara el alcance de H0 (codificador sin memoria)",
              "sin memoria" in r.stdout.lower(), r.stdout[-160:])
        check("la salida publica el ratio real de gzip",
              "gzip" in r.stdout.lower(), r.stdout[-160:])

        r = subprocess.run([sys.executable, script, str(root / "no-existe")],
                           capture_output=True, text=True)
        check("rehusa con codigo 2 ante un archivo ausente", r.returncode == 2,
              f"rc={r.returncode}")
        check("la rehusa NO emite entropia",
              "bits" not in r.stdout.lower(), r.stdout[-120:])

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: byte_entropy.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
