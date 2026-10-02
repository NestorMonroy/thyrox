#!/usr/bin/env python3
"""Doble del runtime de Transformers para las pruebas del adapter (TASK-THYROX-0776).

    fake_transformers_runtime.py <snapshot>

Sirve el servidor REAL (`transformers_runtime_server.py`) sobre `<snapshot>` con un
backend que devuelve cada entrada con el prefijo `es:`, en un puerto libre de
loopback, e imprime `url=<base>` cuando escucha. Así la prueba del adapter ejercita
el contrato real de la API; sólo el modelo es un doble.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "transformers-runtime"))

from transformers_runtime_server import TransformersRuntime, serve  # noqa: E402


class EchoBackend:
    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def generate(self, inputs: list[str], max_new_tokens: int) -> list[str]:
        return [f"es:{text}" for text in inputs]


def main() -> None:
    server = serve(TransformersRuntime(Path(sys.argv[1]), EchoBackend), port=0)
    print(f"url=http://127.0.0.1:{server.server_address[1]}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
