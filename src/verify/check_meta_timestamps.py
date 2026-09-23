#!/usr/bin/env python3
"""Gate — los campos de fecha del bloque ``.. meta::`` no mienten ni quedan a medias.

Origen: dos defectos del mismo pase, 2026-09-20, ambos introducidos por un
agente y detectados por el ejecutor, no por un gate.

1. **Un marcador sin expandir.** Un ``sed`` de sustitucion que no corrio dejo
   el literal del andamio como valor de ``:fecha_creacion:``. El documento se
   construye igual: Sphinx no valida el contenido de ``meta``.
2. **Medianoche fabricada.** 126 valores de fecha sin hora se "normalizaron"
   a ``T00:00:00``, que **el propio repositorio ya prohibia** —
   ``procedimiento-nueva-iniciativa-gestion`` v3.0.0: *"timestamps ISO 8601
   con hora real: usar ``date -u +"%Y-%m-%dT%H:%M:%S"`` — nunca
   ``T00:00:00``"*. La hora no se conocia, y escribir medianoche la convierte
   en un dato que parece medido.

La segunda es la cara dificil: un valor **mas completo** puede ser **menos
verdadero**. Una fecha sin hora dice "el dia se sabe, la hora no". Medianoche
dice "ocurrio a las 00:00:00", que es falso en 126 de 126 casos.

Que mide
--------

Los campos de fecha declarados **dentro de un bloque** ``.. meta::``, que es
donde gobiernan. Una cita de un ``:fecha_creacion:`` ajeno en prosa, en una
tabla o en un bloque literal es evidencia y no se toca.

Tres veredictos:

- ``MARCADOR`` — el valor es un andamio sin expandir (``__TS__``, ``{ts}``,
  ``TIMESTAMP_PLACEHOLDER``, un ``$(date …)`` literal). Siempre es defecto.
- ``FABRICADO`` — ``T00:00:00``. Prohibido por el procedimiento citado.
- ``MALFORMADO`` — no es ninguna forma ISO 8601 valida.

*Metrica:* campos de fecha en bloques ``.. meta::``, por veredicto.
*Ciega a:* si la fecha es **correcta** — el gate ve la forma, no si el
documento nacio ese dia; y a un valor con zona horaria explicita, que acepta
sin comprobar que sea la del arbol.

Lo que NO es defecto, declarado
--------------------------------

- **Una fecha sin hora** (``2026-05-05``). Es ISO 8601 valida y es la forma
  honesta de "dia conocido, hora desconocida". Se reporta aparte, como censo,
  no como incumplimiento.
- **Un marcador de plantilla** (``<YYYY-MM-DDTHH:MM:SS>``) en un archivo
  ``tpl-*``. Ahi el marcador es el contenido: una plantilla que trajera una
  fecha real seria la que esta mal.

Uso
---

    bash bin/check_meta_timestamps              # reporte, exit 0
    bash bin/check_meta_timestamps --strict     # exit 1 si hay incumplidores
    bash bin/check_meta_timestamps --censo      # incluye el censo de formas
    bash bin/check_meta_timestamps RUTA...      # acotar a esas rutas
"""
from __future__ import annotations

import pathlib
import re
import sys

from paths import reach


def source_root() -> pathlib.Path:
    """El arbol documental del consumidor, resuelto al llamar, no al importar."""
    return reach.consumer_root() / "source"


#: Los campos cuyo valor es un instante. Se gobiernan igual: la razon del
#: defecto no depende de cual de ellos sea.
DATE_FIELDS: tuple[str, ...] = (
    "fecha_creacion", "ultimo_cambio", "fecha_actualizacion", "fecha",
    "fecha_apertura", "fecha_cierre",
)

META_OPEN = re.compile(r"^\.\.\s+meta::\s*$")
FIELD = re.compile(
    r"^(\s+):(" + "|".join(DATE_FIELDS) + r"):\s*(.*?)\s*$"
)
LITERAL_DIRECTIVE = re.compile(
    r"^(\s*)\.\.\s+(?:code-block|code|literalinclude|highlight|raw)::"
)

#: ISO 8601: fecha sola, o fecha con hora, con zona opcional.
ISO_FULL = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FABRICATED = re.compile(r"^\d{4}-\d{2}-\d{2}T00:00:00(?:Z|[+-]\d{2}:\d{2})?$")
#: Marcador de plantilla: legitimo SOLO en un archivo de plantilla.
TEMPLATE_MARK = re.compile(r"^<[^>]*>$")
#: Andamio sin expandir. `$(`/`` ` `` cubren un `date` que nunca corrio.
PLACEHOLDER = re.compile(r"(^__\w+__$)|(\{\w+\})|(TIMESTAMP_PLACEHOLDER)|(\$\()|(`)")


