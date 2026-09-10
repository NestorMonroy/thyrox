"""¿El servidor acertó el prefijo? — la sonda de conducta de la caché.

Lo que este módulo cierra, y por qué NO hace falta capturar la petición
------------------------------------------------------------------------

``FU-THYROX-006`` declaraba que el eje del servidor exigía «capturar dos
peticiones y difundirlas». Ese encuadre era el sub-patrón **C** de
``metrica-decide-la-conclusion.md`` cometido sobre el propio trabajo: mide el
**significante** —los bytes que el cliente envía— para concluir sobre el
**significado**, que es si el servidor reconoció el prefijo. Y el servidor ya
publica ese veredicto en cada turno, sin que nadie tenga que interceptar
nada: es ``cache_read_input_tokens``.

La invariante de prefijo
--------------------------

Entre dos turnos consecutivos del MISMO hilo, si el servidor reconoció la
petición anterior entera —incluida la cola que ese turno acababa de escribir
en caché— entonces:

    ``read(n) == read(n-1) + write(n-1)``

Verificado sobre el transcript de esta sesión (2026-09-10T02:53:52), cuatro
enlaces consecutivos:

===============  ==========  =========  ==============  ====
turno            ``read``    ``write``  esperado        ¿?
===============  ==========  =========  ==============  ====
``…tDwuKB3W``        35 365    375 840  —               —
``…hwf2UdAt``       411 205      2 216  411 205         sí
``…UTrQoMgN``       413 421      1 816  413 421         sí
``…drnghppw``       415 237        882  415 237         sí
``…CaANMEA5``       416 119      1 236  416 119         sí
===============  ==========  =========  ==============  ====

Cuatro de cuatro. Un **incumplimiento** de la igualdad es la respuesta
negativa del servidor: el prefijo no se reconoció entero —cambió un campo de
la clave, o la entrada caducó— y el ``delta`` dice cuánto se dejó de
reconocer. Eso es exactamente lo que la sonda buscaba, medido en el extremo
correcto.

Las dos precondiciones, y las dos son mecanismos ya escritos
--------------------------------------------------------------

1. **El hilo.** La igualdad sólo se sostiene entre turnos consecutivos de la
   misma conversación. Filtrar por ``sessionId`` no aísla nada —seleccionó
   104 449 de 104 449 líneas—; lo que aísla es la cadena de ``parentUuid``,
   que ``transcript.thread`` resuelve.
2. **La deduplicación.** Un turno emitido en streaming aparece varias veces
   con el MISMO ``message.id`` y el MISMO ``usage``. Sin deduplicar, cada
   repetición se lee como un turno cuyo ``read`` no creció, y la invariante
   publica un incumplimiento por cada fragmento — medido: 4 falsos
   incumplimientos sobre 4 enlaces reales, o sea el 100 % de ruido. La
   dedupe por ``message.id`` es la misma que ``transcript.usage.accumulate``
   ya declaró, y aquí no es una optimización: es la condición para que la
   medición signifique algo.

Por qué CERO enlaces REHÚSA en vez de publicar «0 incumplimientos»
--------------------------------------------------------------------

Un hilo con menos de dos turnos no tiene ningún enlace que comprobar. Emitir
«0 incumplimientos» ahí sería un verde que no distingue «el prefijo se
reconoció siempre» de «no había nada que medir» — el sub-patrón **D** de
``metrica-decide-la-conclusion.md``, y la misma razón por la que
``check_vocabulario_prosa.py`` rehúsa con código propio y **sin cifra**
cuando le falta el léxico. Por eso ``main`` sale con 2 y no publica conteo.

*Métrica:* la igualdad ``read(n) == read(n-1) + write(n-1)`` sobre turnos
consecutivos de la cadena de ``parentUuid``, deduplicados por ``message.id``.
*Ciega a:* **por qué** un enlace incumple — la invariante detecta que el
prefijo no se reconoció, no cuál de los campos de la clave cambió; para eso
está ``session.user_wiring.cache_key_delta``, que mide el otro extremo. Y
ciega a un turno del asistente sin ``usage``, que no entra en la serie.
"""
from __future__ import annotations

import argparse
from collections.abc import Iterable
from dataclasses import dataclass

from .thread import main_chain_of
from .usage import usage_of


class NoLinksError(RuntimeError):
    """Menos de dos turnos con uso: no hay ningún enlace que comprobar."""


@dataclass(frozen=True)
class Turn:
    """Un turno del asistente con su uso — la unidad de la serie."""

    message_id: str | None
    timestamp: str
    input: int
    cache_creation: int
    cache_read: int
    output: int


