"""Gate de ``Stop``: bloquea el turno si queda trabajo sin publicar.

Compone dos piezas que no se conocen entre sí — ``repo.pending_work`` consulta
a git y ``hooks.stop_gate`` traduce el resultado a veredicto. Vive aquí y no en
``repo/`` a propósito: **esto** es lo que hace de la consulta un hook, y
``repo/`` no tiene por qué saber que existe un ``Stop``.

Es el primer consumidor del motor **invocable** de ``stop_gate``: no hay guion
externo al que llamar, el barrido corre dentro. Por eso el CLI no puede recibir
un ``--engine`` como los otros dos gates: recibe las **raíces**, las
**etiquetas** de la prosa y el **motivo**, que son los tres parámetros de este
consumidor (DEC-04).

Qué NO decide este módulo
--------------------------

De dónde salen las raíces. El consumidor las pasa; en kaupamex las declara
``reach_roots``, y ése es exactamente el acoplamiento que el porte rompe — el
guion original las resolvía él mismo y con eso dependía de dónde estén hoy los
clones.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# El módulo se importa como ``hooks.stop_pending_work`` (con ``src`` en la
# ruta) y también se ejecuta como guion —así lo invoca el stub—, donde
# ``sys.path[0]`` es ``src/hooks`` y ``hooks`` no resolvería.
if __package__ in (None, ""):  # sólo en invocación directa
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hooks.stop_gate import Gate  # noqa: E402
from repo.pending_work import FIELDS  # noqa: E402
from repo.pending_work import engine as pending_engine  # noqa: E402


def parse_labels(pairs: list[str]) -> dict[str, str]:
    """``dirty=sin commitear`` → ``{"dirty": "sin commitear"}``.

    Una pareja sin ``=`` **rehúsa**: aceptarla dejaría el eje sin etiqueta y el
    motivo saldría a medias, que es peor que no salir.
    """
    labels: dict[str, str] = {}
    for pair in pairs:
        field, sep, text = pair.partition("=")
        if not sep or not field or not text:
            raise ValueError(
                f"la etiqueta '{pair}' no tiene la forma <eje>=<texto>.\n"
                f"  Los ejes son {', '.join(FIELDS)}."
            )
        labels[field] = text
    return labels


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Gate de Stop: bloquea si queda trabajo sin publicar.")
    parser.add_argument("--root", action="append", default=[],
                        help="una raíz de repo; repetible")
    parser.add_argument("--label", action="append", default=[],
                        help=f"<eje>=<texto>, uno por cada uno de {FIELDS}")
    parser.add_argument("--reason", required=True,
                        help="el motivo del bloqueo; puede llevar {output}")
    args = parser.parse_args(argv)

    try:
        labels = parse_labels(args.label)
    except ValueError as err:
        # NO se emite `{}`: un objeto vacío se lee como «nada pendiente», y lo
        # que hay es una declaración mal escrita.
        print(f"stop_pending_work: {err}", file=sys.stderr)
        return 2

    gate = Gate(engine=pending_engine(args.root, labels),
                reason=args.reason, block_on_output=True)

    payload = ""
    try:
        payload = sys.stdin.read()
    except (OSError, ValueError):
        pass

    print(json.dumps(gate.run(payload)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
