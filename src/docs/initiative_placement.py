#!/usr/bin/env python3
"""¿La iniciativa ya existe, y está donde le toca? — el recorrido completo.

Origen: directiva del ejecutor — *«se valide que esta no existe, pero el que
no existe, ahora no solo depende del lugar del dominio … si no te vas a
preguntar que la iniciativa no exista en todo ``source/gestion/**``; si existe
y no está en el lugar correcto, crearla en el lugar correcto haciendo mención
que tiene una ``/<raiz>`` diferente y se extiende de esa ``/<raiz>``»*.

El hueco estaba medido por conducta: ``scaffold_initiative`` decide si la
iniciativa existe con un solo ``destino.exists()`` sobre
``pm/<submodulo>/iniciativas/<slug>``. Esa pregunta es ciega a toda iniciativa
alojada bajo otra raíz, que es precisamente el caso que este proyecto ya pagó
a mano: ``construir-harness-propio`` vivió en ``pm/docs/`` y su entregable es
el proveedor, así que su hogar era ``pm/thyrox/``.

## Los tres desenlaces, y ninguno es «crear a ciegas»

``ABSENT``      no está en ningún sitio bajo ``source/gestion/`` -> se crea.
``IN_PLACE``    está en la raíz pedida -> se rehúsa; no se pisa trabajo ajeno.
``ELSEWHERE``   está bajo OTRA raíz -> se crea en la pedida **con la mención**
                de que se extiende de aquélla (``extension_note``).

## El recorrido es ACOTADO, y un corte NO es una ausencia

Se recorre con ``session/bounded_scan.walk``: poda, tope de entradas y plazo
de pared. La cota importa porque un recorrido sin cota sobre ``source/`` no
falla — gira (:ref:`h-thyrox-23`).

Y por eso ``decide_placement`` **rehúsa** ante un recorrido truncado en vez de
devolver ``ABSENT``. Un corte silencioso haría que un árbol grande publicara
«no existe» y el scaffolder crease el duplicado con la bendición del
instrumento: el sub-patrón D de ``metrica-decide-la-conclusion.md`` con el
propio mecanismo de sujeto.

## Frontera declarada: este módulo NO infiere la raíz correcta

``intended_submodule`` es entrada del llamador. Decidir a qué raíz PERTENECE
una iniciativa es trabajo del censo de dominio, cuya señal ya tiene un defecto
medido y registrado (:ref:`h-docs-1280` — ``commits`` es acumulativo y nombra
el hogar recién abandonado). Mezclar ambas cosas aquí importaría ese defecto a
un mecanismo que no lo tiene.

*Métrica:* directorios cuyo nombre es exactamente el slug, hallados por los
``.rst`` que contienen, bajo ``source/gestion/`` del consumidor.
*Ciega a:* una iniciativa que exista bajo OTRO slug —las cinco
``*-practicayoruba-*`` son el caso vivo—; un directorio de slug sin ningún
``.rst`` dentro, que ya incumple DEC-AM-01 por su cuenta; y la coincidencia
declarada sólo en la clave ``:iniciativa:`` de un artefacto cuyo directorio se
llama de otra forma.
"""
from __future__ import annotations

import pathlib
import sys
from dataclasses import dataclass

from session import bounded_scan  # noqa: E402

#: La rama del consumidor que se recorre entera. No es ``pm/`` a propósito:
#: el defecto que este módulo cierra es exactamente mirar sólo el lugar del
#: dominio.
MANAGEMENT_DIR = pathlib.Path("source") / "gestion"

#: Los segmentos que hacen canónica a una ubicación: ``pm/<raiz>/iniciativas``.
PM_SEGMENT = "pm"
INITIATIVES_SEGMENT = "iniciativas"

#: Los tres desenlaces. Cadenas y no un ``Enum`` porque viajan a la salida de
#: un guion de línea de comandos, donde un ``Enum`` se imprimiría como repr.
ABSENT = "absent"
IN_PLACE = "in_place"
ELSEWHERE = "elsewhere"


class SurveyTruncatedError(RuntimeError):
    """El recorrido no llegó al final: no hay veredicto que emitir."""


