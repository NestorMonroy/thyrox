"""El manifiesto del banco de trabajo y el ciclo de vida de un *run*.

Gemelo en Python de ``src/workbench/manifest.ts``. Existe porque el subsistema
sabia **acunar** un identificador solo desde TypeScript, y el trabajo de sesion
—hooks, gates, guiones de shell— es Python y bash. Sin este gemelo, quien creaba
un run tenia que llevarse el ISO a alguna parte, y esa parte acababa siendo un
archivo efimero fuera del arbol: medido en esta sesion, un puntero en
``/dev/shm`` que ninguna otra sesion podia leer y que el contenedor borra.
El defecto no era el puntero — era que el mecanismo no ofrecia alternativa.

Es un CONSUMIDOR del gobernador de rutas: el hogar sale de
``paths.workbench_dir()``, que lo resuelve del ``.env`` del arbol. Este modulo
no compone ninguna ruta de hogar por su cuenta.

Cobertura declarada frente al gemelo (``porte-completo-no-parcial.md``)
======================================================================

Se portan los ocho simbolos del ciclo de vida: ``REQUIRED_KEYS``,
``MANIFEST_FILE_NAME``, ``WORKBENCH_FORMS``, ``run_id_date``, ``run_id_for``,
``runs_for``, ``latest_run`` y ``scaffold_workbench``.

**NO se porta ``checkWorkbench``, y es deliberado.** El gate esta cableado una
sola vez, en TypeScript: ``src/packages/cli/src/commands/workbench.ts`` lo
importa y lo ejecuta. Un segundo verificador en Python seria una segunda fuente
de verdad sobre que hace conforme a un run — dos implementaciones del mismo
juicio que nadie sincroniza, que es lo que
``calibration-verified-numbers.md`` prohibe para una cifra y vale igual para un
criterio. Si el gate necesita correr desde Python, se invoca el CLI; no se
reimplementa.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import paths

#: Las cinco claves obligatorias. El orden es el del reporte.
REQUIRED_KEYS: tuple[str, ...] = (
    "question", "instrument", "metric", "blind_to", "destination",
)

#: El nombre del archivo del manifiesto. Uno, en ingles, como todo en THYROX.
MANIFEST_FILE_NAME = "manifest.json"

#: Las tres formas del banco, con sus valores en INGLES.
WORKBENCH_FORMS: tuple[str, ...] = ("corpus", "measurement", "transformation")

#: Los subdirectorios que el andamiaje crea siempre.
SCAFFOLD_SUBDIRS: tuple[str, ...] = ("tests", "outputs", "probes")

# El ISO basico al final del identificador. Sin separadores, porque el slug ya
# usa guiones.
_BASIC_ISO = re.compile(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$")

# El mismo ISO anclado por los dos extremos: el resto del nombre tras el prefijo
# tiene que ser EXACTAMENTE el sufijo, o `a-b-<ISO>` se listaria bajo el slug
# `a` — un run ajeno devuelto como propio.
_EXACT_BASIC_ISO = re.compile(r"^\d{8}T\d{6}$")


class RunIdError(ValueError):
    """El slug ya trae sufijo ISO: acunar otro daria dos."""


def run_id_date(run_id: str) -> str | None:
    """La fecha extendida que el identificador declara, o ``None``.

    Derivarla del ID —en vez de tomarla con ``date -u``— es lo que hace que
    re-correr un generador reproduzca su corpus byte a byte: con ``date(1)``,
    cada ejecucion re-fecha los N archivos y el diff de ruido oculta el cambio
    real.

    Un directorio sin sufijo devuelve ``None``, no una fecha fabricada: los que
    existen sin el son reales y no se renombran, porque un renombre rompe las
    citas que ya apuntan a ellos.
    """
    match = _BASIC_ISO.search(run_id)
    if match is None:
        return None
    year, month, day, hour, minute, second = match.groups()
    return f"{year}-{month}-{day}T{hour}:{minute}:{second}"


def run_id_for(slug: str, now: datetime | None = None) -> str:
    """El identificador de un run: ``<slug>-<ISO basico>``."""
    if _BASIC_ISO.search(slug):
        raise RunIdError(f"el slug '{slug}' ya trae sufijo ISO: acunaria dos")
    moment = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    return f"{slug}-{moment.strftime('%Y%m%dT%H%M%S')}"


def runs_for(base_dir: str | Path, slug: str) -> list[Path]:
    """Los runs de un slug bajo un hogar dado, del mas reciente al mas antiguo.

    El orden es por NOMBRE, no por ``mtime``: el ISO va en el identificador, asi
    que el orden lexicografico ES el cronologico, y no depende de que nadie haya
    tocado el directorio despues. Un ``mtime`` cambia al escribir un output y
    reordenaria runs por actividad en vez de por creacion.

    Ciega a: un run cuyo directorio no siga la forma ``<slug>-<ISO basico>`` —
    no se lista, aunque exista. Es deliberado: el resolutor no adivina que quiso
    decir un nombre a mano.
    """
    home = Path(base_dir)
    if not home.is_dir():
        return []
    prefix = f"{slug}-"
    found = [
        entry for entry in home.iterdir()
        if entry.name.startswith(prefix)
        and _EXACT_BASIC_ISO.match(entry.name[len(prefix):])
    ]
    return sorted(found, key=lambda entry: entry.name, reverse=True)


def latest_run(base_dir: str | Path, slug: str) -> Path | None:
    """El run mas reciente de un slug, o ``None``.

    Devuelve ``None`` en vez de inventar la ruta que tendria: un consumidor que
    recibiera una ruta inexistente seguiria en verde apuntando al vacio.
    """
    found = runs_for(base_dir, slug)
    return found[0] if found else None


def scaffold_workbench(
    base_dir: str | Path, slug: str, now: datetime | None = None,
) -> Path:
    """Crea el run y devuelve su ruta.

    **Omite las cinco claves a proposito.** Son las que el andamiaje no puede
    saber, y omitir es distinto de rellenar: un placeholder pasa el check de
    presencia y se lee como dato, mientras que una clave ausente la nombra el
    gate.

    Un run recien andamiado **NO es conforme**, y ese es el estado correcto: no
    esta hecho hasta que tiene instrumento y declara que mide y que no ve.
    """
    run_dir = Path(base_dir) / run_id_for(slug, now)
    run_dir.mkdir(parents=True, exist_ok=True)
    for sub in SCAFFOLD_SUBDIRS:
        (run_dir / sub).mkdir(exist_ok=True)

    (run_dir / MANIFEST_FILE_NAME).write_text(
        json.dumps({}, indent=2) + "\n", encoding="utf-8")
    (run_dir / "README.md").write_text("\n".join([
        f"# {slug}", "",
        "## El encargo", "", "<!-- verbatim, sin parafrasear -->", "",
        "## La premisa, si se corrigio al primer comando", "",
        "## Las piezas", "", "| archivo | que hace |", "|---|---|", "",
        "## Los resultados", "",
        "*Metrica:*", "*Ciega a:*", "",
    ]), encoding="utf-8")
    return run_dir


def _base_dir(declared: str | None) -> Path:
    """El hogar: el declarado en la linea de comandos, o el que el gobernador
    resuelve. Este modulo NO compone hogares — solo los consume."""
    return Path(declared) if declared else paths.workbench_dir()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="manifest",
        description="Acuna, resuelve y andamia un run del banco de trabajo.")
    parser.add_argument(
        "--base", default=None,
        help="hogar del banco; por defecto, el que resuelve THYROX_WORKBENCH_DIR")
    sub = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (
        ("run-id", "acuna el identificador de un run sin crearlo"),
        ("runs", "lista los runs de un slug, del mas reciente al mas antiguo"),
        ("latest", "imprime el run mas reciente de un slug"),
        ("scaffold", "crea el run y devuelve su ruta"),
    ):
        child = sub.add_parser(name, help=help_text)
        child.add_argument("slug")

    args = parser.parse_args(argv)

    if args.command == "run-id":
        print(run_id_for(args.slug))
        return 0

    base = _base_dir(args.base)

    if args.command == "runs":
        found = runs_for(base, args.slug)
        for entry in found:
            print(entry)
        return 0 if found else 1

    if args.command == "latest":
        found = latest_run(base, args.slug)
        if found is None:
            print(f"sin runs para '{args.slug}' bajo {base}", file=sys.stderr)
            return 1
        print(found)
        return 0

    print(scaffold_workbench(base, args.slug))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
