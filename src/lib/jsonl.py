"""JSON Lines — un registro por linea, para lo que thyrox posee.

Por que existe, y no es preferencia de formato: un `.json` de documento unico
se reescribe ENTERO en cada cambio, asi que dos escritores del mismo turno se
pisan y el diff de un registro son todas las llaves del archivo. Un JSONL
apenda y difunde por linea.

**La conversion solo aplica a lo que leemos nosotros.** Un `package.json`, un
`tsconfig.json` o un `evals.json` los lee un tercero —`bun`, `tsc`,
`claude plugin eval`— y su formato es contrato ajeno. El censo que reparte el
arbol en esos cubos vive en
`.claude/workbench/adoptar-jsonl-censo-20260917T051111/`.

El control que discrimina un lector de LINEAS de uno de documento es un archivo
de DOS o mas registros: `json.load` acepta un JSONL de una sola linea, asi que
una suite probada solo contra n=1 nunca prueba que el lector lea lineas. Es el
sub-patron D de `metrica-decide-la-conclusion.md` aplicado al propio formato.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable, Iterator


class MalformedRecordError(ValueError):
    """Una linea que no parsea, con su numero.

    Se nombra la linea porque un `JSONDecodeError` pelado dice el desplazamiento
    dentro de esa linea y no cual de las 84 es: quien lo lee no puede localizar
    el registro sin volver a recorrer el archivo a mano.
    """


def parse_records(text: str) -> Iterator[dict[str, Any]]:
    """Los registros de un texto JSONL, saltando las lineas en blanco."""
    for number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError as error:
            raise MalformedRecordError(
                f"linea {number} no es un registro JSON valido: {error}"
            ) from error


def read_records(path: str | Path) -> list[dict[str, Any]]:
    """Los registros de un archivo JSONL."""
    return list(parse_records(Path(path).read_text()))


def dump_records(records: Iterable[dict[str, Any]]) -> str:
    """El texto JSONL de una secuencia de registros.

    `sort_keys` deja el orden de las claves estable: sin el, dos ejecuciones que
    construyan el mismo registro pueden emitir lineas distintas y el diff medira
    el orden del dict en vez del cambio. `ensure_ascii=False` conserva el acento
    en vez de escaparlo — el archivo es para leerse.
    """
    return "".join(
        json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n"
        for record in records
    )


def write_records(path: str | Path, records: Iterable[dict[str, Any]]) -> int:
    """Escribe los registros y devuelve cuantos. El conteo es el denominador."""
    materialized = list(records)
    Path(path).write_text(dump_records(materialized))
    return len(materialized)