def is_template(path: pathlib.Path) -> bool:
    """Un archivo cuyo contenido ES el andamio: ahi el marcador es correcto."""
    return path.name.startswith("tpl-") or path.name.startswith("plantilla-")


def meta_date_fields(text: str) -> list[tuple[int, str, str]]:
    """(linea, campo, valor) de cada campo de fecha dentro de un ``.. meta::``.

    El bloque termina en la primera linea no vacia cuya sangria no lo continua
    — que es como docutils delimita el cuerpo de una directiva. Los bloques
    literales se saltan enteros: una plantilla MUESTRA su meta ahi dentro.
    """
    out: list[tuple[int, str, str]] = []
    in_meta = False
    literal_indent: int | None = None
    for n, line in enumerate(text.split("\n"), 1):
        stripped = line.strip()
        indent = len(line) - len(line.lstrip()) if stripped else None

        if literal_indent is not None:
            if stripped and indent is not None and indent <= literal_indent:
                literal_indent = None
            else:
                continue
        if LITERAL_DIRECTIVE.match(line):
            literal_indent = len(line) - len(line.lstrip())
            in_meta = False
            continue

        if META_OPEN.match(line):
            in_meta = True
            continue
        if not in_meta:
            continue
        if not stripped:
            continue
        if indent == 0:
            in_meta = False
            continue
        m = FIELD.match(line)
        if m:
            out.append((n, m.group(2), m.group(3)))
    return out


def verdict(value: str, path: pathlib.Path) -> str | None:
    """El veredicto del valor, o ``None`` si esta bien."""
    if not value:
        return "MALFORMADO (vacio)"
    if TEMPLATE_MARK.match(value):
        return None if is_template(path) else "MARCADOR (marcador de plantilla fuera de una plantilla)"
    if PLACEHOLDER.search(value):
        return "MARCADOR (andamio sin expandir)"
    if FABRICATED.match(value):
        return "FABRICADO (T00:00:00 — el procedimiento lo prohibe; la hora no se conocia)"
    if ISO_FULL.match(value) or ISO_DATE.match(value):
        return None
    return "MALFORMADO (no es ISO 8601)"


def audit(paths: list[pathlib.Path]):
    offenders: list[tuple[pathlib.Path, int, str, str, str]] = []
    census = {"con hora": 0, "solo fecha": 0, "marcador de plantilla": 0}
    total = 0
    for f in paths:
        text = f.read_text(encoding="utf-8", errors="replace")
        for line_no, field, value in meta_date_fields(text):
            total += 1
            v = verdict(value, f)
            if v:
                offenders.append((f, line_no, field, value, v))
            elif TEMPLATE_MARK.match(value):
                census["marcador de plantilla"] += 1
            elif ISO_DATE.match(value):
                census["solo fecha"] += 1
            else:
                census["con hora"] += 1
    return offenders, census, total


def collect(argv: list[str]) -> list[pathlib.Path]:
    roots = [a for a in argv if not a.startswith("-")]
    if not roots:
        return sorted(source_root().rglob("*.rst"))
    out: list[pathlib.Path] = []
    for r in roots:
        p = pathlib.Path(r)
        if p.is_dir():
            out.extend(sorted(p.rglob("*.rst")))
        elif p.suffix == ".rst" and p.is_file():
            out.append(p)
        else:
            raise SystemExit(f"check-meta-timestamps: ruta invalida o no .rst: {r}")
    return out


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    show_census = "--censo" in argv
    paths = collect(argv[1:])
    offenders, census, total = audit(paths)

    for f, line_no, field, value, v in offenders:
        print(f"{f}:{line_no}  :{field}: {value!r}\n    {v}")

    if offenders:
        print(f"\ncheck-meta-timestamps: {len(offenders)} campo(s) incumplidor(es)")
    else:
        print("check-meta-timestamps: OK — ningun campo de fecha con marcador, "
              "medianoche fabricada ni forma invalida")
    print(f"  (alcance medido: {total} campo(s) de fecha en bloques .. meta:: "
          f"de {len(paths)} archivo(s))")
    if show_census or offenders:
        print("  censo de formas validas: "
              + " · ".join(f"{k}={v}" for k, v in census.items()))
    return 1 if (offenders and strict) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