@dataclass(frozen=True)
class Link:
    """El veredicto del servidor sobre el prefijo entre dos turnos vecinos."""

    previous: Turn
    current: Turn

    @property
    def expected(self) -> int:
        """Lo que el servidor leería de caché si reconociera el prefijo entero."""
        return self.previous.cache_read + self.previous.cache_creation

    @property
    def observed(self) -> int:
        return self.current.cache_read

    @property
    def delta(self) -> int:
        """Cuánto se dejó de reconocer; 0 cuando el prefijo entró completo."""
        return self.observed - self.expected

    @property
    def matched(self) -> bool:
        return self.delta == 0


def turns(lines: Iterable[dict]) -> list[Turn]:
    """Los turnos del asistente con uso, en orden y sin fragmentos repetidos.

    Un ``message.id`` ya visto se salta — es otro fragmento del mismo turno en
    streaming, no un turno nuevo. Un turno sin ``id`` no se puede deduplicar y
    se cuenta igual, con la misma ceguera declarada que ``usage.accumulate``.
    """
    out: list[Turn] = []
    seen: set[str] = set()
    for line in lines:
        usage = usage_of(line)
        if usage is None:
            continue
        message_id = (line.get("message") or {}).get("id")
        if message_id is not None:
            if message_id in seen:
                continue
            seen.add(message_id)
        out.append(Turn(message_id=message_id,
                        timestamp=str(line.get("timestamp") or ""),
                        **usage))
    return out


def links(series: list[Turn]) -> list[Link]:
    """Los enlaces entre turnos vecinos; lista vacía si hay menos de dos."""
    return [Link(previous=a, current=b) for a, b in zip(series, series[1:])]


def select(series: list[Turn], around: str = "", span: int = 0) -> list[Turn]:
    """El tramo de la serie centrado en el turno más cercano a ``around``.

    ``around`` vacío devuelve la serie entera — es el caso por defecto, no un
    filtro que no encontró nada. ``span`` cuenta turnos a cada lado; ``0`` con
    un ``around`` declarado devuelve el turno solo, que NO tiene enlace: quien
    quiera comprobar la invariante alrededor de un instante pide al menos 1.
    """
    if not around:
        return series
    if not series:
        return []
    # El más cercano por comparación de la marca ISO, que ordena como el tiempo
    # mientras las marcas compartan formato y zona — las del transcript son
    # todas UTC con sufijo `Z`.
    center = min(range(len(series)),
                 key=lambda i: abs(_key(series[i].timestamp) - _key(around)))
    low = max(0, center - span)
    return series[low:center + span + 1]


def probe(path, around: str = "", span: int = 0) -> list[Link]:
    """La invariante sobre el hilo vivo de ``path``.

    Rehúsa si el tramo no tiene ningún enlace: ver la sección de arriba sobre
    por qué un cero ahí sería un verde falso.
    """
    series = select(turns(main_chain_of(path)), around=around, span=span)
    measured = links(series)
    if not measured:
        raise NoLinksError(
            f"{len(series)} turno(s) con uso en el tramo: no hay ningún enlace "
            "que comprobar, y un «0 incumplimientos» aquí no distinguiría "
            "«el prefijo se reconoció» de «no había nada que medir»"
        )
    return measured


def _key(timestamp: str) -> float:
    """Un orden numérico para una marca ISO, sin depender de parsearla entera.

    Se comparan los dígitos de la marca: para dos marcas del mismo formato el
    orden coincide con el cronológico, que es lo único que ``select`` necesita.
    """
    digits = "".join(c for c in timestamp if c.isdigit())
    return float(digits or 0)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--transcript", required=True,
                        help="ruta del JSONL a sondear (parámetro del consumidor)")
    parser.add_argument("--around", default="",
                        help="marca ISO alrededor de la cual medir; por "
                             "defecto, el hilo entero")
    parser.add_argument("--span", type=int, default=0,
                        help="turnos a cada lado de --around")
    args = parser.parse_args(argv)

    try:
        measured = probe(args.transcript, around=args.around, span=args.span)
    except NoLinksError as refusal:
        print(f"REHÚSA — {refusal}")
        return 2

    broken = [link for link in measured if not link.matched]
    for link in measured:
        mark = "ok    " if link.matched else "ROTO  "
        print(f"  {mark} {link.current.timestamp} "
              f"read={link.observed} esperado={link.expected} "
              f"delta={link.delta:+d}")
    print(f"\n{len(measured) - len(broken)} de {len(measured)} enlaces con el "
          f"prefijo reconocido")
    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(main())
