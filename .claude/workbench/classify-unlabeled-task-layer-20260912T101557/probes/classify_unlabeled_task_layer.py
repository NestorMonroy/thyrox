#!/usr/bin/env python3
"""Clasifica por evidencia de commit las filas de ``tasks`` sin ``submodule``.

El defecto que mide: 404 filas nacieron con la cita ``TASK-GEN-NNNN`` y su
columna ``submodule`` en NULL — o sea, nunca se clasificaron. NULL no es lo
mismo que ``gen``: ``gen`` declara «cruza repos», NULL declara «nadie decidió».
Colapsarlos repetiría el defecto que ``usage_source`` cierra un nivel más
abajo.

El criterio de clasificación es el que ``correct_layer`` ya ejerce en sus dos
correcciones a mano: **en qué repos aterrizaron los commits que nombran la
cita**. Cero repos deja la fila indecidible; uno da esa capa; dos o más dan
``gen``.

Métrica: repos distintos cuyo mensaje de commit nombra el ``citation_id``.
Ciega a: un commit que cierre la tarea sin nombrar su cita —cae en
indecidible—; al trabajo fuera de las seis raíces; y a la diferencia entre «el
commit la cerró» y «el commit la menciona».
"""
from __future__ import annotations

import json
import pathlib
import re
import sqlite3
import subprocess
import sys

STORE = pathlib.Path("/home/user/thyrox/agent-results/agent_store.sqlite3")
ROOT = pathlib.Path("/home/user")
REPOS = {
    "docs": ROOT / "kaupamex-docs",
    "api": ROOT / "kaupamex-api",
    "db": ROOT / "kaupamex-db",
    "server": ROOT / "kaupamex-server",
    "ui": ROOT / "kaupamex-ui",
    "thyrox": ROOT / "thyrox",
}
#: El MISMO patrón compilado para Python. Para `grep` hay que reescribirlo: la
#: ERE de POSIX no conoce `\d`, y un patrón de Python pasado a grep devuelve
#: cero coincidencias SIN error (el silencio del instrumento leído como
#: ausencia).
CITATION = re.compile(r"TASK-[A-Z]+-[0-9]{4}")


def unlabeled_rows(store: pathlib.Path) -> list[tuple[str, str, str]]:
    """Las filas cuya columna ``submodule`` está en NULL, con su sujeto."""
    conn = sqlite3.connect(f"file:{store}?mode=ro", uri=True)
    try:
        conn.execute("PRAGMA busy_timeout=5000")
        return conn.execute(
            "SELECT citation_id, subject, status FROM tasks "
            " WHERE submodule IS NULL AND citation_id IS NOT NULL "
            " ORDER BY citation_id").fetchall()
    finally:
        conn.close()


def citations_by_repo() -> dict[str, set[str]]:
    """Para cada repo, las citas que aparecen en algún mensaje de commit."""
    index: dict[str, set[str]] = {}
    for layer, path in REPOS.items():
        if not path.is_dir():
            index[layer] = set()
            continue
        salida = subprocess.run(
            ["git", "-C", str(path), "log", "--all", "--format=%B"],
            capture_output=True, text=True, timeout=300)
        index[layer] = set(CITATION.findall(salida.stdout))
    return index


def classify(citation: str, index: dict[str, set[str]]) -> tuple[str, list[str]]:
    """Devuelve ``(veredicto, repos)`` para una cita."""
    repos = sorted(layer for layer, citas in index.items() if citation in citas)
    if not repos:
        return "indecidible", repos
    if len(repos) == 1:
        return repos[0], repos
    return "gen", repos


def main() -> int:
    rows = unlabeled_rows(STORE)
    index = citations_by_repo()
    por_veredicto: dict[str, list[dict]] = {}
    for citation, subject, status in rows:
        veredicto, repos = classify(citation, index)
        por_veredicto.setdefault(veredicto, []).append({
            "citation_id": citation,
            "status": status,
            "repos": repos,
            "subject": subject,
        })

    print(f"filas sin submodule: {len(rows)}")
    print()
    print("veredicto por evidencia de commit:")
    for veredicto in sorted(por_veredicto, key=lambda k: -len(por_veredicto[k])):
        print(f"  {veredicto:14s} {len(por_veredicto[veredicto])}")
    decidibles = sum(n for v, filas in por_veredicto.items()
                     for n in [len(filas)] if v != "indecidible")
    print()
    print(f"clasificables: {decidibles} de {len(rows)}")
    print(f"indecidibles : {len(por_veredicto.get('indecidible', []))} — "
          f"quedan en NULL, que declara 'nadie decidió' y no 'cruza repos'")

    destino = pathlib.Path(__file__).resolve().parent.parent / "outputs"
    destino.mkdir(exist_ok=True)
    (destino / "classify_unlabeled_task_layer.json").write_text(
        json.dumps({"universe": len(rows), "buckets": por_veredicto},
                   ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