class ManagementRootError(RuntimeError):
    """El consumidor no tiene ``source/gestion/``: no es un árbol medible."""


@dataclass(frozen=True)
class Hit:
    """Una ubicación donde el slug ya existe.

    ``submodule`` es ``None`` cuando la ruta NO es canónica. Eso no es un
    fallo del recorrido: es el dato — una iniciativa fuera de
    ``pm/<raiz>/iniciativas/`` está mal alojada de una forma que este módulo
    no puede resolver solo.
    """

    path: pathlib.Path
    submodule: str | None


@dataclass(frozen=True)
class SurveyResult:
    slug: str
    hits: tuple[Hit, ...]
    truncated: bool
    reason: str | None = None


@dataclass(frozen=True)
class PlacementVerdict:
    verdict: str
    slug: str
    intended_submodule: str
    hits: tuple[Hit, ...]

    @property
    def extends_from(self) -> str | None:
        """La raíz de la que se extiende, si el hallazgo tiene una derivable."""
        for hit in self.hits:
            if hit.submodule is not None and hit.submodule != self.intended_submodule:
                return hit.submodule
        return None

    @property
    def origin(self) -> Hit | None:
        return self.hits[0] if self.hits else None


def submodule_of(relative: pathlib.Path, slug: str) -> str | None:
    """La raíz de una ruta relativa al consumidor, o ``None`` si no es canónica.

    Canónica es ``source/gestion/pm/<raiz>/iniciativas/<slug>/...``. Se exige
    la forma entera —no basta con que ``pm`` aparezca— porque el objeto de
    este módulo es justamente distinguir el lugar correcto del que no lo es.
    """
    parts = relative.parts
    frame = MANAGEMENT_DIR.parts + (PM_SEGMENT,)
    if len(parts) < len(frame) + 3 or parts[: len(frame)] != frame:
        return None
    root, segment, name = parts[len(frame)], parts[len(frame) + 1], parts[len(frame) + 2]
    if segment != INITIATIVES_SEGMENT or name != slug:
        return None
    return root


def survey_initiative(
    consumer_root,
    slug: str,
    *,
    max_entries: int = bounded_scan.DEFAULT_MAX_ENTRIES,
    deadline: float = bounded_scan.DEFAULT_DEADLINE,
) -> SurveyResult:
    """Busca el slug en TODO ``source/gestion/``, no sólo en su lugar de dominio.

    Se localiza por los ``.rst`` que el directorio contiene y no por el
    directorio en sí: ``bounded_scan.walk`` recoge archivos, e ``index.rst`` es
    obligatorio en toda iniciativa por DEC-AM-01. El desvío es deliberado —
    reusar el recorrido acotado del proveedor vale más que un ``os.walk``
    propio que habría que volver a acotar.
    """
    root_consumer = pathlib.Path(consumer_root)
    root_management = root_consumer / MANAGEMENT_DIR
    result = bounded_scan.walk(
        root_management, name="*.rst", max_entries=max_entries, deadline=deadline)

    if result.reason and result.reason.startswith("no existe"):
        raise ManagementRootError(result.reason)

    found: dict[pathlib.Path, Hit] = {}
    for path in result.paths:
        absolute = pathlib.Path(path)
        relative = absolute.relative_to(root_consumer)
        if slug not in relative.parts:
            continue
        # El hallazgo es el DIRECTORIO del slug, no cada .rst que contiene.
        cut = relative.parts.index(slug) + 1
        directory = root_consumer / pathlib.Path(*relative.parts[:cut])
        if directory not in found:
            found[directory] = Hit(
                path=directory,
                submodule=submodule_of(directory.relative_to(root_consumer), slug),
            )

    return SurveyResult(
        slug=slug,
        hits=tuple(found[k] for k in sorted(found)),
        truncated=not result.complete,
        reason=result.reason,
    )


