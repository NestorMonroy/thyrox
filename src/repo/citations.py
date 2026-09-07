#!/usr/bin/env python3
"""Quién cita un archivo, en los cinco clones, separando cita VIVA de evidencia.

El problema que resuelve. Renombrar es la mitad barata; la cara es reapuntar a
los consumidores. ``corpus/census_scripts.py`` ya deriva los citantes —y por eso
este módulo no lo reimplementa— pero lo hace con ``git grep`` sobre **un** repo
y con las raíces del consumidor. Un guion de thyrox invocado desde un githook de
``kaupamex-docs`` le es invisible: su cero significa «no miré ahí», no «no hay».

Y hay una segunda mitad que ningún grep resuelve solo: **no todas las citas se
reapuntan**. La evidencia fechada —hallazgos, análisis, progreso, audits,
lecciones— conserva el nombre viejo a propósito, con el mismo criterio por el
que ``referencia-odoo-gobierna-las-decisiones.md`` conserva las citas
históricas a ``odoo19x/``: reescribirla borraría la memoria episódica. Un
barrido que las reescriba destruye evidencia; uno que las cuente como pendientes
nunca llega a cero. Por eso la clasificación es parte del mecanismo, no del
juicio de quien barre.

Qué NO decide, y es deliberado: el nombre nuevo. Eso es traducción, y traducir
no es rebautizar.

Salidas de ``--verify``: 0 sin citas vivas · 1 quedan citas vivas · 2 no pudo
medir.
"""
from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "paths"))
import reach  # noqa: E402

#: Un segmento de ruta que marca **evidencia fechada**: describe un episodio que
#: ocurrió, no un mecanismo vigente. Su cita conserva el nombre viejo.
EVIDENCE_SEGMENTS = frozenset({
    "hallazgos", "audits", "lecciones-aprendidas", "eventos", "_archived",
})

#: Un prefijo de nombre con el mismo significado que los segmentos de arriba.
EVIDENCE_PREFIXES = ("hallazgo-", "analisis-", "progreso-", "reporte-")

LIVE, EVIDENCE = "viva", "evidencia"


class CitationError(RuntimeError):
    """No se pudo medir. Se rehúsa en vez de publicar un cero."""


def is_evidence(relative: str) -> bool:
    """¿La cita vive en evidencia fechada?

    Se decide por la RUTA y no por el contenido: una cita dentro de un hallazgo
    es histórica aunque su frase suene vigente, y una cita en una regla es viva
    aunque hable del pasado.
    """
    parts = relative.split("/")
    if EVIDENCE_SEGMENTS & set(parts[:-1]):
        return True
    return parts[-1].startswith(EVIDENCE_PREFIXES)


def citers_in(root: pathlib.Path, needle: str,
              skip: str | None = None) -> list[tuple[str, str]]:
    """(ruta relativa, clase) de cada archivo VERSIONADO que menciona `needle`."""
    if not (root / ".git").exists():
        raise CitationError(f"{root} no es un clon git — NO se emite un conteo")
    done = subprocess.run(["git", "grep", "-l", "-F", needle],
                          cwd=root, capture_output=True, text=True)
    # git grep sale 1 sin coincidencias: eso NO es un error.
    if done.returncode not in (0, 1):
        raise CitationError(f"git grep fallo en {root}: {done.stderr.strip()}")
    found = []
    for line in done.stdout.splitlines():
        if not line or line == skip:
            continue
        found.append((line, EVIDENCE if is_evidence(line) else LIVE))
    return found


def citers(needle: str, skip: str | None = None,
           roots: dict[str, pathlib.Path] | None = None) -> dict:
    """El censo completo: por clon, con su clase, y con su denominador."""
    available = roots if roots is not None else reach.roots()
    if not available:
        raise CitationError("ningun clon alcanzable — NO se emite un conteo: "
                            "un 0 aqui seria un verde falso")
    by_clone, live, evidence = {}, 0, 0
    for name, root in sorted(available.items()):
        rows = citers_in(root, needle, skip)
        if rows:
            by_clone[name] = rows
        live += sum(1 for _, kind in rows if kind == LIVE)
        evidence += sum(1 for _, kind in rows if kind == EVIDENCE)
    return {"needle": needle, "by_clone": by_clone, "live": live,
            "evidence": evidence, "clones": len(available)}


def report(census: dict) -> list[str]:
    lines = []
    for clone, rows in census["by_clone"].items():
        lines.append(f"  {clone}")
        for relative, kind in rows:
            mark = "REAPUNTAR" if kind == LIVE else "evidencia "
            lines.append(f"    {mark}  {relative}")
    lines.append(
        f"\ncitations: {census['live']} cita(s) VIVA(s) que reapuntar · "
        f"{census['evidence']} en evidencia fechada, que NO se tocan "
        f"(alcance medido: «{census['needle']}» en {census['clones']} clon(es))")
    return lines


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("needle", help="el basename o literal que se busca")
    p.add_argument("--skip", help="ruta relativa a excluir (la autocita)")
    p.add_argument("--verify", action="store_true",
                   help="exit 1 si queda alguna cita viva")
    args = p.parse_args(argv)
    try:
        census = citers(args.needle, args.skip)
    except CitationError as error:
        print(f"citations: {error}", file=sys.stderr)
        return 2
    print("\n".join(report(census)))
    return 1 if (args.verify and census["live"]) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
