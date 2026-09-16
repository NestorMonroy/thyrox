#!/usr/bin/env python3
"""Control de ``src/lib/compressibility.py``.

El sujeto del modulo es **cualquier secuencia de bytes**, asi que el control
lo ejercita por esa superficie —bytes en memoria, un sample, stdin— y no solo
por la que el episodio de origen necesitaba.

Lo que tiene que poder fallar:

* **el rotulo**. H0 acota un codificador SIN memoria. Una cifra correcta con
  rotulo falso pasa cualquier gate que verifique numeros, asi que la palabra
  esta prohibida en la output, no solo en la prosa.
* **los dos extremos**. Un byte repetido da H0 = 0; los 256 valores
  equiprobables dan H0 = 8. Si el calculo se rompe, uno de los dos se mueve.
* **la razon medida contra la derivada**. `gzip_ratio` sale de comprimir;
  `memoryless_ratio` sale de H0. Un sample flat las separa por mucho, y esa
  separacion ES el fenomeno que el rotulo describia mal.
* **las tres puertas de entrada coinciden**. Medir un sample y medir sus
  bytes tiene que dar lo mismo, o la comodidad estaria midiendo otra cosa.
* **la rehusa**. Un sample que no existe no produce «entropia 0».
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/lib"))
import compressibility  # noqa: E402

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
    script = str(ROOT / "src/lib/compressibility.py")

    # --- los dos extremos, sobre bytes en memoria ---
    flat = compressibility.measure(b"\x00" * 4096, label="flat")
    check("un solo byte repetido da H0 = 0",
          flat.bits_per_byte == 0.0, str(flat.bits_per_byte))

    uniform = compressibility.measure(bytes(range(256)) * 16, label="uniform")
    check("256 valores equiprobables dan H0 = 8",
          abs(uniform.bits_per_byte - 8.0) < 1e-9, str(uniform.bits_per_byte))

    # --- la razon medida NO se deriva de la entropia ---
    text = compressibility.measure(b"la misma frase repetida. " * 400)
    check("la razon de gzip sale de comprimir, no de H0",
          text.gzip_ratio != text.memoryless_ratio,
          f"{text.gzip_ratio} vs {text.memoryless_ratio}")
    check("y zlib bate por mucho lo que lograria un codificador sin memoria",
          text.gzip_bytes < text.memoryless_bytes / 2,
          f"gzip={text.gzip_bytes} sin_memoria={text.memoryless_bytes:.0f}")

    # --- el rotulo, que es el defecto que origina el modulo ---
    output = compressibility.report(text).lower()
    check("la output NO dice «cota inferior»", "cota inferior" not in output,
          output)
    check("la output NO dice «lower bound»", "lower bound" not in output, output)
    check("la output SI declara «sin memoria»", "sin memoria" in output, output)
    check("y publica la razon de gzip medida", "gzip" in output, output)

    # --- las tres puertas de entrada miden lo mismo ---
    with tempfile.TemporaryDirectory() as tmp:
        payload = bytes(range(256)) * 64 + b"repetido " * 200
        sample = pathlib.Path(tmp) / "muestra.bin"
        sample.write_bytes(payload)

        from_bytes = compressibility.measure(payload)
        from_file = compressibility.measure_file(sample)
        check("medir el sample coincide con medir sus bytes",
              (from_file.bits_per_byte == from_bytes.bits_per_byte
               and from_file.gzip_bytes == from_bytes.gzip_bytes),
              f"{from_file} vs {from_bytes}")
        check("y el sample se etiqueta con su ruta",
              from_file.label == str(sample), from_file.label)

        via_stdin = subprocess.run([sys.executable, script, "-"],
                                   input=payload, capture_output=True)
        check("stdin es una puerta de entrada, no solo las rutas",
              via_stdin.returncode == 0 and b"stdin" in via_stdin.stdout,
              via_stdin.stdout[-160:].decode(errors="replace"))

        twice = subprocess.run([sys.executable, script,
                                 str(sample), str(sample)],
                                capture_output=True, text=True)
        check("y admite twice rutas en una invocacion",
              twice.stdout.count("compresibilidad de") == 2,
              twice.stdout[-160:])

        # --- el nivel es un parametro, no una constante escondida ---
        fast = compressibility.measure(payload, level=1)
        check("el nivel de gzip cambia el resultado medido",
              fast.gzip_bytes != from_bytes.gzip_bytes,
              f"{fast.gzip_bytes} == {from_bytes.gzip_bytes}")

        # --- la rehusa ---
        missing = subprocess.run([sys.executable, script,
                                  str(pathlib.Path(tmp) / "no-existe")],
                                 capture_output=True, text=True)
        check("un sample missing rehusa con 2", missing.returncode == 2)
        check("y la rehusa NO emite entropia",
              "H0" not in missing.stdout, missing.stdout[-120:])

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: compressibility.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
