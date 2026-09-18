#!/usr/bin/env python3
"""Cuanto se deja comprimir un payload, y que se puede concluir de eso.

El sujeto es **cualquier secuencia de bytes**: un archivo, un blob que sale de
``git cat-file``, un cuerpo de respuesta, un tramo leido de una tuberia, un
buffer en memoria. La unidad de trabajo es el payload; leer un archivo es una
comodidad encima, no la interfaz.

Que publica
------------

``bits_per_byte``     la entropia de orden cero (Shannon) de su histograma.
``gzip_bytes``        lo que zlib **de verdad** logra, medido comprimiendo.
``gzip_ratio``        la razon que de ahi sale.
``memoryless_bytes``  lo que lograria un codificador SIN memoria.

El rotulo es la parte que importa
----------------------------------

La entropia de orden cero **NO es una cota inferior de la compresion**. Acota
un codificador sin memoria — uno que trata cada byte como independiente del
anterior. zlib tiene ventana deslizante y explota estructura de orden superior,
asi que la bate de forma rutinaria.

En el episodio que origina este modulo H0 salio 5.2578 bits/byte y su derivado
—6.95 MiB— se publico como «cota inferior teorica»; ``gzip -9`` dio 2.41 MiB,
**2.9x por debajo de la supuesta cota**. La cifra era correcta y el rotulo
falso, y esa combinacion pasa cualquier gate que verifique numeros. Por eso el
control prohibe la palabra en la salida, no solo en la prosa.

Que NO hace
------------

No estima el tamaño de un archivo comprimido con OTRO codificador (zstd, xz,
brotli): cada uno tiene su propio modelo. No dice si vale la pena comprimir —
eso depende del costo de CPU y del patron de acceso, que este modulo no ve. Y
un ratio alto no implica redundancia *semantica*: un archivo cifrado y uno
aleatorio dan lo mismo y no significan lo mismo.
"""
from __future__ import annotations

import argparse
import dataclasses
import gzip
import math
import pathlib
import sys
from collections import Counter

DEFAULT_LEVEL = 9
REFUSAL = 2
BYTE_BITS = 8


@dataclasses.dataclass(frozen=True)
class Compressibility:
    """Lo que un payload deja ver de su redundancia."""

    label: str
    size_bytes: int
    bits_per_byte: float
    gzip_bytes: int
    level: int = DEFAULT_LEVEL

    @property
    def gzip_ratio(self) -> float:
        """Medida, no derivada: sale de comprimir, no de la entropia."""
        return self.gzip_bytes / self.size_bytes if self.size_bytes else 0.0

    @property
    def memoryless_bytes(self) -> float:
        """Lo que lograria un codificador SIN memoria. NO es cota de zlib."""
        return self.size_bytes * self.bits_per_byte / BYTE_BITS

    @property
    def memoryless_ratio(self) -> float:
        return self.bits_per_byte / BYTE_BITS


def shannon_bits(payload: bytes) -> float:
    """Entropia de orden cero, en bits por byte, del histograma del payload."""
    if not payload:
        return 0.0
    total = len(payload)
    return -sum((n / total) * math.log2(n / total)
                for n in Counter(payload).values())


def measure(payload: bytes, label: str = "",
            level: int = DEFAULT_LEVEL) -> Compressibility:
    """La compresibilidad de cualquier secuencia de bytes."""
    return Compressibility(
        label=label,
        size_bytes=len(payload),
        bits_per_byte=shannon_bits(payload),
        gzip_bytes=len(gzip.compress(payload, level)),
        level=level,
    )


def measure_file(path: pathlib.Path,
                 level: int = DEFAULT_LEVEL) -> Compressibility:
    """Comodidad sobre ``measure``: lee el archivo y lo etiqueta con su ruta."""
    return measure(path.read_bytes(), label=str(path), level=level)


def _mib(value: float) -> str:
    return f"{value / 1048576:.2f} MiB"


def report(reading: Compressibility) -> str:
    return "\n".join([
        f"compresibilidad de «{reading.label or 'payload'}»",
        f"  tamaño           {_mib(reading.size_bytes)}"
        f"   ({reading.size_bytes} bytes)",
        f"  H0               {reading.bits_per_byte:.4f} bits/byte de "
        f"{BYTE_BITS}"
        "   (acota un codificador SIN memoria, no a zlib)",
        f"  sin memoria      {_mib(reading.memoryless_bytes)}"
        f"   (razon {reading.memoryless_ratio:.3f})",
        f"  gzip -{reading.level} medido   {_mib(reading.gzip_bytes)}"
        f"   (razon {reading.gzip_ratio:.3f})",
    ])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", nargs="+",
                        help="rutas a medir; «-» lee el payload de stdin")
    parser.add_argument("--level", type=int, default=DEFAULT_LEVEL,
                        help="nivel de gzip (1-9)")
    args = parser.parse_args(argv)

    readings = []
    for source in args.source:
        if source == "-":
            readings.append(measure(sys.stdin.buffer.read(), label="stdin",
                                    level=args.level))
            continue
        path = pathlib.Path(source)
        if not path.is_file():
            # Rehusa sin cifra: publicar «entropia 0» para un archivo ausente
            # confundiria «no hay redundancia» con «no lo pude leer».
            print(f"ERROR — «{path}» no es un archivo legible; "
                  "no se emite medicion.", file=sys.stderr)
            return REFUSAL
        readings.append(measure_file(path, level=args.level))

    print("\n".join(report(r) for r in readings))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
