#!/usr/bin/env python3
"""Qué tan comprimible es un archivo, y qué NO dice su entropía.

Mide dos cosas distintas sobre el mismo archivo y las publica por separado,
porque confundirlas es el defecto que origina este modulo:

``bits_per_byte``  la entropia de Shannon de **orden cero** — la distribucion
                   de bytes, sin mirar su orden.
``gzip_ratio``     lo que un compresor real logra, medido ejecutandolo.

Por qué van separadas, y no una derivada de la otra
----------------------------------------------------

H0 acota lo que puede lograr un codificador **sin memoria**: uno que asigna un
codigo a cada byte sin mirar el anterior. zlib no es uno de esos — tiene una
ventana deslizante y explota repeticion, que es estructura de orden superior.
Asi que ``n * H0 / 8`` **no es** una cota inferior de la compresion, y tratarla
como tal produce una afirmacion falsa con una cifra correcta detras.

Episodio que lo fija (2026-09-16): sobre un SQLite de 10.58 MiB, H0 = 5.2578
bits/byte dio un derivado de 6.95 MiB rotulado «cota inferior teorica».
``gzip -9`` entrego **2.41 MiB** — 2.9x por debajo de esa supuesta cota. La
cifra era correcta; el rotulo, no. Por eso la salida de este modulo nombra el
alcance de H0 en la misma linea que su valor, y su control positivo prohibe
que la palabra «cota inferior» aparezca.

Para qué sirve H0 entonces
---------------------------

Para lo contrario de una cota: **descartar incompresibilidad**. Un H0 cercano
a 8 sobre un archivo grande dice que la distribucion de bytes ya es plana —
cifrado, comprimido o aleatorio— y que no hay nada que ganar. Un H0 bajo dice
que hay redundancia de primer orden; cuanta se recupere lo decide el compresor,
que es la otra cifra.
"""
from __future__ import annotations

import argparse
import collections
import dataclasses
import gzip
import math
import pathlib
import sys

REFUSAL = 2
GZIP_LEVEL = 9


@dataclasses.dataclass(frozen=True)
class Compressibility:
    """Las dos medidas de un archivo, sin derivar una de la otra."""

    path: pathlib.Path
    size_bytes: int
    bits_per_byte: float
    gzip_bytes: int

    @property
    def gzip_ratio(self) -> float:
        """Fraccion del original que queda tras comprimir. Menor es mejor."""
        return self.gzip_bytes / self.size_bytes if self.size_bytes else 0.0

    @property
    def memoryless_bytes(self) -> float:
        """Lo que lograria un codificador SIN memoria. NO es cota de zlib."""
        return self.size_bytes * self.bits_per_byte / 8


def shannon_bits(payload: bytes) -> float:
    """Entropia de orden cero, en bits por byte. Vacio da 0."""
    if not payload:
        return 0.0
    total = len(payload)
    counts = collections.Counter(payload)
    return -sum((n / total) * math.log2(n / total) for n in counts.values())


def measure(path: pathlib.Path) -> Compressibility:
    """Lee el archivo una vez y produce las dos medidas."""
    payload = path.read_bytes()
    return Compressibility(
        path=path,
        size_bytes=len(payload),
        bits_per_byte=shannon_bits(payload),
        gzip_bytes=len(gzip.compress(payload, GZIP_LEVEL)),
    )


def _mib(value: float) -> str:
    return f"{value / 1048576:.2f} MiB"


def report(measured: Compressibility) -> str:
    return "\n".join([
        f"compresibilidad de «{measured.path.name}»",
        f"  tamaño           {_mib(measured.size_bytes)}",
        f"  H0               {measured.bits_per_byte:.4f} bits/byte de 8"
        "   (acota un codificador SIN memoria, no a zlib)",
        f"  gzip -{GZIP_LEVEL} real      {_mib(measured.gzip_bytes)}"
        f"   ratio {measured.gzip_ratio:.4f}",
        f"  un codificador sin memoria daria {_mib(measured.memoryless_bytes)}"
        f" — gzip {'lo bate' if measured.gzip_bytes < measured.memoryless_bytes else 'no lo alcanza'},"
        " porque explota estructura de orden superior",
    ])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("path", help="archivo a medir")
    args = parser.parse_args(argv)

    path = pathlib.Path(args.path)
    if not path.is_file():
        # Rehusa sin cifra: un «H0 = 0» aqui no distinguiria un archivo plano
        # de un archivo ausente.
        print(f"ERROR — «{path}» no es un archivo legible; no se emite medida.",
              file=sys.stderr)
        return REFUSAL

    print(report(measure(path)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
