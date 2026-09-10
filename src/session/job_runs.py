"""La familia `jobs` — un run por trabajo en segundo plano, con su manifiesto.

El defecto que cierra está medido: `bg.sh` escribía `<BG_DIR>/<nombre>.log`
plano. Cinco trabajos de una sesión dejaron cinco `.log` sueltos en un mismo
directorio —`suite-thyrox`, `suite-tras-gate`, `gate-sucesor`, `diag-rojos`,
`diag2`— sin manifiesto, sin fecha en el nombre y sin nada que diga qué
preguntaba cada uno ni qué NO podía ver. Dos ejecuciones del mismo nombre se
pisaban la una a la otra.

Es exactamente el defecto que `workbench` ya resolvió para la evidencia, y por
eso esta familia **lo reusa en vez de calcarlo**:

- el identificador de run sale de `workbench.manifest.run_id_for` — un segundo
  acuñador daría dos gramáticas de fecha que nadie sincroniza;
- las cinco claves son `workbench.manifest.REQUIRED_KEYS`, no una lista propia;
- el hogar lo resuelve `workbench.paths`, que ya sabe distinguir el clon.

Lo que NO se hereda, y es la razón de que sea familia aparte: el workbench aloja
**evidencia versionable** y esto aloja **la salida de un proceso**, que es
volumen y muere con el contenedor si nadie la promueve. Por eso su hogar por
defecto es hermano y no el mismo — mezclarlos ensuciaría el banco con logs.

## Andamiar omite lo que no consta

Un run recién andamiado declara `instrument` —el comando, que sí se conoce al
lanzar— y **omite las otras cuatro**. Omitir no es lo mismo que rellenar: un
placeholder pasa el check de presencia y se lee como dato, mientras que una
clave ausente la nombra el gate. Un run sin `question` ni `blind_to` **no es
conforme**, y ése es el estado correcto hasta que alguien recoge su resultado.
"""
from __future__ import annotations

import json
import pathlib
from datetime import datetime

from workbench import paths as wb_paths
from workbench.manifest import (  # noqa: F401  (se reexportan a propósito)
    MANIFEST_FILE_NAME,
    REQUIRED_KEYS,
    latest_run,
    run_id_date,
    run_id_for,
    runs_for,
)

#: El hogar declarado directamente, cuando el consumidor lo decide.
JOBS_DIR_VAR = "THYROX_JOBS_DIR"

#: El segmento por defecto bajo el directorio de estado: hermano de
#: `workbench`, no el mismo. La salida de un proceso es volumen; la evidencia
#: es lo que alguien promovió a partir de ella.
JOBS_DIR_DEFAULT = "jobs"

#: Los subdirectorios del run. `outputs` es el único obligatorio —ahí nace el
#: log—; `probes` aloja lo que se escriba para diagnosticar el propio trabajo.
SCAFFOLD_SUBDIRS: tuple[str, ...] = ("outputs", "probes")

#: El nombre del log dentro del run. Uno solo: el trabajo es uno.
LOG_FILE_NAME = "salida.log"


def jobs_dir(start: str | pathlib.Path | None = None) -> pathlib.Path:
    """El hogar de la familia: el declarado, o el hermano del banco.

    No compone la raíz por aritmética de `__file__` —eso describe dónde vivía
    el archivo, no dónde corre—: la saca de `workbench.paths`, que ya resuelve
    el consumidor y su directorio de estado.
    """
    import os

    declared = os.environ.get(JOBS_DIR_VAR)
    if declared:
        return pathlib.Path(declared)
    return pathlib.Path(wb_paths.state_dir(start)) / JOBS_DIR_DEFAULT


def log_path(run_dir: str | pathlib.Path) -> pathlib.Path:
    """Dónde nace el log de este run — DENTRO, nunca al lado."""
    return pathlib.Path(run_dir) / "outputs" / LOG_FILE_NAME


def scaffold_run(
    base_dir: str | pathlib.Path,
    slug: str,
    command: str | None = None,
    now: datetime | None = None,
) -> pathlib.Path:
    """Crea el run del trabajo y devuelve su ruta."""
    run_dir = pathlib.Path(base_dir) / run_id_for(slug, now)
    run_dir.mkdir(parents=True, exist_ok=True)
    for sub in SCAFFOLD_SUBDIRS:
        (run_dir / sub).mkdir(exist_ok=True)

    manifiesto: dict[str, object] = {}
    if command is not None:
        manifiesto["instrument"] = command
    (run_dir / MANIFEST_FILE_NAME).write_text(
        json.dumps(manifiesto, indent=2) + "\n", encoding="utf-8")

    (run_dir / "README.md").write_text("\n".join([
        f"# {slug}", "",
        "## Qué se lanzó", "",
        f"```\n{command or '<sin declarar>'}\n```", "",
        "## Qué se preguntaba", "", "<!-- la clave `question` del manifiesto -->", "",
        "## Qué se recogió", "",
        "*Metrica:*", "*Ciega a:*", "",
    ]), encoding="utf-8")
    return run_dir


def read_manifest(run_dir: str | pathlib.Path) -> dict:
    ruta = pathlib.Path(run_dir) / MANIFEST_FILE_NAME
    if not ruta.exists():
        return {}
    return json.loads(ruta.read_text(encoding="utf-8"))


def missing_keys(run_dir: str | pathlib.Path) -> list[str]:
    """Las claves obligatorias que este run aún no declara.

    Su lista vacía es lo que hace conforme al run; mientras tenga elementos, el
    trabajo se lanzó y su resultado no se ha interpretado.
    """
    presentes = read_manifest(run_dir)
    return [k for k in REQUIRED_KEYS if k not in presentes]


def settle(run_dir: str | pathlib.Path, exit_code: int) -> pathlib.Path:
    """Asienta el código de salida donde el manifiesto se lee.

    El `__BG_EXIT__` del log sigue estando —es lo que la barrera consume— pero
    un lector del manifiesto no debería tener que abrir el log para saber si el
    trabajo terminó bien.
    """
    ruta = pathlib.Path(run_dir) / MANIFEST_FILE_NAME
    manifiesto = read_manifest(run_dir)
    manifiesto["exit_code"] = exit_code
    ruta.write_text(json.dumps(manifiesto, indent=2) + "\n", encoding="utf-8")
    return ruta
