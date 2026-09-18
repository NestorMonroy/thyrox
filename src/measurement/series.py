#!/usr/bin/env python3
"""Una serie, y la conversion de un proceso de llegada en una.

La capa compartida de la familia — el mismo papel que ``repo/clone.py``
cumple para los cuatro instrumentos de repositorio. Los tres que la
consumen (tendencia, estructura de residuos, punto de cambio) piden todos
lo mismo: pares ``(t, y)`` ordenados. Que cada uno los compusiera por su
cuenta es el monolito por copia que la leccion de Unix evita.

Los dos tipos de serie, y por que la distincion decide el instrumento
---------------------------------------------------------------------

Una serie de **nivel** lleva un valor por instante: el tamaño del store en
cada version, el costo de cada sesion. Sobre ella los tres instrumentos
corren tal cual.

Un proceso de **llegada** lleva solo sellos de tiempo: cuando se creo cada
tarea, cuando se registro cada hallazgo. **No es una serie de nivel**, y
darsela a una regresion mide otra cosa. Se agrega por ventana —conteo por
dia— y recien entonces lo es.

Censadas siete en el arbol al escribir esto (:ref:`h-thyrox-19`): dos de
nivel y cinco de llegada. Publicar las siete como una sola poblacion seria
un rotulo unico sobre dos metricas mezcladas.

La ventana vacia cuenta como cero — y no es un detalle
-------------------------------------------------------

Agregar contando las claves observadas parece correcto y borra en silencio
los dias sin llegadas. Una serie irregular sale densa, la media sube, y
toda pendiente calculada sobre ella esta sesgada **sin que nada lo
delate**. Medido en el control: con el cero la media es 1.0; sin el, 1.5.

Que NO hace
------------

No dice si la serie es **apta** para el ajuste que se le quiera aplicar:
cuenta puntos y los ordena, no mide estacionariedad ni suficiencia. Y no
elige la ventana — quien agrega decide si el dia es la unidad correcta
para su pregunta.
"""
from __future__ import annotations

import dataclasses
import enum
import math

MIN_POINTS = 2


class Kind(enum.Enum):
    """De que tipo es la serie. Decide que instrumento puede leerla."""

    LEVEL = "nivel"
    ARRIVAL = "llegada"


class NotASeries(ValueError):
    """Lo que se paso no puede analizarse como serie.

    Se levanta en vez de devolver una serie vacia o de un punto: un cero o
    un `nan` rio abajo no distinguiria «no hay tendencia» de «no habia con
    que medirla», que es el verde que no discrimina.
    """


@dataclasses.dataclass(frozen=True)
class Series:
    """Pares ``(t, y)`` ordenados por tiempo, con su tipo declarado."""

    points: tuple[tuple[float, float], ...]
    kind: Kind = Kind.LEVEL
    label: str = ""

    @property
    def count(self) -> int:
        return len(self.points)

    @property
    def span_seconds(self) -> float:
        return self.points[-1][0] - self.points[0][0]

    @property
    def times(self) -> list[float]:
        return [t for t, _ in self.points]

    @property
    def values(self) -> list[float]:
        return [y for _, y in self.points]


def level(points, label: str = "") -> Series:
    """Una serie de nivel a partir de pares ``(t, y)``, ordenada por tiempo."""
    ordered = tuple(sorted(((float(t), float(y)) for t, y in points),
                           key=lambda p: p[0]))
    if len(ordered) < MIN_POINTS:
        raise NotASeries(
            f"«{label or 'sin etiqueta'}» tiene {len(ordered)} punto(s); "
            f"hacen falta {MIN_POINTS}. No se emite cifra: un cero aqui no "
            "distinguiria «sin tendencia» de «sin datos».")
    return Series(points=ordered, kind=Kind.LEVEL, label=label)


def bin_arrivals(stamps, window_seconds: float, label: str = "") -> Series:
    """Agrega sellos de tiempo a un conteo por ventana, con los huecos en cero.

    Devuelve una serie de **nivel**: el proceso de llegada ya no lo es una
    vez agregado. El tiempo de cada punto es el borde izquierdo de su
    ventana, medido desde el primer sello.
    """
    if window_seconds <= 0:
        raise NotASeries(
            f"la ventana tiene que ser positiva; se paso {window_seconds}. "
            "Sin ventana no hay agregado, y no se emite conteo.")
    ordered = sorted(float(s) for s in stamps)
    if len(ordered) < MIN_POINTS:
        raise NotASeries(
            f"«{label or 'sin etiqueta'}» trae {len(ordered)} sello(s); "
            f"hacen falta {MIN_POINTS} para que haya ventana que agregar.")

    origin = ordered[0]
    last = int(math.floor((ordered[-1] - origin) / window_seconds))
    counts = [0.0] * (last + 1)
    for stamp in ordered:
        counts[int(math.floor((stamp - origin) / window_seconds))] += 1.0
    # El rango COMPLETO, no las claves observadas: una ventana sin llegadas
    # es un cero medido, no un dato ausente.
    points = tuple((i * window_seconds, c) for i, c in enumerate(counts))
    return level(points, label=label)


def residuals(fitted_over: Series, fitted) -> list[float]:
    """Observado menos ajustado, en el orden de la serie.

    Es la entrada del instrumento que lee estructura en los residuos: si el
    ajuste fuera el correcto, lo que queda no tendria memoria.
    """
    values = fitted_over.values
    predicted = list(fitted)
    if len(predicted) != len(values):
        raise NotASeries(
            f"el ajuste trae {len(predicted)} valor(es) y la serie "
            f"{len(values)}; no se pueden restar.")
    return [y - p for y, p in zip(values, predicted)]
