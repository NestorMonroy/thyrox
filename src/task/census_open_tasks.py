#!/usr/bin/env python3
"""Censo de las tareas abiertas de UNA capa: cerradas de hecho, con dueño, huérfanas.

Porte de ``kaupamex-docs: .claude/eventos/close-open-docs-tasks-20260912T100232/
probes/census_open_docs_tasks.py``, que respondió la parte DOCS del encargo
*«de TODAS las TASK que están en el store, ¿cuáles ya están cerradas?»*.

El probe **se queda congelado en su banco** y no se edita en el sitio: un banco
fechado cuyo ``probes/`` dejara de contener el instrumento que produjo sus
``outputs/`` repetiría la falla de procedencia que su propio README registra.
Lo reusable es el mecanismo, y su hogar es el proveedor — la TASK es del
proveedor, y este árbol es quien la declara.

La pregunta que el instrumento responde
---------------------------------------

Greppear la cita en el árbol devolvía **412 de 412 citadas**, porque el tablero
renderizado lista *todas* las tareas: un control que no puede fallar no
discrimina (sub-patrón D de ``metrica-decide-la-conclusion.md``). El
discriminador que SÍ puede fallar es el **mensaje de commit**: un commit que
nombra la cita es trabajo que aterrizó, y una tarea nunca trabajada no aparece
en el mensaje de ningún repo.

Tres cubos, cada uno con su ``n`` sobre el universo declarado:

``closed_in_tree``   la cita aparece en el mensaje de un commit de algún repo
``owned_but_open``   la citan prosa o código, pero ningún commit la nombra
``orphan``           sólo aparece en el render del tablero, o en ninguna parte

Qué cambia respecto del probe congelado, y por qué
--------------------------------------------------

1. **La capa es un parámetro OBLIGATORIO.** El probe fijaba ``'docs'`` en el
   ``SELECT``; parametrizarlo con un default habría dejado un universo
   silencioso — el consumidor creería medir su capa y mediría otra.
2. **Se valida contra el catálogo declarado** (``task_ids.LAYERS`` +
   ``UNKNOWN_LAYER``), no contra un literal repetido aquí. Una copia sería la
   segunda fuente de verdad que ``calibration-verified-numbers.md`` prohíbe.
3. **El store y las raíces salen del localizador**, no de literales. El probe
   escribía las seis rutas a mano; aquí las resuelve ``paths/reach.py``.
4. **El alcance incluye al PROVEEDOR.** ``reach()`` resuelve los cinco clones
   consumidores y **no** thyrox — medido: ``reach_roots()`` devuelve
   ``('api','db','docs','server','ui')``. Un ``TASK-THYROX-NNNN`` cerrado por un
   commit de este árbol sería invisible, y hay commits así.

Y conserva las tres correcciones que el probe pagó en su banco, porque las tres
son del instrumento y viajan con él: la ERE de POSIX, el recorte del ``./`` sin
``lstrip``, y el descuento de ``/preimagen/``.

Métrica: filas de ``tasks`` con la ``submodule`` pedida y ``status !=
'completed'``, repartidas por la aparición de su ``citation_id`` en el mensaje
de un commit (``git log --all`` del alcance) y, si no, en el contenido de un
archivo que no sea render del tablero.
Ciega a: un commit que cierre la tarea sin nombrar su cita —cae en
``owned_but_open`` o en ``orphan``—; y a si el trabajo del commit **terminó**:
nombrar la cita prueba que aterrizó, no que cerró.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths import reach  # noqa: E402
import task_ids  # noqa: E402

#: Las capas admitidas son las que el eje declara, más el cubo de lo que cruza
#: repos. NO se enumeran aquí: `task_ids` es su fuente.
LAYER_CHOICES: tuple[str, ...] = tuple(task_ids.LAYERS) + (task_ids.UNKNOWN_LAYER,)

CITATION = re.compile(r"TASK-[A-Z]+-[0-9]{4}")

#: El MISMO patrón para `grep -E`. No se reusa `CITATION.pattern` a ciegas: la
#: ERE de POSIX no conoce `\d`, así que un patrón de Python pasado a grep
#: devuelve cero coincidencias SIN error — el silencio del instrumento leído
#: como ausencia.
CITATION_ERE = "TASK-[A-Z]+-[0-9]{4}"

#: Un archivo que ENUMERA el tablero cita cada tarea por construcción, así que
#: su mención no es evidencia de nada. Se excluye por nombre y por ruta.
RENDER_NAME_PARTS = ("tablero", "board", "snapshot")
#: `tasks-<sesión>.tsv` es el VOLCADO del tablero. No lo cubría ninguna de las
#: tres palabras de arriba, y sus tres copias solas producían el 94 % de las
#: «citas en prosa».
RENDER_NAME_PREFIXES = ("tasks-",)
RENDER_PATH_PARTS = ("/reportes/", "/.claude/tasks", "/outputs/", "/salidas/",
                     "/preimagen/")


def census_roots(start: Path | None = None) -> tuple[Path, ...]:
    """El alcance del censo: los consumidores declarados **más el proveedor**.

    `reach()` responde «hasta dónde alcanza el trabajo de un consumidor», y por
    eso no se incluye a sí mismo. El censo pregunta otra cosa —«¿qué commit de
    qué árbol nombra esta cita?»— y el proveedor es uno de esos árboles.
    """
    ordered: list[Path] = list(reach.paths(start))
    provider = reach.thyrox_root(start)
    if provider not in ordered:
        ordered.append(provider)
    return tuple(ordered)


def open_tasks(layer: str, store: Path | None = None) -> list[dict]:
    """Las tareas de ``layer`` que no están en ``completed``."""
    path = Path(store) if store else reach.agent_store_path()
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.execute("PRAGMA busy_timeout=5000")
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT citation_id, task_id, session_id, status, subject,"
        "       source, submodule_source, created_at, updated_at"
        "  FROM tasks"
        " WHERE submodule = ? AND status != 'completed'"
        " ORDER BY citation_id",
        (layer,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def commit_citations(roots: tuple[Path, ...] | None = None) -> dict[str, list[str]]:
    """Cita -> ``repo@hash`` de cada commit cuyo mensaje la nombra.

    Un solo ``git log --all`` por raíz y por ejecución: el historial no cambia
    a mitad del censo, y recorrerlo una vez por tarea sería el mismo trabajo
    multiplicado por el universo.
    """
    found: dict[str, list[str]] = defaultdict(list)
    for repo in (roots if roots is not None else census_roots()):
        if not (repo / ".git").exists():
            continue
        out = subprocess.run(
            ["git", "-C", str(repo), "log", "--all", "--format=%H%x1f%B%x1e"],
            capture_output=True, text=True, timeout=300,
        ).stdout
        for record in out.split("\x1e"):
            if "\x1f" not in record:
                continue
            sha, message = record.split("\x1f", 1)
            for citation in set(CITATION.findall(message)):
                found[citation].append(f"{repo.name}@{sha.strip()[:8]}")
    return dict(found)


def normalize_hit_path(repo_name: str, raw: str) -> str:
    """``./x`` -> ``<repo>/x``, recortando el prefijo — nunca con ``lstrip``.

    ``lstrip('./')`` borra TODO carácter inicial que sea punto o barra, así que
    ``./.claude/…`` quedaba en ``claude/…`` y el descuento de render no casaba.
    """
    return f"{repo_name}/{raw[2:] if raw.startswith('./') else raw}"


def is_render(path: str) -> bool:
    """¿El archivo enumera el tablero entero?"""
    name = path.rsplit("/", 1)[-1].lower()
    return (any(part in name for part in RENDER_NAME_PARTS)
            or name.startswith(RENDER_NAME_PREFIXES)
            or any(part in path for part in RENDER_PATH_PARTS))


def prose_citations(roots: tuple[Path, ...] | None = None) -> dict[str, set[str]]:
    """Cita -> archivos que la nombran, SIN contar los renders del tablero."""
    found: dict[str, set[str]] = defaultdict(set)
    for repo in (roots if roots is not None else census_roots()):
        out = subprocess.run(
            ["grep", "-roE", "--binary-files=without-match",
             "--exclude-dir=.git", "--exclude-dir=node_modules",
             CITATION_ERE, "."],
            cwd=repo, capture_output=True, text=True, timeout=600,
        ).stdout
        for line in out.splitlines():
            if ":" not in line:
                continue
            raw, citation = line.rsplit(":", 1)
            path = normalize_hit_path(repo.name, raw)
            if is_render(path):
                continue
            found[citation].add(path)
    return dict(found)


def finding_state(path: str, roots: tuple[Path, ...] | None = None) -> str | None:
    """El ``:estado:`` del hallazgo que cita, si el archivo es un hallazgo."""
    if "/hallazgos/hallazgo-" not in path:
        return None
    repo_name, _, rest = path.partition("/")
    by_name = {p.name: p for p in (roots if roots is not None else census_roots())}
    base = by_name.get(repo_name)
    if base is None:
        return None
    absolute = base / rest
    if not absolute.is_file():
        return None
    text = absolute.read_text(encoding="utf-8", errors="replace")
    for line in text.splitlines()[:20]:
        if line.strip().startswith(":estado:"):
            return line.split(":estado:", 1)[1].strip()
    return None


def build_buckets(tasks: list[dict],
                  commits: dict[str, list[str]],
                  prose: dict[str, set[str]],
                  roots: tuple[Path, ...] | None = None) -> dict[str, list[dict]]:
    """Los tres cubos, por la evidencia de cada tarea. Un cubo, una tarea."""
    buckets: dict[str, list[dict]] = {
        "closed_in_tree": [], "owned_but_open": [], "orphan": [],
    }
    for task in tasks:
        citation = task["citation_id"]
        task["commits"] = sorted(commits.get(citation, []))
        task["cited_in"] = sorted(prose.get(citation, set()))
        task["finding_states"] = sorted(
            {state for state in (finding_state(p, roots) for p in task["cited_in"])
             if state})
        if task["commits"]:
            buckets["closed_in_tree"].append(task)
        elif task["cited_in"]:
            buckets["owned_but_open"].append(task)
        else:
            buckets["orphan"].append(task)
    return buckets


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--layer", required=True, choices=LAYER_CHOICES,
        help="la capa a censar. SIN default: uno seria un universo silencioso")
    parser.add_argument("--store", default=None,
                        help="ruta del store; por defecto, la del localizador")
    parser.add_argument("--out-dir", default=None,
                        help="donde aterriza el detalle en JSON")
    args = parser.parse_args(argv)

    roots = census_roots()
    tasks = open_tasks(args.layer, Path(args.store) if args.store else None)
    commits = commit_citations(roots)
    prose = prose_citations(roots)
    buckets = build_buckets(tasks, commits, prose, roots)

    total = len(tasks)
    prefix = f"TASK-{args.layer.upper()}-"
    print(f"universo: {total} tareas con submodule='{args.layer}' "
          f"y status != 'completed'")
    print(f"  de ellas con cita {prefix}: "
          f"{sum(1 for t in tasks if t['citation_id'].startswith(prefix))}")
    print(f"  alcance: {len(roots)} raiz(ces) — "
          f"{', '.join(p.name for p in roots)}")
    print()
    for name, rows in buckets.items():
        print(f"{name}: {len(rows)} de {total}")
    print()
    print("closed_in_tree — la cita aparece en el mensaje de un commit:")
    for task in buckets["closed_in_tree"]:
        print(f"  {task['citation_id']}  {task['status']:12s} "
              f"{', '.join(task['commits'][:3])}  | {task['subject'][:60]}")
    print()
    print("owned_but_open — citada en prosa/codigo, ningun commit la nombra:")
    for task in buckets["owned_but_open"]:
        states = ",".join(task["finding_states"]) or "-"
        print(f"  {task['citation_id']}  {task['status']:12s} "
              f"estado_hallazgo={states}  archivos={len(task['cited_in'])}"
              f"  | {task['subject'][:55]}")
    print()
    print(f"orphan: {len(buckets['orphan'])} — solo en el render del tablero")

    if args.out_dir:
        out_dir = Path(args.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        destination = out_dir / f"census_open_{args.layer}_tasks.json"
        destination.write_text(
            json.dumps({"layer": args.layer, "universe": total,
                        "roots": [p.name for p in roots], "buckets": buckets},
                       indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")
        print(f"detalle: {destination}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