def decide_placement(survey: SurveyResult, intended_submodule: str) -> PlacementVerdict:
    """Los tres desenlaces. Rehúsa si el recorrido no llegó al final.

    El rehúse NO es una cortesía: sin él, un corte de la cota se leería como
    ausencia y el llamador crearía un duplicado creyendo que verificó.
    """
    if survey.truncated:
        raise SurveyTruncatedError(
            f"el recorrido de source/gestion/ se cortó ({survey.reason}): "
            f"NO se emite veredicto sobre «{survey.slug}». Un corte no es una "
            f"ausencia — subir max_entries/deadline, o acotar la raíz."
        )
    if not survey.hits:
        verdict = ABSENT
    elif any(hit.submodule == intended_submodule for hit in survey.hits):
        verdict = IN_PLACE
    else:
        verdict = ELSEWHERE
    return PlacementVerdict(
        verdict=verdict, slug=survey.slug,
        intended_submodule=intended_submodule, hits=survey.hits,
    )


def extension_note(verdict: PlacementVerdict) -> str:
    """El bloque RST que declara de qué raíz se extiende la iniciativa nueva.

    La cita va como ``:doc:`` absoluto —``/gestion/pm/<raiz>/...``—, que es la
    forma que el árbol ya usa para referirse a otra iniciativa. Así el enlace
    lo verifica ``check_doc_citations`` sin instrumento nuevo: si la raíz de
    origen desaparece, el gate lo dice.
    """
    if verdict.verdict != ELSEWHERE:
        raise ValueError(f"sólo ELSEWHERE lleva mención de extensión: {verdict.verdict}")
    source = verdict.origin
    if source is None:  # pragma: no cover — ELSEWHERE implica al menos un hallazgo
        raise ValueError("ELSEWHERE sin hallazgo: estado imposible")

    root = verdict.extends_from
    if root is not None:
        location = f"``pm/{root}``"
        citation = (f":doc:`/gestion/pm/{root}/iniciativas/{verdict.slug}/index`")
    else:
        # Hallada fuera de `pm/<raiz>/iniciativas/`: no hay raíz que nombrar,
        # así que se cita la ruta tal cual en vez de inventarle una.
        relative = source.path.as_posix()
        location = f"``{relative}``"
        citation = f"``{relative}``"

    return (
        f".. note:: Se extiende de otra raíz\n\n"
        f"   Esta iniciativa ya existía bajo {location}, que **no** es la raíz\n"
        f"   de su entregable. Se crea aquí, en ``pm/{verdict.intended_submodule}``,\n"
        f"   y se extiende de aquélla: {citation}.\n\n"
        f"   El trabajo previo sigue siendo válido y su evidencia fechada no se\n"
        f"   reescribe; lo que cambia es el hogar de lo que venga después.\n"
    )


def main(argv: list[str] | None = None) -> int:
    """Publica el veredicto de ubicacion de un slug. Punto de entrada del bin."""
    import argparse

    parser = argparse.ArgumentParser(
        description="¿El slug ya existe bajo source/gestion/, y esta donde le toca?")
    parser.add_argument("submodule", help="la raiz pretendida: api|db|docs|server|ui|thyrox")
    parser.add_argument("slug", help="el slug kebab-case de la iniciativa")
    parser.add_argument("--consumer", default=None,
                        help="raiz del clon consumidor (por defecto, la que reach resuelva)")
    args = parser.parse_args(argv)

    if args.consumer:
        root = pathlib.Path(args.consumer)
    else:
        from paths import reach  # noqa: PLC0415 — sólo lo necesita el camino sin --consumer
        root = reach.consumer_root()

    try:
        verdict = decide_placement(survey_initiative(root, args.slug), args.submodule)
    except (SurveyTruncatedError, ManagementRootError) as motivo:
        print(f"REHUSA: {motivo}", file=sys.stderr)
        return 2

    print(f"{verdict.verdict}\t{args.slug}\t(alcance medido: {len(verdict.hits)} ubicacion(es))")
    for hit in verdict.hits:
        root_text = hit.submodule or "(fuera de pm/<raiz>/iniciativas/)"
        print(f"  {root_text}\t{hit.path}")
    if verdict.verdict == ELSEWHERE:
        print(extension_note(verdict))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
